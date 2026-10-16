import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PreferencesState = {
  hapticsEnabled: boolean;
  setHapticsEnabled: (value: boolean) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
    }),
    {
      name: "scanly.preferences",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
