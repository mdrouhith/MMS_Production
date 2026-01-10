// path: app/api/example/route.ts
import { NextResponse } from "next/server";
// তোমার ফোল্ডার স্ট্রাকচার অনুযায়ী পাথ ঠিক রেখো
import { aj } from "../../../config/Arcjet"; 

export async function GET(req) {
  const userId = "user123"; // Replace with authenticated user ID
  
  // Deduct 5 tokens
  const decision = await aj.protect(req, { userId, requested: 5 });
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Too Many Requests", reason: decision.reason },
      { status: 429 },
    );
  }

  return NextResponse.json({ message: "Hello world" });
}