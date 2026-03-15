import { useGetCategoriesByTripID } from "@/api/categories/useGetCategoriesByTripID";
import type { TimeValue } from "@/design-system";
import {
  Box,
  Chip,
  DateRangePicker,
  Divider,
  Text,
  TimePicker,
  Toggle,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import {
  BedDouble,
  Bike,
  Car,
  Compass,
  Flame,
  Gem,
  Globe,
  Landmark,
  LucideIcon,
  MoreHorizontal,
  Mountain,
  Music,
  ShoppingBag,
  Star,
  Sun,
  Ticket,
  UtensilsCrossed,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  attraction: Landmark,
  entertainment: Ticket,
  food: UtensilsCrossed,
  lodging: BedDouble,
  transportation: Car,
};

const RANDOM_ICON_POOL: LucideIcon[] = [
  Compass,
  Mountain,
  Globe,
  Sun,
  Music,
  ShoppingBag,
  Gem,
  Star,
  Bike,
  Flame,
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getCategoryIcon(rawName: string): LucideIcon {
  return (
    CATEGORY_ICONS[rawName.toLowerCase()] ??
    RANDOM_ICON_POOL[hashStr(rawName) % RANDOM_ICON_POOL.length]!
  );
}

const toPascalCase = (str: string) =>
  str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

interface StepSettingsProps {
  tripID: string;
  categories: string[];
  onCategoriesChange: (cats: string[]) => void;
  deadline: Date | null;
  onDeadlineChange: (date: Date | null) => void;
  isAnonymous: boolean;
  onAnonymousChange: (val: boolean) => void;
  shouldNotify: boolean;
  onShouldNotifyChange: (val: boolean) => void;
}

const MAX_VISIBLE = 5;

export default function StepSettings({
  tripID,
  categories,
  onCategoriesChange,
  deadline,
  onDeadlineChange,
  isAnonymous,
  onAnonymousChange,
  shouldNotify,
  onShouldNotifyChange,
}: StepSettingsProps) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { data: categoryData } = useGetCategoriesByTripID(tripID);
  const availableCategories = categoryData?.categories ?? [];

  const toggleCategory = (name: string) => {
    if (categories.includes(name)) {
      onCategoriesChange(categories.filter((c) => c !== name));
    } else {
      onCategoriesChange([...categories, name]);
    }
  };

  const visibleCategories = showAllCategories
    ? availableCategories
    : availableCategories.slice(0, MAX_VISIBLE);

  const hasTime =
    deadline && (deadline.getHours() !== 0 || deadline.getMinutes() !== 0);
  const dateStr = deadline
    ? deadline.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "mm/dd/yyyy";
  const timeStr = hasTime
    ? deadline!.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "--:-- --";

  const initialTime: TimeValue =
    deadline && hasTime
      ? (() => {
          const h = deadline.getHours();
          return {
            hour: h % 12 === 0 ? 12 : h % 12,
            minute: deadline.getMinutes(),
            period: h < 12 ? "AM" : "PM",
          };
        })()
      : { hour: 12, minute: 0, period: "PM" };

  return (
    <Box gap="lg">
      <Text variant="xsLabel" color="textQuaternary">
        Settings
      </Text>

      <Box gap="sm">
        <Text variant="xsLabel" color="textQuaternary">
          Tag this poll
        </Text>
        <Box flexDirection="row" flexWrap="wrap" gap="xs">
          {visibleCategories.map((cat) => {
            const rawName = cat.name ?? "";
            const label = toPascalCase(rawName);
            const icon = getCategoryIcon(rawName);
            return (
              <Chip
                key={rawName}
                label={label}
                icon={icon}
                selected={categories.includes(rawName)}
                onPress={() => toggleCategory(rawName)}
              />
            );
          })}
          {availableCategories.length > MAX_VISIBLE && (
            <Chip
              label={
                showAllCategories
                  ? "Less"
                  : `+${availableCategories.length - MAX_VISIBLE} more`
              }
              icon={MoreHorizontal}
              onPress={() => setShowAllCategories((v) => !v)}
            />
          )}
          {availableCategories.length === 0 && (
            <Text variant="xsParagraph" color="textQuaternary">
              No categories available
            </Text>
          )}
        </Box>
      </Box>

      <Box gap="sm">
        <Text variant="xsLabel" color="textQuaternary">
          Options
        </Text>
        <Box gap="xxs">
          <Box flexDirection="row" alignItems="center" gap="sm">
            <Box flex={1} flexDirection="column" gap="xxs">
              <Text variant="xsHeading" color="textSecondary">
                Set a deadline
              </Text>
              <Text variant="xxsParagraph" color="textQuaternary">
                Auto-close and notify when time's up
              </Text>
            </Box>
            <Box
              flexDirection="row"
              alignItems="center"
              backgroundColor="surfaceCard"
              borderRadius="sm"
              style={{
                borderWidth: 1,
                borderColor: ColorPalette.borderPrimary,
                overflow: "hidden",
              }}
            >
              <Pressable onPress={() => setDatePickerVisible(true)}>
                <Box
                  style={{
                    paddingLeft: 8,
                    paddingRight: 6,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: deadline
                        ? ColorPalette.textSecondary
                        : ColorPalette.textQuaternary,
                    }}
                  >
                    {dateStr}
                  </Text>
                </Box>
              </Pressable>
              <Box
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  backgroundColor: ColorPalette.borderPrimary,
                }}
              />
              <Pressable
                onPress={() => setTimePickerVisible(true)}
                disabled={!deadline}
                style={{ opacity: deadline ? 1 : 0.35 }}
              >
                <Box
                  style={{
                    paddingLeft: 6,
                    paddingRight: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: hasTime
                        ? ColorPalette.textSecondary
                        : ColorPalette.textQuaternary,
                    }}
                  >
                    {timeStr}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </Box>

          <Divider width={1} />

          <Box flexDirection="row" alignItems="center" gap="sm">
            <Box flex={1} gap="xxs">
              <Text variant="xsHeading" color="textSecondary">
                Send reminders
              </Text>
              <Text variant="xxsParagraph" color="textQuaternary">
                Notify members to vote
              </Text>
            </Box>
            <Toggle value={shouldNotify} onChange={onShouldNotifyChange} />
          </Box>

          <Divider width={1} />

          <Box flexDirection="row" alignItems="center" gap="sm">
            <Box flex={1} gap="xxs">
              <Text variant="xsHeading" color="textSecondary">
                Anonymous
              </Text>
              <Text variant="xxsParagraph" color="textQuaternary">
                Hide who voted for what
              </Text>
            </Box>
            <Toggle value={isAnonymous} onChange={onAnonymousChange} />
          </Box>
        </Box>
      </Box>

      <DateRangePicker
        visible={datePickerVisible}
        variant="single"
        onClose={() => setDatePickerVisible(false)}
        onSave={(range) => {
          setDatePickerVisible(false);
          if (!range.start) {
            onDeadlineChange(null);
          } else {
            const combined = new Date(range.start);
            if (deadline && hasTime) {
              combined.setHours(
                deadline.getHours(),
                deadline.getMinutes(),
                0,
                0,
              );
            }
            onDeadlineChange(combined);
          }
        }}
        initialRange={{ start: deadline, end: null }}
        minDate={new Date()}
      />

      <TimePicker
        visible={timePickerVisible}
        initialTime={initialTime}
        onClose={() => setTimePickerVisible(false)}
        onSave={(time) => {
          if (!deadline) return;
          const combined = new Date(deadline);
          const h24 =
            time.period === "AM"
              ? time.hour === 12
                ? 0
                : time.hour
              : time.hour === 12
                ? 12
                : time.hour + 12;
          combined.setHours(h24, time.minute, 0, 0);
          onDeadlineChange(combined);
          setTimePickerVisible(false);
        }}
      />
    </Box>
  );
}
