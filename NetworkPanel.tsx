// ============================================================================
// ISOMORPH-Reborn — Section « Réseau logistique » de l'onglet Générateur
// (palier 1, étape 5, décision Q1 A : en tête de l'onglet).
//
// Contenu : choix du réseau (défaut paramétrique, ISOMORPH prédéfini, réseau
// importé), import et export JSON, résumé, rapport de validation (erreurs et
// avertissements) et schéma par échelons (Q15 B).
// La logique (résolution, import, résumé, mise en page) est dans
// bloc1NetworkSelection.ts ; ce composant ne fait que l'afficher.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, TriangleAlert, Network, ChevronDown, ChevronUp } from 'lucide-react';

import { ModelParams, NetworkNodeType } from './bloc1Types';
import { ValidationIssue, networkDocumentToJson } from './bloc1NetworkFormat';
import { downloadTextFile, exportScenarioNetworkDocument } from './bloc1ExperimentPlan';
import {
  NetworkChoice, NetworkSource, ResolvedNetwork, PlanMeta, ImportOutcome, DiagramLayout,
  buildNetworkView, buildPlanConfig, importNetworkText, NODE_TYPE_LABELS, PARAMETRIC_LABEL, DEFAULT_PREVIEW_MAX_NODES,
} from './bloc1NetworkSelection';

export const NODE_TYPE_COLORS: Record<NetworkNodeType, string> = {
  fournisseur: '#7c3aed', usine: '#ea580c', hub: '#0891b2', entrepot: '#2563eb', transporteur: '#65a30d', client: '#dc2626',
};


const safeFileName = (s: string) => s.replace(/[^A-Za-z0-9_.-]/g, '_');

const IssueList: React.FC<{ issues: ValidationIssue[]; tone: 'error' | 'warning' }> = ({ issues, tone }) => (
  <ul className="space-y-1.5">
    {issues.map((issue, i) => (
      <li key={`${issue.code}-${i}`} className="flex items-start gap-2 text-xs">
        <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
          tone === 'error' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-900 border-amber-300'
        }`}>{issue.code}</span>
        <span className={tone === 'error' ? 'text-red-900' : 'text-amber-950'}>{issue.message}</span>
      </li>
    ))}
  </ul>
);

export const NetworkDiagram: React.FC<{ layout: DiagramLayout }> = ({ layout }) => {
  const g = layout.geometry;
  const pos = new Map(layout.nodes.map(n => [n.id, n]));
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <svg width={layout.width} height={layout.height} role="img" aria-label="Schéma du réseau par échelons">
        <defs>
          <marker id="net-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
          </marker>
        </defs>
        {layout.arcs.map((a, i) => {
          const from = pos.get(a.from), to = pos.get(a.to);
          if (!from || !to) return null;
          return (
            <line key={`${a.from}|${a.to}|${i}`}
              x1={from.x + g.nodeWidth} y1={from.y + g.nodeHeight / 2} x2={to.x - 2} y2={to.y + g.nodeHeight / 2}
              stroke="#6b7280" strokeWidth={1} strokeOpacity={0.55} strokeDasharray={a.unlimited ? '4 3' : undefined} markerEnd="url(#net-arrow)" />
          );
        })}
        {layout.nodes.map(n => (
          <g key={n.id}>
            <title>{n.tip}</title>
            <rect x={n.x} y={n.y} width={g.nodeWidth} height={g.nodeHeight} rx={5} fill={NODE_TYPE_COLORS[n.type]} />
            <text x={n.x + g.nodeWidth / 2} y={n.y + g.nodeHeight / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#ffffff">
              {n.id.length > 15 ? `${n.id.slice(0, 14)}…` : n.id}
            </text>
          </g>
        ))}
        {Array.from({ length: layout.nColumns }, (_, c) => (
          <text key={`col-${c}`} x={g.pad + c * g.colWidth + g.nodeWidth / 2} y={10} textAnchor="middle" fontSize={9} fill="#9ca3af">
            {`échelon ${c}`}
          </text>
        ))}
      </svg>
    </div>
  );
};

export interface NetworkPanelProps {
  choice: NetworkChoice;
  onChoiceChange: (choice: NetworkChoice) => void;
  resolved: ResolvedNetwork;
  params: ModelParams;
  planMeta: PlanMeta;
  isRunning?: boolean;
  defaultOpen?: boolean;
}

interface ImportFeedback { fileName: string; outcome: ImportOutcome; }

const SourceButton: React.FC<{
  active: boolean; disabled?: boolean; title: string; subtitle: string; onClick: () => void;
}> = ({ active, disabled, title, subtitle, onClick }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className={`text-left p-3 rounded-lg border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      active ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'
    }`}>
    <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
      <span className={`inline-block w-3 h-3 rounded-full border-2 ${active ? 'border-orange-600 bg-orange-600' : 'border-gray-400'}`} />
      {title}
    </span>
    <span className="block text-xs text-gray-600 mt-1 leading-snug">{subtitle}</span>
  </button>
);

export const NetworkPanel: React.FC<NetworkPanelProps> = ({ choice, onChoiceChange, resolved, params, planMeta, isRunning, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);
  const [exportError, setExportError] = useState<string>('');
  const [exportScenario, setExportScenario] = useState<number>(1);
  const [previewMaxNodes, setPreviewMaxNodes] = useState<number>(DEFAULT_PREVIEW_MAX_NODES);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const view = useMemo(
    () => buildNetworkView(resolved, params.network, previewMaxNodes),
    [resolved, params.network, previewMaxNodes]
  );

  const select = (source: NetworkSource) => {
    setFeedback(null);
    setExportError('');
    onChoiceChange({ ...choice, source });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = typeof e.target?.result === 'string' ? e.target.result : '';
      const outcome = importNetworkText(choice, text, file.name, params.temporal.enabled);
      setFeedback({ fileName: file.name, outcome });
      setExportError('');
      if (outcome.accepted) onChoiceChange(outcome.choice);
    };
    reader.onerror = () => setFeedback({
      fileName: file.name,
      outcome: { accepted: false, choice, report: { errors: [{ code: 'E_JSON', message: 'Lecture du fichier impossible.' }], warnings: [], compiled: null } },
    });
    reader.readAsText(file);
  };

  const exportDefinition = () => {
    if (!resolved.document) return;
    setExportError('');
    downloadTextFile(`reseau_${safeFileName(resolved.document.id)}.json`, networkDocumentToJson(resolved.document), 'application/json');
  };

  const exportInstance = () => {
    setExportError('');
    if (resolved.error) { setExportError(resolved.error); return; }
    const n = Math.floor(exportScenario);
    if (!Number.isFinite(n) || n < 1 || n > planMeta.nScenarios) {
      setExportError(`Numéro de scénario hors du plan : choisir un nombre de 1 à ${planMeta.nScenarios}.`);
      return;
    }
    try {
      const doc = exportScenarioNetworkDocument(buildPlanConfig(planMeta, params, resolved), n - 1);
      downloadTextFile(`reseau_${safeFileName(doc.id)}.json`, networkDocumentToJson(doc), 'application/json');
    } catch (err) {
      setExportError((err as Error).message);
    }
  };

  const importedName = choice.imported?.fileName;
  const isParametric = resolved.source === 'parametrique';
  const paramLabel = `${params.network.nFactories} usines, ${params.network.nWarehouses} entrepôts, 1 client`;
  const activeReport = resolved.report;

  return (
    <section id="section-reseau" className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
      {/* En-tête dépliant */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100/80 transition-colors focus:outline-none"
      >
        <div className="flex items-start gap-2.5">
          <Network size={20} className="text-orange-600 mt-0.5 shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-gray-800 text-sm md:text-base">Réseau logistique</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                {resolved.label}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                ({isParametric ? paramLabel : `${view.summary.nNodes} nœuds, ${view.summary.nArcs ?? 0} arcs`})
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
              Réseau sur lequel le plan d'expériences est simulé (paramétrique, ISOMORPH ou importé).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
            {isOpen ? 'Replier' : 'Déplier'}
          </span>
          {isOpen ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />}
        </div>
      </button>

      {/* Contenu complet dépliant */}
      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-200 animate-in fade-in duration-150">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <SourceButton active={resolved.source === 'parametrique'} disabled={isRunning}
              title={PARAMETRIC_LABEL}
              subtitle={`${paramLabel}. Capacités tirées à chaque scénario dans les plages des hypothèses (section 1).`}
              onClick={() => select('parametrique')} />
            <SourceButton active={resolved.source === 'isomorph'} disabled={isRunning}
              title="ISOMORPH d'origine"
              subtitle="13 villes, 16 arcs, 1 hub, 7 échelons (simulateur ISOMORPH). Hypothèses réglables : section 7 des hypothèses."
              onClick={() => select('isomorph')} />
            <SourceButton active={resolved.source === 'importe'} disabled={isRunning || !choice.imported}
              title={importedName ? `Réseau importé : ${importedName}` : 'Réseau importé'}
              subtitle={choice.imported ? choice.imported.document.name : "Aucun fichier importé pour l'instant. Utilisez « Importer un réseau (JSON) »."}
              onClick={() => select('importe')} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isRunning}
              className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 disabled:opacity-40">
              <Upload size={13} /> Importer un réseau (JSON)
            </button>
            {!isParametric && (
              <button type="button" onClick={exportDefinition} disabled={!resolved.document}
                className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 disabled:opacity-40"
                title="Télécharge le réseau tel qu'il est défini (format isomorph-reborn-network)">
                <Download size={13} /> Exporter le réseau (JSON)
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
              <label htmlFor="export-scenario-n">Instance du scénario n°</label>
              <input id="export-scenario-n" type="number" min={1} max={planMeta.nScenarios} step={1} value={exportScenario}
                onChange={e => setExportScenario(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded border border-gray-300 text-xs focus:border-orange-500 outline-none" />
              <button type="button" onClick={exportInstance}
                className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5"
                title="Rejoue les tirages du plan (graine et configuration actuelles) jusqu'à ce scénario et télécharge son réseau à capacités fixes, avec la règle et la graine en provenance">
                <Download size={13} /> Exporter l'instance (JSON)
              </button>
            </span>
          </div>
          {exportError && (
            <div className="p-2.5 bg-red-100 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={15} /> {exportError}
            </div>
          )}

          {feedback && feedback.outcome.accepted && (
            <div className="p-2.5 bg-green-100 text-green-900 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={15} /> Fichier « {feedback.fileName} » importé et sélectionné.
            </div>
          )}
          {feedback && !feedback.outcome.accepted && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                <AlertCircle size={16} /> Import refusé : « {feedback.fileName} » contient {feedback.outcome.report.errors.length} erreur{feedback.outcome.report.errors.length > 1 ? 's' : ''} bloquante{feedback.outcome.report.errors.length > 1 ? 's' : ''}.
              </div>
              <p className="text-xs text-red-900">Le réseau sélectionné n'a pas changé. Corrigez le fichier puis importez-le à nouveau.</p>
              <IssueList issues={feedback.outcome.report.errors} tone="error" />
            </div>
          )}

          {resolved.error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                <AlertCircle size={16} /> Le plan ne peut pas être lancé avec ce réseau.
              </div>
              <p className="text-xs text-red-900">{resolved.error}</p>
              {activeReport && activeReport.errors.length > 0 && <IssueList issues={activeReport.errors} tone="error" />}
            </div>
          )}

          <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-800">Résumé : {resolved.label}</h3>
              <span className="text-[11px] text-gray-500">
                {isParametric ? "Structure générée par la règle (capacités tirées à chaque scénario)" : 'Réseau explicite (ordre du fichier = ordre des tirages)'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {view.summary.nodesByType.map(t => (
                <span key={t.type} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 bg-gray-50">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[t.type] }} />
                  {NODE_TYPE_LABELS[t.type]} : <strong>{t.count}</strong>
                </span>
              ))}
              <span className="px-2 py-1 rounded-full border border-gray-200 bg-gray-50">Nœuds : <strong>{view.summary.nNodes}</strong></span>
              <span className="px-2 py-1 rounded-full border border-gray-200 bg-gray-50">
                Arcs : <strong>{view.summary.nArcs ?? 'non calculé'}</strong>
                {view.summary.nArcs !== null && (
                  <span className="text-gray-500"> ({view.summary.nArcsFinite} de capacité finie, {view.summary.nArcsUnlimited} illimités)</span>
                )}
              </span>
              <span className="px-2 py-1 rounded-full border border-gray-200 bg-gray-50">Échelons : <strong>{view.summary.nEchelons ?? 'non calculé'}</strong></span>
              {view.summary.nIgnored > 0 && (
                <span className="px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900">Nœuds ignorés : <strong>{view.summary.nIgnored}</strong></span>
              )}
            </div>
            {params.temporal.enabled && (
              <p className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 leading-relaxed">
                Mode temporel actif : délais et stocks (s, S) pris en compte
                {view.summary.timing
                  ? ` — lus dans le fichier : ${view.summary.timing.travelArcs} délai(s) de trajet (jusqu'à ${view.summary.timing.maxTravelDays} j), ${view.summary.timing.leadNodes} délai(s) de production (jusqu'à ${view.summary.timing.maxLeadDays} j), ${view.summary.timing.inventoryNodes} politique(s) inventory.`
                  : ' — délais par défaut des hypothèses (section 8), aucun délai propre au réseau.'}
                {' '}Réglages : section 8 des hypothèses.
              </p>
            )}
            {isParametric && (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Les arcs illimités du résumé sont les liaisons entrepôt vers client, qui représentent l'expédition vers le client
                (limitée par la capacité d'expédition de chaque entrepôt).
              </p>
            )}
          </div>

          {!isParametric && activeReport && (
            <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
              <h3 className="text-sm font-bold text-gray-800">Rapport de validation</h3>
              {activeReport.errors.length === 0 && activeReport.warnings.length === 0 && (
                <p className="text-xs text-green-800 flex items-center gap-1.5"><CheckCircle2 size={14} /> Aucune erreur ni avertissement.</p>
              )}
              {activeReport.errors.length === 0 && activeReport.warnings.length > 0 && (
                <p className="text-xs text-green-800 flex items-center gap-1.5"><CheckCircle2 size={14} /> Aucune erreur bloquante : le plan peut être lancé.</p>
              )}
              {activeReport.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <TriangleAlert size={14} /> {activeReport.warnings.length} avertissement{activeReport.warnings.length > 1 ? 's' : ''} (non bloquant{activeReport.warnings.length > 1 ? 's' : ''})
                  </div>
                  <IssueList issues={activeReport.warnings} tone="warning" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-800">Schéma par échelons</h3>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                {(Object.keys(NODE_TYPE_COLORS) as NetworkNodeType[])
                  .filter(t => view.summary.nodesByType.some(x => x.type === t))
                  .map(t => (
                    <span key={t} className="inline-flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NODE_TYPE_COLORS[t] }} />{NODE_TYPE_LABELS[t]}
                    </span>
                  ))}
                <span>trait plein : capacité finie · pointillé : illimité</span>
                <label className="inline-flex items-center gap-1" htmlFor="preview-max-nodes">
                  Limite d'affichage (nœuds)
                  <input id="preview-max-nodes" type="number" min={1} step={10} value={previewMaxNodes}
                    onChange={e => setPreviewMaxNodes(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 rounded border border-gray-300 text-[11px] focus:border-orange-500 outline-none" />
                </label>
              </div>
            </div>
            {view.diagram ? <NetworkDiagram layout={view.diagram} /> : (
              <p className="text-xs text-gray-500 italic">{view.diagramNote ?? 'Aucun schéma à afficher.'}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default NetworkPanel;
