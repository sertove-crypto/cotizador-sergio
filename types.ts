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