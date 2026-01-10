
export enum ProductType {
  CUSHION = 'Cojín decorativo',
  SEAT = 'Asiento',
  BACKREST = 'Espaldar'
}

export enum FabricGroup {
  A = 'A',
  B = 'B'
}

export enum FoamType {
  ECONOMY = 'Económica',
  STANDARD = 'Estándar',
  PREMIUM = 'Premium'
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
