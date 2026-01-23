import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET Missing");
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

  // Header Verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ SVIX Headers Missing");
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
    console.error("❌ Verification Failed:", err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  const data = evt.data;
  const eventType = evt.type;

  // 🔎 FIX: User ID ৩ জায়গায় খোঁজা হচ্ছে
  // Clerk এর সাবস্ক্রিপশন আপডেটে সরাসরি data.user_id তে আইডি থাকে
  const userId = data.user_id || data.payer?.user_id || data.customer_id;
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email;

  console.log(`🔍 WEBHOOK DETECTED: Type: ${eventType} | UserID: ${userId}`);

  if (!userId) {
      console.error("❌ NO USER ID FOUND IN WEBHOOK DATA");
      return new Response('No User ID Found', { status: 400 });
  }

  // Plan Check Logic
  let isPaidPlan = false;
  let activeItem = null;

  if (data.items && data.items.length > 0) {
      activeItem = data.items.find(item => item.plan.amount > 0);
      if (activeItem) isPaidPlan = true;
  }

  const currentPeriodStart = data.current_period_start;

  // 🔥 MAIN LOGIC
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    // Status চেক বাদ দিয়ে সরাসরি রান করছি ডিবাগিং এর জন্য (যদি active নাও হয় তাও লগ দেখব)
    const userRef = doc(db, "users", userId);

    try {
        // 🛑 CASE A: Free Plan
        if (!isPaidPlan) {
            console.log(`📉 Processing FREE Plan for ${userId}`);
            
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log("✅ DB Updated: Set to FREE");
            return new Response('Plan set to Free', { status: 200 });
        }

        // ✅ CASE B: Paid Student Plan
        if (isPaidPlan) {
            console.log(`🚀 Processing PAID Plan for ${userId}`);

            const userSnap = await getDoc(userRef);
            
            // ডুপ্লিকেট চেক (তবে লগ করে দেখব কি হচ্ছে)
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("⚠️ DUPLICATE: Credits already given for this period.");
                    // Duplicate হলেও আমরা plan টা নিশ্চিত করি
                    await setDoc(userRef, { plan: "student" }, { merge: true });
                    return new Response('Duplicate Ignored', { status: 200 });
                }
            }

            // Database Update
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                paymentEmail: userEmail || "no-email-found",
                lastBillingPeriod: currentPeriodStart,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log("✅ DB Updated: Credits Added (2000) & Plan Set to Student");
            return new Response('Success: Credits Added', { status: 200 });
        }

    } catch (error) {
        console.error("❌ FIREBASE WRITE ERROR:", error);
        return new Response('Database Write Failed', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}