"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  RefreshCw,
  Mail,
  Trash2,
  Plus,
  Send,
  Loader2,
  History,
} from "lucide-react";
import { buildGmailComposeUrl } from "@/lib/gmail-link-builder";
import { formatQuickReply } from "@/lib/quick-reply-formatter";

// ---------- shared types ----------

type LengthKey = "short" | "medium" | "detailed";

interface Variation {
  length: LengthKey;
  content: string;
}

interface Draft {
  id: string;
  emailSubject: string;
  emailBody: string;
  senderName: string | null;
  threadContext: string | null;
  variations: Variation[];
  toneId: string | null;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ToneProfile {
  id: string;
  name: string;
  styleDescription: string;
  sentenceLength: string;
  useEmoji: boolean;
  signOff: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface QuickReply {
  id: string;
  name: string;
  body: string;
  category: string;
  createdAt: string;
}

// ---------- helpers ----------

const LENGTH_LABELS: Record<LengthKey, string> = {
  short: "Short",
  medium: "Medium",
  detailed: "Detailed",
};

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

// =====================================================================
// Page
// =====================================================================

export default function Page() {
  const [tab, setTab] = useState("compose");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="tone">Tone</TabsTrigger>
            <TabsTrigger value="quick">Quick replies</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-6">
            <ComposeTab />
          </TabsContent>
          <TabsContent value="tone" className="mt-6">
            <ToneTab />
          </TabsContent>
          <TabsContent value="quick" className="mt-6">
            <QuickRepliesTab />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>Email Reply Drafter — MVP</span>
          <span>
            3 variations · rewrite loop · tone profiles · quick replies
          </span>
        </div>
      </footer>
    </div>
  );
}

// =====================================================================
// Header
// =====================================================================

function Header() {
  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            Email Reply Drafter
          </h1>
          <p className="text-xs text-muted-foreground leading-tight">
            Context-aware replies in your tone — 3 variations + rewrite loop
          </p>
        </div>
      </div>
    </header>
  );
}

// =====================================================================
// Compose tab
// =====================================================================

const EMPTY_FORM = {
  emailSubject: "",
  emailBody: "",
  senderName: "",
  threadContext: "",
};

function ComposeTab() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recent, setRecent] = useState<Draft[]>([]);

  const loadRecent = useCallback(async () => {
    try {
      const list = await jfetch<Draft[]>("/api/drafts");
      setRecent(list);
    } catch (e) {
      // silent — recent list is non-critical
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.emailSubject.trim() || !form.emailBody.trim()) {
      toast({
        title: "Missing fields",
        description: "Email subject and body are required.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const created = await jfetch<Draft>("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject: form.emailSubject,
          emailBody: form.emailBody,
          senderName: form.senderName || undefined,
          threadContext: form.threadContext || undefined,
        }),
      });
      setDraft(created);
      toast({ title: "Drafts ready", description: "3 variations generated." });
      loadRecent();
    } catch (err) {
      toast({
        title: "Generation failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRewrite(variationIndex: number, feedback: string) {
    if (!draft) return;
    try {
      const updated = await jfetch<Draft>(
        `/api/drafts/${draft.id}/rewrite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variationIndex, feedback }),
        },
      );
      setDraft(updated);
      toast({ title: "Rewritten", description: "Variation updated." });
    } catch (err) {
      toast({
        title: "Rewrite failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleCopy(variationIndex: number, content: string) {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(content);
      await fetch(`/api/drafts/${draft.id}/copy`, { method: "POST" });
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard not available in this browser.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteDraft(id: string) {
    try {
      await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (draft?.id === id) setDraft(null);
      loadRecent();
      toast({ title: "Draft deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  function handleLoadRecent(d: Draft) {
    setDraft(d);
    setForm({
      emailSubject: d.emailSubject,
      emailBody: d.emailBody,
      senderName: d.senderName ?? "",
      threadContext: d.threadContext ?? "",
    });
  }

  return (
    <div className="space-y-6">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbound email</CardTitle>
          <CardDescription>
            Paste the email you received. Add optional thread context to keep
            the reply grounded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Re: Q3 roadmap review"
                value={form.emailSubject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emailSubject: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Sender name (optional)</Label>
              <Input
                id="sender"
                placeholder="Sam Lee"
                value={form.senderName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, senderName: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Email body</Label>
            <Textarea
              id="body"
              placeholder="Paste the full email body here…"
              className="min-h-32"
              value={form.emailBody}
              onChange={(e) =>
                setForm((f) => ({ ...f, emailBody: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thread">Prior thread context (optional)</Label>
            <Textarea
              id="thread"
              placeholder="Any earlier messages in the thread, attachment summaries, etc."
              className="min-h-20"
              value={form.threadContext}
              onChange={(e) =>
                setForm((f) => ({ ...f, threadContext: e.target.value }))
              }
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setForm(EMPTY_FORM)}
            disabled={generating}
          >
            Clear
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {generating ? "Generating…" : "Generate 3 drafts"}
          </Button>
        </CardFooter>
      </Card>

      {/* Variation cards */}
      {draft && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Variations
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteDraft(draft.id)}
            >
              <Trash2 className="h-4 w-4" /> Discard draft
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {draft.variations.map((v, i) => (
              <VariationCard
                key={v.length}
                variation={v}
                index={i}
                draft={draft}
                onCopy={handleCopy}
                onRewrite={handleRewrite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent drafts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Recent drafts
          </CardTitle>
          <CardDescription>
            Click a row to load it back into the form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No drafts yet.
            </p>
          ) : (
            <ScrollArea className="max-h-72">
              <ul className="space-y-1 pr-2">
                {recent.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-accent/40"
                  >
                    <button
                      onClick={() => handleLoadRecent(d)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {d.variations.length} variants
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {d.emailSubject || "(no subject)"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDraft(d.id)}
                      aria-label="Delete draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// Variation card
// =====================================================================

function VariationCard({
  variation,
  index,
  draft,
  onCopy,
  onRewrite,
}: {
  variation: Variation;
  index: number;
  draft: Draft;
  onCopy: (i: number, content: string) => void;
  onRewrite: (i: number, feedback: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const [rewriting, setRewriting] = useState(false);

  const gmailUrl = buildGmailComposeUrl({
    to: draft.senderName ?? "",
    subject: draft.emailSubject.startsWith("Re:")
      ? draft.emailSubject
      : `Re: ${draft.emailSubject}`,
    body: variation.content,
  });

  async function handleRewriteClick() {
    setRewriting(true);
    try {
      await onRewrite(index, feedback);
      setFeedback("");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {LENGTH_LABELS[variation.length]}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {variation.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <ScrollArea className="h-64 rounded-md border bg-muted/20 p-3">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {variation.content || "(empty)"}
          </pre>
        </ScrollArea>
        <div className="space-y-2">
          <Label htmlFor={`fb-${index}`} className="text-xs">
            Rewrite feedback (optional)
          </Label>
          <Input
            id={`fb-${index}`}
            placeholder="e.g. make it more casual"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRewriteClick();
            }}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(index, variation.content)}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRewriteClick}
          disabled={rewriting}
        >
          {rewriting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Rewrite
        </Button>
        <Button size="sm" variant="default" asChild>
          <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" /> Open in Gmail
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// =====================================================================
// Tone tab
// =====================================================================

function ToneTab() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ToneProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await jfetch<ToneProfile[]>("/api/tone-profiles");
      // Prefer the default, else the first, else null.
      const def =
        list.find((p) => p.isDefault) ?? list[0] ?? null;
      setProfile(def);
    } catch (e) {
      toast({
        title: "Failed to load tone profiles",
        description: (err(e)),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await jfetch<ToneProfile>(`/api/tone-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          styleDescription: profile.styleDescription,
          sentenceLength: profile.sentenceLength,
          useEmoji: profile.useEmoji,
          signOff: profile.signOff,
        }),
      });
      toast({ title: "Tone profile saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: err(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tone profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No tone profile found. Reload the page to trigger seeding.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Default tone profile</CardTitle>
        <CardDescription>
          How your replies should sound. Applied to every variation the LLM
          drafts.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone-name">Profile name</Label>
            <Input
              id="tone-name"
              value={profile.name}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, name: e.target.value } : p))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone-style">Style description</Label>
            <Textarea
              id="tone-style"
              className="min-h-24"
              placeholder="e.g. friendly-professional, warm but concise, never overly formal"
              value={profile.styleDescription}
              onChange={(e) =>
                setProfile((p) =>
                  p ? { ...p, styleDescription: e.target.value } : p,
                )
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tone-sentence">Sentence length</Label>
              <Select
                value={profile.sentenceLength}
                onValueChange={(v) =>
                  setProfile((p) =>
                    p ? { ...p, sentenceLength: v } : p,
                  )
                }
              >
                <SelectTrigger id="tone-sentence" className="w-full">
                  <SelectValue placeholder="Pick a length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone-signoff">Sign-off</Label>
              <Input
                id="tone-signoff"
                placeholder='Best, [my name]'
                value={profile.signOff ?? ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p ? { ...p, signOff: e.target.value } : p,
                  )
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="tone-emoji" className="cursor-pointer">
                Allow emoji
              </Label>
              <p className="text-xs text-muted-foreground">
                When off, drafts won&apos;t include emoji instructions.
              </p>
            </div>
            <Switch
              id="tone-emoji"
              checked={profile.useEmoji}
              onCheckedChange={(v) =>
                setProfile((p) => (p ? { ...p, useEmoji: v } : p))
              }
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Save profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// =====================================================================
// Quick replies tab
// =====================================================================

const QUICK_CATEGORIES = ["general", "acknowledge", "follow-up", "decline"];

function QuickRepliesTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", body: "", category: "general" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await jfetch<QuickReply[]>("/api/quick-replies");
      setItems(list);
    } catch (e) {
      toast({
        title: "Failed to load quick replies",
        description: err(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) {
      toast({
        title: "Missing fields",
        description: "Name and body are required.",
        variant: "destructive",
      });
      return;
    }
    setAdding(true);
    try {
      const created = await jfetch<QuickReply>("/api/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setItems((prev) => [created, ...prev]);
      setForm({ name: "", body: "", category: "general" });
      toast({ title: "Quick reply added" });
    } catch (e) {
      toast({
        title: "Add failed",
        description: err(e),
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((q) => q.id !== id));
      toast({ title: "Quick reply removed" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: err(e),
        variant: "destructive",
      });
    }
  }

  async function handleCopy(body: string) {
    try {
      await navigator.clipboard.writeText(
        formatQuickReply(body, {}),
      );
      toast({ title: "Copied" });
    } catch {
      toast({
        title: "Copy failed",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Add quick reply</CardTitle>
          <CardDescription>
            Canned short replies for common cases. Use{" "}
            <code className="text-xs rounded bg-muted px-1">
              {"{{senderName}}"}
            </code>{" "}
            placeholders — they are substituted when inserted.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAdd}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qr-name">Name</Label>
                <Input
                  id="qr-name"
                  placeholder="Thanks, got it"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-cat">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger id="qr-cat" className="w-full">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUICK_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-body">Body</Label>
              <Textarea
                id="qr-body"
                placeholder="Thanks {{senderName}}, I&apos;ve got this and will follow up by EOW."
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={adding}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library</CardTitle>
          <CardDescription>{items.length} canned replies</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No quick replies yet.
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <ul className="space-y-2 pr-2">
                {items.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-md border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{q.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {q.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                          {q.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copy"
                          onClick={() => handleCopy(q.body)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- tiny error helper ----------
function err(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
