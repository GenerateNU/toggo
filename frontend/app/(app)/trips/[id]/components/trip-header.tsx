import { Box } from "@/design-system";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

type TripHeaderProps = {
  coverImageUrl?: string;
  absolute?: boolean;
};

export function TripHeader({ coverImageUrl }: TripHeaderProps) {
  return (
    <Box style={styles.container} backgroundColor="blue25">
      {coverImageUrl ? (
        <Image
          source={{ uri: coverImageUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TripHeader;
