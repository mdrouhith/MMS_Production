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

  if (!svix_id || !svix_timestamp || !svix_signature) return new Response('Headers missing', { status: 400 });

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature });
  } catch (err) { return new Response('Verify error', { status: 400 }); }

  const data = evt.data;
  const eventType = evt.type;

  // ১. ইউজার আইডি রিকভারি
  const userId = data.user_id || data.payer?.user_id || payload?.data?.user_id;
  if (!userId) return new Response('No User ID', { status: 400 });

  // 🛡️ SMART LOCK: তারিখটিকে ফিক্সড করে দিলাম (YYYY-MM-DD)
  // যদি Clerk থেকে তারিখ না আসে, তবে আমরা আজকের তারিখ ব্যবহার করব
  // এতে একই দিনে দুইবার ক্রেডিট অ্যাড হওয়া অসম্ভব হবে।
  const rawDate = data.current_period_start || new Date().toISOString();
  const currentPeriodLock = rawDate.split('T')[0]; // শুধু YYYY-MM-DD অংশটুকু নিবে

  // ২. পেইড প্ল্যান চেক
  let isPaidPlan = false;
  if (data.items && Array.isArray(data.items)) {
    isPaidPlan = data.items.some(item => 
      item.plan.amount > 0 && !item.plan.slug.toLowerCase().includes('free')
    );
  }

  if (eventType === 'subscription.created' || eventType === 'subscription.updated' || eventType === 'subscriptionItem.freeTrialEnding') {
    
    // নির্দেশ অনুযায়ী: ফ্রি হলে কিছুই করবে না
    if (!isPaidPlan) return new Response('No changes for free', { status: 200 });

    const userRef = doc(db, "users", userId);

    try {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // 🔥 এই চেকটিই ডুপ্লিকেট ক্রেডিট থামাবে
      // যদি ডাটাবেসে আগের পিরিয়ড লক আর বর্তমান লক মিলে যায়, তবে ক্রেডিট অ্যাড হবে না।
      if (userData.lastBillingPeriod === currentPeriodLock && userData.plan === "student") {
        console.log(`🛑 Blocked Duplicate: Credit already added for ${currentPeriodLock}`);
        return new Response('Already Credited for today/period', { status: 200 });
      }

      console.log(`🚀 Adding 2000 credits to user: ${userId}`);

      await setDoc(userRef, {
        plan: "student",
        credit: increment(2000), 
        lastBillingPeriod: currentPeriodLock, // লক সেভ হলো
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return new Response('Success: Credit Added', { status: 200 });

    } catch (error) {
      console.error("❌ Firebase Write Error:", error);
      return new Response('Database Error', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}