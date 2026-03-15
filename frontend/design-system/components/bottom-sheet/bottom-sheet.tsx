import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Portal } from "@gorhom/portal";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { Keyboard } from "react-native";

interface BottomSheetModalProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
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
      footer,
      snapPoints = ["80%", "95%"],
      initialIndex = -1,
      onClose,
      disableClose = false,
    },
    ref,
  ) => {
    const innerRef = useRef<BottomSheet>(null);
    const currentIndex = useRef(initialIndex);

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

    const handleChange = useCallback(
      (index: number) => {
        currentIndex.current = index;
        onChange?.(index);
      },
      [onChange],
    );

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

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) =>
        footer ? (
          <BottomSheetFooter {...props} bottomInset={0}>
            {footer}
          </BottomSheetFooter>
        ) : null,
      [footer],
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
          footerComponent={footer ? renderFooter : undefined}
          enableDynamicSizing={false}
          enablePanDownToClose={!disableClose}
          enableHandlePanningGesture={!disableClose}
          onClose={handleClose}
          style={{ flex: 1, zIndex: 9999 }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: footer ? 100 : 40 }}
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
