// Rebuilt lookup client supporting both local server proxy queries for IGDB and standard Wikipedia data fallbacks.

export interface WikiResult {
  title: string;
  description: string;
  thumbnail: string;
  year?: number;
  genres?: string[];
}

export async function searchWiki(query: string, hint: "game" | "movie"): Promise<WikiResult[]> {
  const q = query.trim();
  if (!q) return [];

  // PIVOT: If searching for a game, route completely into our backend IGDB security gateway proxy instead
  if (hint === "game") {
    try {
      const res = await fetch(`/api/search-games?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Backend IGDB gateway returned an error response status");
      const gamesList = await res.json();
      return gamesList as WikiResult[];
    } catch (err) {
      console.error("Game metadata fetching pipeline down, attempting basic wiki fallback configuration...", err);
      // Fall through to standard wikipedia engine down below if server route crashes
    }
  }

  // --- STANDARD WIKIPEDIA PROCESSING CLIENT (FOR MOVIES & RETRY FALLBACKS) ---
  const suffix = hint === "game" ? " video game" : " film";
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: q + suffix,
    gsrlimit: "8",
    prop: "pageimages|extracts",
    piprop: "thumbnail",
    pithumbsize: "400",
    exintro: "1",
    explaintext: "1",
    exchars: "400",
    format: "json",
    origin: "*",
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Search failed");
  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages) return [];

  const list: (WikiResult & { index: number })[] = Object.values(pages).map((p: any) => {
    const extract: string = p.extract ?? "";
    const yearMatch = extract.match(/\b(19|20)\d{2}\b/);
    return {
      index: p.index ?? 999,
      title: p.title,
      description: extract,
      thumbnail: p.thumbnail?.source ?? "",
      year: yearMatch ? Number(yearMatch[0]) : undefined,
    };
  });

  return list
    .filter((r) => r.thumbnail)
    .sort((a, b) => a.index - b.index)
    .map(({ index: _i, ...r }) => r);
}

// Retaining signature wrapper support if other codebase files call this interface explicitly
export async function searchGameMetadata(query: string): Promise<WikiResult[] | null> {
  try {
    return await searchWiki(query, "game");
  } catch {
    return null;
  }
}