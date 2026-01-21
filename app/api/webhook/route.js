import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

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

  // ১. ইউজার সনাক্তকরণ (Payer Object থেকে)
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  // ২. পেমেন্ট ভ্যালিডেশন ডাটা
  // current_period_start: এটা দিয়ে বুঝব নতুন মাসের বিল কি না
  const currentPeriodStart = data.current_period_start; 
  const planAmount = data.plan?.amount || 0; // কত টাকা পেমেন্ট করেছে

  console.log(`🛡️ Strict Check -> User: ${userId} | Amount: ${planAmount} | Period: ${currentPeriodStart}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    // 🟢 ফিল্টার ১: ইউজার আইডি থাকতে হবে এবং স্ট্যাটাস অ্যাক্টিভ হতে হবে
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        // 🟢 ফিল্টার ২: এটা কি পেইড প্ল্যান? (Free প্ল্যানে সুইচ করলে ক্রেডিট পাবে না)
        // ফ্রি প্ল্যানে usually amount 0 থাকে। 
        if (planAmount <= 0) {
            console.log("🚫 Skipped: Free Plan or 0 Amount transaction.");
            // ফ্রি ইউজার হলে আমরা শুধু ডাটাবেসে প্ল্যানটা 'free' করে দিতে পারি, কিন্তু ক্রেডিট দিব না
            // (Optional: আপনি চাইলে এখানে প্ল্যান ডাউনগ্রেড লজিক রাখতে পারেন)
            return new Response('Free Plan Skipped', { status: 200 });
        }

        const userRef = doc(db, "users", userId);
        
        try {
            // ডাটাবেস থেকে বর্তমান অবস্থা চেক
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // 🟢 ফিল্টার ৩: এই পিরিয়ডের (মাসের) ক্রেডিট কি অলরেডি পেয়েছে?
                // যদি দেখি ডাটাবেসে সেভ করা Period Start আর বর্তমান Period Start একই, 
                // তার মানে সে এই মাসে আগেই ক্রেডিট পেয়েছে।
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("🛑 Duplicate/Switch Action: Credits already given for this month.");
                    return new Response('Already Processed', { status: 200 });
                }
            }

            console.log(`🚀 Valid Payment! Adding 2000 Credits to ${userId}`);

            // সব ফিল্টার পাস করলে আপডেট হবে
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000,
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // ✅ এই মাসের টোকেন সেভ রাখলাম
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`✅ SUCCESS: Account Upgraded Correctly.`);
        } catch (error) {
            console.error("❌ DB Update Failed:", error);
            return new Response('Database Error', { status: 500 });
        }
    } 
  }

  return new Response('Webhook received', { status: 200 });
}