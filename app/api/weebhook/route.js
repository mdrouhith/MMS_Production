import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, updateDoc, increment } from "firebase/firestore";

export async function POST(req) {
  // ১. Clerk Dashboard থেকে পাওয়া Secret Key
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env.local');
  }

  // ২. হেডার ভেরিফিকেশন (সিকিউরিটির জন্য)
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  // ৩. ডাটা প্রসেসিং
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
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', { status: 400 });
  }

  // ৪. ইভেন্ট চেক এবং ফায়ারবেস আপডেট
  const eventType = evt.type;
  const { id, public_metadata } = evt.data;

  // ইভেন্ট: যখন ইউজারের মেটাডাটা আপডেট হবে (যেমন পেমেন্টের পর)
  if (eventType === 'user.updated') {
    
    // চেক করা হচ্ছে প্ল্যান 'pro' হয়েছে কি না
    if (public_metadata?.plan === 'pro') {
        const userRef = doc(db, "users", id);
        
        await updateDoc(userRef, {
            plan: "pro", // প্ল্যান আপডেট
            credit: increment(2000), // ২০০০ ক্রেডিট অ্যাড
            lastResetDate: new Date().toISOString().split('T')[0]
        });
        
        console.log(`Success: User ${id} is now PRO!`);
    }
  }

  return new Response('', { status: 200 });
}