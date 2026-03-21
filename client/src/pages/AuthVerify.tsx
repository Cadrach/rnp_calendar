import { useEffect, useRef } from "react";
import { Center, Loader, Text, Stack } from "@mantine/core";
import { useSearchParams, useNavigate } from "react-router";
import { useAuthDiscordVerify } from "../api/generated/auth/auth";

export function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const called = useRef(false);

  const { mutate, isError } = useAuthDiscordVerify({
    mutation: {
      onSuccess: (data) => {
        window.location.href = (data as unknown as { redirect: string }).redirect;
      },
      onError: () => {
        navigate("/login");
      },
    },
  });

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (token) {
      mutate({ data: { token } });
    } else {
      navigate("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Center h="100vh">
      <Stack align="center" gap="sm">
        {isError ? (
          <Text c="red">Lien invalide ou expiré.</Text>
        ) : (
          <>
            <Loader color="neon" />
            <Text c="dimmed" size="sm">Connexion en cours…</Text>
          </>
        )}
      </Stack>
    </Center>
  );
}
