import React, { useState, useEffect } from "react"; // ১. useEffect ইম্পোর্ট করা হলো
import Image from "next/image";
import AiModelList from "@/shared/AiModelList";
import { useUser } from "@clerk/nextjs";
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

// ২. getDoc ইম্পোর্ট করা হলো ডাটা রিড করার জন্য
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { db } from "@/config/FirebaseConfig"; 

function AiMultimodel() {
  const [aiModeList, setAiModelList] = React.useState(AiModelList);
  
  // সিলেক্ট করা ভ্যালুগুলো রাখার জন্য স্টেট
  const [selectedValues, setSelectedValues] = useState({});

  const { user } = useUser();

  // ৩. [NEW] এই useEffect টি পেজ লোড হওয়ার পর রান হবে এবং ডাটাবেস থেকে সেভ করা ভ্যালু আনবে
  useEffect(() => {
    // ইউজার না থাকলে ফাংশন থামিয়ে দিবে
    if (!user || !user.primaryEmailAddress?.emailAddress) return;

    const fetchSavedPreferences = async () => {
      try {
        const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // যদি ডাটাবেসে 'selectedModelPref' থাকে, তবে সেটি আমাদের স্টেটে সেট করে দিবে
          if (data?.selectedModelPref) {
            setSelectedValues(data.selectedModelPref);
            console.log("Saved preferences loaded:", data.selectedModelPref);
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };

    fetchSavedPreferences();
  }, [user]); // যখনই ইউজার ইনফো লোড হবে, এটি রান করবে


  // ডাটা সেভ করার ফাংশন (আগের মতোই আছে)
  const updatePreference = async (parentModelName, subModelId) => {
    // লোকাল স্টেটে সেভ করছি যাতে সাথে সাথে চেঞ্জ দেখা যায়
    setSelectedValues((prev) => ({
      ...prev,
      [parentModelName]: subModelId
    }));

    if (!user || !user.primaryEmailAddress?.emailAddress) return;

    try {
      const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
      // ফায়ারবেসে আপডেট করা হচ্ছে
      await setDoc(userRef, {
        selectedModelPref: {
          [parentModelName]: subModelId 
        }
      }, { merge: true });
      console.log(`Saved: ${parentModelName} -> ${subModelId}`);
    } catch (error) {
      console.error("Save Error:", error);
    }
  };

  const onToggleChange = (model, value) => {
    setAiModelList((prevModels) =>
      prevModels.map((m) =>
        m.model === model.model ? { ...m, enable: value } : m
      )
    );
  };

  return (
    <div className="flex w-full h-[75vh] border-b overflow-x-auto">
      {aiModeList.map((model, index) => {
        // ৪. ডাটাবেস থেকে আসা ভ্যালু অথবা বর্তমানে সিলেক্ট করা ভ্যালু এখানে সেট হবে
        const currentVal = selectedValues[model.model] || "";

        return (
          <div
            key={index}
            className={`
              flex items-start justify-between border-r px-6 py-4 hover:bg-muted/5 transition-all duration-300 ease-in-out
              ${model.enable ? "min-w-[420px]" : "min-w-[120px]"}
            `}
          >
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

              {model.enable && (
                <Select
                  // ৫. 'key' প্রপসটি খুবই গুরুত্বপূর্ণ, এটি এনশিওর করে যে ডাটা লোড হওয়ার পর ড্রপডাউনটি আপডেট হবে
                  key={model.model + currentVal} 
                  
                  // ডাটাবেস থেকে পাওয়া ভ্যালু এখানে বসে যাবে
                  value={currentVal}
                  onValueChange={(value) => updatePreference(model.model, value)}
                >
                  <SelectTrigger className="w-full max-w-[240px] h-10 border-input/60 shadow-sm focus:ring-1 focus:ring-ring">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>

                  <SelectContent className="max-h-[300px] w-[260px]">
                    
                    {/* ফ্রি মডেল সেকশন */}
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
                              value={subModel.id}
                              className="cursor-pointer py-2.5 pl-4 focus:bg-accent focus:text-accent-foreground"
                            >
                              <span className="font-medium text-sm">
                                {subModel.name}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}

                    {/* প্রিমিয়াম মডেল সেকশন */}
                    {model.subModel.some((m) => m.premium) && (
                      <SelectGroup>
                        <div className="h-[1px] bg-border my-1" /> 
                        <SelectLabel className="px-2 py-2 text-[10px] font-bold text-amber-600/90 uppercase tracking-widest bg-amber-50/50">
                          Premium Models
                        </SelectLabel>
                        {model.subModel
                          .filter((item) => item.premium)
                          .map((subModel, subIndex) => (
                            <SelectItem
                              key={`prem-${subIndex}`}
                              value={subModel.id}
                              disabled={true} 
                              className="opacity-100 py-2.5 pl-4 data-[disabled]:opacity-100" 
                            >
                              <div className="flex items-center justify-between w-full pr-1">
                                <span className="text-sm text-muted-foreground/80 font-medium">
                                  {subModel.name}
                                </span>
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
        );
      })}
    </div>
  );
}

export default AiMultimodel;