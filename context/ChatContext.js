"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { user } = useUser();
  const [messages, setMessages] = useState({});
  const [chatId, setChatId] = useState(null);
  const [chatList, setChatList] = useState([]);

  // 1. Load Chat List
  useEffect(() => {
    if (!user || !user.primaryEmailAddress?.emailAddress) return;

    const q = query(
      collection(db, "users", user?.primaryEmailAddress?.emailAddress, "chats"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Delete Chat (Updated: Logic Only, No UI Alert)
  const deleteChat = async (idToDelete) => {
    if (!user || !idToDelete) return;
    
    // NOTE: Removed window.confirm here because we handle it in the UI now
    try {
        await deleteDoc(doc(db, "users", user?.primaryEmailAddress?.emailAddress, "chats", idToDelete));
        
        if (chatId === idToDelete) {
            startNewChat();
        }
    } catch (error) {
        console.error("Error deleting chat:", error);
    }
  };

  // 3. Update Messages
  const updateMessages = async (newMessages, currentInput = "", forcedChatId = null) => {
    setMessages(newMessages); 

    if (!user) return null;

    let activeChatId = forcedChatId || chatId;

    try {
      if (!activeChatId) {
        const title = currentInput ? currentInput.substring(0, 30) + "..." : "New Chat";
        const docRef = await addDoc(collection(db, "users", user?.primaryEmailAddress?.emailAddress, "chats"), {
          title: title,
          createdAt: serverTimestamp(),
          messages: newMessages 
        });
        activeChatId = docRef.id;
        setChatId(activeChatId); 
      } else {
        const chatRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress, "chats", activeChatId);
        await setDoc(chatRef, { 
          messages: newMessages,
          lastModified: serverTimestamp() 
        }, { merge: true });
      }
    } catch (error) {
      console.error("DB Error:", error);
    }
    return activeChatId;
  };

  // 4. Load Chat
  const loadChat = async (id) => {
    setChatId(id);
    const docRef = doc(db, "users", user?.primaryEmailAddress?.emailAddress, "chats", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setMessages(docSnap.data().messages || {});
    }
  };

  // 5. Start New Chat
  const startNewChat = () => {
    setChatId(null); 
    setMessages({});
  };

  return (
    <ChatContext.Provider value={{ messages, setMessages, updateMessages, chatId, chatList, loadChat, startNewChat, deleteChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}