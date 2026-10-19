import { PageBody } from "@/components/app/PageBody";
import { VaultView } from "@/components/integrations/VaultView";

// Intégrations · Identifiants : les accès à des sites que le membre confie à un expert. Ils vivent
// chiffrés dans le coffre de l'instance ; ni l'app ni le back-office n'en gardent rien.
export default function Page() {
  return (
    <PageBody>
      <VaultView />
    </PageBody>
  );
}
