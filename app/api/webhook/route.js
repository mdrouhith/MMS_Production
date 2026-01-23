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
  } catch (err) { 
    return new Response('Verify error', { status: 400 }); 
  }

  const data = evt.data;
  const eventType = evt.type;

  // ১. ইউজার আইডি নিশ্চিত করা
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email || "no-email";
  const currentPeriodStart = data.current_period_start || new Date().toISOString();

  if (!userId) return new Response('No User ID', { status: 400 });

  // ২. পেইড প্ল্যান খোঁজা (এটি এখন আরও শক্তিশালী)
  let paidPlanFound = null;
  if (data.items && Array.isArray(data.items)) {
    // আমরা পুরো লিস্ট চেক করব, কোনো একটা আইটেমও যদি পেইড হয়
    paidPlanFound = data.items.find(item => 
      item.plan.amount > 0 && 
      !item.plan.slug.toLowerCase().includes('free')
    );
  }

  console.log(`📡 Event: ${eventType} | User: ${userId}`);
  
  if (eventType === 'subscription.created' || eventType === 'subscription.updated' || eventType === 'subscriptionItem.freeTrialEnding') {
    
    // 🛑 তোমার শর্ত: যদি কোনো পেইড প্ল্যান না পাওয়া যায় (অর্থাৎ ফ্রি প্ল্যান)
    if (!paidPlanFound) {
      console.log(`📉 No paid items found for ${userId}. Skipping DB update as per instructions.`);
      return new Response('Success: No changes for free', { status: 200 });
    }

    // ✅ যদি পেইড প্ল্যান (Student) পাওয়া যায়
    const planSlug = (paidPlanFound.plan.slug || "").toLowerCase();
    
    if (planSlug.includes('student') || paidPlanFound.plan.amount > 0) {
      const userRef = doc(db, "users", userId);

      try {
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // ডুপ্লিকেট ক্রেডিট রোধ
        if (userData.lastBillingPeriod === currentPeriodStart && userData.plan === "student") {
          console.log("🛑 Duplicate check: Credit already added for this period.");
          return new Response('Already Credited', { status: 200 });
        }

        console.log("🔥 ACTION: Upgrading to Student & Adding 2000 Credits...");

        await setDoc(userRef, {
          plan: "student",
          credit: increment(2000), 
          paymentEmail: userEmail,
          lastBillingPeriod: currentPeriodStart,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response('Credit Added Success', { status: 200 });

      } catch (error) {
        console.error("❌ Firebase Write Error:", error);
        return new Response('Database Error', { status: 500 });
      }
    }
  }

  return new Response('Webhook received', { status: 200 });
}