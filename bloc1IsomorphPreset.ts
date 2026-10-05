// ============================================================================
// ISOMORPH-Reborn — Réseau prédéfini ISOMORPH d'origine (palier 1, étape 4).
//
// Construit à partir de networks/isomorph_reseau_originel.json (données du
// simulateur tuhinsahai/ISOMORPH, Supplychaingeo_item50.py), selon les
// décisions de la note de conception :
//   Q11 B : capacité d'un arc = volume d'un conteneur x conteneurs par jour,
//           en plage de plus ou moins arcRangePct (10 % par défaut) ;
//   Q12 B : dernier kilomètre (arcs vers le client) illimité par défaut,
//           valeur fixe réglable (lastMileCapacity) ;
//   Q13 A + Q17 B : capacité d'une source = somme des capacités nominales de
//           ses arcs sortants x sourceFactor (0,8 par défaut). Hypothèse : à
//           1,0, la capacité d'une source égale celle de son unique arc sortant
//           et D1 (relèvement des autres usines) resterait sans effet ;
//   Q14 A : sources = usines, Nashville (tier hub) = hub, autres nœuds
//           intermédiaires = entrepôts, New York = client.
// Nœuds intermédiaires sans capacité propre (ISOMORPH n'en définit pas) : la
// règle Q16 s'applique à leurs arcs sortants.
// Les délais de trajet sont conservés (travel_time_days, réservé au palier 2).
// Toutes les valeurs numériques posées par hypothèse sont dans
// ISOMORPH_PRESET_DEFAULTS et réglables (exposition dans l'interface : étape 5).
// ============================================================================

import isomorphOriginal from './networks/isomorph_reseau_originel.json';
import { NetworkDocument, NetworkDocNode, NetworkDocEdge, NETWORK_FORMAT, NETWORK_FORMAT_VERSION } from './bloc1NetworkFormat';
import { NetworkNodeType } from './bloc1Types';

export interface IsomorphPresetOptions {
  arcRangePct: number;             // demi-largeur relative de la plage des arcs (0,10 = plus ou moins 10 %)
  sourceFactor: number;            // facteur sur la capacité des sources
  lastMileCapacity: number | null; // capacité fixe des arcs vers le client ; null = illimitée
}

export const ISOMORPH_PRESET_DEFAULTS: IsomorphPresetOptions = {
  arcRangePct: 0.10,
  sourceFactor: 0.8,
  lastMileCapacity: null,
};

interface OriginalNode { id: string; tier: string; }
interface OriginalEdge { from: string; to: string; travel_time_days: number; container_volume: number; containers_per_day: number; }
interface OriginalNetwork { name: string; source: string; description: string; nodes: OriginalNode[]; edges: OriginalEdge[]; }

const TIER_TO_TYPE: Record<string, NetworkNodeType> = {
  src: 'usine', hub: 'hub', t2: 'entrepot', t3: 'entrepot', t4: 'entrepot', t5: 'entrepot', dest: 'client',
};

export function buildIsomorphPreset(options: Partial<IsomorphPresetOptions> = {}): NetworkDocument {
  const opt: IsomorphPresetOptions = { ...ISOMORPH_PRESET_DEFAULTS, ...options };
  if (!(opt.arcRangePct >= 0 && opt.arcRangePct < 1)) throw new Error('arcRangePct doit être compris entre 0 (inclus) et 1 (exclu).');
  if (!(opt.sourceFactor > 0)) throw new Error('sourceFactor doit être strictement positif.');
  if (opt.lastMileCapacity !== null && !(opt.lastMileCapacity > 0)) throw new Error('lastMileCapacity doit être positive ou null (illimitée).');

  const data = isomorphOriginal as unknown as OriginalNetwork;
  const typeOf = new Map<string, NetworkNodeType>();
  data.nodes.forEach(n => {
    const t = TIER_TO_TYPE[n.tier];
    if (!t) throw new Error(`Tier ISOMORPH inconnu : ${n.tier} (nœud ${n.id}).`);
    typeOf.set(n.id, t);
  });

  const nominal = (e: OriginalEdge) => e.container_volume * e.containers_per_day;
  const round = (x: number) => Math.round(x * 1e6) / 1e6; // évite les artefacts d'arrondi binaire dans le fichier

  const edges: NetworkDocEdge[] = data.edges.map(e => {
    const lastMile = typeOf.get(e.to) === 'client';
    const v = nominal(e);
    const capacity: NetworkDocEdge['capacity'] = lastMile
      ? opt.lastMileCapacity
      : (opt.arcRangePct === 0 ? v : [round(v * (1 - opt.arcRangePct)), round(v * (1 + opt.arcRangePct))]);
    return {
      from: e.from, to: e.to, capacity,
      travel_time_days: e.travel_time_days,
      container_volume: e.container_volume,
      containers_per_day: e.containers_per_day,
    };
  });

  const nodes: NetworkDocNode[] = data.nodes.map(n => {
    const type = typeOf.get(n.id)!;
    if (type === 'client') return { id: n.id, type, name: n.id };
    if (type === 'usine') {
      const outSum = data.edges.filter(e => e.from === n.id).reduce((s, e) => s + nominal(e), 0);
      return { id: n.id, type, name: n.id, capacity: round(outSum * opt.sourceFactor) };
    }
    return { id: n.id, type, name: n.id, capacity: null };
  });

  return {
    format: NETWORK_FORMAT,
    format_version: NETWORK_FORMAT_VERSION,
    id: 'isomorph-originel',
    name: "Réseau ISOMORPH d'origine (13 villes, 16 arcs)",
    description: `Réseau ISOMORPH d'origine. Arcs : volume d'un conteneur x conteneurs par jour, plage de plus ou moins ${opt.arcRangePct * 100} %. Sources : somme de leurs arcs sortants x ${opt.sourceFactor}. Dernier kilomètre : ${opt.lastMileCapacity === null ? 'illimité' : `${opt.lastMileCapacity} unités par jour`}.`,
    source: data.source,
    provenance: { kind: 'preset', preset: 'isomorph-originel', options: { ...opt } },
    nodes,
    edges,
  };
}

// Capacité du dernier kilomètre dans le fichier d'origine (volume d'un
// conteneur x conteneurs par jour des arcs vers le client, valeur provisoire du
// simulateur). Sert de valeur de départ quand on limite le dernier kilomètre
// dans l'interface : aucune valeur n'est inventée.
export function originalLastMileCapacity(): number {
  const data = isomorphOriginal as unknown as OriginalNetwork;
  const clientIds = new Set(data.nodes.filter(n => TIER_TO_TYPE[n.tier] === 'client').map(n => n.id));
  const arc = data.edges.find(e => clientIds.has(e.to));
  if (!arc) throw new Error('Aucun arc vers le client dans le fichier ISOMORPH d\'origine.');
  return arc.container_volume * arc.containers_per_day;
}
