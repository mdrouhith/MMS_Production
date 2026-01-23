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
    evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature });
  } catch (err) { return new Response('Verify error', { status: 400 }); }

  const data = evt.data;
  const eventType = evt.type;

  // ১. ইউজার এবং সাবস্ক্রিপশন আইডি বের করা
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  
  // 🔥 ফিক্স: Clerk এর পাঠানো মেইন ID টাই হচ্ছে সাবস্ক্রিপশন আইডি
  const subscriptionId = data.id || "manual_id"; 
  
  // তারিখ ফরম্যাট: YYYY-MM-DD
  const rawDate = data.current_period_start ? new Date(data.current_period_start * 1000).toISOString() : new Date().toISOString();
  const currentPeriodDate = rawDate.split('T')[0];

  // ২. ইউনিক লক (ID + Date)
  // যদি ইউজার ডিলিট করে আবার কিনে, তবে ID বদলে যাবে। ১ মাস পর রিনিউ হলে Date বদলে যাবে।
  const uniqueLock = `${subscriptionId}-${currentPeriodDate}`;

  if (!userId) return new Response('No User ID Found', { status: 400 });

  // ৩. পেইড প্ল্যান চেক
  let activeItem = data.items?.find(item => 
    item.plan.amount > 0 && !item.plan.slug.toLowerCase().includes('free')
  );
  const isPaidPlan = !!activeItem;

  if (eventType === 'subscription.created' || eventType === 'subscription.updated' || eventType === 'subscriptionItem.freeTrialEnding') {
    
    // ফ্রি হলে ডাটাবেসে হাত দিবে না
    if (!isPaidPlan) {
      console.log(`📉 Free plan/Downgrade for ${userId}. No changes.`);
      return new Response('OK', { status: 200 });
    }

    const userRef = doc(db, "users", userId);

    try {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // 🛡️ ডুপ্লিকেট লক চেক
      // যদি আইডি অথবা তারিখ—যেকোনো একটা বদলায়, তবেই ক্রেডিট অ্যাড হবে।
      if (userData.lastBillingPeriod === uniqueLock) {
        console.log(`🛑 Duplicate Blocked for ${uniqueLock}`);
        return new Response('Already Credited', { status: 200 });
      }

      console.log(`🚀 Processing Success: Adding 2000 credits to ${userId}`);

      await setDoc(userRef, {
        plan: "student",
        credit: increment(2000), 
        lastBillingPeriod: uniqueLock, // লক সেভ হচ্ছে
        updatedAt: new Date().toISOString(),
        paymentEmail: data.email_addresses?.[0]?.email_address || data.payer?.email || "paid-user"
      }, { merge: true });

      return new Response('Success', { status: 200 });

    } catch (error) {
      console.error("❌ DB Error:", error);
      return new Response('Error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
}