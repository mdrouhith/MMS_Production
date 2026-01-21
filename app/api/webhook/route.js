import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, setDoc, increment } from "firebase/firestore";

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

  // 🟢 FIX: আপনার Payload Dump অনুযায়ী সঠিক লোকেশন
  // ডাটাগুলো 'payer' অবজেক্টের ভেতরে আছে
  const payer = data.payer || {};
  const userId = payer.user_id; 
  const userEmail = payer.email;
  const status = data.status;

  console.log(`🎯 Target Found from Dump -> ID: ${userId} | Email: ${userEmail} | Status: ${status}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    // স্ট্যাটাস এবং আইডি চেক
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);
        
        try {
            console.log(`🚀 Updating DB for: ${userId}`);

            // ডাটাবেস আপডেট
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), 
                totalCredit: 2000,
                paymentEmail: userEmail, // ফিউচার রেফারেন্সের জন্য ইমেইলও সেভ রাখছি
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`✅ SUCCESS: Plan updated for ${userId}`);
        } catch (error) {
            console.error("❌ DB Update Failed:", error);
            return new Response('Database Error', { status: 500 });
        }
    } else {
        console.log("⚠️ Skipped: Missing User ID in 'payer' object or inactive status.");
    }
  }

  return new Response('Webhook received', { status: 200 });
}