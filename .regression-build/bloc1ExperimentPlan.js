"use strict";
// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : plan d'expériences et export des données.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RB_COLUMNS_METADATA = exports.FIXED_PR_SEUIL_HAUT = exports.FIXED_PR_SEUIL_BAS = exports.RB_TRAINING_HEADER = exports.TemporalSettingsError = exports.PlanCalibrationError = exports.DEFAULT_PLAN_CONFIG = exports.DEFAULT_DISRUPTION_TYPES = void 0;
exports.resolveNetworkSpec = resolveNetworkSpec;
exports.prepareBranchTemporal = prepareBranchTemporal;
exports.exportScenarioNetworkDocument = exportScenarioNetworkDocument;
exports.generateExperimentPlanAsync = generateExperimentPlanAsync;
exports.generateExperimentPlan = generateExperimentPlan;
exports.scenariosToCsv = scenariosToCsv;
exports.perturbationsToCsv = perturbationsToCsv;
exports.decisionsToCsv = decisionsToCsv;
exports.ipTimeseriesToCsv = ipTimeseriesToCsv;
exports.branchesToCsv = branchesToCsv;
exports.metadataToJson = metadataToJson;
exports.buildExportFiles = buildExportFiles;
exports.downloadTextFile = downloadTextFile;
exports.downloadAllFiles = downloadAllFiles;
exports.computeQuantile = computeQuantile;
exports.computePrThresholds = computePrThresholds;
exports.formatRbTimestamp = formatRbTimestamp;
exports.getRbTrainingFilename = getRbTrainingFilename;
exports.getRbDictionaryFilename = getRbDictionaryFilename;
exports.generateRbDictionaryJson = generateRbDictionaryJson;
exports.generateRbTrainingCsv = generateRbTrainingCsv;
exports.createSimulationProcessBundle = createSimulationProcessBundle;
exports.simulationProcessToJson = simulationProcessToJson;
exports.parseSimulationProcessBundle = parseSimulationProcessBundle;
exports.restoreSimulationProcess = restoreSimulationProcess;
const bloc1Types_1 = require("./bloc1Types");
const bloc1Network_1 = require("./bloc1Network");
const bloc1Temporal_1 = require("./bloc1Temporal");
const bloc1NetworkFormat_1 = require("./bloc1NetworkFormat");
const bloc1Manager_1 = require("./bloc1Manager");
const bloc1DefaultParams_1 = require("./bloc1DefaultParams");
exports.DEFAULT_DISRUPTION_TYPES = [
    'panne_fournisseur', 'coupure_lien', 'fermeture_entrepot', 'pic_demande', 'congestion',
];
exports.DEFAULT_PLAN_CONFIG = {
    nScenarios: 20,
    seed: 42,
    warmupDays: 10,
    horizonDays: 60,
    disruptionTypes: exports.DEFAULT_DISRUPTION_TYPES,
    params: bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS,
};
const uniform = (rng, lo, hi) => lo + rng() * (hi - lo);
// ----------------------------------------------------------------------------
// Spécification du réseau d'un plan. Une configuration sans champ network
// (toutes celles produites avant le palier 1 : fichiers d'hypothèses, bundles
// locaux, sauvegardes Cloud) désigne le réseau paramétrique. La configuration
// n'est jamais modifiée ici : metadata.json la reprend telle quelle.
// ----------------------------------------------------------------------------
function resolveNetworkSpec(config) {
    const spec = config.network;
    if (spec === undefined || spec === null)
        return { kind: 'parametrique' };
    if (spec.kind === 'parametrique')
        return { kind: 'parametrique' };
    if (spec.kind === 'explicite')
        return { kind: 'explicite', document: spec.document };
    throw new Error(`Type de réseau inconnu dans la configuration du plan : ${String(spec.kind)}`);
}
// ----------------------------------------------------------------------------
// Génération du plan : un seul cœur de calcul, partagé par la version
// synchrone (restauration d'un bundle, rechargement Cloud) et la version
// asynchrone (bouton de l'onglet Générateur). Les deux ne diffèrent que par la
// rétrocession de la main à l'interface entre deux scénarios.
// ----------------------------------------------------------------------------
// Erreurs structurées du plan (l'interface les affiche en détail ; message texte conservé).
class PlanCalibrationError extends Error {
    constructor(scenarioId, cause) {
        super(`Mode temporel, scénario ${scenarioId} : ${cause.message}`);
        this.name = 'PlanCalibrationError';
        this.scenarioId = scenarioId;
        this.details = cause.details;
    }
}
exports.PlanCalibrationError = PlanCalibrationError;
class TemporalSettingsError extends Error {
    constructor(problems) {
        super(`Mode temporel : réglages invalides. ${problems.join(' ')}`);
        this.name = 'TemporalSettingsError';
        this.problems = problems;
    }
}
exports.TemporalSettingsError = TemporalSettingsError;
function startPlanRun(config) {
    const networkSpec = resolveNetworkSpec(config); // avant tout tirage : n'en consomme aucun
    // Paramètres complétés par les valeurs par défaut des sections ajoutées au
    // palier 1 (anciens fichiers d'hypothèses et bundles). La configuration
    // elle-même n'est pas modifiée : metadata.json la reprend telle quelle.
    const params = (0, bloc1DefaultParams_1.withModelParamDefaults)(config.params);
    // Mode temporel : réglages invalides refusés avec un message explicite avant
    // tout calcul (sinon un délai négatif ou non entier ferait échouer le moteur
    // avec une erreur technique incompréhensible).
    if (params.temporal.enabled) {
        const problems = (0, bloc1DefaultParams_1.temporalParamProblems)(params.temporal);
        if (problems.length)
            throw new TemporalSettingsError(problems);
    }
    return {
        config, params,
        network: (0, bloc1NetworkFormat_1.prepareNetwork)(networkSpec, params.temporal.enabled), // validation du réseau explicite : erreur explicite avant tout calcul
        rng: (0, bloc1Network_1.makeRng)(config.seed),
        profiles: (0, bloc1Manager_1.buildManagerProfiles)(params),
        totalDays: config.warmupDays + config.horizonDays,
        scenarios: [], perturbations: [], decisions: [], ipTimeseries: [], branches: [],
    };
}
function drawScenario(run, i) {
    const { config, params, rng } = run;
    const scenarioId = `S${String(i + 1).padStart(4, '0')}`;
    const network = (0, bloc1NetworkFormat_1.instantiateNetwork)(rng, run.network, params);
    // Convention d'alignement avec le Bloc 2 : la perturbation démarre à
    // day_rel = 0, immédiatement après la période de warm-up.
    const disruption = (0, bloc1Network_1.injectDisruption)(rng, network, {
        id: `${scenarioId}-P1`,
        types: config.disruptionTypes,
        start: 0,
        params: params.disruption,
    });
    // Calibration de la demande de référence en fonction du débit
    // effectivement disponible pendant l'incident (voir bloc1Network.ts).
    const utilization = uniform(rng, params.demand.utilizationMin, params.demand.utilizationMax);
    // Bruit journalier sur la demande : tiré une fois par scénario, partagé
    // par les 4 branches (nombres aléatoires communs), pour que seules la
    // perturbation et les décisions expliquent les écarts entre branches.
    // (Tiré avant la calibration, qui ne consomme aucun tirage : la suite des
    // nombres aléatoires est exactement celle du palier 1.)
    const demandNoiseSeries = Array.from({ length: run.totalDays }, () => 1 + uniform(rng, -network.demandNoise, network.demandNoise));
    if (params.temporal.enabled) {
        // Mode temporel : même principe, mesuré sur le moteur temporel et vérifié
        // par simulation du scénario sans perturbation, avec son bruit réel.
        const flowOptions = (0, bloc1Network_1.flowOptionsFromParams)(params);
        try {
            (0, bloc1Temporal_1.calibrateDemandTemporal)(network, disruption, utilization, params, (net, st) => (0, bloc1Network_1.maxFlow)(net, st, flowOptions), demandNoiseSeries);
        }
        catch (e) {
            if (e instanceof bloc1Temporal_1.TemporalCalibrationError)
                throw new PlanCalibrationError(scenarioId, e);
            throw e;
        }
    }
    else {
        (0, bloc1Network_1.calibrateDemand)(network, disruption, utilization, params.disruption, params.demand.warmupSafetyMargin, (0, bloc1Network_1.flowOptionsFromParams)(params));
    }
    return { scenarioId, network, disruption, demandNoiseSeries };
}
function prepareBranchTemporal(network, disruption, params) {
    const model = (0, bloc1Temporal_1.buildTemporalModel)(network, params);
    const start = (0, bloc1Temporal_1.initialTemporalState)(model);
    const days = Math.max(0, Math.floor(params.temporal.burnInDays));
    for (let d = 0; d < days; d++) {
        (0, bloc1Temporal_1.stepTemporalDay)(model, start, (0, bloc1Network_1.buildDailyState)(network, disruption, -1000000, 1, params.disruption));
    }
    return { model, start };
}
function simulateScenario(run, i) {
    const { config, params } = run;
    const { scenarioId, network, disruption, demandNoiseSeries } = drawScenario(run, i);
    // network_id : identifiant du réseau explicite, ou "parametrique" par défaut.
    const networkId = run.network.kind === 'explicite' ? run.network.compiled.document.id : 'parametrique';
    const nodeEchelons = (0, bloc1NetworkFormat_1.computeGraphEchelons)(network.graph.nodes, network.graph.arcs);
    const nEchelons = network.graph.nodes.length
        ? Math.max(...network.graph.nodes.map(n => nodeEchelons[n.id] ?? 0)) + 1 : 0;
    run.scenarios.push({
        scenario_id: scenarioId,
        n_factories: (0, bloc1Network_1.getNetworkGroups)(network).production.length,
        n_warehouses: (0, bloc1Network_1.getNetworkGroups)(network).storage.length,
        base_demand: network.baseDemand,
        important_share: network.importantShare,
        warmup_days: config.warmupDays,
        horizon_days: config.horizonDays,
        network_id: networkId,
        n_nodes: network.graph.nodes.length,
        n_edges: network.graph.arcs.length,
        n_echelons: nEchelons,
    });
    run.perturbations.push({
        scenario_id: scenarioId,
        type: disruption.type,
        start: disruption.start,
        duration: disruption.duration,
        severity: disruption.severity,
        target: (0, bloc1Network_1.describeTarget)(disruption, network),
    });
    // Mode temporel : modèle du scénario et pré-chauffe (sans perturbation ni
    // décision, demande de référence sans bruit), commune aux 4 branches. Ne
    // consomme aucun tirage aléatoire.
    const temporal = params.temporal.enabled ? prepareBranchTemporal(network, disruption, params) : undefined;
    for (const branchId of bloc1Types_1.BRANCH_IDS) {
        const profile = branchId === 'none' ? null : run.profiles.find(p => p.id === branchId);
        const result = (0, bloc1Manager_1.simulateBranch)(scenarioId, branchId, network, disruption, profile, config.warmupDays, config.horizonDays, demandNoiseSeries, params, temporal);
        run.ipTimeseries.push(...result.ipPoints);
        run.decisions.push(...result.appliedDecisions);
        run.branches.push(result.summary);
    }
}
function finishPlanRun(run) {
    return {
        scenarios: run.scenarios, perturbations: run.perturbations, decisions: run.decisions,
        ipTimeseries: run.ipTimeseries, branches: run.branches,
        metadata: {
            generator: 'isomorph-reborn-bloc1',
            version: '1.2.0', // palier 1, étape 6 : réseau dans metadata.json, colonnes ajoutées à scenarios.csv
            generated_at: new Date().toISOString(),
            config: run.config,
        },
    };
}
// ----------------------------------------------------------------------------
// Export du réseau d'un scénario (décision Q8 B) : rejoue les tirages du plan
// jusqu'au scénario demandé (index à partir de 0) et renvoie le document
// explicite correspondant, à capacités fixes, avec la règle en provenance.
// ----------------------------------------------------------------------------
function exportScenarioNetworkDocument(config, scenarioIndex) {
    if (!Number.isInteger(scenarioIndex) || scenarioIndex < 0 || scenarioIndex >= config.nScenarios) {
        throw new Error(`Numéro de scénario hors du plan : ${scenarioIndex + 1} (le plan en compte ${config.nScenarios}).`);
    }
    const run = startPlanRun(config);
    let drawn = null;
    for (let i = 0; i <= scenarioIndex; i++)
        drawn = drawScenario(run, i);
    const { scenarioId, network } = drawn;
    const spec = resolveNetworkSpec(config);
    const provenance = {
        kind: spec.kind,
        seed: config.seed,
        scenario_id: scenarioId,
        generator_version: '1.2.0',
    };
    if (spec.kind === 'parametrique')
        provenance.rule = run.params.network;
    else
        provenance.network_id = spec.document.id;
    return (0, bloc1NetworkFormat_1.networkInstanceToDocument)(network, {
        id: `${spec.kind === 'parametrique' ? 'parametrique' : spec.document.id}-seed${config.seed}-${scenarioId}`,
        name: `Instance du scénario ${scenarioId} (graine ${config.seed})`,
        description: "Instance à capacités fixes exportée d'un plan d'expériences. La graine et la configuration du plan suffisent à régénérer tout le plan.",
        provenance,
    });
}
async function generateExperimentPlanAsync(config, onProgress) {
    const run = startPlanRun(config);
    for (let i = 0; i < config.nScenarios; i++) {
        simulateScenario(run, i);
        if (onProgress)
            onProgress(i + 1, config.nScenarios);
        // Rend la main à React pour rafraîchir la jauge de progression.
        if (i % 4 === 0 || i === config.nScenarios - 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    return finishPlanRun(run);
}
function generateExperimentPlan(config, onProgress) {
    const run = startPlanRun(config);
    for (let i = 0; i < config.nScenarios; i++) {
        simulateScenario(run, i);
        if (onProgress)
            onProgress(i + 1, config.nScenarios);
    }
    return finishPlanRun(run);
}
// ----------------------------------------------------------------------------
// Export CSV / JSON — mêmes clés scenario_id / branch_id que l'onglet
// "Traitement par lot" du Bloc 2.
// ----------------------------------------------------------------------------
function toCsv(rows, columns) {
    const header = columns.join(',');
    const lines = rows.map(row => columns.map(col => {
        const v = row[col];
        if (v === null || v === undefined)
            return '';
        if (typeof v === 'number')
            return Number.isInteger(v) ? String(v) : v.toFixed(6);
        return String(v);
    }).join(','));
    return [header, ...lines].join('\n');
}
// Décision Q7 B : 4 colonnes ajoutées à la fin, jamais dans l'export à 40
// colonnes pour le réseau bayésien, qui reste inchangé.
function scenariosToCsv(dataset) {
    return toCsv(dataset.scenarios, [
        'scenario_id', 'n_factories', 'n_warehouses', 'base_demand', 'important_share', 'warmup_days', 'horizon_days',
        'network_id', 'n_nodes', 'n_edges', 'n_echelons',
    ]);
}
function perturbationsToCsv(dataset) {
    return toCsv(dataset.perturbations, ['scenario_id', 'type', 'start', 'duration', 'severity', 'target']);
}
function decisionsToCsv(dataset) {
    return toCsv(dataset.decisions, [
        'scenario_id', 'branch_id', 'decision_id', 'family', 'day_rel', 'detected_day_rel',
    ]);
}
function ipTimeseriesToCsv(dataset) {
    return toCsv(dataset.ipTimeseries, ['scenario_id', 'branch_id', 'day_rel', 'ip']);
}
function branchesToCsv(dataset) {
    return toCsv(dataset.branches, [
        'scenario_id', 'branch_id', 'ip_min', 'day_of_ip_min', 'area_lost', 'nb_decisions', 'recovery_day',
    ]);
}
function metadataToJson(dataset) {
    return JSON.stringify(dataset.metadata, null, 2);
}
function buildExportFiles(dataset) {
    return [
        { name: 'scenarios.csv', content: scenariosToCsv(dataset) },
        { name: 'perturbations.csv', content: perturbationsToCsv(dataset) },
        { name: 'decisions.csv', content: decisionsToCsv(dataset) },
        { name: 'ip_timeseries.csv', content: ipTimeseriesToCsv(dataset) },
        { name: 'branches.csv', content: branchesToCsv(dataset) },
        { name: 'metadata.json', content: metadataToJson(dataset) },
    ];
}
function downloadTextFile(name, content, mime = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}
function downloadAllFiles(dataset) {
    const files = buildExportFiles(dataset);
    files.forEach((f, i) => {
        setTimeout(() => {
            downloadTextFile(f.name, f.content, f.name.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8;');
        }, i * 250);
    });
}
// ============================================================================
// EXPORT RÉSEAU BAYÉSIEN (rb_training_<seed>_<timestamp>.csv)
// Consolidation multi-tables en aval (scenarios, perturbations, metadata,
// decisions, branches, resilience_ip) par couple (scenario_id, branch_id).
// ============================================================================
exports.RB_TRAINING_HEADER = [
    'scenario_id',
    'branch_id',
    'n_factories',
    'n_warehouses',
    'base_demand',
    'important_share',
    'warmup_days',
    'horizon_days',
    'disruption_type',
    'disruption_start',
    'disruption_duration',
    'disruption_severity',
    'disruption_target',
    'management_profile',
    'detection_threshold',
    'decision_delay_days',
    'reevaluation_days',
    'detected_day_rel',
    'reaction_lag_days',
    'nb_decisions',
    'family_capacite_used',
    'family_reroutage_used',
    'family_sourcing_used',
    'family_demande_used',
    'family_stock_used',
    'ip_k',
    'ip_q',
    'ip_h',
    'ip_g',
    'ip_d',
    'ip_alpha',
    'ip_beta',
    'fit_r2',
    'fit_r2_smooth',
    'fit_rmse',
    'IPC',
    'TRP',
    'CRD',
    'PR',
    'PR_class',
].join(',');
/**
 * Calcul d'un quantile (p entre 0 et 1) par interpolation linéaire standard.
 */
function computeQuantile(sortedValues, p) {
    if (sortedValues.length === 0)
        return 0;
    if (sortedValues.length === 1)
        return sortedValues[0];
    const index = (sortedValues.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
// ============================================================================
// PARAMÈTRES DE DISCRÉTISATION PR_class
// ----------------------------------------------------------------------------
// Règle imposée :
//   - 'faible' si PR < seuil_bas
//   - 'eleve'  si PR > seuil_haut
//   - sinon 'moyen'
//
// Par défaut, les seuils sont dynamiquement fixés sur les terciles (33.3% et 66.7%)
// de la distribution empirique de PR sur l'ensemble des scénarios du run courant.
//
// ⚠️ POUR REMPLACER PAR DES SEUILS FIXES ULTÉRIEUREMENT :
// Définir des valeurs numériques ci-dessous au lieu de null (ex: 0.85 et 1.25)
// ============================================================================
exports.FIXED_PR_SEUIL_BAS = null;
exports.FIXED_PR_SEUIL_HAUT = null;
function computePrThresholds(resilienceRows) {
    const prValues = resilienceRows
        .map(r => r.pr)
        .filter((v) => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => a - b);
    // Calcul par défaut : terciles empiriques de la distribution
    const defaultTercileBas = prValues.length > 0 ? computeQuantile(prValues, 1 / 3) : 0;
    const defaultTercileHaut = prValues.length > 0 ? computeQuantile(prValues, 2 / 3) : 0;
    const isCustomFixed = exports.FIXED_PR_SEUIL_BAS !== null && exports.FIXED_PR_SEUIL_HAUT !== null;
    const seuil_bas = exports.FIXED_PR_SEUIL_BAS !== null ? exports.FIXED_PR_SEUIL_BAS : defaultTercileBas;
    const seuil_haut = exports.FIXED_PR_SEUIL_HAUT !== null ? exports.FIXED_PR_SEUIL_HAUT : defaultTercileHaut;
    return {
        seuil_bas,
        seuil_haut,
        isCustomFixed,
        totalPrValues: prValues.length,
    };
}
exports.RB_COLUMNS_METADATA = [
    {
        name: 'scenario_id',
        label: 'Identifiant du scénario',
        category: "Structure du plan d'expérience",
        dataType: 'string',
        unitOrFormat: 'ex: SC-001',
        explanation: "Code unique identifiant chaque configuration aléatoire de réseau et d'aléa dans le générateur stochastique.",
        planImpact: "Sert de clé de partitionnement pour isoler les conditions de base du réseau et mesurer la variance stochastique à travers le plan d'expérience."
    },
    {
        name: 'branch_id',
        label: 'Branche de gestion opérationnelle',
        category: "Structure du plan d'expérience",
        dataType: 'string',
        unitOrFormat: 'none | reactif | prudent | passif',
        explanation: 'Politique de réponse managériale simulée en parallèle face au même choc (aucune réaction, intervention rapide, intervention prudente, intervention tardive).',
        planImpact: 'Facteur contrôlé permettant de mesurer rigoureusement l\'effet causal ceteris paribus (toutes choses égales par ailleurs) de la prise de décision sur la trajectoire de résilience.'
    },
    {
        name: 'n_factories',
        label: "Nombre d'usines actives",
        category: 'Structure physique du réseau',
        dataType: 'integer',
        unitOrFormat: 'usines (ex: 3)',
        explanation: 'Nombre de sites industriels alimentant le réseau logistique et expédiant des biens vers les entrepôts.',
        planImpact: 'Détermine la redondance de production amont. Un nombre réduit d\'usines concentre le risque; plus d\'usines offre des opportunités de report de charge lors d\'une panne.'
    },
    {
        name: 'n_warehouses',
        label: "Nombre d'entrepôts intermédiaires",
        category: 'Structure physique du réseau',
        dataType: 'integer',
        unitOrFormat: 'entrepôts (ex: 9)',
        explanation: 'Nombre de plates-formes logistiques de distribution recevant les flux industriels et expédiant vers le marché client final.',
        planImpact: 'Conditionne le maillage et le stock tampon intermédiaire. Un réseau plus étendu offre davantage de flexibilité de contournement mais complexifie le pilotage.'
    },
    {
        name: 'base_demand',
        label: 'Demande moyenne journalière de base',
        category: 'Conditions de marché',
        dataType: 'float',
        unitOrFormat: 'unités/jour (ex: 100)',
        explanation: 'Volume moyen journalier commandé par le marché client de référence (New York) en régime stabilisé.',
        planImpact: 'Fixe le niveau de charge et de tension moyen du réseau. Une demande élevée pousse le système proche de sa saturation avant même la survenue d\'un aléa.'
    },
    {
        name: 'important_share',
        label: 'Part des flux prioritaires',
        category: 'Conditions de marché',
        dataType: 'float',
        unitOrFormat: 'ratio [0, 1] (ex: 0.25)',
        explanation: 'Proportion de clients ou de commandes bénéficiant d\'un traitement prioritaire contractuel (SLA renforcé).',
        planImpact: 'Guide l\'arbitrage d\'allocation en situation de pénurie. Une part élevée contraint fortement les expéditions résiduelles et réduit la marge de manœuvre.'
    },
    {
        name: 'warmup_days',
        label: 'Période de chauffe (Warm-up)',
        category: 'Paramètres temporels du plan',
        dataType: 'integer',
        unitOrFormat: 'jours (ex: 30)',
        explanation: 'Nombre de jours initiaux sans aléa permettant aux flux de remplir les tuyaux de transport et de stabiliser les stocks.',
        planImpact: 'Élimine les artéfacts transitoires de démarrage de la simulation (stocks vides ou en transit initial) pour garantir que le choc frappe un régime permanent sain.'
    },
    {
        name: 'horizon_days',
        label: 'Horizon total de simulation',
        category: 'Paramètres temporels du plan',
        dataType: 'integer',
        unitOrFormat: 'jours (ex: 120)',
        explanation: 'Durée totale observée de la simulation après la période de chauffe.',
        planImpact: 'Dimensionne la fenêtre d\'observation de crise. Doit être suffisamment long pour observer le retour complet à l\'équilibre (rémission totale et fin des séquelles).'
    },
    {
        name: 'disruption_type',
        label: 'Typologie de la perturbation',
        category: 'Caractérisation du choc',
        dataType: 'string',
        unitOrFormat: 'usine | lien | entrepot | demande | congestion',
        explanation: 'Nature de l\'aléa survenu (panne de ligne d\'usine, coupure d\'axe de transport, fermeture d\'entrepôt, pic brutal de demande, engorgement général).',
        planImpact: 'Variable de cause racine permettant au réseau bayésien d\'apprendre la vulnérabilité différentielle du réseau selon la localisation du choc.'
    },
    {
        name: 'disruption_start',
        label: 'Jour de début du choc',
        category: 'Caractérisation du choc',
        dataType: 'integer',
        unitOrFormat: 'jour relatif (ex: 15)',
        explanation: 'Jour de calendrier relatif (après le warm-up) auquel la perturbation commence à impacter le réseau.',
        planImpact: 'Définit l\'origine temporelle locale (x = 0) servant de référence au modèle mathématique p(x) et au calage de la résilience.'
    },
    {
        name: 'disruption_duration',
        label: 'Durée active de la perturbation',
        category: 'Caractérisation du choc',
        dataType: 'integer',
        unitOrFormat: 'jours (ex: 10)',
        explanation: 'Nombre de jours pendant lesquels la contrainte physique reste active avant résolution technique.',
        planImpact: 'Éprouve la capacité d\'endurance du réseau : un choc court est amorti par les stocks tampons, un choc prolongé force une reconfiguration des flux.'
    },
    {
        name: 'disruption_severity',
        label: 'Sévérité du choc',
        category: 'Caractérisation du choc',
        dataType: 'float',
        unitOrFormat: 'ratio [0, 1] (ex: 0.60)',
        explanation: 'Fraction de capacité anéantie sur l\'élément touché (ex: 0.60 = 60% de débit en moins) ou facteur de surchauffe de la demande.',
        planImpact: 'Conditionne directement l\'amplitude h du creux de performance. Détermine si le choc reste superficiel ou s\'il pousse le réseau au bord de la rupture.'
    },
    {
        name: 'disruption_target',
        label: 'Cible précise de la perturbation',
        category: 'Caractérisation du choc',
        dataType: 'string',
        unitOrFormat: 'ex: Usine 1, Lien U2-E1',
        explanation: 'Composant matériel ou liaison spécifique directement visé par l\'avarie.',
        planImpact: 'Permet d\'évaluer la criticité nodale du réseau dans le plan d\'expérience (identifier les maillons faibles à haute valeur de dépendance).'
    },
    {
        name: 'management_profile',
        label: 'Profil comportemental du gestionnaire',
        category: 'Gouvernance & Profil de gestion',
        dataType: 'string',
        unitOrFormat: 'none | reactif | prudent | passif',
        explanation: 'Attitude managériale face à l\'incident : vitesse de réaction, propension au risque et seuils d\'intervention appliqués.',
        planImpact: 'Variable décisionnelle maîtresse : quantifie dans le modèle bayésien le bénéfice net d\'une cellule de crise agile par rapport à une gestion passive.'
    },
    {
        name: 'detection_threshold',
        label: "Seuil d'alerte de la cellule de veille",
        category: 'Gouvernance & Profil de gestion',
        dataType: 'float',
        unitOrFormat: 'ratio [0, 1] (ex: 0.05)',
        explanation: 'Perte de taux de service minimale déclenchant la convocation de la cellule de crise.',
        planImpact: 'Arbitrage opérationnel de surveillance : un seuil bas détecte vite les signaux faibles mais peut surréagir; un seuil haut retarde l\'action.'
    },
    {
        name: 'decision_delay_days',
        label: 'Délai administratif de décision',
        category: 'Gouvernance & Profil de gestion',
        dataType: 'integer',
        unitOrFormat: 'jours (ex: 2)',
        explanation: 'Temps nécessaire pour valider collégialement les contre-mesures et engager les budgets exceptionnels.',
        planImpact: 'Représente l\'inertie de gouvernance. Chaque jour de retard allonge le temps de convalescence d et augmente la perte cumulative IPC.'
    },
    {
        name: 'reevaluation_days',
        label: 'Période de réévaluation de crise',
        category: 'Gouvernance & Profil de gestion',
        dataType: 'integer',
        unitOrFormat: 'jours (ex: 3)',
        explanation: 'Fréquence à laquelle la cellule de crise réexamine la situation pour réajuster ou intensifier les actions.',
        planImpact: 'Pilote la flexibilité en boucle fermée. Une réévaluation régulière évite l\'enlisement si la première vague de décisions s\'avère insuffisante.'
    },
    {
        name: 'detected_day_rel',
        label: 'Jour relatif de première détection',
        category: "Historique d'exécution de crise",
        dataType: 'float',
        unitOrFormat: 'jour relatif (ex: 16.0)',
        explanation: 'Jour auquel la perte de service a dépassé le seuil d\'alerte et a été formellement enregistrée.',
        planImpact: 'Mesure la réactivité réelle du système d\'information logistique en fonction de la vitesse de propagation du choc.'
    },
    {
        name: 'reaction_lag_days',
        label: 'Retard de mise en œuvre (Lag)',
        category: "Historique d'exécution de crise",
        dataType: 'float',
        unitOrFormat: 'jours (ex: 2.3)',
        explanation: 'Délai moyen constaté entre la détection de l\'anomalie et l\'application effective des décisions sur le terrain.',
        planImpact: 'Facteur clé de dégradation : un lag opérationnel élevé est le premier responsable de l\'aggravation des ruptures de stock.'
    },
    {
        name: 'nb_decisions',
        label: 'Nombre de décisions exécutées',
        category: "Historique d'exécution de crise",
        dataType: 'integer',
        unitOrFormat: 'nombre (ex: 3)',
        explanation: 'Nombre total de mesures d\'atténuation prises tout au long de la gestion de l\'incident.',
        planImpact: 'Mesure l\'effort managérial déployé. Permet de comparer le ratio coût d\'intervention / gain de taux de service.'
    },
    {
        name: 'family_capacite_used',
        label: 'Levier d\'extension de capacité activé',
        category: 'Actions de remédiation déclenchées',
        dataType: 'binary',
        unitOrFormat: '1 (oui) ou 0 (non)',
        explanation: 'Recours aux heures supplémentaires, lignes industrielles d\'appoint ou augmentation de cadence.',
        planImpact: 'Évalue l\'efficacité de la réserve de capacité industrielle pour résorber les arriérés de commandes.'
    },
    {
        name: 'family_reroutage_used',
        label: 'Levier de reroutage des flux activé',
        category: 'Actions de remédiation déclenchées',
        dataType: 'binary',
        unitOrFormat: '1 (oui) ou 0 (non)',
        explanation: 'Contournement des axes coupés via des itinéraires routiers de substitution et des transporteurs alternatifs.',
        planImpact: 'Mesure la valeur de l\'agilité de transport et des plans de continuité logistique (PRA/PCA transport).'
    },
    {
        name: 'family_sourcing_used',
        label: 'Levier de sourcing d\'appoint activé',
        category: 'Actions de remédiation déclenchées',
        dataType: 'binary',
        unitOrFormat: '1 (oui) ou 0 (non)',
        explanation: 'Appel à des fournisseurs de secours ou réallocation des approvisionnements vers des usines partenaires.',
        planImpact: 'Vérifie l\'avantage d\'une politique de multi-sourcing pour pallier l\'indisponibilité d\'un site de production majeur.'
    },
    {
        name: 'family_demande_used',
        label: 'Levier de régulation de la demande activé',
        category: 'Actions de remédiation déclenchées',
        dataType: 'binary',
        unitOrFormat: '1 (oui) ou 0 (non)',
        explanation: 'Négociation de reports de livraison, lissage des commandes ou rationnement temporaire des volumes non critiques.',
        planImpact: 'Démontre le pouvoir protecteur de la gestion commerciale de crise pour préserver les flux des clients vitaux.'
    },
    {
        name: 'family_stock_used',
        label: 'Levier de déstockage d\'urgence activé',
        category: 'Actions de remédiation déclenchées',
        dataType: 'binary',
        unitOrFormat: '1 (oui) ou 0 (non)',
        explanation: 'Mobilisation des stocks de sécurité et transferts exceptionnels de stocks entre entrepôts.',
        planImpact: 'Illustre le rôle d\'amortisseur d\'urgence des stocks de sécurité pendant les premières journées de tension.'
    },
    {
        name: 'ip_k',
        label: 'Paramètre k (Niveau de base initial)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'taux [0, 1] (ex: 0.9850)',
        explanation: 'Niveau asymptotique de performance du réseau avant l\'apparition de la perturbation.',
        planImpact: 'Point d\'ancrage nominal : garantit que la résilience est quantifiée relativement à l\'état réel du réseau pré-crise.'
    },
    {
        name: 'ip_q',
        label: 'Paramètre q (Décalage de niveau final)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'écart [-1, 1] (ex: 0.0250)',
        explanation: 'Écart entre le niveau initial de base et le niveau stabilisé post-crise (q = k - p_final).',
        planImpact: 'Indicateur clé de séquelles permanentes (q > 0 : pertes de clients ou de cadence durables; q < 0 : antifragilité et sur-performance).'
    },
    {
        name: 'ip_h',
        label: 'Paramètre h (Amplitude de dégradation)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'amplitude [0, 1] (ex: 0.4200)',
        explanation: 'Chute maximale théorique de performance modélisée au fond du creux de crise.',
        planImpact: 'Définit le plancher de crise (creux = k - h/2 - q/2). Révèle la vulnérabilité immédiate de la supply chain face au choc.'
    },
    {
        name: 'ip_g',
        label: 'Paramètre g (Centre de la phase de descente)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'jours relatifs au choc (ex: 2.1500)',
        explanation: 'Moment où le réseau subit le taux de chute le plus violent dans le repère temporel x = t - t_choc.',
        planImpact: 'Mesure la vitesse d\'impact du choc dans le réseau (court si l\'impact est instantané, plus long si les stocks absorbent au début).'
    },
    {
        name: 'ip_d',
        label: 'Paramètre d (Écart temporel dégradation-rebond)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'jours (ex: 7.2000)',
        explanation: 'Durée de convalescence séparant le centre de la phase de chute et le centre de la phase de rebond (g + d).',
        planImpact: 'Mesure l\'endurance et la durée d\'enlisement : un d élevé indique que le réseau reste longtemps au ralenti avant de remonter.'
    },
    {
        name: 'ip_alpha',
        label: 'Paramètre alpha (Pente d\'effondrement)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'sans unité [0.5, 20] (ex: 1.8500)',
        explanation: 'Brutalité de la perte de performance lors de l\'arrivée du choc.',
        planImpact: 'Distingue les effondrements instantanés (alpha élevé) des dégradations lentes par épuisement progressif des stocks tampons.'
    },
    {
        name: 'ip_beta',
        label: 'Paramètre beta (Pente de redressement)',
        category: 'Paramètres de la fonction hyperbolique p(x)',
        dataType: 'float',
        unitOrFormat: 'sans unité [0.5, 20] (ex: 1.4500)',
        explanation: 'Vivacité de la reprise des livraisons une fois les décisions d\'atténuation actives.',
        planImpact: 'Caractérise la force de frappe opérationnelle pour rétablir les opérations normales.'
    },
    {
        name: 'fit_r2',
        label: 'Coefficient R² brut',
        category: 'Qualité statistique d\'ajustement',
        dataType: 'float',
        unitOrFormat: 'score [0, 1] (ex: 0.8650)',
        explanation: 'Qualité d\'adhérence du modèle p(x) calculée point par point contre les observations journalières brutes.',
        planImpact: 'Contrôle qualité initial du calage mathématique de la courbe.'
    },
    {
        name: 'fit_r2_smooth',
        label: 'Coefficient R² lissé (Moyenne mobile 5j)',
        category: 'Qualité statistique d\'ajustement',
        dataType: 'float',
        unitOrFormat: 'score [0, 1] (ex: 0.9420)',
        explanation: 'Mesure de conformité du modèle à la tendance de fond hebdomadaire (semaine ouvrée), débarrassée du bruit journalier.',
        planImpact: 'Métrique reine d\'acceptation : une valeur ≥ 0.90 garantit que les indicateurs de résilience sont robustes et exploitables sans risque de sur-apprentissage.'
    },
    {
        name: 'fit_rmse',
        label: 'Erreur RMSE',
        category: 'Qualité statistique d\'ajustement',
        dataType: 'float',
        unitOrFormat: 'points d\'IP (ex: 0.0310)',
        explanation: 'Écart moyen quadratique entre la courbe p(x) et le taux de service observé.',
        planImpact: 'Quantifie la marge d\'incertitude en pourcents de taux de service (ex: 0.031 = 3.1% d\'écart moyen).'
    },
    {
        name: 'IPC',
        label: 'IPC - Indice de Perte Cumulative',
        category: 'Indicateurs de Résilience (KPIs)',
        dataType: 'float',
        unitOrFormat: 'surface cumulée (jours-unités) (ex: 3.4500)',
        explanation: 'Surface totale intégrée de déficit de performance sous le niveau de référence nominal au cours de la crise.',
        planImpact: 'KPI financier et d\'exploitation numéro 1 : exprime la somme des jours-commandes non livrés et des pénalités clients encourues.'
    },
    {
        name: 'TRP',
        label: 'TRP - Temps de Récupération des Performances',
        category: 'Indicateurs de Résilience (KPIs)',
        dataType: 'float',
        unitOrFormat: 'jours (ex: 12.5000)',
        explanation: 'Délai total nécessaire pour restaurer le taux de service à 90% de son niveau nominal pré-choc.',
        planImpact: 'KPI contractuel d\'engagement de service : mesure l\'indisponibilité perçue par le client final.'
    },
    {
        name: 'CRD',
        label: 'CRD - Capacité de Résilience Dynamique',
        category: 'Indicateurs de Résilience (KPIs)',
        dataType: 'float',
        unitOrFormat: 'score sans unité (ex: 1.8200)',
        explanation: 'Rapport entre la vitesse de redressement de la courbe et la profondeur de la perte subie.',
        planImpact: 'Mesure la promptitude et l\'efficacité de la reprise : un CRD élevé signale une organisation vive capable d\'effacer rapidement les stigmates du choc.'
    },
    {
        name: 'PR',
        label: 'PR - Potentiel de Récupération',
        category: 'Indicateurs de Résilience (KPIs)',
        dataType: 'float',
        unitOrFormat: 'ratio sans unité (ex: 1.6500)',
        explanation: 'Ratio entre le niveau final de service stabilisé et le niveau minimum atteint au fond du creux de crise.',
        planImpact: 'Caractérise la dynamique de sortie de crise : démontre la capacité du réseau à s\'extraire de la zone de danger.'
    },
    {
        name: 'PR_class',
        label: 'Classe de Résilience PR (Cible Bayésienne)',
        category: 'Cible d\'Apprentissage Bayésien',
        dataType: 'category',
        unitOrFormat: 'faible | moyen | eleve',
        explanation: 'Discrétisation de l\'indicateur PR en 3 classes de performance de résilience (selon les terciles empiriques ou seuils d\'experts).',
        planImpact: 'Nœud cible principal (target variable) pour le réseau bayésien : permet de calculer les probabilités a priori et a posteriori de résilience de la supply chain.'
    }
];
/**
 * Formate un timestamp sous forme YYYYMMDD_HHmmss.
 */
function formatRbTimestamp(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}
/**
 * Génère le nom exact du fichier d'export du réseau bayésien :
 * rb_training_<seed>_<timestamp>.csv
 */
function getRbTrainingFilename(seed = 42, d = new Date()) {
    const ts = formatRbTimestamp(d);
    return `rb_training_${seed}_${ts}.csv`;
}
/**
 * Génère le nom exact du fichier du dictionnaire des variables :
 * rb_dictionary_<seed>_<timestamp>.json
 */
function getRbDictionaryFilename(seed = 42, d = new Date()) {
    const ts = formatRbTimestamp(d);
    return `rb_dictionary_${seed}_${ts}.json`;
}
/**
 * Produit le dictionnaire complet JSON décrivant pour chaque en-tête
 * l'explication métier et l'impact opérationnel sur le plan d'expérience.
 */
function generateRbDictionaryJson(dataset, resilienceRows = []) {
    const seed = dataset?.metadata?.config?.seed ?? 42;
    const thresholds = computePrThresholds(resilienceRows);
    const byHeader = {};
    for (const col of exports.RB_COLUMNS_METADATA) {
        byHeader[col.name] = col;
    }
    const output = {
        title: "Dictionnaire des variables & Métadonnées d'apprentissage - Réseau Bayésien de Résilience",
        description: "Description exhaustive et pédagogique pour chaque en-tête du fichier CSV d'entraînement (rb_training) : signification métier (logistique, transport, gestion des opérations), type de données, format/unité et impact direct sur le plan d'expérience.",
        version: "1.2.0",
        generated_at: new Date().toISOString(),
        seed: seed,
        execution_context: {
            scenarios_count: dataset?.scenarios?.length ?? 0,
            total_couples: dataset?.branches?.length
                ? dataset.branches.length
                : (dataset?.scenarios?.length ? dataset.scenarios.length * 4 : resilienceRows.length),
            warmup_days_nominal: dataset?.metadata?.config?.warmupDays ?? 30,
            horizon_days_nominal: dataset?.metadata?.config?.horizonDays ?? 120,
            pr_thresholds: {
                seuil_bas: Number(thresholds.seuil_bas.toFixed(4)),
                seuil_haut: Number(thresholds.seuil_haut.toFixed(4)),
                type: thresholds.isCustomFixed ? "seuils_fixes_expert" : "terciles_empiriques_du_run",
                classification_rule: "faible si PR < seuil_bas, eleve si PR > seuil_haut, sinon moyen",
            },
        },
        total_columns: exports.RB_COLUMNS_METADATA.length,
        columns: exports.RB_COLUMNS_METADATA.map(col => ({
            ...col,
            sample_value: col.name === 'warmup_days' ? (dataset?.metadata?.config?.warmupDays ?? 30)
                : col.name === 'horizon_days' ? (dataset?.metadata?.config?.horizonDays ?? 120)
                    : col.name === 'base_demand' ? (dataset?.scenarios?.[0]?.base_demand ?? 100)
                        : undefined,
        })),
        by_header: byHeader,
    };
    return JSON.stringify(output, null, 2);
}
function escapeCsvValue(val) {
    if (val === null || val === undefined)
        return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Produit le fichier CSV agrégé complet (40 colonnes) pour l'apprentissage du réseau bayésien.
 * Respecte rigoureusement l'ordre des colonnes et la gestion des données manquantes (cellule vide).
 */
function generateRbTrainingCsv(dataset, resilienceRows = []) {
    // 1. Détermination ordonnée de tous les couples (scenario_id, branch_id)
    const coupleMap = new Map();
    if (dataset?.branches && dataset.branches.length > 0) {
        for (const b of dataset.branches) {
            const key = `${b.scenario_id}\u0001${b.branch_id}`;
            if (!coupleMap.has(key)) {
                coupleMap.set(key, { scenario_id: b.scenario_id, branch_id: b.branch_id });
            }
        }
    }
    else if (dataset?.scenarios && dataset.scenarios.length > 0) {
        for (const sc of dataset.scenarios) {
            for (const bId of bloc1Types_1.BRANCH_IDS) {
                const key = `${sc.scenario_id}\u0001${bId}`;
                if (!coupleMap.has(key)) {
                    coupleMap.set(key, { scenario_id: sc.scenario_id, branch_id: bId });
                }
            }
        }
    }
    // Ajout d'éventuels couples présents dans resilienceRows
    for (const r of resilienceRows) {
        const key = `${r.scenario_id}\u0001${r.branch_id}`;
        if (!coupleMap.has(key)) {
            coupleMap.set(key, { scenario_id: r.scenario_id, branch_id: r.branch_id });
        }
    }
    const couples = Array.from(coupleMap.values());
    // 2. Indexation rapide pour les jointures
    const scenariosMap = new Map();
    if (dataset?.scenarios) {
        for (const sc of dataset.scenarios) {
            scenariosMap.set(sc.scenario_id, sc);
        }
    }
    const perturbationsMap = new Map();
    if (dataset?.perturbations) {
        for (const pt of dataset.perturbations) {
            perturbationsMap.set(pt.scenario_id, pt);
        }
    }
    const branchesMap = new Map();
    if (dataset?.branches) {
        for (const br of dataset.branches) {
            branchesMap.set(`${br.scenario_id}\u0001${br.branch_id}`, br);
        }
    }
    const decisionsMap = new Map();
    if (dataset?.decisions) {
        for (const dec of dataset.decisions) {
            const key = `${dec.scenario_id}\u0001${dec.branch_id}`;
            let list = decisionsMap.get(key);
            if (!list) {
                list = [];
                decisionsMap.set(key, list);
            }
            list.push(dec);
        }
    }
    const resilienceMap = new Map();
    for (const r of resilienceRows) {
        resilienceMap.set(`${r.scenario_id}\u0001${r.branch_id}`, r);
    }
    // Profils issus de metadata.json
    const metadataProfiles = dataset?.metadata?.config?.params?.profiles;
    // 3. Calcul des seuils pour PR_class
    const { seuil_bas, seuil_haut } = computePrThresholds(resilienceRows);
    // 4. Construction ligne par ligne
    const lines = couples.map(couple => {
        const { scenario_id, branch_id } = couple;
        const coupleKey = `${scenario_id}\u0001${branch_id}`;
        // Jointure scenarios.csv
        const sc = scenariosMap.get(scenario_id);
        const n_factories = sc ? String(sc.n_factories) : '';
        const n_warehouses = sc ? String(sc.n_warehouses) : '';
        const base_demand = sc
            ? (Number.isInteger(sc.base_demand) ? String(sc.base_demand) : sc.base_demand.toFixed(4))
            : '';
        const important_share = sc
            ? (Number.isInteger(sc.important_share) ? String(sc.important_share) : sc.important_share.toFixed(4))
            : '';
        const warmup_days = sc ? String(sc.warmup_days) : '';
        const horizon_days = sc ? String(sc.horizon_days) : '';
        // Jointure perturbations.csv
        // Si un scénario n'a aucune ligne dans perturbations.csv, laisser ces cinq colonnes vides
        const pt = perturbationsMap.get(scenario_id);
        const disruption_type = pt ? pt.type : '';
        const disruption_start = pt && pt.start !== undefined ? String(pt.start) : '';
        const disruption_duration = pt && pt.duration !== undefined ? String(pt.duration) : '';
        const disruption_severity = pt && pt.severity !== undefined
            ? (Number.isInteger(pt.severity) ? String(pt.severity) : pt.severity.toFixed(4))
            : '';
        const disruption_target = pt ? pt.target : '';
        // management_profile est branch_id lui-même
        const management_profile = branch_id;
        // metadata.json : config.params.profiles.<management_profile>
        const prof = metadataProfiles ? metadataProfiles[branch_id] : undefined;
        const detection_threshold = prof && prof.detectionThreshold !== undefined
            ? (Number.isInteger(prof.detectionThreshold) ? String(prof.detectionThreshold) : prof.detectionThreshold.toFixed(4))
            : '';
        const decision_delay_days = prof && prof.decisionDelayDays !== undefined
            ? String(prof.decisionDelayDays)
            : '';
        const reevaluation_days = prof && prof.reevaluationDays !== undefined
            ? String(prof.reevaluationDays)
            : '';
        // decisions.csv
        const coupleDecisions = decisionsMap.get(coupleKey) || [];
        // detected_day_rel : plus petite valeur (première détection) ou vide
        let detected_day_rel = '';
        if (coupleDecisions.length > 0) {
            const minDetected = Math.min(...coupleDecisions.map(d => d.detected_day_rel));
            detected_day_rel = Number.isInteger(minDetected) ? String(minDetected) : minDetected.toFixed(4);
        }
        // reaction_lag_days : moyenne de (day_rel - detected_day_rel) ou vide
        let reaction_lag_days = '';
        if (coupleDecisions.length > 0) {
            const lags = coupleDecisions.map(d => d.day_rel - d.detected_day_rel);
            const avgLag = lags.reduce((sum, v) => sum + v, 0) / lags.length;
            reaction_lag_days = Number.isInteger(avgLag) ? String(avgLag) : avgLag.toFixed(4);
        }
        // nb_decisions : depuis branches.csv
        const br = branchesMap.get(coupleKey);
        const nb_decisions = br && br.nb_decisions !== undefined ? String(br.nb_decisions) : '';
        // 5 familles de décisions booléennes (1 ou 0)
        const family_capacite_used = coupleDecisions.some(d => d.family === 'capacite') ? '1' : '0';
        const family_reroutage_used = coupleDecisions.some(d => d.family === 'reroutage') ? '1' : '0';
        const family_sourcing_used = coupleDecisions.some(d => d.family === 'sourcing') ? '1' : '0';
        const family_demande_used = coupleDecisions.some(d => d.family === 'demande') ? '1' : '0';
        const family_stock_used = coupleDecisions.some(d => d.family === 'stock') ? '1' : '0';
        // resilience_ip.csv : k, q, h, g, d, alpha, beta, r2, r2_smooth, rmse, IPC, TRP, CRD, PR
        // (SRA et ERR exclus)
        const res = resilienceMap.get(coupleKey);
        const ip_k = res ? res.k.toFixed(4) : '';
        const ip_q = res ? res.q.toFixed(4) : '';
        const ip_h = res ? res.h.toFixed(4) : '';
        const ip_g = res ? res.g.toFixed(4) : '';
        const ip_d = res ? res.d.toFixed(4) : '';
        const ip_alpha = res ? res.alpha.toFixed(4) : '';
        const ip_beta = res ? res.beta.toFixed(4) : '';
        const fit_r2 = res ? res.r2.toFixed(4) : '';
        const fit_r2_smooth = res ? (res.r2_smooth ?? res.r2).toFixed(4) : '';
        const fit_rmse = res ? res.rmse.toFixed(4) : '';
        const IPC = res ? res.ipc.toFixed(4) : '';
        const TRP = res ? res.trp.toFixed(4) : '';
        const CRD = res ? res.crd.toFixed(4) : '';
        const PR = res ? res.pr.toFixed(4) : '';
        // PR_class : discrétisation
        let PR_class = '';
        if (res && typeof res.pr === 'number' && !isNaN(res.pr)) {
            if (res.pr < seuil_bas) {
                PR_class = 'faible';
            }
            else if (res.pr > seuil_haut) {
                PR_class = 'eleve';
            }
            else {
                PR_class = 'moyen';
            }
        }
        const rowValues = [
            scenario_id,
            branch_id,
            n_factories,
            n_warehouses,
            base_demand,
            important_share,
            warmup_days,
            horizon_days,
            disruption_type,
            disruption_start,
            disruption_duration,
            disruption_severity,
            disruption_target,
            management_profile,
            detection_threshold,
            decision_delay_days,
            reevaluation_days,
            detected_day_rel,
            reaction_lag_days,
            nb_decisions,
            family_capacite_used,
            family_reroutage_used,
            family_sourcing_used,
            family_demande_used,
            family_stock_used,
            ip_k,
            ip_q,
            ip_h,
            ip_g,
            ip_d,
            ip_alpha,
            ip_beta,
            fit_r2,
            fit_r2_smooth,
            fit_rmse,
            IPC,
            TRP,
            CRD,
            PR,
            PR_class,
        ];
        return rowValues.map(escapeCsvValue).join(',');
    });
    return [exports.RB_TRAINING_HEADER, ...lines].join('\n');
}
// ============================================================================
// GESTION DU PROCESSUS DE SIMULATION COMPLET (Sauvegarde & Réimportation)
// Bundle complet : configuration, paramètres, chocs, structure & résultats
// ============================================================================
function createSimulationProcessBundle(dataset, resilienceRows = [], resilienceCsv = '', customName) {
    if (!dataset && resilienceRows.length === 0)
        return null;
    const config = dataset?.metadata?.config || {
        nScenarios: dataset?.scenarios?.length || 0,
        seed: 42,
        warmupDays: 10,
        horizonDays: 60,
        disruptionTypes: exports.DEFAULT_DISRUPTION_TYPES,
        params: bloc1DefaultParams_1.DEFAULT_MODEL_PARAMS,
    };
    const nSc = config.nScenarios || dataset?.scenarios?.length || 0;
    const totalDays = (config.warmupDays ?? 10) + (config.horizonDays ?? 60);
    const nPts = dataset?.ipTimeseries?.length || (nSc * 4 * totalDays);
    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
    const validR2 = resilienceRows.map(r => r.r2).filter(v => typeof v === 'number' && !isNaN(v));
    const avgR2 = validR2.length > 0 ? validR2.reduce((s, v) => s + v, 0) / validR2.length : undefined;
    const validPR = resilienceRows.map(r => r.pr).filter(v => typeof v === 'number' && !isNaN(v));
    const avgPR = validPR.length > 0 ? validPR.reduce((s, v) => s + v, 0) / validPR.length : undefined;
    const processId = `process_${scPtsTag}_${config.seed}_${Date.now()}`;
    const defaultName = `Plan d'expérience ${scPtsTag} [seed: ${config.seed}] - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const bundle = {
        id: processId,
        name: customName && customName.trim() ? customName.trim() : defaultName,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        summary: {
            nScenarios: nSc,
            nPoints: nPts,
            seed: config.seed,
            warmupDays: config.warmupDays,
            horizonDays: config.horizonDays,
            disruptionTypes: config.disruptionTypes,
            nBranches: dataset?.branches?.length || 0,
            nDecisions: dataset?.decisions?.length || 0,
            nResilienceRows: resilienceRows.length,
            avgR2,
            avgPR,
        },
        config,
        compactDataset: dataset ? {
            scenarios: dataset.scenarios,
            perturbations: dataset.perturbations,
            decisions: dataset.decisions,
            branches: dataset.branches,
            metadata: dataset.metadata,
        } : undefined,
        resilienceRows: resilienceRows.length > 0 ? resilienceRows : undefined,
        resilienceCsv: resilienceCsv || undefined,
    };
    return bundle;
}
function simulationProcessToJson(bundle) {
    return JSON.stringify(bundle, null, 2);
}
function parseSimulationProcessBundle(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Format de fichier de processus invalide.');
    }
    if (!parsed.config && !parsed.compactDataset && !parsed.resilienceRows) {
        throw new Error('Le fichier ne contient ni configuration ni résultats de simulation valides.');
    }
    return parsed;
}
function restoreSimulationProcess(bundle) {
    let dataset;
    if (bundle.config) {
        // Reconstitution déterministe intégrale avec toutes les séries temporelles
        dataset = generateExperimentPlan(bundle.config);
    }
    else if (bundle.compactDataset) {
        dataset = {
            scenarios: bundle.compactDataset.scenarios || [],
            perturbations: bundle.compactDataset.perturbations || [],
            decisions: bundle.compactDataset.decisions || [],
            ipTimeseries: [],
            branches: bundle.compactDataset.branches || [],
            metadata: bundle.compactDataset.metadata || {
                generator: 'isomorph-reborn-bloc1',
                version: '1.1.0',
                generated_at: bundle.createdAt,
                config: bundle.config,
            },
        };
    }
    else {
        throw new Error('Configuration du plan d\'expériences introuvable dans le processus.');
    }
    const resilienceRows = bundle.resilienceRows || [];
    let resilienceCsv = bundle.resilienceCsv || '';
    if (!resilienceCsv && resilienceRows.length > 0) {
        const header = 'scenario_id,branch_id,k,q,h,g,d,alpha,beta,r2,rmse,r2_smooth,IPC,CRD,TRP,SRA,ERR,PR';
        const lines = resilienceRows.map(r => [
            r.scenario_id, r.branch_id,
            r.k.toFixed(4), r.q.toFixed(4), r.h.toFixed(4), r.g.toFixed(4), r.d.toFixed(4),
            r.alpha.toFixed(4), r.beta.toFixed(4),
            r.r2.toFixed(4), r.rmse.toFixed(4), (r.r2_smooth ?? r.r2).toFixed(4),
            r.ipc.toFixed(4), r.crd.toFixed(4), r.trp.toFixed(4), r.sra.toFixed(4), r.err.toFixed(4), r.pr.toFixed(4)
        ].join(','));
        resilienceCsv = [header, ...lines].join('\n');
    }
    return {
        dataset,
        resilienceRows,
        resilienceCsv,
        params: bundle.config?.params,
    };
}
