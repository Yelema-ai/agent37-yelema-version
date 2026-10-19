import { PageBody } from "@/components/app/PageBody";
import { VoiceKeysView } from "@/components/integrations/VoiceKeysView";

// Intégrations · Voix : la clé de transcription du client, pour la dictée et les notes vocales.
export default function Page() {
  return (
    <PageBody>
      <div className="max-w-5xl">
        <VoiceKeysView />
      </div>
    </PageBody>
  );
}
