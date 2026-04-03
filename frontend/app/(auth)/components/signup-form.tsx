import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { normalizePhone } from "@/utilities/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput } from "react-native";
import { z } from "zod";

const SIGNUP_SCHEMA = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
});

type SignupFormData = z.infer<typeof SIGNUP_SCHEMA>;

export default function SignupForm() {
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
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        setError("Invalid phone number format");
        setIsLoading(false);
        return;
      }

      await sendOTP(normalized.digits);

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
    <Box gap="md">
      {error && (
        <Box backgroundColor="statusError" padding="sm" borderRadius="sm">
          <Text variant="bodySmDefault" color="white">
            {error}
          </Text>
        </Box>
      )}

      <Controller
        name="phone"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="bodySmMedium" color="white">
              Phone Number
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.phone ? "statusError" : "gray300"
              }
              borderRadius="sm"
              padding="sm"
              backgroundColor="white"
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
              <Text variant="bodyXsDefault" color="statusError">
                {formState.errors.phone.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        layout="textOnly"
        label="Create Account"
        variant="Primary"
        loading={isLoading}
        loadingLabel="Sending..."
        disabled={!formState.isValid || isLoading}
        onPress={handleSubmit(onSubmit)}
      />
    </Box>
  );
}
