import React from "react";
import Image from "next/image";
import AiModelList from "@/shared/AiModelList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Lock } from "lucide-react"; 
import { Button } from "@/components/ui/button";


function AiMultimodel() {
  const [aiModeList, setAiModelList] = React.useState(AiModelList);

  const onToggleChange = (model, value) => {
    setAiModelList((prevModels) =>
      prevModels.map((m) =>
        m.model === model.model ? { ...m, enable: value } : m
      )
    );
  };

  // Firestore আপডেট করার লজিক

  
  return (
    <div className="flex w-full h-[75vh] border-b overflow-x-auto">
      {aiModeList.map((model, index) => (
        <div
          key={index}
          className={`
            flex items-start justify-between border-r px-6 py-4 hover:bg-muted/5 transition-all duration-300 ease-in-out
            ${model.enable ? "min-w-[420px]" : "min-w-[120px]"}
          `}
        >
          {/* বাম পাশ: ইমেজ এবং কন্ট্রোল */}
          <div className="flex items-center gap-5 w-full">
            <div className="flex-shrink-0 p-2 bg-secondary/20 rounded-lg">
              <Image
                src={model.icon}
                alt={model.model}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>

            {/* লজিক: যদি মডেল এনাবল থাকে তবেই ড্রপডাউন দেখাবে */}
            {model.enable && (
              <Select
                // লজিক: ডিফল্ট হিসেবে প্রথম ফ্রি মডেলটি সেট হবে
                defaultValue={
                  model.subModel.find((m) => !m.premium)?.id ||
                  model.subModel[0]?.id
                }
              >
                {/* ট্রিগার বাটন ডিজাইন: একটু চওড়া এবং শ্যাডো ক্লিন করা হয়েছে */}
                <SelectTrigger className="w-full max-w-[240px] h-10 border-input/60 shadow-sm focus:ring-1 focus:ring-ring">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>

                {/* ড্রপডাউন কন্টেন্ট ডিজাইন: প্যাডিং এবং বর্ডার রেডিয়াস ঠিক করা হয়েছে */}
                <SelectContent className="max-h-[300px] w-[260px]">
                  
                  {/* ১. ফ্রি মডেল সেকশন (Free Section Group) */}
                  {model.subModel.some((m) => !m.premium) && (
                    <SelectGroup>
                      <SelectLabel className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30">
                        Free Models
                      </SelectLabel>
                      {model.subModel
                        .filter((item) => !item.premium)
                        .map((subModel, subIndex) => (
                          <SelectItem
                            key={`free-${subIndex}`}
                            value={subModel.id || subModel.name}
                            className="cursor-pointer py-2.5 pl-4 focus:bg-accent focus:text-accent-foreground"
                          >
                            <span className="font-medium text-sm">
                              {subModel.name}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )}

                  {/* ২. প্রিমিয়াম মডেল সেকশন (Premium Section Group) */}
                  {model.subModel.some((m) => m.premium) && (
                    <SelectGroup>
                      {/* সেকশনের মাঝে বর্ডার দিয়ে আলাদা করা হয়েছে */}
                      <div className="h-[1px] bg-border my-1" /> 
                      <SelectLabel className="px-2 py-2 text-[10px] font-bold text-amber-600/90 uppercase tracking-widest bg-amber-50/50">
                        Premium Models
                      </SelectLabel>
                      
                      {model.subModel
                        .filter((item) => item.premium)
                        .map((subModel, subIndex) => (
                          <SelectItem
                            key={`prem-${subIndex}`}
                            value={subModel.id || subModel.name}
                            disabled={true} 
                            className="opacity-100 py-2.5 pl-4 data-[disabled]:opacity-100" // Opacity ফিক্স করা হয়েছে যেন আইকন ঝাপসা না লাগে
                          >
                            {/* ফ্লেক্সবক্স দিয়ে নাম এবং লক আইকন দুই পাশে সরিয়ে দেওয়া হয়েছে (Proper Alignment) */}
                            <div className="flex items-center justify-between w-full pr-1">
                              <span className="text-sm text-muted-foreground/80 font-medium">
                                {subModel.name}
                              </span>
                              
                              {/* লক আইকন এবং টেক্সট ডিজাইন */}
                              <div className=" ml-2 flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">
                                  Pro
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )}

                </SelectContent>
              </Select>
            )}
          </div>

          {/* ডান পাশ: সুইচ বা আইকন টগল */}
          <div className="pl-4 border-l ml-2 flex items-center h-full">
            {model.enable ? (
              <Switch
                checked={model.enable}
                onCheckedChange={(v) => onToggleChange(model, v)}
              />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => onToggleChange(model, true)}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AiMultimodel;