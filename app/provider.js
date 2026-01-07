"use client"

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar"; // Removed SidebarTrigger from here
import { AppSidebar } from "@/_compoo/AppSidebar";
import AppHeader from "@/_compoo/AppHeader"; // Ensure default import matches your file

export default function Provider({ children, ...props }) {
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