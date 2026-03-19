import { useState } from "react";
import { Button, Center, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useAuthDiscordRequest } from "../api/generated/auth/auth";

export function Login() {
  const [username, setUsername] = useState("");

  const { mutate, isPending, isSuccess } = useAuthDiscordRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ data: { username } });
  };

  return (
    <Center h="100vh">
      <Paper withBorder shadow="md" p="xl" w={360}>
        <Stack>
          <Title order={3} ta="center">
            Connexion
          </Title>

          {isSuccess ? (
            <Text ta="center" c="dimmed" size="sm">
              Si ce pseudo existe sur le serveur, un lien de connexion t'a été
              envoyé en DM Discord.
            </Text>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack>
                <TextInput
                  label="Pseudo Discord"
                  placeholder="ton_pseudo"
                  value={username}
                  onChange={(e) => setUsername(e.currentTarget.value)}
                  required
                />
                <Button type="submit" loading={isPending} fullWidth>
                  Envoyer le lien
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
