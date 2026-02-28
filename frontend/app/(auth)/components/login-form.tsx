import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { normalizePhone } from "@/utilities/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput } from "react-native";
import { z } from "zod";

const PHONE_SCHEMA = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
});

type PhoneFormData = z.infer<typeof PHONE_SCHEMA>;

export default function PhoneNumberForm() {
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
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        setError("Invalid phone number format");
        return;
      }

      await sendOTP(normalized.digits);

      router.push({
        pathname: "/(auth)/verify",
        params: { phone: normalized.e164 },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    }
  };

  return (
    <Box gap="md">
      {/* ── Error banner ── */}
      {error && (
        <Box backgroundColor="error" padding="sm" borderRadius="sm">
          <Text variant="smParagraph" color="white">
            {error}
          </Text>
        </Box>
      )}

      <Controller
        name="phone"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="smLabel" color="textSecondary">
              Phone Number
            </Text>
            <Box
              borderWidth={1}
              borderColor={formState.errors.phone ? "error" : "borderPrimary"}
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
              <Text variant="xsParagraph" color="error">
                {formState.errors.phone.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        layout="textOnly"
        label="Send OTP"
        variant="Primary"
        loading={isPending}
        loadingLabel="Sending..."
        disabled={!formState.isValid || isPending}
        onPress={handleSubmit(onSubmit)}
      />
    </Box>
  );
}
