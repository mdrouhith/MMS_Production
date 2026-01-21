"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function UserSync() {
  const { user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        // ✅ আসল সমাধান: আমরা Clerk-এর ID (user.id) ব্যবহার করছি
        // ফলে route.js এবং frontend এখন একই ID ব্যবহার করবে।
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);

        // যদি ইউজার ডাটাবেসে না থাকে, তবেই নতুন করে তৈরি হবে
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: user.fullName,
            email: user.primaryEmailAddress?.emailAddress,
            credit: 10, // শুরুতে ১০ ক্রেডিট
            plan: "free",
            createdAt: new Date(),
            lastResetDate: new Date().toISOString().split('T')[0]
          });
          console.log("User Synced to DB ✅");
        }
      }
    };

    syncUser();
  }, [user]);

  return null; // এটি স্ক্রিনে কিছু দেখাবে না, শুধু ব্যাকগ্রাউন্ডে কাজ করবে
}