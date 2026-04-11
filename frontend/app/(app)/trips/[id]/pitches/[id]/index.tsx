import apiClient from "@/api/client";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useUploadImage } from "@/api/files/custom";
import { pitchesQueryKey } from "@/api/pitches/custom/usePitchesList";
import { useDeletePitch } from "@/api/pitches/useDeletePitch";
import { getPitchQueryKey, useGetPitch } from "@/api/pitches/useGetPitch";
import { useUpdatePitch } from "@/api/pitches/useUpdatePitch";
import { useUser } from "@/contexts/user";
import { Avatar, Box, Icon, Text, useToast } from "@/design-system";
import AvatarStack from "@/design-system/components/avatars/avatar-stack";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsPitchLink } from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle, MoreHorizontal } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PitchContentSections } from "../components/pitch-content-sections";
import { AddLinkSheet } from "../creation/components/add-link-sheet";
import type { RecordingResult } from "../creation/components/audio-pitch-sheet";
import { CreatePitchFormSheet } from "../creation/components/create-pitch-form-sheet";
import { AudioPlayerSheet } from "./components/audio-player-sheet";
import { PitchOwnerMenu } from "./components/pitch-owner-menu";

interface EditableLinkDraft {
  id?: string;
  url: string;
}

export default function PitchDetail() {
  const { id: pitchID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();
  const { data: pitch, isLoading } = useGetPitch(tripID!, pitchID!);
  const { currentUser } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const updatePitch = useUpdatePitch();
  const deletePitch = useDeletePitch();
  const uploadImageMutation = useUploadImage();
  const [commentSectionVisible, setCommentSectionVisible] = useState(false);
  const [audioSheetVisible, setAudioSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [addLinkSheetVisible, setAddLinkSheetVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<EditableLinkDraft[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID: tripID!,
    entityType: modelsEntityType.PitchEntity,
    entityID: pitchID!,
    enabled: !!pitchID && !!tripID,
  });

  const commenters = useMemo(() => {
    const seen = new Set<string>();
    return comments
      .filter((c) => {
        const key = c.authorSeed ?? c.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => ({
        userId: c.authorSeed ?? c.id,
        profilePhotoUrl: c.authorAvatar,
        username: c.authorName,
      }));
  }, [comments]);

  const coverImage = pitch?.images?.[0]?.medium_url;
  const isOwner = !!currentUser?.id && currentUser.id === pitch?.user_id;
  const existingAudioDraft = useMemo<RecordingResult | null>(() => {
    if (!pitch?.audio_url) return null;
    const durationSeconds = pitch.duration ?? 0;
    return {
      uri: pitch.audio_url,
      durationSeconds,
      durationMs: durationSeconds * 1000,
      contentType: "audio/mpeg",
      contentLength: 1,
    };
  }, [pitch?.audio_url, pitch?.duration]);

  const openEditPitch = () => {
    if (!pitch) return;
    setOwnerMenuVisible(false);
    setEditTitle(pitch.title ?? "");
    setEditDescription(pitch.description ?? "");
    setEditImageUri(pitch.images?.[0]?.medium_url ?? null);
    setEditLinks(
      (pitch.links ?? [])
        .filter((link): link is ModelsPitchLink & { url: string } => !!link.url)
        .map((link) => ({ id: link.id, url: link.url! })),
    );
    setEditSheetVisible(true);
  };

  const handleDeletePitch = async () => {
    if (!tripID || !pitchID) return;
    try {
      await deletePitch.mutateAsync({ tripID, pitchID });
      await queryClient.invalidateQueries({
        queryKey: pitchesQueryKey(tripID),
      });
      toast.show({ message: "Pitch deleted." });
      router.back();
    } catch {
      Alert.alert("Error", "Unable to delete this pitch right now.");
    }
  };

  const openOwnerMenu = () => {
    if (!isOwner) return;
    setOwnerMenuVisible((prev) => !prev);
  };

  const handleDeleteFromMenu = () => {
    setOwnerMenuVisible(false);
    Alert.alert("Delete pitch", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          handleDeletePitch();
        },
      },
    ]);
  };

  const pickEditImage = async () => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access in settings.",
      );
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setEditImageUri(asset.uri);
    }
  };

  const handleSavePitchEdits = async () => {
    if (!pitch || !tripID || !pitchID) return;

    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }

    setIsSavingEdit(true);
    try {
      let imageIDs: string[] | undefined;
      const currentImageUrl = pitch.images?.[0]?.medium_url ?? null;

      if (editImageUri === null) {
        imageIDs = [];
      } else if (editImageUri !== currentImageUrl) {
        if (editImageUri.startsWith("file://")) {
          const uploaded = await uploadImageMutation.mutateAsync({
            uri: editImageUri,
            sizes: ["medium"],
          });
          imageIDs = [uploaded.imageId];
        }
      }

      await updatePitch.mutateAsync({
        tripID,
        pitchID,
        data: {
          title: nextTitle,
          description: editDescription.trim(),
          image_ids: imageIDs,
        },
      });

      const existingLinkIDs = (pitch.links ?? [])
        .map((link) => link.id)
        .filter((id): id is string => !!id);

      for (const linkID of existingLinkIDs) {
        await apiClient({
          method: "DELETE",
          url: `/api/v1/trips/${tripID}/pitches/${pitchID}/links/${linkID}`,
        });
      }

      for (const link of editLinks) {
        await apiClient({
          method: "POST",
          url: `/api/v1/trips/${tripID}/pitches/${pitchID}/links`,
          data: { url: link.url },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: getPitchQueryKey(tripID, pitchID),
      });
      await queryClient.invalidateQueries({
        queryKey: pitchesQueryKey(tripID),
      });

      setEditSheetVisible(false);
      setAddLinkSheetVisible(false);
      toast.show({ message: "Pitch updated." });
    } catch {
      Alert.alert("Error", "Unable to update this pitch right now.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
        <Stack.Screen options={{ headerTitle: "Pitch" }} />
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
      <Stack.Screen
        options={{
          headerTitle: pitch?.title ?? "Pitch",
          headerRight: isOwner
            ? () => (
                <Pressable onPress={openOwnerMenu} hitSlop={8}>
                  <MoreHorizontal size={20} color={ColorPalette.gray900} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Box paddingHorizontal="sm" paddingTop="sm">
          <Box borderRadius="xl" overflow="hidden">
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <Box style={styles.coverPlaceholder} backgroundColor="gray100" />
            )}
          </Box>
        </Box>

        <Box backgroundColor="white" padding="sm" gap="sm">
          <Box gap="xs">
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Avatar
                profilePhoto={pitch?.profile_picture_url}
                seed={pitch?.user_id}
                variant="md"
              />
              <Text
                variant="headingMd"
                color="gray900"
                style={{ flex: 1 }}
                numberOfLines={2}
              >
                {pitch?.title}
              </Text>
            </Box>

            {pitch?.description ? (
              <Text variant="bodySmDefault" color="gray700">
                {pitch.description}
              </Text>
            ) : null}
          </Box>

          <PitchContentSections
            audioUrl={pitch?.audio_url}
            audioPitchId={pitch?.id ?? ""}
            onPlayAudio={
              pitch?.audio_url ? () => setAudioSheetVisible(true) : undefined
            }
            links={(pitch?.links ?? []).map((link) => ({
              id: link.id ?? `${link.url ?? "link"}`,
              url: link.url,
              title: link.title,
              domain: link.domain,
              thumbnailUrl: link.thumbnail_url,
            }))}
          />

          <Pressable onPress={() => setCommentSectionVisible(true)}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              {commenters.length > 0 ? (
                <AvatarStack
                  members={commenters}
                  maxVisible={3}
                  showName={false}
                />
              ) : (
                <Icon icon={MessageCircle} size="xs" color="gray400" />
              )}
              <Text variant="bodyXsDefault" color="gray500">
                {comments.length === 0
                  ? "No comments yet"
                  : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
              </Text>
            </Box>
          </Pressable>
        </Box>
      </ScrollView>

      {!commentSectionVisible && (
        <Pressable
          onPress={() => setCommentSectionVisible(true)}
          style={[
            styles.commentsPeek,
            { bottom: -Math.max(insets.bottom - 12, 0) },
          ]}
        >
          <Box style={styles.commentsPeekHandle} />
          <Text variant="bodySmStrong" color="gray900">
            Comments
          </Text>
        </Pressable>
      )}

      <CommentSection
        visible={commentSectionVisible}
        onClose={() => setCommentSectionVisible(false)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.name ?? ""}
        currentUserAvatar={currentUser?.profile_picture}
        currentUserSeed={currentUser?.id}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />

      {pitch?.audio_url ? (
        <AudioPlayerSheet
          visible={audioSheetVisible}
          onClose={() => setAudioSheetVisible(false)}
          audioUrl={pitch.audio_url}
          pitchId={pitch.id ?? ""}
          name={pitch.name}
          profilePictureUrl={pitch.profile_picture_url}
          userId={pitch.user_id}
        />
      ) : null}

      <CreatePitchFormSheet
        visible={editSheetVisible}
        insetsBottom={insets.bottom}
        selectedLocationLabel={editTitle}
        title={editTitle}
        description={editDescription}
        imageUri={editImageUri}
        recording={existingAudioDraft}
        links={editLinks.map((link) => link.url)}
        isSubmitting={isSavingEdit}
        onPickImage={pickEditImage}
        onRemoveImage={() => setEditImageUri(null)}
        onChangeLocation={() => {}}
        onChangeTitle={setEditTitle}
        onChangeDescription={setEditDescription}
        onOpenAudio={() => {}}
        onOpenLinks={() => setAddLinkSheetVisible(true)}
        onRemoveLink={(index) => {
          setEditLinks((prev) => prev.filter((_, i) => i !== index));
        }}
        onSubmit={handleSavePitchEdits}
        onCancel={() => {
          setEditSheetVisible(false);
          setAddLinkSheetVisible(false);
        }}
        formTitle="Edit pitch"
        submitLabel="Save changes"
        requireRecordingForSubmit={false}
        locationEditable={false}
        audioEditable={false}
      />

      {addLinkSheetVisible && (
        <AddLinkSheet
          onClose={() => setAddLinkSheetVisible(false)}
          onAdd={(url) => {
            setEditLinks((prev) => [...prev, { url }]);
          }}
        />
      )}

      <PitchOwnerMenu
        visible={ownerMenuVisible}
        topInset={insets.top}
        onClose={() => setOwnerMenuVisible(false)}
        onEdit={openEditPitch}
        onDelete={handleDeleteFromMenu}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  coverImage: {
    width: "100%",
    height: 240,
  },
  coverPlaceholder: {
    width: "100%",
    height: 240,
  },
  commentsPeek: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 74,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  commentsPeekHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.gray300,
    marginBottom: 10,
  },
});
