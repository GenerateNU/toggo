import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, TextInput } from "react-native";
import { z } from "zod";

const SIGNUP_SCHEMA = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
});

type SignupFormData = z.infer<typeof SIGNUP_SCHEMA>;

export function SignupForm() {
  const { sendOTP, setSignupData } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState } = useForm<SignupFormData>({
    resolver: zodResolver(SIGNUP_SCHEMA),
    mode: "onChange",
    defaultValues: { name: "", username: "", phone: "" },
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Store name and username in state management
      setSignupData(data.name, data.username);

      // Send OTP
      await sendOTP(data.phone);

      // Navigate to OTP verification
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: data.phone },
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
        name="name"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Full Name
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.name ? "sunsetOrange" : "mountainGray"
              }
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="John Doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={{ fontSize: 16 }}
              />
            </Box>
            {formState.errors.name && (
              <Text variant="caption" color="sunsetOrange">
                {formState.errors.name.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Controller
        name="username"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Username
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.username ? "sunsetOrange" : "mountainGray"
              }
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="john_doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={{ fontSize: 16 }}
              />
            </Box>
            {formState.errors.username && (
              <Text variant="caption" color="sunsetOrange">
                {formState.errors.username.message}
              </Text>
            )}
          </Box>
        )}
      />

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
