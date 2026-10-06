"use strict";
// ============================================================================
// ISOMORPH-Reborn — Dictionnaire exhaustif des explications et impacts de tous
// les paramètres du Générateur de scénarios (Bloc 1).
// Utilisé pour l'onglet "Comprendre le modèle" et le système d'infobulles
// interactives au survol avec la touche Shift.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PARAM_DESCRIPTIONS = void 0;
exports.MODEL_PARAM_DESCRIPTIONS = {
    // --- GÉNÉRATION DU RÉSEAU ---
    'network.nFactories': {
        title: "Nombre d'usines",
        category: "1. Génération du réseau",
        explanation: "Fixe le nombre de sites de production amont dans le réseau logistique simulé (par défaut 3). Chaque usine fabrique les produits finis pour alimenter les entrepôts.",
        impact: "Un nombre plus élevé d'usines accroît la taille et la redondance globale du réseau : les flux peuvent être répartis sur plus de nœuds et la défaillance d'un site unique est plus facile à compenser.",
        defaultVal: "3",
        unit: "sites"
    },
    'network.nWarehouses': {
        title: "Nombre d'entrepôts",
        category: "1. Génération du réseau",
        explanation: "Fixe le nombre de sites de stockage et d'expédition intermédiaires (par défaut 9) reliés aux usines et expédiant vers le client New York.",
        impact: "Augmenter le nombre d'entrepôts multiplie les options de réaffectation et de stockage intermédiaire, réduisant la vulnérabilité à la fermeture d'un site isolé.",
        defaultVal: "9",
        unit: "sites"
    },
    'network.factoryCapacity': {
        title: "Capacité usine (min et max)",
        category: "1. Génération du réseau",
        explanation: "Une usine ne peut produire qu'un certain volume par jour. Ce paramètre fixe la fourchette [min, max] dans laquelle la capacité nominale est tirée au hasard pour chaque usine du scénario.",
        impact: "Plus la capacité est élevée, plus le réseau dispose de marge de production avant qu'une panne ne devienne critique pour l'approvisionnement du client.",
        defaultVal: "200 - 320",
        unit: "unités / jour"
    },
    'network.primaryEdgeCapacity': {
        title: "Capacité lien primaire (min et max)",
        category: "1. Génération du réseau",
        explanation: "La voie principale d'approvisionnement reliant chaque entrepôt à son usine de rattachement prioritaire. C'est la plus large des voies de transport.",
        impact: "Plus la capacité du lien primaire est importante par rapport aux secours, plus sa coupure brutale sera difficile à absorber par les voies secondaires.",
        defaultVal: "60 - 110",
        unit: "unités / jour"
    },
    'network.secondaryEdgeCapacity': {
        title: "Capacité lien secondaire (min et max)",
        category: "1. Génération du réseau",
        explanation: "Voie de secours partielle reliant l'entrepôt à une usine voisine, plus étroite que le lien primaire.",
        impact: "Une capacité secondaire plus forte offre un filet de sécurité immédiat en cas de panne de l'usine principale ou de coupure du lien principal.",
        defaultVal: "15 - 35",
        unit: "unités / jour"
    },
    'network.tertiaryEdgeCapacity': {
        title: "Capacité lien tertiaire (min et max)",
        category: "1. Génération du réseau",
        explanation: "Troisième voie de transport de secours, encore plus étroite, présente sur certains entrepôts du réseau.",
        impact: "Apporte une résilience additionnelle sur certains nœuds stratégiques en cas de perturbation multifactorielle.",
        defaultVal: "10 - 20",
        unit: "unités / jour"
    },
    'network.warehouseShipCapacity': {
        title: "Capacité expédition entrepôt (min et max)",
        category: "1. Génération du réseau",
        explanation: "Un entrepôt ne peut réexpédier vers le client qu'un certain volume par jour, quelle que soit la quantité qu'il a reçue de ses usines.",
        impact: "C'est souvent ce goulot d'étranglement final, plutôt que la production en usine elle-même, qui détermine si le client est bien servi.",
        defaultVal: "50 - 100",
        unit: "unités / jour"
    },
    'network.importantShare': {
        title: "Part d'articles importants (min et max)",
        category: "1. Génération du réseau",
        explanation: "Fraction de la demande du client concernant des articles jugés critiques (prioritaires, comptant triple dans le calcul de l'indice IP).",
        impact: "Plus cette part est élevée, plus une petite rupture de service sur ces références pèse lourdement sur la dégradation de l'indice IP global.",
        defaultVal: "0.15 - 0.45 (15% à 45%)",
        unit: "fraction"
    },
    'network.demandNoise': {
        title: "Bruit journalier sur la demande (min et max)",
        category: "1. Génération du réseau",
        explanation: "Fluctuation aléatoire quotidienne de la demande du client autour de sa moyenne de référence, même en l'absence de perturbation.",
        impact: "Une valeur plus élevée rend les courbes d'IP plus bruitées et réalistes, mais rend aussi la détection précoce plus délicate pour le gestionnaire.",
        defaultVal: "0.03 - 0.08 (±3% à ±8%)",
        unit: "fraction"
    },
    // --- SÉVÉRITÉ ET DURÉE DES PERTURBATIONS ---
    'disruption.severity': {
        title: "Sévérité générale (panne, congestion, pic)",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Intensité de la dégradation pour les perturbations continues (panne partielle d'usine, congestion générale, pic de demande), de 0 (aucun effet) à 1 (perte quasi totale).",
        impact: "Une sévérité plus élevée creuse plus profondément la courbe d'IP (profondeur h augmentée).",
        defaultVal: "0.50 - 1.00",
        unit: "taux [0-1]"
    },
    'disruption.binarySeverity': {
        title: "Sévérité binaire (coupure, fermeture)",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Plage de sévérité réservée aux ruptures nettes (coupure d'un lien de transport ou fermeture complète d'un entrepôt).",
        impact: "Tirée dans une fourchette plus haute (0.80 à 1.00) pour modéliser des arrêts brutaux et quasi-totaux de l'infrastructure touchée.",
        defaultVal: "0.80 - 1.00",
        unit: "taux [0-1]"
    },
    'disruption.duration': {
        title: "Durée de la perturbation (min et max)",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Nombre de jours pendant lesquels la perturbation reste active avant que les capacités physiques ne reviennent à la normale.",
        impact: "Une durée plus longue laisse plus de temps au gestionnaire pour réagir, mais use davantage les ressources de secours (stocks de sécurité, capacités tampons).",
        defaultVal: "3 - 15",
        unit: "jours"
    },
    'disruption.picDemandeAmplification': {
        title: "Amplification du pic de demande à sévérité=1",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Multiplicateur de la demande lors d'un choc de type pic de demande à sévérité maximale : Demande = Base × (1 + s × facteur).",
        impact: "Par défaut à 2.0 (la demande est triplée à s=1), ce qui sature violemment le réseau sans endommager physiquement les capacités.",
        defaultVal: "2.0 (soit x3 à s=1)",
        unit: "multiplicateur"
    },
    'disruption.coupureLienWarehouseFriction': {
        title: "Coupure lien : friction sur l'entrepôt desservi",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Dégradation transitoire de la capacité d'expédition propre à l'entrepôt dont le lien principal vient d'être coupé, due à la désorganisation logistique.",
        impact: "Une valeur plus haute modélise une réorganisation d'urgence difficile sur le quai de déchargement.",
        defaultVal: "0.70 (70% de friction)",
        unit: "fraction"
    },
    'disruption.coupureLienOtherEdgesFriction': {
        title: "Coupure lien : friction sur les autres liens",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Perte résiduelle de capacité sur les liens de secours de l'entrepôt touché lorsqu'ils sont sur-sollicités en urgence.",
        impact: "Reflète l'encombrement et la friction induite sur les routes alternatives.",
        defaultVal: "0.30 (30% de friction)",
        unit: "fraction"
    },
    'disruption.coupureLienPrimaryProb': {
        title: "Coupure lien : probabilité de cibler le lien principal",
        category: "2. Sévérité et durée des perturbations",
        explanation: "Probabilité que la coupure aléatoire cible le lien principal (qui achemine l'essentiel du flux) plutôt qu'un lien secondaire.",
        impact: "Plus cette probabilité est forte (75% par défaut), plus les coupures de lien provoquent des ruptures visibles sur l'IP.",
        defaultVal: "0.75 (75%)",
        unit: "probabilité"
    },
    // --- CALIBRATION DE LA DEMANDE ---
    'demand.utilization': {
        title: "Rapport demande sur débit disponible pendant l'incident",
        category: "3. Calibration de la demande de référence",
        explanation: "Compare la demande du client au débit maximal que le réseau dégradé peut encore livrer le premier jour de l'incident.",
        impact: "À 1.0, la demande égale tout juste le débit dégradé (creux net sans rupture totale). < 1 : creux léger. > 1 : pénurie franche et rupture brutale.",
        defaultVal: "0.85 - 1.15",
        unit: "ratio"
    },
    'demand.warmupSafetyMargin': {
        title: "Marge de sécurité pendant le warm-up",
        category: "3. Calibration de la demande de référence",
        explanation: "Plafond maximal imposé à la demande pour garantir que l'IP reste strictement égal à 1 pendant la période calme (warm-up).",
        impact: "Absorbe le pire tirage possible de bruit journalier pour éviter tout faux creux avant le début officiel de la perturbation.",
        defaultVal: "0.995 (99.5%)",
        unit: "ratio"
    },
    // --- EFFETS DES DÉCISIONS D1-D9 ---
    'decisions.d1': {
        title: "D1 — Usine de secours (reroutage)",
        category: "4. Effets des 9 décisions",
        explanation: "Quand une usine est touchée, relève temporairement la capacité de production de toutes les autres usines du réseau.",
        impact: "Compense la perte de production par un report de charge sur les sites restés sains.",
        defaultVal: "+20%",
        unit: "% de hausse"
    },
    'decisions.d2': {
        title: "D2 — Entrepôt de secours (reroutage)",
        category: "4. Effets des 9 décisions",
        explanation: "Quand un entrepôt ou son lien est touché, augmente la capacité d'expédition des autres entrepôts pour absorber le report.",
        impact: "Permet de contourner un quai bloqué en redirigeant les camions vers les entrepôts voisins.",
        defaultVal: "+25%",
        unit: "% de hausse"
    },
    'decisions.d3': {
        title: "D3 — Heures supplémentaires (capacité usine)",
        category: "4. Effets des 9 décisions",
        explanation: "Restaure directement une fraction de la capacité perdue à l'usine touchée elle-même par des équipes supplémentaires.",
        impact: "Récupère 50% de la capacité perdue sans dépendre du transport vers d'autres sites.",
        defaultVal: "50%",
        unit: "% de la perte"
    },
    'decisions.d4': {
        title: "D4 — Transporteur d'appoint (capacité transport)",
        category: "4. Effets des 9 décisions",
        explanation: "Affrète des camions et transporteurs d'urgence sur le lien ou l'entrepôt touché.",
        impact: "Restaure 50% de la capacité de débit perdue sur la liaison endommagée.",
        defaultVal: "50%",
        unit: "% de la perte"
    },
    'decisions.d5': {
        title: "D5 — Entrepôt tampon supplémentaire (capacité globale)",
        category: "4. Effets des 9 décisions",
        explanation: "Active une capacité d'expédition supplémentaire sur l'ensemble du réseau. Décision globale plus lourde.",
        impact: "Augmente de 15% la capacité d'expédition globale de tous les entrepôts.",
        defaultVal: "+15%",
        unit: "% global"
    },
    'decisions.d6_boost': {
        title: "D6 — Déstockage sécurité : volume forfaitaire",
        category: "4. Effets des 9 décisions",
        explanation: "Puise dans le stock de sécurité avancé pour injecter immédiatement du débit vers le client.",
        impact: "Injecte un volume équivalent à 30% de la demande de référence, réparti entre les entrepôts. En mode temporel : libère ce volume, une seule fois, en réserve de sécurité séparée du stock ordinaire (Philadelphia et Baltimore exclus) ; elle ne comble que la demande non servie, donc ne réduit jamais le débit.",
        defaultVal: "30%",
        unit: "% de la demande"
    },
    'decisions.d6_days': {
        title: "D6 — Déstockage sécurité : durée d'épuisement",
        category: "4. Effets des 9 décisions",
        explanation: "Nombre de jours sur lesquels le stock de sécurité mobilisé s'amenuise progressivement jusqu'à épuisement.",
        impact: "Une durée plus longue étale l'effet tampon ; une durée plus courte apporte un secours massif mais éphémère. Sans effet en mode temporel : la réserve est libérée en une fois et se consomme selon la demande non servie.",
        defaultVal: "10",
        unit: "jours"
    },
    'decisions.d7': {
        title: "D7 — Pré-positionnement anticipé (stock avancé)",
        category: "4. Effets des 9 décisions",
        explanation: "Suppose un stock pré-positionné près du client amortissant n'importe quelle perte de débit usine ou lien.",
        impact: "Compense forfaitairement 20% de toutes les capacités perdues dans le réseau. En mode temporel : relève s et S de la hausse de la section 8 et déclenche une commande immédiate (Philadelphia et Baltimore exclus).",
        defaultVal: "20%",
        unit: "% compensé"
    },
    'decisions.d8': {
        title: "D8 — Priorisation des références critiques (demande)",
        category: "4. Effets des 9 décisions",
        explanation: "Concentre le débit disponible sur les articles critiques en renonçant délibérément à livrer une part de la demande ordinaire ce jour-là.",
        impact: "Coupe 25% de la demande ordinaire pour préserver les articles critiques (qui comptent triple dans l'IP).",
        defaultVal: "25%",
        unit: "% réduit"
    },
    'decisions.d9': {
        title: "D9 — Report différé de la demande non critique (demande)",
        category: "4. Effets des 9 décisions",
        explanation: "Reporte formellement une part de la demande non critique hors de la fenêtre d'incident (traitée ultérieurement sans pénaliser l'IP du jour).",
        impact: "Allège la demande du jour de 30% sur les références ordinaires, rehaussant mécaniquement le taux de service calculé.",
        defaultVal: "30%",
        unit: "% différé"
    },
    // --- CONSTANTES DE CALCUL (palier 1 : auparavant codées en dur) ---
    'indicators.importantWeight': {
        title: "Poids des articles importants dans l'IP",
        category: "6. Constantes de calcul",
        explanation: "L'indice de performance vaut (servi ordinaire + poids x servi important) / (demande ordinaire + poids x demande importante). Le poids fixe combien de fois un article important compte par rapport à un article ordinaire. Valeur du code d'origine : 3.",
        impact: "Plus le poids est élevé, plus l'IP dépend du service des articles importants et moins le manque sur les articles ordinaires pèse. À 1, tous les articles comptent pareil.",
        defaultVal: "3",
        unit: "facteur"
    },
    'indicators.recoveryThreshold': {
        title: "Seuil de rétablissement (IP)",
        category: "6. Constantes de calcul",
        explanation: "Après le creux, une branche est considérée comme rétablie le premier jour où son IP atteint ou dépasse ce seuil. Ce jour alimente la colonne recovery_day du fichier branches.csv. Valeur du code d'origine : 0,98.",
        impact: "Un seuil plus proche de 1 exige un retour plus complet et retarde le jour de rétablissement ; un seuil plus bas le rapproche. Il ne change pas les courbes d'IP.",
        defaultVal: "0.98",
        unit: "IP"
    },
    'flow.maxIterations': {
        title: "Garde du calcul de flot",
        category: "6. Constantes de calcul",
        explanation: "Le débit quotidien est calculé par l'algorithme d'Edmonds-Karp, qui cherche des chemins augmentants un par un. Cette garde limite le nombre de chemins explorés par jour simulé, pour éviter toute boucle sans fin. Valeur du code d'origine : 5000.",
        impact: "Sans effet tant que la garde n'est pas atteinte, ce qui est le cas des réseaux prévus. Une valeur trop basse interrompt le calcul et sous-estime le débit.",
        defaultVal: "5000",
        unit: "chemins"
    },
    // --- MODE TEMPOREL (palier 2) ---
    'temporal.defaultTravelTimeDays': {
        title: "Délai de trajet par défaut",
        category: "8. Mode temporel",
        explanation: "Nombre de jours que met la matière pour parcourir un arc qui n'a pas de délai propre dans le fichier du réseau. Un arc avec un délai dans le fichier (ISOMORPH en fournit) garde le sien. Le dernier kilomètre (arcs vers le client) est servi le jour même tant que la case correspondante est cochée. Hypothèse : le réseau par défaut n'a aucun délai d'origine.",
        impact: "À 0, la matière arrive le jour même. Plus le délai est long, plus les effets d'une perturbation arrivent en retard et plus il faut de stock en transit pour servir la demande.",
        defaultVal: "0",
        unit: "jours (entier, de 0 à 365)"
    },
    'temporal.defaultProductionLeadTimeDays': {
        title: "Délai de production par défaut",
        category: "8. Mode temporel",
        explanation: "Nombre de jours entre le lancement d'une production et sa disponibilité, pour une usine ou un fournisseur qui n'a pas de délai propre dans le fichier. Hypothèse : aucun délai d'origine sur le réseau par défaut.",
        impact: "Un délai plus long retarde le redémarrage après une panne et augmente le stock nécessaire pour absorber les variations de demande.",
        defaultVal: "0",
        unit: "jours (entier, de 0 à 365)"
    },
    'temporal.burnInDays': {
        title: "Pré-chauffe",
        category: "8. Mode temporel",
        explanation: "Nombre de jours simulés avant le début de l'enregistrement, sans perturbation ni décision, pour que les files de transit et les stocks atteignent leur régime de croisière. Commune aux 4 branches d'un scénario.",
        impact: "Trop courte : le réseau n'est pas encore en régime au premier jour enregistré. Plus longue que nécessaire : temps de calcul supplémentaire sans effet sur les résultats.",
        defaultVal: "60",
        unit: "jours (entier, de 0 à 365)"
    },
    'temporal.reorderPointDays': {
        title: "Couverture du point de commande s",
        category: "8. Mode temporel",
        explanation: "Point de commande de chaque entrepôt ou hub, en jours de la part égale de la demande de référence (demande divisée par le nombre de nœuds de stockage), plus le stock nécessairement en transit vers ce nœud. Quand la position de stock passe sous s, le nœud commande jusqu'à S.",
        impact: "Plus s est élevé, plus les stocks absorbent les perturbations courtes, et moins les pannes produisent de creux d'IP. Trop bas, un scénario peut devenir impossible à calibrer et le plan est refusé (voir le tableau de sensibilité).",
        defaultVal: "3",
        unit: "jours de demande"
    },
    'temporal.orderUpToDays': {
        title: "Couverture du niveau de recomplètement S",
        category: "8. Mode temporel",
        explanation: "Niveau de recomplètement de chaque entrepôt ou hub, en jours de la part égale de la demande de référence, plus le stock en transit. Doit être supérieur ou égal à s.",
        impact: "Plus S est élevé, plus le réseau immobilise de matière et absorbe de perturbation. Sur ISOMORPH avec les réglages par défaut, une couverture de 3 / 10 jours absorbe entièrement les pannes de 3 à 15 jours ; 1 / 3 jours laisse 5 pannes sur 60 avec un creux.",
        defaultVal: "10",
        unit: "jours de demande"
    },
    'temporal.d7OrderUpToBoostPct': {
        title: "Hausse de s et S par D7",
        category: "8. Mode temporel",
        explanation: "En mode temporel, la décision D7 (pré-positionnement) relève les niveaux s et S de cette fraction tant qu'elle est active, et déclenche une commande de recomplètement immédiate le jour de la décision. Les nœuds de stockage sans capacité propre et à sorties illimitées (Philadelphia et Baltimore sur ISOMORPH) en sont exclus.",
        impact: "Plus la hausse est forte, plus D7 remplit les stocks vite, au prix d'une demande plus forte sur les sources pendant la crise.",
        defaultVal: "0.5",
        unit: "fraction"
    },
    'temporal.enabled': {
        title: "Activer le mode temporel",
        category: "8. Mode temporel",
        explanation: "Désactivé, le plan se calcule comme avant (flot instantané, sans délai ni stock). Activé, la matière transite, la production a un délai, et chaque entrepôt ou hub gère un stock (s, S).",
        impact: "Change les valeurs d'IP (jamais la structure des fichiers). Nécessite une couverture de stock suffisante pour que la demande puisse être calibrée.",
        defaultVal: "désactivé",
        unit: ""
    },
    'temporal.lastMileSameDay': {
        title: "Dernier kilomètre servi le jour même",
        category: "8. Mode temporel",
        explanation: "Si coché, le délai de trajet est ignoré sur les arcs qui mènent au client : sans cela, le client recevrait aujourd'hui ce qu'il a commandé il y a quelques jours, et l'IP mesurerait l'écart de bruit de demande entre deux jours plutôt que la disponibilité du réseau.",
        impact: "Décoché, l'IP baisse dès que la demande augmente d'un jour à l'autre, même sans perturbation, et le principe d'un IP égal à 1 en chauffe ne peut plus être tenu.",
        defaultVal: "coché",
        unit: ""
    },
    // --- RÉSEAU ISOMORPH PRÉDÉFINI (palier 1) ---
    'isomorph.arcRangePct': {
        title: "Plage des arcs (plus ou moins)",
        category: "7. Réseau ISOMORPH prédéfini",
        explanation: "La capacité d'un arc du réseau ISOMORPH est le volume d'un conteneur multiplié par le nombre de conteneurs par jour (fichier d'origine). Cette valeur est tirée à chaque scénario, uniformément entre nominal x (1 - plage) et nominal x (1 + plage). Hypothèse : le fichier d'origine donne une valeur unique.",
        impact: "0 rend les arcs fixes (aucun tirage). Plus la plage est large, plus les scénarios diffèrent d'un tirage à l'autre.",
        defaultVal: "0.10",
        unit: "fraction"
    },
    'isomorph.sourceFactor': {
        title: "Facteur de capacité des sources",
        category: "7. Réseau ISOMORPH prédéfini",
        explanation: "Le fichier d'origine ne définit pas de capacité de production. Hypothèse : la capacité d'une source (usine) est la somme des capacités nominales de ses arcs sortants multipliée par ce facteur.",
        impact: "À 1,0, la capacité d'une source égale celle de son unique arc sortant : la production n'est jamais le goulot et la décision D1 (relèvement des autres usines) reste sans effet. En dessous de 1, la production devient limitante et D1 agit.",
        defaultVal: "0.8",
        unit: "facteur"
    },
    'isomorph.lastMileCapacity': {
        title: "Capacité du dernier kilomètre",
        category: "7. Réseau ISOMORPH prédéfini",
        explanation: "Capacité des arcs vers le client (Philadelphie et Baltimore vers New York). Dans le fichier d'origine, ces valeurs sont provisoires (le simulateur les remplace par 120 % de la demande moyenne). Par défaut, le dernier kilomètre est illimité ; si vous le limitez, la valeur de départ est celle du fichier d'origine (3000 par arc).",
        impact: "Une capacité limitée crée un goulot final qui peut masquer les perturbations en amont : avec 3000 par arc, le débit maximal ne dépasse pas 6000. Illimité, Philadelphie et Baltimore n'ont plus de capacité propre ni d'arc sortant fini, et certaines décisions n'agissent pas sur ces deux nœuds (avertissement de validation).",
        defaultVal: "illimité",
        unit: "unités/jour par arc"
    },
    // --- PROFILS DE GESTIONNAIRES ---
    'profile.detectionThreshold': {
        title: "Seuil de détection (IP lissé)",
        category: "5. Profils du gestionnaire simulé",
        explanation: "Niveau d'IP en dessous duquel le gestionnaire considère qu'une anomalie réelle est survenue et amorce sa procédure de réaction.",
        impact: "Un seuil haut (ex. 0.97 pour le Réactif) déclenche une alerte dès la moindre baisse. Un seuil bas (0.85 pour le Tardif) tolère une dégradation majeure avant d'agir.",
        defaultVal: "Réactif: 0.97 | Prudent: 0.92 | Tardif: 0.85",
        unit: "seuil IP"
    },
    'profile.smoothingWindowDays': {
        title: "Fenêtre de lissage (jours)",
        category: "5. Profils du gestionnaire simulé",
        explanation: "Nombre de jours sur lesquels l'IP est moyenné avant comparaison au seuil, pour filtrer le bruit quotidien.",
        impact: "Une fenêtre courte (1 j) réagit instantanément mais risque de réagir au bruit. Une fenêtre longue (6 j) filtre parfaitement le bruit mais retarde la prise de conscience.",
        defaultVal: "Réactif: 1 j | Prudent: 4 j | Tardif: 6 j",
        unit: "jours"
    },
    'profile.decisionDelayDays': {
        title: "Délai avant 1ère décision (jours)",
        category: "5. Profils du gestionnaire simulé",
        explanation: "Temps requis entre la confirmation de la détection et l'application effective de la première décision sur le terrain.",
        impact: "Représente le temps de concertation, d'arbitrage et d'affrètement. Plus ce délai est long, plus le creux d'IP s'élargit.",
        defaultVal: "Réactif: 1 j | Prudent: 3 j | Tardif: 6 j",
        unit: "jours"
    },
    'profile.reevaluationDays': {
        title: "Délai de réévaluation (jours)",
        category: "5. Profils du gestionnaire simulé",
        explanation: "Intervalle de temps que le gestionnaire attend après une décision avant de réévaluer l'IP et d'enclencher la décision suivante si l'IP reste dégradé.",
        impact: "Cadence l'escalade des mesures de résilience.",
        defaultVal: "Réactif: 2 j | Prudent: 5 j | Tardif: 8 j",
        unit: "jours"
    },
};
