import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { normalizePhone } from "@/utilities/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";
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
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length === 0) {
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }

    if (numericText.length === 1) {
      const newDigits = [...digits];
      newDigits[index] = numericText;
      onChange(newDigits.join(""));

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
    <Box flexDirection="row" justifyContent="space-between" gap="sm">
      {digits.slice(0, OTP_LENGTH).map((digit, index) => (
        <Box
          key={index}
          flex={1}
          aspectRatio={0.8}
          borderWidth={2}
          borderColor={hasError ? "error" : "borderPrimary"}
          borderRadius="sm"
          backgroundColor="white"
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

export default function OTPVerificationForm() {
  const { verifyOTP, sendOTP, isPending, refreshCurrentUser } = useUser();
  const params = useLocalSearchParams();
  const router = useRouter();

  const phoneNumber = params.phone as string | undefined;

  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResend = timer === 0;

  useEffect(() => {
    if (!phoneNumber) router.replace("/(auth)/login");
  }, [phoneNumber, router]);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const { control, handleSubmit, formState } = useForm<OTPFormData>({
    resolver: zodResolver(OTP_SCHEMA),
    mode: "onChange",
    defaultValues: { otp: "" },
  });

  const onSubmit = async (data: OTPFormData) => {
    setError(null);
    if (!phoneNumber) return;

    setIsSubmitting(true);

    try {
      const normalized = normalizePhone(phoneNumber);
      if (!normalized) {
        setError("Invalid phone number");
        setIsSubmitting(false);
        return;
      }

      await verifyOTP({
        phone: normalized.digits,
        token: data.otp,
      });

      let user = null;
      try {
        user = await refreshCurrentUser();
      } catch (refreshErr: any) {
        const status =
          refreshErr?.status ?? refreshErr?.data?.status ?? refreshErr?.response?.status;
        if (status === 404 || refreshErr?.message === "User not found") {
          router.replace({
            pathname: "/(auth)/verified",
            params: { phone: normalized.e164 },
          });
          return;
        }
        throw refreshErr;
      }

      if (!user?.name || !user?.username) {
        router.replace({
          pathname: "/(auth)/verified",
          params: { phone: normalized.e164 },
        });
        return;
      }

      router.replace("/");
    } catch (err: any) {
      setError(err?.message || "Invalid verification code");
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber) return;
    setError(null);

    const normalized = normalizePhone(phoneNumber);
    if (!normalized) {
      setError("Invalid phone number");
      return;
    }

    try {
      await sendOTP(normalized.digits);
      setTimer(60);
    } catch (err: any) {
      setError(err?.message || "Failed to resend OTP");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={280}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Box flex={1} justifyContent="space-between">
          {/* TOP */}
          <Box gap="md">
            <Controller
              name="otp"
              control={control}
              render={({ field: { onChange, value, onBlur } }) => (
                <Box gap="sm">
                  <OTPInput
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    hasError={!!formState.errors.otp}
                  />

                  {formState.errors.otp && (
                    <Text variant="xsParagraph" color="error">
                      {formState.errors.otp.message}
                    </Text>
                  )}

                  {error && (
                    <Text variant="smParagraph" color="error">
                      {error}
                    </Text>
                  )}
                </Box>
              )}
            />
          </Box>

          {/* BOTTOM */}
          <Box gap="sm">
            <Button
              layout="textOnly"
              label="Verify phone number"
              variant="Primary"
              loading={isSubmitting}
              loadingLabel="Verifying..."
              disabled={!formState.isValid || isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />

            <Box alignItems="center">
              {canResend ? (
                <Text variant="smParagraph" color="textQuaternary">
                  Didn't receive a code?{" "}
                  <Text
                    variant="smLabel"
                    color="textSecondary"
                    onPress={!isPending ? handleResendOTP : undefined}
                    style={{ fontWeight: "600" }}
                  >
                    Resend code
                  </Text>
                </Text>
              ) : (
                <Text variant="smParagraph" color="textQuaternary">
                  Didn't receive a code? Resend in {timer}s
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}