import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import React from "react";
import { PollType } from "./step-poll-type";

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_TYPE_LABELS: Record<PollType, string> = {
  single: "Single Choice",
  multi: "Multiple Choice",
  rank: "Ranked Choice",
  yesno: "Yes / No",
};

// ─── Component ───────────────────────────────────────────────────────────────

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
  return (
    <Box gap="md">
      <Text variant="smLabel" color="textQuaternary">
        Review
      </Text>

      <Box backgroundColor="surfaceCard" borderRadius="md" padding="md" gap="md">
        {/* Type + category tags row */}
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Box flexDirection="row" flexWrap="wrap" gap="xs" flex={1}>
            {categories.length > 0
              ? categories.map((cat) => (
                  <Box
                    key={cat}
                    paddingHorizontal="xs"
                    paddingVertical="xxs"
                    borderRadius="xs"
                    backgroundColor="secondaryBackground"
                  >
                    <Text variant="xsLabel" color="textSecondary">
                      {cat}
                    </Text>
                  </Box>
                ))
              : null}
          </Box>
          <Text variant="xsLabel" color="textQuaternary">
            {POLL_TYPE_LABELS[pollType]}
          </Text>
        </Box>

        {/* Question */}
        <Text variant="mdLabel" color="textSecondary">
          {question}
        </Text>

        {/* Options */}
        <Box gap="xs">
          {options.map((opt, i) => (
            <Box key={i} flexDirection="row" alignItems="center" gap="sm">
              <Box
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: ColorPalette.borderPrimary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="xsLabel" color="textSecondary">
                  {i + 1}
                </Text>
              </Box>
              <Text variant="smParagraph" color="textSecondary">
                {opt}
              </Text>
            </Box>
          ))}
        </Box>

        {/* Meta info */}
        {(deadline || isAnonymous) && (
          <Box gap="xxs">
            {deadline && (
              <Text variant="xsParagraph" color="textQuaternary">
                Deadline:{" "}
                {deadline.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
            {isAnonymous && (
              <Text variant="xsParagraph" color="textQuaternary">
                Anonymous voting
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
