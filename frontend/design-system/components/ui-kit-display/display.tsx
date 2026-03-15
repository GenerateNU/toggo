import { Avatar } from "@/design-system/components/avatars/avatar";
import { Button } from "@/design-system/components/buttons/button";
import { AnimatedBox } from "@/design-system/primitives/animated-box";
import { Box } from "@/design-system/primitives/box";
import DateRangePicker, { DateRange } from "@/design-system/primitives/date-picker";
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
import { ArrowRight, Mail, Phone, Star } from "lucide-react-native";
import { useMemo, useState, useCallback, useEffect } from "react";
import { Animated, Easing, View, TouchableOpacity, Pressable } from "react-native";
import CheckboxGroup, { Checkbox } from "../buttons/checkbox";
import Toggle from "../buttons/toggle";
import TextField from "@/design-system/components/inputs/text-field";
import RadioGroup from "../buttons/radio";
import { useToast } from "@/design-system/primitives/toast-manager";
import CommentSection from "@/design-system/components/comments/comment-section";
import { CommentData } from "@/design-system/components/comments/comment";
import Divider from "@/design-system/primitives/divider";
import ProgressBarCurved from "../status/progress-bar-curved";
import Comments from "../comments/example-comments.json"
import SkeletonCircle from "../skeleton/circle";
import SkeletonRect from "../skeleton/rectangle";

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
      <Box width="100%" borderRadius="md" gap="sm">
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
  const toast = useToast();

// ─── Progress Bar Group ────────────────────────────────────────────────
  const [currentPercent, setCurrentPercent] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentPercent(65); // Set to a valid percent value, e.g., 65
    }, 400);
    return () => clearTimeout(timeout);
  }, []);

  // ─── Datepicker Group ────────────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    start: null,
    end: null,
  });

  const handleSave = (range: DateRange) => {
    setSelectedRange(range);
    console.log("Start:", range.start);
    console.log("End:", range.end);
  };

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  // ─── Radio Group ────────────────────────────────────────────────
  const [driver, setDriver] = useState<string | null>(null);

  // ─── Checkbox Group ────────────────────────────────────────────────
  const [activities, setActivities] = useState<string[]>([]);

  // ─── Single Checkbox ───────────────────────────────────────────────
  const [agreed, setAgreed] = useState(false);

  // ─── Toggles ───────────────────────────────────────────────────────
  const [textBlasts, setTextBlasts] = useState(true);
  const [votingReminders, setVotingReminders] = useState(false);
  const [finalized, setFinalized] = useState(true);

  // ─── Text Fields ───────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validatePhone = (text: string) => {
    const digits = text.replace(/\D/g, "");
    setPhone(text);
    setPhoneError(
      digits.length > 0 && digits.length !== 10
        ? "Phone number must be 10 digits"
        : ""
    );
  };

  // ─── Comments ──────────────────────────────────────────────────────
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<CommentData[]>(Comments);

  const handleSubmitComment = useCallback((comment: CommentData) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const handleReact = useCallback((commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const existing = c.reactions.find((r) => r.emoji === emoji);
        let updated;
        if (existing) {
          if (existing.reactedByMe) {
            updated =
              existing.count <= 1
                ? c.reactions.filter((r) => r.emoji !== emoji)
                : c.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count - 1, reactedByMe: false }
                      : r
                  );
          } else {
            updated = c.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, reactedByMe: true }
                : r
            );
          }
        } else {
          updated = [...c.reactions, { emoji, count: 1, reactedByMe: true }];
        }
        return { ...c, reactions: updated };
      })
    );
  }, []);

  return (
    <Box gap="lg">
      <Box gap="xs">
        <Text variant="xxlHeading">Design System</Text>
        <Text variant="smParagraph" color="textQuaternary">
          Basic building blocks and tokens for consistent design across the app.
          Subjected to change.
        </Text>
      </Box>

      <Section title="Progress Bar">
        {/* Basic usage */}
        <ProgressBarCurved percent={currentPercent} />

        {/* Taller bar with custom colors */}
        <ProgressBarCurved
          percent={40}
          fillColor="#FF6B6B"
          trackColor="#FFE0E0"
        />

        {/* Full width with label */}
        <View style={{ gap: 4 }}>
          <Text variant="xsLabel" color="textQuaternary">3 of 5 complete</Text>
          <ProgressBarCurved percent={60} />
        </View>
       </Section>
      <Section title="Skeleton">
        <Text variant="xsLabel" color="textSecondary">
          shapes
        </Text>
        <Row label="rect">
          <SkeletonRect width="half" height="md" />
        </Row>
        <Row label="square">
          <SkeletonRect size="xl" />
        </Row>
        <Row label="circle">
          <SkeletonCircle size="xl" />
        </Row>
      </Section>

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

      <Section title="Checkbox, Radio & Toggle">
        <RadioGroup
          label="Who should drive the rental car?"
          options={[
            { label: "Amogh", value: "amogh" },
            { label: "Afnan", value: "afnan" },
            { label: "Olivia", value: "olivia" },
            { label: "Mai", value: "mai" },
          ]}
          value={driver}
          onChange={setDriver}
        />

        <CheckboxGroup
          label="What should we do on Tuesday?"
          options={[
            { label: "Surfing lessons", value: "surfing" },
            { label: "Nice long hike", value: "hike" },
            { label: "Trivia at local bar", value: "trivia" },
            { label: "Visit another part of the island", value: "visit" },
          ]}
          value={activities}
          onChange={setActivities}
        />

        <Checkbox
          label="I agree to the terms and conditions"
          checked={agreed}
          onChange={setAgreed}
        />

        <View style={{ gap: 4 }}>
          <Toggle label="Text blasts" value={textBlasts} onChange={setTextBlasts} />
          <Toggle label="Voting reminders" value={votingReminders} onChange={setVotingReminders} />
          <Toggle label="Finalized decisions" value={finalized} onChange={setFinalized} />
        </View>
      </Section>

      <Section title="Text Field">
        <TextField
          label="Phone Number"
          placeholder="(000) 000-0000"
          value={phone}
          onChangeText={validatePhone}
          error={phoneError}
          keyboardType="phone-pad"
          leftIcon={<Phone size={18} color={ColorPalette.textQuaternary} />}
        />

        <TextField
          label="Phone Number"
          placeholder="(000) 000-0000"
          value=""
          onChangeText={() => {}}
          disabled
          leftIcon={<Phone size={18} color={ColorPalette.textQuaternary} />}
        />
      </Section>

      <Section title="Toast">
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => toast.show({ message: "Housing option saved" })}
            style={{
              backgroundColor: "#000",
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={{ color: "#fff" }}>With close</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              toast.show({
                message: "Trip created!",
                action: { label: "Share", onPress: () => console.log("shared") },
              })
            }
            style={{
              backgroundColor: "#000",
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={{ color: "#fff" }}>With action</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              toast.show({
                message: "Housing option saved",
                action: { label: "Undo", onPress: () => console.log("undo") },
              })
            }
            style={{
              backgroundColor: "#000",
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={{ color: "#fff" }}>With undo</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Date Range Picker">
        <Button
          layout="textOnly"
          label="Open Date Picker"
          variant="Secondary"
          onPress={() => setPickerVisible(true)}
        />
        <Text variant="mdLabel">
          Selected Dates: {formatDate(selectedRange.start)} → {formatDate(selectedRange.end)}
        </Text>
        <DateRangePicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSave={handleSave}
          initialRange={selectedRange}
          monthsToShow={12}
        />
      </Section>

      <Section title="Dividers">    
        <Divider width={1}/>
        <Text>some content</Text>
        <Divider color={ColorPalette.brandPrimary} width={3} />
      </Section>

      <Section title="Comments & Reactions">
        <Button
          layout="textOnly"
          label="Open Comments"
          variant="Secondary"
          onPress={() => setCommentsVisible(true)}
        />
        <CommentSection
          visible={commentsVisible}
          onClose={() => setCommentsVisible(false)}
          comments={comments}
          currentUserId="bart"
          currentUserName="Bart"
          currentUserSeed="bart"
          onSubmitComment={handleSubmitComment}
          onReact={handleReact}
        />
      </Section>
    </Box>
  );
}