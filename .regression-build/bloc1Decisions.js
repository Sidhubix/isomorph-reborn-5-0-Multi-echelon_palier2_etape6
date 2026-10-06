"use strict";
// ============================================================================
// ISOMORPH-Reborn — Bloc 1 : catalogue des 9 décisions (D1-D9), en 4 familles.
// Chaque décision agit sur l'état journalier (DailyState) déjà dégradé par la
// perturbation active. Toutes les ampleurs d'effet viennent de
// ctx.params.decisions (voir bloc1DefaultParams.ts) — aucune constante figée.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECISION_BY_ID = exports.DECISIONS = void 0;
const bloc1Network_1 = require("./bloc1Network");
const clampNonNeg = (x) => Math.max(0, x);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
// Réseau générique (palier 1) : les décisions « usine » (D1, D3, D7) portent
// sur le groupe production (usines et fournisseurs de capacité finie), les
// décisions « entrepôt » (D2, D4, D5, D6) sur le groupe stockage (entrepôts et
// hubs), via la capacité d'expédition au sens de la règle Q16 (voir
// bloc1Network.ts). Sur le réseau paramétrique, ces groupes sont exactement
// les anciennes listes d'usines et d'entrepôts.
exports.DECISIONS = [
    // ---- Famille "reroutage" : redirection des flux vers une ressource saine ----
    {
        id: 'D1',
        family: 'reroutage',
        label: 'Réaffectation vers une usine de secours',
        description: "Redirige une partie de la charge de l'usine ou du lien touché vers les autres usines du réseau, en relevant temporairement leur capacité de production.",
        apply: (state, ctx) => {
            const affected = ctx.disruption.targetFactory;
            const boost = 1 + ctx.params.decisions.d1_factoryBoostPct;
            (0, bloc1Network_1.getNetworkGroups)(ctx.network).productionFinite.forEach(fid => {
                if (fid !== affected && hasOwn(state.nodeCapacity, fid))
                    state.nodeCapacity[fid] *= boost;
            });
        },
    },
    {
        id: 'D2',
        family: 'reroutage',
        label: 'Réaffectation vers un entrepôt de secours',
        description: "Bascule une partie de la desserte de l'entrepôt ou du lien touché vers les entrepôts voisins, en relevant leur capacité d'expédition.",
        apply: (state, ctx) => {
            const affected = ctx.disruption.targetWarehouse;
            const boost = 1 + ctx.params.decisions.d2_warehouseBoostPct;
            const groups = (0, bloc1Network_1.getNetworkGroups)(ctx.network);
            groups.storage.forEach(wid => {
                if (wid !== affected)
                    (0, bloc1Network_1.scaleStorageShipping)(state, groups, wid, boost);
            });
        },
    },
    // ---- Famille "capacite" : mobilisation de capacité supplémentaire ----
    {
        id: 'D3',
        family: 'capacite',
        label: 'Heures supplémentaires en production',
        description: "Restaure une partie de la capacité perdue à l'usine touchée par une décision de production en heures supplémentaires.",
        apply: (state, ctx) => {
            const affected = ctx.disruption.targetFactory;
            if (affected && hasOwn(state.nodeCapacity, affected)) {
                const nominal = (0, bloc1Network_1.getNetworkGroups)(ctx.network).nominalNode.get(affected) ?? 0;
                const lost = clampNonNeg(nominal - state.nodeCapacity[affected]);
                state.nodeCapacity[affected] += ctx.params.decisions.d3_recoveryFraction * lost;
            }
        },
    },
    {
        id: 'D4',
        family: 'capacite',
        label: "Transporteur d'appoint",
        description: "Affrète un transporteur supplémentaire sur le lien ou l'entrepôt touché, restaurant une partie de la capacité de transport perdue.",
        apply: (state, ctx) => {
            const frac = ctx.params.decisions.d4_recoveryFraction;
            const groups = (0, bloc1Network_1.getNetworkGroups)(ctx.network);
            if (ctx.disruption.targetEdge) {
                const key = `${ctx.disruption.targetEdge.from}|${ctx.disruption.targetEdge.to}`;
                const nominalEdge = groups.nominalArc.get(key);
                if (nominalEdge !== undefined && key in state.edgeCapacity) {
                    const lost = clampNonNeg(nominalEdge - state.edgeCapacity[key]);
                    state.edgeCapacity[key] += frac * lost;
                }
            }
            if (ctx.disruption.targetWarehouse) {
                (0, bloc1Network_1.restoreStorageShipping)(state, groups, ctx.disruption.targetWarehouse, frac);
            }
        },
    },
    {
        id: 'D5',
        family: 'capacite',
        label: 'Entrepôt tampon supplémentaire',
        description: "Active un entrepôt tampon qui relève la capacité d'expédition de tous les entrepôts du réseau (effet global, plus lent à organiser).",
        apply: (state, ctx) => {
            const boost = 1 + ctx.params.decisions.d5_globalBoostPct;
            const groups = (0, bloc1Network_1.getNetworkGroups)(ctx.network);
            groups.storage.forEach(wid => { (0, bloc1Network_1.scaleStorageShipping)(state, groups, wid, boost); });
        },
    },
    // ---- Famille "stock" : mobilisation de stock existant ----
    {
        id: 'D6',
        family: 'stock',
        label: 'Déstockage du stock de sécurité',
        description: "Puise dans le stock de sécurité pour compenser la perte de débit : ajoute un volume forfaitaire, décroissant avec le temps depuis la décision.",
        apply: (state, ctx) => {
            const p = ctx.params.decisions;
            const daysSinceDecision = Math.max(0, ctx.day);
            const decay = Math.max(0, 1 - daysSinceDecision / p.d6_depletionDays);
            const boost = p.d6_stockBoostShareOfDemand * ctx.network.baseDemand * decay;
            const groups = (0, bloc1Network_1.getNetworkGroups)(ctx.network);
            const ids = groups.storage;
            ids.forEach(wid => { (0, bloc1Network_1.addToStorageShipping)(state, groups, wid, boost / ids.length); });
        },
    },
    {
        id: 'D7',
        family: 'stock',
        label: 'Pré-positionnement anticipé',
        description: "Constitue un stock avancé près du client, réduisant l'effet net de toute perte de capacité de production ou de transport.",
        apply: (state, ctx) => {
            const frac = ctx.params.decisions.d7_recoveryFraction;
            const groups = (0, bloc1Network_1.getNetworkGroups)(ctx.network);
            groups.productionFinite.forEach(fid => {
                if (!hasOwn(state.nodeCapacity, fid))
                    return;
                const nominal = groups.nominalNode.get(fid) ?? 0;
                const lost = clampNonNeg(nominal - state.nodeCapacity[fid]);
                state.nodeCapacity[fid] += frac * lost;
            });
            Object.keys(state.edgeCapacity).forEach(key => {
                const nominalEdge = groups.nominalArc.get(key);
                if (nominalEdge !== undefined) {
                    const lost = clampNonNeg(nominalEdge - state.edgeCapacity[key]);
                    state.edgeCapacity[key] += frac * lost;
                }
            });
        },
    },
    // ---- Famille "demande" : pilotage de la demande plutôt que de l'offre ----
    {
        id: 'D8',
        family: 'demande',
        label: 'Priorisation des références critiques',
        description: "Concentre le débit disponible sur les articles importants en réduisant la demande d'articles non critiques servie ce jour-là.",
        apply: (state, ctx) => {
            const cutPct = ctx.params.decisions.d8_regularDemandCutPct;
            const importantDemand = state.demand * state.importantShare;
            const regularDemand = state.demand - importantDemand;
            const reducedRegular = regularDemand * (1 - cutPct);
            state.demand = importantDemand + reducedRegular;
            state.importantShare = state.demand > 0 ? importantDemand / state.demand : state.importantShare;
        },
    },
    {
        id: 'D9',
        family: 'demande',
        label: 'Report différé de la demande non critique',
        description: "Reporte une partie de la demande non critique du jour, qui n'est donc plus comptée dans l'IP du jour (traitée hors-fenêtre, une fois le réseau rétabli).",
        apply: (state, ctx) => {
            const deferPct = ctx.params.decisions.d9_regularDemandDeferPct;
            const importantDemand = state.demand * state.importantShare;
            const regularDemand = state.demand - importantDemand;
            const deferredRegular = regularDemand * deferPct;
            state.demand = state.demand - deferredRegular;
            state.importantShare = state.demand > 0 ? importantDemand / state.demand : state.importantShare;
        },
    },
];
exports.DECISION_BY_ID = Object.fromEntries(exports.DECISIONS.map(d => [d.id, d]));
