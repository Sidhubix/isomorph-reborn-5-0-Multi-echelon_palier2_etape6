import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { ScenarioDataset, SimulationProcessBundle } from './bloc1Types';
import { assertFirestoreDocSize, networkSizeHint } from './bloc1FirestoreLimits';

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Client Firestore hors-ligne ou configuration vérifiée.");
    }
    return false;
  }
}

// Authentification Google
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Synchronisation du profil utilisateur
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    return user;
  } catch (error: any) {
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      console.warn('Fenêtre de connexion Google fermée ou requête annulée.');
      return null;
    }
    console.error('Erreur connexion Google:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Synchronisation des paramètres & options
export async function syncUserSettings(userId: string, data: {
  manualParams?: any;
  generatorConfig?: any;
  selectedProfile?: string;
}) {
  const path = `users/${userId}/settings/current`;
  try {
    const cleanData: any = {
      userId,
      updatedAt: new Date().toISOString()
    };
    if (data.manualParams !== undefined) cleanData.manualParams = data.manualParams;
    if (data.generatorConfig !== undefined) cleanData.generatorConfig = data.generatorConfig;
    if (data.selectedProfile !== undefined) cleanData.selectedProfile = data.selectedProfile;

    const ref = doc(db, 'users', userId, 'settings', 'current');
    await setDoc(ref, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserSettings(userId: string) {
  const path = `users/${userId}/settings/current`;
  try {
    const ref = doc(db, 'users', userId, 'settings', 'current');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Synchronisation des jeux de scénarios (Bloc 1)
export async function saveUserDatasetToCloud(userId: string, dataset: ScenarioDataset, name?: string) {
  const nSc = dataset.scenarios?.length || dataset.metadata?.config?.nScenarios || 0;
  const totalDays = (dataset.metadata?.config?.warmupDays ?? 10) + (dataset.metadata?.config?.horizonDays ?? 60);
  const nPts = dataset.ipTimeseries?.length || (nSc * 4 * totalDays);
  const scPtsTag = `${nSc}Sc-${nPts}Pts`;
  const datasetId = `ds_${scPtsTag}_${Date.now()}`;
  const path = `users/${userId}/datasets/${datasetId}`;
  try {
    const ref = doc(db, 'users', userId, 'datasets', datasetId);
    const config = dataset.metadata?.config;

    // Construction d'un payload respectant strictement la limite Firestore (1 MiB max par document)
    const fullJson = JSON.stringify(dataset);
    let safeDataJson: string | null = null;

    if (fullJson.length <= 500000) {
      // Le jeu de données complet est suffisamment léger
      safeDataJson = fullJson;
    } else {
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

    const payload: any = {
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
    assertFirestoreDocSize(payload, `Sauvegarde Cloud du jeu de données "${payload.name}"`, networkSizeHint(config));

    await setDoc(ref, payload);
    return datasetId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function fetchUserDatasetsFromCloud(userId: string) {
  const path = `users/${userId}/datasets`;
  try {
    const ref = collection(db, 'users', userId, 'datasets');
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteUserDatasetFromCloud(userId: string, datasetId: string) {
  const path = `users/${userId}/datasets/${datasetId}`;
  try {
    const ref = doc(db, 'users', userId, 'datasets', datasetId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ============================================================================
// Gestion Cloud des Processus de Simulation (Paramètres, Chocs, Résultats & KPIs)
// ============================================================================
export async function saveSimulationProcessToCloud(userId: string, bundle: SimulationProcessBundle): Promise<string> {
  const nSc = bundle.summary?.nScenarios || bundle.config?.nScenarios || bundle.compactDataset?.scenarios?.length || 0;
  const totalDays = (bundle.summary?.warmupDays ?? bundle.config?.warmupDays ?? 10) + (bundle.summary?.horizonDays ?? bundle.config?.horizonDays ?? 60);
  const nPts = (bundle.summary as any)?.nPoints || (nSc * 4 * totalDays);
  const scPtsTag = `${nSc}Sc-${nPts}Pts`;
  const processId = bundle.id || `proc_${scPtsTag}_${Date.now()}`;
  const path = `users/${userId}/processes/${processId}`;
  try {
    const ref = doc(db, 'users', userId, 'processes', processId);
    const payload = {
      processId,
      userId,
      name: bundle.name || `Plan d'expérience ${scPtsTag} [seed: ${bundle.summary?.seed ?? bundle.config?.seed ?? 42}] - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      version: bundle.version || '1.0.0',
      createdAt: bundle.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: {
        ...bundle.summary,
        nPoints: (bundle.summary as any)?.nPoints || nPts,
      },
      config: bundle.config,
      resilienceRows: bundle.resilienceRows || [],
      resilienceCsv: bundle.resilienceCsv || '',
      compactDataset: bundle.compactDataset || null,
    };

    // Même garde que pour un jeu de données : échec explicite avant l'écriture
    // plutôt que silencieux. N'affecte pas la génération locale.
    assertFirestoreDocSize(payload, `Sauvegarde Cloud du plan d'expérience "${payload.name}"`, networkSizeHint(bundle.config));

    await setDoc(ref, payload);
    return processId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function fetchSimulationProcessesFromCloud(userId: string): Promise<SimulationProcessBundle[]> {
  const path = `users/${userId}/processes`;
  try {
    const ref = collection(db, 'users', userId, 'processes');
    const snap = await getDocs(ref);
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
      } as SimulationProcessBundle;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteSimulationProcessFromCloud(userId: string, processId: string): Promise<void> {
  const path = `users/${userId}/processes/${processId}`;
  try {
    const ref = doc(db, 'users', userId, 'processes', processId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

