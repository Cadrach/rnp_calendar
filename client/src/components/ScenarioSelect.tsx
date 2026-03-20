import { Loader, Select } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import type { DictionaryScenarii200Item } from "../api/generated/model";
import { useDictionaryScenarii } from "../api/generated/dictionary/dictionary";

interface Props {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: DictionaryScenarii200Item | null) => void;
  gameId: string | null;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: React.ReactNode;
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    return `id:${value}`;
  }
  return value;
}

export function ScenarioSelect({
  value,
  defaultValue,
  onChange,
  gameId,
  label = "Scénario",
  placeholder,
  disabled,
  error,
}: Props) {
  const { data: scenarios, isLoading } = useDictionaryScenarii();

  const [_value, handleChange] = useUncontrolled<string | null>({
    value: normalizeKey(value),
    defaultValue: normalizeKey(defaultValue),
    finalValue: null,
    onChange: (key) => {
      if (!key || !scenarios) {
        onChange?.(null);
        return;
      }
      const scenario = scenarios.find((s) => s.key === key);
      onChange?.(scenario ?? null);
    },
  });

  const filteredScenarios =
    scenarios?.filter((s) => {
      if (s.game_id === null) return true;
      return String(s.game_id) === gameId;
    }) ?? [];

  const selectData = filteredScenarios.map((s) => ({
    value: s.key,
    label: s.name,
  }));

  const effectivePlaceholder = !gameId
    ? "Sélectionner un jeu d'abord"
    : placeholder ?? "Choisir un scénario";

  return (
    <Select
      label={label}
      placeholder={effectivePlaceholder}
      disabled={disabled || !gameId}
      clearable
      searchable
      data={selectData}
      value={_value}
      onChange={handleChange}
      error={error}
      rightSection={isLoading ? <Loader size="xs" /> : undefined}
    />
  );
}
