import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { TextInput, ActivityIndicator, TouchableOpacity } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { Button } from "@/design-system/base/button";

const REGISTER_SCHEMA = z
  .object({
    email: z.string().email({ message: "Invalid email" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormData = z.infer<typeof REGISTER_SCHEMA>;

interface RegisterFormProps {
  onSubmit: (email: string, password: string) => Promise<string | null>;
  isPending: boolean;
}

export function RegisterForm({ onSubmit, isPending }: RegisterFormProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(REGISTER_SCHEMA),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleFormSubmit = async (data: RegisterFormData) => {
    setError(null);
    const err = await onSubmit(data.email, data.password);
    if (err) {
      setError(err);
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
        name="email"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Email
            </Text>
            <Box
              borderWidth={1}
              borderColor={errors.email ? "sunsetOrange" : "mountainGray"}
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ fontSize: 16 }}
              />
            </Box>
            {errors.email && (
              <Text variant="caption" color="sunsetOrange">
                {errors.email.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Password
            </Text>
            <Box
              borderWidth={1}
              borderColor={errors.password ? "sunsetOrange" : "mountainGray"}
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                style={{ fontSize: 16 }}
              />
            </Box>
            {errors.password && (
              <Text variant="caption" color="sunsetOrange">
                {errors.password.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Box gap="xs">
            <Text variant="caption" color="forestGreen">
              Confirm Password
            </Text>
            <Box
              borderWidth={1}
              borderColor={
                errors.confirmPassword ? "sunsetOrange" : "mountainGray"
              }
              borderRadius="s"
              padding="s"
              backgroundColor="cloudWhite"
            >
              <TextInput
                placeholder="Confirm your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                style={{ fontSize: 16 }}
              />
            </Box>
            {errors.confirmPassword && (
              <Text variant="caption" color="sunsetOrange">
                {errors.confirmPassword.message}
              </Text>
            )}
          </Box>
        )}
      />

      <Button
        onPress={handleSubmit(handleFormSubmit)}
        disabled={isPending || !isValid}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text variant="bodyBold" color="cloudWhite">
            Register
          </Text>
        )}
      </Button>
    </Box>
  );
}
