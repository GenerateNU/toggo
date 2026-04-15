import type { ModelsCommenterPreview } from "@/types/types.gen";

export type TripMemberPreviewRowProps = {
  members: MemberPreview[];
  currentUserId?: string | null;
  textSize?: "default" | "small";
};

export type MemberPreview = {
  id: string;
  name: string;
  profilePhotoUrl?: string;
};

export function tripMemberPreviews(trip: {
  member_previews?: ModelsCommenterPreview[];
}): MemberPreview[] {
  return (
    trip.member_previews
      ?.map((m) => ({
        id: m.user_id ?? "",
        name: m.name?.trim() || "Traveler",
        profilePhotoUrl: m.profile_picture_url ?? undefined,
      }))
      .filter((m) => m.id) ?? []
  );
}
