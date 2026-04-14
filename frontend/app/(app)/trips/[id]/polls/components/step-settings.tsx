import { PollSettingsPanel } from "./poll-settings-panel";

interface StepSettingsProps {
  tripID: string;
  categories: string[];
  onCategoriesChange: (cats: string[]) => void;
  deadline: Date | null;
  onDeadlineChange: (date: Date | null) => void;
  isAnonymous: boolean;
  onAnonymousChange: (val: boolean) => void;
}

export default function StepSettings({
  tripID: _tripID,
  categories: _categories,
  onCategoriesChange: _onCategoriesChange,
  deadline,
  onDeadlineChange,
  isAnonymous,
  onAnonymousChange,
}: StepSettingsProps) {
  return (
    <PollSettingsPanel
      deadline={deadline}
      onDeadlineChange={onDeadlineChange}
      isAnonymous={isAnonymous}
      onAnonymousChange={onAnonymousChange}
    />
  );
}
