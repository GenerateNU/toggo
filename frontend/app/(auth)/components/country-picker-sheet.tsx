import { Divider, ErrorState, Icon, TextField } from "@/design-system";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable } from "react-native";
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

interface CountryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryItem) => void;
  selectedCode: CountryCode;
}

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

function SheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="sm"
      paddingTop="md"
      paddingBottom="sm"
    >
      <Text variant="headingSm">Country</Text>
      <Box position="absolute" right={Layout.spacing.md}>
        <Pressable onPress={onClose}>
          <Icon icon={X} size="xs" color="gray900" />
        </Pressable>
      </Box>
    </Box>
  );
}

function CountryRow({
  item,
  isSelected,
  onPress,
}: {
  item: CountryItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="sm"
        paddingVertical="xs"
        backgroundColor={isSelected ? "gray50" : undefined}
      >
        <Text
          variant="bodyDefault"
          marginRight="sm"
          style={{ fontSize: 22, lineHeight: 28, includeFontPadding: false }}
        >
          {item.flagEmoji}
        </Text>
        <Box flex={1}>
          <Text
            variant="bodyDefault"
            color="gray900"
            style={{ lineHeight: 20 }}
          >
            {item.name}
          </Text>
        </Box>
        <Text variant="bodyDefault" color="gray500" style={{ lineHeight: 20 }}>
          {item.callingCode}
        </Text>
      </Box>
    </Pressable>
  );
}

function RowSeparator() {
  return (
    <Divider
      color={ColorPalette.gray100}
      style={{ marginVertical: 0, marginLeft: 52 }}
    />
  );
}

export default function CountryPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedCode,
}: CountryPickerSheetProps) {
  const [allCountries, setAllCountries] = useState<CountryItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllCountries(FlagType.EMOJI, "common")
      .then((raw) => {
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
      })
      .catch(() => setLoadError(true));
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
      <Box flex={1} backgroundColor="white">
        <SheetHeader onClose={onClose} />

        {loadError ? (
          <Box
            flex={1}
            padding="lg"
            justifyContent="center"
            alignItems="center"
          >
            <ErrorState
              isBottomSheet
              title="Couldn't load countries"
              description="Something went wrong loading the country list. Please try again."
            />
          </Box>
        ) : (
          <>
            <Box paddingHorizontal="sm" paddingBottom="sm">
              <TextField
                placeholder="Search for a country"
                value={search}
                onChangeText={setSearch}
                leftIcon={<Search size={16} color={ColorPalette.gray500} />}
                autoCapitalize="none"
              />
            </Box>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.cca2}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <CountryRow
                  item={item}
                  isSelected={item.cca2 === selectedCode}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                />
              )}
              ItemSeparatorComponent={RowSeparator}
            />
          </>
        )}
      </Box>
    </Modal>
  );
}
