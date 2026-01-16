export enum ProductType {
  CUSHION = 'Cojín decorativo',
  SEAT = 'Asiento',
  BACKREST = 'Espaldar',
  MATTRESS = 'Colchoneta'
}

export enum FabricGroup {
  A = 'A',
  B = 'B'
}

export enum FoamType {
  ECONOMY = 'Básica',
  STANDARD = 'Estándar',
  PREMIUM = 'Premium'
}

export interface Fabric {
  name: string;
  image: string;
}

export interface QuoteData {
  type: ProductType;
  width: number;
  height: number;
  thickness: number;
  cushionSizeLabel?: string;
  fabricGroup: FabricGroup;
  fabricName: string;
  foamType?: FoamType;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerData {
  name: string;
  phone: string;
}