import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { model, msg, parentModel } = await req.json();

  try {
    const response = await axios.post(
      "https://kravixstudio.com/api/v1/chat",
      {
        message: msg, 
        aiModel: model,
        outputType: "text",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.KRAVIX_STUDIO_API,
        },
      }
    );

    // 🔴 FIX: আগে আমরা response.data দিয়ে দিচ্ছিলাম, তাই সব চলে আসছিল।
    // এখন আমরা চেক করছি নির্দিষ্ট 'aiResponse' কি (Key) আছে কিনা।
    const aiReplyText = 
        response.data.aiResponse || // <--- এইটাই তোমার দরকার
        response.data.result || 
        response.data.message || 
        response.data.content || 
        // যদি একান্তই স্ট্রিং না হয়, তবেই পুরোটা স্ট্রিং করে পাঠাবে
        (typeof response.data === 'string' ? response.data : JSON.stringify(response.data));

    return NextResponse.json({
      aiResponse: aiReplyText, 
      model: parentModel,
    });

  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    return NextResponse.json(
        { error: "Failed to fetch response" }, 
        { status: error.response?.status || 500 }
    );
  }
}