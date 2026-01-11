import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    // আমরা AI কে বলছি প্রম্পট ইঞ্জিনিয়ার হিসেবে কাজ করতে
    const systemInstruction = "You are an expert prompt engineer. Your goal is to rewrite the user's input to be more detailed, professional, clear, and optimized for AI models. Only output the enhanced prompt text, nothing else. Do not answer the prompt, just enhance it.";

    const response = await axios.post(
      "https://kravixstudio.com/api/v1/chat",
      {
        message: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], 
        aiModel: "gpt-4.1-mini", // ফাস্ট রেজাল্টের জন্য ছোট মডেল ভালো
        outputType: "text",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.KRAVIX_STUDIO_API,
        },
      }
    );

    const enhancedText = 
        response.data.aiResponse || 
        response.data.result || 
        response.data.message || 
        response.data.content || 
        prompt; // ফেইল করলে আগেরটাই ফেরত দিবে

    return NextResponse.json({ enhancedText });

  } catch (error) {
    console.error("Enhance API Error:", error.message);
    return NextResponse.json({ error: "Failed to enhance" }, { status: 500 });
  }
}