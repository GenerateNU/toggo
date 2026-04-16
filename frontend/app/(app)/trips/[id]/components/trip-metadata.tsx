import { Avatar, AvatarStack, Box, Text } from "@/design-system";
import type { AvatarStackMember } from "@/design-system/components/avatars/avatar-stack";
import { CoreSize } from "@/design-system/tokens/core-size";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Calendar, MapPin, Plus, Settings } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const SKELETON_WIDTH = 160;
const SKELETON_HEIGHT = 28;
const TITLE_MAX_WIDTH = "65%";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripMetadataProps = {
  tripName?: string;
  tripDate: string | null;
  tripLocation?: string;
  members: AvatarStackMember[];
  isLoading: boolean;
  isCollapsed: boolean;
  onInviteFriends: () => void;
  onSettingsPress: () => void;
  onDatePress: () => void;
  onLocationPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripMetadata({
  tripName,
  tripDate,
  tripLocation,
  members,
  isLoading,
  isCollapsed,
  onInviteFriends,
  onSettingsPress,
  onDatePress,
  onLocationPress,
}: TripMetadataProps) {
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const title = tripName?.trim() || "Trip";
  const isSoloTrip = members.length <= 1;
  const primaryMember = members[0];

  return (
    <Box
      gap={isCollapsed ? "xs" : "xxs"}
      paddingHorizontal="sm"
      paddingTop="sm"
      paddingBottom="xs"
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent={isCollapsed ? "center" : "space-between"}
        gap="xxs"
      >
        {isLoading ? (
          <Box
            width={SKELETON_WIDTH}
            height={SKELETON_HEIGHT}
            backgroundColor="gray100"
            borderRadius="xs"
          />
        ) : (
          <Pressable
            onPress={() => setIsTitleExpanded((previous) => !previous)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              flex: isCollapsed ? 0 : 1,
              maxWidth: isCollapsed ? "100%" : TITLE_MAX_WIDTH,
            })}
            accessibilityRole="button"
            accessibilityLabel="Toggle full trip name"
          >
            <Text
              variant={isCollapsed ? "bodySmMedium" : "headingXl"}
              color="gray950"
              numberOfLines={isCollapsed ? 1 : isTitleExpanded ? 0 : 1}
              ellipsizeMode="tail"
              style={isCollapsed ? styles.collapsedTitle : undefined}
            >
              {title}
            </Text>
          </Pressable>
        )}

        {!isCollapsed && (
          <Box flexDirection="row" alignItems="center" gap="xs" flexShrink={0}>
            {isSoloTrip ? (
              <Box flexDirection="row" alignItems="center">
                {primaryMember ? (
                  <Avatar
                    variant="sm"
                    seed={primaryMember.userId}
                    profilePhoto={primaryMember.profilePhotoUrl ?? undefined}
                  />
                ) : null}
                <Pressable
                  onPress={onInviteFriends}
                  style={({ pressed }) => [
                    styles.invitePlusButton,
                    pressed ? styles.pressedInvitePlusButton : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Invite friends"
                >
                  <Plus size={14} color={ColorPalette.blue500} />
                </Pressable>
              </Box>
            ) : (
              <AvatarStack members={members} showName={false} />
            )}
            <Pressable
              onPress={onSettingsPress}
              hitSlop={styles.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Trip settings"
            >
              <Settings size={CoreSize.iconSm} color={ColorPalette.gray950} />
            </Pressable>
          </Box>
        )}
      </Box>

      {!isCollapsed && (
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Pressable
            onPress={onDatePress}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Set trip dates"
          >
            <Box flexDirection="row" alignItems="center" gap="xxs">
              <Calendar
                size={CoreSize.xs}
                color={tripDate ? ColorPalette.gray500 : ColorPalette.blue500}
              />
              <Text
                variant="bodySmDefault"
                style={{
                  color: tripDate ? ColorPalette.gray500 : ColorPalette.blue500,
                }}
              >
                {tripDate ?? "Add dates"}
              </Text>
            </Box>
          </Pressable>
          <Text variant="bodySmDefault" color="gray500">
            •
          </Text>
          <Pressable
            onPress={onLocationPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Set trip location"
          >
            <Box flexDirection="row" alignItems="center" gap="xxs">
              <MapPin
                size={CoreSize.xs}
                color={
                  tripLocation ? ColorPalette.gray500 : ColorPalette.blue500
                }
              />
              <Text
                variant="bodySmDefault"
                style={{
                  color: tripLocation
                    ? ColorPalette.gray500
                    : ColorPalette.blue500,
                }}
              >
                {tripLocation ?? "Add location"}
              </Text>
            </Box>
          </Pressable>
        </Box>
      )}
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hitSlop: {
    top: Layout.spacing.xs,
    bottom: Layout.spacing.xs,
    left: Layout.spacing.xs,
    right: Layout.spacing.xs,
  },
  setLocationText: {
    color: ColorPalette.blue500,
  },
  collapsedTitle: {
    textAlign: "center",
  },
  invitePlusButton: {
    width: 24,
    height: 24,
    borderRadius: CornerRadius.full,
    backgroundColor: ColorPalette.blue25,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -Layout.spacing.xs,
    borderWidth: 1,
    borderColor: ColorPalette.white,
  },
  pressedInvitePlusButton: {
    opacity: 0.7,
  },
});

export default TripMetadata;
