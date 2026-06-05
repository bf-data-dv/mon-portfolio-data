import React, { useState } from 'react';
// Collection d'icônes Lucide-React pour les actions de contrôle (Fermeture, Sauvegarde, Incrément, Décrément)
import { X, Save, Plus, Minus } from 'lucide-react';

/**
 * Component: StockModal
 * Description: Fenêtre modale d'administration permettant l'ajustement en temps réel des niveaux de stock d'un produit.
 * Rôle : Gérer un état local temporaire des stocks, fournir des contrôles d'incrémentation sécurisés (pas de stock négatif),
 * formater dynamiquement les intitulés techniques de la base de données et renvoyer les nouvelles valeurs au contrôleur parent.
 * * @param {Object} props
 * @param {Object} props.item - Objet de données complet de la ligne d'inventaire ciblée (provenant de Supabase)
 * @param {Function} props.onClose - Callback de fermeture de la modale (remet l'état de sélection à null chez le parent)
 * @param {Function} props.onSave - Callback d'enregistrement recevant l'identifiant de la ligne et l'objet des nouveaux stocks
 */
const StockModal = ({ item, onClose, onSave }) => {
  
  // --- ÉTAT LOCAL (LOCAL STATE) ---
  // Initialisation synchronisée sur les propriétés physiques du modèle. 
  // Utilisation d'un opérateur de repli (Coalescing || 0) pour pallier les éventuelles valeurs NULL en base de données.
  const [counts, setCounts] = useState({
    tapis_avt_stock: item.tapis_avt_stock || 0,
    tapis_r1_stock: item.tapis_r1_stock || 0,
    tapis_r2_stock: item.tapis_r2_stock || 0,
    tapis_pont_stock: item.tapis_pont_stock || 0,
    tapis_coffre_stock: item.tapis_coffre_stock || 0,
  });

  /**
   * Method: handleChange
   * Rôle: Modificateur générique pour ajuster les compteurs de pièces.
   * Sécurité : Encapsulation dans un Math.max(0, ...) pour interdire strictement les stocks négatifs,
   * évitant ainsi les anomalies logistiques en amont de la validation.
   * * @param {string} key - La clé d'état spécifique à modifier (ex: 'tapis_coffre_stock')
   * @param {number} delta - La variation numérique appliquée, typiquement (-1) ou (+1)
   */
  const handleChange = (key, delta) => {
    setCounts(prev => ({ 
      ...prev, 
      [key]: Math.max(0, prev[key] + delta) 
    }));
  };

  return (
    // Overlay d'arrière-plan de la modale : Couverture totale (inset-0), floutage arrière (backdrop-blur-sm) et profondeur z-index élevée
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      
      {/* Conteneur principal de la boîte de dialogue avec animation d'entrée fluide (zoom-in) */}
      <div className="bg-[#11141D] border border-white/10 rounded-[30px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* =========================================================================
            SECTION 1 : ENTÊTE (IDENTIFICATION DU VÉHICULE ET BOUTON FERMETURE)
            ========================================================================= */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
          <div>
            <h3 className="text-white font-black italic uppercase tracking-tight">{item.marque}</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase">{item.modele_voiture}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        {/* =========================================================================
            SECTION 2 : FORMULAIRE DYNAMIQUE DE CONFIGURATION DES STOCKS
            ========================================================================= */}
        <div className="p-6 space-y-4">
          {Object.keys(counts).map((key) => (
            // FILTRE DE RENDU CONDITIONNEL :
            // On vérifie dans l'objet d'origine 'item' que cette pièce existe pour ce modèle précis.
            // Si le champ vaut NULL en base, la ligne de contrôle de stock n'est pas générée (Gabarit incomplet / Option non existante).
            item[key] !== null && (
              <div key={key} className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-white/5">
                
                {/* PARSING ET NETTOYAGE UI DU LABEL TECHNIQUE :
                    Transforme par exemple la chaîne SQL "tapis_avt_stock" en "Avant" lisible par l'administrateur. */}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {key.replace('tapis_', '').replace('_stock', '').replace('avt', 'Avant')}
                </span>
                
                {/* BLOC DE CONTRÔLE DE QUANTITÉ */}
                <div className="flex items-center gap-4">
                  {/* Bouton de décrémentation (-1) */}
                  <button 
                    onClick={() => handleChange(key, -1)} 
                    className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Minus size={14}/>
                  </button>
                  
                  {/* Affichage de la valeur courante (w-6 fixe et font-mono pour éviter les sauts visuels entre 9 et 10) */}
                  <span className="text-white font-mono font-bold w-6 text-center">{counts[key]}</span>
                  
                  {/* Bouton d'incrémentation (+1) */}
                  <button 
                    onClick={() => handleChange(key, 1)} 
                    className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Plus size={14}/>
                  </button>
                </div>

              </div>
            )
          ))}
        </div>

        {/* =========================================================================
            SECTION 3 : BARRE D'ACTIONS INFERIEURE (ANNULATION ET PERSISTANCE)
            ========================================================================= */}
        <div className="p-6 bg-slate-950/50 flex gap-3">
          {/* Bouton d'annulation simple : Ferme la modale sans propager de modifications */}
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            Annuler
          </button>
          
          {/* Bouton de soumission : Transmet l'identifiant unique SQL et le payload compressé des stocks */}
          <button 
            onClick={() => onSave(item.id, counts)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/10"
          >
            <Save size={14}/> Enregistrer
          </button>
        </div>

      </div>
    </div>
  );
};

export default StockModal;