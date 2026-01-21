import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, increment } from "firebase/firestore";

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

  const data = evt.data;
  const eventType = evt.type;

  // 🕵️‍♂️ গোয়েন্দা লজিক: আইডি বা ইমেইল খোঁজা হচ্ছে বিভিন্ন জায়গায়
  let targetUserId = data.user_id || data.client_reference_id || data.metadata?.userId || data.metadata?.user_id;
  let targetEmail = data.email || data.customer_email || data.email_addresses?.[0]?.email_address;

  console.log(`🔍 Hunting for User... ID Found: ${targetUserId}, Email Found: ${targetEmail}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const status = data.status;

    if (status === 'active' || status === 'succeeded') {
        
        try {
            let userDocRef = null;

            // ১. যদি সরাসরি আইডি পাওয়া যায় (সবচেয়ে ভালো)
            if (targetUserId) {
                console.log(`🎯 Found ID directly: ${targetUserId}`);
                userDocRef = doc(db, "users", targetUserId);
            } 
            // ২. যদি আইডি না থাকে, কিন্তু ইমেইল থাকে -> ডাটাবেস খুঁজে আইডি বের করো
            else if (targetEmail) {
                console.log(`📧 Found Email: ${targetEmail}, searching in DB...`);
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", targetEmail));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const foundDoc = querySnapshot.docs[0];
                    userDocRef = foundDoc.ref;
                    console.log(`✅ User found via Email! ID is: ${foundDoc.id}`);
                } else {
                    console.log("❌ Email exists in webhook but NOT in Database.");
                }
            }

            // ৩. ফাইনাল আপডেট (যাকে পাওয়া গেছে তাকেই আপডেট করা হবে)
            if (userDocRef) {
                await setDoc(userDocRef, {
                    plan: "student",
                    credit: increment(2000), 
                    totalCredit: 2000,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                console.log(`🎉 SUCCESS: Plan Updated for the Real User!`);
            } else {
                // ⚠️ যদি সব ফেল করে, তখন লগে পুরো ডাটা দেখাবে যাতে আমরা বুঝতে পারি
                console.log("❌ FAILED: Could not identify the user. Payload Dump:", JSON.stringify(data));
            }

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}