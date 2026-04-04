import { useCreateActivity } from "@/api/activities";
import { useUploadImage } from "@/api/files/custom";
import {
  Box,
  Button,
  DateRangePicker,
  Dialog,
  ImagePicker,
  Text,
  useToast,
} from "@/design-system";
import BottomSheet from "@/design-system/components/bottom-sheet/bottom-sheet";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { getImageURL } from "@/services/imageService";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { router } from "expo-router";
import {
  Calendar,
  DollarSign,
  Link,
  MapPin,
  Plus,
} from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";
import { CategoriesSheet } from "./categories-sheet";
import { FormRow } from "./form-row";

// ─── Types ───────────────────────────────────────────────────────────────────

type PendingLocation = { name: string; lat: number; lng: number };

export type AddActivityManualSheetHandle = {
  open: (prefill?: Partial<ModelsParsedActivityData>) => void;
  close: () => void;
  setLocation: (loc: PendingLocation) => void;
};

type AddActivityManualSheetProps = {
  tripID: string;
  onSaved: (activity: ModelsActivityAPIResponse) => void;
  onClose: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(range: DateRange): string | null {
  if (!range.start) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!range.end || range.start.getTime() === range.end.getTime())
    return fmt(range.start);
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AddActivityManualSheet = forwardRef<
  AddActivityManualSheetHandle,
  AddActivityManualSheetProps
>(({ tripID, onSaved, onClose }, ref) => {
  const toast = useToast();
  const createActivity = useCreateActivity();
  const uploadImage = useUploadImage();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const categoriesSheetRef = useRef<BottomSheetMethods>(null);
  const savedRef = useRef(false);

  // ─── Form state ──────────────────────────────────────────────────────────
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [link, setLink] = useState("");
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ─── Imperative handle ───────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    open: (prefill) => {
      if (prefill) {
        if (prefill.name) setName(prefill.name);
        if (prefill.description) setDescription(prefill.description);
        if (prefill.thumbnail_url) setThumbnailUri(prefill.thumbnail_url);
        if (prefill.media_url) setLink(prefill.media_url);
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    close: () => bottomSheetRef.current?.close(),
    setLocation: (loc) => {
      setLocationName(loc.name);
      setLocationLat(loc.lat);
      setLocationLng(loc.lng);
    },
  }));

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLocationPress = useCallback(() => {
    router.push(
      `/trips/${tripID}/search-location?tripID=${tripID}&returnTo=/trips/${tripID}/activities`,
    );
  }, [tripID]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setThumbnailUri(null);
    setCategories([]);
    setLocationName(null);
    setLocationLat(null);
    setLocationLng(null);
    setPrice("");
    setDateRange({ start: null, end: null });
    setLink("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let thumbnailURL: string | undefined;

      if (thumbnailUri?.startsWith("http")) {
        // Remote URL from autofill — use directly
        thumbnailURL = thumbnailUri;
      } else if (thumbnailUri) {
        // Local file — upload and get presigned URL
        try {
          const res = await uploadImage.mutateAsync({
            uri: thumbnailUri,
            sizes: ["medium"],
          });
          const urlRes = await getImageURL(res.imageId, "medium");
          thumbnailURL = urlRes.url;
        } catch (uploadErr) {
          console.warn("Image upload failed, skipping thumbnail:", uploadErr);
        }
      }

      const dates =
        dateRange.start && dateRange.end
          ? [
              {
                start: dateRange.start.toISOString().split("T")[0]!,
                end: dateRange.end.toISOString().split("T")[0]!,
              },
            ]
          : undefined;

      const estimatedPrice = parseFloat(price);
      const result = await createActivity.mutateAsync({
        tripID,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          category_names: categories,
          location_name: locationName ?? undefined,
          location_lat: locationLat ?? undefined,
          location_lng: locationLng ?? undefined,
          estimated_price: isNaN(estimatedPrice) ? undefined : estimatedPrice,
          dates,
          thumbnail_url: thumbnailURL,
          media_url: link.trim() || undefined,
        },
      });

      toast.show({
        message: "Activity added",
        action: { label: "View", onPress: () => {} },
      });
      savedRef.current = true;
      resetForm();
      onSaved(result);
    } catch (e) {
      toast.show({ message: "Couldn't save activity. Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (savedRef.current) {
      savedRef.current = false;
      return;
    }
    const hasData = name.trim() || description.trim() || thumbnailUri;
    if (hasData) {
      setShowCancelConfirm(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const isValid = name.trim().length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["90%"]}
        initialIndex={-1}
        onClose={handleCancel}
        footer={
          <Box style={styles.footer}>
            <Button
              layout="textOnly"
              label="Save activity"
              variant="Primary"
              disabled={!isValid || isSaving}
              loading={isSaving}
              onPress={handleSave}
            />
            <Button
              layout="textOnly"
              label="Cancel"
              variant="Tertiary"
              onPress={handleCancel}
            />
          </Box>
        }
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Box paddingHorizontal="sm" paddingTop="sm" alignItems="center">
            <Text variant="bodySmMedium" color="gray500">
              Add an activity
            </Text>
          </Box>

          <Box paddingHorizontal="sm">
            <ImagePicker
              variant="rectangular"
              width="100%"
              height={180}
              value={thumbnailUri ?? undefined}
              onChange={(uri) => setThumbnailUri(uri)}
              placeholder="Add cover image"
            />
          </Box>

          <Box paddingHorizontal="sm" gap="xxs">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New Activity"
              placeholderTextColor={ColorPalette.gray400}
              style={styles.nameInput}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description"
              placeholderTextColor={ColorPalette.gray400}
              multiline
              style={styles.descriptionInput}
            />
          </Box>

          <Box paddingHorizontal="sm">
            <Box flexDirection="row" flexWrap="wrap" gap="xs" alignItems="center">
              {categories.map((cat) => (
                <Box key={cat} paddingHorizontal="sm" paddingVertical="xxs" style={styles.categoryChip}>
                  <Text variant="bodyXsMedium" color="gray700">{cat}</Text>
                </Box>
              ))}
              <Pressable onPress={() => categoriesSheetRef.current?.snapToIndex(0)}>
                <Box flexDirection="row" alignItems="center" gap="xxs" paddingHorizontal="sm" paddingVertical="xxs" style={styles.addCategoryChip}>
                  <Plus size={12} color={ColorPalette.gray500} />
                  <Text variant="bodyXsMedium" color="gray500">Add category</Text>
                </Box>
              </Pressable>
            </Box>
          </Box>

          <Box paddingHorizontal="sm" gap="xxs" borderTopWidth={1} borderTopColor="gray100" paddingTop="sm">
            <FormRow
              icon={MapPin}
              value={locationName ?? undefined}
              placeholder="Location"
              onPress={handleLocationPress}
            />
            <Box flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs">
              <DollarSign size={16} color={price ? ColorPalette.gray700 : ColorPalette.gray400} />
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Price"
                placeholderTextColor={ColorPalette.gray400}
                keyboardType="decimal-pad"
                style={styles.inlineInput}
              />
            </Box>
            <FormRow
              icon={Calendar}
              value={formatDateRange(dateRange) ?? undefined}
              placeholder="Dates"
              onPress={() => setIsDatePickerVisible(true)}
            />
            <Box flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs">
              <Link size={16} color={link ? ColorPalette.gray700 : ColorPalette.gray400} />
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="Link"
                placeholderTextColor={ColorPalette.gray400}
                autoCapitalize="none"
                keyboardType="url"
                style={styles.inlineInput}
              />
            </Box>
          </Box>
        </BottomSheetScrollView>
      </BottomSheet>

      <CategoriesSheet
        ref={categoriesSheetRef}
        tripID={tripID}
        selected={categories}
        onChange={setCategories}
        onDone={() => categoriesSheetRef.current?.close()}
      />

      <DateRangePicker
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSave={(range) => {
          setDateRange(range);
          setIsDatePickerVisible(false);
        }}
        initialRange={dateRange}
      />

      <Dialog
        visible={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title={`Cancel adding "${name || "New Activity"}"?`}
        message="You'll lose any additions you made"
        actions={[
          {
            label: `Delete "${name || "New Activity"}"`,
            style: "destructive",
            onPress: () => {
              setShowCancelConfirm(false);
              resetForm();
              onClose();
            },
          },
          {
            label: `Keep "${name || "New Activity"}"`,
            style: "default",
            onPress: () => setShowCancelConfirm(false),
          },
        ]}
      />
    </>
  );
});

AddActivityManualSheet.displayName = "AddActivityManualSheet";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    gap: Layout.spacing.sm,
    paddingBottom: 120,
  },
  nameInput: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 20,
    color: ColorPalette.gray900,
    paddingVertical: 4,
  },
  descriptionInput: {
    fontFamily: "Figtree-Regular",
    fontSize: 14,
    color: ColorPalette.gray500,
    paddingVertical: 4,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.full,
  },
  addCategoryChip: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ColorPalette.gray300,
    borderRadius: CornerRadius.full,
  },
  inlineInput: {
    flex: 1,
    fontFamily: "Figtree-Regular",
    fontSize: 14,
    color: ColorPalette.gray900,
    paddingVertical: 0,
  },
  footer: {
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.md,
    paddingTop: Layout.spacing.xs,
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.gray100,
  },
});