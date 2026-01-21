import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req) {
  // ১. সিক্রেট কি চেক
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response('Error: Secret missing', { status: 500 });

  // ২. হেডার ভেরিফিকেশন (Next.js 16 সাপোর্টেড)
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing headers', { status: 400 });
  }

  // ৩. ওয়েবহুক ভেরিফাই করা
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
    console.error('Verify Failed:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  // ৪. ইভেন্ট চেক এবং ডাটাবেস আপডেট
  const eventType = evt.type;
  const data = evt.data;

  // যদি সাবস্ক্রিপশন ক্রিয়েট বা আপডেট হয়
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const userId = data.user_id;
    const status = data.status;

    // যদি স্ট্যাটাস 'active' হয় (মানে পেমেন্ট সাকসেস)
    if (status === 'active' && userId) {
        const userRef = doc(db, "users", userId);
        
        try {
            // 🔥 মেইন কাজ: শুধু প্ল্যান আপডেট করা হচ্ছে
            await updateDoc(userRef, {
                plan: "student"
            });
            console.log(`✅ Success: User ${userId} is now a STUDENT (Unlocked)`);
        } catch (error) {
            console.error("❌ Database Update Failed:", error);
            return new Response('DB Update Failed', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}