import { Text } from "@/design-system";

// This should use the primitive accordian component to display the activities.
// The activity details should be passed in as a prop and this component will not be
// doing any fetching itself. The fetching will be done in the trip-detail-itinerary component
// which will pass the content to this component to display.
export default function TripDetailActivityAccordian() {
    return (
        <Text>
            Some image and stuff.
            {/* we should render the image in the hidden view as a small left-alinged icon
            before displaying any names and titles. This should also be displaying WHO is signed
            up for said activity (avatar and names of up to 3 people, then 'and x others'). */}

            {/* Once clicked, the accordian should display the image in its component-fitted size
            and displayed the author of the component, price, likes etc. — any other details sent from the BE */}

            {/* it should not include ALL of the details. It should display minimal information, and once we click
            to see more details, then we can redirect them to the `/activities/[id]` route. We should
            also have a comments component here. Once clicked, it should begin to fetch comments for said
            activity using an existing component from our design-system.*/}

            {/* In the un-opened comment view, it should display  2 avatars + X others who have commented, how many comments,
            and when the latest comment was made (relative time e.g. Yesterday at 12:39am, Two weeks ago, Two days ago)*/}
        </Text>
    );
};
