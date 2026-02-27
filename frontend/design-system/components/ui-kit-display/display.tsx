import { Avatar } from "@/design-system/components/avatars/avatar";
import { AvatarGroup } from "@/design-system/components/avatars/avatar-group";
import { Button } from "@/design-system/components/buttons/button";
import { AnimatedBox } from "@/design-system/primitives/animated-box";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { BorderWidth } from "@/design-system/tokens/border";
import { ColorName, ColorPalette } from "@/design-system/tokens/color";
import { CoreSize, CoreSizeKey } from "@/design-system/tokens/core-size";
import {
  CornerRadius,
  CornerRadiusKey,
} from "@/design-system/tokens/corner-radius";
import { Elevation, ElevationKey } from "@/design-system/tokens/elevation";
import { Transition, TransitionKey } from "@/design-system/tokens/transition";
import {
  Typography,
  TypographyVariant,
} from "@/design-system/tokens/typography";
import { ArrowRight, Mail, Star } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Animated, Easing, TouchableOpacity } from "react-native";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box width="100%" gap="sm">
      <Text variant="lgHeading">{title}</Text>
      <Box
        width="100%"
        padding="md"
        borderRadius="md"
        backgroundColor="surfaceBackground"
        gap="sm"
      >
        {children}
      </Box>
    </Box>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="sm"
    >
      <Text variant="xsLabel" color="textSecondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

function TransitionRow({ tokenKey }: { tokenKey: TransitionKey }) {
  const t = Transition[tokenKey];
  const [anim] = useState(() => new Animated.Value(0));

  const play = () => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: t.duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const translateX = useMemo(
    () =>
      anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 80],
      }),
    [anim],
  );

  return (
    <TouchableOpacity onPress={play}>
      <Box gap="xs">
        <Text variant="xsLabel" color="textSecondary">
          {tokenKey} — {t.duration}ms · {t.easing}
        </Text>
        <AnimatedBox
          width={32}
          height={32}
          borderRadius="sm"
          backgroundColor="brandPrimary"
          style={{ transform: [{ translateX }] }}
        />
      </Box>
    </TouchableOpacity>
  );
}

export default function UIKit() {
  return (
    <Box gap="lg">
      <Box gap="xs">
        <Text variant="xxlHeading">Design System</Text>
        <Text variant="smParagraph" color="textQuaternary">
          Basic building blocks and tokens for consistent design across the app.
          Subjected to change.
        </Text>
      </Box>

      <Section title="Color">
        {(Object.keys(ColorPalette) as ColorName[]).map((key) => (
          <Row key={key} label={key}>
            <Box
              width={32}
              height={32}
              borderRadius="sm"
              borderWidth={1}
              borderColor="borderPrimary"
              style={{ backgroundColor: ColorPalette[key] }}
            />
          </Row>
        ))}
      </Section>

      <Section title="Typography">
        {(Object.keys(Typography) as TypographyVariant[])
          .filter((k) => k !== "defaults")
          .map((key) => (
            <Row key={key} label={key}>
              <Text style={Typography[key]}>Aa</Text>
            </Row>
          ))}
      </Section>

      <Section title="Elevation">
        {(Object.keys(Elevation) as ElevationKey[]).map((key) => (
          <Row key={key} label={key}>
            <Box
              width={48}
              height={48}
              borderRadius="sm"
              backgroundColor="surfaceCard"
              style={{ ...Elevation[key] }}
            />
          </Row>
        ))}
      </Section>

      <Section title="Core Size">
        {(Object.keys(CoreSize) as CoreSizeKey[]).map((key) => (
          <Row key={`coresize-${key}`} label={`${key} — ${CoreSize[key]}px`}>
            <Box
              height={16}
              backgroundColor="brandPrimary"
              borderRadius="xs"
              style={{ width: CoreSize[key] }}
            />
          </Row>
        ))}
      </Section>

      <Section title="Corner Radius">
        {(Object.keys(CornerRadius) as CornerRadiusKey[]).map((key) => (
          <Row key={`radius-${key}`} label={`${key} — ${CornerRadius[key]}px`}>
            <Box
              width={48}
              height={48}
              backgroundColor="brandPrimary"
              style={{ borderRadius: CornerRadius[key] }}
            />
          </Row>
        ))}
      </Section>

      <Section title="Border Width">
        {(Object.keys(BorderWidth) as (keyof typeof BorderWidth)[]).map(
          (key) => (
            <Row key={`border-${key}`} label={`${key} — ${BorderWidth[key]}px`}>
              <Box
                width={80}
                height={32}
                borderRadius="sm"
                style={{
                  borderWidth: BorderWidth[key],
                  borderColor: "#000000",
                }}
              />
            </Row>
          ),
        )}
      </Section>

      <Section title="Transition">
        <Text variant="xsParagraph" color="textSecondary">
          Tap each row to preview
        </Text>
        {(Object.keys(Transition) as TransitionKey[]).map((key) => (
          <TransitionRow key={key} tokenKey={key} />
        ))}
      </Section>

      <Section title="Avatar">
        <Row label="sizes">
          <Box flexDirection="row" gap="xs" alignItems="center">
            {(Object.keys(CoreSize) as CoreSizeKey[]).map((size) => (
              <Avatar key={size} variant={size} seed={size} />
            ))}
          </Box>
        </Row>
        <Row label="with photo">
          <Avatar variant="lg" profilePhoto="https://i.pravatar.cc/150?img=3" />
        </Row>
        <Row label="group">
          <AvatarGroup
            members={[
              { id: "1", seed: "alice" },
              { id: "2", seed: "bob" },
              { id: "3", seed: "carol" },
              { id: "4", seed: "dave" },
              { id: "5", seed: "eve" },
            ]}
            size="md"
          />
        </Row>
      </Section>

      <Section title="Button">
        <Text variant="xsLabel" color="textSecondary">
          variants
        </Text>
        <Button layout="textOnly" label="Primary" variant="Primary" />
        <Button layout="textOnly" label="Secondary" variant="Secondary" />
        <Button layout="textOnly" label="Tertiary" variant="Tertiary" />
        <Button layout="textOnly" label="Quaternary" variant="Quaternary" />
        <Button layout="textOnly" label="Destructive" variant="Destructive" />

        <Text variant="xsLabel" color="textSecondary">
          sizes
        </Text>
        <Button
          layout="textOnly"
          label="Small"
          variant="Primary"
          size="small"
        />
        <Button
          layout="textOnly"
          label="Medium"
          variant="Primary"
          size="medium"
        />
        <Button
          layout="textOnly"
          label="Large"
          variant="Primary"
          size="large"
        />

        <Text variant="xsLabel" color="textSecondary">
          with icons
        </Text>
        <Button
          layout="leadingIcon"
          label="Leading Icon"
          variant="Primary"
          leftIcon={Mail}
        />
        <Button
          layout="leadingAndTrailingIcon"
          label="Both Icons"
          variant="Secondary"
          leftIcon={Mail}
          rightIcon={ArrowRight}
        />

        <Text variant="xsLabel" color="textSecondary">
          icon only
        </Text>
        <Box flexDirection="row" gap="sm">
          <Button
            layout="iconOnly"
            icon={Star}
            variant="IconPrimary"
            accessibilityLabel="Star"
          />
          <Button
            layout="iconOnly"
            icon={Star}
            variant="IconSecondary"
            accessibilityLabel="Star"
          />
          <Button
            layout="iconOnly"
            icon={Star}
            variant="IconTertiary"
            accessibilityLabel="Star"
          />
        </Box>

        <Text variant="xsLabel" color="textSecondary">
          states
        </Text>
        <Button
          layout="textOnly"
          label="Primary disabled"
          variant="Primary"
          disabled
        />
        <Button
          layout="textOnly"
          label="Secondary disabled"
          variant="Secondary"
          disabled
        />
        <Button
          layout="textOnly"
          label="Tertiary disabled"
          variant="Tertiary"
          disabled
        />
        <Button
          layout="textOnly"
          label="Quaternary disabled"
          variant="Quaternary"
          disabled
        />
        <Button
          layout="textOnly"
          label="Primary loading"
          variant="Primary"
          loading
        />
        <Button
          layout="textOnly"
          label="Secondary loading"
          variant="Secondary"
          loading
        />
      </Section>
    </Box>
  );
}
