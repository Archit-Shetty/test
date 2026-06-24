// Wikipedia-backed search to pull cover thumbnails and descriptions.
// No API key required, supports CORS via origin=*.

export interface WikiResult {
  title: string;
  description: string;
  thumbnail: string;
  year?: number;
}

export async function searchWiki(query: string, hint: "game" | "movie"): Promise<WikiResult[]> {
  const q = query.trim();
  if (!q) return [];
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
