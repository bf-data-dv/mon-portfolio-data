import React, { useState } from 'react';
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle, Package, Minus, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../../services/SupabaseClient';

const Cart = ({ cart, onRemoveItem, onUpdateQuantity, onUpdateOptions, onBack, onClearCart }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      setIsSubmitting(true);

      for (const item of cart) {
        let realId;
        const stringId = String(item.id);
        
        if (stringId.includes('-')) {
          realId = parseInt(stringId.split('-')[0], 10);
        } else {
          realId = parseInt(stringId, 10);
        }

        if (isNaN(realId)) {
          throw new Error(`L'identifiant du produit est invalide : ${item.id}`);
        }

        let targetQualityId = null;
        
        if (item.finish) {
          const cleanFinishName = item.finish.trim(); 

          const { data: qualityData, error: qualityError } = await supabase
            .from('qualites_tapis')
            .select('id')
            .ilike('nom', cleanFinishName)
            .maybeSingle();

          if (qualityError) {
            console.error("Erreur de requête qualites_tapis:", qualityError.message);
          }

          if (qualityData) {
            targetQualityId = qualityData.id;
          } else {
            const lowerFinish = cleanFinishName.toLowerCase();
            if (lowerFinish === 'excellence') {
              targetQualityId = 'ce4aab43-c751-42cf-9c4d-63cfb7b775ce';
            } else if (lowerFinish === 'prestige') {
              targetQualityId = '3539c329-ce38-4e38-b029-c584faeb0244';
            } else if (lowerFinish === 'confort') {
              targetQualityId = 'c6b982bc-78e2-4ec7-84a0-8bec822b93e3';
            } else if (lowerFinish === 'classique +') {
              targetQualityId = '386b8f69-39ad-483d-9c9f-9915f861b1c6';
            }
          }
        }

        if (!targetQualityId) {
          throw new Error(`Impossible de lier la finition "${item.finish}" à un identifiant unique de qualité.`);
        }

        const { data: currentStock, error: stockError } = await supabase
          .from('carpet_stock')
          .select('*')
          .eq('inventory_id', realId) 
          .single();

        if (stockError) throw stockError;

        const updatedFields = {};
        updatedFields.tapis_avt_stock = Math.max(0, (currentStock.tapis_avt_stock || 0) - item.quantity);
        
        if (item.options?.rear) {
          updatedFields.tapis_r1_stock = Math.max(0, (currentStock.tapis_r1_stock || 0) - item.quantity);
          updatedFields.tapis_pont_stock = Math.max(0, (currentStock.tapis_pont_stock || 0) - item.quantity);
        }
        
        if (item.options?.trunk) {
          updatedFields.tapis_coffre_stock = Math.max(0, (currentStock.tapis_coffre_stock || 0) - item.quantity);
        }

        const { error: updateError } = await supabase
          .from('carpet_stock')
          .update(updatedFields)
          .eq('inventory_id', realId);

        if (updateError) throw updateError;

        // Préparation des détails pour la nouvelle colonne JSONB
        const itemsVendus = ['avant'];
        if (item.options?.rear) itemsVendus.push('arriere');
        if (item.options?.trunk) itemsVendus.push('coffre');

        const { error: salesError } = await supabase
          .from('sales_history')
          .insert([{
            inventory_id: realId,
            marque: (item.brand || 'INCONNUE').toUpperCase(),
            modele_voiture: item.modelName || 'Inconnu',
            tapis_vendu: itemsVendus.join(', '),
            items_details: itemsVendus,
            quantite: item.quantity,
            total_price: item.price * item.quantity,
            qualite_id: targetQualityId
          }]);

        if (salesError) throw salesError;
      }

      if (typeof onClearCart === 'function') {
        onClearCart();
      }
      localStorage.removeItem('cart');
      alert("Commande validée avec succès !");
      onBack();

    } catch (error) {
      console.error("Erreur lors de la validation de la commande:", error.message);
      alert(`Erreur : Impossible de finaliser la commande (${error.message})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4">
      <div className="flex items-center gap-6 mb-10">
        <button onClick={onBack} disabled={isSubmitting} className="p-3 bg-slate-900 rounded-full text-white border border-white/5 shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50">
          <ArrowLeft size={18} />
        </button>
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic leading-none">
            Mon Panier
          </h2>
          <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
            {totalItems} article{totalItems > 1 ? 's' : ''} sélectionné{totalItems > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/5 rounded-[40px] py-20 text-center backdrop-blur-xl">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="text-slate-500" size={32} />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Votre panier est vide</p>
          <button onClick={onBack} className="mt-6 text-indigo-400 font-bold uppercase text-xs hover:underline">
            Retourner au catalogue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <div key={`${item.id}-${index}`} className="bg-white rounded-[30px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white">
                <div className="flex items-center gap-5 w-full">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Package className="text-indigo-600" size={24} />
                  </div>
                  <div className="text-left flex-grow">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">
                      {item.brand} {item.modelName}
                    </p>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none mb-3">
                      Finition {item.finish}
                    </h3>
                    <div className="space-y-1 border-l-2 border-slate-100 pl-4">
                      <div className="flex justify-between w-full md:w-64 items-center">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Tapis Avant (Base)</span>
                        <span className="text-slate-900 text-[10px] font-black">{Number(item.basePrice).toFixed(2)}€</span>
                      </div>
                      {item.options?.rear && (
                        <div className="flex justify-between w-full md:w-64 items-center">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => onUpdateOptions(index, 'rear')}
                              disabled={isSubmitting}
                              className="p-0.5 bg-red-50 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Option Arrière + Pont</span>
                          </div>
                          <span className="text-indigo-600 text-[10px] font-black">
                            +{Number(item.optionPrices?.rear || 0).toFixed(2)}€
                          </span>
                        </div>
                      )}
                      {item.options?.trunk && (
                        <div className="flex justify-between w-full md:w-64 items-center">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => onUpdateOptions(index, 'trunk')}
                              disabled={isSubmitting}
                              className="p-0.5 bg-red-50 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Option Coffre</span>
                          </div>
                          <span className="text-indigo-600 text-[10px] font-black">
                            +{Number(item.optionPrices?.trunk || 0).toFixed(2)}€
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right min-w-[80px]">
                    <p className="text-slate-900 font-black text-lg">{(item.price * item.quantity).toFixed(2)}€</p>
                  </div>
                  <div className="flex items-center bg-slate-100 rounded-2xl p-1.5">
                    <button onClick={() => onUpdateQuantity(index, -1)} disabled={isSubmitting} className="p-1.5 text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-50">
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <span className="w-10 text-center font-black text-slate-900">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(index, 1)} disabled={isSubmitting} className="p-1.5 text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-50">
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                  <button onClick={() => onRemoveItem(index)} disabled={isSubmitting} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-2xl disabled:opacity-50">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-indigo-600 rounded-[40px] p-8 sticky top-8 shadow-2xl border border-white/10">
              <h3 className="text-white font-black uppercase tracking-widest text-sm mb-8 flex items-center gap-3">
                <CheckCircle size={20} /> Récapitulatif
              </h3>
              <div className="space-y-4 mb-10">
                <div className="flex justify-between text-indigo-200 font-bold uppercase text-[11px] tracking-widest">
                  <span>Sous-total</span>
                  <span className="text-white">{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="h-px bg-white/10 w-full" />
                <div className="flex justify-between items-end">
                  <span className="text-white font-black uppercase text-xs tracking-[0.2em]">Total</span>
                  <span className="text-white font-black text-3xl italic leading-none">
                    {totalPrice.toFixed(2)}€
                  </span>
                </div>
              </div>
              <button onClick={handleCheckout} disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-[0.2em] py-6 rounded-[25px] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Traitement...
                  </>
                ) : (
                  <>Valider la commande</>
                )}
              </button>
              <p className="text-center text-indigo-300 text-[9px] font-bold uppercase mt-6 tracking-widest opacity-60">
                TVA et frais de port calculés à l'étape suivante
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;