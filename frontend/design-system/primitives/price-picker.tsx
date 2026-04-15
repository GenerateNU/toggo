import { Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { FontFamily, FontSize } from "../tokens/typography";

// ─── Constants ───────────────────────────────────────────────────────────────

const TICK_WIDTH = 2;
const TICK_GAP = 8;
const TICK_HEIGHT_MINOR = 12;
const TICK_HEIGHT_MAJOR = 20;
const TICK_COUNT = 600;
const PRICE_PER_PIXEL = 1;
const SNAP_TO = 10;
const MIN_PRICE = 0;
const MAX_PRICE = 5000;
const CONTAINER_HALF = 173;

function priceToOffset(price: number): number {
  return CONTAINER_HALF - price / PRICE_PER_PIXEL;
}

function offsetToPrice(offset: number): number {
  return Math.max(
    MIN_PRICE,
    Math.min(MAX_PRICE, (CONTAINER_HALF - offset) * PRICE_PER_PIXEL),
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PricePickerProps = {
  visible: boolean;
  value?: number;
  onConfirm: (price: number) => void;
  onClose: () => void;
};

// ─── Ruler ───────────────────────────────────────────────────────────────────

function Ruler({ translateX }: { translateX: Animated.Value }) {
  const ticks = useMemo(
    () => Array.from({ length: TICK_COUNT }, (_, i) => i),
    [],
  );
  return (
    <Animated.View style={[styles.ruler, { transform: [{ translateX }] }]}>
      {ticks.map((i) => (
        <View
          key={i}
          style={[
            styles.tick,
            { height: i % 10 === 0 ? TICK_HEIGHT_MAJOR : TICK_HEIGHT_MINOR },
          ]}
        />
      ))}
    </Animated.View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PricePicker({
  visible,
  value,
  onConfirm,
  onClose,
}: PricePickerProps) {
  const [rawText, setRawText] = useState(
    value != null && value > 0 ? String(value) : "",
  );

  const translateX = useRef(
    new Animated.Value(priceToOffset(value ?? 0)),
  ).current;
  const currentOffset = useRef(priceToOffset(value ?? 0));
  const baseOffset = useRef(priceToOffset(value ?? 0));
  const inputRef = useRef<TextInput>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      const initial = value ?? 0;
      setRawText(initial > 0 ? String(initial) : "");
      const offset = priceToOffset(initial);
      translateX.setValue(offset);
      currentOffset.current = offset;
      baseOffset.current = offset;
    }
  }, [visible, value, translateX]);

  // ─── Text → ruler ──────────────────────────────────────────────────────

  const handleTextChange = (text: string) => {
    const filtered = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setRawText(filtered);
    const parsed = parseFloat(filtered);
    if (!isNaN(parsed)) {
      const clamped = Math.max(MIN_PRICE, Math.min(MAX_PRICE, parsed));
      const offset = priceToOffset(clamped);
      translateX.setValue(offset);
      currentOffset.current = offset;
      baseOffset.current = offset;
    }
  };

  // ─── Ruler → text ──────────────────────────────────────────────────────

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          inputRef.current?.blur();
          baseOffset.current = currentOffset.current;
        },
        onPanResponderMove: (_, gesture) => {
          const newOffset = baseOffset.current + gesture.dx;
          const clamped = Math.max(
            priceToOffset(MAX_PRICE),
            Math.min(priceToOffset(MIN_PRICE), newOffset),
          );
          translateX.setValue(clamped);
          currentOffset.current = clamped;
          setRawText(String(Math.round(offsetToPrice(clamped))));
        },
        onPanResponderRelease: () => {
          const snapped =
            Math.round(offsetToPrice(currentOffset.current) / SNAP_TO) *
            SNAP_TO;
          const snappedOffset = priceToOffset(snapped);
          Animated.spring(translateX, {
            toValue: snappedOffset,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
          currentOffset.current = snappedOffset;
          baseOffset.current = snappedOffset;
          setRawText(String(snapped));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleConfirm = () => {
    const parsed = parseFloat(rawText);
    const final = isNaN(parsed)
      ? 0
      : Math.max(MIN_PRICE, Math.min(MAX_PRICE, Math.round(parsed)));
    onConfirm(final);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/*
       * Backdrop and sheet are SIBLINGS (not nested) so the sheet's
       * TextInput receives touches without a parent Pressable intercepting them.
       */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop — closes on tap */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        {/* Sheet — floats above backdrop */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            {/* Header */}
            <Box style={styles.header}>
              <Text variant="bodyMedium" color="gray950">
                Price
              </Text>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={12}
              >
                <X size={20} color={ColorPalette.gray900} />
              </Pressable>
            </Box>

            {/* Editable price — keyboard opens automatically via onShow */}
            <View style={styles.priceRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                ref={inputRef}
                value={rawText}
                onChangeText={handleTextChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={ColorPalette.gray300}
                style={styles.priceInput}
                maxLength={7}
                selectTextOnFocus
                autoFocus
              />
            </View>

            {/* Draggable ruler */}
            <View style={styles.rulerContainer} {...panResponder.panHandlers}>
              <Ruler translateX={translateX} />
              <View style={styles.cursor} pointerEvents="none" />
            </View>

            {/* Confirm */}
            <Box style={styles.buttonContainer}>
              <Button
                layout="textOnly"
                label="Set price"
                variant="Primary"
                onPress={handleConfirm}
              />
            </Box>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RULER_VISIBLE_HEIGHT = TICK_HEIGHT_MAJOR + 8;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dollarSign: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xxl,
    lineHeight: 38,
    color: ColorPalette.gray950,
  },
  priceInput: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xxl,
    lineHeight: 38,
    color: ColorPalette.gray950,
    minWidth: 60,
    padding: 0,
    textAlign: "left",
  },
  rulerContainer: {
    height: RULER_VISIBLE_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ruler: {
    flexDirection: "row",
    alignItems: "center",
    gap: TICK_GAP,
    position: "absolute",
    left: 0,
  },
  tick: {
    width: TICK_WIDTH,
    backgroundColor: ColorPalette.gray100,
    borderRadius: 1,
  },
  cursor: {
    position: "absolute",
    width: 2,
    height: RULER_VISIBLE_HEIGHT,
    backgroundColor: ColorPalette.gray950,
    borderRadius: 1,
    left: "50%",
    marginLeft: -1,
  },
  buttonContainer: {
    width: "100%",
  },
});
