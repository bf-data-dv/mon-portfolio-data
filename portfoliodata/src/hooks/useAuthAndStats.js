import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/SupabaseClient';

/**
 * useAuthAndStats — Hook personnalisé centralisant l'authentification
 * et les statistiques globales de l'application.
 *
 * Responsabilités :
 *  - Gérer la session utilisateur (login / logout / persistance)
 *  - Récupérer et exposer le rôle et le prénom de l'utilisateur connecté
 *  - Calculer les statistiques globales de l'inventaire (total, validés)
 *  - Détecter les articles en rupture de stock critique (seuil ≤ 4)
 *  - Écouter en temps réel les changements d'état d'authentification Supabase
 */
export function useAuthAndStats() {

  // Session Supabase courante (null = non connecté)
  const [session, setSession] = useState(null);

  // Rôle de l'utilisateur connecté : 'admin' ou 'user'
  const [role, setRole] = useState(null);

  // Prénom affiché dans la navbar et les pages d'accueil
  const [firstName, setFirstName] = useState("");

  // Bloque l'affichage de l'app tant que la session n'est pas résolue
  // (évite un flash de contenu non authentifié au chargement)
  const [loading, setLoading] = useState(true);

  // Statistiques globales de l'inventaire exposées au dashboard admin :
  //   total     → nombre total de références dans inventory
  //   validated → nombre de références avec is_validated = true
  const [dbStats, setDbStats] = useState({ total: 0, validated: 0 });

  // Liste des articles dont au moins un stock de tapis est ≤ 4 unités
  // Alimentée par fetchDbStats, consommée par HomeAdminView et StockAlertView
  const [lowStockItems, setLowStockItems] = useState([]);


  // ─────────────────────────────────────────────
  // RÉCUPÉRATION DES STATS & ALERTES DE STOCK
  //
  // Requête Supabase avec jointure imbriquée sur `carpet_stock`
  // pour récupérer tous les niveaux de stock par type de tapis.
  //
  // useCallback avec [] garantit que la référence de la fonction
  // ne change jamais entre les renders, ce qui est indispensable
  // car elle est déclarée en dépendance du useEffect principal.
  // Sans ça, le useEffect se déclencherait en boucle infinie.
  // ─────────────────────────────────────────────
  const fetchDbStats = useCallback(async () => {
    try {
      // Jointure relationnelle : inventory + carpet_stock (relation 1-1)
      const { data: allItems, error } = await supabase
        .from('inventory')
        .select(`
          *,
          carpet_stock (
            tapis_avt_stock,
            tapis_r1_stock,
            tapis_r2_stock,
            tapis_pont_stock,
            tapis_coffre_stock
          )
        `);

      if (error) throw error;

      if (allItems) {

        // Filtre les articles en alerte : au moins un type de tapis
        // avec un stock existant (non null) et inférieur ou égal au seuil de 4
        // On vérifie !== null explicitement pour ne pas alerter sur les
        // types de tapis non fabriqués pour ce véhicule (valeur null en base)
        const alerts = allItems.filter(item => {
          const s = item.carpet_stock;
          if (!s) return false;
          return (
            (s.tapis_avt_stock  !== null && s.tapis_avt_stock  <= 4) ||
            (s.tapis_r1_stock   !== null && s.tapis_r1_stock   <= 4) ||
            (s.tapis_r2_stock   !== null && s.tapis_r2_stock   <= 4) ||
            (s.tapis_pont_stock !== null && s.tapis_pont_stock <= 4) ||
            (s.tapis_coffre_stock !== null && s.tapis_coffre_stock <= 4)
          );
        })
        // Aplatissement : on remonte les stocks au niveau racine de l'objet
        // pour simplifier leur lecture dans les composants consommateurs
        // (StockAlertView, HomeAdminView) sans avoir à accéder à item.carpet_stock.xxx
        .map(item => ({
          ...item,
          tapis_avt_stock:    item.carpet_stock?.tapis_avt_stock,
          tapis_r1_stock:     item.carpet_stock?.tapis_r1_stock,
          tapis_r2_stock:     item.carpet_stock?.tapis_r2_stock,
          tapis_pont_stock:   item.carpet_stock?.tapis_pont_stock,
          tapis_coffre_stock: item.carpet_stock?.tapis_coffre_stock
        }));

        // Mise à jour des statistiques globales du dashboard admin
        setDbStats({
          total:     allItems.length,
          validated: allItems.filter(item => item.is_validated).length
        });

        setLowStockItems(alerts);
      }
    } catch (err) {
      console.error("Erreur stats:", err.message);
    }
  }, []); // Pas de dépendances : la fonction est créée une seule fois


  // ─────────────────────────────────────────────
  // RÉCUPÉRATION DU RÔLE ET DU PRÉNOM
  //
  // Appelée à deux moments :
  //   1. Au démarrage via getSession() si une session existe déjà
  //   2. À chaque changement d'état auth via onAuthStateChange
  //   3. Manuellement depuis Settings.js après une mise à jour de profil,
  //      ce qui justifie son exposition dans le return du hook
  //
  // Le bloc `finally` garantit que loading passe à false
  // même si la requête échoue, pour ne pas bloquer l'UI indéfiniment.
  // ─────────────────────────────────────────────
  const fetchRole = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', userId)
        .single(); // On attend exactement un résultat (1 profil par userId)

      if (!error && data) {
        setRole(data.role);
        setFirstName(data.first_name || "");
      }
    } catch (err) {
      console.error("Erreur rôle:", err.message);
    } finally {
      // S'exécute toujours : succès ou erreur
      // Indispensable pour sortir du loading même si le profil est introuvable
      setLoading(false);
    }
  }, []); // Pas de dépendances : la fonction est créée une seule fois


  // ─────────────────────────────────────────────
  // GESTION DU CYCLE DE VIE DE L'AUTHENTIFICATION
  //
  // Deux mécanismes complémentaires :
  //
  // 1. getSession() — vérification synchrone au montage du composant.
  //    Récupère la session persistée dans le localStorage par Supabase
  //    (l'utilisateur était déjà connecté avant de fermer l'onglet).
  //
  // 2. onAuthStateChange — listener temps réel sur tous les événements auth :
  //    SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED...
  //    Déclenché automatiquement après un login ou un logout.
  //    Couvre aussi le refresh automatique du JWT par Supabase.
  //
  // Les deux appellent fetchRole + fetchDbStats pour s'assurer que
  // les données sont toujours cohérentes avec la session courante.
  //
  // Le cleanup `subscription.unsubscribe()` évite les fuites mémoire
  // si le composant est démonté avant que le listener ne se déclenche.
  // ─────────────────────────────────────────────
  useEffect(() => {

    // Vérification de la session existante au premier rendu
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
        fetchDbStats();
      } else {
        // Pas de session → on sort du loading immédiatement
        // pour afficher HomePublic sans attendre
        setLoading(false);
      }
    });

    // Abonnement aux changements d'état auth en temps réel
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Nouvelle session → on recharge rôle et stats
        fetchRole(session.user.id);
        fetchDbStats();
      } else {
        // Session terminée (logout ou expiration) → reset complet
        setRole(null);
        setFirstName("");
        setLoading(false);
      }
    });

    // Nettoyage : on se désabonne quand le composant est démonté
    return () => subscription.unsubscribe();

  }, [fetchRole, fetchDbStats]);
  // Ces deux dépendances sont stables grâce au useCallback
  // → le useEffect ne se re-déclenche jamais après le montage initial


  // ─────────────────────────────────────────────
  // DÉCONNEXION
  //
  // signOut() invalide le token côté Supabase et vide le localStorage.
  // onAuthStateChange se déclenche automatiquement en réponse
  // et remet role/firstName à null via son propre bloc `else`.
  // On remet quand même session/role ici en sécurité pour
  // garantir un reset immédiat de l'UI sans attendre le listener.
  // ─────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  };

  // Exposition de l'API publique du hook
  // fetchRole est exposé pour permettre le re-fetch manuel depuis Settings.js
  return { session, role, firstName, loading, dbStats, lowStockItems, logout, fetchRole };
}