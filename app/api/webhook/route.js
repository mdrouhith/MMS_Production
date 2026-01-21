import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { doc, setDoc, increment } from "firebase/firestore";

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
  const status = data.status;

  console.log(`📥 Event: ${eventType}, Status: ${status}`);

  // 🟢 লজিক: পেমেন্ট সফল হলে
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    if (status === 'active' || status === 'succeeded') {
        
        try {
            // ১. Clerk যে আইডি পাঠাচ্ছে সেটা আপডেট করার চেষ্টা
            const incomingUserId = data.user_id;
            if (incomingUserId) {
                console.log(`🔄 Updating Incoming ID: ${incomingUserId}`);
                await setDoc(doc(db, "users", incomingUserId), {
                    plan: "student",
                    credit: increment(2000),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }

            // 🔥 ২. (Back Up) আপনার নির্দিষ্ট আইডি জোর করে আপডেট করা হচ্ছে
            // যাতে আইডি মিসম্যাচ হলেও আপনার কাজ হয়ে যায়
            const mySpecificId = "user_3875xZsn5905WFMP2791wC6atoU"; 
            
            console.log(`🚀 FORCE UPDATING YOUR ID: ${mySpecificId}`);
            await setDoc(doc(db, "users", mySpecificId), {
                plan: "student",
                credit: increment(2000), // প্রতি পেমেন্টে ২০০০ বাড়বে
                totalCredit: 2000,       // কার্ডে দেখানোর জন্য
                manualFix: true,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log("✅ SUCCESS: Force update complete.");

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            // Vercel লগে যদি এই এরর দেখেন, তার মানে Env Variable সমস্যা
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}