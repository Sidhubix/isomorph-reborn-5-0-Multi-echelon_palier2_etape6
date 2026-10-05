// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : valeurs par défaut de toutes les hypothèses
// numériques du moteur. C'est la SEULE source de vérité pour ces valeurs :
// le moteur ne contient plus aucune constante figée en dehors de ce fichier.
// L'onglet "Hypothèses du modèle" lit et modifie exactement cette structure.
// ============================================================================

import { ModelParams, TemporalParams } from './bloc1Types';

export const DEFAULT_MODEL_PARAMS: ModelParams = {
  network: {
    nFactories: 3,
    nWarehouses: 9,
    factoryCapacityMin: 200,
    factoryCapacityMax: 320,
    primaryEdgeCapacityMin: 60,
    primaryEdgeCapacityMax: 110,
    secondaryEdgeCapacityMin: 15,
    secondaryEdgeCapacityMax: 35,
    tertiaryEdgeCapacityMin: 10,
    tertiaryEdgeCapacityMax: 20,
    warehouseShipCapacityMin: 50,
    warehouseShipCapacityMax: 100,
    importantShareMin: 0.15,
    importantShareMax: 0.45,
    demandNoiseMin: 0.03,
    demandNoiseMax: 0.08,
  },
  disruption: {
    severityMin: 0.5,
    severityMax: 1.0,
    binarySeverityMin: 0.8,
    binarySeverityMax: 1.0,
    durationMinDays: 3,
    durationMaxDays: 15,
    picDemandeAmplificationAtMaxSeverity: 2.0, // demande x(1+2*s), soit x3 à s=1
    coupureLienWarehouseFrictionPct: 0.7,
    coupureLienOtherEdgesFrictionPct: 0.3,
    coupureLienPrimaryEdgeProbability: 0.75,
  },
  demand: {
    utilizationMin: 0.85,
    utilizationMax: 1.15,
    warmupSafetyMargin: 0.995,
  },
  decisions: {
    d1_factoryBoostPct: 0.20,
    d2_warehouseBoostPct: 0.25,
    d3_recoveryFraction: 0.50,
    d4_recoveryFraction: 0.50,
    d5_globalBoostPct: 0.15,
    d6_stockBoostShareOfDemand: 0.30,
    d6_depletionDays: 10,
    d7_recoveryFraction: 0.20,
    d8_regularDemandCutPct: 0.25,
    d9_regularDemandDeferPct: 0.30,
  },
  profiles: {
    reactif: {
      detectionThreshold: 0.97,
      smoothingWindowDays: 1,
      decisionDelayDays: 1,
      reevaluationDays: 2,
      escalationOrder: ['D1', 'D2', 'D4', 'D3', 'D5', 'D8', 'D9', 'D6', 'D7'],
    },
    prudent: {
      detectionThreshold: 0.92,
      smoothingWindowDays: 4,
      decisionDelayDays: 3,
      reevaluationDays: 5,
      escalationOrder: ['D6', 'D7', 'D3', 'D4', 'D1', 'D2', 'D5', 'D8', 'D9'],
    },
    tardif: {
      detectionThreshold: 0.85,
      smoothingWindowDays: 6,
      decisionDelayDays: 6,
      reevaluationDays: 8,
      escalationOrder: ['D8', 'D9', 'D5', 'D6', 'D1', 'D2', 'D3', 'D4', 'D7'],
    },
  },
  indicators: {
    importantWeight: 3,
    recoveryThreshold: 0.98,
  },
  flow: {
    maxIterations: 5000,
  },
  temporal: {
    enabled: false,
    defaultTravelTimeDays: 0,
    defaultProductionLeadTimeDays: 0,
    reorderPointDays: 3,
    orderUpToDays: 10,
    burnInDays: 60,
    d7OrderUpToBoostPct: 0.5,
    lastMileSameDay: true,
  },
};

// Copie profonde utilitaire — utilisée par l'interface pour le bouton
// "Réinitialiser les valeurs par défaut" sans partager la référence globale.
export function cloneDefaultModelParams(): ModelParams {
  return JSON.parse(JSON.stringify(DEFAULT_MODEL_PARAMS));
}

// Complète des paramètres produits avant le palier 1 (fichier d'hypothèses,
// bundle local, sauvegarde Cloud, stockage du navigateur) avec les valeurs par
// défaut des sections ajoutées depuis. Ne modifie pas l'objet reçu.
export function withModelParamDefaults(params: ModelParams): ModelParams {
  const p = params as Partial<ModelParams>;
  return {
    ...params,
    indicators: { ...DEFAULT_MODEL_PARAMS.indicators, ...(p.indicators ?? {}) },
    flow: { ...DEFAULT_MODEL_PARAMS.flow, ...(p.flow ?? {}) },
    temporal: { ...DEFAULT_MODEL_PARAMS.temporal, ...(p.temporal ?? {}) },
  };
}

// Bornes techniques du mode temporel (palier 2, étape 5). Ce ne sont pas des
// hypothèses de modélisation : elles protègent la mémoire et le temps de calcul
// (un délai de D jours alloue une file de D cases par arc et par branche, la
// pré-chauffe est rejouée à chaque essai de calibration).
export const TEMPORAL_MAX_DELAY_DAYS = 365;
export const TEMPORAL_MAX_BURN_IN_DAYS = 365;

// Problèmes des réglages temporels ; liste vide = réglages valides. Utilisée par
// le moteur (refus explicite avant tout calcul) et par l'interface (affichage).
export function temporalParamProblems(t: TemporalParams): string[] {
  const out: string[] = [];
  const isInt = (x: number, max: number) => Number.isFinite(x) && Number.isInteger(x) && x >= 0 && x <= max;
  if (!isInt(t.defaultTravelTimeDays, TEMPORAL_MAX_DELAY_DAYS)) out.push(`Le délai de trajet par défaut doit être un nombre entier de jours entre 0 et ${TEMPORAL_MAX_DELAY_DAYS}.`);
  if (!isInt(t.defaultProductionLeadTimeDays, TEMPORAL_MAX_DELAY_DAYS)) out.push(`Le délai de production par défaut doit être un nombre entier de jours entre 0 et ${TEMPORAL_MAX_DELAY_DAYS}.`);
  if (!isInt(t.burnInDays, TEMPORAL_MAX_BURN_IN_DAYS)) out.push(`La pré-chauffe doit être un nombre entier de jours entre 0 et ${TEMPORAL_MAX_BURN_IN_DAYS}.`);
  const coverageOk = (x: number) => Number.isFinite(x) && x >= 0;
  if (!coverageOk(t.reorderPointDays)) out.push('Les jours de couverture de s doivent être un nombre positif ou nul.');
  if (!coverageOk(t.orderUpToDays)) out.push('Les jours de couverture de S doivent être un nombre positif ou nul.');
  if (coverageOk(t.reorderPointDays) && coverageOk(t.orderUpToDays) && t.reorderPointDays > t.orderUpToDays) out.push('Les jours de couverture de s ne peuvent pas dépasser ceux de S.');
  if (!(Number.isFinite(t.d7OrderUpToBoostPct) && t.d7OrderUpToBoostPct >= 0)) out.push('La hausse de s et S par D7 doit être un nombre positif ou nul.');
  return out;
}
