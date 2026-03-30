import { useGetAllTrips } from "@/api/trips";
import { Box, Button, Screen, Text } from "@/design-system";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { ActivityIndicator, Image, Pressable, ScrollView } from "react-native";

// ------------------------ DISCLAIMER ------------------------
// THIS PAGE IS JUST A PLACEHOLDER. FEEL FREE TO REPLACE ONCE IMPLEMENTED.
// PLEASE MERGE OVER THIS FILE IF YOU HAVE ANY CONFLICTS

export default function Trips() {
  const { data: tripsResponse, isLoading } = useGetAllTrips({
    limit: 50,
  });

  const trips = tripsResponse?.items || [];

  return (
    <Screen>
      <Box flex={1} backgroundColor="surfaceBackground">
        {/* Header */}
        <Box
          backgroundColor="surfaceCard"
          padding="md"
          paddingTop="xl"
          gap="sm"
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text variant="xxlHeading" color="textSecondary">
              Your Trips
            </Text>
            <Pressable
              onPress={() => {
                // TODO: Navigate to create trip screen
                console.log("Create new trip");
              }}
            >
              <Box
                width={40}
                height={40}
                borderRadius="full"
                backgroundColor="brandPrimary"
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={24} color="#FFFFFF" />
              </Box>
            </Pressable>
          </Box>
        </Box>

        {/* Content */}
        <ScrollView style={{ flex: 1 }}>
          <Box padding="md" gap="md">
            {isLoading ? (
              <Box paddingVertical="xl" alignItems="center">
                <ActivityIndicator size="large" />
              </Box>
            ) : trips.length === 0 ? (
              <Box paddingVertical="xl" gap="md" alignItems="center">
                <Text variant="mdHeading" color="textSecondary">
                  No trips yet
                </Text>
                <Text
                  variant="smParagraph"
                  color="textQuaternary"
                  style={{ textAlign: "center" }}
                >
                  Create your first trip to start planning your next adventure
                </Text>
                <Box marginTop="sm">
                  <Button
                    variant="Primary"
                    layout="leadingIcon"
                    leftIcon={Plus}
                    label="Create Trip"
                    onPress={() => {
                      // TODO: Navigate to create trip screen
                      console.log("Create new trip");
                    }}
                  />
                </Box>
              </Box>
            ) : (
              trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id!}
                  name={trip.name!}
                  coverImageUrl={trip.cover_image_url}
                  budgetMin={trip.budget_min}
                  budgetMax={trip.budget_max}
                  currency={trip.currency || "USD"}
                  onPress={() => router.push(`/trips/${trip.id}`)}
                />
              ))
            )}
          </Box>
        </ScrollView>
      </Box>
    </Screen>
  );
}

interface TripCardProps {
  id: string;
  name: string;
  coverImageUrl?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  onPress: () => void;
}

function TripCard({
  name,
  coverImageUrl,
  budgetMin,
  budgetMax,
  currency,
  onPress,
}: TripCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Box
        backgroundColor="surfaceCard"
        borderRadius="md"
        overflow="hidden"
      >
        {coverImageUrl ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={{ width: "100%", height: 200, resizeMode: "cover" }}
          />
        ) : (
          <Box
            width="100%"
            height={200}
            backgroundColor="surfaceElevated"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="mdHeading" color="textQuaternary">
              No Cover Image
            </Text>
          </Box>
        )}

        <Box padding="md" gap="xs">
          <Text variant="lgHeading" color="textSecondary">
            {name}
          </Text>

          {budgetMin !== undefined && budgetMax !== undefined && (
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Text variant="smLabel" color="textQuaternary">
                Budget:
              </Text>
              <Text variant="smParagraph" color="textSecondary">
                {currency} {budgetMin.toLocaleString()} - {currency}{" "}
                {budgetMax.toLocaleString()}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Pressable>
  );
}
