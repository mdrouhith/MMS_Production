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

  // ইউজার আইডি
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  
  // ফলব্যাক ভ্যালু (যাতে ক্র্যাশ না করে)
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email || "no-email";
  const currentPeriodStart = data.current_period_start || new Date().toISOString();

  if (!userId) {
      console.log("❌ No User ID Found");
      return new Response('No User ID', { status: 400 });
  }

  // 🛡️ SMART PLAN CHECK (এটাই আসল ফিক্স)
  // আমরা Paid Plan হিসেবে তাকেই ধরব যার:
  // ১. দাম ০ এর বেশি
  // ২. এবং প্ল্যানের নামের মধ্যে 'free' শব্দটি নেই
  
  let isPaidPlan = false;
  let detectedPlanName = "unknown";

  if (data.items && Array.isArray(data.items)) {
      // আমরা খুঁজছি এমন কোনো আইটেম যেটা পেইড এবং ফ্রি নয়
      const paidItem = data.items.find(item => 
          item.plan.amount > 0 && 
          !item.plan.slug.toLowerCase().includes('free')
      );

      if (paidItem) {
          isPaidPlan = true;
          detectedPlanName = paidItem.plan.slug;
      }
  }

  console.log(`Processing ${userId} | Paid: ${isPaidPlan} | Plan: ${detectedPlanName}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      
      const userRef = doc(db, "users", userId);

      try {
          // 🛑 CASE 1: FREE PLAN (যদি পেইড না হয়)
          if (!isPaidPlan) {
              console.log("📉 Setting Plan to FREE (No Credit Added)");
              
              await setDoc(userRef, {
                  plan: "free",
                  updatedAt: new Date().toISOString()
              }, { merge: true });
              
              return new Response('Plan Set to Free', { status: 200 });
          }

          // ✅ CASE 2: PAID PLAN (STUDENT)
          if (isPaidPlan) {
              console.log("🚀 Upgrading to STUDENT & Adding Credits");

              // এখানে আমরা সরাসরি ক্রেডিট বাড়াচ্ছি কারণ আগের DB Error টা সলভ হয়ে গেছে
              await setDoc(userRef, {
                  plan: "student",
                  credit: increment(2000), 
                  paymentEmail: userEmail,
                  lastBillingPeriod: currentPeriodStart,
                  updatedAt: new Date().toISOString()
              }, { merge: true });

              console.log("✅ Credits Added Successfully");
              return new Response('Credits Added', { status: 200 });
          }

      } catch (error) {
          console.error("❌ DB ERROR:", JSON.stringify(error, null, 2));
          return new Response('DB Error', { status: 500 });
      }
  }

  return new Response('Webhook received', { status: 200 });
}