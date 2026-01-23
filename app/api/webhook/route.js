import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

  // ১. হেডার যাচাইকরণ
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

  // ২. ইউজার ইনফো
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;
  const currentPeriodStart = data.current_period_start;

  // ৩. প্ল্যান নির্ণয় (খুবই সাধারণ লজিক)
  // আমরা দেখব items এর মধ্যে এমন কোনো প্ল্যান আছে কিনা যার দাম ০ এর বেশি
  let isPaidPlan = false;
  
  if (data.items && data.items.length > 0) {
      const paidItem = data.items.find(item => item.plan.amount > 0);
      if (paidItem) {
          isPaidPlan = true;
      }
  }

  // ইভেন্ট ফিল্টারিং
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE A: ফ্রি প্ল্যান (টাকা ০)
        if (!isPaidPlan) {
            console.log(`📉 User: ${userId} switched to FREE.`);
            
            // শুধু প্ল্যান আপডেট হবে, ক্রেডিট ফিক্সড থাকবে
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return new Response('Plan set to Free', { status: 200 });
        }

        // ✅ CASE B: স্টুডেন্ট প্ল্যান (টাকা > ০)
        if (isPaidPlan) {
            
            // ডুপ্লিকেট চেক: এই মাসের ক্রেডিট আগে দেওয়া হয়েছে কিনা
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("🛑 Already Processed for this month. Skipping credit.");
                    return new Response('Duplicate Event Ignored', { status: 200 });
                }
            }

            console.log(`🚀 User: ${userId} upgraded to STUDENT. Adding 2000 credits.`);

            // প্ল্যান আপডেট + ২০০০ ক্রেডিট যোগ + বিলিং ডেট সেভ
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // এই মাসের টোকেন
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return new Response('Student Plan & Credits Added', { status: 200 });
        }
    } 
  }

  return new Response('Webhook received', { status: 200 });
}