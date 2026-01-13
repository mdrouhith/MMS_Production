"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Terminal, RefreshCcw, PowerOff, Crown, Lock, 
  MessageSquare, Sparkles, ChevronLeft, ChevronRight 
} from "lucide-react"; 
import { useSelectedModel } from "@/context/SelectedModelContext";
import ReactMarkdown from "react-markdown"; 
import { useChat } from "@/context/ChatContext";

// 🔥 Syntax Highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- সাব-কম্পোনেন্ট ১: প্রফেশনাল কোড ব্লক ---
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden my-6 border border-white/10 shadow-2xl bg-[#0d0d0d] w-full animate-in fade-in zoom-in-95 duration-500">
      {/* কোড হেডার - সুন্দর ডিজাইন */}
      <div className="flex items-center justify-between bg-[#1a1a1a] px-5 py-3 border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-gray-400 tracking-widest bg-white/5 px-2 py-1 rounded">
                <Terminal className="w-3 h-3" />
                <span className="uppercase">{language || "CODE"}</span>
            </div>
        </div>
        <button 
            onClick={handleCopy} 
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                copied ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
        >
          {copied ? (
            <> <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Copied! </>
          ) : (
            "Copy Code"
          )}
        </button>
      </div>

      {/* কোড এরিয়া - ফন্ট এবং স্পেসিং ফিক্সড */}
      <div className="overflow-x-auto custom-scrollbar-code">
        <SyntaxHighlighter 
            language={language || 'javascript'} 
            style={vscDarkPlus} 
            customStyle={{ 
                margin: 0, 
                padding: '2rem 1.5rem', 
                fontSize: '0.85rem', 
                background: 'transparent',
                lineHeight: '1.7',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', monospace"
            }}
            codeTagProps={{
                style: {
                    fontFamily: 'inherit'
                }
            }}
        >
            {value}
        </SyntaxHighlighter>
      </div>
      
      {/* বটম বর্ডার ডেকোরেশন */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
    </div>
  );
};

// --- সাব-কম্পোনেন্ট ২: মার্কডাউন রেন্ডারার ---
const MarkdownRenderer = ({ content, isUser }) => (
    <ReactMarkdown components={{
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
            ) : (
                <code className="bg-gray-200/50 dark:bg-white/5 px-1.5 py-0.5 rounded-md font-mono text-sm font-medium border border-black/5 dark:border-white/5" {...props}>
                    {children}
                </code>
            );
        }
    }}>
        {content}
    </ReactMarkdown>
);

// --- সাব-কম্পোনেন্ট ৩: টাইপরাইটার ইফেক্ট ---
const TypewriterEffect = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);
  useEffect(() => {
    if (!text) return;
    indexRef.current = 0;
    setDisplayedText("");
    const safeText = String(text);
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => prev + safeText.charAt(indexRef.current));
      indexRef.current++;
      if (indexRef.current >= safeText.length) clearInterval(intervalId);
    }, 10);
    return () => clearInterval(intervalId);
  }, [text]);
  return (
    <div className="animate-in fade-in duration-300">
        <MarkdownRenderer content={displayedText} isUser={false} />
    </div>
  );
};

// --- মেইন কম্পোনেন্ট ---
function AiMultimodel({ onRetryModel, onToggleAction }) {
  const { messages } = useChat();
  const { aiModeList, selectedValues, updatePreference } = useSelectedModel();
  const chatContainerRefs = useRef({});
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft } = scrollContainerRef.current;
      const scrollAmount = 500;
      const newScrollLeft = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    Object.values(chatContainerRefs.current).forEach((container) => {
        if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] group overflow-hidden">
      
      <button onClick={() => scroll('left')} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-background/80 border border-border/50 backdrop-blur-xl shadow-2xl hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:flex"><ChevronLeft className="w-6 h-6" /></button>
      <button onClick={() => scroll('right')} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-background/80 border border-border/50 backdrop-blur-xl shadow-2xl hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:flex"><ChevronRight className="w-6 h-6" /></button>

      <div ref={scrollContainerRef} className="flex w-full h-full overflow-x-auto overflow-y-hidden bg-background/50 snap-x snap-mandatory scroll-smooth custom-scrollbar border-b">
        {aiModeList.map((model, index) => {
            const currentVal = selectedValues[model.model] || "";
            const modelMessages = messages?.[model.model] || [];
            const shouldShow = model.enable || modelMessages.length > 0;

            return (
            <div key={index} className={`flex flex-col h-full transition-all duration-500 shrink-0 border-r border-border/40 snap-start ${shouldShow ? "min-w-[500px] w-[500px]" : "min-w-[80px] w-[80px] items-center pt-4"}`}>
                
                <div className={`flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 shadow-sm ${!shouldShow && "flex-col gap-4 py-6"}`}>
                    <div className="flex items-center gap-3">
                        <div className={`relative p-2 rounded-xl transition-all duration-300 ${model.enable ? "bg-primary/10 ring-1 ring-primary/20" : "grayscale opacity-50 bg-muted"}`}>
                            <Image src={model.icon} alt={model.model} width={32} height={32} className="object-contain" />
                            {model.premium && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5"><Crown className="w-2.5 h-2.5 text-white" /></div>}
                        </div>
                        {shouldShow && (
                            <Select value={currentVal} onValueChange={(v) => { 
                                updatePreference(model.model, v); 
                                if (onToggleAction) onToggleAction(model.model, true); 
                            }}>
                                <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue placeholder="Select Model" /></SelectTrigger>
                                <SelectContent className="backdrop-blur-xl">
                                    {model.subModel?.map(sub => (
                                        <SelectItem key={sub.id} value={sub.id} className="text-xs">
                                            <div className="flex items-center gap-2">{sub.name} {sub.premium && <Crown className="w-3 h-3 text-amber-500" />}</div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <Switch checked={model.enable} onCheckedChange={(v) => onToggleAction?.(model.model, v)} />
                </div>

                {shouldShow && (
                    <div ref={(el) => (chatContainerRefs.current[model.model] = el)} className={`flex-1 overflow-y-auto p-5 pb-40 space-y-6 transition-all duration-300 ${!model.enable ? "bg-muted/5" : ""}`}>
                        {model.premium ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-700">
                                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-amber-500/20"><Lock className="w-10 h-10 text-amber-500" /></div>
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">Premium Model <Sparkles className="w-5 h-5 text-amber-500" /></h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">Upgrade to unlock {model.model}'s advanced capabilities.</p>
                                <button className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-xl hover:scale-105 transition-all active:scale-95">Upgrade to Pro</button>
                            </div>
                        ) : (
                            <>
                                {modelMessages.length === 0 && model.enable && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2"><MessageSquare className="w-8 h-8" /><p className="text-xs">Ready to chat with {model.model}</p></div>
                                )}
                                {modelMessages.map((msg, idx) => {
                                    const isUser = msg.role === "user";
                                    const isErrorOrStopped = msg.content.includes("⚠️") || msg.content.includes("stopped");
                                    return (
                                        <div key={idx} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                                            <div className={`flex flex-col max-w-[95%] gap-2 ${isUser ? "items-end" : "items-start"}`}>
                                                <div className={`px-5 py-3.5 text-[15px] shadow-sm rounded-2xl ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm w-full"} ${!model.enable && !isUser ? "opacity-60" : ""}`}>
                                                    {msg.loading ? (
                                                        <div className="flex gap-1.5 h-6 items-center"><span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100" /></div>
                                                    ) : (
                                                        <div className="markdown-content prose dark:prose-invert max-w-none leading-relaxed">
                                                            {!isUser && idx === modelMessages.length - 1 && msg.isNew ? <TypewriterEffect text={msg.content} /> : <MarkdownRenderer content={msg.content} isUser={isUser} />}
                                                        </div>
                                                    )}
                                                    {!isUser && !msg.loading && isErrorOrStopped && (
                                                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                            {model.enable ? <button onClick={() => onRetryModel?.(model.model, idx)} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold transition-all hover:scale-[1.02] active:scale-95 group/retry"><RefreshCcw className="w-3.5 h-3.5 group-hover/retry:rotate-180 transition-transform duration-500" /> REGENERATE</button> : <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20"><div className="flex items-center gap-2 text-amber-600 font-bold text-[11px]"><PowerOff className="w-3.5 h-3.5" /> MODEL OFFLINE</div><p className="text-[11px] text-muted-foreground">Enable to continue chat.</p></div>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
            );
        })}
      </div>
    </div>
  );
}

export default AiMultimodel;