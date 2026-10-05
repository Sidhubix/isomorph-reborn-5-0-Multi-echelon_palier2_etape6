import React from 'react';
import {
  Sliders, ShieldCheck, AlertTriangle, Flame, RotateCcw,
  TrendingDown, TrendingUp, Activity
} from 'lucide-react';
import { getStressLevelDescription, StressDescriptor } from './bloc1StressModel';

interface ImpactPotentiometerProps {
  value: number;
  onChange: (value: number) => void;
  isCustomized?: boolean;
  onResetToDefault?: () => void;
  // Message affiché quand le pilier « réseau » est ignoré (réseau explicite actif).
  networkNotice?: string;
}

export const ImpactPotentiometer: React.FC<ImpactPotentiometerProps> = ({
  value,
  onChange,
  isCustomized = false,
  onResetToDefault,
  networkNotice,
}) => {
  const desc: StressDescriptor = getStressLevelDescription(value);

  const presets = [
    { label: '0% — Min (IP Robuste)', val: 0, icon: ShieldCheck, color: 'hover:border-emerald-500 hover:text-emerald-700' },
    { label: '25% — Faible', val: 25, icon: ShieldCheck, color: 'hover:border-teal-500 hover:text-teal-700' },
    { label: '50% — Référence', val: 50, icon: Activity, color: 'hover:border-amber-500 hover:text-amber-700' },
    { label: '75% — Sévère', val: 75, icon: AlertTriangle, color: 'hover:border-orange-500 hover:text-orange-700' },
    { label: '100% — Max (IP Dégradé)', val: 100, icon: Flame, color: 'hover:border-red-500 hover:text-red-700' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-xl border border-slate-700 shadow-xl space-y-4">
      {/* En-tête du potentiomètre */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400">
            <Sliders size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Potentiomètre d'impact attendu sur l'IP
              </h3>
              {isCustomized && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Valeurs personnalisées
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Ajuste globalement et simultanément toutes les hypothèses du modèle (sévérité, durée, tension, décisions, délais).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onResetToDefault && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
              title="Rétablir l'étalonnage nominal (50%)"
            >
              <RotateCcw size={13} />
              <span>Référence (50%)</span>
            </button>
          )}
        </div>
      </div>

      {/* Jauge / Slider horizontal */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck size={14} />
            <span>0% — Impact Min (IP préservé)</span>
          </span>
          <span className="px-3 py-1 rounded-md font-mono text-sm font-black bg-slate-800 border border-slate-600 text-orange-400 shadow-inner">
            {value}% d'impact
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <Flame size={14} />
            <span>100% — Impact Max (IP très mauvais)</span>
          </span>
        </div>

        {/* Input range avec track dégradé */}
        <div className="relative py-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 rounded-lg appearance-none cursor-pointer accent-white shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {/* Repères visuels */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-1">
            <span>| 0%</span>
            <span>| 25%</span>
            <span>| 50% (Nominal)</span>
            <span>| 75%</span>
            <span>| 100%</span>
          </div>
        </div>

        {/* Boutons de présélection rapide */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presets.map((p) => {
            const isSelected = Math.abs(value - p.val) <= 2 && !isCustomized;
            const Icon = p.icon;
            return (
              <button
                key={p.val}
                type="button"
                onClick={() => onChange(p.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/30'
                    : `bg-slate-800/80 border-slate-700 text-slate-300 ${p.color}`
                }`}
              >
                <Icon size={13} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {networkNotice && (
        <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10 text-xs text-amber-200 leading-relaxed">
          {networkNotice}
        </div>
      )}

      {/* Synthèse dynamique de l'état du modèle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Statut & Tendance IP */}
        <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Profil d'impact configuré
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${desc.badgeBg}`}>
              {desc.label}
            </span>
          </div>
          <div className="flex items-start gap-2 pt-1">
            {value <= 50 ? (
              <TrendingUp size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <TrendingDown size={16} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-semibold text-slate-200">
              {desc.ipTendency}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {desc.summary}
          </p>
        </div>

        {/* Détails des leviers appliqués */}
        <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Réglages automatiques des 4 piliers
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block font-semibold">Choc & Durée :</span>
              <span className={value > 60 ? 'text-red-300 font-bold' : 'text-emerald-300 font-bold'}>
                {value <= 30 ? 'Sévérité 0.15-0.35 (1-4 j)' : value <= 70 ? 'Sévérité 0.5-1.0 (3-15 j)' : 'Sévérité 0.85-1.0 (12-32 j)'}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block font-semibold">Tension Réseau :</span>
              <span className={value > 60 ? 'text-red-300 font-bold' : 'text-emerald-300 font-bold'}>
                {value <= 30 ? 'Charge 55-75% (Sous-capacité)' : value <= 70 ? 'Charge 85-115% (Équilibré)' : 'Charge 130-170% (Surcharge)'}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block font-semibold">Décisions D1-D9 :</span>
              <span className={value > 60 ? 'text-red-300 font-bold' : 'text-emerald-300 font-bold'}>
                {value <= 30 ? 'Boosts forts (+45-55%), Stock 18j' : value <= 70 ? 'Boosts moyens (+15-50%), Stock 10j' : 'Boosts quasi nuls (+4-15%), Stock 3j'}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block font-semibold">Réactivité Managériale :</span>
              <span className={value > 60 ? 'text-red-300 font-bold' : 'text-emerald-300 font-bold'}>
                {value <= 30 ? 'Intervention 0-2j (Ultra-rapide)' : value <= 70 ? 'Intervention 1-6j (Normale)' : 'Intervention 3-12j (Inerte / Tardif)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
