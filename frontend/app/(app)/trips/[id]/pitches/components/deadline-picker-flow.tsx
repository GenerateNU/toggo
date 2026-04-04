import type { TimeValue } from "@/design-system";
import { DateRangePicker, TimePicker } from "@/design-system";
import { useMemo, useRef, useState } from "react";

interface DeadlinePickerFlowProps {
  onClose: () => void;
  onSave: (date: Date) => void | Promise<void>;
}

const DEFAULT_TIME: TimeValue = { hour: 11, minute: 59, period: "PM" };

function getInitialTime(date: Date | null): TimeValue {
  if (!date) return DEFAULT_TIME;

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime) return DEFAULT_TIME;

  const hour = date.getHours();
  return {
    hour: hour % 12 === 0 ? 12 : hour % 12,
    minute: date.getMinutes(),
    period: hour < 12 ? "AM" : "PM",
  };
}

function toEndOfDay(dateInput: Date) {
  const date = new Date(dateInput);
  date.setHours(23, 59, 0, 0);
  return date;
}

function to24HourTime(time: TimeValue) {
  if (time.period === "AM") {
    return time.hour === 12 ? 0 : time.hour;
  }

  return time.hour === 12 ? 12 : time.hour + 12;
}

export function DeadlinePickerFlow({
  onClose,
  onSave,
}: DeadlinePickerFlowProps) {
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pendingDeadline, setPendingDeadline] = useState<Date | null>(null);
  const transitioningRef = useRef(false);

  const initialTime = useMemo(
    () => getInitialTime(pendingDeadline),
    [pendingDeadline],
  );

  return (
    <>
      <DateRangePicker
        visible={!timePickerVisible}
        onClose={() => {
          if (!transitioningRef.current) {
            onClose();
          }
        }}
        onSave={(range) => {
          if (!range.start) {
            setPendingDeadline(null);
            onClose();
            return;
          }
          transitioningRef.current = true;
          setPendingDeadline(toEndOfDay(range.start));
          setTimeout(() => {
            transitioningRef.current = false;
            setTimePickerVisible(true);
          }, 400);
        }}
        singleDate
        initialRange={{ start: null, end: null }}
        minDate={new Date()}
      />

      <TimePicker
        visible={timePickerVisible}
        initialTime={initialTime}
        onClose={() => {
          setTimePickerVisible(false);
          setPendingDeadline(null);
          onClose();
        }}
        onSave={(time) => {
          if (!pendingDeadline) return;
          const date = new Date(pendingDeadline);
          date.setHours(to24HourTime(time), time.minute, 0, 0);
          setTimePickerVisible(false);
          setPendingDeadline(null);
          onClose();
          onSave(date);
        }}
      />
    </>
  );
}
