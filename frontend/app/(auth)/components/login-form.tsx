import { useUser } from "@/contexts/user";
import { Box, Button, Icon, Text } from "@/design-system";
import { normalizePhone } from "@/utilities/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";
import CountryPicker, { CountryCode } from "react-native-country-picker-modal";
import { z } from "zod";

const PHONE_SCHEMA = z.object({
  phone: z.string().min(6, "Enter valid phone"),
});

type PhoneFormData = z.infer<typeof PHONE_SCHEMA>;

export default function PhoneNumberForm() {
  const { sendOTP, isPending } = useUser();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<CountryCode>("US");
  const [pickerVisible, setPickerVisible] = useState(false);

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
        setError("Invalid phone number");
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={210} // adjust if header present
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Box flex={1} justifyContent="space-between">
          {/* Top Content */}
          <Box gap="md">
            {error && (
              <Box backgroundColor="error" padding="xs" borderRadius="sm">
                <Text variant="xsParagraph" color="white">
                  {error}
                </Text>
              </Box>
            )}

            <Box gap="xs">
              <Box
                flexDirection="row"
                borderColor={
                  formState.errors.phone ? "error" : "borderPrimary"
                }
                borderRadius="sm"
                overflow="hidden"
                backgroundColor="white"
                height={48}
                gap="xxs"
              >
                <Pressable onPress={() => setPickerVisible(true)}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    width={70}
                    height="100%"
                    borderWidth={1}
                    borderColor="borderPrimary"
                    borderRadius="sm"
                  >
                    <CountryPicker
                      countryCode={countryCode}
                      withFlag
                      withFilter
                      withEmoji={false}
                      visible={pickerVisible}
                      onClose={() => setPickerVisible(false)}
                      onSelect={(country) =>
                        setCountryCode(country.cca2)
                      }
                      containerButtonStyle={{
                        padding: 0,
                        marginBottom: 7,
                      }}
                    />
                    <Icon
                      icon={ChevronDown}
                      size="xs"
                      color="textQuaternary"
                    />
                  </Box>
                </Pressable>

                <Box
                  flex={1}
                  justifyContent="center"
                  paddingHorizontal="sm"
                  borderWidth={1}
                  borderColor="borderPrimary"
                  borderRadius="sm"
                >
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field: { onChange, value, onBlur } }) => (
                      <TextInput
                        placeholder="Phone Number"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        style={{
                          fontSize: 15,
                          height: "100%",
                        }}
                      />
                    )}
                  />
                </Box>
              </Box>

              {formState.errors.phone && (
                <Text variant="xsParagraph" color="error">
                  {formState.errors.phone.message}
                </Text>
              )}
            </Box>
          </Box>

          {/* Bottom Button */}
          <Button
            layout="textOnly"
            label="Continue"
            variant="Primary"
            loading={isPending}
            loadingLabel="Sending OTP..."
            disabled={!formState.isValid || isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </Box>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}