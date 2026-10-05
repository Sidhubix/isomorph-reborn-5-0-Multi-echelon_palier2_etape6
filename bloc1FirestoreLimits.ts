// ============================================================================
// ISOMORPH-Reborn — Garde de taille des documents Firestore (palier 1).
//
// Un réseau explicite (ISOMORPH ou importé) est recopié dans la configuration
// du plan, donc dans les documents Cloud (jeu de données et bundle). Un réseau
// importé volumineux peut dépasser la limite Firestore d'un document (1 MiB).
// Ce module vérifie la taille avant l'écriture et échoue avec un message
// explicite plutôt que de laisser Firestore le refuser silencieusement pour
// l'utilisateur (l'appelant doit afficher l'erreur, jamais l'avaler).
//
// Pure : aucune dépendance au SDK Firebase, pour rester testable sans lui.
// N'affecte en rien la génération ou l'export locaux, qui ne passent pas ici.
// ============================================================================

export const FIRESTORE_MAX_DOC_BYTES = 1_048_576; // limite Firestore par document (1 MiB)

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export class FirestoreDocumentTooLargeError extends Error {
  readonly bytes: number;
  readonly context: string;
  constructor(context: string, bytes: number, hint?: string) {
    super(`${context} : le document (${Math.ceil(bytes / 1024)} Ko) dépasse la limite Firestore de ${Math.floor(FIRESTORE_MAX_DOC_BYTES / 1024)} Ko.${hint ? ` ${hint}` : ''}`);
    this.name = 'FirestoreDocumentTooLargeError';
    this.bytes = bytes;
    this.context = context;
  }
}

// Message d'appoint quand un réseau explicite (config.network.document) domine
// la taille du document : oriente vers la cause plutôt que de laisser
// l'utilisateur deviner. Seuil informatif (50 Ko) : pas une hypothèse de
// modélisation, juste le point à partir duquel le réseau devient la cause la
// plus probable d'un dépassement.
const NETWORK_HINT_THRESHOLD_BYTES = 50_000;

export function networkSizeHint(config: unknown): string | undefined {
  const document = (config as { network?: { document?: unknown } } | null | undefined)?.network?.document;
  if (!document) return undefined;
  const bytes = byteLength(JSON.stringify(document));
  if (bytes <= NETWORK_HINT_THRESHOLD_BYTES) return undefined;
  return `Le réseau explicite utilisé dans cette sauvegarde (${Math.ceil(bytes / 1024)} Ko) en est la principale cause : réimportez un fichier réseau plus petit, ou repassez au réseau par défaut ou à ISOMORPH pour cette sauvegarde Cloud. La génération et le téléchargement locaux restent possibles quelle que soit la taille du réseau.`;
}

// Lève une erreur explicite si le payload dépasse la limite Firestore.
// L'appelant doit afficher err.message à l'utilisateur, jamais l'ignorer.
export function assertFirestoreDocSize(payload: unknown, context: string, hint?: string): void {
  const bytes = byteLength(JSON.stringify(payload));
  if (bytes > FIRESTORE_MAX_DOC_BYTES) throw new FirestoreDocumentTooLargeError(context, bytes, hint);
}
