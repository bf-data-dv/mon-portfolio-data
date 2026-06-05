import React, { useState, useEffect } from 'react';
// Importation d'icônes ciblées Lucide-React pour enrichir l'UI d'administration/logistique
import { AlertTriangle, FileDown, Plus, Minus, PackageSearch, Loader2 } from 'lucide-react';
// Bibliothèques tierces pour la génération dynamique de fichiers PDF côté client
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Importation de l'instance centralisée du client Supabase
import { supabase } from '../services/SupabaseClient'; 

// Référentiel statique (Mock) représentant le fournisseur principal des pièces
const MOCK_SUPPLIER = {
  name: "Pièces Auto Global",
  email: "monfournisseur@gmail.com",
  phone: "01 23 45 67(89",
  address: "123 Rue de l'Industrie, 75000 Paris"
};

/**
 * Component: StockAlertView
 * Description: Interface de gestion logistique dédiée à l'affichage des alertes de rupture.
 * Rôle : Analyser en temps réel l'état des stocks à l'aide d'une sous-cription Realtime (WebSocket),
 * permettre la saisie de quantités de réapprovisionnement, et compiler un Bon de Commande PDF formaté.
 * * @param {Object} props
 * @param {Array} props.items - Optionnel. Liste pré-filtrée d'items injectée par un composant parent (ex: Dashboard)
 */
const StockAlertView = ({ items: propItems }) => {
  const [items, setItems] = useState([]);                  // Contient le tableau final des références de tapis en alerte critique (stock <= 4)
  const [loading, setLoading] = useState(true);              // Indicateur d'état de chargement asynchrone (Loader spinner)
  const [orderQuantities, setOrderQuantities] = useState({}); // Dictionnaire d'état associatif liant un [item.id] à sa quantité de commande saisie

  /**
   * Method: fetchCriticalStock
   * Rôle: Interroge la base de données PostgreSQL à travers une vue SQL combinée.
   * Filtre en amont via une clause OR complexe pour réduire la charge réseau, puis applique un double contrôle local.
   */
  const fetchCriticalStock = async () => {
    try {
      // Lecture depuis la vue combinée 'global_inventory_stock'
      const { data, error } = await supabase
        .from('global_inventory_stock')
        .select('*')
        // Optimisation SQL : On ne remonte que les lignes où AU MOINS un des types de tapis est inférieur ou égal à 4
        .or('tapis_avt_stock.lte.4,tapis_r1_stock.lte.4,tapis_r2_stock.lte.4,tapis_pont_stock.lte.4,tapis_coffre_stock.lte.4');

      if (error) throw error;

      // Double rideau de sécurité logicielle : Validation locale des typages et des seuils stricts (exclusion des valeurs nulles)
      const filteredData = (data || []).filter(item => {
        return (
          (item.tapis_avt_stock !== null && item.tapis_avt_stock <= 4) ||
          (item.tapis_r1_stock !== null && item.tapis_r1_stock <= 4) ||
          (item.tapis_r2_stock !== null && item.tapis_r2_stock <= 4) ||
          (item.tapis_pont_stock !== null && item.tapis_pont_stock <= 4) ||
          (item.tapis_coffre_stock !== null && item.tapis_coffre_stock <= 4)
        );
      });

      setItems(filteredData);
    } catch (err) {
      console.error("Erreur lors de la récupération des alertes stock:", err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Effect: Logique d'initialisation et synchronisation en temps réel (Supabase Realtime)
   */
  useEffect(() => {
    // Cas 1 : Si le composant parent fournit déjà la source de données, on court-circuite le chargement asynchrone
    if (propItems && propItems.length > 0) {
      setItems(propItems);
      setLoading(false);
      return;
    }

    // Cas 2 : Chargement initial depuis la base PostgreSQL
    setLoading(true);
    fetchCriticalStock();

    // --- ABONNEMENT REALTIME / WEB-SOCKETS ---
    // Crée un canal d'écoute branché sur les mutations de la table brute 'carpet_stock'
    const stockChannel = supabase
      .channel('realtime_stock_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'carpet_stock' },
        () => {
          // Déclencheur (Trigger UI) : Dès qu'une vente décrémente un stock ou qu'un arrivage l'augmente,
          // la liste des alertes est instantanément recalculée à l'écran sans recharger la page.
          fetchCriticalStock();
        }
      )
      .subscribe();

    // Fonction de nettoyage (Cleanup) : Coupe le flux WebSocket à la destruction du composant pour prévenir les fuites de mémoire
    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [propItems]);

  /**
   * Handler: updateQty
   * Rôle: Incrémente ou décrémente la quantité de réapprovisionnement d'une référence.
   * Sécurité : Utilisation de Math.max(0, ...) pour empêcher les valeurs de commande négatives.
   * @param {string|number} id - Identifiant de la référence concernée
   * @param {number} val - Pas d'évolution (+1 ou -1)
   */
  const updateQty = (id, val) => {
    setOrderQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + val)
    }));
  };

  /**
   * Method: handleExportPDF
   * Rôle: Compile les données du formulaire, calcule le volume exact de pièces physiques commandées,
   * injecte l'image de marque et génère un fichier PDF au format paysage ('l') standardisé pour l'impression.
   */
  const handleExportPDF = () => {
    // Isolation exclusive des lignes possédant un volume de commande > 0
    const itemsToOrder = items.filter(item => (orderQuantities[item.id] || 0) > 0);

    if (itemsToOrder.length === 0) {
      alert("Veuillez saisir des quantités avant d'exporter.");
      return;
    }

    // Création d'une instance jsPDF en orientation Paysage (Landscape) pour assurer la lisibilité du tableau multicompartimenté
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    
    // --- INTÉGRATION DE L'IMAGE DU LOGO EN COORDONNÉES ABSOLUES ---
    const logoUrl = '/assets/logos/tapis.png'; 
    try {
        // Positionnement du fichier image : x=14, y=10, Largeur=40mm, Hauteur=15mm
        doc.addImage(logoUrl, 'PNG', 14, 10, 40, 15);
        
        // Configuration textuelle de la marque adjacente au logo
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40); 
        doc.text("TAPISAUTO", 59, 21); // Aligné à x=59 (14 + 40 + 5mm de padding)
        
        // Slogan institutionnel de l'Atelier
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("L'EXCELLENCE SUR MESURE", 59, 25);

    } catch (e) {
        // Mécanisme de fallback robuste : si le fichier image est absent, l'intégrité du PDF est maintenue via une alternative textuelle
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("TAPISAUTO", 14, 21);
        console.error("Logo non trouvé, affichage texte uniquement");
    }

    // --- MISE EN PAGE DE L'EN-TÊTE DU DOCUMENT ---
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("BON DE COMMANDE DÉTAILLÉ", 14, 40);
    
    // Tracé géométrique d'une ligne de séparation horizontale (Largeur étendue à 282mm pour le paysage)
    doc.setLineWidth(0.5);
    doc.line(14, 42, 282, 42); 

    doc.setFontSize(10);
    doc.setTextColor(100);
    
    // Métadonnées émetteur / récepteur : Bloc Fournisseur (à gauche)
    doc.setFont("helvetica", "bold");
    doc.text("FOURNISSEUR :", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${MOCK_SUPPLIER.name}`, 14, 57);
    doc.text(`${MOCK_SUPPLIER.email}`, 14, 62);
    doc.text(`Date : ${new Date().toLocaleDateString()}`, 14, 67);

    // Métadonnées d'expédition : Bloc de Livraison (à droite, aligné sur x=200)
    doc.setFont("helvetica", "bold");
    doc.text("ADRESSE DE LIVRAISON :", 200, 52);
    doc.setTextColor(79, 70, 229); // Accentuation couleur indigo premium
    doc.text("Dépôt TAPISAUTO", 200, 57);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Z.I. Secteur Ouest", 200, 62);
    doc.text("59000 Lille, France", 200, 67);

    // --- ALGORITHME DE PARCOURS ET DE VÉRIFICATION DES PIÈCES ---
    let grandTotalPieces = 0; // Accumulateur global calculant le volume d'unités physiques réelles demandées

    const tableRows = itemsToOrder.map(item => {
      const qte = orderQuantities[item.id] || 0;
      
      // Analyse booléenne unitaire : Un lot/batch n'impacte que les types de tapis réellement en sous-stock
      const hasAvt = item.tapis_avt_stock !== null && item.tapis_avt_stock <= 4;
      const hasR1 = item.tapis_r1_stock !== null && item.tapis_r1_stock <= 4;
      const hasR2 = item.tapis_r2_stock !== null && item.tapis_r2_stock <= 4;
      const hasPont = item.tapis_pont_stock !== null && item.tapis_pont_stock <= 4;
      const hasCoffre = item.tapis_coffre_stock !== null && item.tapis_coffre_stock <= 4;

      // Calcul multiplicateur : Nombre de types de tapis en alerte sur cette ligne × quantité de batch saisie
      const nbTypes = [hasAvt, hasR1, hasR2, hasPont, hasCoffre].filter(Boolean).length;
      const totalLigne = nbTypes * qte;
      grandTotalPieces += totalLigne; // Incrémentation du grand total logistique

      // Renvoie le tableau de cellules formatées pour la ligne courante de jspdf-autotable
      return [
        item.id,
        `${item.marque.toUpperCase()} ${item.modele_voiture}`,
        hasAvt ? qte : '-',
        hasR1 ? qte : '-',
        hasR2 ? qte : '-',
        hasPont ? qte : '-',
        hasCoffre ? qte : '-',
        // Cellule customisée sous forme d'objet pour appliquer un style d'accentuation propre à cette colonne
        { content: `${totalLigne}`, styles: { fontStyle: 'bold', textColor: [79, 70, 229] } }
      ];
    });

    // --- GÉNÉRATION AUTOMATIQUE DU TABLEAU ---
    autoTable(doc, {
      startY: 75, // Positionnement vertical sous le bloc d'en-tête
      head: [['REF ID', 'MODÈLE VÉHICULE', 'AVANT', 'RANG 1', 'RANG 2', 'PONT', 'COFFRE', 'TOTAL']],
      body: tableRows,
      theme: 'grid', // Affichage sous forme de grille comptable stricte
      headStyles: { fillColor: [40, 40, 40], fontSize: 9, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 15 },            // Contrainte de largeur pour l'ID
        1: { cellWidth: 70, halign: 'left' }, // Alignement à gauche textuel pour Marque + Modèle
        7: { cellWidth: 20, halign: 'right' } // Alignement comptable à droite pour les totaux
      }
    });

    // Détermination de la coordonnée de fin du tableau pour y apposer le tampon final de clôture
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.setFontSize(12);
    // Alignement à droite basé sur la marge maximale paysage (282mm)
    doc.text(`TOTAL GÉNÉRAL À LIVRER : ${grandTotalPieces} pièces`, 282, finalY, { align: 'right' });

    // Déclenchement du téléchargement natif dans le navigateur de l'administrateur
    doc.save(`Commande_Detailee_TAPISAUTO_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-[#11141D] rounded-[30px] border border-red-500/20 shadow-2xl overflow-hidden animate-in fade-in duration-500 min-h-[300px]">
      
      {/* HEADER BANNER - ÉTAT GLOBAL ET BOUTONS D'ACTIONS */}
      <div className="p-6 border-b border-white/5 bg-red-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase tracking-wider text-lg">Commande Fournisseur</h3>
            <p className="text-red-500/60 text-[10px] font-bold uppercase tracking-widest">
              {loading ? "Vérification..." : `${items.length} références en alerte`}
            </p>
          </div>
        </div>

        {/* Bouton d'exportation : Masqué si chargement ou s'il n'y a aucune anomalie constatée */}
        {!loading && items.length > 0 && (
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <FileDown size={16} />
            Générer PDF de commande
          </button>
        )}
      </div>
      
      {/* CORPS DE L'INTERFACE : LOGIQUE DE RENDU DES FLUX CONTROLEÉS */}
      <div className="p-6 space-y-3">
        {loading ? (
          /* ÉTAT 1 : CHARGEMENT / SYNCHRONISATION INITIALE */
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono text-xs gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
            <span>ANALYSE DES FLUX DE STOCKS EN DIRECT...</span>
          </div>
        ) : items.length > 0 ? (
          /* ÉTAT 2 : AFFICHAGE DES LIGNES CRITIQUES EN ALERTE */
          items.map(item => (
            <div key={item.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-white font-black uppercase italic text-sm">{item.marque}</span>
                    <span className="text-slate-500 font-bold uppercase text-xs">{item.modele_voiture}</span>
                </div>
                {/* Badges de signalement contextuels : N'affiche l'indicateur de stock que pour les tapis <= 4 */}
                <div className="flex gap-2 mt-2">
                    {item.tapis_avt_stock !== null && item.tapis_avt_stock <= 4 && <span className="text-[7px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black">AVT: {item.tapis_avt_stock}</span>}
                    {item.tapis_r1_stock !== null && item.tapis_r1_stock <= 4 && <span className="text-[7px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black">R1: {item.tapis_r1_stock}</span>}
                    {item.tapis_r2_stock !== null && item.tapis_r2_stock <= 4 && <span className="text-[7px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black">R2: {item.tapis_r2_stock}</span>}
                    {item.tapis_pont_stock !== null && item.tapis_pont_stock <= 4 && <span className="text-[7px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black">PONT: {item.tapis_pont_stock}</span>}
                    {item.tapis_coffre_stock !== null && item.tapis_coffre_stock <= 4 && <span className="text-[7px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black">COFFRE: {item.tapis_coffre_stock}</span>}
                </div>
              </div>

              {/* ETAGE DES CONTROLES DE QUANTITÉS DE COMMANDE (BATCH CONTROLS) */}
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="flex items-center bg-slate-900 rounded-xl border border-white/10 p-1">
                  <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-colors">
                    <Minus size={14} />
                  </button>
                  <input 
                    type="number" 
                    value={orderQuantities[item.id] || 0}
                    // Conversion de sécurité explicite de la saisie au clavier via parseInt
                    onChange={(e) => setOrderQuantities({...orderQuantities, [item.id]: parseInt(e.target.value) || 0})}
                    className="w-12 bg-transparent text-center text-white font-mono text-sm focus:outline-none"
                  />
                  <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-600 w-20 text-center">Batch Qty</div>
              </div>
            </div>
          ))
        ) : (
          /* ÉTAT 3 : TOUS LES FLUX DE STOCKS SONT COMPLETS (ZÉRO RUPTURE DÉTECTÉE) */
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 gap-3">
            <PackageSearch size={40} className="text-slate-500" />
            <span className="text-slate-400 font-mono text-xs uppercase tracking-widest">Aucune rupture détectée — Seuil nominal OK</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAlertView;