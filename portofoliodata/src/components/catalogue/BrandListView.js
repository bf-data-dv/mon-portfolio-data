import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/SupabaseClient';
import { Search, SortAsc, SortDesc, TrendingUp, TrendingDown, Medal } from 'lucide-react';
import BrandCard from './BrandCard';

const BrandListView = ({ onBrandSelect, onFilterChange, initialFilter }) => {
  const [brandsData, setBrandsData] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState('AZ'); 
  // Initialisation sur 'all' par défaut
  const [activeCategory, setActiveCategory] = useState(initialFilter || 'all');

  // Synchronisation de l'état local avec le filtre provenant de l'URL
  useEffect(() => {
    setActiveCategory(initialFilter || 'all');
  }, [initialFilter]);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
   const { data, error } = await supabase.from('inventory').select('marque, year_start, year_end');
    
    if (!error && data) {
      const currentYear = new Date().getFullYear();

      const grouped = data.reduce((acc, item) => {
        const marque = item.marque;
        if (!acc[marque]) {
          acc[marque] = { 
            marque: marque, 
            segments: { collection: [], youngtimer: [], recente: [] },
            totalModels: 0
          };
        }

        const startYear = item.year_start ? new Date(item.year_start).getFullYear() : 0;
        
        if (startYear < currentYear - 30) {
          acc[marque].segments.collection.push(item);
        } 
        else if (startYear < currentYear - 15) {
          acc[marque].segments.youngtimer.push(item);
        } 
        else {
          acc[marque].segments.recente.push(item);
        }

        acc[marque].totalModels += 1;
        return acc;
      }, {});

      setBrandsData(Object.values(grouped));
      setGrandTotal(data.length);
    }
    setLoading(false);
  };

  const handleCategoryChange = (category) => {
    // Si on clique sur 'all' ou sur la catégorie déjà active, on bascule sur 'all'
    const newCategory = (category === 'all' || activeCategory === category) ? 'all' : category;
    setActiveCategory(newCategory);
    
    if (onFilterChange) {
      onFilterChange(newCategory === 'all' ? null : newCategory);
    }
  };

  useEffect(() => {
    let result = [...brandsData];
    if (activeCategory !== 'all') result = result.filter(b => b.segments[activeCategory].length > 0);
    if (searchTerm) result = result.filter(b => b.marque.toLowerCase().includes(searchTerm.toLowerCase()));
    
    switch (sortMode) {
      case 'AZ': result.sort((a, b) => a.marque.localeCompare(b.marque)); break;
      case 'ZA': result.sort((a, b) => b.marque.localeCompare(a.marque)); break;
      case 'VOL+': 
        result.sort((a, b) => {
          const countA = activeCategory === 'all' ? a.totalModels : a.segments[activeCategory].length;
          const countB = activeCategory === 'all' ? b.totalModels : b.segments[activeCategory].length;
          return countB - countA;
        }); 
        break;
      case 'VOL-': 
        result.sort((a, b) => {
          const countA = activeCategory === 'all' ? a.totalModels : a.segments[activeCategory].length;
          const countB = activeCategory === 'all' ? b.totalModels : b.segments[activeCategory].length;
          return countA - countB;
        }); 
        break;
      default: break;
    }
    setFilteredBrands(result);
  }, [searchTerm, sortMode, activeCategory, brandsData]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i=><div key={i} className="h-64 bg-white/5 rounded-[40px] animate-pulse"/>)}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      
      <div className="flex justify-start">
        <div className="relative w-full max-w-xs group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F111A] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      <div className="bg-[#0F111A]/50 p-3 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
          <SortBtn active={sortMode === 'AZ'} onClick={() => setSortMode('AZ')} icon={<SortAsc size={14}/>} label="A-Z" />
          <SortBtn active={sortMode === 'ZA'} onClick={() => setSortMode('ZA')} icon={<SortDesc size={14}/>} label="Z-A" />
          <SortBtn active={sortMode === 'VOL+'} onClick={() => setSortMode('VOL+')} icon={<TrendingUp size={14}/>} label="Vol +" />
          <SortBtn active={sortMode === 'VOL-'} onClick={() => setSortMode('VOL-')} icon={<TrendingDown size={14}/>} label="Vol -" />
        </div>

        <div className="flex items-center gap-2">
           {/* Bouton TOUTES ajouté ici */}
           <CategoryBtn 
              active={activeCategory === 'all'} 
              onClick={() => handleCategoryChange('all')}
              color="text-indigo-400" 
              label="Toutes"
           />
           <CategoryBtn 
              active={activeCategory === 'recente'} 
              onClick={() => handleCategoryChange('recente')}
              color="text-orange-700" 
              label="Récentes"
           />
           <CategoryBtn 
              active={activeCategory === 'youngtimer'} 
              onClick={() => handleCategoryChange('youngtimer')}
              color="text-slate-300" 
              label="Youngtimer"
           />
           <CategoryBtn 
              active={activeCategory === 'collection'} 
              onClick={() => handleCategoryChange('collection')}
              color="text-amber-400" 
              label="Collection"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {filteredBrands.map((item) => (
          <BrandCard 
            key={item.marque} 
            item={item} 
            activeCategory={activeCategory} 
            grandTotal={grandTotal} 
            onSelectMarque={() => onBrandSelect(item.marque)} 
          />
        ))}
      </div>
    </div>
  );
};

const SortBtn = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon} {label}
  </button>
);

const CategoryBtn = ({ active, onClick, color, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${active ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
  >
    <Medal size={14} className={`${color}`} fill="currentColor" />
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-400'}`}>
      {label}
    </span>
  </button>
);

export default BrandListView;