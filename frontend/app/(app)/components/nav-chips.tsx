import { Box, Text } from "@/design-system";
import { router } from "expo-router";
import { Pressable } from "react-native";

const NAV_ITEMS = [
  { label: "Settings", path: "/settings" },
  { label: "Proof of Concept", path: "/testing" },
  { label: "Design System", path: "/ui-kit" },
] as const;

export function NavChips() {
  return (
    <Box flexDirection="row" flexWrap="wrap" gap="xs" paddingHorizontal="sm">
      {NAV_ITEMS.map(({ label, path }) => (
        <Pressable
          key={path}
          onPress={() => router.push(path as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Box
            paddingHorizontal="sm"
            paddingVertical="xxs"
            borderRadius="xl"
            backgroundColor="gray50"
          >
            <Text variant="bodyXsMedium" color="gray500">
              {label}
            </Text>
          </Box>
        </Pressable>
      ))}
    </Box>
  );
}
