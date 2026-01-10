import arcjet, { tokenBucket } from "@arcjet/next";

export const aj = arcjet({
  // ফিক্স: '!' মুছে ফেলা হয়েছে কারণ এটি JS ফাইল
  key: process.env.ARCJET_KEY, 
  rules: [
    tokenBucket({
      mode: "LIVE",
      characteristics: ["userId"],
      refillRate: 5,
      interval: 10,
      capacity: 10,
    }),
  ],
});