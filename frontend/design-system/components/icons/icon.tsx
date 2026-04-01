import { ColorName } from "@/design-system/tokens/color";
import { CoreSizeKey } from "@/design-system/tokens/core-size";
import { useTheme } from "@/design-system/tokens/theme";
import { LucideProps } from "lucide-react-native";

export function Icon({
  icon: IconComponent,
  color = "iconDefault",
  size = "md",
}: {
  icon: React.ComponentType<LucideProps>;
  color?: ColorName;
  size?: CoreSizeKey;
}) {
  const theme = useTheme();
  const resolvedColor = theme.colors[color] || color;
  const resolvedSize = theme.coreSize[size] || size;
  if (!IconComponent) return null;
  return <IconComponent color={resolvedColor} size={resolvedSize} />;
}
