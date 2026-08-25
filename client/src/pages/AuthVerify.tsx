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
        // A dead link does not mean a dead session: the token is one-shot, but the session it
        // created may well still be live. Let the app decide — / renders straight away when it is,
        // and falls into the normal /login flow when it is not. Sending the user to /login here
        // instead is what closed the expired-link loop.
        //
        // A full load rather than navigate("/") so the app boots fresh and refetches the dictionary,
        // which is what establishes whether the session is still good.
        window.location.href = "/";
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
            <Text c="dimmed" size="sm">
              Connexion en cours…
            </Text>
          </>
        )}
      </Stack>
    </Center>
  );
}
