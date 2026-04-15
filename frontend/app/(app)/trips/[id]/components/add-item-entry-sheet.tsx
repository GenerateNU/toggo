import { Box, Divider, Text, TextField, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { FontFamily } from "@/design-system/tokens/typography";
import { LinearGradient } from "expo-linear-gradient";
import { Link, X } from "lucide-react-native";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text as RNText,
  StyleSheet,
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
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => {
      setVisible(false);
      setUrl("");
    },
  }));

  const handleClose = () => {
    if (isAutofilling) return;
    setVisible(false);
    setUrl("");
    onClose();
  };

  const handleManual = () => {
    setVisible(false);
    setUrl("");
    onManual();
  };

  const handleAutofill = async () => {
    if (!url.trim()) return;
    setIsAutofilling(true);
    try {
      const data = await onParseLink(url.trim());
      setIsAutofilling(false);
      setVisible(false);
      setUrl("");
      onAutofilled(data);
    } catch {
      setIsAutofilling(false);
      toast.show({ message: "Couldn't fetch that link. Try adding manually." });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrapper}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* X button */}
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={12}
            >
              <X size={20} color={ColorPalette.gray900} />
            </Pressable>

            {/* Illustration */}
            <Box alignItems="center" style={styles.illustrationContainer}>
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
            <Box style={styles.fullWidth}>
              <TextField
                value={url}
                onChangeText={setUrl}
                placeholder={urlPlaceholder}
                leftIcon={<Link size={16} color={ColorPalette.gray400} />}
                autoCapitalize="none"
                keyboardType="url"
                disabled={isAutofilling}
              />
            </Box>

            {/* Autofill button with shimmer */}
            <Box style={styles.fullWidth}>
              <AutofillButton
                label={isAutofilling ? "Autofilling..." : "Autofill from link"}
                disabled={!url.trim() || isAutofilling}
                loading={isAutofilling}
                onPress={handleAutofill}
              />
            </Box>

            <Divider style={styles.divider} />

            {/* Manual fallback */}
            <Box style={styles.fullWidth}>
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
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export const AddItemEntrySheet = forwardRef(AddItemEntrySheetInner) as <T>(
  props: AddItemEntrySheetProps<T> & {
    ref?: React.ForwardedRef<AddItemEntrySheetHandle>;
  },
) => React.ReactElement;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
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
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  illustrationContainer: {
    width: "100%",
    marginTop: 8,
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
  fullWidth: {
    width: "100%",
  },
  divider: {
    width: "100%",
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
