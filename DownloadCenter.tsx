import React, { useState, useEffect, useRef } from 'react';
import {
  Download, FileSpreadsheet, FileJson, CheckCircle2, Layers,
  Eye, ArrowRight, PackageCheck, AlertCircle, RefreshCw, Network,
  Cloud, CloudUpload, Upload, Trash2, Bookmark, Check,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth, signInWithGoogle,
  saveSimulationProcessToCloud, fetchSimulationProcessesFromCloud, deleteSimulationProcessFromCloud
} from './firebase';
import { ScenarioDataset, ResilienceRow, SimulationProcessBundle } from './bloc1Types';
import {
  scenariosToCsv, perturbationsToCsv, decisionsToCsv,
  ipTimeseriesToCsv, branchesToCsv, metadataToJson, downloadTextFile,
  generateRbTrainingCsv, getRbTrainingFilename, computePrThresholds,
  createSimulationProcessBundle, simulationProcessToJson,
  parseSimulationProcessBundle, restoreSimulationProcess,
  RB_TRAINING_HEADER,
  generateRbDictionaryJson, getRbDictionaryFilename,
} from './bloc1ExperimentPlan';
import { networkDocumentToJson } from './bloc1NetworkFormat';
import { datasetNetworkInfo } from './bloc1NetworkSelection';

export type { ResilienceRow };

interface DownloadCenterProps {
  dataset: ScenarioDataset | null;
  resilienceRows: ResilienceRow[];
  resilienceCsv: string;
  onGoToGenerator: () => void;
  onGoToBatch: () => void;
  onRestoreProcess?: (bundle: {
    dataset: ScenarioDataset;
    resilienceRows?: ResilienceRow[];
    resilienceCsv?: string;
    params?: any;
  }) => void;
}

interface FileEntry {
  id: string;
  name: string;
  type: 'csv' | 'json';
  category: 'Bloc 1 (Générateur)' | 'Bloc 2 (Ajustement & KPIs)';
  description: string;
  rowsCount?: number;
  columnsCount?: number;
  columnsList?: string[];
  getContent: () => string;
  isReady: boolean;
  readyMessage?: string;
  notReadyMessage?: string;
}

const DownloadCenter: React.FC<DownloadCenterProps> = ({
  dataset,
  resilienceRows,
  resilienceCsv,
  onGoToGenerator,
  onGoToBatch,
  onRestoreProcess,
}) => {
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // État pour la gestion des processus de simulation (Cloud Google & local)
  const [user, setUser] = useState<User | null>(null);
  const [cloudProcesses, setCloudProcesses] = useState<SimulationProcessBundle[]>([]);
  const [loadingCloudProcesses, setLoadingCloudProcesses] = useState(false);
  const [savingProcessCloud, setSavingProcessCloud] = useState(false);
  const [processCustomName, setProcessCustomName] = useState('');
  const [processActionFeedback, setProcessActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessSectionOpen, setIsProcessSectionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronisation de l'authentification Google et chargement des processus Cloud
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadCloudProcesses(currentUser.uid);
      } else {
        setCloudProcesses([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadCloudProcesses = async (uid: string) => {
    setLoadingCloudProcesses(true);
    try {
      const list = await fetchSimulationProcessesFromCloud(uid);
      setCloudProcesses(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
    } catch (err) {
      console.error('Erreur chargement processus cloud:', err);
    } finally {
      setLoadingCloudProcesses(false);
    }
  };

  const currentSeed = dataset?.metadata?.config?.seed ?? 42;
  const canExportRb = !!dataset || resilienceRows.length > 0;
  const totalCouples = dataset?.branches?.length
    ? dataset.branches.length
    : (dataset?.scenarios?.length ? dataset.scenarios.length * 4 : resilienceRows.length);
  const rbThresholds = computePrThresholds(resilienceRows);

  // Définition exhaustive des fichiers du pipeline
const networkInfo = datasetNetworkInfo(dataset);
  const files: FileEntry[] = [
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
      getContent: () => dataset ? ipTimeseriesToCsv(dataset) : '',
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
      getContent: () => dataset ? perturbationsToCsv(dataset) : '',
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
      getContent: () => dataset ? scenariosToCsv(dataset) : '',
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
      getContent: () => networkInfo.document ? networkDocumentToJson(networkInfo.document) : '',
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
      getContent: () => dataset ? decisionsToCsv(dataset) : '',
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
      getContent: () => dataset ? branchesToCsv(dataset) : '',
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
      getContent: () => dataset ? metadataToJson(dataset) : '',
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
      getContent: () => generateRbDictionaryJson(dataset, resilienceRows),
      isReady: canExportRb,
      readyMessage: 'Dictionnaire des 40 variables disponible en JSON',
      notReadyMessage: 'En attente de la génération des scénarios (Bloc 1)',
    },
  ];

  const readyFiles = files.filter(f => f.isReady);

  const handleDownloadRbTraining = () => {
    if (!canExportRb) return;
    const fileName = getRbTrainingFilename(currentSeed);
    const content = generateRbTrainingCsv(dataset, resilienceRows);
    downloadTextFile(fileName, content, 'text/csv;charset=utf-8;');
    setDownloadFeedback(`✅ Export Réseau Bayésien généré et téléchargé : ${fileName}`);
    setTimeout(() => setDownloadFeedback(null), 4000);
  };

  const handleDownloadRbDictionary = () => {
    if (!canExportRb) return;
    const fileName = getRbDictionaryFilename(currentSeed);
    const content = generateRbDictionaryJson(dataset, resilienceRows);
    downloadTextFile(fileName, content, 'application/json;charset=utf-8;');
    setDownloadFeedback(`✅ Dictionnaire JSON généré et téléchargé : ${fileName}`);
    setTimeout(() => setDownloadFeedback(null), 4000);
  };

  const handlePreviewRbDictionary = () => {
    if (!canExportRb) return;
    const fileName = getRbDictionaryFilename(currentSeed);
    setPreviewFile({
      id: 'rb_dictionary',
      name: fileName,
      type: 'json',
      category: 'Bloc 2 (Ajustement & KPIs)',
      description: 'Dictionnaire sémantique des 40 en-têtes du Réseau Bayésien : explications métier détaillées et impacts sur le plan d\'expérience.',
      rowsCount: 40,
      columnsCount: 1,
      columnsList: ['header', 'label', 'category', 'data_type', 'unit_or_format', 'explanation', 'plan_impact'],
      getContent: () => generateRbDictionaryJson(dataset, resilienceRows),
      isReady: true,
      readyMessage: '40 en-têtes documentées pour les spécialistes logistiques et opérations',
    });
  };

  const handlePreviewRbTraining = () => {
    if (!canExportRb) return;
    const fileName = getRbTrainingFilename(currentSeed);
    setPreviewFile({
      id: 'rb_training',
      name: fileName,
      type: 'csv',
      category: 'Bloc 2 (Ajustement & KPIs)',
      description: 'Export consolidé 40 colonnes prêt pour l\'apprentissage d\'un Réseau Bayésien (scénarios, perturbations, profils metadata, historique décisions, métriques d\'ajustement, KPIs et discrétisation PR_class).',
      rowsCount: totalCouples,
      columnsCount: 40,
      columnsList: RB_TRAINING_HEADER.split(','),
      getContent: () => generateRbTrainingCsv(dataset, resilienceRows),
      isReady: true,
      readyMessage: `${totalCouples} couples (scénario, branche) avec 40 colonnes jointes`,
    });
  };

  const handleDownloadSingle = (file: FileEntry) => {
    const content = file.getContent();
    if (!content) return;
    const mime = file.type === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
    downloadTextFile(file.name, content, mime);
    setDownloadFeedback(`Téléchargement lancé : ${file.name}`);
    setTimeout(() => setDownloadFeedback(null), 3000);
  };

  const handleDownloadAll = () => {
    if (readyFiles.length === 0) return;
    setDownloadingAll(true);
    setDownloadFeedback(`Téléchargement en cours des ${readyFiles.length} fichiers...`);

    readyFiles.forEach((file, index) => {
      setTimeout(() => {
        const content = file.getContent();
        const mime = file.type === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
        downloadTextFile(file.name, content, mime);
        if (index === readyFiles.length - 1) {
          setDownloadingAll(false);
          setDownloadFeedback(`✅ Tous les ${readyFiles.length} fichiers ont été téléchargés avec succès !`);
          setTimeout(() => setDownloadFeedback(null), 4000);
        }
      }, index * 250);
    });
  };

  // Actions sur les plans d'expérience
  const canSaveOrExportProcess = !!dataset || resilienceRows.length > 0;

  const handleExportProcessJson = () => {
    const bundle = createSimulationProcessBundle(dataset, resilienceRows, resilienceCsv, processCustomName);
    if (!bundle) {
      setProcessActionFeedback({ type: 'error', message: 'Aucun plan d\'expérience actif à exporter (générez d\'abord des scénarios).' });
      setTimeout(() => setProcessActionFeedback(null), 4000);
      return;
    }
    const jsonStr = simulationProcessToJson(bundle);
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const nSc = bundle.summary.nScenarios || dataset?.scenarios?.length || 0;
    const totalDays = (bundle.summary.warmupDays ?? 10) + (bundle.summary.horizonDays ?? 60);
    const nPts = dataset?.ipTimeseries?.length || (bundle.summary as any)?.nPoints || (nSc * 4 * totalDays);
    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
    const fileName = `plan_experience_${scPtsTag}_${bundle.summary.seed}_${ts}.json`;
    downloadTextFile(fileName, jsonStr, 'application/json');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const bundle = parseSimulationProcessBundle(text);
        const restored = restoreSimulationProcess(bundle);
        if (onRestoreProcess) {
          onRestoreProcess(restored);
        }
        setProcessActionFeedback({
          type: 'success',
          message: `✅ Plan d'expérience "${bundle.name}" importé et restauré avec succès (${restored.dataset.scenarios.length} scénarios, ${restored.resilienceRows.length} courbes ajustées) !`
        });
        setTimeout(() => setProcessActionFeedback(null), 5000);
      } catch (err: any) {
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
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        await loadCloudProcesses(loggedUser.uid);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveProcessCloud = async () => {
    if (!user) {
      await handleGoogleLogin();
      return;
    }

    const bundle = createSimulationProcessBundle(dataset, resilienceRows, resilienceCsv, processCustomName);
    if (!bundle) {
      setProcessActionFeedback({ type: 'error', message: 'Aucun plan d\'expérience actif à sauvegarder (générez d\'abord des scénarios).' });
      setTimeout(() => setProcessActionFeedback(null), 4000);
      return;
    }

    setSavingProcessCloud(true);
    try {
      await saveSimulationProcessToCloud(user.uid, bundle);
      await loadCloudProcesses(user.uid);
      setProcessCustomName('');
      setProcessActionFeedback({
        type: 'success',
        message: `☁️ Plan d'expérience "${bundle.name}" enregistré dans votre Cloud Google !`
      });
      setTimeout(() => setProcessActionFeedback(null), 4000);
    } catch (err: any) {
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
    } finally {
      setSavingProcessCloud(false);
    }
  };

  const handleLoadCloudProcess = (bundle: SimulationProcessBundle) => {
    try {
      const restored = restoreSimulationProcess(bundle);
      if (onRestoreProcess) {
        onRestoreProcess(restored);
      }
      setProcessActionFeedback({
        type: 'success',
        message: `✅ Plan d'expérience Cloud "${bundle.name}" restauré dans l'application (${restored.dataset.scenarios.length} scénarios, ${restored.resilienceRows.length} courbes ajustées) !`
      });
      setTimeout(() => setProcessActionFeedback(null), 5000);
    } catch (err: any) {
      setProcessActionFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors de la restauration du plan d\'expérience Cloud.'
      });
      setTimeout(() => setProcessActionFeedback(null), 5000);
    }
  };

  const handleDeleteCloudProcess = async (processId: string, processName: string) => {
    if (!user) return;
    if (!confirm(`Supprimer définitivement le plan d'expérience "${processName}" de votre Cloud Google ?`)) return;
    try {
      await deleteSimulationProcessFromCloud(user.uid, processId);
      await loadCloudProcesses(user.uid);
      setProcessActionFeedback({
        type: 'success',
        message: `Plan d'expérience "${processName}" supprimé du Cloud.`
      });
      setTimeout(() => setProcessActionFeedback(null), 3000);
    } catch (err) {
      setProcessActionFeedback({
        type: 'error',
        message: 'Erreur lors de la suppression du plan d\'expérience.'
      });
      setTimeout(() => setProcessActionFeedback(null), 3000);
    }
  };

  const handleDownloadCloudProcessJson = (bundle: SimulationProcessBundle) => {
    const jsonStr = simulationProcessToJson(bundle);
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const nSc = bundle.summary?.nScenarios || bundle.config?.nScenarios || 0;
    const totalDays = (bundle.summary?.warmupDays ?? bundle.config?.warmupDays ?? 10) + (bundle.summary?.horizonDays ?? bundle.config?.horizonDays ?? 60);
    const nPts = (bundle.summary as any)?.nPoints || (nSc * 4 * totalDays);
    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
    const seed = bundle.summary?.seed ?? bundle.config?.seed ?? 42;
    const fileName = `plan_experience_${scPtsTag}_${seed}_${ts}.json`;
    downloadTextFile(fileName, jsonStr, 'application/json');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg space-y-6 pb-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-t-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PackageCheck size={24} className="text-emerald-200" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Centre d'exportation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Centre de téléchargement des données
            </h1>
            <p className="mt-2 text-emerald-100 text-sm max-w-3xl leading-relaxed">
              Retrouvez et téléchargez ici l'ensemble des jeux de données générés (Bloc 1) ainsi que les résultats d'ajustement non-linéaire et de résilience calculés (Bloc 2), individuellement ou en lot complet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadRbDictionary}
              disabled={!canExportRb}
              className="px-4 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
              title="Générer et télécharger le dictionnaire JSON décrivant pour chaque en-tête l'explication métier et l'impact sur le plan d'expérience"
            >
              <FileJson size={18} className="text-indigo-200" />
              <span>Dictionnaire des en-têtes (JSON)</span>
            </button>

            <button
              onClick={handleDownloadRbTraining}
              disabled={!canExportRb}
              className="px-4 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
              title="Exporter rb_training_<seed>_<timestamp>.csv pour l'apprentissage du réseau bayésien"
            >
              <Network size={18} className="text-purple-200" />
              <span>Export Réseau Bayésien (CSV)</span>
            </button>

            <button
              onClick={handleDownloadAll}
              disabled={readyFiles.length === 0 || downloadingAll}
              className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              {downloadingAll ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-emerald-600" />
                  <span>Téléchargement en cours...</span>
                </>
              ) : (
                <>
                  <Download size={18} className="text-emerald-700" />
                  <span>Tout télécharger en lot ({readyFiles.length}/{files.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Feedback message */}
        {downloadFeedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{downloadFeedback}</span>
          </div>
        )}

        {/* Synthèse du statut */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <span className="text-xs text-gray-500 font-bold uppercase">Scénarios simulés (Bloc 1)</span>
            <div className="text-2xl font-black text-gray-800 mt-1">
              {dataset ? dataset.scenarios.length : 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {dataset ? `${dataset.ipTimeseries.length} points temporels générés` : 'Aucun jeu de scénarios généré'}
            </p>
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <span className="text-xs text-indigo-700 font-bold uppercase">Courbes ajustées (Bloc 2)</span>
            <div className="text-2xl font-black text-indigo-900 mt-1">
              {resilienceRows.length}
            </div>
            <p className="text-xs text-indigo-700 mt-1">
              {resilienceRows.length > 0 ? 'Modèle p(x) calibré & 6 KPIs calculés' : 'Ajustement par lot non encore exécuté'}
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-xs text-emerald-700 font-bold uppercase">Fichiers prêts au téléchargement</span>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              {readyFiles.length} / {files.length}
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              {readyFiles.length === files.length ? '✅ Tous les fichiers sont prêts' : 'Certains fichiers nécessitent une exécution'}
            </p>
          </div>
        </div>

        {/* Input fichier masqué pour l'import de processus JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Alerte / Feedback d'action sur les processus */}
        {processActionFeedback && (
          <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
            processActionFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {processActionFeedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
              )}
              <span>{processActionFeedback.message}</span>
            </div>
            <button
              onClick={() => setProcessActionFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold underline"
            >
              Fermer
            </button>
          </div>
        )}

        {/* SECTION MAÎTRESSE : Gestion des Plans d'expérience (Export/Import Local & Cloud Google) - DÉPLIANTE */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-500/40 rounded-2xl shadow-xl transition-all overflow-hidden">
          {/* En-tête dépliant (toujours visible et cliquable) */}
          <div
            onClick={() => setIsProcessSectionOpen(prev => !prev)}
            className="p-5 sm:p-6 cursor-pointer select-none hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-indigo-600 to-sky-500 rounded-xl shadow-lg shrink-0">
                <Bookmark size={24} className="text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    Plans d'expérience complets
                  </h2>
                  <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                    Bundle Paramètres + Chocs + Résultats
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-200/80">
                  <span className="font-semibold">
                    {dataset?.scenarios?.length || 0} scénarios en mémoire
                  </span>
                  <span>•</span>
                  <span>
                    {resilienceRows.length} courbes ajustées
                  </span>
                  <span>•</span>
                  <span className="font-mono text-indigo-300">
                    Seed : {currentSeed}
                  </span>
                  {user && (
                    <>
                      <span>•</span>
                      <span className="text-sky-300 font-medium">
                        {cloudProcesses.length} plan{cloudProcesses.length > 1 ? 's' : ''} d'expérience dans votre Cloud Google
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProcessSectionOpen(prev => !prev);
                }}
                className="px-3.5 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold border border-indigo-600/50 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>{isProcessSectionOpen ? 'Réduire la section' : 'Déplier / Gérer'}</span>
                {isProcessSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Contenu complet dépliant (gardé 100% intact) */}
          {isProcessSectionOpen && (
            <div className="p-6 pt-0 space-y-6 border-t border-indigo-800/50 animate-in fade-in duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5 pt-5">
                <div className="space-y-1">
                  <p className="text-xs text-indigo-200/90 max-w-3xl leading-relaxed">
                    Sauvegardez l'ensemble du plan d'expérience (configuration du réseau, paramètres du modèle, structure des scénarios, chocs injectés, historique des décisions, courbes ajustées et KPIs de résilience). Exportez-le en <strong>fichier JSON</strong> pour le réimporter à tout moment, ou enregistrez-le dans votre <strong>Cloud Google</strong> pour archiver et comparer vos différents plans d'expérience.
                  </p>
                </div>

                {/* État du plan d'expérience actuel */}
                <div className="bg-indigo-900/50 border border-indigo-700/50 rounded-xl p-3 shrink-0 text-xs space-y-1 min-w-[240px]">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Plan d'expérience en mémoire</span>
                    <span className={`w-2 h-2 rounded-full ${canSaveOrExportProcess ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  </div>
                  <div className="flex items-center justify-between text-indigo-100">
                    <span>Scénarios (Bloc 1) :</span>
                    <span className="font-mono font-bold text-white">{dataset?.scenarios?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-100">
                    <span>Courbes ajustées (Bloc 2) :</span>
                    <span className="font-mono font-bold text-white">{resilienceRows.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-100">
                    <span>Seed courante :</span>
                    <span className="font-mono font-bold text-white">{currentSeed}</span>
                  </div>
                </div>
              </div>

              {/* Zone d'action : Nom + Boutons Export / Import / Sauvegarde Cloud */}
              <div className="bg-indigo-900/30 border border-indigo-800/60 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  Enregistrer ou réimporter un plan d'expérience
                </label>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <input
                    type="text"
                    value={processCustomName}
                    onChange={(e) => setProcessCustomName(e.target.value)}
                    placeholder={`Nom personnalisé (par défaut: Plan d'expérience ${dataset?.scenarios?.length || 20}Sc-${dataset?.ipTimeseries?.length || ((dataset?.scenarios?.length || 20) * 4 * ((dataset?.metadata?.config?.warmupDays ?? 10) + (dataset?.metadata?.config?.horizonDays ?? 60)))}Pts [seed: ${currentSeed}])...`}
                    className="flex-1 bg-slate-950/60 border border-indigo-700/60 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-indigo-300/50 outline-none transition-all"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bouton Sauvegarder Cloud Google */}
                    <button
                      type="button"
                      onClick={handleSaveProcessCloud}
                      disabled={!canSaveOrExportProcess || savingProcessCloud}
                      className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all shrink-0"
                      title="Enregistrer ce plan d'expérience complet dans votre Cloud Google personnel"
                    >
                      {savingProcessCloud ? (
                        <RefreshCw size={14} className="animate-spin text-white" />
                      ) : (
                        <CloudUpload size={15} className="text-sky-200" />
                      )}
                      <span>{user ? 'Enregistrer ce plan dans mon Cloud Google' : 'Connexion Google & Sauvegarder Cloud'}</span>
                    </button>

                    {/* Bouton Exporter JSON local */}
                    <button
                      type="button"
                      onClick={handleExportProcessJson}
                      disabled={!canSaveOrExportProcess}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-100 rounded-lg text-xs font-bold border border-indigo-700/60 flex items-center gap-2 transition-all shrink-0"
                      title="Télécharger le fichier de plan d'expérience .json sur votre ordinateur"
                    >
                      <Download size={14} className="text-indigo-300" />
                      <span>Exporter le plan (.json)</span>
                    </button>

                    {/* Bouton Importer JSON local */}
                    <button
                      type="button"
                      onClick={handleTriggerImport}
                      className="px-3.5 py-2.5 bg-indigo-700/40 hover:bg-indigo-700/70 text-white rounded-lg text-xs font-bold border border-indigo-500/50 flex items-center gap-2 transition-all shrink-0"
                      title="Réimporter un plan d'expérience précédemment exporté (.json)"
                    >
                      <Upload size={14} className="text-sky-300" />
                      <span>Importer un plan (.json)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bibliothèque Cloud (Plans d'expérience enregistrés dans le compte Google) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-sky-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Bibliothèque Cloud de vos Plans d'expérience
                    </h3>
                    {user && (
                      <span className="text-xs text-indigo-300 font-mono bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
                        {user.email}
                      </span>
                    )}
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={() => user && loadCloudProcesses(user.uid)}
                      disabled={loadingCloudProcesses}
                      className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} className={loadingCloudProcesses ? 'animate-spin' : ''} />
                      <span>Actualiser</span>
                    </button>
                  )}
                </div>

                {user ? (
                  <div className="space-y-2.5">
                    {loadingCloudProcesses ? (
                      <div className="p-6 bg-slate-950/40 border border-indigo-900/50 rounded-xl text-center text-xs text-indigo-300 flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-sky-400" />
                        <span>Chargement de vos plans d'expérience Cloud...</span>
                      </div>
                    ) : cloudProcesses.length === 0 ? (
                      <div className="p-6 bg-slate-950/40 border border-dashed border-indigo-800/60 rounded-xl text-center text-xs text-indigo-300/80 space-y-1">
                        <p className="font-semibold text-indigo-200">Aucun plan d'expérience enregistré dans votre Cloud Google pour le moment.</p>
                        <p className="text-[11px] text-indigo-400/80">
                          Générez une simulation et cliquez sur <strong>« Enregistrer ce plan dans mon Cloud Google »</strong> pour vous constituer un historique de benchmarks et de configurations.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {cloudProcesses.map((proc) => (
                          <div
                            key={proc.id}
                            className="p-3.5 bg-slate-950/60 hover:bg-slate-950/80 border border-indigo-800/60 hover:border-indigo-500/80 rounded-xl transition-all space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-white text-sm line-clamp-1">
                                  {proc.name}
                                </span>
                                <span className="text-[10px] text-indigo-300 font-mono shrink-0">
                                  {new Date(proc.createdAt).toLocaleDateString('fr-FR')} {new Date(proc.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                {(() => {
                                  const nSc = proc.summary?.nScenarios || proc.config?.nScenarios || 0;
                                  const totalDays = (proc.summary?.warmupDays ?? proc.config?.warmupDays ?? 10) + (proc.summary?.horizonDays ?? proc.config?.horizonDays ?? 60);
                                  const nPts = (proc.summary as any)?.nPoints || (nSc * 4 * totalDays);
                                  return (
                                    <span className="bg-sky-950/80 text-sky-300 font-bold px-2 py-0.5 rounded font-mono border border-sky-600/50">
                                      {nSc}Sc-{nPts}Pts
                                    </span>
                                  );
                                })()}
                                <span className="bg-indigo-900/70 text-indigo-200 px-2 py-0.5 rounded font-mono border border-indigo-700/50">
                                  Seed : {proc.summary?.seed ?? proc.config?.seed ?? 42}
                                </span>
                                {proc.summary?.nResilienceRows ? (
                                  <span className="bg-emerald-950/70 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-700/50">
                                    {proc.summary.nResilienceRows} courbes ajustées
                                  </span>
                                ) : null}
                                {proc.summary?.avgR2 !== undefined && (
                                  <span className="bg-purple-950/70 text-purple-300 px-2 py-0.5 rounded font-mono border border-purple-700/50">
                                    R² moy : {proc.summary.avgR2.toFixed(3)}
                                  </span>
                                )}
                                {proc.summary?.avgPR !== undefined && (
                                  <span className="bg-amber-950/70 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-700/50">
                                    PR moy : {proc.summary.avgPR.toFixed(3)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-900/60">
                              <button
                                type="button"
                                onClick={() => handleDownloadCloudProcessJson(proc)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Télécharger le fichier JSON de ce plan d'expérience"
                              >
                                <Download size={12} />
                                <span>JSON</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCloudProcess(proc.id, proc.name)}
                                className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded transition-colors"
                                title="Supprimer ce plan d'expérience du Cloud"
                              >
                                <Trash2 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadCloudProcess(proc)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                                title="Charger ce plan d'expérience dans l'application"
                              >
                                <Check size={13} />
                                <span>Charger ce plan</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/50 border border-indigo-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Cloud size={20} className="text-sky-300" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Constituez-vous une bibliothèque de plans d'expérience dans votre Cloud</p>
                        <p className="text-indigo-300 text-[11px]">Connectez-vous avec votre compte Google pour sauvegarder vos plans d'expérience, archiver vos simulations et basculer facilement de l'un à l'autre.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="px-3.5 py-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
                    >
                      {isLoggingIn ? (
                        <RefreshCw size={14} className="animate-spin text-gray-600" />
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      )}
                      <span>Connexion Google</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Carte d'export dédiée : Réseau Bayésien */}
        <div className="p-5 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/70 border-2 border-purple-200 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-purple-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Network size={26} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-gray-900 text-base">
                    Export Réseau Bayésien (Apprentissage)
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    rb_training_{currentSeed}_&lt;timestamp&gt;.csv
                  </span>
                  {canExportRb ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={12} /> Prêt à l'export
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">
                      En attente de génération
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                  Fichier CSV agrégé clé en main pour l'entraînement d'un réseau bayésien. Une ligne par couple <code className="font-mono font-bold text-gray-800 bg-purple-50 px-1 py-0.5 rounded">(scenario_id, branch_id)</code> regroupant les 40 variables dans l'ordre exact prescrit : réseau logistique, choc, profils de gestion, historique de détection et décisions, métriques d'ajustement p(x), KPIs de résilience (IPC, TRP, CRD, PR) et classe discrétisée <code className="font-mono font-bold text-gray-800 bg-purple-50 px-1 py-0.5 rounded">PR_class</code>.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 text-[11px] text-gray-600">
                  <span className="bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200">
                    Seed du run : <strong className="font-mono text-gray-800">{currentSeed}</strong>
                  </span>
                  <span className="bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200">
                    Lignes (couples) : <strong className="font-mono text-gray-800">{totalCouples}</strong>
                  </span>
                  <span className="bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200">
                    Colonnes : <strong className="font-mono text-gray-800">40</strong>
                  </span>
                  {resilienceRows.length > 0 && (
                    <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-purple-900" title="Seuils terciles par défaut calculés sur la distribution de PR">
                      Seuils PR_class : <strong>faible</strong> &lt; {rbThresholds.seuil_bas.toFixed(3)} | <strong>eleve</strong> &gt; {rbThresholds.seuil_haut.toFixed(3)}
                      {rbThresholds.isCustomFixed ? ' (seuils fixes)' : ' (terciles du run)'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
              {canExportRb && (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewRbTraining}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Aperçu des 40 colonnes du CSV d'entraînement"
                  >
                    <Eye size={14} />
                    <span>Aperçu CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewRbDictionary}
                    className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Aperçu du dictionnaire des 40 en-têtes JSON"
                  >
                    <Eye size={14} />
                    <span>Aperçu Dictionnaire</span>
                  </button>
                </>
              )}

              {/* Bouton pour générer le JSON décrivant pour chaque en-tête l'explication et l'impact sur le plan d'expérience (à gauche de l'Export Réseau Bayésien CSV) */}
              <button
                type="button"
                onClick={handleDownloadRbDictionary}
                disabled={!canExportRb}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Générer et télécharger le dictionnaire JSON décrivant pour chaque en-tête l'explication métier et l'impact sur le plan d'expérience"
              >
                <FileJson size={14} />
                <span>Dictionnaire des en-têtes (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadRbTraining}
                disabled={!canExportRb}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Télécharger rb_training_<seed>_<timestamp>.csv"
              >
                <Download size={14} />
                <span>Export Réseau Bayésien (CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Liste des 7 fichiers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Layers size={18} className="text-emerald-700" />
              <span>Fichiers exportables disponibles</span>
            </h2>
            <span className="text-xs text-gray-500">Formats standards CSV & JSON</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {files.map(file => (
              <div
                key={file.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  file.isReady
                    ? 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-xs'
                    : 'bg-gray-50/80 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                    file.type === 'json' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {file.type === 'json' ? <FileJson size={22} /> : <FileSpreadsheet size={22} />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 text-sm">{file.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        file.category.includes('Bloc 2')
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {file.category}
                      </span>
                      {file.isReady ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} /> Prêt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          En attente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                      {file.description}
                    </p>
                    <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      {file.isReady && file.readyMessage && (
                        <span className="text-emerald-700 font-semibold">{file.readyMessage}</span>
                      )}
                      {!file.isReady && file.notReadyMessage && (
                        <span className="text-amber-700 italic">{file.notReadyMessage}</span>
                      )}
                      {file.columnsList && (
                        <span>Colonnes : <code className="text-gray-700 font-mono text-[10px]">{file.columnsList.slice(0, 5).join(', ')}{file.columnsList.length > 5 ? '...' : ''}</code></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {file.isReady && (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Aperçu rapide du contenu"
                    >
                      <Eye size={14} />
                      <span>Aperçu</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(file)}
                    disabled={!file.isReady}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${
                      file.isReady
                        ? file.id === 'resilience_ip'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Download size={14} />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liens de redirection si des données manquent */}
        {(!dataset || resilienceRows.length === 0) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <span>
                {!dataset
                  ? 'Pour débloquer tous les fichiers, générez d\'abord un lot de scénarios dans l\'onglet Générateur.'
                  : 'Pour débloquer resilience_ip.csv, lancez l\'ajustement par lot.'}
              </span>
            </div>
            <div className="flex gap-2">
              {!dataset && (
                <button
                  onClick={onGoToGenerator}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-bold flex items-center gap-1"
                >
                  <span>Générateur de scénarios</span>
                  <ArrowRight size={13} />
                </button>
              )}
              {dataset && resilienceRows.length === 0 && (
                <button
                  onClick={onGoToBatch}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold flex items-center gap-1"
                >
                  <span>Ajustement par lot</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'aperçu de données */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm font-mono">{previewFile.name}</h3>
                <span className="text-xs text-slate-400">({previewFile.rowsCount ?? '—'} entrées)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 font-mono text-xs bg-slate-50 text-slate-800">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {previewFile.getContent().slice(0, 4000)}
                {previewFile.getContent().length > 4000 ? '\n\n... [Contenu tronqué pour l\'aperçu - Téléchargez le fichier pour voir l\'intégralité]' : ''}
              </pre>
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-500">Aperçu en lecture seule</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-semibold"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSingle(previewFile);
                    setPreviewFile(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1"
                >
                  <Download size={13} />
                  <span>Télécharger ce fichier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadCenter;
