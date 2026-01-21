import { NextResponse } from "next/server";
import { db } from "@/config/FirebaseConfig";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

export async function POST(req) {
  try {
    // ১. ফ্রন্টএন্ড বা পেমেন্ট গেটওয়ে থেকে ডাটা রিসিভ করা
    const body = await req.json();
    const { userId } = body; // আমরা শুধু User ID এক্সপেক্ট করছি

    // ২. চেক করা ইউজার আইডি আছে কি না
    if (!userId) {
      return NextResponse.json({ error: "User ID is missing" }, { status: 400 });
    }

    // ৩. ফায়ারবেস রেফারেন্স
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    // ৪. যদি ইউজার না থাকে
    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // ৫. আসল কাজ: প্ল্যান আপডেট এবং ক্রেডিট যোগ করা
    await updateDoc(userRef, {
      plan: "pro", // প্ল্যান ফ্রি থেকে প্রো হয়ে যাবে
      credit: increment(2000), // আগের ক্রেডিটের সাথে ২০০০ যোগ হবে
      lastResetDate: new Date().toISOString().split('T')[0], // আজকের তারিখ সেট হবে
      paymentStatus: "paid" // (অপশনাল) ট্র্যাকিংয়ের জন্য
    });

    return NextResponse.json({ 
      success: true, 
      message: "User upgraded to PRO and 2000 credits added!" 
    });

  } catch (error) {
    console.error("Billing API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}