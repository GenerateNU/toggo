import { Box, Text } from "@/design-system";
import {
  ModelsPollAPIResponse,
  ModelsRankPollResultsResponse,
} from "@/types/types.gen";
import RankPollCard from "./rank-poll-card";
import { PollType } from "./step-poll-type";
import VotePollCard from "./vote-poll-card";

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
  const normalizedOptions = options.filter(
    (option) => option.trim().length > 0,
  );
  const deadlineISO = deadline ? deadline.toISOString() : undefined;

  if (pollType === "rank") {
    const rankPreviewPoll: ModelsRankPollResultsResponse = {
      poll_id: "preview-rank-poll",
      poll_type: "rank",
      question,
      created_by: "preview-user",
      deadline: deadlineISO,
      user_has_voted: false,
      total_voters: 0,
      all_options: normalizedOptions.map((name, index) => ({
        option_id: `preview-rank-option-${index}`,
        name,
        borda_score: 0,
      })),
    };

    return (
      <Box gap="md">
        <Text variant="bodyXsMedium" color="gray500">
          Preview
        </Text>
        <RankPollCard poll={rankPreviewPoll} tripId="preview" previewMode />
      </Box>
    );
  }

  const votePreviewPoll: ModelsPollAPIResponse = {
    id: "preview-vote-poll",
    poll_type: pollType === "multi" ? "multi" : "single",
    question,
    created_by: isAnonymous ? undefined : "preview-user",
    deadline: deadlineISO,
    is_anonymous: isAnonymous,
    categories,
    options: normalizedOptions.map((name, index) => ({
      id: `preview-vote-option-${index}`,
      name,
      vote_count: 0,
      voted: false,
    })),
  };

  return (
    <Box gap="md">
      <Text variant="bodyXsMedium" color="gray500">
        Preview
      </Text>
      <VotePollCard poll={votePreviewPoll} tripId="preview" previewMode />
    </Box>
  );
}
