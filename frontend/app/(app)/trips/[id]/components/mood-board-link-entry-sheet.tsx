import { parseActivityLink, useCreateActivity } from "@/api/activities";
import {
  AddItemEntrySheet,
  type AddItemEntrySheetHandle,
} from "./add-item-entry-sheet";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { useToast } from "@/design-system/primitives/toast-manager";
import { assertMoodBoardActivityXor } from "./mood-board-utils";

export type MoodBoardLinkEntrySheetHandle = {
  open: () => void;
  close: () => void;
};

type MoodBoardLinkEntrySheetProps = {
  tripID: string;
  categoryName: string;
  onSaved: (activity: ModelsActivityAPIResponse) => void;
  onClose: () => void;
};

const LINK_TITLE = "Link";

export const MoodBoardLinkEntrySheet = forwardRef<
  MoodBoardLinkEntrySheetHandle,
  MoodBoardLinkEntrySheetProps
>(({ tripID, categoryName, onSaved, onClose }, ref) => {
  const innerRef = useRef<AddItemEntrySheetHandle>(null);
  const createActivity = useCreateActivity();
  const toast = useToast();

  useImperativeHandle(ref, () => ({
    open: () => innerRef.current?.open(),
    close: () => innerRef.current?.close(),
  }));

  const handleAutofilled = async (data: ModelsParsedActivityData) => {
    const mediaUrl = data.media_url?.trim() || data.source_url?.trim() || "";
    if (!mediaUrl) {
      toast.show({ message: "Could not read a URL from this link." });
      return;
    }
    const name = data.name?.trim() || LINK_TITLE;
    const payload = {
      name,
      media_url: mediaUrl,
      thumbnail_url: data.thumbnail_url?.trim() || undefined,
    };
    try {
      assertMoodBoardActivityXor("link", {
        name: payload.name,
        media_url: payload.media_url,
        thumbnail_url: payload.thumbnail_url,
      });
    } catch (e) {
      toast.show({ message: (e as Error).message });
      return;
    }
    try {
      const created = await createActivity.mutateAsync({
        tripID,
        data: {
          name: payload.name,
          media_url: payload.media_url,
          thumbnail_url: payload.thumbnail_url,
          category_names: [categoryName],
        },
      });
      if (created) onSaved(created as ModelsActivityAPIResponse);
    } catch {
      toast.show({ message: "Could not save link." });
    }
  };

  return (
    <AddItemEntrySheet
      ref={innerRef}
      illustration={require("@/assets/images/binoculars.png")}
      title="Add a link"
      loadingTitle="Fetching link"
      subtitle="Paste a URL from Yelp, Tripadvisor, Instagram, TikTok, or a blog."
      loadingSubtitle="Pulling details from your link."
      urlPlaceholder="https://"
      onParseLink={(url) => parseActivityLink(tripID, { url })}
      onAutofilled={handleAutofilled}
      onManual={() => {}}
      onClose={onClose}
    />
  );
});

MoodBoardLinkEntrySheet.displayName = "MoodBoardLinkEntrySheet";
