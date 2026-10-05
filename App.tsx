import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { RotateCcw, AlertCircle, Database, CheckCircle, Sliders, Play, Pause, Film, ChevronLeft, ChevronRight, Layers, BookOpen, PackageCheck, ArrowRight } from 'lucide-react';
import Bloc1ScenarioGenerator from './Bloc1ScenarioGenerator';
import ModelDocumentation from './ModelDocumentation';
import DownloadCenter from './DownloadCenter';
import { UserAuthSync } from './UserAuthSync';
import { testFirestoreConnection } from './firebase';
import { ScenarioDataset } from './bloc1Types';
import { ipTimeseriesToCsv, perturbationsToCsv } from './bloc1ExperimentPlan';

type ParamKey = 'k' | 'q' | 'h' | 'g' | 'd' | 'alpha' | 'beta';

interface ResilienceParams {
  k: number; q: number; h: number; g: number; d: number; alpha: number; beta: number;
}

// Fonction de résilience p(x), partagée par le mode manuel et le traitement par lot.
const resilienceModelCore = (x: number, p: ResilienceParams) => {
  const { k, q, h, g, d, alpha, beta } = p;
  const term1 = k + q / 2;
  const term2 = -(h / 2) * Math.tanh(alpha * (x - g) / 2);
  const term3 = ((h + q) / 2) * Math.tanh(beta * (x - g - d) / 2);
  return term1 + term2 + term3;
};

// Calcul des 6 IP de résilience, partagé par le mode manuel et le traitement par lot.
// Correction : T est calculé comme g + d + 4/beta (chapitre 4 de thèse), au lieu d'une
// valeur fixe de 20 utilisée précédemment. Cela corrige ERR dans les deux modes.
const calculateKPIsCore = (p: ResilienceParams) => {
  const { k, q, h, g, d, alpha, beta } = p;

  const crd = (beta / alpha) * ((h + q) / h) * (1 / d) * Math.sqrt(alpha * beta);
  const ipc = (h / alpha) * Math.log(2) + (h * d) / 2 - ((h + q) / beta) * Math.log(2);
  const trp = d + 2.95 / beta;
  const sra = ((beta * (h + q)) / (alpha * h * d)) * Math.exp(-Math.abs(q) / h) * (1 + Math.tanh(beta - alpha));
  const T = g + d + 4 / beta;
  const err = 1 + q / (2 * k) - (h * Math.abs(ipc)) / (T * k);
  const pr = (k + q) / (k - h / 2);

  return { crd, ipc, trp, sra, err, pr };
};

// Pénalité pour maintenir les contraintes du modèle pendant l'optimisation :
// k > h/2, q > -h, d > 0, alpha > 0, beta > 0.
const constraintPenalty = (p: ResilienceParams) => {
  let penalty = 0;
  if (p.k - p.h / 2 <= 0) penalty += (p.h / 2 - p.k + 0.01) * 1e6;
  if (p.q + p.h <= 0) penalty += (-p.h - p.q + 0.01) * 1e6;
  if (p.k < 0) penalty += (-p.k) * 1e6;
  if (p.h < 0) penalty += (-p.h) * 1e6;
  if (p.g < 0) penalty += (-p.g) * 1e6;
  if (p.d < 1) penalty += (1 - p.d) * 1e6;
  if (p.alpha < 0.5) penalty += (0.5 - p.alpha) * 1e6;
  if (p.beta < 0.5) penalty += (0.5 - p.beta) * 1e6;
  return penalty;
};

const vectorToParams = (v: number[]): ResilienceParams => ({
  k: v[0], q: v[1], h: v[2], g: v[3], d: v[4], alpha: v[5], beta: v[6]
});

export interface FitOptions {
  fScale?: number;
  nStarts?: number;
  smoothWindow?: number;
}

export const DEFAULT_FIT_OPTIONS: Required<FitOptions> = {
  fScale: 0.05,
  nStarts: 20,
  smoothWindow: 5,
};

// 1. Perte robuste Soft-L1 appliquée résidu par résidu :
// rho(r) = 2 * (sqrt(1 + r^2 / f_scale^2) - 1)
// Atténue l'influence des oscillations/rebonds locaux en phase de reprise.
const robustLoss = (
  v: number[],
  points: { x: number; y: number }[],
  fScale: number = 0.05
): number => {
  const p = vectorToParams(v);
  const fScaleSq = fScale * fScale;
  let sum = 0;
  for (const pt of points) {
    const pred = resilienceModelCore(pt.x, p);
    const r = pred - pt.y;
    sum += 2 * (Math.sqrt(1 + (r * r) / fScaleSq) - 1);
  }
  return sum + constraintPenalty(p);
};

// Optimiseur Nelder-Mead (simplex), sans dépendance externe.
// v0 : vecteur initial [k,q,h,g,d,alpha,beta]. Retourne le vecteur qui minimise objFn.
const nelderMead = (
  objFn: (v: number[]) => number,
  v0: number[],
  maxIter: number = 3000
): number[] => {
  const n = v0.length;
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5;

  // Simplex initial : v0 et n points décalés d'un pas proportionnel à chaque paramètre.
  let simplex: number[][] = [v0.slice()];
  for (let i = 0; i < n; i++) {
    const point = v0.slice();
    const step = point[i] !== 0 ? Math.abs(point[i]) * 0.1 : 0.1;
    point[i] += step;
    simplex.push(point);
  }
  let values = simplex.map(objFn);

  for (let iter = 0; iter < maxIter; iter++) {
    // Tri du simplex par valeur croissante.
    const order = values.map((_val, idx) => idx).sort((a, b) => values[a] - values[b]);
    simplex = order.map(idx => simplex[idx]);
    values = order.map(idx => values[idx]);

    if (Math.abs(values[n] - values[0]) < 1e-9) break;

    // Centroïde de tous les points sauf le pire.
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    }

    const worst = simplex[n];
    const reflected = centroid.map((c, j) => c + alpha * (c - worst[j]));
    const reflectedVal = objFn(reflected);

    if (reflectedVal < values[0]) {
      const expanded = centroid.map((c, j) => c + gamma * (reflected[j] - c));
      const expandedVal = objFn(expanded);
      if (expandedVal < reflectedVal) {
        simplex[n] = expanded; values[n] = expandedVal;
      } else {
        simplex[n] = reflected; values[n] = reflectedVal;
      }
    } else if (reflectedVal < values[n - 1]) {
      simplex[n] = reflected; values[n] = reflectedVal;
    } else {
      const contracted = centroid.map((c, j) => c + rho * (worst[j] - c));
      const contractedVal = objFn(contracted);
      if (contractedVal < values[n]) {
        simplex[n] = contracted; values[n] = contractedVal;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((val, j) => simplex[0][j] + sigma * (val - simplex[0][j]));
          values[i] = objFn(simplex[i]);
        }
      }
    }
  }

  const order = values.map((_val, idx) => idx).sort((a, b) => values[a] - values[b]);
  return simplex[order[0]];
};

interface CurvePoint { x: number; y: number; }

// Construit une estimation initiale des 7 paramètres à partir d'une courbe observée,
// pour amorcer l'optimiseur Nelder-Mead.
const initialGuessFromCurve = (points: CurvePoint[]): number[] => {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const pre = sorted.filter(p => p.x < 0);
  const post = sorted.slice(-Math.max(3, Math.floor(sorted.length * 0.1)));
  const k0 = pre.length > 0 ? pre.reduce((s, p) => s + p.y, 0) / pre.length : sorted[0].y;
  const kFinal = post.reduce((s, p) => s + p.y, 0) / post.length;
  let minPoint = sorted[0];
  for (const p of sorted) if (p.y < minPoint.y) minPoint = p;
  const h0 = Math.max(0.01, k0 - minPoint.y);
  const q0 = kFinal - k0;
  const g0 = 0.5;
  const d0 = Math.max(1, minPoint.x - g0);
  return [k0, q0, h0, g0, d0, 2.0, 1.0];
};

// 2. Multi-start : génération de 15 à 30 jeux de paramètres initiaux
// basés sur une grille raisonnée et des perturbations contrôlées sur h, d, alpha, beta.
const generateMultiStarts = (
  baseGuess: number[],
  nStarts: number = 20
): number[][] => {
  const [k0, q0, h0, g0, d0] = baseGuess;
  const starts: number[][] = [baseGuess.slice()];

  const hMultipliers = [0.6, 0.85, 1.0, 1.25, 1.6];
  const dMultipliers = [0.6, 0.85, 1.0, 1.3, 1.8];
  const betaValues = [0.5, 0.8, 1.2, 2.0];
  const alphaValues = [1.0, 2.0, 3.5];

  let count = 1;
  for (const hMult of hMultipliers) {
    for (const dMult of dMultipliers) {
      if (count >= nStarts) break;
      const hCand = Math.max(0.01, Math.min(k0 * 1.8, h0 * hMult));
      const dCand = Math.max(1, d0 * dMult);
      const betaCand = betaValues[count % betaValues.length];
      const alphaCand = alphaValues[count % alphaValues.length];
      const qCand = q0 + ((count % 3) - 1) * 0.1 * hCand;
      const gCand = Math.max(0, g0 + ((count % 2) === 0 ? 0.4 : -0.2));
      const kCand = Math.max(hCand / 2 + 0.05, k0);

      starts.push([kCand, qCand, hCand, gCand, dCand, alphaCand, betaCand]);
      count++;
    }
    if (count >= nStarts) break;
  }

  while (starts.length < nStarts) {
    const idx = starts.length;
    const factorH = 0.5 + ((idx * 37) % 100) / 70;
    const factorD = 0.6 + ((idx * 53) % 100) / 60;
    const hCand = Math.max(0.01, Math.min(k0 * 1.8, h0 * factorH));
    const dCand = Math.max(1, d0 * factorD);
    const alphaCand = 0.8 + ((idx * 19) % 100) / 30;
    const betaCand = 0.5 + ((idx * 23) % 100) / 50;
    const kCand = Math.max(hCand / 2 + 0.05, k0);
    const qCand = Math.max(-hCand + 0.01, q0);
    const gCand = Math.max(0, g0 + (((idx % 5) - 2) * 0.3));

    starts.push([kCand, qCand, hCand, gCand, dCand, alphaCand, betaCand]);
  }

  return starts.slice(0, nStarts);
};

// 3. R² à deux niveaux : lissage par moyenne mobile sur fenêtre courte
const computeSmoothedSeries = (points: CurvePoint[], windowSize: number = 5): number[] => {
  const n = points.length;
  const half = Math.floor(windowSize / 2);
  const smoothed: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(n, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += points[j].y;
    }
    smoothed[i] = sum / (end - start);
  }
  return smoothed;
};

const computeR2Smooth = (
  points: CurvePoint[],
  p: ResilienceParams,
  windowSize: number = 5
): number => {
  const smoothedY = computeSmoothedSeries(points, windowSize);
  const n = points.length;
  const meanSmooth = smoothedY.reduce((s, y) => s + y, 0) / n;

  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const pred = resilienceModelCore(points[i].x, p);
    const diffRes = pred - smoothedY[i];
    const diffTot = smoothedY[i] - meanSmooth;
    ssRes += diffRes * diffRes;
    ssTot += diffTot * diffTot;
  }

  return ssTot > 0 ? 1 - ssRes / ssTot : 1;
};

// Routine d'optimisation robuste multi-start
const fitResilienceRobust = (
  points: CurvePoint[],
  options: FitOptions = {}
): {
  params: ResilienceParams;
  r2: number;
  rmse: number;
  r2_smooth: number;
  kpis: ReturnType<typeof calculateKPIsCore>;
} => {
  const fScale = options.fScale ?? DEFAULT_FIT_OPTIONS.fScale;
  const nStarts = options.nStarts ?? DEFAULT_FIT_OPTIONS.nStarts;
  const smoothWindow = options.smoothWindow ?? DEFAULT_FIT_OPTIONS.smoothWindow;

  const v0 = initialGuessFromCurve(points);
  const candidateStarts = generateMultiStarts(v0, nStarts);

  let bestLoss = Infinity;
  let bestV = v0;

  const lossFn = (v: number[]) => robustLoss(v, points, fScale);

  // Étape 1 : criblage multi-start rapide
  for (const startV of candidateStarts) {
    const fittedV = nelderMead(lossFn, startV, 250);
    const loss = lossFn(fittedV);
    if (loss < bestLoss) {
      bestLoss = loss;
      bestV = fittedV;
    }
  }

  // Étape 2 : polissage haute précision sur le meilleur point
  const finalV = nelderMead(lossFn, bestV, 2000);
  const p = vectorToParams(finalV);

  // R² et RMSE sur données brutes
  let ssRes = 0, ssTot = 0;
  const meanY = points.reduce((s, pt) => s + pt.y, 0) / points.length;
  for (const pt of points) {
    const pred = resilienceModelCore(pt.x, p);
    ssRes += (pred - pt.y) * (pred - pt.y);
    ssTot += (pt.y - meanY) * (pt.y - meanY);
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  const rmse = Math.sqrt(ssRes / points.length);

  // R²_smooth contre la série lissée
  const r2_smooth = computeR2Smooth(points, p, smoothWindow);
  const kpis = calculateKPIsCore(p);

  return { params: p, r2, rmse, r2_smooth, kpis };
};

// Parseur CSV générique (en-têtes en première ligne, séparateur virgule).
const parseCsvToObjects = (text: string): Record<string, string>[] => {
  const lines = text.trim().split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
};

interface ResilienceRow extends ResilienceParams {
  scenario_id: string;
  branch_id: string;
  r2: number;
  rmse: number;
  r2_smooth: number;
  ipc: number; crd: number; trp: number; sra: number; err: number; pr: number;
  points?: CurvePoint[];
}

// Traite ip_timeseries.csv + perturbations.csv : regroupe par (scenario_id, branch_id),
// aligne x = day_rel - start, ajuste les 7 paramètres par optimisation robuste multi-start,
// calcule la qualité d'ajustement (R², RMSE, R²_smooth) et les 6 IP.
const runBatchFitAsync = async (
  ipRows: Record<string, string>[],
  pertRows: Record<string, string>[],
  options?: FitOptions,
  onProgress?: (done: number, total: number) => void
): Promise<ResilienceRow[]> => {
  const startByScenario: Record<string, number> = {};
  for (const r of pertRows) {
    if (startByScenario[r.scenario_id] === undefined) {
      startByScenario[r.scenario_id] = parseFloat(r.start);
    }
  }

  const groups: Record<string, CurvePoint[]> = {};
  for (const r of ipRows) {
    const key = `${r.scenario_id}\u0001${r.branch_id}`;
    const start = startByScenario[r.scenario_id] ?? 0;
    const dayRel = parseFloat(r.day_rel);
    const ip = parseFloat(r.ip);
    if (isNaN(dayRel) || isNaN(ip)) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ x: dayRel - start, y: ip });
  }

  const keys = Object.keys(groups);
  const results: ResilienceRow[] = [];

  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const [scenario_id, branch_id] = key.split('\u0001');
    const points = groups[key];
    const fit = fitResilienceRobust(points, options);
    const { params: p, r2, rmse, r2_smooth, kpis } = fit;

    results.push({
      scenario_id, branch_id, ...p, r2, rmse, r2_smooth,
      ipc: kpis.ipc, crd: kpis.crd, trp: kpis.trp, sra: kpis.sra, err: kpis.err, pr: kpis.pr,
      points: points.slice().sort((a, b) => a.x - b.x)
    });

    if (onProgress) onProgress(idx + 1, keys.length);

    // Yield execution every 2 iterations to let React re-render the progress gauge smoothly
    if (idx % 2 === 0 || idx === keys.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
};

const resilienceRowToCsv = (rows: ResilienceRow[]): string => {
  const header = 'scenario_id,branch_id,k,q,h,g,d,alpha,beta,r2,rmse,r2_smooth,IPC,CRD,TRP,SRA,ERR,PR';
  const lines = rows.map(r => [
    r.scenario_id, r.branch_id,
    r.k.toFixed(4), r.q.toFixed(4), r.h.toFixed(4), r.g.toFixed(4), r.d.toFixed(4),
    r.alpha.toFixed(4), r.beta.toFixed(4),
    r.r2.toFixed(4), r.rmse.toFixed(4), (r.r2_smooth ?? r.r2).toFixed(4),
    r.ipc.toFixed(4), r.crd.toFixed(4), r.trp.toFixed(4), r.sra.toFixed(4), r.err.toFixed(4), r.pr.toFixed(4)
  ].join(','));
  return [header, ...lines].join('\n');
};

// Composant de l'onglet "Ajustement par lot".
interface BatchProcessingProps {
  generatedDataset?: ScenarioDataset | null;
  autoRunRequested?: boolean;
  onAutoRunConsumed?: () => void;
  initialResults?: ResilienceRow[];
  onBatchResultsReady?: (results: ResilienceRow[], csvText: string) => void;
  onNavigateToDownloadCenter?: () => void;
}

const BatchProcessing: React.FC<BatchProcessingProps> = ({
  generatedDataset,
  autoRunRequested = false,
  onAutoRunConsumed,
  initialResults = [],
  onBatchResultsReady,
  onNavigateToDownloadCenter,
}) => {
  const [ipText, setIpText] = useState<string | null>(() => {
    if (generatedDataset) return ipTimeseriesToCsv(generatedDataset);
    return null;
  });
  const [pertText, setPertText] = useState<string | null>(() => {
    if (generatedDataset) return perturbationsToCsv(generatedDataset);
    return null;
  });
  const [ipFileName, setIpFileName] = useState(() => {
    if (generatedDataset) return `ip_timeseries.csv (${generatedDataset.scenarios.length} scénarios générés)`;
    return '';
  });
  const [pertFileName, setPertFileName] = useState(() => {
    if (generatedDataset) return `perturbations.csv (${generatedDataset.perturbations.length} perturbations générées)`;
    return '';
  });
  const [results, setResults] = useState<ResilienceRow[]>(initialResults);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batchError, setBatchError] = useState('');
  const [resultsView, setResultsView] = useState<'table' | 'chart'>('table');
  const [curveIndex, setCurveIndex] = useState(0);
  const [curveIndexInput, setCurveIndexInput] = useState('1');

  // Paramètres d'optimisation robuste Soft-L1 & Multi-start
  const [fScale, setFScale] = useState<number>(0.05);
  const [nStarts, setNStarts] = useState<number>(20);
  const [smoothWindow, setSmoothWindow] = useState<number>(5);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Filtres par potentiomètres (R2, RMSE, h)
  const [minR2, setMinR2] = useState<number>(0.0);
  const [maxRmse, setMaxRmse] = useState<number>(0.5);
  const [minH, setMinH] = useState<number>(0.0);
  const [isCinematic, setIsCinematic] = useState(false);
  const [cinematicSpeedMs, setCinematicSpeedMs] = useState(650);

  // Option de superposition des 4 branches
  const [superimposeBranches, setSuperimposeBranches] = useState<boolean>(false);
  const [visibleBranches, setVisibleBranches] = useState<Record<string, boolean>>({
    none: true,
    reactif: true,
    prudent: true,
    tardif: true,
  });
  const [showFittedLines, setShowFittedLines] = useState<boolean>(true);
  const [showObservedDots, setShowObservedDots] = useState<boolean>(true);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  useEffect(() => {
    if (initialResults && initialResults.length > 0 && results.length === 0) {
      setResults(initialResults);
    }
  }, [initialResults]);

  const readFile = (file: File, setter: (text: string) => void, nameSetter: (name: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setter(e.target.result);
        nameSetter(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFromGenerator = () => {
    if (!generatedDataset) return;
    const ipCsv = ipTimeseriesToCsv(generatedDataset);
    const pertCsv = perturbationsToCsv(generatedDataset);
    setIpText(ipCsv);
    setPertText(pertCsv);
    setIpFileName(`ip_timeseries.csv (${generatedDataset.scenarios.length} scénarios générés)`);
    setPertFileName(`perturbations.csv (${generatedDataset.perturbations.length} perturbations générées)`);
    setBatchError('');
  };

  // Lancement automatique déclenché UNIQUEMENT lorsque le bouton "Lancer l'ajustement par lot" du générateur a été cliqué
  useEffect(() => {
    if (autoRunRequested && generatedDataset) {
      const ipCsv = ipTimeseriesToCsv(generatedDataset);
      const pertCsv = perturbationsToCsv(generatedDataset);
      setIpText(ipCsv);
      setPertText(pertCsv);
      setIpFileName(`ip_timeseries.csv (${generatedDataset.scenarios.length} scénarios générés)`);
      setPertFileName(`perturbations.csv (${generatedDataset.perturbations.length} perturbations générées)`);
      setBatchError('');

      // Consomme immédiatement le signal d'auto-lancement
      if (onAutoRunConsumed) {
        onAutoRunConsumed();
      }

      // Lancement direct de l'ajustement non linéaire
      const executeAutoRun = async () => {
        setIsProcessing(true);
        setIsCinematic(false);
        setProgress({ done: 0, total: 0 });
        try {
          const ipRows = parseCsvToObjects(ipCsv);
          const pertRows = parseCsvToObjects(pertCsv);
          if (!ipRows.length || !('scenario_id' in ipRows[0]) || !('ip' in ipRows[0]) || !('day_rel' in ipRows[0])) {
            throw new Error("ip_timeseries.csv doit contenir les colonnes scenario_id, branch_id, day_rel, ip");
          }
          if (!pertRows.length || !('scenario_id' in pertRows[0]) || !('start' in pertRows[0])) {
            throw new Error("perturbations.csv doit contenir les colonnes scenario_id, start");
          }

          const fitOpts: FitOptions = { fScale, nStarts, smoothWindow };
          const rows = await runBatchFitAsync(ipRows, pertRows, fitOpts, (done, total) => setProgress({ done, total }));
          setResults(rows);
          setCurveIndex(0);
          setCurveIndexInput('1');
          if (onBatchResultsReady) {
            const csv = resilienceRowToCsv(rows);
            onBatchResultsReady(rows, csv);
          }
        } catch (err: any) {
          setBatchError(err.message || "Erreur pendant l'ajustement par lot");
        } finally {
          setIsProcessing(false);
        }
      };

      const timer = setTimeout(executeAutoRun, 50);
      return () => clearTimeout(timer);
    }
  }, [autoRunRequested, generatedDataset, onAutoRunConsumed, onBatchResultsReady, fScale, nStarts, smoothWindow]);

  const handleRun = async () => {
    if (!ipText || !pertText) return;
    setBatchError('');
    setIsProcessing(true);
    setIsCinematic(false);
    setProgress({ done: 0, total: 0 });

    try {
      const ipRows = parseCsvToObjects(ipText);
      const pertRows = parseCsvToObjects(pertText);
      if (!ipRows.length || !('scenario_id' in ipRows[0]) || !('ip' in ipRows[0]) || !('day_rel' in ipRows[0])) {
        throw new Error("ip_timeseries.csv doit contenir les colonnes scenario_id, branch_id, day_rel, ip");
      }
      if (!pertRows.length || !('scenario_id' in pertRows[0]) || !('start' in pertRows[0])) {
        throw new Error("perturbations.csv doit contenir les colonnes scenario_id, start");
      }

      const fitOpts: FitOptions = { fScale, nStarts, smoothWindow };
      const rows = await runBatchFitAsync(ipRows, pertRows, fitOpts, (done, total) => setProgress({ done, total }));
      setResults(rows);
      setCurveIndex(0);
      setCurveIndexInput('1');
      if (onBatchResultsReady) {
        const csv = resilienceRowToCsv(rows);
        onBatchResultsReady(rows, csv);
      }
    } catch (err: any) {
      setBatchError(err.message || "Erreur pendant l'ajustement par lot");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const csv = resilienceRowToCsv(filteredResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resilience_ip.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrage par seuils
  const filteredResults = useMemo(() => {
    return results.filter(r => r.r2 >= minR2 && r.rmse <= maxRmse && r.h >= minH);
  }, [results, minR2, maxRmse, minH]);

  // Scénarios uniques filtrés
  const uniqueScenarios = useMemo(() => {
    return Array.from(new Set(filteredResults.map(r => r.scenario_id)));
  }, [filteredResults]);

  // Réajuster l'index lors du changement de filtre
  useEffect(() => {
    if (filteredResults.length === 0) {
      setCurveIndex(0);
      setCurveIndexInput('1');
    } else if (curveIndex >= filteredResults.length) {
      setCurveIndex(0);
      setCurveIndexInput('1');
    }
  }, [filteredResults.length, curveIndex]);

  useEffect(() => {
    if (uniqueScenarios.length === 0) {
      setScenarioIndex(0);
    } else if (scenarioIndex >= uniqueScenarios.length) {
      setScenarioIndex(0);
    }
  }, [uniqueScenarios.length, scenarioIndex]);

  // Défilement cinématique des courbes filtrées ou des scénarios superposés
  useEffect(() => {
    if (!isCinematic) return;

    if (superimposeBranches) {
      if (uniqueScenarios.length === 0) return;
      const interval = setInterval(() => {
        setScenarioIndex(current => {
          if (current >= uniqueScenarios.length - 1) {
            setIsCinematic(false);
            return current;
          }
          return current + 1;
        });
      }, cinematicSpeedMs);
      return () => clearInterval(interval);
    } else {
      if (filteredResults.length === 0) return;
      const interval = setInterval(() => {
        setCurveIndex(current => {
          if (current >= filteredResults.length - 1) {
            setIsCinematic(false);
            return current;
          }
          const next = current + 1;
          setCurveIndexInput(String(next + 1));
          return next;
        });
      }, cinematicSpeedMs);
      return () => clearInterval(interval);
    }
  }, [isCinematic, superimposeBranches, uniqueScenarios.length, filteredResults.length, cinematicSpeedMs]);

  const toggleCinematic = () => {
    if (superimposeBranches) {
      if (uniqueScenarios.length === 0) return;
      if (isCinematic) {
        setIsCinematic(false);
      } else {
        if (scenarioIndex >= uniqueScenarios.length - 1) {
          setScenarioIndex(0);
        }
        setIsCinematic(true);
      }
    } else {
      if (filteredResults.length === 0) return;
      if (isCinematic) {
        setIsCinematic(false);
      } else {
        if (curveIndex >= filteredResults.length - 1) {
          setCurveIndex(0);
          setCurveIndexInput('1');
        }
        setIsCinematic(true);
      }
    }
  };

  const resetFilters = () => {
    setMinR2(0.0);
    setMaxRmse(0.5);
    setMinH(0.0);
  };

  return (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-6 rounded-t-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Ajustement par lot : ajustement automatique des 7 paramètres</h1>
                <p className="mt-2 text-orange-100 text-sm max-w-3xl leading-relaxed">
                  Charge ip_timeseries.csv et perturbations.csv (directement depuis le générateur ou par fichier), ajuste automatiquement chaque
                  courbe (scenario_id, branch_id) avec x = day_rel - start, et exporte resilience_ip.csv
                </p>
              </div>
              {results.length > 0 && onNavigateToDownloadCenter && (
                <button
                  type="button"
                  onClick={onNavigateToDownloadCenter}
                  className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 animate-in fade-in"
                  title="Accéder au 5ᵉ onglet pour télécharger l'ensemble des 7 fichiers CSV et JSON"
                >
                  <PackageCheck size={18} className="text-emerald-700" />
                  <span>Centre de téléchargement (5ᵉ onglet)</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Section chargement direct depuis le générateur */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${generatedDataset ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Charger les données générées du Bloc 1
                  </h3>
                  <p className="text-xs text-gray-600">
                    {generatedDataset
                      ? `${generatedDataset.scenarios.length} scénarios disponibles (${generatedDataset.ipTimeseries.length} points temporels d'IP)`
                      : "Aucune simulation n'a encore été générée dans l'onglet « Générateur de scénarios »."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadFromGenerator}
                disabled={!generatedDataset}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:border disabled:border-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
                title={!generatedDataset ? "Générez d'abord un plan d'expériences dans le 1er onglet" : "Prendre directement ip_timeseries.csv et perturbations.csv générés"}
              >
                <Database size={15} />
                <span>Prendre les 2 CSV générés</span>
              </button>
            </div>

            {/* Ou sélection de fichiers manuelle */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Importer des fichiers CSV locaux & Paramètres
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(prev => !prev)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200"
                >
                  <Sliders size={13} />
                  <span>{showAdvancedSettings ? 'Masquer paramètres avancés' : 'Paramètres d\'ajustement robuste (Soft-L1, Multi-start)'}</span>
                </button>
              </div>

              {/* Paramètres avancés configurables */}
              {showAdvancedSettings && (
                <div className="p-3.5 bg-white rounded-lg border border-orange-200 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in text-xs">
                  {/* Bulle & Slider f_scale */}
                  <div className="p-2.5 bg-orange-50/40 rounded-lg border border-orange-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-800 flex items-center gap-1">
                        <span>Échelle perte robuste (f_scale) :</span>
                        <span className="text-orange-600 font-mono font-black">{fScale.toFixed(3)}</span>
                      </label>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={0.20}
                      step={0.005}
                      value={fScale}
                      onChange={e => setFScale(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="text-[11px] text-gray-600 space-y-1 pt-1 border-t border-orange-200/60">
                      <p><strong className="text-orange-950">Explication :</strong> Seuil de transition de la perte Soft-L1 résidu par résidu : les petits écarts restent quadratiques, les gros écarts sont pénalisés linéairement.</p>
                      <p><strong className="text-orange-700">Impact :</strong> Filtre efficacement les mini-rechutes et oscillations de reprise sans biaiser l'estimation de la profondeur (h) et du délai (d).</p>
                    </div>
                  </div>

                  {/* Bulle & Slider n_starts */}
                  <div className="p-2.5 bg-orange-50/40 rounded-lg border border-orange-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-800 flex items-center gap-1">
                        <span>Départs Multi-start :</span>
                        <span className="text-orange-600 font-mono font-black">{nStarts} inits</span>
                      </label>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={30}
                      step={1}
                      value={nStarts}
                      onChange={e => setNStarts(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="text-[11px] text-gray-600 space-y-1 pt-1 border-t border-orange-200/60">
                      <p><strong className="text-orange-950">Explication :</strong> Nombre de vecteurs initiaux générés par grille combinatoire sur (h, d, α, β) et perturbations contrôlées.</p>
                      <p><strong className="text-orange-700">Impact :</strong> Empêche l'algorithme Nelder-Mead de converger vers des minima locaux sur des formes atypiques ou bruitées.</p>
                    </div>
                  </div>

                  {/* Bulle & Slider smooth_window */}
                  <div className="p-2.5 bg-orange-50/40 rounded-lg border border-orange-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-800 flex items-center gap-1">
                        <span>Fenêtre lissage R²_smooth :</span>
                        <span className="text-orange-600 font-mono font-black">{smoothWindow} pts</span>
                      </label>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={9}
                      step={2}
                      value={smoothWindow}
                      onChange={e => setSmoothWindow(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="text-[11px] text-gray-600 space-y-1 pt-1 border-t border-orange-200/60">
                      <p><strong className="text-orange-950">Explication :</strong> Largeur de la moyenne mobile centrée appliquée à la série observée ip(t) pour le contrôle qualité.</p>
                      <p><strong className="text-orange-700">Impact :</strong> Vérifie que la tendance macroscopique est respectée (R²_smooth ≥ R²) même en présence d'oscillations locales.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">ip_timeseries.csv</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files && e.target.files[0] && readFile(e.target.files[0], setIpText, setIpFileName)}
                    className="text-xs"
                  />
                  {ipFileName && <p className="text-xs text-green-700 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> {ipFileName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">perturbations.csv</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files && e.target.files[0] && readFile(e.target.files[0], setPertText, setPertFileName)}
                    className="text-xs"
                  />
                  {pertFileName && <p className="text-xs text-green-700 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> {pertFileName}</p>}
                </div>
                <button
                  onClick={handleRun}
                  disabled={!ipText || !pertText || isProcessing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  <Play size={16} />
                  {isProcessing ? `Ajustement en cours... (${progress.done}/${progress.total})` : "Lancer l'ajustement"}
                </button>
                {results.length > 0 && (
                  <>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold shadow-sm"
                    >
                      Exporter {filteredResults.length < results.length ? `(${filteredResults.length} filtrées)` : ''} resilience_ip.csv
                    </button>
                    {onNavigateToDownloadCenter && (
                      <button
                        type="button"
                        onClick={onNavigateToDownloadCenter}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm flex items-center gap-2"
                        title="Voir et télécharger les 7 fichiers CSV et JSON dans le 5ᵉ onglet"
                      >
                        <PackageCheck size={16} />
                        <span>Centre de téléchargement (5ᵉ onglet) →</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Jauge de progression animée pour l'ajustement par lot */}
            {isProcessing && (
              <div className="p-4 bg-white border border-orange-200 rounded-lg shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1.5 text-orange-700 font-bold">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping"></span>
                    Optimisation Nelder-Mead des 7 paramètres sur chaque courbe...
                  </span>
                  <span className="text-sm font-bold text-orange-800">
                    {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0} %
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 h-3 rounded-full transition-all duration-150 ease-out shadow"
                    style={{
                      width: `${progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>
                    Courbe <strong>{progress.done}</strong> / {progress.total}
                  </span>
                  <span>
                    Ajustement de k, q, h, g, d, α, β et calcul des 6 IP
                  </span>
                </div>
              </div>
            )}

            {batchError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={18} /> {batchError}
              </div>
            )}

            {results.length > 0 && (
              <>
                {/* Section Potentiomètres de seuils R2, RMSE et Profondeur de chute h */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-orange-600" />
                      <h3 className="font-bold text-sm text-gray-800">
                        Potentiomètres de filtrage des courbes ajustées (Paliers R², RMSE et Chute h)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-300 rounded-full text-gray-700 shadow-sm">
                        <strong>{filteredResults.length}</strong> / {results.length} courbes retenues (
                        {results.length > 0 ? Math.round((filteredResults.length / results.length) * 100) : 0} %)
                      </span>
                      {(minR2 > 0 || maxRmse < 0.5 || minH > 0) && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs text-orange-600 hover:text-orange-800 font-semibold underline"
                        >
                          Réinitialiser les paliers
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Potentiomètre R² minimal */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-700">
                          Palier R² minimal : <span className="text-orange-600 font-mono">≥ {minR2.toFixed(2)}</span>
                        </label>
                        <span className="text-[10px] text-gray-400">Qualité du fit</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        value={minR2}
                        onChange={e => setMinR2(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>0.00</span>
                        <span>0.50</span>
                        <span>0.80</span>
                        <span>0.95</span>
                        <span>1.00</span>
                      </div>
                      <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <strong className="text-gray-700">Impact :</strong> Filtre les ajustements de faible corrélation. Un seuil élevé (≥ 0.85) conserve uniquement les ajustements théoriques fidèles.
                      </p>
                    </div>

                    {/* Potentiomètre RMSE maximal */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-700">
                          Palier RMSE maximal : <span className="text-orange-600 font-mono">≤ {maxRmse.toFixed(3)}</span>
                        </label>
                        <span className="text-[10px] text-gray-400">Erreur résiduelle</span>
                      </div>
                      <input
                        type="range"
                        min={0.001}
                        max={0.5}
                        step={0.005}
                        value={maxRmse}
                        onChange={e => setMaxRmse(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>0.00</span>
                        <span>0.05</span>
                        <span>0.10</span>
                        <span>0.25</span>
                        <span>0.50</span>
                      </div>
                      <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <strong className="text-gray-700">Impact :</strong> Écarte les courbes trop bruitées. Plus le seuil est bas (≤ 0.05), plus l'écart quadratique moyen avec les points réels est faible.
                      </p>
                    </div>

                    {/* Potentiomètre Chute en baignoire h minimal */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-700">
                          Palier chute h (profondeur) : <span className="text-orange-600 font-mono">≥ {minH.toFixed(2)}</span>
                        </label>
                        <span className="text-[10px] text-gray-400">Creux de résilience</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        value={minH}
                        onChange={e => setMinH(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>0.00 (toutes)</span>
                        <span>0.05 (visible)</span>
                        <span>0.20 (sévère)</span>
                        <span>1.00</span>
                      </div>
                      <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <strong className="text-gray-700">Impact :</strong> Isole les scénarios ayant subi une vraie crise logistique (chute d'IP h ≥ 0.05). Permet d'ignorer les chocs insignifiants.
                      </p>
                    </div>
                  </div>

                  {/* Boutons de préréglages rapides avec protection */}
                  <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                    <span className="text-xs text-gray-500 font-medium mr-1">Préréglages :</span>
                    <button
                      type="button"
                      onClick={() => { setMinR2(0.0); setMaxRmse(0.5); setMinH(0.0); }}
                      className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300 rounded text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
                      title="Afficher toutes les courbes ajustées sans restriction"
                    >
                      Toutes les courbes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMinR2(0.85); setMaxRmse(0.08); setMinH(0.0); }}
                      className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300 rounded text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
                      title="Conserve uniquement les ajustements de haute qualité (R² ≥ 0.85, RMSE ≤ 0.08)"
                    >
                      Ajustements fiables (R² ≥ 0.85)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMinR2(0.80); setMaxRmse(0.12); setMinH(0.03); }}
                      className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300 rounded text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
                      title="Isole les courbes présentant une chute d'IP mesurable (h ≥ 0.03)"
                    >
                      Chutes notables (h ≥ 0.03)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMinR2(0.85); setMaxRmse(0.08); setMinH(0.08); }}
                      className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300 rounded text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
                      title="Chocs marqués avec ajustement précis (h ≥ 0.08, R² ≥ 0.85)"
                    >
                      Chutes franches & fit précis (h ≥ 0.08, R² ≥ 0.85)
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setResultsView('table')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      resultsView === 'table' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Tableau ({filteredResults.length})
                  </button>
                  <button
                    onClick={() => setResultsView('chart')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      resultsView === 'chart' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Visualisation des courbes ({filteredResults.length})
                  </button>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center space-y-2">
                    <p className="text-gray-700 font-semibold text-sm">
                      Aucune courbe ne respecte actuellement les paliers sélectionnés (R² ≥ {minR2.toFixed(2)}, RMSE ≤ {maxRmse.toFixed(3)}, h ≥ {minH.toFixed(2)}).
                    </p>
                    <p className="text-xs text-gray-500">
                      Ajustez les potentiomètres ci-dessus pour élargir les critères de sélection ou cliquez ci-dessous pour tout réinitialiser.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Réinitialiser les paliers
                    </button>
                  </div>
                ) : (
                  <>
                    {resultsView === 'table' && (
                      <div className="overflow-x-auto">
                        <p className="text-sm text-gray-600 mb-2 mt-2">
                          <strong>{filteredResults.length}</strong> courbes affichées
                          {filteredResults.length < results.length && ` (filtrées parmi ${results.length} au total)`}
                        </p>
                        <table className="min-w-full text-xs border border-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              {['scenario_id', 'branch_id', 'k', 'q', 'h', 'g', 'd', 'alpha', 'beta', 'r2', 'rmse', 'r2_smooth', 'IPC', 'CRD', 'TRP', 'SRA', 'ERR', 'PR'].map(col => (
                                <th key={col} className="px-2 py-1 border-b border-gray-200 text-left font-semibold text-gray-700">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredResults.map((r, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1 font-medium">{r.scenario_id}</td>
                                <td className="px-2 py-1">{r.branch_id}</td>
                                <td className="px-2 py-1">{r.k.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.q.toFixed(2)}</td>
                                <td className="px-2 py-1 font-bold text-orange-700">{r.h.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.g.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.d.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.alpha.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.beta.toFixed(2)}</td>
                                <td className="px-2 py-1 font-bold text-green-700">{r.r2.toFixed(3)}</td>
                                <td className="px-2 py-1 font-mono text-gray-700">{r.rmse.toFixed(4)}</td>
                                <td className="px-2 py-1 font-bold text-teal-700" title="R² calculé contre la série lissée par moyenne mobile">{(r.r2_smooth ?? r.r2).toFixed(3)}</td>
                                <td className="px-2 py-1">{r.ipc.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.crd.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.trp.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.sra.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.err.toFixed(2)}</td>
                                <td className="px-2 py-1">{r.pr.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {resultsView === 'chart' && (() => {
                      const BRANCH_CONFIG: Record<string, { label: string; color: string; dotColor: string; bg: string }> = {
                        none: { label: 'Aucune décision', color: '#6b7280', dotColor: '#9ca3af', bg: 'bg-gray-100 text-gray-700 border-gray-300' },
                        reactif: { label: 'Réactif', color: '#dc2626', dotColor: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' },
                        prudent: { label: 'Prudent', color: '#2563eb', dotColor: '#3b82f6', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                        tardif: { label: 'Tardif', color: '#16a34a', dotColor: '#22c55e', bg: 'bg-green-50 text-green-700 border-green-200' },
                      };

                      const safeVal = (v: number | undefined, max: number) => {
                        if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
                        return Math.max(0, Math.min(100, (v / max) * 100));
                      };
                      const safeInvVal = (v: number | undefined, maxRange: number) => {
                        if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
                        return Math.max(0, Math.min(100, ((Math.max(0, maxRange - Math.abs(v))) / maxRange) * 100));
                      };
                      const safeFmt = (v: number | undefined, digits: number = 2) => {
                        if (typeof v !== 'number' || !Number.isFinite(v)) return '0.00';
                        return v.toFixed(digits);
                      };

                      // --- MODE 1 : SUPERPOSITION DES 4 BRANCHES ---
                      if (superimposeBranches) {
                        if (uniqueScenarios.length === 0) {
                          return (
                            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                              <p className="text-gray-600 text-xs">Aucun scénario disponible avec les filtres actuels.</p>
                            </div>
                          );
                        }
                        const clampedScenIdx = Math.max(0, Math.min(uniqueScenarios.length - 1, scenarioIndex));
                        const currentScenarioId = uniqueScenarios[clampedScenIdx] ?? uniqueScenarios[0] ?? '';
                        const scenarioRows = results.filter(r => r.scenario_id === currentScenarioId);

                        // Assemblage des points multi-branches par x
                        const xMap: Record<number, any> = {};
                        scenarioRows.forEach(row => {
                          const pts = (row.points && row.points.length > 0)
                            ? row.points
                            : Array.from({ length: 41 }, (_, i) => ({ x: i, y: resilienceModelCore(i, row) }));
                          pts.forEach(pt => {
                            if (!xMap[pt.x]) xMap[pt.x] = { x: pt.x };
                            if (row.points && row.points.length > 0) {
                              xMap[pt.x][`${row.branch_id}_obs`] = pt.y;
                            }
                            xMap[pt.x][`${row.branch_id}_fit`] = resilienceModelCore(pt.x, row);
                          });
                        });
                        const multiChartData = Object.values(xMap).sort((a: any, b: any) => a.x - b.x);

                        const goToScen = (i: number) => {
                          const target = Math.max(0, Math.min(uniqueScenarios.length - 1, i));
                          setScenarioIndex(target);
                        };

                        // Construction du radar comparatif pour ce scénario
                        const radarBranchesData = [
                          {
                            metric: 'CRD',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeVal(r.crd, 5)]))
                          },
                          {
                            metric: 'IPC (inv)',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeInvVal(r.ipc, 2)]))
                          },
                          {
                            metric: 'TRP (inv)',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeInvVal(r.trp, 6)]))
                          },
                          {
                            metric: 'SRA',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeVal(r.sra, 4)]))
                          },
                          {
                            metric: 'ERR',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeVal(r.err, 1.5)]))
                          },
                          {
                            metric: 'PR',
                            ...Object.fromEntries(scenarioRows.map(r => [r.branch_id, safeVal(r.pr, 4)]))
                          },
                        ];

                        return (
                          <div className="mt-2 space-y-3">
                            {/* Barre d'options de superposition */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-orange-50/70 to-slate-50 border border-orange-200 rounded-lg shadow-xs">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={superimposeBranches}
                                  onChange={e => {
                                    setIsCinematic(false);
                                    setSuperimposeBranches(e.target.checked);
                                  }}
                                  className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                                />
                                <span className="flex items-center gap-1.5 text-orange-950 font-bold">
                                  <Layers size={16} className="text-orange-600" />
                                  Superposer les 4 branches (Réactif, Prudent, Tardif, Aucune décision)
                                </span>
                              </label>

                              {/* Filtres d'affichage des branches */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-500">Afficher :</span>
                                {(['none', 'reactif', 'prudent', 'tardif'] as const).map(b => (
                                  <button
                                    key={b}
                                    type="button"
                                    onClick={() => setVisibleBranches(prev => ({ ...prev, [b]: !prev[b] }))}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                      visibleBranches[b]
                                        ? 'shadow-xs text-white'
                                        : 'bg-white text-gray-400 border-gray-200 opacity-60'
                                    }`}
                                    style={{
                                      backgroundColor: visibleBranches[b] ? BRANCH_CONFIG[b].color : undefined,
                                      borderColor: BRANCH_CONFIG[b].color,
                                    }}
                                  >
                                    {BRANCH_CONFIG[b].label}
                                  </button>
                                ))}
                                <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={showFittedLines}
                                    onChange={e => setShowFittedLines(e.target.checked)}
                                    className="accent-orange-600 w-3.5 h-3.5"
                                  />
                                  <span>Modèles ajustés p(x)</span>
                                </label>
                                <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={showObservedDots}
                                    onChange={e => setShowObservedDots(e.target.checked)}
                                    className="accent-orange-600 w-3.5 h-3.5"
                                  />
                                  <span>Points observés</span>
                                </label>
                              </div>
                            </div>

                            {/* Navigation Scénario par Scénario */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setIsCinematic(false); goToScen(clampedScenIdx - 1); }}
                                  disabled={clampedScenIdx === 0}
                                  className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white shadow-sm"
                                  title="Scénario précédent"
                                >
                                  <ChevronLeft size={16} />
                                </button>

                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="font-semibold text-gray-700">Scénario</span>
                                  <select
                                    value={currentScenarioId}
                                    onChange={e => {
                                      setIsCinematic(false);
                                      const idx = uniqueScenarios.indexOf(e.target.value);
                                      if (idx >= 0) goToScen(idx);
                                    }}
                                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800 shadow-sm"
                                  >
                                    {uniqueScenarios.map((s, idx) => (
                                      <option key={s} value={s}>
                                        {s} ({idx + 1}/{uniqueScenarios.length})
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-gray-500 font-semibold">/ {uniqueScenarios.length}</span>
                                </div>

                                <button
                                  onClick={() => { setIsCinematic(false); goToScen(clampedScenIdx + 1); }}
                                  disabled={clampedScenIdx === uniqueScenarios.length - 1}
                                  className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white shadow-sm"
                                  title="Scénario suivant"
                                >
                                  <ChevronRight size={16} />
                                </button>

                                {/* Bouton Cinématique */}
                                <button
                                  type="button"
                                  onClick={toggleCinematic}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ml-2 ${
                                    isCinematic
                                      ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400 animate-pulse'
                                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                                  }`}
                                  title={isCinematic ? 'Pause' : 'Défiler tous les scénarios en cinématique avec les 4 courbes superposées'}
                                >
                                  {isCinematic ? <Pause size={13} /> : <Film size={13} />}
                                  <span>{isCinematic ? 'Pause' : 'Cinématique'}</span>
                                </button>

                                {isCinematic && (
                                  <select
                                    value={cinematicSpeedMs}
                                    onChange={e => setCinematicSpeedMs(Number(e.target.value))}
                                    className="px-2 py-1 bg-white border border-amber-300 text-amber-900 rounded text-xs font-medium"
                                  >
                                    <option value={1200}>1.2s</option>
                                    <option value={800}>0.8s</option>
                                    <option value={500}>0.5s</option>
                                  </select>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1 rounded border border-gray-200">
                                  Scénario : <span className="text-orange-600 font-mono text-sm">{currentScenarioId}</span>
                                </span>
                                <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded font-semibold">
                                  {scenarioRows.length} branches disponibles
                                </span>
                              </div>
                            </div>

                            {/* Plan de dessin : 2/3 Courbe + 1/3 Radar des 6 IP comparatif */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* 2/3 : Graphique multi-courbes superposées */}
                              <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                  <span>Superposition des 4 branches — Scénario {currentScenarioId}</span>
                                  <span className="text-[11px] font-semibold text-gray-500">x = day_rel - start</span>
                                </h4>
                                <ResponsiveContainer width="100%" height={450}>
                                  <LineChart data={multiChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="x" label={{ value: 'x = day_rel - start', position: 'insideBottom', offset: -5 }} />
                                    <YAxis domain={[0, 1.05]} label={{ value: 'ip', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ea580c', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Choc (t=0)', fill: '#64748b', fontSize: 11 }} />

                                    {(['none', 'reactif', 'prudent', 'tardif'] as const).map(b => {
                                      if (!visibleBranches[b]) return null;
                                      const hasData = scenarioRows.some(r => r.branch_id === b);
                                      if (!hasData) return null;
                                      const cfg = BRANCH_CONFIG[b];
                                      return (
                                        <React.Fragment key={b}>
                                          {showFittedLines && (
                                            <Line
                                              type="monotone"
                                              dataKey={`${b}_fit`}
                                              name={`${cfg.label} — Modèle p(x)`}
                                              stroke={cfg.color}
                                              strokeWidth={2.8}
                                              dot={false}
                                              connectNulls
                                            />
                                          )}
                                          {showObservedDots && (
                                            <Line
                                              type="monotone"
                                              dataKey={`${b}_obs`}
                                              name={`${cfg.label} — Observé`}
                                              stroke={cfg.dotColor}
                                              strokeWidth={1}
                                              strokeDasharray="2 2"
                                              dot={{ r: 2.5, fill: cfg.color }}
                                              connectNulls
                                            />
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>

                              {/* 1/3 : Radar des 6 IP comparatif entre les branches */}
                              <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <Sliders size={14} className="text-orange-600" />
                                      <span>Radar comparatif des 6 IP</span>
                                    </h4>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {currentScenarioId}
                                    </span>
                                  </div>

                                  <div className="w-full h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart data={radarBranchesData}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#374151', fontWeight: 'bold', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                                        {(['none', 'reactif', 'prudent', 'tardif'] as const).map(b => {
                                          if (!visibleBranches[b]) return null;
                                          const hasData = scenarioRows.some(r => r.branch_id === b);
                                          if (!hasData) return null;
                                          const cfg = BRANCH_CONFIG[b];
                                          return (
                                            <Radar
                                              key={b}
                                              name={cfg.label}
                                              dataKey={b}
                                              stroke={cfg.color}
                                              fill={cfg.color}
                                              fillOpacity={0.25}
                                            />
                                          );
                                        })}
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-gray-600 space-y-1 mt-2">
                                  <span className="font-bold text-gray-800 block text-[11px]">Indicateurs clés (plus l'aire est étendue, plus le profil est résilient) :</span>
                                  <p>• <strong>CRD, SRA, ERR, PR</strong> : Normalisés de 0 à 100% (valeurs élevées souhaitées).</p>
                                  <p>• <strong>IPC, TRP</strong> : Inversés (100% = perte min et récupération ultra-rapide).</p>
                                </div>
                              </div>
                            </div>

                            {/* Tableau comparatif des 4 branches pour ce scénario */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto shadow-xs">
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Comparatif des paramètres et KPI pour le scénario {currentScenarioId}
                              </h4>
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {['Branche', 'R²', 'R² (lissé)', 'RMSE', 'k (base)', 'q (gain)', 'h (chute)', 'g (choc)', 'd (délai)', 'α (déclin)', 'β (récup)', 'IPC', 'CRD', 'TRP', 'SRA', 'ERR', 'PR'].map(col => (
                                      <th key={col} className="px-2 py-1 border-b border-gray-200 text-left font-semibold text-gray-700">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {scenarioRows.map((r, i) => {
                                    const cfg = BRANCH_CONFIG[r.branch_id] ?? { label: r.branch_id, color: '#000' };
                                    return (
                                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-2 py-1.5 font-bold flex items-center gap-1.5">
                                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }}></span>
                                          <span>{cfg.label}</span>
                                        </td>
                                        <td className="px-2 py-1 font-bold text-green-700">{r.r2.toFixed(3)}</td>
                                        <td className="px-2 py-1 font-bold text-teal-700" title="R² calculé contre la série lissée par moyenne mobile">{(r.r2_smooth ?? r.r2).toFixed(3)}</td>
                                        <td className="px-2 py-1 font-mono text-gray-700">{r.rmse.toFixed(4)}</td>
                                        <td className="px-2 py-1">{r.k.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.q.toFixed(2)}</td>
                                        <td className="px-2 py-1 font-bold text-orange-700">{r.h.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.g.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.d.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.alpha.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.beta.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.ipc.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.crd.toFixed(2)}</td>
                                        <td className="px-2 py-1 font-semibold text-indigo-700">{r.trp.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.sra.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.err.toFixed(2)}</td>
                                        <td className="px-2 py-1">{r.pr.toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      // --- MODE 2 : COURBE UNIQUE DÉTAILLÉE ---
                      if (filteredResults.length === 0) {
                        return (
                          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 text-xs">Aucune courbe ne correspond aux filtres.</p>
                          </div>
                        );
                      }

                      const clampedIndex = Math.max(0, Math.min(filteredResults.length - 1, curveIndex));
                      const current = filteredResults[clampedIndex];
                      if (!current) {
                        return (
                          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 text-xs">Données de la courbe indisponibles.</p>
                          </div>
                        );
                      }

                      const points = (current.points && current.points.length > 0)
                        ? current.points
                        : Array.from({ length: 41 }, (_, i) => ({ x: i, y: resilienceModelCore(i, current) }));

                      const chartData = points.map(pt => ({
                        x: pt.x,
                        observed: pt.y,
                        model: resilienceModelCore(pt.x, current)
                      }));

                      const goTo = (i: number) => {
                        const target = Math.max(0, Math.min(filteredResults.length - 1, i));
                        setCurveIndex(target);
                        setCurveIndexInput(String(target + 1));
                      };

                      const currentRadarData = [
                        { metric: 'CRD', value: safeVal(current.crd, 5), fullMark: 100, raw: safeFmt(current.crd, 2), label: 'CRD (Récupération)' },
                        { metric: 'IPC (inv)', value: safeInvVal(current.ipc, 2), fullMark: 100, raw: safeFmt(current.ipc, 2), label: 'IPC (Perte cumulée)' },
                        { metric: 'TRP (inv)', value: safeInvVal(current.trp, 6), fullMark: 100, raw: safeFmt(current.trp, 2), label: 'TRP (Temps récup.)' },
                        { metric: 'SRA', value: safeVal(current.sra, 4), fullMark: 100, raw: safeFmt(current.sra, 2), label: 'SRA (Robustesse)' },
                        { metric: 'ERR', value: safeVal(current.err, 1.5), fullMark: 100, raw: safeFmt(current.err, 2), label: 'ERR (Efficacité)' },
                        { metric: 'PR', value: safeVal(current.pr, 4), fullMark: 100, raw: safeFmt(current.pr, 2), label: 'PR (Potentiel)' },
                      ];

                      return (
                        <div className="mt-2 space-y-3">
                          {/* Option pour basculer vers la superposition */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-orange-50/70 to-slate-50 border border-orange-200 rounded-lg shadow-xs">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                              <input
                                type="checkbox"
                                checked={superimposeBranches}
                                onChange={e => {
                                  setIsCinematic(false);
                                  setSuperimposeBranches(e.target.checked);
                                }}
                                className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                              />
                              <span className="flex items-center gap-1.5 text-gray-800 font-bold">
                                <Layers size={16} className="text-orange-600" />
                                Superposer les 4 branches (Réactif, Prudent, Tardif, Aucune décision) avec couleurs distinctes
                              </span>
                            </label>
                            <span className="text-xs text-gray-500">
                              Mode actuel : courbe individuelle ({clampedIndex + 1}/{filteredResults.length})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setIsCinematic(false); goTo(clampedIndex - 1); }}
                                disabled={clampedIndex === 0}
                                className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white shadow-sm"
                                title="Courbe précédente"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-gray-700">Courbe</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={filteredResults.length}
                                  value={curveIndexInput}
                                  onChange={(e) => setCurveIndexInput(e.target.value)}
                                  onBlur={() => goTo((parseInt(curveIndexInput, 10) || 1) - 1)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') goTo((parseInt(curveIndexInput, 10) || 1) - 1); }}
                                  className="w-14 px-1.5 py-1 border border-gray-300 rounded text-center text-xs font-medium"
                                />
                                <span className="text-gray-500 font-semibold">/ {filteredResults.length}</span>
                              </div>

                              <button
                                onClick={() => { setIsCinematic(false); goTo(clampedIndex + 1); }}
                                disabled={clampedIndex === filteredResults.length - 1}
                                className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white shadow-sm"
                                title="Courbe suivante"
                              >
                                <ChevronRight size={16} />
                              </button>

                              {/* Bouton Cinématique pour l'ajustement par lot */}
                              <button
                                type="button"
                                onClick={toggleCinematic}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ml-2 ${
                                  isCinematic
                                    ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400 animate-pulse'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                }`}
                                title={isCinematic ? 'Pause' : 'Défiler toutes les courbes filtrées en cinématique'}
                              >
                                {isCinematic ? <Pause size={13} /> : <Film size={13} />}
                                <span>{isCinematic ? 'Pause' : 'Cinématique'}</span>
                              </button>

                              {isCinematic && (
                                <select
                                  value={cinematicSpeedMs}
                                  onChange={e => setCinematicSpeedMs(Number(e.target.value))}
                                  className="px-2 py-1 bg-white border border-amber-300 text-amber-900 rounded text-xs font-medium"
                                >
                                  <option value={1000}>1.0s</option>
                                  <option value={650}>0.65s</option>
                                  <option value={350}>0.35s</option>
                                </select>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-800 bg-white px-2.5 py-1 rounded border border-gray-200">
                                {current.scenario_id} · <span className="text-orange-600">{current.branch_id}</span>
                              </span>
                              <span className="text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-1 rounded font-semibold">
                                R² = {current.r2.toFixed(3)}
                              </span>
                              <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded font-semibold" title="R² calculé contre la série lissée par moyenne mobile">
                                R² (lissé) = {(current.r2_smooth ?? current.r2).toFixed(3)}
                              </span>
                              <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded font-semibold">
                                RMSE = {current.rmse.toFixed(4)}
                              </span>
                              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded font-semibold">
                                Chute h = {current.h.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Plan de dessin : 2/3 Courbe + 1/3 Radar des 6 IP animé en cinématique */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* 2/3 : Courbe LineChart */}
                            <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md border border-gray-200">
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span>Profil de résilience observé vs modèle ajusté p(x)</span>
                                <span className="text-[11px] font-semibold text-gray-500">x = day_rel - start</span>
                              </h4>
                              <ResponsiveContainer width="100%" height={450}>
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="x" label={{ value: 'x = day_rel - start', position: 'insideBottom', offset: -5 }} />
                                  <YAxis domain={[0, 1.05]} label={{ value: 'ip', angle: -90, position: 'insideLeft' }} />
                                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ea580c', borderRadius: '8px' }} />
                                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                  <ReferenceLine x={current.g} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Choc (g)', fill: '#ef4444', fontWeight: 'bold' }} />
                                  <ReferenceLine x={current.g + current.d} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Récupération (g+d)', fill: '#22c55e', fontWeight: 'bold' }} />
                                  <Line type="monotone" dataKey="observed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="ip observé" />
                                  <Line type="monotone" dataKey="model" stroke="#ea580c" strokeWidth={3} dot={false} name="Modèle p(x) ajusté" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* 1/3 : Graphe Radar des 6 IP animé en temps réel */}
                            <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sliders size={14} className="text-orange-600" />
                                    <span>Radar des 6 IP de résilience</span>
                                  </h4>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                    {current.scenario_id} · {current.branch_id}
                                  </span>
                                </div>

                                <div className="w-full h-[280px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={currentRadarData}>
                                      <PolarGrid stroke="#e5e7eb" />
                                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#374151', fontWeight: 'bold', fontSize: 11 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                                      <Radar name={`${current.scenario_id} - ${current.branch_id}`} dataKey="value" stroke="#ea580c" fill="#ea580c" fillOpacity={0.4} />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Détail des 6 IP de la courbe */}
                              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 text-[11px]">
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">CRD</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.crd, 2)}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">IPC</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.ipc, 2)}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">TRP</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.trp, 2)}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">SRA</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.sra, 2)}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">ERR</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.err, 2)}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                                  <span className="text-gray-500 block text-[10px]">PR</span>
                                  <strong className="text-orange-700 font-mono">{safeFmt(current.pr, 2)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 text-xs text-gray-700">
              Remarque : si un scénario contient plusieurs perturbations dans perturbations.csv,
              seule la première rencontrée est utilisée pour caler x = day_rel - start.
            </div>
          </div>
        </div>
  );
};

interface UploadedDataPoint {
  timestamp: number;
  netPerf?: number;
  netPerf_Base?: number;
  netPerf_Flux?: number | null;
}

interface ChartDataPoint {
  x: number;
  y: number;
  observed_base: number | null;
  observed_flux: number | null;
}

interface ModelMetrics {
  min?: number;
  max?: number;
  recoveryTime?: number;
  declineSpeed?: number;
  finalLevel?: number;
}

const ResilienceModel = () => {
  const defaultParams = {
    k: 13.0,
    q: -1.0,
    h: 9.0,
    g: 3.0,
    d: 19.0,
    alpha: 3.0,
    beta: 0.75
  };

  const [activeTab, setActiveTab] = useState<'generateur' | 'manual' | 'batch' | 'download' | 'docs'>('generateur');
  const [generatedDataset, setGeneratedDataset] = useState<ScenarioDataset | null>(null);
  const [autoRunBatchRequested, setAutoRunBatchRequested] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<ResilienceRow[]>([]);
  const [resilienceCsv, setResilienceCsv] = useState<string>('');

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const handleLaunchBatch = () => {
    setAutoRunBatchRequested(true);
    setActiveTab('batch');
  };

  const handleBatchResultsReady = (results: ResilienceRow[], csvText: string) => {
    setBatchResults(results);
    setResilienceCsv(csvText);
  };

  const handleRestoreProcess = (bundle: {
    dataset: ScenarioDataset;
    resilienceRows?: ResilienceRow[];
    resilienceCsv?: string;
    params?: any;
  }) => {
    if (bundle.dataset) {
      setGeneratedDataset(bundle.dataset);
    }
    if (bundle.resilienceRows && bundle.resilienceRows.length > 0) {
      setBatchResults(bundle.resilienceRows);
    }
    if (bundle.resilienceCsv) {
      setResilienceCsv(bundle.resilienceCsv);
    }
  };
  const [params, setParams] = useState(defaultParams);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [uploadedData, setUploadedData] = useState<UploadedDataPoint[]>([]);
  const [smoothingMethod, setSmoothingMethod] = useState('none');
  const [translationX, setTranslationX] = useState(0);
  const [translationY, setTranslationY] = useState(0);
  const [zoomScale, setZoomScale] = useState(0);
  const [metrics, setMetrics] = useState<ModelMetrics>({});
  // FIX for lines 857, 862, 867, 872, 877, 882: Initialize kpis state with default values to avoid accessing properties on an empty object during initial render.
  const [kpis, setKpis] = useState({
    crd: 0,
    ipc: 0,
    trp: 0,
    sra: 0,
    err: 0,
    pr: 0,
  });
  const [isAdjustmentMode, setIsAdjustmentMode] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const configInputRef = React.useRef<HTMLInputElement>(null);

  const paramConfig: { key: ParamKey; label: string; min: number; max: number; step: number; desc: string }[] = [
    { key: 'k', label: 'k - Niveau de base', min: 0, max: 100, step: 0.1, desc: 'Offset vertical de référence • Contrainte: k > h/2' },
    { key: 'q', label: 'q - Amplitude de récupération', min: -100, max: 100, step: 0.1, desc: 'Gain/perte après récupération • Contrainte: q > -h' },
    { key: 'h', label: 'h - Profondeur du déclin', min: 0, max: 100, step: 0.1, desc: 'Amplitude maximale de la chute • Contrainte: 0 < h < 2k' },
    { key: 'g', label: 'g - Point d\'inflexion déclin', min: 0, max: 100, step: 0.1, desc: 'Moment de l\'événement perturbateur • Contrainte: g > 0' },
    { key: 'd', label: 'd - Délai de récupération', min: 1, max: 20, step: 0.1, desc: 'Temps entre choc et début de récupération • Contrainte: d > 0' },
    { key: 'alpha', label: 'α - Vitesse de déclin', min: 0.5, max: 10, step: 0.1, desc: 'Raideur de la transition de déclin • Contrainte: α > 0' },
    { key: 'beta', label: 'β - Vitesse de récupération', min: 0.5, max: 10, step: 0.1, desc: 'Raideur de la transition de récupération • Contrainte: β > 0' }
  ];

  // Le modèle de résilience et le calcul des KPI sont désormais définis une seule fois,
  // en dehors du composant (resilienceModelCore, calculateKPIsCore), et réutilisés ici
  // pour que le mode manuel et le traitement par lot appliquent exactement la même formule.
  const resilienceModel = resilienceModelCore;
  const calculateKPIs = calculateKPIsCore;

  interface KpiRange {
    min: number;
    max: number;
    color: string;
    status: string;
    class: string;
  }

  const getKPIStatus = (value: number, ranges: KpiRange[]) => {
    for (const range of ranges) {
      if (value >= range.min && value <= range.max) {
        return range;
      }
    }
    return ranges[0];
  };

  interface SmoothedPoint {
    timestamp: number;
    netPerf: number;
    [key: string]: any;
  }

  const applySmoothing = (data: any[], method: string): SmoothedPoint[] => {
    if (!data || data.length === 0) return [];
    
    switch (method) {
      case 'none':
        const interpolated: SmoothedPoint[] = [];
        for (let i = 0; i < data.length - 1; i++) {
          interpolated.push(data[i]);
          const p1 = data[i];
          const p2 = data[i + 1];
          const steps = Math.max(2, Math.floor((p2.timestamp - p1.timestamp) * 10));
          
          for (let j = 1; j < steps; j++) {
            const t = j / steps;
            interpolated.push({
              timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
              netPerf: p1.netPerf + (p2.netPerf - p1.netPerf) * t
            });
          }
        }
        interpolated.push(data[data.length - 1]);
        return interpolated;
      
      case 'moving':
        const window = 5;
        const smoothed = data.map((point: any, index: number) => {
          const start = Math.max(0, index - Math.floor(window / 2));
          const end = Math.min(data.length, index + Math.ceil(window / 2));
          const slice = data.slice(start, end);
          const avg = slice.reduce((sum: number, p: any) => sum + p.netPerf, 0) / slice.length;
          return { ...point, netPerf: avg };
        });
        
        const movingInterpolated: SmoothedPoint[] = [];
        for (let i = 0; i < smoothed.length - 1; i++) {
          movingInterpolated.push(smoothed[i]);
          const p1 = smoothed[i];
          const p2 = smoothed[i + 1];
          const steps = Math.max(2, Math.floor((p2.timestamp - p1.timestamp) * 10));
          
          for (let j = 1; j < steps; j++) {
            const t = j / steps;
            movingInterpolated.push({
              timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
              netPerf: p1.netPerf + (p2.netPerf - p1.netPerf) * t
            });
          }
        }
        movingInterpolated.push(smoothed[smoothed.length - 1]);
        return movingInterpolated;
      
      case 'exponential':
        const alpha = 0.3;
        const expSmoothed: any[] = [];
        let prevValue = data[0].netPerf;
        
        for (const point of data) {
          const newValue = alpha * point.netPerf + (1 - alpha) * prevValue;
          expSmoothed.push({ ...point, netPerf: newValue });
          prevValue = newValue;
        }
        
        const expInterpolated: SmoothedPoint[] = [];
        for (let i = 0; i < expSmoothed.length - 1; i++) {
          expInterpolated.push(expSmoothed[i]);
          const p1 = expSmoothed[i];
          const p2 = expSmoothed[i + 1];
          const steps = Math.max(2, Math.floor((p2.timestamp - p1.timestamp) * 10));
          
          for (let j = 1; j < steps; j++) {
            const t = j / steps;
            expInterpolated.push({
              timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
              netPerf: p1.netPerf + (p2.netPerf - p1.netPerf) * t
            });
          }
        }
        expInterpolated.push(expSmoothed[expSmoothed.length - 1]);
        return expInterpolated;
      
      case 'spline':
        if (data.length < 4) return data;
        
        const splineInterpolated: SmoothedPoint[] = [];
        for (let i = 0; i < data.length - 1; i++) {
          const p0 = data[Math.max(0, i - 1)];
          const p1 = data[i];
          const p2 = data[i + 1];
          const p3 = data[Math.min(data.length - 1, i + 2)];
          
          const steps = Math.max(5, Math.floor((p2.timestamp - p1.timestamp) * 20));
          
          for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const t2 = t * t;
            const t3 = t2 * t;
            
            const v = 0.5 * (
              (2 * p1.netPerf) +
              (-p0.netPerf + p2.netPerf) * t +
              (2 * p0.netPerf - 5 * p1.netPerf + 4 * p2.netPerf - p3.netPerf) * t2 +
              (-p0.netPerf + 3 * p1.netPerf - 3 * p2.netPerf + p3.netPerf) * t3
            );
            
            const timestamp = p1.timestamp + (p2.timestamp - p1.timestamp) * t;
            splineInterpolated.push({ timestamp, netPerf: v });
          }
        }
        splineInterpolated.push(data[data.length - 1]);
        return splineInterpolated;
      
      default:
        return data;
    }
  };

  useEffect(() => {
    const xRange = Array.from({length: 2500}, (_, i) => i * 0.02);
    const modelData = xRange.map(x => ({
      x: x,
      y: resilienceModel(x, params)
    }));
    
    // Handle both old and new data structures for backward compatibility
    const baseData = uploadedData
      .map(d => ({ timestamp: d.timestamp, netPerf: d.netPerf_Base ?? d.netPerf }))
      .filter((d): d is { timestamp: number; netPerf: number } => d.netPerf != null);
    const fluxData = uploadedData
      .map(d => ({ timestamp: d.timestamp, netPerf: d.netPerf_Flux }))
      .filter((d): d is { timestamp: number; netPerf: number | null } => d.netPerf != null) as { timestamp: number; netPerf: number }[];

    const smoothedDataBase = applySmoothing(baseData, smoothingMethod);
    const smoothedDataFlux = applySmoothing(fluxData, smoothingMethod);
    
    if (uploadedData.length === 0) {
      setChartData(modelData.map(point => ({
        x: point.x,
        y: point.y,
        observed_base: null,
        observed_flux: null,
      })));
      
      const yValues = modelData.map(d => d.y);
      const minVal = Math.min(...yValues);
      const maxVal = Math.max(...yValues);
      const minIndex = yValues.indexOf(minVal);
      const finalVal = yValues[yValues.length - 1];
      const targetRecovery = minVal + 0.9 * (finalVal - minVal);
      
      let recoveryIndex = yValues.length - 1;
      for (let i = minIndex; i < yValues.length; i++) {
        if (yValues[i] >= targetRecovery) {
          recoveryIndex = i;
          break;
        }
      }
      const recoveryTime = xRange[recoveryIndex] - xRange[minIndex];

      let maxDeclineSpeed = 0;
      for (let i = 1; i < yValues.length; i++) {
        const speed = Math.abs(yValues[i] - yValues[i-1]) / (xRange[i] - xRange[i-1]);
        if (yValues[i] < yValues[i-1] && speed > maxDeclineSpeed) {
          maxDeclineSpeed = speed;
        }
      }

      setMetrics({
        min: minVal,
        max: maxVal,
        recoveryTime: recoveryTime,
        declineSpeed: maxDeclineSpeed,
        finalLevel: finalVal
      });

      setKpis(calculateKPIs(params));
      return;
    }
    
    const values = smoothedDataBase.map((p: any) => p.netPerf);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const currentAmplitude = maxValue - minValue;
    
    const targetAmplitude = 20;
    const normalizationFactor = currentAmplitude > 0 ? targetAmplitude / currentAmplitude : 1;
    const centerY = (minValue + maxValue) / 2;
    
    const zoomFactor = 1 + (zoomScale / 100);
    
    const timestamps = smoothedDataBase.map((p: any) => p.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const centerX = (minTime + maxTime) / 2;
    
    const applyTransformations = (data: any[]) => data.map((point: any) => ({
      timestamp: centerX + (point.timestamp - centerX) * zoomFactor + translationX,
      netPerf: centerY + (point.netPerf - centerY) * normalizationFactor * zoomFactor + translationY
    }));

    const translatedDataBase = applyTransformations(smoothedDataBase);
    const translatedDataFlux = applyTransformations(smoothedDataFlux);
    
    const combinedData = modelData.map(point => {
      const basePoint = translatedDataBase.find((d: any) => Math.abs(d.timestamp - point.x) < 0.1);
      const fluxPoint = translatedDataFlux.find((d: any) => Math.abs(d.timestamp - point.x) < 0.1);
      return {
        x: point.x,
        y: point.y,
        observed_base: basePoint ? basePoint.netPerf : null,
        observed_flux: fluxPoint ? fluxPoint.netPerf : null
      };
    });
    
    setChartData(combinedData);

    const yValues = modelData.map(d => d.y);
    const minVal = Math.min(...yValues);
    const maxVal = Math.max(...yValues);
    const minIndex = yValues.indexOf(minVal);
    const finalVal = yValues[yValues.length - 1];
    const targetRecovery = minVal + 0.9 * (finalVal - minVal);
    
    let recoveryIndex = yValues.length - 1;
    for (let i = minIndex; i < yValues.length; i++) {
      if (yValues[i] >= targetRecovery) {
        recoveryIndex = i;
        break;
      }
    }
    const recoveryTime = xRange[recoveryIndex] - xRange[minIndex];

    let maxDeclineSpeed = 0;
    for (let i = 1; i < yValues.length; i++) {
      const speed = Math.abs(yValues[i] - yValues[i-1]) / (xRange[i] - xRange[i-1]);
      if (yValues[i] < yValues[i-1] && speed > maxDeclineSpeed) {
        maxDeclineSpeed = speed;
      }
    }

    setMetrics({
      min: minVal,
      max: maxVal,
      recoveryTime: recoveryTime,
      declineSpeed: maxDeclineSpeed,
      finalLevel: finalVal
    });

    setKpis(calculateKPIs(params));
  }, [params, uploadedData, smoothingMethod, translationX, translationY, zoomScale]);

  const handleParamChange = (key: ParamKey, value: string) => {
    const newParams = { ...params, [key]: parseFloat(value) };
    
    if (key === 'h') {
      if (newParams.q <= -newParams.h) {
        newParams.q = -newParams.h + 0.1;
      }
    }
    
    setParams(newParams);
  };

  const resetToDefaults = () => {
    setParams(defaultParams);
    showMessage('info', 'Paramètres réinitialisés aux valeurs par défaut');
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const exportConfiguration = () => {
    const config = {
      version: '1.0',
      date: new Date().toISOString(),
      params: params,
      csvData: uploadedData,
      csvSettings: {
        smoothingMethod,
        translationX,
        translationY,
        zoomScale
      }
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const exportFileName = `resilience_config_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = exportFileName;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
    
    showMessage('success', 'Configuration exportée avec succès');
  };

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target || typeof e.target.result !== 'string') {
          showMessage('error', 'Erreur lors de la lecture du fichier de configuration.');
          return;
        }
        const config = JSON.parse(e.target.result);
        
        if (config.params) {
          setParams(config.params);
        }
        
        if (config.csvData && Array.isArray(config.csvData)) {
          setUploadedData(config.csvData);
        }
        
        if (config.csvSettings) {
          setSmoothingMethod(config.csvSettings.smoothingMethod || 'none');
          setTranslationX(config.csvSettings.translationX || 0);
          setTranslationY(config.csvSettings.translationY || 0);
          setZoomScale(config.csvSettings.zoomScale || 0);
        }
        
        showMessage('success', 'Configuration importée avec succès');
      } catch (parseError) {
        showMessage('error', 'Erreur lors de la lecture de la configuration');
        console.error(parseError);
      }
    };
    
    reader.onerror = () => {
      showMessage('error', 'Erreur lors de la lecture du fichier');
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;
  
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (!e.target || typeof e.target.result !== 'string') {
            showMessage('error', 'Erreur de lecture du fichier CSV.');
            return;
          }
          const fileContent = e.target.result;
          
          const lines = fileContent.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const timestampIdx = headers.indexOf('timestamp');
          const baseIdx = headers.indexOf('netperf_base');
          const fluxIdx = headers.indexOf('netperf_flux');
          const legacyIdx = headers.indexOf('netperf');
  
          const data: UploadedDataPoint[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            
            const hasNewFormat = baseIdx > -1 && fluxIdx > -1;
            const hasLegacyFormat = legacyIdx > -1;
            
            if (values.length < 2) continue;
  
            const ts = parseFloat(values[timestampIdx > -1 ? timestampIdx : 0]);
            let baseVal = NaN;
            let fluxVal: number | null = null;
  
            if (hasNewFormat) {
              baseVal = parseFloat(values[baseIdx]);
              fluxVal = parseFloat(values[fluxIdx]);
            } else if (hasLegacyFormat) {
              baseVal = parseFloat(values[legacyIdx]);
            } else { // Fallback to column order if no matching headers
              baseVal = parseFloat(values[1]);
              if (values.length >= 3) {
                fluxVal = parseFloat(values[2]);
              }
            }
  
            if (!isNaN(ts) && !isNaN(baseVal)) {
              data.push({ timestamp: ts, netPerf_Base: baseVal, netPerf_Flux: (fluxVal === null || isNaN(fluxVal)) ? null : fluxVal });
            }
          }
          
          setUploadedData(data);
          showMessage('success', `Données chargées: ${data.length} points`);
        } catch (parseError) {
          showMessage('error', 'Erreur lors du parsing du fichier');
          console.error(parseError);
        }
      };
      
      reader.onerror = () => {
        showMessage('error', 'Erreur lors de la lecture du fichier');
      };
      
      reader.readAsText(file);
    } catch (error) {
      showMessage('error', 'Erreur lors de la lecture du fichier');
      console.error(error);
    }
    
    event.target.value = '';
  };

  const validateParam = (key: string) => {
    const { k, q, h } = params;
    if (key === 'k' && k <= h/2) return false;
    if (key === 'q' && q <= -h) return false;
    if (key === 'h' && (h >= 2*k || h <= 0)) return false;
    return true;
  };

  // FIX for line 924: Define a type for KPI configuration to allow optional 'inverted' property.
  type KpiKey = 'crd' | 'ipc' | 'trp' | 'sra' | 'err' | 'pr';

  type KpiConfig = {
    label: string;
    inverted?: boolean;
    ranges: { min: number; max: number; color: string; status: string; class: string; }[];
    maxVal: number;
  };

  const kpiConfigs: Record<KpiKey, KpiConfig> = {
    crd: {
      label: 'CRD - Coefficient de Récupération Dynamique',
      ranges: [
        { min: 0, max: 1, color: '#fed7d7', status: 'Faible', class: 'poor' },
        { min: 1, max: 2, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 2, max: 3, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 3, max: 5, color: '#d4edda', status: 'Excellent', class: 'excellent' }
      ],
      maxVal: 5
    },
    ipc: {
      label: 'IPC - Indice de Perte Cumulée',
      inverted: true,
      ranges: [
        { min: 0, max: 0.5, color: '#fed7d7', status: 'Élevé', class: 'poor' },
        { min: 0.5, max: 1, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 1, max: 1.5, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 1.5, max: 2, color: '#d4edda', status: 'Faible', class: 'excellent' }
      ],
      maxVal: 2
    },
    trp: {
      label: 'TRP - Temps de Récupération Pondéré',
      inverted: true,
      ranges: [
        { min: 0, max: 1.5, color: '#fed7d7', status: 'Lent', class: 'poor' },
        { min: 1.5, max: 3, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 3, max: 4.5, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 4.5, max: 6, color: '#d4edda', status: 'Rapide', class: 'excellent' }
      ],
      maxVal: 6
    },
    sra: {
      label: 'SRA - Score de Robustesse Adaptative',
      ranges: [
        { min: 0, max: 0.5, color: '#fed7d7', status: 'Faible', class: 'poor' },
        { min: 0.5, max: 1, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 1, max: 2, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 2, max: 4, color: '#d4edda', status: 'Excellent', class: 'excellent' }
      ],
      maxVal: 4
    },
    err: {
      label: 'ERR - Efficacité de Résilience Relative',
      ranges: [
        { min: 0, max: 0.8, color: '#fed7d7', status: 'Faible', class: 'poor' },
        { min: 0.8, max: 1, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 1, max: 1.2, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 1.2, max: 1.5, color: '#d4edda', status: 'Excellent', class: 'excellent' }
      ],
      maxVal: 1.5
    },
    pr: {
      label: 'PR - Potentiel de Récupération',
      ranges: [
        { min: 0, max: 1, color: '#fed7d7', status: 'Limité', class: 'poor' },
        { min: 1, max: 1.5, color: '#fef3cd', status: 'Modéré', class: 'moderate' },
        { min: 1.5, max: 2.5, color: '#ffefd5', status: 'Bon', class: 'good' },
        { min: 2.5, max: 4, color: '#d4edda', status: 'Excellent', class: 'excellent' }
      ],
      maxVal: 4
    }
  };

  const smoothingOptions = [
    { value: 'none', label: 'Aucun' },
    { value: 'moving', label: 'Mobile' },
    { value: 'exponential', label: 'Exponentiel' },
    { value: 'spline', label: 'Spline' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-1 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('generateur')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'generateur' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Générateur de scénarios
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'manual' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Résilience hyperbolique
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'batch' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Ajustement par lot
            </button>
            <button
              onClick={() => setActiveTab('download')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'download'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <PackageCheck size={16} className={activeTab === 'download' ? 'text-white' : 'text-emerald-700'} />
              <span>Centre de téléchargement</span>
              {batchResults.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'download' ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'
                }`}>
                  Prêt
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'docs' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BookOpen size={16} />
              <span>Comprendre le modèle</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <UserAuthSync
              currentParams={params}
              onRestoreParams={(restored) => {
                if (restored) setParams(restored);
              }}
              currentDataset={generatedDataset}
              onRestoreDataset={(restored) => {
                if (restored) setGeneratedDataset(restored);
              }}
            />
          </div>
        </div>

        <div className={activeTab === 'docs' ? 'block' : 'hidden'}>
          <ModelDocumentation
            onGoToGenerator={() => setActiveTab('generateur')}
            onGoToHyperbolic={() => setActiveTab('manual')}
            onGoToBatch={() => setActiveTab('batch')}
            onGoToDownload={() => setActiveTab('download')}
          />
        </div>

        <div className={activeTab === 'generateur' ? 'block' : 'hidden'}>
          <Bloc1ScenarioGenerator
            dataset={generatedDataset}
            onDatasetGenerated={setGeneratedDataset}
            onNavigateToBatch={() => setActiveTab('batch')}
            onLaunchBatch={handleLaunchBatch}
          />
        </div>

        <div className={activeTab === 'batch' ? 'block' : 'hidden'}>
          <BatchProcessing
            generatedDataset={generatedDataset}
            autoRunRequested={autoRunBatchRequested}
            onAutoRunConsumed={() => setAutoRunBatchRequested(false)}
            initialResults={batchResults}
            onBatchResultsReady={handleBatchResultsReady}
            onNavigateToDownloadCenter={() => setActiveTab('download')}
          />
        </div>

        <div className={activeTab === 'download' ? 'block' : 'hidden'}>
          <DownloadCenter
            dataset={generatedDataset}
            resilienceRows={batchResults}
            resilienceCsv={resilienceCsv}
            onGoToGenerator={() => setActiveTab('generateur')}
            onGoToBatch={() => setActiveTab('batch')}
            onRestoreProcess={handleRestoreProcess}
          />
        </div>

        <div className={activeTab === 'manual' ? 'block' : 'hidden'}>
        <>
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <AlertCircle size={20} />
            {message.text}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">Fonction hyperbolique de la résilience</h1>
                <p className="mt-2 text-orange-100 font-mono text-lg">
                  p(x) = k + q/2 - (h/2)tanh(α(x-g)/2) + ((h+q)/2)tanh(β(x-g-d)/2)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  ref={configInputRef}
                  type="file"
                  accept=".json"
                  onChange={importConfiguration}
                  className="hidden"
                />
                <button
                  onClick={() => configInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 transition-colors text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Importer Config
                </button>
                <button
                  onClick={exportConfiguration}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 transition-colors text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Exporter Config
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 transition-colors text-sm"
                >
                  <RotateCcw size={18} />
                  Réinitialiser
                </button>
              </div>
            </div>
            
            {uploadedData.length > 0 && (
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className={`grid ${isAdjustmentMode ? 'grid-cols-6' : 'grid-cols-3'} gap-4 items-center`}>
                  <div className={isAdjustmentMode ? 'col-span-2' : 'col-span-1'}>
                    <label className="block text-sm font-semibold mb-2">Méthode de lissage</label>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 pt-1">
                      {smoothingOptions.map(option => (
                        <label key={option.value} className="flex items-center gap-1.5 text-white font-medium cursor-pointer select-none text-sm">
                          <input
                            type="radio"
                            name="smoothingMethod"
                            value={option.value}
                            checked={smoothingMethod === option.value}
                            onChange={(e) => setSmoothingMethod(e.target.value)}
                            className="w-4 h-4 bg-white text-orange-600 rounded-full border-transparent focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-500 appearance-none checked:bg-orange-600 checked:ring-2 checked:ring-white relative before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-white before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:opacity-0 checked:before:opacity-100 transition-all"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center justify-center gap-2 text-white font-medium cursor-pointer select-none text-sm p-2 rounded-lg hover:bg-white/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={isAdjustmentMode}
                        onChange={(e) => setIsAdjustmentMode(e.target.checked)}
                        className="w-4 h-4 bg-white text-orange-600 rounded border-transparent focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-500"
                      />
                      Ajustement
                    </label>
                  </div>
                  {isAdjustmentMode && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Translation X: {translationX.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="0.1"
                          value={translationX}
                          onChange={(e) => setTranslationX(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white bg-opacity-50 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Translation Y: {translationY.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          step="0.1"
                          value={translationY}
                          onChange={(e) => setTranslationY(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white bg-opacity-50 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Zoom: {zoomScale > 0 ? '+' : ''}{zoomScale.toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          step="1"
                          value={zoomScale}
                          onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white bg-opacity-50 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setUploadedData([]);
                        setSmoothingMethod('none');
                        setTranslationX(0);
                        setTranslationY(0);
                        setZoomScale(0);
                        showMessage('info', 'Données CSV supprimées');
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Supprimer CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {uploadedData.length === 0 && (
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 transition-colors text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Importer CSV
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 p-6">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-orange-500">
                  Configuration des Paramètres
                </h2>
                <div className="grid grid-cols-8 gap-3">
                  {paramConfig.map((config, index) => {
                    const isValid = validateParam(config.key);
                    return (
                      <div 
                        key={config.key} 
                        className={`bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg shadow-md border border-orange-200 hover:shadow-lg transition-shadow col-span-2 ${
                          index === 4 ? 'col-start-2' : ''
                        }`}
                      >
                        <label className="block font-bold text-gray-800 mb-2 text-sm">
                          {config.label}
                        </label>
                        <input
                          type="range"
                          min={config.min}
                          max={config.max}
                          step={config.step}
                          value={params[config.key]}
                          onChange={(e) => handleParamChange(config.key, e.target.value)}
                          className="w-full h-2 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-600 rounded-lg appearance-none cursor-pointer"
                          style={{
                            accentColor: '#ea580c'
                          }}
                        />
                        <div className={`mt-2 text-center p-1.5 rounded-lg font-mono font-bold text-base ${
                          isValid ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {params[config.key].toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-600 mt-2 italic leading-relaxed">{config.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-orange-500">
                  Visualisation de la Courbe de Résilience
                </h2>
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Temps (x)', position: 'insideBottom', offset: -5 }}
                        domain={[0, 50]}
                      />
                      <YAxis 
                        label={{ value: 'Performance', angle: -90, position: 'insideLeft' }}
                        domain={[0, 20]}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ea580c' }}
                        labelStyle={{ color: '#ea580c', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <ReferenceLine 
                        x={params.g} 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        strokeDasharray="5 5" 
                        label={{ value: 'Choc', fill: '#ef4444', fontWeight: 'bold' }} 
                      />
                      <ReferenceLine 
                        x={params.g + params.d} 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        strokeDasharray="5 5" 
                        label={{ value: 'Récupération', fill: '#22c55e', fontWeight: 'bold' }} 
                      />
                      <ReferenceLine 
                        y={params.k} 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="3 3" 
                        label={{ value: 'Niveau de base', fill: '#64748b', fontWeight: 'bold' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="y" 
                        stroke="#ea580c" 
                        strokeWidth={4}
                        dot={false}
                        name="Modèle p(x)"
                      />
                      {uploadedData.length > 0 && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="observed_base" 
                            stroke="#22c55e" 
                            strokeWidth={3}
                            dot={false}
                            name="Données NetPerf_Base (lissées)"
                            connectNulls={true}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="observed_flux" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={false}
                            name="Données NetPerf_Flux (lissées)"
                            connectNulls={true}
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-orange-500">
                  KPI de Résilience
                </h2>
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <ResponsiveContainer width="100%" height={500}>
                    <RadarChart data={[
                      {
                        metric: 'CRD',
                        value: Math.min(100, (kpis.crd / 5) * 100),
                        fullMark: 100
                      },
                      {
                        metric: 'IPC (inv)',
                        value: Math.min(100, (Math.max(0, 2 - Math.abs(kpis.ipc)) / 2) * 100),
                        fullMark: 100
                      },
                      {
                        metric: 'TRP (inv)',
                        value: Math.min(100, (Math.max(0, 6 - kpis.trp) / 6) * 100),
                        fullMark: 100
                      },
                      {
                        metric: 'SRA',
                        value: Math.min(100, (kpis.sra / 4) * 100),
                        fullMark: 100
                      },
                      {
                        metric: 'ERR',
                        value: Math.min(100, (kpis.err / 1.5) * 100),
                        fullMark: 100
                      },
                      {
                        metric: 'PR',
                        value: Math.min(100, (kpis.pr / 4) * 100),
                        fullMark: 100
                      }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fill: '#374151', fontWeight: 'bold', fontSize: 14 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value === 0) return 'Faible';
                          if (value === 25) return 'Modéré';
                          if (value === 50) return 'Bon';
                          if (value === 75) return 'Très bon';
                          if (value === 100) return 'Excellent';
                          return '';
                        }}
                      />
                      <Radar 
                        name="Performance" 
                        dataKey="value" 
                        stroke="#ea580c" 
                        fill="#ea580c" 
                        fillOpacity={0.6}
                        strokeWidth={3}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '2px solid #ea580c', borderRadius: '8px' }}
                        // FIX for line 952: Add type check for `value` before calling `toFixed`, as it can be a string.
                        formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}%` : value)}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {(Object.entries(kpiConfigs) as [KpiKey, KpiConfig][]).map(([key, config]) => {
                      let value = kpis[key];
                      let displayValue = value;
                      
                      if (config.inverted) {
                        if (key === 'ipc') {
                          displayValue = Math.max(0, 2 - Math.abs(value));
                        } else if (key === 'trp') {
                          displayValue = Math.max(0, 6 - value);
                        }
                      }
                      
                      const status = getKPIStatus(displayValue, config.ranges);
                      
                      return (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="text-xs font-bold text-gray-800 mb-1 leading-tight min-h-[32px]">
                            {config.label}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-xl font-bold text-orange-600">
                              {value?.toFixed(2)}
                            </div>
                            <div 
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ 
                                backgroundColor: status.color,
                                color: status.class === 'poor' || status.class === 'moderate' ? '#7c2d12' : '#065f46'
                              }}
                            >
                              {status.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">Interprétation des KPI</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">CRD ≥ 2.0:</strong> Résilience excellente
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">IPC ≤ 1.0:</strong> Pertes limitées
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">TRP ≤ 2.0:</strong> Récupération rapide
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">ERR ≥ 1.0:</strong> Performance préservée
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">PR ≥ 1.5:</strong> Bon potentiel d'amélioration
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                      <strong className="text-orange-600">SRA ≥ 1.5:</strong> Adaptation robuste
                    </div>
                  </div>
                </div>

                {metrics && Object.keys(metrics).length > 0 && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">Caractéristiques Calculées de la Courbe</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <strong className="text-indigo-600">Minimum :</strong> {metrics.min?.toFixed(2)}
                      </div>
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <strong className="text-indigo-600">Maximum :</strong> {metrics.max?.toFixed(2)}
                      </div>
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <strong className="text-indigo-600">Temps de rémission (90%) :</strong> {metrics.recoveryTime?.toFixed(2)} x
                      </div>
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <strong className="text-indigo-600">Vitesse max de déclin :</strong> {metrics.declineSpeed?.toFixed(2)} / x
                      </div>
                      <div className="bg-white p-2 rounded-lg shadow-sm col-span-2">
                        <strong className="text-indigo-600">Niveau de performance final :</strong> {metrics.finalLevel?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
        </>
        </div>
      </div>
    </div>
  );
};

export default ResilienceModel;
