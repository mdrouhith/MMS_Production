import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, updateDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ Error: WEBHOOK_SECRET is missing');
    return new Response('Error: WEBHOOK_SECRET is missing', { status: 500 });
  }

  // 🟢 Next.js 16 Fix: 'await' ব্যবহার করতে হবে
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // হেডার চেক
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Error: Missing svix headers');
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  // বডি প্রসেসিং
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
    console.error('❌ Error verifying webhook:', err);
    return new Response('Error occured', { status: 400 });
  }

  // ইভেন্ট চেক
  const eventType = evt.type;
  const { id, public_metadata } = evt.data;

  console.log(`✅ Webhook Received! Event: ${eventType}, UserID: ${id}`);
  console.log(`🔎 Current Metadata:`, public_metadata);

  // 🟢 লজিক: আমরা এখন সব ধরণের আপডেট চেক করব
  if (eventType === 'user.updated' || eventType === 'session.created') {
    
    // যদি মেটাডাটাতে 'plan' থাকে অথবা আমরা ফোর্স আপডেট করতে চাই
    // নোট: Clerk Pricing Table সরাসরি মেটাডাটা আপডেট করে না, তাই আমরা
    // আপাতত পেমেন্ট হলেই ক্রেডিট দিচ্ছি (Stripe কানেকশন ছাড়া এটাই অটোমেটিক করার উপায়)
    
    // এখানে আমরা চেক করছি পেমেন্ট স্ট্যাটাস বা প্ল্যান
    // আপনার ক্ষেত্রে, যেহেতু Pricing Table ব্যবহার করছেন, Clerk মেটাডাটা আপডেট নাও করতে পারে।
    // তাই আমরা আপাতত টেস্ট করার জন্য সরাসরি আপডেট করে দিব।
    
    const userRef = doc(db, "users", id);
        
    try {
        // 🔥 অটোমেটিক আপডেট (শর্ত শিথিল করা হয়েছে)
        if (public_metadata?.plan === 'pro') {
            await updateDoc(userRef, {
                plan: "pro",
                credit: increment(2000),
                lastResetDate: new Date().toISOString().split('T')[0]
            });
            console.log(`🎉 Success: User ${id} upgraded to PRO via Webhook!`);
        } else {
            console.log(`⚠️ User updated but Plan is NOT 'pro'. Current plan: ${public_metadata?.plan}`);
        }

    } catch (error) {
        console.error("❌ Firestore Update Error:", error);
    }
  }

  return new Response('Webhook received', { status: 200 });
}