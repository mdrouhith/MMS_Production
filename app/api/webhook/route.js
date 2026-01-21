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

  const eventType = evt.type;
  const data = evt.data;
  
  // 🟢 DYNAMIC ID: Clerk যে ইউজারের জন্য ইভেন্ট পাঠাবে, সেই আইডি নেওয়া হচ্ছে
  const userId = data.user_id; 
  const status = data.status; 

  console.log(`🔔 Event: ${eventType} | User: ${userId} | Status: ${status}`);

  // ইভেন্ট চেক
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    
    // স্ট্যাটাস এবং ইউজার আইডি চেক
    if ((status === 'active' || status === 'succeeded') && userId) {
        
        const userRef = doc(db, "users", userId);
        
        try {
            // 🔥 DYNAMIC UPDATE: যে ইউজার পেমেন্ট করেছে, শুধু তার ডকুমেন্ট আপডেট হবে
            await setDoc(userRef, {
                plan: "student",
                credit: increment(2000), // প্রতি পেমেন্টে ২০০০ বাড়বে
                totalCredit: 2000,       // কার্ডের টোটাল লিমিট
                updatedAt: new Date().toISOString()
            }, { merge: true }); // merge: true দিলে আগের ডাটা (নাম, ইমেইল) মুছবে না
            
            console.log(`✅ SUCCESS: Plan updated for User: ${userId}`);
        } catch (error) {
            console.error(`❌ DB Update Failed for ${userId}:`, error);
            return new Response('Database Error', { status: 500 });
        }
    } else {
        console.log(`⚠️ Skipped: Status is '${status}' or UserID missing.`);
    }
  }

  return new Response('Webhook received', { status: 200 });
}