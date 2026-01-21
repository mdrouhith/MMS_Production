import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PricingTable } from '@clerk/nextjs'; 

export function PricingModal({ children }) {
  return (
    <Dialog>
      {/* asChild ব্যবহার করা ঠিক আছে, এতে এক্সট্রা বাটন তৈরি হয় না */}
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      {/* 🟢 Change 1: 'overflow-y-auto' এবং 'max-h-[90vh]' যোগ করেছি।
         কারণ: Clerk এর টেবিলটি অনেক লম্বা হতে পারে। ছোট স্ক্রিনে যাতে 
         স্ক্রল করা যায় এবং পপআপটি স্ক্রিনের বাইরে চলে না যায়, তাই এটা জরুরি। */}
      <DialogContent className="sm:max-w-4xl w-full bg-background overflow-y-auto max-h-[90vh]">
        
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-center">
            Choose the best plan that fits your needs.
          </DialogDescription>
        </DialogHeader>
        
        {/* 🟢 Change 2: একটি 'div' র‍্যাপার দিয়েছি এবং 'w-full' দিয়েছি 
           যাতে টেবিলটি মোডালের পুরো জায়গা জুড়ে থাকে। */}
        <div className="mt-4 w-full flex justify-center">
            {/* Clerk Dashboard থেকে কনফিগার করা টেবিল এখানে শো হবে */}
            <PricingTable />
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default PricingModal;