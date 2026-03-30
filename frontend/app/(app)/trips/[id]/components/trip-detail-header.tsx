import {Box, Text} from "@/design-system";

// header component here will not include background image
// should take in some minimal prop info
// - Name, visible avatars (and +X people)
// - dates for the trip, displayed in the format Month day-day, year (e.g. April 11-15, 2026)
//   - this should be in a general format util where if it's the same month
//     it only shows the month once, and if it's the same year, it only shows the year once
//     otherwise, then it shows whatever is missing (e.g. if it's different months but same year, it would show April 28 - May 2, 2026)
// - location (e.g. Bali, Indonesia)

export default function TripDetailHeader() {
  return (
    <Box height={200} marginBottom="md" borderRadius="md" overflow="hidden">
      <Box/>
      <Text variant="xlHeading" color="white">
        Trip to Bali
      </Text>
    </Box>
  );
}