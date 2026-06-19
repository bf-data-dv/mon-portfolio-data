// src/Router.jsx
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import HomeUser from './pages/HomeUser';
import HomeAdminView from './pages/HomeAdminView';
import AddProductForm from './components/AddProductForm';
import Catalogue from './components/catalogue/Catalogue';
import Garage from './components/garage/Garage';
import Settings from './pages/Settings';
import Cart from './components/cart/Cart';
import StockAlertView from './pages/StockAlertView';

/**
 * AppRouter — Composant central de routage de l'application.
 *
 * Reçoit en props toutes les données et handlers nécessaires
 * aux pages enfants, évitant ainsi d'utiliser un state global
 * (Context / Redux) pour un projet de cette taille.
 *
 * Architecture des routes :
 *   /              → Accueil utilisateur (HomeUser)
 *   /garage        → Véhicules favoris de l'utilisateur (Garage)
 *   /settings      → Paramètres du profil (Settings)
 *   /panier        → Panier d'achat (Cart)
 *   /catalogue     → Liste des marques (Catalogue — Niveau 0)
 *   /catalogue/:marque                → Modèles d'une marque (Niveau 1)
 *   /catalogue/:marque/:modele_voiture → Détail produit (Niveau 2)
 *
 *   Routes admin (affichées uniquement si role === 'admin') :
 *   /overview      → Dashboard statistiques (HomeAdminView)
 *   /alerts        → Articles en rupture de stock (StockAlertView)
 *   /add-product   → Formulaire d'ajout de référence (AddProductForm)
 *
 *   /* → Redirige vers / (fallback pour toute URL inconnue)
 *
 * @param {object}   session         - Session Supabase de l'utilisateur connecté
 * @param {string}   role            - Rôle de l'utilisateur : 'admin' ou 'user'
 * @param {string}   firstName       - Prénom affiché sur la page d'accueil
 * @param {function} fetchRole       - Re-fetch du rôle après mise à jour du profil dans Settings
 * @param {array}    cart            - Tableau des articles du panier (depuis useCart)
 * @param {function} addToCart       - Ajoute un article au panier depuis le catalogue
 * @param {function} onRemoveItem    - Supprime un article du panier par index
 * @param {function} onUpdateQuantity - Modifie la quantité d'un article (+1 / -1)
 * @param {function} onUpdateOptions  - Toggle les options (rear/trunk) d'un article
 * @param {function} onClearCart     - Vide entièrement le panier après commande validée
 * @param {number}   totalRowsInDB   - Nombre total de références dans l'inventaire (admin)
 * @param {number}   grandTotal      - Nombre de références validées dans l'inventaire (admin)
 * @param {array}    lowStockItems   - Articles avec stock critique ≤ 4 unités (admin)
 */
const AppRouter = ({
  session,
  role,
  firstName,
  fetchRole,
  cart,
  addToCart,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateOptions,
  onClearCart,
  totalRowsInDB,
  grandTotal,
  lowStockItems
}) => {

  // useNavigate est utilisé ici plutôt que dans les composants enfants
  // pour centraliser la navigation programmatique dans le routeur
  // et éviter de coupler les pages à React Router directement
  const navigate = useNavigate();

  return (
    <Routes>

      {/* ── ACCUEIL ─────────────────────────────────────────────────────
          Affiche "ADMIN" à la place du prénom si l'utilisateur est admin,
          pour distinguer visuellement les deux contextes sans créer
          deux composants HomeUser séparés.
      ─────────────────────────────────────────────────────────────────── */}
      <Route
        path="/"
        element={
          <HomeUser
            session={session}
            firstName={role === 'admin' ? "ADMIN" : firstName}
          />
        }
      />

      {/* ── GARAGE (FAVORIS) ─────────────────────────────────────────────
          setActiveTab permet à Garage de déclencher une navigation
          vers une autre section de l'app (ex: /catalogue) via un bouton
          interne, sans que Garage ait besoin d'importer useNavigate.
      ─────────────────────────────────────────────────────────────────── */}
      <Route
        path="/garage"
        element={
          <Garage
            session={session}
            setActiveTab={(tab) => navigate(`/${tab}`)}
          />
        }
      />

      {/* ── PARAMÈTRES ───────────────────────────────────────────────────
          onProfileUpdate est appelé par Settings après une sauvegarde
          réussie du profil. Il re-fetche le rôle et le prénom depuis
          Supabase pour mettre à jour la navbar sans déconnexion/reconnexion.
          On passe session.user.id directement ici pour que Settings
          n'ait pas à connaître la structure de l'objet session.
      ─────────────────────────────────────────────────────────────────── */}
      <Route
        path="/settings"
        element={
          <Settings
            session={session}
            onProfileUpdate={() => fetchRole(session.user.id)}
          />
        }
      />

      {/* ── PANIER ───────────────────────────────────────────────────────
          Toute la logique du panier (état + handlers) vient de useCart
          via App.js. Cart est un composant purement présentationnel
          qui délègue toutes les actions à ces handlers.
          onBack utilise navigate(-1) pour revenir à la page précédente
          dans l'historique, comportement natif attendu sur une page panier.
      ─────────────────────────────────────────────────────────────────── */}
      <Route
        path="/panier"
        element={
          <Cart
            cart={cart}
            onRemoveItem={onRemoveItem}
            onUpdateQuantity={onUpdateQuantity}
            onUpdateOptions={onUpdateOptions}
            onClearCart={onClearCart}
            onBack={() => navigate(-1)}
            session={session}
          />
        }
      />

      {/* ── CATALOGUE (3 NIVEAUX) ────────────────────────────────────────
          Le même composant Catalogue gère les trois niveaux de navigation
          en lisant les params d'URL via useCatalogueParams en interne.
          Les trois routes pointent vers le même composant car Catalogue
          adapte son affichage selon la présence de :marque et :modele_voiture.
            /catalogue                         → liste des marques
            /catalogue/:marque                 → modèles de la marque
            /catalogue/:marque/:modele_voiture → produits du modèle
      ─────────────────────────────────────────────────────────────────── */}
      <Route path="/catalogue" element={<Catalogue session={session} addToCart={addToCart} />} />
      <Route path="/catalogue/:marque" element={<Catalogue session={session} addToCart={addToCart} />} />
      <Route path="/catalogue/:marque/:modele_voiture" element={<Catalogue session={session} addToCart={addToCart} />} />

      {/* ── ROUTES ADMIN ─────────────────────────────────────────────────
          Rendues conditionnellement uniquement si role === 'admin'.
          Si un utilisateur standard tente d'accéder à /overview, /alerts
          ou /add-product, le fallback * le redirige vers /.
          Ce guard côté client est suffisant pour l'UX ; la sécurité
          réelle est assurée par les RLS (Row Level Security) Supabase.
      ─────────────────────────────────────────────────────────────────── */}
      {role === 'admin' && (
        <>
          {/* Dashboard statistiques globales de l'inventaire */}
          <Route
            path="/overview"
            element={
              <HomeAdminView
                totalRowsInDB={totalRowsInDB}
                grandTotal={grandTotal}
                lowStockItems={lowStockItems}
                session={session}
              />
            }
          />

          {/* Liste complète des articles en rupture critique */}
          <Route
            path="/alerts"
            element={<StockAlertView items={lowStockItems} />}
          />

          {/* Formulaire d'ajout d'une nouvelle référence au catalogue */}
          <Route path="/add-product" element={<AddProductForm />} />
        </>
      )}

      {/* ── FALLBACK ─────────────────────────────────────────────────────
          Toute URL non reconnue redirige vers l'accueil.
          Couvre aussi les tentatives d'accès aux routes admin
          par un utilisateur non admin.
      ─────────────────────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  );
};

export default AppRouter;