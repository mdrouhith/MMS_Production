import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; // FIXED: Added this import
import React from "react";
import { SignInButton } from "@clerk/nextjs";

export function AppHeader() {
  // Changed to export function for consistency
  return (
    <div className="p-3 w-full shadow flex justify-between items-center">
      <SidebarTrigger />
      <SignInButton>
        <Button>Sign In</Button>
      </SignInButton>
    </div>
  );
}

export default AppHeader;
