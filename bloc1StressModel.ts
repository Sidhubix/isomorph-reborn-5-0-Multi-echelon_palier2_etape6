// ============================================================================
// ISOMORPH-Reborn — Modèle continu de variation d'impact & stress (Bloc 1)
// Permet de faire varier l'impact attendu sur l'IP via un potentiomètre horizontal (0% à 100%).
// - Borne 0% : Chocs faibles, réseau surcapacitaire, décisions ultra-efficaces -> IP préservé (~1.0).
// - 50% : Étalonnage nominal (DEFAULT_MODEL_PARAMS).
// - Borne 100% : Chocs violents et longs, demande explosive, décisions quasi inopérantes -> IP très dégradé (<0.3).
// ============================================================================

import { ModelParams } from './bloc1Types';
import { DEFAULT_MODEL_PARAMS } from './bloc1DefaultParams';

const roundDec = (val: number, decimals: number = 3): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Profil de stress minimal (Borne 0% — Résilience Maximale, IP Préservé)
const MIN_STRESS_PARAMS: ModelParams = {
  network: {
    nFactories: 3,
    nWarehouses: 9,
    factoryCapacityMin: 280,
    factoryCapacityMax: 400,
    primaryEdgeCapacityMin: 90,
    primaryEdgeCapacityMax: 150,
    secondaryEdgeCapacityMin: 35,
    secondaryEdgeCapacityMax: 65,
    tertiaryEdgeCapacityMin: 20,
    tertiaryEdgeCapacityMax: 40,
    warehouseShipCapacityMin: 80,
    warehouseShipCapacityMax: 140,
    importantShareMin: 0.10,
    importantShareMax: 0.30,
    demandNoiseMin: 0.01,
    demandNoiseMax: 0.03,
  },
  disruption: {
    severityMin: 0.15,
    severityMax: 0.35,
    binarySeverityMin: 0.30,
    binarySeverityMax: 0.50,
    durationMinDays: 1,
    durationMaxDays: 4,
    picDemandeAmplificationAtMaxSeverity: 1.25,
    coupureLienWarehouseFrictionPct: 0.20,
    coupureLienOtherEdgesFrictionPct: 0.08,
    coupureLienPrimaryEdgeProbability: 0.35,
  },
  demand: {
    utilizationMin: 0.55,
    utilizationMax: 0.75,
    warmupSafetyMargin: 0.95,
  },
  decisions: {
    d1_factoryBoostPct: 0.45,
    d2_warehouseBoostPct: 0.55,
    d3_recoveryFraction: 0.90,
    d4_recoveryFraction: 0.90,
    d5_globalBoostPct: 0.35,
    d6_stockBoostShareOfDemand: 0.55,
    d6_depletionDays: 18,
    d7_recoveryFraction: 0.45,
    d8_regularDemandCutPct: 0.45,
    d9_regularDemandDeferPct: 0.55,
  },
  profiles: {
    reactif: {
      detectionThreshold: 0.99,
      smoothingWindowDays: 1,
      decisionDelayDays: 0,
      reevaluationDays: 1,
      escalationOrder: ['D1', 'D2', 'D4', 'D3', 'D5', 'D8', 'D9', 'D6', 'D7'],
    },
    prudent: {
      detectionThreshold: 0.97,
      smoothingWindowDays: 2,
      decisionDelayDays: 1,
      reevaluationDays: 2,
      escalationOrder: ['D6', 'D7', 'D3', 'D4', 'D1', 'D2', 'D5', 'D8', 'D9'],
    },
    tardif: {
      detectionThreshold: 0.94,
      smoothingWindowDays: 3,
      decisionDelayDays: 2,
      reevaluationDays: 3,
      escalationOrder: ['D8', 'D9', 'D5', 'D6', 'D1', 'D2', 'D3', 'D4', 'D7'],
    },
  },
  indicators: { ...DEFAULT_MODEL_PARAMS.indicators },
  flow: { ...DEFAULT_MODEL_PARAMS.flow },
  temporal: { ...DEFAULT_MODEL_PARAMS.temporal },
};

// Profil de stress maximal (Borne 100% — Vulnérabilité Critique, IP Très Dégradé)
const MAX_STRESS_PARAMS: ModelParams = {
  network: {
    nFactories: 3,
    nWarehouses: 9,
    factoryCapacityMin: 150,
    factoryCapacityMax: 240,
    primaryEdgeCapacityMin: 40,
    primaryEdgeCapacityMax: 75,
    secondaryEdgeCapacityMin: 5,
    secondaryEdgeCapacityMax: 15,
    tertiaryEdgeCapacityMin: 2,
    tertiaryEdgeCapacityMax: 8,
    warehouseShipCapacityMin: 35,
    warehouseShipCapacityMax: 65,
    importantShareMin: 0.25,
    importantShareMax: 0.60,
    demandNoiseMin: 0.08,
    demandNoiseMax: 0.16,
  },
  disruption: {
    severityMin: 0.85,
    severityMax: 1.0,
    binarySeverityMin: 0.95,
    binarySeverityMax: 1.0,
    durationMinDays: 12,
    durationMaxDays: 32,
    picDemandeAmplificationAtMaxSeverity: 3.8,
    coupureLienWarehouseFrictionPct: 0.95,
    coupureLienOtherEdgesFrictionPct: 0.65,
    coupureLienPrimaryEdgeProbability: 0.95,
  },
  demand: {
    utilizationMin: 1.30,
    utilizationMax: 1.70,
    warmupSafetyMargin: 0.999,
  },
  decisions: {
    d1_factoryBoostPct: 0.06,
    d2_warehouseBoostPct: 0.06,
    d3_recoveryFraction: 0.15,
    d4_recoveryFraction: 0.15,
    d5_globalBoostPct: 0.04,
    d6_stockBoostShareOfDemand: 0.08,
    d6_depletionDays: 3,
    d7_recoveryFraction: 0.05,
    d8_regularDemandCutPct: 0.08,
    d9_regularDemandDeferPct: 0.08,
  },
  profiles: {
    reactif: {
      detectionThreshold: 0.90,
      smoothingWindowDays: 3,
      decisionDelayDays: 3,
      reevaluationDays: 5,
      escalationOrder: ['D1', 'D2', 'D4', 'D3', 'D5', 'D8', 'D9', 'D6', 'D7'],
    },
    prudent: {
      detectionThreshold: 0.80,
      smoothingWindowDays: 6,
      decisionDelayDays: 7,
      reevaluationDays: 10,
      escalationOrder: ['D6', 'D7', 'D3', 'D4', 'D1', 'D2', 'D5', 'D8', 'D9'],
    },
    tardif: {
      detectionThreshold: 0.70,
      smoothingWindowDays: 9,
      decisionDelayDays: 12,
      reevaluationDays: 15,
      escalationOrder: ['D8', 'D9', 'D5', 'D6', 'D1', 'D2', 'D3', 'D4', 'D7'],
    },
  },
  indicators: { ...DEFAULT_MODEL_PARAMS.indicators },
  flow: { ...DEFAULT_MODEL_PARAMS.flow },
  temporal: { ...DEFAULT_MODEL_PARAMS.temporal },
};

/**
 * Calcule l'ensemble complet des paramètres du modèle à partir du niveau de stress (0 à 100).
 */
export function computeModelParamsFromStress(stress: number): ModelParams {
  const clamped = Math.max(0, Math.min(100, stress));
  const isLower = clamped <= 50;
  const t = isLower ? clamped / 50 : (clamped - 50) / 50;
  const pA = isLower ? MIN_STRESS_PARAMS : DEFAULT_MODEL_PARAMS;
  const pB = isLower ? DEFAULT_MODEL_PARAMS : MAX_STRESS_PARAMS;

  return {
    network: {
      nFactories: DEFAULT_MODEL_PARAMS.network.nFactories,
      nWarehouses: DEFAULT_MODEL_PARAMS.network.nWarehouses,
      factoryCapacityMin: Math.round(lerp(pA.network.factoryCapacityMin, pB.network.factoryCapacityMin, t)),
      factoryCapacityMax: Math.round(lerp(pA.network.factoryCapacityMax, pB.network.factoryCapacityMax, t)),
      primaryEdgeCapacityMin: Math.round(lerp(pA.network.primaryEdgeCapacityMin, pB.network.primaryEdgeCapacityMin, t)),
      primaryEdgeCapacityMax: Math.round(lerp(pA.network.primaryEdgeCapacityMax, pB.network.primaryEdgeCapacityMax, t)),
      secondaryEdgeCapacityMin: Math.round(lerp(pA.network.secondaryEdgeCapacityMin, pB.network.secondaryEdgeCapacityMin, t)),
      secondaryEdgeCapacityMax: Math.round(lerp(pA.network.secondaryEdgeCapacityMax, pB.network.secondaryEdgeCapacityMax, t)),
      tertiaryEdgeCapacityMin: Math.round(lerp(pA.network.tertiaryEdgeCapacityMin, pB.network.tertiaryEdgeCapacityMin, t)),
      tertiaryEdgeCapacityMax: Math.round(lerp(pA.network.tertiaryEdgeCapacityMax, pB.network.tertiaryEdgeCapacityMax, t)),
      warehouseShipCapacityMin: Math.round(lerp(pA.network.warehouseShipCapacityMin, pB.network.warehouseShipCapacityMin, t)),
      warehouseShipCapacityMax: Math.round(lerp(pA.network.warehouseShipCapacityMax, pB.network.warehouseShipCapacityMax, t)),
      importantShareMin: roundDec(lerp(pA.network.importantShareMin, pB.network.importantShareMin, t), 2),
      importantShareMax: roundDec(lerp(pA.network.importantShareMax, pB.network.importantShareMax, t), 2),
      demandNoiseMin: roundDec(lerp(pA.network.demandNoiseMin, pB.network.demandNoiseMin, t), 3),
      demandNoiseMax: roundDec(lerp(pA.network.demandNoiseMax, pB.network.demandNoiseMax, t), 3),
    },
    disruption: {
      severityMin: roundDec(lerp(pA.disruption.severityMin, pB.disruption.severityMin, t), 2),
      severityMax: roundDec(lerp(pA.disruption.severityMax, pB.disruption.severityMax, t), 2),
      binarySeverityMin: roundDec(lerp(pA.disruption.binarySeverityMin, pB.disruption.binarySeverityMin, t), 2),
      binarySeverityMax: roundDec(lerp(pA.disruption.binarySeverityMax, pB.disruption.binarySeverityMax, t), 2),
      durationMinDays: Math.round(lerp(pA.disruption.durationMinDays, pB.disruption.durationMinDays, t)),
      durationMaxDays: Math.round(lerp(pA.disruption.durationMaxDays, pB.disruption.durationMaxDays, t)),
      picDemandeAmplificationAtMaxSeverity: roundDec(lerp(pA.disruption.picDemandeAmplificationAtMaxSeverity, pB.disruption.picDemandeAmplificationAtMaxSeverity, t), 2),
      coupureLienWarehouseFrictionPct: roundDec(lerp(pA.disruption.coupureLienWarehouseFrictionPct, pB.disruption.coupureLienWarehouseFrictionPct, t), 2),
      coupureLienOtherEdgesFrictionPct: roundDec(lerp(pA.disruption.coupureLienOtherEdgesFrictionPct, pB.disruption.coupureLienOtherEdgesFrictionPct, t), 2),
      coupureLienPrimaryEdgeProbability: roundDec(lerp(pA.disruption.coupureLienPrimaryEdgeProbability, pB.disruption.coupureLienPrimaryEdgeProbability, t), 2),
    },
    demand: {
      utilizationMin: roundDec(lerp(pA.demand.utilizationMin, pB.demand.utilizationMin, t), 2),
      utilizationMax: roundDec(lerp(pA.demand.utilizationMax, pB.demand.utilizationMax, t), 2),
      warmupSafetyMargin: roundDec(lerp(pA.demand.warmupSafetyMargin, pB.demand.warmupSafetyMargin, t), 4),
    },
    decisions: {
      d1_factoryBoostPct: roundDec(lerp(pA.decisions.d1_factoryBoostPct, pB.decisions.d1_factoryBoostPct, t), 2),
      d2_warehouseBoostPct: roundDec(lerp(pA.decisions.d2_warehouseBoostPct, pB.decisions.d2_warehouseBoostPct, t), 2),
      d3_recoveryFraction: roundDec(lerp(pA.decisions.d3_recoveryFraction, pB.decisions.d3_recoveryFraction, t), 2),
      d4_recoveryFraction: roundDec(lerp(pA.decisions.d4_recoveryFraction, pB.decisions.d4_recoveryFraction, t), 2),
      d5_globalBoostPct: roundDec(lerp(pA.decisions.d5_globalBoostPct, pB.decisions.d5_globalBoostPct, t), 2),
      d6_stockBoostShareOfDemand: roundDec(lerp(pA.decisions.d6_stockBoostShareOfDemand, pB.decisions.d6_stockBoostShareOfDemand, t), 2),
      d6_depletionDays: Math.round(lerp(pA.decisions.d6_depletionDays, pB.decisions.d6_depletionDays, t)),
      d7_recoveryFraction: roundDec(lerp(pA.decisions.d7_recoveryFraction, pB.decisions.d7_recoveryFraction, t), 2),
      d8_regularDemandCutPct: roundDec(lerp(pA.decisions.d8_regularDemandCutPct, pB.decisions.d8_regularDemandCutPct, t), 2),
      d9_regularDemandDeferPct: roundDec(lerp(pA.decisions.d9_regularDemandDeferPct, pB.decisions.d9_regularDemandDeferPct, t), 2),
    },
    profiles: {
      reactif: {
        detectionThreshold: roundDec(lerp(pA.profiles.reactif.detectionThreshold, pB.profiles.reactif.detectionThreshold, t), 2),
        smoothingWindowDays: Math.round(lerp(pA.profiles.reactif.smoothingWindowDays, pB.profiles.reactif.smoothingWindowDays, t)),
        decisionDelayDays: Math.round(lerp(pA.profiles.reactif.decisionDelayDays, pB.profiles.reactif.decisionDelayDays, t)),
        reevaluationDays: Math.round(lerp(pA.profiles.reactif.reevaluationDays, pB.profiles.reactif.reevaluationDays, t)),
        escalationOrder: DEFAULT_MODEL_PARAMS.profiles.reactif.escalationOrder,
      },
      prudent: {
        detectionThreshold: roundDec(lerp(pA.profiles.prudent.detectionThreshold, pB.profiles.prudent.detectionThreshold, t), 2),
        smoothingWindowDays: Math.round(lerp(pA.profiles.prudent.smoothingWindowDays, pB.profiles.prudent.smoothingWindowDays, t)),
        decisionDelayDays: Math.round(lerp(pA.profiles.prudent.decisionDelayDays, pB.profiles.prudent.decisionDelayDays, t)),
        reevaluationDays: Math.round(lerp(pA.profiles.prudent.reevaluationDays, pB.profiles.prudent.reevaluationDays, t)),
        escalationOrder: DEFAULT_MODEL_PARAMS.profiles.prudent.escalationOrder,
      },
      tardif: {
        detectionThreshold: roundDec(lerp(pA.profiles.tardif.detectionThreshold, pB.profiles.tardif.detectionThreshold, t), 2),
        smoothingWindowDays: Math.round(lerp(pA.profiles.tardif.smoothingWindowDays, pB.profiles.tardif.smoothingWindowDays, t)),
        decisionDelayDays: Math.round(lerp(pA.profiles.tardif.decisionDelayDays, pB.profiles.tardif.decisionDelayDays, t)),
        reevaluationDays: Math.round(lerp(pA.profiles.tardif.reevaluationDays, pB.profiles.tardif.reevaluationDays, t)),
        escalationOrder: DEFAULT_MODEL_PARAMS.profiles.tardif.escalationOrder,
      },
    },
    // Constantes exposées au palier 1 : hors des 4 piliers du potentiomètre,
    // elles gardent leur valeur par défaut à tous les niveaux.
    indicators: { ...DEFAULT_MODEL_PARAMS.indicators },
    flow: { ...DEFAULT_MODEL_PARAMS.flow },
    temporal: { ...DEFAULT_MODEL_PARAMS.temporal },
  };
}

// Applique un niveau du potentiomètre en conservant les réglages qui ne sont
// pas des leviers d'impact : constantes de calcul (section 6 : indicators,
// flow) et réglages du mode temporel (temporal : commutateur, délais par
// défaut, jours de couverture). Utilisé par l'onglet Générateur.
export function applyStressLevelPreservingSettings(current: ModelParams, level: number): ModelParams {
  return { ...computeModelParamsFromStress(level), indicators: current.indicators, flow: current.flow, temporal: current.temporal };
}

export interface StressDescriptor {
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  ipTendency: string;
  summary: string;
}

export function getStressLevelDescription(stress: number): StressDescriptor {
  if (stress <= 15) {
    return {
      label: 'Impact Minimal (Bouclier Robuste)',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-500',
      glowColor: 'shadow-emerald-500/20',
      ipTendency: 'IP très élevé (0.85 → 1.00) • Réseau quasi insensible au choc',
      summary: 'Chocs mineurs et très brefs, surcapacités larges, décisions managériales instantanées et ultra-efficaces.',
    };
  }
  if (stress <= 35) {
    return {
      label: 'Impact Faible (Haute Résilience)',
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
      textColor: 'text-teal-700',
      borderColor: 'border-teal-500',
      glowColor: 'shadow-teal-500/20',
      ipTendency: 'IP modérément affecté (0.75 → 0.95) • Rétablissement rapide',
      summary: 'Perturbations douces, réserves de stock confortables, réactivité managériale élevée.',
    };
  }
  if (stress <= 65) {
    return {
      label: 'Impact Moyen (Étalonnage Nominal)',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-500',
      glowColor: 'shadow-amber-500/20',
      ipTendency: 'IP réaliste standard (0.45 → 0.85) • Différenciation nette des 4 branches',
      summary: 'Paramètres théoriques d\'origine. Équilibre représentatif entre choc, friction et leviers de décision.',
    };
  }
  if (stress <= 85) {
    return {
      label: 'Impact Sévère (Forte Dégradation)',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-300',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-500',
      glowColor: 'shadow-orange-500/20',
      ipTendency: 'IP très bas (0.20 → 0.50) • Effet domino et rémission difficile',
      summary: 'Chocs intenses et durables, tension sur les flux, délais d\'intervention allongés et stocks restreints.',
    };
  }
  return {
    label: 'Stress Extrême (Vulnérabilité Critique)',
    badgeBg: 'bg-red-100 text-red-800 border-red-300',
    textColor: 'text-red-700',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/20',
    ipTendency: 'IP effondré (< 0.25) • Rupture critique et convalescence très lente',
    summary: 'Chocs destructeurs et prolongés, pic de demande x4, blocage logistique quasi total, décisions inopérantes.',
  };
}
