import {
  siAnthropic,
  siDeepseek,
  siGithubcopilot,
  siGooglegemini,
  siHuggingface,
  siMinimax,
  siMistralai,
  siOllama,
  siOpenrouter,
  siPerplexity,
} from "simple-icons";
import { cn } from "@/lib/utils";

// La pastille d'un fournisseur de modèles : le logo de sa marque quand on en a un tracé fidèle,
// sinon ses initiales, aux couleurs de la marque. Elle se choisit par `family`, que le back-office
// sert avec son catalogue, et jamais par le libellé, qui peut changer. Une famille inconnue ici
// prend les initiales de son nom sur un fond neutre.
const MARKS: Record<string, { tone: string; label: string }> = {
  openrouter: { tone: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20", label: "OR" },
  anthropic: { tone: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20", label: "A" },
  openai: { tone: "bg-[#10A37F]/10 text-[#10A37F] border-[#10A37F]/20", label: "O" },
  google: { tone: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20", label: "G" },
  deepseek: { tone: "bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/20", label: "DS" },
  qwen: { tone: "bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/20", label: "QW" },
  mistral: { tone: "bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/20", label: "M" },
  groq: { tone: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20", label: "Gq" },
  // Marques noires : l'encre du thème, pour rester lisibles sur fond sombre.
  xai: { tone: "bg-ink/10 text-ink border-ink/20", label: "𝕏" },
  ollama: { tone: "bg-ink/10 text-ink border-ink/20", label: "🦙" },
  copilot: { tone: "bg-ink/10 text-ink border-ink/20", label: "CP" },
  perplexity: { tone: "bg-[#22B8CD]/10 text-[#22B8CD] border-[#22B8CD]/20", label: "PX" },
  huggingface: { tone: "bg-[#FFD21E]/20 text-[#D97706] border-[#FFD21E]/30", label: "🤗" },
  minimax: { tone: "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20", label: "MM" },
  nous: { tone: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20", label: "NP" },
  together: { tone: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20", label: "T" },
  deepinfra: { tone: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20", label: "DI" },
  fireworks: { tone: "bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/20", label: "FW" },
  custom: { tone: "bg-tint text-brand-ink border-brand/20", label: "⚙" },
};

// Les tracés officiels des marques (`simple-icons`, grille de 24). Une marque que le paquet ne
// connaît pas garde ses initiales : un logo approchant passerait pour le vrai, les initiales non.
const ICONS: Record<string, string> = {
  openrouter: siOpenrouter.path,
  anthropic: siAnthropic.path,
  google: siGooglegemini.path,
  deepseek: siDeepseek.path,
  mistral: siMistralai.path,
  ollama: siOllama.path,
  copilot: siGithubcopilot.path,
  perplexity: siPerplexity.path,
  huggingface: siHuggingface.path,
  minimax: siMinimax.path,
};

export function ProviderLogo({ family, name }: { family: string; name: string }) {
  const mark = MARKS[family] ?? { tone: "bg-soft text-ink border-line", label: name.slice(0, 2).toUpperCase() };
  return (
    <div aria-hidden className={cn("grid h-11 w-11 shrink-0 select-none place-items-center rounded-[14px] border text-sm font-bold tracking-tight", mark.tone)}>
      {ICONS[family] ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d={ICONS[family]} />
        </svg>
      ) : (
        mark.label
      )}
    </div>
  );
}
