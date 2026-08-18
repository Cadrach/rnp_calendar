import { useEffect, useRef, useState } from "react";
import { Group, Input, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { clampDuration } from "../utils/duration";

const MAX_DIGITS = 2;

/** `"04:30"` → hours `"04"`, minutes `"30"`. Anything unparsable clears both fields. */
function splitDuration(duration: string): { hours: string; minutes: string } {
  const match = /^(\d+):([0-5]\d)$/.exec(duration);
  return match ? { hours: match[1], minutes: match[2] } : { hours: "", minutes: "" };
}

/** Both fields empty means "no duration"; either one alone counts the other as zero. */
function joinDuration(hours: string, minutes: string): string | null {
  if (hours === "" && minutes === "") return null;
  return `${(hours || "0").padStart(2, "0")}:${(minutes || "0").padStart(2, "0")}`;
}

const onlyDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, MAX_DIGITS);

interface Props {
  /** Canonical `"HH:MM"`. Hours are not capped at 24, but two typed digits stop at 99. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  /** Raised when both fields are empty, so the parent can block submit. */
  onInvalidChange?: (invalid: boolean) => void;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Advisory error from the parent, shown when the field itself is filled. */
  error?: React.ReactNode;
  /** Smallest accepted duration, `"HH:MM"`. Applied when focus leaves the pair. */
  min?: string;
  /** Largest accepted duration, `"HH:MM"`. Applied when focus leaves the pair. */
  max?: string;
}

export function DurationPicker({
  value,
  defaultValue,
  onChange,
  onInvalidChange,
  label = "Durée",
  description,
  required,
  disabled,
  error,
  min,
  max,
}: Props) {
  const [_value, handleChange] = useUncontrolled<string>({
    value: value ?? undefined,
    defaultValue: defaultValue ?? undefined,
    finalValue: "",
    onChange,
  });

  const [hours, setHours] = useState(() => splitDuration(_value).hours);
  const [minutes, setMinutes] = useState(() => splitDuration(_value).minutes);

  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  // Values we pushed out ourselves, so the sync effect can tell an external change
  // (free-slot badge, opening in edit mode) from our own commit.
  const committedRef = useRef(_value);

  useEffect(() => {
    if (_value === committedRef.current) return;
    committedRef.current = _value;
    const parts = splitDuration(_value);
    setHours(parts.hours);
    setMinutes(parts.minutes);
  }, [_value]);

  const emit = (nextHours: string, nextMinutes: string) => {
    const duration = joinDuration(nextHours, nextMinutes);
    onInvalidChange?.(duration === null);
    if (duration === null) return;
    committedRef.current = duration;
    if (duration !== _value) handleChange(duration);
  };

  const handleHours = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = onlyDigits(event.currentTarget.value);
    setHours(next);
    emit(next, minutes);
    // Hours are full: carry on into the minutes, replacing whatever is there.
    if (next.length === MAX_DIGITS) {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }
  };

  const handleMinutes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = onlyDigits(event.currentTarget.value);
    if (Number(next) > 59) return;
    setMinutes(next);
    emit(hours, next);
  };

  /** Backspacing out of empty minutes carries on deleting in the hours field. */
  const handleMinutesKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace" || minutes !== "") return;
    event.preventDefault();
    const next = hours.slice(0, -1);
    setHours(next);
    emit(next, minutes);
    hoursRef.current?.focus();
  };

  /** Tidy up and clamp only once focus leaves the pair, not when moving between them. */
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const duration = joinDuration(hours, minutes);
    if (duration === null) {
      onInvalidChange?.(true);
      return;
    }
    const parts = splitDuration(clampDuration(duration, min, max));
    setHours(parts.hours);
    setMinutes(parts.minutes);
    emit(parts.hours, parts.minutes);
  };

  const field = {
    disabled,
    inputMode: "numeric" as const,
    autoComplete: "off",
    w: 46,
    styles: { input: { textAlign: "center" as const } },
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => event.currentTarget.select(),
  };

  return (
    <Input.Wrapper
      label={label}
      description={description}
      required={required}
      error={hours === "" && minutes === "" ? "Durée requise" : error}
    >
      <Group gap={6} align="center" wrap="nowrap" onBlur={handleBlur}>
        <Input {...field} ref={hoursRef} value={hours} onChange={handleHours} placeholder="--" />
        <Text>:</Text>
        <Input
          {...field}
          ref={minutesRef}
          value={minutes}
          onChange={handleMinutes}
          onKeyDown={handleMinutesKeyDown}
          placeholder="--"
        />
      </Group>
    </Input.Wrapper>
  );
}
