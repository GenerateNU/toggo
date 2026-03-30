import { Text } from "@/design-system";

export default function TripDetailItinerary() {
    // this should handle the fetching. We read the date from the date selector tab
    // (passed in as a prop) and fetch the activities for that date.
    // We should also have a setIsLoadingItinerary function passed in so that we can
    // stop the skeleton from showing the empty accordian cards
    return (
        <Text>
            display the itinerary content here using the accordian display cards.
            they should be displayed in separate unselected/morning/afternoon/evening sections.
            `unselected` refers to the activities that are not assigned to a specific time or order.
            

            {/* We should also have an add activity button under each section. not sure yet 
            where it should be rerouting to though */}
        </Text>
    );
};
