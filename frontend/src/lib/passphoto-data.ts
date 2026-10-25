export interface Pack {
  id: string;
  label: string;
  copies: number;
  price: number;
  description?: string;
}

export interface Category {
  id: string;
  label: string;
  columns: number;
  rows: number;
  aspectLabel: string;
  packs: Pack[];
}

export const categories: Category[] = [
  {
    id: "passport",
    label: "Passport Size",
    columns: 4,
    rows: 2,
    aspectLabel: "35 × 45 mm",
    packs: [
      { id: "p-8", label: "8 + 2 Copies", copies: 10, price: 120 },
      { id: "p-16", label: "16 Copies", copies: 16, price: 189 },
      { id: "p-24", label: "24 Copies", copies: 24, price: 239 },
      { id: "p-32", label: "32 Copies", copies: 32, price: 349 },
      { id: "p-64", label: "64 Copies", copies: 64, price: 499 },
    ],
  },
  {
    id: "visa",
    label: "Visa Size",
    columns: 3,
    rows: 2,
    aspectLabel: "51 × 51 mm",
    packs: [
      { id: "v-6", label: "6 Copies", copies: 6, price: 120 },
      { id: "v-12", label: "12 Copies", copies: 12, price: 199 },
    ],
  },
  {
    id: "stamp",
    label: "Stamp Size",
    columns: 4,
    rows: 2,
    aspectLabel: "25 × 30 mm",
    packs: [
      { id: "s-8", label: "8 Copies", copies: 8, price: 99 },
      { id: "s-16", label: "16 Copies", copies: 16, price: 159 },
      {
        id: "s-combo",
        label: "Combo Pack",
        copies: 10,
        price: 120,
        description: "6 Normal + 4 Stamp",
      },
    ],
  },
];
