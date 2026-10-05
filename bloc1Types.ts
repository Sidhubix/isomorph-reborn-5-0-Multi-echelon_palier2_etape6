// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : types partagés par le moteur et par l'interface.
// ============================================================================

import type { NetworkDocument } from './bloc1NetworkFormat';

export type NodeType = 'factory' | 'warehouse' | 'client';

export interface NodeDef {
  id: string;
  type: NodeType;
  name: string;
}

export interface EdgeDef {
  from: string;
  to: string;
  baseCapacity: number;
}

// ----------------------------------------------------------------------------
// Réseau générique (palier 1) : graphe orienté typé. Une capacité null signifie
// « illimitée » ; elle n'est jamais représentée par une valeur infinie dans les
// calculs (voir bloc1Flow.ts).
// ----------------------------------------------------------------------------
export type NetworkNodeType = 'fournisseur' | 'usine' | 'hub' | 'entrepot' | 'transporteur' | 'client';

export interface NetworkNode {
  id: string;
  type: NetworkNodeType;
  name: string;
  // Nœud source (aucun arc entrant) : capacité de production.
  // Nœud intermédiaire : débit traversant (le nœud est dédoublé dans le flot).
  // Client : toujours null.
  capacity: number | null;
}

export interface NetworkArc {
  from: string;
  to: string;
  capacity: number | null;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  arcs: NetworkArc[]; // l'ordre des arcs fait partie du réseau (ordre de construction du flot)
}

// Valeurs temporelles explicites d'un réseau JSON (palier 2). Un élément
// absent de ces tables prend la valeur par défaut de ModelParams.temporal.
export interface NetworkTiming {
  productionLeadTimeDays: Record<string, number>;    // par nœud de production
  travelTimeDays: Record<string, number>;            // par arc, clé "from|to"
  inventory: Record<string, { s: number; S: number }>; // par nœud de stockage
}

export interface NetworkInstance {
  factories: NodeDef[];
  warehouses: NodeDef[];
  client: NodeDef;
  edges: EdgeDef[];
  factoryCapacity: Record<string, number>;
  warehouseShipCapacity: Record<string, number>;
  baseDemand: number;
  importantShare: number;
  demandNoise: number;
  // Délais et politiques de stock lus dans un réseau explicite (palier 2).
  // Présent seulement si le mode temporel est activé ; jamais lu sinon.
  timing?: NetworkTiming;
  // Expression générique du même réseau, utilisée par le calcul du flot.
  // Pour le réseau paramétrique, elle est dérivée des champs ci-dessus sans
  // aucun tirage aléatoire (voir buildParametricGraph).
  graph: NetworkGraph;
}

export type DisruptionType =
  | 'panne_fournisseur'
  | 'coupure_lien'
  | 'fermeture_entrepot'
  | 'pic_demande'
  | 'congestion';

export interface Disruption {
  id: string;
  type: DisruptionType;
  start: number;
  duration: number;
  severity: number;
  // Noms historiques conservés. Réseau générique :
  //   targetFactory   = nœud du groupe production (usine ou fournisseur) ;
  //   targetWarehouse = nœud du groupe stockage (entrepôt ou hub).
  targetFactory?: string;
  targetEdge?: { from: string; to: string };
  targetWarehouse?: string;
}

export type DecisionFamily = 'reroutage' | 'capacite' | 'stock' | 'demande';

export type BranchId = 'none' | 'reactif' | 'prudent' | 'tardif';
export const BRANCH_IDS: BranchId[] = ['none', 'reactif', 'prudent', 'tardif'];

export interface DecisionEffectContext {
  network: NetworkInstance;
  disruption: Disruption;
  day: number;
  params: ModelParams;
}

export interface DecisionDef {
  id: string;
  family: DecisionFamily;
  label: string;
  description: string;
  apply: (state: DailyState, ctx: DecisionEffectContext) => void;
}

// État journalier des capacités (palier 1, étape 3b : forme générique).
// Seules les capacités FINIES y figurent : un nœud ou un arc de capacité
// nominale illimitée (null) en est absent et reste illimité tout le jour.
//   nodeCapacity : capacité de production (nœud source) ou débit traversant
//                  (nœud intermédiaire), par identifiant de nœud ;
//   edgeCapacity : capacité par arc, clé "from|to" (comme avant).
export interface DailyState {
  nodeCapacity: Record<string, number>;
  edgeCapacity: Record<string, number>;
  demand: number;
  importantShare: number;
}

export interface ManagerProfileDef {
  id: 'reactif' | 'prudent' | 'tardif';
  label: string;
  detectionThreshold: number;
  smoothingWindowDays: number;
  decisionDelayDays: number;
  reevaluationDays: number;
  escalationOrder: string[];
}

export interface AppliedDecision {
  scenario_id: string;
  branch_id: BranchId;
  decision_id: string;
  family: DecisionFamily;
  day_rel: number;
  detected_day_rel: number;
}

export interface IpPoint {
  scenario_id: string;
  branch_id: BranchId;
  day_rel: number;
  ip: number;
}

export interface BranchSummary {
  scenario_id: string;
  branch_id: BranchId;
  ip_min: number;
  day_of_ip_min: number;
  area_lost: number;
  nb_decisions: number;
  recovery_day: number | null;
}

// ----------------------------------------------------------------------------
// Paramètres du modèle — TOUTE valeur numérique posée par hypothèse (faute
// d'information d'origine) est réunie ici, avec une valeur par défaut
// raisonnable. C'est cette structure que l'onglet "Hypothèses du modèle"
// expose et permet de modifier sans toucher au code.
// ----------------------------------------------------------------------------

export interface ManagerProfileParams {
  detectionThreshold: number;
  smoothingWindowDays: number;
  decisionDelayDays: number;
  reevaluationDays: number;
  escalationOrder: string[]; // ids de décisions D1..D9, dans l'ordre d'essai — réordonnable dans l'interface
}

export interface DecisionEffectParams {
  // Famille reroutage
  d1_factoryBoostPct: number;      // D1 : hausse de capacité des usines de secours
  d2_warehouseBoostPct: number;    // D2 : hausse de capacité des entrepôts de secours
  // Famille capacité
  d3_recoveryFraction: number;     // D3 : part de la capacité usine perdue restaurée
  d4_recoveryFraction: number;     // D4 : part de la capacité lien/entrepôt perdue restaurée
  d5_globalBoostPct: number;       // D5 : hausse globale de capacité d'expédition
  // Famille stock
  d6_stockBoostShareOfDemand: number; // D6 : volume forfaitaire (fraction de la demande de référence)
  d6_depletionDays: number;           // D6 : durée d'épuisement du stock de sécurité
  d7_recoveryFraction: number;        // D7 : part de la capacité perdue compensée par pré-positionnement
  // Famille demande
  d8_regularDemandCutPct: number;  // D8 : réduction de la demande non critique servie
  d9_regularDemandDeferPct: number;// D9 : part de la demande non critique reportée hors fenêtre
}

export interface DisruptionSeverityParams {
  // Plage générale (dégradations continues : panne partielle, congestion, pic de demande)
  severityMin: number;
  severityMax: number;
  // Plage "binaire" (coupure de lien, fermeture d'entrepôt : rupture quasi-totale)
  binarySeverityMin: number;
  binarySeverityMax: number;
  durationMinDays: number;
  durationMaxDays: number;
  // pic_demande : multiplicateur de demande à sévérité = 1 (demande x (1+2*s) par défaut)
  picDemandeAmplificationAtMaxSeverity: number;
  // coupure_lien : friction de rattrapage sur l'entrepôt desservi
  coupureLienWarehouseFrictionPct: number;
  // coupure_lien : friction résiduelle sur les autres liens du même entrepôt
  coupureLienOtherEdgesFrictionPct: number;
  // coupure_lien : probabilité de cibler le lien principal (plutôt qu'un lien quelconque)
  coupureLienPrimaryEdgeProbability: number;
  // fermeture_entrepot : friction reportée sur les liens vers l'entrepôt fermé (déjà à 1-s dans le moteur ; exposé pour ajustement)
}

export interface NetworkGenerationParams {
  nFactories: number;
  nWarehouses: number;
  factoryCapacityMin: number;
  factoryCapacityMax: number;
  primaryEdgeCapacityMin: number;
  primaryEdgeCapacityMax: number;
  secondaryEdgeCapacityMin: number;
  secondaryEdgeCapacityMax: number;
  tertiaryEdgeCapacityMin: number;
  tertiaryEdgeCapacityMax: number;
  warehouseShipCapacityMin: number;
  warehouseShipCapacityMax: number;
  importantShareMin: number;
  importantShareMax: number;
  demandNoiseMin: number;
  demandNoiseMax: number;
}

export interface DemandCalibrationParams {
  // Rapport demande / débit disponible PENDANT l'incident (voir calibrateDemand).
  utilizationMin: number;
  utilizationMax: number;
  // Marge de sécurité sur le débit hors incident, pour garantir IP = 1 en warm-up.
  warmupSafetyMargin: number; // ex. 0.97 = on ne consomme jamais plus de 97 % du débit hors incident
}

// Constantes auparavant codées en dur, exposées au palier 1 (décision Q10).
// Valeurs par défaut identiques à l'ancien code.
export interface IndicatorParams {
  importantWeight: number;     // poids des articles importants dans l'IP (ancien 3 codé en dur)
  recoveryThreshold: number;   // IP à partir duquel une branche est rétablie (ancien 0,98 codé en dur)
}

export interface FlowParams {
  maxIterations: number;       // garde sur le nombre de chemins augmentants (ancien 5000 codé en dur)
}

// Mode temporel (palier 2). Désactivé par défaut : le moteur du palier 1 est
// alors utilisé sans aucune modification. Les délais et jours de couverture
// sont des hypothèses de modélisation réglables (aucune donnée d'origine).
export interface TemporalParams {
  enabled: boolean;                      // commutateur du plan (décision Q1 A du palier 2)
  defaultTravelTimeDays: number;         // délai de trajet d'un arc sans valeur explicite (jours entiers)
  defaultProductionLeadTimeDays: number; // délai de production d'un nœud de production sans valeur explicite (jours entiers)
  reorderPointDays: number;              // s = jours de couverture x demande de référence / nombre de nœuds de stockage
  orderUpToDays: number;                 // S = jours de couverture x demande de référence / nombre de nœuds de stockage
  burnInDays: number;                    // pré-chauffe non enregistrée avant le warm-up (remplit les files de transit)
  d7OrderUpToBoostPct: number;           // D7 en mode temporel : hausse relative de s et S tant que D7 est active
  lastMileSameDay: boolean;              // arcs vers le client servis le jour même (délai de trajet ignoré sur ces arcs)
}

export interface ModelParams {
  network: NetworkGenerationParams;
  disruption: DisruptionSeverityParams;
  demand: DemandCalibrationParams;
  decisions: DecisionEffectParams;
  profiles: Record<'reactif' | 'prudent' | 'tardif', ManagerProfileParams>;
  // Ajoutés au palier 1. Absents des fichiers d'hypothèses, bundles et
  // sauvegardes Cloud antérieurs : complétés par withModelParamDefaults().
  indicators: IndicatorParams;
  flow: FlowParams;
  // Ajouté au palier 2. Absent des fichiers antérieurs : complété par
  // withModelParamDefaults() (mode temporel désactivé).
  temporal: TemporalParams;
}

// ----------------------------------------------------------------------------
// Plan d'expériences
// ----------------------------------------------------------------------------

// Réseau utilisé par le plan :
//   parametrique : règle historique, paramètres de ModelParams.network ;
//   explicite    : document JSON au format isomorph-reborn-network (réseau
//                  ISOMORPH prédéfini ou réseau importé), recopié en entier dans
//                  la configuration pour que la restauration reste possible.
export type NetworkSpec =
  | { kind: 'parametrique' }
  | { kind: 'explicite'; document: NetworkDocument };

export interface ExperimentPlanConfig {
  nScenarios: number;
  seed: number;
  warmupDays: number;
  horizonDays: number;
  disruptionTypes: DisruptionType[];
  params: ModelParams;
  // Facultatif. Absent = réseau paramétrique : c'est le cas de toutes les
  // configurations, bundles et sauvegardes Cloud produits avant le palier 1.
  // Ne jamais écrire ce champ à undefined (Firestore refuse les valeurs undefined) :
  // l'omettre.
  network?: NetworkSpec;
}

export interface ScenarioRecord {
  scenario_id: string;
  n_factories: number;  // groupe production (usines et fournisseurs) — sur ISOMORPH, les 3 usines
  n_warehouses: number; // groupe stockage (entrepôts et hubs) — sur ISOMORPH, le hub Nashville et les 8 entrepôts
  base_demand: number;
  important_share: number;
  warmup_days: number;
  horizon_days: number;
  // Colonnes ajoutées au palier 1 (décision Q7 B) : identité et taille du
  // réseau du scénario. network_id : "parametrique" pour le réseau par défaut,
  // sinon l'identifiant du réseau explicite (ex. "isomorph-originel").
  network_id: string;
  n_nodes: number;
  n_edges: number;
  n_echelons: number;
}

export interface PerturbationRecord {
  scenario_id: string;
  type: DisruptionType;
  start: number;
  duration: number;
  severity: number;
  target: string;
}

export interface ScenarioDataset {
  scenarios: ScenarioRecord[];
  perturbations: PerturbationRecord[];
  decisions: AppliedDecision[];
  ipTimeseries: IpPoint[];
  branches: BranchSummary[];
  metadata: {
    generator: string;
    version: string;
    generated_at: string;
    config: ExperimentPlanConfig;
  };
}

export interface ResilienceRow {
  scenario_id: string;
  branch_id: string;
  k: number;
  q: number;
  h: number;
  g: number;
  d: number;
  alpha: number;
  beta: number;
  r2: number;
  rmse: number;
  r2_smooth: number;
  crd: number;
  ipc: number;
  trp: number;
  sra: number;
  err: number;
  pr: number;
  sse?: number;
  points?: { x: number; y: number }[];
}

export interface SimulationProcessBundle {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt?: string;
  summary: {
    nScenarios: number;
    nPoints?: number;
    seed: number;
    warmupDays: number;
    horizonDays: number;
    disruptionTypes: string[];
    nBranches: number;
    nDecisions: number;
    nResilienceRows: number;
    avgR2?: number;
    avgPR?: number;
  };
  config: ExperimentPlanConfig;
  compactDataset?: {
    scenarios: ScenarioRecord[];
    perturbations: PerturbationRecord[];
    decisions: AppliedDecision[];
    branches: BranchSummary[];
    metadata: ScenarioDataset['metadata'];
  };
  resilienceRows?: ResilienceRow[];
  resilienceCsv?: string;
}
