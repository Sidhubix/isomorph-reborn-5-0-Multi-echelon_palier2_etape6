// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : onglet "Générateur de scénarios".
// À importer dans App.tsx et à monter comme 3ᵉ onglet, aux côtés de
// "Calibration manuelle" et "Traitement par lot" (voir le guide d'intégration
// livré à la fin de ce message).
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Download, Play, Pause, AlertCircle, ChevronDown, ChevronUp, ArrowUp, ArrowDown, RotateCcw,
  ChevronLeft, ChevronRight, Film, HelpCircle, Info, ArrowRight
} from 'lucide-react';

import {
  ExperimentPlanConfig, ScenarioDataset, BranchId, DisruptionType, BRANCH_IDS, ModelParams,
} from './bloc1Types';
import {
  DEFAULT_PLAN_CONFIG, DEFAULT_DISRUPTION_TYPES, generateExperimentPlanAsync,
  downloadTextFile, downloadAllFiles, buildExportFiles,
} from './bloc1ExperimentPlan';
import { cloneDefaultModelParams, withModelParamDefaults, temporalParamProblems, TEMPORAL_MAX_DELAY_DAYS, TEMPORAL_MAX_BURN_IN_DAYS } from './bloc1DefaultParams';
import NetworkPanel from './NetworkPanel';
import { TemporalSensitivityTable, PlanErrorNotice } from './TemporalPanel';
import { temporalCoverageWarning, describePlanError, PlanErrorView } from './bloc1TemporalUi';
import {
  NetworkChoice, NETWORK_CHOICE_STORAGE_KEY, cloneDefaultNetworkChoice, sanitizeNetworkChoice,
  resolveNetworkChoice, buildPlanConfig, networkChoiceFromHypotheses, potentiometerNetworkNotice,
} from './bloc1NetworkSelection';
import { ISOMORPH_PRESET_DEFAULTS, originalLastMileCapacity } from './bloc1IsomorphPreset';
import { MODEL_PARAM_DESCRIPTIONS, ParamDoc } from './bloc1Descriptions';
import { ImpactPotentiometer } from './ImpactPotentiometer';
import { applyStressLevelPreservingSettings } from './bloc1StressModel';

const DISRUPTION_LABELS: Record<DisruptionType, string> = {
  panne_fournisseur: 'Panne fournisseur',
  coupure_lien: 'Coupure de lien',
  fermeture_entrepot: "Fermeture d'entrepôt",
  pic_demande: 'Pic de demande',
  congestion: 'Congestion',
};

const BRANCH_LABELS: Record<BranchId, string> = {
  none: 'Aucune décision', reactif: 'Réactif', prudent: 'Prudent', tardif: 'Tardif',
};

const BRANCH_COLORS: Record<BranchId, string> = {
  none: '#9ca3af', reactif: '#dc2626', prudent: '#2563eb', tardif: '#16a34a',
};

const ALL_DISRUPTION_TYPES: DisruptionType[] = DEFAULT_DISRUPTION_TYPES;

const DECISION_LABELS: Record<string, string> = {
  D1: 'D1 — Usine de secours', D2: 'D2 — Entrepôt de secours',
  D3: 'D3 — Heures supplémentaires', D4: "D4 — Transporteur d'appoint",
  D5: 'D5 — Entrepôt tampon', D6: 'D6 — Déstockage sécurité',
  D7: 'D7 — Pré-positionnement', D8: 'D8 — Priorisation critique',
  D9: 'D9 — Report de demande',
};

// ----------------------------------------------------------------------------
// Bulle d'explication et d'impact contextuel (au survol + Shift ou clic sur ?)
// Positionnée au-dessous du champ (top-full) pour garantir une visibilité totale
// ----------------------------------------------------------------------------
const ParamHelpBubble: React.FC<{ doc: ParamDoc; onClose?: () => void }> = ({ doc, onClose }) => (
  <div className="absolute z-50 top-full left-0 mt-1.5 w-80 max-w-[85vw] p-3.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
    <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-1.5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">{doc.category}</span>
        <h4 className="font-bold text-sm text-white">{doc.title}</h4>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-0.5 text-xs">✕</button>
      )}
    </div>
    <div className="space-y-1.5 text-slate-200">
      <p className="leading-relaxed"><strong className="text-amber-300">Explication :</strong> {doc.explanation}</p>
      <p className="leading-relaxed"><strong className="text-orange-400">Impact :</strong> {doc.impact}</p>
    </div>
    {doc.defaultVal && (
      <div className="pt-1 border-t border-slate-800 flex justify-between text-[10px] text-slate-400">
        <span>Défaut : <strong className="text-slate-200">{doc.defaultVal}</strong></span>
        {doc.unit && <span>Unité : {doc.unit}</span>}
      </div>
    )}
  </div>
);

// ----------------------------------------------------------------------------
// Petit champ numérique réutilisé partout dans la section "Hypothèses".
// ----------------------------------------------------------------------------
const NumField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  docKey?: string;
  isShiftPressed?: boolean;
  impact?: 'positive' | 'negative' | 'neutral';
  disabled?: boolean;
}> = ({ label, value, onChange, step = 0.01, min, max, suffix, docKey, isShiftPressed, impact = 'neutral', disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const doc = docKey ? MODEL_PARAM_DESCRIPTIONS[docKey] : undefined;
  const isBubbleVisible = doc && ((isHovered && isShiftPressed) || showManualHelp);

  return (
    <div
      className={`relative ${isBubbleVisible ? 'z-50' : ''}${disabled ? ' opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <label className="block text-xs text-gray-600 truncate">
          {label}{suffix ? ` (${suffix})` : ''}
        </label>
        {doc && (
          <button
            type="button"
            onClick={() => setShowManualHelp(prev => !prev)}
            className="text-gray-400 hover:text-orange-600 transition-colors p-0.5"
            title="Cliquez pour voir l'explication ou survolez en maintenant la touche Shift"
          >
            <HelpCircle size={12} />
          </button>
        )}
      </div>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full px-2 py-1 rounded text-sm outline-none transition-all ${
          impact === 'positive'
            ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
            : impact === 'negative'
            ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-medium focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
            : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
        }`}
      />
      {isBubbleVisible && doc && (
        <ParamHelpBubble doc={doc} onClose={() => setShowManualHelp(false)} />
      )}
    </div>
  );
};

const RangeField: React.FC<{
  label: string;
  lo: number;
  hi: number;
  onChangeLo: (v: number) => void;
  onChangeHi: (v: number) => void;
  step?: number;
  suffix?: string;
  docKey?: string;
  isShiftPressed?: boolean;
  polarity?: 'higher-is-better' | 'lower-is-better';
  loPolarity?: 'positive' | 'negative' | 'neutral';
  hiPolarity?: 'positive' | 'negative' | 'neutral';
  disabled?: boolean;
}> = ({
  label, lo, hi, onChangeLo, onChangeHi, step = 0.01, suffix, docKey,
  isShiftPressed, polarity, loPolarity, hiPolarity, disabled
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const doc = docKey ? MODEL_PARAM_DESCRIPTIONS[docKey] : undefined;
  const isBubbleVisible = doc && ((isHovered && isShiftPressed) || showManualHelp);

  const effectiveLoPolarity: 'positive' | 'negative' | 'neutral' =
    loPolarity ?? (polarity === 'higher-is-better' ? 'negative' : polarity === 'lower-is-better' ? 'positive' : 'neutral');

  const effectiveHiPolarity: 'positive' | 'negative' | 'neutral' =
    hiPolarity ?? (polarity === 'higher-is-better' ? 'positive' : polarity === 'lower-is-better' ? 'negative' : 'neutral');

  return (
    <div
      className={`relative ${isBubbleVisible ? 'z-50' : ''}${disabled ? ' opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <label className="block text-xs text-gray-700 font-medium truncate">
          {label}{suffix ? ` (${suffix})` : ''}
        </label>
        {doc && (
          <button
            type="button"
            onClick={() => setShowManualHelp(prev => !prev)}
            className="text-gray-400 hover:text-orange-600 transition-colors p-0.5"
            title="Cliquez pour voir l'explication ou survolez en maintenant la touche Shift"
          >
            <HelpCircle size={12} />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {/* Borne MIN */}
        <div className="w-1/2">
          <div className="flex items-center justify-between text-[10px] font-bold mb-0.5 px-0.5">
            <span className={effectiveLoPolarity === 'positive' ? 'text-emerald-700' : effectiveLoPolarity === 'negative' ? 'text-rose-700' : 'text-gray-500'}>
              Min {effectiveLoPolarity === 'positive' ? '● Favorable' : effectiveLoPolarity === 'negative' ? '● Défavorable' : ''}
            </span>
          </div>
          <input
            type="number"
            step={step}
            value={lo}
            disabled={disabled}
            onChange={e => onChangeLo(Number(e.target.value))}
            title={`Borne minimale : ${effectiveLoPolarity === 'positive' ? 'Impact positif / favorable sur la résilience' : effectiveLoPolarity === 'negative' ? 'Impact négatif / contraignant sur la performance' : 'Borne min'}`}
            className={`w-full px-2 py-1 rounded text-sm outline-none transition-all ${
              effectiveLoPolarity === 'positive'
                ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                : effectiveLoPolarity === 'negative'
                ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-semibold focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
            }`}
          />
        </div>

        {/* Borne MAX */}
        <div className="w-1/2">
          <div className="flex items-center justify-between text-[10px] font-bold mb-0.5 px-0.5">
            <span className={effectiveHiPolarity === 'positive' ? 'text-emerald-700' : effectiveHiPolarity === 'negative' ? 'text-rose-700' : 'text-gray-500'}>
              Max {effectiveHiPolarity === 'positive' ? '● Favorable' : effectiveHiPolarity === 'negative' ? '● Défavorable' : ''}
            </span>
          </div>
          <input
            type="number"
            step={step}
            value={hi}
            disabled={disabled}
            onChange={e => onChangeHi(Number(e.target.value))}
            title={`Borne maximale : ${effectiveHiPolarity === 'positive' ? 'Impact positif / favorable sur la résilience' : effectiveHiPolarity === 'negative' ? 'Impact négatif / contraignant sur la performance' : 'Borne max'}`}
            className={`w-full px-2 py-1 rounded text-sm outline-none transition-all ${
              effectiveHiPolarity === 'positive'
                ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                : effectiveHiPolarity === 'negative'
                ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-semibold focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
            }`}
          />
        </div>
      </div>
      {isBubbleVisible && doc && (
        <ParamHelpBubble doc={doc} onClose={() => setShowManualHelp(false)} />
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; open: boolean; onToggle: () => void }> = ({ title, open, onToggle }) => (
  <button onClick={onToggle}
    className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-800">
    <span>{title}</span>
    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
  </button>
);

// ----------------------------------------------------------------------------
// Sections 6 et 7 des hypothèses (palier 1) : constantes de calcul auparavant
// codées en dur, et hypothèses du réseau ISOMORPH prédéfini. Composant exporté
// pour pouvoir être rendu isolément par les tests.
// ----------------------------------------------------------------------------
export const ExtraHypothesisSections: React.FC<{
  params: ModelParams;
  setParam: <K extends keyof ModelParams>(section: K, patch: Partial<ModelParams[K]>) => void;
  choice: NetworkChoice;
  onChoiceChange: (choice: NetworkChoice) => void;
  openSection: string;
  setOpenSection: React.Dispatch<React.SetStateAction<string>>;
  isShiftPressed: boolean;
}> = ({ params, setParam, choice, onChoiceChange, openSection, setOpenSection, isShiftPressed }) => {
  const opts = choice.isomorphOptions;
  const setOpts = (patch: Partial<NetworkChoice['isomorphOptions']>) =>
    onChoiceChange({ ...choice, isomorphOptions: { ...opts, ...patch } });
  return (
    <>
      <SectionHeader title="6. Constantes de calcul (indicateur de performance et flot)" open={openSection === 'constants'}
        onToggle={() => setOpenSection(s => s === 'constants' ? '' : 'constants')} />
      {openSection === 'constants' && (
        <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Poids des articles importants dans l'IP" value={params.indicators.importantWeight} step={0.5} min={0}
            docKey="indicators.importantWeight" isShiftPressed={isShiftPressed}
            onChange={v => setParam('indicators', { importantWeight: v })} />
          <NumField label="Seuil de rétablissement (IP)" value={params.indicators.recoveryThreshold} step={0.01} min={0} max={1}
            docKey="indicators.recoveryThreshold" isShiftPressed={isShiftPressed}
            onChange={v => setParam('indicators', { recoveryThreshold: v })} />
          <NumField label="Garde du calcul de flot" suffix="chemins" value={params.flow.maxIterations} step={100} min={1}
            docKey="flow.maxIterations" isShiftPressed={isShiftPressed}
            onChange={v => setParam('flow', { maxIterations: v })} />
        </div>
      )}

      <SectionHeader title="7. Hypothèses du réseau ISOMORPH prédéfini" open={openSection === 'isomorph'}
        onToggle={() => setOpenSection(s => s === 'isomorph' ? '' : 'isomorph')} />
      {openSection === 'isomorph' && (
        <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Ces hypothèses ne s'appliquent que lorsque le réseau ISOMORPH est sélectionné (section « Réseau logistique », en haut de l'onglet).
            Les capacités des arcs viennent du fichier d'origine (volume d'un conteneur multiplié par le nombre de conteneurs par jour) ;
            le fichier d'origine ne définit ni capacité de production ni capacité du dernier kilomètre.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <NumField label="Plage des arcs (plus ou moins)" suffix="fraction" value={opts.arcRangePct} step={0.01} min={0} max={0.99}
              docKey="isomorph.arcRangePct" isShiftPressed={isShiftPressed}
              onChange={v => setOpts({ arcRangePct: v })} />
            <NumField label="Facteur de capacité des sources" value={opts.sourceFactor} step={0.05} min={0.05}
              docKey="isomorph.sourceFactor" isShiftPressed={isShiftPressed}
              onChange={v => setOpts({ sourceFactor: v })} />
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                <input type="checkbox" checked={opts.lastMileCapacity === null}
                  onChange={e => setOpts({ lastMileCapacity: e.target.checked ? null : originalLastMileCapacity() })} />
                Dernier kilomètre illimité
              </label>
              <NumField label="Capacité du dernier kilomètre" suffix="unités/jour par arc"
                value={opts.lastMileCapacity ?? originalLastMileCapacity()} step={100} min={1}
                docKey="isomorph.lastMileCapacity" isShiftPressed={isShiftPressed}
                disabled={opts.lastMileCapacity === null}
                onChange={v => setOpts({ lastMileCapacity: v })} />
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="8. Mode temporel (délais de trajet et de production, stocks (s, S))" open={openSection === 'temporal'}
        onToggle={() => setOpenSection(s => s === 'temporal' ? '' : 'temporal')} />
      {openSection === 'temporal' && (
        <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Désactivé (par défaut), le plan se calcule exactement comme avant : le débit du jour est un flot instantané, sans délai ni stock.
            Activé, la matière transite pendant plusieurs jours, la production met un délai à devenir disponible, et chaque entrepôt ou hub gère un stock (s, S) :
            l'IP reflète alors ce que le réseau livre réellement, avec retard et amortissement par les stocks.
            Les délais propres à chaque arc ou nœud viennent du fichier du réseau (ISOMORPH en fournit) ; les valeurs ci-dessous servent aux éléments qui n'en ont pas.
            Ces réglages ne sont jamais modifiés par le potentiomètre d'impact.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-800 font-semibold">
            <input type="checkbox" checked={params.temporal.enabled}
              onChange={e => setParam('temporal', { enabled: e.target.checked })} />
            Activer le mode temporel
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <NumField label="Délai de trajet par défaut" suffix="jours" value={params.temporal.defaultTravelTimeDays} step={1} min={0} max={TEMPORAL_MAX_DELAY_DAYS}
              docKey="temporal.defaultTravelTimeDays" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { defaultTravelTimeDays: v })} />
            <NumField label="Délai de production par défaut" suffix="jours" value={params.temporal.defaultProductionLeadTimeDays} step={1} min={0} max={TEMPORAL_MAX_DELAY_DAYS}
              docKey="temporal.defaultProductionLeadTimeDays" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { defaultProductionLeadTimeDays: v })} />
            <NumField label="Pré-chauffe (non enregistrée)" suffix="jours" value={params.temporal.burnInDays} step={5} min={0} max={TEMPORAL_MAX_BURN_IN_DAYS}
              docKey="temporal.burnInDays" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { burnInDays: v })} />
            <NumField label="Couverture du point de commande s" suffix="jours de demande" value={params.temporal.reorderPointDays} step={0.5} min={0}
              docKey="temporal.reorderPointDays" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { reorderPointDays: v })} />
            <NumField label="Couverture du niveau de recomplètement S" suffix="jours de demande" value={params.temporal.orderUpToDays} step={0.5} min={0}
              docKey="temporal.orderUpToDays" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { orderUpToDays: v })} />
            <NumField label="Hausse de s et S par D7" suffix="fraction" value={params.temporal.d7OrderUpToBoostPct} step={0.05} min={0}
              docKey="temporal.d7OrderUpToBoostPct" isShiftPressed={isShiftPressed} disabled={!params.temporal.enabled}
              onChange={v => setParam('temporal', { d7OrderUpToBoostPct: v })} />
          </div>
          <label className={`flex items-center gap-2 text-xs text-gray-700 font-medium ${params.temporal.enabled ? '' : 'opacity-50'}`}>
            <input type="checkbox" checked={params.temporal.lastMileSameDay} disabled={!params.temporal.enabled}
              onChange={e => setParam('temporal', { lastMileSameDay: e.target.checked })} />
            Dernier kilomètre servi le jour même (délai de trajet ignoré sur les arcs vers le client)
          </label>
          {params.temporal.enabled && temporalParamProblems(params.temporal).length > 0 && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 space-y-1" role="alert">
              <div className="font-bold">Réglages invalides : le plan sera refusé</div>
              <ul className="list-disc list-inside">{temporalParamProblems(params.temporal).map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {temporalCoverageWarning(params.temporal) && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950">{temporalCoverageWarning(params.temporal)}</div>
          )}
          <TemporalSensitivityTable />
        </div>
      )}
    </>
  );
};

export interface Bloc1ScenarioGeneratorProps {
  dataset?: ScenarioDataset | null;
  onDatasetGenerated?: (dataset: ScenarioDataset) => void;
  onNavigateToBatch?: () => void;
  onLaunchBatch?: () => void;
}

const Bloc1ScenarioGenerator: React.FC<Bloc1ScenarioGeneratorProps> = ({
  dataset: externalDataset,
  onDatasetGenerated,
  onNavigateToBatch,
  onLaunchBatch,
}) => {
  const [localDataset, setLocalDataset] = useState<ScenarioDataset | null>(null);
  const dataset = externalDataset ?? localDataset;

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [error, setError] = useState<string>('');
  const [errorView, setErrorView] = useState<PlanErrorView | null>(null); // refus structuré (mode temporel)
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [isCinematic, setIsCinematic] = useState<boolean>(false);
  const [cinematicSpeedMs, setCinematicSpeedMs] = useState<number>(800);
  const [visibleBranches, setVisibleBranches] = useState<Record<string, boolean>>({
    none: true,
    reactif: true,
    prudent: true,
    tardif: true,
  });
  const [hypothesesOpen, setHypothesesOpen] = useState<boolean>(false);
  const [openSection, setOpenSection] = useState<string>('network');
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isCinematic || !dataset || dataset.scenarios.length === 0) return;
    const interval = setInterval(() => {
      setSelectedScenario(prev => {
        const scenarios = dataset.scenarios;
        const currentIdx = scenarios.findIndex(s => s.scenario_id === prev);
        const nextIdx = (currentIdx + 1) % scenarios.length;
        return scenarios[nextIdx].scenario_id;
      });
    }, cinematicSpeedMs);
    return () => clearInterval(interval);
  }, [isCinematic, dataset, cinematicSpeedMs]);

  const [planMeta, setPlanMeta] = useState(() => {
    try {
      const saved = localStorage.getItem('isomorph_plan_meta');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      nScenarios: DEFAULT_PLAN_CONFIG.nScenarios,
      seed: DEFAULT_PLAN_CONFIG.seed,
      warmupDays: DEFAULT_PLAN_CONFIG.warmupDays,
      horizonDays: DEFAULT_PLAN_CONFIG.horizonDays,
      disruptionTypes: DEFAULT_PLAN_CONFIG.disruptionTypes,
    };
  });
  const [params, setParams] = useState<ModelParams>(() => {
    try {
      const saved = localStorage.getItem('isomorph_model_params');
      // Complète les sections ajoutées au palier 1 pour les anciennes sauvegardes.
      if (saved) return withModelParamDefaults(JSON.parse(saved));
    } catch {}
    return cloneDefaultModelParams();
  });
  // Réseau choisi (palier 1). Par défaut : réseau paramétrique, comme avant.
  const [networkChoice, setNetworkChoice] = useState<NetworkChoice>(() => {
    try {
      const saved = localStorage.getItem(NETWORK_CHOICE_STORAGE_KEY);
      if (saved) return sanitizeNetworkChoice(JSON.parse(saved));
    } catch {}
    return cloneDefaultNetworkChoice();
  });
  const resolvedNetwork = useMemo(() => resolveNetworkChoice(networkChoice, params.temporal.enabled), [networkChoice, params.temporal.enabled]);
  const networkFixed = resolvedNetwork.spec !== null; // réseau explicite : capacités et nombre de sites fixés par le réseau

  const [stressLevel, setStressLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('isomorph_stress_level');
      if (saved) return Number(saved);
    } catch {}
    return 50;
  });
  const [isCustomized, setIsCustomized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('isomorph_is_customized');
      if (saved) return saved === 'true';
    } catch {}
    return false;
  });

  // Sauvegarde automatique des réglages dans le stockage local
  useEffect(() => {
    try {
      localStorage.setItem('isomorph_plan_meta', JSON.stringify(planMeta));
      localStorage.setItem('isomorph_model_params', JSON.stringify(params));
      localStorage.setItem('isomorph_stress_level', String(stressLevel));
      localStorage.setItem('isomorph_is_customized', String(isCustomized));
    } catch {}
  }, [planMeta, params, stressLevel, isCustomized]);

  // Sauvegarde locale du réseau choisi (y compris le dernier réseau importé).
  useEffect(() => {
    try {
      localStorage.setItem(NETWORK_CHOICE_STORAGE_KEY, JSON.stringify(networkChoice));
    } catch {}
  }, [networkChoice]);

  const configFileInputRef = React.useRef<HTMLInputElement>(null);

  const exportHypothesesConfig = () => {
    const configData = {
      exportDate: new Date().toISOString(),
      version: '2.6',
      stressLevel,
      isCustomized,
      planMeta,
      params,
      network: networkChoice,
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isomorph_hypotheses_config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importHypothesesConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const data = JSON.parse(text);
        if (data.params) setParams(withModelParamDefaults(data.params));
        if (data.planMeta) setPlanMeta(data.planMeta);
        if (typeof data.stressLevel === 'number') setStressLevel(data.stressLevel);
        if (typeof data.isCustomized === 'boolean') setIsCustomized(data.isCustomized);
        // Un ancien fichier d'hypothèses sans réseau revient au réseau par défaut.
        setNetworkChoice(networkChoiceFromHypotheses(data));
      } catch (err) {
        alert("Erreur lors de l'importation du fichier de configuration JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Le potentiomètre ne pilote que les 4 piliers historiques (choc, tension,
  // décisions, réactivité). Les constantes de la section 6 (indicators, flow)
  // et les réglages du mode temporel (temporal) sont conservés tels que
  // l'utilisateur les a réglés (voir applyStressLevelPreservingSettings).
  // Les hypothèses ISOMORPH (section 7) et les délais propres à un réseau
  // explicite sont hors de params : le curseur ne peut pas les toucher.
  const handleStressChange = (newVal: number) => {
    setStressLevel(newVal);
    setParams(p => applyStressLevelPreservingSettings(p, newVal));
    setIsCustomized(false);
  };

  const resetParams = () => {
    setStressLevel(50);
    setParams(cloneDefaultModelParams());
    setIsCustomized(false);
  };

  // Bouton « Réinitialiser » des hypothèses : hypothèses du modèle et hypothèses
  // ISOMORPH aux valeurs par défaut ; le réseau sélectionné ne change pas.
  const resetAllHypotheses = () => {
    resetParams();
    setNetworkChoice(c => ({ ...c, isomorphOptions: { ...ISOMORPH_PRESET_DEFAULTS } }));
  };
  const toggleDisruptionType = (type: DisruptionType) => {
    setPlanMeta((prev: typeof planMeta) => {
      const has = prev.disruptionTypes.includes(type);
      const next = has ? prev.disruptionTypes.filter((t: DisruptionType) => t !== type) : [...prev.disruptionTypes, type];
      return { ...prev, disruptionTypes: next.length > 0 ? next : prev.disruptionTypes };
    });
  };

  // Met à jour un champ imbriqué de params par chemin (ex. 'network.factoryCapacityMin').
  const setParam = <K extends keyof ModelParams>(section: K, patch: Partial<ModelParams[K]>) => {
    setIsCustomized(true);
    setParams(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  };

  const setProfileParam = (profileId: 'reactif' | 'prudent' | 'tardif', patch: Partial<ModelParams['profiles']['reactif']>) => {
    setIsCustomized(true);
    setParams(prev => ({
      ...prev,
      profiles: { ...prev.profiles, [profileId]: { ...prev.profiles[profileId], ...patch } },
    }));
  };

  const moveInEscalation = (profileId: 'reactif' | 'prudent' | 'tardif', idx: number, dir: -1 | 1) => {
    setIsCustomized(true);
    setParams(prev => {
      const order = [...prev.profiles[profileId].escalationOrder];
      const j = idx + dir;
      if (j < 0 || j >= order.length) return prev;
      [order[idx], order[j]] = [order[j], order[idx]];
      return { ...prev, profiles: { ...prev.profiles, [profileId]: { ...prev.profiles[profileId], escalationOrder: order } } };
    });
  };

  const openTemporalSettings = () => {
    setHypothesesOpen(true);
    setOpenSection('temporal');
  };

  const handleRun = async () => {
    setError('');
    setErrorView(null);
    if (resolvedNetwork.error) {
      setError(resolvedNetwork.error);
      return;
    }
    if (params.temporal.enabled) {
      const problems = temporalParamProblems(params.temporal);
      if (problems.length) {
        setErrorView({ kind: 'settings', title: 'Plan refusé : réglages du mode temporel invalides', message: problems.join(' '), details: problems, remedy: 'Corrigez ces réglages dans la section « Mode temporel » des hypothèses.' });
        return;
      }
    }
    setIsRunning(true);
    setIsCinematic(false);
    setProgress({ done: 0, total: planMeta.nScenarios });
    try {
      // Réseau par défaut : configuration identique à celle des versions précédentes (champ network absent).
      const config: ExperimentPlanConfig = buildPlanConfig(planMeta, params, resolvedNetwork);
      const result = await generateExperimentPlanAsync(config, (done, total) => {
        setProgress({ done, total });
      });
      setLocalDataset(result);
      if (onDatasetGenerated) {
        onDatasetGenerated(result);
      }
      setSelectedScenario(result.scenarios[0]?.scenario_id ?? '');
    } catch (err: any) {
      const view = describePlanError(err);
      if (view.kind === 'other') setError(view.message); // affichage d'origine
      else setErrorView(view);
    } finally {
      setIsRunning(false);
    }
  };

  const currentScenarioIndex = useMemo(() => {
    if (!dataset || dataset.scenarios.length === 0) return -1;
    return dataset.scenarios.findIndex(s => s.scenario_id === selectedScenario);
  }, [dataset, selectedScenario]);

  const handlePrevScenario = () => {
    if (!dataset || currentScenarioIndex <= 0) return;
    setIsCinematic(false);
    setSelectedScenario(dataset.scenarios[currentScenarioIndex - 1].scenario_id);
  };

  const handleNextScenario = () => {
    if (!dataset || currentScenarioIndex >= dataset.scenarios.length - 1) return;
    setIsCinematic(false);
    setSelectedScenario(dataset.scenarios[currentScenarioIndex + 1].scenario_id);
  };

  const handleToggleCinematic = () => {
    if (!dataset || dataset.scenarios.length === 0) return;
    if (isCinematic) {
      setIsCinematic(false);
    } else {
      // Si on est déjà à la fin, on recommence au tout début
      if (currentScenarioIndex >= dataset.scenarios.length - 1 || currentScenarioIndex === -1) {
        setSelectedScenario(dataset.scenarios[0].scenario_id);
      }
      setIsCinematic(true);
    }
  };

  const chartData = useMemo(() => {
    if (!dataset || !selectedScenario) return [];
    const rows = dataset.ipTimeseries.filter(p => p.scenario_id === selectedScenario);
    const byDay: Record<number, any> = {};
    rows.forEach(p => {
      byDay[p.day_rel] = byDay[p.day_rel] || { day_rel: p.day_rel };
      byDay[p.day_rel][p.branch_id] = p.ip;
    });
    return Object.values(byDay).sort((a: any, b: any) => a.day_rel - b.day_rel);
  }, [dataset, selectedScenario]);

  const selectedPerturbation = useMemo(
    () => dataset?.perturbations.find(p => p.scenario_id === selectedScenario) ?? null,
    [dataset, selectedScenario]
  );
  const selectedDecisions = useMemo(
    () => dataset?.decisions.filter(d => d.scenario_id === selectedScenario) ?? [],
    [dataset, selectedScenario]
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-6 rounded-t-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Générateur de scénarios (Bloc 1)</h1>
            <p className="mt-2 text-orange-100 text-sm max-w-3xl leading-relaxed">
              {resolvedNetwork.spec
                ? `Instancie le réseau « ${resolvedNetwork.label} »`
                : `Instancie un réseau logistique paramétrique (${params.network.nFactories} usines, ${params.network.nWarehouses} entrepôts, 1 client)`}{params.temporal.enabled ? ', en mode temporel (délais de trajet et de production, stocks (s, S))' : ''}, injecte une perturbation parmi 5 natures,
              simule 4 branches (aucune décision, réactif, prudent, tardif) et exporte les 5 fichiers
              + metadata.json au format déjà utilisé par le traitement par lot.
            </p>
          </div>
          {onNavigateToBatch && dataset && dataset.scenarios.length > 0 && (
            <button
              onClick={onNavigateToBatch}
              className="px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 animate-in fade-in"
              title="Passer directement à l'ajustement par lot avec les scénarios générés"
            >
              <span>Accéder à l'Ajustement par lot</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* -------- Réseau logistique (palier 1) : choix, import, export, résumé, validation, schéma -------- */}
        <NetworkPanel
          choice={networkChoice}
          onChoiceChange={setNetworkChoice}
          resolved={resolvedNetwork}
          params={params}
          planMeta={planMeta}
          isRunning={isRunning}
        />

        {/* -------- Potentiomètre d'impact attendu sur l'IP (Modèle de variation continue) -------- */}
        <ImpactPotentiometer
          value={stressLevel}
          onChange={handleStressChange}
          isCustomized={isCustomized}
          onResetToDefault={resetParams}
          networkNotice={potentiometerNetworkNotice(resolvedNetwork)}
        />

        {/* -------- Plan d'expériences (taille, seed, horizon, natures activées) -------- */}
        <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h2 className="font-bold text-gray-800 mb-3">Plan d'expériences</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumField label="Nombre de scénarios" value={planMeta.nScenarios} step={1} min={1} max={2000}
              onChange={v => setPlanMeta((p: typeof planMeta) => ({ ...p, nScenarios: v }))} />
            <NumField label="Graine aléatoire (seed)" value={planMeta.seed} step={1}
              onChange={v => setPlanMeta((p: typeof planMeta) => ({ ...p, seed: v }))} />
            <NumField label="Jours de warm-up" value={planMeta.warmupDays} step={1} min={0}
              onChange={v => setPlanMeta((p: typeof planMeta) => ({ ...p, warmupDays: v }))} />
            <NumField label="Horizon simulé (jours)" value={planMeta.horizonDays} step={1} min={10}
              onChange={v => setPlanMeta((p: typeof planMeta) => ({ ...p, horizonDays: v }))} />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Natures de perturbation activées</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DISRUPTION_TYPES.map(type => (
                <button key={type} onClick={() => toggleDisruptionType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    planMeta.disruptionTypes.includes(type)
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}>
                  {DISRUPTION_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button onClick={handleRun} disabled={isRunning}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center gap-2">
              <Play size={16} />
              {isRunning ? `Génération en cours... (${progress.done}/${progress.total})` : "Lancer le plan d'expériences"}
            </button>
            {dataset && (
              <>
                <button onClick={() => downloadAllFiles(dataset)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2">
                  <Download size={16} /> Tout exporter (5 CSV + metadata.json)
                </button>
                {onLaunchBatch && (
                  <button onClick={onLaunchBatch}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
                    title="Passer à l'ajustement par lot et charger automatiquement les 2 fichiers CSV générés">
                    <Play size={16} />
                    <span>Lancer l'ajustement par lot</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Jauge de progression animée */}
          {isRunning && (
            <div className="mt-4 p-4 bg-white border border-orange-200 rounded-lg shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1.5 text-orange-700 font-bold">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping"></span>
                  Génération en cours des scénarios et simulations des 4 branches...
                </span>
                <span className="text-sm font-bold text-orange-800">
                  {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0} %
                </span>
              </div>

              {/* Barre de jauge */}
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
                  Scénario <strong>{progress.done}</strong> / {progress.total}
                </span>
                <span>
                  {progress.done * 4} courbes d'IP(t) calculées
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {errorView && <PlanErrorNotice view={errorView} onOpenTemporalSettings={openTemporalSettings} />}
        </section>

        {/* -------- Hypothèses du modèle : toute valeur posée par hypothèse, réglable ici -------- */}
        <section className="border border-gray-200 rounded-lg bg-white shadow-2xs">
          <button onClick={() => setHypothesesOpen(o => !o)}
            className={`w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-left transition-colors ${
              hypothesesOpen ? 'rounded-t-lg border-b border-gray-200' : 'rounded-lg'
            }`}>
            <div>
              <span className="font-bold text-gray-800">Hypothèses du modèle</span>
              <span className="ml-2 text-xs text-gray-500">
                Toute valeur posée faute de donnée d'origine — réglable ici, valeurs par défaut raisonnables
              </span>
            </div>
            {hypothesesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {hypothesesOpen && (
            <div className="p-4 space-y-3 bg-white rounded-b-lg">
              {/* Bannière explicative sur l'usage de la touche Shift et actions de configuration */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2 max-w-xl">
                  <Info size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Astuce :</strong> Maintenez la touche <kbd className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border transition-all ${isShiftPressed ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300' : 'bg-white text-gray-800 border-gray-300 shadow-2xs'}`}>Shift</kbd> enfoncée en survolant un paramètre (ou cliquez sur son icône <HelpCircle size={12} className="inline text-orange-600" />) pour afficher son explication détaillée et son impact simulé.
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={configFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={importHypothesesConfig}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => configFileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Charger un fichier JSON de configuration d'hypothèses sauvegardé"
                  >
                    <Download size={13} className="rotate-180" />
                    <span>Importer réglages</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportHypothesesConfig}
                    className="px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Sauvegarder l'ensemble des hypothèses actuelles dans un fichier JSON"
                  >
                    <Download size={13} />
                    <span>Sauvegarder réglages</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetAllHypotheses}
                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded-md text-xs font-semibold border border-gray-300 flex items-center gap-1 shadow-2xs transition-colors"
                    title="Rétablir les hypothèses par défaut"
                  >
                    <RotateCcw size={12} />
                    <span>Réinitialiser</span>
                  </button>
                </div>
              </div>

              {/* -- Génération du réseau -- */}
              <SectionHeader title="1. Génération du réseau" open={openSection === 'network'} onToggle={() => setOpenSection(s => s === 'network' ? '' : 'network')} />
              {openSection === 'network' && (
                <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-3">
                  {/* Légende explicative du code couleur */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700">
                    <span className="font-bold text-slate-900">Code couleur des bornes :</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Encadrement Vert = Impact positif / renforce la résilience
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      Encadrement Rouge = Impact négatif / goulot ou fragilité
                    </span>
                  </div>

                  {networkFixed && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed">
                      Un réseau explicite est sélectionné : les capacités et le nombre de sites ci-dessous ne s'appliquent qu'au réseau par défaut
                      (champs grisés). La part d'articles importants et le bruit de demande restent utilisés.
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <RangeField label="Capacité usine" suffix="unités/jour" lo={params.network.factoryCapacityMin} hi={params.network.factoryCapacityMax} step={5}
                      docKey="network.factoryCapacity" isShiftPressed={isShiftPressed} disabled={networkFixed} polarity="higher-is-better"
                      onChangeLo={v => setParam('network', { factoryCapacityMin: v })} onChangeHi={v => setParam('network', { factoryCapacityMax: v })} />
                    <RangeField label="Capacité lien primaire" suffix="unités/jour" lo={params.network.primaryEdgeCapacityMin} hi={params.network.primaryEdgeCapacityMax} step={5}
                      docKey="network.primaryEdgeCapacity" isShiftPressed={isShiftPressed} disabled={networkFixed} polarity="higher-is-better"
                      onChangeLo={v => setParam('network', { primaryEdgeCapacityMin: v })} onChangeHi={v => setParam('network', { primaryEdgeCapacityMax: v })} />
                    <RangeField label="Capacité lien secondaire" suffix="unités/jour" lo={params.network.secondaryEdgeCapacityMin} hi={params.network.secondaryEdgeCapacityMax} step={5}
                      docKey="network.secondaryEdgeCapacity" isShiftPressed={isShiftPressed} disabled={networkFixed} polarity="higher-is-better"
                      onChangeLo={v => setParam('network', { secondaryEdgeCapacityMin: v })} onChangeHi={v => setParam('network', { secondaryEdgeCapacityMax: v })} />
                    <RangeField label="Capacité lien tertiaire" suffix="unités/jour" lo={params.network.tertiaryEdgeCapacityMin} hi={params.network.tertiaryEdgeCapacityMax} step={5}
                      docKey="network.tertiaryEdgeCapacity" isShiftPressed={isShiftPressed} disabled={networkFixed} polarity="higher-is-better"
                      onChangeLo={v => setParam('network', { tertiaryEdgeCapacityMin: v })} onChangeHi={v => setParam('network', { tertiaryEdgeCapacityMax: v })} />
                    <RangeField label="Capacité expédition entrepôt" suffix="unités/jour" lo={params.network.warehouseShipCapacityMin} hi={params.network.warehouseShipCapacityMax} step={5}
                      docKey="network.warehouseShipCapacity" isShiftPressed={isShiftPressed} disabled={networkFixed} polarity="higher-is-better"
                      onChangeLo={v => setParam('network', { warehouseShipCapacityMin: v })} onChangeHi={v => setParam('network', { warehouseShipCapacityMax: v })} />
                    <RangeField label="Part d'articles importants" lo={params.network.importantShareMin} hi={params.network.importantShareMax} step={0.05}
                      docKey="network.importantShare" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                      onChangeLo={v => setParam('network', { importantShareMin: v })} onChangeHi={v => setParam('network', { importantShareMax: v })} />
                    <RangeField label="Bruit journalier sur la demande" suffix="fraction" lo={params.network.demandNoiseMin} hi={params.network.demandNoiseMax} step={0.01}
                      docKey="network.demandNoise" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                      onChangeLo={v => setParam('network', { demandNoiseMin: v })} onChangeHi={v => setParam('network', { demandNoiseMax: v })} />
                    <NumField label="Nombre d'usines" value={params.network.nFactories} step={1} min={1}
                      docKey="network.nFactories" isShiftPressed={isShiftPressed} disabled={networkFixed} impact="positive"
                      onChange={v => setParam('network', { nFactories: v })} />
                    <NumField label="Nombre d'entrepôts" value={params.network.nWarehouses} step={1} min={1}
                      docKey="network.nWarehouses" isShiftPressed={isShiftPressed} disabled={networkFixed} impact="positive"
                      onChange={v => setParam('network', { nWarehouses: v })} />
                  </div>
                </div>
              )}

              {/* -- Perturbations -- */}
              <SectionHeader title="2. Sévérité et durée des perturbations" open={openSection === 'disruption'} onToggle={() => setOpenSection(s => s === 'disruption' ? '' : 'disruption')} />
              {openSection === 'disruption' && (
                <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                  <RangeField label="Sévérité générale (panne, congestion, pic)" lo={params.disruption.severityMin} hi={params.disruption.severityMax} step={0.05}
                    docKey="disruption.severity" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                    onChangeLo={v => setParam('disruption', { severityMin: v })} onChangeHi={v => setParam('disruption', { severityMax: v })} />
                  <RangeField label="Sévérité binaire (coupure, fermeture)" lo={params.disruption.binarySeverityMin} hi={params.disruption.binarySeverityMax} step={0.05}
                    docKey="disruption.binarySeverity" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                    onChangeLo={v => setParam('disruption', { binarySeverityMin: v })} onChangeHi={v => setParam('disruption', { binarySeverityMax: v })} />
                  <RangeField label="Durée" suffix="jours" lo={params.disruption.durationMinDays} hi={params.disruption.durationMaxDays} step={1}
                    docKey="disruption.duration" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                    onChangeLo={v => setParam('disruption', { durationMinDays: v })} onChangeHi={v => setParam('disruption', { durationMaxDays: v })} />
                  <NumField label="Amplification pic de demande (s=1)" value={params.disruption.picDemandeAmplificationAtMaxSeverity} step={0.1}
                    docKey="disruption.picDemandeAmplification" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('disruption', { picDemandeAmplificationAtMaxSeverity: v })} />
                  <NumField label="Coupure lien : friction entrepôt desservi" value={params.disruption.coupureLienWarehouseFrictionPct} step={0.05} min={0} max={1}
                    docKey="disruption.coupureLienWarehouseFriction" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('disruption', { coupureLienWarehouseFrictionPct: v })} />
                  <NumField label="Coupure lien : friction autres liens de l'entrepôt" value={params.disruption.coupureLienOtherEdgesFrictionPct} step={0.05} min={0} max={1}
                    docKey="disruption.coupureLienOtherEdgesFriction" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('disruption', { coupureLienOtherEdgesFrictionPct: v })} />
                  <NumField label="Coupure lien : probabilité de cibler le lien principal" value={params.disruption.coupureLienPrimaryEdgeProbability} step={0.05} min={0} max={1}
                    docKey="disruption.coupureLienPrimaryProb" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('disruption', { coupureLienPrimaryEdgeProbability: v })} />
                </div>
              )}

              {/* -- Calibration de la demande -- */}
              <SectionHeader title="3. Calibration de la demande de référence" open={openSection === 'demand'} onToggle={() => setOpenSection(s => s === 'demand' ? '' : 'demand')} />
              {openSection === 'demand' && (
                <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                  <RangeField label="Rapport demande / débit pendant l'incident" lo={params.demand.utilizationMin} hi={params.demand.utilizationMax} step={0.05}
                    docKey="demand.utilization" isShiftPressed={isShiftPressed} polarity="lower-is-better"
                    onChangeLo={v => setParam('demand', { utilizationMin: v })} onChangeHi={v => setParam('demand', { utilizationMax: v })} />
                  <NumField label="Marge de sécurité warm-up (IP=1 garanti)" value={params.demand.warmupSafetyMargin} step={0.005} min={0.5} max={1}
                    docKey="demand.warmupSafetyMargin" isShiftPressed={isShiftPressed} impact="positive"
                    onChange={v => setParam('demand', { warmupSafetyMargin: v })} />
                </div>
              )}

              {/* -- Effets des décisions -- */}
              <SectionHeader title="4. Effets quantifiés des 9 décisions" open={openSection === 'decisions'} onToggle={() => setOpenSection(s => s === 'decisions' ? '' : 'decisions')} />
              {openSection === 'decisions' && (
                <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                  <NumField label="D1 — hausse capacité usines de secours" value={params.decisions.d1_factoryBoostPct} step={0.05}
                    docKey="decisions.d1" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d1_factoryBoostPct: v })} />
                  <NumField label="D2 — hausse capacité entrepôts de secours" value={params.decisions.d2_warehouseBoostPct} step={0.05}
                    docKey="decisions.d2" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d2_warehouseBoostPct: v })} />
                  <NumField label="D3 — part de capacité usine restaurée" value={params.decisions.d3_recoveryFraction} step={0.05} min={0} max={1}
                    docKey="decisions.d3" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d3_recoveryFraction: v })} />
                  <NumField label="D4 — part de capacité lien/entrepôt restaurée" value={params.decisions.d4_recoveryFraction} step={0.05} min={0} max={1}
                    docKey="decisions.d4" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d4_recoveryFraction: v })} />
                  <NumField label="D5 — hausse globale capacité expédition" value={params.decisions.d5_globalBoostPct} step={0.05}
                    docKey="decisions.d5" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d5_globalBoostPct: v })} />
                  <NumField label="D6 — volume forfaitaire déstockage" value={params.decisions.d6_stockBoostShareOfDemand} step={0.05}
                    docKey="decisions.d6_boost" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d6_stockBoostShareOfDemand: v })} />
                  <NumField label="D6 — durée d'épuisement du stock" suffix="jours" value={params.decisions.d6_depletionDays} step={1} min={1}
                    docKey="decisions.d6_days" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d6_depletionDays: v })} />
                  <NumField label="D7 — part de capacité perdue compensée" value={params.decisions.d7_recoveryFraction} step={0.05} min={0} max={1}
                    docKey="decisions.d7" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d7_recoveryFraction: v })} />
                  <NumField label="D8 — réduction demande non critique servie" value={params.decisions.d8_regularDemandCutPct} step={0.05} min={0} max={1}
                    docKey="decisions.d8" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d8_regularDemandCutPct: v })} />
                  <NumField label="D9 — part demande non critique reportée" value={params.decisions.d9_regularDemandDeferPct} step={0.05} min={0} max={1}
                    docKey="decisions.d9" isShiftPressed={isShiftPressed}
                    onChange={v => setParam('decisions', { d9_regularDemandDeferPct: v })} />
                </div>
              )}

              {/* -- Profils du gestionnaire -- */}
              <SectionHeader title="5. Profils du gestionnaire simulé" open={openSection === 'profiles'} onToggle={() => setOpenSection(s => s === 'profiles' ? '' : 'profiles')} />
              {openSection === 'profiles' && (
                <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-4">
                  {(['reactif', 'prudent', 'tardif'] as const).map(pid => (
                    <div key={pid} className="border border-gray-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-gray-800 mb-2">{BRANCH_LABELS[pid]}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <NumField label="Seuil de détection (IP lissé)" value={params.profiles[pid].detectionThreshold} step={0.01} min={0} max={1}
                          docKey="profile.detectionThreshold" isShiftPressed={isShiftPressed}
                          onChange={v => setProfileParam(pid, { detectionThreshold: v })} />
                        <NumField label="Fenêtre de lissage" suffix="jours" value={params.profiles[pid].smoothingWindowDays} step={1} min={1}
                          docKey="profile.smoothingWindowDays" isShiftPressed={isShiftPressed}
                          onChange={v => setProfileParam(pid, { smoothingWindowDays: v })} />
                        <NumField label="Délai avant 1ère décision" suffix="jours" value={params.profiles[pid].decisionDelayDays} step={1} min={0}
                          docKey="profile.decisionDelayDays" isShiftPressed={isShiftPressed}
                          onChange={v => setProfileParam(pid, { decisionDelayDays: v })} />
                        <NumField label="Délai de réévaluation" suffix="jours" value={params.profiles[pid].reevaluationDays} step={1} min={0}
                          docKey="profile.reevaluationDays" isShiftPressed={isShiftPressed}
                          onChange={v => setProfileParam(pid, { reevaluationDays: v })} />
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-1">Ordre d'escalade des décisions (essayées dans cet ordre)</label>
                        <div className="flex flex-wrap gap-2">
                          {params.profiles[pid].escalationOrder.map((decId, idx) => (
                            <div key={decId} className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1 text-xs">
                              <span>{idx + 1}. {DECISION_LABELS[decId] ?? decId}</span>
                              <button onClick={() => moveInEscalation(pid, idx, -1)} disabled={idx === 0} className="disabled:opacity-30">
                                <ArrowUp size={12} />
                              </button>
                              <button onClick={() => moveInEscalation(pid, idx, 1)} disabled={idx === params.profiles[pid].escalationOrder.length - 1} className="disabled:opacity-30">
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ExtraHypothesisSections
                params={params}
                setParam={setParam}
                choice={networkChoice}
                onChoiceChange={setNetworkChoice}
                openSection={openSection}
                setOpenSection={setOpenSection}
                isShiftPressed={isShiftPressed}
              />
            </div>
          )}
        </section>

        {/* -------- Aperçu des résultats -------- */}
        {dataset && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <h2 className="font-bold text-gray-800 text-base">
                  {dataset.scenarios.length} scénarios générés
                </h2>
                <p className="text-xs text-gray-500">
                  {dataset.ipTimeseries.length} points d'IP simulés · {dataset.decisions.length} décisions déclenchées
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-gray-700">Scénario :</label>

                {/* Bouton Précédent */}
                <button
                  type="button"
                  onClick={handlePrevScenario}
                  disabled={currentScenarioIndex <= 0}
                  className="p-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white rounded-md text-gray-700 shadow-sm transition-colors"
                  title="Scénario précédent"
                  aria-label="Scénario précédent"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Liste déroulante des scénarios */}
                <select
                  value={selectedScenario}
                  onChange={e => {
                    setIsCinematic(false);
                    setSelectedScenario(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {dataset.scenarios.map((s, idx) => (
                    <option key={s.scenario_id} value={s.scenario_id}>
                      {s.scenario_id} ({idx + 1}/{dataset.scenarios.length})
                    </option>
                  ))}
                </select>

                {/* Bouton Suivant */}
                <button
                  type="button"
                  onClick={handleNextScenario}
                  disabled={currentScenarioIndex >= dataset.scenarios.length - 1}
                  className="p-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white rounded-md text-gray-700 shadow-sm transition-colors"
                  title="Scénario suivant"
                  aria-label="Scénario suivant"
                >
                  <ChevronRight size={16} />
                </button>

                {/* Bouton Effet Cinématique (défilement séquentiel de début à la fin) */}
                <button
                  type="button"
                  onClick={handleToggleCinematic}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ${
                    isCinematic
                      ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400 animate-pulse'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                  title={isCinematic ? 'Mettre en pause le défilement cinématique' : 'Lancer le défilement cinématique séquentiel (du début à la fin)'}
                >
                  {isCinematic ? <Pause size={14} /> : <Film size={14} />}
                  <span>{isCinematic ? 'Pause cinématique' : 'Cinématique'}</span>
                </button>

                {/* Vitesse cinématique si active */}
                {isCinematic && (
                  <select
                    value={cinematicSpeedMs}
                    onChange={e => setCinematicSpeedMs(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-amber-300 text-amber-900 rounded text-xs font-medium"
                    title="Vitesse de transition"
                  >
                    <option value={1000}>1.0s / scé</option>
                    <option value={650}>0.65s / scé</option>
                    <option value={350}>0.35s / scé</option>
                  </select>
                )}

                {onLaunchBatch && (
                  <button
                    type="button"
                    onClick={onLaunchBatch}
                    className="ml-2 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Ouvrir l'Ajustement par lot et charger automatiquement les 2 CSV générés"
                  >
                    <Play size={13} />
                    <span>Lancer l'ajustement par lot →</span>
                  </button>
                )}
              </div>
            </div>

            {selectedPerturbation && (
              <div className="mb-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500 text-sm">
                <strong>Perturbation :</strong> {DISRUPTION_LABELS[selectedPerturbation.type]}
                {' '}— cible : {selectedPerturbation.target || '—'}
                {' '}— sévérité : {selectedPerturbation.severity.toFixed(2)}
                {' '}— durée : {selectedPerturbation.duration} j
                {' '}— début (day_rel) : {selectedPerturbation.start}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              {BRANCH_IDS.map(b => (
                <button key={b} onClick={() => setVisibleBranches(prev => ({ ...prev, [b]: !prev[b] }))}
                  className="px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: visibleBranches[b] ? BRANCH_COLORS[b] : 'white',
                    color: visibleBranches[b] ? 'white' : BRANCH_COLORS[b],
                    borderColor: BRANCH_COLORS[b],
                  }}>
                  {BRANCH_LABELS[b]}
                </button>
              ))}
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day_rel" tick={{ fontSize: 11 }} label={{ value: 'jour (day_rel)', position: 'insideBottom', offset: -3, fontSize: 11 }} />
                  <YAxis domain={[0, 1.05]} tick={{ fontSize: 11 }} label={{ value: 'IP', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'début perturbation', fontSize: 10, fill: '#ef4444' }} />
                  {BRANCH_IDS.filter(b => visibleBranches[b]).map(b => (
                    <Line key={b} type="monotone" dataKey={b} name={BRANCH_LABELS[b]} stroke={BRANCH_COLORS[b]} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {selectedDecisions.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Décisions déclenchées sur ce scénario</h3>
                <table className="min-w-full text-xs border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      {['branch_id', 'decision_id', 'family', 'detected_day_rel', 'day_rel'].map(col => (
                        <th key={col} className="px-2 py-1 border-b border-gray-200 text-left font-semibold text-gray-700">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDecisions.map((d, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1">{BRANCH_LABELS[d.branch_id]}</td>
                        <td className="px-2 py-1">{d.decision_id}</td>
                        <td className="px-2 py-1">{d.family}</td>
                        <td className="px-2 py-1">{d.detected_day_rel}</td>
                        <td className="px-2 py-1">{d.day_rel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {buildExportFiles(dataset).map(f => (
                <button key={f.name}
                  onClick={() => downloadTextFile(f.name, f.content, f.name.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8;')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold border border-gray-300 flex items-center gap-1">
                  <Download size={12} /> {f.name}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Bloc1ScenarioGenerator;
