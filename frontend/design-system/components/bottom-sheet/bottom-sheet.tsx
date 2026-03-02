import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Portal } from "@gorhom/portal";
import React, { forwardRef, useCallback } from "react";
import { Keyboard } from "react-native";

interface BottomSheetModalProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  onClose?: () => void;
  scrollEnabled?: boolean;
  onChange?: (index: number) => void;
  disableClose?: boolean;
}

type Ref = BottomSheetMethods;

const BottomSheetModal = forwardRef<Ref, BottomSheetModalProps>(
  (
    {
      onChange,
      children,
      snapPoints = ["70%", "95%"],
      initialIndex = -1,
      onClose,
      disableClose = false,
    },
    ref,
  ) => {
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior={disableClose ? "none" : "close"}
        />
      ),
      [disableClose],
    );

    const handleClose = useCallback(() => {
      Keyboard.dismiss();
      if (onClose) {
        onClose();
      }
    }, [onClose]);

    return (
      <Portal>
        <BottomSheet
          onChange={onChange}
          ref={ref}
          index={initialIndex}
          snapPoints={snapPoints}
          backdropComponent={renderBackdrop}
          enableDynamicSizing={false}
          enablePanDownToClose={!disableClose}
          enableHandlePanningGesture={!disableClose}
          keyboardBlurBehavior="none"
          keyboardBehavior="extend"
          enableBlurKeyboardOnGesture={false}
          onClose={handleClose}
          style={{
            flex: 1,
            zIndex: 9999,
          }}
        >
          <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
        </BottomSheet>
      </Portal>
    );
  },
);

BottomSheetModal.displayName = "BottomSheetModal";

export default BottomSheetModal;
