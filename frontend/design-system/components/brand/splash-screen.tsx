import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { type ReactNode, useEffect, useMemo } from "react";
import { Animated, Dimensions } from "react-native";
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
      <Text variant="bodyDefault" color={isMe ? "white" : "gray900"}>
        {text}
      </Text>

      <Box
        position="absolute"
        width={20}
        height={25}
        bottom={0}
        backgroundColor="blue500"
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
        backgroundColor="white"
        borderBottomLeftRadius={isMe ? "xl" : "none"}
        borderBottomRightRadius={isMe ? "none" : "xl"}
        style={{
          ...(isMe ? { right: -20 } : { left: -20 }),
        }}
      />
    </Box>
  );
}

type AnimatedBubbleProps = {
  delay: number;
  fromX: number;
  children: ReactNode;
};

function AnimatedBubble({ delay, fromX, children }: AnimatedBubbleProps) {
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateX = useMemo(() => new Animated.Value(fromX), [fromX]);
  const scale = useMemo(() => new Animated.Value(0.96), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        delay,
        damping: 15,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        damping: 15,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, scale, translateX]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

export function SplashScreen() {
  return (
    <Box flex={1} backgroundColor="white">
      <Box
        position="absolute"
        style={{ top: height * 0.27, right: width * 0.1 }}
      >
        <AnimatedBubble delay={0} fromX={24}>
          <IMessageBubble text="Wait I'm so down" isMe />
        </AnimatedBubble>
      </Box>

      <Box
        position="absolute"
        left={0}
        right={0}
        top={0}
        bottom={0}
        alignItems="center"
        justifyContent="center"
      >
        <Box alignItems="center">
          <Text
            variant="headingSm"
            color="gray900"
            textAlign="center"
            marginBottom="sm"
          >
            {"group trips shouldn't\ndie in the group chat"}
          </Text>
          <Logo />
        </Box>
      </Box>

      <Box
        position="absolute"
        style={{ bottom: height * 0.3, left: width * 0.05 }}
      >
        <AnimatedBubble delay={140} fromX={-24}>
          <IMessageBubble text="where tho" />
        </AnimatedBubble>
      </Box>

      <Box
        position="absolute"
        style={{ bottom: height * 0.22, right: width * 0.05 }}
      >
        <AnimatedBubble delay={260} fromX={24}>
          <IMessageBubble text="is this happening" isMe />
        </AnimatedBubble>
      </Box>
    </Box>
  );
}
