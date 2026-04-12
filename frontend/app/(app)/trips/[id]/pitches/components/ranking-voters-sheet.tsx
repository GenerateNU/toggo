import { Avatar, Box, Icon, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import type { ModelsVoterInfo } from "@/types/types.gen";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { X } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable } from "react-native";

interface RankingVotersSheetProps {
  visible: boolean;
  onClose: () => void;
  choiceLabel: string;
  choiceCount: number;
  pitchTitle?: string;
  voters: ModelsVoterInfo[];
  isLoading?: boolean;
}

export function RankingVotersSheet({
  visible,
  onClose,
  choiceLabel,
  choiceCount,
  pitchTitle,
  voters,
  isLoading = false,
}: RankingVotersSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const votedUsers = voters.filter((voter) => voter.has_voted);

  return (
    <BottomSheetComponent
      ref={sheetRef}
      initialIndex={-1}
      snapPoints={["46%"]}
      onClose={onClose}
      hideHandle={true}
    >
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="sm" gap="sm">
        <Box
          alignItems="center"
          justifyContent="center"
          style={{ minHeight: 24, position: "relative" }}
        >
          <Text variant="bodySmStrong" color="gray900" textAlign="center">
            {choiceLabel} ({choiceCount}{" "}
            {choiceCount === 1 ? "person" : "people"})
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={{ position: "absolute", right: 0 }}
          >
            <Icon icon={X} size="sm" color="gray500" />
          </Pressable>
        </Box>

        <Box width="100%" alignItems="flex-start" justifyContent="center">
          <Text
            variant="bodySmDefault"
            color="gray500"
            numberOfLines={1}
            style={{
              width: "100%",
              textAlign: "left",
              writingDirection: "ltr",
              alignSelf: "flex-start",
            }}
          >
            {pitchTitle ? pitchTitle + ":" : "Location"}
          </Text>
        </Box>

        <Box gap="sm" paddingTop="xxs">
          {isLoading ? (
            <Box paddingVertical="sm" alignItems="center">
              <ActivityIndicator />
            </Box>
          ) : votedUsers.length > 0 ? (
            votedUsers.map((voter) => (
              <Box
                key={voter.user_id ?? voter.username ?? voter.name}
                flexDirection="row"
                alignItems="center"
                gap="xs"
                paddingHorizontal="sm"
              >
                <Avatar
                  profilePhoto={undefined}
                  seed={voter.user_id}
                  variant="md"
                />
                <Text variant="bodyDefault" color="gray900" numberOfLines={1}>
                  {voter.name ?? voter.username ?? "Unknown user"}
                </Text>
              </Box>
            ))
          ) : (
            <Text variant="bodySmDefault" color="gray500">
              No voter data available.
            </Text>
          )}
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}
