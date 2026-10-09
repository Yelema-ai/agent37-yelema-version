import "server-only";
import { agent37 } from "@/lib/agent37";
import { ApiError } from "@/lib/http";

export interface ProviderDefinition {
  id: string;
  name: string;
  envVar: string;
  providerCode: string; // Used in config.yaml model.provider
  description: string;
  defaultModel: string;
  models: string[];
  docUrl: string;
  placeholderKey: string;
}

export const KNOWN_PROVIDERS: ProviderDefinition[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    providerCode: "anthropic",
    description: "Claude 3.7 Sonnet (hybride raisonnement), Claude 3.5 Sonnet & Haiku, Claude 3 Opus.",
    defaultModel: "claude-3-7-sonnet-20250219",
    models: [
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    docUrl: "https://console.anthropic.com/settings/keys",
    placeholderKey: "sk-ant-api03-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    providerCode: "openai-api",
    description: "Modèles GPT-4o, GPT-4o mini, o1 et o3-mini directement via l'API OpenAI.",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "gpt-4-turbo"],
    docUrl: "https://platform.openai.com/api-keys",
    placeholderKey: "sk-proj-...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    envVar: "OPENROUTER_API_KEY",
    providerCode: "openrouter",
    description: "Accès unifié à plus de 300 modèles (Claude, Llama 3.3, DeepSeek, Gemini, etc.).",
    defaultModel: "anthropic/claude-3.7-sonnet",
    models: [
      "anthropic/claude-3.7-sonnet",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "google/gemini-2.5-pro",
      "google/gemini-2.0-flash-001",
    ],
    docUrl: "https://openrouter.ai/keys",
    placeholderKey: "sk-or-v1-...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    envVar: "GEMINI_API_KEY",
    providerCode: "gemini",
    description: "Modèles multimodaux Google : Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash et 1.5 Pro.",
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
    docUrl: "https://aistudio.google.com/app/apikey",
    placeholderKey: "AIzaSy...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    providerCode: "deepseek",
    description: "Modèles de pointe pour le code et le raisonnement (DeepSeek V3 & DeepSeek R1).",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docUrl: "https://platform.deepseek.com/api_keys",
    placeholderKey: "sk-...",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    envVar: "MISTRAL_API_KEY",
    providerCode: "mistral",
    description: "Modèles européens haute performance : Mistral Large, Codestral, Pixtral.",
    defaultModel: "mistral-large-latest",
    models: ["mistral-large-latest", "codestral-latest", "mistral-small-latest", "pixtral-large-latest"],
    docUrl: "https://console.mistral.ai/api-keys",
    placeholderKey: "...",
  },
  {
    id: "groq",
    name: "Groq",
    envVar: "GROQ_API_KEY",
    providerCode: "groq",
    description: "Inférence LPU ultra-rapide pour Llama 3.3 et DeepSeek R1 distillés.",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
    docUrl: "https://console.groq.com/keys",
    placeholderKey: "gsk_...",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    envVar: "XAI_API_KEY",
    providerCode: "xai",
    description: "Modèles Grok 2 et Grok Vision développés par xAI.",
    defaultModel: "grok-2-1212",
    models: ["grok-2-1212", "grok-2-vision-1212", "grok-beta"],
    docUrl: "https://console.x.ai/",
    placeholderKey: "xai-...",
  },
  {
    id: "together",
    name: "Together AI",
    envVar: "TOGETHER_API_KEY",
    providerCode: "together",
    description: "Hébergement cloud de modèles open-source haute performance.",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3"],
    docUrl: "https://api.together.ai/settings/api-keys",
    placeholderKey: "...",
  },
];

export interface ProviderStatus extends ProviderDefinition {
  isConfigured: boolean;
  maskedKey: string | null;
  isActive: boolean;
}

export interface CustomProviderInfo {
  name: string;
  baseUrl: string;
  model: string;
  hasKey: boolean;
  maskedKey?: string;
  isActive: boolean;
}

export interface ModelSettingsResponse {
  activeProvider: string;
  activeModel: string;
  isStarterActive: boolean;
  providers: ProviderStatus[];
  customProviders: CustomProviderInfo[];
}

const PYTHON = "/usr/local/lib/hermes/hermes-agent/venv/bin/python";

function maskApiKey(key: string): string {
  if (!key || key.length < 6) return "••••••••";
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Get current LLM model configuration from instance (~/.hermes/.env and ~/.hermes/config.yaml)
 */
export async function getInstanceModelConfig(instanceId: string): Promise<ModelSettingsResponse> {
  const pyCode = `
import yaml, json, os

# 1. Read .env
env_path = os.path.expanduser("~/.hermes/.env")
env_data = {}
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_data[k.strip()] = v.strip()

# 2. Read config.yaml
cfg_path = os.path.expanduser("~/.hermes/config.yaml")
cfg_data = {}
if os.path.exists(cfg_path):
    with open(cfg_path, "r") as f:
        cfg_data = yaml.safe_load(f) or {}

active_model_cfg = cfg_data.get("model", {})
active_provider = active_model_cfg.get("provider", "custom:Agent37")
active_model = active_model_cfg.get("default") or active_model_cfg.get("model") or "default"
custom_providers = cfg_data.get("custom_providers", [])

print(json.dumps({
    "env": env_data,
    "active_provider": active_provider,
    "active_model": active_model,
    "custom_providers": custom_providers if isinstance(custom_providers, list) else []
}))
`;

  try {
    const execRes = await agent37.exec(instanceId, `${PYTHON} -c '${pyCode}'`);
    if (execRes.exit_code !== 0) {
      console.warn(`[models] fetch failed for ${instanceId}:`, execRes.stderr);
      return {
        activeProvider: "custom:Agent37",
        activeModel: "default",
        isStarterActive: true,
        providers: KNOWN_PROVIDERS.map((p) => ({
          ...p,
          isConfigured: false,
          maskedKey: null,
          isActive: false,
        })),
        customProviders: [],
      };
    }

    const parsed = JSON.parse(execRes.stdout.trim() || "{}");
    const envData: Record<string, string> = parsed.env || {};
    const activeProvider = parsed.active_provider || "custom:Agent37";
    const activeModel = parsed.active_model || "default";
    const isStarterActive = activeProvider.includes("Agent37") || activeProvider === "custom:Agent37";

    const providers: ProviderStatus[] = KNOWN_PROVIDERS.map((p) => {
      const rawKey = envData[p.envVar] || (p.id === "gemini" ? envData["GOOGLE_API_KEY"] : "");
      const isConfigured = Boolean(rawKey && rawKey.length > 5);
      const isActive = !isStarterActive && activeProvider === p.providerCode;

      return {
        ...p,
        isConfigured,
        maskedKey: isConfigured ? maskApiKey(rawKey) : null,
        isActive,
      };
    });

    const customProviders: CustomProviderInfo[] = (parsed.custom_providers || [])
      .filter((cp: any) => cp && cp.name && cp.name !== "Agent37")
      .map((cp: any) => {
        const rawKey = cp.api_key || "";
        const isActive = activeProvider === `custom:${cp.name}`;
        return {
          name: cp.name,
          baseUrl: cp.base_url || "",
          model: cp.model || "",
          hasKey: Boolean(rawKey),
          maskedKey: rawKey ? maskApiKey(rawKey) : undefined,
          isActive,
        };
      });

    return {
      activeProvider,
      activeModel,
      isStarterActive,
      providers,
      customProviders,
    };
  } catch (err) {
    console.warn(`[models] failed to parse model config for ${instanceId}:`, err);
    throw new ApiError(500, "fetch_failed", "Impossible de récupérer la configuration des modèles.");
  }
}

/**
 * Configure or update a provider's API key and optionally set it as default active model
 */
export async function saveInstanceProviderKey(
  instanceId: string,
  input: {
    providerId: string;
    apiKey?: string;
    model?: string;
    setActive?: boolean;
    baseUrl?: string;
    customName?: string;
  }
): Promise<void> {
  const { providerId, apiKey = "", model, setActive = true, baseUrl, customName } = input;

  const known = KNOWN_PROVIDERS.find((p) => p.id === providerId);

  if (!known && providerId !== "custom" && providerId !== "agent37_starter") {
    throw new ApiError(400, "invalid_provider", `Fournisseur inconnu : ${providerId}`);
  }

  const pyCode = `
import yaml, os, glob

provider_id = ${JSON.stringify(providerId)}
api_key = ${JSON.stringify(apiKey.trim())}
model = ${JSON.stringify((model || "").trim())}
set_active = ${JSON.stringify(Boolean(setActive))}
base_url = ${JSON.stringify((baseUrl || "").trim())}
custom_name = ${JSON.stringify((customName || "").trim())}

# 1. Update ~/.hermes/.env if an API key is provided
env_path = os.path.expanduser("~/.hermes/.env")
env_lines = []
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        env_lines = f.readlines()

env_dict = {}
for line in env_lines:
    line_s = line.strip()
    if line_s and not line_s.startswith("#") and "=" in line_s:
        k, v = line_s.split("=", 1)
        env_dict[k.strip()] = v.strip()

env_var_map = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "groq": "GROQ_API_KEY",
    "xai": "XAI_API_KEY",
    "together": "TOGETHER_API_KEY"
}

target_env_var = env_var_map.get(provider_id)
if target_env_var and api_key:
    env_dict[target_env_var] = api_key
    if target_env_var == "GEMINI_API_KEY":
        env_dict["GOOGLE_API_KEY"] = api_key

# Rewrite .env
with open(env_path, "w") as f:
    for k, v in env_dict.items():
        f.write(f"{k}={v}\\n")

# 2. Update config.yaml and profile configs
cfg_path = os.path.expanduser("~/.hermes/config.yaml")
if os.path.exists(cfg_path):
    with open(cfg_path, "r") as f:
        root_cfg = yaml.safe_load(f) or {}
else:
    root_cfg = {}

provider_code_map = {
    "anthropic": "anthropic",
    "openai": "openai-api",
    "openrouter": "openrouter",
    "gemini": "gemini",
    "deepseek": "deepseek",
    "mistral": "mistral",
    "groq": "groq",
    "xai": "xai",
    "together": "together"
}

default_model_map = {
    "anthropic": "claude-3-7-sonnet-20250219",
    "openai": "gpt-4o",
    "openrouter": "anthropic/claude-3.7-sonnet",
    "gemini": "gemini-2.5-pro",
    "deepseek": "deepseek-chat",
    "mistral": "mistral-large-latest",
    "groq": "llama-3.3-70b-versatile",
    "xai": "grok-2-1212",
    "together": "meta-llama/Llama-3.3-70B-Instruct-Turbo"
}

if provider_id == "custom" and custom_name and base_url:
    # Custom provider entry
    if "custom_providers" not in root_cfg or not isinstance(root_cfg["custom_providers"], list):
        root_cfg["custom_providers"] = []
    
    # Check if already exists
    exists = False
    for cp in root_cfg["custom_providers"]:
        if isinstance(cp, dict) and cp.get("name") == custom_name:
            cp["base_url"] = base_url
            if api_key:
                cp["api_key"] = api_key
            if model:
                cp["model"] = model
            exists = True
            break
    if not exists:
        root_cfg["custom_providers"].append({
            "name": custom_name,
            "base_url": base_url,
            "api_key": api_key,
            "model": model or "default",
            "api_mode": "chat_completions"
        })
    
    if set_active:
        root_cfg["model"] = {
            "provider": f"custom:{custom_name}",
            "default": model or "default"
        }

elif provider_id == "agent37_starter":
    if set_active:
        root_cfg["model"] = {
            "provider": "custom:Agent37",
            "default": "default"
        }

elif provider_id in provider_code_map and set_active:
    p_code = provider_code_map[provider_id]
    p_model = model or default_model_map.get(provider_id, "default")
    root_cfg["model"] = {
        "provider": p_code,
        "default": p_model
    }

with open(cfg_path, "w") as f:
    yaml.safe_dump(root_cfg, f, default_flow_style=False)

# 3. Propagate model config to all expert profiles ~/.hermes/profiles/*/config.yaml
for p in glob.glob(os.path.expanduser("~/.hermes/profiles/*")):
    prof_cfg = os.path.join(p, "config.yaml")
    if os.path.isfile(prof_cfg):
        try:
            with open(prof_cfg, "r") as f:
                pdata = yaml.safe_load(f) or {}
            if "model" in root_cfg:
                pdata["model"] = root_cfg["model"]
            if "custom_providers" in root_cfg:
                pdata["custom_providers"] = root_cfg["custom_providers"]
            with open(prof_cfg, "w") as f:
                yaml.safe_dump(pdata, f, default_flow_style=False)
        except Exception as e:
            print(f"WARN profile model sync: {e}")

print("SUCCESS")
`;

  const execRes = await agent37.exec(instanceId, `${PYTHON} -c '${pyCode}'`);
  if (execRes.exit_code !== 0 || !execRes.stdout.includes("SUCCESS")) {
    console.error(`[models] save failed for ${instanceId}:`, execRes.stderr || execRes.stdout);
    throw new ApiError(502, "model_config_failed", "Impossible d'enregistrer la configuration du modèle.");
  }

  // Reload worker process immediately
  try {
    await agent37.exec(instanceId, "pkill -9 -f hermes_worker.py || true");
  } catch {
    // ignore
  }
}

/**
 * Remove an API key / reset provider
 */
export async function deleteInstanceProviderKey(instanceId: string, providerId: string): Promise<void> {
  const pyCode = `
import yaml, os, glob

provider_id = ${JSON.stringify(providerId)}

env_var_map = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "groq": "GROQ_API_KEY",
    "xai": "XAI_API_KEY",
    "together": "TOGETHER_API_KEY"
}

# 1. Remove from .env
env_path = os.path.expanduser("~/.hermes/.env")
target_var = env_var_map.get(provider_id)
if os.path.exists(env_path) and target_var:
    with open(env_path, "r") as f:
        lines = f.readlines()
    with open(env_path, "w") as f:
        for line in lines:
            k = line.split("=")[0].strip() if "=" in line else ""
            if k != target_var and (target_var != "GEMINI_API_KEY" or k != "GOOGLE_API_KEY"):
                f.write(line)

# 2. If this provider was active, reset to Yelema Starter
cfg_path = os.path.expanduser("~/.hermes/config.yaml")
if os.path.exists(cfg_path):
    with open(cfg_path, "r") as f:
        root_cfg = yaml.safe_load(f) or {}
    
    current_p = root_cfg.get("model", {}).get("provider", "")
    provider_code_map = {
        "anthropic": "anthropic",
        "openai": "openai-api",
        "openrouter": "openrouter",
        "gemini": "gemini",
        "deepseek": "deepseek",
        "mistral": "mistral",
        "groq": "groq",
        "xai": "xai",
        "together": "together"
    }
    
    if current_p == provider_code_map.get(provider_id) or (provider_id.startswith("custom:") and current_p == provider_id):
        root_cfg["model"] = {
            "provider": "custom:Agent37",
            "default": "default"
        }
        with open(cfg_path, "w") as f:
            yaml.safe_dump(root_cfg, f, default_flow_style=False)
        
        # Propagate to profiles
        for p in glob.glob(os.path.expanduser("~/.hermes/profiles/*")):
            prof_cfg = os.path.join(p, "config.yaml")
            if os.path.isfile(prof_cfg):
                try:
                    with open(prof_cfg, "r") as f:
                        pdata = yaml.safe_load(f) or {}
                    pdata["model"] = root_cfg["model"]
                    with open(prof_cfg, "w") as f:
                        yaml.safe_dump(pdata, f, default_flow_style=False)
                except Exception:
                    pass

print("SUCCESS")
`;

  const execRes = await agent37.exec(instanceId, `${PYTHON} -c '${pyCode}'`);
  if (execRes.exit_code !== 0) {
    console.error(`[models] delete failed for ${instanceId}:`, execRes.stderr);
    throw new ApiError(502, "model_delete_failed", "Impossible de supprimer la clé API.");
  }

  try {
    await agent37.exec(instanceId, "pkill -9 -f hermes_worker.py || true");
  } catch {
    // ignore
  }
}
