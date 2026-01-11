"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import AiModelList from "@/shared/AiModelList"; // তোমার মডেল লিস্ট ইম্পোর্ট

// Context তৈরি করা হলো
const SelectedModelContext = createContext();

export function SelectedModelProvider({ children }) {
  const { user } = useUser();
  
  // States
  const [aiModeList, setAiModelList] = useState(AiModelList);
  const [selectedValues, setSelectedValues] = useState({});

  // 1. Firebase থেকে ইউজারের আগের সেভ করা মডেল প্রেফারেন্স লোড করা
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

  // 2. মডেল সিলেকশন আপডেট এবং ফায়ারবেসে সেভ করা
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

  // 3. মডেল অন/অফ টগল করা
  const onToggleChange = (modelName, isEnabled) => {
    setAiModelList((prevModels) =>
      prevModels.map((m) =>
        m.model === modelName ? { ...m, enable: isEnabled } : m
      )
    );
  };

  // এই ভ্যালুগুলো পুরো অ্যাপে সব জায়গায় পাওয়া যাবে
  const value = {
    aiModeList,
    selectedValues,
    updatePreference,
    onToggleChange
  };

  return (
    <SelectedModelContext.Provider value={value}>
      {children}
    </SelectedModelContext.Provider>
  );
}

// Custom Hook: এটা কল করলেই অন্য ফাইলে ডাটা পাওয়া যাবে
export function useSelectedModel() {
  return useContext(SelectedModelContext);
}