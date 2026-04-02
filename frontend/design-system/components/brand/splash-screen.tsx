import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "./logo";

const { width, height } = Dimensions.get("window");

const IMESSAGE_BLUE = "#0078fe";
const IMESSAGE_GRAY = "#dedede";

type IMessageBubbleProps = {
  text: string;
  isMe?: boolean;
};

function IMessageBubble({ text, isMe = false }: IMessageBubbleProps) {
  const bubbleColor = isMe ? IMESSAGE_BLUE : IMESSAGE_GRAY;

  return (
    <Box
      paddingVertical="xs"
      paddingHorizontal="sm"
      style={{
        borderRadius: 28,
        maxWidth: "70%",
        position: "relative",
        marginVertical: 5,
        backgroundColor: bubbleColor,
        alignSelf: isMe ? "flex-end" : "flex-start",
        marginLeft: isMe ? "15%" : "5%",
        marginRight: isMe ? "5%" : "15%",
      }}
    >
      <Text variant="bodyDefault" color={isMe ? "textDefault" : "textInverse"}>
        {text}
      </Text>

      <Box
        style={{
          position: "absolute",
          backgroundColor: bubbleColor,
          width: 20,
          height: 25,
          bottom: 0,
          borderBottomLeftRadius: isMe ? 25 : 0,
          borderBottomRightRadius: isMe ? 0 : 25,
          ...(isMe ? { right: -10 } : { left: -10 }),
        }}
      />
      <Box
        style={{
          position: "absolute",
          backgroundColor: "#fff",
          width: 20,
          height: 35,
          bottom: -6,
          borderBottomLeftRadius: isMe ? 18 : 0,
          borderBottomRightRadius: isMe ? 0 : 18,
          ...(isMe ? { right: -20 } : { left: -20 }),
        }}
      />
    </Box>
  );
}

export function SplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Box
      flex={1}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: "#fff" }}
    >
      <Box position="absolute" style={{ top: height * 0.27, right: width * 0.1 }}>
        <IMessageBubble text="Wait I'm so down" isMe />
      </Box>

      <Box
        position="absolute"
        left={0}
        right={0}
        alignItems="center"
        style={{ top: "46%" }}
      >
        <Text variant="headingSm" color="textInverse" textAlign="center" marginBottom="sm">
          {"group trips shouldn't\ndie in the group chat"}
        </Text>
        <Logo />
      </Box>

      <Box position="absolute" style={{ bottom: height * 0.30, left: width * 0.05 }}>
        <IMessageBubble text="where tho" />
      </Box>

      <Box position="absolute" style={{ bottom: height * 0.22, right: width * 0.05 }}>
        <IMessageBubble text="is this happening" isMe />
      </Box>
    </Box>
  );
}
