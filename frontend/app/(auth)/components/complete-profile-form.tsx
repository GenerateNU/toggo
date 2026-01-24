import { useCreateUser } from "@/api/users/useCreateUser";
import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, TextInput } from "react-native";
import { z } from "zod";

const PROFILE_SCHEMA = z.object({
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
});

type ProfileFormData = z.infer<typeof PROFILE_SCHEMA>;

export function CompleteProfileForm() {
  const { refreshCurrentUser } = useUser();
  const { mutateAsync: createUser } = useCreateUser();
  const params = useLocalSearchParams();
  const router = useRouter();
  const phone = params.phone as string | undefined;

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState } = useForm<ProfileFormData>({
    resolver: zodResolver(PROFILE_SCHEMA),
    mode: "onChange",
    defaultValues: { name: "", username: "" },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setError(null);

    if (!phone) {
      setError("Missing phone number. Please restart the signup flow.");
      router.replace("/(auth)/login");
      return;
    }

    setIsSubmitting(true);

    const normalizedUsername = data.username.trim().toLowerCase();
    const normalizedName = data.name;

    try {
      await createUser({
        data: {
          name: normalizedName,
          username: normalizedUsername,
          phone_number: phone,
        },
      });

      await refreshCurrentUser();
      router.replace("/(app)");
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
      setIsSubmitting(false);
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

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={!formState.isValid || isSubmitting}
      >
        {isSubmitting ? (
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
