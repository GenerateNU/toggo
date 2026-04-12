import { Box, SkeletonRect } from "@/design-system";

export function ActivityCardSkeleton() {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      padding="sm"
      backgroundColor="white"
      borderRadius="xl"
      borderWidth={1}
      borderColor="gray100"
    >
      <SkeletonRect size="xxl" borderRadius="md" />
      <Box flex={1} gap="xxs">
        <SkeletonRect width="threeQuarter" height="xs" />
        <SkeletonRect width="half" height="xs" />
      </Box>
    </Box>
  );
}

export default ActivityCardSkeleton;
