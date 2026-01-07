"use client"

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function Home() {
  const { setTheme } = useTheme(); // এই লাইনটি যোগ করা হয়েছে

  return (
    <div>
      <h2>Mirhas Magic Studio</h2>
      <Button>Get Started</Button>
      {/* setTheme-এর মাঝখান থেকে = চিহ্ন সরানো হয়েছে */}
      <Button onClick={() => setTheme('dark')}>Dark Mode</Button>
      <Button onClick={() => setTheme('light')}>Light Mode</Button>
    </div>
  );
}