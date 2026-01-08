import { Paperclip, Mic, Send } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import AiMultimodel from"./AiMultimodel.jsx";

export function ChatInputBox() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col">
      <div>
        <AiMultimodel/>
      </div>
      <div className="flex-1 w-full">
        {/* Chat history goes here */}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 w-full bg-background/80 backdrop-blur-md pb-6 pt-2 px-4 flex justify-center">
        <div className="flex items-center w-full max-w-3xl border rounded-xl shadow-sm bg-secondary/30 focus-within:ring-1 focus-within:ring-ring transition-all px-2 py-2">
          
          {/* Left: Attachment */}
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-foreground">
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Middle: Input */}
          <input 
            type="text" 
            placeholder="Ask me anything..." 
            className="flex-1 py-2 px-3 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
          />
          
          {/* Right: Mic & Send */}
          <div className="flex items-center gap-1">
             {/* Mic Button */}
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-foreground">
              <Mic className="h-5 w-5" />
            </Button>
            
            {/* Send Button (GPT Style) */}
            <Button size="icon" className="shrink-0 rounded-full h-8 w-8 ml-1">
              <Send className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;