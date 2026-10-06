"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkPanel = exports.NetworkDiagram = exports.NODE_TYPE_COLORS = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const bloc1NetworkFormat_1 = require("./bloc1NetworkFormat");
const bloc1ExperimentPlan_1 = require("./bloc1ExperimentPlan");
const bloc1NetworkSelection_1 = require("./bloc1NetworkSelection");
exports.NODE_TYPE_COLORS = {
    fournisseur: '#7c3aed', usine: '#ea580c', hub: '#0891b2', entrepot: '#2563eb', transporteur: '#65a30d', client: '#dc2626',
};
const safeFileName = (s) => s.replace(/[^A-Za-z0-9_.-]/g, '_');
const IssueList = ({ issues, tone }) => ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-1.5", children: issues.map((issue, i) => ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2 text-xs", children: [(0, jsx_runtime_1.jsx)("span", { className: `shrink-0 mt-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${tone === 'error' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`, children: issue.code }), (0, jsx_runtime_1.jsx)("span", { className: tone === 'error' ? 'text-red-900' : 'text-amber-950', children: issue.message })] }, `${issue.code}-${i}`))) }));
const NetworkDiagram = ({ layout }) => {
    const g = layout.geometry;
    const pos = new Map(layout.nodes.map(n => [n.id, n]));
    return ((0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto border border-gray-200 rounded-lg bg-white", children: (0, jsx_runtime_1.jsxs)("svg", { width: layout.width, height: layout.height, role: "img", "aria-label": "Sch\u00E9ma du r\u00E9seau par \u00E9chelons", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("marker", { id: "net-arrow", viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse", children: (0, jsx_runtime_1.jsx)("path", { d: "M0,0 L8,4 L0,8 z", fill: "#6b7280" }) }) }), layout.arcs.map((a, i) => {
                    const from = pos.get(a.from), to = pos.get(a.to);
                    if (!from || !to)
                        return null;
                    return ((0, jsx_runtime_1.jsx)("line", { x1: from.x + g.nodeWidth, y1: from.y + g.nodeHeight / 2, x2: to.x - 2, y2: to.y + g.nodeHeight / 2, stroke: "#6b7280", strokeWidth: 1, strokeOpacity: 0.55, strokeDasharray: a.unlimited ? '4 3' : undefined, markerEnd: "url(#net-arrow)" }, `${a.from}|${a.to}|${i}`));
                }), layout.nodes.map(n => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("title", { children: n.tip }), (0, jsx_runtime_1.jsx)("rect", { x: n.x, y: n.y, width: g.nodeWidth, height: g.nodeHeight, rx: 5, fill: exports.NODE_TYPE_COLORS[n.type] }), (0, jsx_runtime_1.jsx)("text", { x: n.x + g.nodeWidth / 2, y: n.y + g.nodeHeight / 2 + 4, textAnchor: "middle", fontSize: 11, fontWeight: 600, fill: "#ffffff", children: n.id.length > 15 ? `${n.id.slice(0, 14)}…` : n.id })] }, n.id))), Array.from({ length: layout.nColumns }, (_, c) => ((0, jsx_runtime_1.jsx)("text", { x: g.pad + c * g.colWidth + g.nodeWidth / 2, y: 10, textAnchor: "middle", fontSize: 9, fill: "#9ca3af", children: `échelon ${c}` }, `col-${c}`)))] }) }));
};
exports.NetworkDiagram = NetworkDiagram;
const SourceButton = ({ active, disabled, title, subtitle, onClick }) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onClick, disabled: disabled, className: `text-left p-3 rounded-lg border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'}`, children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2 text-sm font-bold text-gray-800", children: [(0, jsx_runtime_1.jsx)("span", { className: `inline-block w-3 h-3 rounded-full border-2 ${active ? 'border-orange-600 bg-orange-600' : 'border-gray-400'}` }), title] }), (0, jsx_runtime_1.jsx)("span", { className: "block text-xs text-gray-600 mt-1 leading-snug", children: subtitle })] }));
const NetworkPanel = ({ choice, onChoiceChange, resolved, params, planMeta, isRunning, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(defaultOpen);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const [exportError, setExportError] = (0, react_1.useState)('');
    const [exportScenario, setExportScenario] = (0, react_1.useState)(1);
    const [previewMaxNodes, setPreviewMaxNodes] = (0, react_1.useState)(bloc1NetworkSelection_1.DEFAULT_PREVIEW_MAX_NODES);
    const fileInputRef = react_1.default.useRef(null);
    const view = (0, react_1.useMemo)(() => (0, bloc1NetworkSelection_1.buildNetworkView)(resolved, params.network, previewMaxNodes), [resolved, params.network, previewMaxNodes]);
    const select = (source) => {
        setFeedback(null);
        setExportError('');
        onChoiceChange({ ...choice, source });
    };
    const handleFile = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = e => {
            const text = typeof e.target?.result === 'string' ? e.target.result : '';
            const outcome = (0, bloc1NetworkSelection_1.importNetworkText)(choice, text, file.name, params.temporal.enabled);
            setFeedback({ fileName: file.name, outcome });
            setExportError('');
            if (outcome.accepted)
                onChoiceChange(outcome.choice);
        };
        reader.onerror = () => setFeedback({
            fileName: file.name,
            outcome: { accepted: false, choice, report: { errors: [{ code: 'E_JSON', message: 'Lecture du fichier impossible.' }], warnings: [], compiled: null } },
        });
        reader.readAsText(file);
    };
    const exportDefinition = () => {
        if (!resolved.document)
            return;
        setExportError('');
        (0, bloc1ExperimentPlan_1.downloadTextFile)(`reseau_${safeFileName(resolved.document.id)}.json`, (0, bloc1NetworkFormat_1.networkDocumentToJson)(resolved.document), 'application/json');
    };
    const exportInstance = () => {
        setExportError('');
        if (resolved.error) {
            setExportError(resolved.error);
            return;
        }
        const n = Math.floor(exportScenario);
        if (!Number.isFinite(n) || n < 1 || n > planMeta.nScenarios) {
            setExportError(`Numéro de scénario hors du plan : choisir un nombre de 1 à ${planMeta.nScenarios}.`);
            return;
        }
        try {
            const doc = (0, bloc1ExperimentPlan_1.exportScenarioNetworkDocument)((0, bloc1NetworkSelection_1.buildPlanConfig)(planMeta, params, resolved), n - 1);
            (0, bloc1ExperimentPlan_1.downloadTextFile)(`reseau_${safeFileName(doc.id)}.json`, (0, bloc1NetworkFormat_1.networkDocumentToJson)(doc), 'application/json');
        }
        catch (err) {
            setExportError(err.message);
        }
    };
    const importedName = choice.imported?.fileName;
    const isParametric = resolved.source === 'parametrique';
    const paramLabel = `${params.network.nFactories} usines, ${params.network.nWarehouses} entrepôts, 1 client`;
    const activeReport = resolved.report;
    return ((0, jsx_runtime_1.jsxs)("section", { id: "section-reseau", className: "bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-2xs", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setIsOpen(prev => !prev), className: "w-full p-4 flex items-center justify-between text-left hover:bg-gray-100/80 transition-colors focus:outline-none", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Network, { size: 20, className: "text-orange-600 mt-0.5 shrink-0" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "font-bold text-gray-800 text-sm md:text-base", children: "R\u00E9seau logistique" }), (0, jsx_runtime_1.jsx)("span", { className: "px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200", children: resolved.label }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-gray-500 font-medium", children: ["(", isParametric ? paramLabel : `${view.summary.nNodes} nœuds, ${view.summary.nArcs ?? 0} arcs`, ")"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600 leading-relaxed mt-0.5", children: "R\u00E9seau sur lequel le plan d'exp\u00E9riences est simul\u00E9 (param\u00E9trique, ISOMORPH ou import\u00E9)." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0 ml-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-semibold text-gray-500 hidden sm:inline", children: isOpen ? 'Replier' : 'Déplier' }), isOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 18, className: "text-gray-600" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 18, className: "text-gray-600" })] })] }), isOpen && ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 pt-0 space-y-4 border-t border-gray-200 animate-in fade-in duration-150", children: [(0, jsx_runtime_1.jsxs)("div", { className: "pt-4 grid grid-cols-1 md:grid-cols-3 gap-3", children: [(0, jsx_runtime_1.jsx)(SourceButton, { active: resolved.source === 'parametrique', disabled: isRunning, title: bloc1NetworkSelection_1.PARAMETRIC_LABEL, subtitle: `${paramLabel}. Capacités tirées à chaque scénario dans les plages des hypothèses (section 1).`, onClick: () => select('parametrique') }), (0, jsx_runtime_1.jsx)(SourceButton, { active: resolved.source === 'isomorph', disabled: isRunning, title: "ISOMORPH d'origine", subtitle: "13 villes, 16 arcs, 1 hub, 7 \u00E9chelons (simulateur ISOMORPH). Hypoth\u00E8ses r\u00E9glables : section 7 des hypoth\u00E8ses.", onClick: () => select('isomorph') }), (0, jsx_runtime_1.jsx)(SourceButton, { active: resolved.source === 'importe', disabled: isRunning || !choice.imported, title: importedName ? `Réseau importé : ${importedName}` : 'Réseau importé', subtitle: choice.imported ? choice.imported.document.name : "Aucun fichier importé pour l'instant. Utilisez « Importer un réseau (JSON) ».", onClick: () => select('importe') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { ref: fileInputRef, type: "file", accept: ".json,application/json", onChange: handleFile, className: "hidden" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => fileInputRef.current?.click(), disabled: isRunning, className: "px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 disabled:opacity-40", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Upload, { size: 13 }), " Importer un r\u00E9seau (JSON)"] }), !isParametric && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: exportDefinition, disabled: !resolved.document, className: "px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 disabled:opacity-40", title: "T\u00E9l\u00E9charge le r\u00E9seau tel qu'il est d\u00E9fini (format isomorph-reborn-network)", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 13 }), " Exporter le r\u00E9seau (JSON)"] })), (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 text-xs text-gray-700", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "export-scenario-n", children: "Instance du sc\u00E9nario n\u00B0" }), (0, jsx_runtime_1.jsx)("input", { id: "export-scenario-n", type: "number", min: 1, max: planMeta.nScenarios, step: 1, value: exportScenario, onChange: e => setExportScenario(Number(e.target.value)), className: "w-20 px-2 py-1 rounded border border-gray-300 text-xs focus:border-orange-500 outline-none" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: exportInstance, className: "px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5", title: "Rejoue les tirages du plan (graine et configuration actuelles) jusqu'\u00E0 ce sc\u00E9nario et t\u00E9l\u00E9charge son r\u00E9seau \u00E0 capacit\u00E9s fixes, avec la r\u00E8gle et la graine en provenance", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 13 }), " Exporter l'instance (JSON)"] })] })] }), exportError && ((0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 bg-red-100 text-red-800 rounded-lg text-xs flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 15 }), " ", exportError] })), feedback && feedback.outcome.accepted && ((0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 bg-green-100 text-green-900 rounded-lg text-xs flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 15 }), " Fichier \u00AB ", feedback.fileName, " \u00BB import\u00E9 et s\u00E9lectionn\u00E9."] })), feedback && !feedback.outcome.accepted && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-red-50 border border-red-300 rounded-lg space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-sm font-bold text-red-800", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 16 }), " Import refus\u00E9 : \u00AB ", feedback.fileName, " \u00BB contient ", feedback.outcome.report.errors.length, " erreur", feedback.outcome.report.errors.length > 1 ? 's' : '', " bloquante", feedback.outcome.report.errors.length > 1 ? 's' : '', "."] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-red-900", children: "Le r\u00E9seau s\u00E9lectionn\u00E9 n'a pas chang\u00E9. Corrigez le fichier puis importez-le \u00E0 nouveau." }), (0, jsx_runtime_1.jsx)(IssueList, { issues: feedback.outcome.report.errors, tone: "error" })] })), resolved.error && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-red-50 border border-red-300 rounded-lg space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-sm font-bold text-red-800", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 16 }), " Le plan ne peut pas \u00EAtre lanc\u00E9 avec ce r\u00E9seau."] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-red-900", children: resolved.error }), activeReport && activeReport.errors.length > 0 && (0, jsx_runtime_1.jsx)(IssueList, { issues: activeReport.errors, tone: "error" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-white border border-gray-200 rounded-lg space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-baseline justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-sm font-bold text-gray-800", children: ["R\u00E9sum\u00E9 : ", resolved.label] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-gray-500", children: isParametric ? "Structure générée par la règle (capacités tirées à chaque scénario)" : 'Réseau explicite (ordre du fichier = ordre des tirages)' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2 text-xs", children: [view.summary.nodesByType.map(t => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 bg-gray-50", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 rounded-full", style: { backgroundColor: exports.NODE_TYPE_COLORS[t.type] } }), bloc1NetworkSelection_1.NODE_TYPE_LABELS[t.type], " : ", (0, jsx_runtime_1.jsx)("strong", { children: t.count })] }, t.type))), (0, jsx_runtime_1.jsxs)("span", { className: "px-2 py-1 rounded-full border border-gray-200 bg-gray-50", children: ["N\u0153uds : ", (0, jsx_runtime_1.jsx)("strong", { children: view.summary.nNodes })] }), (0, jsx_runtime_1.jsxs)("span", { className: "px-2 py-1 rounded-full border border-gray-200 bg-gray-50", children: ["Arcs : ", (0, jsx_runtime_1.jsx)("strong", { children: view.summary.nArcs ?? 'non calculé' }), view.summary.nArcs !== null && ((0, jsx_runtime_1.jsxs)("span", { className: "text-gray-500", children: [" (", view.summary.nArcsFinite, " de capacit\u00E9 finie, ", view.summary.nArcsUnlimited, " illimit\u00E9s)"] }))] }), (0, jsx_runtime_1.jsxs)("span", { className: "px-2 py-1 rounded-full border border-gray-200 bg-gray-50", children: ["\u00C9chelons : ", (0, jsx_runtime_1.jsx)("strong", { children: view.summary.nEchelons ?? 'non calculé' })] }), view.summary.nIgnored > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900", children: ["N\u0153uds ignor\u00E9s : ", (0, jsx_runtime_1.jsx)("strong", { children: view.summary.nIgnored })] }))] }), params.temporal.enabled && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 leading-relaxed", children: ["Mode temporel actif : d\u00E9lais et stocks (s, S) pris en compte", view.summary.timing
                                        ? ` — lus dans le fichier : ${view.summary.timing.travelArcs} délai(s) de trajet (jusqu'à ${view.summary.timing.maxTravelDays} j), ${view.summary.timing.leadNodes} délai(s) de production (jusqu'à ${view.summary.timing.maxLeadDays} j), ${view.summary.timing.inventoryNodes} politique(s) inventory.`
                                        : ' — délais par défaut des hypothèses (section 8), aucun délai propre au réseau.', ' ', "R\u00E9glages : section 8 des hypoth\u00E8ses."] })), isParametric && ((0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-gray-500 leading-relaxed", children: "Les arcs illimit\u00E9s du r\u00E9sum\u00E9 sont les liaisons entrep\u00F4t vers client, qui repr\u00E9sentent l'exp\u00E9dition vers le client (limit\u00E9e par la capacit\u00E9 d'exp\u00E9dition de chaque entrep\u00F4t)." }))] }), !isParametric && activeReport && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-white border border-gray-200 rounded-lg space-y-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-gray-800", children: "Rapport de validation" }), activeReport.errors.length === 0 && activeReport.warnings.length === 0 && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-green-800 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 14 }), " Aucune erreur ni avertissement."] })), activeReport.errors.length === 0 && activeReport.warnings.length > 0 && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-green-800 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { size: 14 }), " Aucune erreur bloquante : le plan peut \u00EAtre lanc\u00E9."] })), activeReport.warnings.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 text-xs font-bold text-amber-900", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TriangleAlert, { size: 14 }), " ", activeReport.warnings.length, " avertissement", activeReport.warnings.length > 1 ? 's' : '', " (non bloquant", activeReport.warnings.length > 1 ? 's' : '', ")"] }), (0, jsx_runtime_1.jsx)(IssueList, { issues: activeReport.warnings, tone: "warning" })] }))] })), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-gray-800", children: "Sch\u00E9ma par \u00E9chelons" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3 text-[11px] text-gray-600", children: [Object.keys(exports.NODE_TYPE_COLORS)
                                                .filter(t => view.summary.nodesByType.some(x => x.type === t))
                                                .map(t => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 rounded-sm", style: { backgroundColor: exports.NODE_TYPE_COLORS[t] } }), bloc1NetworkSelection_1.NODE_TYPE_LABELS[t]] }, t))), (0, jsx_runtime_1.jsx)("span", { children: "trait plein : capacit\u00E9 finie \u00B7 pointill\u00E9 : illimit\u00E9" }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex items-center gap-1", htmlFor: "preview-max-nodes", children: ["Limite d'affichage (n\u0153uds)", (0, jsx_runtime_1.jsx)("input", { id: "preview-max-nodes", type: "number", min: 1, step: 10, value: previewMaxNodes, onChange: e => setPreviewMaxNodes(Number(e.target.value)), className: "w-16 px-1.5 py-0.5 rounded border border-gray-300 text-[11px] focus:border-orange-500 outline-none" })] })] })] }), view.diagram ? (0, jsx_runtime_1.jsx)(exports.NetworkDiagram, { layout: view.diagram }) : ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-500 italic", children: view.diagramNote ?? 'Aucun schéma à afficher.' }))] })] }))] }));
};
exports.NetworkPanel = NetworkPanel;
exports.default = exports.NetworkPanel;
