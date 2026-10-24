// Les réglages comme ChatGPT : une carte, une ligne par réglage, le libellé à gauche et la commande
// à droite (dessous sur téléphone).
export function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl divide-y divide-line rounded-[22px] border border-line bg-surface">{children}</div>;
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
