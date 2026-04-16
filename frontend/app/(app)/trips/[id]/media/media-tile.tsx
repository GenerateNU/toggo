import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { MediaItem } from "./types";

// ─── Constants ───────────────────────────────────────────────────────────────

export const TILE_SIZE = 181;

// ─── Component ───────────────────────────────────────────────────────────────

type MediaTileProps = {
  item: MediaItem;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: (x: number, y: number, layout: { x: number; y: number }) => void;
};

export function MediaTile({
  item,
  isSelected,
  onPress,
  onLongPress,
}: MediaTileProps) {
  const tileRef = useRef<View>(null);
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 200 / TILE_SIZE : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  }, [isSelected, scale]);

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
      <Animated.View style={[styles.tile, { transform: [{ scale }] }]}>
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
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
});
