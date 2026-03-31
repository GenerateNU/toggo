import { Box, DashedBorderBox, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Plus, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";
import { PollType } from "./step-poll-type";

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

interface StepQuestionProps {
  pollType: PollType;
  question: string;
  onQuestionChange: (q: string) => void;
  options: string[];
  onOptionsChange: (opts: string[]) => void;
}

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
    if (options.length < 15) {
      onOptionsChange([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      onOptionsChange(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  };

  return (
    <Box gap="md">
      <TextField
        label="Poll Question"
        placeholder={placeholders[placeholderIndex % placeholders.length]}
        value={question}
        onChangeText={onQuestionChange}
        autoCapitalize="sentences"
      />

      {!isYesNo && (
        <Box gap="xs">
          <Text variant="bodyXsMedium" color="textSubtle">
            Options
          </Text>

          <Box gap="sm">
            {displayOptions.map((opt, i) => (
              <Box key={i} flexDirection="row" alignItems="center" gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: ColorPalette.backgroundSubtle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="bodyXsMedium" color="textInverse">
                    {i + 1}
                  </Text>
                </Box>

                <Box flex={1}>
                  <TextField
                    value={opt}
                    onChangeText={(v) => updateOption(i, v)}
                    placeholder={`Option ${i + 1}`}
                  />
                </Box>

                {!isYesNo && options.length > 2 && (
                  <Pressable
                    onPress={() => removeOption(i)}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={ColorPalette.textInverse} />
                  </Pressable>
                )}
              </Box>
            ))}

            {options.length < 15 && (
              <DashedBorderBox dashLength={12} dashGap={6} borderRadius="md">
                <Pressable onPress={addOption}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    gap="xs"
                    style={{ height: 48 }}
                  >
                    <Plus size={14} color={ColorPalette.textSubtle} />
                    <Text
                      variant="bodySmDefault"
                      color="textSubtle"
                      numberOfLines={1}
                    >
                      Add option
                    </Text>
                  </Box>
                </Pressable>
              </DashedBorderBox>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
