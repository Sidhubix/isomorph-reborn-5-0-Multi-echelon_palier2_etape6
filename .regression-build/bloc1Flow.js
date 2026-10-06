"use strict";
// ============================================================================
// ISOMORPH-Reborn — Flot maximal générique (palier 1).
//
// Graphe de calcul construit à partir d'un NetworkGraph :
//   1. source virtuelle vers chaque nœud source (aucun arc entrant, hors client),
//      avec sa capacité de production du jour ;
//   2. chaque arc du réseau, dans l'ordre du fichier ;
//   3. pour chaque nœud intermédiaire de capacité nominale non nulle (non null) :
//      arc interne entrée vers sortie portant son débit traversant du jour
//      (dédoublement du nœud) ;
//   4. chaque client vers le puits virtuel, sans limite.
//
// Algorithme : Edmonds-Karp (plus court chemin augmentant par parcours en
// largeur), identique à l'ancien moteur : même règle d'arc ignoré si capacité
// <= 0, même ordre de parcours des voisins (ordre d'insertion), même arrêt du
// parcours au puits, même tolérance, même garde d'itérations.
//
// Capacité illimitée (null) : l'arc est marqué « illimité ». Il est toujours
// traversable, n'entre pas dans le calcul du goulot et n'est jamais décrémenté.
// Aucune valeur infinie n'intervient donc dans les calculs.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnboundedFlowError = exports.FLOW_DEFAULT_OPTIONS = exports.FLOW_SINK = exports.FLOW_SOURCE = void 0;
exports.computeGraphRoles = computeGraphRoles;
exports.maxFlowOnGraph = maxFlowOnGraph;
exports.FLOW_SOURCE = '__SOURCE__';
exports.FLOW_SINK = '__SINK__';
// Valeurs identiques à l'ancien moteur. Elles seront exposées dans les
// paramètres du modèle à l'étape 3b (décision Q10).
exports.FLOW_DEFAULT_OPTIONS = { maxIterations: 5000, epsilon: 1e-9 };
// Nom du sommet de sortie d'un nœud dédoublé. Le caractère nul ne peut pas
// figurer dans un identifiant valide (règle de validation du format JSON).
const outVertex = (id) => `${id}\u0000out`;
class UnboundedFlowError extends Error {
    constructor() {
        super("Chemin sans aucune capacité finie entre la source et le client : le réseau doit comporter au moins une capacité finie sur chaque chemin.");
    }
}
exports.UnboundedFlowError = UnboundedFlowError;
function computeGraphRoles(graph) {
    const hasIncoming = new Set();
    graph.arcs.forEach(a => hasIncoming.add(a.to));
    const sources = [];
    const clients = [];
    const splitNodes = new Set();
    for (const n of graph.nodes) {
        if (n.type === 'client') {
            clients.push(n.id);
            continue;
        }
        if (!hasIncoming.has(n.id)) {
            sources.push(n.id);
            continue;
        }
        if (n.capacity !== null)
            splitNodes.add(n.id);
    }
    return { sources, clients, splitNodes };
}
function maxFlowOnGraph(graph, caps, options = exports.FLOW_DEFAULT_OPTIONS, roles = computeGraphRoles(graph)) {
    const residual = new Map();
    const unlimited = new Map();
    const neighborsOf = (u) => {
        let m = residual.get(u);
        if (!m) {
            m = new Map();
            residual.set(u, m);
        }
        return m;
    };
    const isUnlimited = (u, v) => unlimited.get(u)?.has(v) === true;
    // Même règle que l'ancien addEdge : arc ignoré si capacité <= 0 ; capacités
    // cumulées si l'arc existe déjà ; arc retour créé à 0 s'il n'existe pas.
    const addEdge = (u, v, c) => {
        if (c !== null && c <= 0)
            return;
        const mu = neighborsOf(u);
        const mv = neighborsOf(v);
        if (c === null) {
            let s = unlimited.get(u);
            if (!s) {
                s = new Set();
                unlimited.set(u, s);
            }
            s.add(v);
            if (!mu.has(v))
                mu.set(v, 0);
        }
        else {
            mu.set(v, (mu.get(v) || 0) + c);
        }
        mv.set(u, (mv.get(u) || 0) + 0);
    };
    const tail = (id) => (roles.splitNodes.has(id) ? outVertex(id) : id);
    // 1. Source virtuelle vers les nœuds sources.
    for (const id of roles.sources)
        addEdge(exports.FLOW_SOURCE, id, caps.node(id));
    // 2. Arcs du réseau, dans l'ordre du graphe.
    for (const a of graph.arcs)
        addEdge(tail(a.from), a.to, caps.arc(a.from, a.to));
    // 3. Arcs internes des nœuds dédoublés, dans l'ordre des nœuds.
    for (const n of graph.nodes) {
        if (roles.splitNodes.has(n.id))
            addEdge(n.id, outVertex(n.id), caps.node(n.id));
    }
    // 4. Clients vers le puits virtuel.
    for (const id of roles.clients)
        addEdge(id, exports.FLOW_SINK, null);
    const bfsPath = () => {
        const parent = new Map();
        const visited = new Set([exports.FLOW_SOURCE]);
        const queue = [exports.FLOW_SOURCE];
        while (queue.length) {
            const u = queue.shift();
            if (u === exports.FLOW_SINK)
                break;
            const neighbors = residual.get(u);
            if (!neighbors)
                continue;
            for (const [v, r] of neighbors) {
                if (!visited.has(v) && (r > options.epsilon || isUnlimited(u, v))) {
                    visited.add(v);
                    parent.set(v, u);
                    queue.push(v);
                }
            }
        }
        if (!visited.has(exports.FLOW_SINK))
            return null;
        const path = [exports.FLOW_SINK];
        let cur = exports.FLOW_SINK;
        while (cur !== exports.FLOW_SOURCE) {
            cur = parent.get(cur);
            path.push(cur);
        }
        return path.reverse();
    };
    let flow = 0;
    for (let guard = 0; guard < options.maxIterations; guard++) {
        const path = bfsPath();
        if (!path)
            break;
        let bottleneck = Infinity;
        for (let i = 0; i < path.length - 1; i++) {
            if (!isUnlimited(path[i], path[i + 1])) {
                bottleneck = Math.min(bottleneck, residual.get(path[i]).get(path[i + 1]));
            }
        }
        if (bottleneck === Infinity)
            throw new UnboundedFlowError();
        for (let i = 0; i < path.length - 1; i++) {
            const u = path[i], v = path[i + 1];
            if (!isUnlimited(u, v))
                residual.get(u).set(v, residual.get(u).get(v) - bottleneck);
            residual.get(v).set(u, residual.get(v).get(u) + bottleneck);
        }
        flow += bottleneck;
    }
    return flow;
}
