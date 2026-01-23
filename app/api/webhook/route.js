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

  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  // 🔎 স্মার্ট প্ল্যান ডিটেকশন লজিক
  let activeItem = null;

  if (data.items && data.items.length > 0) {
      // ১. পেইড এবং একটিভ প্ল্যান খোঁজা (যেটার স্ল্যাগে 'free' নেই)
      activeItem = data.items.find(item => 
          item.plan.amount > 0 && 
          !item.plan.slug.toLowerCase().includes('free')
      );

      // ২. যদি পেইড না পাই, তাহলে ডিফল্টটা (ফ্রি) নিব
      if (!activeItem) {
          activeItem = data.items[0];
      }
  }

  const planAmount = activeItem?.plan?.amount || 0;
  const planSlug = (activeItem?.plan?.slug || "").toLowerCase(); 
  const currentPeriodStart = data.current_period_start;

  console.log(`🛡️ CHECK -> User: ${userId} | Plan: ${planSlug} | Amount: ${planAmount}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE 1: ফ্রি প্ল্যান অথবা ডাউনগ্রেড হ্যান্ডেলিং
        const isFreePlan = planAmount <= 0 || planSlug.includes('free');

        if (isFreePlan) {
            console.log("📉 User downgraded to Free.");
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return new Response('Plan Set to Free', { status: 200 });
        }

        // ✅ CASE 2: স্টুডেন্ট প্ল্যান (ক্রেডিট এড লজিক)
        try {
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            
            // 🔥 লজিক ফিক্স: কখন ক্রেডিট এড করব?
            // শর্ত ১: যদি ইউজার আগে 'student' না থাকে (মানে নতুন আপগ্রেড করছে)
            // শর্ত ২: অথবা, যদি ইউজার 'student' থাকে কিন্তু এটা নতুন মাসের বিল (Renewal)
            
            const isNewUpgrade = userData.plan !== 'student';
            const isRenewal = userData.lastBillingPeriod !== currentPeriodStart;

            if (isNewUpgrade || isRenewal) {
                console.log(`🚀 Adding 2000 Credits. Reason: ${isNewUpgrade ? 'New Upgrade' : 'Monthly Renewal'}`);

                await setDoc(userRef, {
                    plan: "student",
                    credit: increment(2000), 
                    totalCredit: 2000, // ম্যাক্স লিমিট রাখতে চাইলে রাখো, নাহলে বাদ দিতে পারো
                    paymentEmail: userEmail,
                    lastBillingPeriod: currentPeriodStart, // টোকেন আপডেট
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                return new Response('Credits Added Successfully', { status: 200 });
            } else {
                // যদি প্ল্যানও student হয় এবং বিলিং পিরিয়ডও সেম হয়
                console.log("🛑 Duplicate Webhook Ignored (Credits already given).");
                return new Response('Already Processed', { status: 200 });
            }

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('Database Error', { status: 500 });
        }
    } 
  }

  return new Response('Webhook received', { status: 200 });
}