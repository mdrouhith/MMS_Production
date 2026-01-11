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
// 🟢 ১. নতুন ইম্পোর্ট (ChatContext)
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

    const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData = {
        name: user?.fullName,
        email: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date(),
        remainingMsg: 5,
        plan: "free",
        credit: 1000,
      };

      await setDoc(userRef, userData);
      console.log("New User created in Firestore");
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
        {/* 🟢 ২. ChatProvider দিয়ে র‍্যাপ করা হলো যাতে পুরো অ্যাপে চ্যাট ডাটা পাওয়া যায় */}
        <ChatProvider> 
          
          {/* 🟢 ৩. CSS ফিক্স: items-start এবং justify-start দেওয়া হলো যাতে সেন্টার না হয়ে যায় */}
          <SidebarProvider defaultOpen={true} className="flex flex-row items-start justify-start h-screen w-full">
            
            <AppSidebar />
            
            {/* 🟢 ৪. মেইন কন্টেইনার ফিক্স: overflow-hidden দেওয়া হলো যাতে ডাবল স্ক্রলবার না আসে */}
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