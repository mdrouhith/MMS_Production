"use client"

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { ChatInputBox } from "@/_compoo/ChatInputBox";

export default function Home() {
  const { setTheme } = useTheme(); // এই লাইনটি যোগ করা হয়েছে

  return (
    <div>
      <ChatInputBox />
    </div>
  );
}