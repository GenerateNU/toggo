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

const PHONE_SCHEMA = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
});

type PhoneFormData = z.infer<typeof PHONE_SCHEMA>;

export function PhoneNumberForm() {
  const { sendOTP, isPending } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<PhoneFormData>({
    resolver: zodResolver(PHONE_SCHEMA),
    mode: "onChange",
    defaultValues: { phone: "" },
  });

  const onSubmit = async (data: PhoneFormData) => {
    setError(null);

    try {
      // Normalize phone number
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        setError("Invalid phone number format");
        return;
      }

      // Send OTP to Supabase (using digits without country code)
      await sendOTP(normalized.digits);

      // Navigate to OTP verification (pass E.164 format for backend)
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: normalized.e164 },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
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
        disabled={!formState.isValid || isPending}
      >
        {isPending ? (
          <ActivityIndicator color="cloudWhite" />
        ) : (
          <Text variant="caption" color="cloudWhite">
            Send OTP
          </Text>
        )}
      </Button>
    </Box>
  );
}
