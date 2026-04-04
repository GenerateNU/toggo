import { parseActivityLink } from "@/api/activities";
import { Box, Button, Text, TextField, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsParsedActivityData } from "@/types/types.gen";
import { Link } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type AddActivityEntrySheetProps = {
  tripID: string;
  onManual: () => void;
  onAutofilled: (data: ModelsParsedActivityData) => void;
  onClose: () => void;
};

export type AddActivityEntrySheetHandle = {
  open: () => void;
  close: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AddActivityEntrySheet = forwardRef<
  AddActivityEntrySheetHandle,
  AddActivityEntrySheetProps
>(({ tripID, onManual, onAutofilled, onClose }, ref) => {
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
      const data = await parseActivityLink(tripID, { url: url.trim() });
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
          {/* Prevent backdrop tap from closing when tapping sheet */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Handle */}
            <Box alignItems="center" paddingTop="sm" paddingBottom="xs">
              <Box style={styles.handle} />
            </Box>

            <Box padding="sm" gap="md" alignItems="center">
              {/* Illustration */}
              <Image
                source={require("@/assets/images/binoculars.png")}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />

              {/* Header — changes during autofill */}
              <Box gap="xxs" alignItems="center">
                <Text variant="headingSm" color="gray900">
                  {isAutofilling
                    ? "Fetching listing details..."
                    : "Add an activity"}
                </Text>
                <Text
                  variant="bodySmDefault"
                  color="gray500"
                  textAlign="center"
                >
                  {isAutofilling
                    ? "Hang tight while we pull the details from your link. This only takes a second or two."
                    : "Easily import from yelp, instagram, tiktok, etc."}
                </Text>
              </Box>

              {/* URL input */}
              <Box style={{ width: "100%" }}>
                <TextField
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://..."
                  leftIcon={<Link size={16} color={ColorPalette.gray400} />}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </Box>

              {/* Autofill button */}
              <Box style={{ width: "100%" }}>
                <Button
                  layout="textOnly"
                  label={isAutofilling ? "Autofilling..." : "Autofill from link"}
                  variant="Primary"
                  loading={isAutofilling}
                  disabled={!url.trim() || isAutofilling}
                  onPress={handleAutofill}
                />
              </Box>

              {/* Manual fallback */}
              <Box style={{ width: "100%" }}>
              <Button
                layout="textOnly"
                label="Add manually"
                variant="Secondary"
                disabled={isAutofilling}
                onPress={handleManual}
              />
              </Box>
            </Box>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
});

AddActivityEntrySheet.displayName = "AddActivityEntrySheet";

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
    borderTopLeftRadius: CornerRadius.lg,
    borderTopRightRadius: CornerRadius.lg,
    paddingBottom: Layout.spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.gray300,
  },
});