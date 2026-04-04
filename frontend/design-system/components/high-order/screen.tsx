import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = {
  children: React.ReactNode;
  backgroundColor?: string;
  edges?: Edge[];
};

export function Screen({
  children,
  backgroundColor = "#FFFFFF",
  edges = ["top"],
}: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{ flex: 1 }}
          onStartShouldSetResponder={() => {
            Keyboard.dismiss();
            return false;
          }}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
