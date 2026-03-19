import { createContext, useContext } from "react";
import { Center, Loader } from "@mantine/core";
import type { Game, Room, User } from "../api/generated/model";
import { useGetDictionary } from "../api/generated/default/default";

interface DictionaryContext {
  user: User;
  games: Game[];
  rooms: Room[];
}

const DictionaryContext = createContext<DictionaryContext | null>(null);

export function DictionaryProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetDictionary();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <DictionaryContext.Provider value={{ user: data.user, games: data.games, rooms: data.rooms }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): DictionaryContext {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error("useDictionary must be used within DictionaryProvider");
  return ctx;
}
