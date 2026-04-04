import apiClient from "@/api/client";
import { useUploadImage } from "@/api/files/custom";
import { pitchesQueryKey } from "@/api/pitches/custom/usePitchesList";
import { useConfirmPitchUpload } from "@/api/pitches/useConfirmPitchUpload";
import { useCreatePitch } from "@/api/pitches/useCreatePitch";
import { useToast } from "@/design-system";
import type { ModelsPlacePrediction } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import * as ExpoImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { locationSelectStore } from "@/utilities/locationSelectStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddLinkSheet } from "./add-link-sheet";
import type { RecordingResult } from "./audio-pitch-sheet";
import { AudioPitchSheet } from "./audio-pitch-sheet";
import { CancelConfirmModal } from "./cancel-confirm-modal";
import { CreatePitchFormSheet } from "./create-pitch-form-sheet";

type ActiveOverlay =
  | "hidden"
  | "location"
  | "transition"
  | "create"
  | "audio"
  | "link";

const LOCATION_TO_CREATE_TRANSITION_MS = 240;

interface CreatePitchFlowSheetProps {
  tripID: string;
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreatePitchFlowSheet({
  tripID,
  visible,
  onClose,
  onCreated,
}: CreatePitchFlowSheetProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedLocation, setSelectedLocation] =
    useState<ModelsPlacePrediction | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>("hidden");

  const router = useRouter();

  const createPitch = useCreatePitch();
  const confirmUpload = useConfirmPitchUpload();
  const uploadImageMutation = useUploadImage();

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const resetDraft = useCallback(() => {
    setSelectedLocation(null);
    setTitle("");
    setDescription("");
    setRecording(null);
    setImageUri(null);
    setLinks([]);
    setIsSubmitting(false);
    setCancelModalVisible(false);
  }, []);

  const closeFlow = useCallback(() => {
    clearCloseTimer();
    clearTransitionTimer();
    setActiveOverlay("hidden");
    resetDraft();
    onClose();
  }, [onClose, clearCloseTimer, clearTransitionTimer, resetDraft]);

  const handleSelectLocation = useCallback(
    (prediction: ModelsPlacePrediction) => {
      clearTransitionTimer();
      setSelectedLocation(prediction);
      setTitle(prediction.description ?? prediction.main_text ?? "");
      setActiveOverlay("transition");

      transitionTimerRef.current = setTimeout(() => {
        setActiveOverlay("create");
        transitionTimerRef.current = null;
      }, LOCATION_TO_CREATE_TRANSITION_MS);
    },
    [clearTransitionTimer],
  );

  useEffect(() => {
    if (!visible) {
      clearTransitionTimer();
      setActiveOverlay("hidden");
      setCancelModalVisible(false);
      locationSelectStore.clear();
      return;
    }
    setActiveOverlay("location");
  }, [visible, clearTransitionTimer]);

  useEffect(() => {
    if (!visible || activeOverlay !== "location") return;
    locationSelectStore.set(
      (prediction) => handleSelectLocation(prediction),
      () => closeFlow(),
    );
    router.push(`/trips/${tripID}/search-location?mode=select`);
  }, [visible, activeOverlay, closeFlow, handleSelectLocation, router, tripID]);

  useEffect(() => {
    return () => {
      clearTransitionTimer();
      clearCloseTimer();
    };
  }, [clearTransitionTimer, clearCloseTimer]);

  const selectedLocationLabel =
    selectedLocation?.description ??
    selectedLocation?.main_text ??
    selectedLocation?.secondary_text ??
    "";

  const pickImage = async () => {
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
      setImageUri(asset.uri);
    }
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      Alert.alert("Required", "Please select a location.");
      setActiveOverlay("location");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }
    if (!recording) {
      Alert.alert("Required", "Please record your pitch audio.");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageIds: string[] = [];
      if (imageUri) {
        const res = await uploadImageMutation.mutateAsync({
          uri: imageUri,
          sizes: ["medium"],
        });
        imageIds.push(res.imageId);
      }

      const created = await createPitch.mutateAsync({
        tripID,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          content_length: recording.contentLength,
          content_type: recording.contentType,
          image_ids: imageIds,
        },
      });

      const pitchID = created.pitch?.id;
      const uploadUrl = created.upload_url;
      if (!pitchID || !uploadUrl) {
        throw new Error("Missing pitch ID or upload URL");
      }

      const audioBlob = await fetch(recording.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": recording.contentType },
        body: audioBlob,
      });
      if (!uploadRes.ok) {
        throw new Error("Audio upload failed");
      }

      await confirmUpload.mutateAsync({ tripID, pitchID });

      for (const url of links) {
        await apiClient({
          method: "POST",
          url: `/api/v1/trips/${tripID}/pitches/${pitchID}/links`,
          data: { url },
        }).catch(() => {});
      }

      await queryClient.invalidateQueries({
        queryKey: pitchesQueryKey(tripID),
      });
      toast.show({ message: "Pitch created." });
      setActiveOverlay("transition");
      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => {
        closeFlow();
        onCreated?.();
      }, 280);
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const hasLocation = !!selectedLocation;
  const showCreateSheet =
    visible && hasLocation && activeOverlay === "create" && !cancelModalVisible;

  return (
    <>
      {hasLocation && (
        <CreatePitchFormSheet
          key={selectedLocationLabel}
          visible={showCreateSheet}
          insetsBottom={insets.bottom}
          selectedLocationLabel={selectedLocationLabel}
          title={title}
          description={description}
          imageUri={imageUri}
          recording={recording}
          links={links}
          isSubmitting={isSubmitting}
          onPickImage={pickImage}
          onRemoveImage={() => setImageUri(null)}
          onChangeLocation={() => setActiveOverlay("location")}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
          onOpenAudio={() => setActiveOverlay("audio")}
          onOpenLinks={() => setActiveOverlay("link")}
          onRemoveLink={removeLink}
          onSubmit={handleSubmit}
          onCancel={() => setCancelModalVisible(true)}
        />
      )}

      <AudioPitchSheet
        visible={visible && activeOverlay === "audio"}
        onClose={() => setActiveOverlay("create")}
        onSave={(result) => {
          setRecording(result);
          setActiveOverlay("create");
        }}
        existing={recording}
      />

      {visible && activeOverlay === "link" && (
        <AddLinkSheet
          onClose={() => setActiveOverlay("create")}
          onAdd={(url) => {
            setLinks((prev) => [...prev, url]);
            setActiveOverlay("create");
          }}
        />
      )}

      <CancelConfirmModal
        visible={cancelModalVisible}
        pitchTitle={title}
        onKeep={() => setCancelModalVisible(false)}
        onDelete={closeFlow}
      />
    </>
  );
}
