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
  useMemo,
  useRef,
} from "react";
import { Keyboard, Platform } from "react-native";
import { CornerRadius } from "../../tokens/corner-radius";

export const InsideBottomSheetContext = createContext(false);

type BottomSheetSize = "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "full";

const SIZE_MAP: Record<BottomSheetSize, string[]> = {
  xxs: ["25%"],
  xs: ["33%"],
  sm: ["40%"],
  md: ["50%"],
  lg: ["60%"],
  xl: ["70%"],
  xxl: ["80%"],
  full: ["95%"],
};

interface BottomSheetModalProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Size variant - overrides snapPoints if provided */
  size?: BottomSheetSize;
  /** Custom snap points - ignored if size is provided */
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
      size,
      snapPoints,
      initialIndex = -1,
      onClose,
      disableClose = false,
    },
    ref,
  ) => {
    const innerRef = useRef<BottomSheet>(null);
    const currentIndex = useRef(initialIndex);

    // Determine snapPoints: size prop takes precedence, then explicit snapPoints, then default
    const resolvedSnapPoints = useMemo(
      () => (size ? SIZE_MAP[size] : snapPoints ?? ["80%", "95%"]),
      [size, snapPoints],
    );

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
        if (index >= -1 && index <= resolvedSnapPoints.length - 1) {
          currentIndex.current = index;
        }
        onChange?.(index);
      },
      [onChange, resolvedSnapPoints],
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
          snapPoints={resolvedSnapPoints}
          onChange={handleChange}
          backdropComponent={renderBackdrop}
          footerComponent={footer ? renderFooter : undefined}
          enableDynamicSizing={false}
          enablePanDownToClose={!disableClose}
          enableHandlePanningGesture={!disableClose}
          onClose={handleClose}
          style={{ flex: 1, zIndex: 9999 }}
          backgroundStyle={{
            borderTopLeftRadius: CornerRadius.xl,
            borderTopRightRadius: CornerRadius.xl,
          }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: footer ? 100 : 40 }}
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
