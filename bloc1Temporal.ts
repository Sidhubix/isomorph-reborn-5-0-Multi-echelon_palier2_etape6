// ============================================================================
// ISOMORPH-Reborn — Moteur temporel (palier 2, étape 3).
//
// Appelé UNIQUEMENT si params.temporal.enabled est vrai. Désactivé, le moteur
// du palier 1 (buildDailyState + maxFlow) est utilisé sans aucune modification.
//
// Principe : les commandes circulent instantanément, seule la matière prend du
// temps. Chaque jour, avec les capacités du jour (DailyState, dégradées par la
// perturbation et modifiées par les décisions, exactement comme au palier 1) :
//   1. arrivées : ce qui a été expédié il y a travel_time_days jours arrive ;
//      ce qui a été produit il y a production_lead_time_days jours est disponible ;
//   2. estimation de l'offre du jour (ordre topologique) : ce que chaque nœud peut
//      expédier aujourd'hui, réparti sur ses arcs sortants par priorité ;
//   3. commandes (ordre topologique inverse) : le client commande la demande du
//      jour ; chaque nœud de stockage applique sa politique (s, S) ; les autres
//      nœuds relaient ; les usines produisent à la commande ; chaque commande est
//      répartie sur les arcs entrants, primaire d'abord, dans la limite de l'offre ;
//   4. production et expéditions (ordre topologique) : chaque nœud expédie ce qui
//      lui est demandé, dans la limite de son stock, de sa capacité d'expédition
//      et de la capacité des arcs, en servant d'abord les liens primaires (Q5 A).
// Le débit livré du jour = ce qui arrive chez le client ce jour-là ; l'IP est
// calculée par observeIp, inchangé.
//
// Hypothèses de ce modèle (documentées, toutes réglables ou dérivées de valeurs
// réglables) :
//   - une perturbation réduit des capacités, elle ne détruit pas de stock ;
//   - une commande non servie n'est pas mémorisée : la politique (s, S) la
//     recalcule le lendemain à partir de la position de stock ;
//   - la demande non servie du client est perdue (pas de report), comme au palier 1 ;
//   - rang d'un arc = rang de sa capacité nominale parmi les arcs entrants de sa
//     destination (le plus large = primaire), égalité départagée par l'ordre du fichier ;
//   - pré-chauffe (burnInDays) sans perturbation ni décision, pour remplir les files
//     de transit avant le premier jour enregistré ; commune aux 4 branches.
// ============================================================================

import { NetworkInstance, DailyState, ModelParams, NetworkNodeType, Disruption } from './bloc1Types';
import { getNetworkGroups, buildDailyState } from './bloc1Network';

type Role = 'source' | 'producer' | 'storage' | 'relay' | 'client';

interface TArc {
  index: number;
  from: string;
  to: string;
  key: string;
  nominal: number | null;
  travel: number;
  rankAtDest: number; // 0 = primaire, 1 = secondaire, ...
}

interface TNode {
  id: string;
  type: NetworkNodeType;
  role: Role;
  lead: number;          // délai de production (nœuds de production)
  s: number;             // point de commande (stockage)
  S: number;             // niveau de recomplètement (stockage)
  replenishLead: number; // délai d'approvisionnement : max (trajet entrant + délai de production du fournisseur)
  nominalThroughput: number; // débit nominal du nœud (journée nominale, délais nuls, flux tendu)
  unlimitedShipping: boolean; // stockage sans capacité propre et à sorties toutes illimitées (règle Q16)
  inArcs: TArc[];        // triés : primaire d'abord
  outArcs: TArc[];       // triés : liens primaires de leurs destinations d'abord
}

export interface TemporalModel {
  nodes: TNode[];        // ordre topologique
  arcs: TArc[];
  byId: Map<string, TNode>;
}

export interface TemporalState {
  onHand: Record<string, number>;   // stock disponible (produits finis pour la production)
  input: Record<string, number>;    // stock d'entrée des usines intermédiaires
  pipe: number[][];                 // par arc (index) : quantités en transit, index 0 = prochaine arrivée
  maturing: Record<string, number[]>; // par nœud de production : production en cours, index 0 = prochaine disponible
  initialStock: number;
  produced: number;
  deliveredTotal: number;
  // Réserve de sécurité de D6 (palier 2, étape 4) : stock supplémentaire,
  // SÉPARÉ du stock ordinaire (onHand, pipe). Invisible pour toute la logique de
  // commande et de production : la trajectoire ordinaire (stocks, transit,
  // commandes, production) est donc rigoureusement la même avec ou sans D6.
  // La réserve descend l'aval avec la capacité laissée libre par les
  // expéditions ordinaires, et n'est livrée au client que pour combler la
  // demande que le stock ordinaire n'a pas pu servir : D6 ne peut donc jamais
  // réduire le débit livré.
  reserve: Record<string, number>;      // par nœud de stockage ou relais
  pipeReserve: number[][];              // par arc : réserve en transit (même profondeur que pipe)
  injected: number;                     // matière ajoutée par D6
  stockTargetFactor: number;            // D7 : multiplicateur de s et S (1 hors D7)
  forceReorder: boolean;                // D7 : commande de recomplètement immédiate (Q6 A), un jour
}

const INF = Number.POSITIVE_INFINITY;
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function isProduction(t: NetworkNodeType) { return t === 'usine' || t === 'fournisseur'; }
function isStorage(t: NetworkNodeType) { return t === 'entrepot' || t === 'hub'; }

// ----------------------------------------------------------------------------
// Modèle statique d'un scénario (structure, délais, politique de stock).
// ----------------------------------------------------------------------------
function buildStructure(network: NetworkInstance, params: ModelParams['temporal'], useTiming: boolean): TemporalModel {
  const graph = network.graph;
  const timing = useTiming ? network.timing : undefined;
  const groups = getNetworkGroups(network);

  const hasIncoming = new Set(graph.arcs.map(a => a.to));
  const clients = new Set(graph.nodes.filter(n => n.type === 'client').map(n => n.id));
  // Dernier kilomètre servi le jour même (réglage lastMileSameDay) : sinon le
  // client recevrait aujourd'hui ce qu'il a commandé il y a quelques jours, et
  // l'IP mesurerait l'écart de bruit entre deux jours plutôt que la
  // disponibilité du réseau.
  const arcs: TArc[] = graph.arcs.map((a, index) => ({
    index, from: a.from, to: a.to, key: `${a.from}|${a.to}`, nominal: a.capacity,
    travel: params.lastMileSameDay && clients.has(a.to) ? 0
      : timing && hasOwn(timing.travelTimeDays, `${a.from}|${a.to}`) ? timing.travelTimeDays[`${a.from}|${a.to}`] : params.defaultTravelTimeDays,
    rankAtDest: 0,
  }));
  // Rang de chaque arc parmi les arcs entrants de sa destination.
  const capKey = (c: number | null) => (c === null ? INF : c);
  const inBy = new Map<string, TArc[]>();
  arcs.forEach(a => { inBy.set(a.to, [...(inBy.get(a.to) ?? []), a]); });
  inBy.forEach(list => {
    const sorted = [...list].sort((x, y) => (capKey(y.nominal) - capKey(x.nominal)) || (x.index - y.index));
    sorted.forEach((a, r) => { a.rankAtDest = r; });
    list.sort((x, y) => x.rankAtDest - y.rankAtDest);
  });

  const nStorage = Math.max(1, groups.storage.length);
  const perNodeDemand = network.baseDemand / nStorage;

  const base = new Map<string, TNode>();
  graph.nodes.forEach(n => {
    const role: Role = n.type === 'client' ? 'client'
      : isProduction(n.type) ? (hasIncoming.has(n.id) ? 'producer' : 'source')
      : isStorage(n.type) ? 'storage' : 'relay';
    const inv = timing?.inventory[n.id];
    const lead = isProduction(n.type)
      ? (timing && hasOwn(timing.productionLeadTimeDays, n.id) ? timing.productionLeadTimeDays[n.id] : params.defaultProductionLeadTimeDays)
      : 0;
    base.set(n.id, {
      id: n.id, type: n.type, role, lead,
      s: role === 'storage' ? (inv ? inv.s : params.reorderPointDays * perNodeDemand) : 0,
      S: role === 'storage' ? (inv ? inv.S : params.orderUpToDays * perNodeDemand) : 0,
      replenishLead: 0, nominalThroughput: 0,
      unlimitedShipping: role === 'storage' && n.capacity === null && graph.arcs.filter(a => a.from === n.id).every(a => a.capacity === null),
      inArcs: inBy.get(n.id) ?? [],
      outArcs: [],
    });
  });
  arcs.forEach(a => base.get(a.from)!.outArcs.push(a));
  base.forEach(n => n.outArcs.sort((x, y) => (x.rankAtDest - y.rankAtDest) || (capKey(y.nominal) - capKey(x.nominal)) || (x.index - y.index)));

  // Ordre topologique (Kahn, dans l'ordre du fichier) ; les réseaux sont acycliques.
  const indeg = new Map<string, number>();
  graph.nodes.forEach(n => indeg.set(n.id, 0));
  arcs.forEach(a => indeg.set(a.to, indeg.get(a.to)! + 1));
  const queue = graph.nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id);
  const order: TNode[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(base.get(u)!);
    for (const a of base.get(u)!.outArcs) {
      indeg.set(a.to, indeg.get(a.to)! - 1);
      if (indeg.get(a.to) === 0) queue.push(a.to);
    }
  }
  if (order.length !== graph.nodes.length) throw new Error('Moteur temporel : le réseau contient un cycle.');
  for (const n of order) n.replenishLead = n.inArcs.reduce((m, a) => Math.max(m, a.travel + base.get(a.from)!.lead), 0);
  return { nodes: order, arcs, byId: base };
}

const INACTIVE: Disruption = { id: 'nominal', type: 'congestion', start: 0, duration: 0, severity: 0 };

// Journée nominale : capacités nominales, sans perturbation ni bruit.
function nominalDay(network: NetworkInstance, params: ModelParams, demand: number): DailyState {
  const d = buildDailyState(network, INACTIVE, -1_000_000, 1, params.disruption);
  d.demand = demand;
  return d;
}

// Débit livrable en une journée par le moteur en flux tendu à délais nuls
// (s = S = 0), pour des capacités et une demande données : c'est le débit que
// la répartition gloutonne du moteur sait écouler (au plus le flot maximal).
// shipmentsOut reçoit les expéditions par arc (même ordre que model.arcs).
export function probeZeroDelayDelivery(network: NetworkInstance, params: ModelParams, daily: DailyState, shipmentsOut?: number[]): number {
  const zero = { ...params.temporal, defaultTravelTimeDays: 0, defaultProductionLeadTimeDays: 0, reorderPointDays: 0, orderUpToDays: 0 };
  const m = buildStructure(network, zero, false);
  m.nodes.forEach(n => { n.s = 0; n.S = 0; });
  return stepTemporalDay(m, initialTemporalState(m), daily, shipmentsOut);
}

// ----------------------------------------------------------------------------
// Modèle d'un scénario, avec s et S selon la décision Q10 D :
//   s = jours de couverture s x part égale + stock en transit nominal
//   S = jours de couverture S x part égale + stock en transit nominal
// part égale = demande de référence / nombre de nœuds de stockage ;
// stock en transit nominal = somme, sur les arcs entrants du nœud, de
// (délai de trajet + délai de production du fournisseur) x débit nominal de
// l'arc (loi de Little : c'est exactement la matière en cours d'acheminement en
// régime nominal). Le débit nominal d'un arc est ce qu'il transporte en une
// journée nominale à délais nuls en flux tendu. À délais nuls, le second terme
// est nul : formule initiale exacte. Un nœud avec un champ inventory explicite
// garde ses valeurs.
// Correction (palier 2, étape 4) : une première version appliquait le plus long
// délai entrant à tout le débit du nœud, ce qui sur-approvisionnait les nœuds
// dont les délais entrants diffèrent (Nashville : 3,4 jours de stock au défaut,
// 1,2 jour même à couverture nulle) et rendait la couverture sans effet.
// ----------------------------------------------------------------------------
export function buildTemporalModel(network: NetworkInstance, params: ModelParams): TemporalModel {
  const model = buildStructure(network, params.temporal, true);
  const shipments: number[] = [];
  probeZeroDelayDelivery(network, params, nominalDay(network, params, network.baseDemand), shipments);
  for (const n of model.nodes) {
    n.nominalThroughput = n.inArcs.reduce((sum, a) => sum + (shipments[a.index] ?? 0), 0);
    if (n.role !== 'storage' || network.timing?.inventory[n.id]) continue;
    const pipeline = n.inArcs.reduce((sum, a) => sum + (a.travel + model.byId.get(a.from)!.lead) * (shipments[a.index] ?? 0), 0);
    n.s += pipeline;
    n.S += pipeline;
  }
  return model;
}

// ----------------------------------------------------------------------------
// Calibration de la demande en mode temporel. Même principe qu'au palier 1
// (calibrateDemand) : demande = utilisation x débit pendant l'incident,
// plafonnée pour que l'IP reste à 1 hors incident malgré le bruit. Deux
// différences, parce que le débit n'est plus instantané :
//   1. les débits sont mesurés avec le moteur temporel lui-même (répartition
//      gloutonne en flux tendu à délais nuls, pour une demande égale au flot
//      maximal), et non avec le flot maximal ;
//   2. le plafond est vérifié par simulation exacte du scénario sans
//      perturbation (pré-chauffe puis chauffe et horizon avec le bruit réel) :
//      le moteur doit y servir toute la demande chaque jour. Sinon (commandes (s, S) par à-coups
//      sur un réseau très chargé), la demande est abaissée par dichotomie sur
//      les entiers jusqu'à une valeur qui passe ce contrôle.
// Aucun tirage aléatoire n'est consommé.
// ----------------------------------------------------------------------------
// Contrôle par simulation du scénario SANS perturbation : pré-chauffe à la
// demande de référence, puis tous les jours enregistrés (chauffe et horizon)
// avec le bruit réel du scénario. C'est la transposition exacte de la propriété
// du palier 1 (sans perturbation, IP = 1 chaque jour malgré le bruit) : la
// chauffe des 4 branches est identique à cette simulation, IP = 1 y est donc
// garanti ; et tout creux observé ensuite est imputable à la perturbation (et
// aux décisions), jamais aux à-coups de la politique de stock.
export function servesWarmup(network: NetworkInstance, params: ModelParams, demand: number, warmupNoise: number[]): boolean {
  const net: NetworkInstance = { ...network, baseDemand: demand };
  const model = buildTemporalModel(net, params);
  const st = initialTemporalState(model);
  const burnIn = Math.max(0, Math.floor(params.temporal.burnInDays));
  for (let d = 0; d < burnIn; d++) stepTemporalDay(model, st, nominalDay(net, params, demand));
  for (const factor of warmupNoise) {
    const day = buildDailyState(net, INACTIVE, -1_000_000, factor, params.disruption);
    if (stepTemporalDay(model, st, day) < day.demand) return false;
  }
  return true;
}

// Levée quand aucune demande ne peut être servie intégralement pendant la
// chauffe : le principe « IP = 1 en chauffe malgré le bruit » ne peut pas être
// tenu pour ce scénario avec la couverture de stock demandée. Une erreur
// explicite est préférable à une demande arbitraire retenue en silence.
export interface TemporalCalibrationDetails { reorderPointDays: number; orderUpToDays: number; noisePct: number; leadDays: number; }
export class TemporalCalibrationError extends Error {
  readonly details: TemporalCalibrationDetails;
  constructor(message: string, details: TemporalCalibrationDetails) { super(message); this.name = 'TemporalCalibrationError'; this.details = details; }
}

export function calibrateDemandTemporal(
  network: NetworkInstance,
  disruption: Disruption,
  utilization: number,
  params: ModelParams,
  maxFlowOf: (net: NetworkInstance, state: DailyState) => number,
  warmupNoise: number[]
): void {
  const probe: NetworkInstance = { ...network, baseDemand: 1 };
  const duringState = buildDailyState(probe, disruption, 0, 1, params.disruption);
  const demandMultiplierDuring = duringState.demand;
  duringState.demand = maxFlowOf(probe, duringState);
  const duringFlow = probeZeroDelayDelivery(probe, params, duringState);

  const beforeState = buildDailyState(probe, disruption, -1_000_000, 1, params.disruption);
  beforeState.demand = maxFlowOf(probe, beforeState);
  const beforeFlow = probeZeroDelayDelivery(probe, params, beforeState);

  const target = (utilization * duringFlow) / Math.max(1e-6, demandMultiplierDuring);
  const safeCap = (params.demand.warmupSafetyMargin * beforeFlow) / (1 + network.demandNoise);
  const upper = Math.max(1, Math.round(Math.min(target, safeCap)));
  if (servesWarmup(network, params, upper, warmupNoise)) { network.baseDemand = upper; return; }
  // Dichotomie sur les entiers : la plus grande demande testée qui passe la
  // chauffe. Chaque valeur retenue a été vérifiée par la simulation exacte.
  let lo = 1, hi = upper;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (servesWarmup(network, params, mid, warmupNoise)) lo = mid; else hi = mid;
  }
  if (lo === 1 && !servesWarmup(network, params, 1, warmupNoise)) {
    const model = buildTemporalModel({ ...network, baseDemand: 1 }, params);
    const lead = model.nodes.reduce((m, n) => (n.role === 'storage' ? Math.max(m, n.replenishLead) : m), 0);
    throw new TemporalCalibrationError(
      `la calibration de la demande est impossible avec cette couverture de stock (s = ${params.temporal.reorderPointDays} j, S = ${params.temporal.orderUpToDays} j) : `
      + `aucun niveau de demande n'est servi intégralement pendant la chauffe malgré le bruit de demande (${(network.demandNoise * 100).toFixed(1)} %) `
      + `et le délai d'approvisionnement (jusqu'à ${lead} j). Augmentez les jours de couverture s et S.`,
      { reorderPointDays: params.temporal.reorderPointDays, orderUpToDays: params.temporal.orderUpToDays, noisePct: network.demandNoise * 100, leadDays: lead });
  }
  network.baseDemand = lo;
}

// ----------------------------------------------------------------------------
// Décisions de la famille stock en mode temporel (étape 4).
//   D6 : libération d'une réserve de sécurité, le jour de la décision :
//        d6_stockBoostShareOfDemand x demande de référence, répartie à parts égales
//        entre TOUS les nœuds de stockage ; la part des nœuds sans capacité propre
//        et à sorties illimitées est perdue (Q9 A, règle Q16 inchangée).
//        La réserve est séparée du stock ordinaire et invisible pour la politique
//        (s, S) : une injection ajoutée au stock ordinaire faisait franchir le
//        point de commande s à certains nœuds, qui sautaient alors un
//        recomplètement entier ; le besoin remontait en cascade jusqu'aux sources,
//        qui produisaient 0 un jour de panne (capacité perdue), et le débit livré
//        baissait (mesure : moins 18 698 sur 1,6 million, ISOMORPH, panne de 60 jours).
//   D7 : hausse de s et S de d7OrderUpToBoostPct tant que la décision est active,
//        et commande de recomplètement immédiate le jour de la décision (Q6 A) ;
//        les nœuds de stockage sans capacité propre et à sorties illimitées en
//        sont exclus, comme pour D6.
// ----------------------------------------------------------------------------
export function applyTemporalStockDecision(
  id: 'D6' | 'D7', model: TemporalModel, state: TemporalState, network: NetworkInstance, params: ModelParams, daysSinceDecision: number
): void {
  if (id === 'D6') {
    if (daysSinceDecision !== 0) return;
    const storage = model.nodes.filter(n => n.role === 'storage');
    if (!storage.length) return;
    const share = (params.decisions.d6_stockBoostShareOfDemand * network.baseDemand) / storage.length;
    for (const n of storage) {
      if (n.unlimitedShipping) continue;
      state.reserve[n.id] += share;
      state.injected += share;
    }
    return;
  }
  state.stockTargetFactor = 1 + params.temporal.d7OrderUpToBoostPct;
  if (daysSinceDecision === 0) state.forceReorder = true;
}

// État initial : stocks à S, files vides.
export function initialTemporalState(model: TemporalModel): TemporalState {
  const onHand: Record<string, number> = {};
  const input: Record<string, number> = {};
  const maturing: Record<string, number[]> = {};
  let initialStock = 0;
  for (const n of model.nodes) {
    if (n.role === 'client') continue;
    onHand[n.id] = n.role === 'storage' ? n.S : 0;
    initialStock += onHand[n.id];
    if (n.role === 'producer') input[n.id] = 0;
    if (n.role === 'source' || n.role === 'producer') maturing[n.id] = Array(n.lead).fill(0);
  }
  return {
    onHand, input, maturing, initialStock, produced: 0, deliveredTotal: 0,
    injected: 0, stockTargetFactor: 1, forceReorder: false,
    reserve: Object.fromEntries(Object.keys(onHand).map(k => [k, 0])),
    pipe: model.arcs.map(a => Array(a.travel).fill(0)),
    pipeReserve: model.arcs.map(a => Array(a.travel).fill(0)),
  };
}

export function cloneTemporalState(s: TemporalState): TemporalState {
  return {
    onHand: { ...s.onHand }, input: { ...s.input },
    pipe: s.pipe.map(p => [...p]),
    maturing: Object.fromEntries(Object.entries(s.maturing).map(([k, v]) => [k, [...v]])),
    initialStock: s.initialStock, produced: s.produced, deliveredTotal: s.deliveredTotal,
    reserve: { ...s.reserve }, pipeReserve: s.pipeReserve.map(p => [...p]),
    injected: s.injected, stockTargetFactor: s.stockTargetFactor, forceReorder: s.forceReorder,
  };
}

// Matière présente dans le système (hors livré au client).
export function materialInSystem(s: TemporalState): number {
  let t = 0;
  for (const k of Object.keys(s.onHand)) t += s.onHand[k];
  for (const k of Object.keys(s.input)) t += s.input[k];
  for (const p of s.pipe) for (const q of p) t += q;
  for (const k of Object.keys(s.reserve)) t += s.reserve[k];
  for (const p of s.pipeReserve) for (const q of p) t += q;
  for (const k of Object.keys(s.maturing)) for (const q of s.maturing[k]) t += q;
  return t;
}

// ----------------------------------------------------------------------------
// Un jour de simulation. Modifie state en place et renvoie le débit livré au
// client ce jour-là (quantité arrivée chez le client).
// ----------------------------------------------------------------------------
// shipmentsOut (facultatif) : reçoit les quantités expédiées ce jour sur chaque arc (diagnostic et tests).
export function stepTemporalDay(model: TemporalModel, state: TemporalState, daily: DailyState, shipmentsOut?: number[]): number {
  const nodeCap = (id: string) => (hasOwn(daily.nodeCapacity, id) ? daily.nodeCapacity[id] : INF);
  const arcCap = (a: TArc) => (hasOwn(daily.edgeCapacity, a.key) ? daily.edgeCapacity[a.key] : INF);
  let deliveredToday = 0;

  const receive = (to: string, q: number) => {
    if (q <= 0) return;
    const n = model.byId.get(to)!;
    if (n.role === 'client') deliveredToday += q;
    else if (n.role === 'producer') state.input[to] += q;
    else state.onHand[to] += q;
  };

  // Réserve de D6 : arrive dans le stock de réserve du nœud (jamais dans le stock ordinaire).
  const receiveReserve = (to: string, q: number) => {
    if (q <= 0) return;
    if (model.byId.get(to)!.role === 'client') deliveredToday += q;
    else state.reserve[to] += q;
  };

  // 1. Arrivées et maturations.
  model.arcs.forEach(a => {
    if (a.travel > 0) {
      receive(a.to, state.pipe[a.index].shift() ?? 0);
      receiveReserve(a.to, state.pipeReserve[a.index].shift() ?? 0);
    }
  });
  for (const n of model.nodes) {
    if ((n.role === 'source' || n.role === 'producer') && n.lead > 0) state.onHand[n.id] += state.maturing[n.id].shift() ?? 0;
  }

  const inboundAll = (n: TNode) => n.inArcs.reduce((sum, a) => sum + state.pipe[a.index].reduce((x, y) => x + y, 0), 0);

  // Deux classes de besoins, servies dans cet ordre : « urgent » (ce qui doit
  // être expédié aujourd'hui pour servir l'aval aujourd'hui) puis
  // « recomplètement » (reconstitution du stock jusqu'à S). Dans chaque classe,
  // les liens primaires sont servis d'abord (Q5 A).
  const capLeftArc = model.arcs.map(a => arcCap(a));
  const shipLeft: Record<string, number> = {};
  const prodLeft: Record<string, number> = {};
  for (const n of model.nodes) {
    if (n.role === 'client') continue;
    shipLeft[n.id] = n.role === 'storage' || n.role === 'relay' ? nodeCap(n.id) : INF;
    prodLeft[n.id] = n.role === 'source' || n.role === 'producer' ? nodeCap(n.id) : 0;
  }

  // 2. Estimation de l'offre (ordre topologique) pour une classe de besoins :
  // chaque nœud répartit ce qu'il peut expédier sur ses arcs sortants, primaire
  // d'abord, sans dépasser ce que la destination peut absorber (calculé en
  // ordre topologique inverse) — pour ne pas estimer une offre vers un nœud qui
  // ne pourrait pas l'écouler, au détriment de ses voisins.
  const estimate = (room: (n: TNode) => number, availBase: (n: TNode) => number): number[] => {
    const absorb: Record<string, number> = {};
    for (let i = model.nodes.length - 1; i >= 0; i--) {
      const n = model.nodes[i];
      if (n.role === 'client') { absorb[n.id] = room(n); continue; }
      const forward = n.outArcs.reduce((sum, a) => sum + Math.min(capLeftArc[a.index], a.travel === 0 ? absorb[a.to] : INF), 0);
      absorb[n.id] = Math.min(shipLeft[n.id], forward) + room(n);
    }
    const est = new Array<number>(model.arcs.length).fill(0);
    const incoming: Record<string, number> = {};
    for (const n of model.nodes) {
      if (n.role === 'client') continue;
      const inc = incoming[n.id] ?? 0;
      let avail: number;
      if (n.role === 'source') avail = availBase(n) + (n.lead === 0 ? prodLeft[n.id] : 0);
      else if (n.role === 'producer') avail = availBase(n) + (n.lead === 0 ? Math.min(prodLeft[n.id], state.input[n.id] + inc) : 0);
      else avail = Math.min(shipLeft[n.id], availBase(n) + inc);
      let remaining = avail;
      for (const a of n.outArcs) {
        const x = Math.max(0, Math.min(capLeftArc[a.index], remaining, a.travel === 0 ? absorb[a.to] : INF));
        est[a.index] = x;
        remaining -= x;
        if (a.travel === 0) { incoming[a.to] = (incoming[a.to] ?? 0) + x; absorb[a.to] -= x; }
      }
    }
    return est;
  };

  // 3. Commandes (ordre topologique inverse) d'une classe, réparties primaire
  // d'abord : d'abord sur l'offre estimée du jour (fournisseurs qui ont de quoi
  // servir), puis le reste sur la capacité restante des arcs, même si le
  // fournisseur est vide (une commande est une information : elle remonte
  // toujours vers l'amont, sinon un réseau vide ne redémarrerait jamais).
  // Renvoie les deux parts séparément (A : sur offre ; B : au-delà de l'offre).
  const prodTarget: Record<string, number> = {};
  const needOf: Record<string, number> = {};
  const allocate = (est: number[], orderOf: (n: TNode, need: number) => number): [number[], number[]] => {
    const reqA = new Array<number>(model.arcs.length).fill(0);
    const reqB = new Array<number>(model.arcs.length).fill(0);
    for (let i = model.nodes.length - 1; i >= 0; i--) {
      const n = model.nodes[i];
      const need = n.role === 'client' ? daily.demand : n.outArcs.reduce((sum, a) => sum + reqA[a.index] + reqB[a.index], 0);
      needOf[n.id] = need;
      let order = orderOf(n, need);
      for (const a of n.inArcs) {
        if (order <= 0) break;
        const x = Math.min(order, est[a.index]);
        reqA[a.index] = x;
        order -= x;
      }
      for (const a of n.inArcs) {
        if (order <= 0) break;
        const x = Math.max(0, Math.min(order, capLeftArc[a.index] - reqA[a.index]));
        reqB[a.index] = x;
        order -= x;
      }
    }
    return [reqA, reqB];
  };

  // 4. Production et expéditions (ordre topologique) pour une classe.
  const shippedToday = new Array<number>(model.arcs.length).fill(0);
  const ship = (req: number[]) => {
    for (const n of model.nodes) {
      if (n.role === 'client') continue;
      if (n.role === 'source' || n.role === 'producer') {
        const target = prodTarget[n.id] ?? 0;
        let p = Math.max(0, Math.min(prodLeft[n.id], target));
        if (n.role === 'producer') { p = Math.min(p, state.input[n.id]); state.input[n.id] -= p; }
        prodLeft[n.id] -= p;
        prodTarget[n.id] = target - p;
        // Seule une source crée de la matière ; une usine intermédiaire transforme son stock d'entrée.
        if (n.role === 'source') state.produced += p;
        if (n.lead === 0) state.onHand[n.id] += p; else maturingToday[n.id] = (maturingToday[n.id] ?? 0) + p;
      }
      for (const a of n.outArcs) {
        const x = Math.max(0, Math.min(req[a.index], capLeftArc[a.index], state.onHand[n.id], shipLeft[n.id]));
        if (x <= 0) continue;
        state.onHand[n.id] -= x;
        shipLeft[n.id] -= x;
        capLeftArc[a.index] -= x;
        if (a.travel === 0) receive(a.to, x); else shippedToday[a.index] += x;
        if (shipmentsOut) shipmentsOut[a.index] = (shipmentsOut[a.index] ?? 0) + x;
      }
    }
  };
  const maturingToday: Record<string, number> = {};

  // Classe « urgent » : servir aujourd'hui les besoins d'aujourd'hui.
  const inProd = (n: TNode) => state.maturing[n.id].reduce((x, y) => x + y, 0);
  const inboundLead = (n: TNode) => n.inArcs.reduce((m, a) => Math.max(m, a.travel + model.byId.get(a.from)!.lead), 0);
  const estU = estimate(n => (n.role === 'client' ? daily.demand : 0), n => state.onHand[n.id]);
  const [reqUA, reqUB] = allocate(estU, (n, need) => {
    if (n.role === 'client') return need;
    if (n.role === 'storage' || n.role === 'relay') return Math.max(0, need - state.onHand[n.id]);
    prodTarget[n.id] = Math.max(0, need - state.onHand[n.id]);
    return n.role === 'producer' ? Math.max(0, prodTarget[n.id] - state.input[n.id]) : 0;
  });
  ship(reqUA);
  const urgentNeed: Record<string, number> = { ...needOf };

  // Classe « recomplètement » : politique (s, S) des nœuds de stockage, relais
  // et production à la commande, sur les capacités restantes du jour.
  // D7 (hausse de s et S, commande immédiate) n'agit pas sur les nœuds de stockage
  // sans capacité propre et à sorties illimitées (Philadelphia, Baltimore sur
  // ISOMORPH), comme D6 : cohérence avec la règle Q16 du palier 1.
  const fOf = (n: TNode) => (n.unlimitedShipping ? 1 : state.stockTargetFactor);
  const room = (n: TNode) => (n.role === 'storage' ? Math.max(0, n.S * fOf(n) - state.onHand[n.id] - inboundAll(n)) : 0);
  const estR = estimate(room, n => state.onHand[n.id]);
  const [reqRA, reqRB] = allocate(estR, (n, need) => {
    if (n.role === 'client') return 0;
    if (n.role === 'storage') {
      // Sortie attendue : ce que le nœud peut réellement expédier aujourd'hui
      // (sinon la commande surdimensionnée ferait dépasser S à l'arrivée).
      const expectedOut = Math.min(need, shipLeft[n.id], state.onHand[n.id]);
      const position = state.onHand[n.id] + inboundAll(n);
      const projected = position - expectedOut;
      if ((state.forceReorder && !n.unlimitedShipping) || projected < n.s * fOf(n)) return Math.max(0, n.S * fOf(n) - projected);
      return Math.max(0, Math.min(need, shipLeft[n.id]) - state.onHand[n.id] - inboundAll(n));
    }
    // Relais et production n'ont pas de politique (s, S) : ils visent une position
    // (stock + en cours) couvrant le besoin du jour pendant leur délai
    // d'approvisionnement (délai de trajet entrant, délai de production), sans
    // quoi le flux s'interromprait dès qu'un délai est non nul. À délais nuls,
    // cette règle se réduit exactement au flux tendu (besoin - stock).
    const rate = (urgentNeed[n.id] ?? 0) + need; // besoin total du jour (urgent + recomplètement)
    if (n.role === 'relay') return Math.max(0, rate * inboundLead(n) + need - state.onHand[n.id] - inboundAll(n));
    prodTarget[n.id] = Math.max(0, rate * n.lead + need - state.onHand[n.id] - inProd(n) - (maturingToday[n.id] ?? 0));
    return n.role === 'producer' ? Math.max(0, prodTarget[n.id] - state.input[n.id] - inboundAll(n)) : 0;
  });
  ship(reqRA);
  // Puis les commandes au-delà de l'offre estimée (fournisseurs peut-être vides).
  ship(reqUB.map((x, i) => x + reqRB[i]));

  // Réserve de D6, après toutes les expéditions ordinaires : elle n'utilise que la
  // capacité laissée libre (arcs et nœuds), ne modifie aucune variable de la
  // trajectoire ordinaire, et descend l'aval, arcs primaires d'abord. Vers le
  // client, elle ne comble que la demande non servie du jour. Elle n'entre jamais
  // dans une usine (nœud de production intermédiaire).
  const reserveToday = new Array<number>(model.arcs.length).fill(0);
  for (const n of model.nodes) {
    if (n.role === 'client' || n.role === 'source' || n.role === 'producer') continue;
    for (const a of n.outArcs) {
      const dest = model.byId.get(a.to)!;
      if (dest.role === 'producer') continue;
      const available = state.reserve[n.id];
      if (available <= 0) break;
      const wanted = dest.role === 'client' ? Math.max(0, daily.demand - deliveredToday) : INF;
      const x = Math.max(0, Math.min(available, wanted, capLeftArc[a.index], shipLeft[n.id]));
      if (x <= 0) continue;
      state.reserve[n.id] -= x;
      shipLeft[n.id] -= x;
      capLeftArc[a.index] -= x;
      if (a.travel === 0) receiveReserve(a.to, x); else reserveToday[a.index] += x;
    }
  }

  model.arcs.forEach(a => {
    if (a.travel > 0) { state.pipe[a.index].push(shippedToday[a.index]); state.pipeReserve[a.index].push(reserveToday[a.index]); }
  });
  for (const n of model.nodes) {
    if ((n.role === 'source' || n.role === 'producer') && n.lead > 0) state.maturing[n.id].push(maturingToday[n.id] ?? 0);
  }

  state.forceReorder = false;
  state.deliveredTotal += deliveredToday;
  return deliveredToday;
}
