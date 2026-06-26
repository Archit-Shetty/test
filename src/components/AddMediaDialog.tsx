import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-store";
import { searchGameMetadata } from "@/lib/wiki-search";
import { toast } from "sonner";
import { Search, Loader2, ImageOff, ChevronLeft, Download } from "lucide-react";

type Kind = "game" | "movie";

interface Props {
  kind: Kind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddMediaDialog({ kind, open, onOpenChange }: Props) {
  const { addGame, addMovie } = useVault();
  const [step, setStep] = useState<"search" | "details">("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrapingRepack, setScrapingRepack] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [scrapedData, setScrapedData] = useState<{ found: boolean; magnet?: string; pageUrl?: string } | null>(null);

  // Shared fields
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState("");

  // Game extras
  const [magnet, setMagnet] = useState("");
  const [mirror, setMirror] = useState("");
  const [notes, setNotes] = useState("");

  // Movie extras
  const [year, setYear] = useState("");
  const [review, setReview] = useState("");

  const reset = () => {
    setStep("search");
    setQuery(""); setResults([]); setScrapedData(null);
    setTitle(""); setCoverUrl(""); setDescription(""); setTags(""); setRating("");
    setMagnet(""); setMirror(""); setNotes("");
    setYear(""); setReview("");
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await searchGameMetadata(query);
      if (r && r.length > 0) {
        setResults(r);
      } else {
        setResults([]);
        toast.message("No results found — try another title string");
      }
    } catch {
      toast.error("Search gateway timeout");
    } finally {
      setLoading(false);
    }
  };

  const pick = async (r: any) => {
    setTitle(r.title);
    setCoverUrl(r.coverUrl || r.thumbnail || "");
    setDescription(r.description || "");
    if (r.genres) setTags(r.genres.join(", "));
    if (r.year) setYear(String(r.year));
    setStep("details");

    if (kind === "game") {
      setScrapingRepack(true);
      setScrapedData(null);
      try {
        const repackRes = await fetch(`/api/scrape-repack?title=${encodeURIComponent(r.title)}`);
        if (repackRes.ok) {
          const resJson = await repackRes.json();
          setScrapedData(resJson);
          if (resJson.found) {
            toast.success("FitGirl repack located automatically!");
          } else {
            toast.message("No repack match on FitGirl.");
          }
        }
      } catch (err) {
        console.error("Scraper cluster error:", err);
      } finally {
        setScrapingRepack(false);
      }
    }
  };

  const injectScrapedRepack = () => {
    if (scrapedData?.found && scrapedData.magnet) {
      setMagnet(scrapedData.magnet);
      setMirror(scrapedData.pageUrl || "");
      toast.success("Magnet and download mirror links auto-filled!");
    }
  };

  const skipToManual = () => {
    setScrapedData(null);
    setTitle(query);
    setStep("details");
  };

  const save = () => {
    if (!title.trim()) return toast.error("Title required");
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (kind === "game") {
      addGame({
        title, coverUrl, description, tags: tagList,
        rating, magnet, mirrorUrl: mirror, notes,
      });
      toast.success("Game archived to Vault");
    } else {
      addMovie({
        title, coverUrl, description, tags: tagList,
        year: Number(year) || new Date().getFullYear(),
        rating, review,
      });
      toast.success("Movie logged successfully");
    }
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest uppercase text-primary">
            {step === "search" ? `Find ${kind === "game" ? "Game via IGDB" : "Movie"}` : "Confirm Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "search"
              ? "Search the database metadata network index to automatically scrape high-res box graphics."
              : "Edit your entry configurations before saving to your collections storage."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex gap-2">
              <Input
                autoFocus
                placeholder={kind === "game" ? "e.g. Elden Ring" : "e.g. Mulholland Drive"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((r, index) => {
                  const imageSrc = r.coverUrl || r.thumbnail;
                  return (
                    <button
                      key={`${r.title}-${index}`}
                      onClick={() => pick(r)}
                      className="group text-left rounded-md border border-border bg-background hover:border-primary overflow-hidden transition-colors"
                    >
                      <div className="aspect-[2/3] bg-muted overflow-hidden relative">
                        {imageSrc ? (
                          <img src={imageSrc} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium leading-tight line-clamp-2">{r.title}</div>
                        {r.year && <div className="text-[10px] text-muted-foreground mt-0.5">{r.year}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={skipToManual} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4">
              Can't find it? Add manually →
            </button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <button onClick={() => setStep("search")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <ChevronLeft className="h-3 w-3" /> back to search
            </button>

            {kind === "game" && (
              <div className="p-3 rounded-lg border border-border bg-background/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">FitGirl Scraper</div>
                  <div className="text-xs text-muted-foreground">
                    {scrapingRepack ? "Parsing post text..." : scrapedData?.found ? "Verified variant located!" : "No automatic repack index match found."}
                  </div>
                </div>
                {scrapingRepack && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {!scrapingRepack && scrapedData?.found && (
                  <Button size="sm" variant="secondary" onClick={injectScrapedRepack} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                    <Download className="h-3 w-3" /> Inject Magnet
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <div className="w-28 shrink-0 aspect-[2/3] rounded-md border border-border bg-background overflow-hidden">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Cover image URL"><Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="RPG, Action" /></Field>
                  <Field label="Rating (e.g. 9/10)"><Input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="10/10" /></Field>
                </div>
              </div>
            </div>

            <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>

            {kind === "game" ? (
              <>
                <Field label="Magnet link"><Input value={magnet} onChange={(e) => setMagnet(e.target.value)} placeholder="magnet:?xt=urn:btih:..." /></Field>
                <Field label="Direct mirror URL"><Input value={mirror} onChange={(e) => setMirror(e.target.value)} placeholder="https://..." /></Field>
                <Field label="Personal setup notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
                </div>
                <Field label="Personal review"><Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} /></Field>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">Save to Vault</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-display text-[10px] tracking-widest text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  );
}