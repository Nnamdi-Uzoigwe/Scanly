import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getDatabase } from "@/database/client";
import { theme } from "../constants/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    async function prepare() {
      try {
        await getDatabase();
      } catch (error) {
        if (active) setInitError(error as Error);
      } finally {
        if (active) setReady(true);
      }
    }

    void prepare();

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (initError) {
    console.error("Database initialization failed", initError);
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: "fade",
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
