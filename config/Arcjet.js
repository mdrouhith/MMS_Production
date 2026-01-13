import arcjet, { tokenBucket } from "@arcjet/next";

export const aj = arcjet({
  key: process.env.ARCJET_KEY, 
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // ⚠️ লাইভ মোডে ৮৬৪০০ সেকেন্ডে ৫ টোকেন রিফিল হবে (মানে প্রতিদিন)
      interval: 120, // ⚠️ টেস্ট করার জন্য ৫ সেকেন্ড। লাইভ করার সময় 86400 দেবে।
      capacity: 5, 
    }),
  ],
});