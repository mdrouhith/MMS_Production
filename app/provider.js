"use client"

import React, { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar"; // Removed SidebarTrigger from here
import { AppSidebar } from "@/_compoo/AppSidebar";
import AppHeader from "@/_compoo/AppHeader"; // Ensure default import matches your file
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";



export default function Provider({ children, ...props }) {


  const { user } = useUser();

  useEffect(() => {
  if (user) {
    CreateNewUser(); // <-- parentheses to call the function
  }
}, [user]);
  

const CreateNewUser = async () => {
  if (!user) return;

  const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
  const userSnap = await getDoc(userRef);

  // যদি ইউজার না থাকে (not exists), তাহলেই নতুন ইউজার তৈরি করবো
  if (!userSnap.exists()) {
    const userData = {
      name: user?.fullName,
      email: user?.primaryEmailAddress?.emailAddress,
      createdAt: new Date(),
      remainingMsg: 5, // spelling fixed: reminaingMsg -> remainingMsg
      plan: "free",
      credit: 1000, // spelling fixed: creadit -> credit
    };

    await setDoc(userRef, userData);
    console.log("New User created in Firestore");
  } else {
    // আর যদি ইউজার আগেই থাকে, তাহলে আমরা কিছু করবো না
    console.log("User already exists");
  }
};
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <SidebarProvider>
        <AppSidebar />
        
        <main className="w-full">
          {/* FIXED: Removed the extra SidebarTrigger from here since it's now inside AppHeader */}
          <div className="w-full">
            <AppHeader/>
            {children}
          </div>
        </main>
      </SidebarProvider>
    </NextThemesProvider>
  );
}