import { FabricGroup, FoamType, Fabric } from './types';

export const BUSINESS_WHATSAPP = '593963799733'; 

/**
 * LÓGICA DE COJINES DECORATIVOS:
 */
export const CUSHION_BASE_FACTOR = 3.00; 
export const CUSHION_AREA_FACTOR = 0.0025;
export const CUSHION_PREMIUM_SURCHARGE = 1.00;

/**
 * LÓGICA DE ASIENTOS/ESPALDARES:
 */
export const FURNITURE_VOLUME_FACTOR = 0.0006; 
export const FURNITURE_PREMIUM_FABRIC_ADD = 3.00; 

/**
 * LÓGICA DE COLCHONETAS
 */
export const STANDARD_MATTRESS_PRICES = [
  { w: 100, h: 50, t: 5, unit: 25 },
  { w: 200, h: 100, t: 5, unit: 75 },
  { w: 200, h: 100, t: 10, unit: 115 },
  { w: 200, h: 140, t: 20, unit: 210 }
];

/**
 * Factor para colchonetas a medida (Por mayor >= 4 unidades)
 */
export const MATTRESS_WHOLESALE_FACTOR = 0.0005;

export const FOAM_MULTIPLIERS = {
  [FoamType.ECONOMY]: 0.85,
  [FoamType.STANDARD]: 1.00,
  [FoamType.PREMIUM]: 1.40
};

export const FABRIC_CATALOG: Record<FabricGroup, Fabric[]> = {
  [FabricGroup.A]: [
    { name: 'Dante', image: 'https://images.unsplash.com/photo-1584184924103-e310d9dc85fc?q=80&w=200&auto=format&fit=crop' }
  ],
  [FabricGroup.B]: [
    { name: 'Berlin', image: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=200&auto=format&fit=crop' }
  ]
};