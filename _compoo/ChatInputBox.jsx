"use client";
import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Send, Loader2, Wand2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import AiMultimodel from "./AiMultimodel.jsx";
import axios from "axios";
import { useChat } from "@/context/ChatContext"; 
import { useSelectedModel } from "@/context/SelectedModelContext";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner"; 

export function ChatInputBox() {
  const { messages, setMessages, updateMessages } = useChat();
  const { aiModeList, selectedValues, onToggleChange } = useSelectedModel();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false); // ✅ Re-added
  const textareaRef = useRef(null);
  const abortControllers = useRef({}); 

  // --- 💸 DYNAMIC CREDIT UI ESTIMATION ---
  const [estCost, setEstCost] = useState(0);
  const charLimitPerUnit = 2000; 

  useEffect(() => {
    const getModelWeight = (id) => {
        if (!id) return 1;
        if (id.includes('gpt-4o') || id.includes('pro') || id.includes('plus')) return 20;
        if (id.includes('r1') || id.includes('70b')) return 8;
        return 1;
    };
    const activeModels = aiModeList.filter(m => m.enable && selectedValues[m.model]);
    const units = Math.ceil(userInput.length / charLimitPerUnit) || 1;
    let total = 0;
    activeModels.forEach(m => { total += getModelWeight(selectedValues[m.model]) * units; });
    setEstCost(total);
  }, [userInput, selectedValues, aiModeList]);

  // --- ✨ PROMPT ENHANCER LOGIC (FIXED) ---
  const handleEnhance = async () => {
    if (!user) return openSignIn();
    if (!userInput.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
        const result = await axios.post("/api/enhance-prompt", { prompt: userInput });
        if (result.data.enhancedText) {
            setUserInput(result.data.enhancedText);
            toast.success("Prompt enhanced! ✨");
        }
    } catch (error) {
        console.error("Enhance error:", error);
        toast.error("Failed to enhance prompt.");
    } finally {
        setIsEnhancing(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [userInput]);

  // --- 🔥 REGENERATE/RETRY LOGIC ---
  const handleRetryModel = async (parentModelName, msgIdx) => {
    if (isSending) return;
    if (!user) return openSignIn();
    const modelId = selectedValues[parentModelName];
    const userMsg = messages[parentModelName][msgIdx - 1]?.content;
    const targetAiMsgId = messages[parentModelName][msgIdx].id;
    if (!userMsg) return;

    const controller = new AbortController();
    abortControllers.current[parentModelName] = controller;

    setMessages(prev => ({
        ...prev,
        [parentModelName]: prev[parentModelName].map(m => 
            m.id === targetAiMsgId ? { ...m, content: "Retrying...", loading: true } : m
        )
    }));

    try {
        const result = await axios.post("/api/ai-multi-model", {
            model: modelId, msg: userMsg, parentModel: parentModelName,
            userId: user.id, userEmail: user.primaryEmailAddress?.emailAddress
        }, { signal: controller.signal });

        setMessages(prev => ({
            ...prev,
            [parentModelName]: prev[parentModelName].map(m => 
                m.id === targetAiMsgId ? { ...m, content: result.data.aiResponse, loading: false, isNew: true } : m
            )
        }));
    } catch (err) {
        if (!axios.isCancel(err)) {
            setMessages(prev => ({
                ...prev,
                [parentModelName]: prev[parentModelName].map(m => m.id === targetAiMsgId ? { ...m, content: "⚠️ Error.", loading: false } : m)
            }));
        }
    } finally { delete abortControllers.current[parentModelName]; }
  };

  const handleSend = async () => {
    if (!user) return openSignIn();
    if (!userInput.trim() || isSending) return;
    const activeModels = aiModeList.filter(model => model.enable && selectedValues[model.model]);
    if (activeModels.length === 0) return toast.warning("Select a model!");
    setIsSending(true); 
    const currentInput = userInput;
    setUserInput(""); 

    try {
        const userMsgId = Date.now();
        let tempMessages = { ...messages };
        const modelMsgIds = {}; 
        activeModels.forEach((model) => {
            const aiMsgId = Date.now() + Math.random();
            modelMsgIds[model.model] = aiMsgId;
            tempMessages[model.model] = [
                ...(tempMessages[model.model] ?? []),
                { role: "user", content: currentInput, id: userMsgId, createdAt: Date.now() },
                { role: "assistant", content: "Thinking...", loading: true, id: aiMsgId, createdAt: Date.now() }
            ];
        });
        const generatedChatId = await updateMessages(tempMessages, currentInput);
        const apiPromises = activeModels.map(async (modelItem) => {
            const parentModel = modelItem.model;
            const modelId = selectedValues[parentModel];
            const targetAiMsgId = modelMsgIds[parentModel];
            const controller = new AbortController();
            abortControllers.current[parentModel] = controller;
            try {
                const result = await axios.post("/api/ai-multi-model", {
                    model: modelId, msg: String(currentInput), parentModel,
                    userId: user.id, userEmail: user.primaryEmailAddress?.emailAddress
                }, { signal: controller.signal });
                setMessages((prev) => {
                    const currentList = prev[parentModel] ? [...prev[parentModel]] : [];
                    const updatedList = currentList.map(msg => 
                        msg.id === targetAiMsgId ? { ...msg, content: result.data.aiResponse, loading: false, isNew: true } : msg
                    );
                    const finalState = { ...prev, [parentModel]: updatedList };
                    updateMessages(finalState, "", generatedChatId); 
                    return finalState;
                });
            } catch (err) {
                if (!axios.isCancel(err)) {
                    setMessages((prev) => ({
                        ...prev,
                        [parentModel]: prev[parentModel].map(m => m.id === targetAiMsgId ? { ...m, content: "⚠️ Error.", loading: false } : m)
                    }));
                }
            } finally { delete abortControllers.current[parentModel]; }
        });
        await Promise.all(apiPromises);
    } finally { setIsSending(false); }
  };

  const handleToggleAction = (modelName, isEnabled) => {
    if (!isEnabled && abortControllers.current[modelName]) {
        abortControllers.current[modelName].abort();
        delete abortControllers.current[modelName];
    }
    onToggleChange(modelName, isEnabled);
  };

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col bg-background">
      <div className="flex-1 w-full overflow-hidden relative">
        <AiMultimodel onRetryModel={handleRetryModel} onToggleAction={handleToggleAction} />
      </div>
      
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-6 px-4 flex flex-col items-center z-50 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto">
            {userInput.length > 0 && (
                <div className="mb-3 mx-auto w-fit flex items-center gap-2 text-[11px] font-bold text-muted-foreground bg-secondary/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-border/40 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>{userInput.length} chars | Est. Cost: <span className="text-primary">{estCost} Credits</span></span>
                </div>
            )}

            <div className="flex items-end w-full border border-border/40 rounded-3xl shadow-2xl bg-secondary/70 backdrop-blur-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
                <div className="flex flex-col gap-1.5 pb-1 mr-2">
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground"><Paperclip className="h-5 w-5" /></Button>
                    {/* ✅ Wand2/Enhancer Button Fixed */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleEnhance} 
                        disabled={isEnhancing || !userInput.trim()} 
                        className={`rounded-full h-9 w-9 transition-colors ${userInput.trim() ? "text-amber-500 hover:bg-amber-500/10" : "text-muted-foreground/30"}`}
                    >
                        {isEnhancing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                    </Button>
                </div>
                <textarea 
                    ref={textareaRef} 
                    placeholder="Ask anything..." 
                    className="flex-1 max-h-[150px] py-3 px-1 bg-transparent border-0 outline-none text-[15px] resize-none placeholder:text-muted-foreground/50" 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} 
                    rows={1} 
                />
                <div className="flex items-center gap-2 pb-1 ml-2">
                    <Button size="icon" className={`rounded-full h-9 w-9 transition-all ${userInput.trim() ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted cursor-not-allowed"}`} onClick={handleSend} disabled={isSending || !userInput.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;