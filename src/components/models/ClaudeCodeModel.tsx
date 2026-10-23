"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, KeyRound, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { CLAUDE_CODE_RE, describeClaudeAuth, LOGIN_FAILURES, safeLoginUrl, type ClaudeAuthStatus, type ClaudeLogin } from "@/lib/claude-code-auth";

const KEY_RE = /^sk-ant-api\d+-[A-Za-z0-9_-]{20,250}$/;

// Intégrations · Modèles d'une instance Claude Code : l'abonnement Claude du membre (adresse à ouvrir,
// puis le code que Claude affiche) ou une clé API Anthropic. Rien n'est gardé ici ni au back-office.
export function ClaudeCodeModel({ status, member, picker, onChanged }: { status: ClaudeAuthStatus; member: string | null; picker?: React.ReactNode; onChanged: () => Promise<void> }) {
  const query = member ? `?member=${encodeURIComponent(member)}` : "";
  const [login, setLogin] = useState<ClaudeLogin | null>(status.login?.state === "waiting_code" ? status.login : null);
  const [code, setCode] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"start" | "code" | "key" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLogin(status.login?.state === "waiting_code" ? status.login : null), [status.login]);

  const run = useCallback(async (what: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const start = () =>
    run("start", async () => {
      const out = await apiFetch<ClaudeLogin>(`/api/claude-code/auth${query}`, { method: "POST" });
      setLogin(out);
      const url = safeLoginUrl(out.url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });

  const submit = () =>
    run("code", async () => {
      const out = await apiFetch<ClaudeLogin>(`/api/claude-code/auth/code${query}`, { method: "POST", body: JSON.stringify({ code: code.trim() }) });
      if (out.state === "done") {
        toast.success("Abonnement Claude connecté");
        setLogin(null);
        setCode("");
        await onChanged();
      } else if (out.state === "failed") {
        setLogin(null);
        setError(LOGIN_FAILURES[out.reason ?? ""] ?? LOGIN_FAILURES.login_failed!);
      } else {
        toast("Vérification en cours…");
        await onChanged();
      }
    });

  const saveKey = () =>
    run("key", async () => {
      await apiFetch(`/api/claude-code/auth/key${query}`, { method: "PUT", body: JSON.stringify({ key: key.trim() }) });
      toast.success("Clé API enregistrée sur l’instance");
      setKey("");
      await onChanged();
    });

  const remove = (what: "key" | "subscription") =>
    run("remove", async () => {
      await apiFetch(what === "key" ? `/api/claude-code/auth/key${query}` : `/api/claude-code/auth${query}`, { method: "DELETE" });
      toast.success(what === "key" ? "Clé retirée" : "Abonnement déconnecté");
      await onChanged();
    });

  const url = safeLoginUrl(login?.url);
  const subscribed = status.auth.loggedIn && status.auth.method === "claude.ai";

  return (
    <section className="space-y-4 rounded-[22px] border border-line bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Modèle de l’instance</h2>
          <p className="text-xs text-ink-3">
            En service : <span className="font-semibold text-ink">{describeClaudeAuth(status)}</span>
          </p>
        </div>
        {picker}
      </header>

      <div className="space-y-3 rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <LogIn className="h-4 w-4 text-brand" /> Abonnement Claude (Pro, Max, Team, Enterprise)
        </div>
        {login && url ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (CLAUDE_CODE_RE.test(code.trim())) void submit();
              else setError(LOGIN_FAILURES.bad_code!);
            }}
          >
            <p className="text-xs text-ink-3">
              Connectez-vous sur la page de Claude, puis collez ici le code qu’elle affiche.{" "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                Rouvrir la page <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Collez le code" autoComplete="off" spellCheck={false} className="font-mono text-xs" autoFocus />
              <Button type="submit" disabled={busy !== null || !code.trim()}>{busy === "code" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void start()} disabled={busy !== null}>
              {busy === "start" ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Démarrage…</> : subscribed ? "Reconnecter" : "Se connecter avec Claude"}
            </Button>
            {subscribed && <Button type="button" variant="outline" onClick={() => void remove("subscription")} disabled={busy !== null}>Déconnecter</Button>}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <KeyRound className="h-4 w-4 text-brand" /> Clé API Anthropic
        </div>
        {status.key ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-ink-3">Une clé est posée : elle sert l’instance avant l’abonnement.</p>
            <Button type="button" variant="outline" onClick={() => void remove("key")} disabled={busy !== null}>Retirer la clé</Button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (KEY_RE.test(key.trim())) void saveKey();
              else setError("Cette clé n’a pas la forme d’une clé API Anthropic (sk-ant-api…).");
            }}
          >
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-api03-…" autoComplete="off" spellCheck={false} className="font-mono text-xs" />
            <Button type="submit" variant="outline" disabled={busy !== null || !key.trim()}>{busy === "key" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</Button>
          </form>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl bg-ko-pale px-3 py-2 text-xs text-ko">{error}</p>}
    </section>
  );
}
