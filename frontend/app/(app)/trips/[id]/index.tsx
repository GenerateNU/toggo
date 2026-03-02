import { Box, Button, Text } from "@/design-system";
import { router, useLocalSearchParams } from "expo-router";

const DUMMY_ID = "dummy-entity-001";

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();

  return (
    <Box flex={1} backgroundColor="surfaceBackground">
      <Box padding="lg" paddingTop="xl" backgroundColor="surfaceCard" gap="xs">
        <Text variant="smLabel" color="textQuaternary">
          TRIP
        </Text>
        <Text variant="lgHeading" color="textSecondary">
          {tripID}
        </Text>
      </Box>

      <Box padding="lg" gap="md">
        <Text variant="smLabel" color="textQuaternary">
          VIEW
        </Text>
        <Box gap="sm">
          <Button
            layout="textOnly"
            label="See Dummy Activity"
            variant="Primary"
            onPress={() =>
              router.push({
                pathname: `/trips/${tripID}/activities/${DUMMY_ID}`,
                params: { tripID },
              })
            }
          />
          <Button
            layout="textOnly"
            label="See Dummy Pitch"
            variant="Primary"
            onPress={() =>
              router.push({
                pathname: `/trips/${tripID}/pitches/${DUMMY_ID}`,
                params: { tripID },
              })
            }
          />
          <Button
            layout="textOnly"
            label="See Dummy Poll"
            variant="Primary"
            onPress={() =>
              router.push({
                pathname: `/trips/${tripID}/polls/${DUMMY_ID}`,
                params: { tripID },
              })
            }
          />
        </Box>

        <Text variant="smLabel" color="textQuaternary" marginTop="sm">
          CREATE
        </Text>
        <Box gap="sm">
          <Button
            layout="textOnly"
            label="New Activity"
            variant="Secondary"
            onPress={() => router.push(`/trips/${tripID}/activities/creation`)}
          />
          <Button
            layout="textOnly"
            label="New Pitch"
            variant="Secondary"
            onPress={() => router.push(`/trips/${tripID}/pitches/creation`)}
          />
          <Button
            layout="textOnly"
            label="New Poll"
            variant="Secondary"
            onPress={() => router.push(`/trips/${tripID}/polls/creation`)}
          />
        </Box>
      </Box>
    </Box>
  );
}
