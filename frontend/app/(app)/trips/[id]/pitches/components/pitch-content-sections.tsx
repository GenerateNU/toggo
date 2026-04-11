import { Box, Divider, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Image } from "expo-image";
import { ChevronRight, ExternalLink, X } from "lucide-react-native";
import { Linking, Platform, Pressable, StyleSheet } from "react-native";
import { InlineAudioPlayer } from "./inline-audio-player";

export interface PitchContentLink {
  id: string;
  url?: string | null;
  title?: string | null;
  domain?: string | null;
  thumbnailUrl?: string | null;
  onRemove?: () => void;
}

interface PitchContentSectionsProps {
  audioUrl?: string | null;
  audioPitchId?: string;
  onPlayAudio?: () => void;
  onEditAudio?: () => void;
  audioEditLabel?: string;
  links?: PitchContentLink[];
  onAddMoreLinks?: () => void;
  addMoreLinksLabel?: string;
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

function LinkCard({ link }: { link: PitchContentLink }) {
  const content = (
    <Box borderRadius="md" overflow="hidden" backgroundColor="gray50">
      {link.thumbnailUrl ? (
        <Box paddingHorizontal="xs" paddingTop="xs" marginBottom="xs">
          <Box borderRadius="md" overflow="hidden">
            <Image
              source={{ uri: link.thumbnailUrl }}
              style={styles.linkThumb}
              contentFit="cover"
            />
          </Box>
        </Box>
      ) : null}
      <Box padding="sm" flexDirection="row" alignItems="center" gap="xs">
        <ExternalLink size={14} color={ColorPalette.gray500} />
        <Box flex={1}>
          <Text variant="bodyXsMedium" color="gray900" numberOfLines={1}>
            {link.title ?? link.domain ?? link.url ?? "Link"}
          </Text>
          {link.domain ? (
            <Text variant="bodyXsDefault" color="gray500" numberOfLines={1}>
              {link.domain}
            </Text>
          ) : null}
        </Box>
        {link.onRemove ? (
          <Pressable onPress={link.onRemove} hitSlop={8}>
            <X size={14} color={ColorPalette.gray400} />
          </Pressable>
        ) : null}
      </Box>
    </Box>
  );

  if (!link.url || link.onRemove) {
    return content;
  }

  return (
    <Pressable
      onPress={() => Linking.openURL(link.url!)}
      style={({ pressed }) => [
        styles.linkCardPressable,
        pressed && Platform.OS !== "android" ? styles.linkCardPressed : null,
      ]}
      android_ripple={{ color: ColorPalette.gray100 }}
      hitSlop={4}
    >
      {content}
    </Pressable>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between">
      <Text variant="bodySmMedium" color="gray900">
        {title}
      </Text>
      {onActionPress && actionLabel ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={8}
          style={({ pressed }) => [pressed ? styles.headerActionPressed : null]}
        >
          <Box flexDirection="row" alignItems="center" gap="xxs">
            <Text variant="bodySmMedium" color="blue500">
              {actionLabel}
            </Text>
            <ChevronRight size={14} color={ColorPalette.blue500} />
          </Box>
        </Pressable>
      ) : null}
    </Box>
  );
}

export function PitchContentSections({
  audioUrl,
  audioPitchId,
  onPlayAudio,
  onEditAudio,
  audioEditLabel = "Edit",
  links = [],
  onAddMoreLinks,
  addMoreLinksLabel = "Add more",
}: PitchContentSectionsProps) {
  const hasLinks = links.length > 0;

  return (
    <>
      {audioUrl ? (
        <Box gap="xs">
          <Divider color={ColorPalette.gray100} />
          <SectionHeader
            title="Audio Pitch"
            actionLabel={onEditAudio ? audioEditLabel : undefined}
            onActionPress={onEditAudio}
          />
          <InlineAudioPlayer
            audioUrl={audioUrl}
            pitchId={audioPitchId ?? ""}
            onPlayPress={onPlayAudio}
          />
        </Box>
      ) : null}

      {hasLinks ? (
        <Box gap="xs">
          <Divider color={ColorPalette.gray100} />
          <SectionHeader
            title="Helpful Links"
            actionLabel={onAddMoreLinks ? addMoreLinksLabel : undefined}
            onActionPress={onAddMoreLinks}
          />

          {links.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </Box>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  linkThumb: {
    width: "100%",
    height: 140,
  },
  linkCardPressable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  linkCardPressed: {
    opacity: 0.85,
  },
  headerActionPressed: {
    opacity: 0.75,
  },
});
