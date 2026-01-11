import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { model, msg, parentModel } = await req.json();

  try {
    const response = await axios.post(
      "https://kravixstudio.com/api/v1/chat",
      {
        // FIX: msg কে Array-র ভেতর ঢোকানো হয়েছে [msg]
        message: [msg], 
        // ব্যবহারকারী যে মডেল পাঠাবে সেটাই যাবে (তবে সঠিক নাম হতে হবে)
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

    console.log(response.data);

    return NextResponse.json({
      result: response.data,
      model: parentModel,
    });
  } catch (error) {
    // Error handling যোগ করা হলো যাতে 500 ক্র্যাশ না করে আসল এরর দেখা যায়
    console.error("API Error:", error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}