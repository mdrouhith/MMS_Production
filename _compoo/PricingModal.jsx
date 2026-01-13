import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PricingTable } from '@clerk/nextjs';// আপনার প্রাইসিং টেবিল ইম্পোর্ট করুন

export function PricingModal({ children }) {
  return (
    <Dialog>
      {/* asChild দিলে ভেতরের বাটনটিই ট্রিগার হিসেবে কাজ করবে, এক্সট্রা বাটন তৈরি হবে না */}
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      {/* max-w-4xl দিয়েছি যাতে টেবিলটা চওড়া দেখায় */}
      <DialogContent className="sm:max-w-4xl w-full bg-background overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-center">
            Choose the best plan that fits your needs.
          </DialogDescription>
        </DialogHeader>
        
        {/* এখানে আপনার প্রাইসিং টেবিল শো হবে */}
        <div className="mt-4">
            <PricingTable />
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default PricingModal;