import React from 'react';

/**
 * Component: Footer
 * Description: Pied de page global de l'application.
 * Rôle : Afficher les mentions de propriété intellectuelle, l'identité du concepteur, la stack technique principale,
 * et synchroniser dynamiquement l'année des droits d'auteur (Copyright) pour éviter toute maintenance manuelle.
 */
const Footer = () => {
  return (
    // Structure du conteneur : Fond sombre (#06080F), pleine largeur (w-full), séparateur supérieur subtil (border-t)
    <footer className="w-full py-12 border-t border-white/5 bg-[#06080F]">
      
      {/* Grille de centrage et d'alignement vertical des éléments textuels */}
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
      
        {/* CRÉDITS SIGNATURE : Bloc d'identification de l'ingénieur/concepteur avec lien de contact direct */}
        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mt-2">
          Developed by{' '}
          <a 
            href="mailto:brahimfettih12@gmail.com" 
            className="text-white hover:text-indigo-400 transition-colors cursor-pointer decoration-indigo-500/30 hover:underline underline-offset-4"
            title="Contacter Brahim Fettih par e-mail"
          >
            Brahim Fettih
          </a>
        </p>
        
        {/* COPYRIGHT DROITS RÉSERVÉS : Génération de l'année à la volée via l'API JavaScript native Date().getFullYear() */}
        {/* .tracking-tighter : Resserre le texte pour marquer la hiérarchie visuelle secondaire de cette mention légale */}
        <p className="text-[9px] text-slate-800 mt-4 font-medium uppercase tracking-tighter">
          &copy; {new Date().getFullYear()} Tapis Auto. All rights reserved.
        </p>
        
      </div>
    </footer>
  );
};

export default Footer;