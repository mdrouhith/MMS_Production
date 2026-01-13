import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- ১. ENV থেকে মডেল আইডি নেওয়া (ফলব্যাক সহ) ---
    const ENHANCE_MODEL = process.env.NEXT_PUBLIC_ENHANCE_MODEL_ID || "openai/gpt-3.5-turbo";

    const systemInstruction = `You are a professional Prompt Engineer. 
    Your task is to take the user's raw input and rewrite it into a highly detailed, clear, and optimized AI prompt. 
    Rules:
    1. Only provide the enhanced prompt text.
    2. Do not include introductory phrases.
    3. Do not answer the prompt, just enhance it.`;

    // --- ২. OpenRouter API Call ---
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: ENHANCE_MODEL, // ENV থেকে আসা মডেল আইডি
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "X-Title": "Mirhas Ai Enhancer",
        },
      }
    );

    const enhancedText = response.data?.choices?.[0]?.message?.content || prompt;

    return NextResponse.json({ enhancedText: enhancedText.trim() });

  } catch (error) {
    console.error("Enhance API Error:", error.response?.data || error.message);
    
    // এপিআই ফেইল করলে অরিজিনাল প্রম্পট ফেরত পাঠানো
    return NextResponse.json({ 
        enhancedText: prompt, 
        error: "API failed, using original." 
    });
  }
}