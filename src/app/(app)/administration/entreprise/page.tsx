import { PageBody } from "@/components/app/PageBody";
import { CompanyProfileView } from "@/components/company/CompanyProfileView";

// Administration · Entreprise : le logo, la présentation et les documents de référence de
// l'entreprise. Rien n'est obligatoire ; ce qui manque est rappelé sur l'accueil de l'administrateur.
export default function Page() {
  return (
    <PageBody>
      <CompanyProfileView />
    </PageBody>
  );
}
