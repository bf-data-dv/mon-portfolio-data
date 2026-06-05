import { useParams, useNavigate } from 'react-router-dom';

/**
 * useCatalogueParams — Hook utilitaire de lecture des paramètres d'URL du catalogue.
 *
 * Extrait les segments dynamiques de la route active :
 *   /catalogue                        → marque: undefined, modele_voiture: undefined
 *   /catalogue/:marque                → marque: "peugeot", modele_voiture: undefined
 *   /catalogue/:marque/:modele_voiture → marque: "peugeot", modele_voiture: "308"
 *
 * Séparé de useCatalogueNavigation pour pouvoir être consommé seul
 * dans les composants qui ont uniquement besoin de lire l'URL
 * sans déclencher de navigation (ex: affichage conditionnel).
 */
export const useCatalogueParams = () => {
  const { marque, modele_voiture } = useParams();
  return { marque, modele_voiture };
};


/**
 * useCatalogueNavigation — Hook gérant toute la navigation interne du catalogue.
 *
 * Le catalogue suit une arborescence à trois niveaux :
 *   Niveau 0 : /catalogue                         (liste des marques)
 *   Niveau 1 : /catalogue/:marque                 (liste des modèles d'une marque)
 *   Niveau 2 : /catalogue/:marque/:modele_voiture  (détail produit d'un modèle)
 *
 * Ce hook centralise la construction des URLs et le scroll en haut de page
 * pour éviter de dupliquer cette logique dans chaque composant du catalogue
 * (BrandCard, BrandListView, ModelListView, Catalogue).
 *
 * Le window.scrollTo(0, 0) systématique compense l'absence de scroll
 * automatique de React Router lors des changements de route : sans lui,
 * la page resterait positionnée à l'endroit où l'utilisateur a cliqué.
 */
export const useCatalogueNavigation = () => {
  const navigate = useNavigate();

  // On lit les params ici pour construire les URLs relatives
  // sans avoir à les recevoir en props depuis les composants parents
  const { marque, modele_voiture } = useParams();


  // ─────────────────────────────────────────────
  // NAVIGUER VERS UNE MARQUE
  // Niveau 0 → Niveau 1
  // Appelé depuis BrandCard quand l'utilisateur clique sur une marque.
  // ─────────────────────────────────────────────
  const goToBrand = (brandName) => {
    navigate(`/catalogue/${brandName}`);
    window.scrollTo(0, 0);
  };


  // ─────────────────────────────────────────────
  // NAVIGUER VERS UN MODÈLE
  // Niveau 1 → Niveau 2
  // Appelé depuis ModelListView quand l'utilisateur clique sur un modèle.
  //
  // On réutilise `marque` depuis les params de l'URL courante
  // plutôt que de le recevoir en argument, ce qui simplifie
  // l'interface des composants appelants.
  //
  // Guard sur `marque` : si on appelle goToModel sans être sur
  // une route /catalogue/:marque, on ne navigue pas pour éviter
  // une URL malformée du type /catalogue/undefined/308.
  // ─────────────────────────────────────────────
  const goToModel = (modelName) => {
    if (marque) {
      navigate(`/catalogue/${marque}/${modelName}`);
      window.scrollTo(0, 0);
    }
  };


  // ─────────────────────────────────────────────
  // RETOUR ARRIÈRE CONTEXTUEL
  // Appelé depuis le bouton "Retour" présent à chaque niveau.
  //
  // Logique de niveau :
  //   - Si on est au Niveau 2 (modele_voiture défini)
  //     → on remonte au Niveau 1 (liste des modèles de la marque)
  //   - Sinon on est au Niveau 1
  //     → on remonte au Niveau 0 (liste de toutes les marques)
  //
  // On préfère cette navigation explicite à navigate(-1) pour
  // garantir la destination même si l'historique du navigateur
  // est vide ou provient d'une URL externe.
  // ─────────────────────────────────────────────
  const goBack = () => {
    if (modele_voiture) {
      // Niveau 2 → Niveau 1
      navigate(`/catalogue/${marque}`);
    } else {
      // Niveau 1 → Niveau 0
      navigate('/catalogue');
    }
    window.scrollTo(0, 0);
  };

  return { goToBrand, goToModel, goBack };
};