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

  // 1. User Info
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  // 2. Plan Info
  const item = data.items && data.items.length > 0 ? data.items[0] : null;
  const planSlug = item?.plan?.slug || ""; 
  const planAmount = item?.plan?.amount || 0;
  const currentPeriodStart = data.current_period_start;

  console.log(`🛡️ ACTION: User: ${userId} | Amount: ${planAmount}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE 1: যদি প্ল্যান FREE হয় (Downgrade/Cancel)
        // আপনার রিকোয়ারমেন্ট: লক করা যাবে না, ক্রেডিটও হাত দেওয়া যাবে না।
        // তাই আমরা ডাটাবেসে কোনো আপডেটই করব না। চুপচাপ রিটার্ন করব।
        if (planSlug.toLowerCase().includes('free') || planAmount === 0) {
            console.log(`📉 Free/Downgrade Event detected. IGNORING update to keep user unlocked.`);
            // এখানে setDoc বা updateDoc কিচ্ছু নেই। তাই ডাটাবেসে প্ল্যান 'student'-ই থেকে যাবে।
            return new Response('Downgrade Ignored (Access Retained)', { status: 200 });
        }

        // ✅ CASE 2: যদি PAID (Student) প্ল্যান হয়
        try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // ডুপ্লিকেট চেক: এই মাসের ক্রেডিট আগে পেয়েছে কি না
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("🛑 Credit already given for this month. Skipping.");
                    // প্ল্যান স্টুডেন্ট কনফার্ম করছি (যদি আগে ফ্রি থেকে থাকে), কিন্তু ক্রেডিট দিচ্ছি না
                    await setDoc(userRef, { plan: "student" }, { merge: true });
                    return new Response('Already Processed', { status: 200 });
                }
            }

            console.log(`🚀 New Paid Subscription! Adding 2000 Credits.`);

            // ক্রেডিট এড করা হচ্ছে (শুধুমাত্র নতুন পেমেন্ট/মাসের জন্য)
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000,
                lastBillingPeriod: currentPeriodStart, 
                paymentEmail: userEmail,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`✅ SUCCESS: Credits Added.`);

        } catch (error) {
            console.error("❌ DB Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}