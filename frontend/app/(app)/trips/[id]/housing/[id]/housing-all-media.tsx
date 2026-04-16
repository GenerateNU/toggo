import { useGetActivity } from "@/api/activities";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { AllMediaScreen } from "../../components/all-media-screen";
import type { MediaItem } from "../../media/types";

export default function HousingAllMedia() {
  const { id: housingID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  const { data: housing, refetch } = useGetActivity(tripID ?? "", housingID, {
    query: { enabled: !!(tripID && housingID) },
  });

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    if (housing?.thumbnail_url) {
      items.push({ imageId: "thumbnail", url: housing.thumbnail_url });
    }
    (housing?.image_ids ?? [])
      .filter(
        (img) => !!img.image_url && img.image_url !== housing?.thumbnail_url,
      )
      .forEach((img) =>
        items.push({ imageId: img.image_id!, url: img.image_url! }),
      );
    return items;
  }, [housing]);

  const existingImageIds = useMemo(
    () =>
      (housing?.image_ids ?? []).map((img) => img.image_id!).filter(Boolean),
    [housing],
  );

  return (
    <AllMediaScreen
      tripID={tripID ?? ""}
      entityID={housingID ?? ""}
      entityName={housing?.name}
      mediaItems={mediaItems}
      existingImageIds={existingImageIds}
      onRefetch={refetch}
    />
  );
}
