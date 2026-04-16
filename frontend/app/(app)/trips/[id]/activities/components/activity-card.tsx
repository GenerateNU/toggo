import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { EntityCard } from "../../components/entity-card";
import { RsvpButton } from "./rsvp-button";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress?: () => void;
  onOpenComments?: () => void;
  isGoing?: boolean;
  onRsvp?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityCard({
  activity,
  onPress,
  onOpenComments,
  isGoing = false,
  onRsvp,
}: ActivityCardProps) {
  const priceLabel =
    activity.estimated_price != null
      ? `$${activity.estimated_price} per person`
      : undefined;

  return (
    <EntityCard
      thumbnailUrl={activity.thumbnail_url ?? undefined}
      proposedBy={activity.proposed_by ?? undefined}
      proposerPictureUrl={activity.proposer_picture_url ?? undefined}
      name={activity.name ?? ""}
      priceLabel={priceLabel}
      actionButton={
        <RsvpButton
          isGoing={isGoing}
          onPress={onRsvp ?? (() => {})}
          variant="card"
        />
      }
      commentCount={activity.comment_count ?? 0}
      commentPreviews={activity.comment_previews ?? []}
      onPress={onPress ?? (() => {})}
      onOpenComments={onOpenComments ?? (() => {})}
    />
  );
}
