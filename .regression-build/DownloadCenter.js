"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const jszip_1 = __importDefault(require("jszip"));
const auth_1 = require("firebase/auth");
const firebase_1 = require("./firebase");
const bloc1ExperimentPlan_1 = require("./bloc1ExperimentPlan");
const bloc1NetworkFormat_1 = require("./bloc1NetworkFormat");
const bloc1NetworkSelection_1 = require("./bloc1NetworkSelection");
const DownloadCenter = ({ dataset, resilienceRows, resilienceCsv, onGoToGenerator, onGoToBatch, onRestoreProcess, }) => {
    const [previewFile, setPreviewFile] = (0, react_1.useState)(null);
    const [downloadingAll, setDownloadingAll] = (0, react_1.useState)(false);
    const [downloadFeedback, setDownloadFeedback] = (0, react_1.useState)(null);
    // État pour la gestion des processus de simulation (Cloud Google & local)
    const [user, setUser] = (0, react_1.useState)(null);
    const [cloudProcesses, setCloudProcesses] = (0, react_1.useState)([]);
    const [loadingCloudProcesses, setLoadingCloudProcesses] = (0, react_1.useState)(false);
    const [savingProcessCloud, setSavingProcessCloud] = (0, react_1.useState)(false);
    const [processCustomName, setProcessCustomName] = (0, react_1.useState)('');
    const [processActionFeedback, setProcessActionFeedback] = (0, react_1.useState)(null);
    const [isLoggingIn, setIsLoggingIn] = (0, react_1.useState)(false);
    const [isProcessSectionOpen, setIsProcessSectionOpen] = (0, react_1.useState)(false);
    const fileInputRef = (0, react_1.useRef)(null);
    // Synchronisation de l'authentification Google et chargement des processus Cloud
    (0, react_1.useEffect)(() => {
        const unsubscribe = (0, auth_1.onAuthStateChanged)(firebase_1.auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await loadCloudProcesses(currentUser.uid);
            }
            else {
                setCloudProcesses([]);
            }
        });
        return () => unsubscribe();
    }, []);
    const loadCloudProcesses = async (uid) => {
        setLoadingCloudProcesses(true);
        try {
            const list = await (0, firebase_1.fetchSimulationProcessesFromCloud)(uid);
            setCloudProcesses(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
        }
        catch (err) {
            console.error('Erreur chargement processus cloud:', err);
        }
        finally {
            setLoadingCloudProcesses(false);
        }
    };
    const currentSeed = dataset?.metadata?.config?.seed ?? 42;
    const canExportRb = !!dataset || resilienceRows.length > 0;
    const totalCouples = dataset?.branches?.length
        ? dataset.branches.length
        : (dataset?.scenarios?.length ? dataset.scenarios.length * 4 : resilienceRows.length);
    const rbThresholds = (0, bloc1ExperimentPlan_1.computePrThresholds)(resilienceRows);
    // Définition exhaustive des fichiers du pipeline
    const networkInfo = (0, bloc1NetworkSelection_1.datasetNetworkInfo)(dataset);
    const files = [
        {
            id: 'resilience_ip',
            name: 'resilience_ip.csv',
            type: 'csv',
            category: 'Bloc 2 (Ajustement & KPIs)',
            description: 'Paramètres du modèle calibrés (k, q, h, g, d, α, β), qualité d\'ajustement robuste (R², RMSE, R²_smooth) et les 6 indicateurs de résilience (CRD, IPC, TRP, SRA, ERR, PR).',
            rowsCount: resilienceRows.length,
            columnsCount: 18,
            columnsList: ['scenario_id', 'branch_id', 'k', 'q', 'h', 'g', 'd', 'alpha', 'beta', 'r2', 'rmse', 'r2_smooth', 'ipc', 'crd', 'trp', 'sra', 'err', 'pr'],
            getContent: () => resilienceCsv,
            isReady: resilienceRows.length > 0 && resilienceCsv.length > 0,
            readyMessage: `${resilienceRows.length} courbes ajustées avec métriques robustes et 6 KPIs`,
            notReadyMessage: 'En attente de l\'ajustement par lot (Bloc 2)',
        },
        {
            id: 'ip_timeseries',
            name: 'ip_timeseries.csv',
            type: 'csv',
            category: 'Bloc 1 (Générateur)',
            description: 'Trajectoires complètes de l\'Indice de Performance IP(t) jour après jour pour les 4 branches de chaque scénario simulé. Même structure avec ou sans mode temporel ; seules les valeurs d\'IP diffèrent.',
            rowsCount: dataset?.ipTimeseries.length,
            columnsCount: 4,
            columnsList: ['scenario_id', 'branch_id', 'day_rel', 'ip'],
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.ipTimeseriesToCsv)(dataset) : '',
            isReady: !!dataset && dataset.ipTimeseries.length > 0,
            readyMessage: `${dataset?.ipTimeseries.length ?? 0} points d'IP journaliers`,
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'perturbations',
            name: 'perturbations.csv',
            type: 'csv',
            category: 'Bloc 1 (Générateur)',
            description: 'Caractéristiques de la perturbation injectée pour chaque scénario : type de choc, cible, jour de début, durée et intensité.',
            rowsCount: dataset?.perturbations.length,
            columnsCount: 6,
            columnsList: ['scenario_id', 'type', 'start', 'duration', 'severity', 'target'],
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.perturbationsToCsv)(dataset) : '',
            isReady: !!dataset && dataset.perturbations.length > 0,
            readyMessage: `${dataset?.perturbations.length ?? 0} perturbations injectées`,
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'scenarios',
            name: 'scenarios.csv',
            type: 'csv',
            category: 'Bloc 1 (Générateur)',
            description: "Paramètres structurels du réseau logistique tirés au sort pour chaque scénario (usines, entrepôts, demande, horizon), plus l'identité et la taille du réseau utilisé (network_id, n_nodes, n_edges, n_echelons).",
            rowsCount: dataset?.scenarios.length,
            columnsCount: 11,
            columnsList: [
                'scenario_id', 'n_factories', 'n_warehouses', 'base_demand', 'important_share', 'warmup_days', 'horizon_days',
                'network_id', 'n_nodes', 'n_edges', 'n_echelons',
            ],
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.scenariosToCsv)(dataset) : '',
            isReady: !!dataset && dataset.scenarios.length > 0,
            readyMessage: `${dataset?.scenarios.length ?? 0} configurations de réseau`,
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'reseau',
            name: networkInfo.fileName,
            type: 'json',
            category: 'Bloc 1 (Générateur)',
            description: networkInfo.kind === 'explicite'
                ? `Réseau explicite utilisé pour ce plan (${networkInfo.label}), au format isomorph-reborn-network : nœuds, arcs et capacités tels que définis dans le fichier (plages incluses).`
                : "Le plan utilise le réseau par défaut (paramétrique) : les capacités sont tirées à chaque scénario, il n'y a donc pas de fichier réseau unique à télécharger ici. Utilisez « Exporter l'instance (JSON) » dans la section Réseau de l'onglet Générateur pour obtenir le réseau d'un scénario précis.",
            columnsCount: 1,
            getContent: () => networkInfo.document ? (0, bloc1NetworkFormat_1.networkDocumentToJson)(networkInfo.document) : '',
            isReady: networkInfo.document !== null,
            readyMessage: networkInfo.kind === 'explicite' ? `Réseau « ${networkInfo.label} »` : 'Réseau par défaut (aucun fichier unique)',
            notReadyMessage: dataset ? 'Réseau par défaut : rien à télécharger ici (voir la description)' : 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'decisions',
            name: 'decisions.csv',
            type: 'csv',
            category: 'Bloc 1 (Générateur)',
            description: 'Historique des décisions de gestion déclenchées au fil de l\'eau (D1 à D9, famille, jour de détection, jour d\'application).',
            rowsCount: dataset?.decisions.length,
            columnsCount: 6,
            columnsList: ['scenario_id', 'branch_id', 'decision_id', 'family', 'day_rel', 'detected_day_rel'],
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.decisionsToCsv)(dataset) : '',
            isReady: !!dataset && dataset.decisions.length > 0,
            readyMessage: `${dataset?.decisions.length ?? 0} décisions prises`,
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'branches',
            name: 'branches.csv',
            type: 'csv',
            category: 'Bloc 1 (Générateur)',
            description: 'Synthèse comparative par branche : niveau d\'IP minimum, surface de performance perdue, nombre de décisions et rémission.',
            rowsCount: dataset?.branches.length,
            columnsCount: 7,
            columnsList: ['scenario_id', 'branch_id', 'ip_min', 'day_of_ip_min', 'area_lost', 'nb_decisions', 'recovery_day'],
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.branchesToCsv)(dataset) : '',
            isReady: !!dataset && dataset.branches.length > 0,
            readyMessage: `${dataset?.branches.length ?? 0} résumés de branches`,
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'metadata',
            name: 'metadata.json',
            type: 'json',
            category: 'Bloc 1 (Générateur)',
            description: 'Fichier structuré JSON contenant les métadonnées complètes, la version du générateur, l\'horodatage et les paramètres du plan, y compris les réglages du mode temporel (params.temporal) : absents ou désactivés, le plan a été calculé sans délai ni stock.',
            columnsCount: 1,
            getContent: () => dataset ? (0, bloc1ExperimentPlan_1.metadataToJson)(dataset) : '',
            isReady: !!dataset,
            readyMessage: 'Métadonnées et configuration du plan d\'expériences',
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
        {
            id: 'rb_dictionary',
            name: 'rb_dictionary.json',
            type: 'json',
            category: 'Bloc 2 (Ajustement & KPIs)',
            description: 'Dictionnaire sémantique des 40 en-têtes du Réseau Bayésien : explications métier pour chaque variable (logistique, transport, gestion) et impacts directs sur le plan d\'expérience.',
            columnsCount: 1,
            rowsCount: 40,
            getContent: () => (0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, resilienceRows),
            isReady: canExportRb,
            readyMessage: 'Dictionnaire des 40 variables disponible en JSON',
            notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
        },
    ];
    const readyFiles = files.filter(f => f.isReady);
    const handleDownloadRbTraining = () => {
        if (!canExportRb)
            return;
        const fileName = (0, bloc1ExperimentPlan_1.getRbTrainingFilename)(currentSeed);
        const content = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dataset, resilienceRows);
        (0, bloc1ExperimentPlan_1.downloadTextFile)(fileName, content, 'text/csv;charset=utf-8;');
        setDownloadFeedback(`✅ Export Réseau Bayésien généré et téléchargé : ${fileName}`);
        setTimeout(() => setDownloadFeedback(null), 4000);
    };
    const handleDownloadRbDictionary = () => {
        if (!canExportRb)
            return;
        const fileName = (0, bloc1ExperimentPlan_1.getRbDictionaryFilename)(currentSeed);
        const content = (0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, resilienceRows);
        (0, bloc1ExperimentPlan_1.downloadTextFile)(fileName, content, 'application/json;charset=utf-8;');
        setDownloadFeedback(`✅ Dictionnaire JSON généré et téléchargé : ${fileName}`);
        setTimeout(() => setDownloadFeedback(null), 4000);
    };
    const handlePreviewRbDictionary = () => {
        if (!canExportRb)
            return;
        const fileName = (0, bloc1ExperimentPlan_1.getRbDictionaryFilename)(currentSeed);
        setPreviewFile({
            id: 'rb_dictionary',
            name: fileName,
            type: 'json',
            category: 'Bloc 2 (Ajustement & KPIs)',
            description: 'Dictionnaire sémantique des 40 en-têtes du Réseau Bayésien : explications métier détaillées et impacts sur le plan d\'expérience.',
            rowsCount: 40,
            columnsCount: 1,
            columnsList: ['header', 'label', 'category', 'data_type', 'unit_or_format', 'explanation', 'plan_impact'],
            getContent: () => (0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, resilienceRows),
            isReady: true,
            readyMessage: '40 en-têtes documentées pour les spécialistes logistiques et opérations',
        });
    };
    const handlePreviewRbTraining = () => {
        if (!canExportRb)
            return;
        const fileName = (0, bloc1ExperimentPlan_1.getRbTrainingFilename)(currentSeed);
        setPreviewFile({
            id: 'rb_training',
            name: fileName,
            type: 'csv',
            category: 'Bloc 2 (Ajustement & KPIs)',
            description: 'Export consolidé 40 colonnes prêt pour l\'apprentissage d\'un Réseau Bayésien (scénarios, perturbations, profils metadata, historique décisions, métriques d\'ajustement, KPIs et discrétisation PR_class).',
            rowsCount: totalCouples,
            columnsCount: 40,
            columnsList: bloc1ExperimentPlan_1.RB_TRAINING_HEADER.split(','),
            getContent: () => (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dataset, resilienceRows),
            isReady: true,
            readyMessage: `${totalCouples} couples (scénario, branche) avec 40 colonnes jointes`,
        });
    };
    const handleDownloadSingle = (file) => {
        const content = file.getContent();
        if (!content)
            return;
        const mime = file.type === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
        (0, bloc1ExperimentPlan_1.downloadTextFile)(file.name, content, mime);
        setDownloadFeedback(`Téléchargement lancé : ${file.name}`);
        setTimeout(() => setDownloadFeedback(null), 3000);
    };
    const handleDownloadAll = async () => {
        if (readyFiles.length === 0 && !canExportRb)
            return;
        setDownloadingAll(true);
        setDownloadFeedback('Génération de l\'archive ZIP complète en cours (fichiers de simulation, indicateurs & Réseau Bayésien)...');
        try {
            const zip = new jszip_1.default();
            // 1. Ajouter tous les fichiers disponibles et prêts
            for (const file of readyFiles) {
                const content = file.getContent();
                if (content && content.length > 0) {
                    zip.file(file.name, content);
                }
            }
            // 2. Ajouter l'export Réseau Bayésien (RB training CSV) si possible
            if (canExportRb) {
                const rbFileName = (0, bloc1ExperimentPlan_1.getRbTrainingFilename)(currentSeed);
                const rbCsvContent = (0, bloc1ExperimentPlan_1.generateRbTrainingCsv)(dataset, resilienceRows);
                if (rbCsvContent && rbCsvContent.length > 0) {
                    zip.file(rbFileName, rbCsvContent);
                }
                // 3. Ajouter le dictionnaire Réseau Bayésien (RB dictionary JSON)
                const dictFileName = (0, bloc1ExperimentPlan_1.getRbDictionaryFilename)(currentSeed);
                const dictJsonContent = (0, bloc1ExperimentPlan_1.generateRbDictionaryJson)(dataset, resilienceRows);
                if (dictJsonContent && dictJsonContent.length > 0) {
                    zip.file(dictFileName, dictJsonContent);
                }
            }
            // 4. Ajouter le bundle du plan d'expérience structuré complet
            if (dataset || resilienceRows.length > 0) {
                const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dataset, resilienceRows, resilienceCsv, processCustomName);
                if (bundle) {
                    const bundleJson = (0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle);
                    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
                    const nSc = bundle.summary.nScenarios || dataset?.scenarios?.length || 0;
                    const totalDays = (bundle.summary.warmupDays ?? 10) + (bundle.summary.horizonDays ?? 60);
                    const nPts = dataset?.ipTimeseries?.length || bundle.summary?.nPoints || (nSc * 4 * totalDays);
                    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
                    zip.file(`plan_experience_${scPtsTag}_seed${bundle.summary.seed}_${ts}.json`, bundleJson);
                }
            }
            // Générer l'archive ZIP binaire
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });
            // Déclencher le téléchargement du fichier ZIP unique
            const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
            const zipFileName = `simulation_bundle_isomorph_seed${currentSeed}_${ts}.zip`;
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setDownloadFeedback(`✅ Archive ZIP complète téléchargée avec succès (${zipFileName}) comprenant tous les CSV/JSON et l'export Réseau Bayésien !`);
            setTimeout(() => setDownloadFeedback(null), 5000);
        }
        catch (err) {
            console.error('Erreur lors de la génération du ZIP:', err);
            setDownloadFeedback(`❌ Erreur lors de la création de l'archive ZIP: ${err?.message || 'Erreur inattendue'}`);
            setTimeout(() => setDownloadFeedback(null), 5000);
        }
        finally {
            setDownloadingAll(false);
        }
    };
    // Actions sur les plans d'expérience
    const canSaveOrExportProcess = !!dataset || resilienceRows.length > 0;
    const handleExportProcessJson = () => {
        const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dataset, resilienceRows, resilienceCsv, processCustomName);
        if (!bundle) {
            setProcessActionFeedback({ type: 'error', message: 'Aucun plan d\'expérience actif à exporter (générez d\'abord des scénarios).' });
            setTimeout(() => setProcessActionFeedback(null), 4000);
            return;
        }
        const jsonStr = (0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle);
        const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const nSc = bundle.summary.nScenarios || dataset?.scenarios?.length || 0;
        const totalDays = (bundle.summary.warmupDays ?? 10) + (bundle.summary.horizonDays ?? 60);
        const nPts = dataset?.ipTimeseries?.length || bundle.summary?.nPoints || (nSc * 4 * totalDays);
        const scPtsTag = `${nSc}Sc-${nPts}Pts`;
        const fileName = `plan_experience_${scPtsTag}_${bundle.summary.seed}_${ts}.json`;
        (0, bloc1ExperimentPlan_1.downloadTextFile)(fileName, jsonStr, 'application/json');
        setProcessActionFeedback({
            type: 'success',
            message: `Plan d'expérience "${bundle.name}" exporté avec succès (${fileName}).`
        });
        setTimeout(() => setProcessActionFeedback(null), 4500);
    };
    const handleTriggerImport = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                const bundle = (0, bloc1ExperimentPlan_1.parseSimulationProcessBundle)(text);
                const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)(bundle);
                if (onRestoreProcess) {
                    onRestoreProcess(restored);
                }
                setProcessActionFeedback({
                    type: 'success',
                    message: `✅ Plan d'expérience "${bundle.name}" importé et restauré avec succès (${restored.dataset.scenarios.length} scénarios, ${restored.resilienceRows.length} courbes ajustées) !`
                });
                setTimeout(() => setProcessActionFeedback(null), 5000);
            }
            catch (err) {
                setProcessActionFeedback({
                    type: 'error',
                    message: err?.message || 'Erreur lors de la lecture du fichier de plan d\'expérience JSON.'
                });
                setTimeout(() => setProcessActionFeedback(null), 5000);
            }
        };
        reader.readAsText(file);
    };
    const handleGoogleLogin = async () => {
        if (isLoggingIn)
            return;
        setIsLoggingIn(true);
        try {
            const loggedUser = await (0, firebase_1.signInWithGoogle)();
            if (loggedUser) {
                setUser(loggedUser);
                await loadCloudProcesses(loggedUser.uid);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    const handleSaveProcessCloud = async () => {
        if (!user) {
            await handleGoogleLogin();
            return;
        }
        const bundle = (0, bloc1ExperimentPlan_1.createSimulationProcessBundle)(dataset, resilienceRows, resilienceCsv, processCustomName);
        if (!bundle) {
            setProcessActionFeedback({ type: 'error', message: 'Aucun plan d\'expérience actif à sauvegarder (générez d\'abord des scénarios).' });
            setTimeout(() => setProcessActionFeedback(null), 4000);
            return;
        }
        setSavingProcessCloud(true);
        try {
            await (0, firebase_1.saveSimulationProcessToCloud)(user.uid, bundle);
            await loadCloudProcesses(user.uid);
            setProcessCustomName('');
            setProcessActionFeedback({
                type: 'success',
                message: `☁️ Plan d'expérience "${bundle.name}" enregistré dans votre Cloud Google !`
            });
            setTimeout(() => setProcessActionFeedback(null), 4000);
        }
        catch (err) {
            // Un document trop volumineux pour Firestore porte un message explicite
            // (voir bloc1FirestoreLimits.ts) : on l'affiche tel quel plutôt qu'un
            // message générique, pour que l'utilisateur comprenne la cause.
            setProcessActionFeedback({
                type: 'error',
                message: err?.name === 'FirestoreDocumentTooLargeError'
                    ? err.message
                    : 'Erreur lors de la sauvegarde du plan d\'expérience dans le Cloud.'
            });
            setTimeout(() => setProcessActionFeedback(null), 4000);
        }
        finally {
            setSavingProcessCloud(false);
        }
    };
    const handleLoadCloudProcess = (bundle) => {
        try {
            const restored = (0, bloc1ExperimentPlan_1.restoreSimulationProcess)(bundle);
            if (onRestoreProcess) {
                onRestoreProcess(restored);
            }
            setProcessActionFeedback({
                type: 'success',
                message: `✅ Plan d'expérience Cloud "${bundle.name}" restauré dans l'application (${restored.dataset.scenarios.length} scénarios, ${restored.resilienceRows.length} courbes ajustées) !`
            });
            setTimeout(() => setProcessActionFeedback(null), 5000);
        }
        catch (err) {
            setProcessActionFeedback({
                type: 'error',
                message: err?.message || 'Erreur lors de la restauration du plan d\'expérience Cloud.'
            });
            setTimeout(() => setProcessActionFeedback(null), 5000);
        }
    };
    const handleDeleteCloudProcess = async (processId, processName) => {
        if (!user)
            return;
        if (!confirm(`Supprimer définitivement le plan d'expérience "${processName}" de votre Cloud Google ?`))
            return;
        try {
            await (0, firebase_1.deleteSimulationProcessFromCloud)(user.uid, processId);
            await loadCloudProcesses(user.uid);
            setProcessActionFeedback({
                type: 'success',
                message: `Plan d'expérience "${processName}" supprimé du Cloud.`
            });
            setTimeout(() => setProcessActionFeedback(null), 3000);
        }
        catch (err) {
            setProcessActionFeedback({
                type: 'error',
                message: 'Erreur lors de la suppression du plan d\'expérience.'
            });
            setTimeout(() => setProcessActionFeedback(null), 3000);
        }
    };
    const handleDownloadCloudProcessJson = (bundle) => {
        const jsonStr = (0, bloc1ExperimentPlan_1.simulationProcessToJson)(bundle);
        const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const nSc = bundle.summary?.nScenarios || bundle.config?.nScenarios || 0;
        const totalDays = (bundle.summary?.warmupDays ?? bundle.config?.warmupDays ?? 10) + (bundle.summary?.horizonDays ?? bundle.config?.horizonDays ?? 60);
        const nPts = bundle.summary?.nPoints || (nSc * 4 * totalDays);
        const scPtsTag = `${nSc}Sc-${nPts}Pts`;
        const seed = bundle.summary?.seed ?? bundle.config?.seed ?? 42;
        const fileName = `plan_experience_${scPtsTag}_${seed}_${ts}.json`;
        (0, bloc1ExperimentPlan_1.downloadTextFile)(fileName, jsonStr, 'application/json');
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-lg shadow-lg space-y-6 pb-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-t-lg", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.PackageCheck, { size: 24, className: "text-emerald-200" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold uppercase tracking-widest text-emerald-200", children: "Centre d'exportation" })] }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl md:text-3xl font-extrabold tracking-tight", children: "Centre de t\u00E9l\u00E9chargement des donn\u00E9es" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-emerald-100 text-sm max-w-3xl leading-relaxed", children: "Retrouvez et t\u00E9l\u00E9chargez ici l'ensemble des jeux de donn\u00E9es g\u00E9n\u00E9r\u00E9s (Bloc 1) ainsi que les r\u00E9sultats d'ajustement non-lin\u00E9aire et de r\u00E9silience calcul\u00E9s (Bloc 2), individuellement ou en lot complet." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleDownloadRbDictionary, disabled: !canExportRb, className: "px-4 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2", title: "G\u00E9n\u00E9rer et t\u00E9l\u00E9charger le dictionnaire JSON d\u00E9crivant pour chaque en-t\u00EAte l'explication m\u00E9tier et l'impact sur le plan d'exp\u00E9rience", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileJson, { size: 18, className: "text-indigo-200" }), (0, jsx_runtime_1.jsx)("span", { children: "Dictionnaire des en-t\u00EAtes (JSON)" })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleDownloadRbTraining, disabled: !canExportRb, className: "px-4 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2", title: "Exporter rb_training_<seed>_<timestamp>.csv pour l'apprentissage du r\u00E9seau bay\u00E9sien", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Network, { size: 18, className: "text-purple-200" }), (0, jsx_runtime_1.jsx)("span", { children: "Export R\u00E9seau Bay\u00E9sien (CSV)" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleDownloadAll, disabled: (readyFiles.length === 0 && !canExportRb) || downloadingAll, className: "px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2", title: "T\u00E9l\u00E9charger l'ensemble des fichiers (CSV, JSON, R\u00E9seau Bay\u00E9sien et plan complet) dans une unique archive ZIP", children: downloadingAll ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 18, className: "animate-spin text-emerald-600" }), (0, jsx_runtime_1.jsx)("span", { children: "G\u00E9n\u00E9ration du ZIP..." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Archive, { size: 18, className: "text-emerald-700" }), (0, jsx_runtime_1.jsx)("span", { children: "Tout t\u00E9l\u00E9charger en ZIP (CSV + JSON + RB)" })] })) })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "px-6 space-y-6", children: [downloadFeedback && ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-sm font-semibold flex items-center gap-2 animate-in fade-in", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 18, className: "text-emerald-600" }), (0, jsx_runtime_1.jsx)("span", { children: downloadFeedback })] })), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-gray-50 border border-gray-200 rounded-xl", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-gray-500 font-bold uppercase", children: "Sc\u00E9narios simul\u00E9s (Bloc 1)" }), (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-black text-gray-800 mt-1", children: dataset ? dataset.scenarios.length : 0 }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600 mt-1", children: dataset ? `${dataset.ipTimeseries.length} points temporels générés` : 'Aucun jeu de scénarios généré' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-indigo-700 font-bold uppercase", children: "Courbes ajust\u00E9es (Bloc 2)" }), (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-black text-indigo-900 mt-1", children: resilienceRows.length }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-indigo-700 mt-1", children: resilienceRows.length > 0 ? 'Modèle p(x) calibré & 6 KPIs calculés' : 'Ajustement par lot non encore exécuté' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-emerald-700 font-bold uppercase", children: "Fichiers pr\u00EAts au t\u00E9l\u00E9chargement" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-2xl font-black text-emerald-900 mt-1", children: [readyFiles.length, " / ", files.length] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-emerald-700 mt-1", children: readyFiles.length === files.length ? '✅ Tous les fichiers sont prêts' : 'Certains fichiers nécessitent une exécution' })] })] }), (0, jsx_runtime_1.jsx)("input", { ref: fileInputRef, type: "file", accept: ".json,application/json", onChange: handleFileChange, className: "hidden" }), processActionFeedback && ((0, jsx_runtime_1.jsxs)("div", { className: `p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${processActionFeedback.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                            : 'bg-rose-50 border border-rose-300 text-rose-900'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [processActionFeedback.type === 'success' ? ((0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 18, className: "text-emerald-600 shrink-0" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18, className: "text-rose-600 shrink-0" })), (0, jsx_runtime_1.jsx)("span", { children: processActionFeedback.message })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setProcessActionFeedback(null), className: "text-xs opacity-70 hover:opacity-100 font-bold underline", children: "Fermer" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-500/40 rounded-2xl shadow-xl transition-all overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { onClick: () => setIsProcessSectionOpen(prev => !prev), className: "p-5 sm:p-6 cursor-pointer select-none hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-gradient-to-tr from-indigo-600 to-sky-500 rounded-xl shadow-lg shrink-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Bookmark, { size: 24, className: "text-white" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2.5", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2", children: "Plans d'exp\u00E9rience complets" }), (0, jsx_runtime_1.jsx)("span", { className: "bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] px-2.5 py-0.5 rounded-full font-bold", children: "Bundle Param\u00E8tres + Chocs + R\u00E9sultats" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2 text-xs text-indigo-200/80", children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-semibold", children: [dataset?.scenarios?.length || 0, " sc\u00E9narios en m\u00E9moire"] }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { children: [resilienceRows.length, " courbes ajust\u00E9es"] }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-indigo-300", children: ["Seed : ", currentSeed] }), user && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sky-300 font-medium", children: [cloudProcesses.length, " plan", cloudProcesses.length > 1 ? 's' : '', " d'exp\u00E9rience dans votre Cloud Google"] })] }))] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-3 shrink-0 self-end md:self-center", children: (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                setIsProcessSectionOpen(prev => !prev);
                                            }, className: "px-3.5 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold border border-indigo-600/50 flex items-center gap-1.5 shadow-sm transition-all", children: [(0, jsx_runtime_1.jsx)("span", { children: isProcessSectionOpen ? 'Réduire la section' : 'Déplier / Gérer' }), isProcessSectionOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 16 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16 })] }) })] }), isProcessSectionOpen && ((0, jsx_runtime_1.jsxs)("div", { className: "p-6 pt-0 space-y-6 border-t border-indigo-800/50 animate-in fade-in duration-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5 pt-5", children: [(0, jsx_runtime_1.jsx)("div", { className: "space-y-1", children: (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-indigo-200/90 max-w-3xl leading-relaxed", children: ["Sauvegardez l'ensemble du plan d'exp\u00E9rience (configuration du r\u00E9seau, param\u00E8tres du mod\u00E8le, structure des sc\u00E9narios, chocs inject\u00E9s, historique des d\u00E9cisions, courbes ajust\u00E9es et KPIs de r\u00E9silience). Exportez-le en ", (0, jsx_runtime_1.jsx)("strong", { children: "fichier JSON" }), " pour le r\u00E9importer \u00E0 tout moment, ou enregistrez-le dans votre ", (0, jsx_runtime_1.jsx)("strong", { children: "Cloud Google" }), " pour archiver et comparer vos diff\u00E9rents plans d'exp\u00E9rience."] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-indigo-900/50 border border-indigo-700/50 rounded-xl p-3 shrink-0 text-xs space-y-1 min-w-[240px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "Plan d'exp\u00E9rience en m\u00E9moire" }), (0, jsx_runtime_1.jsx)("span", { className: `w-2 h-2 rounded-full ${canSaveOrExportProcess ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-indigo-100", children: [(0, jsx_runtime_1.jsx)("span", { children: "Sc\u00E9narios (Bloc 1) :" }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono font-bold text-white", children: dataset?.scenarios?.length || 0 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-indigo-100", children: [(0, jsx_runtime_1.jsx)("span", { children: "Courbes ajust\u00E9es (Bloc 2) :" }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono font-bold text-white", children: resilienceRows.length })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-indigo-100", children: [(0, jsx_runtime_1.jsx)("span", { children: "Seed courante :" }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono font-bold text-white", children: currentSeed })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-indigo-900/30 border border-indigo-800/60 rounded-xl p-4 space-y-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-bold text-indigo-200 uppercase tracking-wider", children: "Enregistrer ou r\u00E9importer un plan d'exp\u00E9rience" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row items-stretch md:items-center gap-3", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: processCustomName, onChange: (e) => setProcessCustomName(e.target.value), placeholder: `Nom personnalisé (par défaut: Plan d'expérience ${dataset?.scenarios?.length || 20}Sc-${dataset?.ipTimeseries?.length || ((dataset?.scenarios?.length || 20) * 4 * ((dataset?.metadata?.config?.warmupDays ?? 10) + (dataset?.metadata?.config?.horizonDays ?? 60)))}Pts [seed: ${currentSeed}])...`, className: "flex-1 bg-slate-950/60 border border-indigo-700/60 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-indigo-300/50 outline-none transition-all" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleSaveProcessCloud, disabled: !canSaveOrExportProcess || savingProcessCloud, className: "px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all shrink-0", title: "Enregistrer ce plan d'exp\u00E9rience complet dans votre Cloud Google personnel", children: [savingProcessCloud ? ((0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14, className: "animate-spin text-white" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.CloudUpload, { size: 15, className: "text-sky-200" })), (0, jsx_runtime_1.jsx)("span", { children: user ? 'Enregistrer ce plan dans mon Cloud Google' : 'Connexion Google & Sauvegarder Cloud' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleExportProcessJson, disabled: !canSaveOrExportProcess, className: "px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-100 rounded-lg text-xs font-bold border border-indigo-700/60 flex items-center gap-2 transition-all shrink-0", title: "T\u00E9l\u00E9charger le fichier de plan d'exp\u00E9rience .json sur votre ordinateur", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 14, className: "text-indigo-300" }), (0, jsx_runtime_1.jsx)("span", { children: "Exporter le plan (.json)" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleTriggerImport, className: "px-3.5 py-2.5 bg-indigo-700/40 hover:bg-indigo-700/70 text-white rounded-lg text-xs font-bold border border-indigo-500/50 flex items-center gap-2 transition-all shrink-0", title: "R\u00E9importer un plan d'exp\u00E9rience pr\u00E9c\u00E9demment export\u00E9 (.json)", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Upload, { size: 14, className: "text-sky-300" }), (0, jsx_runtime_1.jsx)("span", { children: "Importer un plan (.json)" })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3 pt-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Cloud, { size: 18, className: "text-sky-400" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-white tracking-tight", children: "Biblioth\u00E8que Cloud de vos Plans d'exp\u00E9rience" }), user && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-indigo-300 font-mono bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50", children: user.email }))] }), user && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => user && loadCloudProcesses(user.uid), disabled: loadingCloudProcesses, className: "text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 12, className: loadingCloudProcesses ? 'animate-spin' : '' }), (0, jsx_runtime_1.jsx)("span", { children: "Actualiser" })] }))] }), user ? ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2.5", children: loadingCloudProcesses ? ((0, jsx_runtime_1.jsxs)("div", { className: "p-6 bg-slate-950/40 border border-indigo-900/50 rounded-xl text-center text-xs text-indigo-300 flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "animate-spin text-sky-400" }), (0, jsx_runtime_1.jsx)("span", { children: "Chargement de vos plans d'exp\u00E9rience Cloud..." })] })) : cloudProcesses.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "p-6 bg-slate-950/40 border border-dashed border-indigo-800/60 rounded-xl text-center text-xs text-indigo-300/80 space-y-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-indigo-200", children: "Aucun plan d'exp\u00E9rience enregistr\u00E9 dans votre Cloud Google pour le moment." }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-indigo-400/80", children: ["G\u00E9n\u00E9rez une simulation et cliquez sur ", (0, jsx_runtime_1.jsx)("strong", { children: "\u00AB Enregistrer ce plan dans mon Cloud Google \u00BB" }), " pour vous constituer un historique de benchmarks et de configurations."] })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1", children: cloudProcesses.map((proc) => ((0, jsx_runtime_1.jsxs)("div", { className: "p-3.5 bg-slate-950/60 hover:bg-slate-950/80 border border-indigo-800/60 hover:border-indigo-500/80 rounded-xl transition-all space-y-2.5 flex flex-col justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white text-sm line-clamp-1", children: proc.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-indigo-300 font-mono shrink-0", children: [new Date(proc.createdAt).toLocaleDateString('fr-FR'), " ", new Date(proc.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1.5 text-[10px]", children: [(() => {
                                                                                const nSc = proc.summary?.nScenarios || proc.config?.nScenarios || 0;
                                                                                const totalDays = (proc.summary?.warmupDays ?? proc.config?.warmupDays ?? 10) + (proc.summary?.horizonDays ?? proc.config?.horizonDays ?? 60);
                                                                                const nPts = proc.summary?.nPoints || (nSc * 4 * totalDays);
                                                                                return ((0, jsx_runtime_1.jsxs)("span", { className: "bg-sky-950/80 text-sky-300 font-bold px-2 py-0.5 rounded font-mono border border-sky-600/50", children: [nSc, "Sc-", nPts, "Pts"] }));
                                                                            })(), (0, jsx_runtime_1.jsxs)("span", { className: "bg-indigo-900/70 text-indigo-200 px-2 py-0.5 rounded font-mono border border-indigo-700/50", children: ["Seed : ", proc.summary?.seed ?? proc.config?.seed ?? 42] }), proc.summary?.nResilienceRows ? ((0, jsx_runtime_1.jsxs)("span", { className: "bg-emerald-950/70 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-700/50", children: [proc.summary.nResilienceRows, " courbes ajust\u00E9es"] })) : null, proc.summary?.avgR2 !== undefined && ((0, jsx_runtime_1.jsxs)("span", { className: "bg-purple-950/70 text-purple-300 px-2 py-0.5 rounded font-mono border border-purple-700/50", children: ["R\u00B2 moy : ", proc.summary.avgR2.toFixed(3)] })), proc.summary?.avgPR !== undefined && ((0, jsx_runtime_1.jsxs)("span", { className: "bg-amber-950/70 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-700/50", children: ["PR moy : ", proc.summary.avgPR.toFixed(3)] }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-end gap-2 pt-1 border-t border-indigo-900/60", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => handleDownloadCloudProcessJson(proc), className: "px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors", title: "T\u00E9l\u00E9charger le fichier JSON de ce plan d'exp\u00E9rience", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 12 }), (0, jsx_runtime_1.jsx)("span", { children: "JSON" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleDeleteCloudProcess(proc.id, proc.name), className: "p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded transition-colors", title: "Supprimer ce plan d'exp\u00E9rience du Cloud", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 13 }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => handleLoadCloudProcess(proc), className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-all", title: "Charger ce plan d'exp\u00E9rience dans l'application", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 13 }), (0, jsx_runtime_1.jsx)("span", { children: "Charger ce plan" })] })] })] }, proc.id))) })) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-slate-950/50 border border-indigo-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-2 bg-white/10 rounded-lg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Cloud, { size: 20, className: "text-sky-300" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold text-white", children: "Constituez-vous une biblioth\u00E8que de plans d'exp\u00E9rience dans votre Cloud" }), (0, jsx_runtime_1.jsx)("p", { className: "text-indigo-300 text-[11px]", children: "Connectez-vous avec votre compte Google pour sauvegarder vos plans d'exp\u00E9rience, archiver vos simulations et basculer facilement de l'un \u00E0 l'autre." })] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleGoogleLogin, disabled: isLoggingIn, className: "px-3.5 py-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0 self-start sm:self-center", children: [isLoggingIn ? ((0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14, className: "animate-spin text-gray-600" })) : ((0, jsx_runtime_1.jsxs)("svg", { className: "w-3.5 h-3.5", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" })] })), (0, jsx_runtime_1.jsx)("span", { children: "Connexion Google" })] })] }))] })] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "p-5 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/70 border-2 border-purple-200 rounded-xl shadow-xs space-y-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-purple-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Network, { size: 26 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-extrabold text-gray-900 text-base", children: "Export R\u00E9seau Bay\u00E9sien (Apprentissage)" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200", children: ["rb_training_", currentSeed, "_<timestamp>.csv"] }), canExportRb ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 12 }), " Pr\u00EAt \u00E0 l'export"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full", children: "En attente de g\u00E9n\u00E9ration" }))] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-gray-600 max-w-3xl leading-relaxed", children: ["Fichier CSV agr\u00E9g\u00E9 cl\u00E9 en main pour l'entra\u00EEnement d'un r\u00E9seau bay\u00E9sien. Une ligne par couple ", (0, jsx_runtime_1.jsx)("code", { className: "font-mono font-bold text-gray-800 bg-purple-50 px-1 py-0.5 rounded", children: "(scenario_id, branch_id)" }), " regroupant les 40 variables dans l'ordre exact prescrit : r\u00E9seau logistique, choc, profils de gestion, historique de d\u00E9tection et d\u00E9cisions, m\u00E9triques d'ajustement p(x), KPIs de r\u00E9silience (IPC, TRP, CRD, PR) et classe discr\u00E9tis\u00E9e ", (0, jsx_runtime_1.jsx)("code", { className: "font-mono font-bold text-gray-800 bg-purple-50 px-1 py-0.5 rounded", children: "PR_class" }), "."] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2.5 pt-2 text-[11px] text-gray-600", children: [(0, jsx_runtime_1.jsxs)("span", { className: "bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200", children: ["Seed du run : ", (0, jsx_runtime_1.jsx)("strong", { className: "font-mono text-gray-800", children: currentSeed })] }), (0, jsx_runtime_1.jsxs)("span", { className: "bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200", children: ["Lignes (couples) : ", (0, jsx_runtime_1.jsx)("strong", { className: "font-mono text-gray-800", children: totalCouples })] }), (0, jsx_runtime_1.jsxs)("span", { className: "bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200", children: ["Colonnes : ", (0, jsx_runtime_1.jsx)("strong", { className: "font-mono text-gray-800", children: "40" })] }), resilienceRows.length > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-purple-900", title: "Seuils terciles par d\u00E9faut calcul\u00E9s sur la distribution de PR", children: ["Seuils PR_class : ", (0, jsx_runtime_1.jsx)("strong", { children: "faible" }), " < ", rbThresholds.seuil_bas.toFixed(3), " | ", (0, jsx_runtime_1.jsx)("strong", { children: "eleve" }), " > ", rbThresholds.seuil_haut.toFixed(3), rbThresholds.isCustomFixed ? ' (seuils fixes)' : ' (terciles du run)'] }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center", children: [canExportRb && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handlePreviewRbTraining, className: "px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors", title: "Aper\u00E7u des 40 colonnes du CSV d'entra\u00EEnement", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "Aper\u00E7u CSV" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handlePreviewRbDictionary, className: "px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors", title: "Aper\u00E7u du dictionnaire des 40 en-t\u00EAtes JSON", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "Aper\u00E7u Dictionnaire" })] })] })), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadRbDictionary, disabled: !canExportRb, className: "px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors", title: "G\u00E9n\u00E9rer et t\u00E9l\u00E9charger le dictionnaire JSON d\u00E9crivant pour chaque en-t\u00EAte l'explication m\u00E9tier et l'impact sur le plan d'exp\u00E9rience", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileJson, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "Dictionnaire des en-t\u00EAtes (JSON)" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadRbTraining, disabled: !canExportRb, className: "px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors", title: "T\u00E9l\u00E9charger rb_training_<seed>_<timestamp>.csv", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "Export R\u00E9seau Bay\u00E9sien (CSV)" })] })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Layers, { size: 18, className: "text-emerald-700" }), (0, jsx_runtime_1.jsx)("span", { children: "Fichiers exportables disponibles" })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-gray-500", children: "Formats standards CSV & JSON" })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 gap-3", children: files.map(file => ((0, jsx_runtime_1.jsxs)("div", { className: `p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${file.isReady
                                        ? 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-xs'
                                        : 'bg-gray-50/80 border-gray-200 opacity-60'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: `p-2.5 rounded-lg shrink-0 mt-0.5 ${file.type === 'json' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`, children: file.type === 'json' ? (0, jsx_runtime_1.jsx)(lucide_react_1.FileJson, { size: 22 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { size: 22 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-mono font-bold text-gray-900 text-sm", children: file.name }), (0, jsx_runtime_1.jsx)("span", { className: `px-2 py-0.5 rounded text-[10px] font-bold ${file.category.includes('Bloc 2')
                                                                        ? 'bg-indigo-100 text-indigo-800'
                                                                        : 'bg-orange-100 text-orange-800'}`, children: file.category }), file.isReady ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 12 }), " Pr\u00EAt"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full", children: "En attente" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600 leading-relaxed max-w-2xl", children: file.description }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5", children: [file.isReady && file.readyMessage && ((0, jsx_runtime_1.jsx)("span", { className: "text-emerald-700 font-semibold", children: file.readyMessage })), !file.isReady && file.notReadyMessage && ((0, jsx_runtime_1.jsx)("span", { className: "text-amber-700 italic", children: file.notReadyMessage })), file.columnsList && ((0, jsx_runtime_1.jsxs)("span", { children: ["Colonnes : ", (0, jsx_runtime_1.jsxs)("code", { className: "text-gray-700 font-mono text-[10px]", children: [file.columnsList.slice(0, 5).join(', '), file.columnsList.length > 5 ? '...' : ''] })] }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0 self-end md:self-center", children: [file.isReady && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setPreviewFile(file), className: "px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors", title: "Aper\u00E7u rapide du contenu", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "Aper\u00E7u" })] })), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => handleDownloadSingle(file), disabled: !file.isReady, className: `px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${file.isReady
                                                        ? file.id === 'resilience_ip'
                                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "T\u00E9l\u00E9charger" })] })] })] }, file.id))) })] }), (!dataset || resilienceRows.length === 0) && ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18, className: "text-amber-600 shrink-0" }), (0, jsx_runtime_1.jsx)("span", { children: !dataset
                                            ? 'Pour débloquer tous les fichiers, générez d\'abord un lot de scénarios dans l\'onglet Générateur.'
                                            : 'Pour débloquer resilience_ip.csv, lancez l\'ajustement par lot.' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [!dataset && ((0, jsx_runtime_1.jsxs)("button", { onClick: onGoToGenerator, className: "px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-bold flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { children: "G\u00E9n\u00E9rateur de sc\u00E9narios" }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })), dataset && resilienceRows.length === 0 && ((0, jsx_runtime_1.jsxs)("button", { onClick: onGoToBatch, className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { children: "Ajustement par lot" }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] }))] })] }))] }), previewFile && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-slate-900 text-white flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { size: 18, className: "text-emerald-400" }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-sm font-mono", children: previewFile.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400", children: ["(", previewFile.rowsCount ?? '—', " entr\u00E9es)"] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setPreviewFile(null), className: "text-slate-400 hover:text-white px-2 py-1 text-sm font-bold", children: "\u2715" })] }), (0, jsx_runtime_1.jsx)("div", { className: "p-4 overflow-auto flex-1 font-mono text-xs bg-slate-50 text-slate-800", children: (0, jsx_runtime_1.jsxs)("pre", { className: "whitespace-pre-wrap leading-relaxed", children: [previewFile.getContent().slice(0, 4000), previewFile.getContent().length > 4000 ? '\n\n... [Contenu tronqué pour l\'aperçu - Téléchargez le fichier pour voir l\'intégralité]' : ''] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-gray-500", children: "Aper\u00E7u en lecture seule" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setPreviewFile(null), className: "px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-semibold", children: "Fermer" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                                handleDownloadSingle(previewFile);
                                                setPreviewFile(null);
                                            }, className: "px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 13 }), (0, jsx_runtime_1.jsx)("span", { children: "T\u00E9l\u00E9charger ce fichier" })] })] })] })] }) }))] }));
};
exports.default = DownloadCenter;
