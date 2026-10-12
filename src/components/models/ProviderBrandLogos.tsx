import type { CSSProperties, ReactElement } from "react";
import { cn } from "@/lib/utils";

type BrandIconComponent = (props: { className?: string; style?: CSSProperties }) => ReactElement;

function createIcon(pathD: string, viewBox = "0 0 24 24"): BrandIconComponent {
  return function Icon({ className, style }) {
    return (
      <svg
        viewBox={viewBox}
        fill="currentColor"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path d={pathD} />
      </svg>
    );
  };
}

// 1. OpenAI official floral spiral
const OpenAIIcon = createIcon(
  "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.484c-1.392 0-2.652-.677-3.448-1.745.063-.034.173-.096.244-.144l4.878-2.817a1.138 1.138 0 0 0 .564-.975v-6.895l2.075 1.195v6.599a4.543 4.543 0 0 1-4.313 4.782zm-7.795-3.826a4.519 4.519 0 0 1-.607-4.528c.062.038.167.1.244.143l4.877 2.817a1.124 1.124 0 0 0 1.129 0l5.973-3.448v2.391l-5.715 3.3a4.543 4.543 0 0 1-5.9-0.675zm-1.898-9.363a4.524 4.524 0 0 1 3.706-3.237v5.901a1.129 1.129 0 0 0 .564.975l5.973 3.448-2.075 1.196-5.715-3.3a4.543 4.543 0 0 1-2.453-4.983zm15.422-1.382-4.878 2.817a1.124 1.124 0 0 0-1.128 0L6.999 7.083V4.692l5.715-3.3a4.543 4.543 0 0 1 6.13 4.543v1.974zm2.08 4.146a4.519 4.519 0 0 1 .608 4.528c-.063-.038-.168-.1-.244-.143l-4.878-2.817a1.124 1.124 0 0 0-1.128 0l-5.973 3.448v-2.391l5.714-3.3a4.543 4.543 0 0 1 5.901.675zM10.706 13.5l2.656-1.53 2.657 1.53v3.06l-2.657 1.53-2.656-1.53v-3.06z"
);

// 2. Anthropic official geometric A mark
const AnthropicIcon = createIcon(
  "M13.827 4.004h3.414L24 20h-3.414l-1.92-4.22h-6.223L10.523 20H7.119l6.708-15.996Zm1.164 8.941-1.948-4.298-1.948 4.298h3.896ZM0 20l6.708-15.996h3.414L3.414 20H0Z"
);

// 3. Google Gemini official star
function GeminiIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A73E8" />
          <stop offset="50%" stopColor="#8AB4F8" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <path
        fill="url(#geminiGrad)"
        d="M12 24c0-6.627-5.373-12-12-12 6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12z"
      />
    </svg>
  );
}

// 4. Groq official mark
const GroqIcon = createIcon(
  "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10c0-1.1-.18-2.16-.51-3.15h-3.21c.45.96.72 2.03.72 3.15 0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7c1.88 0 3.59.74 4.86 1.95l2.12-2.12C17.27 3.13 14.78 2 12 2zm3 8v4h5v-4h-5z"
);

// 5. DeepSeek official whale silhouette
const DeepSeekIcon = createIcon(
  "M4.5 13.5C2.5 11 3.5 7.5 6.5 6c3-1.5 7.5-1 11 1.5 2.5 1.8 3.5 4.5 3.5 7 0 2.5-1.5 4.5-4 5.5-3 1.2-7 .8-9.5-.5l-3.5 2 .5-3.5c-2-1.5-2.5-3-2-4.5zm11.5-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
);

// 6. Mistral AI official pixel-chevron mark
const MistralIcon = createIcon(
  "M3 3h3.6v3.6H3zm14.4 0H21v3.6h-3.6zM6.6 6.6h3.6v3.6H6.6zm7.2 0h3.6v3.6h-3.6zM10.2 10.2h3.6v3.6h-3.6zM3 13.8h3.6v3.6H3zm14.4 0H21v3.6h-3.6zM3 17.4h3.6V21H3zm7.2 0h3.6V21h-3.6zm7.2 0H21V21h-3.6z"
);

// 7. OpenRouter official isometric cube
const OpenRouterIcon = createIcon(
  "M12 2.5 3.5 7.4v9.8L12 22.1l8.5-4.9V7.4L12 2.5Zm0 2.3 6.5 3.7-6.5 3.8-6.5-3.8L12 4.8ZM5.5 9.4l5.5 3.2v6.3L5.5 15.7V9.4Zm13 6.3-5.5 3.2v-6.3l5.5-3.2v6.3Z"
);

// 8. Qwen (Alibaba Cloud) mark
const QwenIcon = createIcon(
  "M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9zm0 2.5a6.5 6.5 0 0 1 6.5 6.5c0 1.4-.4 2.7-1.2 3.8L9.8 8.3c1.1-.8 2.4-1.3 3.8-1.3zm-6.5 6.5c0-1.4.4-2.7 1.2-3.8l7.5 7.5c-1.1.8-2.4 1.3-3.8 1.3a6.5 6.5 0 0 1-6.5-6.5z"
);

// 9. xAI (Grok) mark
const XAIIcon = createIcon(
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
);

// 10. Ollama llama silhouette
const OllamaIcon = createIcon(
  "M9 3a2 2 0 0 1 2 2v2.5a.5.5 0 0 0 .5.5H13a2 2 0 0 1 2 2v1a1 1 0 0 0 1 1h1a2 2 0 0 1 2 2v2a3 3 0 0 1-3 3h-1v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-4H10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4H6a3 3 0 0 1-3-3v-3a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2h1zm-1 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
);

// 11. LM Studio mark
const LMStudioIcon = createIcon(
  "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v10h2V7H8zm4 4v6h2v-6h-2zm4-2v8h2V9h-2z"
);

// 12. Perplexity star
const PerplexityIcon = createIcon(
  "M12 2v7.5L6.5 4 4 6.5 9.5 12 4 17.5 6.5 20l5.5-5.5V22h3v-7.5l5.5 5.5 2.5-2.5L17.5 12 23 6.5 20.5 4 15 9.5V2h-3z"
);

// 13. Hugging Face smiling face
const HuggingFaceIcon = createIcon(
  "M12 2a10 10 0 0 0-7.8 16.3c.5-.7 1.3-1.1 2.2-1.1.6 0 1.2.2 1.7.6.9-.5 2-.8 3.2-.8s2.3.3 3.2.8c.5-.4 1.1-.6 1.7-.6.9 0 1.7.4 2.2 1.1A10 10 0 0 0 12 2zm-3.5 7.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-7 5.5a4 4 0 0 0 7 0h-7z"
);

// 14. Together AI cluster
const TogetherIcon = createIcon(
  "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-6.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm13 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8 17a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
);

// 15. GitHub Copilot mark
const CopilotIcon = createIcon(
  "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
);

// 16. MiniMax sound wave mark
const MiniMaxIcon = createIcon(
  "M4 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4-4a2 2 0 1 0 0 12 2 2 0 0 0 0-12zm4 2a2 2 0 1 0 0 8 2 2 0 0 0 0-8zm4-2a2 2 0 1 0 0 12 2 2 0 0 0 0-12zm4 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
);

// 17. Nous Research portal mark
const NousIcon = createIcon(
  "M12 2 2 7v10l10 5 10-5V7L12 2zm0 2.8 7.5 3.75v7.5L12 19.8l-7.5-3.75v-7.5L12 4.8zm0 3.2L6.5 11l5.5 3 5.5-3-5.5-3z"
);

// 18. DeepInfra lightning pulse
const DeepInfraIcon = createIcon(
  "M13 2 4 14h7l-2 8 11-12h-7l2-8z"
);

// 19. Fireworks AI burst
function FireworksIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-15.07-7.07 2.83 2.83m10.48 10.48 2.83 2.83M4.93 19.07l2.83-2.83m10.48-10.48 2.83-2.83M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  );
}

// 20. Custom endpoint server mark
const CustomServerIcon = createIcon(
  "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm0 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4zm4-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
);

export interface BrandMeta {
  Icon: BrandIconComponent;
  color: string;
  bgTint: string;
  borderColor: string;
}

export const PROVIDER_BRANDS: Record<string, BrandMeta> = {
  openai: {
    Icon: OpenAIIcon,
    color: "#10A37F",
    bgTint: "bg-[#10A37F]/10 text-[#10A37F]",
    borderColor: "border-[#10A37F]/25",
  },
  anthropic: {
    Icon: AnthropicIcon,
    color: "#D97706",
    bgTint: "bg-[#D97706]/10 text-[#D97706]",
    borderColor: "border-[#D97706]/25",
  },
  gemini: {
    Icon: GeminiIcon,
    color: "#1A73E8",
    bgTint: "bg-[#1A73E8]/10 text-[#1A73E8]",
    borderColor: "border-[#1A73E8]/25",
  },
  groq: {
    Icon: GroqIcon,
    color: "#F55036",
    bgTint: "bg-[#F55036]/10 text-[#F55036]",
    borderColor: "border-[#F55036]/25",
  },
  deepseek: {
    Icon: DeepSeekIcon,
    color: "#0C8CE9",
    bgTint: "bg-[#0C8CE9]/10 text-[#0C8CE9]",
    borderColor: "border-[#0C8CE9]/25",
  },
  mistral: {
    Icon: MistralIcon,
    color: "#FF7000",
    bgTint: "bg-[#FF7000]/10 text-[#FF7000]",
    borderColor: "border-[#FF7000]/25",
  },
  openrouter: {
    Icon: OpenRouterIcon,
    color: "#6366F1",
    bgTint: "bg-[#6366F1]/10 text-[#6366F1]",
    borderColor: "border-[#6366F1]/25",
  },
  qwen: {
    Icon: QwenIcon,
    color: "#FF6A00",
    bgTint: "bg-[#FF6A00]/10 text-[#FF6A00]",
    borderColor: "border-[#FF6A00]/25",
  },
  xai: {
    Icon: XAIIcon,
    color: "#111827",
    bgTint: "bg-ink/10 text-ink dark:bg-white/10 dark:text-white",
    borderColor: "border-ink/20 dark:border-white/20",
  },
  ollama: {
    Icon: OllamaIcon,
    color: "#111827",
    bgTint: "bg-ink/10 text-ink dark:bg-white/10 dark:text-white",
    borderColor: "border-ink/20 dark:border-white/20",
  },
  lmstudio: {
    Icon: LMStudioIcon,
    color: "#7928CA",
    bgTint: "bg-[#7928CA]/10 text-[#7928CA]",
    borderColor: "border-[#7928CA]/25",
  },
  perplexity: {
    Icon: PerplexityIcon,
    color: "#22B8CD",
    bgTint: "bg-[#22B8CD]/10 text-[#22B8CD]",
    borderColor: "border-[#22B8CD]/25",
  },
  huggingface: {
    Icon: HuggingFaceIcon,
    color: "#E89D00",
    bgTint: "bg-[#FFD21E]/15 text-[#E89D00]",
    borderColor: "border-[#FFD21E]/30",
  },
  together: {
    Icon: TogetherIcon,
    color: "#0F6FFF",
    bgTint: "bg-[#0F6FFF]/10 text-[#0F6FFF]",
    borderColor: "border-[#0F6FFF]/25",
  },
  copilot: {
    Icon: CopilotIcon,
    color: "#24292F",
    bgTint: "bg-ink/10 text-ink dark:bg-white/10 dark:text-white",
    borderColor: "border-ink/20 dark:border-white/20",
  },
  minimax: {
    Icon: MiniMaxIcon,
    color: "#00D084",
    bgTint: "bg-[#00D084]/10 text-[#00D084]",
    borderColor: "border-[#00D084]/25",
  },
  nous: {
    Icon: NousIcon,
    color: "#7C3AED",
    bgTint: "bg-[#7C3AED]/10 text-[#7C3AED]",
    borderColor: "border-[#7C3AED]/25",
  },
  deepinfra: {
    Icon: DeepInfraIcon,
    color: "#3B82F6",
    bgTint: "bg-[#3B82F6]/10 text-[#3B82F6]",
    borderColor: "border-[#3B82F6]/25",
  },
  fireworks: {
    Icon: FireworksIcon,
    color: "#E11D48",
    bgTint: "bg-[#E11D48]/10 text-[#E11D48]",
    borderColor: "border-[#E11D48]/25",
  },
};

export function ProviderBrandLogo({
  id,
  className,
  size = "md",
}: {
  id: string;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const cleanId = id.toLowerCase().replace(/^custom:/, "");
  const brand = PROVIDER_BRANDS[cleanId];
  const Icon = brand?.Icon || CustomServerIcon;

  const sizeClasses = {
    sm: "h-8 w-8 rounded-[10px]",
    md: "h-11 w-11 rounded-[14px]",
    lg: "h-12 w-12 rounded-[16px]",
  }[size];

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  if (!brand) {
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center border border-line bg-soft text-ink select-none",
          sizeClasses,
          className
        )}
      >
        <CustomServerIcon className={iconSizes} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center border select-none transition-transform",
        sizeClasses,
        brand.bgTint,
        brand.borderColor,
        className
      )}
    >
      <Icon className={iconSizes} />
    </div>
  );
}
