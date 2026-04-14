import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Portal } from "@gorhom/portal";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Dimensions, Keyboard, Platform } from "react-native";
import { CornerRadius } from "../../tokens/corner-radius";
import { Layout } from "../../tokens/layout";

export const InsideBottomSheetContext = createContext(false);

const MAX_DYNAMIC_HEIGHT = Dimensions.get("window").height * 0.9;

interface BottomSheetModalProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Custom snap points — disables dynamic sizing when provided */
  snapPoints?: (string | number)[];
  initialIndex?: number;
  onClose?: () => void;
  onChange?: (index: number) => void;
  disableClose?: boolean;
  keyboardBehavior?: "interactive" | "extend" | "fillParent";
}

type Ref = BottomSheetMethods;

const BottomSheetModal = forwardRef<Ref, BottomSheetModalProps>(
  (
    {
      onChange,
      children,
      footer,
      snapPoints,
      initialIndex = -1,
      onClose,
      disableClose = false,
      keyboardBehavior = "interactive",
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

    useEffect(() => {
      const event =
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
      const subscription = Keyboard.addListener(event, () => {
        if (currentIndex.current >= 0) {
          innerRef.current?.snapToIndex(currentIndex.current);
        }
      });
      return () => subscription.remove();
    }, []);

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
          onChange={handleChange}
          backdropComponent={renderBackdrop}
          footerComponent={footer ? renderFooter : undefined}
          {...(snapPoints
            ? { snapPoints, enableDynamicSizing: false }
            : { enableDynamicSizing: true, maxDynamicContentSize: MAX_DYNAMIC_HEIGHT }
          )}
          keyboardBehavior={keyboardBehavior}
          enablePanDownToClose={!disableClose}
          enableHandlePanningGesture={!disableClose}
          handleComponent={null}
          onClose={handleClose}
          style={{
            flex: 1,
            zIndex: 9999,
            overflow: "hidden",
            borderTopLeftRadius: CornerRadius.xxl,
            borderTopRightRadius: CornerRadius.xxl,
          }}
          backgroundStyle={{
            borderTopLeftRadius: CornerRadius.xxl,
            borderTopRightRadius: CornerRadius.xxl,
            overflow: "hidden",
          }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: Layout.spacing.xs,
              paddingVertical: Layout.spacing.sm,
              paddingBottom: footer ? 100 : Layout.spacing.sm,
            }}
          >
            <InsideBottomSheetContext.Provider value={true}>
              {children}
            </InsideBottomSheetContext.Provider>
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  },
);

BottomSheetModal.displayName = "BottomSheetModal";

export default BottomSheetModal;
