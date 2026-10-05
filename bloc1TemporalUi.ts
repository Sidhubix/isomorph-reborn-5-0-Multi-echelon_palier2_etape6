// ============================================================================
// ISOMORPH-Reborn — Mode temporel : contenu et logique d'interface (palier 2,
// étape 5). Pur, sans React, donc testable hors navigateur.
//   - tableau de sensibilité de la couverture de stock ;
//   - avertissement de couverture inférieure aux valeurs mesurées ;
//   - description structurée des erreurs de plan (calibration impossible,
//     réglages invalides) pour un affichage clair à l'utilisateur.
// ============================================================================

import { TemporalParams } from './bloc1Types';
import { PlanCalibrationError, TemporalSettingsError } from './bloc1ExperimentPlan';

// Tableau de sensibilité. Ce sont des MESURES, pas des règles : elles ont été
// produites par simulation (mêmes conditions pour toutes les lignes) et sont
// figées ici ; le jeu de tests les rejoue et échoue si elles dérivent.
export const TEMPORAL_SENSITIVITY = {
  conditions: "ISOMORPH prédéfini (délais du fichier, réglages par défaut), pannes fournisseur de 3 à 15 jours, graine 42, branche sans décision, 60 scénarios",
  baseline: { label: 'Palier 1 (mode temporel désactivé)', dips: 34, of: 60 },
  coverage: [
    { s: 3, S: 10, label: '3 / 10 jours (défaut)', status: 'ok' as const, dips: 0, of: 60 },
    { s: 2, S: 5, label: '2 / 5 jours', status: 'ok' as const, dips: 1, of: 60 },
    { s: 1, S: 3, label: '1 / 3 jours', status: 'ok' as const, dips: 5, of: 60 },
    // Couverture trop faible : le plan est refusé au premier scénario non calibrable (Q14 A).
    { s: 0.5, S: 1.5, label: '0,5 / 1,5 jour', status: 'refused' as const, refusedAt: 'S0049', dips: 14, of: 48 },
  ],
  // Couverture par défaut (3 / 10 jours), durées de panne allongées.
  durations: [
    { range: '3 à 15 jours (plage par défaut)', dips: 0, of: 60 },
    { range: '15 à 30 jours', dips: 4, of: 60 },
    { range: '30 à 60 jours', dips: 12, of: 60 },
  ],
};

// Plus petite couverture mesurée sans refus : en dessous, la calibration peut
// devenir impossible pour certains scénarios (voir le tableau).
export const TEMPORAL_LOWEST_MEASURED_OK = { s: 1, S: 3 };

// Avertissement (non bloquant) quand la couverture choisie est inférieure aux
// couvertures mesurées sans refus. Null si tout va bien.
export function temporalCoverageWarning(t: TemporalParams): string | null {
  if (!t.enabled) return null;
  if (t.orderUpToDays < TEMPORAL_LOWEST_MEASURED_OK.S || t.reorderPointDays < TEMPORAL_LOWEST_MEASURED_OK.s) {
    return `Couverture inférieure à la plus faible mesurée sans refus (${TEMPORAL_LOWEST_MEASURED_OK.s} / ${TEMPORAL_LOWEST_MEASURED_OK.S} jours) : le plan risque d'être refusé si un scénario ne peut pas être calibré (voir le tableau de sensibilité).`;
  }
  return null;
}

export type PlanErrorKind = 'calibration' | 'settings' | 'other';
export interface PlanErrorView {
  kind: PlanErrorKind;
  title: string;
  message: string;
  scenarioId?: string;
  details?: string[];   // faits chiffrés, un par ligne
  remedy?: string;
}

// Décrit une erreur de plan pour l'affichage. Toute erreur inconnue garde son
// message tel quel (comportement d'origine).
export function describePlanError(err: unknown): PlanErrorView {
  if (err instanceof PlanCalibrationError) {
    const d = err.details;
    return {
      kind: 'calibration',
      title: 'Plan refusé : calibration de la demande impossible avec cette couverture de stock',
      message: err.message,
      scenarioId: err.scenarioId,
      details: [
        `Scénario en cause : ${err.scenarioId} (les scénarios précédents ont été calibrés).`,
        `Couverture demandée : s = ${d.reorderPointDays} jour(s), S = ${d.orderUpToDays} jour(s).`,
        `Bruit de demande du scénario : ${d.noisePct.toFixed(1)} %. Délai d'approvisionnement : jusqu'à ${d.leadDays} jour(s).`,
        `Aucun niveau de demande n'est servi intégralement pendant la chauffe : l'IP ne pourrait pas rester à 1 avant la perturbation.`,
      ],
      remedy: `Augmentez les jours de couverture s et S (section « Mode temporel » des hypothèses). Le tableau de sensibilité indique les couvertures mesurées sans refus : à partir de ${TEMPORAL_LOWEST_MEASURED_OK.s} / ${TEMPORAL_LOWEST_MEASURED_OK.S} jours sur ISOMORPH.`,
    };
  }
  if (err instanceof TemporalSettingsError) {
    return {
      kind: 'settings',
      title: 'Plan refusé : réglages du mode temporel invalides',
      message: err.message,
      details: err.problems,
      remedy: 'Corrigez ces réglages dans la section « Mode temporel » des hypothèses.',
    };
  }
  const message = err instanceof Error && err.message ? err.message : "Erreur pendant la génération du plan d'expériences";
  return { kind: 'other', title: '', message };
}
