"use client" // নেক্সট থিম এবং সাইডবার ইন্টারঅ্যাকশনের জন্য এটি জরুরি

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/_compoo/AppSidebar";

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
        {/* সাইডবারটি আলাদা থাকবে */}
        <AppSidebar />
        
        <main className="w-full">
          {/* সাইডবার খোলার বাটন এবং আপনার মেইন পেজের কন্টেন্ট */}
          <SidebarTrigger />
          <div>
            {children}
          </div>
        </main>
      </SidebarProvider>
    </NextThemesProvider>
  );
}