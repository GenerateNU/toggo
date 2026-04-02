import { useUploadProfilePicture } from "@/api/files/custom/useUploadProfilePicture";
import { useCreateUser } from "@/api/users/useCreateUser";
import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUserStore } from "@/auth/store";
import { Box, Button, Text } from "@/design-system";
import { getDeviceTimeZone } from "@/utilities/timezone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput } from "react-native";
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

interface CompleteProfileFormProps {
  profilePhotoUri?: string | null;
  onSuccess?: () => void;
}

export default function CompleteProfileForm({
  profilePhotoUri,
  onSuccess,
}: CompleteProfileFormProps) {
  const refreshCurrentUser = useUserStore((s) => s.refreshCurrentUser);
  const storePhone = useUserStore((s) => s.phoneNumber);
  const { mutateAsync: createUser } = useCreateUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: uploadProfilePicture } = useUploadProfilePicture();
  const params = useLocalSearchParams();
  const router = useRouter();
  const phone = (params.phone as string | undefined) || storePhone || undefined;

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
      const created = await createUser({
        data: {
          name: normalizedName,
          username: normalizedUsername,
          phone_number: phone,
        },
      });

      if (!created?.id) {
        throw new Error("User creation returned no ID");
      }

      let profilePictureId: string | undefined;
      if (profilePhotoUri) {
        try {
          const result = await uploadProfilePicture({ uri: profilePhotoUri });
          profilePictureId = result.imageId;
        } catch (err) {
          console.error("[profile] photo upload failed:", err);
        }
      }

      const timezone = getDeviceTimeZone();
      const updateData: Record<string, string> = {};
      if (timezone) updateData.timezone = timezone;
      if (profilePictureId) updateData.profile_picture = profilePictureId;

      if (Object.keys(updateData).length > 0) {
        await updateUser({ userID: created.id, data: updateData });
      }

      await refreshCurrentUser();
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/(app)");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Box gap="md">
      {error && (
        <Box backgroundColor="statusError" padding="sm" borderRadius="sm">
          <Text variant="bodySmDefault" color="statusError">
            {error}
          </Text>
        </Box>
      )}

      <Controller
        name="name"
        control={control}
        render={({ field: { onChange, value, onBlur } }) => (
          <Box gap="xs">
            <Text variant="bodySmMedium" color="textInverse">
              Full Name
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.name ? "statusError" : "borderDefault"
              }
              borderRadius="sm"
              padding="sm"
              backgroundColor="backgroundCard"
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
              <Text variant="bodyXsDefault" color="statusError">
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
            <Text variant="bodySmMedium" color="textInverse">
              Username
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                formState.errors.username ? "statusError" : "borderDefault"
              }
              borderRadius="sm"
              padding="sm"
              backgroundColor="backgroundCard"
            >
              <TextInput
                placeholder="john_doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ fontSize: 16 }}
              />
            </Box>
            {formState.errors.username && (
              <Text variant="bodyXsDefault" color="statusError">
                {formState.errors.username.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        layout="textOnly"
        label="Create Account"
        variant="Primary"
        loading={isSubmitting}
        loadingLabel="Creating account..."
        disabled={!formState.isValid || isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </Box>
  );
}
