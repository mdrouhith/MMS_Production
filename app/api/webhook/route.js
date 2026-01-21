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

  // 1. User Identification
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  // 🟢 FIX: Active Plan খোঁজা (Items array এর মধ্যে লুপ চালিয়ে)
  // আগে আমরা items[0] নিচ্ছিলাম, যেটা ভুল ছিল।
  let activeItem = null;
  if (data.items && data.items.length > 0) {
    // আমরা সেই আইটেম খুঁজব যার টাকা > ০ এবং স্ট্যাটাস একটিভ
    activeItem = data.items.find(item => item.plan.amount > 0 && item.status === 'active');
    
    // যদি একটিভ না পাই, তাহলে অন্তত সেই আইটেম নিব যার টাকা > ০ (নতুন পেমেন্টের ক্ষেত্রে)
    if (!activeItem) {
        activeItem = data.items.find(item => item.plan.amount > 0);
    }
  }

  // যদি তাও কিছু না পাই, ডিফল্ট ভ্যালু (Skip আটকানোর জন্য)
  const planAmount = activeItem ? activeItem.plan.amount : 0;
  const currentPeriodStart = data.current_period_start;

  console.log(`🔍 Smart Check -> User: ${userId} | Found Active Amount: ${planAmount}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        // 🛑 যদি আসলেই কোনো Paid Plan খুঁজে না পাওয়া যায়, তখন Skip করব
        if (planAmount === 0) {
            console.log("⚠️ No Active Paid Plan found in items. Skipping update.");
            return new Response('Skipped (No Paid Plan)', { status: 200 });
        }

        const userRef = doc(db, "users", userId);

        try {
            // ১. আগে ডাটাবেস চেক করি (ক্রেডিট ডুপ্লিকেট আটকানোর জন্য)
            const userSnap = await getDoc(userRef);
            let shouldAddCredit = true;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                // যদি দেখি এই মাসের বিলিং ডেট আগেই সেভ করা আছে
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    shouldAddCredit = false;
                    console.log("🛑 Same billing period matched. Keeping plan active but NO extra credit.");
                }
            }

            // ২. আপডেট ডাটা তৈরি
            const updateData = {
                plan: "student", // ✅ পেমেন্ট থাকলে আনলক হবেই
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // ট্র্যাকিং এর জন্য ডেট আপডেট
                updatedAt: new Date().toISOString()
            };

            // ৩. ক্রেডিট শুধুমাত্র তখনই এড হবে যদি নতুন মাস হয়
            if (shouldAddCredit) {
                updateData.credit = increment(2000);
                updateData.totalCredit = 2000;
                console.log("🚀 Adding 2000 Credits (Fresh Billing Cycle)");
            }

            // ৪. ফাইনাল সেভ
            await setDoc(userRef, updateData, { merge: true });
            
            console.log(`✅ SUCCESS: DB Updated. Credits Added: ${shouldAddCredit}`);

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}