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

  // 🟢 FIX 1: Item খোঁজার লজিক আপডেট
  // আমরা জোর করে amount > 0 খুঁজব না, কারণ এতে Downgrade এর সময় পুরনো প্ল্যান সিলেক্ট হতে পারে।
  // সাধারণত data.items[0] ই মেইন প্ল্যান থাকে।
  
  let activeItem = null;
  if (data.items && data.items.length > 0) {
      // আমরা প্রথমে দেখব এমন কোন আইটেম আছে কি না যা 'Active'
      // যদি আইটেম স্পেসিফিক স্ট্যাটাস না থাকে, তবে প্রথম আইটেমটি নেওয়াই নিরাপদ
      activeItem = data.items[0]; 
  }

  // সঠিক অ্যামাউন্ট এবং স্লাগ বের করা
  const planAmount = activeItem?.plan?.amount || 0;
  // প্ল্যানের নাম বা স্লাগ ছোট হাতের অক্ষরে কনভার্ট করে নিলাম চেকিংয়ের সুবিধার জন্য
  const planSlug = (activeItem?.plan?.slug || "").toLowerCase(); 
  const currentPeriodStart = data.current_period_start;

  console.log(`🛡️ SMART CHECK -> User: ${userId} | Amount: ${planAmount} | Slug: ${planSlug}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);

        // 🛑 CASE 1: ফ্রি প্ল্যান বা ডাউনগ্রেড হ্যান্ডেলিং
        // লজিক: যদি টাকার পরিমাণ ০ হয় অথবা প্ল্যানের নামের মধ্যে 'free' লেখা থাকে।
        const isFreePlan = planAmount <= 0 || planSlug.includes('free');

        if (isFreePlan) {
            console.log("📉 Free/Downgrade detected. Setting plan to Free.");
            
            await setDoc(userRef, {
                plan: "free",
                updatedAt: new Date().toISOString()
                // নোটিশ: এখানে credit ফিল্ড নেই, তাই ক্রেডিট বাড়বে না।
            }, { merge: true });

            return new Response('Plan Set to Free (No Credit Added)', { status: 200 });
        }

        // ✅ CASE 2: স্টুডেন্ট প্ল্যান (টাকা > ০ এবং ফ্রি নয়)
        try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // 🟢 ডুপ্লিকেট চেক: এই মাসের ক্রেডিট আগে পেয়েছে কি না
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
                totalCredit: 2000, // এটি যদি ম্যাক্স লিমিট হয় তবে ঠিক আছে
                paymentEmail: userEmail,
                lastBillingPeriod: currentPeriodStart, // ✅ এই মাসের টোকেন সেভ
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