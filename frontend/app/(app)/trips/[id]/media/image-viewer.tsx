import { Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MediaItem } from "./types";

// ─── Component ───────────────────────────────────────────────────────────────

type ImageViewerProps = {
  images: MediaItem[];
  initialIndex: number;
  onClose: () => void;
};

export function ImageViewer({
  images,
  initialIndex,
  onClose,
}: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={[styles.bar, { paddingTop: top + 8 }]}>
          <Text style={styles.counter}>
            {index + 1}/{images.length}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onMomentumScrollEnd={(e) => {
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
        >
          {images.map((item) => (
            <Image
              key={item.imageId}
              source={{ uri: item.url }}
              style={{ width, height }}
              contentFit="contain"
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
          <Pressable style={styles.viewAllButton} onPress={onClose}>
            <Text style={styles.viewAllText}>View all photos</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: 12,
  },
  counter: {
    color: "#fff",
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.spacing.sm,
  },
  viewAllButton: {
    backgroundColor: ColorPalette.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  viewAllText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
    textAlign: "center",
  },
});
