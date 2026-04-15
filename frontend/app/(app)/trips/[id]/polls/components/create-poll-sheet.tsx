import { useCreatePoll } from "@/api/polls/useCreatePoll";
import { useCreateRankPoll } from "@/api/polls/useCreateRankPoll";
import { BottomSheet, Box, Button, Text, useToast } from "@/design-system";
import { X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import StepPollType, { PollType } from "./step-poll-type";
import StepQuestion from "./step-question";
import StepSettings from "./step-settings";

interface PollFormData {
  pollType: PollType;
  question: string;
  options: string[];
  categories: string[];
  deadline: Date | null;
  isAnonymous: boolean;
}

const defaultForm = (): PollFormData => ({
  pollType: "single",
  question: "",
  options: ["", ""],
  categories: [],
  deadline: null,
  isAnonymous: true,
});

export type CreatePollSheetMethods = {
  open: () => void;
};

interface CreatePollSheetProps {
  tripID: string;
  onCreated?: () => void;
}

const CreatePollSheet = forwardRef<
  CreatePollSheetMethods,
  CreatePollSheetProps
>(({ tripID, onCreated }, ref) => {
  const sheetRef = useRef<any>(null);
  const [form, setForm] = useState<PollFormData>(defaultForm());

  const createPollMutation = useCreatePoll();
  const createRankPollMutation = useCreateRankPoll();
  const toast = useToast();

  useImperativeHandle(ref, () => ({
    open: () => {
      setForm(defaultForm());
      sheetRef.current?.snapToIndex(0);
    },
  }));

  const close = () => sheetRef.current?.close();

  const handleClose = () => {
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

  const deadlineHasTime = form.deadline
    ? form.deadline.getHours() !== 0 || form.deadline.getMinutes() !== 0
    : false;

  const canCreate = () => {
    const filled = form.options.filter((o) => o.trim().length > 0);
    const hasMinimumOptions = form.pollType === "yesno" || filled.length >= 2;
    const hasQuestion = form.question.trim().length > 0;
    const hasValidDeadline = !!form.deadline && deadlineHasTime;

    return hasQuestion && hasMinimumOptions && hasValidDeadline;
  };

  const toLocalISOWithOffset = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const oh = pad(Math.floor(Math.abs(offsetMin) / 60));
    const om = pad(Math.abs(offsetMin) % 60);
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `${sign}${oh}:${om}`
    );
  };

  const handleSubmit = async () => {
    const filledOptions = form.options.filter((o) => o.trim().length > 0);
    const deadlineISO = form.deadline
      ? toLocalISOWithOffset(form.deadline)
      : undefined;
    const apiCategories =
      form.categories.length > 0 ? form.categories : undefined;

    const payload = {
      question: form.question,
      options: filledOptions.map((name) => ({
        option_type: "custom" as const,
        name,
      })),
      categories: apiCategories,
      deadline: deadlineISO,
      is_anonymous: form.isAnonymous,
      should_notify_members: Boolean(form.deadline),
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
      toast.show({
        message: "Poll created!",
        subtitle: "Your trip will get a notification to vote.",
        action: { label: "Dismiss", onPress: () => {} },
      });
      onCreated?.();
    } catch (e) {
      console.error("Failed to create poll:", e);
      toast.show({ message: "Failed to create poll. Please try again." });
    }
  };

  const isSubmitting =
    createPollMutation.isPending || createRankPollMutation.isPending;
  const navButtons = (
    <Box
      paddingHorizontal="md"
      paddingVertical="sm"
      paddingBottom="xl"
      backgroundColor="white"
    >
      <Button
        layout="textOnly"
        label={isSubmitting ? "Creating..." : "Create Poll"}
        variant="Primary"
        disabled={!canCreate() || isSubmitting}
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </Box>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={["95%"]}
      onClose={handleClose}
      footer={navButtons}
    >
      <Box paddingTop="xs" gap="md">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="md"
          style={{ minHeight: 28 }}
        >
          <Box style={{ width: 24 }} />
          <Text
            variant="bodyMedium"
            color="gray900"
            style={{ flex: 1, textAlign: "center" }}
          >
            Create a poll
          </Text>
          <Pressable
            onPress={close}
            style={{ width: 24, alignItems: "flex-end" }}
          >
            <X size={24} />
          </Pressable>
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12, gap: 16 }}
        >
          <StepPollType selected={form.pollType} onSelect={handleTypeChange} />

          <StepQuestion
            pollType={form.pollType}
            question={form.question}
            onQuestionChange={(q) => setForm((f) => ({ ...f, question: q }))}
            options={form.options}
            onOptionsChange={(opts) =>
              setForm((f) => ({ ...f, options: opts }))
            }
          />

          <Box paddingHorizontal="md">
            <StepSettings
              tripID={tripID}
              categories={form.categories}
              onCategoriesChange={(cats) =>
                setForm((f) => ({ ...f, categories: cats }))
              }
              deadline={form.deadline}
              onDeadlineChange={(d) => setForm((f) => ({ ...f, deadline: d }))}
              isAnonymous={form.isAnonymous}
              onAnonymousChange={(v) =>
                setForm((f) => ({ ...f, isAnonymous: v }))
              }
            />
          </Box>
        </ScrollView>
      </Box>
    </BottomSheet>
  );
});

CreatePollSheet.displayName = "CreatePollSheet";
export default CreatePollSheet;
