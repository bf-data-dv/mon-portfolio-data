import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/SupabaseClient';

/**
 * useFavorites — Hook gérant le garage personnel de l'utilisateur.
 *
 * Le "garage" est la fonctionnalité qui permet à un utilisateur
 * de sauvegarder ses véhicules favoris pour les retrouver rapidement.
 * Chaque favori est une ligne dans la table `user_garage` (userId + carId).
 *
 * Responsabilités :
 *  - Charger les ids des véhicules favoris de l'utilisateur connecté
 *  - Exposer un Set pour vérifier en O(1) si un véhicule est en favori
 *  - Ajouter ou retirer un favori (toggle) avec mise à jour optimiste de l'UI
 *  - Se réinitialiser automatiquement si l'utilisateur se déconnecte (userId → null)
 *
 * @param {string|null} userId - L'id de l'utilisateur connecté, ou null si non connecté
 */
export function useFavorites(userId) {

  // Set d'ids (UUIDs) des véhicules en favori pour l'utilisateur courant.
  // On utilise un Set plutôt qu'un tableau pour deux raisons :
  //   1. Vérification d'appartenance en O(1) via .has(carId)
  //      au lieu de O(n) avec .includes() sur un tableau
  //   2. Unicité garantie nativement (pas de doublons possibles)
  const [garageIds, setGarageIds] = useState(new Set());


  // ─────────────────────────────────────────────
  // CHARGEMENT DES FAVORIS
  //
  // Récupère tous les car_id associés à userId dans user_garage.
  // Le résultat est converti en Set pour une lecture performante
  // dans les composants qui vérifient si un véhicule est favori
  // (ex: affichage du bouton cœur actif/inactif dans BrandCard).
  //
  // useCallback avec [userId] en dépendance :
  //   - La fonction est recrée uniquement quand userId change
  //   - Cela la stabilise pour qu'elle puisse être déclarée
  //     en dépendance du useEffect sans créer de boucle infinie
  //   - Sans useCallback, le useEffect se déclencherait à chaque
  //     render car fetchFavorites serait une nouvelle référence
  // ─────────────────────────────────────────────
  const fetchFavorites = useCallback(async () => {

    // Guard : pas de requête si l'utilisateur n'est pas connecté
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_garage')
      .select('car_id')
      .eq('user_id', userId);

    if (!error && data) {
      // Conversion du tableau de résultats en Set d'ids
      setGarageIds(new Set(data.map(item => item.car_id)));
    }
  }, [userId]); // Se recrée uniquement si userId change


  // ─────────────────────────────────────────────
  // SYNCHRONISATION AU MONTAGE ET AU CHANGEMENT D'UTILISATEUR
  //
  // Deux cas gérés :
  //   - userId présent → on charge les favoris de cet utilisateur
  //   - userId null (déconnexion) → on vide le Set pour ne pas
  //     afficher les favoris d'un ancien utilisateur à un nouveau
  //
  // fetchFavorites est stable grâce au useCallback, donc ce
  // useEffect ne se re-déclenche que quand userId change réellement.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchFavorites();
    } else {
      // Reset complet du garage si déconnexion
      setGarageIds(new Set());
    }
  }, [userId, fetchFavorites]);


  // ─────────────────────────────────────────────
  // TOGGLE FAVORI (AJOUTER / RETIRER)
  //
  // Détermine automatiquement l'action à effectuer selon
  // si le véhicule est déjà en favori ou non.
  //
  // Pattern "optimistic update" :
  //   On met à jour le state local immédiatement après
  //   confirmation de succès Supabase (pas d'erreur),
  //   sans refaire un fetchFavorites complet.
  //   Cela évite un aller-retour réseau inutile et rend
  //   l'interface réactive instantanément.
  //
  // Valeur de retour :
  //   { action: 'added'|'removed', error } → permet au composant
  //   appelant d'afficher un toast ou un message contextuel
  //   { error: "AUTH_REQUIRED" } → si l'utilisateur n'est pas connecté,
  //   le composant peut rediriger vers la page de login
  //
  // @param {string} carId - L'id du véhicule à toggler
  // ─────────────────────────────────────────────
  const toggleFavorite = async (carId) => {

    // Guard : on refuse l'action si non connecté
    // et on signale l'état au composant appelant
    if (!userId) return { error: "AUTH_REQUIRED" };

    const isFavorite = garageIds.has(carId);

    if (isFavorite) {
      // ── RETRAIT DU FAVORI ──
      // Suppression de la ligne correspondante dans user_garage
      const { error } = await supabase
        .from('user_garage')
        .delete()
        .eq('user_id', userId)
        .eq('car_id', carId);

      if (!error) {
        // Mise à jour locale : on crée un nouveau Set sans le carId retiré
        // (on ne mute pas le Set existant pour respecter l'immutabilité React)
        setGarageIds(prev => {
          const newIds = new Set(prev);
          newIds.delete(carId);
          return newIds;
        });
      }

      return { action: 'removed', error };

    } else {
      // ── AJOUT AU FAVORI ──
      // Insertion d'une nouvelle ligne dans user_garage
      const { error } = await supabase
        .from('user_garage')
        .insert([{ user_id: userId, car_id: carId }]);

      if (!error) {
        // Mise à jour locale : on étale le Set existant et on ajoute le nouveau carId
        setGarageIds(prev => new Set([...prev, carId]));
      }

      return { action: 'added', error };
    }
  };

  // Exposition de l'API publique du hook :
  //   garageIds     → Set consulté dans les composants pour l'état actif/inactif
  //   toggleFavorite → fonction appelée au clic sur le bouton favori
  return { garageIds, toggleFavorite };
}