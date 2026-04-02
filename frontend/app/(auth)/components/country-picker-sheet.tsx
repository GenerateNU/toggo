import { TextField } from "@/design-system";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet } from "react-native";
import {
  Country,
  CountryCode,
  FlagType,
  getAllCountries,
} from "react-native-country-picker-modal";

export type CountryItem = {
  cca2: CountryCode;
  name: string;
  callingCode: string;
  flagEmoji: string;
};

const PRIORITY_CODES: CountryCode[] = ["US", "GB"];

function toFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function toCountryItem(country: Country): CountryItem | null {
  const name =
    typeof country.name === "string" ? country.name : country.name.common;
  const callingCode = country.callingCode?.[0];
  if (!name || !callingCode) return null;
  return {
    cca2: country.cca2,
    name,
    callingCode: `+${callingCode}`,
    flagEmoji: toFlagEmoji(country.cca2),
  };
}

interface CountryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryItem) => void;
  selectedCode: CountryCode;
}

export default function CountryPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedCode,
}: CountryPickerSheetProps) {
  const [allCountries, setAllCountries] = useState<CountryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllCountries(FlagType.EMOJI, "common").then((raw) => {
      const items = raw.flatMap((c) => {
        const item = toCountryItem(c);
        return item ? [item] : [];
      });

      const priority = PRIORITY_CODES.flatMap((code) => {
        const found = items.find((i) => i.cca2 === code);
        return found ? [found] : [];
      });
      const rest = items
        .filter((i) => !PRIORITY_CODES.includes(i.cca2))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAllCountries([...priority, ...rest]);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCountries;
    return allCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.callingCode.includes(q),
    );
  }, [search, allCountries]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box flex={1} backgroundColor="backgroundCard">
          {/* Header */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal="md"
            paddingTop="md"
            paddingBottom="sm"
          >
            <Text variant="headingSm">Country</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#000" />
            </Pressable>
          </Box>

          {/* Search */}
          <Box paddingHorizontal="md" paddingBottom="sm">
            <TextField
              placeholder="Search for a country"
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={16} color="#aaa" />}
              autoCapitalize="none"
            />
          </Box>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.cca2}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  paddingHorizontal="md"
                  paddingVertical="xs"
                  style={
                    item.cca2 === selectedCode ? styles.selectedRow : undefined
                  }
                >
                  <Text variant="bodyDefault" style={styles.flag}>
                    {item.flagEmoji}
                  </Text>
                  <Text variant="bodyDefault" color="textInverse" style={[styles.countryName, styles.alignedText]}>
                    {item.name}
                  </Text>
                  <Text variant="bodyDefault" color="textSubtle" style={styles.alignedText}>
                    {item.callingCode}
                  </Text>
                </Box>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <Box style={styles.separator} backgroundColor="borderSubtle" />
            )}
          />
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: 16,
  },
  flag: {
    fontSize: 22,
    lineHeight: 28,
    marginRight: 12,
    includeFontPadding: false,
  },
  countryName: {
    flex: 1,
  },
  selectedRow: {
    backgroundColor: "#f0f0f0",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  alignedText: {
    lineHeight: 20,
  },
});
