"use strict";
// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : gestionnaire simulé (3 profils) et simulation
// d'une branche complète (aucune décision / réactif / prudent / tardif).
// Les seuils, délais et ordre d'escalade de chaque profil viennent de
// ModelParams.profiles — aucune constante figée ici.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildManagerProfiles = buildManagerProfiles;
exports.simulateBranch = simulateBranch;
const bloc1Network_1 = require("./bloc1Network");
const bloc1Decisions_1 = require("./bloc1Decisions");
const bloc1Temporal_1 = require("./bloc1Temporal");
// Décisions dont l'effet est réellement pertinent pour chaque nature de
// perturbation (une décision hors de cette liste serait un no-op sur le
// réseau pour cette nature-là, donc elle n'est jamais choisie).
const APPLICABLE_DECISIONS = {
    panne_fournisseur: ['D3', 'D1', 'D6', 'D7', 'D5', 'D8', 'D9'],
    coupure_lien: ['D4', 'D1', 'D2', 'D6', 'D7', 'D5', 'D8', 'D9'],
    fermeture_entrepot: ['D2', 'D4', 'D5', 'D6', 'D8', 'D9'],
    pic_demande: ['D8', 'D9', 'D5', 'D6'],
    congestion: ['D5', 'D1', 'D2', 'D7', 'D6', 'D8', 'D9'],
};
const PROFILE_LABELS = {
    reactif: 'Réactif', prudent: 'Prudent', tardif: 'Tardif',
};
// Construit les 3 profils exécutables à partir des paramètres réglables.
function buildManagerProfiles(params) {
    return ['reactif', 'prudent', 'tardif'].map(id => {
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
// Simule une branche complète sur tout l'horizon et renvoie la courbe d'IP(t),
// les décisions déclenchées et un résumé de branche. demandNoiseSeries est
// tiré une fois par scénario et partagé par les 4 branches (nombres
// aléatoires communs) pour que la comparaison entre branches reste propre.
function simulateBranch(scenarioId, branchId, network, disruption, profile, warmupDays, horizonDays, demandNoiseSeries, params, temporal) {
    const totalDays = warmupDays + horizonDays;
    const ipPoints = [];
    const appliedDecisions = [];
    const activeDecisions = [];
    const effectiveOrder = profile
        ? profile.escalationOrder.filter(id => APPLICABLE_DECISIONS[disruption.type].includes(id))
        : [];
    const flowOptions = (0, bloc1Network_1.flowOptionsFromParams)(params);
    const tState = temporal ? (0, bloc1Temporal_1.cloneTemporalState)(temporal.start) : null;
    let detectedDayRel = null;
    let scheduledDecisionDay = null;
    let nextReevalDay = null;
    let nextDecisionIndex = 0;
    const ipWindow = [];
    for (let day = 0; day < totalDays; day++) {
        const dayRel = day - warmupDays;
        const dayInDisruption = dayRel - disruption.start;
        const noiseFactor = demandNoiseSeries[day] ?? 1;
        const state = (0, bloc1Network_1.buildDailyState)(network, disruption, dayInDisruption, noiseFactor, params.disruption);
        for (const active of activeDecisions) {
            const def = bloc1Decisions_1.DECISION_BY_ID[active.decisionId];
            const since = dayRel - active.appliedOnDayRel;
            // Mode temporel : D6 et D7 agissent sur le stock réel (étape 4), plus sur les capacités du jour.
            if (temporal && tState && (def.id === 'D6' || def.id === 'D7')) {
                (0, bloc1Temporal_1.applyTemporalStockDecision)(def.id, temporal.model, tState, network, params, since);
                continue;
            }
            def.apply(state, { network, disruption, day: since, params });
        }
        const deliverable = temporal && tState ? (0, bloc1Temporal_1.stepTemporalDay)(temporal.model, tState, state) : (0, bloc1Network_1.maxFlow)(network, state, flowOptions);
        const ip = (0, bloc1Network_1.observeIp)(state, deliverable, params.indicators.importantWeight);
        ipPoints.push({ scenario_id: scenarioId, branch_id: branchId, day_rel: dayRel, ip });
        if (profile) {
            ipWindow.push(ip);
            if (ipWindow.length > profile.smoothingWindowDays)
                ipWindow.shift();
            const smoothed = ipWindow.reduce((s, v) => s + v, 0) / ipWindow.length;
            if (detectedDayRel === null) {
                if (dayRel >= disruption.start && smoothed < profile.detectionThreshold) {
                    detectedDayRel = dayRel;
                    scheduledDecisionDay = dayRel + profile.decisionDelayDays;
                }
            }
            else if (nextDecisionIndex < effectiveOrder.length && smoothed < profile.detectionThreshold) {
                const dueDay = nextDecisionIndex === 0 ? scheduledDecisionDay : nextReevalDay;
                if (dueDay !== null && dayRel >= dueDay) {
                    const decisionId = effectiveOrder[nextDecisionIndex];
                    activeDecisions.push({ decisionId, appliedOnDayRel: dayRel });
                    appliedDecisions.push({
                        scenario_id: scenarioId, branch_id: branchId, decision_id: decisionId,
                        family: bloc1Decisions_1.DECISION_BY_ID[decisionId].family, day_rel: dayRel,
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
function summarizeBranch(scenarioId, branchId, ipPoints, nbDecisions, recoveryThreshold) {
    let ipMin = Infinity, dayOfMin = 0, areaLost = 0;
    ipPoints.forEach(p => {
        areaLost += Math.max(0, 1 - p.ip);
        if (p.ip < ipMin) {
            ipMin = p.ip;
            dayOfMin = p.day_rel;
        }
    });
    let recoveryDay = null;
    for (const p of ipPoints) {
        if (p.day_rel >= dayOfMin && p.ip >= recoveryThreshold) {
            recoveryDay = p.day_rel;
            break;
        }
    }
    return {
        scenario_id: scenarioId, branch_id: branchId, ip_min: ipMin, day_of_ip_min: dayOfMin,
        area_lost: areaLost, nb_decisions: nbDecisions, recovery_day: recoveryDay,
    };
}
