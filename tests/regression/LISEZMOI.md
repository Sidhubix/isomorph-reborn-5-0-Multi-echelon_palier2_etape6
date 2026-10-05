# Tests de non-régression (palier 1)

Commande à lancer depuis la racine du projet, après npm install :

npm run test:regression

Elle compile le moteur avec tsconfig.regression.json dans le dossier .regression-build, puis compare les sorties régénérées aux fichiers de référence du dossier fixtures, octet par octet.

Les références ont été produites une seule fois, avec le code d'origine de la version 4.2, par npm run test:regression:generate. Cette commande refuse d'écraser un dossier fixtures existant.

Contenu de fixtures : 7 cas de plan d'expériences (C1 à C7), les paramètres du potentiomètre à 0, 25, 50, 75 et 100 %, et l'oracle du flot (10 000 états journaliers du réseau par défaut avec leur débit exact). Seul le champ generated_at est exclu des comparaisons JSON.

## Références de fin de palier 1 (palier 2, étape 1)

Le dossier fixtures_p1final contient les sorties complètes produites par le code livré en palier1_etape7 (réseau par défaut, ISOMORPH prédéfini, ISOMORPH à arcs fixes, réseau importé multi-échelon), y compris les 11 colonnes de scenarios.csv et metadata.json en version 1.2.0. Elles ont été produites une seule fois par :

node .regression-build/tests/regression/regression.js generate-p1final

(après compilation par npm run test:regression). Cette commande refuse d'écraser un dossier existant. La vérification est incluse dans npm run test:regression : tant que le mode temporel du palier 2 est désactivé, ces sorties doivent rester identiques octet pour octet (seul generated_at est exclu).
