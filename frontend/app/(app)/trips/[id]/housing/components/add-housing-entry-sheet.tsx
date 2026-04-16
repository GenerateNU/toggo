import { parseActivityLink } from "@/api/activities";
import type { ModelsParsedActivityData } from "@/types/types.gen";
import { forwardRef } from "react";
import {
  AddItemEntrySheet,
  type AddItemEntrySheetHandle,
} from "../../components/add-item-entry-sheet";

export type { AddItemEntrySheetHandle as AddHousingEntrySheetHandle };

type AddHousingEntrySheetProps = {
  tripID: string;
  onManual: () => void;
  onAutofilled: (data: ModelsParsedActivityData) => void;
  onClose: () => void;
};

export const AddHousingEntrySheet = forwardRef<
  AddItemEntrySheetHandle,
  AddHousingEntrySheetProps
>(({ tripID, onManual, onAutofilled, onClose }, ref) => (
  <AddItemEntrySheet
    ref={ref}
    illustration={require("@/assets/images/house.png")}
    title="Add a housing option"
    loadingTitle="Fetching listing details..."
    subtitle="Easily import from Airbnb, Booking.com, or another rental service."
    loadingSubtitle="Hang tight while we pull the details from your link. This only takes a second or two."
    urlPlaceholder="https://airbnb.com/rooms/your-option"
    onParseLink={(url) => parseActivityLink(tripID, { url })}
    onAutofilled={onAutofilled}
    onManual={onManual}
    onClose={onClose}
  />
));

AddHousingEntrySheet.displayName = "AddHousingEntrySheet";
