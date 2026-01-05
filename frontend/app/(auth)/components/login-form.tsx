import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { TextInput, ActivityIndicator } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { Button } from "@/design-system/base/button";

const LOGIN_SCHEMA = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(1, { message: "Password required" }),
});

type LoginFormData = z.infer<typeof LOGIN_SCHEMA>;

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<string | null>;
  isPending: boolean;
}

export function LoginForm({ onSubmit, isPending }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LOGIN_SCHEMA),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = async (data: LoginFormData) => {
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

      <Button
        onPress={handleSubmit(handleFormSubmit)}
        disabled={!isValid}
        variant="secondary"
      >
        {isPending ? (
          <ActivityIndicator color="cloudWhite" />
        ) : (
          <Text variant="caption" color="cloudWhite">
            Login
          </Text>
        )}
      </Button>
    </Box>
  );
}
