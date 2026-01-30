import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { normalizePhone } from "@/utilities/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, TextInput } from "react-native";
import { z } from "zod";

const SIGNUP_SCHEMA = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
});

type SignupFormData = z.infer<typeof SIGNUP_SCHEMA>;

export function SignupForm() {
  const { sendOTP } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState } = useForm<SignupFormData>({
    resolver: zodResolver(SIGNUP_SCHEMA),
    mode: "onChange",
    defaultValues: { phone: "" },
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Normalize phone number
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        setError("Invalid phone number format");
        setIsLoading(false);
        return;
      }

      // Send OTP using normalized digits format
      await sendOTP(normalized.digits);

      // Navigate to OTP verification with E.164 format
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: normalized.e164 },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Box gap="m">
      {error && (
        <Box backgroundColor="sunsetOrange" padding="s" borderRadius="s">
          <Text variant="caption" color="cloudWhite">
            {error}
          </Text>
        </Box>
      )}

      <Controller
        name="phone"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Phone Number
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.phone ? "sunsetOrange" : "mountainGray"
              }
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="+1 555 555 5555"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                style={{ fontSize: 16 }}
              />
            </Box>
            {formState.errors.phone && (
              <Text variant="caption" color="sunsetOrange">
                {formState.errors.phone.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={!formState.isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="cloudWhite" />
        ) : (
          <Text variant="caption" color="cloudWhite">
            Create Account
          </Text>
        )}
      </Button>
    </Box>
  );
}
