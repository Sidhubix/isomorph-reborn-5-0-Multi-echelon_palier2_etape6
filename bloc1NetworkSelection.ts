// ============================================================================
// ISOMORPH-Reborn — Sélection du réseau dans l'interface (palier 1, étape 5).
//
// Logique pure, sans React (donc testable hors navigateur) :
//   - le choix de réseau de l'utilisateur (défaut, ISOMORPH, réseau importé),
//     sa restauration robuste depuis le stockage local ou un fichier d'hypothèses ;
//   - sa résolution en réseau de plan (spécification + rapport de validation) ;
//   - l'import d'un fichier JSON (refusé s'il contient une erreur) ;
//   - le résumé (nœuds par type, arcs, échelons) et la mise en page du schéma.
//
// Règle de compatibilité : avec le réseau par défaut, la configuration du plan
// est exactement { ...planMeta, params } (champ network absent), donc identique
// à celle des versions précédentes.
// ============================================================================

import {
  ExperimentPlanConfig, ModelParams, NetworkNodeType, NetworkSpec, ScenarioDataset,
} from './bloc1Types';
import {
  NetworkDocument, ValidationReport, CapacitySpec, validateNetworkDocument, parseNetworkJson,
  computeGraphEchelons,
} from './bloc1NetworkFormat';
import { buildIsomorphPreset, IsomorphPresetOptions, ISOMORPH_PRESET_DEFAULTS } from './bloc1IsomorphPreset';
import { generateNetworkInstance, makeRng } from './bloc1Network';

// Limite d'affichage du résumé détaillé et du schéma (nombre de nœuds). Réglable
// dans la section Réseau ; ne concerne que l'affichage, jamais le calcul du plan.
export const DEFAULT_PREVIEW_MAX_NODES = 200;
const previewLimit = (n: number) => (Number.isFinite(n) && n >= 1 ? n : DEFAULT_PREVIEW_MAX_NODES);

export type NetworkSource = 'parametrique' | 'isomorph' | 'importe';

export interface ImportedNetwork {
  document: NetworkDocument;
  fileName: string;
}

export interface NetworkChoice {
  source: NetworkSource;
  isomorphOptions: IsomorphPresetOptions; // conservées même quand ISOMORPH n'est pas sélectionné
  imported: ImportedNetwork | null;       // dernier réseau importé, conservé pour pouvoir y revenir
}

export const NETWORK_CHOICE_STORAGE_KEY = 'isomorph_network_choice';

export function cloneDefaultNetworkChoice(): NetworkChoice {
  return { source: 'parametrique', isomorphOptions: { ...ISOMORPH_PRESET_DEFAULTS }, imported: null };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isFiniteNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

// Restaure un choix depuis un contenu quelconque (stockage local, fichier
// d'hypothèses). Tout ce qui est absent ou illisible retombe sur le réseau par
// défaut : un ancien fichier sans réseau donne donc le réseau paramétrique.
export function sanitizeNetworkChoice(raw: unknown): NetworkChoice {
  const choice = cloneDefaultNetworkChoice();
  if (!isObj(raw)) return choice;

  if (isObj(raw.isomorphOptions)) {
    const o = raw.isomorphOptions;
    if (isFiniteNum(o.arcRangePct)) choice.isomorphOptions.arcRangePct = o.arcRangePct;
    if (isFiniteNum(o.sourceFactor)) choice.isomorphOptions.sourceFactor = o.sourceFactor;
    if (o.lastMileCapacity === null || isFiniteNum(o.lastMileCapacity)) choice.isomorphOptions.lastMileCapacity = o.lastMileCapacity as number | null;
  }
  if (isObj(raw.imported) && typeof raw.imported.fileName === 'string') {
    const report = validateNetworkDocument(raw.imported.document);
    if (report.compiled) choice.imported = { document: report.compiled.document, fileName: raw.imported.fileName };
  }
  if (raw.source === 'isomorph') choice.source = 'isomorph';
  else if (raw.source === 'importe' && choice.imported) choice.source = 'importe';
  return choice;
}

// ----------------------------------------------------------------------------
// Résolution du choix en réseau de plan
// ----------------------------------------------------------------------------
export interface ResolvedNetwork {
  source: NetworkSource;
  label: string;                   // nom court, pour les titres et messages
  spec: NetworkSpec | null;        // null = réseau paramétrique (champ network omis)
  document: NetworkDocument | null;
  report: ValidationReport | null; // null pour le réseau paramétrique
  error: string | null;            // non nul : le plan ne peut pas être lancé
}

export const PARAMETRIC_LABEL = 'Réseau par défaut (paramétrique)';

function resolveDocument(source: NetworkSource, build: () => NetworkDocument, errorPrefix: string, temporal: boolean): ResolvedNetwork {
  let document: NetworkDocument;
  try { document = build(); }
  catch (e) {
    return { source, label: errorPrefix, spec: null, document: null, report: null, error: `${errorPrefix} : ${(e as Error).message}` };
  }
  // Même validation que celle du moteur : en mode temporel, les délais et inventory sont lus et contrôlés.
  const report = validateNetworkDocument(document, { temporal });
  if (!report.compiled) {
    const first = report.errors.slice(0, 3).map(e => e.message).join(' ');
    return { source, label: document.name, spec: null, document, report, error: `${errorPrefix} invalide : ${first}${report.errors.length > 3 ? ` (et ${report.errors.length - 3} autres erreurs)` : ''}` };
  }
  return { source, label: document.name, spec: { kind: 'explicite', document }, document, report, error: null };
}

export function resolveNetworkChoice(choice: NetworkChoice, temporal = false): ResolvedNetwork {
  if (choice.source === 'isomorph') {
    return resolveDocument('isomorph', () => buildIsomorphPreset(choice.isomorphOptions), 'Réseau ISOMORPH', temporal);
  }
  if (choice.source === 'importe' && choice.imported) {
    const doc = choice.imported.document;
    return resolveDocument('importe', () => doc, `Réseau importé (${choice.imported!.fileName})`, temporal);
  }
  return { source: 'parametrique', label: PARAMETRIC_LABEL, spec: null, document: null, report: null, error: null };
}

// Choix de réseau d'un fichier d'hypothèses importé. Un fichier sans champ
// network (exporté avant le palier 1) ou illisible donne le réseau par défaut.
export function networkChoiceFromHypotheses(data: unknown): NetworkChoice {
  if (isObj(data) && data.network) return sanitizeNetworkChoice(data.network);
  return cloneDefaultNetworkChoice();
}

// Message du potentiomètre d'impact (décision Q9 A) : avec un réseau explicite,
// le pilier « réseau » est ignoré. Absent (undefined) pour le réseau par défaut.
export function potentiometerNetworkNotice(resolved: ResolvedNetwork): string | undefined {
  if (!resolved.spec) return undefined;
  return `Réseau « ${resolved.label} » actif : le pilier « réseau » du potentiomètre est ignoré. Les capacités et le nombre de sites qu'il déplace ne s'appliquent qu'au réseau par défaut ; les capacités du réseau choisi sont celles de son fichier. Restent pilotés par le potentiomètre : sévérité et durée du choc, tension (rapport demande/débit), décisions D1 à D9, réactivité du gestionnaire, ainsi que la part d'articles importants et le bruit de demande.`;
}

// Réseau réellement utilisé par un jeu de données déjà généré (Centre de
// téléchargement) : lu dans dataset.metadata.config.network, jamais dans le
// choix actuellement affiché dans le Générateur, qui a pu changer depuis.
// Un ancien jeu de données (sans champ network) est un réseau paramétrique.
export interface DatasetNetworkInfo {
  kind: 'parametrique' | 'explicite';
  label: string;
  document: NetworkDocument | null;
  fileName: string;
}

const safeFileNamePart = (s: string) => s.replace(/[^A-Za-z0-9_.-]/g, '_');

export function datasetNetworkInfo(dataset: ScenarioDataset | null | undefined): DatasetNetworkInfo {
  const spec = dataset?.metadata?.config?.network as NetworkSpec | undefined;
  if (spec && spec.kind === 'explicite' && spec.document) {
    return { kind: 'explicite', label: spec.document.name, document: spec.document, fileName: `reseau_${safeFileNamePart(spec.document.id)}.json` };
  }
  return { kind: 'parametrique', label: PARAMETRIC_LABEL, document: null, fileName: 'reseau.json' };
}

// Configuration du plan lancé. Réseau paramétrique : champ network absent.
export type PlanMeta = Omit<ExperimentPlanConfig, 'params' | 'network'>;

export function buildPlanConfig(planMeta: PlanMeta, params: ModelParams, resolved: ResolvedNetwork): ExperimentPlanConfig {
  const config: ExperimentPlanConfig = { ...planMeta, params };
  if (resolved.spec) config.network = resolved.spec; // jamais écrit à undefined (Firestore le refuse)
  return config;
}

// ----------------------------------------------------------------------------
// Import d'un fichier JSON : refusé (choix inchangé) au moindre erreur bloquante.
// ----------------------------------------------------------------------------
export interface ImportOutcome {
  accepted: boolean;
  choice: NetworkChoice;
  report: ValidationReport;
}

export function importNetworkText(choice: NetworkChoice, text: string, fileName: string, temporal = false): ImportOutcome {
  const report = parseNetworkJson(text, { temporal });
  if (!report.compiled) return { accepted: false, choice, report };
  return {
    accepted: true,
    report,
    choice: { ...choice, source: 'importe', imported: { document: report.compiled.document, fileName } },
  };
}

// ----------------------------------------------------------------------------
// Résumé et schéma
// ----------------------------------------------------------------------------
export const NODE_TYPE_LABELS: Record<NetworkNodeType, string> = {
  fournisseur: 'Fournisseurs', usine: 'Usines', hub: 'Hubs', entrepot: 'Entrepôts', transporteur: 'Transporteurs', client: 'Clients',
};
const TYPE_ORDER: NetworkNodeType[] = ['fournisseur', 'usine', 'hub', 'entrepot', 'transporteur', 'client'];

export interface NetworkSummary {
  nodesByType: { type: NetworkNodeType; label: string; count: number }[];
  nNodes: number;
  nArcs: number | null;            // null : non calculé (réseau paramétrique trop grand pour l'aperçu)
  nArcsFinite: number | null;
  nArcsUnlimited: number | null;
  nEchelons: number | null;
  nIgnored: number;                // nœuds du fichier exclus (isolés ou non reliés)
  // Valeurs temporelles lues dans le fichier (mode temporel, réseau explicite) ; null/absent sinon.
  timing?: { travelArcs: number; maxTravelDays: number; leadNodes: number; maxLeadDays: number; inventoryNodes: number } | null;
}

interface GraphLike {
  nodes: { id: string; type: NetworkNodeType }[];
  arcs: { from: string; to: string; capacity: unknown }[];
}

function countByType(nodes: { type: NetworkNodeType }[]): NetworkSummary['nodesByType'] {
  return TYPE_ORDER
    .map(type => ({ type, label: NODE_TYPE_LABELS[type], count: nodes.filter(n => n.type === type).length }))
    .filter(x => x.count > 0);
}

export function summarizeGraph(graph: GraphLike, nIgnored = 0): NetworkSummary {
  const ech = computeGraphEchelons(graph.nodes, graph.arcs);
  const finite = graph.arcs.filter(a => a.capacity !== null).length;
  return {
    nodesByType: countByType(graph.nodes),
    nNodes: graph.nodes.length,
    nArcs: graph.arcs.length,
    nArcsFinite: finite,
    nArcsUnlimited: graph.arcs.length - finite,
    nEchelons: graph.nodes.length ? Math.max(...graph.nodes.map(n => ech[n.id] ?? 0)) + 1 : 0,
    nIgnored,
  };
}

// Structure du réseau paramétrique, obtenue en instanciant la règle avec un
// générateur aléatoire jetable (sans effet sur le générateur du plan). Le
// nombre de nœuds est celui des paramètres ; arcs et échelons ne sont calculés
// que si le réseau tient dans la limite de l'aperçu.
export function parametricStructure(params: ModelParams['network'], previewMaxNodesRaw: number): { summary: NetworkSummary; graph: GraphLike | null } {
  const previewMaxNodes = previewLimit(previewMaxNodesRaw);
  const nF = Number.isFinite(params.nFactories) ? Math.max(0, Math.floor(params.nFactories)) : 0;
  const nW = Number.isFinite(params.nWarehouses) ? Math.max(0, Math.floor(params.nWarehouses)) : 0;
  const nodesByType: NetworkSummary['nodesByType'] = [
    { type: 'usine' as const, label: NODE_TYPE_LABELS.usine, count: nF },
    { type: 'entrepot' as const, label: NODE_TYPE_LABELS.entrepot, count: nW },
    { type: 'client' as const, label: NODE_TYPE_LABELS.client, count: 1 },
  ].filter(x => x.count > 0);
  const base: NetworkSummary = {
    nodesByType, nNodes: nF + nW + 1, nArcs: null, nArcsFinite: null, nArcsUnlimited: null, nEchelons: null, nIgnored: 0,
  };
  if (nF < 1 || nW < 1 || nF + nW + 1 > previewMaxNodes) return { summary: base, graph: null };
  try {
    const probe = generateNetworkInstance(makeRng(0), params);
    return { summary: summarizeGraph(probe.graph), graph: probe.graph };
  } catch {
    return { summary: base, graph: null };
  }
}

// ---- Mise en page du schéma par échelons (une colonne par échelon) ----
export interface DiagramGeometry { colWidth: number; nodeWidth: number; nodeHeight: number; rowStep: number; pad: number; }
export const DEFAULT_DIAGRAM_GEOMETRY: DiagramGeometry = { colWidth: 150, nodeWidth: 112, nodeHeight: 24, rowStep: 34, pad: 14 };

export interface DiagramNode { id: string; type: NetworkNodeType; x: number; y: number; column: number; tip: string; }
export interface DiagramArc { from: string; to: string; unlimited: boolean; }
export interface DiagramLayout {
  width: number; height: number; nColumns: number;
  nodes: DiagramNode[]; arcs: DiagramArc[];
  geometry: DiagramGeometry;
}

export function capacityText(c: CapacitySpec | undefined): string {
  if (c === null || c === undefined) return 'illimitée';
  if (Array.isArray(c)) return `plage [${c[0]}, ${c[1]}]`;
  return String(c);
}

export function layoutDiagram(
  nodes: { id: string; type: NetworkNodeType; tip: string }[],
  arcs: { from: string; to: string; unlimited: boolean }[],
  echelons: Record<string, number>,
  geometry: DiagramGeometry = DEFAULT_DIAGRAM_GEOMETRY
): DiagramLayout {
  const columns = new Map<number, typeof nodes>();
  nodes.forEach(n => {
    const c = echelons[n.id] ?? 0;
    columns.set(c, [...(columns.get(c) ?? []), n]);
  });
  const nColumns = nodes.length ? Math.max(...columns.keys()) + 1 : 0;
  const maxRows = Math.max(1, ...[...columns.values()].map(v => v.length));
  const g = geometry;
  const innerHeight = (maxRows - 1) * g.rowStep + g.nodeHeight;
  const laid: DiagramNode[] = [];
  columns.forEach((list, c) => {
    const colHeight = (list.length - 1) * g.rowStep + g.nodeHeight;
    const offset = (innerHeight - colHeight) / 2;
    list.forEach((n, i) => laid.push({
      id: n.id, type: n.type, tip: n.tip, column: c,
      x: g.pad + c * g.colWidth, y: g.pad + offset + i * g.rowStep,
    }));
  });
  return {
    width: g.pad * 2 + Math.max(0, nColumns - 1) * g.colWidth + g.nodeWidth,
    height: g.pad * 2 + innerHeight,
    nColumns, nodes: laid, arcs, geometry: g,
  };
}

export interface NetworkView {
  summary: NetworkSummary;
  diagram: DiagramLayout | null;
  diagramNote: string | null;
}

// Vue complète du réseau résolu (résumé et schéma), pour l'affichage.
export function buildNetworkView(resolved: ResolvedNetwork, params: ModelParams['network'], previewMaxNodesRaw: number): NetworkView {
  const previewMaxNodes = previewLimit(previewMaxNodesRaw);
  if (resolved.source !== 'parametrique') {
    const compiled = resolved.report?.compiled;
    if (!compiled) {
      return { summary: { nodesByType: [], nNodes: 0, nArcs: 0, nArcsFinite: 0, nArcsUnlimited: 0, nEchelons: 0, nIgnored: 0 }, diagram: null, diagramNote: null };
    }
    const nIgnored = compiled.document.nodes.length - compiled.nodes.length;
    const summary = summarizeGraph({ nodes: compiled.nodes, arcs: compiled.arcs }, nIgnored);
    if (compiled.timing) {
      const t = compiled.timing;
      const travel = Object.values(t.travelTimeDays), lead = Object.values(t.productionLeadTimeDays);
      summary.timing = {
        travelArcs: travel.length, maxTravelDays: travel.length ? Math.max(...travel) : 0,
        leadNodes: lead.length, maxLeadDays: lead.length ? Math.max(...lead) : 0,
        inventoryNodes: Object.keys(t.inventory).length,
      };
    }
    if (compiled.nodes.length > previewMaxNodes) {
      return { summary, diagram: null, diagramNote: `Schéma non affiché : ${compiled.nodes.length} nœuds, au-delà de la limite d'affichage (${previewMaxNodes}).` };
    }
    const diagram = layoutDiagram(
      compiled.nodes.map(n => ({ id: n.id, type: n.type, tip: `${n.id} (${n.type}) : capacité ${capacityText(n.capacity)}` })),
      compiled.arcs.map(a => ({ from: a.from, to: a.to, unlimited: a.capacity === null })),
      compiled.echelons
    );
    return { summary, diagram, diagramNote: null };
  }
  const { summary, graph } = parametricStructure(params, previewMaxNodes);
  if (!graph) {
    return { summary, diagram: null, diagramNote: `Schéma non affiché : réseau vide, invalide ou de plus de ${previewMaxNodes} nœuds (limite d'affichage).` };
  }
  const ech = computeGraphEchelons(graph.nodes, graph.arcs);
  const diagram = layoutDiagram(
    graph.nodes.map(n => ({ id: n.id, type: n.type, tip: `${n.id} (${n.type}) : capacité tirée à chaque scénario` })),
    graph.arcs.map(a => ({ from: a.from, to: a.to, unlimited: a.capacity === null })),
    ech
  );
  return { summary, diagram, diagramNote: null };
}
