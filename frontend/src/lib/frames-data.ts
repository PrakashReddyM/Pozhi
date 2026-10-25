export type FrameMaterial = "glass" | "lamination";

export interface FrameSize {
  id: string;
  sizeLabel: string;
  dimensions: string;
  price: number;
  aspectRatio: string;
  orientation: "portrait" | "landscape";
}

export interface MaterialOption {
  id: FrameMaterial;
  label: string;
  description: string;
}

export const materials: MaterialOption[] = [
  { id: "glass", label: "Glass Frame", description: "Glossy Finish" },
  { id: "lamination", label: "Lamination Frame", description: "Matte Finish" },
];

export const frameSizes: FrameSize[] = [
  {
    id: "4x6",
    sizeLabel: "4 × 6 inches",
    dimensions: "4x6",
    price: 149,
    aspectRatio: "2/3",
    orientation: "portrait",
  },
  {
    id: "6x8",
    sizeLabel: "6 × 8 inches",
    dimensions: "6x8",
    price: 249,
    aspectRatio: "3/4",
    orientation: "portrait",
  },
  {
    id: "8x12",
    sizeLabel: "8 × 12 inches",
    dimensions: "8x12",
    price: 449,
    aspectRatio: "2/3",
    orientation: "portrait",
  },
  {
    id: "12x10",
    sizeLabel: "12 × 10 inches",
    dimensions: "12x10",
    price: 449,
    aspectRatio: "6/5",
    orientation: "landscape",
  },
  {
    id: "10x15",
    sizeLabel: "10 × 15 inches",
    dimensions: "10x15",
    price: 549,
    aspectRatio: "2/3",
    orientation: "portrait",
  },
  {
    id: "12x15",
    sizeLabel: "12 × 15 inches",
    dimensions: "12x15",
    price: 649,
    aspectRatio: "4/5",
    orientation: "portrait",
  },
  {
    id: "12x18",
    sizeLabel: "12 × 18 inches",
    dimensions: "12x18",
    price: 849,
    aspectRatio: "2/3",
    orientation: "portrait",
  },
];
