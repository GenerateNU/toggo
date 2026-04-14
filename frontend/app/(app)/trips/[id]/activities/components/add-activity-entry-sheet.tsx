import { parseActivityLink } from "@/api/activities";
import type { ModelsParsedActivityData } from "@/types/types.gen";
import { forwardRef } from "react";
import {
  AddItemEntrySheet,
  type AddItemEntrySheetHandle,
} from "../../components//add-item-entry-sheet";

// Re-export the handle type so callers don't need to know about the generic
export type { AddItemEntrySheetHandle as AddActivityEntrySheetHandle };

type AddActivityEntrySheetProps = {
  tripID: string;
  onManual: () => void;
  onAutofilled: (data: ModelsParsedActivityData) => void;
  onClose: () => void;
};

export const AddActivityEntrySheet = forwardRef<
  AddItemEntrySheetHandle,
  AddActivityEntrySheetProps
>(({ tripID, onManual, onAutofilled, onClose }, ref) => (
  <AddItemEntrySheet
    ref={ref}
    illustration={require("@/assets/images/binoculars.png")}
    title="Add an activity"
    loadingTitle="Add activity details"
    subtitle="Easily import from from yelp, tripadvisor, instagram, tiktok, or another social media platform"
    loadingSubtitle="Hang tight while we pull the details from your link. This only takes a second or two."
    urlPlaceholder="https://www.yelp.com/biz/your-option"
    onParseLink={(url) => parseActivityLink(tripID, { url })}
    onAutofilled={onAutofilled}
    onManual={onManual}
    onClose={onClose}
  />
));

AddActivityEntrySheet.displayName = "AddActivityEntrySheet";