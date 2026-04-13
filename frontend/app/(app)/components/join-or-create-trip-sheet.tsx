import { BottomSheet, Box, Button, Divider, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { X } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_CODE_LENGTH = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "initial" | "enter-code";

type JoinOrCreateTripSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onJoin: (code: string) => void;
  onCreateTrip: () => void;
  onClose?: () => void;
};

// ─── Trip Code Input ──────────────────────────────────────────────────────────

type TripCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function TripCodeInput({ value, onChange }: TripCodeInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const chars = value
    .split("")
    .concat(Array(TRIP_CODE_LENGTH - value.length).fill(""));

  const handleChange = (text: string, index: number) => {
    const sanitized = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (sanitized.length === 0) {
      const newChars = [...chars];
      newChars[index] = "";
      onChange(newChars.join(""));
      return;
    }

    if (sanitized.length === 1) {
      const newChars = [...chars];
      newChars[index] = sanitized;
      onChange(newChars.join(""));
      if (index < TRIP_CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (sanitized.length === TRIP_CODE_LENGTH) {
      onChange(sanitized);
      inputRefs.current[TRIP_CODE_LENGTH - 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && chars[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newChars = [...chars];
      newChars[index - 1] = "";
      onChange(newChars.join(""));
    }
  };

  return (
    <Box flexDirection="row" gap="xs">
      {chars.slice(0, TRIP_CODE_LENGTH).map((char, index) => (
        <Box
          key={index}
          flex={1}
          borderWidth={1}
          borderColor="gray200"
          borderRadius="sm"
          backgroundColor="white"
          justifyContent="center"
          alignItems="center"
          style={styles.codeCell}
        >
          <TextInput
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={char}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            maxLength={index === 0 ? TRIP_CODE_LENGTH : 1}
            selectTextOnFocus
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
          />
        </Box>
      ))}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JoinOrCreateTripSheet({
  bottomSheetRef,
  onJoin,
  onCreateTrip,
  onClose,
}: JoinOrCreateTripSheetProps) {
  const [step, setStep] = useState<Step>("initial");
  const [tripCode, setTripCode] = useState("");

  const reset = () => {
    setStep("initial");
    setTripCode("");
  };

  const handleClose = () => {
    reset();
    bottomSheetRef.current?.close();
    onClose?.();
  };

  const handleSheetClose = () => {
    reset();
    onClose?.();
  };

  const handleJoin = () => {
    onJoin(tripCode);
  };

  const handleCreateTrip = () => {
    handleClose();
    onCreateTrip();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={handleSheetClose}
    >
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="md">
        <Box flexDirection="row" justifyContent="flex-end">
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={styles.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={24} color={ColorPalette.gray950} />
          </TouchableOpacity>
        </Box>

        {step === "initial" ? (
          <InitialStep
            onEnterCode={() => setStep("enter-code")}
            onCreateTrip={handleCreateTrip}
          />
        ) : (
          <EnterCodeStep
            tripCode={tripCode}
            onTripCodeChange={setTripCode}
            onJoin={handleJoin}
            onCreateTrip={handleCreateTrip}
          />
        )}
      </Box>
    </BottomSheet>
  );
}

// ─── Step: Initial ────────────────────────────────────────────────────────────

type InitialStepProps = {
  onEnterCode: () => void;
  onCreateTrip: () => void;
};

function InitialStep({ onEnterCode, onCreateTrip }: InitialStepProps) {
  return (
    <>
      <Box alignItems="center">
        <Text style={styles.suitcaseEmoji}>🧳</Text>
      </Box>
      <Box gap="sm">
        <Text variant="headingMd" color="gray950">
          Join or create a trip
        </Text>
        <Box gap="sm">
          <Button
            layout="textOnly"
            label="I have a trip code"
            variant="Primary"
            onPress={onEnterCode}
          />
          <Button
            layout="textOnly"
            label="Create a new trip"
            variant="Secondary"
            onPress={onCreateTrip}
          />
        </Box>
      </Box>
    </>
  );
}

// ─── Step: Enter Code ─────────────────────────────────────────────────────────

type EnterCodeStepProps = {
  tripCode: string;
  onTripCodeChange: (code: string) => void;
  onJoin: () => void;
  onCreateTrip: () => void;
};

function EnterCodeStep({
  tripCode,
  onTripCodeChange,
  onJoin,
  onCreateTrip,
}: EnterCodeStepProps) {
  return (
    <>
      <Box gap="xxs">
        <Text variant="headingMd" color="gray950">
          Join or create a trip
        </Text>
        <Text variant="bodyDefault" color="gray500">
          If you are joining a trip, add that code here.
        </Text>
      </Box>
      <Box gap="sm">
        <TripCodeInput value={tripCode} onChange={onTripCodeChange} />
        <Button
          layout="textOnly"
          label="Join trip"
          variant="Primary"
          disabled={tripCode.length < TRIP_CODE_LENGTH}
          onPress={onJoin}
        />
      </Box>
      <Divider />
      <Button
        layout="textOnly"
        label="Create a new trip"
        variant="Secondary"
        onPress={onCreateTrip}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  suitcaseEmoji: {
    fontSize: 72,
  },
  codeCell: {
    height: 85,
    borderRadius: CornerRadius.sm,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
    height: "100%",
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
});

export default JoinOrCreateTripSheet;
