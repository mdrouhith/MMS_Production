"use client";

import { ChatInputBox } from "@/_compoo/ChatInputBox";

export default function Home() {
  return (
    <div>
      {/* এখন আর props পাঠানোর দরকার নেই, কারণ ChatInputBox নিজেই Context ব্যবহার করছে */}
      <ChatInputBox />
    </div>
  );
}