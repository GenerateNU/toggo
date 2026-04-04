import { Box } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { ViewStyle } from "react-native";

interface WaveformBarsProps {
  barHeights: number[];
  /**
   * Playback progress from 0–1. Bars up to this point are fully opaque;
   * bars after fade toward the right edge.
   */
  progress?: number;
  barWidth?: number;
  /**
   * When true, bars fade toward both edges with the center fully opaque.
   * Used during live recording.
   */
  centerFade?: boolean;
  style?: ViewStyle;
}

export function WaveformBars({
  barHeights,
  progress = 0,
  barWidth = 2.5,
  centerFade = false,
  style,
}: WaveformBarsProps) {
  const count = barHeights.length;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      style={style}
    >
      {barHeights.map((h, i) => {
        const ratio = (i + 1) / count;
        let opacity: number;

        if (centerFade) {
          const distance = Math.abs(ratio - 0.5) * 2;
          opacity = Math.max(0.2, 1 - distance * 0.8);
        } else {
          const filled = ratio <= progress;
          if (filled) {
            opacity = 1;
          } else {
            const remaining = 1 - progress;
            opacity =
              remaining > 0
                ? Math.max(0.15, 1 - ((ratio - progress) / remaining) * 0.99)
                : 1;
          }
        }

        return (
          <Box
            key={i}
            borderRadius="xs"
            style={{
              width: barWidth,
              height: h,
              backgroundColor: ColorPalette.gray900,
              opacity,
            }}
          />
        );
      })}
    </Box>
  );
}
