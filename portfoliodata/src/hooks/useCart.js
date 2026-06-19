import { useState } from 'react';

/**
 * useCart — Hook personnalisé gérant l'intégralité de la logique du panier.
 *
 * Responsabilités :
 *  - Ajouter un article (avec déduplication par clé composite)
 *  - Mettre à jour les options d'un article (rear / trunk) et recalculer son prix
 *  - Modifier la quantité d'un article
 *  - Supprimer un article
 *  - Vider le panier entièrement
 *  - Exposer le nombre total d'articles (pour le badge navbar)
 */
export function useCart() {

  // État central du panier : tableau d'objets article
  const [cart, setCart] = useState([]);

  // ─────────────────────────────────────────────
  // VIDER LE PANIER
  // Réinitialise le tableau à vide.
  // Appelé après une commande validée depuis Cart.js
  // ─────────────────────────────────────────────
  const clearCart = () => {
    setCart([]);
  };

  // ─────────────────────────────────────────────
  // AJOUTER AU PANIER
  // Reçoit un objet `item` depuis Catalogue.js via addToCart()
  //
  // Logique de prix :
  //   Le prix affiché dans le catalogue inclut déjà les options
  //   sélectionnées par défaut (rear/trunk). On recalcule ici
  //   le `basePrice` (prix sans aucune option) pour pouvoir
  //   recalculer dynamiquement le prix si l'utilisateur
  //   coche/décoche des options depuis le panier.
  //
  // Déduplication :
  //   La clé composite `id-finish-rear-trunk` identifie
  //   de façon unique un article avec sa configuration exacte.
  //   Si le même article avec les mêmes options est ajouté,
  //   on incrémente sa quantité plutôt que de créer un doublon.
  // ─────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prevCart) => {

      // Prix unitaire des options (0 si l'option n'existe pas)
      const optRear  = Number(item.optionPrices?.rear  || 0);
      const optTrunk = Number(item.optionPrices?.trunk || 0);

      // On part du prix total reçu et on soustrait les options
      // déjà incluses pour obtenir le prix de base pur
      let realBase = Number(item.price);
      if (item.options?.rear)  realBase -= optRear;
      if (item.options?.trunk) realBase -= optTrunk;

      // Clé unique : combinaison de l'id, la finition et les options actives
      const cartKey = `${item.id}-${item.finish}-${item.options.rear}-${item.options.trunk}`;

      // Recherche d'un article identique déjà présent dans le panier
      const existingItemIndex = prevCart.findIndex((i) =>
        `${i.id}-${i.finish}-${i.options.rear}-${i.options.trunk}` === cartKey
      );

      // Article déjà présent → on incrémente sa quantité (sans muter l'objet)
      if (existingItemIndex > -1) {
        return prevCart.map((i, index) =>
          index === existingItemIndex
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      // Nouvel article → on l'ajoute au panier avec basePrice et price distincts
      return [...prevCart, {
        ...item,
        basePrice: realBase,       // Prix sans options (référence immuable)
        price: Number(item.price)  // Prix courant (recalculé si options changent)
      }];
    });
  };

  // ─────────────────────────────────────────────
  // METTRE À JOUR LES OPTIONS D'UN ARTICLE
  // Appelé depuis Cart.js quand l'utilisateur coche/décoche
  // une option (tapis arrière ou coffre) sur un article du panier.
  //
  // On toggle l'option ciblée puis on recalcule le prix
  // en repartant systématiquement de `basePrice` pour éviter
  // toute accumulation d'erreurs sur des additions/soustractions répétées.
  // ─────────────────────────────────────────────
  const handleUpdateOptions = (index, optionName) => {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {

        // Toggle de l'option (true → false ou false → true)
        const newOptions = { ...item.options, [optionName]: !item.options[optionName] };

        const optRear  = Number(item.optionPrices?.rear  || 0);
        const optTrunk = Number(item.optionPrices?.trunk || 0);
        const cleanBase = Number(item.basePrice);

        // Recalcul du prix depuis la base propre
        let newPrice = cleanBase;
        if (newOptions.rear)  newPrice += optRear;
        if (newOptions.trunk) newPrice += optTrunk;

        return {
          ...item,
          options: newOptions,
          price: newPrice
        };
      }
      return item;
    }));
  };

  // ─────────────────────────────────────────────
  // SUPPRIMER UN ARTICLE
  // Retire l'article à l'index donné du tableau.
  // On filtre par index plutôt que par id car deux articles
  // identiques avec des options différentes peuvent coexister.
  // ─────────────────────────────────────────────
  const handleRemoveItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────────
  // MODIFIER LA QUANTITÉ
  // `delta` vaut +1 ou -1 selon le bouton pressé.
  // Math.max(1, ...) empêche de passer en dessous de 1
  // (la suppression se fait via handleRemoveItem).
  // ─────────────────────────────────────────────
  const handleUpdateQuantity = (index, delta) => {
    setCart(prev => prev.map((item, i) =>
      i === index
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  // ─────────────────────────────────────────────
  // TOTAL D'ARTICLES
  // Somme des quantités de tous les articles.
  // Utilisé pour afficher le badge numérique sur l'icône
  // du panier dans NavbarUser.
  // ─────────────────────────────────────────────
  const totalItemsInCart = cart.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cart,
    addToCart,
    handleRemoveItem,
    handleUpdateQuantity,
    handleUpdateOptions,
    clearCart,
    totalItemsInCart
  };
}