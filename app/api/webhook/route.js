import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, setDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Error: WEBHOOK_SECRET missing', { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing headers', { status: 400 });
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
    console.error('Webhook Verify Failed:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;
  
  // 🟢 DYNAMIC ID: আপনার লগইন করা ইউজার আইডি (যেমন: user_3875...) এখান থেকেই আসবে
  const userId = data.user_id; 
  const status = data.status; 

  console.log(`🔔 Webhook Triggered: ${eventType} | User: ${userId} | Status: ${status}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    // স্ট্যাটাস যদি পেমেন্ট সাকসেস হয়
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        // 🔥 সরাসরি ওই আইডি টার্গেট করা হচ্ছে
        const userRef = doc(db, "users", userId);
        
        try {
            // setDoc + merge: true (এটাই আসল ফিক্স)
            // এটি নিশ্চিত করে যে ডাটাবেসে ডাটা রাইট হবেই
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000,
                updatedAt: new Date().toISOString()
            }, { merge: true }); // merge: true দিলে আপনার নাম/ইমেইল মুছবে না
            
            console.log(`✅ FORCE UPDATE SUCCESS: Plan set to STUDENT for ${userId}`);
        } catch (error) {
            console.error(`❌ DB Write Failed for ${userId}:`, error);
            return new Response('Database Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}