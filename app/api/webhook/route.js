import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

  // ১. হেডার যাচাই
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    return new Response('Error verifying webhook', { status: 400 });
  }

  // ২. ডাটা প্রসেসিং
  const data = evt.data;
  const eventType = evt.type;

  // ইউজার আইডি বের করা (নিরাপদ ভাবে)
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  
  // 🛡️ FIX: ইমেইল এবং তারিখ যদি undefined থাকে, তবে নাল (null) বা স্ট্রিং ব্যবহার করব
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email || "no-email";
  
  // 🔥 CRITICAL FIX: এখানে undefined আসছিল, তাই fallback দিচ্ছি
  const currentPeriodStart = data.current_period_start || new Date().toISOString();

  if (!userId) {
      console.log("❌ No User ID Found");
      return new Response('No User ID', { status: 400 });
  }

  // ৩. প্ল্যান এবং পেমেন্ট চেক
  let isPaidPlan = false;
  if (data.items && Array.isArray(data.items)) {
      const activeItem = data.items.find(item => item.plan.amount > 0);
      if (activeItem) isPaidPlan = true;
  }

  console.log(`Processing ${userId} | Paid: ${isPaidPlan} | Period: ${currentPeriodStart}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      
      const userRef = doc(db, "users", userId);

      try {
          // 🛑 CASE: FREE PLAN
          if (!isPaidPlan) {
              await setDoc(userRef, {
                  plan: "free",
                  updatedAt: new Date().toISOString()
              }, { merge: true });
              
              return new Response('Plan Free', { status: 200 });
          }

          // ✅ CASE: PAID PLAN (STUDENT)
          if (isPaidPlan) {
              // সরাসরি ডাটাবেস আপডেট (No undefined values allowed)
              await setDoc(userRef, {
                  plan: "student",
                  credit: increment(2000), 
                  paymentEmail: userEmail,
                  lastBillingPeriod: currentPeriodStart, // এখন এটা আর undefined হবে না
                  updatedAt: new Date().toISOString()
              }, { merge: true });

              console.log("✅ Success: Credit Added");
              return new Response('Credit Added', { status: 200 });
          }

      } catch (error) {
          // এই লগটা এখন আসল কারণ দেখাবে যদি আবার সমস্যা হয়
          console.error("❌ DB WRITE ERROR:", JSON.stringify(error, null, 2));
          return new Response('DB Error', { status: 500 });
      }
  }

  return new Response('Webhook received', { status: 200 });
}