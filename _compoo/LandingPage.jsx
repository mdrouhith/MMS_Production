"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { 
  ArrowRight, Globe, Sparkles, CreditCard, 
  ChevronDown, ChevronUp, Lock, CheckCircle2, 
  Zap, ShieldCheck, Crown, LayoutGrid, Layers, 
  Users, Target, Clock, Sun, Moon, Twitter, 
  Linkedin, Github, Mail, Send
} from "lucide-react";

// --- 🌍 1. DYNAMIC CONTENT (Updated for New Footer) ---
const content = {
  en: {
    nav: { features: "Features", pricing: "Plans", faq: "FAQs", login: "Sign In", langBtn: "EN" },
    hero: {
      badge: "Mirha Studio v2.0 • Live",
      title: "The Ultimate AI",
      titleSpan: "Powerhouse.",
      desc: "Access Gemini 1.5, GPT-4o, and Claude 3.5 in one unified workspace. Unlock your creative and academic potential today.",
      ctaPrimary: "Start Creating Free",
    },
    scroller: {
      title: "Trusted by 10,000+ Engineers & Teams"
    },
    features: {
      title: "Why Settle for Average?",
      subtitle: "Stop switching tabs. Experience the power of collective intelligence.",
      card1: { title: "Unified Intelligence Grid", desc: "Compare responses from Gemini, GPT-4o, and Claude side-by-side." },
      card2: { title: "Zero-Latency Sync", desc: "Get consolidated reasoning from 4+ AIs in milliseconds." },
      card3: { title: "Build Your AI Squad", desc: "Assign Gemini for Math, Claude for Writing, and GPT-4 for Coding." },
      card4: { title: "Precision Assurance", desc: "Cross-verify facts across multiple neural networks." }
    },
    comingSoon: { badge: "In Development", title: "AI Image Generation", desc: "Generate studio-quality visuals using Flux and DALL-E 3.", status: "LOCKED MODULE" },
    pricing: {
      title: "Choose Your Power",
      desc: "Flexible plans for students, creators, and professionals.",
      free: { name: "Starter", price: "Free", period: "/forever", credit: "10 Credits Daily", btn: "Get Started", features: ["Access to Basic Models", "Standard Speed"] },
      pro: { name: "Student Pro", price: "$3", period: "/month", credit: "2000 Credits", btn: "Subscribe via Card", features: ["Unlock GPT-4o", "Priority Processing"] },
      bkash: { tag: "Best Value", name: "Bangladesh Special", price: "৳300", period: "/month", credit: "2000 Credits", btn: "Pay with bKash", features: ["Instant Activation", "No Credit Card Needed", "Official bKash Gateway"] }
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        { q: "How do the credits work?", a: "Each interaction costs credits based on the model complexity." },
        { q: "Is the bKash payment automated?", a: "Yes! Credits are instantly added via secure webhook." },
        { q: "Can I cancel anytime?", a: "Absolutely. No long-term contracts." }
      ]
    },
    // ✅ NEW FOOTER CONTENT
    footer: {
      brandDesc: "Empowering the next generation of engineers with multi-modal artificial intelligence.",
      col1: "Platform",
      links1: ["Features", "Pricing", "API Status", "Docs"],
      col2: "Legal",
      links2: ["Privacy Policy", "Terms of Service", "Refund Policy"],
      newsletter: {
        title: "Stay Ahead",
        desc: "Get the latest AI updates right to your inbox.",
        placeholder: "Enter your email",
        btn: "Subscribe"
      },
      copyright: "© 2026 Mirhas Studio. All rights reserved.",
      security: "256-BIT SSL ENCRYPTED"
    }
  },
  bn: {
    nav: { features: "ফিচারসমূহ", pricing: "প্যাকেজ", faq: "জিজ্ঞাসাবাদ", login: "লগ ইন", langBtn: "বাংলা" },
    hero: {
      badge: "মিরহাস স্টুডিও ২.০ • লাইভ",
      title: "এআই প্রযুক্তির",
      titleSpan: "পাওয়ারহাউজ।",
      desc: "জেমিনি ১.৫, জিপিটি-৪ এবং ক্লড ৩.৫ ব্যবহার করুন একই সাথে। আজই আনলক করুন আপনার ক্রিয়েটিভ ক্ষমতা।",
      ctaPrimary: "বিনামূল্যে শুরু করুন",
    },
    scroller: {
      title: "১০,০০০+ ইঞ্জিনিয়ার এবং টিমের আস্থার প্রতীক"
    },
    features: {
      title: "কেন সাধারণে সন্তুষ্ট থাকবেন?",
      subtitle: "ট্যাব পরিবর্তন বন্ধ করুন। কালেক্টিভ ইন্টেলিজেন্সের শক্তি অনুভব করুন।",
      card1: { title: "ইউনিফাইড ইন্টেলিজেন্স গ্রিড", desc: "জেমিনি, জিপিটি-৪ এবং ক্লডের উত্তর পাশাপাশি তুলনা করুন।" },
      card2: { title: "জিরো-লেটেন্সি সিঙ্ক", desc: "চোখের পলকে ৪টি এআই থেকে উত্তর পান।" },
      card3: { title: "আপনার এআই টিম", desc: "অঙ্কের জন্য জেমিনি, কোডিংয়ের জন্য জিপিটি-৪ ব্যবহার করুন।" },
      card4: { title: "নির্ভুলতার নিশ্চয়তা", desc: "একাধিক নিউরাল নেটওয়ার্কের মাধ্যমে তথ্য যাচাই করে নিন।" }
    },
    comingSoon: { badge: "ডেভেলপমেন্ট চলছে", title: "এআই ইমেজ জেনারেশন", desc: "ফ্লাক্স এবং ডাল-ই ৩ ব্যবহার করে স্টুডিও মানের ছবি তৈরি করুন।", status: "লকড মডিউল" },
    pricing: {
      title: "আপনার প্ল্যান বেছে নিন",
      desc: "ছাত্র এবং প্রফেশনালদের জন্য সাশ্রয়ী প্যাকেজ।",
      free: { name: "স্টার্টার", price: "ফ্রি", period: "/আজীবন", credit: "১০ ক্রেডিট ডেইলি", btn: "শুরু করুন", features: ["বেসিক মডেলে এক্সেস", "স্ট্যান্ডার্ড স্পিড"] },
      pro: { name: "গ্লোবাল প্রো", price: "$৩", period: "/মাস", credit: "২০০০ ক্রেডিট", btn: "কার্ড পেমেন্ট", features: ["জিপিটি-৪ আনলকড", "ফাস্ট প্রসেসিং"] },
      bkash: { tag: "সেরা অফার", name: "বাংলাদেশ স্পেশাল", price: "৳৩০০", period: "/মাস", credit: "২০০০ ক্রেডিট", btn: "বিকাশ পেমেন্ট", features: ["তাৎক্ষণিক অ্যাক্টিভেশন", "কোনো কার্ড লাগবে না", "অফিসিয়াল পেমেন্ট"] }
    },
    faq: {
      title: "সচরাচর জিজ্ঞাসিত প্রশ্ন",
      items: [
        { q: "ক্রেডিট কীভাবে কাজ করে?", a: "প্রতিটি প্রশ্নের জন্য মডেল অনুযায়ী ক্রেডিট কাটা হয়।" },
        { q: "বিকাশ পেমেন্ট কি অটোমেটিক?", a: "হ্যাঁ! পেমেন্ট করার সাথে সাথেই ক্রেডিট যোগ হয়।" },
        { q: "ক্যান্সেল করা যাবে?", a: "অবশ্যই। কোনো দীর্ঘমেয়াদী চুক্তি নেই।" }
      ]
    },
    // ✅ NEW FOOTER CONTENT (BN)
    footer: {
      brandDesc: "মাল্টি-মডাল কৃত্রিম বুদ্ধিমত্তার মাধ্যমে পরবর্তী প্রজন্মের ইঞ্জিনিয়ারদের ক্ষমতায়ন।",
      col1: "প্ল্যাটফর্ম",
      links1: ["ফিচার", "প্রাইসিং", "এপিআই স্ট্যাটাস", "ডকুমেন্টেশন"],
      col2: "আইনি",
      links2: ["গোপনীয়তা নীতি", "শর্তাবলী", "রিফান্ড পলিসি"],
      newsletter: {
        title: "আপডেট থাকুন",
        desc: "এআই-এর সর্বশেষ খবর পান আপনার ইনবক্সে।",
        placeholder: "আপনার ইমেইল দিন",
        btn: "সাবস্ক্রাইব"
      },
      copyright: "© ২০২৬ মিরহাস স্টুডিও। সর্বস্বত্ব সংরক্ষিত।",
      security: "২৫৬-বিট এসএসএল সুরক্ষিত"
    }
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("dark");

  const t = content[lang];
  const toggleLanguage = () => setLang((prev) => (prev === "en" ? "bn" : "en"));
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-[#020202] text-white" : "bg-slate-50 text-slate-900";
  const glassClass = isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-xl";
  const textMuted = isDark ? "text-gray-400" : "text-slate-500";
  const navClass = isDark ? "bg-black/70 border-white/5" : "bg-white/70 border-slate-200";

  return (
    <div className={`fixed inset-0 z-[999] overflow-y-auto font-sans transition-colors duration-500 ${bgClass}`}>
      
      {/* --- Animations --- */}
      <style jsx>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: scroll 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        .glass-panel { backdrop-filter: blur(16px); }
        .bkash-gradient { background: linear-gradient(135deg, #E2136E 0%, #9e0d4d 100%); }
      `}</style>

      {/* --- Navbar --- */}
      <nav className={`fixed top-0 w-full z-[1000] border-b backdrop-blur-xl transition-all ${navClass}`}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Mirha Studio</span>
          </div>
          
          <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${textMuted}`}>
            <a href="#features" className={`hover:text-pink-500 transition`}>{t.nav.features}</a>
            <a href="#pricing" className={`hover:text-pink-500 transition`}>{t.nav.pricing}</a>
            <a href="#faq" className={`hover:text-pink-500 transition`}>{t.nav.faq}</a>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-full border transition-all ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-100'}`}>
              {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button onClick={toggleLanguage} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-100'}`}>
              <Globe className="w-3.5 h-3.5" /> {t.nav.langBtn}
            </button>
            <SignInButton mode="modal">
              <Button className={`${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'} rounded-full px-6 font-bold text-sm shadow-lg`}>
                {t.nav.login}
              </Button>
            </SignInButton>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-44 pb-20 overflow-hidden">
        {isDark && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-600/15 blur-[120px] rounded-full animate-pulse" />}
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold mb-8 backdrop-blur-md ${isDark ? 'border-pink-500/20 bg-pink-900/10 text-pink-400' : 'border-pink-200 bg-pink-50 text-pink-600'}`}>
            <Zap className="w-3 h-3 fill-current" /> {t.hero.badge}
          </div>
          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.0] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.hero.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
              {t.hero.titleSpan}
            </span>
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light ${textMuted}`}>
            {t.hero.desc}
          </p>
          <div className="flex justify-center">
            <SignInButton mode="modal">
              <Button size="lg" className={`h-14 px-10 text-lg rounded-full shadow-[0_0_50px_-12px_rgba(236,72,153,0.3)] transition-all hover:scale-105 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {t.hero.ctaPrimary} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* --- Seamless Scroller --- */}
      <section className={`py-16 border-y relative overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`absolute inset-y-0 left-0 w-32 z-10 pointer-events-none bg-gradient-to-r ${isDark ? 'from-[#020202] to-transparent' : 'from-slate-50 to-transparent'}`} />
        <div className={`absolute inset-y-0 right-0 w-32 z-10 pointer-events-none bg-gradient-to-l ${isDark ? 'from-[#020202] to-transparent' : 'from-slate-50 to-transparent'}`} />
        <p className={`text-center text-xs font-bold uppercase tracking-[0.2em] mb-10 ${textMuted}`}>{t.scroller.title}</p>
        <div className="flex w-max animate-marquee items-center group">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-20 mx-10 items-center">
               <SeamlessLogo src="/gemini.png" alt="Gemini" />
               <SeamlessLogo src="/gpt4.png" alt="GPT-4" />
               <SeamlessLogo src="/claude.png" alt="Claude" />
               <SeamlessLogo src="/deepseek.png" alt="DeepSeek" />
            </div>
          ))}
        </div>
      </section>

      {/* --- Features --- */}
      <section id="features" className={`py-32 relative overflow-hidden ${isDark ? 'bg-[#020202]' : 'bg-white'}`}>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.features.title}</h2>
            <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed ${textMuted}`}>{t.features.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <FeatureCard icon={<Layers className="w-6 h-6 text-pink-500" />} title={t.features.card1.title} desc={t.features.card1.desc} glassClass={glassClass} textMuted={textMuted} titleColor={isDark ? 'text-white' : 'text-slate-900'} colSpan="md:col-span-2" />
            <FeatureCard icon={<Zap className="w-6 h-6 text-yellow-500" />} title={t.features.card2.title} desc={t.features.card2.desc} glassClass={glassClass} textMuted={textMuted} titleColor={isDark ? 'text-white' : 'text-slate-900'} />
            <FeatureCard icon={<Users className="w-6 h-6 text-cyan-500" />} title={t.features.card3.title} desc={t.features.card3.desc} glassClass={glassClass} textMuted={textMuted} titleColor={isDark ? 'text-white' : 'text-slate-900'} />
            <FeatureCard icon={<Target className="w-6 h-6 text-emerald-500" />} title={t.features.card4.title} desc={t.features.card4.desc} glassClass={glassClass} textMuted={textMuted} titleColor={isDark ? 'text-white' : 'text-slate-900'} colSpan="md:col-span-2" />
          </div>
        </div>
      </section>

      {/* --- Pricing --- */}
      <section id="pricing" className="py-24 relative">
         <div className="container mx-auto px-6">
            <div className="text-center mb-20">
               <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.pricing.title}</h2>
               <p className={`${textMuted}`}>{t.pricing.desc}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
               <PricingCard plan={t.pricing.free} icon={<LayoutGrid />} glassClass={glassClass} isDark={isDark} textMuted={textMuted} />
               <PricingCard plan={t.pricing.pro} icon={<Globe />} glassClass={glassClass} isDark={isDark} textMuted={textMuted} isBlue />
               
               {/* bKash Special */}
               <div className="relative p-8 rounded-3xl flex flex-col transform md:scale-110 md:-translate-y-4 shadow-2xl z-10 bkash-gradient text-white border border-pink-400/30">
                  <div className="absolute top-0 right-0 bg-white text-[#E2136E] text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase tracking-wider">{t.pricing.bkash.tag}</div>
                  <div className="mb-4 p-3 bg-white/20 w-fit rounded-xl backdrop-blur-sm"><Crown className="w-6 h-6 text-white"/></div>
                  <div className="mb-2 h-8 relative w-24 bg-white rounded px-2 py-1">
                      <Image src="/bkash.svg" alt="bKash" fill className="object-contain p-1" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 opacity-90">{t.pricing.bkash.name}</h3>
                  <div className="text-5xl font-black mb-1">{t.pricing.bkash.price}</div>
                  <p className="text-sm text-pink-100 mb-6 font-medium">{t.pricing.bkash.period}</p>
                  <div className="flex-1 space-y-4 mb-8">
                     {t.pricing.bkash.features.map((f, i) => (
                        <div key={i} className="text-pink-50 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-200"/> {f}</div>
                     ))}
                  </div>
                  <SignInButton mode="modal"><Button className="w-full rounded-xl py-6 bg-white text-[#E2136E] hover:bg-gray-100 font-bold">{t.pricing.bkash.btn}</Button></SignInButton>
               </div>
            </div>
         </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className={`py-24 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className={`text-3xl font-bold mb-10 text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.faq.title}</h2>
          <div className="space-y-4">
             {t.faq.items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} glassClass={glassClass} isDark={isDark} />)}
          </div>
        </div>
      </section>

      {/* --- ✨ 🛡️ ULTRA-MODERN PROFESSIONAL FOOTER --- */}
      <footer className={`pt-20 pb-10 border-t ${isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="container mx-auto px-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              
              {/* Brand Col */}
              <div className="space-y-6">
                 <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-pink-600 rounded-lg flex items-center justify-center">
                       <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Mirha Studio</span>
                 </div>
                 <p className={`text-sm leading-relaxed ${textMuted}`}>{t.footer.brandDesc}</p>
                 <div className="flex gap-4">
                    <SocialLink href="#" icon={<Twitter className="w-4 h-4" />} isDark={isDark} />
                    <SocialLink href="#" icon={<Github className="w-4 h-4" />} isDark={isDark} />
                    <SocialLink href="#" icon={<Linkedin className="w-4 h-4" />} isDark={isDark} />
                 </div>
              </div>

              {/* Links Col 1 */}
              <div>
                 <h4 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.footer.col1}</h4>
                 <ul className="space-y-4 text-sm">
                    {t.footer.links1.map((link, i) => (
                       <li key={i}><a href="#" className={`hover:text-pink-500 transition-colors ${textMuted}`}>{link}</a></li>
                    ))}
                 </ul>
              </div>

              {/* Links Col 2 (Safe External Links) */}
              <div>
                 <h4 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.footer.col2}</h4>
                 <ul className="space-y-4 text-sm">
                    {t.footer.links2.map((link, i) => (
                       <li key={i}><a href="#" className={`hover:text-pink-500 transition-colors ${textMuted}`}>{link}</a></li>
                    ))}
                 </ul>
              </div>

              {/* Newsletter Col */}
              <div>
                 <h4 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.footer.newsletter.title}</h4>
                 <p className={`text-sm mb-4 ${textMuted}`}>{t.footer.newsletter.desc}</p>
                 <div className="flex gap-2">
                    <div className="relative w-full">
                       <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${textMuted}`} />
                       <input 
                          type="email" 
                          placeholder={t.footer.newsletter.placeholder}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:border-pink-500 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                       />
                    </div>
                    <Button className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg p-2"><Send className="w-4 h-4" /></Button>
                 </div>
              </div>
           </div>

           {/* Bottom Bar */}
           <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
              <p className={`text-xs ${textMuted}`}>{t.footer.copyright}</p>
              <div className="flex items-center gap-2 opacity-60">
                 <ShieldCheck className="w-4 h-4 text-green-500" />
                 <span className={`text-[10px] font-mono font-bold ${textMuted}`}>{t.footer.security}</span>
              </div>
           </div>
        </div>
      </footer>

    </div>
  );
}

// --- ✨ Sub-Components ---

function SeamlessLogo({ src, alt }) {
    return (
        <div className="relative h-10 w-32 transition-all duration-300 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 hover:scale-110 cursor-pointer">
            <Image src={src} alt={alt} fill className="object-contain" />
        </div>
    )
}

function SocialLink({ href, icon, isDark }) {
   return (
      <a 
         href={href} 
         target="_blank" 
         rel="noopener noreferrer" // 🛡️ Security Fix: Prevents Tabnabbing
         className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-gray-400 hover:bg-pink-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-pink-600 hover:text-white'}`}
      >
         {icon}
      </a>
   )
}

function FeatureCard({ icon, title, desc, glassClass, textMuted, titleColor, colSpan = "" }) {
  return (
    <div className={`glass-panel p-8 rounded-3xl border flex flex-col hover:-translate-y-2 transition-transform duration-300 ${glassClass} ${colSpan}`}>
      <div className="w-14 h-14 rounded-2xl bg-current/5 border border-current/10 flex items-center justify-center mb-6">{icon}</div>
      <h3 className={`text-2xl font-bold mb-3 ${titleColor}`}>{title}</h3>
      <p className={`leading-relaxed text-sm flex-1 ${textMuted}`}>{desc}</p>
    </div>
  )
}

function PricingCard({ plan, icon, glassClass, isDark, textMuted, isBlue }) {
   const borderClass = isBlue ? "border-blue-500/30" : (isDark ? "border-white/10" : "border-slate-200");
   const titleColor = isBlue ? "text-blue-500" : (isDark ? "text-white" : "text-slate-900");
   
   return (
      <div className={`glass-panel p-8 rounded-3xl border flex flex-col hover:-translate-y-2 transition-transform duration-300 ${glassClass} ${borderClass}`}>
         <div className="mb-4 p-3 bg-current/5 w-fit rounded-xl">{icon}</div>
         <h3 className={`text-xl font-bold mb-2 ${titleColor}`}>{plan.name}</h3>
         <div className={`text-4xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.price}</div>
         <p className={`text-sm mb-6 ${textMuted}`}>{plan.period}</p>
         <div className="flex-1 space-y-4 mb-8">
            {plan.features.map((f, i) => (
               <div key={i} className={`text-sm flex items-center gap-2 ${textMuted}`}><CheckCircle2 className="w-4 h-4 text-green-500"/> {f}</div>
            ))}
         </div>
         <SignInButton mode="modal"><Button className="w-full rounded-xl py-6" variant="outline">{plan.btn}</Button></SignInButton>
      </div>
   )
}

function FAQItem({ q, a, glassClass, isDark }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`border rounded-2xl overflow-hidden ${glassClass}`}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-6 text-left hover:opacity-80 transition">
                <span className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{q}</span>
                {isOpen ? <ChevronUp className="text-pink-500" /> : <ChevronDown className="text-gray-500" />}
            </button>
            {isOpen && <div className={`px-6 pb-6 text-sm leading-relaxed border-t pt-4 ${isDark ? 'text-gray-400 border-white/5' : 'text-slate-600 border-slate-200'}`}>{a}</div>}
        </div>
    )
}