import React from "react";
import Image from "next/image";
import AiModelList from "@/shared/AiModelList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Lock } from "lucide-react"; // Added Lock icon
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

  return (
    <div className="flex w-full h-[75vh] border-b overflow-x-auto">
      {aiModeList.map((model, index) => (
        <div
          key={index}
          className={`
            flex items-start justify-between border-r px-6 hover:bg-muted/5 transition-all duration-300 ease-in-out
            ${model.enable ? "min-w-[400px]" : "min-w-[120px]"}
          `}
        >
          {/* Left Side: Image & Controls */}
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <Image
                src={model.icon}
                alt={model.model}
                width={32}
                height={32}
                className="object-contain opacity-90"
              />
            </div>

            {/* Logic: Show Content ONLY if Enabled */}
            {model.enable && (
              <>
                {/* Nested Logic: If Premium -> Show Upgrade Button, Else -> Show Select */}
                {model.premium ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <Lock className="w-3 h-3" /> 
                    Upgrade to Unlock
                  </Button>
                  
                  
                ) : (
                  <Select
                    defaultValue={model.subModel[0]?.id || model.subModel[0]?.name}
                  >
                    <SelectTrigger className="w-[200px] shadow-sm">
                      <SelectValue placeholder={model.subModel[0].name} />
                    </SelectTrigger>

                    <SelectContent>
                      {model.subModel.map((subModel, subIndex) => (
                        <SelectItem
                          key={subIndex}
                          value={subModel.id || subModel.name}
                          className="cursor-pointer"
                        >
                          {subModel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          {/* Right Side: Switch / Icon Toggle */}
          <div className="pl-4">
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