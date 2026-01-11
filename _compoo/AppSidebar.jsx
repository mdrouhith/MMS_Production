"use client";
import React from "react";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Sun, Moon, Zap, Plus, Trash2, MoreHorizontal } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { SignInButton, useUser, UserButton } from "@clerk/nextjs"; 
import UsageCreditProgress from "./UsageCreditProgress";

// 🟢 এখন আর লাল দাগ দেখাবে না কারণ আমরা ফাইলটি ধাপ ২-এ তৈরি করেছি
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import ChatHistoryList from "./ChatHistoryList";
import { useChat } from "@/context/ChatContext";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { startNewChat, deleteChat, chatId } = useChat();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3">
          {/* Logo & Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={"/logo.svg"}
                alt="logo"
                width={40}
                height={40}
                className="w-[40px] h-[40px]"
              />
              <h2 className="font-bold text-xl tracking-tight">Mirhas Studio</h2>
            </div>

            <div>
                {theme === "light" ? (
                  <Button variant={"ghost"} size={"icon"} onClick={() => setTheme("dark")}>
                    <Sun className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant={"ghost"} size={"icon"} onClick={() => setTheme("light")}>
                    <Moon className={"text-yellow-400 h-5 w-5"} />
                  </Button>
                )}
            </div>
          </div>

          {/* New Chat Button */}
          {user ? (
            <Button 
                className="mt-7 w-full shadow-sm hover:shadow-md transition-all duration-300 bg-primary/90 hover:bg-primary" 
                size="lg" 
                onClick={startNewChat}
            >
              <Plus className="mr-2 h-4 w-4" /> New Chat
            </Button>
          ) : (
            <SignInButton>
              <Button className="mt-7 w-full" size="lg">SIGN IN</Button>
            </SignInButton>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-3">
          <h2 className="font-bold text-lg px-1 mb-2 text-foreground/80">History</h2>
          {!user ? (
            <p className="text-sm text-muted-foreground mt-2 px-1">Sign in to save history</p>
          ) : (
            <ChatHistoryList />
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mb-2 space-y-4">
          {!user ? (
            <SignInButton>
              <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg" size="lg">
                Sign In / Sign Up
              </Button>
            </SignInButton>
          ) : (
            <>
              {/* Credit Progress */}
              <UsageCreditProgress />
              
              {/* Upgrade Button */}
              <Button
                className="w-full border border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 dark:text-amber-500"
                size="lg"
                variant="outline"
              >
                <span className="flex items-center justify-center w-7 h-7 mr-2 rounded-md bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-800">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-500" strokeWidth={2.5} />
                </span>
                Upgrade Plan
              </Button>

              {/* 🟢 DELETE CHAT BUTTON WITH NICE POP-UP */}
              {chatId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                        className="w-full flex justify-start items-center gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
                        variant="ghost"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium">Delete Current Chat</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your conversation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteChat(chatId)} 
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete Chat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* 🟢 COOL PROFILE SECTION */}
              <div className="pt-2 mt-2">
                  <div className="relative group overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-sm transition-all hover:bg-white/80 dark:hover:bg-white/10">
                     <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                            <div className="ring-2 ring-primary/20 rounded-full">
                                <UserButton afterSignOutUrl="/" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground leading-tight">
                                    {user?.fullName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Free Plan
                                </span>
                            </div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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