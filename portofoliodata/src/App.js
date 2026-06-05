import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useCart } from './hooks/useCart';
import { useAuthAndStats } from './hooks/useAuthAndStats';
import NavbarUser from './layout/NavbarUser';
import NavbarAdmin from './layout/NavbarAdmin';
import Footer from './layout/Footer';
import HomePublic from './pages/HomePublic';
import AppRouter from './Router';

/**
 * LoadingSpinner — Composant interne d'écran de chargement.
 *
 * Affiché le temps que useAuthAndStats résolve la session Supabase
 * au démarrage de l'application. Sans lui, l'app flasherait
 * brièvement HomePublic même pour un utilisateur déjà connecté,
 * le temps que getSession() réponde.
 *
 * Composant défini en dehors de App pour deux raisons :
 *   1. Eviter qu'il soit recréé à chaque render de App
 *   2. Le garder lisible et séparé de la logique principale
 */
const LoadingSpinner = () => (
  <div className="h-screen bg-slate-950 flex items-center justify-center text-indigo-500 font-mono">
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-[10px] uppercase tracking-widest">Chargement...</span>
    </div>
  </div>
);

/**
 * App — Composant racine de l'application.
 *
 * Rôle d'orchestrateur : App ne contient aucune logique métier,
 * elle délègue tout à ses deux hooks et redistribue les données
 * aux composants enfants via props.
 *
 * Arborescence de rendu selon l'état de session :
 *
 *   [loading = true]
 *     └── LoadingSpinner
 *
 *   [loading = false, session = null]
 *     └── Router
 *           ├── HomePublic   (page vitrine, non authentifiée)
 *           └── Footer
 *
 *   [loading = false, session présente, role = 'user']
 *     └── Router
 *           ├── NavbarUser   (avec badge panier)
 *           ├── AppRouter    (routes utilisateur)
 *           └── Footer
 *
 *   [loading = false, session présente, role = 'admin']
 *     └── Router
 *           ├── NavbarAdmin  (sans panier, avec liens admin)
 *           ├── AppRouter    (routes utilisateur + routes admin)
 *           └── Footer
 */
function App() {

  // ── AUTHENTIFICATION & STATISTIQUES ───────────────────────────────
  // useAuthAndStats gère la session, le rôle, le prénom,
  // les stats globales de l'inventaire et les alertes de stock.
  // C'est la source de vérité pour tout ce qui concerne l'utilisateur connecté.
  const {
    session,       // Session Supabase courante (null si non connecté)
    role,          // 'admin' | 'user' | null
    firstName,     // Prénom affiché dans la navbar et les pages d'accueil
    loading,       // true tant que la session n'est pas résolue au démarrage
    dbStats,       // { total: number, validated: number } — stats inventaire admin
    lowStockItems, // Articles avec au moins un stock ≤ 4 unités
    logout,        // Déconnecte l'utilisateur et reset le state
    fetchRole      // Re-fetch manuel du rôle (utilisé après mise à jour dans Settings)
  } = useAuthAndStats();

  // ── PANIER ────────────────────────────────────────────────────────
  // useCart gère l'état du panier entièrement côté client (pas de persistance).
  // Le panier est réinitialisé à chaque rechargement de page, ce qui est
  // le comportement attendu pour un workflow de commande simple.
  const {
    cart,                // Tableau des articles actuellement dans le panier
    addToCart,           // Ajoute un article ou incrémente sa quantité
    handleRemoveItem,    // Supprime un article par index
    handleUpdateQuantity,// Modifie la quantité d'un article (+1 / -1)
    handleUpdateOptions, // Toggle les options (rear/trunk) et recalcule le prix
    clearCart,           // Vide complètement le panier (après commande validée)
    totalItemsInCart     // Somme des quantités — affiché comme badge dans NavbarUser
  } = useCart();

  // ── GARDE DE CHARGEMENT ───────────────────────────────────────────
  // On bloque tout rendu tant que la session n'est pas résolue.
  // Sans ce guard, React rendrait HomePublic pendant ~200ms
  // avant de basculer sur l'interface connectée, ce qui cause
  // un flash visible et potentiellement des redirections indésirables.
  if (loading) return <LoadingSpinner />;

  return (
    // BrowserRouter encapsule toute l'app pour que useNavigate,
    // useParams et Link fonctionnent dans tous les composants enfants.
    // Il est placé ici et non dans index.js pour garder la logique
    // de routing colocalisée avec le point d'entrée de l'app.
    <Router>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">

        {!session ? (

          // ── CAS NON CONNECTÉ ───────────────────────────────────────
          // HomePublic est une page vitrine autonome qui gère
          // elle-même son propre contenu (landing, login, etc.)
          // Elle n'a pas besoin de navbar ni de router car
          // elle ne contient qu'une seule vue.
          <HomePublic />

        ) : (

          // ── CAS CONNECTÉ ───────────────────────────────────────────
          <>
            {/* Navbar conditionnelle selon le rôle :
                - NavbarAdmin : liens vers /overview, /alerts, /add-product
                  Pas de panier (l'admin ne commande pas)
                - NavbarUser  : liens standards + badge panier avec
                  le nombre total d'articles (totalItemsInCart) */}
            {role === 'admin' ? (
              <NavbarAdmin
                onLogout={logout}
                session={session}
              />
            ) : (
              <NavbarUser
                session={session}
                onLogout={logout}
                cartCount={totalItemsInCart}
              />
            )}

            {/* flex-grow pousse le Footer en bas de page même si
                le contenu principal est court (layout "sticky footer") */}
            <main className="flex-grow">
              <AppRouter
                // Contexte utilisateur
                session={session}
                role={role}
                firstName={firstName}
                fetchRole={fetchRole}        // Transmis pour Settings.js

                // Panier complet
                cart={cart}
                addToCart={addToCart}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateOptions={handleUpdateOptions}
                onClearCart={clearCart}

                // Données admin (ignorées par les routes non-admin)
                totalRowsInDB={dbStats.total}
                grandTotal={dbStats.validated}
                lowStockItems={lowStockItems}
              />
            </main>
          </>
        )}

        {/* Footer affiché dans tous les cas (connecté ou non)
            Il reste en bas grâce au flex-col + flex-grow sur main */}
        <Footer />

      </div>
    </Router>
  );
}

export default App;