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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtraHypothesisSections = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : onglet "Générateur de scénarios".
// À importer dans App.tsx et à monter comme 3ᵉ onglet, aux côtés de
// "Calibration manuelle" et "Traitement par lot" (voir le guide d'intégration
// livré à la fin de ce message).
// ============================================================================
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const bloc1Types_1 = require("./bloc1Types");
const bloc1ExperimentPlan_1 = require("./bloc1ExperimentPlan");
const bloc1DefaultParams_1 = require("./bloc1DefaultParams");
const NetworkPanel_1 = __importDefault(require("./NetworkPanel"));
const TemporalPanel_1 = require("./TemporalPanel");
const bloc1TemporalUi_1 = require("./bloc1TemporalUi");
const bloc1NetworkSelection_1 = require("./bloc1NetworkSelection");
const bloc1IsomorphPreset_1 = require("./bloc1IsomorphPreset");
const bloc1Descriptions_1 = require("./bloc1Descriptions");
const ImpactPotentiometer_1 = require("./ImpactPotentiometer");
const bloc1StressModel_1 = require("./bloc1StressModel");
const DISRUPTION_LABELS = {
    panne_fournisseur: 'Panne fournisseur',
    coupure_lien: 'Coupure de lien',
    fermeture_entrepot: "Fermeture d'entrepôt",
    pic_demande: 'Pic de demande',
    congestion: 'Congestion',
};
const BRANCH_LABELS = {
    none: 'Aucune décision', reactif: 'Réactif', prudent: 'Prudent', tardif: 'Tardif',
};
const BRANCH_COLORS = {
    none: '#9ca3af', reactif: '#dc2626', prudent: '#2563eb', tardif: '#16a34a',
};
const ALL_DISRUPTION_TYPES = bloc1ExperimentPlan_1.DEFAULT_DISRUPTION_TYPES;
const DECISION_LABELS = {
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
const ParamHelpBubble = ({ doc, onClose }) => ((0, jsx_runtime_1.jsxs)("div", { className: "absolute z-50 top-full left-0 mt-1.5 w-80 max-w-[85vw] p-3.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-2 border-b border-slate-700 pb-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-bold uppercase tracking-wider text-orange-400 block", children: doc.category }), (0, jsx_runtime_1.jsx)("h4", { className: "font-bold text-sm text-white", children: doc.title })] }), onClose && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-white p-0.5 text-xs", children: "\u2715" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5 text-slate-200", children: [(0, jsx_runtime_1.jsxs)("p", { className: "leading-relaxed", children: [(0, jsx_runtime_1.jsx)("strong", { className: "text-amber-300", children: "Explication :" }), " ", doc.explanation] }), (0, jsx_runtime_1.jsxs)("p", { className: "leading-relaxed", children: [(0, jsx_runtime_1.jsx)("strong", { className: "text-orange-400", children: "Impact :" }), " ", doc.impact] })] }), doc.defaultVal && ((0, jsx_runtime_1.jsxs)("div", { className: "pt-1 border-t border-slate-800 flex justify-between text-[10px] text-slate-400", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["D\u00E9faut : ", (0, jsx_runtime_1.jsx)("strong", { className: "text-slate-200", children: doc.defaultVal })] }), doc.unit && (0, jsx_runtime_1.jsxs)("span", { children: ["Unit\u00E9 : ", doc.unit] })] }))] }));
// ----------------------------------------------------------------------------
// Petit champ numérique réutilisé partout dans la section "Hypothèses".
// ----------------------------------------------------------------------------
const NumField = ({ label, value, onChange, step = 0.01, min, max, suffix, docKey, isShiftPressed, impact = 'neutral', disabled }) => {
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const [showManualHelp, setShowManualHelp] = (0, react_1.useState)(false);
    const doc = docKey ? bloc1Descriptions_1.MODEL_PARAM_DESCRIPTIONS[docKey] : undefined;
    const isBubbleVisible = doc && ((isHovered && isShiftPressed) || showManualHelp);
    return ((0, jsx_runtime_1.jsxs)("div", { className: `relative ${isBubbleVisible ? 'z-50' : ''}${disabled ? ' opacity-50' : ''}`, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-1 mb-0.5", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block text-xs text-gray-600 truncate", children: [label, suffix ? ` (${suffix})` : ''] }), doc && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setShowManualHelp(prev => !prev), className: "text-gray-400 hover:text-orange-600 transition-colors p-0.5", title: "Cliquez pour voir l'explication ou survolez en maintenant la touche Shift", children: (0, jsx_runtime_1.jsx)(lucide_react_1.HelpCircle, { size: 12 }) }))] }), (0, jsx_runtime_1.jsx)("input", { type: "number", step: step, min: min, max: max, value: value, disabled: disabled, onChange: e => onChange(Number(e.target.value)), className: `w-full px-2 py-1 rounded text-sm outline-none transition-all ${impact === 'positive'
                    ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                    : impact === 'negative'
                        ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-medium focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}` }), isBubbleVisible && doc && ((0, jsx_runtime_1.jsx)(ParamHelpBubble, { doc: doc, onClose: () => setShowManualHelp(false) }))] }));
};
const RangeField = ({ label, lo, hi, onChangeLo, onChangeHi, step = 0.01, suffix, docKey, isShiftPressed, polarity, loPolarity, hiPolarity, disabled }) => {
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const [showManualHelp, setShowManualHelp] = (0, react_1.useState)(false);
    const doc = docKey ? bloc1Descriptions_1.MODEL_PARAM_DESCRIPTIONS[docKey] : undefined;
    const isBubbleVisible = doc && ((isHovered && isShiftPressed) || showManualHelp);
    const effectiveLoPolarity = loPolarity ?? (polarity === 'higher-is-better' ? 'negative' : polarity === 'lower-is-better' ? 'positive' : 'neutral');
    const effectiveHiPolarity = hiPolarity ?? (polarity === 'higher-is-better' ? 'positive' : polarity === 'lower-is-better' ? 'negative' : 'neutral');
    return ((0, jsx_runtime_1.jsxs)("div", { className: `relative ${isBubbleVisible ? 'z-50' : ''}${disabled ? ' opacity-50' : ''}`, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-1 mb-0.5", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block text-xs text-gray-700 font-medium truncate", children: [label, suffix ? ` (${suffix})` : ''] }), doc && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setShowManualHelp(prev => !prev), className: "text-gray-400 hover:text-orange-600 transition-colors p-0.5", title: "Cliquez pour voir l'explication ou survolez en maintenant la touche Shift", children: (0, jsx_runtime_1.jsx)(lucide_react_1.HelpCircle, { size: 12 }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-1/2", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between text-[10px] font-bold mb-0.5 px-0.5", children: (0, jsx_runtime_1.jsxs)("span", { className: effectiveLoPolarity === 'positive' ? 'text-emerald-700' : effectiveLoPolarity === 'negative' ? 'text-rose-700' : 'text-gray-500', children: ["Min ", effectiveLoPolarity === 'positive' ? '● Favorable' : effectiveLoPolarity === 'negative' ? '● Défavorable' : ''] }) }), (0, jsx_runtime_1.jsx)("input", { type: "number", step: step, value: lo, disabled: disabled, onChange: e => onChangeLo(Number(e.target.value)), title: `Borne minimale : ${effectiveLoPolarity === 'positive' ? 'Impact positif / favorable sur la résilience' : effectiveLoPolarity === 'negative' ? 'Impact négatif / contraignant sur la performance' : 'Borne min'}`, className: `w-full px-2 py-1 rounded text-sm outline-none transition-all ${effectiveLoPolarity === 'positive'
                                    ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                                    : effectiveLoPolarity === 'negative'
                                        ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-semibold focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                        : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "w-1/2", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between text-[10px] font-bold mb-0.5 px-0.5", children: (0, jsx_runtime_1.jsxs)("span", { className: effectiveHiPolarity === 'positive' ? 'text-emerald-700' : effectiveHiPolarity === 'negative' ? 'text-rose-700' : 'text-gray-500', children: ["Max ", effectiveHiPolarity === 'positive' ? '● Favorable' : effectiveHiPolarity === 'negative' ? '● Défavorable' : ''] }) }), (0, jsx_runtime_1.jsx)("input", { type: "number", step: step, value: hi, disabled: disabled, onChange: e => onChangeHi(Number(e.target.value)), title: `Borne maximale : ${effectiveHiPolarity === 'positive' ? 'Impact positif / favorable sur la résilience' : effectiveHiPolarity === 'negative' ? 'Impact négatif / contraignant sur la performance' : 'Borne max'}`, className: `w-full px-2 py-1 rounded text-sm outline-none transition-all ${effectiveHiPolarity === 'positive'
                                    ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                                    : effectiveHiPolarity === 'negative'
                                        ? 'border-2 border-rose-500 bg-rose-50/40 text-rose-950 font-semibold focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                        : 'border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}` })] })] }), isBubbleVisible && doc && ((0, jsx_runtime_1.jsx)(ParamHelpBubble, { doc: doc, onClose: () => setShowManualHelp(false) }))] }));
};
const SectionHeader = ({ title, open, onToggle }) => ((0, jsx_runtime_1.jsxs)("button", { onClick: onToggle, className: "w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-800", children: [(0, jsx_runtime_1.jsx)("span", { children: title }), open ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 16 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16 })] }));
// ----------------------------------------------------------------------------
// Sections 6 et 7 des hypothèses (palier 1) : constantes de calcul auparavant
// codées en dur, et hypothèses du réseau ISOMORPH prédéfini. Composant exporté
// pour pouvoir être rendu isolément par les tests.
// ----------------------------------------------------------------------------
const ExtraHypothesisSections = ({ params, setParam, choice, onChoiceChange, openSection, setOpenSection, isShiftPressed }) => {
    const opts = choice.isomorphOptions;
    const setOpts = (patch) => onChoiceChange({ ...choice, isomorphOptions: { ...opts, ...patch } });
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(SectionHeader, { title: "6. Constantes de calcul (indicateur de performance et flot)", open: openSection === 'constants', onToggle: () => setOpenSection(s => s === 'constants' ? '' : 'constants') }), openSection === 'constants' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "Poids des articles importants dans l'IP", value: params.indicators.importantWeight, step: 0.5, min: 0, docKey: "indicators.importantWeight", isShiftPressed: isShiftPressed, onChange: v => setParam('indicators', { importantWeight: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Seuil de r\u00E9tablissement (IP)", value: params.indicators.recoveryThreshold, step: 0.01, min: 0, max: 1, docKey: "indicators.recoveryThreshold", isShiftPressed: isShiftPressed, onChange: v => setParam('indicators', { recoveryThreshold: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Garde du calcul de flot", suffix: "chemins", value: params.flow.maxIterations, step: 100, min: 1, docKey: "flow.maxIterations", isShiftPressed: isShiftPressed, onChange: v => setParam('flow', { maxIterations: v }) })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "7. Hypoth\u00E8ses du r\u00E9seau ISOMORPH pr\u00E9d\u00E9fini", open: openSection === 'isomorph', onToggle: () => setOpenSection(s => s === 'isomorph' ? '' : 'isomorph') }), openSection === 'isomorph' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600 leading-relaxed", children: "Ces hypoth\u00E8ses ne s'appliquent que lorsque le r\u00E9seau ISOMORPH est s\u00E9lectionn\u00E9 (section \u00AB R\u00E9seau logistique \u00BB, en haut de l'onglet). Les capacit\u00E9s des arcs viennent du fichier d'origine (volume d'un conteneur multipli\u00E9 par le nombre de conteneurs par jour) ; le fichier d'origine ne d\u00E9finit ni capacit\u00E9 de production ni capacit\u00E9 du dernier kilom\u00E8tre." }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "Plage des arcs (plus ou moins)", suffix: "fraction", value: opts.arcRangePct, step: 0.01, min: 0, max: 0.99, docKey: "isomorph.arcRangePct", isShiftPressed: isShiftPressed, onChange: v => setOpts({ arcRangePct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Facteur de capacit\u00E9 des sources", value: opts.sourceFactor, step: 0.05, min: 0.05, docKey: "isomorph.sourceFactor", isShiftPressed: isShiftPressed, onChange: v => setOpts({ sourceFactor: v }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 text-xs text-gray-700 font-medium", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: opts.lastMileCapacity === null, onChange: e => setOpts({ lastMileCapacity: e.target.checked ? null : (0, bloc1IsomorphPreset_1.originalLastMileCapacity)() }) }), "Dernier kilom\u00E8tre illimit\u00E9"] }), (0, jsx_runtime_1.jsx)(NumField, { label: "Capacit\u00E9 du dernier kilom\u00E8tre", suffix: "unit\u00E9s/jour par arc", value: opts.lastMileCapacity ?? (0, bloc1IsomorphPreset_1.originalLastMileCapacity)(), step: 100, min: 1, docKey: "isomorph.lastMileCapacity", isShiftPressed: isShiftPressed, disabled: opts.lastMileCapacity === null, onChange: v => setOpts({ lastMileCapacity: v }) })] })] })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "8. Mode temporel (d\u00E9lais de trajet et de production, stocks (s, S))", open: openSection === 'temporal', onToggle: () => setOpenSection(s => s === 'temporal' ? '' : 'temporal') }), openSection === 'temporal' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600 leading-relaxed", children: "D\u00E9sactiv\u00E9 (par d\u00E9faut), le plan se calcule exactement comme avant : le d\u00E9bit du jour est un flot instantan\u00E9, sans d\u00E9lai ni stock. Activ\u00E9, la mati\u00E8re transite pendant plusieurs jours, la production met un d\u00E9lai \u00E0 devenir disponible, et chaque entrep\u00F4t ou hub g\u00E8re un stock (s, S) : l'IP refl\u00E8te alors ce que le r\u00E9seau livre r\u00E9ellement, avec retard et amortissement par les stocks. Les d\u00E9lais propres \u00E0 chaque arc ou n\u0153ud viennent du fichier du r\u00E9seau (ISOMORPH en fournit) ; les valeurs ci-dessous servent aux \u00E9l\u00E9ments qui n'en ont pas. Ces r\u00E9glages ne sont jamais modifi\u00E9s par le potentiom\u00E8tre d'impact." }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 text-sm text-gray-800 font-semibold", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: params.temporal.enabled, onChange: e => setParam('temporal', { enabled: e.target.checked }) }), "Activer le mode temporel"] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "D\u00E9lai de trajet par d\u00E9faut", suffix: "jours", value: params.temporal.defaultTravelTimeDays, step: 1, min: 0, max: bloc1DefaultParams_1.TEMPORAL_MAX_DELAY_DAYS, docKey: "temporal.defaultTravelTimeDays", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { defaultTravelTimeDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D\u00E9lai de production par d\u00E9faut", suffix: "jours", value: params.temporal.defaultProductionLeadTimeDays, step: 1, min: 0, max: bloc1DefaultParams_1.TEMPORAL_MAX_DELAY_DAYS, docKey: "temporal.defaultProductionLeadTimeDays", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { defaultProductionLeadTimeDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Pr\u00E9-chauffe (non enregistr\u00E9e)", suffix: "jours", value: params.temporal.burnInDays, step: 5, min: 0, max: bloc1DefaultParams_1.TEMPORAL_MAX_BURN_IN_DAYS, docKey: "temporal.burnInDays", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { burnInDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Couverture du point de commande s", suffix: "jours de demande", value: params.temporal.reorderPointDays, step: 0.5, min: 0, docKey: "temporal.reorderPointDays", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { reorderPointDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Couverture du niveau de recompl\u00E8tement S", suffix: "jours de demande", value: params.temporal.orderUpToDays, step: 0.5, min: 0, docKey: "temporal.orderUpToDays", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { orderUpToDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Hausse de s et S par D7", suffix: "fraction", value: params.temporal.d7OrderUpToBoostPct, step: 0.05, min: 0, docKey: "temporal.d7OrderUpToBoostPct", isShiftPressed: isShiftPressed, disabled: !params.temporal.enabled, onChange: v => setParam('temporal', { d7OrderUpToBoostPct: v }) })] }), (0, jsx_runtime_1.jsxs)("label", { className: `flex items-center gap-2 text-xs text-gray-700 font-medium ${params.temporal.enabled ? '' : 'opacity-50'}`, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: params.temporal.lastMileSameDay, disabled: !params.temporal.enabled, onChange: e => setParam('temporal', { lastMileSameDay: e.target.checked }) }), "Dernier kilom\u00E8tre servi le jour m\u00EAme (d\u00E9lai de trajet ignor\u00E9 sur les arcs vers le client)"] }), params.temporal.enabled && (0, bloc1DefaultParams_1.temporalParamProblems)(params.temporal).length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 space-y-1", role: "alert", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-bold", children: "R\u00E9glages invalides : le plan sera refus\u00E9" }), (0, jsx_runtime_1.jsx)("ul", { className: "list-disc list-inside", children: (0, bloc1DefaultParams_1.temporalParamProblems)(params.temporal).map((m, i) => (0, jsx_runtime_1.jsx)("li", { children: m }, i)) })] })), (0, bloc1TemporalUi_1.temporalCoverageWarning)(params.temporal) && ((0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950", children: (0, bloc1TemporalUi_1.temporalCoverageWarning)(params.temporal) })), (0, jsx_runtime_1.jsx)(TemporalPanel_1.TemporalSensitivityTable, {})] }))] }));
};
exports.ExtraHypothesisSections = ExtraHypothesisSections;
const Bloc1ScenarioGenerator = ({ dataset: externalDataset, onDatasetGenerated, onNavigateToBatch, onLaunchBatch, }) => {
    const [localDataset, setLocalDataset] = (0, react_1.useState)(null);
    const dataset = externalDataset ?? localDataset;
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const [progress, setProgress] = (0, react_1.useState)({ done: 0, total: 0 });
    const [error, setError] = (0, react_1.useState)('');
    const [errorView, setErrorView] = (0, react_1.useState)(null); // refus structuré (mode temporel)
    const [selectedScenario, setSelectedScenario] = (0, react_1.useState)('');
    const [isCinematic, setIsCinematic] = (0, react_1.useState)(false);
    const [cinematicSpeedMs, setCinematicSpeedMs] = (0, react_1.useState)(800);
    const [visibleBranches, setVisibleBranches] = (0, react_1.useState)({
        none: true,
        reactif: true,
        prudent: true,
        tardif: true,
    });
    const [hypothesesOpen, setHypothesesOpen] = (0, react_1.useState)(false);
    const [openSection, setOpenSection] = (0, react_1.useState)('network');
    const [isShiftPressed, setIsShiftPressed] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift')
                setIsShiftPressed(true);
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift')
                setIsShiftPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!isCinematic || !dataset || dataset.scenarios.length === 0)
            return;
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
    const [planMeta, setPlanMeta] = (0, react_1.useState)(() => {
        try {
            const saved = localStorage.getItem('isomorph_plan_meta');
            if (saved)
                return JSON.parse(saved);
        }
        catch { }
        return {
            nScenarios: bloc1ExperimentPlan_1.DEFAULT_PLAN_CONFIG.nScenarios,
            seed: bloc1ExperimentPlan_1.DEFAULT_PLAN_CONFIG.seed,
            warmupDays: bloc1ExperimentPlan_1.DEFAULT_PLAN_CONFIG.warmupDays,
            horizonDays: bloc1ExperimentPlan_1.DEFAULT_PLAN_CONFIG.horizonDays,
            disruptionTypes: bloc1ExperimentPlan_1.DEFAULT_PLAN_CONFIG.disruptionTypes,
        };
    });
    const [params, setParams] = (0, react_1.useState)(() => {
        try {
            const saved = localStorage.getItem('isomorph_model_params');
            // Complète les sections ajoutées au palier 1 pour les anciennes sauvegardes.
            if (saved)
                return (0, bloc1DefaultParams_1.withModelParamDefaults)(JSON.parse(saved));
        }
        catch { }
        return (0, bloc1DefaultParams_1.cloneDefaultModelParams)();
    });
    // Réseau choisi (palier 1). Par défaut : réseau paramétrique, comme avant.
    const [networkChoice, setNetworkChoice] = (0, react_1.useState)(() => {
        try {
            const saved = localStorage.getItem(bloc1NetworkSelection_1.NETWORK_CHOICE_STORAGE_KEY);
            if (saved)
                return (0, bloc1NetworkSelection_1.sanitizeNetworkChoice)(JSON.parse(saved));
        }
        catch { }
        return (0, bloc1NetworkSelection_1.cloneDefaultNetworkChoice)();
    });
    const resolvedNetwork = (0, react_1.useMemo)(() => (0, bloc1NetworkSelection_1.resolveNetworkChoice)(networkChoice, params.temporal.enabled), [networkChoice, params.temporal.enabled]);
    const networkFixed = resolvedNetwork.spec !== null; // réseau explicite : capacités et nombre de sites fixés par le réseau
    const [stressLevel, setStressLevel] = (0, react_1.useState)(() => {
        try {
            const saved = localStorage.getItem('isomorph_stress_level');
            if (saved)
                return Number(saved);
        }
        catch { }
        return 50;
    });
    const [isCustomized, setIsCustomized] = (0, react_1.useState)(() => {
        try {
            const saved = localStorage.getItem('isomorph_is_customized');
            if (saved)
                return saved === 'true';
        }
        catch { }
        return false;
    });
    // Sauvegarde automatique des réglages dans le stockage local
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('isomorph_plan_meta', JSON.stringify(planMeta));
            localStorage.setItem('isomorph_model_params', JSON.stringify(params));
            localStorage.setItem('isomorph_stress_level', String(stressLevel));
            localStorage.setItem('isomorph_is_customized', String(isCustomized));
        }
        catch { }
    }, [planMeta, params, stressLevel, isCustomized]);
    // Sauvegarde locale du réseau choisi (y compris le dernier réseau importé).
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem(bloc1NetworkSelection_1.NETWORK_CHOICE_STORAGE_KEY, JSON.stringify(networkChoice));
        }
        catch { }
    }, [networkChoice]);
    const configFileInputRef = react_1.default.useRef(null);
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
    const importHypothesesConfig = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string')
                    return;
                const data = JSON.parse(text);
                if (data.params)
                    setParams((0, bloc1DefaultParams_1.withModelParamDefaults)(data.params));
                if (data.planMeta)
                    setPlanMeta(data.planMeta);
                if (typeof data.stressLevel === 'number')
                    setStressLevel(data.stressLevel);
                if (typeof data.isCustomized === 'boolean')
                    setIsCustomized(data.isCustomized);
                // Un ancien fichier d'hypothèses sans réseau revient au réseau par défaut.
                setNetworkChoice((0, bloc1NetworkSelection_1.networkChoiceFromHypotheses)(data));
            }
            catch (err) {
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
    const handleStressChange = (newVal) => {
        setStressLevel(newVal);
        setParams(p => (0, bloc1StressModel_1.applyStressLevelPreservingSettings)(p, newVal));
        setIsCustomized(false);
    };
    const resetParams = () => {
        setStressLevel(50);
        setParams((0, bloc1DefaultParams_1.cloneDefaultModelParams)());
        setIsCustomized(false);
    };
    // Bouton « Réinitialiser » des hypothèses : hypothèses du modèle et hypothèses
    // ISOMORPH aux valeurs par défaut ; le réseau sélectionné ne change pas.
    const resetAllHypotheses = () => {
        resetParams();
        setNetworkChoice(c => ({ ...c, isomorphOptions: { ...bloc1IsomorphPreset_1.ISOMORPH_PRESET_DEFAULTS } }));
    };
    const toggleDisruptionType = (type) => {
        setPlanMeta((prev) => {
            const has = prev.disruptionTypes.includes(type);
            const next = has ? prev.disruptionTypes.filter((t) => t !== type) : [...prev.disruptionTypes, type];
            return { ...prev, disruptionTypes: next.length > 0 ? next : prev.disruptionTypes };
        });
    };
    // Met à jour un champ imbriqué de params par chemin (ex. 'network.factoryCapacityMin').
    const setParam = (section, patch) => {
        setIsCustomized(true);
        setParams(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }));
    };
    const setProfileParam = (profileId, patch) => {
        setIsCustomized(true);
        setParams(prev => ({
            ...prev,
            profiles: { ...prev.profiles, [profileId]: { ...prev.profiles[profileId], ...patch } },
        }));
    };
    const moveInEscalation = (profileId, idx, dir) => {
        setIsCustomized(true);
        setParams(prev => {
            const order = [...prev.profiles[profileId].escalationOrder];
            const j = idx + dir;
            if (j < 0 || j >= order.length)
                return prev;
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
            const problems = (0, bloc1DefaultParams_1.temporalParamProblems)(params.temporal);
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
            const config = (0, bloc1NetworkSelection_1.buildPlanConfig)(planMeta, params, resolvedNetwork);
            const result = await (0, bloc1ExperimentPlan_1.generateExperimentPlanAsync)(config, (done, total) => {
                setProgress({ done, total });
            });
            setLocalDataset(result);
            if (onDatasetGenerated) {
                onDatasetGenerated(result);
            }
            setSelectedScenario(result.scenarios[0]?.scenario_id ?? '');
        }
        catch (err) {
            const view = (0, bloc1TemporalUi_1.describePlanError)(err);
            if (view.kind === 'other')
                setError(view.message); // affichage d'origine
            else
                setErrorView(view);
        }
        finally {
            setIsRunning(false);
        }
    };
    const currentScenarioIndex = (0, react_1.useMemo)(() => {
        if (!dataset || dataset.scenarios.length === 0)
            return -1;
        return dataset.scenarios.findIndex(s => s.scenario_id === selectedScenario);
    }, [dataset, selectedScenario]);
    const handlePrevScenario = () => {
        if (!dataset || currentScenarioIndex <= 0)
            return;
        setIsCinematic(false);
        setSelectedScenario(dataset.scenarios[currentScenarioIndex - 1].scenario_id);
    };
    const handleNextScenario = () => {
        if (!dataset || currentScenarioIndex >= dataset.scenarios.length - 1)
            return;
        setIsCinematic(false);
        setSelectedScenario(dataset.scenarios[currentScenarioIndex + 1].scenario_id);
    };
    const handleToggleCinematic = () => {
        if (!dataset || dataset.scenarios.length === 0)
            return;
        if (isCinematic) {
            setIsCinematic(false);
        }
        else {
            // Si on est déjà à la fin, on recommence au tout début
            if (currentScenarioIndex >= dataset.scenarios.length - 1 || currentScenarioIndex === -1) {
                setSelectedScenario(dataset.scenarios[0].scenario_id);
            }
            setIsCinematic(true);
        }
    };
    const chartData = (0, react_1.useMemo)(() => {
        if (!dataset || !selectedScenario)
            return [];
        const rows = dataset.ipTimeseries.filter(p => p.scenario_id === selectedScenario);
        const byDay = {};
        rows.forEach(p => {
            byDay[p.day_rel] = byDay[p.day_rel] || { day_rel: p.day_rel };
            byDay[p.day_rel][p.branch_id] = p.ip;
        });
        return Object.values(byDay).sort((a, b) => a.day_rel - b.day_rel);
    }, [dataset, selectedScenario]);
    const selectedPerturbation = (0, react_1.useMemo)(() => dataset?.perturbations.find(p => p.scenario_id === selectedScenario) ?? null, [dataset, selectedScenario]);
    const selectedDecisions = (0, react_1.useMemo)(() => dataset?.decisions.filter(d => d.scenario_id === selectedScenario) ?? [], [dataset, selectedScenario]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-lg shadow-lg", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-6 rounded-t-lg", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold", children: "G\u00E9n\u00E9rateur de sc\u00E9narios (Bloc 1)" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 text-orange-100 text-sm max-w-3xl leading-relaxed", children: [resolvedNetwork.spec
                                            ? `Instancie le réseau « ${resolvedNetwork.label} »`
                                            : `Instancie un réseau logistique paramétrique (${params.network.nFactories} usines, ${params.network.nWarehouses} entrepôts, 1 client)`, params.temporal.enabled ? ', en mode temporel (délais de trajet et de production, stocks (s, S))' : '', ", injecte une perturbation parmi 5 natures, simule 4 branches (aucune d\u00E9cision, r\u00E9actif, prudent, tardif) et exporte les 5 fichiers + metadata.json au format d\u00E9j\u00E0 utilis\u00E9 par le traitement par lot."] })] }), onNavigateToBatch && dataset && dataset.scenarios.length > 0 && ((0, jsx_runtime_1.jsxs)("button", { onClick: onNavigateToBatch, className: "px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 animate-in fade-in", title: "Passer directement \u00E0 l'ajustement par lot avec les sc\u00E9narios g\u00E9n\u00E9r\u00E9s", children: [(0, jsx_runtime_1.jsx)("span", { children: "Acc\u00E9der \u00E0 l'Ajustement par lot" }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 16 })] }))] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-6 space-y-6", children: [(0, jsx_runtime_1.jsx)(NetworkPanel_1.default, { choice: networkChoice, onChoiceChange: setNetworkChoice, resolved: resolvedNetwork, params: params, planMeta: planMeta, isRunning: isRunning, defaultOpen: false }), (0, jsx_runtime_1.jsx)(ImpactPotentiometer_1.ImpactPotentiometer, { value: stressLevel, onChange: handleStressChange, isCustomized: isCustomized, onResetToDefault: resetParams, networkNotice: (0, bloc1NetworkSelection_1.potentiometerNetworkNotice)(resolvedNetwork), defaultOpen: false }), (0, jsx_runtime_1.jsxs)("section", { className: "bg-gray-50 p-4 rounded-lg border border-gray-200", children: [(0, jsx_runtime_1.jsx)("h2", { className: "font-bold text-gray-800 mb-3", children: "Plan d'exp\u00E9riences" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "Nombre de sc\u00E9narios", value: planMeta.nScenarios, step: 1, min: 1, max: 2000, onChange: v => setPlanMeta((p) => ({ ...p, nScenarios: v })) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Graine al\u00E9atoire (seed)", value: planMeta.seed, step: 1, onChange: v => setPlanMeta((p) => ({ ...p, seed: v })) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Jours de warm-up", value: planMeta.warmupDays, step: 1, min: 0, onChange: v => setPlanMeta((p) => ({ ...p, warmupDays: v })) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Horizon simul\u00E9 (jours)", value: planMeta.horizonDays, step: 1, min: 10, onChange: v => setPlanMeta((p) => ({ ...p, horizonDays: v })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Natures de perturbation activ\u00E9es" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: ALL_DISRUPTION_TYPES.map(type => ((0, jsx_runtime_1.jsx)("button", { onClick: () => toggleDisruptionType(type), className: `px-3 py-1 rounded-full text-xs font-semibold border ${planMeta.disruptionTypes.includes(type)
                                                ? 'bg-orange-600 text-white border-orange-600'
                                                : 'bg-white text-gray-600 border-gray-300'}`, children: DISRUPTION_LABELS[type] }, type))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex items-center gap-3 flex-wrap", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleRun, disabled: isRunning, className: "px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Play, { size: 16 }), isRunning ? `Génération en cours... (${progress.done}/${progress.total})` : "Lancer le plan d'expériences"] }), dataset && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => (0, bloc1ExperimentPlan_1.downloadAllFiles)(dataset), className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 16 }), " Tout exporter (5 CSV + metadata.json)"] }), onLaunchBatch && ((0, jsx_runtime_1.jsxs)("button", { onClick: onLaunchBatch, className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm", title: "Passer \u00E0 l'ajustement par lot et charger automatiquement les 2 fichiers CSV g\u00E9n\u00E9r\u00E9s", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Play, { size: 16 }), (0, jsx_runtime_1.jsx)("span", { children: "Lancer l'ajustement par lot" }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 16 })] }))] }))] }), isRunning && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 p-4 bg-white border border-orange-200 rounded-lg shadow-sm space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center text-xs font-semibold text-gray-700", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5 text-orange-700 font-bold", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping" }), "G\u00E9n\u00E9ration en cours des sc\u00E9narios et simulations des 4 branches..."] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sm font-bold text-orange-800", children: [progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0, " %"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner", children: (0, jsx_runtime_1.jsx)("div", { className: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 h-3 rounded-full transition-all duration-150 ease-out shadow", style: {
                                                width: `${progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0}%`,
                                            } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-[11px] text-gray-500", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Sc\u00E9nario ", (0, jsx_runtime_1.jsx)("strong", { children: progress.done }), " / ", progress.total] }), (0, jsx_runtime_1.jsxs)("span", { children: [progress.done * 4, " courbes d'IP(t) calcul\u00E9es"] })] })] })), error && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 p-3 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18 }), " ", error] })), errorView && (0, jsx_runtime_1.jsx)(TemporalPanel_1.PlanErrorNotice, { view: errorView, onOpenTemporalSettings: openTemporalSettings })] }), (0, jsx_runtime_1.jsxs)("section", { className: "border border-gray-200 rounded-lg bg-white shadow-2xs", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setHypothesesOpen(o => !o), className: `w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-left transition-colors ${hypothesesOpen ? 'rounded-t-lg border-b border-gray-200' : 'rounded-lg'}`, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-gray-800", children: "Hypoth\u00E8ses du mod\u00E8le" }), (0, jsx_runtime_1.jsx)("span", { className: "ml-2 text-xs text-gray-500", children: "Toute valeur pos\u00E9e faute de donn\u00E9e d'origine \u2014 r\u00E9glable ici, valeurs par d\u00E9faut raisonnables" })] }), hypothesesOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 18 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 18 })] }), hypothesesOpen && ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 space-y-3 bg-white rounded-b-lg", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-900 shadow-2xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 max-w-xl", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 16, className: "text-amber-600 shrink-0" }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Astuce :" }), " Maintenez la touche ", (0, jsx_runtime_1.jsx)("kbd", { className: `px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border transition-all ${isShiftPressed ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300' : 'bg-white text-gray-800 border-gray-300 shadow-2xs'}`, children: "Shift" }), " enfonc\u00E9e en survolant un param\u00E8tre (ou cliquez sur son ic\u00F4ne ", (0, jsx_runtime_1.jsx)(lucide_react_1.HelpCircle, { size: 12, className: "inline text-orange-600" }), ") pour afficher son explication d\u00E9taill\u00E9e et son impact simul\u00E9."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsx)("input", { ref: configFileInputRef, type: "file", accept: ".json", onChange: importHypothesesConfig, className: "hidden" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => configFileInputRef.current?.click(), className: "px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 shadow-2xs transition-colors", title: "Charger un fichier JSON de configuration d'hypoth\u00E8ses sauvegard\u00E9", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 13, className: "rotate-180" }), (0, jsx_runtime_1.jsx)("span", { children: "Importer r\u00E9glages" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: exportHypothesesConfig, className: "px-2.5 py-1 bg-white hover:bg-orange-50 text-orange-700 rounded-md text-xs font-semibold border border-orange-300 flex items-center gap-1.5 shadow-2xs transition-colors", title: "Sauvegarder l'ensemble des hypoth\u00E8ses actuelles dans un fichier JSON", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 13 }), (0, jsx_runtime_1.jsx)("span", { children: "Sauvegarder r\u00E9glages" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: resetAllHypotheses, className: "px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded-md text-xs font-semibold border border-gray-300 flex items-center gap-1 shadow-2xs transition-colors", title: "R\u00E9tablir les hypoth\u00E8ses par d\u00E9faut", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RotateCcw, { size: 12 }), (0, jsx_runtime_1.jsx)("span", { children: "R\u00E9initialiser" })] })] })] }), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "1. G\u00E9n\u00E9ration du r\u00E9seau", open: openSection === 'network', onToggle: () => setOpenSection(s => s === 'network' ? '' : 'network') }), openSection === 'network' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3 text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-900", children: "Code couleur des bornes :" }), (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-emerald-600" }), "Encadrement Vert = Impact positif / renforce la r\u00E9silience"] }), (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 font-semibold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-300", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-rose-600" }), "Encadrement Rouge = Impact n\u00E9gatif / goulot ou fragilit\u00E9"] })] }), networkFixed && ((0, jsx_runtime_1.jsx)("div", { className: "p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed", children: "Un r\u00E9seau explicite est s\u00E9lectionn\u00E9 : les capacit\u00E9s et le nombre de sites ci-dessous ne s'appliquent qu'au r\u00E9seau par d\u00E9faut (champs gris\u00E9s). La part d'articles importants et le bruit de demande restent utilis\u00E9s." })), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(RangeField, { label: "Capacit\u00E9 usine", suffix: "unit\u00E9s/jour", lo: params.network.factoryCapacityMin, hi: params.network.factoryCapacityMax, step: 5, docKey: "network.factoryCapacity", isShiftPressed: isShiftPressed, disabled: networkFixed, polarity: "higher-is-better", onChangeLo: v => setParam('network', { factoryCapacityMin: v }), onChangeHi: v => setParam('network', { factoryCapacityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Capacit\u00E9 lien primaire", suffix: "unit\u00E9s/jour", lo: params.network.primaryEdgeCapacityMin, hi: params.network.primaryEdgeCapacityMax, step: 5, docKey: "network.primaryEdgeCapacity", isShiftPressed: isShiftPressed, disabled: networkFixed, polarity: "higher-is-better", onChangeLo: v => setParam('network', { primaryEdgeCapacityMin: v }), onChangeHi: v => setParam('network', { primaryEdgeCapacityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Capacit\u00E9 lien secondaire", suffix: "unit\u00E9s/jour", lo: params.network.secondaryEdgeCapacityMin, hi: params.network.secondaryEdgeCapacityMax, step: 5, docKey: "network.secondaryEdgeCapacity", isShiftPressed: isShiftPressed, disabled: networkFixed, polarity: "higher-is-better", onChangeLo: v => setParam('network', { secondaryEdgeCapacityMin: v }), onChangeHi: v => setParam('network', { secondaryEdgeCapacityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Capacit\u00E9 lien tertiaire", suffix: "unit\u00E9s/jour", lo: params.network.tertiaryEdgeCapacityMin, hi: params.network.tertiaryEdgeCapacityMax, step: 5, docKey: "network.tertiaryEdgeCapacity", isShiftPressed: isShiftPressed, disabled: networkFixed, polarity: "higher-is-better", onChangeLo: v => setParam('network', { tertiaryEdgeCapacityMin: v }), onChangeHi: v => setParam('network', { tertiaryEdgeCapacityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Capacit\u00E9 exp\u00E9dition entrep\u00F4t", suffix: "unit\u00E9s/jour", lo: params.network.warehouseShipCapacityMin, hi: params.network.warehouseShipCapacityMax, step: 5, docKey: "network.warehouseShipCapacity", isShiftPressed: isShiftPressed, disabled: networkFixed, polarity: "higher-is-better", onChangeLo: v => setParam('network', { warehouseShipCapacityMin: v }), onChangeHi: v => setParam('network', { warehouseShipCapacityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Part d'articles importants", lo: params.network.importantShareMin, hi: params.network.importantShareMax, step: 0.05, docKey: "network.importantShare", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('network', { importantShareMin: v }), onChangeHi: v => setParam('network', { importantShareMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Bruit journalier sur la demande", suffix: "fraction", lo: params.network.demandNoiseMin, hi: params.network.demandNoiseMax, step: 0.01, docKey: "network.demandNoise", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('network', { demandNoiseMin: v }), onChangeHi: v => setParam('network', { demandNoiseMax: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Nombre d'usines", value: params.network.nFactories, step: 1, min: 1, docKey: "network.nFactories", isShiftPressed: isShiftPressed, disabled: networkFixed, impact: "positive", onChange: v => setParam('network', { nFactories: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Nombre d'entrep\u00F4ts", value: params.network.nWarehouses, step: 1, min: 1, docKey: "network.nWarehouses", isShiftPressed: isShiftPressed, disabled: networkFixed, impact: "positive", onChange: v => setParam('network', { nWarehouses: v }) })] })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "2. S\u00E9v\u00E9rit\u00E9 et dur\u00E9e des perturbations", open: openSection === 'disruption', onToggle: () => setOpenSection(s => s === 'disruption' ? '' : 'disruption') }), openSection === 'disruption' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(RangeField, { label: "S\u00E9v\u00E9rit\u00E9 g\u00E9n\u00E9rale (panne, congestion, pic)", lo: params.disruption.severityMin, hi: params.disruption.severityMax, step: 0.05, docKey: "disruption.severity", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('disruption', { severityMin: v }), onChangeHi: v => setParam('disruption', { severityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "S\u00E9v\u00E9rit\u00E9 binaire (coupure, fermeture)", lo: params.disruption.binarySeverityMin, hi: params.disruption.binarySeverityMax, step: 0.05, docKey: "disruption.binarySeverity", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('disruption', { binarySeverityMin: v }), onChangeHi: v => setParam('disruption', { binarySeverityMax: v }) }), (0, jsx_runtime_1.jsx)(RangeField, { label: "Dur\u00E9e", suffix: "jours", lo: params.disruption.durationMinDays, hi: params.disruption.durationMaxDays, step: 1, docKey: "disruption.duration", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('disruption', { durationMinDays: v }), onChangeHi: v => setParam('disruption', { durationMaxDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Amplification pic de demande (s=1)", value: params.disruption.picDemandeAmplificationAtMaxSeverity, step: 0.1, docKey: "disruption.picDemandeAmplification", isShiftPressed: isShiftPressed, onChange: v => setParam('disruption', { picDemandeAmplificationAtMaxSeverity: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Coupure lien : friction entrep\u00F4t desservi", value: params.disruption.coupureLienWarehouseFrictionPct, step: 0.05, min: 0, max: 1, docKey: "disruption.coupureLienWarehouseFriction", isShiftPressed: isShiftPressed, onChange: v => setParam('disruption', { coupureLienWarehouseFrictionPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Coupure lien : friction autres liens de l'entrep\u00F4t", value: params.disruption.coupureLienOtherEdgesFrictionPct, step: 0.05, min: 0, max: 1, docKey: "disruption.coupureLienOtherEdgesFriction", isShiftPressed: isShiftPressed, onChange: v => setParam('disruption', { coupureLienOtherEdgesFrictionPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Coupure lien : probabilit\u00E9 de cibler le lien principal", value: params.disruption.coupureLienPrimaryEdgeProbability, step: 0.05, min: 0, max: 1, docKey: "disruption.coupureLienPrimaryProb", isShiftPressed: isShiftPressed, onChange: v => setParam('disruption', { coupureLienPrimaryEdgeProbability: v }) })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "3. Calibration de la demande de r\u00E9f\u00E9rence", open: openSection === 'demand', onToggle: () => setOpenSection(s => s === 'demand' ? '' : 'demand') }), openSection === 'demand' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(RangeField, { label: "Rapport demande / d\u00E9bit pendant l'incident", lo: params.demand.utilizationMin, hi: params.demand.utilizationMax, step: 0.05, docKey: "demand.utilization", isShiftPressed: isShiftPressed, polarity: "lower-is-better", onChangeLo: v => setParam('demand', { utilizationMin: v }), onChangeHi: v => setParam('demand', { utilizationMax: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Marge de s\u00E9curit\u00E9 warm-up (IP=1 garanti)", value: params.demand.warmupSafetyMargin, step: 0.005, min: 0.5, max: 1, docKey: "demand.warmupSafetyMargin", isShiftPressed: isShiftPressed, impact: "positive", onChange: v => setParam('demand', { warmupSafetyMargin: v }) })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "4. Effets quantifi\u00E9s des 9 d\u00E9cisions", open: openSection === 'decisions', onToggle: () => setOpenSection(s => s === 'decisions' ? '' : 'decisions') }), openSection === 'decisions' && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg grid grid-cols-2 md:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "D1 \u2014 hausse capacit\u00E9 usines de secours", value: params.decisions.d1_factoryBoostPct, step: 0.05, docKey: "decisions.d1", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d1_factoryBoostPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D2 \u2014 hausse capacit\u00E9 entrep\u00F4ts de secours", value: params.decisions.d2_warehouseBoostPct, step: 0.05, docKey: "decisions.d2", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d2_warehouseBoostPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D3 \u2014 part de capacit\u00E9 usine restaur\u00E9e", value: params.decisions.d3_recoveryFraction, step: 0.05, min: 0, max: 1, docKey: "decisions.d3", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d3_recoveryFraction: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D4 \u2014 part de capacit\u00E9 lien/entrep\u00F4t restaur\u00E9e", value: params.decisions.d4_recoveryFraction, step: 0.05, min: 0, max: 1, docKey: "decisions.d4", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d4_recoveryFraction: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D5 \u2014 hausse globale capacit\u00E9 exp\u00E9dition", value: params.decisions.d5_globalBoostPct, step: 0.05, docKey: "decisions.d5", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d5_globalBoostPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D6 \u2014 volume forfaitaire d\u00E9stockage", value: params.decisions.d6_stockBoostShareOfDemand, step: 0.05, docKey: "decisions.d6_boost", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d6_stockBoostShareOfDemand: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D6 \u2014 dur\u00E9e d'\u00E9puisement du stock", suffix: "jours", value: params.decisions.d6_depletionDays, step: 1, min: 1, docKey: "decisions.d6_days", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d6_depletionDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D7 \u2014 part de capacit\u00E9 perdue compens\u00E9e", value: params.decisions.d7_recoveryFraction, step: 0.05, min: 0, max: 1, docKey: "decisions.d7", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d7_recoveryFraction: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D8 \u2014 r\u00E9duction demande non critique servie", value: params.decisions.d8_regularDemandCutPct, step: 0.05, min: 0, max: 1, docKey: "decisions.d8", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d8_regularDemandCutPct: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D9 \u2014 part demande non critique report\u00E9e", value: params.decisions.d9_regularDemandDeferPct, step: 0.05, min: 0, max: 1, docKey: "decisions.d9", isShiftPressed: isShiftPressed, onChange: v => setParam('decisions', { d9_regularDemandDeferPct: v }) })] })), (0, jsx_runtime_1.jsx)(SectionHeader, { title: "5. Profils du gestionnaire simul\u00E9", open: openSection === 'profiles', onToggle: () => setOpenSection(s => s === 'profiles' ? '' : 'profiles') }), openSection === 'profiles' && ((0, jsx_runtime_1.jsx)("div", { className: "p-3 border border-t-0 border-gray-200 rounded-b-lg space-y-4", children: ['reactif', 'prudent', 'tardif'].map(pid => ((0, jsx_runtime_1.jsxs)("div", { className: "border border-gray-200 rounded-lg p-3", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-bold text-gray-800 mb-2", children: BRANCH_LABELS[pid] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [(0, jsx_runtime_1.jsx)(NumField, { label: "Seuil de d\u00E9tection (IP liss\u00E9)", value: params.profiles[pid].detectionThreshold, step: 0.01, min: 0, max: 1, docKey: "profile.detectionThreshold", isShiftPressed: isShiftPressed, onChange: v => setProfileParam(pid, { detectionThreshold: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "Fen\u00EAtre de lissage", suffix: "jours", value: params.profiles[pid].smoothingWindowDays, step: 1, min: 1, docKey: "profile.smoothingWindowDays", isShiftPressed: isShiftPressed, onChange: v => setProfileParam(pid, { smoothingWindowDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D\u00E9lai avant 1\u00E8re d\u00E9cision", suffix: "jours", value: params.profiles[pid].decisionDelayDays, step: 1, min: 0, docKey: "profile.decisionDelayDays", isShiftPressed: isShiftPressed, onChange: v => setProfileParam(pid, { decisionDelayDays: v }) }), (0, jsx_runtime_1.jsx)(NumField, { label: "D\u00E9lai de r\u00E9\u00E9valuation", suffix: "jours", value: params.profiles[pid].reevaluationDays, step: 1, min: 0, docKey: "profile.reevaluationDays", isShiftPressed: isShiftPressed, onChange: v => setProfileParam(pid, { reevaluationDays: v }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs text-gray-600 mb-1", children: "Ordre d'escalade des d\u00E9cisions (essay\u00E9es dans cet ordre)" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: params.profiles[pid].escalationOrder.map((decId, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1 text-xs", children: [(0, jsx_runtime_1.jsxs)("span", { children: [idx + 1, ". ", DECISION_LABELS[decId] ?? decId] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => moveInEscalation(pid, idx, -1), disabled: idx === 0, className: "disabled:opacity-30", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowUp, { size: 12 }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => moveInEscalation(pid, idx, 1), disabled: idx === params.profiles[pid].escalationOrder.length - 1, className: "disabled:opacity-30", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowDown, { size: 12 }) })] }, decId))) })] })] }, pid))) })), (0, jsx_runtime_1.jsx)(exports.ExtraHypothesisSections, { params: params, setParam: setParam, choice: networkChoice, onChoiceChange: setNetworkChoice, openSection: openSection, setOpenSection: setOpenSection, isShiftPressed: isShiftPressed })] }))] }), dataset && ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h2", { className: "font-bold text-gray-800 text-base", children: [dataset.scenarios.length, " sc\u00E9narios g\u00E9n\u00E9r\u00E9s"] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-gray-500", children: [dataset.ipTimeseries.length, " points d'IP simul\u00E9s \u00B7 ", dataset.decisions.length, " d\u00E9cisions d\u00E9clench\u00E9es"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-xs font-semibold text-gray-700", children: "Sc\u00E9nario :" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handlePrevScenario, disabled: currentScenarioIndex <= 0, className: "p-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white rounded-md text-gray-700 shadow-sm transition-colors", title: "Sc\u00E9nario pr\u00E9c\u00E9dent", "aria-label": "Sc\u00E9nario pr\u00E9c\u00E9dent", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { size: 16 }) }), (0, jsx_runtime_1.jsx)("select", { value: selectedScenario, onChange: e => {
                                                    setIsCinematic(false);
                                                    setSelectedScenario(e.target.value);
                                                }, className: "px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500", children: dataset.scenarios.map((s, idx) => ((0, jsx_runtime_1.jsxs)("option", { value: s.scenario_id, children: [s.scenario_id, " (", idx + 1, "/", dataset.scenarios.length, ")"] }, s.scenario_id))) }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleNextScenario, disabled: currentScenarioIndex >= dataset.scenarios.length - 1, className: "p-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-white rounded-md text-gray-700 shadow-sm transition-colors", title: "Sc\u00E9nario suivant", "aria-label": "Sc\u00E9nario suivant", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 16 }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleToggleCinematic, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ${isCinematic
                                                    ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400 animate-pulse'
                                                    : 'bg-orange-600 hover:bg-orange-700 text-white'}`, title: isCinematic ? 'Mettre en pause le défilement cinématique' : 'Lancer le défilement cinématique séquentiel (du début à la fin)', children: [isCinematic ? (0, jsx_runtime_1.jsx)(lucide_react_1.Pause, { size: 14 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Film, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: isCinematic ? 'Pause cinématique' : 'Cinématique' })] }), isCinematic && ((0, jsx_runtime_1.jsxs)("select", { value: cinematicSpeedMs, onChange: e => setCinematicSpeedMs(Number(e.target.value)), className: "px-2 py-1 bg-white border border-amber-300 text-amber-900 rounded text-xs font-medium", title: "Vitesse de transition", children: [(0, jsx_runtime_1.jsx)("option", { value: 1000, children: "1.0s / sc\u00E9" }), (0, jsx_runtime_1.jsx)("option", { value: 650, children: "0.65s / sc\u00E9" }), (0, jsx_runtime_1.jsx)("option", { value: 350, children: "0.35s / sc\u00E9" })] })), onLaunchBatch && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onLaunchBatch, className: "ml-2 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs", title: "Ouvrir l'Ajustement par lot et charger automatiquement les 2 CSV g\u00E9n\u00E9r\u00E9s", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Play, { size: 13 }), (0, jsx_runtime_1.jsx)("span", { children: "Lancer l'ajustement par lot \u2192" })] }))] })] }), selectedPerturbation && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500 text-sm", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Perturbation :" }), " ", DISRUPTION_LABELS[selectedPerturbation.type], ' ', "\u2014 cible : ", selectedPerturbation.target || '—', ' ', "\u2014 s\u00E9v\u00E9rit\u00E9 : ", selectedPerturbation.severity.toFixed(2), ' ', "\u2014 dur\u00E9e : ", selectedPerturbation.duration, " j", ' ', "\u2014 d\u00E9but (day_rel) : ", selectedPerturbation.start] })), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2 mb-3", children: bloc1Types_1.BRANCH_IDS.map(b => ((0, jsx_runtime_1.jsx)("button", { onClick: () => setVisibleBranches(prev => ({ ...prev, [b]: !prev[b] })), className: "px-3 py-1 rounded-full text-xs font-semibold border", style: {
                                        backgroundColor: visibleBranches[b] ? BRANCH_COLORS[b] : 'white',
                                        color: visibleBranches[b] ? 'white' : BRANCH_COLORS[b],
                                        borderColor: BRANCH_COLORS[b],
                                    }, children: BRANCH_LABELS[b] }, b))) }), (0, jsx_runtime_1.jsx)("div", { className: "bg-white p-4 rounded-lg border border-gray-200", children: (0, jsx_runtime_1.jsx)(recharts_1.ResponsiveContainer, { width: "100%", height: 360, children: (0, jsx_runtime_1.jsxs)(recharts_1.LineChart, { data: chartData, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "day_rel", tick: { fontSize: 11 }, label: { value: 'jour (day_rel)', position: 'insideBottom', offset: -3, fontSize: 11 } }), (0, jsx_runtime_1.jsx)(recharts_1.YAxis, { domain: [0, 1.05], tick: { fontSize: 11 }, label: { value: 'IP', angle: -90, position: 'insideLeft', fontSize: 11 } }), (0, jsx_runtime_1.jsx)(recharts_1.Tooltip, {}), (0, jsx_runtime_1.jsx)(recharts_1.Legend, {}), (0, jsx_runtime_1.jsx)(recharts_1.ReferenceLine, { x: 0, stroke: "#ef4444", strokeDasharray: "4 4", label: { value: 'début perturbation', fontSize: 10, fill: '#ef4444' } }), bloc1Types_1.BRANCH_IDS.filter(b => visibleBranches[b]).map(b => ((0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: b, name: BRANCH_LABELS[b], stroke: BRANCH_COLORS[b], strokeWidth: 2, dot: false, connectNulls: true }, b)))] }) }) }), selectedDecisions.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 overflow-x-auto", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-gray-700 mb-2", children: "D\u00E9cisions d\u00E9clench\u00E9es sur ce sc\u00E9nario" }), (0, jsx_runtime_1.jsxs)("table", { className: "min-w-full text-xs border border-gray-200", children: [(0, jsx_runtime_1.jsx)("thead", { className: "bg-gray-100", children: (0, jsx_runtime_1.jsx)("tr", { children: ['branch_id', 'decision_id', 'family', 'detected_day_rel', 'day_rel'].map(col => ((0, jsx_runtime_1.jsx)("th", { className: "px-2 py-1 border-b border-gray-200 text-left font-semibold text-gray-700", children: col }, col))) }) }), (0, jsx_runtime_1.jsx)("tbody", { children: selectedDecisions.map((d, i) => ((0, jsx_runtime_1.jsxs)("tr", { className: i % 2 === 0 ? 'bg-white' : 'bg-gray-50', children: [(0, jsx_runtime_1.jsx)("td", { className: "px-2 py-1", children: BRANCH_LABELS[d.branch_id] }), (0, jsx_runtime_1.jsx)("td", { className: "px-2 py-1", children: d.decision_id }), (0, jsx_runtime_1.jsx)("td", { className: "px-2 py-1", children: d.family }), (0, jsx_runtime_1.jsx)("td", { className: "px-2 py-1", children: d.detected_day_rel }), (0, jsx_runtime_1.jsx)("td", { className: "px-2 py-1", children: d.day_rel })] }, i))) })] })] })), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex flex-wrap gap-2", children: (0, bloc1ExperimentPlan_1.buildExportFiles)(dataset).map(f => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => (0, bloc1ExperimentPlan_1.downloadTextFile)(f.name, f.content, f.name.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8;'), className: "px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold border border-gray-300 flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 12 }), " ", f.name] }, f.name))) })] }))] })] }));
};
exports.default = Bloc1ScenarioGenerator;
