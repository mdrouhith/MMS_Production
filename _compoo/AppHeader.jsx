import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; // FIXED: Added this import
import React from "react";

export function AppHeader() { // Changed to export function for consistency
  return (
   <div className="p-3 w-full shadow flex justify-between items-center">
      <SidebarTrigger />
      <Button>Sign In</Button>
   </div>
  );
}

export default AppHeader;