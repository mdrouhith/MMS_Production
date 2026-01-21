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

  // ১. ইউজার সনাক্তকরণ
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  // 🟢 FIX: আমরা সরাসরি data.plan খুঁজব না। আমরা items এর ভেতর খুঁজব।
  // লজিক: items এর মধ্যে এমন প্ল্যান খোঁজো যার টাকা > ০ (অর্থাৎ Student Plan)
  let activeItem = null;
  if (data.items && data.items.length > 0) {
      activeItem = data.items.find(item => item.plan.amount > 0);
      
      // যদি Paid plan না পাই, তবেই প্রথমটা (Free) নিব
      if (!activeItem) {
          activeItem = data.items[0];
      }
  }

  // সঠিক অ্যামাউন্ট এবং স্লাগ বের করা
  const planAmount = activeItem?.plan?.amount || 0;
  const planSlug = activeItem?.plan?.slug || "";
  const currentPeriodStart = data.current_period_start;

  console.log(`🛡️ SMART CHECK -> User: ${userId} | Amount: ${planAmount}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE 1: ফ্রি প্ল্যান বা ০ টাকার ট্রানজেকশন (ক্রেডিট বাড়বে না)
        // যেহেতু Amount 0, তাই আমরা এখানে ক্রেডিট এড করব না।
        // কিন্তু ডাটাবেসে Plan টা 'free' করে দিব যাতে ইউজার বোঝে সে ফ্রি-তে আছে।
        if (planAmount <= 0) {
            console.log("📉 Free/Downgrade detected. Setting plan to Free.");
            
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
                // নোটিশ: এখানে credit ফিল্ড নেই, তাই ক্রেডিট যা ছিল তাই থাকবে।
            }, { merge: true });

            return new Response('Plan Set to Free (No Credit Added)', { status: 200 });
        }

        // ✅ CASE 2: স্টুডেন্ট প্ল্যান (টাকা > ০)
        try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // 🟢 ডুপ্লিকেট চেক: এই মাসের ক্রেডিট আগে পেয়েছে কি না
                if (userData.lastBillingPeriod === currentPeriodStart) {
                    console.log("🛑 Credit already given for this month. Skipping.");
                    
                    // আনলক নিশ্চিত করছি (যদি মিস হয়ে থাকে)
                    await setDoc(userRef, { plan: "student" }, { merge: true });
                    
                    return new Response('Already Processed', { status: 200 });
                }
            }

            console.log(`🚀 Valid Payment! Adding 2000 Credits.`);

            // সব ফিল্টার পাস করলে আপডেট হবে
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000,
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // ✅ এই মাসের টোকেন সেভ রাখলাম
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`✅ SUCCESS: Credits Added.`);

        } catch (error) {
            console.error("❌ DB Update Failed:", error);
            return new Response('Database Error', { status: 500 });
        }
    } 
  }

  return new Response('Webhook received', { status: 200 });
}