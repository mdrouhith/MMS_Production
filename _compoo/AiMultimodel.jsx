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
import { MessageSquare, Lock, Bot, Sparkles, Copy, Check, Terminal, ChevronLeft, ChevronRight } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useSelectedModel } from "@/context/SelectedModelContext";
import ReactMarkdown from "react-markdown"; 
import { useChat } from "@/context/ChatContext";

// 🔥 Syntax Highlighting Imports
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ... (CodeBlock Component - আগের মতোই থাকবে) ...
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden my-5 border border-white/10 shadow-2xl bg-[#1e1e1e] w-full max-w-full">
      <div className="flex items-center justify-between bg-[#252526] px-4 py-2.5 border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Terminal className="w-3 h-3" />
            <span className="uppercase tracking-wider">{language || "TEXT"}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar bg-[#1e1e1e]">
        <SyntaxHighlighter language={language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', lineHeight: '1.6', background: 'transparent', fontFamily: '"Fira Code", monospace' }} wrapLines={false}>
            {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// ... (TypewriterEffect & MarkdownRenderer - আগের মতোই থাকবে) ...
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
  return <div className="markdown-body animate-in fade-in duration-300"><MarkdownRenderer content={displayedText} /></div>;
};

const MarkdownRenderer = ({ content }) => {
    return (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                        <code className="bg-primary/10 px-1.5 py-0.5 rounded-md text-primary font-mono text-[0.85em] border border-primary/20" {...props}>{children}</code>
                    );
                },
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground border-b pb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-2 text-foreground/90" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground/80" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3 space-y-1 text-foreground/90" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3 space-y-1 text-foreground/90" {...props} />,
                p: ({node, ...props}) => <p className="leading-7 mb-3 last:mb-0 text-foreground/90" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-500 hover:text-blue-600 underline decoration-blue-500/30 hover:decoration-blue-500 transition-all font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-4 bg-muted/30 rounded-r-lg italic text-muted-foreground" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

// 🔥 MAIN COMPONENT (Updated with Smooth Scroller)
function AiMultimodel() {
  const { messages } = useChat();
  const { aiModeList, selectedValues, updatePreference, onToggleChange } = useSelectedModel();
  
  const chatContainerRefs = useRef({});
  const mainContainerRef = useRef(null); // 🟢 মেইন কন্টেইনারের জন্য Ref

  // Auto Scroll Vertical
  useEffect(() => {
    Object.values(chatContainerRefs.current).forEach((container) => {
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        }
    });
  }, [messages]);

  // 🟢 Smooth Horizontal Scroll Functions
  const scrollLeft = () => {
    if (mainContainerRef.current) {
        mainContainerRef.current.scrollBy({ left: -500, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (mainContainerRef.current) {
        mainContainerRef.current.scrollBy({ left: 500, behavior: "smooth" });
    }
  };

  return (
    // 🟢 Wrapper Div (Relative) to hold buttons
    <div className="relative w-full h-[calc(100vh-64px)] group">
        
      {/* 🟢 Left Scroll Button */}
      <Button 
        variant="ghost" 
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-md shadow-xl border border-border/50 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background hover:scale-110"
        onClick={scrollLeft}
      >
        <ChevronLeft className="w-6 h-6 text-foreground" />
      </Button>

      {/* 🟢 Right Scroll Button */}
      <Button 
        variant="ghost" 
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-md shadow-xl border border-border/50 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background hover:scale-110"
        onClick={scrollRight}
      >
        <ChevronRight className="w-6 h-6 text-foreground" />
      </Button>

      {/* Main Chat Container */}
      <div 
        ref={mainContainerRef}
        className="flex w-full h-full border-b overflow-x-auto pb-0 bg-background/50 justify-start items-start snap-x backdrop-blur-sm scroll-smooth"
      >
        {aiModeList.map((model, index) => {
            const currentVal = selectedValues[model.model] || "";
            const modelMessages = messages?.[model.model] || [];
            const shouldShow = model.enable || modelMessages.length > 0;

            return (
            <div
                key={index}
                className={`
                flex flex-col h-full transition-all duration-500 ease-in-out shrink-0
                border-r border-border/40 last:border-r-0
                ${shouldShow ? "min-w-[500px] w-[500px]" : "min-w-[80px] items-center pt-4 bg-muted/5"} 
                `}
            >
                {/* Header */}
                <div className={`
                    flex items-center justify-between px-4 py-3 border-b border-border/40
                    bg-background/80 backdrop-blur-md sticky top-0 z-30 shadow-sm transition-all
                    ${!shouldShow && "flex-col gap-4 py-6"}
                `}>
                    <div className="flex items-center gap-3">
                    <div className={`
                        p-2 rounded-xl shrink-0 transition-all duration-300 shadow-sm border border-border/10
                        ${model.enable ? "bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20" : "grayscale opacity-70"}
                    `}>
                        <Image
                        src={model.icon}
                        alt={model.model}
                        width={shouldShow ? 32 : 24}
                        height={shouldShow ? 32 : 24}
                        className="object-contain"
                        />
                    </div>

                    {shouldShow && (
                        <>
                        {model.premium ? (
                            <Button variant="outline" className="w-[220px] justify-between bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-500 cursor-not-allowed h-9">
                            <span className="font-semibold text-xs flex items-center gap-2">
                                {model.model} <span className="bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">PRO</span>
                            </span>
                            <Lock className="w-3 h-3" />
                            </Button>
                        ) : (
                            <Select value={currentVal} onValueChange={(value) => { updatePreference(model.model, value); onToggleChange(model.model, true); }}>
                            <SelectTrigger className="w-[220px] h-9 text-xs border-primary/10 focus:ring-primary/20 bg-background/50 shadow-sm hover:bg-accent/50 transition-all">
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent>
                                {model.subModel.map(sub => (
                                    <SelectItem key={sub.id} value={sub.id} disabled={sub.premium}>
                                        <div className="flex items-center justify-between w-full min-w-[150px]">
                                            <span>{sub.name}</span>
                                            {sub.premium && <Lock className="w-3 h-3 text-muted-foreground" />}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        )}
                        </>
                    )}
                    </div>

                    <div>
                    <Switch 
                        checked={model.enable} 
                        onCheckedChange={(v) => onToggleChange(model.model, v)} 
                        className={!shouldShow ? "hidden" : "data-[state=checked]:bg-primary shadow-sm"}
                    />
                    {!shouldShow && (
                        <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-full h-8 w-8" onClick={() => onToggleChange(model.model, true)}>
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                    </div>
                </div>

                {/* Chat Body */}
                {shouldShow && (
                    <div 
                        ref={(el) => (chatContainerRefs.current[model.model] = el)}
                        className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent pb-40"
                    >
                        {modelMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[60%] text-muted-foreground/60 animate-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full flex items-center justify-center mb-5 ring-1 ring-primary/10 shadow-inner">
                                    <Sparkles className="w-9 h-9 text-primary/40" />
                                </div>
                                <p className="text-sm font-medium tracking-wide">Start chatting with {model.model}</p>
                            </div>
                        )}

                        {modelMessages.map((msg, idx) => {
                            const isUser = msg.role === "user";
                            const isLoading = msg.loading;
                            const isLastMessage = idx === modelMessages.length - 1;
                            const shouldAnimate = !isUser && isLastMessage && msg.isNew;

                            return (
                                <div 
                                    key={idx} 
                                    className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                                >
                                    <div className={`
                                        flex flex-col max-w-[95%] gap-1.5
                                        ${isUser ? "items-end" : "items-start"}
                                    `}>
                                        {/* Name Label */}
                                        <div className="flex items-center gap-2 px-1 opacity-70 select-none">
                                            {isUser ? (
                                                <span className="text-[10px] font-bold tracking-wider text-primary">YOU</span>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center text-white text-[8px] shadow-sm ${model.model.toLowerCase().includes('gpt') ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                                        <Bot className="w-2.5 h-2.5" />
                                                    </div>
                                                    <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{model.model}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={`
                                            px-5 py-3.5 text-[15px] shadow-sm leading-relaxed relative overflow-hidden transition-all duration-200
                                            ${isUser 
                                                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-md shadow-primary/10" 
                                                : "bg-card dark:bg-muted/30 border border-border/50 text-foreground rounded-2xl rounded-tl-sm shadow-sm w-full"
                                            }
                                        `}>
                                            {isLoading ? (
                                                <div className="flex items-center gap-1.5 h-6 px-1">
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100" />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200" />
                                                </div>
                                            ) : (
                                                <div className={`markdown-content ${isUser ? "" : "prose prose-sm dark:prose-invert max-w-none w-full"}`}>
                                                    {shouldAnimate ? (
                                                        <TypewriterEffect text={msg.content} />
                                                    ) : (
                                                        <MarkdownRenderer content={typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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