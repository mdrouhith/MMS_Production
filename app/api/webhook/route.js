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

  // 🟢 FIX: সঠিক প্ল্যান সিলেকশন লজিক
  let activeItem = null;

  if (data.items && data.items.length > 0) {
      // পেইড প্ল্যান খোঁজা হচ্ছে (যার টাকা আছে এবং ফ্রি নয়)
      activeItem = data.items.find(item => 
          item.plan.amount > 0 && 
          !item.plan.slug.toLowerCase().includes('free')
      );

      // যদি পেইড না পাই, তবেই ফ্রি বা ডিফল্টটা নিব
      if (!activeItem) {
          activeItem = data.items[0];
      }
  }

  const planAmount = activeItem?.plan?.amount || 0;
  const planSlug = (activeItem?.plan?.slug || "").toLowerCase(); 
  const currentPeriodStart = data.current_period_start;

  // কনসোলে চেক করো কি প্রিন্ট হচ্ছে
  console.log(`🛡️ PLAN CHECK -> User: ${userId} | Found Amount: ${planAmount} | Slug: ${planSlug}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE 1: ফ্রি প্ল্যান ডিটেকশন
        // যদি টাকা ০ হয় অথবা স্লাগে 'free' থাকে
        const isFreePlan = planAmount <= 0 || planSlug.includes('free');

        if (isFreePlan) {
            console.log("📉 Downgrade/Free detected. Plan set to Free.");
            
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return new Response('Plan Set to Free', { status: 200 });
        }

        // ✅ CASE 2: পেইড/স্টুডেন্ট প্ল্যান
        try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // ডুপ্লিকেট পেমেন্ট চেক (একই মাসে যেন দুইবার ক্রেডিট না পায়)
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("🛑 Credit already given for this period.");
                    // জাস্ট প্ল্যানটা ঠিক আছে কিনা নিশ্চিত করা
                    await setDoc(userRef, { plan: "student" }, { merge: true });
                    return new Response('Already Processed', { status: 200 });
                }
            }

            console.log(`🚀 Adding 2000 Credits for User: ${userId}`);

            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000, 
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            return new Response('Credit Added Success', { status: 200 });

        } catch (error) {
            console.error("❌ DB Error:", error);
            return new Response('Database Error', { status: 500 });
        }
    } 
  }

  return new Response('Webhook received', { status: 200 });
}