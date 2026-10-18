// The company profile, as the back office deduces it from what exists: a logo, a presentation (a
// note of the company memory), reference documents. Nothing is ticked by hand.
export interface CompanyProfile {
  logo: boolean;
  note: boolean;
  document: boolean;
  done: number;
  total: number;
  /** The logo's address, carrying its version: a replaced logo changes address. */
  logoUrl: string | null;
  /**
   * Every image of the logo the company keeps (light, dark, square, long…), once the back office
   * stores more than one. The main one is the one shown in the bar, and `logoUrl` is its address.
   * Absent while the back office keeps a single logo.
   */
  logos?: CompanyLogo[];
}

export interface CompanyLogo {
  id: string;
  url: string;
  /** The file's name as it was sent, if the back office keeps it. */
  name: string | null;
  primary: boolean;
}

/** Whether the back office keeps several images of the logo. */
export const keepsSeveralLogos = (p: CompanyProfile): boolean => Array.isArray(p.logos);

/** The logo images to show, the main one first; the single logo alone while only one is kept. */
export function companyLogos(p: CompanyProfile): CompanyLogo[] {
  if (Array.isArray(p.logos)) return [...p.logos].sort((a, b) => Number(b.primary) - Number(a.primary));
  return p.logoUrl ? [{ id: "principal", url: p.logoUrl, name: null, primary: true }] : [];
}

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
export const PRESENTATION_TITLE = "Présentation de l’entreprise";
