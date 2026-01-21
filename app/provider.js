"use client";

import React, { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/_compoo/AppSidebar";
import AppHeader from "@/_compoo/AppHeader";
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { SelectedModelProvider } from "@/context/SelectedModelContext";
import { ChatProvider } from "@/context/ChatContext"; 

export default function Provider({ children, ...props }) {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      CreateNewUser();
    }
  }, [user]);

  const CreateNewUser = async () => {
    if (!user) return;

    // 🔴 আগে এখানে ইমেইল ছিল, যা ভুল। 
    // ✅ এখন Clerk ID (user.id) দেওয়া হলো, যা route.js এর সাথে মিলবে।
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData = {
        name: user?.fullName,
        email: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date(),
        // ❌ remainingMsg বাদ দেওয়া হলো (কারণ এটা আর লাগছে না)
        plan: "free",
        credit: 10, // ✅ শুরুতে ১০ ক্রেডিট পাবে (১০০০ না)
        lastResetDate: new Date().toISOString().split('T')[0] // ✅ ডেইলি রিসেটের জন্য ডেট সেট করা হলো
      };

      await setDoc(userRef, userData);
      console.log("New User Synced Correctly via Provider ✅");
    } else {
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
      <SelectedModelProvider>
        <ChatProvider> 
          <SidebarProvider defaultOpen={true} className="flex flex-row items-start justify-start h-screen w-full">
            <AppSidebar />
            <main className="w-full flex-1 h-full flex flex-col items-start justify-start overflow-hidden">
              <div className="w-full h-full relative flex flex-col">
                <AppHeader />
                {children}
              </div>
            </main>
          </SidebarProvider>
        </ChatProvider>
      </SelectedModelProvider>
    </NextThemesProvider>
  );
}