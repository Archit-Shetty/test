// Indestructible direct proxy lookup client routing into your local server framework gateway.

export interface GameMetadata {
  title: string;
  description: string;
  coverUrl: string;
  year?: number;
  genres?: string[];
}

/**
 * Main query router engine. Hits your secure local server proxy to interface with IGDB data endpoints.
 */
export async function searchWiki(query: string, hint: "game" | "movie"): Promise<any[]> {
  const q = query.trim();
  if (!q) return [];

  if (hint === "game") {
    try {
      const res = await fetch(`/api/search-games?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Local proxy routing gateway node returned an error response status");
      
      const gamesList = await res.json();
      return gamesList;
    } catch (err) {
      console.error("IGDB proxy pipeline exception:", err);
      return [];
    }
  }

  // Basic fallback array for movies if needed
  return [];
}

/**
 * Retains reference hook compatibility wrapper targets if called explicitly across other routing tree nodes.
 */
export async function searchGameMetadata(query: string): Promise<any[] | null> {
  try {
    return await searchWiki(query, "game");
  } catch {
    return null;
  }
}