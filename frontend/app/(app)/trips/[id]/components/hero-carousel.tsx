import { Box } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type HeroCarouselProps = {
  images: string[];
  onViewAll: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const HERO_HEIGHT = 232;

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroCarousel({ images, onViewAll }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const imageWidth = width - 24;

  if (images.length === 0) return null;

  return (
    <Box style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
          setActiveIndex(index);
        }}
      >
        {images.map((uri, i) => (
          <Pressable key={i} onPress={onViewAll}>
            <Image
              source={{ uri }}
              style={[styles.image, { width: imageWidth }]}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {images.length > 1 && (
        <Box style={styles.dotsContainer}>
          {images.map((_, i) => (
            <Box
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "relative",
    paddingHorizontal: 12,
  },
  image: {
    height: HERO_HEIGHT,
    borderRadius: 20,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: ColorPalette.white },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.5)" },
});
