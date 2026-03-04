import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Portal } from "@gorhom/portal";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Keyboard, Platform } from "react-native";

interface BottomSheetModalProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  onClose?: () => void;
  onChange?: (index: number) => void;
  disableClose?: boolean;
}

type Ref = BottomSheetMethods;

const BottomSheetModal = forwardRef<Ref, BottomSheetModalProps>(
  (
    {
      onChange,
      children,
      snapPoints = ["80%", "95%"],
      initialIndex = -1,
      onClose,
      disableClose = false,
    },
    ref,
  ) => {
    const innerRef = useRef<BottomSheet>(null);
    const currentIndex = useRef(initialIndex);
    const preKeyboardIndex = useRef(initialIndex);

    // Forward ref methods to the inner BottomSheet via lazy proxy
    useImperativeHandle(ref, () => ({
      snapToIndex: (...args: Parameters<BottomSheetMethods["snapToIndex"]>) =>
        innerRef.current?.snapToIndex(...args),
      snapToPosition: (
        ...args: Parameters<BottomSheetMethods["snapToPosition"]>
      ) => innerRef.current?.snapToPosition(...args),
      expand: (...args: Parameters<BottomSheetMethods["expand"]>) =>
        innerRef.current?.expand(...args),
      collapse: (...args: Parameters<BottomSheetMethods["collapse"]>) =>
        innerRef.current?.collapse(...args),
      close: (...args: Parameters<BottomSheetMethods["close"]>) =>
        innerRef.current?.close(...args),
      forceClose: (...args: Parameters<BottomSheetMethods["forceClose"]>) =>
        innerRef.current?.forceClose(...args),
    }));

    // Track current snap index
    const handleChange = useCallback(
      (index: number) => {
        currentIndex.current = index;
        onChange?.(index);
      },
      [onChange],
    );

    // Manually snap up on keyboard show, restore on hide
    useEffect(() => {
      const lastSnapIndex = snapPoints.length - 1;
      const showEvent =
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvent =
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

      const onKeyboardShow = () => {
        if (currentIndex.current >= 0 && currentIndex.current < lastSnapIndex) {
          preKeyboardIndex.current = currentIndex.current;
          innerRef.current?.snapToIndex(lastSnapIndex);
        }
      };

      const onKeyboardHide = () => {
        if (
          currentIndex.current === lastSnapIndex &&
          preKeyboardIndex.current >= 0
        ) {
          innerRef.current?.snapToIndex(preKeyboardIndex.current);
        }
      };

      const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
      const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [snapPoints]);

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
      onClose?.();
    }, [onClose]);

    return (
      <Portal>
        <BottomSheet
          ref={innerRef}
          index={initialIndex}
          snapPoints={snapPoints}
          onChange={handleChange}
          backdropComponent={renderBackdrop}
          enableDynamicSizing={false}
          enablePanDownToClose={!disableClose}
          enableHandlePanningGesture={!disableClose}
          onClose={handleClose}
          style={{ flex: 1, zIndex: 9999 }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: 40,
            }}
          >
            {children}
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  },
);

BottomSheetModal.displayName = "BottomSheetModal";

export default BottomSheetModal;
