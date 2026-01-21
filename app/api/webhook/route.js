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

  // 🟢 FIX 1: Next.js 16 এর জন্য await headers() ব্যবহার করা হয়েছে
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // Payload প্রসেসিং
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
    return new Response('Error verifying webhook', { status: 400 });
  }

  // ইভেন্ট ডাটা
  const eventType = evt.type;
  const data = evt.data;

  console.log(`📥 Webhook Event: ${eventType}`);

  // 🟢 FIX 2: আমরা এখন Subscription ইভেন্ট ধরছি
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    const userId = data.user_id; 
    const status = data.status; 

    console.log(`👤 User ID: ${userId}, Status: ${status}`);

    // যদি স্ট্যাটাস 'active' হয়, তার মানে পেমেন্ট সফল
    if (status === 'active' && userId) {
        const userRef = doc(db, "users", userId);
        
        try {
            // 🟢 FIX 3: আপনার বলা 'student' প্ল্যান এবং ২০০০ ক্রেডিট আপডেট
            await updateDoc(userRef, {
                plan: "student", 
                credit: increment(2000), // 🔥 নিশ্চিত করুন ডাটাবেসে নাম 'credit' ই আছে
                paymentId: data.id, 
                lastResetDate: new Date().toISOString().split('T')[0]
            });
            console.log(`🎉 Success: User ${userId} is now a STUDENT with 2000 credits!`);
        } catch (error) {
            console.error("❌ Firestore Update Error:", error);
            return new Response('Error updating user data', { status: 500 });
        }
    }
  }

  return new Response('Webhook received successfully', { status: 200 });
}