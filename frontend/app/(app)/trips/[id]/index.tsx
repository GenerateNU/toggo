import { Box, Divider, Screen, Text } from "@/design-system";
import { ScrollView } from "react-native";
import TripDetailSkeleton from "./components/trip-detail-skeleton";

export default function TripDetail() {
  return (
    <Screen>
        <Box flex={1} justifyContent="center" alignItems="center" gap="md" marginTop="xxl">
          <Text variant="lgHeading" color="textSecondary">
            Trip Detail Page
          </Text>
          <Text variant="smParagraph" color="textQuaternary">
            This page is under construction.
          </Text>

          <Divider />

          <ScrollView>
            <Text variant="xlHeading" color="textSecondary">
              SANDBOX
            </Text>
            <Box flex={1} backgroundColor="brandPrimary">
              <TripDetailSkeleton />
            </Box>
          </ScrollView>
        </Box>
    </Screen>
  );
}

// import { useGetTripMembers } from "@/api/memberships";
// import { useListPitches } from "@/api/pitches";
// import { useGetTrip } from "@/api/trips";
// import { BackButton, Box, Screen, Text } from "@/design-system";
// import { router, useLocalSearchParams } from "expo-router";
// import { Map } from "lucide-react-native";
// import { useState } from "react";
// import { ActivityIndicator, Pressable, ScrollView } from "react-native";
// import { DateSelector, generateDateRange } from "./components/date-selector";
// import { PitchCard } from "./components/pitch-card";
// import { TripHeader } from "./components/trip-header";
// import { TripTab, TripTabs } from "./components/trip-tabs";

// export default function TripDetail() {
//   const { id: tripID } = useLocalSearchParams<{ id: string }>();
//   const [activeTab, setActiveTab] = useState<TripTab>("itinerary");

//   // TODO: When backend supports trip dates, use them to generate date range
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const mockDates = generateDateRange(
//     new Date(2026, 3, 11), // April 11
//     new Date(2026, 3, 15), // April 15
//   );

//   // Fetch trip data
//   const { data: trip, isLoading: tripLoading } = useGetTrip(tripID!, {
//     query: { enabled: !!tripID },
//   });

//   // Fetch trip members
//   const { data: membersResponse, isLoading: membersLoading } =
//     useGetTripMembers(
//       tripID!,
//       {},
//       {
//         query: { enabled: !!tripID },
//       }
//     );

//   // Fetch pitches for housing tab
//   const { data: pitchesResponse, isLoading: pitchesLoading } = useListPitches(
//     tripID!,
//     { limit: 20 },
//     {
//       query: { enabled: !!tripID },
//     }
//   );

//   const members = membersResponse?.items || [];
//   const pitches = pitchesResponse?.items || [];

//   const isLoading = tripLoading || membersLoading;

//   if (isLoading) {
//     return (
//       <Screen>
//         <Box flex={1} justifyContent="center" alignItems="center">
//           <ActivityIndicator size="large" />
//         </Box>
//       </Screen>
//     );
//   }

//   if (!trip) {
//     return (
//       <Screen>
//         <Box flex={1} justifyContent="center" alignItems="center" gap="md">
//           <Text variant="lgHeading" color="textSecondary">
//             Trip not found
//           </Text>
//           <BackButton />
//         </Box>
//       </Screen>
//     );
//   }

//   const renderContent = () => {
//     switch (activeTab) {
//       case "new":
//         return (
//           <Box padding="md" gap="sm">
//             <Text variant="mdHeading" color="textSecondary">
//               Create New
//             </Text>
//             <Text variant="smParagraph" color="textQuaternary">
//               Choose what you'd like to create for this trip
//             </Text>
//           </Box>
//         );

//       case "itinerary":
//         return (
//           <Box gap="md">
//             <DateSelector
//               dates={mockDates}
//               selectedDate={selectedDate}
//               onDateChange={setSelectedDate}
//             />
//             <Box padding="md">
//               <Text variant="smParagraph" color="textQuaternary">
//                 Activities for{" "}
//                 {selectedDate.toLocaleDateString("en-US", {
//                   month: "long",
//                   day: "numeric",
//                   year: "numeric",
//                 })}
//               </Text>
//               {/* TODO: Filter activities by selected date when backend supports it */}
//             </Box>
//           </Box>
//         );

//       case "polls":
//         return (
//           <Box padding="md">
//             <Text variant="smParagraph" color="textQuaternary">
//               No polls yet
//             </Text>
//             {/* TODO: Add polls list when integrated */}
//           </Box>
//         );

//       case "housing":
//         return (
//           <Box padding="md" gap="md">
//             {pitchesLoading ? (
//               <ActivityIndicator />
//             ) : pitches.length === 0 ? (
//               <Text variant="smParagraph" color="textQuaternary">
//                 No housing options yet
//               </Text>
//             ) : (
//               pitches.map((pitch) => (
//                 <PitchCard
//                   key={pitch.id}
//                   id={pitch.id!}
//                   title={pitch.title || "Untitled Pitch"}
//                   description={pitch.description}
//                   creatorId={pitch.user_id!}
//                   createdAt={new Date(pitch.created_at!)}
//                   commentsCount={0} // TODO: Fetch from comments API
//                   onPress={() =>
//                     router.push({
//                       pathname: `/trips/${tripID}/pitches/${pitch.id}`,
//                       params: { tripID },
//                     })
//                   }
//                 />
//               ))
//             )}
//           </Box>
//         );

//       case "budget":
//         return (
//           <Box padding="md" gap="sm">
//             <Text variant="mdHeading" color="textSecondary">
//               Budget
//             </Text>
//             <Box
//               backgroundColor="surfaceCard"
//               padding="md"
//               borderRadius="md"
//               gap="xs"
//             >
//               <Box flexDirection="row" justifyContent="space-between">
//                 <Text variant="smLabel" color="textQuaternary">
//                   Min Budget
//                 </Text>
//                 <Text variant="mdLabel" color="textSecondary">
//                   {trip.currency} {trip.budget_min?.toLocaleString()}
//                 </Text>
//               </Box>
//               <Box flexDirection="row" justifyContent="space-between">
//                 <Text variant="smLabel" color="textQuaternary">
//                   Max Budget
//                 </Text>
//                 <Text variant="mdLabel" color="textSecondary">
//                   {trip.currency} {trip.budget_max?.toLocaleString()}
//                 </Text>
//               </Box>
//             </Box>
//           </Box>
//         );

//       case "activities":
//         return (
//           <Box padding="md">
//             <Text variant="smParagraph" color="textQuaternary">
//               No activities yet
//             </Text>
//             {/* TODO: Add activities list when integrated */}
//           </Box>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <Screen>
//       <Box flex={1} backgroundColor="surfaceBackground">
//         {/* Header with back and map buttons */}
//         <Box
//           flexDirection="row"
//           alignItems="center"
//           justifyContent="space-between"
//           padding="md"
//           backgroundColor="surfaceCard"
//         >
//           <BackButton />
//           <Pressable>
//             <Box
//               paddingHorizontal="md"
//               paddingVertical="xs"
//               borderRadius="sm"
//               backgroundColor="surfaceElevated"
//               flexDirection="row"
//               alignItems="center"
//               gap="xs"
//             >
//               <Map size={16} color="#000000" />
//               <Text variant="smLabel" color="textSecondary">
//                 Map
//               </Text>
//             </Box>
//           </Pressable>
//         </Box>

//         {/* Trip Header */}
//         <TripHeader
//           tripName={trip.name || "Untitled Trip"}
//           members={members}
//           onSettingsPress={() => {
//             // TODO: Navigate to trip settings
//             console.log("Open trip settings");
//           }}
//         />

//         {/* Tab Navigation */}
//         <TripTabs activeTab={activeTab} onTabChange={setActiveTab} />

//         {/* Content */}
//         <ScrollView style={{ flex: 1 }}>
//           {renderContent()}
//           <Box height={100} /> {/* Bottom padding for scroll */}
//         </ScrollView>
//       </Box>
//     </Screen>
//   );
// }
