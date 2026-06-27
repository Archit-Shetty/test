import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type GameStatus = "Playing" | "Backlog" | "Mastered";

export interface Game {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  tags: string[];
  rating: string;
  magnet: string;
  mirrorUrl: string;
  notes: string;
  themeAudioUrl?: string; // 🎧 Theme Audio Stream Link Anchor
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  coverUrl: string;
  description: string;
  tags: string[];
  review: string;
  rating: string;
  loggedAt: string;
  themeAudioUrl?: string; // 🎧 Theme Audio Stream Link Anchor
}

export interface Playlist {
  id: string;
  name: string;
  embed: string;
}

interface VaultData {
  games: Game[];
  movies: Movie[];
  playlists: Playlist[];
}

interface VaultContextValue extends VaultData {
  addGame: (g: Omit<Game, "id">) => void;
  addMovie: (m: Omit<Movie, "id" | "loggedAt">) => void;
  addPlaylist: (p: Omit<Playlist, "id">) => void;
  removeGame: (id: string) => void;
  removeMovie: (id: string) => void;
  removePlaylist: (id: string) => void;
  refreshVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VaultData>({ games: [], movies: [], playlists: [] });

  const refreshVault = async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const json = await res.json();
        setData({
          games: json.games || [],
          movies: json.movies || [],
          playlists: json.playlists || []
        });
      }
    } catch (err) {
      console.error("Failed to fetch data streams from MongoDB cluster:", err);
    }
  };

  useEffect(() => {
    refreshVault();
  }, []);

  const addGame = async (g: Omit<Game, "id">) => {
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "game", data: g })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database save error:", err);
    }
  };

  const addMovie = async (m: Omit<Movie, "id" | "loggedAt">) => {
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "movie", data: m })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database save error:", err);
    }
  };

  const addPlaylist = async (p: Omit<Playlist, "id">) => {
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "playlist", data: p })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database save error:", err);
    }
  };

  const removeGame = async (id: string) => {
    try {
      const res = await fetch("/api/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "game", id })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database delete action failure:", err);
    }
  };

  const removeMovie = async (id: string) => {
    try {
      const res = await fetch("/api/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "movie", id })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database delete action failure:", err);
    }
  };

  const removePlaylist = async (id: string) => {
    try {
      const res = await fetch("/api/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "playlist", id })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Database delete action failure:", err);
    }
  };

  return (
    <VaultContext.Provider value={{ ...data, addGame, addMovie, addPlaylist, removeGame, removeMovie, removePlaylist, refreshVault }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}