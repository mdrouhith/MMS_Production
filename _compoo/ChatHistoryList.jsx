import React from "react";
import { useChat } from "@/context/ChatContext";
import { MessageSquare, Trash2 } from "lucide-react";

function ChatHistoryList() {
  const { chatList, loadChat, chatId } = useChat();

  return (
    <div className="flex flex-col gap-2 mt-2 max-h-[300px] overflow-y-auto">
      {chatList.map((chat) => (
        <div 
          key={chat.id}
          onClick={() => loadChat(chat.id)}
          className={`
            flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted group
            ${chatId === chat.id ? "bg-muted border border-primary/20 shadow-sm" : ""}
          `}
        >
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium truncate w-[160px] text-foreground/80">
            {chat.title || "Untitled Chat"}
          </h3>
        </div>
      ))}
      
      {chatList.length === 0 && (
        <div className="text-xs text-muted-foreground text-center mt-5 p-4 border border-dashed rounded-lg">
            No history found. <br/> Start a new chat!
        </div>
      )}
    </div>
  );
}

export default ChatHistoryList;