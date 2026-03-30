import { Box } from "@/design-system";

// doesn't look like anything functional at the moment,
// should have the banner and header included, and maybe like 3-4 skeleton cards for itinerary
export default function TripDetailSkeleton() {

    // should have an 'isLoadingItinerary' prop that determines whether to show the 
    // card skeletongs for the itenarary activities content. Banner and header should load faster.
    // So, pass down the setIsLoadingitinerary function to the trip-detail-itinerary component and
    // set it to false once thecontent have loaded, which will trigger the skeleton cards to disappear.

    // there should be a separate header loading state that we keep track of.
    return (
        <Box padding="md">
            <Box height={200} marginBottom="md" borderRadius="md" backgroundColor="surfaceCard" />
            <Box padding="md" gap="md">
                <Box height={20} width="50%" backgroundColor="surfaceCard" borderRadius="sm" />
                <Box height={20} width="30%" backgroundColor="surfaceCard" borderRadius="sm" />
                <Box height={20} width="80%" backgroundColor="surfaceCard" borderRadius="sm" />
                <Box height={20} width="60%" backgroundColor="surfaceCard" borderRadius="sm" />
            </Box>
        </Box>
    );
}
