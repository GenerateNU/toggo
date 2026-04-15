import { useCreateActivity } from "@/api/activities";
import { getPlaceDetailsCustom } from "@/api/places/custom";
import { Box, DateRangePicker, Text } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { PricePicker } from "@/design-system/primitives/price-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { FontFamily } from "@/design-system/tokens/typography";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { locationSelectStore } from "@/utilities/locationSelectStore";
import { router } from "expo-router";
import { Calendar, DollarSign, Link, MapPin } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  AddItemManualSheet,
  type AddItemManualSheetHandle,
  type ItemManualSheetBasePrefill,
} from "../../components/add-item-manual-sheet";

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
  const createActivity = useCreateActivity();
  const sheetRef = useRef<AddItemManualSheetHandle>(null);

  // Activity-specific form state
  const [price, setPrice] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [isPricePickerVisible, setIsPricePickerVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // ─── Ref API ───────────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    open: (prefill) => {
      setPrice(null);
      setDateRange({ start: null, end: null });
      setLocationName(null);
      setLocationLat(null);
      setLocationLng(null);
      setLink(prefill?.media_url ?? "");
      const basePrefill: ItemManualSheetBasePrefill = {
        name: prefill?.name,
        description: prefill?.description ?? "",
        thumbnailUri: prefill?.thumbnail_url ?? undefined,
      };
      sheetRef.current?.open(basePrefill);
    },
    close: () => sheetRef.current?.close(),
    setLocation: (loc) => {
      setLocationName(loc.name);
      setLocationLat(loc.lat);
      setLocationLng(loc.lng);
    },
  }));

  // ─── Location ──────────────────────────────────────────────────────────────

  const handleLocationPress = useCallback(() => {
    locationSelectStore.set(async (prediction) => {
      try {
        const res = await getPlaceDetailsCustom({
          place_id: prediction.place_id,
        });
        setLocationName(
          res.data.formatted_address || prediction.description || res.data.name,
        );
        setLocationLat(res.data.geometry.location.lat);
        setLocationLng(res.data.geometry.location.lng);
      } catch {
        setLocationName(prediction.description ?? null);
      }
    });
    router.push(`/trips/${tripID}/search-location?mode=select`);
  }, [tripID]);

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async ({
      name,
      description,
      thumbnailURL,
    }: {
      name: string;
      description: string;
      thumbnailURL?: string;
    }) => {
      const dates =
        dateRange.start && dateRange.end
          ? [
              {
                start: dateRange.start.toISOString().split("T")[0]!,
                end: dateRange.end.toISOString().split("T")[0]!,
              },
            ]
          : undefined;

      return createActivity.mutateAsync({
        tripID,
        data: {
          name,
          description: description || undefined,
          estimated_price: price ?? undefined,
          dates,
          location_name: locationName ?? undefined,
          location_lat: locationLat ?? undefined,
          location_lng: locationLng ?? undefined,
          thumbnail_url: thumbnailURL,
          media_url: link.trim() || undefined,
        },
      });
    },
    [
      createActivity,
      tripID,
      price,
      dateRange,
      locationName,
      locationLat,
      locationLng,
      link,
    ],
  );

  const formattedDate = formatDateRange(dateRange);
  const priceLabel =
    price != null ? `$${price.toLocaleString()} per person` : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <AddItemManualSheet
        ref={sheetRef}
        title="Add an activity"
        namePlaceholder="New Activity"
        saveLabel="Save activity"
        successMessage="Activity added"
        onSave={handleSave}
        onSaved={onSaved}
        onClose={onClose}
        formRows={
          <Box style={styles.formRows}>
            {/* Price */}
            <Pressable
              style={styles.formRow}
              onPress={() => setIsPricePickerVisible(true)}
            >
              <DollarSign
                size={16}
                color={priceLabel ? ColorPalette.gray700 : ColorPalette.blue500}
              />
              <Text
                variant="bodyStrong"
                style={
                  priceLabel ? styles.formRowValue : styles.formRowPlaceholder
                }
              >
                {priceLabel ?? "Add price"}
              </Text>
            </Pressable>

            {/* Date */}
            <Pressable
              style={styles.formRow}
              onPress={() => setIsDatePickerVisible(true)}
            >
              <Calendar
                size={16}
                color={
                  formattedDate ? ColorPalette.gray700 : ColorPalette.blue500
                }
              />
              <Text
                variant="bodyStrong"
                style={
                  formattedDate
                    ? styles.formRowValue
                    : styles.formRowPlaceholder
                }
              >
                {formattedDate ?? "Add date"}
              </Text>
            </Pressable>

            {/* Location */}
            <Pressable style={styles.formRow} onPress={handleLocationPress}>
              <MapPin
                size={16}
                color={
                  locationName ? ColorPalette.gray700 : ColorPalette.blue500
                }
              />
              <Text
                variant="bodyStrong"
                style={
                  locationName ? styles.formRowValue : styles.formRowPlaceholder
                }
                numberOfLines={1}
              >
                {locationName ?? "Add location"}
              </Text>
            </Pressable>

            {/* Link */}
            <View style={styles.formRow}>
              <Link
                size={16}
                color={link ? ColorPalette.gray700 : ColorPalette.blue500}
              />
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="Add link"
                placeholderTextColor={ColorPalette.blue500}
                autoCapitalize="none"
                keyboardType="url"
                style={[
                  styles.formRowInput,
                  link ? styles.formRowInputFilled : styles.formRowInputEmpty,
                ]}
              />
            </View>
          </Box>
        }
      />

      <PricePicker
        visible={isPricePickerVisible}
        value={price ?? undefined}
        onConfirm={(p) => setPrice(p)}
        onClose={() => setIsPricePickerVisible(false)}
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
    </>
  );
});

AddActivityManualSheet.displayName = "AddActivityManualSheet";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  formRows: {
    gap: 16,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formRowPlaceholder: {
    color: ColorPalette.blue500,
    flex: 1,
  },
  formRowValue: {
    color: ColorPalette.gray700,
    flex: 1,
  },
  formRowInput: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
  },
  formRowInputEmpty: {
    color: ColorPalette.blue500,
  },
  formRowInputFilled: {
    color: ColorPalette.gray700,
  },
});
