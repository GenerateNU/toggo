import { useGetCategoriesByTripID } from "@/api/categories/useGetCategoriesByTripID";
import { Box, Chip, DateRangePicker, Divider, Text, Toggle } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";

// ─── Component ───────────────────────────────────────────────────────────────

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
  const { data: categoryData } = useGetCategoriesByTripID(tripID);
  const availableCategories = categoryData?.categories ?? [];

  const toggleCategory = (name: string) => {
    if (categories.includes(name)) {
      onCategoriesChange(categories.filter((c) => c !== name));
    } else {
      onCategoriesChange([...categories, name]);
    }
  };

  const deadlineLabel = deadline
    ? deadline.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
    : "Set date";

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
          {availableCategories.map((cat) => {
            const name = cat.name ?? "";
            return (
              <Chip
                key={name}
                label={cat.icon ? `${cat.icon} ${name}` : name}
                selected={categories.includes(name)}
                onPress={() => toggleCategory(name)}
              />
            );
          })}
          {availableCategories.length === 0 && (
            <Text variant="xsParagraph" color="textQuaternary">
              No categories available
            </Text>
          )}
        </Box>
      </Box>

      <Box gap="xs">
        <Text variant="xsLabel" color="textQuaternary">
          Options
        </Text>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Box flexDirection="column" gap="xxs">
          <Text variant="xsLabel" color="textSecondary">
            Set a deadline
          </Text>
          <Text variant="xxsParagraph" color="textQuaternary">
            Auto close and notify when time is up
          </Text>
          </Box>
        <Pressable onPress={() => setDatePickerVisible(true)}>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="xs"
            backgroundColor="surfaceCard"
            borderRadius="sm"
            paddingHorizontal="sm"
            paddingVertical="sm"
            style={{ borderWidth: 1, borderColor: ColorPalette.borderPrimary }}
          >
            <Calendar size={16} color={ColorPalette.textQuaternary} />
            <Text
              variant="smParagraph"
              style={{ color: deadline ? ColorPalette.textSecondary : ColorPalette.textQuaternary }}
            >
              {deadlineLabel}
            </Text>
          </Box>
        </Pressable>
        </Box>
      </Box>

      <Divider width={1} />

      <Box flexDirection="row" alignItems="center" gap="sm">
        <Box flex={1} gap="xxs">
          <Text variant="smParagraph" color="textSecondary">
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
          <Text variant="smParagraph" color="textSecondary">
            Anonymous
          </Text>
          <Text variant="xxsParagraph" color="textQuaternary">
            Hide who voted for what
          </Text>
        </Box>
        <Toggle value={isAnonymous} onChange={onAnonymousChange} />
      </Box>

      <DateRangePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSave={(range) => {
          onDeadlineChange(range.start);
          setDatePickerVisible(false);
        }}
        initialRange={{ start: deadline, end: null }}
        minDate={new Date()}
      />
    </Box>
  );
}
