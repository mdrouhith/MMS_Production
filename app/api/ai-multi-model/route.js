import axios from "axios";
import { NextResponse } from "next/server";
import { aj } from "@/config/Arcjet"; 
import { db } from "@/config/FirebaseConfig"; 
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

// --- DYNAMIC CREDIT CONFIGURATION ---
const MODEL_WEIGHTS = {
    // Level 1: Sosta (1 Credit)
    "google/gemini-2.0-flash-lite-preview-02-05:free": 1,
    "google/gemini-2.0-flash-exp:free": 1,
    "openai/gpt-4o-mini": 1,
    "google/gemini-flash-1.5": 1,
    "deepseek/deepseek-chat": 1,
    // Level 2: Majhari (8 Credits)
    "google/gemini-pro-1.5": 8,
    "deepseek/deepseek-r1": 8,
    "meta-llama/llama-3.3-70b-instruct": 8,
    // Level 3: Dami (20 Credits)
    "openai/gpt-4o": 20,
    "google/gemini-2.5-pro": 20,
    "cohere/command-r-plus-08-2024": 20
};

export async function POST(req) {
  try {
    const body = await req.json();
    const model = body.model;
    const rawMsg = body.msg; 
    const parentModel = body.parentModel;
    const userId = body.userId;
    const userEmail = body.userEmail;

    let msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg?.content || JSON.stringify(rawMsg));

    if (!userId) return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    if (!msg || msg.trim().length === 0) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // --- FIREBASE: FETCH USER & DAILY RESET LOGIC ---
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    let userData = {};
    const today = new Date().toISOString().split('T')[0]; // e.g., "2026-01-13"

    if (!userSnap.exists()) {
        userData = {
            email: userEmail || "unknown",
            credit: 10, // Default signup credit
            plan: "free",
            lastResetDate: today,
            createdAt: new Date()
        };
        await setDoc(userRef, userData);
    } else {
        userData = userSnap.data();
        
        // --- DAILY RESET FOR FREE USERS ---
        if (userData.plan === "free" && userData.lastResetDate !== today) {
            await updateDoc(userRef, {
                credit: 10, // Reset to 10 credits daily
                lastResetDate: today
            });
            userData.credit = 10;
        }
    }

    // --- CALCULATE DYNAMIC COST ---
    const baseWeight = MODEL_WEIGHTS[model] || 1; // Default to 1 if not found
    const units = Math.ceil(msg.length / 2000); // 2000 chars = 1 Unit
    const actualCost = baseWeight * units;

    // Check if user has enough credits
    if (userData.credit < actualCost) {
        return NextResponse.json({ error: `Insufficient Credits. Need ${actualCost}, have ${userData.credit}` }, { status: 402 });
    }

    // --- ARCJET PROTECTION ---
    try {
      const decision = await aj.protect(req, { userId: userId, requested: 1 });
      if (decision.isDenied()) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    } catch (e) { console.log("Arcjet skipped"); }

    // --- OPENROUTER API CALL ---
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model, 
          messages: [{ role: "user", content: String(msg) }],
          temperature: 0.7,
          max_tokens: 2000, // Limit output to prevent high cost
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "X-Title": "Mirhas Ai Studio",
            "Content-Type": "application/json",
          },
        }
      );

      const aiReplyText = response.data.choices[0].message.content;
      
      // --- DEDUCT CREDITS AFTER SUCCESS ---
      await updateDoc(userRef, {
          credit: increment(-actualCost), 
          lastActive: new Date()
      });

      return NextResponse.json({ 
          aiResponse: aiReplyText, 
          model: parentModel,
          creditsUsed: actualCost 
      });

    } catch (apiError) {
        console.error("OpenRouter Error:", apiError.message);
        return NextResponse.json({ error: "AI Service Error" }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}