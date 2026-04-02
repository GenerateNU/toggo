import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Dimensions } from "react-native";
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
      borderRadius="xl"
      marginVertical="xs"
      position="relative"
      alignSelf={isMe ? "flex-end" : "flex-start"}
      style={{
        maxWidth: "70%",
        backgroundColor: bubbleColor,
        marginLeft: isMe ? "15%" : "5%",
        marginRight: isMe ? "5%" : "15%",
      }}
    >
      <Text variant="bodyDefault" color={isMe ? "textDefault" : "textInverse"}>
        {text}
      </Text>

      <Box
        position="absolute"
        width={20}
        height={25}
        bottom={0}
        backgroundColor="textLink"
        borderBottomLeftRadius={isMe ? "xl" : "none"}
        borderBottomRightRadius={isMe ? "none" : "xl"}
        style={{
          backgroundColor: bubbleColor,
          ...(isMe ? { right: -10 } : { left: -10 }),
        }}
      />
      <Box
        position="absolute"
        width={20}
        height={35}
        bottom={-6}
        backgroundColor="backgroundCard"
        borderBottomLeftRadius={isMe ? "xl" : "none"}
        borderBottomRightRadius={isMe ? "none" : "xl"}
        style={{
          ...(isMe ? { right: -20 } : { left: -20 }),
        }}
      />
    </Box>
  );
}

export function SplashScreen() {
  return (
    <Box flex={1} backgroundColor="backgroundCard">
      <Box
        position="absolute"
        style={{ top: height * 0.27, right: width * 0.1 }}
      >
        <IMessageBubble text="Wait I'm so down" isMe />
      </Box>

      <Box
        position="absolute"
        left={0}
        right={0}
        alignItems="center"
        style={{ top: "46%" }}
      >
        <Text
          variant="headingSm"
          color="textInverse"
          textAlign="center"
          marginBottom="sm"
        >
          {"group trips shouldn't\ndie in the group chat"}
        </Text>
        <Logo />
      </Box>

      <Box
        position="absolute"
        style={{ bottom: height * 0.3, left: width * 0.05 }}
      >
        <IMessageBubble text="where tho" />
      </Box>

      <Box
        position="absolute"
        style={{ bottom: height * 0.22, right: width * 0.05 }}
      >
        <IMessageBubble text="is this happening" isMe />
      </Box>
    </Box>
  );
}
