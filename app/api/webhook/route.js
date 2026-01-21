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

  const data = evt.data;
  const status = data.status;

  console.log(`⚡ Event Received. Status: ${status}`);

  // 🟢 আপনার স্পেসিফিক আইডি (যেটা লগইন করলে আসে)
  const myUserId = "user_3875xZsn5905WFMP2791wC6atoU"; 

  // 🔥 লজিক: পেমেন্ট অ্যাক্টিভ হলেই হলো, আর কিছু দেখার দরকার নেই
  if (status === 'active' || status === 'succeeded') {
      try {
          console.log(`🚀 Blindly Force Updating User: ${myUserId}`);

          // কোনো শর্ত ছাড়াই আপনার আইডি আপডেট হবে
          await setDoc(doc(db, "users", myUserId), {
              plan: "student",
              credit: increment(2000), 
              totalCredit: 2000,
              lastPaymentStatus: status,
              updatedAt: new Date().toISOString()
          }, { merge: true });

          console.log("✅ SUCCESS: Account Force Unlocked!");
          
      } catch (error) {
          console.error("❌ DB Error (Check Firebase Config):", error);
          return new Response('DB Error', { status: 500 });
      }
  } else {
      console.log("⚠️ Payment not active yet.");
  }

  return new Response('Webhook received', { status: 200 });
}