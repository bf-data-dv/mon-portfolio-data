import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import BrandListView from './BrandListView';
import ModelListView from './ModelListView';
import ProductPage from '../../pages/ProductPage';

const Catalogue = ({ session, addToCart }) => {
  const { marque, modele_voiture } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Source de vérité unique pour le filtre
  const activeFilter = searchParams.get('filter');

  // Nettoyage automatique uniquement si on quitte le catalogue
  // On enlève le nettoyage au changement de marque pour éviter les sauts d'état
  const handleFilterChange = (newFilter) => {
    if (newFilter) {
      setSearchParams({ filter: newFilter }, { replace: true });
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete('filter');
      setSearchParams(params, { replace: true });
    }
  };

  const handleBrandSelect = (brandName) => {
    // On garde le filtre même en changeant de vue pour une navigation fluide
    const query = activeFilter ? `?filter=${activeFilter}` : '';
    navigate(`/catalogue/${brandName}${query}`);
  };

  const handleBack = () => {
    const query = activeFilter ? `?filter=${activeFilter}` : '';
    if (modele_voiture) {
      navigate(`/catalogue/${marque}${query}`);
    } else {
      navigate(`/catalogue${query}`);
    }
  };

  return (
    <div className="pt-16 pb-20">
      {modele_voiture ? (
        <ProductPage 
          modelName={modele_voiture} 
          onBack={handleBack} 
          addToCart={addToCart} 
          session={session}
        />
      ) : marque ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ModelListView 
            brand={marque} 
            activeFilter={activeFilter} 
            onFilterChange={handleFilterChange}
            onModelSelect={(model) => navigate(`/catalogue/${marque}/${model.modele_voiture}${activeFilter ? `?filter=${activeFilter}` : ''}`)} 
            onBack={handleBack} 
            session={session}
          />
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
              Catalogue <span className="text-indigo-500">Sur-Mesure</span>
            </h2>
          </div>
          
          <BrandListView 
            onBrandSelect={handleBrandSelect} 
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter} // On passe directement la valeur de l'URL
          />
        </div>
      )}
    </div>
  );
};

export default Catalogue;