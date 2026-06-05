import React, { useState } from 'react';
import { Save, Calendar, Car, LayoutGrid, Package } from 'lucide-react';
import { supabase } from '../services/SupabaseClient'; // Vérifie que le chemin est correct

const AddProductForm = () => {
  const [formData, setFormData] = useState({
    marque: '',
    modele_voiture: '',
    year_start: '',
    year_end: '',
    tapis_avt: true,
    tapis_pont: false,
    tapis_r1: true,
    tapis_r2: false,
    tapis_coffre: false,
    // Stocks individuels
    tapis_avt_stock: 0,
    tapis_r1_stock: 0,
    tapis_pont_stock: 0,
    tapis_r2_stock: 0,
    tapis_coffre_stock: 0
  });

  // Sécurité logique : Tapis Pont uniquement si Tapis R1 est possible + Gestion des stocks
  const handleToggle = (id) => {
    setFormData(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      
      // Si on désactive un tapis, on remet son stock à 0
      if (!newState[id]) {
        newState[`${id}_stock`] = 0;
      }

      // Règle métier : si R1 devient faux, Pont devient forcément faux
      if (id === 'tapis_r1' && newState.tapis_r1 === false) {
        newState.tapis_pont = false;
        newState.tapis_pont_stock = 0;
      }
      
      return newState;
    });
  };

  const handleStockChange = (id, value) => {
    setFormData(prev => ({
      ...prev,
      [`${id}_stock`]: parseInt(value) || 0
    }));
  };

  const handleSave = async () => {
    try {
      console.log("Envoi à l'inventaire :", formData);
      
      const { data, error } = await supabase
        .from('inventory')
        .insert([
          {
            marque: formData.marque,
            modele_voiture: formData.modele_voiture,
            year_start: formData.year_start,
            year_end: formData.year_end === "" ? null : formData.year_end,
            tapis_avt: formData.tapis_avt,
            tapis_pont: formData.tapis_pont,
            tapis_r1: formData.tapis_r1,
            tapis_r2: formData.tapis_r2,
            tapis_coffre: formData.tapis_coffre,
            // Insertion des stocks spécifiques
            tapis_avt_stock: formData.tapis_avt_stock,
            tapis_r1_stock: formData.tapis_r1_stock,
            tapis_pont_stock: formData.tapis_pont_stock,
            tapis_r2_stock: formData.tapis_r2_stock,
            tapis_coffre_stock: formData.tapis_coffre_stock
          }
        ]);

      if (error) throw error;
      alert("Gabarit et stocks enregistrés avec succès !");
      
    } catch (error) {
      alert("Erreur : " + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Nouvelle <span className="text-indigo-500">Découpe</span>
          </h2>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">Configuration précise du gabarit d'usine</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
        >
          <Save size={18} /> Enregistrer le Gabarit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- SECTION IDENTIFICATION --- */}
        <div className="bg-slate-900/40 p-8 rounded-[30px] border border-white/5 space-y-6">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Car size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Identification Véhicule</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 ml-2 mb-1">Marque</label>
              <input 
                type="text" 
                placeholder="ex: BMW"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
                onChange={(e) => setFormData({...formData, marque: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 ml-2 mb-1">Modèle précis</label>
              <input 
                type="text" 
                placeholder="ex: Série 3 G20"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
                onChange={(e) => setFormData({...formData, modele_voiture: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* --- SECTION CHRONOLOGIE (Précision Phase) --- */}
        <div className="bg-slate-900/40 p-8 rounded-[30px] border border-white/5 space-y-6">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <Calendar size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Période de Production (Phase)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 ml-2 mb-1">Date Début</label>
              <input 
                type="date" 
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-300"
                onChange={(e) => setFormData({...formData, year_start: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 ml-2 mb-1">Date Fin</label>
              <input 
                type="date" 
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-300"
                onChange={(e) => setFormData({...formData, year_end: e.target.value})}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">Important : La précision au jour près permet de distinguer les phases.</p>
        </div>

        {/* --- SECTION CONFIGURATION TAPIS --- */}
        <div className="md:col-span-2 bg-[#11141D] p-8 rounded-[30px] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-emerald-400">
              <LayoutGrid size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Composition & Stocks du Kit</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { id: 'tapis_avt', label: 'Avant (x2)' },
              { id: 'tapis_r1', label: 'Arrière (R1)' },
              { id: 'tapis_pont', label: 'Pont Milieu', disabled: !formData.tapis_r1 },
              { id: 'tapis_r2', label: 'Arrière (R2)' },
              { id: 'tapis_coffre', label: 'Coffre' },
            ].map((item) => (
              <div key={item.id} className="space-y-3">
                <button
                  disabled={item.disabled}
                  onClick={() => handleToggle(item.id)}
                  className={`w-full p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                    formData[item.id] 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-950 border-white/5 text-slate-600 opacity-50'
                  } ${item.disabled ? 'cursor-not-allowed grayscale' : ''}`}
                >
                  <div className={`w-3 h-3 rounded-full ${formData[item.id] ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`} />
                  <span className="text-[10px] font-black uppercase tracking-tight text-center">{item.label}</span>
                </button>
                
                {/* Champ Stock individuel sous chaque bouton */}
                <div className={`flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-white/5 transition-opacity ${!formData[item.id] ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                  <Package size={14} className="text-emerald-500 shrink-0" />
                  <input 
                    type="number" 
                    placeholder="0"
                    className="bg-transparent w-full text-xs font-bold text-white focus:outline-none"
                    value={formData[`${item.id}_stock`]}
                    onChange={(e) => handleStockChange(item.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductForm;