import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET missing', { status: 500 });
  }

  // ১. হেডার ভেরিফিকেশন (Svix Security)
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
    return new Response('Error: Webhook verification failed', { status: 400 });
  }

  const data = evt.data;
  const eventType = evt.type;

  // ২. ইউজার এবং বিলিং পিরিয়ড বের করা (Safe fallback সহ)
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  const userEmail = data.email_addresses?.[0]?.email_address || data.payer?.email || "no-email";
  const currentPeriodStart = data.current_period_start || new Date().toISOString();

  if (!userId) {
    return new Response('Error: User ID not found', { status: 400 });
  }

  // ৩. স্মার্ট প্ল্যান ডিটেকশন (Paid vs Free)
  let isPaidPlan = false;
  if (data.items && Array.isArray(data.items)) {
    // এমন আইটেম খুঁজবে যার দাম ০ এর বেশি এবং নামের মধ্যে 'free' নেই
    const paidItem = data.items.find(item => 
      item.plan.amount > 0 && 
      !item.plan.slug.toLowerCase().includes('free')
    );
    if (paidItem) isPaidPlan = true;
  }

  // ৪. মেইন অপারেশন (subscription created/updated)
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const userRef = doc(db, "users", userId);

    try {
      // 🛑 CASE A: User Free-তে সুইচ করলে (No Credit Added)
      if (!isPaidPlan) {
        console.log(`📉 Downgrade detected for ${userId}. Setting plan to FREE.`);
        await setDoc(userRef, {
          plan: "free",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response('Success: Plan set to Free', { status: 200 });
      }

      // ✅ CASE B: User Paid/Student Plan-এ আসলে (Credit Added)
      if (isPaidPlan) {
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // ডুপ্লিকেট ক্রেডিট রোধ করার জন্য পিরিয়ড চেক
        // যদি অলরেডি স্টুডেন্ট থাকে এবং বিলিং পিরিয়ড এক হয়, তবে ক্রেডিট দেবে না
        if (userData.lastBillingPeriod === currentPeriodStart && userData.plan === "student") {
          console.log(`🛑 Credit already added for this period for ${userId}`);
          return new Response('Success: Already Credited', { status: 200 });
        }

        console.log(`🚀 Upgrading ${userId} to STUDENT and adding 2000 credits.`);
        await setDoc(userRef, {
          plan: "student",
          credit: increment(2000), // সরাসরি ২০০০ যোগ হবে
          paymentEmail: userEmail,
          lastBillingPeriod: currentPeriodStart, // এই মাসের টোকেন সেভ
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response('Success: Credits Added', { status: 200 });
      }

    } catch (error) {
      console.error("❌ Firebase Write Error:", error);
      return new Response('Database Error', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}