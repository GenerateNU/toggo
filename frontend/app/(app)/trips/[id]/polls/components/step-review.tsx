import { Box, Text } from "@/design-system";
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
  Mountain,
  Music,
  ShoppingBag,
  Star,
  Sun,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import React from "react";
import { PollType } from "./step-poll-type";

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

function getCategoryIcon(name: string): LucideIcon {
  return (
    CATEGORY_ICONS[name.toLowerCase()] ??
    RANDOM_ICON_POOL[hashStr(name) % RANDOM_ICON_POOL.length]!
  );
}

function toPascalCase(str: string) {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const POLL_TYPE_LABELS: Record<PollType, string> = {
  single: "Single Choice",
  multi: "Multiple Choice",
  rank: "Ranked Choice",
  yesno: "Yes / No",
};

interface StepReviewProps {
  pollType: PollType;
  question: string;
  options: string[];
  categories: string[];
  deadline: Date | null;
  isAnonymous: boolean;
}

export default function StepReview({
  pollType,
  question,
  options,
  categories,
  deadline,
  isAnonymous,
}: StepReviewProps) {
  const firstCat = categories[0];
  const extraCount = categories.length - 1;

  return (
    <Box gap="md">
      <Text variant="bodyXsMedium" color="gray500">
        Review
      </Text>

      <Box
        borderRadius="md"
        padding="md"
        gap="md"
        style={{ borderWidth: 1, borderColor: ColorPalette.gray300 }}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box flexDirection="row" alignItems="center" gap="xs">
            {firstCat && (
              <Box
                flexDirection="row"
                alignItems="center"
                borderRadius="full"
                borderColor="gray300"
                style={{
                  borderWidth: 1,
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                {React.createElement(getCategoryIcon(firstCat), {
                  size: 13,
                  color: ColorPalette.gray900,
                })}
                <Text variant="bodyXsMedium" color="gray900">
                  {toPascalCase(firstCat)}
                </Text>
              </Box>
            )}
            {extraCount > 0 && (
              <Box
                borderRadius="full"
                borderColor="gray300"
                style={{
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text variant="bodyXsMedium" color="gray500">
                  +{extraCount}
                </Text>
              </Box>
            )}
          </Box>

          <Box
            borderRadius="full"
            borderColor="gray300"
            style={{
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text variant="bodyXsMedium" color="white">
              {POLL_TYPE_LABELS[pollType]}
            </Text>
          </Box>
        </Box>

        <Text variant="headingSm" color="white">
          {question}
        </Text>

        <Box gap="sm">
          {options.map((opt, i) => (
            <Box key={i} flexDirection="row" alignItems="center" gap="sm">
              <Box
                backgroundColor="gray200"
                borderRadius="lg"
                alignItems="center"
                justifyContent="center"
                style={{ width: 32, height: 32 }}
              >
                <Text variant="bodySmMedium" color="white">
                  {i + 1}
                </Text>
              </Box>
              <Text variant="bodySmDefault" color="white">
                {opt}
              </Text>
            </Box>
          ))}
        </Box>

        {(deadline || isAnonymous) && (
          <Box gap="xxs">
            {deadline && (
              <Text variant="bodyXsDefault" color="gray500">
                Deadline:{" "}
                {deadline.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {(deadline.getHours() !== 0 || deadline.getMinutes() !== 0) &&
                  ` at ${deadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`}
              </Text>
            )}
            {isAnonymous && (
              <Text variant="bodyXsDefault" color="gray500">
                Anonymous voting
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
