import { AddDeadlineCard } from "@/app/(app)/trips/[id]/components/add-deadline-card";

interface AddDeadlineProps {
  onPress?: () => void;
}

export function AddDeadline({ onPress }: AddDeadlineProps) {
  return (
    <AddDeadlineCard
      onPress={onPress}
      subtitle="Start a timer to encourage participants to pitch locations"
    />
  );
}
