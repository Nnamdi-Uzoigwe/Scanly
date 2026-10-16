import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { theme } from "../constants/theme";

export default function IndexScreen() {
  const [destination, setDestination] = useState<
    "/onboarding" | "/home" | null
  >(null);

  useEffect(() => {
    let active = true;

    async function checkOnboarding() {
      try {
        const completed = await AsyncStorage.getItem(
          "scanly.onboarding.complete",
        );

        if (active) {
          setDestination(completed === "true" ? "/home" : "/onboarding");
        }
      } catch {
        if (active) setDestination("/onboarding");
      }
    }

    void checkOnboarding();

    return () => {
      active = false;
    };
  }, []);

  if (!destination) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
