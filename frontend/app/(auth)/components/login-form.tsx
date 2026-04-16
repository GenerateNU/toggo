import { useUser } from "@/contexts/user";
import { Box, Button, Icon, Text, TextField } from "@/design-system";
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
  TouchableWithoutFeedback,
} from "react-native";
import { CountryCode } from "react-native-country-picker-modal";
import { z } from "zod";
import CountryPickerSheet, { CountryItem } from "./country-picker-sheet";

const PHONE_SCHEMA = z.object({
  phone: z.string().min(6, "Enter valid phone"),
});

type PhoneFormData = z.infer<typeof PHONE_SCHEMA>;

const DEFAULT_COUNTRY: CountryItem = {
  cca2: "US",
  name: "United States",
  callingCode: "+1",
  flagEmoji: "🇺🇸",
};

export default function PhoneNumberForm() {
  const { sendOTP, isPending } = useUser();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryItem>(DEFAULT_COUNTRY);

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
    <>
      <CountryPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedCountry}
        selectedCode={selectedCountry.cca2 as CountryCode}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={210}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Box flex={1} justifyContent="space-between">
            <Box gap="md">
              {error && (
                <Box
                  backgroundColor="statusError"
                  padding="xs"
                  borderRadius="sm"
                >
                  <Text variant="bodyXsDefault" color="white">
                    {error}
                  </Text>
                </Box>
              )}

              <Box flexDirection="row" gap="xs" alignItems="flex-start">
                <Pressable onPress={() => setPickerVisible(true)}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    paddingHorizontal="xs"
                    borderWidth={1}
                    borderColor="gray300"
                    borderRadius="md"
                    backgroundColor="white"
                    gap="xxs"
                    style={{ height: 48 }}
                  >
                    <Text variant="bodyDefault" style={{ lineHeight: 20 }}>
                      {selectedCountry.flagEmoji}
                    </Text>
                    <Icon icon={ChevronDown} size="xs" color="gray300" />
                  </Box>
                </Pressable>

                <Box flex={1}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field: { onChange, value, onBlur } }) => (
                      <TextField
                        placeholder="(000) 000-0000"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        error={formState.errors.phone?.message}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

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
    </>
  );
}
