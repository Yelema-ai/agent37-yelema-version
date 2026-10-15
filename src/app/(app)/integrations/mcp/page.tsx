import { PageBody } from "@/components/app/PageBody";
import { McpView } from "@/components/integrations/McpView";

// Intégrations · MCP : les serveurs d'outils que le client branche sur ses experts. Pour un admin,
// ceux de toute l'entreprise ou d'un membre ; pour un membre, les siens si son admin l'a permis.
// Le back-office garde les jetons et pose les serveurs ; l'app n'écrit sur aucune instance.
export default function Page() {
  return (
    <PageBody>
      <McpView />
    </PageBody>
  );
}
