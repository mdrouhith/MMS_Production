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

  // ২. হেডার ভেরিফিকেশন (Next.js 16 Fix: await যোগ করা হয়েছে)
  const headerPayload = await headers(); // 🟢 এখানে await যোগ করা হয়েছে
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

  // ৪. ইভেন্ট হ্যান্ডলিং
  const eventType = evt.type;
  const { id, public_metadata } = evt.data;

  // ইভেন্ট: ইউজার আপডেট হলে
  if (eventType === 'user.updated') {
    // চেক: যদি প্ল্যান 'pro' হয়
    if (public_metadata?.plan === 'pro') {
        const userRef = doc(db, "users", id);
        
        try {
          await updateDoc(userRef, {
              plan: "pro", 
              credit: increment(2000), 
              lastResetDate: new Date().toISOString().split('T')[0]
          });
          console.log(`Success: User ${id} upgraded to PRO!`);
        } catch (error) {
          console.error("Error updating Firestore:", error);
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}