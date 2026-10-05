import React, { useState, useEffect } from 'react';
import {
  LogOut, Cloud, CloudCheck, RefreshCw,
  CheckCircle2, AlertCircle, Save, Trash2
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth, signInWithGoogle, signOutUser, syncUserSettings,
  fetchUserSettings, saveUserDatasetToCloud, fetchUserDatasetsFromCloud,
  deleteUserDatasetFromCloud
} from './firebase';
import { ScenarioDataset } from './bloc1Types';
import { generateExperimentPlan } from './bloc1ExperimentPlan';

interface UserAuthSyncProps {
  currentParams: any;
  onRestoreParams?: (params: any) => void;
  currentDataset?: ScenarioDataset | null;
  onRestoreDataset?: (dataset: ScenarioDataset) => void;
}

export const UserAuthSync: React.FC<UserAuthSyncProps> = ({
  currentParams,
  onRestoreParams,
  currentDataset,
  onRestoreDataset
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [savedDatasets, setSavedDatasets] = useState<any[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Écoute de l'état d'authentification Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // Charger les paramètres de l'utilisateur
        try {
          const settings = await fetchUserSettings(currentUser.uid);
          if (settings && settings.manualParams && onRestoreParams) {
            onRestoreParams(settings.manualParams);
            setNotification('Vos paramètres Cloud ont été synchronisés avec succès.');
            setTimeout(() => setNotification(null), 4000);
          }
          loadDatasets(currentUser.uid);
        } catch (e: any) {
          console.warn('Erreur chargement paramètres cloud:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadDatasets = async (uid: string) => {
    setLoadingDatasets(true);
    try {
      const list = await fetchUserDatasetsFromCloud(uid);
      setSavedDatasets(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setNotification('Connexion Google réussie !');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: any) {
      setSyncError('Échec de connexion Google');
      setTimeout(() => setSyncError(null), 4000);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setIsMenuOpen(false);
      setNotification('Déconnexion effectuée.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncUserSettings(user.uid, {
        manualParams: currentParams,
      });

      if (currentDataset) {
        await saveUserDatasetToCloud(user.uid, currentDataset);
        await loadDatasets(user.uid);
      }

      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setNotification('Paramètres & données synchronisés dans le Cloud.');
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      // Message explicite pour un document trop volumineux pour Firestore
      // (voir bloc1FirestoreLimits.ts), message générique sinon.
      setSyncError(err?.name === 'FirestoreDocumentTooLargeError' ? err.message : 'Erreur de synchronisation Cloud');
      setTimeout(() => setSyncError(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreCloudDataset = (dsItem: any) => {
    try {
      if (dsItem.config) {
        const regenerated = generateExperimentPlan(dsItem.config);
        if (onRestoreDataset) {
          onRestoreDataset(regenerated);
          setNotification(`Jeu "${dsItem.name}" restauré avec succès.`);
          setTimeout(() => setNotification(null), 3000);
        }
        return;
      }
      if (dsItem.dataJson) {
        const parsed = JSON.parse(dsItem.dataJson);
        if (parsed.metadata?.config) {
          const regenerated = generateExperimentPlan(parsed.metadata.config);
          if (onRestoreDataset) {
            onRestoreDataset(regenerated);
            setNotification(`Jeu "${dsItem.name}" restauré avec succès.`);
            setTimeout(() => setNotification(null), 3000);
          }
          return;
        }
        if (onRestoreDataset) {
          onRestoreDataset(parsed);
          setNotification(`Jeu "${dsItem.name}" restauré.`);
          setTimeout(() => setNotification(null), 3000);
        }
        return;
      }
    } catch (e) {
      console.error('Erreur restauration jeu cloud:', e);
      setSyncError('Impossible de charger ce jeu de données');
    }
  };

  const handleDeleteCloudDataset = async (datasetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteUserDatasetFromCloud(user.uid, datasetId);
      await loadDatasets(user.uid);
      setNotification('Simulation supprimée du Cloud.');
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      setSyncError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/80 bg-white/10 px-3 py-1.5 rounded-lg">
        <RefreshCw size={14} className="animate-spin text-white" />
        <span>Vérification du compte...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {syncError && (
        <div className="fixed top-4 right-4 z-50 bg-red-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={16} className="text-red-300 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {!user ? (
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-3 py-2 bg-white text-gray-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed border border-gray-300 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          title="Se connecter avec un compte Google pour sauvegarder et synchroniser vos paramètres"
        >
          {isLoggingIn ? (
            <RefreshCw size={14} className="animate-spin text-gray-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{isLoggingIn ? 'Connexion en cours...' : 'Connexion Google / Gmail'}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* Bouton de synchronisation immédiate */}
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/30"
            title="Synchroniser vos paramètres et jeux de données avec votre compte Cloud"
          >
            {syncing ? (
              <RefreshCw size={13} className="animate-spin text-white" />
            ) : (
              <Cloud size={13} className="text-white" />
            )}
            <span className="hidden sm:inline">{syncing ? 'Synchro...' : 'Synchroniser'}</span>
          </button>

          {/* Profil utilisateur & Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white px-2.5 py-1 rounded-lg text-xs transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utilisateur'}
                  className="w-6 h-6 rounded-full border border-white/60 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="text-left hidden md:block max-w-[120px] truncate">
                <div className="font-bold text-[11px] truncate leading-tight">
                  {user.displayName || user.email?.split('@')[0]}
                </div>
                <div className="text-[9px] text-emerald-200 flex items-center gap-1 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Synchronisé</span>
                </div>
              </div>
            </button>

            {/* Menu Déroulant Cloud & Profil */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 z-50 p-4 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || ''}
                      className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-bold text-sm text-gray-900 truncate">
                      {user.displayName || 'Compte Google'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold uppercase tracking-wider text-[10px]">Statut Cloud Firestore</span>
                    {lastSyncTime ? (
                      <span className="text-emerald-700 font-semibold">Dernière synchro : {lastSyncTime}</span>
                    ) : (
                      <span className="text-gray-400">Actif</span>
                    )}
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                    <CloudCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Synchronisation Cloud activée</p>
                      <p className="text-[11px] text-emerald-700">
                        Vos 7 paramètres, options du modèle et simulations sont automatiquement reliés à votre compte.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulations sauvegardées dans le Cloud */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Simulations dans le Cloud</span>
                    <span className="text-[10px] text-gray-400 font-bold">{savedDatasets.length} enregistrée(s)</span>
                  </div>

                  {loadingDatasets ? (
                    <div className="text-center py-2 text-xs text-gray-400">Chargement...</div>
                  ) : savedDatasets.length === 0 ? (
                    <p className="text-xs text-gray-400 italic bg-gray-50 p-2.5 rounded-lg text-center">
                      Aucune simulation enregistrée. Cliquez sur "Synchroniser" pour sauvegarder la simulation active.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {savedDatasets.map((ds) => (
                        <div
                          key={ds.datasetId}
                          onClick={() => handleRestoreCloudDataset(ds)}
                          className="p-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-xs cursor-pointer flex items-center justify-between group transition-all"
                        >
                          <div className="truncate pr-2">
                            <p className="font-bold text-gray-800 group-hover:text-indigo-900 truncate">
                              {ds.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {ds.scenariosCount} scénarios {ds.pointsCount ? `(${ds.pointsCount} pts) ` : ''}• {new Date(ds.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCloudDataset(ds.datasetId, e)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="Supprimer du Cloud"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Save size={13} />
                    <span>Sauvegarder l'état</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
