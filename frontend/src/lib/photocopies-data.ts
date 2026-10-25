export interface SingleOption {
  id: string;
  sizeLabel: string;
  sizeKey: string;
  copies: string;
  price: number;
  aspectRatio: string; // CSS aspect-ratio value
}

export interface SetSize {
  id: string;
  sizeLabel: string;
  sizeKey: string;
  pricePerPiece: number;
  aspectRatio: string;
  copiesPerUnit?: number; // defaults to 1
}

export const singleOptions: SingleOption[] = [
  {
    id: "single-6x4",
    sizeLabel: "6 × 4 inches",
    sizeKey: "6x4",
    copies: "2 Copies Pack",
    price: 100,
    aspectRatio: "6/4",
  },
  {
    id: "single-6x8",
    sizeLabel: "6 × 8 inches",
    sizeKey: "6x8",
    copies: "1 Copy",
    price: 100,
    aspectRatio: "6/8",
  },
  {
    id: "single-8x12",
    sizeLabel: "8 × 12 inches",
    sizeKey: "8x12",
    copies: "1 Large Copy",
    price: 200,
    aspectRatio: "8/12",
  },
];

export const setSizes: SetSize[] = [
  {
    id: "set-6x4",
    sizeLabel: "6 × 4 inches (Set of 2)",
    sizeKey: "6x4",
    pricePerPiece: 99,
    aspectRatio: "6/4",
    copiesPerUnit: 2,
  },
  {
    id: "set-6x8",
    sizeLabel: "6 × 8 inches",
    sizeKey: "6x8",
    pricePerPiece: 99,
    aspectRatio: "6/8",
  },
];
