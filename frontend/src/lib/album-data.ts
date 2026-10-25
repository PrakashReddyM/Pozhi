export type CoverType = "basic" | "custom";

export interface AlbumCapacity {
  id: string;
  images: number;
  price: number;
  label: string;
}

export const albumCapacities: AlbumCapacity[] = [
  { id: "cap-40", images: 40, price: 2000, label: "40 Images" },
  { id: "cap-60", images: 60, price: 3000, label: "60 Images" },
  { id: "cap-80", images: 80, price: 4000, label: "80 Images" },
  { id: "cap-100", images: 100, price: 5000, label: "100 Images" },
];
