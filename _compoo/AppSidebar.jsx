"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from "@/components/ui/sidebar";
import { Sun, Moon, Zap, Plus, Trash2 } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { SignInButton, useUser, UserButton, PricingTable } from "@clerk/nextjs"; 
import UsageCreditProgress from "./UsageCreditProgress";
import { db } from "@/config/FirebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import ChatHistoryList from "./ChatHistoryList";
import { useChat } from "@/context/ChatContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PricingModal } from "./PricingModal.jsx";

// 🛠️ প্ল্যান লিমিট কনফিগারেশন
const PLAN_LIMITS = {
  "free": 5,
  "starter": 1000,
  "creator": 4000,
  "business": 10000
};

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { startNewChat, deleteChat, chatId } = useChat();

  const [credits, setCredits] = useState(0);
  const [userPlan, setUserPlan] = useState("free");

  // 🔥 Hydration Fix: মাউন্টেড স্টেট
  const [mounted, setMounted] = useState(false);

  // মাউন্টেড চেক
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.id);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const realBalance = data.credit !== undefined ? data.credit : (data.remainingMsg || 0);
            setCredits(realBalance);
            setUserPlan(data.plan || "free");
        }
    });
    return () => unsubscribe();
  }, [user]);

  let totalLimit = PLAN_LIMITS[userPlan] || 5;
  if (userPlan === 'free' && credits > 50) {
      totalLimit = 1000; 
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src={"/logo.svg"} alt="logo" width={40} height={40} className="w-[40px] h-[40px]" />
              <h2 className="font-bold text-xl tracking-tight">Mirhas Studio</h2>
            </div>
            
            {/* 🔥 Theme Toggle Fix: মাউন্টেড না হওয়া পর্যন্ত রেন্ডার হবে না */}
            <div>
                {mounted && (
                  theme === "light" ? (
                    <Button variant={"ghost"} size={"icon"} onClick={() => setTheme("dark")}>
                      <Sun className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant={"ghost"} size={"icon"} onClick={() => setTheme("light")}>
                      <Moon className={"text-yellow-400 h-5 w-5"} />
                    </Button>
                  )
                )}
            </div>
          </div>
          {user ? (
            <Button className="mt-7 w-full shadow-sm bg-primary/90 hover:bg-primary" size="lg" onClick={startNewChat}>
              <Plus className="mr-2 h-4 w-4" /> New Chat
            </Button>
          ) : (
             <SignInButton><Button className="mt-7 w-full" size="lg">SIGN IN</Button></SignInButton>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-3">
          <h2 className="font-bold text-lg px-1 mb-2 text-foreground/80">History</h2>
          {!user ? <p className="text-sm text-muted-foreground mt-2 px-1">Sign in to save history</p> : <ChatHistoryList />}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mb-2 space-y-4">
          {!user ? (
             <SignInButton><Button className="w-full bg-primary" size="lg">Sign In / Sign Up</Button></SignInButton>
          ) : (
            <>
              <UsageCreditProgress 
                  remaining={credits} 
                  total={totalLimit} 
                  planName={userPlan === 'free' && credits > 50 ? "Starter Gift" : userPlan} 
              />
              
            <PricingModal>
                <Button className="w-full border border-amber-500/30 text-amber-600 hover:bg-amber-50" size="lg" variant="outline">
                    <Zap className="w-4 h-4 mr-2 text-amber-600" /> Upgrade Plan
                </Button>
            </PricingModal>
              
              {chatId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full flex justify-start items-center gap-3 text-red-500" variant="ghost">
                        <Trash2 className="w-4 h-4" /> <span className="font-medium">Delete Current Chat</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteChat(chatId)} className="bg-red-600 text-white">Delete Chat</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <div className="pt-2 mt-2">
                 <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <UserButton afterSignOutUrl="/" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{user?.fullName}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{userPlan} Plan</span>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}