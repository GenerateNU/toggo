import { Text } from "@/design-system";

// this will display EACH date of the trip and allow the user to horizontally scroll through them.
// by selecting a date, it should highlight the active tab.
// the trip detail date selector's active tab will be responsible for fetching the activities displayed.

// NOTE (DO NOT IMPLEMENT YET): this should definitely require a cache for performance optimization

export default function TripDetailDateSelector() {
    return (
        <Text>
            Some dates we can scroll through (question for design but do we want to enable calendar view as well in case
            the trip gets long enough?)
        </Text>
    );
};
