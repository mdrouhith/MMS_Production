"use client";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Sun, Moon, User, User2, Bolt, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { SignInButton, useUser } from "@clerk/nextjs";
import UsageCreditProgress from "./UsageCreditProgress";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={"/logo.svg"}
                alt="logo"
                width={60}
                height={60}
                className="w-[40px] h-[40px]"
              />
              <h2 className="font-bold text-xl">Mirhas Studio</h2>

              <div>
                {theme === "light" ? (
                  <Button
                    variant={"ghost"}
                    size={"icon"}
                    onClick={() => setTheme("dark")}
                  >
                    <Sun className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant={"ghost"}
                    size={"icon"}
                    onClick={() => setTheme("light")}
                  > 
                    <Moon className={"text-yellow-400 h-5 w-5"} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {user ? (
            <Button className="mt-7 w-full" size="lg">
              + New Chat
            </Button>
          ) : (
            <SignInButton ><Button className="mt-7 w-full" size="lg"
                size="lg" >SIGN IN</Button></SignInButton>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className={"p-3"} />
        <h2 className="font-bold text-lg ">Chat</h2>

        {!user && (
          <p className="text-base text-gray-400">
            Sign in to start chating with multiple AI models
          </p>
        )}
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 mb-10">
          {!user ? (
            <SignInButton>
              <Button
                className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 font-semibold"
                size="lg"
              >
                Sign In / Sign Up
              </Button>
            </SignInButton>
          ) : (
            <div className="space-y-4 p-2">
              <UsageCreditProgress />
              {/* Premium Upgrade Button */}
              <Button
                className="w-full border border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all duration-300 shadow-sm font-bold tracking-wide"
                size="lg"
              >
                {/* Professional Icon Badge */}
                <span className="flex items-center justify-center w-7 h-7 mr-2 rounded-md bg-amber-100 ring-1 ring-amber-200">
                  <Zap className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                </span>
                Upgrade Plan
              </Button>

              {/* Settings Button */}
              <Button
                className="w-full flex justify-start items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                variant="ghost"
                size="lg"
              >
                <User2 className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>{" "}
      {/* FIXED: Changed from <SidebarFooter/> to </SidebarFooter> */}
    </Sidebar>
  );
}
