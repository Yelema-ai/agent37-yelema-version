import { PageBody } from "@/components/app/PageBody";
import { VoiceKeysView } from "@/components/integrations/VoiceKeysView";
import { ExpertVoices } from "@/components/voice/ExpertVoices";

// Intégrations · Voix : la voix de chaque Expert en appel, puis la clé de transcription du client
// pour la dictée et les notes vocales.
export default function Page() {
  return (
    <PageBody>
      <div className="max-w-5xl space-y-8">
        <h2 className="sr-only">Voix</h2>
        <ExpertVoices />
        <VoiceKeysView />
      </div>
    </PageBody>
  );
}
