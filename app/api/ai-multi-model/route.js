import axios from "axios";
import { NextResponse } from "next/server";
import { aj } from "@/config/Arcjet"; 
import { db } from "@/config/FirebaseConfig"; 
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

// মডেলের দামের লিস্ট
const MODEL_WEIGHTS = {
    "google/gemini-2.0-flash-lite-preview-02-05:free": 1,
    "google/gemini-2.0-flash-exp:free": 1,
    "openai/gpt-4o-mini": 1,
    "google/gemini-flash-1.5": 1,
    "deepseek/deepseek-chat": 1,
    "google/gemini-pro-1.5": 8,
    "deepseek/deepseek-r1": 8,
    "meta-llama/llama-3.3-70b-instruct": 8,
    "openai/gpt-4o": 20,
    "google/gemini-2.5-pro": 20,
    "cohere/command-r-plus-08-2024": 20
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { model, msg: rawMsg, parentModel, userId, userEmail, userName } = body;

    let msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg?.content || JSON.stringify(rawMsg));

    if (!userId) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    let userData = {};
    const today = new Date().toISOString().split('T')[0];

    // --- ১. নতুন ইউজার হ্যান্ডলিং (New User) ---
    if (!userSnap.exists()) {
        userData = {
            name: userName || "User",
            email: userEmail || "unknown",
            credit: 10, // ✅ নতুন ইউজার ১০ পাবে
            plan: "free",
            lastResetDate: today,
            createdAt: new Date(),
            lastActive: new Date()
        };
        await setDoc(userRef, userData);
    } else {
        userData = userSnap.data();
        
        // --- ২. ডেইলি রিসেট লজিক (Daily Reset) ---
        // যদি আজ রিসেট না হয়ে থাকে
        if (userData.lastResetDate !== today) {
            
            // ⚠️ লজিক: ক্রেডিট যদি ১০ এর নিচে থাকে, তবেই ১০ এ টপ-আপ হবে।
            // যদি ১০ এর বেশি থাকে (মানে সে কিনেছে), তবে আমরা হাত দিব না।
            if ((userData.credit || 0) < 10) {
                await updateDoc(userRef, {
                    credit: 10,
                    lastResetDate: today
                });
                userData.credit = 10;
            } else {
                // ইউজার কিনেছে (যেমন ১০০০ আছে), তাই শুধু ডেট আপডেট হবে, ক্রেডিট কমবে না
                await updateDoc(userRef, {
                    lastResetDate: today
                });
            }
        }
    }

    // --- ৩. খরচের হিসাব ---
    const baseWeight = MODEL_WEIGHTS[model] || 1;
    const units = Math.ceil(msg.length / 2000);
    const actualCost = baseWeight * units;

    if (userData.credit < actualCost) {
        return NextResponse.json({ error: `Insufficient Credits` }, { status: 402 });
    }

    // --- ৪. Arcjet Security ---
    try {
      const decision = await aj.protect(req, { userId: userId, requested: 1 });
      if (decision.isDenied()) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    } catch (e) { console.log("Arcjet skipped"); }

    // --- ৫. OpenRouter কল ---
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model, 
          messages: [{ role: "user", content: String(msg) }],
          temperature: 0.7,
          max_tokens: 2000,
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
      
      // --- ৬. ক্রেডিট কাটা ---
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
        return NextResponse.json({ error: "AI Service Error" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}