import { Avatar, Box, Text } from "@/design-system";
import { ModelsMembershipAPIResponse } from "@/types/types.gen";
import { Calendar, MapPin, Settings } from "lucide-react-native";
import { Pressable } from "react-native";

interface TripDetailHeaderProps {
  tripName: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  members?: ModelsMembershipAPIResponse[];
  onSettingsPress?: () => void;
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString("en-US", { month: "long" });
  const endMonth = end.toLocaleDateString("en-US", { month: "long" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
}

export default function TripDetailHeader({
  tripName,
  startDate,
  endDate,
  location,
  members = [],
  onSettingsPress,
}: TripDetailHeaderProps) {
  const visibleMembers = members.slice(0, 3);
  const remainingCount = members.length - 3;

  return (
    <Box paddingHorizontal="lg" paddingVertical="md" gap="sm">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="headingMd" color="textInverse">
          {tripName}
        </Text>
        <Box flexDirection="row" alignItems="center" gap="md">
          {members.length > 0 && (
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Box flexDirection="row" alignItems="center">
                {visibleMembers.map((member, index) => (
                  <Box
                    key={member.user_id}
                    style={index > 0 ? { marginLeft: -8 } : undefined}
                  >
                    <Avatar
                      seed={member.user_id}
                      profilePhoto={member.profile_picture_url}
                      variant="sm"
                    />
                  </Box>
                ))}
              </Box>
              {remainingCount > 0 && (
                <Text variant="bodySmDefault" color="textInverse">
                  +{remainingCount}
                </Text>
              )}
            </Box>
          )}
          {onSettingsPress && (
            <Pressable onPress={onSettingsPress}>
              <Settings size={24} color="#000000" />
            </Pressable>
          )}
        </Box>
      </Box>

      {(startDate || endDate) && (
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Calendar size={16} color="#6B7280" />
          <Text variant="bodySmDefault" color="textInverse">
            {formatDateRange(startDate, endDate)}
          </Text>
        </Box>
      )}

      {location && (
        <Box flexDirection="row" alignItems="center" gap="xs">
          <MapPin size={16} color="#6B7280" />
          <Text variant="bodySmDefault" color="textInverse">
            {location}
          </Text>
        </Box>
      )}
    </Box>
  );
}
