import { createClient } from '@supabase/supabase-js';

// Récupération des jetons de connexion à travers le scope process.env (Configuration standard Create React App)
// Ces variables doivent impérativement être préfixées par 'REACT_APP_' pour être injectées dans le bundle final.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * DOUBLE RIDEAU DE SÉCURITÉ ET DIAGNOSTIC SIMPLIFIÉ
 * Rôle : Intercepter immédiatement au démarrage de l'application l'absence de configuration injection.
 * Évite les comportements silencieux ou les erreurs HTTP 403/400 cryptiques lors des futurs appels API.
 */
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "⚠️ ERREUR SUPABASE : Les variables d'environnement sont manquantes.\n" +
    "Vérifie que ton fichier .env à la racine du projet contient bien :\n" +
    "REACT_APP_SUPABASE_URL=...\n" +
    "REACT_APP_SUPABASE_ANON_KEY=..."
  );
}

/**
 * INITIALISATION ET EXPORTATION DE L'INSTANCE CENTRALISÉE
 * Objet : 'supabase' devient le connecteur unique (Singleton) réutilisable partout dans l'application.
 * Il intègre par défaut la gestion des en-têtes d'authentification anonymes (Anon Key) permettant
 * à la base de données d'appliquer les politiques de sécurité par ligne (Row Level Security - RLS).
 * * NOTE : L'ajout de global.fetch résout les erreurs de résolution réseau dans certains environnements 
 * de build React (resolveFetch).
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    // Liaison explicite au fetch natif du navigateur pour éviter les erreurs de résolution
    fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : fetch,
  },
});