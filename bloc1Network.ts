// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : réseau logistique, injecteur de perturbations,
// observateur d'IP, calibration de la demande de référence.
// Toutes les valeurs numériques d'hypothèse viennent de ModelParams (voir
// bloc1DefaultParams.ts) — aucune constante figée ici.
// ============================================================================

import {
  NetworkInstance, NodeDef, EdgeDef, Disruption, DisruptionType, DailyState, ModelParams, NetworkGraph,
  NetworkArc,
} from './bloc1Types';
import { maxFlowOnGraph, FlowCapacityResolver, FlowOptions, FLOW_DEFAULT_OPTIONS } from './bloc1Flow';

// ----------------------------------------------------------------------------
// RNG déterministe (mulberry32) — un seed => une suite reproductible.
// ----------------------------------------------------------------------------
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const uniform = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

// ----------------------------------------------------------------------------
// Génération de l'instance de réseau : 13 noeuds fixes (3 usines F1-F3, 9
// entrepôts W1-W9, 1 client NY). Chaque entrepôt est relié à 1 à 3 usines
// (desserte principale + secours partiel, jamais totalement redondant).
// La demande de référence est laissée à 0 ici : elle est fixée ensuite par
// calibrateDemand(), une fois la perturbation tirée (voir cette fonction).
// ----------------------------------------------------------------------------
export function generateNetworkInstance(rng: () => number, params: ModelParams['network']): NetworkInstance {
  const factories: NodeDef[] = Array.from({ length: params.nFactories }, (_, i) => ({
    id: `F${i + 1}`, type: 'factory', name: `Usine ${i + 1}`,
  }));
  const warehouses: NodeDef[] = Array.from({ length: params.nWarehouses }, (_, i) => ({
    id: `W${i + 1}`, type: 'warehouse', name: `Entrepôt ${i + 1}`,
  }));
  const client: NodeDef = { id: 'NY', type: 'client', name: 'New York (client)' };
  const nF = factories.length;

  const edges: EdgeDef[] = [];
  warehouses.forEach((w, idx) => {
    const primary = factories[idx % nF].id;
    const secondary = factories[(idx + 1) % nF].id;
    edges.push({ from: primary, to: w.id, baseCapacity: Math.round(uniform(rng, params.primaryEdgeCapacityMin, params.primaryEdgeCapacityMax)) });
    edges.push({ from: secondary, to: w.id, baseCapacity: Math.round(uniform(rng, params.secondaryEdgeCapacityMin, params.secondaryEdgeCapacityMax)) });
    if (idx % 3 === 0 && nF > 2) {
      const tertiary = factories[(idx + 2) % nF].id;
      edges.push({ from: tertiary, to: w.id, baseCapacity: Math.round(uniform(rng, params.tertiaryEdgeCapacityMin, params.tertiaryEdgeCapacityMax)) });
    }
  });

  const factoryCapacity: Record<string, number> = {};
  factories.forEach(f => { factoryCapacity[f.id] = Math.round(uniform(rng, params.factoryCapacityMin, params.factoryCapacityMax)); });

  const warehouseShipCapacity: Record<string, number> = {};
  warehouses.forEach(w => { warehouseShipCapacity[w.id] = Math.round(uniform(rng, params.warehouseShipCapacityMin, params.warehouseShipCapacityMax)); });

  const importantShare = uniform(rng, params.importantShareMin, params.importantShareMax);
  const demandNoise = uniform(rng, params.demandNoiseMin, params.demandNoiseMax);
  return {
    factories, warehouses, client, edges, factoryCapacity, warehouseShipCapacity,
    baseDemand: 0, // calé ensuite par calibrateDemand(), une fois la perturbation tirée
    importantShare,
    demandNoise,
    graph: buildParametricGraph({ factories, warehouses, client, edges, factoryCapacity, warehouseShipCapacity }),
  };
}

// ----------------------------------------------------------------------------
// Expression générique du réseau paramétrique, sans aucun tirage aléatoire :
//   usines -> nœuds 'usine' (capacité de production),
//   entrepôts -> nœuds 'entrepot' (capacité d'expédition = débit traversant),
//   client -> nœud 'client',
//   arcs usine -> entrepôt dans l'ordre de génération, puis un arc illimité
//   entrepôt -> client par entrepôt (il remplace l'ancien lien vers le puits).
// ----------------------------------------------------------------------------
export function buildParametricGraph(net: Pick<NetworkInstance,
  'factories' | 'warehouses' | 'client' | 'edges' | 'factoryCapacity' | 'warehouseShipCapacity'>): NetworkGraph {
  return {
    nodes: [
      ...net.factories.map(f => ({ id: f.id, type: 'usine' as const, name: f.name, capacity: net.factoryCapacity[f.id] })),
      ...net.warehouses.map(w => ({ id: w.id, type: 'entrepot' as const, name: w.name, capacity: net.warehouseShipCapacity[w.id] })),
      { id: net.client.id, type: 'client' as const, name: net.client.name, capacity: null },
    ],
    arcs: [
      ...net.edges.map(e => ({ from: e.from, to: e.to, capacity: e.baseCapacity })),
      ...net.warehouses.map(w => ({ from: w.id, to: net.client.id, capacity: null })),
    ],
  };
}

// ----------------------------------------------------------------------------
// Groupes de nœuds du réseau générique (palier 1, décisions Q5 et Q6) et
// capacités nominales. Calculés une fois par graphe (cache).
//   production : usines et fournisseurs (Q6 A), dans l'ordre des nœuds ;
//   stockage   : entrepôts et hubs (Q5 B), dans l'ordre des nœuds ;
//   logistique : stockage + transporteurs (cible de la congestion, Q5 B) ;
//   client     : le client (Q4 A : un seul au palier 1).
// Réseau paramétrique : production = F1..Fn, stockage = W1..Wm, logistique =
// W1..Wm, client = NY, comme les anciennes listes usines/entrepôts.
// ----------------------------------------------------------------------------
export interface NetworkGroups {
  production: string[];
  productionFinite: string[];       // production de capacité finie (cibles de panne, D1, D3, D7)
  storage: string[];
  logistics: string[];
  clients: string[];
  finiteArcs: NetworkArc[];         // arcs de capacité finie, doublons compris, dans l'ordre du graphe
  nominalNode: Map<string, number | null>;
  nominalArc: Map<string, number>;  // premier arc fini de chaque clé "from|to" (comme l'ancien find)
  finiteOutArcKeys: Map<string, string[]>; // clés "from|to" distinctes des arcs finis sortants
}

const groupsCache = new WeakMap<NetworkGraph, NetworkGroups>();

export function getNetworkGroups(network: NetworkInstance): NetworkGroups {
  const graph = network.graph ?? buildParametricGraph(network);
  const cached = groupsCache.get(graph);
  if (cached) return cached;
  const production: string[] = [], productionFinite: string[] = [];
  const storage: string[] = [], logistics: string[] = [], clients: string[] = [];
  const nominalNode = new Map<string, number | null>();
  for (const n of graph.nodes) {
    nominalNode.set(n.id, n.capacity);
    if (n.type === 'usine' || n.type === 'fournisseur') {
      production.push(n.id);
      if (n.capacity !== null) productionFinite.push(n.id);
    } else if (n.type === 'entrepot' || n.type === 'hub') {
      storage.push(n.id); logistics.push(n.id);
    } else if (n.type === 'transporteur') {
      logistics.push(n.id);
    } else if (n.type === 'client') {
      clients.push(n.id);
    }
  }
  const finiteArcs = graph.arcs.filter(a => a.capacity !== null);
  const nominalArc = new Map<string, number>();
  const finiteOutArcKeys = new Map<string, string[]>();
  for (const a of finiteArcs) {
    const key = `${a.from}|${a.to}`;
    if (!nominalArc.has(key)) nominalArc.set(key, a.capacity as number);
    const list = finiteOutArcKeys.get(a.from) ?? [];
    if (!list.includes(key)) list.push(key);
    finiteOutArcKeys.set(a.from, list);
  }
  const groups: NetworkGroups = {
    production, productionFinite, storage, logistics, clients, finiteArcs, nominalNode, nominalArc, finiteOutArcKeys,
  };
  groupsCache.set(graph, groups);
  return groups;
}

// ----------------------------------------------------------------------------
// « Capacité d'expédition » d'un nœud de stockage (règle Q16 affinée, Q16a A) :
//   - si le nœud a une capacité propre finie : c'est elle (cas du réseau
//     paramétrique, dont les entrepôts ont tous une capacité) ;
//   - sinon : chacun de ses arcs sortants de capacité finie ; ses arcs
//     sortants illimités ne sont jamais modifiés.
// q16Stats compte les applications de la seconde branche (contrôle des tests :
// elle ne doit jamais se déclencher sur le réseau paramétrique).
// ----------------------------------------------------------------------------
export const q16Stats = { applications: 0 };

const clampNonNeg = (x: number) => Math.max(0, x);

export function scaleStorageShipping(state: DailyState, groups: NetworkGroups, id: string, factor: number): void {
  if (hasOwn(state.nodeCapacity, id)) { state.nodeCapacity[id] *= factor; return; }
  q16Stats.applications++;
  for (const key of groups.finiteOutArcKeys.get(id) ?? []) state.edgeCapacity[key] *= factor;
}

// Ajout d'un volume (D6). Nœud sans capacité propre : volume réparti entre ses
// arcs sortants finis au prorata de leur capacité nominale (Q16b A) ; rien si
// le nœud n'a aucun arc sortant fini.
export function addToStorageShipping(state: DailyState, groups: NetworkGroups, id: string, amount: number): void {
  if (hasOwn(state.nodeCapacity, id)) { state.nodeCapacity[id] += amount; return; }
  q16Stats.applications++;
  const keys = groups.finiteOutArcKeys.get(id) ?? [];
  const total = keys.reduce((s, k) => s + (groups.nominalArc.get(k) ?? 0), 0);
  if (total <= 0) return;
  for (const k of keys) state.edgeCapacity[k] += amount * (groups.nominalArc.get(k) ?? 0) / total;
}

// Restauration d'une part de la capacité perdue (D4).
export function restoreStorageShipping(state: DailyState, groups: NetworkGroups, id: string, fraction: number): void {
  if (hasOwn(state.nodeCapacity, id)) {
    const nominal = groups.nominalNode.get(id) ?? 0;
    const lost = clampNonNeg(nominal - state.nodeCapacity[id]);
    state.nodeCapacity[id] += fraction * lost;
    return;
  }
  q16Stats.applications++;
  for (const k of groups.finiteOutArcKeys.get(id) ?? []) {
    const lost = clampNonNeg((groups.nominalArc.get(k) ?? 0) - state.edgeCapacity[k]);
    state.edgeCapacity[k] += fraction * lost;
  }
}

// ----------------------------------------------------------------------------
// Injecteur de perturbations : tire une nature parmi celles activées et une
// cible cohérente avec cette nature. Coupure de lien et fermeture d'entrepôt
// sont des ruptures quasi-totales (plage de sévérité "binaire" séparée) ; les
// 3 autres natures sont des dégradations continues (plage de sévérité générale).
// Cibles (réseau générique) : panne = nœud de production de capacité finie ;
// coupure = arc de capacité finie (un arc illimité n'est jamais modifié) ;
// fermeture = nœud de stockage. Mêmes tirages et même ordre que l'ancien code.
// ----------------------------------------------------------------------------
export function injectDisruption(
  rng: () => number,
  network: NetworkInstance,
  opts: { id: string; types: DisruptionType[]; start: number; params: ModelParams['disruption'] }
): Disruption {
  const { params } = opts;
  const groups = getNetworkGroups(network);
  const type = pick(rng, opts.types);
  const isBinary = type === 'coupure_lien' || type === 'fermeture_entrepot';
  const severity = isBinary
    ? uniform(rng, params.binarySeverityMin, params.binarySeverityMax)
    : uniform(rng, params.severityMin, params.severityMax);
  const duration = Math.round(uniform(rng, params.durationMinDays, params.durationMaxDays));
  const base: Disruption = { id: opts.id, type, start: opts.start, duration, severity };

  const requireTargets = <T,>(arr: T[], what: string): T[] => {
    if (arr.length === 0) throw new Error(`Perturbation "${type}" impossible : le réseau ne contient aucun ${what}.`);
    return arr;
  };

  switch (type) {
    case 'panne_fournisseur':
      return { ...base, targetFactory: pick(rng, requireTargets(groups.productionFinite, 'nœud de production de capacité finie')) };
    case 'coupure_lien': {
      // Cible préférentiellement le lien principal d'un nœud (celui qui
      // porte l'essentiel de son débit) : couper un lien de secours déjà
      // marginal n'aurait quasiment aucun effet observable.
      const arcs = requireTargets(groups.finiteArcs, 'arc de capacité finie');
      const primaryEdges = arcs.filter(e =>
        e.capacity === Math.max(...arcs.filter(e2 => e2.to === e.to).map(e2 => e2.capacity as number))
      );
      const edge = rng() < params.coupureLienPrimaryEdgeProbability ? pick(rng, primaryEdges) : pick(rng, arcs);
      return { ...base, targetEdge: { from: edge.from, to: edge.to } };
    }
    case 'fermeture_entrepot':
      return { ...base, targetWarehouse: pick(rng, requireTargets(groups.storage, 'nœud de stockage')) };
    case 'pic_demande':
    case 'congestion':
    default:
      return base; // effet global sur le réseau, pas de cible ponctuelle
  }
}

export function describeTarget(d: Disruption, network: NetworkInstance): string {
  switch (d.type) {
    case 'panne_fournisseur': return d.targetFactory ?? '';
    case 'coupure_lien': return d.targetEdge ? `${d.targetEdge.from}->${d.targetEdge.to}` : '';
    case 'fermeture_entrepot': return d.targetWarehouse ?? '';
    case 'pic_demande': return `${getNetworkGroups(network).clients[0] ?? ''} (demande)`;
    case 'congestion': return 'réseau (congestion générale)';
    default: return '';
  }
}

// ----------------------------------------------------------------------------
// Construit l'état journalier de base (avant décisions du gestionnaire) :
// capacités nominales finies, dégradées par la perturbation si le jour est
// dans sa fenêtre d'activité, puis la demande du jour (bruit journalier
// appliqué). demandNoiseFactor est tiré une fois par jour et par scénario
// (nombres aléatoires communs aux 4 branches — voir generateExperimentPlan).
// Les boucles sur les arcs parcourent la liste des arcs doublons compris,
// comme l'ancien code (comportement hérité à 1 usine conservé).
// ----------------------------------------------------------------------------
export function buildDailyState(
  network: NetworkInstance,
  disruption: Disruption,
  day: number, // day_rel - disruption.start (peut être négatif, avant l'incident)
  demandNoiseFactor: number,
  params: ModelParams['disruption']
): DailyState {
  const graph = network.graph ?? buildParametricGraph(network);
  const groups = getNetworkGroups(network);
  const nodeCapacity: Record<string, number> = {};
  graph.nodes.forEach(n => { if (n.type !== 'client' && n.capacity !== null) nodeCapacity[n.id] = n.capacity; });
  const edgeCapacity: Record<string, number> = {};
  groups.finiteArcs.forEach(e => { edgeCapacity[`${e.from}|${e.to}`] = e.capacity as number; });
  let demand = network.baseDemand * demandNoiseFactor;
  const importantShare = network.importantShare;
  const state: DailyState = { nodeCapacity, edgeCapacity, demand, importantShare };

  const active = day >= 0 && day < disruption.duration;
  if (active) {
    const s = disruption.severity;
    switch (disruption.type) {
      case 'panne_fournisseur':
        if (disruption.targetFactory && hasOwn(nodeCapacity, disruption.targetFactory)) {
          nodeCapacity[disruption.targetFactory] *= (1 - s);
        }
        break;
      case 'coupure_lien':
        if (disruption.targetEdge) {
          const key = `${disruption.targetEdge.from}|${disruption.targetEdge.to}`;
          if (key in edgeCapacity) edgeCapacity[key] *= (1 - s);
          // Friction de rattrapage : la perte du lien principal d'un nœud de
          // stockage force une réaffectation en urgence sur ses liens de
          // secours et dégrade transitoirement sa capacité d'expédition
          // (règle Q16 si le nœud n'a pas de capacité propre).
          const wid = disruption.targetEdge.to;
          if (groups.storage.includes(wid)) {
            scaleStorageShipping(state, groups, wid, 1 - params.coupureLienWarehouseFrictionPct * s);
          }
          groups.finiteArcs.forEach(e => {
            if (e.to === wid && `${e.from}|${e.to}` !== key) {
              edgeCapacity[`${e.from}|${e.to}`] *= (1 - params.coupureLienOtherEdgesFrictionPct * s);
            }
          });
        }
        break;
      case 'fermeture_entrepot':
        if (disruption.targetWarehouse) {
          scaleStorageShipping(state, groups, disruption.targetWarehouse, 1 - s);
          groups.finiteArcs.forEach(e => {
            if (e.to === disruption.targetWarehouse) {
              edgeCapacity[`${e.from}|${e.to}`] *= (1 - s);
            }
          });
        }
        break;
      case 'pic_demande':
        demand *= (1 + s * params.picDemandeAmplificationAtMaxSeverity);
        state.demand = demand;
        break;
      case 'congestion':
        // Tous les arcs finis et les capacités finies des nœuds logistiques
        // (stockage et transporteurs). Pas de report sur les arcs sortants
        // d'un nœud sans capacité : ils sont déjà dégradés en tant qu'arcs.
        Object.keys(edgeCapacity).forEach(k => { edgeCapacity[k] *= (1 - s); });
        groups.logistics.forEach(id => { if (hasOwn(nodeCapacity, id)) nodeCapacity[id] *= (1 - s); });
        break;
    }
  }

  return state;
}

// ----------------------------------------------------------------------------
// Débit maximal du jour, calculé par le flot générique (bloc1Flow.ts).
// Capacités du jour : celles de DailyState ; un nœud ou un arc absent de
// DailyState est illimité (capacité nominale null).
// ----------------------------------------------------------------------------
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function dailyCapacityResolver(state: DailyState): FlowCapacityResolver {
  return {
    node: (id: string) => (hasOwn(state.nodeCapacity, id) ? state.nodeCapacity[id] : null),
    arc: (from: string, to: string) => {
      const key = `${from}|${to}`;
      return hasOwn(state.edgeCapacity, key) ? state.edgeCapacity[key] : null;
    },
  };
}

export function flowOptionsFromParams(params: ModelParams): FlowOptions {
  return { maxIterations: params.flow.maxIterations, epsilon: FLOW_DEFAULT_OPTIONS.epsilon };
}

export function maxFlow(network: NetworkInstance, state: DailyState, options: FlowOptions = FLOW_DEFAULT_OPTIONS): number {
  // Repli pour une instance sérialisée sans expression générique (format antérieur).
  const graph = network.graph ?? buildParametricGraph(network);
  return maxFlowOnGraph(graph, dailyCapacityResolver(state), options);
}

// ----------------------------------------------------------------------------
// Observateur d'IP : part de la demande servie immédiatement, les articles
// importants comptant importantWeight fois (3 par défaut). Le débit disponible
// sert en priorité les articles importants.
// ----------------------------------------------------------------------------
export function observeIp(state: DailyState, deliverable: number, importantWeight: number): number {
  const importantDemand = state.demand * state.importantShare;
  const regularDemand = state.demand - importantDemand;
  const importantServed = Math.min(deliverable, importantDemand);
  const remaining = Math.max(0, deliverable - importantServed);
  const regularServed = Math.min(remaining, regularDemand);
  const weightedDemand = regularDemand + importantWeight * importantDemand;
  if (weightedDemand <= 0) return 1;
  return (regularServed + importantWeight * importantServed) / weightedDemand;
}

// ----------------------------------------------------------------------------
// Calibre la demande de référence *après* le tirage de la perturbation, en
// fonction du débit effectivement disponible pendant l'incident (et non de la
// capacité nominale hors incident). C'est ce qui garantit qu'une perturbation
// donnée produit un creux d'IP observable, quelle que soit sa nature :
//   utilization = 1   : la demande égale tout juste le débit dégradé (creux net)
//   utilization < 1   : la perturbation ne fait que réduire la marge (creux plus léger)
//   utilization > 1   : la demande dépasse le débit dégradé (creux franc, rupture)
// Le plafond de sécurité tient compte du bruit journalier maximal, pour que
// IP = 1 reste garanti pendant le warm-up même sur le tirage de bruit le plus
// défavorable.
// ----------------------------------------------------------------------------
export function calibrateDemand(
  network: NetworkInstance,
  disruption: Disruption,
  utilization: number,
  disruptionParams: ModelParams['disruption'],
  warmupSafetyMargin: number,
  flowOptions: FlowOptions = FLOW_DEFAULT_OPTIONS
): void {
  const probe: NetworkInstance = { ...network, baseDemand: 1 };
  const duringState = buildDailyState(probe, disruption, 0, 1, disruptionParams); // 1er jour de l'incident, sans bruit
  const duringFlow = maxFlow(probe, duringState, flowOptions);
  const demandMultiplierDuring = duringState.demand; // multiplicateur induit par l'incident (1 si la demande n'est pas la cible)

  const beforeState = buildDailyState(probe, disruption, -1_000_000, 1, disruptionParams); // bien avant le début, sans bruit
  const beforeFlow = maxFlow(probe, beforeState, flowOptions);

  const target = (utilization * duringFlow) / Math.max(1e-6, demandMultiplierDuring);
  const safeCap = (warmupSafetyMargin * beforeFlow) / (1 + network.demandNoise); // marge pour absorber le bruit journalier maximal
  network.baseDemand = Math.max(1, Math.round(Math.min(target, safeCap)));
}
