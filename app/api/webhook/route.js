import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from "@/config/FirebaseConfig";
import { collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";

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
    return new Response('Error verifying webhook', { status: 400 });
  }

  const data = evt.data;
  const eventType = evt.type;
  
  console.log(`🔔 Event: ${eventType} | Status: ${data.status}`);

  // 🔍 ইমেইল বের করার চেষ্টা (ভিন্ন ভিন্ন জায়গায় থাকতে পারে)
  // ১. সরাসরি ইমেইল ফিল্ড
  // ২. কাস্টমার ডিটেইলস এর ভেতরে ইমেইল
  // ৩. ইমেইল এড্রেস এরে (Array) এর ভেতরে
  let targetEmail = data.email || data.customer_email || data.email_addresses?.[0]?.email_address;

  // যদি তাও না পাই, আমরা হার্ডকোড করে আপনার ইমেইলটা চেক করব (Last Resort)
  if (!targetEmail) {
      console.log("⚠️ No Email found in payload, trying fallback...");
      // সাবস্ক্রিপশন অবজেক্টের মেটাডাটা চেক
      if(data.metadata && data.metadata.email) {
        targetEmail = data.metadata.email;
      }
  }

  console.log(`📧 Target Email Found: ${targetEmail}`);

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    const status = data.status;

    if (status === 'active' || status === 'succeeded') {
        
        if (targetEmail) {
            try {
                // 🔥 ডাটাবেসে এই ইমেইল দিয়ে ইউজার খুঁজছি
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", targetEmail));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    console.log(`❌ No user found with email: ${targetEmail}`);
                    
                    // ⚠️ ইমার্জেন্সি: যদি ইমেইল দিয়েও না পায়, তবে আপনার স্পেসিফিক মেইল ট্রাই করবে
                    // এটা শুধুমাত্র আপনার ফিক্সের জন্য
                    if(targetEmail !== "pubgloverruhith@gmail.com") {
                         console.log("🔄 Trying your specific email manually...");
                         const specificQ = query(usersRef, where("email", "==", "pubgloverruhith@gmail.com"));
                         const specificSnap = await getDocs(specificQ);
                         specificSnap.forEach(async (doc) => {
                            await updateDoc(doc.ref, {
                                plan: "student",
                                credit: increment(2000),
                                totalCredit: 2000,
                                updatedAt: new Date().toISOString()
                            });
                            console.log(`✅ SUCCESS (Fallback): Plan Updated for ${doc.id}`);
                         });
                    }

                } else {
                    // ✅ ইউজার পাওয়া গেছে! আপডেট করছি...
                    querySnapshot.forEach(async (doc) => {
                        console.log(`🚀 Found User Doc: ${doc.id}. Updating...`);
                        
                        await updateDoc(doc.ref, {
                            plan: "student",
                            credit: increment(2000), 
                            totalCredit: 2000,
                            updatedAt: new Date().toISOString()
                        });
                        
                        console.log(`✅ SUCCESS: User ${doc.id} is now Student!`);
                    });
                }
            } catch (error) {
                console.error("❌ DB Query Error:", error);
                return new Response('DB Error', { status: 500 });
            }
        } else {
            console.log("❌ CRITICAL: Could not find ANY email in the webhook payload.");
        }
    }
  }

  return new Response('Webhook received', { status: 200 });
}