import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, setDoc } from "firebase/firestore"; // 🟢 updateDoc এর বদলে setDoc আনা হয়েছে

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response('Error: Secret missing', { status: 500 });

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
    console.error('Verify Failed:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  // লগ দেখুন Vercel এ
  console.log(`Checking Event: ${eventType}`);
  console.log(`Data Status: ${data.status}, UserID: ${data.user_id}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const userId = data.user_id; 
    const status = data.status; 

    // 🟢 'active' অথবা 'succeeded' দুটোই চেক করা হচ্ছে (Stripe এর ভিন্ন রেসপন্সের জন্য)
    if ((status === 'active' || status === 'succeeded') && userId) {
        const userRef = doc(db, "users", userId);
        
        try {
            // 🔥 updateDoc সরিয়ে setDoc দেওয়া হলো
            // merge: true মানে আগের ডাটা মুছবে না, শুধু plan আপডেট করবে
            await setDoc(userRef, {
                plan: "student" 
            }, { merge: true }); 
            
            console.log(`✅ FORCE UPDATE SUCCESS: User ${userId} is now STUDENT`);
        } catch (error) {
            console.error("❌ Database Write Error:", error);
            return new Response('DB Write Failed', { status: 500 });
        }
    } else {
        console.log("⚠️ Condition Failed: Status or UserID missing");
    }
  }

  return new Response('Webhook received', { status: 200 });
}