"use client";

import React, { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/_compoo/AppSidebar";
import AppHeader from "@/_compoo/AppHeader";
import LandingPage from "@/_compoo/LandingPage"; // ✅ নতুন ল্যান্ডিং পেজ ইম্পোর্ট
import { useUser, SignedIn, SignedOut } from "@clerk/nextjs"; // ✅ এগুলা যোগ করো
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
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData = {
        name: user?.fullName,
        email: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date(),
        plan: "free",
        credit: 10,
        lastResetDate: new Date().toISOString().split('T')[0]
      };
      await setDoc(userRef, userData);
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
          
          {/* ✅ ১. যদি লগ-আউট থাকে তবে শুধু ল্যান্ডিং পেজ দেখাবে */}
          <SignedOut>
            <LandingPage />
          </SignedOut>

          {/* ✅ ২. যদি লগ-ইন থাকে তবে তোমার আগের সব কোড (Sidebar, Header, Chat) দেখাবে */}
          <SignedIn>
            <SidebarProvider defaultOpen={true} className="flex flex-row items-start justify-start h-screen w-full">
              <AppSidebar />
              <main className="w-full flex-1 h-full flex flex-col items-start justify-start overflow-hidden">
                <div className="w-full h-full relative flex flex-col">
                  <AppHeader />
                  {children}
                </div>
              </main>
            </SidebarProvider>
          </SignedIn>

        </ChatProvider>
      </SelectedModelProvider>
    </NextThemesProvider>
  );
}