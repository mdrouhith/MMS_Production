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

  // 🟢 SMART PLAN DETECTION
  // আমরা লিস্টের মধ্যে খুঁজব: কোনো আইটেমের টাকা কি ০-এর বেশি?
  // যদি পাই, তার মানে এটা স্টুডেন্ট প্ল্যান। না পেলে ফ্রি প্ল্যান।
  let paidItem = null;
  if (data.items && data.items.length > 0) {
      paidItem = data.items.find(item => item.plan?.amount > 0);
  }

  // বিলিং সাইকেল ট্র্যাকিং (ক্রেডিট ডুপ্লিকেট আটকাতে)
  const currentPeriodStart = data.current_period_start;

  console.log(`🔍 CHECK: User: ${userId} | Paid Item Found: ${!!paidItem}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        // 🛑 CASE 1: যদি Paid Item না পাওয়া যায় (তার মানে ফ্রি প্ল্যানে সুইচ করেছে)
        // আপনার রিকোয়ারমেন্ট: ডাটাবেসে হাত দেওয়া যাবে না।
        if (!paidItem) {
            console.log("📉 Free Plan Event. IGNORING update (Keeping Plan & Credit Same).");
            return new Response('Free Plan Ignored', { status: 200 });
        }

        // ✅ CASE 2: Paid Item পাওয়া গেছে (Subscribe Event)
        const userRef = doc(db, "users", userId);

        try {
            const userSnap = await getDoc(userRef);
            let shouldAddCredit = true;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                // 🛑 ডুপ্লিকেট চেক: এই মাসের বিল কি আগেই প্রসেস হয়েছে?
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("⚠️ Credit already given for this month. Updating Plan only.");
                    shouldAddCredit = false;
                }
            }

            // আপডেট অবজেক্ট তৈরি
            const updateData = {
                plan: "student", // আনলক নিশ্চিত করা হলো
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // ট্র্যাকিং আপডেট
                updatedAt: new Date().toISOString()
            };

            // যদি নতুন মাস হয়, তবেই ক্রেডিট যোগ হবে
            if (shouldAddCredit) {
                updateData.credit = increment(2000);
                updateData.totalCredit = 2000;
                console.log("🚀 Adding 2000 Credits (New Payment).");
            }

            // ডাটাবেসে সেভ
            await setDoc(userRef, updateData, { merge: true });
            
            console.log(`✅ SUCCESS: Plan Updated. Credits Added: ${shouldAddCredit}`);

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}