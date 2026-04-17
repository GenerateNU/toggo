import { ConfirmSheet } from "@/app/(app)/components/confirm-sheet";
import {
  BottomSheet,
  Box,
  DateRangePicker,
  Text,
} from "@/design-system";
import { CommentData } from "@/design-system/components/comments/comment";
import CommentSection from "@/design-system/components/comments/comment-section";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { PricePicker } from "@/design-system/primitives/price-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { router } from "expo-router";
import {
  Calendar,
  DollarSign,
  MapPin,
  type LucideIcon,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "./detail-header";
import { HeroCarousel } from "./hero-carousel";
import { LinkPill } from "./link-pill";
import { Divider, SectionHeader } from "./section-header";

// ─── Types ───────────────────────────────────────────────────────────────────

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type EntityDetailMenuAction = {
  label: string;
  icon: LucideIcon;
  isDanger?: boolean;
  onPress: () => void;
};

export type EntityDetailScreenProps = {
  // Data
  name: string;
  description?: string;
  heroImages: string[];
  price: number | null;
  dateRange: DateRange;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  link: string;

  // Navigation
  tripID: string;
  entityID: string;
  allMediaPath: string;

  // Actions
  menuActions: EntityDetailMenuAction[];
  onBack: () => void;
  onSavePrice: (price: number) => Promise<void>;
  onSaveDateRange: (range: DateRange) => Promise<void>;
  onEditLocation: () => void;
  onSaveLink: (link: string) => Promise<void>;

  // Setters for local state (controlled from parent)
  onPriceChange: (price: number) => void;
  onDateRangeChange: (range: DateRange) => void;
  onLocationChange: (
    name: string | null,
    lat: number | null,
    lng: number | null,
  ) => void;
  onLinkChange: (link: string) => void;

  // Slots
  actionButton?: ReactNode;
  extraSection?: ReactNode;

  // Comments
  comments: any[];
  isLoadingComments: boolean;
  isLoadingMoreComments: boolean;
  onLoadMoreComments: () => void;
  onSubmitComment: (comment: CommentData) => Promise<void>;
  onReact: (commentId: string, emoji: string) => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserSeed?: string;
  openComments?: boolean;

  // Delete
  isDeleteVisible: boolean;
  isDeleting: boolean;
  deleteTitle: string;
  deleteSubtitle: string;
  deleteConfirmLabel: string;
  deleteCancelLabel: string;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EntityDetailScreen({
  name,
  description,
  heroImages,
  price,
  dateRange,
  locationName,
  locationLat,
  locationLng,
  link,
  tripID,
  entityID,
  allMediaPath,
  menuActions,
  onBack,
  onSavePrice,
  onSaveDateRange,
  onEditLocation,
  onSaveLink,
  onPriceChange,
  onDateRangeChange,
  onLocationChange: _onLocationChange,
  onLinkChange,
  actionButton,
  extraSection,
  comments,
  isLoadingComments,
  isLoadingMoreComments,
  onLoadMoreComments,
  onSubmitComment,
  onReact,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserSeed,
  openComments = false,
  isDeleteVisible,
  isDeleting,
  deleteTitle,
  deleteSubtitle,
  deleteConfirmLabel,
  deleteCancelLabel,
  onDeleteConfirm,
  onDeleteCancel,
}: EntityDetailScreenProps) {
  const [isPricePickerVisible, setIsPricePickerVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(openComments);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const linkEditSheetRef = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    if (isEditingLink) {
      linkEditSheetRef.current?.snapToIndex(0);
    } else {
      linkEditSheetRef.current?.close();
    }
  }, [isEditingLink]);

  const coordinate: [number, number] | null =
    locationLat != null && locationLng != null
      ? [locationLng, locationLat]
      : null;

  const formattedDate = formatDateRange(dateRange);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      edges={["bottom"]}
    >
      <DetailHeader title={name} onBack={onBack} menuActions={menuActions} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroCarousel
          images={heroImages}
          onViewAll={() =>
            router.push({
              pathname: allMediaPath as any,
              params: { tripID },
            })
          }
        />

        <Box style={styles.body}>
          {/* Title + action button slot */}
          <Box style={styles.titleGroup}>
            <Box style={styles.titleRow}>
              <Text style={styles.entityTitle} numberOfLines={2}>
                {name}
              </Text>
              {actionButton}
            </Box>

            {!!description && (
              <Text style={styles.description}>{description}</Text>
            )}

            {!!locationName && (
              <Box style={styles.locationChip}>
                <MapPin size={14} color={ColorPalette.gray950} />
                <Text variant="bodyDefault" color="gray950" numberOfLines={1}>
                  {locationName}
                </Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Price & Dates */}
          <Box style={styles.section}>
            <SectionHeader label="Price & Dates" />
            <Box style={styles.priceRow}>
              <DollarSign size={16} color={ColorPalette.gray950} />
              <Text style={styles.priceText}>
                {price != null ? `${price} USD` : "No price set"}
              </Text>
              <Pressable
                onPress={() => setIsPricePickerVisible(true)}
                hitSlop={8}
              >
                <Text style={styles.editButton}>Edit</Text>
              </Pressable>
            </Box>
            {formattedDate ? (
              <Box style={styles.priceRow}>
                <Calendar size={16} color={ColorPalette.gray950} />
                <Text style={styles.priceText}>{formattedDate}</Text>
                <Pressable
                  onPress={() => setIsDatePickerVisible(true)}
                  hitSlop={8}
                >
                  <Text style={styles.editButton}>Edit</Text>
                </Pressable>
              </Box>
            ) : (
              <Pressable
                style={styles.priceRow}
                onPress={() => setIsDatePickerVisible(true)}
              >
                <Calendar size={16} color={ColorPalette.blue500} />
                <Text style={styles.addText}>Add date</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          {/* Location */}
          <Box style={styles.section}>
            <SectionHeader label="Location" onEdit={onEditLocation} />
            {locationName && (
              <Box style={styles.locationRow}>
                <MapPin size={14} color={ColorPalette.gray950} />
                <Text variant="bodyMedium" color="gray950">
                  {locationName}
                </Text>
              </Box>
            )}
            {coordinate && (
              <Box style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  mapStyle={MAP_STYLE_URL}
                  logoEnabled={false}
                  attributionEnabled={false}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Camera centerCoordinate={coordinate} zoomLevel={11} />
                  <PointAnnotation id="entity-pin" coordinate={coordinate}>
                    <View style={styles.pin}>
                      <View style={styles.pinDot} />
                    </View>
                  </PointAnnotation>
                </MapView>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() =>
                    router.push({
                      pathname: "/map-view",
                      params: {
                        activities: encodeURIComponent(
                          JSON.stringify([
                            {
                              id: entityID,
                              name,
                              location_lat: locationLat,
                              location_lng: locationLng,
                              location_name: locationName,
                              description,
                            },
                          ]),
                        ),
                      },
                    })
                  }
                />
              </Box>
            )}
            {!locationName && (
              <Pressable onPress={onEditLocation}>
                <Text style={styles.addText}>Add location</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          {/* Link */}
          <Box style={styles.section}>
            <SectionHeader
              label="Link"
              onEdit={() => {
                setLinkDraft(link);
                setIsEditingLink(true);
              }}
            />
            {link ? (
              <LinkPill
                url={link}
                onEdit={() => {
                  setLinkDraft(link);
                  setIsEditingLink(true);
                }}
              />
            ) : (
              <Pressable
                onPress={() => {
                  setLinkDraft("");
                  setIsEditingLink(true);
                }}
              >
                <Text style={styles.addText}>Add link</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          {/* Extra section slot (e.g. MembersGoingSection for activities) */}
          {extraSection}

          <Box style={{ height: 90 }} />
        </Box>
      </ScrollView>

      {/* ─── Overlays ─────────────────────────────────────────────────── */}

      <PricePicker
        visible={isPricePickerVisible}
        value={price ?? undefined}
        onConfirm={async (p) => {
          onPriceChange(p);
          setIsPricePickerVisible(false);
          await onSavePrice(p);
        }}
        onClose={() => setIsPricePickerVisible(false)}
      />

      <DateRangePicker
        visible={isDatePickerVisible}
        initialRange={dateRange}
        onSave={async (range) => {
          onDateRangeChange(range);
          setIsDatePickerVisible(false);
          await onSaveDateRange(range);
        }}
        onClose={() => setIsDatePickerVisible(false)}
      />

      <ConfirmSheet
        visible={isDeleteVisible}
        title={deleteTitle}
        subtitle={deleteSubtitle}
        confirmLabel={deleteConfirmLabel}
        cancelLabel={deleteCancelLabel}
        isLoading={isDeleting}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />

      <BottomSheet
        ref={linkEditSheetRef}
        snapPoints={["35%"]}
        initialIndex={-1}
        onChange={(index) => {
          if (index < 0) setIsEditingLink(false);
        }}
      >
        <Box style={styles.linkEditSheet}>
          <Text style={styles.linkEditTitle}>Edit link</Text>
          <TextInput
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder="https://"
            placeholderTextColor={ColorPalette.gray300}
            style={styles.linkEditInput}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
          />
          <Pressable
            style={styles.linkEditSave}
            onPress={async () => {
              onLinkChange(linkDraft);
              setIsEditingLink(false);
              await onSaveLink(linkDraft);
            }}
          >
            <Text style={styles.linkEditSaveText}>Save</Text>
          </Pressable>
        </Box>
      </BottomSheet>

      {!isCommentsVisible && (
        <Pressable
          onPress={() => setIsCommentsVisible(true)}
          style={styles.commentsPeek}
        >
          <Box style={styles.commentsPeekHandle} />
          <Text variant="bodySmStrong" color="gray900">
            Comments
          </Text>
        </Pressable>
      )}

      <CommentSection
        visible={isCommentsVisible}
        onClose={() => setIsCommentsVisible(false)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={onLoadMoreComments}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        currentUserSeed={currentUserSeed}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(range: DateRange): string | null {
  if (!range.start) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!range.end || range.start.getTime() === range.end.getTime())
    return fmt(range.start);
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { backgroundColor: ColorPalette.white },
  body: {
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
    gap: Layout.spacing.sm,
    backgroundColor: ColorPalette.white,
  },
  titleGroup: { gap: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Layout.spacing.xxs,
  },
  entityTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: 24,
    color: ColorPalette.gray950,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: 20,
    color: ColorPalette.gray400,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ColorPalette.gray25,
    borderRadius: 8,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 16,
  },
  section: { gap: Layout.spacing.xs },
  editButton: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  addText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  priceText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapContainer: {
    borderRadius: CornerRadius.md,
    overflow: "hidden",
    height: 160,
  },
  map: { flex: 1 },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ColorPalette.brand500,
    borderWidth: 2,
    borderColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ColorPalette.white,
  },
  linkEditSheet: {
    padding: Layout.spacing.sm,
    paddingBottom: 32,
    gap: Layout.spacing.sm,
  },
  linkEditTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
    textAlign: "center",
  },
  linkEditInput: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  linkEditSave: {
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkEditSaveText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.white,
  },
  commentsPeek: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  commentsPeekHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.gray300,
    marginBottom: 10,
  },
});
