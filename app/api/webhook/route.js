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

  // ১. ইউজার সনাক্তকরণ
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email || "no-email";
  const currentPeriodStart = data.current_period_start || new Date().toISOString();

  if (!userId) return new Response('No User ID Found', { status: 400 });

  // ২. প্ল্যান চেক (Smart Analysis)
  let activeItem = data.items?.[0];
  const planSlug = activeItem?.plan?.slug || "";
  const planAmount = activeItem?.plan?.amount || 0;

  // ৩. ইভেন্ট ফিল্টারিং
  const targetEvents = ['subscription.created', 'subscription.updated', 'subscriptionItem.freeTrialEnding'];

  if (targetEvents.includes(eventType)) {
    
    // 🛑 তোমার শর্ত: যদি ফ্রি প্ল্যান বা free_user হয়, তবে ডাটাবেসে কিছুই পরিবর্তন হবে না।
    if (planSlug === 'free_user' || planAmount <= 0) {
        console.log(`📉 Free plan detected for ${userId}. Doing nothing as per instructions.`);
        return new Response('Success: No changes made for free plan', { status: 200 });
    }

    // ✅ ইউজার যদি পেইড (Student) প্ল্যানে আসে
    if (planSlug === 'student' || planAmount > 0) {
      const userRef = doc(db, "users", userId);

      try {
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // ডুপ্লিকেট ক্রেডিট প্রোটেকশন
        if (userData.lastBillingPeriod === currentPeriodStart && userData.plan === "student") {
          console.log(`🛑 User ${userId} already received credits for this month.`);
          return new Response('Already Credited', { status: 200 });
        }

        console.log(`🚀 Adding 2000 credits to User: ${userId}`);

        // ডাটাবেস আপডেট: প্ল্যান 'student' হবে এবং ২০০০ ক্রেডিট যোগ হবে
        await setDoc(userRef, {
          plan: "student",
          credit: increment(2000), 
          paymentEmail: userEmail,
          lastBillingPeriod: currentPeriodStart,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response('Success: Credits Added', { status: 200 });

      } catch (error) {
          console.error("❌ Firebase Update Error:", error);
          return new Response('Database Error', { status: 500 });
      }
    }
  }

  return new Response('Webhook received', { status: 200 });
}