// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : gestionnaire simulé (3 profils) et simulation
// d'une branche complète (aucune décision / réactif / prudent / tardif).
// Les seuils, délais et ordre d'escalade de chaque profil viennent de
// ModelParams.profiles — aucune constante figée ici.
// ============================================================================

import {
  NetworkInstance, Disruption, DisruptionType, ManagerProfileDef, BranchId,
  IpPoint, AppliedDecision, BranchSummary, DailyState, ModelParams,
} from './bloc1Types';
import { buildDailyState, maxFlow, observeIp, flowOptionsFromParams } from './bloc1Network';
import { DECISION_BY_ID } from './bloc1Decisions';
import { TemporalModel, TemporalState, cloneTemporalState, stepTemporalDay, applyTemporalStockDecision } from './bloc1Temporal';

// Mode temporel (palier 2) : modèle du scénario et état de départ commun aux
// 4 branches (après pré-chauffe). Absent = moteur du palier 1, inchangé.
export interface BranchTemporal {
  model: TemporalModel;
  start: TemporalState;
}

// Décisions dont l'effet est réellement pertinent pour chaque nature de
// perturbation (une décision hors de cette liste serait un no-op sur le
// réseau pour cette nature-là, donc elle n'est jamais choisie).
const APPLICABLE_DECISIONS: Record<DisruptionType, string[]> = {
  panne_fournisseur: ['D3', 'D1', 'D6', 'D7', 'D5', 'D8', 'D9'],
  coupure_lien: ['D4', 'D1', 'D2', 'D6', 'D7', 'D5', 'D8', 'D9'],
  fermeture_entrepot: ['D2', 'D4', 'D5', 'D6', 'D8', 'D9'],
  pic_demande: ['D8', 'D9', 'D5', 'D6'],
  congestion: ['D5', 'D1', 'D2', 'D7', 'D6', 'D8', 'D9'],
};

const PROFILE_LABELS: Record<'reactif' | 'prudent' | 'tardif', string> = {
  reactif: 'Réactif', prudent: 'Prudent', tardif: 'Tardif',
};

// Construit les 3 profils exécutables à partir des paramètres réglables.
export function buildManagerProfiles(params: ModelParams): ManagerProfileDef[] {
  return (['reactif', 'prudent', 'tardif'] as const).map(id => {
    const p = params.profiles[id];
    return {
      id, label: PROFILE_LABELS[id],
      detectionThreshold: p.detectionThreshold,
      smoothingWindowDays: p.smoothingWindowDays,
      decisionDelayDays: p.decisionDelayDays,
      reevaluationDays: p.reevaluationDays,
      escalationOrder: p.escalationOrder,
    };
  });
}

interface ActiveDecisionInstance {
  decisionId: string;
  appliedOnDayRel: number;
}

export interface BranchResult {
  ipPoints: IpPoint[];
  appliedDecisions: AppliedDecision[];
  summary: BranchSummary;
}

// Simule une branche complète sur tout l'horizon et renvoie la courbe d'IP(t),
// les décisions déclenchées et un résumé de branche. demandNoiseSeries est
// tiré une fois par scénario et partagé par les 4 branches (nombres
// aléatoires communs) pour que la comparaison entre branches reste propre.
export function simulateBranch(
  scenarioId: string,
  branchId: BranchId,
  network: NetworkInstance,
  disruption: Disruption,
  profile: ManagerProfileDef | null,
  warmupDays: number,
  horizonDays: number,
  demandNoiseSeries: number[],
  params: ModelParams,
  temporal?: BranchTemporal
): BranchResult {
  const totalDays = warmupDays + horizonDays;
  const ipPoints: IpPoint[] = [];
  const appliedDecisions: AppliedDecision[] = [];
  const activeDecisions: ActiveDecisionInstance[] = [];

  const effectiveOrder = profile
    ? profile.escalationOrder.filter(id => APPLICABLE_DECISIONS[disruption.type].includes(id))
    : [];

  const flowOptions = flowOptionsFromParams(params);
  const tState = temporal ? cloneTemporalState(temporal.start) : null;

  let detectedDayRel: number | null = null;
  let scheduledDecisionDay: number | null = null;
  let nextReevalDay: number | null = null;
  let nextDecisionIndex = 0;
  const ipWindow: number[] = [];

  for (let day = 0; day < totalDays; day++) {
    const dayRel = day - warmupDays;
    const dayInDisruption = dayRel - disruption.start;
    const noiseFactor = demandNoiseSeries[day] ?? 1;
    const state: DailyState = buildDailyState(network, disruption, dayInDisruption, noiseFactor, params.disruption);

    for (const active of activeDecisions) {
      const def = DECISION_BY_ID[active.decisionId];
      const since = dayRel - active.appliedOnDayRel;
      // Mode temporel : D6 et D7 agissent sur le stock réel (étape 4), plus sur les capacités du jour.
      if (temporal && tState && (def.id === 'D6' || def.id === 'D7')) {
        applyTemporalStockDecision(def.id, temporal.model, tState, network, params, since);
        continue;
      }
      def.apply(state, { network, disruption, day: since, params });
    }

    const deliverable = temporal && tState ? stepTemporalDay(temporal.model, tState, state) : maxFlow(network, state, flowOptions);
    const ip = observeIp(state, deliverable, params.indicators.importantWeight);
    ipPoints.push({ scenario_id: scenarioId, branch_id: branchId, day_rel: dayRel, ip });

    if (profile) {
      ipWindow.push(ip);
      if (ipWindow.length > profile.smoothingWindowDays) ipWindow.shift();
      const smoothed = ipWindow.reduce((s, v) => s + v, 0) / ipWindow.length;

      if (detectedDayRel === null) {
        if (dayRel >= disruption.start && smoothed < profile.detectionThreshold) {
          detectedDayRel = dayRel;
          scheduledDecisionDay = dayRel + profile.decisionDelayDays;
        }
      } else if (nextDecisionIndex < effectiveOrder.length && smoothed < profile.detectionThreshold) {
        const dueDay = nextDecisionIndex === 0 ? scheduledDecisionDay : nextReevalDay;
        if (dueDay !== null && dayRel >= dueDay) {
          const decisionId = effectiveOrder[nextDecisionIndex];
          activeDecisions.push({ decisionId, appliedOnDayRel: dayRel });
          appliedDecisions.push({
            scenario_id: scenarioId, branch_id: branchId, decision_id: decisionId,
            family: DECISION_BY_ID[decisionId].family, day_rel: dayRel,
            detected_day_rel: detectedDayRel,
          });
          nextDecisionIndex += 1;
          nextReevalDay = dayRel + profile.reevaluationDays;
        }
      }
    }
  }

  const summary = summarizeBranch(scenarioId, branchId, ipPoints, appliedDecisions.length, params.indicators.recoveryThreshold);
  return { ipPoints, appliedDecisions, summary };
}

function summarizeBranch(
  scenarioId: string, branchId: BranchId, ipPoints: IpPoint[], nbDecisions: number, recoveryThreshold: number
): BranchSummary {
  let ipMin = Infinity, dayOfMin = 0, areaLost = 0;
  ipPoints.forEach(p => {
    areaLost += Math.max(0, 1 - p.ip);
    if (p.ip < ipMin) { ipMin = p.ip; dayOfMin = p.day_rel; }
  });
  let recoveryDay: number | null = null;
  for (const p of ipPoints) {
    if (p.day_rel >= dayOfMin && p.ip >= recoveryThreshold) { recoveryDay = p.day_rel; break; }
  }
  return {
    scenario_id: scenarioId, branch_id: branchId, ip_min: ipMin, day_of_ip_min: dayOfMin,
    area_lost: areaLost, nb_decisions: nbDecisions, recovery_day: recoveryDay,
  };
}
