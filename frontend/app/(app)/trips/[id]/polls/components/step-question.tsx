import { Box, DashedBorderBox, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Minus, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";
import { OptionRow, OPTION_LEFT_OFFSET } from "./poll-option-row";
import { PollType } from "./step-poll-type";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDER_QUESTIONS_DEFAULT = [
  "Who should drive the rental car?",
  "Where should we eat dinner?",
  "What time should we meet?",
  "Which hotel should we book?",
  "What activity should we do first?",
];

const PLACEHOLDER_QUESTIONS_YESNO = [
  "Should we book the Airbnb?",
  "Are we doing the beach day?",
  "Should we rent a car?",
  "Are we eating out tonight?",
  "Should we extend the trip?",
];

const YES_NO_OPTIONS = ["Yes", "No"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepQuestionProps {
  pollType: PollType;
  question: string;
  onQuestionChange: (q: string) => void;
  options: string[];
  onOptionsChange: (opts: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepQuestion({
  pollType,
  question,
  onQuestionChange,
  options,
  onOptionsChange,
}: StepQuestionProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isYesNo = pollType === "yesno";
  const placeholders = isYesNo
    ? PLACEHOLDER_QUESTIONS_YESNO
    : PLACEHOLDER_QUESTIONS_DEFAULT;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholders.length);
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [placeholders]);

  const displayOptions = isYesNo ? YES_NO_OPTIONS : options;

  const addOption = () => {
    if (options.length < 15) onOptionsChange([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2)
      onOptionsChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  };

  return (
    <Box backgroundColor="gray25" paddingBottom="sm">
      <Box gap="md" paddingHorizontal="md" paddingVertical="sm">
        <TextField
          label="Poll Question"
          placeholder={placeholders[placeholderIndex % placeholders.length]}
          value={question}
          onChangeText={onQuestionChange}
          autoCapitalize="sentences"
        />

        {!isYesNo && (
          <Box gap="xs">
            <Text variant="bodyXsMedium" color="gray500">
              Options
            </Text>

            <Box gap="sm">
              {displayOptions.map((opt, i) => (
                <OptionRow
                  key={i}
                  index={i}
                  filled={opt.trim().length > 0}
                  right={
                    options.length > 2 ? (
                      <Pressable onPress={() => removeOption(i)} hitSlop={8}>
                        <Minus size={18} color={ColorPalette.gray500} />
                      </Pressable>
                    ) : undefined
                  }
                >
                  <TextField
                    value={opt}
                    onChangeText={(v) => updateOption(i, v)}
                    placeholder={`Option ${i + 1}`}
                  />
                </OptionRow>
              ))}

              {options.length < 15 && (
                <Box style={{ marginLeft: OPTION_LEFT_OFFSET }}>
                  <DashedBorderBox
                    dashLength={12}
                    dashGap={6}
                    borderRadius="md"
                  >
                    <Pressable onPress={addOption}>
                      <Box
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="center"
                        gap="xs"
                        style={{ height: 48 }}
                      >
                        <Plus size={14} color={ColorPalette.gray500} />
                        <Text
                          variant="bodySmDefault"
                          color="gray500"
                          numberOfLines={1}
                        >
                          Add option
                        </Text>
                      </Box>
                    </Pressable>
                  </DashedBorderBox>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
