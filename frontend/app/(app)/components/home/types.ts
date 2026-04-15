export type TripMemberPreviewRowProps = {
  tripId: string;
  currentUserId?: string | null;
  textSize?: "default" | "small";
};

export type MemberPreview = {
  id: string;
  name: string;
  profilePhotoUrl?: string;
};
