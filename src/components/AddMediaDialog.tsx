import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-store";
import { searchGameMetadata } from "@/lib/wiki-search";
import { toast } from "sonner";
import { Search, Loader2, ImageOff, ChevronLeft, Download, Music, Play, Square, Check } from "lucide-react";

type Kind = "game" | "movie";

interface Props {
  kind: Kind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddMediaDialog({ kind, open, onOpenChange }: Props) {
  const { addGame, addMovie } = useVault();
  const [step, setStep] = useState<"search" | "details" | "audio">("search");
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

  // Theme audio fields
  const [audioQuery, setAudioQuery] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [selectedAudioTitle, setSelectedAudioTitle] = useState(""); 
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const reset = () => {
    stopPreview();
    setStep("search");
    setQuery(""); setResults([]); setScrapedData(null);
    setTitle(""); setCoverUrl(""); setDescription(""); setTags(""); setRating("");
    setMagnet(""); setMirror(""); setNotes("");
    setYear(""); setReview("");
    setAudioQuery(""); setAudioTracks([]); setSelectedAudioUrl(""); setSelectedAudioTitle("");
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPlayingPreviewUrl("");
  };

  const handleTogglePreview = (url: string) => {
    if (playingPreviewUrl === url) {
      stopPreview();
    } else {
      stopPreview();
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(() => toast.error("Audio playback blocked"));
      previewAudioRef.current = audio;
      setPlayingPreviewUrl(url);
      audio.onended = () => setPlayingPreviewUrl("");
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (kind === "game") {
        const r = await searchGameMetadata(query);
        if (r && r.length > 0) setResults(r);
        else { setResults([]); toast.message("No results found"); }
      } else {
        const response = await fetch(`/api/search-movies?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (data && data.length > 0) setResults(data);
        else { setResults([]); toast.message("No cinematic results found"); }
      }
    } catch {
      toast.error("Query timeout");
    } finally {
      setLoading(false);
    }
  };

  const runAudioSearch = async (forcedQuery?: string) => {
    const targetQuery = forcedQuery || audioQuery;
    if (!targetQuery.trim()) return;
    setAudioLoading(true);
    try {
      const response = await fetch(`/api/search-tracks?query=${encodeURIComponent(targetQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setAudioTracks(data);
      }
    } catch {
      console.error("Audio link lookup issue");
    } finally {
      setAudioLoading(false);
    }
  };

// Inside your existing pick assignment handler function block:
  const pick = async (r: any) => {
    setTitle(r.title);
    setCoverUrl(r.coverUrl || r.thumbnail || "");
    setDescription(r.description || "");
    if (r.genres) setTags(Array.isArray(r.genres) ? r.genres.join(", ") : r.genres);
    if (r.year) setYear(String(r.year));
    
    // 🎧 Cache provider array variables down into component session states
    (r as any).watchProviders ? (window as any)._cachedProviders = r.watchProviders : (window as any)._cachedProviders = [];
    setStep("details");

    if (kind === "game") {
      setScrapingRepack(true);
      setScrapedData(null);
      try {
        const repackRes = await fetch(`/api/scrape-repack?title=${encodeURIComponent(r.title)}`);
        if (repackRes.ok) {
          const resJson = await repackRes.json();
          setScrapedData(resJson);
          if (resJson.found) toast.success("FitGirl repack located automatically!");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setScrapingRepack(false);
      }
    }
  };

  const injectScrapedRepack = () => {
    if (scrapedData?.found && scrapedData.magnet) {
      setMagnet(scrapedData.magnet);
      setMirror(scrapedData.pageUrl || "");
      toast.success("Magnet link auto-filled!");
    }
  };

  const handleNextToAudio = () => {
    if (!title.trim()) return toast.error("Title required");
    setAudioQuery(title);
    setStep("audio");
    runAudioSearch(title);
  };

  const save = () => {
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (kind === "game") {
      addGame({
        title, coverUrl, description, tags: tagList,
        rating, magnet, mirrorUrl: mirror, notes,
        themeAudioUrl: selectedAudioUrl,
        themeAudioTitle: selectedAudioTitle
      } as any);
      toast.success("Game archived with custom soundtrack!");
    } else {
      addMovie({
        title, coverUrl, description, tags: tagList,
        year: Number(year) || new Date().getFullYear(),
        rating, review,
        themeAudioUrl: selectedAudioUrl,
        themeAudioTitle: selectedAudioTitle,
        watchProviders: (window as any)._cachedProviders || [] // 🎬 Commits providers array cleanly to database items
      } as any);
      toast.success("Movie archived with custom soundtrack!");
    }      
    close(false);
  };

  useEffect(() => {
    return () => stopPreview();
  }, []);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl bg-[#09070f] border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest uppercase text-cyan-400 flex items-center gap-2">
            {step === "audio" && <Music className="h-5 w-5 animate-pulse text-cyan-400" />}
            {step === "search" ? `Find ${kind === "game" ? "Game via IGDB" : "Movie via TMDb"}` : step === "details" ? "Confirm Details" : "Sync Atmospheric Theme Track"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "search" && "Search database metadata network index to automatically scrape layouts."}
            {step === "details" && "Edit your configuration variables before entering the audio pipeline."}
            {step === "audio" && "Select an audio snippet that will trigger instantly whenever this item is clicked."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex gap-2">
              <Input autoFocus placeholder={kind === "game" ? "e.g. Elden Ring" : "e.g. Interstellar"} value={query} onChange={(e) => setQuery(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              <Button type="submit" disabled={loading || !query.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((r, index) => (
                  <button key={`${r.title}-${index}`} onClick={() => pick(r)} className="group text-left rounded-md border border-zinc-800 bg-zinc-950 hover:border-cyan-500 overflow-hidden transition-colors">
                    <div className="aspect-[2/3] bg-zinc-900 overflow-hidden relative">
                      {r.coverUrl || r.thumbnail ? <img src={r.coverUrl || r.thumbnail} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="flex items-center justify-center h-full text-zinc-600"><ImageOff className="h-6 w-6" /></div>}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium leading-tight text-zinc-200 line-clamp-2">{r.title}</div>
                      {r.year && <div className="text-[10px] text-zinc-500 mt-0.5">{r.year}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setScrapedData(null); setTitle(query); setStep("details"); }} className="text-xs text-zinc-500 hover:text-cyan-400 underline underline-offset-4 bg-transparent border-none outline-none cursor-pointer">Add manually →</button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <button onClick={() => setStep("search")} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 border-none bg-transparent cursor-pointer"><ChevronLeft className="h-3 w-3" /> back to search</button>
            {kind === "game" && scrapedData?.found && (
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4">
                <div className="text-xs text-zinc-400">Verified repack variant matched dynamically.</div>
                <Button size="sm" onClick={injectScrapedRepack} className="flex items-center gap-1.5 text-xs bg-cyan-500 text-black hover:bg-cyan-600 font-bold"><Download className="h-3 w-3" /> Inject Magnet</Button>
              </div>
            )}
            <div className="flex gap-4">
              <div className="w-28 shrink-0 aspect-[2/3] rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-zinc-600"><ImageOff className="h-6 w-6" /></div>}
              </div>
              <div className="flex-1 space-y-2">
                <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                <Field label="Cover image URL"><Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                  <Field label="Rating"><Input value={rating} onChange={(e) => setRating(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                </div>
              </div>
            </div>
            <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
            {kind === "game" ? (
              <>
                <Field label="Magnet link"><Input value={magnet} onChange={(e) => setMagnet(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                <Field label="Direct mirror URL"><Input value={mirror} onChange={(e) => setMirror(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
                <Field label="Personal setup notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3"><Field label="Year"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field></div>
                <Field label="Personal review"><Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} className="bg-zinc-950 border-zinc-800 text-zinc-100" /></Field>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { stopPreview(); close(false); }} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">Cancel</Button>
              <Button onClick={handleNextToAudio} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold uppercase text-xs tracking-wider">Configure Audio Theme →</Button>
            </div>
          </div>
        )}

        {step === "audio" && (
          <div className="space-y-4">
            <button onClick={() => { stopPreview(); setStep("details"); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 border-none bg-transparent cursor-pointer"><ChevronLeft className="h-3 w-3" /> back to details</button>
            
            <form onSubmit={(e) => { e.preventDefault(); runAudioSearch(); }} className="flex gap-2">
              <Input placeholder="Search song name, artist, track theme..." value={audioQuery} onChange={(e) => setAudioQuery(e.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              <Button type="submit" disabled={audioLoading} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                {audioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {audioTracks.map((track) => {
                const isSelected = selectedAudioUrl === track.previewUrl;
                const isPlaying = playingPreviewUrl === track.previewUrl;
                return (
                  <div key={track.trackId} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${isSelected ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => handleTogglePreview(track.previewUrl)} type="button" className={`p-2 rounded-full shrink-0 flex items-center justify-center transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                        {isPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
                      </button>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate">{track.title}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{track.artist} • {track.album}</div>
                      </div>
                    </div>
                    <Button size="sm" variant={isSelected ? "default" : "secondary"} onClick={() => { setSelectedAudioUrl(track.previewUrl); setSelectedAudioTitle(`${track.title} - ${track.artist}`); }} className={`text-xs h-8 px-3 ${isSelected ? 'bg-cyan-500 text-black font-bold hover:bg-cyan-600' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}>
                      {isSelected ? <Check className="h-3.5 w-3.5 mr-1" /> : 'Select'}
                    </Button>
                  </div>
                );
              })}
              {audioTracks.length === 0 && !audioLoading && (
                <div className="text-center py-6 text-xs text-zinc-500">No tracks found. Type a query above to explore media audio lists.</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button onClick={() => { setSelectedAudioUrl(""); setSelectedAudioTitle(""); save(); }} className="text-xs text-zinc-500 hover:text-zinc-400 underline uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer">Skip track / Add without audio</button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { stopPreview(); close(false); }} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">Cancel</Button>
                <Button onClick={save} className="bg-cyan-500 text-black hover:bg-cyan-600 font-bold uppercase tracking-wider text-xs">Save to Vault</Button>
              </div>
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
      <Label className="font-display text-[10px] tracking-widest text-zinc-400 uppercase">{label}</Label>
      {children}
    </div>
  );
}