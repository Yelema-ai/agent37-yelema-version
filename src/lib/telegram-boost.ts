import "server-only";
import { spawn } from "node:child_process";
import { join } from "node:path";

export interface TelegramBoostResult {
  ok: boolean;
  message?: string;
  error?: string;
  already_boosted?: boolean;
  slots?: number[];
}

/**
 * Booste automatiquement un supergroupe Telegram via le compte Telegram Premium configuré.
 * Nécessite TELEGRAM_API_ID, TELEGRAM_API_HASH et TELEGRAM_SESSION_STRING dans l'environnement.
 */
export async function boostTelegramGroup(chatId: string | number): Promise<TelegramBoostResult> {
  const apiId = process.env.TELEGRAM_API_ID?.trim();
  const apiHash = process.env.TELEGRAM_API_HASH?.trim();
  const sessionStr = process.env.TELEGRAM_SESSION_STRING?.trim();

  if (!apiId || !apiHash || !sessionStr) {
    return {
      ok: false,
      error: "not_configured",
      message: "TELEGRAM_API_ID, TELEGRAM_API_HASH ou TELEGRAM_SESSION_STRING non configurés dans l'environnement.",
    };
  }

  const scriptPath = join(process.cwd(), "scripts", "boost_telegram_group.py");
  const cleanChatId = String(chatId).trim();

  return new Promise((resolve) => {
    const child = spawn("python3", [scriptPath, cleanChatId], {
      env: {
        ...process.env,
        TELEGRAM_API_ID: apiId,
        TELEGRAM_API_HASH: apiHash,
        TELEGRAM_SESSION_STRING: sessionStr,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim()) as TelegramBoostResult;
          return resolve(parsed);
        } catch {}
      }
      if (code !== 0) {
        return resolve({
          ok: false,
          error: "process_failed",
          message: stderr.trim() || stdout.trim() || `Le script de boost a échoué avec le code ${code}`,
        });
      }
      resolve({ ok: true, message: stdout.trim() });
    });

    child.on("error", (err) => {
      resolve({
        ok: false,
        error: "spawn_error",
        message: err.message,
      });
    });
  });
}
