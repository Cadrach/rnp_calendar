import { Button, Stack, Textarea, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Scenario } from "../api/generated/model";
import { useScenariosStore } from "../api/generated/scenario/scenario";
import { useDictionary } from "../contexts/DictionaryContext";

interface Props {
  gameId: string | null;
  onSuccess: (scenario: Scenario) => void;
}

export function CreateScenarioModal({ gameId, onSuccess }: Props) {
  const { games } = useDictionary();

  const form = useForm({
    initialValues: {
      game_id: gameId,
      name: "",
      description: "",
    },
    validate: {
      game_id: (v) => (!v ? "Le jeu est requis" : null),
      name: (v) => (!v.trim() ? "Le titre est requis" : null),
    },
  });

  const store = useScenariosStore({
    mutation: {
      onSuccess: (scenario) => {
        onSuccess(scenario);
      },
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    store.mutate({
      data: {
        game_id: Number(values.game_id),
        name: values.name.trim(),
        description: values.description.trim() || null,
      },
    });
  });

  return (
    <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(e); }}>
      <Stack mt="sm">
        <Select
          label="Jeu"
          placeholder="Choisir un jeu"
          required
          searchable
          data={games.map((g) => ({ value: String(g.id), label: g.name }))}
          {...form.getInputProps("game_id")}
        />

        <TextInput
          label="Titre"
          placeholder="Nom du scénario"
          required
          {...form.getInputProps("name")}
        />

        <Textarea
          label="Description"
          placeholder="Description (optionnel)"
          autosize
          minRows={3}
          {...form.getInputProps("description")}
        />

        <Button type="submit" loading={store.isPending}>
          Créer
        </Button>
      </Stack>
    </form>
  );
}
