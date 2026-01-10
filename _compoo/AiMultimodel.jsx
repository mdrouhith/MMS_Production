import React, { useState, useEffect } from "react";
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
import { MessageSquare, Lock, Crown } from "lucide-react"; // Crown আইকন ইম্পোর্ট করলাম প্রিমিয়াম ফিল দেওয়ার জন্য
import { Button } from "@/components/ui/button";
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { db } from "@/config/FirebaseConfig"; 

function AiMultimodel() {
  const [aiModeList, setAiModelList] = React.useState(AiModelList);
  const [selectedValues, setSelectedValues] = useState({});
  const { user } = useUser();

  // ডাটাবেস থেকে সেভ করা ডাটা লোড করার useEffect (আগের মতোই)
  useEffect(() => {
    if (!user || !user.primaryEmailAddress?.emailAddress) return;

    const fetchSavedPreferences = async () => {
      try {
        const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.selectedModelPref) {
            setSelectedValues(data.selectedModelPref);
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };
    fetchSavedPreferences();
  }, [user]);

  // ডাটা সেভ করার ফাংশন (আগের মতোই)
  const updatePreference = async (parentModelName, subModelId) => {
    setSelectedValues((prev) => ({
      ...prev,
      [parentModelName]: subModelId
    }));

    if (!user || !user.primaryEmailAddress?.emailAddress) return;

    try {
      const userRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress);
      await setDoc(userRef, {
        selectedModelPref: {
          [parentModelName]: subModelId 
        }
      }, { merge: true });
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
              {/* মডেল আইকন */}
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
                <>
                  {/* ১. লজিক: যদি প্যারেন্ট মডেলটি নিজেই 'PREMIUM' হয়, তাহলে ড্রপডাউন না দেখিয়ে বাটন দেখাবো */}
                  {model.premium ? (
                    <Button
                      variant="outline"
                      className="w-full max-w-[240px] h-10 justify-between bg-amber-50/50 border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors cursor-not-allowed"
                    >
                      {/* প্যারেন্ট মডেলের নাম (যেমন: Llama) */}
                      <span className="font-semibold text-sm flex items-center gap-2">
                         {model.model}
                         <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded text-amber-800 font-bold">PRO</span>
                      </span>
                      
                      {/* লক আইকন */}
                      <Lock className="w-4 h-4 text-amber-600" />
                    </Button>
                  ) : (
                    
                    /* ২. আর যদি ফ্রি মডেল হয়, তাহলে আগের সেই ড্রপডাউন দেখাবে */
                    <Select
                      key={model.model + currentVal} 
                      value={currentVal}
                      onValueChange={(value) => updatePreference(model.model, value)}
                    >
                      <SelectTrigger className="w-full max-w-[240px] h-10 border-input/60 shadow-sm focus:ring-1 focus:ring-ring">
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>

                      <SelectContent className="max-h-[300px] w-[260px]">
                        {/* ফ্রি সাব-মডেল সেকশন */}
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

                        {/* প্রিমিয়াম সাব-মডেল সেকশন */}
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
                </>
              )}
            </div>

            {/* টগল বাটন */}
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