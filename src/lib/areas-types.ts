export interface AreaFAQ {
  q: string;
  a: string;
}

export interface CityData {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  heroLine1: string;
  heroLine2: string;
  heroSubhead: string;
  intro: string;
  whySell: string;
  keywords: string[];
  faqs: AreaFAQ[];
  nearbySlugs: string[];
}

export interface StateData {
  slug: string;
  name: string;
  abbr: string;
  metaTitle: string;
  metaDescription: string;
  heroLine1: string;
  heroLine2: string;
  heroSubhead: string;
  intro: string;
  keywords: string[];
  faqs: AreaFAQ[];
  cities: CityData[];
}
