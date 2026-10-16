import * as Haptics from "expo-haptics";

import { usePreferences } from "../store/preferences";

function allowed(): boolean {
  if (!usePreferences.persist.hasHydrated()) return false;
  return usePreferences.getState().hapticsEnabled;
}

export function tapLight(): void {
  if (!allowed()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function notifySuccess(): void {
  if (!allowed()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function notifyWarning(): void {
  if (!allowed()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
