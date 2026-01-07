import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, TextInput } from "react-native";
import { z } from "zod";

const OTP_LENGTH = 6;

const OTP_SCHEMA = z.object({
  otp: z
    .string()
    .length(OTP_LENGTH, `Code must be ${OTP_LENGTH} digits`)
    .regex(/^\d+$/, "Code must be numbers only"),
});

type OTPFormData = z.infer<typeof OTP_SCHEMA>;

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  hasError: boolean;
}

function OTPInput({ value, onChange, onBlur, hasError }: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = value
    .split("")
    .concat(Array(OTP_LENGTH - value.length).fill(""));

  const handleChange = (text: string, index: number) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length === 0) {
      // Handle deletion
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }

    if (numericText.length === 1) {
      const newDigits = [...digits];
      newDigits[index] = numericText;
      const newValue = newDigits.join("");
      onChange(newValue);

      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (numericText.length === OTP_LENGTH) {
      onChange(numericText);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (
      e.nativeEvent.key === "Backspace" &&
      digits[index] === "" &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      onChange(newDigits.join(""));
    }
  };

  return (
    <Box flexDirection="row" justifyContent="space-between" gap="s">
      {digits.slice(0, OTP_LENGTH).map((digit, index) => (
        <Box
          key={index}
          flex={1}
          aspectRatio={1}
          maxWidth={50}
          borderWidth={2}
          borderColor={
            hasError ? "sunsetOrange" : digit ? "forestGreen" : "mountainGray"
          }
          borderRadius="s"
          backgroundColor="cloudWhite"
          justifyContent="center"
          alignItems="center"
        >
          <TextInput
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onBlur={onBlur}
            keyboardType="number-pad"
            maxLength={index === 0 ? OTP_LENGTH : 1}
            selectTextOnFocus
            style={{
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              width: "100%",
              height: "100%",
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

export function OTPVerificationForm() {
  const { verifyOTP, sendOTP, isPending } = useUser();
  const params = useLocalSearchParams();
  const router = useRouter();
  const phoneNumber = params.phone as string | undefined;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phoneNumber) {
      router.replace("/(auth)/login");
    }
  }, [phoneNumber, router]);

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (timer === 0) {
      const timeout = setTimeout(() => setCanResend(true), 0);
      return () => clearTimeout(timeout);
    }
  }, [timer]);

  const { control, handleSubmit, formState } = useForm<OTPFormData>({
    resolver: zodResolver(OTP_SCHEMA),
    mode: "onChange",
    defaultValues: { otp: "" },
  });

  const onSubmit = async (data: OTPFormData) => {
    setError(null);
    if (!phoneNumber) return;
    try {
      await verifyOTP({ phone: phoneNumber, token: data.otp });
      router.replace("/(app)");
    } catch (err: any) {
      setError(err?.message || "Invalid verification code");
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber) return;
    setError(null);
    try {
      await sendOTP(phoneNumber);
      setTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err?.message || "Failed to resend OTP");
    }
  };

  return (
    <Box gap="m" marginTop="l">
      {error && (
        <Box backgroundColor="sunsetOrange" padding="s" borderRadius="s">
          <Text variant="caption" color="cloudWhite">
            {error}
          </Text>
        </Box>
      )}

      <Controller
        name="otp"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="s">
            <Text variant="caption" color="forestGreen">
              Enter OTP sent to {phoneNumber}
            </Text>
            <OTPInput
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              hasError={!!formState.errors.otp}
            />
            {formState.errors.otp && (
              <Text variant="caption" color="sunsetOrange">
                {formState.errors.otp.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={!formState.isValid || isPending}
      >
        {isPending ? (
          <ActivityIndicator color="cloudWhite" />
        ) : (
          <Text variant="caption" color="cloudWhite">
            Verify OTP
          </Text>
        )}
      </Button>

      <Text variant="caption" color="mountainGray" mt="s">
        {canResend ? "You can resend the code now." : `Resend OTP in ${timer}s`}
      </Text>

      <Button onPress={handleResendOTP} disabled={!canResend || isPending}>
        <Text variant="caption" color="cloudWhite">
          Resend OTP
        </Text>
      </Button>
    </Box>
  );
}
