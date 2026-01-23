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
        // Webhook এর সাথে ID মিল রাখার জন্য user.id ব্যবহার
        const userRef = doc(db, "users", user.id); 
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // ইউজার না থাকলে একদম নতুন হিসেবে তৈরি হবে
          await setDoc(userRef, {
            name: user.fullName,
            email: user.primaryEmailAddress?.emailAddress,
            credit: 10,
            plan: "free",
            createdAt: new Date().toISOString(),
          });
          console.log("New User Synced ✅");
        }
      }
    };
    syncUser();
  }, [user]);

  return null;
}