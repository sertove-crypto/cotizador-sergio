
import { FabricGroup, FoamType } from './types';

export const BUSINESS_WHATSAPP = '593963799733'; 

// Factores para cálculo dinámico de cojines basado en área
// Proyecta: 40x40=$7, 45x45=$8, 50x50=$10
export const CUSHION_BASE_FACTOR = 1.67;
export const CUSHION_AREA_FACTOR = 0.00333;

// Recargo fijo para tela Premium en cojines
export const CUSHION_PREMIUM_SURCHARGE = 2;

// Catálogo Maestro de Telas
export const FABRIC_CATALOG = {
  [FabricGroup.A]: ['Dante', 'Bilbao', 'Estambul', 'Gama', 'Armani Eco', 'Dana', 'Mármol', 'Velez', 'Ebano'],
  [FabricGroup.B]: ['Berlin', 'London', 'Cielo', 'Dogma', 'Fanta', 'Lina', 'Chanel', 'Ginebra', 'Bella', 'Safari', 'Latam', 'Expandible']
};

// Multiplicadores para Mobiliario (Asientos/Espaldares)
export const FOAM_MULTIPLIERS = {
  [FoamType.ECONOMY]: 0.85,
  [FoamType.STANDARD]: 1.00,
  [FoamType.PREMIUM]: 1.40
};

/** 
 * Ajuste de Precio para Mobiliario:
 * Referencia solicitada: 50x50cm (esponja/tela estándar) = $15
 * Cálculo: 50 * 50 * 10 (grosor default) = 25,000 cm3
 * Factor = 15 / 25,000 = 0.0006
 */
export const FURNITURE_VOLUME_FACTOR = 0.0006; 
export const FURNITURE_PREMIUM_FABRIC_ADD = 4.50; // Extra por unidad en Premium
