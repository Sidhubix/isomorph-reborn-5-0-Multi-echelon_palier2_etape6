// ============================================================================
// ISOMORPH-Reborn — Composants du mode temporel (palier 2, étape 5) :
// tableau de sensibilité de la couverture et affichage des refus de plan.
// ============================================================================

import React from 'react';
import { AlertCircle, TriangleAlert, Settings } from 'lucide-react';
import { TEMPORAL_SENSITIVITY, PlanErrorView } from './bloc1TemporalUi';

export const TemporalSensitivityTable: React.FC = () => {
  const t = TEMPORAL_SENSITIVITY;
  return (
    <div className="space-y-3" id="temporal-sensitivity">
      <h3 className="text-sm font-bold text-gray-800">Sensibilité de la couverture de stock</h3>
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 leading-relaxed space-y-1">
        <div className="flex items-center gap-1.5 font-bold"><TriangleAlert size={14} className="shrink-0" /> Une couverture trop faible peut rendre un scénario impossible à calibrer</div>
        <p>
          Pour garantir un IP égal à 1 avant la perturbation malgré le bruit de demande, le moteur cherche une demande de référence que le réseau sert intégralement pendant la chauffe.
          Avec trop peu de stock au regard du bruit et des délais, aucune demande ne convient : le plan est alors refusé, avec le scénario en cause et le remède.
          Plus la couverture est forte, moins les pannes courtes produisent de creux d'IP : à choisir selon l'étude.
        </p>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Couverture (s / S)</th>
              <th className="text-left px-3 py-2 font-semibold">Pannes avec creux d'IP</th>
              <th className="text-left px-3 py-2 font-semibold">Remarque</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 text-gray-600">
              <td className="px-3 py-1.5">{t.baseline.label}</td>
              <td className="px-3 py-1.5">{t.baseline.dips} sur {t.baseline.of}</td>
              <td className="px-3 py-1.5">Référence : sans stock ni délai</td>
            </tr>
            {t.coverage.map(row => (
              <tr key={row.label} className={`border-t border-gray-100 ${row.status === 'refused' ? 'bg-red-50 text-red-900' : ''}`}>
                <td className="px-3 py-1.5 font-medium">{row.label}</td>
                <td className="px-3 py-1.5">
                  {row.status === 'ok' ? `${row.dips} sur ${row.of}` : `Plan refusé (scénario ${row.refusedAt})`}
                </td>
                <td className="px-3 py-1.5">
                  {row.status === 'ok'
                    ? (row.dips === 0 ? 'Pannes de 3 à 15 jours entièrement absorbées' : 'Creux surtout sur les pannes longues et sévères')
                    : `Calibration impossible pour ${row.refusedAt} ; ${row.dips} sur ${row.of} avec creux parmi les scénarios précédents`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Couverture par défaut (3 / 10 jours), durée des pannes</th>
              <th className="text-left px-3 py-2 font-semibold">Pannes avec creux d'IP</th>
            </tr>
          </thead>
          <tbody>
            {t.durations.map(row => (
              <tr key={row.range} className="border-t border-gray-100">
                <td className="px-3 py-1.5">{row.range}</td>
                <td className="px-3 py-1.5">{row.dips} sur {row.of}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Mesures figées, produites dans les conditions suivantes : {t.conditions}. Elles valent pour cet échantillon (une graine) et ne se transposent pas telles quelles à un autre réseau : refaire un petit lot d'essai pour votre réseau avant une étude.
      </p>
    </div>
  );
};

// Affichage d'un refus de plan. Une erreur sans détail structuré garde
// exactement l'affichage d'origine (bandeau rouge d'une ligne).
export const PlanErrorNotice: React.FC<{ view: PlanErrorView; onOpenTemporalSettings?: () => void }> = ({ view, onOpenTemporalSettings }) => {
  if (view.kind === 'other') {
    return (
      <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2">
        <AlertCircle size={18} /> {view.message}
      </div>
    );
  }
  return (
    <div className="mt-3 p-4 bg-red-50 border border-red-300 rounded-lg text-sm text-red-900 space-y-2" role="alert">
      <div className="flex items-center gap-2 font-bold"><AlertCircle size={18} className="shrink-0" /> {view.title}</div>
      {view.details && (
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          {view.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
      {view.remedy && <p className="text-xs font-semibold">Remède : {view.remedy}</p>}
      {onOpenTemporalSettings && (
        <button type="button" onClick={onOpenTemporalSettings}
          className="px-3 py-1.5 bg-white hover:bg-red-100 text-red-800 rounded-md text-xs font-semibold border border-red-300 flex items-center gap-1.5">
          <Settings size={13} /> Ouvrir les réglages du mode temporel
        </button>
      )}
    </div>
  );
};
