import { Theme } from "@/design-system/tokens/theme";
import { Text } from "@/design-system/primitives/text";

type LogoSize = "xl" | "xxl" | "xxxl";

const sizeToVariant: Record<LogoSize, "logoXl" | "logoXxl" | "logoXxxl"> = {
  xl: "logoXl",
  xxl: "logoXxl",
  xxxl: "logoXxxl",
};

interface LogoProps {
  color?: keyof Theme["colors"];
  size?: LogoSize;
}

export function Logo({ color = "brandPrimary", size = "xxl" }: LogoProps) {
  return (
    <Text variant={sizeToVariant[size]} color={color}>
      toggo
    </Text>
  );
}
