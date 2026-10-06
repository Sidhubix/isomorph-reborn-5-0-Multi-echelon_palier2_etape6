"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationType = exports.auth = exports.db = void 0;
exports.handleFirestoreError = handleFirestoreError;
exports.testFirestoreConnection = testFirestoreConnection;
exports.signInWithGoogle = signInWithGoogle;
exports.signOutUser = signOutUser;
exports.syncUserSettings = syncUserSettings;
exports.fetchUserSettings = fetchUserSettings;
exports.saveUserDatasetToCloud = saveUserDatasetToCloud;
exports.fetchUserDatasetsFromCloud = fetchUserDatasetsFromCloud;
exports.deleteUserDatasetFromCloud = deleteUserDatasetFromCloud;
exports.saveSimulationProcessToCloud = saveSimulationProcessToCloud;
exports.fetchSimulationProcessesFromCloud = fetchSimulationProcessesFromCloud;
exports.deleteSimulationProcessFromCloud = deleteSimulationProcessFromCloud;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const firebase_applet_config_json_1 = __importDefault(require("./firebase-applet-config.json"));
const bloc1FirestoreLimits_1 = require("./bloc1FirestoreLimits");
// Initialisation Firebase
const app = (0, app_1.initializeApp)(firebase_applet_config_json_1.default);
exports.db = (0, firestore_1.getFirestore)(app, firebase_applet_config_json_1.default.firestoreDatabaseId);
exports.auth = (0, auth_1.getAuth)(app);
const googleProvider = new auth_1.GoogleAuthProvider();
var OperationType;
(function (OperationType) {
    OperationType["CREATE"] = "create";
    OperationType["UPDATE"] = "update";
    OperationType["DELETE"] = "delete";
    OperationType["LIST"] = "list";
    OperationType["GET"] = "get";
    OperationType["WRITE"] = "write";
})(OperationType || (exports.OperationType = OperationType = {}));
function handleFirestoreError(error, operationType, path) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: exports.auth.currentUser?.uid,
            email: exports.auth.currentUser?.email,
            emailVerified: exports.auth.currentUser?.emailVerified,
            isAnonymous: exports.auth.currentUser?.isAnonymous,
            tenantId: exports.auth.currentUser?.tenantId,
            providerInfo: exports.auth.currentUser?.providerData?.map(provider => ({
                providerId: provider.providerId,
                email: provider.email,
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
}
// Test de connexion initial
async function testFirestoreConnection() {
    try {
        await (0, firestore_1.getDocFromServer)((0, firestore_1.doc)(exports.db, 'test', 'connection'));
        return true;
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.warn("Client Firestore hors-ligne ou configuration vérifiée.");
        }
        return false;
    }
}
// Authentification Google
async function signInWithGoogle() {
    try {
        const result = await (0, auth_1.signInWithPopup)(exports.auth, googleProvider);
        const user = result.user;
        // Synchronisation du profil utilisateur
        const userRef = (0, firestore_1.doc)(exports.db, 'users', user.uid);
        try {
            await (0, firestore_1.setDoc)(userRef, {
                userId: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            }, { merge: true });
        }
        catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
        return user;
    }
    catch (error) {
        if (error?.code === 'auth/cancelled-popup-request' ||
            error?.code === 'auth/popup-closed-by-user') {
            console.warn('Fenêtre de connexion Google fermée ou requête annulée.');
            return null;
        }
        console.error('Erreur connexion Google:', error);
        throw error;
    }
}
async function signOutUser() {
    await (0, auth_1.signOut)(exports.auth);
}
// Synchronisation des paramètres & options
async function syncUserSettings(userId, data) {
    const path = `users/${userId}/settings/current`;
    try {
        const cleanData = {
            userId,
            updatedAt: new Date().toISOString()
        };
        if (data.manualParams !== undefined)
            cleanData.manualParams = data.manualParams;
        if (data.generatorConfig !== undefined)
            cleanData.generatorConfig = data.generatorConfig;
        if (data.selectedProfile !== undefined)
            cleanData.selectedProfile = data.selectedProfile;
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'settings', 'current');
        await (0, firestore_1.setDoc)(ref, cleanData, { merge: true });
    }
    catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
    }
}
async function fetchUserSettings(userId) {
    const path = `users/${userId}/settings/current`;
    try {
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'settings', 'current');
        const snap = await (0, firestore_1.getDoc)(ref);
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    }
    catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
    }
}
// Synchronisation des jeux de scénarios (Bloc 1)
async function saveUserDatasetToCloud(userId, dataset, name) {
    const nSc = dataset.scenarios?.length || dataset.metadata?.config?.nScenarios || 0;
    const totalDays = (dataset.metadata?.config?.warmupDays ?? 10) + (dataset.metadata?.config?.horizonDays ?? 60);
    const nPts = dataset.ipTimeseries?.length || (nSc * 4 * totalDays);
    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
    const datasetId = `ds_${scPtsTag}_${Date.now()}`;
    const path = `users/${userId}/datasets/${datasetId}`;
    try {
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'datasets', datasetId);
        const config = dataset.metadata?.config;
        // Construction d'un payload respectant strictement la limite Firestore (1 MiB max par document)
        const fullJson = JSON.stringify(dataset);
        let safeDataJson = null;
        if (fullJson.length <= 500000) {
            // Le jeu de données complet est suffisamment léger
            safeDataJson = fullJson;
        }
        else {
            // Le jeu de données est volumineux (ex: milliers de points temporels ipTimeseries pouvant atteindre 11+ Mo).
            // On sauvegarde la structure essentielle (scénarios, perturbations, branches, décisions, métadonnées)
            // et la configuration d'expérience (qui permet une reconstruction déterministe intégrale et instantanée).
            const compactDataset = {
                scenarios: dataset.scenarios || [],
                perturbations: dataset.perturbations || [],
                decisions: dataset.decisions || [],
                branches: dataset.branches || [],
                metadata: dataset.metadata,
            };
            const compactJson = JSON.stringify(compactDataset);
            if (compactJson.length <= 600000) {
                safeDataJson = compactJson;
            }
        }
        const payload = {
            datasetId,
            userId,
            name: name || `Simulation ${scPtsTag} ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
            scenariosCount: nSc,
            pointsCount: nPts,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (config) {
            payload.config = config;
        }
        if (safeDataJson) {
            payload.dataJson = safeDataJson;
        }
        // Vérifie la taille avant l'écriture : un document trop grand est refusé
        // avec un message explicite plutôt que de laisser Firestore échouer sans
        // que l'utilisateur comprenne pourquoi. N'affecte pas la génération locale.
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)(payload, `Sauvegarde Cloud du jeu de données "${payload.name}"`, (0, bloc1FirestoreLimits_1.networkSizeHint)(config));
        await (0, firestore_1.setDoc)(ref, payload);
        return datasetId;
    }
    catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
        throw err;
    }
}
async function fetchUserDatasetsFromCloud(userId) {
    const path = `users/${userId}/datasets`;
    try {
        const ref = (0, firestore_1.collection)(exports.db, 'users', userId, 'datasets');
        const snap = await (0, firestore_1.getDocs)(ref);
        return snap.docs.map(d => d.data());
    }
    catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
    }
}
async function deleteUserDatasetFromCloud(userId, datasetId) {
    const path = `users/${userId}/datasets/${datasetId}`;
    try {
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'datasets', datasetId);
        await (0, firestore_1.deleteDoc)(ref);
    }
    catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
    }
}
// ============================================================================
// Gestion Cloud des Processus de Simulation (Paramètres, Chocs, Résultats & KPIs)
// ============================================================================
async function saveSimulationProcessToCloud(userId, bundle) {
    const nSc = bundle.summary?.nScenarios || bundle.config?.nScenarios || bundle.compactDataset?.scenarios?.length || 0;
    const totalDays = (bundle.summary?.warmupDays ?? bundle.config?.warmupDays ?? 10) + (bundle.summary?.horizonDays ?? bundle.config?.horizonDays ?? 60);
    const nPts = bundle.summary?.nPoints || (nSc * 4 * totalDays);
    const scPtsTag = `${nSc}Sc-${nPts}Pts`;
    const processId = bundle.id || `proc_${scPtsTag}_${Date.now()}`;
    const path = `users/${userId}/processes/${processId}`;
    try {
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'processes', processId);
        const payload = {
            processId,
            userId,
            name: bundle.name || `Plan d'expérience ${scPtsTag} [seed: ${bundle.summary?.seed ?? bundle.config?.seed ?? 42}] - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
            version: bundle.version || '1.0.0',
            createdAt: bundle.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            summary: {
                ...bundle.summary,
                nPoints: bundle.summary?.nPoints || nPts,
            },
            config: bundle.config,
            resilienceRows: bundle.resilienceRows || [],
            resilienceCsv: bundle.resilienceCsv || '',
            compactDataset: bundle.compactDataset || null,
        };
        // Même garde que pour un jeu de données : échec explicite avant l'écriture
        // plutôt que silencieux. N'affecte pas la génération locale.
        (0, bloc1FirestoreLimits_1.assertFirestoreDocSize)(payload, `Sauvegarde Cloud du plan d'expérience "${payload.name}"`, (0, bloc1FirestoreLimits_1.networkSizeHint)(bundle.config));
        await (0, firestore_1.setDoc)(ref, payload);
        return processId;
    }
    catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
        throw err;
    }
}
async function fetchSimulationProcessesFromCloud(userId) {
    const path = `users/${userId}/processes`;
    try {
        const ref = (0, firestore_1.collection)(exports.db, 'users', userId, 'processes');
        const snap = await (0, firestore_1.getDocs)(ref);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: data.processId || d.id,
                name: data.name,
                version: data.version || '1.0.0',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                summary: data.summary,
                config: data.config,
                compactDataset: data.compactDataset,
                resilienceRows: data.resilienceRows || [],
                resilienceCsv: data.resilienceCsv || '',
            };
        });
    }
    catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
        return [];
    }
}
async function deleteSimulationProcessFromCloud(userId, processId) {
    const path = `users/${userId}/processes/${processId}`;
    try {
        const ref = (0, firestore_1.doc)(exports.db, 'users', userId, 'processes', processId);
        await (0, firestore_1.deleteDoc)(ref);
    }
    catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
        throw err;
    }
}
