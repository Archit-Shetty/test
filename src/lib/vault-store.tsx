import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  themeAudioUrl?: string;
  themeAudioTitle?: string;
}

export interface WatchProvider {
  name: string;
  logoUrl: string;
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
  themeAudioUrl?: string;
  themeAudioTitle?: string;
  watchProviders?: WatchProvider[]; // 🎬 Stores streaming logos cleanly!
  trailerKey?: string; // 🎬 Stores YouTube Trailer Video Key
}

export interface Track {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  source: "spotify" | "youtube" | "manual";
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  sourceUrl?: string;
  tracks: Track[];
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
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  refreshVault: () => Promise<void>;
  
  // 🎧 Global Background Playback State Hooks
  currentTrack: Track | null;
  activePlaylist: Playlist | null;
  isPlaying: boolean;
  playTrackDirectly: (track: Track) => void;
  playPlaylistDirectly: (playlist: Playlist, startTrackIndex?: number) => void;
  setIsPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VaultData>({ games: [], movies: [], playlists: [] });
  
  // 🎧 Jukebox Playback States
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [trackIndex, setTrackIndex] = useState<number>(0);

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

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    try {
      const res = await fetch("/api/vault/playlists/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, action: "add", track })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Failed to add track:", err);
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    try {
      const res = await fetch("/api/vault/playlists/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, action: "remove", trackId })
      });
      if (res.ok) refreshVault();
    } catch (err) {
      console.error("Failed to remove track:", err);
    }
  };

  // 🎧 Global audio player command structures
  const playTrackDirectly = (track: Track) => {
    setActivePlaylist(null);
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const playPlaylistDirectly = (playlist: Playlist, startTrackIndex = 0) => {
    if (!playlist.tracks || playlist.tracks.length === 0) return;
    setActivePlaylist(playlist);
    setTrackIndex(startTrackIndex);
    setCurrentTrack(playlist.tracks[startTrackIndex]);
    setIsPlaying(true);
  };

  const nextTrack = () => {
    if (!activePlaylist || activePlaylist.tracks.length <= 1) return;
    const nextIdx = (trackIndex + 1) % activePlaylist.tracks.length;
    setTrackIndex(nextIdx);
    setCurrentTrack(activePlaylist.tracks[nextIdx]);
  };

  const prevTrack = () => {
    if (!activePlaylist || activePlaylist.tracks.length <= 1) return;
    const prevIdx = trackIndex === 0 ? activePlaylist.tracks.length - 1 : trackIndex - 1;
    setTrackIndex(prevIdx);
    setCurrentTrack(activePlaylist.tracks[prevIdx]);
  };

  return (
    <VaultContext.Provider value={{ 
      ...data, addGame, addMovie, addPlaylist, removeGame, removeMovie, removePlaylist, 
      addTrackToPlaylist, removeTrackFromPlaylist, refreshVault,
      currentTrack, activePlaylist, isPlaying, playTrackDirectly, playPlaylistDirectly,
      setIsPlaying, nextTrack, prevTrack
    }}>
      {data.playlists && children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}