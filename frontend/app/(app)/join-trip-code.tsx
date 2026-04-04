import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { getTrip } from "@/api/trips/useGetTrip";
import { Box, Button, Screen, Text, TextField } from "@/design-system";
import { router } from "expo-router";
import { useState } from "react";

export default function JoinTripCodeScreen() {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setError("Enter a valid trip code.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const membership = await joinTripByInvite(normalizedCode);
      if (!membership?.trip_id) {
        setError("Could not join this trip. Please try again.");
        return;
      }
      const trip = await getTrip(membership.trip_id);
      const params = trip?.name
        ? `?joinedTripName=${encodeURIComponent(trip.name)}`
        : "";
      router.replace(`/(app)${params}`);
    } catch {
      setError("This trip code is invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Box
        flex={1}
        paddingHorizontal="md"
        paddingTop="xl"
        gap="md"
        backgroundColor="backgroundWarm"
      >
        <Text variant="headingMd" color="gray900">
          Join with trip code
        </Text>
        <Text variant="bodySmDefault" color="gray500">
          Paste the invite code your friend shared.
        </Text>

        <TextField
          value={code}
          onChangeText={setCode}
          placeholder="ABCD1234"
          autoCapitalize="characters"
          maxLength={12}
          error={error ?? undefined}
        />

        <Button
          layout="textOnly"
          variant="Primary"
          label={isSubmitting ? "Joining..." : "Join trip"}
          disabled={isSubmitting}
          onPress={handleSubmit}
        />
      </Box>
    </Screen>
  );
}
