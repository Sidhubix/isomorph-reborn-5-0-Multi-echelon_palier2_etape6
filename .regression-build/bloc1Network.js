"use strict";
// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : réseau logistique, injecteur de perturbations,
// observateur d'IP, calibration de la demande de référence.
// Toutes les valeurs numériques d'hypothèse viennent de ModelParams (voir
// bloc1DefaultParams.ts) — aucune constante figée ici.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.q16Stats = void 0;
exports.makeRng = makeRng;
exports.generateNetworkInstance = generateNetworkInstance;
exports.buildParametricGraph = buildParametricGraph;
exports.getNetworkGroups = getNetworkGroups;
exports.scaleStorageShipping = scaleStorageShipping;
exports.addToStorageShipping = addToStorageShipping;
exports.restoreStorageShipping = restoreStorageShipping;
exports.injectDisruption = injectDisruption;
exports.describeTarget = describeTarget;
exports.buildDailyState = buildDailyState;
exports.dailyCapacityResolver = dailyCapacityResolver;
exports.flowOptionsFromParams = flowOptionsFromParams;
exports.maxFlow = maxFlow;
exports.observeIp = observeIp;
exports.calibrateDemand = calibrateDemand;
const bloc1Flow_1 = require("./bloc1Flow");
// ----------------------------------------------------------------------------
// RNG déterministe (mulberry32) — un seed => une suite reproductible.
// ----------------------------------------------------------------------------
function makeRng(seed) {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const uniform = (rng, lo, hi) => lo + rng() * (hi - lo);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
// ----------------------------------------------------------------------------
// Génération de l'instance de réseau : 13 noeuds fixes (3 usines F1-F3, 9
// entrepôts W1-W9, 1 client NY). Chaque entrepôt est relié à 1 à 3 usines
// (desserte principale + secours partiel, jamais totalement redondant).
// La demande de référence est laissée à 0 ici : elle est fixée ensuite par
// calibrateDemand(), une fois la perturbation tirée (voir cette fonction).
// ----------------------------------------------------------------------------
function generateNetworkInstance(rng, params) {
    const factories = Array.from({ length: params.nFactories }, (_, i) => ({
        id: `F${i + 1}`, type: 'factory', name: `Usine ${i + 1}`,
    }));
    const warehouses = Array.from({ length: params.nWarehouses }, (_, i) => ({
        id: `W${i + 1}`, type: 'warehouse', name: `Entrepôt ${i + 1}`,
    }));
    const client = { id: 'NY', type: 'client', name: 'New York (client)' };
    const nF = factories.length;
    const edges = [];
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
    const factoryCapacity = {};
    factories.forEach(f => { factoryCapacity[f.id] = Math.round(uniform(rng, params.factoryCapacityMin, params.factoryCapacityMax)); });
    const warehouseShipCapacity = {};
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
function buildParametricGraph(net) {
    return {
        nodes: [
            ...net.factories.map(f => ({ id: f.id, type: 'usine', name: f.name, capacity: net.factoryCapacity[f.id] })),
            ...net.warehouses.map(w => ({ id: w.id, type: 'entrepot', name: w.name, capacity: net.warehouseShipCapacity[w.id] })),
            { id: net.client.id, type: 'client', name: net.client.name, capacity: null },
        ],
        arcs: [
            ...net.edges.map(e => ({ from: e.from, to: e.to, capacity: e.baseCapacity })),
            ...net.warehouses.map(w => ({ from: w.id, to: net.client.id, capacity: null })),
        ],
    };
}
const groupsCache = new WeakMap();
function getNetworkGroups(network) {
    const graph = network.graph ?? buildParametricGraph(network);
    const cached = groupsCache.get(graph);
    if (cached)
        return cached;
    const production = [], productionFinite = [];
    const storage = [], logistics = [], clients = [];
    const nominalNode = new Map();
    for (const n of graph.nodes) {
        nominalNode.set(n.id, n.capacity);
        if (n.type === 'usine' || n.type === 'fournisseur') {
            production.push(n.id);
            if (n.capacity !== null)
                productionFinite.push(n.id);
        }
        else if (n.type === 'entrepot' || n.type === 'hub') {
            storage.push(n.id);
            logistics.push(n.id);
        }
        else if (n.type === 'transporteur') {
            logistics.push(n.id);
        }
        else if (n.type === 'client') {
            clients.push(n.id);
        }
    }
    const finiteArcs = graph.arcs.filter(a => a.capacity !== null);
    const nominalArc = new Map();
    const finiteOutArcKeys = new Map();
    for (const a of finiteArcs) {
        const key = `${a.from}|${a.to}`;
        if (!nominalArc.has(key))
            nominalArc.set(key, a.capacity);
        const list = finiteOutArcKeys.get(a.from) ?? [];
        if (!list.includes(key))
            list.push(key);
        finiteOutArcKeys.set(a.from, list);
    }
    const groups = {
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
exports.q16Stats = { applications: 0 };
const clampNonNeg = (x) => Math.max(0, x);
function scaleStorageShipping(state, groups, id, factor) {
    if (hasOwn(state.nodeCapacity, id)) {
        state.nodeCapacity[id] *= factor;
        return;
    }
    exports.q16Stats.applications++;
    for (const key of groups.finiteOutArcKeys.get(id) ?? [])
        state.edgeCapacity[key] *= factor;
}
// Ajout d'un volume (D6). Nœud sans capacité propre : volume réparti entre ses
// arcs sortants finis au prorata de leur capacité nominale (Q16b A) ; rien si
// le nœud n'a aucun arc sortant fini.
function addToStorageShipping(state, groups, id, amount) {
    if (hasOwn(state.nodeCapacity, id)) {
        state.nodeCapacity[id] += amount;
        return;
    }
    exports.q16Stats.applications++;
    const keys = groups.finiteOutArcKeys.get(id) ?? [];
    const total = keys.reduce((s, k) => s + (groups.nominalArc.get(k) ?? 0), 0);
    if (total <= 0)
        return;
    for (const k of keys)
        state.edgeCapacity[k] += amount * (groups.nominalArc.get(k) ?? 0) / total;
}
// Restauration d'une part de la capacité perdue (D4).
function restoreStorageShipping(state, groups, id, fraction) {
    if (hasOwn(state.nodeCapacity, id)) {
        const nominal = groups.nominalNode.get(id) ?? 0;
        const lost = clampNonNeg(nominal - state.nodeCapacity[id]);
        state.nodeCapacity[id] += fraction * lost;
        return;
    }
    exports.q16Stats.applications++;
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
function injectDisruption(rng, network, opts) {
    const { params } = opts;
    const groups = getNetworkGroups(network);
    const type = pick(rng, opts.types);
    const isBinary = type === 'coupure_lien' || type === 'fermeture_entrepot';
    const severity = isBinary
        ? uniform(rng, params.binarySeverityMin, params.binarySeverityMax)
        : uniform(rng, params.severityMin, params.severityMax);
    const duration = Math.round(uniform(rng, params.durationMinDays, params.durationMaxDays));
    const base = { id: opts.id, type, start: opts.start, duration, severity };
    const requireTargets = (arr, what) => {
        if (arr.length === 0)
            throw new Error(`Perturbation "${type}" impossible : le réseau ne contient aucun ${what}.`);
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
            const primaryEdges = arcs.filter(e => e.capacity === Math.max(...arcs.filter(e2 => e2.to === e.to).map(e2 => e2.capacity)));
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
function describeTarget(d, network) {
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
function buildDailyState(network, disruption, day, // day_rel - disruption.start (peut être négatif, avant l'incident)
demandNoiseFactor, params) {
    const graph = network.graph ?? buildParametricGraph(network);
    const groups = getNetworkGroups(network);
    const nodeCapacity = {};
    graph.nodes.forEach(n => { if (n.type !== 'client' && n.capacity !== null)
        nodeCapacity[n.id] = n.capacity; });
    const edgeCapacity = {};
    groups.finiteArcs.forEach(e => { edgeCapacity[`${e.from}|${e.to}`] = e.capacity; });
    let demand = network.baseDemand * demandNoiseFactor;
    const importantShare = network.importantShare;
    const state = { nodeCapacity, edgeCapacity, demand, importantShare };
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
                    if (key in edgeCapacity)
                        edgeCapacity[key] *= (1 - s);
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
                groups.logistics.forEach(id => { if (hasOwn(nodeCapacity, id))
                    nodeCapacity[id] *= (1 - s); });
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
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function dailyCapacityResolver(state) {
    return {
        node: (id) => (hasOwn(state.nodeCapacity, id) ? state.nodeCapacity[id] : null),
        arc: (from, to) => {
            const key = `${from}|${to}`;
            return hasOwn(state.edgeCapacity, key) ? state.edgeCapacity[key] : null;
        },
    };
}
function flowOptionsFromParams(params) {
    return { maxIterations: params.flow.maxIterations, epsilon: bloc1Flow_1.FLOW_DEFAULT_OPTIONS.epsilon };
}
function maxFlow(network, state, options = bloc1Flow_1.FLOW_DEFAULT_OPTIONS) {
    // Repli pour une instance sérialisée sans expression générique (format antérieur).
    const graph = network.graph ?? buildParametricGraph(network);
    return (0, bloc1Flow_1.maxFlowOnGraph)(graph, dailyCapacityResolver(state), options);
}
// ----------------------------------------------------------------------------
// Observateur d'IP : part de la demande servie immédiatement, les articles
// importants comptant importantWeight fois (3 par défaut). Le débit disponible
// sert en priorité les articles importants.
// ----------------------------------------------------------------------------
function observeIp(state, deliverable, importantWeight) {
    const importantDemand = state.demand * state.importantShare;
    const regularDemand = state.demand - importantDemand;
    const importantServed = Math.min(deliverable, importantDemand);
    const remaining = Math.max(0, deliverable - importantServed);
    const regularServed = Math.min(remaining, regularDemand);
    const weightedDemand = regularDemand + importantWeight * importantDemand;
    if (weightedDemand <= 0)
        return 1;
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
function calibrateDemand(network, disruption, utilization, disruptionParams, warmupSafetyMargin, flowOptions = bloc1Flow_1.FLOW_DEFAULT_OPTIONS) {
    const probe = { ...network, baseDemand: 1 };
    const duringState = buildDailyState(probe, disruption, 0, 1, disruptionParams); // 1er jour de l'incident, sans bruit
    const duringFlow = maxFlow(probe, duringState, flowOptions);
    const demandMultiplierDuring = duringState.demand; // multiplicateur induit par l'incident (1 si la demande n'est pas la cible)
    const beforeState = buildDailyState(probe, disruption, -1000000, 1, disruptionParams); // bien avant le début, sans bruit
    const beforeFlow = maxFlow(probe, beforeState, flowOptions);
    const target = (utilization * duringFlow) / Math.max(1e-6, demandMultiplierDuring);
    const safeCap = (warmupSafetyMargin * beforeFlow) / (1 + network.demandNoise); // marge pour absorber le bruit journalier maximal
    network.baseDemand = Math.max(1, Math.round(Math.min(target, safeCap)));
}
