import { useCreatePoll } from "@/api/polls/useCreatePoll";
import { useCreateRankPoll } from "@/api/polls/useCreateRankPoll";
import { BottomSheet, Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Pressable } from "react-native";
import StepPollType, { PollType } from "./step-poll-type";
import StepQuestion from "./step-question";
import StepReview from "./step-review";
import StepSettings from "./step-settings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PollFormData {
  pollType: PollType;
  question: string;
  options: string[];
  categories: string[];
  deadline: Date | null;
  isAnonymous: boolean;
  shouldNotify: boolean;
}

const defaultForm = (): PollFormData => ({
  pollType: "single",
  question: "",
  options: ["", ""],
  categories: [],
  deadline: null,
  isAnonymous: false,
  shouldNotify: true,
});

export type CreatePollSheetMethods = {
  open: () => void;
};

interface CreatePollSheetProps {
  tripID: string;
  onCreated?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const CreatePollSheet = forwardRef<CreatePollSheetMethods, CreatePollSheetProps>(
  ({ tripID, onCreated }, ref) => {
    const sheetRef = useRef<any>(null);
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<PollFormData>(defaultForm());

    const createPollMutation = useCreatePoll();
    const createRankPollMutation = useCreateRankPoll();

    useImperativeHandle(ref, () => ({
      open: () => {
        setStep(0);
        setForm(defaultForm());
        sheetRef.current?.snapToIndex(0);
      },
    }));

    const close = () => sheetRef.current?.close();

    const handleClose = () => {
      setStep(0);
      setForm(defaultForm());
    };

    const handleTypeChange = (type: PollType) => {
      setForm((prev) => ({
        ...prev,
        pollType: type,
        // reset options when switching to/from yesno
        options:
          type === "yesno"
            ? ["Yes", "No"]
            : prev.pollType === "yesno"
              ? ["", ""]
              : prev.options,
      }));
    };

    const canProceed = () => {
      if (step === 0) return true;
      if (step === 1) {
        const filled = form.options.filter((o) => o.trim().length > 0);
        return form.question.trim().length > 0 && filled.length >= 2;
      }
      return true;
    };

    const handleNext = async () => {
      if (step < 3) {
        setStep((s) => s + 1);
        return;
      }
      await handleSubmit();
    };

    const handleSubmit = async () => {
      const filledOptions = form.options.filter((o) => o.trim().length > 0);
      const deadlineISO = form.deadline ? form.deadline.toISOString() : undefined;
      const apiCategories = form.categories.length > 0 ? form.categories : undefined;

      const payload = {
        question: form.question,
        options: filledOptions.map((name) => ({ option_type: "custom" as const, name })),
        categories: apiCategories,
        deadline: deadlineISO,
        is_anonymous: form.isAnonymous,
        should_notify_members: form.shouldNotify,
      };

      try {
        if (form.pollType === "rank") {
          await createRankPollMutation.mutateAsync({
            tripID,
            data: { ...payload, poll_type: "rank" },
          });
        } else {
          const pollType = form.pollType === "multi" ? "multi" : "single";
          await createPollMutation.mutateAsync({
            tripID,
            data: { ...payload, poll_type: pollType },
          });
        }
        close();
        onCreated?.();
      } catch (e) {
        console.error("Failed to create poll:", e);
      }
    };

    const isSubmitting = createPollMutation.isPending || createRankPollMutation.isPending;
    const isLastStep = step === 3;

    const renderStep = () => {
      switch (step) {
        case 0:
          return <StepPollType selected={form.pollType} onSelect={handleTypeChange} />;
        case 1:
          return (
            <StepQuestion
              pollType={form.pollType}
              question={form.question}
              onQuestionChange={(q) => setForm((f) => ({ ...f, question: q }))}
              options={form.options}
              onOptionsChange={(opts) => setForm((f) => ({ ...f, options: opts }))}
            />
          );
        case 2:
          return (
            <StepSettings
              tripID={tripID}
              categories={form.categories}
              onCategoriesChange={(cats) => setForm((f) => ({ ...f, categories: cats }))}
              deadline={form.deadline}
              onDeadlineChange={(d) => setForm((f) => ({ ...f, deadline: d }))}
              isAnonymous={form.isAnonymous}
              onAnonymousChange={(v) => setForm((f) => ({ ...f, isAnonymous: v }))}
              shouldNotify={form.shouldNotify}
              onShouldNotifyChange={(v) => setForm((f) => ({ ...f, shouldNotify: v }))}
            />
          );
        case 3:
          return (
            <StepReview
              pollType={form.pollType}
              question={form.question}
              options={form.options.filter((o) => o.trim().length > 0)}
              categories={form.categories}
              deadline={form.deadline}
              isAnonymous={form.isAnonymous}
            />
          );
      }
    };

    const navButtons = (
      <Box flexDirection="row" gap="xs" paddingHorizontal="lg" paddingVertical="sm" paddingBottom="xl">
        {step > 0 && (
          <Box flex={1}>
            <Button
              layout="textOnly"
              label="Back"
              variant="Outline"
              disabled={isSubmitting}
              onPress={() => setStep((s) => s - 1)}
            />
          </Box>
        )}
        <Box flex={1}>
          <Button
            layout="textOnly"
            label={isSubmitting ? "Launching..." : isLastStep ? "Launch Poll" : "Next"}
            variant="Primary"
            disabled={!canProceed() || isSubmitting}
            loading={isSubmitting}
            onPress={handleNext}
          />
        </Box>
      </Box>
    );

    return (
      <BottomSheet ref={sheetRef} snapPoints={["95%"]} onClose={handleClose} footer={navButtons}>
        <Box padding="lg" gap="lg">
          <Box flexDirection="row" alignItems="center" justifyContent="space-between">
            <Pressable onPress={close} style={{ padding: 4 }}>
              <X size={20} color={ColorPalette.textSecondary} />
            </Pressable>
            <Text variant="mdLabel" color="textSecondary">
              Create a poll
            </Text>
            <Box style={{ width: 28 }} />
          </Box>

          {renderStep()}
        </Box>
      </BottomSheet>
    );
  },
);

CreatePollSheet.displayName = "CreatePollSheet";
export default CreatePollSheet;
