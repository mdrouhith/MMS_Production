import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response('Secret missing', { status: 500 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) return new Response('Headers missing', { status: 400 });

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, { 
      "svix-id": svix_id, 
      "svix-timestamp": svix_timestamp, 
      "svix-signature": svix_signature 
    });
  } catch (err) { 
    return new Response('Verify error', { status: 400 }); 
  }

  const data = evt.data;
  const eventType = evt.type;

  // ১. ইউজার এবং সাবস্ক্রিপশন আইডি রিকভারি
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  const subscriptionId = data.id || "manual"; 
  const rawDate = data.current_period_start || new Date().toISOString();
  const currentPeriodDate = rawDate.split('T')[0];

  // ২. ইউনিক পিরিয়ড লক (Subscription ID + Date)
  const uniqueLock = `${subscriptionId}-${currentPeriodDate}`;

  if (!userId) return new Response('No User ID Found', { status: 400 });

  // ৩. পেইড প্ল্যান এনালাইসিস
  let activeItem = data.items?.find(item => 
    item.plan.amount > 0 && !item.plan.slug.toLowerCase().includes('free')
  );
  
  const isPaidPlan = !!activeItem;

  // ৪. ইভেন্ট চেক
  if (eventType === 'subscription.created' || eventType === 'subscription.updated' || eventType === 'subscriptionItem.freeTrialEnding') {
    
    // 🛑 তোমার স্পেসিফিক রিকোয়েস্ট: ফ্রি প্ল্যান হলে ডাটাবেসে কিছুই করার দরকার নেই
    if (!isPaidPlan) {
      console.log(`📉 Free Plan detected for ${userId}. Skipping DB update.`);
      return new Response('Success: No changes made', { status: 200 });
    }

    // ✅ পেইড প্ল্যান (Student) হলে আপডেট হবে
    const userRef = doc(db, "users", userId);

    try {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // ডুপ্লিকেট ক্রেডিট রোধ (ইউনিক লক দিয়ে)
      if (userData.lastBillingPeriod === uniqueLock) {
        console.log(`🛑 Blocked Duplicate: ${uniqueLock} already processed.`);
        return new Response('Already Credited', { status: 200 });
      }

      console.log(`🚀 Adding 2000 credits to ${userId}`);

      await setDoc(userRef, {
        plan: "student",
        credit: increment(2000), 
        lastBillingPeriod: uniqueLock, // এই ট্রানজেকশনটি লক করে দেওয়া হলো
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return new Response('Success: Credits Added', { status: 200 });

    } catch (error) {
      console.error("❌ Firebase Error:", error);
      return new Response('Database Error', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}