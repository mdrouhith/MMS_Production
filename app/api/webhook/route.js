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

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Header missing', { status: 400 });
  }

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

  // 1. সেই আগের 'payer' মেথড যেটা কাজ করেছিল
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;
  
  // 2. বিলিং পিরিয়ড (ডবল ক্রেডিট আটকাতে)
  const currentPeriodStart = data.current_period_start;
  const planAmount = data.items?.[0]?.plan?.amount || 0;

  console.log(`⚡ WEBHOOK: User: ${userId} | Status: ${status}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        // 🛑 Free Plan চেক: যদি ফ্রি বা ০ টাকার প্ল্যান হয়, আমরা কিছুই করব না
        // (আপনার রিকোয়ারমেন্ট: ডাটাবেসে হাত দিব না, আনলকই থাকবে)
        if (planAmount === 0) {
            console.log("Skipping Free Plan update (Keeping user unlocked).");
            return new Response('Skipped Free Plan', { status: 200 });
        }

        const userRef = doc(db, "users", userId);

        try {
            // ১. আগে ডাটাবেস চেক করি
            const userSnap = await getDoc(userRef);
            let shouldAddCredit = true;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                // যদি দেখি এই মাসের বিলিং ডেট আগেই সেভ করা আছে -> ক্রেডিট দিব না
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    shouldAddCredit = false;
                    console.log("⚠️ Same billing period detected. NOT adding credit.");
                }
            }

            // ২. আপডেট লজিক
            const updateData = {
                plan: "student", // ✅ এটা সব সময় স্টুডেন্ট করে দিবে (আনলক ফিক্স)
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // তারিখ আপডেট করে রাখলাম
                updatedAt: new Date().toISOString()
            };

            // যদি নতুন মাস হয়, তবেই ক্রেডিট বাড়াব
            if (shouldAddCredit) {
                updateData.credit = increment(2000);
                updateData.totalCredit = 2000;
                console.log("🚀 Adding 2000 Credits...");
            }

            // ৩. ডাটাবেসে সেভ
            await setDoc(userRef, updateData, { merge: true });
            
            console.log(`✅ SUCCESS: User unlocked. Credit Added: ${shouldAddCredit}`);

        } catch (error) {
            console.error("❌ DB Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}