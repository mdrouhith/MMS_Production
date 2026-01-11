import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AiMultimodel from "./AiMultimodel.jsx";
import axios from "axios";
import { useChat } from "@/context/ChatContext"; 
import { useSelectedModel } from "@/context/SelectedModelContext";

export function ChatInputBox() {
  const { messages, setMessages, updateMessages } = useChat();
  const { aiModeList, selectedValues } = useSelectedModel();
  
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [userInput]);

  const handleSend = async () => {
    if (!userInput.trim() || isSending) return;

    setIsSending(true);

    const activeModels = aiModeList.filter(model => model.enable && selectedValues[model.model]);
    
    if (activeModels.length === 0) {
        alert("Please select at least one AI model!");
        setIsSending(false);
        return;
    }

    const currentInput = userInput;
    setUserInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // 🟢 ইউনিক আইডি জেনারেট করা (যাতে ডুপ্লিকেট না হয়)
    const userMsgId = Date.now();
    
    let tempMessages = { ...messages };
    
    // ১. ইউজারের মেসেজ সেট করা
    activeModels.forEach((model) => {
        tempMessages[model.model] = [
            ...(tempMessages[model.model] ?? []),
            { role: "user", content: currentInput, id: userMsgId, createdAt: Date.now() }
        ];
    });

    // ২. "Thinking..." মেসেজ সেট করা (ইউনিক আইডি সহ)
    // আমরা প্রতিটি মডেলের জন্য আলাদা AI মেসেজ আইডি রাখব
    const modelMsgIds = {}; 

    activeModels.forEach((model) => {
        const aiMsgId = Date.now() + Math.random(); // ইউনিক আইডি
        modelMsgIds[model.model] = aiMsgId; // আইডি সেভ রাখলাম পরে আপডেটের জন্য

        tempMessages[model.model] = [
            ...(tempMessages[model.model]),
            { 
                role: "assistant", 
                content: "Thinking...", 
                loading: true, 
                id: aiMsgId, // 🟢 এই আইডি ধরেই পরে রিপ্লেস করব
                createdAt: Date.now() 
            }
        ];
    });

    // ৩. প্রথম সেভ (User + Thinking)
    const generatedChatId = await updateMessages(tempMessages, currentInput);

    // ৪. API কল
    try {
        const apiPromises = activeModels.map(async (modelItem) => {
            const parentModel = modelItem.model;
            const modelId = selectedValues[parentModel];
            const targetAiMsgId = modelMsgIds[parentModel]; // ওই নির্দিষ্ট আইডি

            try {
                const result = await axios.post("/api/ai-multi-model", {
                    model: modelId,
                    msg: [{ role: "user", content: currentInput }], 
                    parentModel,
                });

                const { aiResponse } = result.data;

                // ৫. রেসপন্স আপডেট (ID ব্যবহার করে)
                setMessages((prev) => {
                    const currentList = prev[parentModel] ? [...prev[parentModel]] : [];
                    
                    // 🟢 FIX: আইডি দিয়ে মেসেজ খুঁজে বের করা এবং আপডেট করা
                    // findIndex এর বদলে আমরা map ব্যবহার করব যা বেশি নিরাপদ
                    const updatedList = currentList.map(msg => {
                        if (msg.id === targetAiMsgId) {
                            return { 
                                ...msg,
                                content: aiResponse, 
                                loading: false,
                                isNew: true // এনিমেশনের জন্য
                            };
                        }
                        return msg;
                    });

                    // যদি কোনো কারণে আইডি না পাওয়া যায় (খুবই রেয়ার), তবে পুশ করো
                    const found = currentList.some(msg => msg.id === targetAiMsgId);
                    if (!found) {
                        updatedList.push({
                            role: "assistant", 
                            content: aiResponse, 
                            loading: false, 
                            id: targetAiMsgId,
                            isNew: true
                        });
                    }

                    const finalState = { ...prev, [parentModel]: updatedList };
                    
                    // ৬. ফাইনাল সেভ
                    updateMessages(finalState, "", generatedChatId); 
                    
                    return finalState;
                });

            } catch (err) {
                console.error(err);
                // এরর হ্যান্ডলিং
                setMessages((prev) => {
                    const currentList = prev[parentModel] ? [...prev[parentModel]] : [];
                    const updatedList = currentList.map(msg => {
                        if (msg.id === targetAiMsgId) {
                            return { ...msg, content: "⚠️ Error: Failed to get response.", loading: false };
                        }
                        return msg;
                    });
                    return { ...prev, [parentModel]: updatedList };
                });
            }
        });

        await Promise.all(apiPromises);

    } catch (error) {
        console.error("Global send error", error);
    } finally {
        setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isSending) handleSend();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col">
      <div className="flex-1 w-full">
        <AiMultimodel />
      </div>
      
      {/* Input Area */}
      <div className="sticky bottom-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent pb-8 pt-10 px-4 flex justify-center z-50">
        <div className="flex items-end w-full max-w-3xl border border-border/40 rounded-3xl shadow-2xl bg-secondary/30 backdrop-blur-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
          
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-10 w-10 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors">
            <Paperclip className="h-5 w-5" />
          </Button>

          <textarea 
            ref={textareaRef}
            placeholder={isSending ? "AI is thinking..." : "Ask anything..."}
            className="flex-1 max-h-[150px] min-h-[24px] py-2.5 px-4 bg-transparent border-0 outline-none text-[15px] placeholder:text-muted-foreground/70 resize-none text-foreground leading-relaxed scrollbar-hide"
            value={userInput} 
            onChange={(event) => setUserInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={1}
          />
          
          <div className="flex items-center gap-2 pb-0.5">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-9 w-9 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors">
              <Mic className="h-5 w-5" />
            </Button>
            
            <Button 
                size="icon" 
                className={`shrink-0 rounded-full h-9 w-9 shadow-sm transition-all duration-300 ${userInput.trim() ? "bg-primary text-primary-foreground hover:scale-105" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                onClick={handleSend}
                disabled={isSending || !userInput.trim()} 
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;