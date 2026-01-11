import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Send, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AiMultimodel from "./AiMultimodel.jsx";
import axios from "axios";
import { useChat } from "@/context/ChatContext"; 
import { useSelectedModel } from "@/context/SelectedModelContext";
import { useUser, useClerk } from "@clerk/nextjs";

export function ChatInputBox() {
  // 🟢 Hooks & Context
  const { messages, setMessages, updateMessages } = useChat();
  const { aiModeList, selectedValues } = useSelectedModel();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  // 🟢 Local State
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef(null);

  // 🟢 Helper: Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [userInput]);

  // 🟢 Handler: Enhance Prompt
  const handleEnhance = async () => {
    if (!user) {
        openSignIn();
        return;
    }
    if (!userInput.trim()) return;

    setIsEnhancing(true);

    try {
        const result = await axios.post("/api/enhance-prompt", {
            prompt: userInput
        });

        if (result.data.enhancedText) {
            setUserInput(result.data.enhancedText);
        }
    } catch (error) {
        console.error("Enhance error:", error);
    } finally {
        setIsEnhancing(false);
        if(textareaRef.current) textareaRef.current.focus();
    }
  };

  // 🟢 Handler: Send Message
  const handleSend = async () => {
    if (!user) {
        openSignIn();
        return;
    }

    if (!userInput.trim() || isSending || isEnhancing) return;

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

    const userMsgId = Date.now();
    let tempMessages = { ...messages };
    
    // Set User Message
    activeModels.forEach((model) => {
        tempMessages[model.model] = [
            ...(tempMessages[model.model] ?? []),
            { role: "user", content: currentInput, id: userMsgId, createdAt: Date.now() }
        ];
    });

    const modelMsgIds = {}; 

    // Set Thinking Message
    activeModels.forEach((model) => {
        const aiMsgId = Date.now() + Math.random();
        modelMsgIds[model.model] = aiMsgId;

        tempMessages[model.model] = [
            ...(tempMessages[model.model]),
            { 
                role: "assistant", 
                content: "Thinking...", 
                loading: true, 
                id: aiMsgId, 
                createdAt: Date.now() 
            }
        ];
    });

    const generatedChatId = await updateMessages(tempMessages, currentInput);

    // Call APIs
    try {
        const apiPromises = activeModels.map(async (modelItem) => {
            const parentModel = modelItem.model;
            const modelId = selectedValues[parentModel];
            const targetAiMsgId = modelMsgIds[parentModel];

            try {
                const result = await axios.post("/api/ai-multi-model", {
                    model: modelId,
                    msg: [{ role: "user", content: currentInput }], 
                    parentModel,
                });

                const { aiResponse } = result.data;

                setMessages((prev) => {
                    const currentList = prev[parentModel] ? [...prev[parentModel]] : [];
                    
                    const updatedList = currentList.map(msg => {
                        if (msg.id === targetAiMsgId) {
                            return { 
                                ...msg,
                                content: aiResponse, 
                                loading: false,
                                isNew: true 
                            };
                        }
                        return msg;
                    });

                    // Safety fallback
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
                    updateMessages(finalState, "", generatedChatId); 
                    return finalState;
                });

            } catch (err) {
                console.error(err);
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
        <div className="flex items-end w-full max-w-3xl border border-border/40 rounded-3xl shadow-2xl bg-secondary/30 backdrop-blur-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300 relative">
          
          {/* 🟢 LEFT ACTIONS (Paperclip + Enhance) */}
          <div className="flex flex-col gap-1.5 pb-1 mr-2">
             <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-9 w-9 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors">
                <Paperclip className="h-5 w-5" />
             </Button>

             <Button 
                variant="ghost" 
                size="icon" 
                className={`shrink-0 rounded-full h-9 w-9 transition-all duration-300 ${userInput.trim() ? "text-amber-500 hover:bg-amber-500/10" : "text-muted-foreground/40"}`}
                onClick={handleEnhance}
                disabled={isEnhancing || !userInput.trim()}
                title="Enhance Prompt with AI"
             >
                {isEnhancing ? (
                    <Sparkles className="h-5 w-5 animate-spin" />
                ) : (
                    <Wand2 className={`h-5 w-5 ${userInput.trim() ? "animate-pulse" : ""}`} />
                )}
             </Button>
          </div>

          {/* 🟢 TEXT AREA */}
          <textarea 
            ref={textareaRef}
            placeholder={isSending ? "AI is thinking..." : (isEnhancing ? "Enhancing prompt..." : "Ask anything...")}
            className={`flex-1 max-h-[150px] min-h-[24px] py-3 px-1 bg-transparent border-0 outline-none text-[15px] placeholder:text-muted-foreground/70 resize-none text-foreground leading-relaxed scrollbar-hide ${isEnhancing ? "animate-pulse opacity-50" : ""}`}
            value={userInput} 
            onChange={(event) => setUserInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isEnhancing}
            rows={1}
          />
          
          {/* 🟢 RIGHT ACTIONS (Mic + Send) */}
          <div className="flex items-center gap-2 pb-1 ml-2">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-9 w-9 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors">
              <Mic className="h-5 w-5" />
            </Button>
            
            <Button 
                size="icon" 
                className={`shrink-0 rounded-full h-9 w-9 shadow-sm transition-all duration-300 ${userInput.trim() ? "bg-primary text-primary-foreground hover:scale-105" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                onClick={handleSend}
                disabled={isSending || isEnhancing || !userInput.trim()} 
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