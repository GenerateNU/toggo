import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { EntityCard } from "../../components/entity-card";

// ─── Types ───────────────────────────────────────────────────────────────────

type HousingCardProps = {
  housing: ModelsActivityAPIResponse;
  onPress?: () => void;
  onOpenComments?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function HousingCard({
  housing,
  onPress,
  onOpenComments,
}: HousingCardProps) {
  const priceLabel =
    housing.estimated_price != null
      ? `$${housing.estimated_price} USD`
      : undefined;

  return (
    <EntityCard
      thumbnailUrl={housing.thumbnail_url ?? undefined}
      proposedBy={housing.proposed_by ?? undefined}
      proposerPictureUrl={housing.proposer_picture_url ?? undefined}
      name={housing.name ?? ""}
      priceLabel={priceLabel}
      actionButton={null}
      commentCount={housing.comment_count ?? 0}
      commentPreviews={housing.comment_previews ?? []}
      onPress={onPress ?? (() => {})}
      onOpenComments={onOpenComments ?? (() => {})}
    />
  );
}
