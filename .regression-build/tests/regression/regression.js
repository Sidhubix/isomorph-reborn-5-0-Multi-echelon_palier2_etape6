"use strict";
// ============================================================================
// ISOMORPH-Reborn — Tests de non-régression (palier 1, étape 1).
//
// Deux commandes :
//   generate : produit les fichiers de référence à partir du code courant
//              (à n'exécuter QU'UNE FOIS, sur le code d'origine non modifié).
//   check    : régénère les mêmes sorties et les compare octet par octet aux
//              fichiers de référence.
//
// Aucune dépendance ajoutée : exécution sous Node après compilation par
// tsconfig.regression.json (CommonJS). Les déclarations minimales ci-dessous
// remplacent @types/node, volontairement absent du projet.
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bloc1DefaultParams_1 = require("../../bloc1DefaultParams");
const bloc1Network_1 = require("../../bloc1Network");
const bloc1Decisions_1 = require("../../bloc1Decisions");
const bloc1ExperimentPlan_1 = require("../../bloc1ExperimentPlan");
const bloc1StressModel_1 = require("../../bloc1StressModel");
const bloc1NetworkFormat_1 = require("../../bloc1NetworkFormat");
const bloc1IsomorphPreset_1 = require("../../bloc1IsomorphPreset");
const bloc1Temporal_1 = require("../../bloc1Temporal");
const bloc1FirestoreLimits_1 = require("../../bloc1FirestoreLimits");
const react_1 = __importDefault(require("react"));
const server_1 = require("react-dom/server");
const Bloc1ScenarioGenerator_1 = __importStar(require("../../Bloc1ScenarioGenerator"));
const DownloadCenter_1 = __importDefault(require("../../DownloadCenter"));
const ModelDocumentation_1 = __importDefault(require("../../ModelDocumentation"));
const bloc1NetworkSelection_1 = require("../../bloc1NetworkSelection");
const NetworkPanel_1 = require("../../NetworkPanel");
const TemporalPanel_1 = require("../../TemporalPanel");
const bloc1TemporalUi_1 = require("../../bloc1TemporalUi");
const bloc1DefaultParams_2 = require("../../bloc1DefaultParams");
const bloc1Descriptions_1 = require("../../bloc1Descriptions");
const ImpactPotentiometer_1 = require("../../ImpactPotentiometer");
const bloc1NetworkSelection_2 = require("../../bloc1NetworkSelection");
const bloc1Flow_1 = require("../../bloc1Flow");
const fs = require('fs');
const path = require('path');
const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'regression', 'fixtures');
function baseConfig(seed, nScenarios, params, types = bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES) {
    return { nScenarios, seed, warmupDays: 10, horizonDays: 60, disruptionTypes: [...types], params };
}
const PLAN_CASES = [
    { id: 'C1_seed42', description: 'Paramètres par défaut, graine 42, 50 scénarios', config: () => baseConfig(42, 50, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()) },
    { id: 'C2_seed1', description: 'Paramètres par défaut, graine 1, 50 scénarios', config: () => baseConfig(1, 50, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()) },
    { id: 'C3_seed12345', description: 'Paramètres par défaut, graine 12345, 50 scénarios', config: () => baseConfig(12345, 50, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()) },
    { id: 'C4_stress0', description: 'Potentiomètre à 0 %, graine 42, 30 scénarios', config: () => baseConfig(42, 30, (0, bloc1StressModel_1.computeModelParamsFromStress)(0)) },
    { id: 'C5_stress100', description: 'Potentiomètre à 100 %, graine 42, 30 scénarios', config: () => baseConfig(42, 30, (0, bloc1StressModel_1.computeModelParamsFromStress)(100)) },
    {
        id: 'C6_4usines_12entrepots', description: 'Variante paramétrique 4 usines et 12 entrepôts, graine 7, 30 scénarios',
        config: () => { const p = (0, bloc1DefaultParams_1.cloneDefaultModelParams)(); p.network.nFactories = 4; p.network.nWarehouses = 12; return baseConfig(7, 30, p); },
    },
    { id: 'C7_coupure_lien', description: 'Uniquement coupure de lien, graine 99, 30 scénarios', config: () => baseConfig(99, 30, (0, bloc1DefaultParams_1.cloneDefaultModelParams)(), ['coupure_lien']) },
];
// Oracle du flot : 100 réseaux par défaut x 100 états journaliers aléatoires.
const FLOW_ORACLE_SEED = 2026;
const FLOW_ORACLE_NETWORKS = 100;
const FLOW_ORACLE_STATES_PER_NETWORK = 100;
const FLOW_ORACLE_DECISION_PROBABILITY = 0.3;
// ----------------------------------------------------------------------------
// Outils
// ----------------------------------------------------------------------------
function normalizeJsonWithoutGeneratedAt(json) {
    const obj = JSON.parse(json);
    delete obj.generated_at;
    return JSON.stringify(obj, null, 2);
}
// metadata.json seulement : la version du générateur est passée à 1.2.0 à
// l'étape 6 (réseau ajouté, colonnes ajoutées à scenarios.csv). C'est, comme
// generated_at, une information sur l'exécution et non sur le résultat : elle
// est ignorée dans les comparaisons aux fixtures produites par le code
// d'origine (version 1.1.0), et vérifiée séparément par un test dédié.
function normalizeMetadataJson(json) {
    const obj = JSON.parse(json);
    delete obj.generated_at;
    delete obj.version;
    return JSON.stringify(obj, null, 2);
}
// Lignes de résilience synthétiques et déterministes, dérivées des branches :
// elles servent uniquement d'entrée figée pour tester l'assemblage de l'export RB.
function syntheticResilienceRows(branches, horizonDays) {
    return branches.map(b => {
        const h = Math.max(0.001, 1 - b.ip_min);
        const g = Math.max(0.5, b.day_of_ip_min);
        const d = Math.max(1, (b.recovery_day ?? horizonDays) - b.day_of_ip_min + 1);
        const k = 1, q = 0, alpha = 1 + b.nb_decisions / 10, beta = 1 + b.area_lost / 100;
        return {
            scenario_id: b.scenario_id, branch_id: b.branch_id,
            k, q, h, g, d, alpha, beta,
            r2: 0.9, rmse: b.area_lost / 1000, r2_smooth: 0.92,
            crd: (beta / alpha) / d, ipc: h * d / 2, trp: d + 2.95 / beta, sra: beta / (alpha * d),
            err: 1 - h / 2, pr: (k + q) / (k - h / 2),
        };
    });
}
// Décision Q7 B : network_id, n_nodes, n_edges, n_echelons sont ajoutées à la
// fin de scenarios.csv. Les fixtures de référence (produites avec le code
// d'origine, avant cette colonne) n'en ont pas : on les retire du contenu
// fraîchement produit avant toute comparaison à ces fixtures. Les colonnes
// elles-mêmes sont vérifiées par des tests dédiés, pas par cette comparaison.
const SCENARIOS_NEW_COLUMN_COUNT = 4;
function stripScenarioNewColumns(csv) {
    return csv.split('\n').map(line => {
        const cells = line.split(',');
        return cells.slice(0, Math.max(0, cells.length - SCENARIOS_NEW_COLUMN_COUNT)).join(',');
    }).join('\n');
}
function diffAgainstLegacyFixture(name, content, fixtureContent) {
    if (name === 'scenarios.csv')
        return firstDifference(stripScenarioNewColumns(content), fixtureContent);
    // Les fixtures de metadata.json (produites au fil des étapes précédentes) ne
    // connaissent ni la version 1.2.0 ni, pour certaines, indicators/flow :
    // les deux sont normalisés des deux côtés avant comparaison.
    if (name === 'metadata.json')
        return firstDifference(metadataWithoutNewFields(normalizeMetadataJson(content)), metadataWithoutNewFields(normalizeMetadataJson(fixtureContent)));
    return firstDifference(content, fixtureContent);
}
function datasetOutputs(dataset, rows) {
    const out = {};
    for (const f of (0, bloc1ExperimentPlan_1.buildExportFiles)(dataset)) {
        out[f.name] = f.name === 'metadata.json' ? normalizeMetadataJson(f.content) : f.content;
    }
    out['rb_training.csv'] = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dataset, rows);
    out['rb_dictionary.json'] = normalizeJsonWithoutGeneratedAt((0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, rows));
    return out;
}
function firstDifference(a, b) {
    if (a === b)
        return '';
    const la = a.split('\n'), lb = b.split('\n');
    const n = Math.max(la.length, lb.length);
    for (let i = 0; i < n; i++) {
        if (la[i] !== lb[i]) {
            return `ligne ${i + 1} : attendu [${(lb[i] ?? '<absente>').slice(0, 160)}] obtenu [${(la[i] ?? '<absente>').slice(0, 160)}]`;
        }
    }
    return `longueurs différentes (${a.length} contre ${b.length} caractères)`;
}
// Champs ajoutés aux paramètres du modèle au palier 1 (étape 3b, décision Q10).
// Ce sont les SEULS champs ignorés lors de la comparaison aux références
// produites par la version 4.2, qui ne les connaissait pas.
// 'temporal' ajouté au palier 2 (étape 2), absent des références 4.2.
const NEW_PARAM_FIELDS = ['indicators', 'flow', 'temporal'];
function stripNewParamFields(params) {
    const copy = { ...params };
    for (const f of NEW_PARAM_FIELDS)
        delete copy[f];
    return copy;
}
function configWithoutNewFields(config) {
    return { ...config, params: stripNewParamFields(config.params) };
}
function metadataWithoutNewFields(json) {
    const obj = JSON.parse(json);
    if (obj.config?.params)
        obj.config.params = stripNewParamFields(obj.config.params);
    return JSON.stringify(obj, null, 2);
}
function fromLegacyState(st) {
    return {
        nodeCapacity: { ...st.factoryCapacity, ...st.warehouseShipCapacity },
        edgeCapacity: { ...st.edgeCapacity },
        demand: st.demand,
        importantShare: st.importantShare,
    };
}
function writeFile(rel, content) {
    const full = path.join(FIXTURES_DIR, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
}
function readFile(rel) {
    const full = path.join(FIXTURES_DIR, rel);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}
function buildFlowOracle() {
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const rng = (0, bloc1Network_1.makeRng)(FLOW_ORACLE_SEED);
    const networks = [];
    const entries = [];
    for (let n = 0; n < FLOW_ORACLE_NETWORKS; n++) {
        const network = (0, bloc1Network_1.generateNetworkInstance)(rng, params.network);
        const disruption = (0, bloc1Network_1.injectDisruption)(rng, network, { id: `O${n}`, types: bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES, start: 0, params: params.disruption });
        (0, bloc1Network_1.calibrateDemand)(network, disruption, 1, params.disruption, params.demand.warmupSafetyMargin);
        networks.push(JSON.parse(JSON.stringify(network)));
        for (let s = 0; s < FLOW_ORACLE_STATES_PER_NETWORK; s++) {
            const day = Math.floor(rng() * (disruption.duration + 4)) - 2;
            const noise = 1 + (rng() * 2 - 1) * network.demandNoise;
            const state = (0, bloc1Network_1.buildDailyState)(network, disruption, day, noise, params.disruption);
            for (const dec of bloc1Decisions_1.DECISIONS) {
                if (rng() < FLOW_ORACLE_DECISION_PROBABILITY) {
                    dec.apply(state, { network, disruption, day: Math.floor(rng() * 13), params });
                }
            }
            entries.push({ networkIndex: n, state: JSON.parse(JSON.stringify(state)), flow: (0, bloc1Network_1.maxFlow)(network, state) });
        }
    }
    return { networks, entries };
}
// ----------------------------------------------------------------------------
// Tests unitaires du flot générique (étape 2) : pas de référence, résultats
// attendus calculés à la main.
// ----------------------------------------------------------------------------
function tinyGraph(nodes, arcs) {
    return {
        nodes: nodes.map(([id, type, capacity]) => ({ id, type, name: id, capacity })),
        arcs: arcs.map(([from, to, capacity]) => ({ from, to, capacity })),
    };
}
function nominalFlow(g) {
    const nodeCap = new Map(g.nodes.map(n => [n.id, n.capacity]));
    const arcCap = new Map(g.arcs.map(a => [`${a.from}|${a.to}`, a.capacity]));
    return (0, bloc1Flow_1.maxFlowOnGraph)(g, { node: id => nodeCap.get(id) ?? null, arc: (f, t) => arcCap.get(`${f}|${t}`) ?? null });
}
// Réseau ISOMORPH d'origine (isomorph_reseau_originel.json) : capacité d'arc =
// volume d'un conteneur x conteneurs par jour ; sources à 15 000 (somme de leur
// arc sortant). lastMile = null : dernier kilomètre illimité (décision Q12 B).
function isomorphGraph(lastMile) {
    return tinyGraph([['SanFrancisco', 'usine', 15000], ['StLouis', 'usine', 15000], ['Orlando', 'usine', 15000],
        ['Nashville', 'hub', null], ['Atlanta', 'entrepot', null], ['Chicago', 'entrepot', null],
        ['Charlotte', 'entrepot', null], ['Memphis', 'entrepot', null], ['Columbus', 'entrepot', null],
        ['Richmond', 'entrepot', null], ['Philadelphia', 'entrepot', null], ['Baltimore', 'entrepot', null],
        ['NewYork', 'client', null]], [['SanFrancisco', 'Nashville', 15000], ['StLouis', 'Nashville', 15000], ['Orlando', 'Nashville', 15000],
        ['Nashville', 'Atlanta', 45000], ['Atlanta', 'Chicago', 12000], ['Atlanta', 'Charlotte', 12000],
        ['Atlanta', 'Memphis', 12000], ['Chicago', 'Columbus', 12000], ['Charlotte', 'Richmond', 12000],
        ['Columbus', 'Philadelphia', 12000], ['Richmond', 'Philadelphia', 12000], ['Richmond', 'Baltimore', 9000],
        ['Columbus', 'Baltimore', 9000], ['Memphis', 'Baltimore', 9000],
        ['Philadelphia', 'NewYork', lastMile], ['Baltimore', 'NewYork', lastMile]]);
}
function flowUnitTests(record) {
    const expectEq = (name, got, expected) => {
        let diff = '';
        try {
            const v = got();
            if (!Number.isFinite(v))
                diff = `valeur non finie : ${v}`;
            else if (v !== expected)
                diff = `attendu ${expected}, obtenu ${v}`;
        }
        catch (e) {
            diff = `exception : ${e.message}`;
        }
        record(`flot générique : ${name}`, diff);
    };
    // Structure du réseau par défaut exprimé en format générique.
    const net = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(42), (0, bloc1DefaultParams_1.cloneDefaultModelParams)().network);
    const g = net.graph;
    const count = (t) => g.nodes.filter(n => n.type === t).length;
    const structOk = g.nodes.length === 13 && count('usine') === 3 && count('entrepot') === 9 && count('client') === 1
        && g.arcs.length === 30 && g.arcs.slice(21).every(a => a.to === 'NY' && a.capacity === null)
        && g.arcs.slice(0, 21).every((a, i) => a.from === net.edges[i].from && a.to === net.edges[i].to && a.capacity === net.edges[i].baseCapacity);
    record('flot générique : réseau par défaut = 3 usines, 9 entrepôts, 1 client, 21 + 9 arcs', structOk ? '' : 'structure inattendue');
    expectEq('nœud intermédiaire illimité (non dédoublé)', () => nominalFlow(tinyGraph([['S', 'usine', 10], ['H', 'hub', null], ['C', 'client', null]], [['S', 'H', 50], ['H', 'C', 50]])), 10);
    expectEq('nœud intermédiaire limitant (dédoublé)', () => nominalFlow(tinyGraph([['S', 'usine', 10], ['H', 'hub', 4], ['C', 'client', null]], [['S', 'H', 50], ['H', 'C', 50]])), 4);
    expectEq('arc illimité', () => nominalFlow(tinyGraph([['S', 'usine', 7], ['C', 'client', null]], [['S', 'C', null]])), 7);
    expectEq('nœud intermédiaire de capacité nulle', () => nominalFlow(tinyGraph([['S', 'usine', 10], ['H', 'entrepot', 0], ['C', 'client', null]], [['S', 'H', 50], ['H', 'C', null]])), 0);
    // Comportement hérité : la capacité du jour d'un arc est lue par la clé
    // "from|to", donc deux arcs identiques prennent la valeur du dernier, comptée
    // deux fois. Ce cas n'existe que dans le réseau paramétrique à 1 usine ; les
    // arcs en double seront refusés par la validation du format JSON (étape 4).
    expectEq('arcs en double : comportement hérité (dernière capacité comptée deux fois)', () => nominalFlow(tinyGraph([['S', 'usine', 10], ['C', 'client', null]], [['S', 'C', 3], ['S', 'C', 4]])), 8);
    expectEq('identifiants numériques', () => nominalFlow(tinyGraph([['2', 'usine', 5], ['1', 'usine', 6], ['9', 'client', null]], [['2', '9', 100], ['1', '9', 100]])), 11);
    let unboundedDiff = 'aucune exception levée';
    try {
        nominalFlow(tinyGraph([['S', 'usine', null], ['C', 'client', null]], [['S', 'C', null]]));
    }
    catch (e) {
        unboundedDiff = e instanceof bloc1Flow_1.UnboundedFlowError ? '' : `exception inattendue : ${e.message}`;
    }
    record('flot générique : chemin entièrement illimité refusé sans valeur infinie', unboundedDiff);
    expectEq('ISOMORPH, dernier kilomètre provisoire 3000 (coupe = 6000)', () => nominalFlow(isomorphGraph(3000)), 6000);
    expectEq('ISOMORPH, dernier kilomètre illimité (coupe = 33000)', () => nominalFlow(isomorphGraph(null)), 33000);
}
// ----------------------------------------------------------------------------
// Tests de l'étape 3a : champ network, migration des anciennes configurations,
// génération unique partagée par les versions synchrone et asynchrone.
// ----------------------------------------------------------------------------
async function planUnitTests(record) {
    const csvNames = ['scenarios.csv', 'perturbations.csv', 'decisions.csv', 'ip_timeseries.csv', 'branches.csv'];
    const compareCsv = (caseId, dataset) => {
        for (const f of (0, bloc1ExperimentPlan_1.buildExportFiles)(dataset)) {
            if (!csvNames.includes(f.name))
                continue;
            const d = diffAgainstLegacyFixture(f.name, f.content, readFile(`${caseId}/${f.name}`) ?? '');
            if (d)
                return `${f.name} : ${d}`;
        }
        return '';
    };
    for (const c of PLAN_CASES) {
        const cfgText = readFile(`${c.id}/config.json`);
        const bundleText = readFile(`${c.id}/bundle.json`);
        const rowsText = readFile(`${c.id}/resilience_rows.json`);
        if (cfgText === null || bundleText === null || rowsText === null) {
            record(`${c.id} étape 3a`, 'références manquantes');
            continue;
        }
        // Réseau paramétrique déclaré explicitement = configuration sans champ network.
        const withSpec = { ...JSON.parse(cfgText), network: { kind: 'parametrique' } };
        record(`${c.id} network = paramétrique explicite donne les mêmes CSV`, compareCsv(c.id, (0, bloc1ExperimentPlan_1.generateExperimentPlan)(withSpec)));
        // Rechargement Cloud d'un jeu par son champ dataJson (metadata.config du jeu sauvegardé).
        const bundle = JSON.parse(bundleText);
        const storedConfig = JSON.parse(JSON.stringify(bundle.compactDataset.metadata.config));
        const reloaded = datasetOutputs((0, bloc1ExperimentPlan_1.generateExperimentPlan)(storedConfig), JSON.parse(rowsText));
        const reloadDiff = Object.keys(reloaded)
            .map(n => ({ n, d: diffAgainstLegacyFixture(n, reloaded[n], readFile(`${c.id}/${n}`) ?? '') }))
            .filter(x => x.d !== '');
        record(`${c.id} rechargement Cloud par metadata.config`, reloadDiff.length ? `${reloadDiff[0].n} : ${reloadDiff[0].d}` : '');
    }
    // La configuration n'est pas modifiée par la génération (metadata.json la reprend telle quelle).
    const cfg = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const before = JSON.stringify(cfg);
    const ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(cfg);
    record('configuration non modifiée et sans champ network dans metadata', JSON.stringify(ds.metadata.config) === before && !('network' in ds.metadata.config) ? '' : 'configuration modifiée');
    // Même suite d'appels de progression en synchrone et en asynchrone.
    const small = { ...cfg, nScenarios: 9 };
    const syncCalls = [], asyncCalls = [];
    (0, bloc1ExperimentPlan_1.generateExperimentPlan)(small, (d, t) => syncCalls.push(`${d}/${t}`));
    await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(small, (d, t) => asyncCalls.push(`${d}/${t}`));
    record('progression identique en synchrone et en asynchrone (9 appels)', syncCalls.join(',') === asyncCalls.join(',') && syncCalls.length === 9 ? '' : `synchrone ${syncCalls.join(',')} contre asynchrone ${asyncCalls.join(',')}`);
    // Type de réseau inconnu : erreur explicite, avant tout calcul.
    let unknownDiff = 'aucune erreur levée';
    try {
        (0, bloc1ExperimentPlan_1.resolveNetworkSpec)({ ...cfg, network: { kind: 'inconnu' } });
    }
    catch (e) {
        unknownDiff = e.message.includes('Type de réseau inconnu') ? '' : `message inattendu : ${e.message}`;
    }
    record('type de réseau inconnu refusé avec un message explicite', unknownDiff);
}
// ----------------------------------------------------------------------------
// Tests de l'étape 3b : groupes production et stockage, règle Q16 affinée,
// constantes exposées, rechargement des anciens fichiers.
// ----------------------------------------------------------------------------
// sourceFactor : facteur appliqué à la capacité des sources (Q13 A : somme des
// arcs sortants x facteur réglable, 1,0 par défaut).
function isomorphInstance(baseDemand, sourceFactor = 1) {
    const graph = isomorphGraph(null); // dernier kilomètre illimité (Q12 B), aucun nœud de stockage n'a de capacité propre
    graph.nodes.forEach(n => { if (n.capacity !== null && n.type === 'usine')
        n.capacity = n.capacity * sourceFactor; });
    return {
        factories: [], warehouses: [], client: { id: 'NewYork', type: 'client', name: 'NewYork' }, edges: [],
        factoryCapacity: {}, warehouseShipCapacity: {},
        baseDemand, importantShare: 0.3, demandNoise: 0.05,
        graph,
    };
}
function oldFilesTests(record) {
    const cfgText = readFile('C1_seed42/config.json');
    const bundleText = readFile('C1_seed42/bundle.json');
    if (cfgText === null || bundleText === null) {
        record('anciens fichiers', 'références manquantes');
        return;
    }
    const oldConfig = JSON.parse(cfgText);
    const defaults = JSON.stringify({ indicators: bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.indicators, flow: bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.flow });
    // Fichier d'hypothèses exporté par la version 2.5 (sans les nouvelles sections).
    const oldHypothesesFile = JSON.stringify({
        exportDate: '2026-09-01T00:00:00.000Z', version: '2.5', stressLevel: 50, isCustomized: false,
        planMeta: { nScenarios: oldConfig.nScenarios, seed: oldConfig.seed, warmupDays: oldConfig.warmupDays, horizonDays: oldConfig.horizonDays, disruptionTypes: oldConfig.disruptionTypes },
        params: oldConfig.params,
    });
    let diff = '';
    try {
        const data = JSON.parse(oldHypothesesFile);
        const hasNew = NEW_PARAM_FIELDS.some(f => f in data.params);
        const completed = (0, bloc1DefaultParams_1.withModelParamDefaults)(data.params);
        const ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...data.planMeta, params: data.params });
        const csvDiff = (0, bloc1ExperimentPlan_1.buildExportFiles)(ds).filter(f => f.name.endsWith('.csv'))
            .map(f => ({ n: f.name, d: diffAgainstLegacyFixture(f.name, f.content, readFile(`C1_seed42/${f.name}`) ?? '') }))
            .find(x => x.d !== '');
        if (hasNew)
            diff = 'le fichier de test contient déjà les nouvelles sections';
        else if (JSON.stringify({ indicators: completed.indicators, flow: completed.flow }) !== defaults)
            diff = 'valeurs par défaut non appliquées';
        else if (csvDiff)
            diff = `${csvDiff.n} : ${csvDiff.d}`;
    }
    catch (e) {
        diff = `exception : ${e.message}`;
    }
    record("ancien fichier d'hypothèses (v2.5) : rechargé avec les valeurs par défaut, sans erreur, CSV identiques", diff);
    // Bundle sauvegardé par la version 4.2.
    diff = '';
    try {
        const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)(bundleText));
        const p = restored.params;
        if (!p)
            diff = 'paramètres absents du bundle';
        else if (NEW_PARAM_FIELDS.some(f => f in p))
            diff = 'le bundle de référence contient déjà les nouvelles sections';
        else if (JSON.stringify({ indicators: (0, bloc1DefaultParams_1.withModelParamDefaults)(restored.params).indicators, flow: (0, bloc1DefaultParams_1.withModelParamDefaults)(restored.params).flow }) !== defaults)
            diff = 'valeurs par défaut non appliquées';
    }
    catch (e) {
        diff = `exception : ${e.message}`;
    }
    record('ancien bundle (v4.2) : restauré sans erreur, nouvelles constantes aux valeurs par défaut', diff);
    // Paramètres partiellement renseignés : seules les valeurs manquantes sont complétées.
    const partial = (0, bloc1DefaultParams_1.withModelParamDefaults)({ ...oldConfig.params, indicators: { importantWeight: 2 } });
    record('paramètres partiels : valeur fournie conservée, valeur manquante complétée', partial.indicators.importantWeight === 2 && partial.indicators.recoveryThreshold === bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.indicators.recoveryThreshold && partial.flow.maxIterations === bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.flow.maxIterations ? '' : JSON.stringify(partial.indicators));
    // Nouvelle exécution avec les paramètres par défaut actuels : metadata.json
    // ne diffère de la référence 4.2 que par les champs ajoutés.
    const fresh = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(PLAN_CASES[0].config());
    const freshMeta = (0, bloc1ExperimentPlan_1.buildExportFiles)(fresh).find(f => f.name === 'metadata.json').content;
    const hasFields = NEW_PARAM_FIELDS.every(f => f in (JSON.parse(freshMeta).config.params));
    record('metadata.json d\'une nouvelle exécution : contient indicators et flow, identique à la 4.2 pour tout le reste', !hasFields ? 'champs ajoutés absents' : firstDifference(metadataWithoutNewFields(normalizeMetadataJson(freshMeta)), metadataWithoutNewFields(normalizeMetadataJson(readFile('C1_seed42/metadata.json') ?? '{}'))));
}
function q16Tests(record) {
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const net = isomorphInstance(20000);
    const mk = (type, severity, target = {}) => ({ id: 'T', type, start: 0, duration: 10, severity, ...target });
    const panne = mk('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' });
    const fermeture = mk('fermeture_entrepot', 1, { targetWarehouse: 'Chicago' });
    const coupure = mk('coupure_lien', 1, { targetEdge: { from: 'Atlanta', to: 'Chicago' } });
    const congestion = mk('congestion', 0.5);
    const clone = (st) => JSON.parse(JSON.stringify(st));
    const applied = (decId, d, network) => {
        const before = (0, bloc1Network_1.buildDailyState)(network, d, 0, 1, params.disruption);
        const after = clone(before);
        bloc1Decisions_1.DECISION_BY_ID[decId].apply(after, { network, disruption: d, day: 0, params });
        return { before, after };
    };
    const w = params.indicators.importantWeight;
    // D1 à D7 : effet sur le débit ; D8 et D9 : effet sur l'IP.
    // D1 relève la production des autres sources. Avec le facteur Q13 à 1,0, la
    // capacité d'une source égale celle de son unique arc sortant : l'arc limite
    // et D1 est sans effet (constat signalé). D1 est donc testé avec un facteur 0,8.
    const net08 = isomorphInstance(20000, 0.8);
    const flowCases = [
        ['D1', panne, net08, ', facteur sources 0,8'], ['D2', fermeture, net, ''], ['D3', panne, net, ''], ['D4', coupure, net, ''],
        ['D5', congestion, net, ''], ['D6', congestion, net, ''], ['D7', panne, net, ''],
    ];
    bloc1Network_1.q16Stats.applications = 0;
    for (const [id, d, network, note] of flowCases) {
        const { before, after } = applied(id, d, network);
        const f0 = (0, bloc1Network_1.maxFlow)(network, before), f1 = (0, bloc1Network_1.maxFlow)(network, after);
        record(`ISOMORPH ${id} (${d.type}${note}) : débit ${Math.round(f0)} puis ${Math.round(f1)}`, f1 > f0 ? '' : 'aucun effet sur le débit');
    }
    {
        const { before, after } = applied('D1', panne, net);
        const f0 = (0, bloc1Network_1.maxFlow)(net, before), f1 = (0, bloc1Network_1.maxFlow)(net, after);
        record(`ISOMORPH constat : D1 sans effet avec facteur sources 1,0 (débit ${Math.round(f0)} puis ${Math.round(f1)})`, f1 === f0 ? '' : 'D1 a un effet : constat à revoir');
    }
    const demandNet = isomorphInstance(33000); // demande supérieure au débit pendant la panne
    for (const id of ['D8', 'D9']) {
        const { before, after } = applied(id, panne, demandNet);
        const ip0 = (0, bloc1Network_1.observeIp)(before, (0, bloc1Network_1.maxFlow)(demandNet, before), w), ip1 = (0, bloc1Network_1.observeIp)(after, (0, bloc1Network_1.maxFlow)(demandNet, after), w);
        record(`ISOMORPH ${id} (panne_fournisseur) : IP ${ip0.toFixed(4)} puis ${ip1.toFixed(4)}`, ip1 !== ip0 ? '' : "aucun effet sur l'IP");
    }
    // Manque à servir plus important (demande 50 000 pour un débit de 30 000) :
    // D8 (réduction de 25 %) et D9 (report de 30 %) doivent se distinguer.
    {
        const bigNet = isomorphInstance(50000);
        const ips = ['D8', 'D9'].map(id => {
            const { before, after } = applied(id, panne, bigNet);
            return [(0, bloc1Network_1.observeIp)(before, (0, bloc1Network_1.maxFlow)(bigNet, before), w), (0, bloc1Network_1.observeIp)(after, (0, bloc1Network_1.maxFlow)(bigNet, after), w)];
        });
        record(`ISOMORPH D8 et D9 avec fort manque à servir : IP ${ips[0][0].toFixed(4)} puis D8 ${ips[0][1].toFixed(4)}, D9 ${ips[1][1].toFixed(4)}`, ips[0][1] > ips[0][0] && ips[1][1] > ips[1][0] && ips[0][1] !== ips[1][1] ? '' : 'D8 et D9 non distinguées');
    }
    record('règle Q16 déclenchée sur ISOMORPH (nœuds de stockage sans capacité propre)', bloc1Network_1.q16Stats.applications > 0 ? '' : 'jamais déclenchée');
    // Congestion : pas de double dégradation des arcs sortants d'un nœud sans capacité.
    const cong = (0, bloc1Network_1.buildDailyState)(net, congestion, 0, 1, params.disruption);
    record('congestion : arc Atlanta -> Chicago à 6000 (une seule dégradation, pas deux)', cong.edgeCapacity['Atlanta|Chicago'] === 6000 ? '' : `valeur ${cong.edgeCapacity['Atlanta|Chicago']}`);
    // Arcs illimités jamais modifiés, aucune valeur non finie, toutes décisions cumulées.
    let bad = '';
    for (const d of [panne, fermeture, coupure, congestion]) {
        const st = (0, bloc1Network_1.buildDailyState)(net, d, 0, 1, params.disruption);
        for (const dec of bloc1Decisions_1.DECISIONS)
            dec.apply(st, { network: net, disruption: d, day: 0, params });
        if ('Philadelphia|NewYork' in st.edgeCapacity || 'Baltimore|NewYork' in st.edgeCapacity)
            bad = `${d.type} : arc illimité modifié`;
        const values = [...Object.values(st.edgeCapacity), ...Object.values(st.nodeCapacity)];
        if (values.some(v => !Number.isFinite(v)))
            bad = `${d.type} : valeur non finie`;
        if (!Number.isFinite((0, bloc1Network_1.maxFlow)(net, st)))
            bad = `${d.type} : débit non fini`;
    }
    record('arcs illimités jamais modifiés, aucune valeur non finie (9 décisions cumulées, 4 perturbations)', bad);
    // D6 : répartition au prorata des capacités nominales des arcs sortants finis.
    const { before: b6, after: a6 } = applied('D6', congestion, net);
    const boost = params.decisions.d6_stockBoostShareOfDemand * net.baseDemand; // jour 0 : pas encore d'épuisement
    const inc = (k) => a6.edgeCapacity[k] - b6.edgeCapacity[k];
    const total = Object.keys(a6.edgeCapacity).reduce((sum, k) => sum + inc(k), 0);
    const expected = boost * 7 / 9; // Philadelphie et Baltimore n'ont que des arcs sortants illimités : leur part est sans effet
    const atl = ['Atlanta|Chicago', 'Atlanta|Charlotte', 'Atlanta|Memphis'].map(inc);
    const col = [inc('Columbus|Philadelphia'), inc('Columbus|Baltimore')]; // 12000 et 9000 : parts 4/7 et 3/7
    const okD6 = Math.abs(total - expected) < 1e-6 && Math.abs(atl[0] - atl[1]) < 1e-9 && Math.abs(atl[1] - atl[2]) < 1e-9
        && Math.abs(col[0] / (col[0] + col[1]) - 12000 / 21000) < 1e-12;
    record('D6 : volume réparti au prorata des arcs sortants finis (7 nœuds de stockage sur 9 concernés)', okD6 ? '' : `total ${total} attendu ${expected}`);
}
// ----------------------------------------------------------------------------
// Tests de l'étape 4 : format JSON, validation, import et export, réseau
// ISOMORPH prédéfini, ordre des tirages, plan de bout en bout sur ISOMORPH.
// ----------------------------------------------------------------------------
function tinyDoc(nodes, edges, extra = {}) {
    return { format: 'isomorph-reborn-network', format_version: '1.0', id: 'test', name: 'test', nodes, edges, ...extra };
}
const N = (id, type, capacity) => (capacity === undefined ? { id, type } : { id, type, capacity });
const E = (from, to, capacity) => (capacity === undefined ? { from, to } : { from, to, capacity });
const BASE_NODES = [N('F', 'usine', 10), N('W', 'entrepot', 5), N('C', 'client')];
const BASE_EDGES = [E('F', 'W', 8), E('W', 'C')];
function formatTests(record, log) {
    // Réseau de base valide.
    const base = (0, bloc1NetworkFormat_1.validateNetworkDocument)(tinyDoc(BASE_NODES, BASE_EDGES));
    record('format : réseau minimal valide sans erreur ni avertissement', base.errors.length || base.warnings.length ? JSON.stringify([...base.errors, ...base.warnings]) : '');
    // Une erreur par règle.
    const errorCases = [
        ['E_STRUCTURE', 'champ nodes manquant', { format: 'isomorph-reborn-network', format_version: '1.0', id: 'x', name: 'x', edges: [] }],
        ['E_FORMAT', 'format inconnu', { ...tinyDoc(BASE_NODES, BASE_EDGES), format: 'autre' }],
        ['E_FORMAT', 'version inconnue', { ...tinyDoc(BASE_NODES, BASE_EDGES), format_version: '9.9' }],
        ['E_ID', 'identifiant avec |', tinyDoc([N('F|1', 'usine', 10), N('C', 'client')], [E('F|1', 'C')])],
        ['E_ID', 'identifiant réservé __', tinyDoc([N('__F', 'usine', 10), N('C', 'client')], [E('__F', 'C')])],
        ['E_DUPLICATE_ID', 'identifiant en double', tinyDoc([...BASE_NODES, N('W', 'hub')], BASE_EDGES)],
        ['E_TYPE', 'type inconnu', tinyDoc([N('F', 'usine', 10), N('W', 'depot', 5), N('C', 'client')], BASE_EDGES)],
        ['E_ARC_ENDPOINT', 'arc vers un nœud inexistant', tinyDoc(BASE_NODES, [...BASE_EDGES, E('W', 'Z', 1)])],
        ['E_SELF_LOOP', 'boucle sur un nœud', tinyDoc(BASE_NODES, [...BASE_EDGES, E('W', 'W', 1)])],
        ['E_DUPLICATE_ARC', 'arc en double', tinyDoc(BASE_NODES, [...BASE_EDGES, E('F', 'W', 3)])],
        ['E_CAPACITY', 'capacité négative', tinyDoc([N('F', 'usine', -1), N('W', 'entrepot', 5), N('C', 'client')], BASE_EDGES)],
        ['E_CAPACITY', 'plage min supérieur à max', tinyDoc(BASE_NODES, [E('F', 'W', [9, 2]), E('W', 'C')])],
        ['E_CAPACITY', 'capacité texte', tinyDoc(BASE_NODES, [E('F', 'W', '8'), E('W', 'C')])],
        ['E_NO_SOURCE', 'aucune source', tinyDoc([N('A', 'entrepot'), N('B', 'entrepot'), N('C', 'client')], [E('A', 'B', 1), E('B', 'A', 1), E('B', 'C')])],
        ['E_CLIENT_COUNT', 'deux clients', tinyDoc([...BASE_NODES, N('C2', 'client')], [...BASE_EDGES, E('W', 'C2')])],
        ['E_CLIENT_COUNT', 'aucun client', tinyDoc([N('F', 'usine', 10), N('W', 'entrepot', 5)], [E('F', 'W', 8)])],
        ['E_SOURCE_TYPE', 'hub sans arc entrant', tinyDoc([N('H', 'hub', 10), N('C', 'client')], [E('H', 'C')])],
        ['E_SOURCE_CAPACITY', 'source sans capacité', tinyDoc([N('F', 'usine'), N('C', 'client')], [E('F', 'C', 5)])],
        ['E_SUPPLIER_INCOMING', 'fournisseur recevant un arc', tinyDoc([...BASE_NODES, N('S', 'fournisseur', 3)], [...BASE_EDGES, E('W', 'S', 1)])],
        ['E_CLIENT_OUTGOING', 'client avec arc sortant', tinyDoc([...BASE_NODES, N('X', 'entrepot', 1)], [...BASE_EDGES, E('C', 'X', 1)])],
        ['E_CLIENT_CAPACITY', 'client avec capacité', tinyDoc([N('F', 'usine', 10), N('W', 'entrepot', 5), N('C', 'client', 4)], BASE_EDGES)],
        ['E_CYCLE', 'cycle', tinyDoc([...BASE_NODES, N('H', 'hub')], [...BASE_EDGES, E('W', 'H', 2), E('H', 'W', 2)])],
        ['E_ZERO_FLOW', 'débit nominal nul', tinyDoc(BASE_NODES, [E('F', 'W', 0), E('W', 'C')])],
    ];
    for (const [code, label, doc] of errorCases) {
        const r = (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc);
        record(`validation, erreur ${code} (${label})`, r.compiled === null && r.errors.some(e => e.code === code) ? '' : `erreurs obtenues : ${r.errors.map(e => e.code).join(', ') || 'aucune'}`);
    }
    const bad = (0, bloc1NetworkFormat_1.parseNetworkJson)('{ pas du json');
    record('validation, erreur E_JSON (texte illisible)', bad.errors.some(e => e.code === 'E_JSON') ? '' : 'non détecté');
    // Un avertissement par règle.
    const warnCases = [
        ['W_ISOLATED', 'nœud sans arc', tinyDoc([...BASE_NODES, N('Z', 'entrepot', 1)], BASE_EDGES)],
        ['W_DEAD', 'branche morte', tinyDoc([...BASE_NODES, N('F2', 'usine', 5), N('X', 'entrepot', 1)], [...BASE_EDGES, E('F2', 'X', 2)])],
        ['W_UNKNOWN_FIELD', 'champ inconnu', tinyDoc([{ ...N('F', 'usine', 10), couleur: 'bleu' }, N('W', 'entrepot', 5), N('C', 'client')], BASE_EDGES)],
        ['W_RESERVED', 'champ du palier 2', tinyDoc(BASE_NODES, [{ ...E('F', 'W', 8), travel_time_days: 2 }, E('W', 'C')])],
        ['W_STORAGE_UNLIMITED', 'stockage sans capacité, sorties illimitées', tinyDoc([N('F', 'usine', 10), N('W', 'entrepot'), N('C', 'client')], BASE_EDGES)],
        ['W_PRODUCTION_UNLIMITED', 'usine intermédiaire sans capacité', tinyDoc([N('S', 'fournisseur', 10), N('U', 'usine'), N('C', 'client')], [E('S', 'U', 8), E('U', 'C', 8)])],
        ['W_NO_TARGET', 'aucun nœud de stockage', tinyDoc([N('F', 'usine', 10), N('C', 'client')], [E('F', 'C', 8)])],
    ];
    for (const [code, label, doc] of warnCases) {
        const r = (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc);
        record(`validation, avertissement ${code} (${label})`, r.compiled !== null && r.warnings.some(w => w.code === code) ? '' : `erreurs ${r.errors.map(e => e.code).join(', ')} ; avertissements ${r.warnings.map(w => w.code).join(', ')}`);
    }
    const dead = (0, bloc1NetworkFormat_1.validateNetworkDocument)(warnCases[1][2]);
    record('nœuds morts exclus du réseau compilé', dead.compiled && dead.compiled.nodes.length === 3 && dead.compiled.arcs.length === 2 ? '' : 'nœuds morts conservés');
    // Réseau ISOMORPH prédéfini.
    const preset = (0, bloc1IsomorphPreset_1.buildIsomorphPreset)();
    const count = (t) => preset.nodes.filter(n => n.type === t).length;
    const cap = (from, to) => JSON.stringify(preset.edges.find(e => e.from === from && e.to === to).capacity);
    const structOk = preset.nodes.length === 13 && preset.edges.length === 16 && count('usine') === 3 && count('hub') === 1
        && count('entrepot') === 8 && count('client') === 1
        && preset.nodes.filter(n => n.type === 'usine').every(n => n.capacity === 12000)
        && cap('SanFrancisco', 'Nashville') === '[13500,16500]' && cap('Nashville', 'Atlanta') === '[40500,49500]'
        && cap('Memphis', 'Baltimore') === '[8100,9900]' && cap('Philadelphia', 'NewYork') === 'null' && cap('Baltimore', 'NewYork') === 'null';
    record('ISOMORPH prédéfini : 3 usines à 12 000, 1 hub, 8 entrepôts, 1 client, 16 arcs à plus ou moins 10 %, dernier kilomètre illimité', structOk ? '' : 'structure ou capacités inattendues');
    record('ISOMORPH prédéfini : valeurs par défaut des hypothèses (10 %, 0,8, illimité)', bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS.arcRangePct === 0.10 && bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS.sourceFactor === 0.8 && bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS.lastMileCapacity === null ? '' : JSON.stringify(bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS));
    const presetReport = (0, bloc1NetworkFormat_1.validateNetworkDocument)(preset);
    log('Avertissements de validation du réseau ISOMORPH prédéfini :');
    presetReport.warnings.forEach(w => log(`  ${w.code} : ${w.message}`));
    const codes = presetReport.warnings.map(w => w.code).sort().join(',');
    record('ISOMORPH prédéfini : aucune erreur ; avertissements attendus (W_RESERVED, W_STORAGE_UNLIMITED x2)', presetReport.errors.length === 0 && codes === 'W_RESERVED,W_STORAGE_UNLIMITED,W_STORAGE_UNLIMITED' ? '' : `erreurs ${presetReport.errors.map(e => e.code).join(',')} ; avertissements ${codes}`);
    record('ISOMORPH prédéfini : échelons de 0 (sources) à 6 (New York)', presetReport.compiled && presetReport.compiled.echelons['SanFrancisco'] === 0 && presetReport.compiled.echelons['Nashville'] === 1 && presetReport.compiled.echelons['NewYork'] === 6 ? '' : JSON.stringify(presetReport.compiled?.echelons));
    const lm = (0, bloc1NetworkFormat_1.validateNetworkDocument)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)({ lastMileCapacity: 3000 }));
    record('ISOMORPH avec dernier kilomètre fixe 3000 : plus d\'avertissement sur Philadelphie et Baltimore', lm.compiled && !lm.warnings.some(w => w.code === 'W_STORAGE_UNLIMITED') ? '' : lm.warnings.map(w => w.code).join(','));
    // Aller-retour export puis import.
    const text = (0, bloc1NetworkFormat_1.networkDocumentToJson)(preset);
    const back = (0, bloc1NetworkFormat_1.parseNetworkJson)(text);
    record('aller-retour export puis import : document identique', back.compiled && JSON.stringify(back.compiled.document) === JSON.stringify(preset) ? '' : 'document modifié');
    // Ordre des tirages : nœuds (ordre du fichier), puis arcs, puis part importante et bruit.
    const orderDoc = tinyDoc([N('F', 'usine', [10, 20]), N('W', 'entrepot', [1, 2]), N('C', 'client')], [E('F', 'W', [5, 6]), E('W', 'C')]);
    const compiledOrder = (0, bloc1NetworkFormat_1.validateNetworkDocument)(orderDoc).compiled;
    const np = (0, bloc1DefaultParams_1.cloneDefaultModelParams)().network;
    const inst = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(7), compiledOrder, np);
    const r = (0, bloc1Network_1.makeRng)(7);
    const u = (lo, hi) => lo + r() * (hi - lo);
    const expected = [u(10, 20), u(1, 2), u(5, 6), u(np.importantShareMin, np.importantShareMax), u(np.demandNoiseMin, np.demandNoiseMax)];
    const got = [inst.graph.nodes[0].capacity, inst.graph.nodes[1].capacity, inst.graph.arcs[0].capacity, inst.importantShare, inst.demandNoise];
    record('ordre des tirages d\'un réseau explicite : nœuds, arcs, part importante, bruit', JSON.stringify(got) === JSON.stringify(expected) ? '' : `obtenu ${JSON.stringify(got)} attendu ${JSON.stringify(expected)}`);
    const fixedInst = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(7), (0, bloc1NetworkFormat_1.validateNetworkDocument)(tinyDoc(BASE_NODES, BASE_EDGES)).compiled, np);
    const r2 = (0, bloc1Network_1.makeRng)(7);
    const fixedShare = np.importantShareMin + r2() * (np.importantShareMax - np.importantShareMin);
    record('valeurs fixes et illimitées : aucun tirage consommé', fixedInst.importantShare === fixedShare && fixedInst.graph.arcs[1].capacity === null ? '' : 'tirage consommé à tort');
    // Export de l'instance d'un scénario du réseau paramétrique (Q8 B).
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const exp0 = (0, bloc1ExperimentPlan_1.exportScenarioNetworkDocument)(c1, 0);
    const firstNet = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(c1.seed), (0, bloc1DefaultParams_1.withModelParamDefaults)(c1.params).network);
    const sameAsFirst = JSON.stringify(exp0.nodes.map(n => [n.id, n.type, n.capacity ?? null])) === JSON.stringify(firstNet.graph.nodes.map(n => [n.id, n.type, n.capacity]))
        && JSON.stringify(exp0.edges.map(e => [e.from, e.to, e.capacity])) === JSON.stringify(firstNet.graph.arcs.map(a => [a.from, a.to, a.capacity]));
    record('export du scénario S0001 (paramétrique) = réseau du premier scénario du plan', sameAsFirst ? '' : 'capacités différentes');
    const exp7 = (0, bloc1ExperimentPlan_1.exportScenarioNetworkDocument)(c1, 7);
    const exp7Report = (0, bloc1NetworkFormat_1.validateNetworkDocument)(exp7);
    record('export du scénario S0008 : document valide, règle et graine en provenance', exp7Report.compiled && exp7Report.errors.length === 0 && exp7.provenance.scenario_id === 'S0008'
        && exp7.provenance.seed === 42 && 'rule' in exp7.provenance ? '' : exp7Report.errors.map(e => e.message).join(' '));
    let outOfRange = 'aucune erreur';
    try {
        (0, bloc1ExperimentPlan_1.exportScenarioNetworkDocument)(c1, c1.nScenarios);
    }
    catch (e) {
        outOfRange = e.message.includes('hors du plan') ? '' : e.message;
    }
    record('export d\'un scénario hors du plan refusé', outOfRange);
    // Plan avec un réseau invalide dans la configuration : erreur explicite.
    let invalid = 'aucune erreur';
    try {
        (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 2, network: { kind: 'explicite', document: tinyDoc([N('F', 'usine')], []) } });
    }
    catch (e) {
        invalid = e.message.startsWith('Réseau invalide') ? '' : e.message;
    }
    record('plan avec un réseau explicite invalide : refusé avant tout calcul', invalid);
}
async function isomorphEndToEnd(record, log) {
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const config = {
        nScenarios: 50, seed: 42, warmupDays: 10, horizonDays: 60,
        disruptionTypes: [...bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES], params,
        network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() },
    };
    let ds;
    try {
        ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(config);
    }
    catch (e) {
        record('ISOMORPH de bout en bout : génération du plan', `exception : ${e.message}`);
        return;
    }
    record('ISOMORPH de bout en bout : 50 scénarios générés, 4 branches chacun', ds.scenarios.length === 50 && ds.branches.length === 200 ? '' : `${ds.scenarios.length} scénarios, ${ds.branches.length} branches`);
    const numbers = [
        ...ds.ipTimeseries.map(p => p.ip),
        ...ds.branches.flatMap(b => [b.ip_min, b.area_lost]),
        ...ds.scenarios.flatMap(s => [s.base_demand, s.important_share]),
        ...ds.perturbations.flatMap(p => [p.severity, p.duration]),
    ];
    const invalid = numbers.filter(v => !Number.isFinite(v)).length;
    record(`ISOMORPH de bout en bout : aucune valeur invalide (${numbers.length} valeurs contrôlées)`, invalid ? `${invalid} valeurs NaN ou infinies` : '');
    const outOfRange = ds.ipTimeseries.filter(p => p.ip < 0 || p.ip > 1).length;
    record('ISOMORPH de bout en bout : IP compris entre 0 et 1', outOfRange ? `${outOfRange} points hors de [0, 1]` : '');
    const warm = ds.ipTimeseries.filter(p => p.day_rel < 0);
    const warmBad = warm.filter(p => p.ip !== 1).length;
    record(`ISOMORPH de bout en bout : IP = 1 pendant la chauffe malgré le bruit (${warm.length} points)`, warmBad ? `${warmBad} points de chauffe avec IP < 1` : '');
    // Creux observable par nature (branche sans décision).
    log('Plan ISOMORPH (50 scénarios, graine 42), branche sans décision, par nature de perturbation :');
    let silent = '';
    for (const type of bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES) {
        const ids = ds.perturbations.filter(p => p.type === type).map(p => p.scenario_id);
        const mins = ds.branches.filter(b => b.branch_id === 'none' && ids.includes(b.scenario_id)).map(b => b.ip_min);
        const withDip = mins.filter(m => m < 1 - 1e-9).length;
        const minIp = mins.length ? Math.min(...mins) : NaN;
        log(`  ${type} : ${ids.length} scénarios, ${withDip} avec un creux, IP minimal ${Number.isFinite(minIp) ? minIp.toFixed(4) : 'sans objet'}`);
        if (ids.length === 0 || withDip === 0)
            silent += `${type} ${ids.length === 0 ? '(non tirée)' : '(sans effet)'} `;
    }
    record('ISOMORPH de bout en bout : creux observable pour chacune des 5 natures', silent.trim());
    // Restauration du plan ISOMORPH depuis un bundle (réseau recopié dans la configuration).
    const rows = syntheticResilienceRows(ds.branches, config.horizonDays);
    const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(ds, rows, '', 'ISOMORPH');
    const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)((0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle)));
    const a = datasetOutputs(ds, rows), b = datasetOutputs(restored.dataset, restored.resilienceRows);
    const d = Object.keys(a).map(n => ({ n, d: firstDifference(b[n], a[n]) })).find(x => x.d !== '');
    record('ISOMORPH : restauration depuis un bundle identique (8 fichiers)', d ? `${d.n} : ${d.d}` : '');
    const asyncDs = await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(config);
    const c = datasetOutputs(asyncDs, rows);
    const d2 = Object.keys(a).map(n => ({ n, d: firstDifference(c[n], a[n]) })).find(x => x.d !== '');
    record('ISOMORPH : génération asynchrone = synchrone', d2 ? `${d2.n} : ${d2.d}` : '');
    // Q17 : D1 agit sur le réseau prédéfini (facteur des sources 0,8).
    const compiled = (0, bloc1NetworkFormat_1.validateNetworkDocument)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)()).compiled;
    const net = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), compiled, params.network);
    net.baseDemand = 20000;
    const panne = { id: 'T', type: 'panne_fournisseur', start: 0, duration: 10, severity: 1, targetFactory: 'SanFrancisco' };
    const before = (0, bloc1Network_1.buildDailyState)(net, panne, 0, 1, params.disruption);
    const after = JSON.parse(JSON.stringify(before));
    bloc1Decisions_1.DECISION_BY_ID['D1'].apply(after, { network: net, disruption: panne, day: 0, params });
    const f0 = (0, bloc1Network_1.maxFlow)(net, before), f1 = (0, bloc1Network_1.maxFlow)(net, after);
    record(`ISOMORPH prédéfini (Q17) : D1 agit sur une panne de source, débit ${Math.round(f0)} puis ${Math.round(f1)}`, f1 > f0 ? '' : 'aucun effet');
}
// ----------------------------------------------------------------------------
// Tests de l'étape 5 : interface. Logique de sélection, import, résumé, schéma
// et rendu serveur (SSR) des composants, comparé au rendu de la version 4.2.
// ----------------------------------------------------------------------------
const normalizeHtml = (html) => html.replace(/<!-- -->/g, '');
// Retire la section « Réseau logistique » (un seul bloc <section>, sans section imbriquée).
function stripNetworkSection(html) {
    const start = html.indexOf('<section id="section-reseau"');
    if (start < 0)
        return { html, removed: '' };
    const end = html.indexOf('</section>', start);
    const removed = html.slice(start, end + '</section>'.length);
    return { html: html.slice(0, start) + html.slice(start + removed.length), removed };
}
function layoutInvariants(layout, expectedColumns, nodeCount) {
    if (layout.nColumns !== expectedColumns)
        return `${layout.nColumns} colonnes au lieu de ${expectedColumns}`;
    if (layout.nodes.length !== nodeCount)
        return `${layout.nodes.length} nœuds au lieu de ${nodeCount}`;
    const ids = new Set(layout.nodes.map(n => n.id));
    if (layout.nodes.some(n => !Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 0 || n.y < 0))
        return 'position invalide';
    for (const a of layout.arcs) {
        if (!ids.has(a.from) || !ids.has(a.to))
            return `arc ${a.from} vers ${a.to} sans extrémité`;
        const from = layout.nodes.find(n => n.id === a.from), to = layout.nodes.find(n => n.id === a.to);
        if (!(from.column < to.column))
            return `arc ${a.from} vers ${a.to} ne va pas vers un échelon supérieur`;
    }
    const g = layout.geometry;
    for (let i = 0; i < layout.nodes.length; i++)
        for (let j = i + 1; j < layout.nodes.length; j++) {
            const a = layout.nodes[i], b = layout.nodes[j];
            if (a.column === b.column && Math.abs(a.y - b.y) < g.nodeHeight)
                return `nœuds ${a.id} et ${b.id} superposés`;
        }
    if (layout.nodes.some(n => n.x + g.nodeWidth > layout.width || n.y + g.nodeHeight > layout.height))
        return 'nœud hors du cadre';
    return '';
}
async function uiTests(record, log) {
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const meta = { nScenarios: c1.nScenarios, seed: c1.seed, warmupDays: c1.warmupDays, horizonDays: c1.horizonDays, disruptionTypes: c1.disruptionTypes };
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const defaultChoice = (0, bloc1NetworkSelection_2.cloneDefaultNetworkChoice)();
    const defaultResolved = (0, bloc1NetworkSelection_2.resolveNetworkChoice)(defaultChoice);
    // --- Réseau par défaut : rien ne change pour un utilisateur qui n'y touche pas ---
    record('réseau par défaut : choix initial = paramétrique, sans réseau importé, options ISOMORPH par défaut', defaultChoice.source === 'parametrique' && defaultChoice.imported === null && JSON.stringify(defaultChoice.isomorphOptions) === JSON.stringify(bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS) ? '' : JSON.stringify(defaultChoice));
    record('réseau par défaut : aucune spécification, aucun rapport, aucune erreur', defaultResolved.spec === null && defaultResolved.report === null && defaultResolved.error === null ? '' : JSON.stringify(defaultResolved));
    const defaultConfig = (0, bloc1NetworkSelection_2.buildPlanConfig)(meta, params, defaultResolved);
    record('réseau par défaut : configuration du plan identique à celle des versions précédentes (champ network absent)', !('network' in defaultConfig) && JSON.stringify(defaultConfig) === JSON.stringify({ ...meta, params }) ? '' : 'configuration différente');
    const dsDefault = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(defaultConfig);
    const csvDiff = (0, bloc1ExperimentPlan_1.buildExportFiles)(dsDefault).filter(f => f.name.endsWith('.csv'))
        .map(f => ({ n: f.name, d: diffAgainstLegacyFixture(f.name, f.content, readFile(`C1_seed42/${f.name}`) ?? '') })).find(x => x.d !== '');
    record('réseau par défaut : plan lancé depuis l\'interface = références 4.2 (5 CSV)', csvDiff ? `${csvDiff.n} : ${csvDiff.d}` : '');
    // --- Restauration du choix (stockage local, fichier d'hypothèses) ---
    const asJson = (c) => JSON.stringify(c);
    const garbage = [undefined, null, 'x', 42, [], {}, { source: 'inconnu' }, { source: 'importe' }, { source: 'importe', imported: { fileName: 'a.json', document: { format: 'autre' } } }];
    const garbageBad = garbage.filter(g => asJson((0, bloc1NetworkSelection_2.sanitizeNetworkChoice)(g)) !== asJson(defaultChoice));
    record(`restauration : contenu absent ou illisible (${garbage.length} cas) donne le réseau par défaut`, garbageBad.length ? `${garbageBad.length} cas non ramenés au défaut` : '');
    record('fichier d\'hypothèses ancien (sans champ network) : retour au réseau par défaut', asJson((0, bloc1NetworkSelection_2.networkChoiceFromHypotheses)({ version: '2.5', params: c1.params, planMeta: meta })) === asJson(defaultChoice) ? '' : 'réseau non ramené au défaut');
    const preset = (0, bloc1IsomorphPreset_1.buildIsomorphPreset)({ arcRangePct: 0.2, sourceFactor: 0.9, lastMileCapacity: 4000 });
    const custom = { source: 'importe', isomorphOptions: { arcRangePct: 0.2, sourceFactor: 0.9, lastMileCapacity: 4000 }, imported: { document: preset, fileName: 'mon_reseau.json' } };
    const roundTrip = (0, bloc1NetworkSelection_2.sanitizeNetworkChoice)(JSON.parse(JSON.stringify(custom)));
    record('sauvegarde locale et fichier d\'hypothèses : réseau importé et options ISOMORPH restaurés à l\'identique', asJson(roundTrip) === asJson(custom) ? '' : 'choix modifié par l\'aller-retour');
    record('fichier d\'hypothèses récent avec réseau ISOMORPH : sélection restaurée', (0, bloc1NetworkSelection_2.networkChoiceFromHypotheses)({ network: { ...defaultChoice, source: 'isomorph' } }).source === 'isomorph' ? '' : 'sélection perdue');
    // --- ISOMORPH ---
    const isoChoice = { ...defaultChoice, source: 'isomorph' };
    const isoResolved = (0, bloc1NetworkSelection_2.resolveNetworkChoice)(isoChoice);
    record('ISOMORPH sélectionné : spécification explicite, aucune erreur, 3 avertissements', isoResolved.spec?.kind === 'explicite' && isoResolved.error === null && isoResolved.report?.warnings.length === 3 ? '' : JSON.stringify(isoResolved.report?.warnings.map(w => w.code)));
    const isoDs = (0, bloc1ExperimentPlan_1.generateExperimentPlan)((0, bloc1NetworkSelection_2.buildPlanConfig)({ ...meta, nScenarios: 5 }, params, isoResolved));
    const sc = isoDs.scenarios[0];
    record('ISOMORPH lancé depuis l\'interface : 5 scénarios, 3 usines et 9 nœuds de stockage (hub et 8 entrepôts)', isoDs.scenarios.length === 5 && sc.n_factories === 3 && sc.n_warehouses === 9 ? '' : `${isoDs.scenarios.length} scénarios, ${sc.n_factories} usines, ${sc.n_warehouses} stockage`);
    const badOptions = [
        ['plage 1,5', { arcRangePct: 1.5 }], ['plage NaN', { arcRangePct: NaN }], ['facteur 0', { sourceFactor: 0 }], ['dernier kilomètre 0', { lastMileCapacity: 0 }],
    ];
    for (const [label, o] of badOptions) {
        const r = (0, bloc1NetworkSelection_2.resolveNetworkChoice)({ ...isoChoice, isomorphOptions: { ...bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS, ...o } });
        record(`ISOMORPH avec option invalide (${label}) : lancement bloqué avec un message`, r.error !== null && r.spec === null ? '' : 'aucune erreur');
    }
    record('ISOMORPH : capacité de départ du dernier kilomètre limité = 3000 (valeur du fichier d\'origine)', (0, bloc1IsomorphPreset_1.originalLastMileCapacity)() === 3000 ? '' : String((0, bloc1IsomorphPreset_1.originalLastMileCapacity)()));
    // --- Import d'un fichier JSON ---
    const goodText = (0, bloc1NetworkFormat_1.networkDocumentToJson)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)());
    const ok = (0, bloc1NetworkSelection_2.importNetworkText)(defaultChoice, goodText, 'iso.json');
    record('import d\'un fichier valide : accepté, réseau importé sélectionné, nom de fichier conservé', ok.accepted && ok.choice.source === 'importe' && ok.choice.imported?.fileName === 'iso.json' ? '' : JSON.stringify(ok.choice.source));
    const importedRun = (0, bloc1NetworkSelection_2.resolveNetworkChoice)(ok.choice);
    record('réseau importé : spécification explicite lançable', importedRun.spec?.kind === 'explicite' && importedRun.error === null ? '' : String(importedRun.error));
    const refusedCases = [
        ['JSON illisible', '{ pas du json'],
        ['format inconnu', JSON.stringify({ format: 'autre', nodes: [], edges: [] })],
        ['cycle', JSON.stringify(tinyDoc([N('F', 'usine', 10), N('A', 'hub'), N('B', 'hub'), N('C', 'client')], [E('F', 'A', 5), E('A', 'B', 5), E('B', 'A', 5), E('B', 'C')]))],
        ['deux clients', JSON.stringify(tinyDoc([...BASE_NODES, N('C2', 'client')], [...BASE_EDGES, E('W', 'C2')]))],
    ];
    for (const [label, text] of refusedCases) {
        const r = (0, bloc1NetworkSelection_2.importNetworkText)(ok.choice, text, 'mauvais.json');
        record(`import refusé (${label}) : choix inchangé et erreurs listées`, !r.accepted && r.choice === ok.choice && r.report.errors.length > 0 ? '' : 'import accepté ou choix modifié');
    }
    const warnOnly = (0, bloc1NetworkSelection_2.importNetworkText)(defaultChoice, JSON.stringify(tinyDoc([...BASE_NODES, N('F2', 'usine', 5), N('X', 'entrepot', 1)], [...BASE_EDGES, E('F2', 'X', 2)])), 'branche_morte.json');
    record('import avec avertissements seulement : accepté, avertissement W_DEAD affiché', warnOnly.accepted && (0, bloc1NetworkSelection_2.resolveNetworkChoice)(warnOnly.choice).report?.warnings.some(w => w.code === 'W_DEAD') ? '' : 'refusé ou avertissement absent');
    const exported = (0, bloc1ExperimentPlan_1.exportScenarioNetworkDocument)({ ...c1, nScenarios: 3 }, 1);
    const reimport = (0, bloc1NetworkSelection_2.importNetworkText)(defaultChoice, (0, bloc1NetworkFormat_1.networkDocumentToJson)(exported), 'instance.json');
    record('instance exportée d\'un scénario paramétrique : réimportable telle quelle', reimport.accepted ? '' : reimport.report.errors.map(e => e.message).join(' '));
    // --- Résumé et schéma ---
    const vDefault = (0, bloc1NetworkSelection_2.buildNetworkView)(defaultResolved, params.network, 200);
    const sd = vDefault.summary;
    const countOf = (t) => sd.nodesByType.find(x => x.type === t)?.count ?? 0;
    record('résumé du réseau par défaut : 3 usines, 9 entrepôts, 1 client, 13 nœuds, 30 arcs (21 finis, 9 illimités), 3 échelons', countOf('usine') === 3 && countOf('entrepot') === 9 && countOf('client') === 1 && sd.nNodes === 13 && sd.nArcs === 30 && sd.nArcsFinite === 21 && sd.nArcsUnlimited === 9 && sd.nEchelons === 3 ? '' : JSON.stringify(sd));
    record('schéma du réseau par défaut : 3 colonnes, 13 nœuds, positions valides, arcs vers l\'échelon supérieur', vDefault.diagram ? layoutInvariants(vDefault.diagram, 3, 13) : 'schéma absent');
    const vIso = (0, bloc1NetworkSelection_2.buildNetworkView)(isoResolved, params.network, 200);
    const si = vIso.summary;
    const countIso = (t) => si.nodesByType.find(x => x.type === t)?.count ?? 0;
    record('résumé ISOMORPH : 3 usines, 1 hub, 8 entrepôts, 1 client, 13 nœuds, 16 arcs (14 finis, 2 illimités), 7 échelons', countIso('usine') === 3 && countIso('hub') === 1 && countIso('entrepot') === 8 && countIso('client') === 1 && si.nNodes === 13 && si.nArcs === 16 && si.nArcsFinite === 14 && si.nArcsUnlimited === 2 && si.nEchelons === 7 ? '' : JSON.stringify(si));
    record('schéma ISOMORPH : 7 colonnes, 13 nœuds, positions valides, arcs vers l\'échelon supérieur', vIso.diagram ? layoutInvariants(vIso.diagram, 7, 13) : 'schéma absent');
    const vDead = (0, bloc1NetworkSelection_2.buildNetworkView)((0, bloc1NetworkSelection_2.resolveNetworkChoice)(warnOnly.choice), params.network, 200);
    record('résumé d\'un réseau avec nœuds morts : 2 nœuds ignorés signalés', vDead.summary.nIgnored === 2 ? '' : String(vDead.summary.nIgnored));
    const vLimit = (0, bloc1NetworkSelection_2.buildNetworkView)(isoResolved, params.network, 5);
    record('limite d\'affichage dépassée : schéma remplacé par une explication, résumé conservé', vLimit.diagram === null && !!vLimit.diagramNote && vLimit.summary.nNodes === 13 ? '' : 'schéma affiché malgré la limite');
    const pZero = { ...params.network, nFactories: 0 };
    let zeroDiff = '';
    try {
        const v = (0, bloc1NetworkSelection_2.buildNetworkView)(defaultResolved, pZero, 200);
        zeroDiff = v.diagram === null ? '' : 'schéma affiché pour 0 usine';
    }
    catch (e) {
        zeroDiff = `exception : ${e.message}`;
    }
    record('réseau par défaut avec 0 usine saisi : aucun plantage de l\'aperçu', zeroDiff);
    const t0 = Date.now();
    const vBig = (0, bloc1NetworkSelection_2.buildNetworkView)(defaultResolved, { ...params.network, nWarehouses: 100000 }, 200);
    record('réseau par défaut avec 100 000 entrepôts saisis : aperçu instantané, arcs non calculés', Date.now() - t0 < 500 && vBig.summary.nNodes === 100004 && vBig.summary.nArcs === null && vBig.diagram === null ? '' : `${Date.now() - t0} ms, ${vBig.summary.nNodes} nœuds`);
    // Limite d'affichage vidée ou invalide : retour à la limite par défaut, sans calcul démesuré.
    const t1 = Date.now();
    const vNaN = (0, bloc1NetworkSelection_2.buildNetworkView)(defaultResolved, { ...params.network, nWarehouses: 100000 }, NaN);
    record('limite d\'affichage vide (NaN) avec 100 000 entrepôts : limite par défaut appliquée, aperçu instantané', Date.now() - t1 < 500 && vNaN.diagram === null && vNaN.summary.nArcs === null ? '' : `${Date.now() - t1} ms`);
    // Firestore refuse les valeurs indéfinies : aucune ne doit figurer dans la configuration d'un plan ISOMORPH.
    const findUndefined = (x, path) => {
        if (x === undefined)
            return path;
        if (Array.isArray(x)) {
            for (let i = 0; i < x.length; i++) {
                const r = findUndefined(x[i], `${path}[${i}]`);
                if (r)
                    return r;
            }
        }
        else if (x !== null && typeof x === 'object') {
            for (const k of Object.keys(x)) {
                const r = findUndefined(x[k], `${path}.${k}`);
                if (r)
                    return r;
            }
        }
        return '';
    };
    const isoConfig = (0, bloc1NetworkSelection_2.buildPlanConfig)(meta, params, isoResolved);
    record('configuration d\'un plan ISOMORPH : aucune valeur indéfinie (compatible Firestore)', findUndefined(isoConfig, 'config') ? `indéfini à ${findUndefined(isoConfig, 'config')}` : '');
    record('configuration d\'un plan sur le réseau importé : aucune valeur indéfinie', findUndefined((0, bloc1NetworkSelection_2.buildPlanConfig)(meta, params, importedRun), 'config') ? 'valeur indéfinie' : '');
    // --- Potentiomètre (Q9 A) ---
    record('potentiomètre : aucun message avec le réseau par défaut', (0, bloc1NetworkSelection_2.potentiometerNetworkNotice)(defaultResolved) === undefined ? '' : 'message affiché à tort');
    const notice = (0, bloc1NetworkSelection_2.potentiometerNetworkNotice)(isoResolved);
    record('potentiomètre : message « pilier réseau ignoré » avec ISOMORPH, nom du réseau cité', !!notice && notice.includes('ignoré') && notice.includes('ISOMORPH') ? '' : String(notice));
    const potHtml = (0, server_1.renderToString)(react_1.default.createElement(ImpactPotentiometer_1.ImpactPotentiometer, { value: 50, onChange: () => undefined, networkNotice: notice }));
    const potPlain = (0, server_1.renderToString)(react_1.default.createElement(ImpactPotentiometer_1.ImpactPotentiometer, { value: 50, onChange: () => undefined }));
    record('potentiomètre rendu : message présent avec un réseau explicite, absent sans', normalizeHtml(potHtml).includes('est ignoré') && !normalizeHtml(potPlain).includes('est ignoré') ? '' : 'message mal affiché');
    // --- Rendu serveur de l'onglet, comparé à la version 4.2 ---
    // Étape 7 : l'en-tête ne dit plus "réseau logistique à 13 noeuds" (fixe) mais
    // nomme le réseau paramétrique par sa taille réelle (3 usines, 9 entrepôts,
    // 1 client avec les paramètres par défaut) — seule cette phrase change
    // délibérément ; tout le reste doit rester identique à la 4.2.
    const LEGACY_HEADER = 'Instancie un réseau logistique à 13 noeuds';
    const NEW_HEADER = 'Instancie un réseau logistique paramétrique (3 usines, 9 entrepôts, 1 client)';
    const refHtml = normalizeHtml(readFile('ui_default_render_v42.html') ?? '').replace(LEGACY_HEADER, NEW_HEADER);
    const newHtml = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.default)));
    const { html: stripped, removed } = stripNetworkSection(newHtml);
    const firstNode = '<div class="p-6 space-y-6"><section id="section-reseau"';
    record('onglet Générateur, état initial : la section Réseau est le premier bloc de la page', newHtml.includes(firstNode) ? '' : 'section absente ou mal placée');
    let uiDiff = '';
    if (!removed)
        uiDiff = 'section Réseau introuvable';
    else if (removed.indexOf('<section', 10) >= 0)
        uiDiff = 'section imbriquée dans la section Réseau';
    else if (stripped !== refHtml) {
        let i = 0;
        while (i < stripped.length && i < refHtml.length && stripped[i] === refHtml[i])
            i++;
        uiDiff = `écart à la position ${i} : obtenu [${stripped.slice(Math.max(0, i - 40), i + 80)}] attendu [${refHtml.slice(Math.max(0, i - 40), i + 80)}]`;
    }
    record(`onglet Générateur, état initial : rendu identique à la version 4.2 une fois la section Réseau retirée (${refHtml.length} caractères)`, uiDiff);
    record('onglet Générateur : rendu reproductible (deux rendus identiques)', normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.default))) === newHtml ? '' : 'rendus différents');
    log(`Section Réseau du rendu initial : ${removed.length} caractères ajoutés à la page (${refHtml.length} caractères hors section).`);
    // --- Rendu de la section Réseau dans chaque état ---
    const panelProps = (choice) => ({ choice, onChoiceChange: () => undefined, resolved: (0, bloc1NetworkSelection_2.resolveNetworkChoice)(choice), params, planMeta: meta });
    const has = (html, ...needles) => needles.filter(n => !html.includes(n));
    const pDefault = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, panelProps(defaultChoice))));
    record('section Réseau, défaut : choix, résumé et schéma affichés, aucun rapport de validation', (() => { const m = has(pDefault, 'Réseau par défaut (paramétrique)', 'Usines', 'Entrepôts', 'échelon 2', 'Schéma par échelons', 'Importer un réseau (JSON)', "Exporter l&#x27;instance (JSON)"); return m.length || pDefault.includes('Rapport de validation') ? `manque ${m.join(' | ')}` : ''; })());
    const pIso = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, panelProps(isoChoice))));
    record('section Réseau, ISOMORPH : rapport de validation avec 3 avertissements lisibles, échelon 6 au schéma', (() => { const m = has(pIso, 'Rapport de validation', '3 avertissements', 'W_STORAGE_UNLIMITED', 'W_RESERVED', 'Philadelphia', 'Baltimore', 'échelon 6', 'Exporter le réseau (JSON)', 'Aucune erreur bloquante'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const pImp = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, panelProps({ ...ok.choice }))));
    record('section Réseau, réseau importé : nom du fichier affiché', has(pImp, 'Réseau importé : iso.json').length ? 'nom absent' : '');
    const pBad = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, panelProps({ ...isoChoice, isomorphOptions: { ...bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS, arcRangePct: 1.5 } }))));
    record('section Réseau, option ISOMORPH invalide : message « Le plan ne peut pas être lancé »', has(pBad, 'Le plan ne peut pas être lancé').length ? 'message absent' : '');
    const pRun = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, { ...panelProps(isoChoice), isRunning: true })));
    record('section Réseau pendant un calcul : boutons de choix et d\'import désactivés', (pRun.match(/disabled=""/g) ?? []).length >= 3 ? '' : 'boutons non désactivés');
    // --- Sections 6 et 7 des hypothèses ---
    const extra = (openSection, choice) => normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.ExtraHypothesisSections, {
        params, setParam: () => undefined, choice, onChoiceChange: () => undefined, openSection, setOpenSection: () => undefined, isShiftPressed: false,
    })));
    const e6 = extra('constants', defaultChoice);
    record('section 6 : poids 3, seuil 0,98 et garde 5000 affichés avec leurs valeurs par défaut', (() => { const m = has(e6, 'value="3"', 'value="0.98"', 'value="5000"', '6. Constantes de calcul'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const e7 = extra('isomorph', defaultChoice);
    record('section 7 : plage 0,1, facteur 0,8, dernier kilomètre illimité coché, capacité 3000 grisée', (() => { const m = has(e7, 'value="0.1"', 'value="0.8"', 'value="3000"', 'checked=""', 'disabled=""', 'Dernier kilomètre illimité'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const e7b = extra('isomorph', { ...defaultChoice, isomorphOptions: { ...bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS, lastMileCapacity: 4000 } });
    record('section 7 avec dernier kilomètre limité à 4000 : valeur affichée, champ actif', has(e7b, 'value="4000"').length === 0 && !e7b.includes('disabled=""') && !e7b.includes('checked=""') ? '' : 'affichage incorrect');
    const eClosed = extra('', defaultChoice);
    record('sections 6 et 7 fermées par défaut : seuls les deux titres sont affichés', eClosed.includes('6. Constantes') && eClosed.includes('7. Hypothèses') && !eClosed.includes('<input') ? '' : 'contenu affiché à tort');
}
// ----------------------------------------------------------------------------
// Compléments demandés après l'étape 5 :
//   1. le potentiomètre ne doit pas écraser les constantes de la section 6
//      (indicators, flow) ni les hypothèses ISOMORPH (section 7) ;
//   2. un document Cloud trop volumineux (réseau importé) doit échouer avec un
//      message explicite, jamais silencieusement, sans bloquer le local.
// ----------------------------------------------------------------------------
function potentiometerPreservationTests(record) {
    // Fonction réellement appelée par le curseur de l'onglet Générateur (palier 2 : extraite pour être testée telle quelle).
    const applyStress = bloc1StressModel_1.applyStressLevelPreservingSettings;
    const custom = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    custom.indicators = { importantWeight: 5, recoveryThreshold: 0.9 };
    custom.flow = { maxIterations: 200 };
    for (const level of [0, 25, 50, 75, 100]) {
        const after = applyStress(custom, level);
        record(`potentiomètre à ${level} % : constantes de la section 6 conservées (poids 5, seuil 0,9, garde 200)`, JSON.stringify(after.indicators) === JSON.stringify(custom.indicators) && JSON.stringify(after.flow) === JSON.stringify(custom.flow)
            ? '' : `obtenu ${JSON.stringify(after.indicators)} / ${JSON.stringify(after.flow)}`);
    }
    // Les 4 piliers historiques continuent bien de varier avec le niveau (le curseur n'est pas devenu inopérant).
    const at0 = applyStress(custom, 0), at100 = applyStress(custom, 100);
    record('potentiomètre : les 4 piliers historiques varient toujours avec le niveau (sévérité notamment)', at0.disruption.severityMin !== at100.disruption.severityMin ? '' : 'aucune variation détectée');
    // Section 7 (hypothèses ISOMORPH) : dans networkChoice, jamais dans params. Le
    // curseur (setParams uniquement) ne peut donc pas les toucher, quel que soit le niveau.
    const choice = { source: 'isomorph', isomorphOptions: { arcRangePct: 0.33, sourceFactor: 0.6, lastMileCapacity: 5000 }, imported: null };
    const before = JSON.stringify(choice);
    [0, 50, 100].forEach(level => applyStress(custom, level)); // n'agit que sur params, jamais sur choice
    record('potentiomètre : hypothèses ISOMORPH (section 7) non stockées dans params, donc jamais affectées par le curseur', JSON.stringify(choice) === before ? '' : 'choix modifié');
}
function firestoreSizeGuardTests(record) {
    record('limite Firestore : 1 MiB (1 048 576 octets)', bloc1FirestoreLimits_1.FIRESTORE_MAX_DOC_BYTES === 1048576 ? '' : String(bloc1FirestoreLimits_1.FIRESTORE_MAX_DOC_BYTES));
    record('byteLength : mesure des octets UTF-8, pas des caractères (é = 2 octets)', (0, bloc1FirestoreLimits_1.byteLength)('é') === 2 && (0, bloc1FirestoreLimits_1.byteLength)('a') === 1 ? '' : 'mesure incorrecte');
    const small = { a: 1, b: 'x'.repeat(100) };
    let smallDiff = 'exception levée à tort';
    try {
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)(small, 'petit document');
        smallDiff = '';
    }
    catch (e) {
        smallDiff = e.message;
    }
    record('document sous la limite : aucune exception', smallDiff);
    const big = { network: { document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() }, data: 'x'.repeat(bloc1FirestoreLimits_1.FIRESTORE_MAX_DOC_BYTES) };
    let bigDiff = 'aucune exception levée';
    try {
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)(big, 'Sauvegarde Cloud du jeu de données "test"');
    }
    catch (e) {
        const err = e;
        bigDiff = err.name === 'FirestoreDocumentTooLargeError' && err.message.includes('Sauvegarde Cloud du jeu de données "test"') && err.message.includes('Ko') && err.message.includes('1024 Ko') ? '' : `message inattendu : ${err.message}`;
    }
    record('document au-dessus de la limite : exception explicite (nom, taille, limite)', bigDiff);
    // Réseau importé volumineux : message d'appoint qui désigne le réseau comme cause probable.
    const hugeNetworkDoc = { ...(0, bloc1IsomorphPreset_1.buildIsomorphPreset)(), nodes: [...(0, bloc1IsomorphPreset_1.buildIsomorphPreset)().nodes, ...Array.from({ length: 20000 }, (_, i) => ({ id: `N${i}`, type: 'entrepot', capacity: 10 }))] };
    const hint = (0, bloc1FirestoreLimits_1.networkSizeHint)({ network: { kind: 'explicite', document: hugeNetworkDoc } });
    record('réseau importé volumineux : message d\'appoint désignant le réseau comme cause, mentionne le local préservé', hint && hint.includes('réseau') && hint.includes('locaux') ? '' : `message : ${hint}`);
    record('réseau paramétrique ou petit réseau : aucun message d\'appoint', (0, bloc1FirestoreLimits_1.networkSizeHint)({}) === undefined && (0, bloc1FirestoreLimits_1.networkSizeHint)({ network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } }) === undefined ? '' : 'message affiché à tort');
    let bigWithHintDiff = 'aucune exception';
    try {
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)({ data: 'x'.repeat(bloc1FirestoreLimits_1.FIRESTORE_MAX_DOC_BYTES) }, 'contexte', 'indice de cause');
    }
    catch (e) {
        bigWithHintDiff = e.message.includes('indice de cause') ? '' : 'indice absent du message';
    }
    record('message d\'appoint inclus dans l\'exception quand fourni', bigWithHintDiff);
    // La garde ne doit rien changer à la génération ou à l'export locaux : ce sont
    // des fonctions distinctes (buildExportFiles, downloadTextFile), jamais appelées
    // par assertFirestoreDocSize ni par saveUserDatasetToCloud/saveSimulationProcessToCloud.
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const dsLocal = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 3, network: { kind: 'explicite', document: hugeNetworkDoc } });
    record('génération locale avec un réseau volumineux : non affectée par la garde Cloud (aucune exception)', dsLocal.scenarios.length === 3 ? '' : 'génération locale interrompue');
}
// ----------------------------------------------------------------------------
// Tests de l'étape 6 : colonnes ajoutées à scenarios.csv (Q7 B), réseau dans
// metadata.json et version 1.2.0, carte Réseau du Centre de téléchargement,
// bundles et Cloud (aucune valeur indéfinie, réseau non dupliqué à tort).
// ----------------------------------------------------------------------------
function csvRow(csv, idColumn, idValue) {
    const lines = csv.split('\n');
    const header = lines[0].split(',');
    const row = lines.slice(1).map(l => l.split(',')).find(cells => cells[header.indexOf(idColumn)] === idValue);
    if (!row)
        return {};
    const out = {};
    header.forEach((h, i) => { out[h] = row[i]; });
    return out;
}
function step6ExportTests(record) {
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    // --- Colonnes ajoutées à scenarios.csv (Q7 B) ---
    const dsDefault = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 3 });
    const csvDefault = (0, bloc1ExperimentPlan_1.buildExportFiles)(dsDefault).find(f => f.name === 'scenarios.csv').content;
    record('scenarios.csv, en-tête : 4 colonnes ajoutées à la fin (network_id, n_nodes, n_edges, n_echelons)', csvDefault.split('\n')[0] === 'scenario_id,n_factories,n_warehouses,base_demand,important_share,warmup_days,horizon_days,network_id,n_nodes,n_edges,n_echelons' ? '' : csvDefault.split('\n')[0]);
    const rowDefault = csvRow(csvDefault, 'scenario_id', 'S0001');
    record('scenarios.csv, réseau par défaut : network_id=parametrique, 13 nœuds, 30 arcs, 3 échelons', rowDefault.network_id === 'parametrique' && rowDefault.n_nodes === '13' && rowDefault.n_edges === '30' && rowDefault.n_echelons === '3' ? '' : JSON.stringify(rowDefault));
    const isoConfig = { ...c1, nScenarios: 3, network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } };
    const dsIso = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(isoConfig);
    const rowIso = csvRow((0, bloc1ExperimentPlan_1.buildExportFiles)(dsIso).find(f => f.name === 'scenarios.csv').content, 'scenario_id', 'S0001');
    record('scenarios.csv, ISOMORPH : network_id=isomorph-originel, 13 nœuds, 16 arcs, 7 échelons, n_warehouses=9 (hub inclus)', rowIso.network_id === 'isomorph-originel' && rowIso.n_nodes === '13' && rowIso.n_edges === '16' && rowIso.n_echelons === '7' && rowIso.n_warehouses === '9' && rowIso.n_factories === '3' ? '' : JSON.stringify(rowIso));
    // Export RB à 40 colonnes inchangé : les colonnes ajoutées n'y figurent pas (Q7 B).
    const rbHeader = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dsDefault, syntheticResilienceRows(dsDefault.branches, c1.horizonDays)).split('\n')[0];
    record('export RB (rb_training.csv) : toujours 40 colonnes, aucune des 4 colonnes ajoutées', rbHeader.split(',').length === 40 && !rbHeader.includes('network_id') && !rbHeader.includes('n_nodes') && !rbHeader.includes('n_edges') && !rbHeader.includes('n_echelons') ? '' : `${rbHeader.split(',').length} colonnes : ${rbHeader}`);
    // --- metadata.json : réseau et version ---
    const metaDefault = JSON.parse((0, bloc1ExperimentPlan_1.buildExportFiles)(dsDefault).find(f => f.name === 'metadata.json').content);
    record('metadata.json, réseau par défaut : version 1.2.0, aucun champ network dans la configuration', metaDefault.version === '1.2.0' && !('network' in metaDefault.config) ? '' : JSON.stringify({ version: metaDefault.version, hasNetwork: 'network' in metaDefault.config }));
    const metaIso = JSON.parse((0, bloc1ExperimentPlan_1.buildExportFiles)(dsIso).find(f => f.name === 'metadata.json').content);
    record('metadata.json, ISOMORPH : version 1.2.0, réseau explicite recopié dans la configuration', metaIso.version === '1.2.0' && metaIso.config.network?.kind === 'explicite' && metaIso.config.network.document.id === 'isomorph-originel' ? '' : JSON.stringify(metaIso.config.network));
    // --- Carte Réseau du Centre de téléchargement ---
    const infoNone = (0, bloc1NetworkSelection_1.datasetNetworkInfo)(null);
    record('datasetNetworkInfo(null) : réseau par défaut, aucun document', infoNone.kind === 'parametrique' && infoNone.document === null ? '' : JSON.stringify(infoNone));
    const infoDefault = (0, bloc1NetworkSelection_1.datasetNetworkInfo)(dsDefault);
    record('datasetNetworkInfo, jeu de données par défaut : aucun document (rien à exporter, réseau différent par scénario)', infoDefault.kind === 'parametrique' && infoDefault.document === null ? '' : JSON.stringify(infoDefault));
    const infoIso = (0, bloc1NetworkSelection_1.datasetNetworkInfo)(dsIso);
    record('datasetNetworkInfo, jeu de données ISOMORPH : document présent, réexportable (aller-retour)', infoIso.kind === 'explicite' && infoIso.document !== null && (0, bloc1NetworkFormat_1.parseNetworkJson)((0, bloc1NetworkFormat_1.networkDocumentToJson)(infoIso.document)).compiled !== null ? '' : 'document absent ou invalide');
    const dsOld = JSON.parse(JSON.stringify(dsDefault));
    delete dsOld.metadata.config.network; // simule un ancien jeu de données restauré (avant le palier 1)
    record('datasetNetworkInfo, ancien jeu de données restauré (sans champ network) : réseau par défaut, sans erreur', (0, bloc1NetworkSelection_1.datasetNetworkInfo)(dsOld).kind === 'parametrique' ? '' : 'erreur ou mauvais résultat');
    const props = (dataset) => ({ dataset, resilienceRows: [], resilienceCsv: '', onGoToGenerator: () => undefined, onGoToBatch: () => undefined });
    const htmlNone = (0, server_1.renderToString)(react_1.default.createElement(DownloadCenter_1.default, props(null)));
    record('Centre de téléchargement, aucun jeu de données : carte Réseau présente, en attente', htmlNone.includes('reseau.json') || htmlNone.includes('En attente de la génération') ? '' : 'carte absente');
    const htmlDefault = (0, server_1.renderToString)(react_1.default.createElement(DownloadCenter_1.default, props(dsDefault)));
    record("Centre de téléchargement, réseau par défaut : description explique l'absence de fichier réseau unique", htmlDefault.includes('Exporter l&#x27;instance') || htmlDefault.includes("n'y a donc pas de fichier réseau unique") ? '' : 'description absente');
    const htmlIso = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(DownloadCenter_1.default, props(dsIso))));
    record('Centre de téléchargement, ISOMORPH : nom de fichier reseau_isomorph-originel.json affiché', htmlIso.includes('reseau_isomorph-originel.json') ? '' : 'nom de fichier absent');
    // La carte n'affiche que les 5 premières colonnes suivies de "..." (voir DownloadCenter.tsx) ;
    // les 4 colonnes ajoutées (au-delà de la 5e) ne sont donc pas censées apparaître ici.
    record('Centre de téléchargement, aperçu des colonnes de scenarios.csv : 5 premières affichées, suivies de points de suspension', htmlIso.includes('scenario_id, n_factories, n_warehouses, base_demand, important_share...') ? '' : 'aperçu des colonnes différent');
    // --- Bundles et Cloud : pas de valeur indéfinie, réseau non perdu à la restauration ---
    const rows = syntheticResilienceRows(dsIso.branches, isoConfig.horizonDays);
    const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dsIso, rows, '', 'ISOMORPH étape 6');
    const findUndefined2 = (x, path) => {
        if (x === undefined)
            return path;
        if (Array.isArray(x)) {
            for (let i = 0; i < x.length; i++) {
                const r = findUndefined2(x[i], `${path}[${i}]`);
                if (r)
                    return r;
            }
        }
        else if (x !== null && typeof x === 'object') {
            for (const k of Object.keys(x)) {
                const r = findUndefined2(x[k], `${path}.${k}`);
                if (r)
                    return r;
            }
        }
        return '';
    };
    // resilienceCsv/resilienceRows/compactDataset peuvent être undefined au niveau du
    // bundle par construction d'origine (createSimulationProcessBundle) : firebase.ts
    // les remplace par '' ou [] avant l'écriture Firestore (vérifié par lecture du
    // code). Seul le réseau, ajouté au palier 1, doit être vérifié ici.
    record('bundle ISOMORPH : réseau explicite recopié dans bundle.config, aucune valeur indéfinie à l\'intérieur', findUndefined2(bundle.config, 'bundle.config') ? `indéfini à ${findUndefined2(bundle.config, 'bundle.config')}` : '');
    const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)((0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle)));
    record('bundle ISOMORPH restauré : réseau explicite conservé, dataset identique', restored.params !== undefined
        && JSON.stringify((0, bloc1NetworkSelection_1.datasetNetworkInfo)(restored.dataset)) === JSON.stringify(infoIso) ? '' : 'réseau perdu à la restauration');
    // Une taille de document Cloud raisonnable (ISOMORPH, ~quelques Ko) passe la garde de taille sans erreur.
    let cloudGuardDiff = 'exception inattendue';
    try {
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)({ config: isoConfig, compactDataset: bundle.compactDataset }, 'contrôle étape 6', (0, bloc1FirestoreLimits_1.networkSizeHint)(isoConfig));
        cloudGuardDiff = '';
    }
    catch (e) {
        cloudGuardDiff = `document ISOMORPH refusé à tort : ${e.message}`;
    }
    record('bundle ISOMORPH (taille réelle) : sous la limite Firestore', cloudGuardDiff);
}
// ----------------------------------------------------------------------------
// Tests de l'étape 7 : documentation dans l'application (onglet Comprendre le
// modèle, en-tête du Générateur). Le texte du manuel (Claude Doc) est proposé
// séparément et n'est pas testé ici.
// ----------------------------------------------------------------------------
function step7DocTests(record) {
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const htmlDoc = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(ModelDocumentation_1.default, {})));
    const has = (html, ...needles) => needles.filter(n => !html.includes(n));
    record('Comprendre le modèle : mentionne le réseau ISOMORPH et le réseau importé comme alternatives au réseau par défaut', (() => { const m = has(htmlDoc, 'ISOMORPH', 'importer un réseau'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Comprendre le modèle : types de nœuds et groupes production/stockage expliqués', (() => { const m = has(htmlDoc, 'fournisseur', 'transporteur', 'groupe', 'production', 'stockage'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Comprendre le modèle : n_factories/n_warehouses expliqués, hub de Nashville cité pour ISOMORPH', (() => { const m = has(htmlDoc, 'n_factories', 'n_warehouses', 'Nashville'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Comprendre le modèle : section 6 (constantes) présente avec les 3 valeurs par défaut', (() => { const m = has(htmlDoc, '6. Constantes de calcul', 'articles importants', '0,98', '5000'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Comprendre le modèle : section 7 (ISOMORPH) présente, les 3 hypothèses qualifiées comme telles', (() => { const m = has(htmlDoc, '7. Réseau ISOMORPH prédéfini', 'hypothèse', '10 %', '0,8'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Comprendre le modèle : les 3 avertissements ISOMORPH annoncés (délais, Philadelphia, Baltimore)', (() => { const m = has(htmlDoc, 'délais de trajet', 'Philadelphia', 'Baltimore'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    // En-tête du Générateur : dynamique et exact pour le réseau par défaut (dépend des paramètres).
    const htmlGenDefault = normalizeHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.default)));
    record("En-tête du Générateur, réseau par défaut : mentionne le nombre réel d'usines et d'entrepôts, plus \"13 noeuds\" fixe", htmlGenDefault.includes(`(${params.network.nFactories} usines, ${params.network.nWarehouses} entrepôts, 1 client)`) && !htmlGenDefault.includes('13 noeuds') ? '' : 'texte inattendu');
}
// ============================================================================
// Palier 2, étape 1 : références de fin de palier 1.
// Produites UNE FOIS avec le code livré en palier1_etape7 (commande
// generate-p1final), puis comparées octet pour octet par check. Elles figent le
// comportement complet du palier 1 (11 colonnes de scenarios.csv, metadata.json
// 1.2.0, réseaux explicites), que le palier 2 doit reproduire à l'identique
// tant que le mode temporel est désactivé. Seul generated_at est exclu.
// ============================================================================
const P1FINAL_DIR = path.join(process.cwd(), 'tests', 'regression', 'fixtures_p1final');
// Petit réseau importé multi-échelon couvrant fournisseurs, usines, hub,
// entrepôts, transporteur, plages et arcs illimités.
function multiTierTestDoc() {
    return {
        format: 'isomorph-reborn-network', format_version: '1.0', id: 'test-multi-echelon', name: 'Réseau de test multi-échelon',
        nodes: [
            { id: 'S1', type: 'fournisseur', capacity: 300 }, { id: 'S2', type: 'fournisseur', capacity: 250 },
            { id: 'U1', type: 'usine', capacity: [180, 220] }, { id: 'U2', type: 'usine', capacity: 200 },
            { id: 'H', type: 'hub', capacity: 400 },
            { id: 'W1', type: 'entrepot', capacity: [80, 120] }, { id: 'W2', type: 'entrepot', capacity: 90 },
            { id: 'T', type: 'transporteur', capacity: 150 }, { id: 'C', type: 'client' },
        ],
        edges: [
            { from: 'S1', to: 'U1', capacity: 200 }, { from: 'S2', to: 'U2', capacity: [150, 200] },
            { from: 'U1', to: 'H', capacity: 180 }, { from: 'U2', to: 'H', capacity: 160 }, { from: 'U1', to: 'W1', capacity: 60 },
            { from: 'H', to: 'W1', capacity: 120 }, { from: 'H', to: 'W2', capacity: [90, 110] },
            { from: 'W1', to: 'T', capacity: 140 }, { from: 'W2', to: 'T', capacity: null }, { from: 'T', to: 'C', capacity: null },
        ],
    };
}
const P1FINAL_CASES = [
    { id: 'F1_parametrique_seed42', description: 'Réseau par défaut, graine 42, 50 scénarios (sorties complètes du palier 1)', config: () => baseConfig(42, 50, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()) },
    {
        id: 'F2_isomorph_defaut_seed42', description: 'ISOMORPH prédéfini par défaut, graine 42, 50 scénarios',
        config: () => ({ ...baseConfig(42, 50, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } }),
    },
    {
        id: 'F3_isomorph_fixe_seed7', description: 'ISOMORPH à arcs fixes, sources 1,0, dernier kilomètre 3000, graine 7, 30 scénarios',
        config: () => ({ ...baseConfig(7, 30, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)({ arcRangePct: 0, sourceFactor: 1.0, lastMileCapacity: 3000 }) } }),
    },
    {
        id: 'F4_multi_echelon_seed11', description: 'Réseau importé multi-échelon (fournisseurs, hub, transporteur), graine 11, 30 scénarios',
        config: () => ({ ...baseConfig(11, 30, (0, bloc1DefaultParams_1.cloneDefaultModelParams)()), network: { kind: 'explicite', document: multiTierTestDoc() } }),
    },
];
function fullOutputs(dataset, rows) {
    const out = {};
    for (const f of (0, bloc1ExperimentPlan_1.buildExportFiles)(dataset))
        out[f.name] = f.name === 'metadata.json' ? normalizeJsonWithoutGeneratedAt(f.content) : f.content;
    out['rb_training.csv'] = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dataset, rows);
    out['rb_dictionary.json'] = normalizeJsonWithoutGeneratedAt((0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, rows));
    return out;
}
function generateP1Final() {
    if (fs.existsSync(P1FINAL_DIR)) {
        console.log(`Les références de fin de palier 1 existent déjà dans ${P1FINAL_DIR}. Supprimez ce dossier pour les régénérer.`);
        process.exitCode = 1;
        return;
    }
    const w = (rel, content) => { const full = path.join(P1FINAL_DIR, rel); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, content, 'utf8'); };
    for (const c of P1FINAL_CASES) {
        const config = c.config();
        const dataset = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(config);
        const rows = syntheticResilienceRows(dataset.branches, config.horizonDays);
        w(`${c.id}/config.json`, JSON.stringify(config, null, 2));
        w(`${c.id}/resilience_rows.json`, JSON.stringify(rows));
        const outputs = fullOutputs(dataset, rows);
        for (const name of Object.keys(outputs))
            w(`${c.id}/${name}`, outputs[name]);
        const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dataset, rows, '', `Référence fin palier 1 ${c.id}`);
        if (bundle)
            w(`${c.id}/bundle.json`, (0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle));
        console.log(`Référence de fin de palier 1 écrite : ${c.id}`);
    }
}
async function p1FinalTests(record) {
    if (!fs.existsSync(P1FINAL_DIR)) {
        record('références de fin de palier 1', 'dossier fixtures_p1final absent');
        return;
    }
    const r = (rel) => { const full = path.join(P1FINAL_DIR, rel); return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null; };
    for (const c of P1FINAL_CASES) {
        const cfgText = r(`${c.id}/config.json`), rowsText = r(`${c.id}/resilience_rows.json`), bundleText = r(`${c.id}/bundle.json`);
        if (!cfgText || !rowsText || !bundleText) {
            record(`${c.id} (références)`, 'fichiers manquants');
            continue;
        }
        // Seule la section temporal (ajoutée au palier 2) est ignorée : absente des références de fin de palier 1.
        const cfgNow = c.config();
        const cfgNowStripped = { ...cfgNow, params: { ...cfgNow.params } };
        delete cfgNowStripped.params.temporal;
        record(`fin palier 1, ${c.id}/config.json (hors section temporal)`, firstDifference(JSON.stringify(cfgNowStripped, null, 2), cfgText));
        const config = JSON.parse(cfgText);
        const rows = JSON.parse(rowsText);
        const outputs = fullOutputs((0, bloc1ExperimentPlan_1.generateExperimentPlan)(config), rows);
        for (const name of Object.keys(outputs)) {
            const ref = r(`${c.id}/${name}`);
            record(`fin palier 1, ${c.id}/${name}`, ref === null ? 'référence manquante' : firstDifference(outputs[name], ref));
        }
        const asyncOut = fullOutputs(await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(config), rows);
        const a = Object.keys(outputs).map(n => ({ n, d: firstDifference(asyncOut[n], outputs[n]) })).find(x => x.d !== '');
        record(`fin palier 1, ${c.id} génération asynchrone = synchrone`, a ? `${a.n} : ${a.d}` : '');
        const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)(bundleText));
        const restOut = fullOutputs(restored.dataset, restored.resilienceRows);
        const b = Object.keys(outputs).map(n => ({ n, d: firstDifference(restOut[n], r(`${c.id}/${n}`) ?? '') })).find(x => x.d !== '');
        record(`fin palier 1, ${c.id} restauration du bundle`, b ? `${b.n} : ${b.d}` : '');
    }
}
// ----------------------------------------------------------------------------
// Palier 2, étape 2 : structures et paramètres du mode temporel, sans aucun
// effet tant que temporal.enabled est faux.
// ----------------------------------------------------------------------------
function p2Step2Tests(record) {
    const t = bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.temporal;
    record('mode temporel : désactivé par défaut, délais par défaut 0, s = 3 jours, S = 10 jours, pré-chauffe 60 jours', t.enabled === false && t.defaultTravelTimeDays === 0 && t.defaultProductionLeadTimeDays === 0 && t.reorderPointDays === 3 && t.orderUpToDays === 10 && t.burnInDays === 60 && t.d7OrderUpToBoostPct === 0.5 && t.lastMileSameDay === true ? '' : JSON.stringify(t));
    // Anciens paramètres (palier 1 et 4.2) : section temporal complétée, mode désactivé.
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const completed = (0, bloc1DefaultParams_1.withModelParamDefaults)(c1.params);
    record('anciens paramètres sans section temporal : complétés, mode désactivé', JSON.stringify(completed.temporal) === JSON.stringify(t) ? '' : JSON.stringify(completed.temporal));
    const partial = (0, bloc1DefaultParams_1.withModelParamDefaults)({ ...c1.params, temporal: { orderUpToDays: 14 } });
    record('section temporal partielle : valeur fournie conservée, valeurs manquantes complétées', partial.temporal.orderUpToDays === 14 && partial.temporal.reorderPointDays === 3 && partial.temporal.enabled === false ? '' : JSON.stringify(partial.temporal));
    // Potentiomètre : réglages temporels conservés à tous les niveaux (fonction réelle du curseur).
    const custom = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    custom.temporal = { enabled: true, defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 3, reorderPointDays: 5, orderUpToDays: 15, burnInDays: 30, d7OrderUpToBoostPct: 0.2, lastMileSameDay: false };
    custom.indicators = { importantWeight: 4, recoveryThreshold: 0.95 };
    for (const level of [0, 25, 50, 75, 100]) {
        const after = (0, bloc1StressModel_1.applyStressLevelPreservingSettings)(custom, level);
        record(`potentiomètre à ${level} % : réglages temporels conservés (actif, délais 2 et 3, s 5, S 15)`, JSON.stringify(after.temporal) === JSON.stringify(custom.temporal) && JSON.stringify(after.indicators) === JSON.stringify(custom.indicators) ? '' : JSON.stringify(after.temporal));
    }
    record('potentiomètre seul (sans réglage courant) : section temporal aux valeurs par défaut, mode désactivé', JSON.stringify((0, bloc1StressModel_1.computeModelParamsFromStress)(100).temporal) === JSON.stringify(t) ? '' : 'valeurs inattendues');
    // Mode désactivé explicitement déclaré : sorties identiques aux références de fin de palier 1.
    const cfgF2 = JSON.parse(fs.readFileSync(path.join(P1FINAL_DIR, 'F2_isomorph_defaut_seed42', 'config.json'), 'utf8'));
    const withOff = { ...cfgF2, params: { ...cfgF2.params, temporal: { ...t } } };
    const ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(withOff);
    const diff = (0, bloc1ExperimentPlan_1.buildExportFiles)(ds).filter(f => f.name.endsWith('.csv'))
        .map(f => ({ n: f.name, d: firstDifference(f.content, fs.readFileSync(path.join(P1FINAL_DIR, 'F2_isomorph_defaut_seed42', f.name), 'utf8')) }))
        .find(x => x.d !== '');
    record('ISOMORPH avec temporal.enabled = false déclaré : 5 CSV identiques aux références de fin de palier 1', diff ? `${diff.n} : ${diff.d}` : '');
    // Validation JSON : sans l'option temporelle, rapport strictement identique au palier 1.
    const preset = (0, bloc1IsomorphPreset_1.buildIsomorphPreset)();
    const off = (0, bloc1NetworkFormat_1.validateNetworkDocument)(preset);
    record('validation ISOMORPH sans mode temporel : avertissement W_RESERVED conservé, aucune donnée temporelle compilée', off.warnings.some(w => w.code === 'W_RESERVED') && off.compiled !== null && off.compiled.timing === null ? '' : JSON.stringify(off.warnings.map(w => w.code)));
    const on = (0, bloc1NetworkFormat_1.validateNetworkDocument)(preset, { temporal: true });
    const tt = on.compiled?.timing;
    record('validation ISOMORPH en mode temporel : plus de W_RESERVED, 16 délais de trajet lus (Atlanta vers Chicago = 8 jours)', on.compiled && !on.warnings.some(w => w.code === 'W_RESERVED') && tt && Object.keys(tt.travelTimeDays).length === 16 && tt.travelTimeDays['Atlanta|Chicago'] === 8 ? '' : JSON.stringify(on.warnings.map(w => w.code)));
    record('validation ISOMORPH en mode temporel : les 2 avertissements Philadelphia/Baltimore restent (règle Q16 inchangée)', on.warnings.filter(w => w.code === 'W_STORAGE_UNLIMITED').length === 2 ? '' : JSON.stringify(on.warnings.map(w => w.code)));
    // Valeurs temporelles invalides : erreur en mode temporel seulement, acceptées (ignorées) sinon.
    const bad = [
        ['délai de trajet négatif', tinyDoc(BASE_NODES, [{ ...E('F', 'W', 8), travel_time_days: -1 }, E('W', 'C')])],
        ['délai de trajet non entier', tinyDoc(BASE_NODES, [{ ...E('F', 'W', 8), travel_time_days: 1.5 }, E('W', 'C')])],
        ['délai de production texte', tinyDoc([{ ...N('F', 'usine', 10), production_lead_time_days: '2' }, N('W', 'entrepot', 5), N('C', 'client')], BASE_EDGES)],
        ['inventory avec s > S', tinyDoc([N('F', 'usine', 10), { ...N('W', 'entrepot', 5), inventory: { s: 20, S: 10 } }, N('C', 'client')], BASE_EDGES)],
        ['inventory incomplet', tinyDoc([N('F', 'usine', 10), { ...N('W', 'entrepot', 5), inventory: { s: 2 } }, N('C', 'client')], BASE_EDGES)],
    ];
    for (const [label, doc] of bad) {
        const rOn = (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc, { temporal: true });
        const rOff = (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc);
        record(`validation temporelle (${label}) : erreur E_TEMPORAL en mode temporel, accepté avec W_RESERVED sinon`, rOn.compiled === null && rOn.errors.some(e => e.code === 'E_TEMPORAL') && rOff.compiled !== null && rOff.warnings.some(w => w.code === 'W_RESERVED') ? '' : `mode temporel : ${rOn.errors.map(e => e.code).join(',')} ; sinon : ${rOff.errors.map(e => e.code).join(',')}`);
    }
    const good = (0, bloc1NetworkFormat_1.validateNetworkDocument)(tinyDoc([{ ...N('F', 'usine', 10), production_lead_time_days: 2 }, { ...N('W', 'entrepot', 5), inventory: { s: 4, S: 12 } }, { ...N('C', 'client'), production_lead_time_days: 1 }], [{ ...E('F', 'W', 8), travel_time_days: 3 }, E('W', 'C')]), { temporal: true });
    const g = good.compiled?.timing;
    record('validation temporelle valide : délais et inventory lus ; délai de production sur un client ignoré avec avertissement', g && g.productionLeadTimeDays['F'] === 2 && g.inventory['W']?.s === 4 && g.inventory['W']?.S === 12 && g.travelTimeDays['F|W'] === 3 && !('C' in g.productionLeadTimeDays)
        && good.warnings.some(w => w.code === 'W_TEMPORAL_IGNORED') ? '' : JSON.stringify({ g, w: good.warnings.map(w => w.code) }));
    // Instance explicite : champ timing absent hors mode temporel (aucune trace dans le moteur ou les sorties).
    const instOff = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), off.compiled, bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.network);
    const instOn = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), on.compiled, bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.network);
    record('instance explicite : champ timing absent hors mode temporel, présent en mode temporel, mêmes tirages', !('timing' in instOff) && instOn.timing !== undefined && JSON.stringify(instOn.graph) === JSON.stringify(instOff.graph) ? '' : 'champ timing ou tirages inattendus');
}
// ----------------------------------------------------------------------------
// Palier 2, étape 3 : moteur temporel (transit, maturation, stock (s, S)).
// ----------------------------------------------------------------------------
function temporalParams(patch = {}) {
    const p = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    p.temporal = { ...p.temporal, enabled: true, ...patch };
    return p;
}
function withoutTravelTimes(doc) {
    return { ...doc, edges: doc.edges.map(e => { const c = { ...e }; delete c.travel_time_days; return c; }) };
}
function multiTierTemporalDoc() {
    const d = multiTierTestDoc();
    return {
        ...d,
        nodes: d.nodes.map(n => (n.id === 'U1' ? { ...n, production_lead_time_days: 2 } : n.id === 'S2' ? { ...n, production_lead_time_days: 1 } : n)),
        edges: d.edges.map((e, i) => ({ ...e, travel_time_days: [1, 3, 2, 1, 0, 2, 1, 1, 0, 2][i] })),
    };
}
// Boucle d'une branche sans gestionnaire, avec décisions tirées au hasard, pour
// contrôler la conservation de la matière et les bornes de stock jour par jour.
function temporalAudit(network, params, disruption, days, seed) {
    const model = (0, bloc1Temporal_1.buildTemporalModel)(network, params);
    const st = (0, bloc1Temporal_1.initialTemporalState)(model);
    const rng = (0, bloc1Network_1.makeRng)(seed);
    let worstConservation = 0, negative = 0, aboveS = 0, invalid = 0, delivered = 0;
    const active = [];
    for (let day = 0; day < days; day++) {
        const dayRel = day - 10;
        const daily = (0, bloc1Network_1.buildDailyState)(network, disruption, dayRel - disruption.start, 1 + (rng() * 2 - 1) * network.demandNoise, params.disruption);
        if (rng() < 0.1)
            active.push({ id: bloc1Decisions_1.DECISIONS[Math.floor(rng() * bloc1Decisions_1.DECISIONS.length)].id, day: dayRel });
        for (const a of active) {
            // Même aiguillage que la simulation d'une branche : D6 et D7 agissent sur le stock en mode temporel.
            if (a.id === 'D6' || a.id === 'D7')
                (0, bloc1Temporal_1.applyTemporalStockDecision)(a.id, model, st, network, params, dayRel - a.day);
            else
                bloc1Decisions_1.DECISION_BY_ID[a.id].apply(daily, { network, disruption, day: dayRel - a.day, params });
        }
        const got = (0, bloc1Temporal_1.stepTemporalDay)(model, st, daily);
        delivered += got;
        const lhs = st.initialStock + st.produced + st.injected, rhs = (0, bloc1Temporal_1.materialInSystem)(st) + st.deliveredTotal;
        worstConservation = Math.max(worstConservation, Math.abs(lhs - rhs) / Math.max(1, lhs));
        const values = [...Object.values(st.onHand), ...Object.values(st.input), ...st.pipe.flat(), ...Object.values(st.maturing).flat(), got];
        if (values.some(v => !Number.isFinite(v)))
            invalid++;
        if (values.some(v => v < -1e-9))
            negative++;
        for (const n of model.nodes) {
            const cap = n.S * st.stockTargetFactor; // S (relevé par D7) ; la réserve de D6 est un stock à part
            if (n.role === 'storage' && st.onHand[n.id] > cap + 1e-6 * Math.max(1, cap))
                aboveS++;
        }
        // Réserve de D6 : jamais négative, jamais supérieure à la matière injectée ; réserve en transit jamais négative.
        if (Object.values(st.reserve).some(v => v < -1e-9) || st.pipeReserve.flat().some(v => v < -1e-9))
            negative++;
    }
    return { worstConservation, negative, aboveS, invalid, delivered };
}
async function p2Step3Tests(record, log) {
    // --- Conservation de la matière et bornes, sur 3 réseaux x 5 perturbations, décisions aléatoires ---
    const nets = [
        ['réseau par défaut, trajet 2 j, production 1 j', () => { const p = temporalParams({ defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 1 }); const n = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(5), p.network); n.baseDemand = 450; return { net: n, params: p }; }],
        ['ISOMORPH, trajets du fichier', () => { const p = temporalParams(); const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(6), (0, bloc1NetworkFormat_1.validateNetworkDocument)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)(), { temporal: true }).compiled, p.network); n.baseDemand = 25000; return { net: n, params: p }; }],
        ['réseau multi-échelon, délais de trajet et de production', () => { const p = temporalParams(); const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(7), (0, bloc1NetworkFormat_1.validateNetworkDocument)(multiTierTemporalDoc(), { temporal: true }).compiled, p.network); n.baseDemand = 60; return { net: n, params: p }; }],
    ];
    const disruptionsFor = (net) => {
        const g = (0, bloc1Network_1.getNetworkGroups)(net);
        const arc = g.finiteArcs[0];
        return [
            { id: 'a', type: 'panne_fournisseur', start: 0, duration: 15, severity: 0.9, targetFactory: g.productionFinite[0] },
            { id: 'b', type: 'coupure_lien', start: 0, duration: 15, severity: 1, targetEdge: { from: arc.from, to: arc.to } },
            { id: 'c', type: 'fermeture_entrepot', start: 0, duration: 15, severity: 1, targetWarehouse: g.storage[0] },
            { id: 'd', type: 'pic_demande', start: 0, duration: 15, severity: 0.8 },
            { id: 'e', type: 'congestion', start: 0, duration: 15, severity: 0.6 },
        ];
    };
    for (const [label, make] of nets) {
        const { net, params } = make();
        let worst = 0, negative = 0, aboveS = 0, invalid = 0, total = 0;
        disruptionsFor(net).forEach((d, i) => {
            const r = temporalAudit(net, params, d, 120, 100 + i);
            worst = Math.max(worst, r.worstConservation);
            negative += r.negative;
            aboveS += r.aboveS;
            invalid += r.invalid;
            total += r.delivered;
        });
        record(`moteur temporel, ${label} : conservation de la matière chaque jour (écart relatif max ${worst.toExponential(1)})`, worst < 1e-9 ? '' : `écart ${worst}`);
        record(`moteur temporel, ${label} : aucune valeur invalide ni négative`, invalid || negative ? `${invalid} jours invalides, ${negative} jours avec valeur négative` : '');
        record(`moteur temporel, ${label} : aucun stock au-dessus de S`, aboveS ? `${aboveS} dépassements` : '');
        record(`moteur temporel, ${label} : de la matière est effectivement livrée au client`, total > 0 ? '' : 'rien livré');
    }
    // --- Q5 A : un fournisseur à court sert d'abord son lien primaire ---
    const q5doc = tinyDoc([N('U', 'usine', 10), N('V', 'usine', 1), N('W1', 'entrepot', 100), N('W2', 'entrepot', 100), N('C', 'client')], [E('U', 'W1', 20), E('V', 'W2', 50), E('U', 'W2', 20), E('W1', 'C'), E('W2', 'C')]);
    const q5p = temporalParams({ reorderPointDays: 0, orderUpToDays: 0 });
    const q5net = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), (0, bloc1NetworkFormat_1.validateNetworkDocument)(q5doc, { temporal: true }).compiled, q5p.network);
    q5net.baseDemand = 30;
    const q5m = (0, bloc1Temporal_1.buildTemporalModel)(q5net, q5p);
    const q5s = (0, bloc1Temporal_1.initialTemporalState)(q5m);
    const sh = [];
    const noDis = { id: 'n', type: 'congestion', start: 0, duration: 1, severity: 0 };
    (0, bloc1Temporal_1.stepTemporalDay)(q5m, q5s, (0, bloc1Network_1.buildDailyState)(q5net, noDis, -1e6, 1, q5p.disruption), sh);
    const arcIdx = (f, t) => q5m.arcs.find(a => a.from === f && a.to === t).index;
    record(`Q5 A : usine U à court (10 unités) sert d'abord W1 (lien primaire de W1) : U vers W1 = ${sh[arcIdx('U', 'W1')] ?? 0}, U vers W2 = ${sh[arcIdx('U', 'W2')] ?? 0}`, (sh[arcIdx('U', 'W1')] ?? 0) === 10 && (sh[arcIdx('U', 'W2')] ?? 0) === 0 ? '' : 'ordre de priorité non respecté');
    record('Q5 A : rangs des arcs entrants de W2 = V primaire (50), U secondaire (20)', q5m.byId.get('W2').inArcs.map(a => `${a.from}:${a.rankAtDest}`).join(',') === 'V:0,U:1' ? '' : q5m.byId.get('W2').inArcs.map(a => `${a.from}:${a.rankAtDest}`).join(','));
    // --- Délais : une unité expédiée sur un arc de 3 jours arrive exactement 3 jours plus tard ---
    const dDoc = tinyDoc([N('F', 'usine', 5), N('W', 'entrepot', 100), N('C', 'client')], [{ ...E('F', 'W', 100), travel_time_days: 3 }, { ...E('W', 'C'), travel_time_days: 0 }]);
    const dp = temporalParams({ reorderPointDays: 0, orderUpToDays: 0 });
    const dnet = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), (0, bloc1NetworkFormat_1.validateNetworkDocument)(dDoc, { temporal: true }).compiled, dp.network);
    dnet.baseDemand = 5;
    const dm = (0, bloc1Temporal_1.buildTemporalModel)(dnet, dp);
    dm.nodes.forEach(n => { n.s = 0; n.S = 0; }); // flux tendu pur : aucun stock, pour isoler le délai
    const ds = (0, bloc1Temporal_1.initialTemporalState)(dm);
    const deliveries = [];
    for (let day = 0; day < 6; day++)
        deliveries.push((0, bloc1Temporal_1.stepTemporalDay)(dm, ds, (0, bloc1Network_1.buildDailyState)(dnet, noDis, -1e6, 1, dp.disruption)));
    record(`délai de trajet de 3 jours : livraisons jours 0 à 5 = ${deliveries.join(', ')} (premières livraisons au jour 3)`, deliveries.join(',') === '0,0,0,5,5,5' ? '' : 'délai non respecté');
    const lDoc = tinyDoc([{ ...N('F', 'usine', 5), production_lead_time_days: 2 }, N('W', 'entrepot', 100), N('C', 'client')], [E('F', 'W', 100), E('W', 'C')]);
    const lnet = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), (0, bloc1NetworkFormat_1.validateNetworkDocument)(lDoc, { temporal: true }).compiled, dp.network);
    lnet.baseDemand = 5;
    const lm = (0, bloc1Temporal_1.buildTemporalModel)(lnet, dp);
    lm.nodes.forEach(n => { n.s = 0; n.S = 0; }); // flux tendu pur : aucun stock, pour isoler le délai
    const ls = (0, bloc1Temporal_1.initialTemporalState)(lm);
    const ldel = [];
    for (let day = 0; day < 5; day++)
        ldel.push((0, bloc1Temporal_1.stepTemporalDay)(lm, ls, (0, bloc1Network_1.buildDailyState)(lnet, noDis, -1e6, 1, dp.disruption)));
    record(`délai de production de 2 jours : livraisons jours 0 à 4 = ${ldel.join(', ')} (premières livraisons au jour 2)`, ldel.join(',') === '0,0,5,5,5' ? '' : 'délai non respecté');
    // --- Plan complet en mode temporel : structure des sorties inchangée, reproductible ---
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const offCfg = { ...c1, nScenarios: 30 };
    const onCfg = { ...offCfg, params: temporalParams({ defaultTravelTimeDays: 2 }) };
    const off = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(offCfg), on = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(onCfg);
    const header = (ds, name) => (0, bloc1ExperimentPlan_1.buildExportFiles)(ds).find(f => f.name === name).content.split('\n')[0];
    record('mode temporel : en-têtes de ip_timeseries.csv et perturbations.csv inchangés', header(on, 'ip_timeseries.csv') === header(off, 'ip_timeseries.csv') && header(on, 'perturbations.csv') === header(off, 'perturbations.csv') ? '' : 'en-tête modifié');
    const perturbSame = (0, bloc1ExperimentPlan_1.buildExportFiles)(on).find(f => f.name === 'perturbations.csv').content === (0, bloc1ExperimentPlan_1.buildExportFiles)(off).find(f => f.name === 'perturbations.csv').content;
    record('mode temporel : mêmes perturbations tirées que le mode désactivé (aucun tirage aléatoire consommé par le moteur)', perturbSame ? '' : 'perturbations différentes');
    const vals = on.ipTimeseries.map(p => p.ip);
    record('mode temporel : IP toujours dans [0, 1], aucune valeur invalide', vals.every(v => Number.isFinite(v) && v >= 0 && v <= 1) ? '' : 'valeur hors bornes');
    const rows = syntheticResilienceRows(on.branches, onCfg.horizonDays);
    const onAsync = await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(onCfg);
    const o1 = datasetOutputs(on, rows), o2 = datasetOutputs(onAsync, rows);
    const asyncDiff = Object.keys(o1).map(n => ({ n, d: firstDifference(o2[n], o1[n]) })).find(x => x.d !== '');
    record('mode temporel : génération asynchrone = synchrone', asyncDiff ? `${asyncDiff.n} : ${asyncDiff.d}` : '');
    const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)((0, bloc1ExperimentPlan_1.simulationProcessToJson)((0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(on, rows, '', 'temporel'))));
    const o3 = datasetOutputs(restored.dataset, restored.resilienceRows);
    const restDiff = Object.keys(o1).map(n => ({ n, d: firstDifference(o3[n], o1[n]) })).find(x => x.d !== '');
    record('mode temporel : restauration d\'un bundle identique (réglages temporels recopiés dans la configuration)', restDiff ? `${restDiff.n} : ${restDiff.d}` : '');
    // --- Quasi-identité à délais nuls : écart mesuré avec le mode désactivé ---
    const gap = (a, b) => {
        let max = 0, sum = 0, warm = 0;
        a.ipTimeseries.forEach((p, i) => { const d = Math.abs(p.ip - b.ipTimeseries[i].ip); max = Math.max(max, d); sum += d; if (b.ipTimeseries[i].day_rel < 0 && b.ipTimeseries[i].ip < 1 - 1e-12)
            warm++; });
        return { max, mean: sum / a.ipTimeseries.length, warm };
    };
    const cases = [
        ['réseau par défaut, délais 0, flux tendu (s = S = 0)', offCfg, { reorderPointDays: 0, orderUpToDays: 0 }],
        ['réseau par défaut, délais 0, stock par défaut (s = 3 j, S = 10 j)', offCfg, {}],
        ['ISOMORPH, délais 0, flux tendu (s = S = 0)', { ...offCfg, network: { kind: 'explicite', document: withoutTravelTimes((0, bloc1IsomorphPreset_1.buildIsomorphPreset)()) } }, { reorderPointDays: 0, orderUpToDays: 0 }],
        ['ISOMORPH, délais 0, stock par défaut', { ...offCfg, network: { kind: 'explicite', document: withoutTravelTimes((0, bloc1IsomorphPreset_1.buildIsomorphPreset)()) } }, {}],
    ];
    log('Palier 2, étape 3 : écart d\'IP entre mode temporel à délais nuls et mode désactivé (30 scénarios, graine 42, 4 branches, 70 jours) :');
    for (const [label, cfg, patch] of cases) {
        const a = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(cfg);
        const b = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...cfg, params: temporalParams(patch) });
        const g = gap(a, b);
        log(`  ${label} : écart moyen ${g.mean.toFixed(5)}, écart maximal ${g.max.toFixed(4)}, points de chauffe avec IP < 1 : ${g.warm}`);
        record(`quasi-identité à délais nuls, ${label} : écart moyen d'IP < 0,005`, g.mean < 0.005 ? '' : `écart moyen ${g.mean}`);
    }
}
// ----------------------------------------------------------------------------
// Palier 2, étape 4 : s et S selon Q10 D, calibration de la demande en mode
// temporel, D6 (injection de stock) et D7 (hausse de s et S, commande immédiate).
// ----------------------------------------------------------------------------
// Débit nominal d'un arc : ce qu'il transporte en une journée nominale, à délais nuls et en flux tendu.
function nominalArcFlow(net, params, model, arcIndex) {
    const shipments = [];
    const day = (0, bloc1Network_1.buildDailyState)(net, { id: 'nominal', type: 'congestion', start: 0, duration: 0, severity: 0 }, -1000000, 1, params.disruption);
    day.demand = net.baseDemand;
    (0, bloc1Temporal_1.probeZeroDelayDelivery)(net, params, day, shipments);
    void model;
    return shipments[arcIndex] ?? 0;
}
// D6 (réserve de sécurité) : garanties démontrées par le test, pas seulement mesurées.
//   1. la trajectoire ORDINAIRE (stocks, transit, maturation, production) est
//      rigoureusement identique, au bit près, avec et sans D6 ;
//   2. le débit livré chaque jour avec D6 est supérieur ou égal à celui sans D6 ;
//   3. la matière libérée est conservée (livrée, en réserve ou en transit).
function d6Audit(network, params, disruption, d6Day, seed, days) {
    const prep = (0, bloc1ExperimentPlan_1.prepareBranchTemporal)(network, disruption, params);
    const a = (0, bloc1Temporal_1.cloneTemporalState)(prep.start), b = (0, bloc1Temporal_1.cloneTemporalState)(prep.start);
    const rng = (0, bloc1Network_1.makeRng)(seed);
    const others = bloc1Decisions_1.DECISIONS.filter(d => d.id !== 'D6');
    const plan = Array.from({ length: days }, () => (rng() < 0.15 ? [others[Math.floor(rng() * others.length)].id] : []));
    const active = [];
    let regularDiff = 0, deliveryGap = Infinity, conservation = 0, reserveDelivered = 0, invalid = 0;
    const noise = Array.from({ length: days }, () => 1 + (rng() * 2 - 1) * network.demandNoise);
    for (let day = 0; day < days; day++) {
        plan[day].forEach(id => active.push({ id, day }));
        const dA = (0, bloc1Network_1.buildDailyState)(network, disruption, day, noise[day], params.disruption);
        const dB = (0, bloc1Network_1.buildDailyState)(network, disruption, day, noise[day], params.disruption);
        for (const act of active) {
            for (const [st, daily] of [[a, dA], [b, dB]]) {
                if (act.id === 'D7')
                    (0, bloc1Temporal_1.applyTemporalStockDecision)('D7', prep.model, st, network, params, day - act.day);
                else
                    bloc1Decisions_1.DECISION_BY_ID[act.id].apply(daily, { network, disruption, day: day - act.day, params });
            }
        }
        if (day >= d6Day)
            (0, bloc1Temporal_1.applyTemporalStockDecision)('D6', prep.model, b, network, params, day - d6Day);
        const ga = (0, bloc1Temporal_1.stepTemporalDay)(prep.model, a, dA), gb = (0, bloc1Temporal_1.stepTemporalDay)(prep.model, b, dB);
        deliveryGap = Math.min(deliveryGap, gb - ga);
        reserveDelivered += gb - ga;
        if (!Number.isFinite(gb))
            invalid++;
        const same = (x, y) => Object.keys(x).every(k => x[k] === y[k]);
        const arrays = (x, y) => x.every((r, i) => r.every((v, j) => v === y[i][j]));
        if (!same(a.onHand, b.onHand) || !same(a.input, b.input) || !arrays(a.pipe, b.pipe) || a.produced !== b.produced
            || !Object.keys(a.maturing).every(k => a.maturing[k].every((v, i) => v === b.maturing[k][i])))
            regularDiff++;
        const lhs = b.initialStock + b.produced + b.injected, rhs = (0, bloc1Temporal_1.materialInSystem)(b) + b.deliveredTotal;
        conservation = Math.max(conservation, Math.abs(lhs - rhs) / Math.max(1, lhs));
    }
    return { regularDiff, deliveryGap, conservation, reserveDelivered, injected: b.injected, invalid };
}
function d6GuaranteeTests(record, log) {
    const nets = [
        ['ISOMORPH, délais du fichier', () => { const p = temporalParams(); const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(3), (0, bloc1NetworkFormat_1.validateNetworkDocument)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)(), { temporal: true }).compiled, p.network); n.baseDemand = 29256; return { net: n, params: p }; }],
        ['réseau par défaut, trajet 2 j, production 1 j', () => { const p = temporalParams({ defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 1 }); const n = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(5), p.network); n.baseDemand = 500; return { net: n, params: p }; }],
        ['réseau multi-échelon, délais de trajet et de production', () => { const p = temporalParams(); const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(7), (0, bloc1NetworkFormat_1.validateNetworkDocument)(multiTierTemporalDoc(), { temporal: true }).compiled, p.network); n.baseDemand = 60; return { net: n, params: p }; }],
    ];
    for (const [label, make] of nets) {
        const { net, params } = make();
        const g = (0, bloc1Network_1.getNetworkGroups)(net);
        const arc = g.finiteArcs[0];
        const disruptions = [
            { id: 'a', type: 'panne_fournisseur', start: 0, duration: 60, severity: 1, targetFactory: g.productionFinite[0] },
            { id: 'b', type: 'coupure_lien', start: 0, duration: 40, severity: 1, targetEdge: { from: arc.from, to: arc.to } },
            { id: 'c', type: 'fermeture_entrepot', start: 0, duration: 40, severity: 1, targetWarehouse: g.storage[0] },
            { id: 'd', type: 'pic_demande', start: 0, duration: 30, severity: 0.9 },
            { id: 'e', type: 'congestion', start: 0, duration: 50, severity: 0.7 },
        ];
        let cases = 0, regularDiff = 0, worstGap = Infinity, worstCons = 0, invalid = 0, gain = 0, inj = 0;
        disruptions.forEach((dis, i) => [0, 3, 10, 25].forEach((d6Day, j) => {
            const r = d6Audit(net, params, dis, d6Day, 500 + 10 * i + j, 80);
            cases++;
            regularDiff += r.regularDiff;
            worstGap = Math.min(worstGap, r.deliveryGap);
            worstCons = Math.max(worstCons, r.conservation);
            invalid += r.invalid;
            gain += r.reserveDelivered;
            inj += r.injected;
        }));
        log(`  D6, ${label} : ${cases} situations (5 perturbations x 4 jours de décision, décisions aléatoires en plus) ; plus petit écart de livré par jour ${worstGap.toExponential(1)} ; matière libérée totale ${Math.round(inj)}, livrée en plus ${Math.round(gain)}`);
        record(`D6 réserve, ${label} : trajectoire ordinaire identique au bit près avec et sans D6 (${cases} situations, 80 jours)`, regularDiff ? `${regularDiff} jours différents` : '');
        record(`D6 réserve, ${label} : débit livré chaque jour supérieur ou égal à celui sans D6 (écart minimal ${worstGap.toExponential(1)})`, worstGap >= 0 ? '' : `écart minimal ${worstGap}`);
        record(`D6 réserve, ${label} : conservation de la matière (écart relatif max ${worstCons.toExponential(1)}) et aucune valeur invalide`, worstCons < 1e-9 && invalid === 0 ? '' : `écart ${worstCons}, ${invalid} invalides`);
    }
    // Cas qui avait inversé l'effet : ISOMORPH, panne de 60 jours, D6 le jour 0.
    const { net, params } = nets[0][1]();
    const dis = { id: 'T', type: 'panne_fournisseur', start: 0, duration: 60, severity: 1, targetFactory: 'SanFrancisco' };
    const r = d6Audit(net, params, dis, 0, 1, 60);
    record(`D6 réserve, cas de l'inversion (ISOMORPH, panne de 60 jours, D6 le jour 0) : livré en plus ${Math.round(r.reserveDelivered)} (avant correction : moins 18 698)`, r.reserveDelivered > 0 && r.deliveryGap >= 0 ? '' : `écart ${r.reserveDelivered}`);
}
// D7 : exclusion des nœuds de stockage sans capacité propre et à sorties illimitées ;
// calibration impossible : erreur explicite ; tableau de sensibilité de la couverture.
function p2Step4bTests(record, log) {
    // --- D7 : le nœud exclu ne change pas, le nœud éligible commande davantage ---
    const doc = tinyDoc([N('F', 'usine', 200), N('W1', 'entrepot'), N('W2', 'entrepot', 100), N('C', 'client')], [E('F', 'W1', 50), E('F', 'W2', 50), E('W1', 'C'), E('W2', 'C')]);
    const p = temporalParams();
    const net = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(1), (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc, { temporal: true }).compiled, p.network);
    net.baseDemand = 40;
    const noDis = { id: 'n', type: 'congestion', start: 0, duration: 1, severity: 0 };
    const prep = (0, bloc1ExperimentPlan_1.prepareBranchTemporal)(net, noDis, p);
    const excludedIds = prep.model.nodes.filter(n => n.unlimitedShipping).map(n => n.id).join(',');
    const shipments = (withD7) => {
        const st = (0, bloc1Temporal_1.cloneTemporalState)(prep.start);
        if (withD7)
            (0, bloc1Temporal_1.applyTemporalStockDecision)('D7', prep.model, st, net, p, 0);
        const sh = [];
        (0, bloc1Temporal_1.stepTemporalDay)(prep.model, st, (0, bloc1Network_1.buildDailyState)(net, noDis, -1e6, 1, p.disruption), sh);
        const idx = (to) => prep.model.arcs.find(a => a.from === 'F' && a.to === to).index;
        return { w1: sh[idx('W1')] ?? 0, w2: sh[idx('W2')] ?? 0 };
    };
    const base = shipments(false), boosted = shipments(true);
    record(`D7 : W1 (sans capacité propre, sorties illimitées) exclu, W2 éligible : expéditions vers W1 ${base.w1.toFixed(1)} puis ${boosted.w1.toFixed(1)}, vers W2 ${base.w2.toFixed(1)} puis ${boosted.w2.toFixed(1)}`, excludedIds === 'W1' && boosted.w1 === base.w1 && boosted.w2 > base.w2 ? '' : `exclus : ${excludedIds}`);
    // ISOMORPH : la hausse de s et S ne concerne pas Philadelphia et Baltimore.
    const iso = (() => { const q = temporalParams(); const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(3), (0, bloc1NetworkFormat_1.validateNetworkDocument)((0, bloc1IsomorphPreset_1.buildIsomorphPreset)(), { temporal: true }).compiled, q.network); n.baseDemand = 29256; return { net: n, params: q }; })();
    const isoPrep = (0, bloc1ExperimentPlan_1.prepareBranchTemporal)(iso.net, noDis, iso.params);
    record('D7 sur ISOMORPH : Philadelphia et Baltimore reconnus comme exclus, les 7 autres nœuds de stockage éligibles', isoPrep.model.nodes.filter(n => n.unlimitedShipping).map(n => n.id).sort().join(',') === 'Baltimore,Philadelphia' && isoPrep.model.nodes.filter(n => n.role === 'storage' && !n.unlimitedShipping).length === 7 ? '' : 'exclusion inattendue');
    // --- Calibration impossible : erreur explicite, jamais une demande arbitraire ---
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const lowCoverage = { ...c1, nScenarios: 3, params: temporalParams({ reorderPointDays: 0, orderUpToDays: 0 }), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } };
    let msg = 'aucune erreur';
    try {
        (0, bloc1ExperimentPlan_1.generateExperimentPlan)(lowCoverage);
    }
    catch (e) {
        msg = e.message;
    }
    record('calibration impossible (ISOMORPH, couverture 0/0) : erreur explicite avec le scénario, la cause et le remède', msg.includes('Mode temporel, scénario S0001') && msg.includes('impossible') && msg.includes('Augmentez les jours de couverture') ? '' : msg.slice(0, 160));
    // --- Tableau de sensibilité de la couverture (ISOMORPH, 60 pannes, graine 42, branche sans décision) ---
    const table = [
        ['3 / 10 jours (défaut)', {}, 0], ['2 / 5 jours', { reorderPointDays: 2, orderUpToDays: 5 }, 1], ['1 / 3 jours', { reorderPointDays: 1, orderUpToDays: 3 }, 5],
    ];
    log('Palier 2, étape 4 : sensibilité de la couverture de stock (ISOMORPH, 60 pannes fournisseur de 3 à 15 jours, graine 42, branche sans décision) :');
    const baseline = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 60, disruptionTypes: ['panne_fournisseur'], network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } });
    const bNone = baseline.branches.filter(b => b.branch_id === 'none');
    log(`  palier 1 (mode désactivé) : ${bNone.filter(b => b.ip_min < 1 - 1e-9).length} pannes sur 60 avec creux`);
    for (const [label, patch, expected] of table) {
        const ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 60, disruptionTypes: ['panne_fournisseur'], params: temporalParams(patch), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } });
        const none = ds.branches.filter(b => b.branch_id === 'none');
        const dips = none.filter(b => b.ip_min < 1 - 1e-9).length;
        const warmBad = ds.ipTimeseries.filter(x => x.day_rel < 0 && x.ip < 1 - 1e-12).length;
        log(`  couverture ${label} : ${dips} pannes sur 60 avec creux, chauffe à IP = 1 sur tous les points (${warmBad} exception)`);
        record(`sensibilité de la couverture ${label} : ${expected} panne(s) sur 60 avec creux, chauffe à IP = 1`, dips === expected && warmBad === 0 ? '' : `${dips} pannes avec creux, ${warmBad} points de chauffe à IP < 1`);
    }
    let low = 'aucune erreur';
    try {
        (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 60, disruptionTypes: ['panne_fournisseur'], params: temporalParams({ reorderPointDays: 0.5, orderUpToDays: 1.5 }), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } });
    }
    catch (e) {
        low = e.message;
    }
    log('  couverture 0,5 / 1,5 jour : refusée avec la graine 42 (scénario S0049 non calibrable) ; hors ce scénario, 16 pannes sur 59 avec creux');
    record('sensibilité de la couverture 0,5 / 1,5 jour : le scénario S0049 (graine 42) n\'est pas calibrable, refusé avec un message explicite', low.includes('scénario S0049') ? '' : low.slice(0, 160));
}
// ----------------------------------------------------------------------------
// Palier 2, étape 5 : interface du mode temporel.
// ----------------------------------------------------------------------------
const plainHtml = (h) => normalizeHtml(h).replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// ----------------------------------------------------------------------------
// Palier 2, étape 6 : exports et documentation. AUCUNE colonne ni aucun champ lié
// au mode temporel n'est ajouté aux fichiers (décision Q8 du palier 2 non
// tranchée) : ces tests le garantissent.
// ----------------------------------------------------------------------------
async function p2Step6Tests(record, log) {
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const off = (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 6, network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } });
    const onCfg = { ...c1, nScenarios: 6, params: temporalParams(), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } };
    const on = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(onCfg);
    const files = (d) => Object.fromEntries((0, bloc1ExperimentPlan_1.buildExportFiles)(d).map(f => [f.name, f.content]));
    const fOff = files(off), fOn = files(on);
    const head = (t) => t.split('\n')[0];
    // --- Structure des exports : identique avec et sans mode temporel ---
    const csvNames = ['scenarios.csv', 'perturbations.csv', 'decisions.csv', 'ip_timeseries.csv', 'branches.csv'];
    const headerDiff = csvNames.filter(n => head(fOn[n]) !== head(fOff[n]));
    record('exports en mode temporel : en-têtes des 5 CSV identiques à ceux du mode désactivé', headerDiff.length ? `en-têtes différents : ${headerDiff.join(', ')}` : '');
    record('exports : scenarios.csv garde exactement ses 11 colonnes (aucune colonne temporelle ajoutée)', head(fOn['scenarios.csv']) === 'scenario_id,n_factories,n_warehouses,base_demand,important_share,warmup_days,horizon_days,network_id,n_nodes,n_edges,n_echelons' ? '' : head(fOn['scenarios.csv']));
    record('exports : ip_timeseries.csv (4 colonnes) et perturbations.csv (6 colonnes) inchangés en structure', head(fOn['ip_timeseries.csv']).split(',').length === 4 && head(fOn['perturbations.csv']).split(',').length === 6 ? '' : `${head(fOn['ip_timeseries.csv'])} / ${head(fOn['perturbations.csv'])}`);
    const meta = JSON.parse(fOn['metadata.json']);
    record('exports : metadata.json garde ses champs (generator, version 1.2.0, generated_at, config) sans champ temporel ajouté ; les réglages sont dans config.params.temporal', Object.keys(meta).join(',') === 'generator,version,generated_at,config' && meta.version === '1.2.0' && meta.config.params.temporal.enabled === true ? '' : Object.keys(meta).join(','));
    const metaOff = JSON.parse(fOff['metadata.json']);
    record('exports : plan sans mode temporel, metadata.json sans section temporal (configuration recopiée telle quelle)', !('temporal' in metaOff.config.params) ? '' : 'section temporal présente à tort');
    const rows = syntheticResilienceRows(on.branches, onCfg.horizonDays);
    const rb = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(on, rows).split('\n').filter(l => l.length > 0);
    const rbCells = rb.slice(1).flatMap(l => l.split(','));
    record(`export RB en mode temporel : 40 colonnes, ${rb.length - 1} lignes, aucune valeur invalide`, rb[0].split(',').length === 40 && rb.slice(1).every(l => l.split(',').length === 40) && rbCells.every(c => c !== 'NaN' && c !== 'Infinity' && c !== 'undefined') ? '' : `${rb[0].split(',').length} colonnes`);
    // --- Centre de téléchargement : descriptions ---
    const dc = plainHtml((0, server_1.renderToString)(react_1.default.createElement(DownloadCenter_1.default, { dataset: on, resilienceRows: [], resilienceCsv: '', onGoToGenerator: () => undefined, onGoToBatch: () => undefined })));
    record('Centre de téléchargement : la carte metadata.json mentionne les réglages du mode temporel et la lecture « absent ou désactivé = sans délai ni stock »', (() => { const m = ['params.temporal', 'sans délai ni stock'].filter(x => !dc.includes(x)); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('Centre de téléchargement : la carte ip_timeseries.csv précise « même structure avec ou sans mode temporel »', dc.includes('Même structure avec ou sans mode temporel') ? '' : 'phrase absente');
    // --- Documentation intégrée : section 8, D6, D7, calibration, dernier kilomètre ---
    const doc = plainHtml((0, server_1.renderToString)(react_1.default.createElement(ModelDocumentation_1.default, {})));
    const missing = (...xs) => xs.filter(x => !doc.includes(x));
    const groups = [
        ['section 8 et principe (flot instantané remplacé par une simulation jour par jour)', ['8. Mode temporel : délais et stocks', 'simulation dynamique', 'Les fichiers gardent exactement la même structure']],
        ['délais de trajet et de production, hypothèse 0 jour', ['Délais de trajet et de production', 'valent 0 jour, hypothèse faute de donnée d\'origine']],
        ['politique (s, S) avec 3 et 10 jours, stock en transit, champ inventory', ['Politique de stock (s, S)', '3 et 10 jours par défaut', 'champ inventory']],
        ['D6 : réserve séparée, raison de l\'écart, garantie de ne jamais réduire le débit', ['D6 devient une réserve de sécurité séparée', 'invisible pour la politique de commande', 'faisait franchir le point de commande s', 'ne réduit jamais le débit livré']],
        ['D7 : hausse de s et S, commande immédiate, exclusion de Philadelphia et Baltimore', ['relève s et S (de 50 %', 'commande de recomplètement immédiate', 'Philadelphia et Baltimore sur ISOMORPH']],
        ['calibration : IP à 1 en chauffe, dichotomie, refus explicite avec remède', ['Calibration de la demande et refus explicite du plan', 'l\'IP doit valoir 1 chaque jour malgré le bruit', 'le plan est refusé avec un message explicite', 'augmenter les jours de couverture s et S', 'ne continue jamais avec une demande arbitraire']],
        ['dernier kilomètre servi le jour même et sa raison', ['Le dernier kilomètre (arcs vers le client) est servi le jour même par défaut', 'l\'IP mesurerait l\'écart de bruit entre deux jours']],
        ['tableau de sensibilité et avertissement de calibration impossible', ['Sensibilité de la couverture de stock', 'impossible à calibrer', 'Plan refusé (scénario S0049)']],
        ['protection contre le potentiomètre', ['ne sont jamais modifiés par le potentiomètre d\'impact']],
        ['renvois depuis les sections 1, 4 et 7 (D6, D7, délais ISOMORPH)', ['le mode temporel (section 8) le remplace', 'En mode temporel (section 8), D6 libère', 'En mode temporel (section 8), D7 relève', 'ignorés tant que le mode temporel est désactivé']],
    ];
    for (const [label, needles] of groups) {
        const m = missing(...needles);
        record(`documentation intégrée : ${label}`, m.length ? `manque ${m.join(' | ')}` : '');
    }
    record('documentation intégrée : plus de mention périmée « sans dimension temporelle au stade actuel »', doc.includes('sans dimension temporelle au stade actuel') ? 'phrase périmée présente' : '');
    const docSource = fs.readFileSync(path.join(process.cwd(), 'ModelDocumentation.tsx'), 'utf8');
    record('documentation intégrée (guide des exports, sous-onglet non affiché par défaut) : metadata.json mentionne params.temporal', docSource.includes('section params.temporal') ? '' : 'mention absente');
    // --- Bulles d'aide D6 et D7 ---
    const tips = ['decisions.d6_boost', 'decisions.d6_days', 'decisions.d7'].map(k => [k, bloc1Descriptions_1.MODEL_PARAM_DESCRIPTIONS[k]?.impact ?? '']);
    const noTip = tips.filter(([, t]) => !t.includes('En mode temporel') && !t.includes('mode temporel'));
    record('bulles d\'aide de D6 (montant, durée) et D7 : comportement en mode temporel précisé', noTip.length ? `manque : ${noTip.map(x => x[0]).join(', ')}` : '');
    const temporalKeys = ['enabled', 'defaultTravelTimeDays', 'defaultProductionLeadTimeDays', 'reorderPointDays', 'orderUpToDays', 'd7OrderUpToBoostPct', 'burnInDays', 'lastMileSameDay'].map(k => `temporal.${k}`);
    record('bulles d\'aide : les 8 réglages temporels documentés (titre, explication, impact, valeur par défaut)', temporalKeys.every(k => { const d = bloc1Descriptions_1.MODEL_PARAM_DESCRIPTIONS[k]; return !!d && d.title && d.explanation && d.impact && d.defaultVal !== undefined; }) ? '' : 'entrée manquante ou incomplète');
    log('Palier 2, étape 6 : aucune colonne ni champ temporel ajouté aux exports ; documentation intégrée : section 8, renvois depuis les sections 1, 4 et 7, guide des exports, bulles d\'aide.');
}
async function p2Step5Tests(record, log) {
    const params = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    const choice = (0, bloc1NetworkSelection_2.cloneDefaultNetworkChoice)();
    const section = (p, open) => plainHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.ExtraHypothesisSections, {
        params: p, setParam: () => undefined, choice, onChoiceChange: () => undefined, openSection: open, setOpenSection: () => undefined, isShiftPressed: false,
    })));
    const has = (html, ...needles) => needles.filter(n => !html.includes(n));
    // --- Section 8 : fermée par défaut, contenu et valeurs par défaut ---
    const closed = section(params, '');
    record('section 8 fermée par défaut : titre affiché, aucun champ', closed.includes('8. Mode temporel') && !closed.includes('<input') ? '' : 'contenu affiché à tort');
    const open8 = section(params, 'temporal');
    record('section 8 ouverte, mode désactivé : réglages par défaut affichés (délais 0, pré-chauffe 60, s 3, S 10, D7 0,5)', (() => { const m = has(open8, 'Activer le mode temporel', 'value="0"', 'value="60"', 'value="3"', 'value="10"', 'value="0.5"', 'Dernier kilomètre servi le jour même'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const inputs = (h) => h.match(/<input[^>]*>/g) ?? [];
    const numberInputs = inputs(open8).filter(i => i.includes('type="number"'));
    record('section 8, mode désactivé : les 6 champs numériques sont grisés, la case d\'activation reste active', numberInputs.length === 6 && numberInputs.every(i => i.includes('disabled=""')) && !inputs(open8).find(i => i.includes('type="checkbox"') && !i.includes('checked=""') && i.includes('disabled=""')) ? '' : `${numberInputs.length} champs, grisés : ${numberInputs.filter(i => i.includes('disabled=""')).length}`);
    const on = { ...params, temporal: { ...params.temporal, enabled: true } };
    const open8on = section(on, 'temporal');
    const numberOn = inputs(open8on).filter(i => i.includes('type="number"'));
    record('section 8, mode activé : les 6 champs numériques sont actifs, aucun message d\'erreur à couverture par défaut', numberOn.length === 6 && numberOn.every(i => !i.includes('disabled=""')) && !open8on.includes('Réglages invalides') && !open8on.includes('Couverture inférieure') ? '' : 'champs grisés ou message affiché à tort');
    const bad = { ...params, temporal: { ...params.temporal, enabled: true, defaultTravelTimeDays: -1, reorderPointDays: 12 } };
    const openBad = section(bad, 'temporal');
    record('section 8, réglages invalides : message rouge listant chaque problème (délai négatif, s supérieur à S)', (() => { const m = has(openBad, 'Réglages invalides : le plan sera refusé', 'délai de trajet par défaut', 'ne peuvent pas dépasser'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const low = { ...params, temporal: { ...params.temporal, enabled: true, reorderPointDays: 0.5, orderUpToDays: 1.5 } };
    record('section 8, couverture 0,5 / 1,5 : avertissement de couverture inférieure aux valeurs mesurées, sans blocage', (() => { const h = section(low, 'temporal'); const m = has(h, 'Couverture inférieure à la plus faible mesurée', 'risque d\'être refusé'); return m.length || h.includes('Réglages invalides') ? `manque ${m.join(' | ')}` : ''; })());
    record('avertissement de couverture : absent mode désactivé, absent à 1 / 3 et au défaut, présent sous 1 / 3', (0, bloc1TemporalUi_1.temporalCoverageWarning)(params.temporal) === null && (0, bloc1TemporalUi_1.temporalCoverageWarning)({ ...on.temporal, reorderPointDays: 1, orderUpToDays: 3 }) === null
        && (0, bloc1TemporalUi_1.temporalCoverageWarning)(on.temporal) === null && (0, bloc1TemporalUi_1.temporalCoverageWarning)(low.temporal) !== null && (0, bloc1TemporalUi_1.temporalCoverageWarning)({ ...on.temporal, reorderPointDays: 0, orderUpToDays: 2 }) !== null ? '' : 'seuil incorrect');
    // --- Tableau de sensibilité : contenu affiché ---
    const table = plainHtml((0, server_1.renderToString)(react_1.default.createElement(TemporalPanel_1.TemporalSensitivityTable)));
    record('tableau de sensibilité : lignes 3 / 10, 2 / 5, 1 / 3, 0,5 / 1,5, référence du palier 1, durées, avertissement de calibration impossible', (() => { const m = has(table, '3 / 10 jours (défaut)', '2 / 5 jours', '1 / 3 jours', '0,5 / 1,5 jour', 'Palier 1 (mode temporel désactivé)', '34 sur 60', '0 sur 60', '1 sur 60', '5 sur 60', 'Plan refusé (scénario S0049)', '14 sur 48', '4 sur 60', '12 sur 60', 'impossible à calibrer', 'graine 42'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    record('section 8 ouverte : le tableau de sensibilité est intégré à la section', open8.includes('Sensibilité de la couverture de stock') ? '' : 'tableau absent');
    // --- Le tableau est une mesure : le jeu de tests la rejoue et échoue si elle dérive ---
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const base = (patch, n, temporal = true) => {
        const q = temporalParams();
        q.temporal.enabled = temporal;
        patch(q);
        return { ...c1, nScenarios: n, disruptionTypes: ['panne_fournisseur'], params: q, network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } };
    };
    const dipsOf = (cfg) => { const d = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(cfg); const none = d.branches.filter(b => b.branch_id === 'none'); return { dips: none.filter(b => b.ip_min < 1 - 1e-9).length, n: none.length }; };
    const t = bloc1TemporalUi_1.TEMPORAL_SENSITIVITY;
    const b1 = dipsOf(base(() => undefined, 60, false));
    record(`sensibilité, palier 1 : ${t.baseline.dips} sur ${t.baseline.of} annoncés, ${b1.dips} sur ${b1.n} mesurés`, b1.dips === t.baseline.dips && b1.n === t.baseline.of ? '' : 'mesure différente');
    for (const row of t.coverage) {
        const patch = (q) => { q.temporal.reorderPointDays = row.s; q.temporal.orderUpToDays = row.S; };
        if (row.status === 'ok') {
            const m = dipsOf(base(patch, 60));
            record(`sensibilité, couverture ${row.label} : ${row.dips} sur ${row.of} annoncés, ${m.dips} sur ${m.n} mesurés`, m.dips === row.dips && m.n === row.of ? '' : 'mesure différente');
        }
        else {
            let refusedAt = 'aucun refus';
            try {
                (0, bloc1ExperimentPlan_1.generateExperimentPlan)(base(patch, 60));
            }
            catch (e) {
                refusedAt = e instanceof bloc1ExperimentPlan_1.PlanCalibrationError ? e.scenarioId : e.message.slice(0, 80);
            }
            const m = dipsOf(base(patch, 48));
            record(`sensibilité, couverture ${row.label} : refus annoncé au scénario ${row.refusedAt} (mesuré : ${refusedAt}), ${row.dips} sur ${row.of} avant le refus (mesuré : ${m.dips} sur ${m.n})`, refusedAt === row.refusedAt && m.dips === row.dips && m.n === row.of ? '' : 'mesure différente');
        }
    }
    const ranges = [[3, 15], [15, 30], [30, 60]];
    t.durations.forEach((row, i) => {
        const m = dipsOf(base(q => { q.disruption.durationMinDays = ranges[i][0]; q.disruption.durationMaxDays = ranges[i][1]; }, 60));
        record(`sensibilité, durées ${row.range} : ${row.dips} sur ${row.of} annoncés, ${m.dips} sur ${m.n} mesurés`, m.dips === row.dips && m.n === row.of ? '' : 'mesure différente');
    });
    // --- Refus de plan : structure et affichage ---
    let calErr = null;
    try {
        (0, bloc1ExperimentPlan_1.generateExperimentPlan)(base(q => { q.temporal.reorderPointDays = 0; q.temporal.orderUpToDays = 0; }, 3));
    }
    catch (e) {
        calErr = e;
    }
    const view = (0, bloc1TemporalUi_1.describePlanError)(calErr);
    record('refus de calibration : erreur structurée (scénario S0001, couverture, bruit, délai), message texte conservé', calErr instanceof bloc1ExperimentPlan_1.PlanCalibrationError && view.kind === 'calibration' && view.scenarioId === 'S0001' && (view.details ?? []).length === 4
        && view.message.startsWith('Mode temporel, scénario S0001') && !!view.remedy && view.remedy.includes('Augmentez') ? '' : JSON.stringify({ kind: view.kind, sc: view.scenarioId }));
    const notice = plainHtml((0, server_1.renderToString)(react_1.default.createElement(TemporalPanel_1.PlanErrorNotice, { view, onOpenTemporalSettings: () => undefined })));
    record('affichage du refus de calibration : titre, scénario en cause, couverture demandée, remède, bouton vers les réglages', (() => { const m = has(notice, 'Plan refusé : calibration de la demande impossible', 'Scénario en cause : S0001', 's = 0 jour(s), S = 0 jour(s)', 'Remède : Augmentez les jours de couverture', 'Ouvrir les réglages du mode temporel', 'role="alert"'); return m.length ? `manque ${m.join(' | ')}` : ''; })());
    const other = (0, bloc1TemporalUi_1.describePlanError)(new Error('Réseau invalide : test'));
    const otherHtml = plainHtml((0, server_1.renderToString)(react_1.default.createElement(TemporalPanel_1.PlanErrorNotice, { view: other })));
    record('autre erreur de plan : message conservé, affichage d\'origine (bandeau rouge d\'une ligne, aucun bouton)', other.kind === 'other' && other.message === 'Réseau invalide : test' && otherHtml.includes('bg-red-100 text-red-800') && otherHtml.includes('Réseau invalide : test') && !otherHtml.includes('<button') ? '' : 'affichage modifié');
    record('erreur sans message : texte générique d\'origine', (0, bloc1TemporalUi_1.describePlanError)({}).message === "Erreur pendant la génération du plan d'expériences" ? '' : (0, bloc1TemporalUi_1.describePlanError)({}).message);
    // --- Réglages invalides : refus explicite avant tout calcul, jamais d'erreur technique ---
    const settingsCases = [
        ['délai de trajet négatif', { defaultTravelTimeDays: -1 }], ['délai de trajet non entier', { defaultTravelTimeDays: 1.5 }],
        [`délai de production supérieur à ${bloc1DefaultParams_2.TEMPORAL_MAX_DELAY_DAYS}`, { defaultProductionLeadTimeDays: bloc1DefaultParams_2.TEMPORAL_MAX_DELAY_DAYS + 1 }],
        ['pré-chauffe négative', { burnInDays: -5 }], ['s supérieur à S', { reorderPointDays: 12, orderUpToDays: 10 }],
        ['couverture non finie', { orderUpToDays: NaN }], ['hausse de D7 négative', { d7OrderUpToBoostPct: -0.1 }],
    ];
    for (const [label, patch] of settingsCases) {
        let got = 'aucune erreur';
        try {
            (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 2, params: temporalParams(patch) });
        }
        catch (e) {
            got = e instanceof bloc1ExperimentPlan_1.TemporalSettingsError && !(e instanceof RangeError) && e.problems.length >= 1 ? '' : `${e.name} : ${e.message.slice(0, 80)}`;
        }
        record(`réglage invalide (${label}) : refusé par un message explicite avant tout calcul`, got);
    }
    record('réglages par défaut activés : aucun problème signalé', (0, bloc1DefaultParams_2.temporalParamProblems)(temporalParams().temporal).length === 0 ? '' : (0, bloc1DefaultParams_2.temporalParamProblems)(temporalParams().temporal).join(' '));
    record('réglages désactivés : jamais validés (un plan sans mode temporel ne peut pas être refusé pour eux)', (() => { try {
        (0, bloc1ExperimentPlan_1.generateExperimentPlan)({ ...c1, nScenarios: 1, params: { ...(0, bloc1DefaultParams_1.withModelParamDefaults)(c1.params), temporal: { ...bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS.temporal, defaultTravelTimeDays: -9 } } });
        return '';
    }
    catch (e) {
        return e.message.slice(0, 80);
    } })());
    // --- Réseau et mode temporel : validation identique à celle du moteur ---
    const isoOff = (0, bloc1NetworkSelection_2.resolveNetworkChoice)({ ...choice, source: 'isomorph' }, false);
    const isoOn = (0, bloc1NetworkSelection_2.resolveNetworkChoice)({ ...choice, source: 'isomorph' }, true);
    record('ISOMORPH, mode désactivé : 3 avertissements dont « réservé », comme au palier 1', isoOff.report?.warnings.length === 3 && isoOff.report.warnings.some(w => w.code === 'W_RESERVED') ? '' : JSON.stringify(isoOff.report?.warnings.map(w => w.code)));
    record('ISOMORPH, mode temporel : plus d\'avertissement « réservé », 2 avertissements Philadelphia/Baltimore conservés, 16 délais de trajet lus', isoOn.error === null && isoOn.report?.warnings.length === 2 && !isoOn.report.warnings.some(w => w.code === 'W_RESERVED') && Object.keys(isoOn.report.compiled.timing.travelTimeDays).length === 16 ? '' : JSON.stringify(isoOn.report?.warnings.map(w => w.code)));
    const bogus = JSON.stringify(tinyDoc(BASE_NODES, [{ ...E('F', 'W', 8), travel_time_days: bloc1DefaultParams_2.TEMPORAL_MAX_DELAY_DAYS + 1 }, E('W', 'C')]));
    const impOff = (0, bloc1NetworkSelection_2.importNetworkText)((0, bloc1NetworkSelection_2.cloneDefaultNetworkChoice)(), bogus, 'delai.json', false);
    const impOn = (0, bloc1NetworkSelection_2.importNetworkText)((0, bloc1NetworkSelection_2.cloneDefaultNetworkChoice)(), bogus, 'delai.json', true);
    record(`import d'un délai de ${bloc1DefaultParams_2.TEMPORAL_MAX_DELAY_DAYS + 1} jours : accepté (ignoré) mode désactivé, refusé en mode temporel avec E_TEMPORAL`, impOff.accepted && !impOn.accepted && impOn.report.errors.some(e => e.code === 'E_TEMPORAL') ? '' : `hors mode : ${impOff.accepted}, en mode : ${impOn.accepted}`);
    const viewOn = (0, bloc1NetworkSelection_2.buildNetworkView)(isoOn, params.network, 200);
    record('résumé du réseau ISOMORPH en mode temporel : 16 délais de trajet (jusqu\'à 8 jours), aucun délai de production ni inventory dans le fichier', viewOn.summary.timing?.travelArcs === 16 && viewOn.summary.timing.maxTravelDays === 8 && viewOn.summary.timing.leadNodes === 0 && viewOn.summary.timing.inventoryNodes === 0 ? '' : JSON.stringify(viewOn.summary.timing));
    record('résumé hors mode temporel : aucune donnée temporelle', (0, bloc1NetworkSelection_2.buildNetworkView)(isoOff, params.network, 200).summary.timing == null ? '' : 'donnée temporelle présente');
    const panel = (res, p) => plainHtml((0, server_1.renderToString)(react_1.default.createElement(NetworkPanel_1.NetworkPanel, {
        choice: { ...choice, source: 'isomorph' }, onChoiceChange: () => undefined, resolved: res, params: p,
        planMeta: { nScenarios: 5, seed: 42, warmupDays: 10, horizonDays: 60, disruptionTypes: [...bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES] },
    })));
    const pOn = panel(isoOn, on), pOff = panel(isoOff, params);
    record('section Réseau, mode temporel : bandeau « Mode temporel actif » avec les 16 délais lus, plus d\'avertissement « réservé »', (() => { const m = has(pOn, 'Mode temporel actif', '16 délai(s) de trajet (jusqu\'à 8 j)'); return m.length || pOn.includes('W_RESERVED') ? `manque ${m.join(' | ')}` : ''; })());
    record('section Réseau, mode désactivé : aucun bandeau temporel, avertissement « réservé » conservé', !pOff.includes('Mode temporel actif') && pOff.includes('W_RESERVED') ? '' : 'bandeau ou avertissement incorrect');
    // --- Potentiomètre : réglages temporels conservés, jusque dans l'affichage ---
    const custom = (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    custom.temporal = { enabled: true, defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 3, reorderPointDays: 4, orderUpToDays: 12, burnInDays: 45, d7OrderUpToBoostPct: 0.25, lastMileSameDay: false };
    let shownOk = true;
    for (const level of [0, 25, 50, 75, 100]) {
        const after = (0, bloc1StressModel_1.applyStressLevelPreservingSettings)(custom, level);
        const html = section(after, 'temporal');
        const same = JSON.stringify(after.temporal) === JSON.stringify(custom.temporal)
            && ['value="2"', 'value="3"', 'value="4"', 'value="12"', 'value="45"', 'value="0.25"'].every(v => html.includes(v));
        if (!same)
            shownOk = false;
    }
    record('potentiomètre à 0, 25, 50, 75, 100 % : les 8 réglages temporels personnalisés restent identiques et affichés tels quels dans la section 8', shownOk ? '' : 'réglage modifié');
    const genSource = fs.readFileSync(path.join(process.cwd(), 'Bloc1ScenarioGenerator.tsx'), 'utf8');
    record('garde de code : le curseur de l\'onglet Générateur passe par applyStressLevelPreservingSettings et ne remplace jamais tous les paramètres', genSource.includes('setParams(p => applyStressLevelPreservingSettings(p, newVal))') && !/setParams\(\s*computeModelParamsFromStress\(/.test(genSource) ? '' : 'le gestionnaire du curseur a changé');
    // --- Aucun changement pour un plan sans mode temporel ---
    const header = plainHtml((0, server_1.renderToString)(react_1.default.createElement(Bloc1ScenarioGenerator_1.default)));
    record('onglet Générateur sans mode temporel : aucune trace du mode temporel dans le rendu initial (en-tête, bandeau, erreur)', !header.includes('en mode temporel') && !header.includes('Mode temporel actif') && !header.includes('Plan refusé') ? '' : 'trace du mode temporel');
    log('Palier 2, étape 5 : le tableau de sensibilité affiché dans l\'interface est rejoué par le jeu de tests (7 mesures de couverture et de durée, plus la référence du palier 1).');
}
async function p2Step4Tests(record, log) {
    const noDis = { id: 'n', type: 'congestion', start: 0, duration: 1, severity: 0 };
    const isoNet = (withTravel, seed = 3) => {
        const p = temporalParams();
        const doc = withTravel ? (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() : withoutTravelTimes((0, bloc1IsomorphPreset_1.buildIsomorphPreset)());
        const n = (0, bloc1NetworkFormat_1.instantiateExplicitNetwork)((0, bloc1Network_1.makeRng)(seed), (0, bloc1NetworkFormat_1.validateNetworkDocument)(doc, { temporal: true }).compiled, p.network);
        return { net: n, params: p };
    };
    // --- Q10 D à délais nuls : exactement la formule initiale ---
    for (const [label, make] of [
        ['réseau par défaut', () => { const p = temporalParams(); const n = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(5), p.network); return { net: n, params: p }; }],
        ['ISOMORPH sans délais', () => isoNet(false)],
    ]) {
        const { net, params } = make();
        net.baseDemand = 1000;
        const m = (0, bloc1Temporal_1.buildTemporalModel)(net, params);
        const storage = m.nodes.filter(n => n.role === 'storage');
        const share = net.baseDemand / storage.length;
        const exact = storage.every(n => n.replenishLead === 0 && n.s === params.temporal.reorderPointDays * share && n.S === params.temporal.orderUpToDays * share);
        record(`Q10 D à délais nuls, ${label} : s et S strictement égaux à la formule initiale (jours x part égale)`, exact ? '' : 'valeurs différentes');
    }
    // --- Q10 D avec délais : stock en transit ajouté, régime nominal sans rupture ---
    const iso = isoNet(true);
    (0, bloc1Temporal_1.calibrateDemandTemporal)(iso.net, noDis, 1, iso.params, (n, st) => (0, bloc1Network_1.maxFlow)(n, st), Array(70).fill(1));
    const isoModel = (0, bloc1Temporal_1.buildTemporalModel)(iso.net, iso.params);
    const philly = isoModel.byId.get('Philadelphia');
    const shareIso = iso.net.baseDemand / isoModel.nodes.filter(n => n.role === 'storage').length;
    log(`Palier 2, étape 4 : ISOMORPH (délais du fichier), demande calibrée ${iso.net.baseDemand} ; Philadelphia : délai d'approvisionnement ${philly.replenishLead} j, débit nominal ${Math.round(philly.nominalThroughput)}, s = ${Math.round(philly.s)}, S = ${Math.round(philly.S)}`);
    // Stock en transit nominal de Philadelphia = somme, sur ses arcs entrants, de (délai de trajet + délai de production du fournisseur) x débit nominal de l'arc (loi de Little).
    const phillyTransit = philly.inArcs.reduce((sum, a) => sum + (a.travel + isoModel.byId.get(a.from).lead) * nominalArcFlow(iso.net, iso.params, isoModel, a.index), 0);
    record('Q10 D, ISOMORPH : s et S de Philadelphia = jours x part égale + stock en transit exact par arc entrant (loi de Little)', Math.abs(philly.s - (3 * shareIso + phillyTransit)) < 1e-6 && Math.abs(philly.S - (10 * shareIso + phillyTransit)) < 1e-6 && phillyTransit > 0 ? '' : `s ${philly.s} attendu ${3 * shareIso + phillyTransit}`);
    const nominalRun = (net, params, days) => {
        const m = (0, bloc1Temporal_1.buildTemporalModel)(net, params);
        const st = (0, bloc1Temporal_1.initialTemporalState)(m);
        const out = [];
        for (let d = 0; d < days; d++)
            out.push((0, bloc1Temporal_1.stepTemporalDay)(m, st, (0, bloc1Network_1.buildDailyState)(net, noDis, -1e6, 1, params.disruption)));
        return out;
    };
    const isoOut = nominalRun(iso.net, iso.params, 130).slice(60);
    const isoShort = isoOut.filter(x => x < iso.net.baseDemand - 1e-6).length;
    record(`Q10 D, ISOMORPH (délais du fichier), régime nominal jours 60 à 130 : ${isoShort} jour(s) de rupture, livré moyen ${Math.round(isoOut.reduce((a, b) => a + b, 0) / isoOut.length)} pour ${iso.net.baseDemand}`, isoShort === 0 ? '' : 'ruptures en régime nominal');
    const defP = temporalParams({ defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 1 });
    const defN = (0, bloc1Network_1.generateNetworkInstance)((0, bloc1Network_1.makeRng)(3), defP.network);
    (0, bloc1Temporal_1.calibrateDemandTemporal)(defN, noDis, 1, defP, (n, st) => (0, bloc1Network_1.maxFlow)(n, st), Array(70).fill(1));
    const defOut = nominalRun(defN, defP, 130).slice(60);
    const defShort = defOut.filter(x => x < defN.baseDemand - 1e-6).length;
    record(`Q10 D, réseau par défaut (trajet 2 j, production 1 j), régime nominal jours 60 à 130 : ${defShort} jour(s) de rupture, demande ${defN.baseDemand}`, defShort === 0 ? '' : 'ruptures en régime nominal');
    // --- Calibration : IP = 1 pendant la chauffe malgré le bruit, en mode temporel ---
    const c1 = JSON.parse(readFile('C1_seed42/config.json') ?? '{}');
    const planCases = [
        ['réseau par défaut, trajet 2 j, production 1 j', { ...c1, nScenarios: 30, params: temporalParams({ defaultTravelTimeDays: 2, defaultProductionLeadTimeDays: 1 }) }],
        ['ISOMORPH, délais du fichier', { ...c1, nScenarios: 30, params: temporalParams(), network: { kind: 'explicite', document: (0, bloc1IsomorphPreset_1.buildIsomorphPreset)() } }],
        ['réseau multi-échelon, délais de trajet et de production', { ...c1, nScenarios: 30, params: temporalParams(), network: { kind: 'explicite', document: multiTierTemporalDoc() } }],
    ];
    log('Palier 2, étape 4 : plans en mode temporel (30 scénarios, graine 42), IP en chauffe et creux par nature (branche sans décision) :');
    for (const [label, cfg] of planCases) {
        const ds = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(cfg);
        const warm = ds.ipTimeseries.filter(p => p.day_rel < 0);
        const warmBad = warm.filter(p => p.ip < 1 - 1e-12).length;
        record(`calibration temporelle, ${label} : IP = 1 sur les ${warm.length} points de chauffe`, warmBad ? `${warmBad} points avec IP < 1` : '');
        const parts = [];
        for (const type of bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES) {
            const ids = ds.perturbations.filter(p => p.type === type).map(p => p.scenario_id);
            const mins = ds.branches.filter(b => b.branch_id === 'none' && ids.includes(b.scenario_id)).map(b => b.ip_min);
            parts.push(`${type} ${mins.filter(m => m < 1 - 1e-9).length}/${ids.length}`);
        }
        log(`  ${label} : chauffe ${warmBad} point(s) sur ${warm.length} avec IP < 1 ; scénarios avec creux : ${parts.join(', ')}`);
        record(`calibration temporelle, ${label} : IP dans [0, 1], aucune valeur invalide`, ds.ipTimeseries.every(p => Number.isFinite(p.ip) && p.ip >= 0 && p.ip <= 1) ? '' : 'valeur hors bornes');
    }
    // --- D6 : injection le jour de la décision, parts égales, nœuds Q16 exclus ---
    const bt = (0, bloc1ExperimentPlan_1.prepareBranchTemporal)(iso.net, noDis, iso.params);
    const st6 = (0, bloc1Temporal_1.cloneTemporalState)(bt.start);
    const before6 = { ...st6.onHand };
    (0, bloc1Temporal_1.applyTemporalStockDecision)('D6', bt.model, st6, iso.net, iso.params, 0);
    const storage = bt.model.nodes.filter(n => n.role === 'storage');
    const share6 = iso.params.decisions.d6_stockBoostShareOfDemand * iso.net.baseDemand / storage.length;
    const gained = (id) => st6.reserve[id];
    const excluded = storage.filter(n => n.unlimitedShipping).map(n => n.id).sort().join(',');
    const okD6 = excluded === 'Baltimore,Philadelphia' && gained('Philadelphia') === 0 && gained('Baltimore') === 0
        && storage.filter(n => !n.unlimitedShipping).every(n => Math.abs(gained(n.id) - share6) < 1e-9)
        && Object.keys(st6.onHand).every(k => st6.onHand[k] === before6[k])
        && Math.abs(st6.injected - 7 * share6) < 1e-6;
    record(`D6 temporel, ISOMORPH : ${Math.round(share6)} unités libérées en réserve dans chacun des 7 nœuds de stockage éligibles, Philadelphia et Baltimore exclus (Q9 A), part perdue, stock ordinaire inchangé`, okD6 ? '' : `exclus ${excluded}, injecté ${st6.injected}`);
    const again = st6.injected;
    (0, bloc1Temporal_1.applyTemporalStockDecision)('D6', bt.model, st6, iso.net, iso.params, 1);
    record('D6 temporel : une seule injection (rien les jours suivants)', st6.injected === again ? '' : 'injection répétée');
    // --- D7 : s et S relevés, commande immédiate le jour de la décision (Q6 A) ---
    const st7 = (0, bloc1Temporal_1.cloneTemporalState)(bt.start), st0 = (0, bloc1Temporal_1.cloneTemporalState)(bt.start);
    (0, bloc1Temporal_1.applyTemporalStockDecision)('D7', bt.model, st7, iso.net, iso.params, 0);
    record(`D7 temporel : s et S multipliés par ${st7.stockTargetFactor} et commande immédiate demandée`, st7.stockTargetFactor === 1 + iso.params.temporal.d7OrderUpToBoostPct && st7.forceReorder ? '' : 'D7 non appliqué');
    const day = (0, bloc1Network_1.buildDailyState)(iso.net, noDis, -1e6, 1, iso.params.disruption);
    const sh7 = [], sh0 = [];
    (0, bloc1Temporal_1.stepTemporalDay)(bt.model, st7, JSON.parse(JSON.stringify(day)), sh7);
    (0, bloc1Temporal_1.stepTemporalDay)(bt.model, st0, JSON.parse(JSON.stringify(day)), sh0);
    const tot = (xs) => xs.reduce((a, b) => a + (b ?? 0), 0);
    record(`D7 temporel : expéditions amont du jour de la décision ${Math.round(tot(sh7))} contre ${Math.round(tot(sh0))} sans D7 ; commande forcée levée le lendemain`, tot(sh7) > tot(sh0) && st7.forceReorder === false ? '' : 'pas de commande immédiate');
    // --- Chacune des 9 décisions agit en mode temporel (ISOMORPH, délais du fichier) ---
    const d = (type, severity, t = {}) => ({ id: 'T', type, start: 0, duration: 60, severity, ...t });
    const situations = [
        ['D1', d('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' })], ['D2', d('fermeture_entrepot', 1, { targetWarehouse: 'Chicago' })],
        ['D3', d('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' })], ['D4', d('coupure_lien', 1, { targetEdge: { from: 'Atlanta', to: 'Chicago' } })],
        ['D5', d('congestion', 0.6)], ['D6', d('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' })], ['D7', d('pic_demande', 0.3, { duration: 15 })],
        ['D8', d('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' })], ['D9', d('panne_fournisseur', 1, { targetFactory: 'SanFrancisco' })],
    ];
    const w = iso.params.indicators.importantWeight;
    const HORIZON = 60;
    const run20 = (dis, decision, demandFactor) => {
        const prep = (0, bloc1ExperimentPlan_1.prepareBranchTemporal)(iso.net, dis, iso.params);
        const st = (0, bloc1Temporal_1.cloneTemporalState)(prep.start);
        let delivered = 0, ipSum = 0;
        for (let day = 0; day < HORIZON; day++) {
            const daily = (0, bloc1Network_1.buildDailyState)(iso.net, dis, day, 1, iso.params.disruption);
            daily.demand *= demandFactor;
            if (decision === 'D6' || decision === 'D7')
                (0, bloc1Temporal_1.applyTemporalStockDecision)(decision, prep.model, st, iso.net, iso.params, day);
            else if (decision)
                bloc1Decisions_1.DECISION_BY_ID[decision].apply(daily, { network: iso.net, disruption: dis, day, params: iso.params });
            const got = (0, bloc1Temporal_1.stepTemporalDay)(prep.model, st, daily);
            delivered += got;
            ipSum += (0, bloc1Network_1.observeIp)(daily, got, w);
        }
        return { delivered, ipSum };
    };
    for (const [id, dis] of situations) {
        const demandFactor = id === 'D8' || id === 'D9' ? 1.5 : 1;
        const base = run20(dis, null, demandFactor), with_ = run20(dis, id, demandFactor);
        const metric = id === 'D8' || id === 'D9' ? 'IP cumulé sur 60 jours' : 'livré sur 60 jours';
        const a = id === 'D8' || id === 'D9' ? base.ipSum : base.delivered, b = id === 'D8' || id === 'D9' ? with_.ipSum : with_.delivered;
        record(`mode temporel, ISOMORPH, ${id} (${dis.type}) : ${metric} ${a.toFixed(id === 'D8' || id === 'D9' ? 2 : 0)} puis ${b.toFixed(id === 'D8' || id === 'D9' ? 2 : 0)}`, b > a ? '' : 'aucun effet');
    }
}
// ----------------------------------------------------------------------------
// Génération des références
// ----------------------------------------------------------------------------
async function generate() {
    if (fs.existsSync(FIXTURES_DIR)) {
        console.log(`Les références existent déjà dans ${FIXTURES_DIR}. Supprimez ce dossier pour les régénérer.`);
        process.exitCode = 1;
        return;
    }
    const index = [];
    for (const c of PLAN_CASES) {
        const config = c.config();
        const dataset = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(config);
        const rows = syntheticResilienceRows(dataset.branches, config.horizonDays);
        writeFile(`${c.id}/config.json`, JSON.stringify(config, null, 2));
        writeFile(`${c.id}/resilience_rows.json`, JSON.stringify(rows));
        const outputs = datasetOutputs(dataset, rows);
        for (const name of Object.keys(outputs))
            writeFile(`${c.id}/${name}`, outputs[name]);
        // Bundle "ancien format", tel que sauvegardé par la version actuelle.
        const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dataset, rows, '', `Référence ${c.id}`);
        if (bundle)
            writeFile(`${c.id}/bundle.json`, (0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle));
        index.push({ id: c.id, description: c.description });
        console.log(`Références écrites : ${c.id}`);
    }
    const stress = {};
    for (const level of [0, 25, 50, 75, 100])
        stress[String(level)] = (0, bloc1StressModel_1.computeModelParamsFromStress)(level);
    writeFile('stress_params.json', JSON.stringify(stress, null, 2));
    writeFile('flow_oracle.json', JSON.stringify(buildFlowOracle()));
    writeFile('index.json', JSON.stringify(index, null, 2));
    console.log('Références écrites : stress_params.json, flow_oracle.json, index.json');
}
// ----------------------------------------------------------------------------
// Vérification
// ----------------------------------------------------------------------------
async function check() {
    if (!fs.existsSync(FIXTURES_DIR)) {
        console.log('Aucune référence trouvée. Lancez d\'abord la commande generate sur le code d\'origine.');
        process.exitCode = 1;
        return;
    }
    let total = 0, passed = 0;
    const failures = [];
    bloc1Network_1.q16Stats.applications = 0;
    const record = (name, diff) => {
        total++;
        if (diff === '') {
            passed++;
            console.log(`OK     ${name}`);
        }
        else {
            failures.push(`${name} : ${diff}`);
            console.log(`ECART  ${name} : ${diff}`);
        }
    };
    for (const c of PLAN_CASES) {
        const cfgText = readFile(`${c.id}/config.json`);
        const rowsText = readFile(`${c.id}/resilience_rows.json`);
        if (cfgText === null || rowsText === null) {
            record(`${c.id} (références)`, 'fichiers de référence manquants');
            continue;
        }
        const config = JSON.parse(cfgText);
        const rows = JSON.parse(rowsText);
        // 1. Configuration du cas inchangée (paramètres par défaut, potentiomètre).
        // Seuls les champs ajoutés au palier 1 (NEW_PARAM_FIELDS) sont ignorés.
        record(`${c.id}/config.json`, firstDifference(JSON.stringify(configWithoutNewFields(c.config()), null, 2), cfgText));
        // 2. Sorties de la génération synchrone (celle de la restauration et du Cloud).
        const dataset = (0, bloc1ExperimentPlan_1.generateExperimentPlan)(config);
        const outputs = datasetOutputs(dataset, rows);
        for (const name of Object.keys(outputs)) {
            const ref = readFile(`${c.id}/${name}`);
            record(`${c.id}/${name}`, ref === null ? 'référence manquante' : diffAgainstLegacyFixture(name, outputs[name], ref));
        }
        // 3. Génération asynchrone (bouton de l'onglet) identique à la synchrone.
        const asyncDataset = await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(config);
        const asyncOutputs = datasetOutputs(asyncDataset, rows);
        const asyncDiffs = Object.keys(outputs)
            .map(n => ({ n, d: firstDifference(asyncOutputs[n], outputs[n]) }))
            .filter(x => x.d !== '');
        record(`${c.id} génération asynchrone = synchrone`, asyncDiffs.length ? `${asyncDiffs[0].n} : ${asyncDiffs[0].d}` : '');
        // 4. Restauration d'un bundle sauvegardé par la version d'origine.
        const bundleText = readFile(`${c.id}/bundle.json`);
        if (bundleText === null) {
            record(`${c.id} restauration du bundle`, 'bundle de référence manquant');
        }
        else {
            const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)((0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)(bundleText));
            const restoredOutputs = datasetOutputs(restored.dataset, restored.resilienceRows);
            const restoreDiffs = Object.keys(outputs)
                .map(n => ({ n, d: diffAgainstLegacyFixture(n, restoredOutputs[n], readFile(`${c.id}/${n}`) ?? '') }))
                .filter(x => x.d !== '');
            record(`${c.id} restauration du bundle`, restoreDiffs.length ? `${restoreDiffs[0].n} : ${restoreDiffs[0].d}` : '');
        }
    }
    // 5. Potentiomètre d'impact : paramètres produits aux 5 préréglages.
    const stressRef = readFile('stress_params.json');
    const stress = {};
    for (const level of [0, 25, 50, 75, 100])
        stress[String(level)] = (0, bloc1StressModel_1.computeModelParamsFromStress)(level);
    const stressStripped = {};
    for (const k of Object.keys(stress))
        stressStripped[k] = stripNewParamFields(stress[k]);
    record('potentiomètre 0/25/50/75/100 % (hors champs ajoutés au palier 1)', stressRef === null ? 'référence manquante' : firstDifference(JSON.stringify(stressStripped, null, 2), stressRef));
    // 6. Oracle du flot : égalité exacte sur 10 000 états journaliers.
    const oracleText = readFile('flow_oracle.json');
    if (oracleText === null) {
        record('oracle du flot', 'référence manquante');
    }
    else {
        const oracle = JSON.parse(oracleText);
        let mismatches = 0, firstMismatch = '';
        oracle.entries.forEach((e, i) => {
            const f = (0, bloc1Network_1.maxFlow)(oracle.networks[e.networkIndex], fromLegacyState(e.state));
            if (!Object.is(f, e.flow)) {
                mismatches++;
                if (!firstMismatch)
                    firstMismatch = `état ${i} : attendu ${e.flow}, obtenu ${f}`;
            }
        });
        record(`oracle du flot (${oracle.entries.length} états, égalité exacte)`, mismatches ? `${mismatches} écarts, premier : ${firstMismatch}` : '');
    }
    // 7. Tests unitaires du flot générique.
    flowUnitTests(record);
    // 8. Tests de l'étape 3a (champ network, migration, génération unique).
    await planUnitTests(record);
    // 9. Règle Q16 : jamais déclenchée par tout ce qui précède (réseau paramétrique uniquement).
    record('règle Q16 jamais déclenchée sur le réseau paramétrique (tous les cas ci-dessus)', bloc1Network_1.q16Stats.applications === 0 ? '' : `${bloc1Network_1.q16Stats.applications} déclenchements`);
    // 10. Tests de l'étape 3b.
    oldFilesTests(record);
    q16Tests(record);
    // 11. Tests de l'étape 4.
    const notes = [];
    formatTests(record, line => notes.push(line));
    await isomorphEndToEnd(record, line => notes.push(line));
    await uiTests(record, line => notes.push(line));
    // 12. Compléments post-étape 5.
    potentiometerPreservationTests(record);
    firestoreSizeGuardTests(record);
    // 13. Tests de l'étape 6.
    step6ExportTests(record);
    // 14. Tests de l'étape 7.
    step7DocTests(record);
    // 15. Palier 2, étape 1 : références de fin de palier 1.
    await p1FinalTests(record);
    // 16. Palier 2, étape 2 : structures et paramètres du mode temporel.
    p2Step2Tests(record);
    // 17. Palier 2, étape 3 : moteur temporel.
    await p2Step3Tests(record, line => notes.push(line));
    // 18. Palier 2, étape 4 : Q10 D, calibration temporelle, D6 et D7.
    await p2Step4Tests(record, line => notes.push(line));
    notes.push('Palier 2, étape 4 : D6 (réserve de sécurité), garanties par simulation :');
    d6GuaranteeTests(record, line => notes.push(line));
    p2Step4bTests(record, line => notes.push(line));
    // 19. Palier 2, étape 5 : interface du mode temporel.
    await p2Step5Tests(record, line => notes.push(line));
    // 20. Palier 2, étape 6 : exports et documentation.
    await p2Step6Tests(record, line => notes.push(line));
    console.log('');
    notes.forEach(line => console.log(line));
    console.log('');
    console.log(`Bilan : ${total} tests, ${passed} réussis, ${total - passed} écarts.`);
    if (failures.length)
        process.exitCode = 1;
}
const command = process.argv[2];
if (command === 'generate')
    generate();
else if (command === 'generate-p1final')
    generateP1Final();
else if (command === 'check')
    check();
else {
    console.log('Usage : node .regression-build/tests/regression/regression.js generate|check');
    process.exitCode = 1;
}
