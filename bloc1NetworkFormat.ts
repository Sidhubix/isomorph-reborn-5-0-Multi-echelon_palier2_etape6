// ============================================================================
// ISOMORPH-Reborn — Format JSON du réseau (palier 1, étape 4).
//
// Contenu :
//   - types du document JSON (format "isomorph-reborn-network", version 1.0) ;
//   - validation : erreurs bloquantes et avertissements ;
//   - compilation : retrait des nœuds morts ou isolés, calcul des échelons ;
//   - instanciation d'un scénario (tirage des plages, ordre fixe) ;
//   - export JSON ;
//   - instanciation du réseau d'un plan (paramétrique ou explicite).
// ============================================================================

import {
  NetworkNodeType, NetworkGraph, NetworkNode, NetworkArc, NetworkInstance, NodeDef, ModelParams, NetworkSpec,
  NetworkTiming,
} from './bloc1Types';
import { generateNetworkInstance } from './bloc1Network';
import { maxFlowOnGraph, UnboundedFlowError } from './bloc1Flow';
import { TEMPORAL_MAX_DELAY_DAYS } from './bloc1DefaultParams';

export const NETWORK_FORMAT = 'isomorph-reborn-network';
export const NETWORK_FORMAT_VERSION = '1.0';

// Capacité : nombre fixe, plage [min, max] tirée à chaque scénario, ou null
// (illimitée). Un champ absent vaut null.
export type CapacitySpec = number | [number, number] | null;

export const NODE_TYPES: NetworkNodeType[] = ['fournisseur', 'usine', 'hub', 'entrepot', 'transporteur', 'client'];

export interface NetworkDocNode {
  id: string;
  type: NetworkNodeType;
  name?: string;
  capacity?: CapacitySpec;
  echelon?: number;
  geo?: { lat: number; lon: number };
  production_lead_time_days?: number;   // réservé au palier 2
  inventory?: { s: number; S: number }; // réservé au palier 2
  [key: string]: unknown;
}

export interface NetworkDocEdge {
  from: string;
  to: string;
  capacity?: CapacitySpec;
  role?: string;                        // informatif (primaire, secondaire, tertiaire)
  mode?: string;                        // informatif
  travel_time_days?: number;            // réservé au palier 2
  container_volume?: number;            // provenance ISOMORPH, informatif
  containers_per_day?: number;          // provenance ISOMORPH, informatif
  [key: string]: unknown;
}

export interface NetworkDocument {
  format: string;
  format_version: string;
  id: string;
  name: string;
  description?: string;
  source?: string;
  provenance?: Record<string, unknown>; // informatif (ex. instance exportée d'un plan paramétrique)
  nodes: NetworkDocNode[];
  edges: NetworkDocEdge[];
  [key: string]: unknown;
}

const DOC_KEYS = ['format', 'format_version', 'id', 'name', 'description', 'source', 'provenance', 'nodes', 'edges'];
const NODE_KEYS = ['id', 'type', 'name', 'capacity', 'echelon', 'geo', 'production_lead_time_days', 'inventory'];
const EDGE_KEYS = ['from', 'to', 'capacity', 'role', 'mode', 'travel_time_days', 'container_volume', 'containers_per_day'];
const NODE_RESERVED = ['production_lead_time_days', 'inventory'];
const EDGE_RESERVED = ['travel_time_days'];

// ----------------------------------------------------------------------------
// Rapport de validation
// ----------------------------------------------------------------------------
export type IssueCode =
  | 'E_JSON' | 'E_STRUCTURE' | 'E_FORMAT' | 'E_ID' | 'E_DUPLICATE_ID' | 'E_TYPE' | 'E_ARC_ENDPOINT'
  | 'E_SELF_LOOP' | 'E_DUPLICATE_ARC' | 'E_CAPACITY' | 'E_NO_SOURCE' | 'E_CLIENT_COUNT' | 'E_SOURCE_TYPE'
  | 'E_SOURCE_CAPACITY' | 'E_SUPPLIER_INCOMING' | 'E_CLIENT_OUTGOING' | 'E_CLIENT_CAPACITY' | 'E_CYCLE'
  | 'E_ZERO_FLOW' | 'E_TEMPORAL'
  | 'W_TEMPORAL_IGNORED'
  | 'W_ISOLATED' | 'W_DEAD' | 'W_STORAGE_UNLIMITED' | 'W_RESERVED' | 'W_UNKNOWN_FIELD'
  | 'W_PRODUCTION_UNLIMITED' | 'W_NO_TARGET';

export interface ValidationIssue { code: IssueCode; message: string; }

export interface CompiledNetwork {
  document: NetworkDocument;
  nodes: { id: string; type: NetworkNodeType; name: string; capacity: CapacitySpec }[]; // nœuds vivants, ordre du fichier
  arcs: { from: string; to: string; capacity: CapacitySpec }[];                         // arcs vivants, ordre du fichier
  echelons: Record<string, number>; // plus long chemin depuis une source (informatif)
  // Valeurs temporelles explicites des éléments vivants (palier 2). null quand
  // le réseau est validé sans le mode temporel : elles ne sont alors pas lues.
  timing: NetworkTiming | null;
}

// Options de validation. temporal = le plan utilise le mode temporel (palier 2) :
// les champs travel_time_days, production_lead_time_days et inventory sont alors
// validés et utilisés (plus d'avertissement « réservé »). Sans cette option, la
// validation est exactement celle du palier 1.
export interface ValidationOptions { temporal?: boolean; }

export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  compiled: CompiledNetwork | null; // null dès qu'il y a une erreur
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isFiniteNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function checkCapacity(cap: unknown): string | null {
  if (cap === undefined || cap === null) return null;
  if (isFiniteNum(cap)) return cap < 0 ? 'capacité négative' : null;
  if (Array.isArray(cap)) {
    if (cap.length !== 2 || !isFiniteNum(cap[0]) || !isFiniteNum(cap[1])) return 'une plage doit être [min, max] avec deux nombres finis';
    if (cap[0] < 0) return 'plage avec un minimum négatif';
    if (cap[0] > cap[1]) return 'plage avec un minimum supérieur au maximum';
    return null;
  }
  return 'capacité invalide (nombre, plage [min, max] ou null attendus)';
}
const isDays = (x: unknown): x is number => isFiniteNum(x) && x >= 0 && Number.isInteger(x) && x <= TEMPORAL_MAX_DELAY_DAYS;
const capOf = (x: unknown): CapacitySpec => (x === undefined ? null : (x as CapacitySpec));
const capMax = (c: CapacitySpec): number | null => (c === null ? null : Array.isArray(c) ? c[1] : c);

function checkId(id: unknown): string | null {
  if (typeof id !== 'string' || id.length === 0) return 'identifiant manquant ou vide';
  if (id.length > 128) return 'identifiant de plus de 128 caractères';
  if (id.includes('|')) return 'identifiant contenant le caractère |';
  if (id.startsWith('__')) return 'identifiant commençant par __ (réservé)';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(id)) return 'identifiant contenant un caractère de contrôle';
  return null;
}

// ----------------------------------------------------------------------------
// Validation et compilation
// ----------------------------------------------------------------------------
export function validateNetworkDocument(input: unknown, options: ValidationOptions = {}): ValidationReport {
  const temporal = options.temporal === true;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (code: IssueCode, message: string) => errors.push({ code, message });
  const warn = (code: IssueCode, message: string) => warnings.push({ code, message });
  const fail = (): ValidationReport => ({ errors, warnings, compiled: null });

  if (!isObj(input)) { err('E_STRUCTURE', 'Le document doit être un objet JSON.'); return fail(); }
  if (input.format !== NETWORK_FORMAT) err('E_FORMAT', `Champ format attendu : "${NETWORK_FORMAT}".`);
  if (input.format_version !== NETWORK_FORMAT_VERSION) err('E_FORMAT', `Version de format non prise en charge : ${String(input.format_version)} (attendue : ${NETWORK_FORMAT_VERSION}).`);
  if (typeof input.id !== 'string' || input.id.length === 0) err('E_STRUCTURE', 'Champ id du réseau manquant.');
  if (typeof input.name !== 'string' || input.name.length === 0) err('E_STRUCTURE', 'Champ name du réseau manquant.');
  if (!Array.isArray(input.nodes)) err('E_STRUCTURE', 'Champ nodes manquant ou non tableau.');
  if (!Array.isArray(input.edges)) err('E_STRUCTURE', 'Champ edges manquant ou non tableau.');
  if (errors.length) return fail();
  Object.keys(input).filter(k => !DOC_KEYS.includes(k)).forEach(k => warn('W_UNKNOWN_FIELD', `Champ inconnu ignoré au niveau du réseau : ${k}.`));

  const rawNodes = input.nodes as unknown[];
  const rawEdges = input.edges as unknown[];

  // Nœuds
  const nodeType = new Map<string, NetworkNodeType>();
  const nodeCap = new Map<string, CapacitySpec>();
  const nodeName = new Map<string, string>();
  const nodeOrder: string[] = [];
  const reservedHits = new Set<string>();
  const unknownNodeFields = new Set<string>();
  const rawLeadTime = new Map<string, number>();
  const rawInventory = new Map<string, { s: number; S: number }>();
  const rawTravel = new Map<string, number>();
  rawNodes.forEach((n, i) => {
    if (!isObj(n)) { err('E_STRUCTURE', `Nœud n° ${i + 1} : objet attendu.`); return; }
    const idErr = checkId(n.id);
    if (idErr) { err('E_ID', `Nœud n° ${i + 1} : ${idErr}.`); return; }
    const id = n.id as string;
    if (nodeType.has(id)) { err('E_DUPLICATE_ID', `Identifiant de nœud en double : ${id}.`); return; }
    if (!NODE_TYPES.includes(n.type as NetworkNodeType)) { err('E_TYPE', `Nœud ${id} : type inconnu ${String(n.type)} (attendus : ${NODE_TYPES.join(', ')}).`); return; }
    const capErr = checkCapacity(n.capacity);
    if (capErr) err('E_CAPACITY', `Nœud ${id} : ${capErr}.`);
    nodeType.set(id, n.type as NetworkNodeType);
    nodeCap.set(id, capOf(n.capacity));
    nodeName.set(id, typeof n.name === 'string' && n.name.length > 0 ? n.name : id);
    nodeOrder.push(id);
    if (!temporal) NODE_RESERVED.forEach(k => { if (k in n) reservedHits.add(k); });
    else {
      if ('production_lead_time_days' in n) {
        const v = n.production_lead_time_days;
        if (!isDays(v)) err('E_TEMPORAL', `Nœud ${id} : production_lead_time_days doit être un nombre entier de jours entre 0 et ${TEMPORAL_MAX_DELAY_DAYS}.`);
        else rawLeadTime.set(id, v);
      }
      if ('inventory' in n) {
        const inv = n.inventory;
        const ok = isObj(inv) && isFiniteNum(inv.s) && isFiniteNum(inv.S) && inv.s >= 0 && inv.S >= 0 && inv.s <= inv.S;
        if (!ok) err('E_TEMPORAL', `Nœud ${id} : inventory doit être {"s": …, "S": …} avec 0 ≤ s ≤ S.`);
        else rawInventory.set(id, { s: (inv as { s: number }).s, S: (inv as { S: number }).S });
      }
    }
    Object.keys(n).filter(k => !NODE_KEYS.includes(k)).forEach(k => unknownNodeFields.add(k));
  });

  // Arcs
  const arcs: { from: string; to: string; capacity: CapacitySpec }[] = [];
  const arcKeys = new Set<string>();
  const unknownEdgeFields = new Set<string>();
  rawEdges.forEach((e, i) => {
    if (!isObj(e)) { err('E_STRUCTURE', `Arc n° ${i + 1} : objet attendu.`); return; }
    const from = e.from, to = e.to;
    if (typeof from !== 'string' || !nodeType.has(from) || typeof to !== 'string' || !nodeType.has(to)) {
      err('E_ARC_ENDPOINT', `Arc n° ${i + 1} (${String(from)} vers ${String(to)}) : extrémité inexistante.`); return;
    }
    if (from === to) { err('E_SELF_LOOP', `Arc n° ${i + 1} : boucle sur le nœud ${from}.`); return; }
    const key = `${from}|${to}`;
    if (arcKeys.has(key)) { err('E_DUPLICATE_ARC', `Arc en double : ${from} vers ${to}.`); return; }
    const capErr = checkCapacity(e.capacity);
    if (capErr) err('E_CAPACITY', `Arc ${from} vers ${to} : ${capErr}.`);
    arcKeys.add(key);
    arcs.push({ from, to, capacity: capOf(e.capacity) });
    if (!temporal) EDGE_RESERVED.forEach(k => { if (k in e) reservedHits.add(k); });
    else if ('travel_time_days' in e) {
      if (!isDays(e.travel_time_days)) err('E_TEMPORAL', `Arc ${from} vers ${to} : travel_time_days doit être un nombre entier de jours entre 0 et ${TEMPORAL_MAX_DELAY_DAYS}.`);
      else rawTravel.set(key, e.travel_time_days);
    }
    Object.keys(e).filter(k => !EDGE_KEYS.includes(k)).forEach(k => unknownEdgeFields.add(k));
  });
  if (reservedHits.size) warn('W_RESERVED', `Champs réservés au palier 2, conservés mais ignorés : ${[...reservedHits].join(', ')}.`);
  if (unknownNodeFields.size) warn('W_UNKNOWN_FIELD', `Champs de nœud inconnus, conservés mais ignorés : ${[...unknownNodeFields].join(', ')}.`);
  if (unknownEdgeFields.size) warn('W_UNKNOWN_FIELD', `Champs d'arc inconnus, conservés mais ignorés : ${[...unknownEdgeFields].join(', ')}.`);
  if (errors.length) return fail();

  // Structure : degrés, sources, clients
  const outs = new Map<string, string[]>(), ins = new Map<string, string[]>();
  nodeOrder.forEach(id => { outs.set(id, []); ins.set(id, []); });
  arcs.forEach(a => { outs.get(a.from)!.push(a.to); ins.get(a.to)!.push(a.from); });

  const clients = nodeOrder.filter(id => nodeType.get(id) === 'client');
  if (clients.length !== 1) err('E_CLIENT_COUNT', `Le palier 1 exige exactement un client (trouvés : ${clients.length}).`);
  clients.forEach(id => {
    if (outs.get(id)!.length) err('E_CLIENT_OUTGOING', `Le client ${id} a un arc sortant.`);
    if (nodeCap.get(id) !== null) err('E_CLIENT_CAPACITY', `Le client ${id} ne doit pas avoir de capacité.`);
  });
  nodeOrder.forEach(id => {
    if (nodeType.get(id) === 'fournisseur' && ins.get(id)!.length) err('E_SUPPLIER_INCOMING', `Le fournisseur ${id} reçoit un arc.`);
  });
  const isolated = nodeOrder.filter(id => nodeType.get(id) !== 'client' && !ins.get(id)!.length && !outs.get(id)!.length);
  const sources = nodeOrder.filter(id => nodeType.get(id) !== 'client' && !ins.get(id)!.length && outs.get(id)!.length);
  if (sources.length === 0) err('E_NO_SOURCE', 'Aucune source (nœud sans arc entrant relié au réseau).');
  sources.forEach(id => {
    const t = nodeType.get(id);
    if (t !== 'usine' && t !== 'fournisseur') err('E_SOURCE_TYPE', `Le nœud ${id} (${t}) n'a aucun arc entrant : seule une usine ou un fournisseur peut être une source.`);
    if (nodeCap.get(id) === null) err('E_SOURCE_CAPACITY', `La source ${id} doit avoir une capacité de production finie.`);
  });

  // Cycles (Q3 A : refusés) — algorithme de Kahn
  const indeg = new Map<string, number>();
  nodeOrder.forEach(id => indeg.set(id, ins.get(id)!.length));
  const queue = nodeOrder.filter(id => indeg.get(id) === 0);
  let seen = 0;
  while (queue.length) {
    const u = queue.shift()!; seen++;
    for (const v of outs.get(u)!) { indeg.set(v, indeg.get(v)! - 1); if (indeg.get(v) === 0) queue.push(v); }
  }
  if (seen !== nodeOrder.length) {
    const inCycle = nodeOrder.filter(id => indeg.get(id)! > 0);
    err('E_CYCLE', `Le réseau contient un cycle (nœuds concernés : ${inCycle.join(', ')}). Les cycles sont refusés au palier 1.`);
  }
  if (errors.length) return fail();

  // Nœuds vivants : atteignables depuis une source ET menant au client.
  const reach = (starts: string[], next: Map<string, string[]>) => {
    const seenSet = new Set<string>(starts); const q = [...starts];
    while (q.length) { const u = q.shift()!; for (const v of next.get(u)!) if (!seenSet.has(v)) { seenSet.add(v); q.push(v); } }
    return seenSet;
  };
  const fwd = reach(sources, outs);
  const bwd = reach(clients, ins);
  const live = new Set(nodeOrder.filter(id => fwd.has(id) && bwd.has(id)));
  if (isolated.length) warn('W_ISOLATED', `Nœuds sans aucun arc, ignorés : ${isolated.join(', ')}.`);
  const dead = nodeOrder.filter(id => !live.has(id) && !isolated.includes(id));
  if (dead.length) warn('W_DEAD', `Nœuds non reliés à la fois à une source et au client, exclus du flot et des cibles : ${dead.join(', ')}.`);

  const liveNodes = nodeOrder.filter(id => live.has(id)).map(id => ({ id, type: nodeType.get(id)!, name: nodeName.get(id)!, capacity: nodeCap.get(id)! }));
  const liveArcs = arcs.filter(a => live.has(a.from) && live.has(a.to));

  // Avertissements liés aux groupes de décisions
  liveNodes.forEach(n => {
    if ((n.type === 'entrepot' || n.type === 'hub') && n.capacity === null) {
      const outCaps = liveArcs.filter(a => a.from === n.id).map(a => a.capacity);
      if (outCaps.every(c => c === null)) {
        warn('W_STORAGE_UNLIMITED', `Nœud de stockage ${n.id} sans capacité propre et dont tous les arcs sortants sont illimités : sa capacité d'expédition ne peut être ni dégradée ni augmentée (fermeture : seuls ses arcs entrants sont réduits ; D2, D4, D5, D6 et la friction de coupure sont sans effet sur ce nœud).`);
      }
    }
    if ((n.type === 'usine' || n.type === 'fournisseur') && n.capacity === null) {
      warn('W_PRODUCTION_UNLIMITED', `Nœud de production ${n.id} sans capacité : il n'est ciblé ni par les pannes ni par D1, D3 et D7.`);
    }
  });
  if (!liveNodes.some(n => n.type === 'entrepot' || n.type === 'hub')) warn('W_NO_TARGET', 'Aucun entrepôt ni hub : la fermeture d\'entrepôt doit être désactivée dans le plan.');
  if (!liveArcs.some(a => a.capacity !== null)) warn('W_NO_TARGET', 'Aucun arc de capacité finie : la coupure de lien doit être désactivée dans le plan.');

  // Débit nominal maximal (bornes hautes des plages) : doit être non nul.
  const maxGraph: NetworkGraph = {
    nodes: liveNodes.map(n => ({ id: n.id, type: n.type, name: n.name, capacity: capMax(n.capacity) })),
    arcs: liveArcs.map(a => ({ from: a.from, to: a.to, capacity: capMax(a.capacity) })),
  };
  try {
    const nc = new Map(maxGraph.nodes.map(n => [n.id, n.capacity] as [string, number | null]));
    const ac = new Map(maxGraph.arcs.map(a => [`${a.from}|${a.to}`, a.capacity] as [string, number | null]));
    const flow = maxGraph.nodes.length ? maxFlowOnGraph(maxGraph, { node: id => nc.get(id) ?? null, arc: (f, t) => ac.get(`${f}|${t}`) ?? null }) : 0;
    if (!(flow > 0)) err('E_ZERO_FLOW', 'Le débit maximal nominal vers le client est nul.');
  } catch (e) {
    err('E_ZERO_FLOW', e instanceof UnboundedFlowError ? e.message : `Calcul du débit impossible : ${(e as Error).message}`);
  }
  if (errors.length) return fail();

  const echelons = computeGraphEchelons(liveNodes, liveArcs);

  // Valeurs temporelles des éléments vivants (mode temporel uniquement).
  let timing: NetworkTiming | null = null;
  if (temporal) {
    timing = { productionLeadTimeDays: {}, travelTimeDays: {}, inventory: {} };
    const ignoredLead: string[] = [], ignoredInv: string[] = [];
    for (const n of liveNodes) {
      if (rawLeadTime.has(n.id)) {
        if (n.type === 'usine' || n.type === 'fournisseur') timing.productionLeadTimeDays[n.id] = rawLeadTime.get(n.id)!;
        else ignoredLead.push(n.id);
      }
      if (rawInventory.has(n.id)) {
        if (n.type === 'entrepot' || n.type === 'hub') timing.inventory[n.id] = rawInventory.get(n.id)!;
        else ignoredInv.push(n.id);
      }
    }
    for (const a of liveArcs) {
      const key = `${a.from}|${a.to}`;
      if (rawTravel.has(key)) timing.travelTimeDays[key] = rawTravel.get(key)!;
    }
    if (ignoredLead.length) warn('W_TEMPORAL_IGNORED', `production_lead_time_days ignoré sur des nœuds qui ne produisent pas (ni usine ni fournisseur) : ${ignoredLead.join(', ')}.`);
    if (ignoredInv.length) warn('W_TEMPORAL_IGNORED', `inventory ignoré sur des nœuds qui ne stockent pas (ni entrepôt ni hub) : ${ignoredInv.join(', ')}.`);
  }

  return {
    errors, warnings,
    compiled: { document: input as unknown as NetworkDocument, nodes: liveNodes, arcs: liveArcs, echelons, timing },
  };
}

// ----------------------------------------------------------------------------
// Échelons : plus long chemin (en nombre d'arcs) depuis une source, par ordre
// topologique. Un nœud appartenant à un cycle n'est pas classé (absent du
// résultat) ; les réseaux validés sont acycliques.
// ----------------------------------------------------------------------------
export function computeGraphEchelons(nodes: { id: string }[], arcs: { from: string; to: string }[]): Record<string, number> {
  const echelons: Record<string, number> = {};
  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  nodes.forEach(n => { indeg.set(n.id, 0); outs.set(n.id, []); });
  arcs.forEach(a => {
    if (!indeg.has(a.from) || !indeg.has(a.to)) return;
    indeg.set(a.to, indeg.get(a.to)! + 1);
    outs.get(a.from)!.push(a.to);
  });
  const queue = nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id);
  queue.forEach(id => { echelons[id] = 0; });
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of outs.get(u)!) {
      echelons[v] = Math.max(echelons[v] ?? 0, echelons[u] + 1);
      indeg.set(v, indeg.get(v)! - 1);
      if (indeg.get(v) === 0) queue.push(v);
    }
  }
  return echelons;
}

export function parseNetworkJson(text: string, options: ValidationOptions = {}): ValidationReport {
  let data: unknown;
  try { data = JSON.parse(text); }
  catch (e) { return { errors: [{ code: 'E_JSON', message: `JSON illisible : ${(e as Error).message}` }], warnings: [], compiled: null }; }
  return validateNetworkDocument(data, options);
}

export function networkDocumentToJson(doc: NetworkDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function compileNetworkOrThrow(doc: unknown, options: ValidationOptions = {}): CompiledNetwork {
  const report = validateNetworkDocument(doc, options);
  if (!report.compiled) {
    throw new Error(`Réseau invalide : ${report.errors.slice(0, 5).map(e => e.message).join(' ')}${report.errors.length > 5 ? ` (et ${report.errors.length - 5} autres erreurs)` : ''}`);
  }
  return report.compiled;
}

// ----------------------------------------------------------------------------
// Instanciation d'un scénario à partir d'un réseau explicite.
// Ordre des tirages (fixe) : plages des nœuds dans l'ordre du fichier, puis
// plages des arcs dans l'ordre du fichier, puis part importante, puis bruit de
// demande (plages de ModelParams.network). Une valeur fixe ou null ne consomme
// aucun tirage ; une plage en consomme toujours un (même si min = max).
// ----------------------------------------------------------------------------
const uniform = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);

export function instantiateExplicitNetwork(rng: () => number, compiled: CompiledNetwork, params: ModelParams['network']): NetworkInstance {
  const draw = (c: CapacitySpec): number | null => (c === null ? null : Array.isArray(c) ? uniform(rng, c[0], c[1]) : c);
  const nodes: NetworkNode[] = compiled.nodes.map(n => ({ id: n.id, type: n.type, name: n.name, capacity: n.type === 'client' ? null : draw(n.capacity) }));
  const arcs: NetworkArc[] = compiled.arcs.map(a => ({ from: a.from, to: a.to, capacity: draw(a.capacity) }));
  const importantShare = uniform(rng, params.importantShareMin, params.importantShareMax);
  const demandNoise = uniform(rng, params.demandNoiseMin, params.demandNoiseMax);

  // Vues historiques (non utilisées par le moteur, qui ne lit que graph).
  const asDef = (n: NetworkNode, type: NodeDef['type']): NodeDef => ({ id: n.id, type, name: n.name });
  const production = nodes.filter(n => n.type === 'usine' || n.type === 'fournisseur');
  const storage = nodes.filter(n => n.type === 'entrepot' || n.type === 'hub');
  const client = nodes.find(n => n.type === 'client')!;
  const factoryCapacity: Record<string, number> = {};
  production.forEach(n => { if (n.capacity !== null) factoryCapacity[n.id] = n.capacity; });
  const warehouseShipCapacity: Record<string, number> = {};
  storage.forEach(n => { if (n.capacity !== null) warehouseShipCapacity[n.id] = n.capacity; });

  return {
    factories: production.map(n => asDef(n, 'factory')),
    warehouses: storage.map(n => asDef(n, 'warehouse')),
    client: asDef(client, 'client'),
    edges: arcs.filter(a => a.capacity !== null).map(a => ({ from: a.from, to: a.to, baseCapacity: a.capacity as number })),
    factoryCapacity, warehouseShipCapacity,
    baseDemand: 0, // calé ensuite par calibrateDemand()
    importantShare, demandNoise,
    // Champ ajouté seulement en mode temporel (jamais écrit à undefined).
    ...(compiled.timing ? { timing: compiled.timing } : {}),
    graph: { nodes, arcs },
  };
}

// ----------------------------------------------------------------------------
// Réseau d'un plan : préparé une fois (validation et compilation du réseau
// explicite), puis instancié à chaque scénario.
// ----------------------------------------------------------------------------
export type PreparedNetwork =
  | { kind: 'parametrique' }
  | { kind: 'explicite'; compiled: CompiledNetwork };

export function prepareNetwork(spec: NetworkSpec, temporal = false): PreparedNetwork {
  if (spec.kind === 'explicite') return { kind: 'explicite', compiled: compileNetworkOrThrow(spec.document, { temporal }) };
  return { kind: 'parametrique' };
}

export function instantiateNetwork(rng: () => number, prepared: PreparedNetwork, params: ModelParams): NetworkInstance {
  switch (prepared.kind) {
    case 'parametrique':
      return generateNetworkInstance(rng, params.network); // mêmes tirages, même ordre qu'avant
    case 'explicite':
      return instantiateExplicitNetwork(rng, prepared.compiled, params.network);
  }
}

// ----------------------------------------------------------------------------
// Export de l'instance d'un scénario (réseau paramétrique, décision Q8 B) :
// document explicite à capacités fixes, avec la règle et l'origine en
// provenance. Réimporté, il donne un réseau explicite fixe : il ne reproduit
// pas les tirages du plan paramétrique (la graine et la configuration servent
// à cela).
// ----------------------------------------------------------------------------
export function networkInstanceToDocument(
  network: NetworkInstance,
  meta: { id: string; name: string; description?: string; provenance?: Record<string, unknown> }
): NetworkDocument {
  const doc: NetworkDocument = {
    format: NETWORK_FORMAT,
    format_version: NETWORK_FORMAT_VERSION,
    id: meta.id,
    name: meta.name,
    nodes: network.graph.nodes.map(n => (n.type === 'client'
      ? { id: n.id, type: n.type, name: n.name }
      : { id: n.id, type: n.type, name: n.name, capacity: n.capacity })),
    edges: network.graph.arcs.map(a => ({ from: a.from, to: a.to, capacity: a.capacity })),
  };
  // Champs facultatifs ajoutés seulement s'ils existent (jamais de valeur undefined : Firestore la refuse).
  if (meta.description !== undefined) doc.description = meta.description;
  if (meta.provenance !== undefined) doc.provenance = meta.provenance;
  return doc;
}
