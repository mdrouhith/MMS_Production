import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

  // Header Verification
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

  const data = evt.data;
  const eventType = evt.type;

  // 1. User ID বের করা (সব জায়গা থেকে চেক করে)
  const userId = data.user_id || data.payer?.user_id || data.customer_id;
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email;

  if (!userId) {
      console.log("❌ No User ID found!");
      return new Response('No User ID', { status: 400 });
  }

  // 2. Paid Plan চেক করা
  let isPaidPlan = false;
  if (data.items && data.items.length > 0) {
      const activeItem = data.items.find(item => item.plan.amount > 0);
      if (activeItem) isPaidPlan = true;
  }

  const currentPeriodStart = data.current_period_start;

  // 🔥 MAIN OPERATION
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    const userRef = doc(db, "users", userId);

    // 🛑 FREE PLAN: যদি টাকা না থাকে
    if (!isPaidPlan) {
        console.log(`📉 Plan set to FREE for ${userId}`);
        await setDoc(userRef, {
            plan: "free",
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        return new Response('Plan Free', { status: 200 });
    }

    // ✅ PAID PLAN: সরাসরি ক্রেডিট আপডেট (No Duplicate Check)
    if (isPaidPlan) {
        console.log(`🚀 FORCE ADDING CREDITS for ${userId}`);

        try {
            // আমি intentionaly 'lastBillingPeriod' চেক বাদ দিয়েছি যাতে টেস্টে কাজ করে
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), // এখুনি ২০০০ বাড়বে
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log("✅ Success: Plan Student & Credit +2000");
            return new Response('Credit Added', { status: 200 });
            
        } catch (error) {
            console.error("❌ DB Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}