import { PageBody } from "@/components/app/PageBody";
import { ModelsView } from "@/components/models/ModelsView";

// Intégrations · Modèles : le compte de modèle sur lequel tournent les experts. Pour un admin,
// celui de toute l'entreprise ou d'un membre ; pour un membre, d'où vient le sien, et sa propre clé
// si son admin l'a permis. Le back-office garde et pose les clés ; l'app n'écrit sur aucune instance.
export default function Page() {
  return (
    <PageBody>
      <ModelsView />
    </PageBody>
  );
}
