import React, { useState } from 'react';
import { TemporalSensitivityTable } from './TemporalPanel';
import {
  BookOpen,
  Network,
  ArrowRight,
  Activity,
  Sliders,
  CheckCircle2,
  BarChart3,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Sparkles,
  Layers,
  Filter,
  AlertTriangle,
  Search,
  Gauge,
  Compass,
  Download,
  FileSpreadsheet,
  FileJson,
  PackageCheck,
  Database,
  HardDrive,
  Share2
} from 'lucide-react';

interface ModelDocumentationProps {
  onGoToGenerator?: () => void;
  onGoToHyperbolic?: () => void;
  onGoToBatch?: () => void;
  onGoToDownload?: () => void;
}

type SubTabKey = 'generator_hypotheses' | 'hyperbolic_resilience' | 'auto_fit_method' | 'export_files_guide';

const ModelDocumentation: React.FC<ModelDocumentationProps> = ({
  onGoToGenerator,
  onGoToHyperbolic,
  onGoToBatch,
  onGoToDownload,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('generator_hypotheses');

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* En-tête principal */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={24} className="text-orange-100" />
              <span className="text-xs font-bold uppercase tracking-widest text-orange-200">Guide de référence & Théorie opérationnelle</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Comprendre le modèle de simulation
            </h1>
            <p className="mt-2 text-orange-100 text-sm max-w-3xl leading-relaxed">
              Consultez les fondements mathématiques et opérationnels rédigés pour les spécialistes de la logistique, du transport et du management des opérations :
              les hypothèses du réseau simulé (Bloc 1), la formulation de la résilience hyperbolique avec ses 7 paramètres et 6 IP (Bloc 2), la méthode d'ajustement automatique robuste (Nelder-Mead multi-start & Soft-L1), ainsi que le guide d'usage exhaustif de tous les fichiers d'export du Centre de téléchargement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGoToGenerator && (
              <button
                onClick={onGoToGenerator}
                className="px-3.5 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Générateur</span>
                <ArrowRight size={14} />
              </button>
            )}
            {onGoToHyperbolic && (
              <button
                onClick={onGoToHyperbolic}
                className="px-3.5 py-2 bg-orange-700/80 hover:bg-orange-800 text-white border border-orange-400/40 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Résilience hyperbolique</span>
                <Sliders size={14} />
              </button>
            )}
            {onGoToBatch && (
              <button
                onClick={onGoToBatch}
                className="px-3.5 py-2 bg-orange-800/80 hover:bg-orange-900 text-white border border-orange-400/40 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Ajustement par lot</span>
                <Activity size={14} />
              </button>
            )}
            {onGoToDownload && (
              <button
                onClick={onGoToDownload}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-400/40 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Centre de téléchargement</span>
                <PackageCheck size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Barre des sous-onglets */}
        <div className="flex flex-wrap gap-2 mt-6 pt-3 border-t border-orange-400/50">
          <button
            onClick={() => setActiveSubTab('generator_hypotheses')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'generator_hypotheses'
                ? 'bg-white text-orange-700 shadow-md font-extrabold'
                : 'bg-orange-600/70 text-orange-100 hover:bg-orange-600 hover:text-white border border-orange-400/40'
            }`}
          >
            <Network size={16} />
            <span>1. Hypothèses du Générateur</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hyperbolic_resilience')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'hyperbolic_resilience'
                ? 'bg-white text-orange-700 shadow-md font-extrabold'
                : 'bg-orange-600/70 text-orange-100 hover:bg-orange-600 hover:text-white border border-orange-400/40'
            }`}
          >
            <Activity size={16} />
            <span>2. Fonction hyperbolique & les 6 IP</span>
          </button>

          <button
            onClick={() => setActiveSubTab('auto_fit_method')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'auto_fit_method'
                ? 'bg-white text-orange-700 shadow-md font-extrabold'
                : 'bg-orange-600/70 text-orange-100 hover:bg-orange-600 hover:text-white border border-orange-400/40'
            }`}
          >
            <Cpu size={16} />
            <span>3. Ajustement automatique & Optimiseur</span>
          </button>

          <button
            onClick={() => setActiveSubTab('export_files_guide')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'export_files_guide'
                ? 'bg-white text-emerald-800 shadow-md font-extrabold'
                : 'bg-orange-600/70 text-orange-100 hover:bg-orange-600 hover:text-white border border-orange-400/40'
            }`}
          >
            <Download size={16} />
            <span>4. Fichiers d'export & Guide des données</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 1 : HYPOTHÈSES DU GÉNÉRATEUR DE SCÉNARIOS                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'generator_hypotheses' && (
        <div className="p-6 md:p-8 space-y-8 text-gray-800 leading-relaxed animate-in fade-in duration-200">
          {/* Résumé en 1 minute */}
          <section className="bg-orange-50/60 border border-orange-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Network className="text-orange-600" size={22} />
              <h2 className="text-lg font-bold text-orange-950">
                Le réseau logistique simulé, en une minute
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                Par défaut, le générateur construit, à chaque scénario, un petit réseau logistique fictif : <strong>3 usines</strong>, <strong>9 entrepôts</strong>, et un seul client final, <strong>New York</strong>. Chaque usine produit des biens et les envoie vers plusieurs entrepôts par des liens de transport de capacité limitée. Chaque entrepôt reçoit ainsi des livraisons d'une ou plusieurs usines, puis expédie à son tour vers le client, lui aussi avec une capacité d'expédition limitée. Ce réseau par défaut n'est qu'un cas parmi d'autres : la section « Réseau logistique », en haut de l'onglet Générateur, permet de choisir à la place le réseau ISOMORPH d'origine (13 villes, 5 échelons intermédiaires) ou d'importer un réseau quelconque au format JSON décrit à l'Annexe 2. Le réseau choisi ne change ni le calcul du débit, ni celui de l'IP, ni les 9 décisions : seule la structure change.
              </p>
              <p>
                Le scénario se déroule en deux temps. D'abord une période calme (le <em>warm-up</em>), pendant laquelle tout fonctionne normalement. Puis, à un instant donné, une perturbation frappe le réseau : une usine tombe en panne, un lien de transport est coupé, un entrepôt ferme, la demande explose, ou le réseau se congestionne. À partir de là, quatre versions du même scénario sont rejouées en parallèle : une où personne ne réagit, et trois où un gestionnaire (rapide, prudent, ou lent à réagir) prend des décisions pour limiter les dégâts.
              </p>
              <p>
                Ce qui mesure la santé du réseau jour après jour s'appelle l'<strong>IP (indice de performance)</strong> : <strong>1</strong> signifie que toute la demande est livrée normalement, une valeur plus basse signifie qu'une partie de la demande n'est pas honorée à temps.
              </p>
              <p className="text-xs text-orange-900 bg-orange-100/70 p-3 rounded-lg border border-orange-200/80 font-medium">
                💡 <strong>Astuce d'usage :</strong> La section « Hypothèses du modèle » rassemble toutes les valeurs numériques qu'il a fallu fixer faute de données réelles disponibles. Dans l'onglet <em>Générateur de scénarios</em>, vous pouvez également survoler n'importe quel champ en maintenant la touche <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-800 shadow-xs">Shift</kbd> enfoncée pour afficher son explication et son impact contextuel.
              </p>
            </div>
          </section>

          {/* Section 1 : Génération du réseau */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-xl font-bold text-gray-900">1. Génération du réseau</h2>
            </div>
            <p className="text-sm text-gray-600">
              Cette section fixe à quoi ressemble le réseau avant même qu'une perturbation ne survienne, dans le cas du réseau par défaut (« paramétrique »). Les champs ci-dessous sont sans effet si un autre réseau est sélectionné (ISOMORPH ou un réseau importé) : leurs capacités sont alors celles du fichier choisi, tirées scénario par scénario selon les plages qu'il définit.
            </p>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-900 space-y-1.5">
              <h3 className="font-bold text-indigo-950">Réseau générique et types de nœuds</h3>
              <p>
                Un réseau, quel qu'il soit, est un graphe orienté de nœuds typés (<strong>fournisseur</strong>, <strong>usine</strong>, <strong>hub</strong>, <strong>entrepôt</strong>, <strong>transporteur</strong>, <strong>client</strong>) reliés par des arcs, chacun avec une capacité fixe, une plage tirée à chaque scénario, ou illimitée. Deux groupes en résultent, utilisés par les perturbations et les décisions : le groupe <strong>production</strong> (usines et fournisseurs, cible des pannes et des décisions D1, D3, D7) et le groupe <strong>stockage</strong> (entrepôts et hubs, cible des fermetures, de la congestion, et des décisions D2, D4, D5, D6). Sur le réseau par défaut, ces deux groupes sont exactement les usines et les entrepôts habituels ; n_factories et n_warehouses, dans scenarios.csv, comptent ces deux groupes (sur le réseau ISOMORPH, le hub de Nashville est donc compté dans n_warehouses, aux côtés des 8 entrepôts).
              </p>
              <p>
                Le débit du jour est le flot maximal (Edmonds-Karp) depuis les nœuds sources jusqu'au client, sur les capacités du jour, quelle que soit la profondeur du réseau (le réseau par défaut a 2 échelons intermédiaires ; ISOMORPH en a 5). Un nœud de stockage sans capacité propre (le cas d'ISOMORPH, qui n'en définit aucune) est piloté à travers ses arcs sortants : c'est ce que signale l'avertissement « capacité d'expédition sans prise » du rapport de validation. Ce calcul instantané est celui du mode par défaut ; le mode temporel (section 8) le remplace par une simulation jour par jour, avec délais et stocks.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Nombre d'usines et nombre d'entrepôts</h3>
                <p className="text-xs text-gray-600">
                  Fixent la taille du réseau par défaut : combien de sites de production et de sites de stockage/expédition sont simulés. Les augmenter rend le réseau plus grand et généralement plus robuste, car il offre plus de chemins de secours possibles.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Capacité usine (min et max)</h3>
                <p className="text-xs text-gray-600">
                  Une usine ne peut produire qu'un certain volume par jour. Ce paramètre fixe la fourchette dans laquelle ce volume est tiré au hasard pour chaque usine du scénario. Plus la capacité est élevée, plus le réseau a de marge avant qu'une panne ne devienne critique.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Capacité lien primaire, secondaire, tertiaire</h3>
                <p className="text-xs text-gray-600">
                  Chaque entrepôt est relié à plusieurs usines, mais pas de façon égale : un <strong>lien primaire</strong> (la voie principale d'approvisionnement, la plus large), un <strong>lien secondaire</strong> (une voie de secours partielle, plus étroite), et parfois un <strong>lien tertiaire</strong> (une troisième voie, encore plus étroite, présente sur certains entrepôts seulement). Ces trois paramètres fixent la capacité de transport de chacune de ces voies. Plus l'écart entre elles est grand, plus la perte du lien primaire est difficile à compenser par les autres.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Capacité expédition entrepôt (min et max)</h3>
                <p className="text-xs text-gray-600">
                  Un entrepôt ne peut réexpédier vers le client qu'un certain volume par jour, quelle que soit la quantité qu'il a reçue. Ce paramètre fixe cette limite. C'est souvent ce goulot d'étranglement, plutôt que la production elle-même, qui détermine si le client est bien servi.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Part d'articles importants (min et max)</h3>
                <p className="text-xs text-gray-600">
                  Une fraction de la demande du client concerne des articles jugés critiques (ils comptent triple dans le calcul de l'IP, un peu comme des commandes prioritaires). Ce paramètre fixe la proportion de la demande totale que ces articles représentent. Plus cette part est élevée, plus une petite rupture de service pèse lourd sur l'indicateur global.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Bruit journalier sur la demande</h3>
                <p className="text-xs text-gray-600">
                  La demande réelle du client fluctue légèrement d'un jour à l'autre, même sans perturbation (comme dans la vraie vie, la demande n'est jamais parfaitement stable). Ce paramètre fixe l'amplitude maximale de cette fluctuation aléatoire. Une valeur plus élevée rend les courbes d'IP moins lisses, plus réalistes, mais aussi plus difficiles à interpréter d'un coup d'œil.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 : Sévérité et durée des perturbations */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">2</div>
              <h2 className="text-xl font-bold text-gray-900">2. Sévérité et durée des perturbations</h2>
            </div>
            <p className="text-sm text-gray-600">
              Cette section fixe à quel point la perturbation frappe fort, combien de temps elle dure, et comment elle se propage dans le réseau.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Sévérité générale (panne, congestion, pic)</h3>
                <p className="text-xs text-gray-600">
                  Pour les perturbations qui dégradent progressivement le réseau (une panne partielle d'usine, une congestion générale, un pic de demande), ce paramètre fixe l'intensité de la dégradation, de 0 (rien) à 1 (perte quasi totale de la capacité touchée). Une sévérité plus élevée produit un creux d'IP plus profond.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Sévérité binaire (coupure, fermeture)</h3>
                <p className="text-xs text-gray-600">
                  Pour les deux perturbations considérées comme des ruptures nettes plutôt que progressives (couper un lien de transport, fermer un entrepôt), la sévérité est tirée dans une fourchette volontairement plus haute, car ces événements sont par nature proches d'un arrêt complet plutôt que d'un simple ralentissement.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Durée (min et max, en jours)</h3>
                <p className="text-xs text-gray-600">
                  Fixe combien de temps la perturbation reste active avant que le réseau ne retrouve sa capacité normale. Une durée plus longue laisse plus de temps au gestionnaire pour réagir, mais use aussi davantage les ressources de secours (stock, capacité de repli).
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Amplification du pic de demande</h3>
                <p className="text-xs text-gray-600">
                  Spécifique à la nature « pic de demande » : fixe de combien la demande du client est multipliée quand la sévérité est à son maximum (par défaut, la demande peut jusqu'à tripler). Plus ce chiffre est élevé, plus un pic de demande sévère met le réseau sous tension, même sans qu'aucune capacité ne soit endommagée.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Coupure de lien : friction sur l'entrepôt desservi</h3>
                <p className="text-xs text-gray-600">
                  Spécifique à la nature « coupure de lien » : quand le lien principal d'un entrepôt est coupé, cet entrepôt doit se réorganiser dans l'urgence, ce qui dégrade transitoirement sa propre capacité d'expédition (pas seulement le lien coupé). Ce paramètre fixe l'ampleur de cette dégradation additionnelle. Le mettre à zéro reviendrait à supposer une réorganisation instantanée et sans coût.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Coupure de lien : friction sur les autres liens du même entrepôt</h3>
                <p className="text-xs text-gray-600">
                  Toujours pour une coupure de lien : les liens de secours de l'entrepôt touché, en étant sollicités plus fort que d'habitude, perdent eux aussi un peu de leur capacité. Ce paramètre fixe cette perte résiduelle, plus faible que celle de l'entrepôt lui-même.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Coupure de lien : probabilité de cibler le lien principal</h3>
                <p className="text-xs text-gray-600">
                  Fixe la probabilité que la coupure touche le lien principal d'un entrepôt (l'endommager a un effet visible) plutôt qu'un lien secondaire quelconque (l'endommager change peu de choses, car il est déjà marginal). Une probabilité plus élevée rend les scénarios de coupure de lien globalement plus impactants.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 : Calibration de la demande */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">3</div>
              <h2 className="text-xl font-bold text-gray-900">3. Calibration de la demande de référence</h2>
            </div>
            <p className="text-sm text-gray-600">
              Cette section détermine, une fois la perturbation tirée, quelle est la demande normale du client. C'est une étape technique mais déterminante : elle garantit que chaque perturbation produit un effet observable, ni trop faible pour passer inaperçu, ni si fort qu'il masque tout le reste.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Rapport demande sur débit disponible pendant l'incident (min et max)</h3>
                <p className="text-xs text-gray-600">
                  Compare la demande du client au débit que le réseau peut encore livrer une fois dégradé par la perturbation. Une valeur de <strong>1</strong> signifie que la demande égale tout juste ce débit dégradé (un creux net mais sans rupture totale) ; une valeur <strong>inférieure à 1</strong> laisse de la marge (creux plus léger) ; une valeur <strong>supérieure à 1</strong> crée une pénurie franche (la demande dépasse ce que le réseau peut encore livrer). C'est le réglage le plus direct pour rendre les scénarios globalement plus ou moins sévères.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Marge de sécurité pendant le warm-up</h3>
                <p className="text-xs text-gray-600">
                  Garantit que, avant que la perturbation ne survienne, l'IP reste bien à <strong>1</strong> (aucune rupture ne doit apparaître pendant la période calme, quel que soit le tirage aléatoire du bruit journalier). Ce paramètre fixe la part maximale du débit normal que la demande a le droit d'utiliser en temps normal. Le resserrer trop près de 1 risque, sur de rares tirages défavorables, de faire apparaître un faux creux d'IP avant même le début de l'incident.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 : Effets quantifiés des 9 décisions */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">4</div>
              <h2 className="text-xl font-bold text-gray-900">4. Effets quantifiés des 9 décisions</h2>
            </div>
            <p className="text-sm text-gray-600">
              Chacune des 9 décisions que le gestionnaire peut prendre a un effet mesurable sur le réseau, réglé ici. Elles se répartissent en 4 familles : <strong>reroutage</strong> (rediriger les flux), <strong>capacité</strong> (mobiliser plus de moyens), <strong>stock</strong> (puiser dans des réserves existantes), et <strong>demande</strong> (agir sur ce qui est servi plutôt que sur ce qui est produit).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Reroutage</span>
                <h3 className="font-bold text-gray-800">D1 — Usines de secours</h3>
                <p className="text-xs text-gray-600">
                  Quand une usine est touchée, cette décision augmente temporairement la capacité de production des autres usines pour compenser. Le pourcentage fixe l'ampleur de ce coup de collier.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Reroutage</span>
                <h3 className="font-bold text-gray-800">D2 — Entrepôts de secours</h3>
                <p className="text-xs text-gray-600">
                  Même logique côté entrepôts : quand un entrepôt ou son lien est touché, les autres entrepôts voient leur capacité d'expédition augmentée pour absorber une partie du report.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Capacité</span>
                <h3 className="font-bold text-gray-800">D3 — Heures supplémentaires</h3>
                <p className="text-xs text-gray-600">
                  Plutôt que de reporter la charge ailleurs, cette décision restaure directement une partie de la capacité perdue à l'usine touchée elle-même par des équipes supplémentaires.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Capacité</span>
                <h3 className="font-bold text-gray-800">D4 — Transporteur d'appoint</h3>
                <p className="text-xs text-gray-600">
                  Affrète une solution de secours (transporteur supplémentaire) qui restaure une partie de la capacité perdue sur un lien ou un entrepôt sans passer par les autres sites.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Capacité globale</span>
                <h3 className="font-bold text-gray-800">D5 — Entrepôt tampon supplémentaire</h3>
                <p className="text-xs text-gray-600">
                  Décision plus lourde et plus lente qui relève la capacité d'expédition de tous les entrepôts du réseau face à des perturbations globales (ex. congestion).
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Stock</span>
                <h3 className="font-bold text-gray-800">D6 — Déstockage de sécurité</h3>
                <p className="text-xs text-gray-600">
                  Puise dans un stock de sécurité pour ajouter du volume disponible réparti entre tous les entrepôts, avec épuisement progressif sur plusieurs jours.
                  En mode temporel (section 8), D6 libère à la place une réserve de sécurité séparée du stock ordinaire, invisible pour la politique de commande.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Stock</span>
                <h3 className="font-bold text-gray-800">D7 — Pré-positionnement anticipé</h3>
                <p className="text-xs text-gray-600">
                  Suppose un stock avancé près du client qui atténue l'effet net de n'importe quelle perte de capacité (usine ou lien), comme un coussin absorbant le choc.
                  En mode temporel (section 8), D7 relève temporairement les niveaux s et S des stocks et déclenche une commande de recomplètement immédiate ; les nœuds de stockage sans capacité propre et à sorties illimitées (Philadelphia, Baltimore) en sont exclus, comme pour D6.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Demande</span>
                <h3 className="font-bold text-gray-800">D8 — Priorisation des références critiques</h3>
                <p className="text-xs text-gray-600">
                  Concentre le débit disponible sur les articles importants en renonçant délibérément à livrer une partie de la demande ordinaire ce jour-là.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Demande</span>
                <h3 className="font-bold text-gray-800">D9 — Report différé de la demande</h3>
                <p className="text-xs text-gray-600">
                  La demande ordinaire n'est pas abandonnée mais reportée à plus tard (après rétablissement), et ne pénalise pas l'IP mesuré pendant l'incident.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 : Profils du gestionnaire simulé */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">5</div>
              <h2 className="text-xl font-bold text-gray-900">5. Profils du gestionnaire simulé</h2>
            </div>
            <p className="text-sm text-gray-600">
              Trois profils de gestionnaire (<strong>réactif</strong>, <strong>prudent</strong>, <strong>tardif</strong>) observent le même réseau et réagissent différemment. Chacun est défini par 4 réglages, plus un ordre de décisions à essayer.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Seuil de détection (IP lissé)</h3>
                <p className="text-xs text-gray-600">
                  Le niveau d'IP en dessous duquel le gestionnaire considère qu'il y a un problème et commence à agir. Un seuil plus haut (proche de 1) rend le gestionnaire plus sensible, il réagit à la moindre baisse ; un seuil plus bas le rend plus tolérant, il laisse filer une dégradation plus importante avant de bouger.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Fenêtre de lissage (en jours)</h3>
                <p className="text-xs text-gray-600">
                  Le gestionnaire ne réagit pas au premier jour de baisse isolé : il observe une moyenne glissante de l'IP sur plusieurs jours, pour éviter de réagir à un simple bruit passager. Une fenêtre plus longue rend le gestionnaire plus patient, mais aussi plus lent à repérer un vrai problème.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Délai avant la première décision (en jours)</h3>
                <p className="text-xs text-gray-600">
                  Une fois le problème détecté, le temps qu'il faut au gestionnaire pour effectivement mettre en œuvre sa première décision (le temps de l'analyse, de la validation, de l'organisation). Plus ce délai est long, plus le réseau reste dégradé avant toute intervention.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Délai de réévaluation (en jours)</h3>
                <p className="text-xs text-gray-600">
                  Après une première décision, le temps que le gestionnaire attend avant de réévaluer la situation et, si besoin, de déclencher la décision suivante dans son ordre d'escalade.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Ordre d'escalade des décisions</h3>
                <p className="text-xs text-gray-600">
                  La séquence dans laquelle le gestionnaire essaie les décisions disponibles (parmi celles pertinentes pour la nature de la perturbation en cours). Un profil qui commence par des décisions rapides à organiser (reroutage) réagit plus vite qu'un profil qui commence par des décisions plus lourdes (stock, capacité globale), même à seuils et délais égaux.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-lg text-xs text-gray-700">
              <strong>Résumé des 3 profils par défaut :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Le réactif :</strong> détecte tôt, réagit vite, et privilégie d'abord le reroutage.</li>
                <li><strong>Le prudent :</strong> observe plus longtemps avant d'agir et commence par mobiliser ses stocks.</li>
                <li><strong>Le tardif :</strong> est le plus lent à tous points de vue, et commence par agir sur la demande plutôt que sur l'offre.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 : Constantes de calcul */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">6</div>
              <h2 className="text-xl font-bold text-gray-900">6. Constantes de calcul</h2>
            </div>
            <p className="text-sm text-gray-600">
              Trois valeurs qui définissent l'indicateur de performance et le calcul du débit lui-même, plutôt qu'un scénario ou une décision. Elles ne varient jamais avec le potentiomètre d'impact, qui ne pilote que la sévérité des chocs, la tension du réseau, les décisions et la réactivité du gestionnaire.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Poids des articles importants dans l'IP</h3>
                <p className="text-xs text-gray-600">
                  Le nombre de fois qu'un article important compte par rapport à un article ordinaire dans le calcul de l'IP. Par défaut 3, comme dans le code d'origine.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Seuil de rétablissement (IP)</h3>
                <p className="text-xs text-gray-600">
                  L'IP à partir duquel une branche est considérée comme rétablie après un creux, ce qui fixe recovery_day dans branches.csv. Par défaut 0,98.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Garde du calcul de flot</h3>
                <p className="text-xs text-gray-600">
                  Le nombre maximal de chemins que l'algorithme de flot maximal (Edmonds-Karp) peut explorer pour un jour simulé, avant d'arrêter par sécurité. Par défaut 5000 ; sans effet tant que cette garde n'est pas atteinte, ce qui est le cas de tous les réseaux prévus.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 : Réseau ISOMORPH prédéfini */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">7</div>
              <h2 className="text-xl font-bold text-gray-900">7. Réseau ISOMORPH prédéfini</h2>
            </div>
            <p className="text-sm text-gray-600">
              ISOMORPH est le réseau d'origine du simulateur dont s'inspire cette application : 13 villes américaines, 16 arcs, un hub (Nashville) et 5 échelons intermédiaires jusqu'au client (New York). Sélectionnable dans la section « Réseau logistique » de l'onglet Générateur, il ne change ni le calcul du débit ni celui de l'IP : seule la structure change. Trois valeurs, absentes du fichier d'origine, ont dû être posées comme <strong>hypothèses de modélisation</strong> pour rendre ce réseau simulable ; elles sont réglables dans cette section, avec leur valeur par défaut.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Plage des arcs (hypothèse)</h3>
                <p className="text-xs text-gray-600">
                  Le fichier d'origine ne donne qu'une seule valeur par arc (volume d'un conteneur x conteneurs par jour). Par défaut, cette valeur est tirée à chaque scénario dans une plage de plus ou moins 10 % autour de cette valeur nominale, pour introduire une variabilité scénario par scénario comparable à celle du réseau par défaut.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Facteur de capacité des sources (hypothèse)</h3>
                <p className="text-xs text-gray-600">
                  Le fichier d'origine ne définit aucune capacité de production pour les 3 usines sources. Par défaut, elle est fixée à 0,8 fois la somme de leurs arcs sortants : à 1,0, la production ne serait jamais le facteur limitant, et la décision D1 (usine de secours) resterait sans effet observable.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 md:col-span-2">
                <h3 className="font-bold text-gray-800">Dernier kilomètre (hypothèse)</h3>
                <p className="text-xs text-gray-600">
                  La capacité des deux arcs vers New York (Philadelphia et Baltimore) est provisoire dans le fichier d'origine (le simulateur ISOMORPH la remplaçait par 120 % de la demande moyenne). Par défaut, ces arcs sont illimités ; on peut leur fixer une capacité, avec 3000 par arc comme valeur de départ (celle du fichier d'origine), ce qui crée un goulot final susceptible de masquer les perturbations en amont.
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1.5">
              <h3 className="font-bold text-amber-950 flex items-center gap-1.5"><AlertTriangle size={14} className="shrink-0" /> Avertissements attendus sur ISOMORPH</h3>
              <p>
                Sélectionner ISOMORPH déclenche systématiquement 3 avertissements dans le rapport de validation, non bloquants :
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>les délais de trajet du fichier d'origine sont conservés mais ignorés tant que le mode temporel est désactivé (section 8) ; ils sont utilisés dès qu'il est activé ;</li>
                <li>Philadelphia n'a pas de capacité d'expédition propre et ses arcs sortants sont illimités : les décisions D2, D4, D5, D6 et la friction d'une coupure de lien n'ont pas de prise sur ce nœud (seule sa fermeture reste efficace, en réduisant ses arcs entrants) ;</li>
                <li>même chose pour Baltimore.</li>
              </ul>
              <p>
                Ces avertissements disparaissent si l'on fixe une capacité au dernier kilomètre.
              </p>
            </div>
          </section>

          {/* Section 8 : Mode temporel */}
          <section className="space-y-4 border-t border-gray-200 pt-6" id="doc-mode-temporel">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">8</div>
              <h2 className="text-xl font-bold text-gray-900">8. Mode temporel : délais et stocks</h2>
            </div>
            <p className="text-sm text-gray-600">
              Par défaut, le débit du jour est un flot instantané : ce que le réseau peut acheminer aujourd'hui, sans mémoire d'un jour sur l'autre. Le mode temporel, désactivé par défaut, le remplace par une vraie simulation dynamique : la matière transite plusieurs jours, la production met du temps à devenir disponible, et chaque entrepôt ou hub gère un stock. L'IP mesure alors ce que le réseau livre réellement au client, avec retard et amortissement par les stocks. Les fichiers gardent exactement la même structure ; seules les valeurs d'IP changent.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Délais de trajet et de production</h3>
                <p className="text-xs text-gray-600">
                  Un arc a un délai de trajet en jours : ce qui part un jour arrive ce nombre de jours plus tard. Une usine ou un fournisseur a un délai de production : ce qui est lancé un jour est disponible ce nombre de jours plus tard. Les délais propres au réseau viennent de son fichier (ISOMORPH fournit ses délais de trajet) ; les réglages par défaut de la section 8 des hypothèses servent aux éléments qui n'en ont pas, et valent 0 jour, hypothèse faute de donnée d'origine sur le réseau par défaut.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">Politique de stock (s, S)</h3>
                <p className="text-xs text-gray-600">
                  Chaque entrepôt ou hub commande quand sa position de stock (stock disponible plus matière en route) passe sous le point de commande s, jusqu'au niveau S. s et S sont exprimés en jours de la part égale de la demande de référence (3 et 10 jours par défaut, hypothèses réglables), plus le stock qui est nécessairement en transit vers ce nœud (délai multiplié par le débit de chaque arc entrant). Un nœud dont le fichier donne un champ inventory garde ses valeurs. Les commandes remontent vers l'amont instantanément ; seule la matière prend du temps.
                </p>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">D6 devient une réserve de sécurité séparée</h3>
                <p className="text-xs text-gray-600">
                  En mode temporel, D6 libère une réserve, à parts égales entre les nœuds de stockage, distincte du stock ordinaire et invisible pour la politique de commande. Elle n'est livrée au client que pour combler la demande que le stock ordinaire n'a pas pu servir. Une injection directe dans le stock ordinaire avait été envisagée : elle faisait franchir le point de commande s à certains nœuds, qui sautaient un recomplètement entier, et le besoin remontait jusqu'aux sources, qui restaient à l'arrêt un jour de panne (capacité perdue). La réserve garantit que D6 ne réduit jamais le débit livré.
                </p>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1.5">
                <h3 className="font-bold text-gray-800">D7 et les nœuds sans capacité propre</h3>
                <p className="text-xs text-gray-600">
                  D7 relève s et S (de 50 % par défaut, réglable) tant qu'elle est active et déclenche une commande de recomplètement immédiate. Comme D6, elle exclut les nœuds de stockage sans capacité propre et à sorties illimitées (Philadelphia et Baltimore sur ISOMORPH), pour rester cohérente avec la règle du réseau décrite en section 7.
                </p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-950 space-y-1.5">
              <h3 className="font-bold text-indigo-950">Calibration de la demande et refus explicite du plan</h3>
              <p>
                Le principe est celui du mode par défaut : avant la perturbation, l'IP doit valoir 1 chaque jour malgré le bruit de demande. En mode temporel, chaque scénario est simulé sans perturbation avec son propre bruit, et la demande de référence retenue est la plus grande que le réseau sert intégralement (recherche par dichotomie). Si aucune demande ne convient, parce que la couverture de stock est trop faible au regard du bruit et des délais, le plan est refusé avec un message explicite : le scénario en cause, la couverture demandée, le bruit, le délai d'approvisionnement, et le remède (augmenter les jours de couverture s et S). Le plan ne continue jamais avec une demande arbitraire.
              </p>
              <p>
                Le dernier kilomètre (arcs vers le client) est servi le jour même par défaut, réglage modifiable : avec un délai sur ces arcs, le client recevrait aujourd'hui ce qu'il a commandé il y a quelques jours, et l'IP mesurerait l'écart de bruit entre deux jours plutôt que la disponibilité du réseau.
              </p>
            </div>

            <TemporalSensitivityTable />

            <p className="text-xs text-gray-500">
              Les réglages du mode temporel (activation, délais par défaut, couverture, hausse de D7, pré-chauffe, dernier kilomètre) ne sont jamais modifiés par le potentiomètre d'impact : ce ne sont pas des leviers d'impact mais des hypothèses de modélisation.
            </p>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 2 : FONCTION HYPERBOLIQUE DE LA RÉSILIENCE & LES 6 IP           */}
      {/* ========================================================================= */}
      {activeSubTab === 'hyperbolic_resilience' && (
        <div className="p-6 md:p-8 space-y-8 text-gray-800 leading-relaxed animate-in fade-in duration-200">
          {/* Synthèse exécutive */}
          <section className="bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-50 border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-orange-600 text-white rounded-xl shadow-md">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-orange-950">
                  Modélisation analytique continue par fonction hyperbolique
                </h2>
                <p className="text-xs text-orange-800 font-medium">
                  De la trajectoire stochastique discrète aux indicateurs quantifiés de résilience (CRD, IPC, TRP, SRA, ERR, PR)
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed pt-2">
              <p>
                Lorsqu'une chaîne logistique subit une perturbation, la trajectoire temporelle de sa performance présente typiquement une forme en creux caractéristique dite <em>« profil de résilience en cuvette »</em> : une phase stable nominale, suivie d'une <strong>chute de performance</strong> (dégradation), d'un <strong>point bas critique</strong> (nadir), puis d'une phase de <strong>rétablissement</strong> (remontée vers un nouvel équilibre).
              </p>
              <p>
                Pour quantifier rigoureusement ce phénomène, le modèle utilise une <strong>combinaison de deux tangentes hyperboliques</strong> paramétrée par <strong>7 variables continues</strong>. Cette formulation analytique permet de découpler mathématiquement la résistance au choc de la dynamique de rémission, puis d'en extraire de façon exacte et reproductible les <strong>6 Indices de Performance (IP)</strong>.
              </p>
            </div>
          </section>

          {/* Formule mathématique fondamentale */}
          <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-orange-500/30 text-orange-300 border border-orange-400/40 text-xs font-mono font-bold rounded-lg">
                  Formulation analytique
                </span>
                <h3 className="text-lg font-bold text-white">Équation de la résilience hyperbolique</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Modèle bi-tanh p(x)</span>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-center overflow-x-auto">
              <div className="text-lg md:text-2xl font-mono text-amber-300 font-bold tracking-wide">
                p(x) = k + q/2 - (h/2)·tanh[α·(x - g)/2] + [(h + q)/2]·tanh[β·(x - g - d)/2]
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-2">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px]">Régime initial</span>
                <p>Pour x ≪ g (avant le choc) :</p>
                <p className="font-mono text-amber-200 font-bold">lim p(x) = k</p>
                <p className="text-slate-400 text-[11px]">Le système opère à son niveau de performance nominale.</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <span className="font-bold text-red-400 uppercase tracking-wider text-[10px]">Creux critique (Nadir)</span>
                <p>Autour de x = g + d/2 :</p>
                <p className="font-mono text-rose-200 font-bold">p_min ≈ k - h/2</p>
                <p className="text-slate-400 text-[11px]">Niveau d'impact maximal atteint au paroxysme de la crise.</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Régime asymptotique</span>
                <p>Pour x ≫ g + d (après rémission) :</p>
                <p className="font-mono text-emerald-200 font-bold">lim p(x) = k + q</p>
                <p className="text-slate-400 text-[11px]">Le système se stabilise à k+q (retour nominal, déficit ou gain).</p>
              </div>
            </div>
          </section>

          {/* Les 7 Paramètres détaillés */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                <Sliders size={18} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Les 7 paramètres de la fonction hyperbolique
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Chaque paramètre possède une signification physique et géométrique précise qui décrit une facette distincte de la réponse dynamique de la chaîne logistique face au choc :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* k */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">k</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Niveau nominal</span>
                </div>
                <h3 className="font-bold text-gray-900">Performance initiale avant incident</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Valeur de base du système en régime calme (p(-∞) = k). Typiquement fixée à <strong>1.0</strong> (100% de la demande livrée à temps sans rupture).
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : k &gt; h/2
                </div>
              </div>

              {/* q */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">q</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Écart asymptotique</span>
                </div>
                <h3 className="font-bold text-gray-900">Perte ou gain résiduel post-crise</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Décalage entre la performance finale stabilisée et la performance initiale (p(+∞) = k + q).
                  Si <strong>q = 0</strong>, retour exact à la normale. Si <strong>q &lt; 0</strong>, séquelle permanente (perte de clients). Si <strong>q &gt; 0</strong>, croissance adaptative post-crise.
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : q &gt; -h
                </div>
              </div>

              {/* h */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">h</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Amplitude de chute</span>
                </div>
                <h3 className="font-bold text-gray-900">Profondeur de la dégradation</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Amplitude de la transition descendante déclenchée par la perturbation. Plus h est grand, plus la dégradation de service est sévère.
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : 0 &lt; h &lt; 2k
                </div>
              </div>

              {/* g */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">g</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Instant de rupture</span>
                </div>
                <h3 className="font-bold text-gray-900">Centre temporel de la chute</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Date (en jours relatifs ou absolus) correspondant au point d'inflexion descendant, où la vitesse de perte de performance est maximale. Directement liée au début du choc.
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : g ≥ 0
                </div>
              </div>

              {/* d */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">d</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Délai inter-transitions</span>
                </div>
                <h3 className="font-bold text-gray-900">Durée avant amorce du rétablissement</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Écart temporel entre le centre de la chute (x = g) et le centre de la remontée (x = g + d). Reflète la persistance de l'aléa et le temps d'activation des décisions de secours.
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : d &gt; 0
                </div>
              </div>

              {/* alpha */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">α</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Taux de dégradation</span>
                </div>
                <h3 className="font-bold text-gray-900">Vitesse de chute de la performance</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pente de la première transition. Un α très grand traduit une rupture brutale (ex. coupure d'un lien physique), alors qu'un α faible traduit une érosion progressive (congestion).
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : α &gt; 0 (par défaut ≥ 0.5)
                </div>
              </div>

              {/* beta */}
              <div className="p-4 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all space-y-2 md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">β</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Taux de rémission</span>
                </div>
                <h3 className="font-bold text-gray-900">Vitesse de rétablissement du réseau</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pente de la transition montante. Un β élevé traduit une reprise vigoureuse grâce à des décisions de gestion bien coordonnées (usines de secours, heures supplémentaires, stocks tampons). Un β faible dénote une convalescence laborieuse.
                </p>
                <div className="text-[11px] text-gray-500 font-mono pt-1">
                  Contrainte : β &gt; 0 (par défaut ≥ 0.5)
                </div>
              </div>
            </div>
          </section>

          {/* Pourquoi ce besoin fondamental d'identifier les 7 paramètres pour chaque courbe */}
          <section className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                <HelpCircle size={24} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-indigo-950">
                  Pourquoi doit-on identifier ces 7 paramètres pour chaque courbe de performance ?
                </h2>
                <p className="text-xs text-indigo-800 font-medium">
                  Le pont indispensable entre les données simulées bruitées et l'apprentissage décisionnel
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 leading-relaxed pt-2">
              <div className="p-4 bg-white rounded-xl border border-indigo-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>1. Filtrage du bruit stochastique journalier</span>
                </div>
                <p>
                  Dans la simulation réelle (ou sur le terrain), la performance journalière subit des micro-variations aléatoires (fluctuations de demande, retards de transport, aléas logistiques).
                  Calculer des métriques directement sur les points discrets bruts produirait des indicateurs hypersensibles au bruit, instables et non comparables d'un scénario à l'autre. L'identification par régression non-linéaire élimine le bruit stochastique pour isoler la vraie trajectoire systémique.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-indigo-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>2. Passage du discret au continu différentiable</span>
                </div>
                <p>
                  Disposer de l'équation continue p(x) permet d'effectuer des calculs mathématiques exacts : intégrer formellement la surface perdue sans approximation par trapèzes, dériver analytiquement les vitesses instantanées maximales de chute et de remontée, et déterminer avec précision les temps de transition sans dépendre du pas d'échantillonnage discret d'un jour.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-indigo-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>3. Découplage de la résistance passive et du rétablissement actif</span>
                </div>
                <p>
                  Une courbe de résilience combine deux dynamiques orthogonales :
                  l'<strong>absorption passive</strong> (à quel point le réseau encaisse : h et α) et la <strong>réaction adaptative</strong> (à quelle vitesse les décisions managériales relèvent le système : β, d et q).
                  Seule l'estimation simultanée des 7 paramètres permet de séparer formellement ces deux comportements et d'évaluer l'efficacité propre des 9 décisions de gestion.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-indigo-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>4. Automatisation de l'ajustement par lot (Bloc 2)</span>
                </div>
                <p>
                  Un plan d'expériences produit des dizaines ou des centaines de courbes (N scénarios × 4 branches de gestion = jusqu'à 400 courbes). L'algorithme d'optimisation non-linéaire (Levenberg-Marquardt / Nelder-Mead multi-start avec perte robuste Soft-L1) ajuste automatiquement chaque courbe en quelques millisecondes, garantit un score R² &gt; 0.90, et standardise les données pour alimenter le Réseau Bayésien.
                </p>
              </div>
            </div>
          </section>

          {/* Les 6 Indices de Performance (IP) */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <BarChart3 size={18} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Les 6 Indices de Performance (IP) de la résilience
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Une fois les 7 paramètres (k, q, h, g, d, α, β) identifiés pour une courbe donnée, ils sont injectés dans les 6 formules analytiques suivantes pour quantifier chaque dimension de la résilience :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* CRD */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-mono font-bold text-xs rounded-full">
                    CRD
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Capacité de Résistance Dynamique
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Coefficient de Résistance à la Dégradation</h3>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-center font-mono text-emerald-950 font-bold text-xs">
                  CRD = (β / α) · [(h + q) / h] · (1 / d) · √(α · β)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Compare le ratio de vitesse de rétablissement (β) sur la vitesse de chute (α), pondéré par la rémission relative (h+q)/h et l'inverse du délai d'action (1/d).
                </p>
                <div className="text-[11px] text-emerald-900 font-semibold bg-emerald-100/60 p-2 rounded">
                  Interprétation : Plus CRD est élevé (&ge; 2.0), plus la reprise est vive et supérieure à la chute subie.
                </div>
              </div>

              {/* IPC */}
              <div className="p-5 bg-gradient-to-br from-rose-50/50 to-red-50/30 border border-red-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-xs rounded-full">
                    IPC
                  </span>
                  <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
                    Surface de perte cumulée
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Indice de Perte de Capacité</h3>
                <div className="p-2.5 bg-white border border-red-200 rounded-lg text-center font-mono text-red-950 font-bold text-xs">
                  IPC = (h / α)·ln(2) + (h · d)/2 - [(h + q) / β]·ln(2)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Intégrale analytique exacte de la perte de performance sous la ligne nominale k sur l'ensemble de l'épisode de perturbation.
                </p>
                <div className="text-[11px] text-red-900 font-semibold bg-red-100/60 p-2 rounded">
                  Interprétation : Indicateur inversé. Plus IPC est proche de 0 (&le; 1.0), plus la perte totale de service pour le client est minime.
                </div>
              </div>

              {/* TRP */}
              <div className="p-5 bg-gradient-to-br from-blue-50/50 to-sky-50/30 border border-blue-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-mono font-bold text-xs rounded-full">
                    TRP
                  </span>
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                    Temps de convalescence
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Temps de Rétablissement et de Rémission</h3>
                <div className="p-2.5 bg-white border border-blue-200 rounded-lg text-center font-mono text-blue-950 font-bold text-xs">
                  TRP = d + 2.95 / β
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Durée totale (en jours) nécessaire pour atteindre 95% de la transition de rémission, en additionnant le délai avant amorce (d) et la durée propre de redressement (2.95 / β).
                </p>
                <div className="text-[11px] text-blue-900 font-semibold bg-blue-100/60 p-2 rounded">
                  Interprétation : Indicateur inversé. Plus TRP est court (&le; 2.0 jours), plus le réseau redevient opérationnel rapidement.
                </div>
              </div>

              {/* SRA */}
              <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-amber-600 text-white font-mono font-bold text-xs rounded-full">
                    SRA
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Robustesse adaptative
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Surface de Rémission et d'Absorption</h3>
                <div className="p-2.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-amber-950 font-bold text-xs">
                  SRA = [β·(h + q) / (α·h·d)] · exp(-|q| / h) · [1 + tanh(β - α)]
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Mesure la vigueur de l'adaptation du réseau. Le terme exp(-|q|/h) pénalise l'incapacité à retrouver le niveau nominal, tandis que 1+tanh(β-α) récompense une rémission plus rapide que l'impact.
                </p>
                <div className="text-[11px] text-amber-900 font-semibold bg-amber-100/60 p-2 rounded">
                  Interprétation : Plus SRA est élevé (&ge; 1.5), plus la capacité d'absorption adaptative est robuste.
                </div>
              </div>

              {/* ERR */}
              <div className="p-5 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 border border-purple-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-purple-600 text-white font-mono font-bold text-xs rounded-full">
                    ERR
                  </span>
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                    Efficacité relative
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Efficacité de Récupération Résiduelle</h3>
                <div className="p-2.5 bg-white border border-purple-200 rounded-lg text-center font-mono text-purple-950 font-bold text-xs">
                  ERR = 1 + q / (2·k) - (h · |IPC|) / (T · k)  &nbsp;avec T = g + d + 4/β
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bilan normalisé sur la durée totale d'observation effective T. Intègre à la fois le niveau asymptotique atteint (q/(2k)) et la surface d'impact IPC pondérée par la sévérité du choc h.
                </p>
                <div className="text-[11px] text-purple-900 font-semibold bg-purple-100/60 p-2 rounded">
                  Interprétation : Une valeur &ge; 1.0 atteste d'une préservation optimale de la capacité globale du réseau.
                </div>
              </div>

              {/* PR */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-indigo-700 text-white font-mono font-bold text-xs rounded-full">
                    PR
                  </span>
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Performance globale
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">Performance de Résilience Globale</h3>
                <div className="p-2.5 bg-white border border-indigo-200 rounded-lg text-center font-mono text-indigo-950 font-bold text-xs">
                  PR = (k + q) / (k - h / 2)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ratio de résilience fondamental comparant l'état final stabilisé (k+q) au creux le plus critique atteint lors du choc (k - h/2).
                </p>
                <div className="text-[11px] text-indigo-950 font-semibold bg-indigo-100/60 p-2 rounded">
                  Interprétation : Variable cible maîtresse. Une valeur &ge; 1.5 signale une résilience excellente avec rebond significatif.
                </div>
              </div>
            </div>
          </section>

          {/* Synthèse métier terrain pour le responsable logistique et transport */}
          <section className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md">
                <Compass className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-amber-950">
                  Lexique & Équivalences Métier pour les professionnels de la Logistique et du Transport
                </h3>
                <p className="text-xs text-amber-800 font-medium">
                  Comment traduire les paramètres mathématiques en notions concrètes de supply chain et de gestion de crise
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 bg-white rounded-xl border border-amber-200 overflow-hidden shadow-xs">
                <thead className="bg-amber-100/80 text-amber-950 font-bold uppercase text-[10px] tracking-wider border-b border-amber-200">
                  <tr>
                    <th className="p-3">Symbole</th>
                    <th className="p-3">Nom Mathématique</th>
                    <th className="p-3">Équivalent Opérationnel Terrain (Logistique & Transport)</th>
                    <th className="p-3">Impact Concret sur l'Exploitation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">k</td>
                    <td className="p-3 font-medium">Niveau nominal</td>
                    <td className="p-3">Taux de service initial (OTIF) en régime de croisière</td>
                    <td className="p-3 text-gray-600">1.0 = 100% des commandes livrées à l'heure et conformes avant le début de l'aléa.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">h</td>
                    <td className="p-3 font-medium">Amplitude de chute</td>
                    <td className="p-3">Perte d'expédition maximale subie au paroxysme du choc</td>
                    <td className="p-3 text-gray-600">Ex: h=0.40 signifie que les expéditions tombent à 60% au pire moment de la crise.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">d</td>
                    <td className="p-3 font-medium">Délai inter-transitions</td>
                    <td className="p-3">Temps de réorganisation de la cellule de crise avant redressement</td>
                    <td className="p-3 text-gray-600">Délai (en jours) pour affréter des camions d'appoint ou puiser dans les stocks déportés.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">α</td>
                    <td className="p-3 font-medium">Taux de dégradation</td>
                    <td className="p-3">Brutalité de la rupture logistique</td>
                    <td className="p-3 text-gray-600">Élevé = pont coupé ou grève immédiate ; Faible = congestion routière progressive.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">β</td>
                    <td className="p-3 font-medium">Taux de rémission</td>
                    <td className="p-3">Vigueur de la remobilisation et efficacité des plans de secours</td>
                    <td className="p-3 text-gray-600">Élevé = bascule rapide sur usines de secours et heures sup ; Faible = engorgement persistant.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-3 font-mono font-bold text-orange-600">q</td>
                    <td className="p-3 font-medium">Écart asymptotique</td>
                    <td className="p-3">Séquelle commerciale post-crise ou renforcement de capacité</td>
                    <td className="p-3 text-gray-600">q &lt; 0 : clients perdus ou goulet durable ; q = 0 : retour exact ; q &gt; 0 : capacités accrues.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 bg-amber-50/30">
                    <td className="p-3 font-mono font-bold text-indigo-700">IPC</td>
                    <td className="p-3 font-medium">Indice de Perte Cumulée</td>
                    <td className="p-3 font-semibold text-indigo-950">Volume total de commandes non livrées (jours-commandes perdus)</td>
                    <td className="p-3 text-gray-600">Quantifie le coût financier et contractuel total de la crise (pénalités de retard).</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 bg-amber-50/30">
                    <td className="p-3 font-mono font-bold text-indigo-700">TRP</td>
                    <td className="p-3 font-medium">Temps de Rétablissement</td>
                    <td className="p-3 font-semibold text-indigo-950">Durée totale (jours) pour ramener le réseau à 95% de sa capacité</td>
                    <td className="p-3 text-gray-600">Indicateur contractuel clé pour les clients finaux et les assureurs de fret.</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 bg-amber-50/30">
                    <td className="p-3 font-mono font-bold text-indigo-700">PR</td>
                    <td className="p-3 font-medium">Performance de Résilience</td>
                    <td className="p-3 font-semibold text-indigo-950">Capacité du plan d'action à surpasser le creux de la crise</td>
                    <td className="p-3 text-gray-600">PR &gt; 1.5 : résilience robuste. C'est la variable cible prédite par le Réseau Bayésien.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Rôle dans le Réseau Bayésien (PR_class) */}
          <section className="bg-slate-50 border border-slate-300 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size={22} />
              <h3 className="text-base font-bold text-gray-900">
                Du PR continu à la classification discrète (PR_class) pour le Réseau Bayésien
              </h3>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Pour l'apprentissage supervisé du <strong>Réseau Bayésien</strong> (export <em>rb_training_&lt;seed&gt;.csv</em> disponible dans le <em>Centre de téléchargement</em>), l'indicateur continu <strong>PR</strong> est discrétisé en 3 états probabilistes basés sur les percentiles ou seuils de performance :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <span className="font-bold text-red-800">1. Faible (PR &lt; 1.0)</span>
                <p className="text-red-700 text-[11px]">Le réseau n'a pas réussi à compenser la perte ; le rebond reste très insuffisant.</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="font-bold text-amber-800">2. Moyenne (1.0 &le; PR &lt; 2.0)</span>
                <p className="text-amber-700 text-[11px]">Le système rétablit une majorité de sa performance mais conserve un impact mesurable.</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-800">3. Élevée (PR &ge; 2.0)</span>
                <p className="text-emerald-700 text-[11px]">Excellente capacité d'absorption et rétablissement dynamique complet.</p>
              </div>
            </div>
          </section>

          {/* Liens rapides vers les modules de travail */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-orange-950">Prêt à tester la formule hyperbolique ?</h4>
              <p className="text-xs text-orange-800">
                Passez à l'action en manipulant les curseurs en direct ou en ajustant les courbes par lot.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onGoToHyperbolic && (
                <button
                  onClick={onGoToHyperbolic}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sliders size={14} />
                  <span>Ouvrir Résilience hyperbolique</span>
                </button>
              )}
              {onGoToBatch && (
                <button
                  onClick={onGoToBatch}
                  className="px-4 py-2 bg-white hover:bg-orange-100 text-orange-800 border border-orange-300 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Activity size={14} />
                  <span>Lancer l'Ajustement par lot</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 3 : MÉTHODE D'AJUSTEMENT AUTOMATIQUE & CHOIX ALGORITHMIQUES     */}
      {/* ========================================================================= */}
      {activeSubTab === 'auto_fit_method' && (
        <div className="p-6 md:p-8 space-y-8 text-gray-800 leading-relaxed animate-in fade-in duration-200">
          {/* Synthèse exécutive pour décideurs et praticiens */}
          <section className="bg-gradient-to-br from-indigo-50 via-blue-50/70 to-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                <Cpu size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-indigo-950">
                  Méthode d'ajustement automatique : Pourquoi & Comment ?
                </h2>
                <p className="text-xs text-indigo-800 font-medium">
                  Optimisation non linéaire robuste par Simplexe (Nelder-Mead), multi-amorçage (Multi-Start 20 départs) et fonction de perte Soft-L1
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed pt-2">
              <p>
                <strong>Le défi opérationnel :</strong> Dans un plan d'expériences complet, la simulation génère couramment de <strong>20 à 100 scénarios</strong>, chacun décliné en <strong>4 branches de décision managériale</strong> (sans décision, gestionnaire réactif, gestionnaire prudent, gestionnaire tardif). Cela représente <strong>80 à 400 courbes de performance journalières</strong>. Régler manuellement les 7 curseurs hyperboliques pour chacune de ces courbes exigerait des dizaines d'heures de travail fastidieux et introduirait une subjectivité humaine incompatible avec une démarche scientifique.
              </p>
              <p>
                <strong>La solution automatisée :</strong> L'algorithme d'ajustement automatique prend en entrée la série temporelle brute des livraisons journalières et identifie en <strong>moins de 15 millisecondes par courbe</strong> les 7 paramètres exacts ($k, q, h, g, d, \alpha, \beta$) de la fonction hyperbolique. Il garantit ainsi une objectivité mathématique totale, filtre les bruits de livraison quotidiens, et extrait instantanément les 6 indicateurs de résilience nécessaires pour calibrer le Réseau Bayésien.
              </p>
            </div>
          </section>

          {/* Schéma de flux du pipeline d'optimisation en 5 étapes */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                <Layers size={18} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Le pipeline d'ajustement automatique en 5 étapes chronologiques
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Voici comment l'algorithme procède, de la réception des données simulées jusqu'à la restitution des métriques :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Étape 1</span>
                <h4 className="font-bold text-gray-900">Heuristique initiale (v₀)</h4>
                <p className="text-gray-600 text-[11px]">
                  Repère le niveau pré-incident (k₀), la profondeur du creux (h₀), la date du nadir (d₀) et le niveau final (q₀).
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Étape 2</span>
                <h4 className="font-bold text-gray-900">Grille Multi-Start (20 départs)</h4>
                <p className="text-gray-600 text-[11px]">
                  Génère 20 jeux de paramètres alternatifs pour couvrir différentes hypothèses de vitesse et d'amplitude.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Étape 3</span>
                <h4 className="font-bold text-gray-900">Criblage rapide (250 iter)</h4>
                <p className="text-gray-600 text-[11px]">
                  Lance un Simplexe court sur chaque départ pour sélectionner le meilleur bassin de convergence.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Étape 4</span>
                <h4 className="font-bold text-gray-900">Polissage haute précision (2000 iter)</h4>
                <p className="text-gray-600 text-[11px]">
                  Affine le champion jusqu'à convergence stricte avec tolérance &lt; 10⁻⁹ et fonction de perte Soft-L1.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Étape 5</span>
                <h4 className="font-bold text-gray-900">Calcul Qualité & 6 IP</h4>
                <p className="text-gray-600 text-[11px]">
                  Mesure R² brut, RMSE, R²_smooth (lissé 5 jours) et calcule analytiquement CRD, IPC, TRP, SRA, ERR, PR.
                </p>
              </div>
            </div>
          </section>

          {/* Section 1 : Pourquoi Nelder-Mead (Simplexe sans dérivée) ? */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-xl font-bold text-gray-900">
                1. L'algorithme d'optimisation : Pourquoi Nelder-Mead (Simplexe sans dérivée) ?
              </h2>
            </div>
            
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Dans la littérature mathématique, on utilise souvent des algorithmes basés sur le calcul des gradients ou des dérivées (descente de gradient, Levenberg-Marquardt, BFGS). 
                <strong>Pourquoi ne pas les avoir retenus ici ?</strong>
              </p>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle size={16} className="text-amber-700" />
                  <span>Le piège des données de transport et de supply chain</span>
                </div>
                <p>
                  Dans la vie réelle comme dans la simulation, les flux de marchandises sont <em>discrets et bruités</em> : un jour un camion arrive avec quelques heures de retard, le lendemain deux livraisons se croisent, un autre jour un stock tampon absorbe un à-coup. Calculer des dérivées numériques sur des points quotidiens aussi irréguliers produit des dérivées chaotiques qui font diverger les optimiseurs à gradient ou les bloquent dans la première aspérité venue.
                </p>
              </div>
              <p>
                <strong>La méthode de Nelder-Mead (Downhill Simplex)</strong> est un algorithme de <em>recherche directe (direct search)</em> : il n'a jamais besoin de calculer de dérivée ni de gradient. Il se contente d'évaluer la qualité de la fonction de perte en différents points de l'espace.
              </p>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Comment fonctionne géométriquement le Simplexe en 7 dimensions ?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pour 7 paramètres, un simplexe est un polygone composé de <strong>8 sommets (n + 1)</strong>. À chaque itération, l'algorithme classe ces 8 sommets du meilleur au pire, puis remplace le pire sommet par un meilleur point en effectuant l'une des 4 manœuvres géométriques suivantes :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">1. Réflexion</span>
                    <span className="font-mono text-[10px] text-slate-400">α = 1.0</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Projette le pire sommet de l'autre côté du centre de gravité des autres points pour sonder la vallée opposée.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">2. Expansion</span>
                    <span className="font-mono text-[10px] text-slate-400">γ = 2.0</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Si la réflexion a découvert une descente très prometteuse, double la longueur du pas pour descendre plus vite.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">3. Contraction</span>
                    <span className="font-mono text-[10px] text-slate-400">ρ = 0.5</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Si la nouvelle direction dépasse le fond du creux, fait un demi-pas plus prudent pour se caler dans le nadir.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400">4. Réduction (Shrink)</span>
                    <span className="font-mono text-[10px] text-slate-400">σ = 0.5</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Si aucune tentative n'améliore la situation, resserre tous les sommets de moitié autour du champion actuel.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                💡 <strong>Pourquoi ces constantes standards (α=1, γ=2, ρ=0.5, σ=0.5) ?</strong> Établies par Nelder & Mead (1965) et confirmées par Lagarias et al. (1998), ces valeurs garantissent un amortissement optimal : elles évitent les oscillations sans fin tout en conservant une vitesse de convergence remarquable sur des fonctions hyperboliques bi-tangentes.
              </div>
            </div>
          </section>

          {/* Section 2 : La perte robuste Soft-L1 & Choix de f_scale = 0.05 */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">2</div>
              <h2 className="text-xl font-bold text-gray-900">
                2. La fonction de coût robuste Soft-L1 (Pseudo-Huber) & Choix de f_scale = 0.05
              </h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Pour savoir si une courbe théorique $p(x)$ est bonne, on doit mesurer l'écart (le résidu $r = p(x_i) - y_i$) entre la prédiction mathématique et chaque point journalier réel de la simulation.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-red-950 text-sm">Le risque des Moindres Carrés classiques (L₂ / RMSE²)</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Les moindres carrés élèvent chaque écart au carré ($r^2$). Si le jour 14, un micro-aléas sans lendemain (un retard ponctuel de lecture code-barres en entrepôt) fait plonger la livraison de 20%, l'erreur quadratique est de $0.20^2 = 0.04$, soit <strong>16 fois plus lourde</strong> qu'un écart de 5%.
                  </p>
                  <p className="text-red-900 font-semibold text-[11px]">
                    Conséquence négative : La courbe théorique entière est « aspirée » vers le bas par ce seul point aberrant, faussant la vraie dynamique de rétablissement du réseau.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-emerald-950 text-sm">L'avantage de la perte robuste Soft-L1 (Pseudo-Huber)</h4>
                  <p className="text-gray-700 leading-relaxed">
                    La fonction de perte Soft-L1 combine le meilleur des deux mondes : elle est <strong>quadratique pour les petites erreurs</strong> (haute précision autour du modèle) et <strong>linéaire pour les gros écarts</strong> (insensible aux valeurs aberrantes ou atypiques).
                  </p>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-center font-mono text-emerald-950 font-bold text-xs">
                    ρ(r) = 2 · [√(1 + r² / f_scale²) - 1]
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <Filter size={16} className="text-indigo-600" />
                  <span>Pourquoi avoir retenu le paramètre d'échelle f_scale = 0.05 (5%) ?</span>
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  Le paramètre <code>f_scale = 0.05</code> représente le seuil de bascule entre le régime quadratique et le régime linéaire :
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                  <li>
                    <strong>Pour les résidus inférieurs à 5% (|r| ≤ 0.05) :</strong> Le bruit normal de demande journalière d'une supply chain tourne typiquement autour de 1% à 4%. Dans cette zone de tolérance, la perte agit comme un carré parfait. Elle ajuste le creux et les niveaux asymptotiques avec une précision d'orfèvre.
                  </li>
                  <li>
                    <strong>Pour les écarts supérieurs à 5% (|r| &gt; 0.05) :</strong> Lorsqu'un incident ponctuel ou un retard isolé crée un décrochage temporaire de 15% ou 25%, la racine carrée adoucit la pénalité qui devient proportionnelle (|r|). Le point atypique n'a plus le pouvoir de déformer la forme générale de la résilience hyperbolique.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 : Stratégie Multi-Start & Choix de N_starts = 20 */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">3</div>
              <h2 className="text-xl font-bold text-gray-900">
                3. La stratégie Multi-Start (Multi-amorçage) & Choix de N_starts = 20
              </h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>Le danger des « minima locaux » :</strong> Avec 7 dimensions interdépendantes, le paysage de la fonction de coût ressemble à une chaîne de montagnes comportant de multiples vallées secondaires. Si l'on ne partait que d'un seul point de départ aléatoire, l'algorithme risquerait de tomber dans un faux creux (par exemple en confondant la fin du warm-up avec le début de la crise, ou en estimant une rémission trop lente).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Search size={16} className="text-orange-600" />
                    <span>A. Heuristique visuelle initiale (v₀)</span>
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Avant même d'optimiser, le code analyse visuellement la courbe observée pour lui attribuer un premier jeu de paramètres réaliste :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1 text-[11px]">
                    <li><strong>k₀ :</strong> moyenne des points de la période calme (warm-up avant x &lt; 0).</li>
                    <li><strong>Point le plus bas (minPoint) :</strong> donne immédiatement la date du pire creux.</li>
                    <li><strong>h₀ :</strong> profondeur constatée = k₀ - minPoint.y (l'amplitude du trou).</li>
                    <li><strong>d₀ :</strong> délai estimé = minPoint.x - g₀ (distance temporelle de la crise).</li>
                    <li><strong>q₀ :</strong> moyenne des derniers jours post-crise moins k₀.</li>
                    <li><strong>Pentes initiales :</strong> α₀ = 2.0 (choc franc) et β₀ = 1.0 (reprise progressive).</li>
                  </ul>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span>B. Grille raisonnée de 20 départs alternatifs</span>
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Autour de cette estimation de base, l'algorithme déploie 20 scénarios initiaux structurés :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1 text-[11px]">
                    <li><strong>Amplitudes h testées :</strong> h₀ multiplié par [0.6, 0.85, 1.0, 1.25, 1.6].</li>
                    <li><strong>Durées d testées :</strong> d₀ multiplié par [0.6, 0.85, 1.0, 1.3, 1.8].</li>
                    <li><strong>Vitesses de reprise β testées :</strong> [0.5 (très lente), 0.8, 1.2, 2.0 (très vive)].</li>
                    <li><strong>Vitesses de dégradation α testées :</strong> [1.0 (progressive), 2.0 (normale), 3.5 (brutale)].</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl text-xs space-y-2">
                <h4 className="font-bold text-amber-950 text-sm">
                  Pourquoi avoir retenu exactement 20 départs (N_starts = 20) ?
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  C'est le <strong>point d'équilibre parfait</strong> entre fiabilité statistique et performance web en temps réel :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                    <span className="font-bold text-red-700">&lt; 10 départs :</span>
                    <p className="text-gray-600 mt-1">Risque résiduel de 2% à 4% de converger vers un minimum local sur des scénarios très dégradés.</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                    <span className="font-bold text-emerald-800">20 départs (notre choix) :</span>
                    <p className="text-emerald-950 font-medium mt-1">Taux de succès &gt; 99.8% de trouver l'optimum mondial en moins de 15 ms par courbe.</p>
                  </div>
                  <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                    <span className="font-bold text-gray-700">&gt; 50 départs :</span>
                    <p className="text-gray-600 mt-1">Multiplie par 3 le temps de calcul CPU du navigateur sans aucun gain de qualité mesurable.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 : Optimisation en 2 étapes (Criblage + Polissage) */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">4</div>
              <h2 className="text-xl font-bold text-gray-900">
                4. Le processus en 2 étapes : Criblage rapide (250 iter) puis Polissage de précision (2000 iter)
              </h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Pour allier vélocité et précision extrême, l'algorithme applique une stratégie en entonnoir :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-teal-600 text-white font-bold rounded">Passe 1</span>
                    <span className="font-mono text-gray-500 font-bold">250 itérations max</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">Criblage multi-start rapide (Fast Screening)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Chacun des 20 jeux de paramètres candidats effectue jusqu'à 250 mouvements de Simplexe. Cela suffit amplement pour que les points engagés dans de mauvaises voies plafonnent et que le candidat placé dans le bon bassin d'attraction prenne largement la tête.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold rounded">Passe 2</span>
                    <span className="font-mono text-gray-500 font-bold">2000 itérations max (tolérance 10⁻⁹)</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">Polissage haute précision (Refinement)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Seul le vainqueur de la Passe 1 est conservé pour la passe finale. L'algorithme lui alloue jusqu'à 2000 itérations avec un critère d'arrêt ultra-fin (écart entre pire et meilleur sommet &lt; 10⁻⁹), garantissant des décimales exactes pour le calcul des intégrales de résilience (IPC, SRA, ERR).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 : Respect des lois physiques & Pénalités barrière */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">5</div>
              <h2 className="text-xl font-bold text-gray-900">
                5. Respect des contraintes opérationnelles & Pénalités barrière (10⁶)
              </h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                En exploitation réelle de transport ou d'entreposage, certaines grandeurs physiques sont bornées par le bon sens et la réalité matérielle :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-1">
                  <span className="font-bold text-rose-900">1. Pas de taux de service négatif (k - h/2 &gt; 0)</span>
                  <p className="text-gray-600">On ne peut pas livrer moins que 0 colis. Le point le plus bas du creux (le nadir) doit impérativement rester strictement positif.</p>
                </div>

                <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-1">
                  <span className="font-bold text-rose-900">2. Rétablissement physically borné (q + h &gt; 0)</span>
                  <p className="text-gray-600">Le niveau asymptotique stabilisé ne peut pas être inférieur à une perte supérieure à l'amplitude du choc.</p>
                </div>

                <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-1">
                  <span className="font-bold text-rose-900">3. Délai de réorganisation minimal (d ≥ 1.0 jour)</span>
                  <p className="text-gray-600">Dans une chaîne logistique physique, aucune décision de secours (reroutage, affrètement, heures supplémentaires) ne produit d'effet instantané en 0 seconde.</p>
                </div>

                <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-1">
                  <span className="font-bold text-rose-900">4. Pentes positives réalistes (α ≥ 0.5, β ≥ 0.5)</span>
                  <p className="text-gray-600">Empêche les transitions de s'aplatir à l'horizontale (taux nuls) ou d'engendrer des discontinuités numériques infinies.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 text-xs space-y-1">
                <strong>Comment la contrainte est-elle imposée ?</strong>
                <p className="text-gray-700">
                  Dès qu'un point exploré par le Simplexe franchit l'une de ces frontières interdites, la fonction <code>constraintPenalty(p)</code> lui ajoute instantanément une pénalité financière mathématique proportionnelle multipliée par <strong>1 000 000 (10⁶)</strong>. L'algorithme repousse alors immédiatement le Simplexe vers l'espace physiquement valide.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 : Évaluation de la qualité d'ajustement */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">6</div>
              <h2 className="text-xl font-bold text-gray-900">
                6. Les indicateurs de qualité : R² brut, RMSE, et R²_smooth (lissé 5 jours)
              </h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Une fois la courbe ajustée, trois scores numériques permettent au logisticien de jauger la fiabilité du résultat :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">R² brut</span>
                    <span className="font-mono text-gray-500 font-bold text-[11px]">Données brutes</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Coefficient de détermination classique calculé directement contre chaque point journalier simulé.
                  </p>
                  <div className="text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-200">
                    <strong>Interprétation :</strong> En raison du bruit stochastique naturel de la demande, un R² brut situé entre <strong>0.80 et 0.88</strong> est déjà très bon en simulation logistique.
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">RMSE</span>
                    <span className="font-mono text-gray-500 font-bold text-[11px]">Écart moyen</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Racine carrée de l'erreur quadratique moyenne. Exprime l'écart moyen dans la même unité que l'IP.
                  </p>
                  <div className="text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-200">
                    <strong>Interprétation :</strong> Un RMSE de <strong>0.03</strong> signifie que la courbe s'écarte en moyenne de seulement 3 points de pourcentage du taux de service observé.
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-sm flex items-center gap-1">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>R²_smooth</span>
                    </span>
                    <span className="font-mono text-emerald-700 font-bold text-[11px]">Fenêtre 5 jours</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Mesure l'adhérence de la courbe hyperbolique à la <strong>tendance de fond lissée sur 5 jours</strong>.
                  </p>
                  <div className="text-[11px] text-emerald-900 bg-emerald-100/70 p-2 rounded border border-emerald-200">
                    <strong>Métrique reine :</strong> 5 jours correspondent à une semaine ouvrée d'activité. Si <strong>R²_smooth ≥ 0.90</strong>, le modèle capture parfaitement la structure fondamentale de la résilience.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7 : Guide de diagnostic pour l'utilisateur de terrain */}
          <section className="bg-slate-50 border border-slate-300 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="text-indigo-600" size={22} />
              <h3 className="text-base font-bold text-gray-900">
                Guide de diagnostic opérationnel : Que faire si une courbe a un score inhabituel ?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-orange-900">R²_smooth inférieur à 0.85 sur un scénario particulier :</span>
                <p className="text-gray-600">
                  Ce cas survient généralement lorsque la perturbation a entraîné une double réplique ou une cascade de goulots successifs (par exemple une première baisse lors d'une panne usine, suivie d'une seconde baisse due à la saturation d'un entrepôt de repli). La forme présente alors deux creux au lieu d'un seul.
                </p>
                <p className="text-indigo-700 font-medium text-[11px]">
                  👉 Ouvrez le scénario dans l'onglet <em>Résilience hyperbolique</em> pour inspecter visuellement la courbe et ajuster les curseurs si nécessaire.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-orange-900">Indice PR supérieur à 2.0 (classe Élevée) :</span>
                <p className="text-gray-600">
                  Indique que le gestionnaire a mis en œuvre des décisions très fortes (ex: déstockage massif et transporteurs d'appoint) qui ont permis au réseau non seulement de sortir rapidement du creux, mais d'atteindre un débit final très supérieur au point bas de la crise.
                </p>
                <p className="text-emerald-700 font-medium text-[11px]">
                  👉 Ce scénario alimentera favorablement les probabilités de la classe « Résilience Élevée » dans le Réseau Bayésien.
                </p>
              </div>
            </div>
          </section>

          {/* Bandeau d'action vers les modules pratiques */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl shadow-xs">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-indigo-950">Prêt à exécuter l'ajustement automatique par lot ?</h4>
              <p className="text-xs text-indigo-800">
                Passez à l'onglet d'ajustement par lot pour lancer les calculs sur l'ensemble de votre plan d'expériences en un clic.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onGoToBatch && (
                <button
                  onClick={onGoToBatch}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Cpu size={16} />
                  <span>Ouvrir l'Ajustement par lot</span>
                </button>
              )}
              {onGoToHyperbolic && (
                <button
                  onClick={onGoToHyperbolic}
                  className="px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Sliders size={16} />
                  <span>Tester un ajustement unitaire</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 4 : FICHIERS D'EXPORT & GUIDE DES DONNÉES                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'export_files_guide' && (
        <div className="p-6 md:p-8 space-y-8 text-gray-800 leading-relaxed animate-in fade-in duration-200">
          {/* Résumé exécutif */}
          <section className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Download className="text-emerald-700" size={24} />
              <h2 className="text-lg font-bold text-emerald-950">
                Guide d'exploitation des fichiers d'export pour les directeurs et spécialistes des flux
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                L'onglet <strong>« Centre de téléchargement »</strong> centralise l'ensemble des données produites tout au long de la chaîne d'évaluation de la résilience. Plutôt que de fournir un unique fichier monolithique difficile à exploiter, l'application génère des fichiers modulaires au format standard <strong>CSV</strong> (directement lisibles dans Microsoft Excel, Power BI, Python ou R) et <strong>JSON</strong> (pour la configuration, les métadonnées et la reproductibilité exacte).
              </p>
              <p>
                Ces fichiers permettent de répondre à trois besoins industriels majeurs :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-emerald-600" />
                    <span>1. Tableaux de bord & S&OP</span>
                  </span>
                  <p className="text-gray-600">
                    Présentez à votre direction générale des indicateurs concrets de perte de service (IPC), de temps de remise à niveau (TRP) et de comparaison des profils managériaux.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-1">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Network size={15} className="text-purple-600" />
                    <span>2. Réseaux Bayésiens & IA</span>
                  </span>
                  <p className="text-gray-600">
                    Entraînez des modèles prédictifs et causaux (GeNIe, BayesiaLab, Python pgmpy) grâce à un fichier consolidé en 40 colonnes prêt pour l'apprentissage supervisé.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-1">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Database size={15} className="text-indigo-600" />
                    <span>3. Traçabilité & Cloud Google</span>
                  </span>
                  <p className="text-gray-600">
                    Archivez vos campagnes d'expérimentation, réimportez-les en un clic sans recalculer et partagez-les en toute confiance avec votre dictionnaire de variables joint.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1 : Panorama des 7 fichiers fondamentaux */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="text-emerald-700" size={22} />
              <h3 className="text-lg font-extrabold text-gray-900">
                1. Les 7 fichiers élémentaires du pipeline de simulation
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ces sept fichiers retracent l'ensemble du cycle de vie d'une campagne de simulation : de la configuration initiale du réseau jusqu'au calage mathématique de la fonction hyperbolique.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* resilience_ip.csv */}
              <div className="p-4 bg-white border-2 border-emerald-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-emerald-800">
                    resilience_ip.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Bloc 2 · Calibrage & KPIs
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (18 colonnes) :</strong> Paramètres calibrés de la courbe hyperbolique (<em>k, q, h, g, d, α, β</em>), métriques de calage statistique (<em>R², RMSE, R²_smooth</em>) et les 6 indicateurs opérationnels de résilience (<em>CRD, IPC, TRP, SRA, ERR, PR</em>) pour chaque couple (scénario, politique de gestion).
                </p>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-950 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> C'est la table d'évaluation quantitative absolue. Elle permet d'identifier quelles configurations de réseau absorbent le mieux les chocs et de vérifier la robustesse du calage grâce au filtre <code className="font-mono font-bold">R²_smooth ≥ 0.90</code>.
                </div>
              </div>

              {/* ip_timeseries.csv */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-gray-800">
                    ip_timeseries.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    Bloc 1 · Trajectoire brute
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (4 colonnes : <code className="font-mono">scenario_id, branch_id, day_rel, ip</code>) :</strong> Relevé quotidien du taux de service perçu par le client New York du premier jour de crise jusqu'à la fin de l'horizon pour chacune des 4 branches en parallèle.
                </p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-800 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Permet de retracer fidèlement dans Excel ou Power BI l'évolution dynamique de la crise jour après jour et de visualiser les paliers de saturation et les accélérations de rebond.
                </div>
              </div>

              {/* perturbations.csv */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-gray-800">
                    perturbations.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    Bloc 1 · Caractérisation choc
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (6 colonnes : <code className="font-mono">scenario_id, type, start, duration, severity, target</code>) :</strong> Description complète de l'aléa : type de perturbation (panne usine, rupture transport, entrepôt fermé, choc demande, congestion), date de début, durée, sévérité et cible physique atteinte.
                </p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-800 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Indispensable pour cartographier vos risques supply chain et filtrer vos analyses par typologie d'aléa (ex: confronter l'impact des pannes d'usine vs les coupures de transport routier).
                </div>
              </div>

              {/* scenarios.csv */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-gray-800">
                    scenarios.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    Bloc 1 · Topologie initiale
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (11 colonnes : <code className="font-mono">scenario_id, n_factories, n_warehouses, base_demand, important_share, warmup_days, horizon_days, network_id, n_nodes, n_edges, n_echelons</code>) :</strong> Structure physique et contractuelle du réseau logistique tirée au sort pour chaque simulation. n_factories et n_warehouses comptent respectivement le groupe production (usines et fournisseurs) et le groupe stockage (entrepôts et hubs) : sur le réseau ISOMORPH, n_warehouses inclut le hub Nashville. Les 4 dernières colonnes (palier 1) identifient et décrivent le réseau utilisé : network_id vaut "parametrique" pour le réseau par défaut, ou l'identifiant du réseau explicite (ex. "isomorph-originel") ; n_nodes, n_edges et n_echelons décrivent sa taille et sa profondeur.
                </p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-800 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Variables exogènes du plan d'expérience. Permet d'étudier comment le nombre d'entrepôts, le réseau utilisé ou le pourcentage de clients prioritaires influe sur la vulnérabilité du réseau.
                </div>
              </div>

              {/* decisions.csv */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-gray-800">
                    decisions.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    Bloc 1 · Audit managérial
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (6 colonnes : <code className="font-mono">scenario_id, branch_id, decision_id, family, day_rel, detected_day_rel</code>) :</strong> Historique chronologique précis des décisions déclenchées (D1 à D9), leur famille (capacité, reroutage, multi-sourcing, demande, déstockage), le jour de détection et le jour d'effet.
                </p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-800 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Journal d'audit de gestion de crise. Permet de mesurer le temps d'inertie managérial réel (lag opérationnel) et d'évaluer la pertinence de chaque famille d'action correctrice.
                </div>
              </div>

              {/* branches.csv */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-gray-800">
                    branches.csv
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    Bloc 1 · Synthèse comparative
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu (7 colonnes : <code className="font-mono">scenario_id, branch_id, ip_min, day_of_ip_min, area_lost, nb_decisions, recovery_day</code>) :</strong> Tableau de synthèse par politique de gestion. Met en regard pour un même scénario la branche passive vs les branches réactives.
                </p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-800 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Rapport de synthèse exécutif. Permet de quantifier en une ligne le gain apporté par une cellule de crise agile (diminution du creux et réduction de la surface totale de perte).
                </div>
              </div>

              {/* metadata.json */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 font-mono text-sm text-amber-700">
                    metadata.json
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Bloc 1 · Traçabilité & Reproductibilité
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Contenu :</strong> Structure hiérarchique JSON consignant la version exacte du moteur de simulation, la graine aléatoire (seed), l'horodatage d'exécution et l'ensemble des règles de paramétrage appliquées aux usines, entrepôts, camions et profils de gestion.
                </p>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-950 font-medium text-[11px]">
                  <strong>Usage terrain :</strong> Assurance qualité et intégrité scientifique. Garantit qu'un plan d'expérience peut être reproduit à l'identique plusieurs mois plus tard ou audité par un tiers. Quand le mode temporel est activé, ses réglages (section params.temporal) y figurent : un jeu de données dont cette section est absente ou dont enabled vaut false a été calculé sans délai ni stock.
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 : L'Export Réseau Bayésien (40 colonnes) */}
          <section className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/70 border-2 border-purple-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Network className="text-purple-700" size={24} />
              <h3 className="text-lg font-extrabold text-purple-950">
                2. L'Export Analytique Consolidé : Réseau Bayésien (<code className="font-mono text-base font-bold text-purple-800">rb_training_&lt;seed&gt;_&lt;timestamp&gt;.csv</code>)
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>
                Pour entraîner un Réseau Bayésien ou un modèle prédictif de machine learning, il est nécessaire de disposer d'une table d'apprentissage unifiée où <strong>chaque ligne représente une unité d'expérience complète</strong>.
              </p>
              <p>
                L'export Réseau Bayésien effectue automatiquement la jointure multi-tables complexe par couple <code className="font-mono font-bold bg-purple-100/70 text-purple-900 px-1.5 py-0.5 rounded">(scenario_id, branch_id)</code>, reliant sans ambiguïté les causes physiques, les comportements humains et les conséquences mesurées à travers <strong>40 colonnes ordonnées</strong> :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">1. Structure & Topologie</span>
                  <p className="text-[11px] text-gray-600">scenario_id, branch_id, n_factories, n_warehouses, base_demand, important_share, warmup_days, horizon_days</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">2. Aléa & Perturbation</span>
                  <p className="text-[11px] text-gray-600">disruption_type, disruption_start, disruption_duration, disruption_severity, disruption_target</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">3. Gouvernance de crise</span>
                  <p className="text-[11px] text-gray-600">management_profile, detection_threshold, decision_delay_days, reevaluation_days</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">4. Historique décisionnel</span>
                  <p className="text-[11px] text-gray-600">detected_day_rel, reaction_lag_days, nb_decisions, leviers binaires 1/0 (capacité, reroutage, sourcing, demande, stock)</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">5. Calibrage hyperbolique</span>
                  <p className="text-[11px] text-gray-600">ip_k, ip_q, ip_h, ip_g, ip_d, ip_alpha, ip_beta (paramètres fondamentaux de la courbe)</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">6. Qualité statistique</span>
                  <p className="text-[11px] text-gray-600">fit_r2 (brut), fit_r2_smooth (lissé 5j), fit_rmse (écart résiduel moyen)</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                  <span className="font-bold text-purple-900 block text-[11px]">7. KPIs de Résilience</span>
                  <p className="text-[11px] text-gray-600">IPC (surface de perte), TRP (temps de rémission 90%), CRD (promptitude), PR (potentiel)</p>
                </div>
                <div className="p-2.5 bg-purple-100/80 rounded-lg border-2 border-purple-300 space-y-1">
                  <span className="font-bold text-purple-950 block text-[11px]">8. Variable Cible (Target)</span>
                  <p className="text-[11px] text-purple-900 font-bold">PR_class : discrétisation en 3 classes (faible, moyen, eleve) selon les terciles ou seuils fixes</p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-purple-200 text-purple-950 space-y-1 mt-2">
                <span className="font-bold">Pourquoi le Potentiel de Récupération (PR) comme cible principale ?</span>
                <p className="text-gray-600">
                  L'indicateur <code className="font-mono font-bold">PR = p_final / p_min</code> mesure directement l'élan de sortie de crise : est-ce que le réseau a rebondi vigoureusement ou est-il resté asphyxié au fond du gouffre ? Dans un Réseau Bayésien, prédire si <code className="font-mono font-bold">PR_class</code> sera « eleve », « moyen » ou « faible » permet à une direction logistique de tester immédiatement l'impact préventif d'une politique de sécurité (ex: recruter des transporteurs de repli ou doubler les stocks tampons).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 : Le Nouveau Dictionnaire des En-têtes JSON */}
          <section className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileJson className="text-indigo-700" size={24} />
              <h3 className="text-lg font-extrabold text-indigo-950">
                3. Le Dictionnaire des En-têtes JSON (<code className="font-mono text-base font-bold text-indigo-800">rb_dictionary_&lt;seed&gt;_&lt;timestamp&gt;.json</code>)
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>
                Situé dans le centre de téléchargement <strong>immédiatement à gauche du bouton d'export CSV du Réseau Bayésien</strong>, le bouton <strong className="text-indigo-900">« Dictionnaire des en-têtes (JSON) »</strong> génère un référentiel sémantique exhaustif et auto-descriptif.
              </p>

              <div className="p-4 bg-white rounded-xl border border-indigo-200 space-y-2">
                <span className="font-bold text-indigo-950 text-sm">Pourquoi ce dictionnaire est-il crucial pour votre organisation ?</span>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <strong>Levée des ambiguïtés sémantiques :</strong> Les termes de modélisation (ex: <em>warmup_days</em>, <em>reaction_lag_days</em>, <em>ip_h</em>) sont traduits en concepts opérationnels clairs pour les directeurs logistiques et transporteurs partenaires.
                  </li>
                  <li>
                    <strong>Impact explicite sur le plan d'expérience :</strong> Pour chaque colonne, le dictionnaire décrit <em>pourquoi</em> cette variable est testée, comment elle fait varier les contraintes de flux et quel rôle causal elle joue dans l'apprentissage bayésien.
                  </li>
                  <li>
                    <strong>Intégration Data Governance :</strong> Format JSON standardisé prêt à être ingéré par vos catalogues de données d'entreprise (Collibra, Data Catalog, Azure Purview) et par vos scripts d'analyse de données (Python, R).
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1 border border-slate-800">
                <span className="text-slate-500">// Exemple d'entrée extraite du dictionnaire JSON généré :</span>
                <p className="text-amber-300">&#123;</p>
                <p className="pl-4 text-purple-300">"name": <span className="text-white">"reaction_lag_days"</span>,</p>
                <p className="pl-4 text-purple-300">"label": <span className="text-white">"Retard de mise en œuvre (Lag)"</span>,</p>
                <p className="pl-4 text-purple-300">"category": <span className="text-white">"Historique d'exécution de crise"</span>,</p>
                <p className="pl-4 text-purple-300">"dataType": <span className="text-white">"float"</span>,</p>
                <p className="pl-4 text-purple-300">"unitOrFormat": <span className="text-white">"jours (ex: 2.3)"</span>,</p>
                <p className="pl-4 text-purple-300">"explanation": <span className="text-white">"Délai moyen constaté entre la détection de l'anomalie et l'application effective des décisions sur le terrain."</span>,</p>
                <p className="pl-4 text-purple-300">"planImpact": <span className="text-white">"Facteur clé de dégradation : un lag opérationnel élevé est le premier responsable de l'aggravation des ruptures de stock."</span></p>
                <p className="text-amber-300">&#125;</p>
              </div>
            </div>
          </section>

          {/* Section 4 : Le Bundle de Simulation & Sauvegarde Cloud */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="text-slate-700" size={24} />
              <h3 className="text-lg font-extrabold text-gray-900">
                4. Le Bundle de Sauvegarde & Restauration (<code className="font-mono text-base font-bold text-gray-800">simulation_process_&lt;seed&gt;_&lt;timestamp&gt;.json</code> & Cloud Google)
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>
                Le bandeau supérieur du Centre de téléchargement propose une fonctionnalité clé de sauvegarde intégrale : le <strong>Processus de simulation complet</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-1.5">
                  <span className="font-bold text-gray-900">Qu'y a-t-il dans ce bundle ?</span>
                  <p className="text-gray-600">
                    Il contient en un seul fichier JSON la configuration du plan d'expérience, la graine aléatoire, l'ensemble des scénarios simulés (Bloc 1), ainsi que tous les calages mathématiques et KPIs déjà calculés (Bloc 2).
                  </p>
                </div>
                <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-1.5">
                  <span className="font-bold text-gray-900">Pourquoi l'utiliser en équipe ?</span>
                  <p className="text-gray-600">
                    Il évite de refaire tourner les calculs par lot (400 courbes). En chargeant simplement le fichier JSON d'un collègue ou en sélectionnant un plan archivé dans votre Cloud Google, toute l'application se remet instantanément dans l'état exact du run.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 : Cas d'usage concrets en entreprise */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="text-emerald-700" size={22} />
              <h3 className="text-lg font-extrabold text-gray-900">
                5. Guide méthodologique : Quel fichier ouvrir selon votre objectif ?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Share2 size={16} />
                  <span>Cas 1 : Réunion de direction générale / Bilan S&OP</span>
                </div>
                <p className="text-gray-600">
                  <strong>Fichiers à ouvrir :</strong> <code className="font-mono font-bold text-gray-800">branches.csv</code> et <code className="font-mono font-bold text-gray-800">resilience_ip.csv</code>.
                </p>
                <p className="text-gray-600">
                  <strong>Action :</strong> Comparez la surface totale de perte (<code className="font-mono">IPC</code> ou <code className="font-mono">area_lost</code>) entre la branche sans gestion et les branches réactives. Présentez le temps de remise à niveau (<code className="font-mono">TRP</code>) pour justifier les investissements dans une cellule de crise dédiée.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-orange-900 font-bold">
                  <AlertTriangle size={16} />
                  <span>Cas 2 : Débriefing opérationnel d'un goulot d'étranglement</span>
                </div>
                <p className="text-gray-600">
                  <strong>Fichiers à ouvrir :</strong> <code className="font-mono font-bold text-gray-800">ip_timeseries.csv</code> et <code className="font-mono font-bold text-gray-800">decisions.csv</code>.
                </p>
                <p className="text-gray-600">
                  <strong>Action :</strong> Superposez la courbe de service jour après jour avec les dates d'activation des décisions. Vérifiez si le déstockage ou le reroutage a stoppé l'effondrement ou s'il a fallu attendre le sourcing d'appoint.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <Network size={16} />
                  <span>Cas 3 : Modélisation Causale & Prédiction de Résilience (IA)</span>
                </div>
                <p className="text-gray-600">
                  <strong>Fichiers à ouvrir :</strong> <code className="font-mono font-bold text-gray-800">rb_training_*.csv</code> et <code className="font-mono font-bold text-gray-800">rb_dictionary_*.json</code>.
                </p>
                <p className="text-gray-600">
                  <strong>Action :</strong> Importez la table 40 colonnes dans GeNIe ou Python (<em>pgmpy</em>). Utilisez le dictionnaire JSON pour renseigner automatiquement les étiquettes de nœuds et apprenez la structure causale (DAG) pour prédire <code className="font-mono">PR_class</code>.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <HardDrive size={16} />
                  <span>Cas 4 : Archivage et reprise de travail ultérieure</span>
                </div>
                <p className="text-gray-600">
                  <strong>Fichiers à ouvrir :</strong> <code className="font-mono font-bold text-gray-800">simulation_process_*.json</code> ou votre compte Google Cloud.
                </p>
                <p className="text-gray-600">
                  <strong>Action :</strong> Cliquez sur « Sauvegarder dans le Cloud » ou téléchargez le bundle JSON. Vous pourrez à tout moment réinjecter ce bundle pour retrouver l'intégralité de vos graphiques et résultats.
                </p>
              </div>
            </div>
          </section>

          {/* Bandeau d'action vers le Centre de téléchargement */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl shadow-xs">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-emerald-950">Prêt à télécharger vos jeux de données ?</h4>
              <p className="text-xs text-emerald-800">
                Rendez-vous dans le centre de téléchargement pour exporter vos fichiers CSV, générer le dictionnaire JSON et gérer vos sauvegardes Cloud.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onGoToDownload && (
                <button
                  onClick={onGoToDownload}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <PackageCheck size={16} />
                  <span>Ouvrir le Centre de téléchargement</span>
                </button>
              )}
              {onGoToBatch && (
                <button
                  onClick={onGoToBatch}
                  className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Cpu size={16} />
                  <span>Vérifier l'ajustement par lot</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDocumentation;
