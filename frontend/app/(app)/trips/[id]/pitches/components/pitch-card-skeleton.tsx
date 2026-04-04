import { Box, SkeletonCircle, SkeletonRect } from "@/design-system";
import { Elevation } from "@/design-system/tokens/elevation";

export function PitchCardSkeleton() {
  return (
    <Box
      marginHorizontal="sm"
      marginBottom="sm"
      style={{ ...Elevation.md, shadowOffset: { width: 0, height: 0 } }}
    >
      <Box borderRadius="lg" overflow="hidden" backgroundColor="white">
        <Box paddingHorizontal="xs" paddingTop="xs">
          <Box borderRadius="md" overflow="hidden">
            <SkeletonRect width="full" style={{ height: 200 }} />
          </Box>
        </Box>

        <Box paddingHorizontal="xs" paddingTop="sm" paddingBottom="xs" gap="xs">
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Box flex={1}>
              <SkeletonRect width="threeQuarter" height="xs" />
            </Box>
            <SkeletonCircle size="md" />
          </Box>

          <SkeletonRect width="full" borderRadius="md" style={{ height: 52 }} />
          <SkeletonRect width="full" borderRadius="md" style={{ height: 44 }} />
        </Box>
      </Box>
    </Box>
  );
}
