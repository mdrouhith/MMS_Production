import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response('Secret missing', { status: 500 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Header missing', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature });
  } catch (err) {
    return new Response('Verify error', { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  // 🟢 এখানে আপনার আসল ডকুমেন্ট খুঁজে বের করার লজিক
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const userId = data.user_id; 
    const status = data.status; 
    // Clerk থেকে ইমেইল এড্রেস বের করার চেষ্টা (সব সময় থাকে না, তবে চেষ্টা করা হচ্ছে)
    const userEmail = data.email_addresses?.[0]?.email_address; 

    if ((status === 'active' || status === 'succeeded') && userId) {
        
        console.log(`🔍 Looking for user: ${userId}`);
        
        let targetDocRef = doc(db, "users", userId); // ডিফল্ট টার্গেট: User ID
        
        // 🚀 স্পেশাল চেক: যদি আপনার সিস্টেমে ইমেইল দিয়ে ডকুমেন্ট সেভ করা থাকে
        if (userEmail) {
            // চেক করি ইমেইল দিয়ে কোনো ডকুমেন্ট আছে কি না
            const emailDocRef = doc(db, "users", userEmail);
            const emailDocSnap = await getDoc(emailDocRef);
            
            if (emailDocSnap.exists()) {
                console.log(`✅ Found document by Email: ${userEmail}`);
                targetDocRef = emailDocRef; // টার্গেট চেঞ্জ করে ইমেইল ডকুমেন্ট করা হলো
            } else {
                // যদি ইমেইল দিয়ে না থাকে, তবে দেখি User ID ডকুমেন্টটা আছে কি না
                 const idDocSnap = await getDoc(targetDocRef);
                 if(idDocSnap.exists()){
                     console.log(`✅ Found document by User ID: ${userId}`);
                 } else {
                     console.log(`⚠️ No doc found, creating new one for ${userId}`);
                 }
            }
        }

        try {
            // 🔥 ফাইনাল আপডেট (যেটাতেই হোক, আপডেট হবেই)
            await setDoc(targetDocRef, {
                plan: "student",
                credit: increment(2000), 
                paymentId: data.id,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`🎉 SUCCESS: Plan updated to STUDENT for ${targetDocRef.id}`);
        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}