"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreDocumentTooLargeError = exports.FIRESTORE_MAX_DOC_BYTES = void 0;
exports.byteLength = byteLength;
exports.networkSizeHint = networkSizeHint;
exports.assertFirestoreDocSize = assertFirestoreDocSize;
exports.FIRESTORE_MAX_DOC_BYTES = 1048576; // limite Firestore par document (1 MiB)
function byteLength(text) {
    return new TextEncoder().encode(text).length;
}
class FirestoreDocumentTooLargeError extends Error {
    constructor(context, bytes, hint) {
        super(`${context} : le document (${Math.ceil(bytes / 1024)} Ko) dépasse la limite Firestore de ${Math.floor(exports.FIRESTORE_MAX_DOC_BYTES / 1024)} Ko.${hint ? ` ${hint}` : ''}`);
        this.name = 'FirestoreDocumentTooLargeError';
        this.bytes = bytes;
        this.context = context;
    }
}
exports.FirestoreDocumentTooLargeError = FirestoreDocumentTooLargeError;
// Message d'appoint quand un réseau explicite (config.network.document) domine
// la taille du document : oriente vers la cause plutôt que de laisser
// l'utilisateur deviner. Seuil informatif (50 Ko) : pas une hypothèse de
// modélisation, juste le point à partir duquel le réseau devient la cause la
// plus probable d'un dépassement.
const NETWORK_HINT_THRESHOLD_BYTES = 50000;
function networkSizeHint(config) {
    const document = config?.network?.document;
    if (!document)
        return undefined;
    const bytes = byteLength(JSON.stringify(document));
    if (bytes <= NETWORK_HINT_THRESHOLD_BYTES)
        return undefined;
    return `Le réseau explicite utilisé dans cette sauvegarde (${Math.ceil(bytes / 1024)} Ko) en est la principale cause : réimportez un fichier réseau plus petit, ou repassez au réseau par défaut ou à ISOMORPH pour cette sauvegarde Cloud. La génération et le téléchargement locaux restent possibles quelle que soit la taille du réseau.`;
}
// Lève une erreur explicite si le payload dépasse la limite Firestore.
// L'appelant doit afficher err.message à l'utilisateur, jamais l'ignorer.
function assertFirestoreDocSize(payload, context, hint) {
    const bytes = byteLength(JSON.stringify(payload));
    if (bytes > exports.FIRESTORE_MAX_DOC_BYTES)
        throw new FirestoreDocumentTooLargeError(context, bytes, hint);
}
