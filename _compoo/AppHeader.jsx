import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; 
import React from "react";
import { SignInButton } from "@clerk/nextjs";

export function AppHeader() {
  return (
    // FIX: z-index কমিয়ে 40 করা হলো যাতে সাইডবারের উপরে না উঠে যায়
    // backdrop-blur এর সাথে border-b শক্ত করা হলো
    <div className="p-3 w-full h-16 flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
      <SidebarTrigger />
      <SignInButton>
        <Button>Sign In</Button>
      </SignInButton>
    </div>
  );
}

export default AppHeader;