import { useGetActivity } from "@/api/activities";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { AllMediaScreen } from "../../components/all-media-screen";
import type { MediaItem } from "../../media/types";

export default function ActivityAllMedia() {
  const { id: activityID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  const { data: activity, refetch } = useGetActivity(tripID ?? "", activityID, {
    query: { enabled: !!(tripID && activityID) },
  });

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    if (activity?.thumbnail_url) {
      items.push({ imageId: "thumbnail", url: activity.thumbnail_url });
    }
    (activity?.image_ids ?? [])
      .filter(
        (img) => !!img.image_url && img.image_url !== activity?.thumbnail_url,
      )
      .forEach((img) =>
        items.push({ imageId: img.image_id!, url: img.image_url! }),
      );
    return items;
  }, [activity]);

  const existingImageIds = useMemo(
    () =>
      (activity?.image_ids ?? []).map((img) => img.image_id!).filter(Boolean),
    [activity],
  );

  return (
    <AllMediaScreen
      tripID={tripID ?? ""}
      entityID={activityID ?? ""}
      entityName={activity?.name}
      mediaItems={mediaItems}
      existingImageIds={existingImageIds}
      onRefetch={refetch}
    />
  );
}
