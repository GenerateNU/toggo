import { Box, Divider, Text, TextField, useToast } from "@/design-system";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily } from "@/design-system/tokens/typography";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "lucide-react-native";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text as RNText,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AddItemEntrySheetHandle = {
  open: () => void;
  close: () => void;
};

type AddItemEntrySheetProps<T = unknown> = {
  /** Image shown above the title (e.g. binoculars, house) */
  illustration: ImageSourcePropType;
  /** Normal title, e.g. "Add an activity" */
  title: string;
  /** Title shown while autofilling, e.g. "Add activity details" */
  loadingTitle: string;
  /** Normal subtitle */
  subtitle: string;
  /** Subtitle shown while autofilling */
  loadingSubtitle: string;
  /** Placeholder for the URL input */
  urlPlaceholder: string;
  /** Called with the URL — should resolve with parsed data or throw */
  onParseLink: (url: string) => Promise<T>;
  /** Called after successful autofill with the parsed data */
  onAutofilled: (data: T) => void;
  onManual: () => void;
  onClose: () => void;
};

// ─── Autofill Button with shimmer ────────────────────────────────────────────

function AutofillButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const shimmerX = useMemo(() => new Animated.Value(-300), []);

  useEffect(() => {
    if (loading) {
      const anim = Animated.loop(
        Animated.timing(shimmerX, {
          toValue: 300,
          duration: 1000,
          useNativeDriver: true,
        }),
      );
      anim.start();
      return () => anim.stop();
    } else {
      shimmerX.setValue(-300);
    }
  }, [loading, shimmerX]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.autofillButton, disabled && styles.autofillButtonDisabled]}
    >
      {loading && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateX: shimmerX }] },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.35)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmer}
          />
        </Animated.View>
      )}
      <RNText
        style={[
          styles.autofillButtonText,
          disabled && styles.autofillButtonTextDisabled,
        ]}
      >
        {label}
      </RNText>
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

function AddItemEntrySheetInner<T>(
  {
    illustration,
    title,
    loadingTitle,
    subtitle,
    loadingSubtitle,
    urlPlaceholder,
    onParseLink,
    onAutofilled,
    onManual,
    onClose,
  }: AddItemEntrySheetProps<T>,
  ref: React.ForwardedRef<AddItemEntrySheetHandle>,
) {
  const toast = useToast();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const [url, setUrl] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  // Tracks whether close was triggered programmatically (autofill / manual)
  // so we don't fire onClose() in those cases.
  const suppressCloseCallback = useRef(false);

  const reset = () => setUrl("");

  useImperativeHandle(ref, () => ({
    open: () => {
      reset();
      bottomSheetRef.current?.snapToIndex(0);
    },
    close: () => {
      suppressCloseCallback.current = true;
      bottomSheetRef.current?.close();
      reset();
    },
  }));

  const handleSheetClose = () => {
    if (!suppressCloseCallback.current) {
      onClose();
    }
    suppressCloseCallback.current = false;
    reset();
  };

  const handleManual = () => {
    suppressCloseCallback.current = true;
    bottomSheetRef.current?.close();
    reset();
    onManual();
  };

  const handleAutofill = async () => {
    if (!url.trim()) return;
    setIsAutofilling(true);
    try {
      const data = await onParseLink(url.trim());
      setIsAutofilling(false);
      suppressCloseCallback.current = true;
      bottomSheetRef.current?.close();
      reset();
      onAutofilled(data);
    } catch {
      setIsAutofilling(false);
      toast.show({ message: "Couldn't fetch that link. Try adding manually." });
    }
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      disableClose={isAutofilling}
      onClose={handleSheetClose}
    >
      <Box style={styles.content}>
        {/* Illustration */}
        <Box alignItems="center">
          <Image
            source={illustration}
            style={[
              styles.illustration,
              isAutofilling && styles.illustrationLoading,
            ]}
            resizeMode="contain"
          />
        </Box>

        {/* Title + subtitle */}
        <Box style={styles.headerGroup}>
          <Text variant="headingMd" color="gray900">
            {isAutofilling ? loadingTitle : title}
          </Text>
          <Text variant="bodyDefault" color="gray500">
            {isAutofilling ? loadingSubtitle : subtitle}
          </Text>
        </Box>

        {/* URL field */}
        <TextField
          value={url}
          onChangeText={setUrl}
          placeholder={urlPlaceholder}
          leftIcon={<Link size={16} color={ColorPalette.gray400} />}
          autoCapitalize="none"
          keyboardType="url"
          disabled={isAutofilling}
        />

        {/* Autofill button */}
        <AutofillButton
          label={isAutofilling ? "Autofilling..." : "Autofill from link"}
          disabled={!url.trim() || isAutofilling}
          loading={isAutofilling}
          onPress={handleAutofill}
        />

        <Divider style={styles.divider} />

        {/* Manual fallback */}
        <Pressable
          onPress={handleManual}
          disabled={isAutofilling}
          style={[
            styles.manualButton,
            isAutofilling && styles.manualButtonDisabled,
          ]}
        >
          <RNText style={styles.manualButtonText}>Add manually</RNText>
        </Pressable>
      </Box>
    </BottomSheetModal>
  );
}

export const AddItemEntrySheet = forwardRef(AddItemEntrySheetInner) as <T>(
  props: AddItemEntrySheetProps<T> & {
    ref?: React.ForwardedRef<AddItemEntrySheetHandle>;
  },
) => React.ReactElement;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    gap: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.xl,
  },
  illustration: {
    width: 94,
    height: 94,
  },
  illustrationLoading: {
    opacity: 0.5,
  },
  headerGroup: {
    gap: 6,
  },
  divider: {
    marginVertical: 0,
    backgroundColor: ColorPalette.gray10,
  },
  autofillButton: {
    height: 44,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.brand500,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  autofillButtonDisabled: {
    backgroundColor: ColorPalette.gray300,
  },
  autofillButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: ColorPalette.white,
  },
  autofillButtonTextDisabled: {
    color: ColorPalette.gray400,
  },
  shimmer: {
    width: 200,
    height: "100%",
  },
  manualButton: {
    height: 44,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  manualButtonDisabled: {
    opacity: 0.5,
  },
  manualButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: ColorPalette.gray900,
  },
});
