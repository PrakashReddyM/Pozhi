export type SnapCategory = "individual" | "family";

export interface SnapPackage {
  id: string;
  label: string;
  copies: number;
  price: number;
  description?: string;
}

export interface SnapCategoryData {
  id: SnapCategory;
  label: string;
  subtitle: string;
  packages: SnapPackage[];
}

export const snapCategories: SnapCategoryData[] = [
  {
    id: "individual",
    label: "Individual",
    subtitle: "1 Person",
    packages: [
      { id: "ind-16", label: "16 Copies", copies: 16, price: 319 },
      { id: "ind-24", label: "24 Copies", copies: 24, price: 419 },
    ],
  },
  {
    id: "family",
    label: "Family",
    subtitle: "Combo · 4 Members",
    packages: [
      { id: "fam-8", label: "8 Copies", copies: 8, price: 549, description: "Per member" },
      { id: "fam-16", label: "16 Copies", copies: 16, price: 799, description: "Per member" },
    ],
  },
];
