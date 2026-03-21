import { useEffect, useRef } from "react";
import { ActionIcon, Group, Loader, Modal, Select, Tooltip } from "@mantine/core";
import { useDisclosure, useUncontrolled } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { DictionaryScenarii200Item, Scenario } from "../api/generated/model";
import {
  useDictionaryScenarii,
  getDictionaryScenariiQueryKey,
} from "../api/generated/dictionary/dictionary";
import { CreateScenarioModal } from "./CreateScenarioModal";

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
  const queryClient = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const pendingKeyRef = useRef<string | null>(null);

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

  // Once the refetched list contains the just-created scenario, select it.
  useEffect(() => {
    if (!pendingKeyRef.current || !scenarios) return;
    const scenario = scenarios.find((s) => s.key === pendingKeyRef.current);
    if (scenario) {
      handleChange(pendingKeyRef.current);
      pendingKeyRef.current = null;
    }
  }, [scenarios, handleChange]);

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
    : (placeholder ?? "Choisir un scénario");

  const handleCreated = (scenario: Scenario) => {
    queryClient.invalidateQueries({ queryKey: getDictionaryScenariiQueryKey() });
    pendingKeyRef.current = `id:${scenario.id}`;
    closeCreate();
  };

  return (
    <>
      <Group align="flex-end" gap="xs">
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
          style={{ flex: 1 }}
        />
        <Tooltip label="Créer un scénario" disabled={!gameId}>
          <ActionIcon
            size="lg"
            variant="filled"
            disabled={!gameId}
            onClick={openCreate}
            mb={error ? 22 : undefined}
          >
            <IconPlus size={15} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal opened={createOpened} onClose={closeCreate} title="Nouveau scénario" centered>
        <CreateScenarioModal gameId={gameId} onSuccess={handleCreated} />
      </Modal>
    </>
  );
}
