import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { MediaItem } from "./types";

// ─── Constants ───────────────────────────────────────────────────────────────

export const TILE_SIZE = 181; // kept for any legacy usage

// ─── Component ───────────────────────────────────────────────────────────────

type MediaTileProps = {
  item: MediaItem;
  size?: number;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: (x: number, y: number, layout: { x: number; y: number }) => void;
};

export function MediaTile({
  item,
  size = TILE_SIZE,
  isSelected,
  onPress,
  onLongPress,
}: MediaTileProps) {
  const tileRef = useRef<View>(null);
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? (size + 19) / size : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  }, [isSelected, scale, size]);

  return (
    <Pressable
      ref={tileRef}
      delayLongPress={400}
      onPress={onPress}
      onLongPress={(e) => {
        const { pageX, pageY } = e.nativeEvent;
        tileRef.current?.measureInWindow((tx, ty) => {
          onLongPress(pageX, pageY, { x: tx, y: ty });
        });
      }}
    >
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: 12 },
          { transform: [{ scale }] },
        ]}
      >
        <Image
          source={{ uri: item.url }}
          style={styles.image}
          contentFit="cover"
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
});
