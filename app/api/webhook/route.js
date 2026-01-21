import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";

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

  // 🟢 এখানে আমরা ইমেইল বের করছি
  const userEmail = data.email_addresses?.[0]?.email_address;
  console.log(`🔍 Webhook for Email: ${userEmail}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const status = data.status; 

    // পেমেন্ট সাকসেস হলে
    if (status === 'active' || status === 'succeeded') {
        
        try {
            // 🔥 ID দিয়ে না খুঁজে, আমরা EMAIL দিয়ে খুঁজব
            if (userEmail) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", userEmail));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    console.log("❌ No user found with this email!");
                    return new Response('User not found', { status: 200 }); // 200 রিটার্ন করছি যাতে Clerk রিট্রাই না করে
                }

                // ইমেইল ম্যাচ করলে সেই ডকুমেন্ট আপডেট হবে
                querySnapshot.forEach(async (doc) => {
                    await updateDoc(doc.ref, {
                        plan: "student",
                        credit: increment(2000),
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`✅ SUCCESS: Updated Plan for ${doc.id} (${userEmail})`);
                });
            } else {
                console.log("❌ Email not found in webhook data");
            }

        } catch (error) {
            console.error("❌ DB Update Error:", error);
            return new Response('DB Error', { status: 500 });
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}