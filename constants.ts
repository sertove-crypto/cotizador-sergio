import { FabricGroup, FoamType } from './types';

export const BUSINESS_WHATSAPP = '593963799733'; 

export const CUSHION_BASE_FACTOR = 3.00; 
export const CUSHION_AREA_FACTOR = 0.0025;
export const CUSHION_PREMIUM_SURCHARGE = 1.00;

export const FURNITURE_VOLUME_FACTOR = 0.0006; 
export const FURNITURE_PREMIUM_FABRIC_ADD = 3.00; 

export const STANDARD_MATTRESS_PRICES = [
  { w: 100, h: 50, t: 5, unit: 25 },
  { w: 200, h: 100, t: 5, unit: 75 },
  { w: 200, h: 100, t: 10, unit: 115 },
  { w: 200, h: 140, t: 20, unit: 210 }
];

export const FOAM_MULTIPLIERS = {
  [FoamType.ECONOMY]: 0.85,
  [FoamType.STANDARD]: 1.00,
  [FoamType.PREMIUM]: 1.40
};