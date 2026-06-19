import os
from dotenv import load_dotenv
from supabase import create_client, Client


# ==============================================================================
# CONFIGURATION SUPABASE (ADMINISTRATEUR)
# ==============================================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("REACT_APP_SUPABASE_URL")
# On utilise ici la clé service_role pour avoir les droits d'écriture/suppression globaux
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Vérification de sécurité
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Erreur critique : SUPABASE_URL ou SUPABASE_SERVICE_KEY introuvables. Vérifiez votre fichier .env.")

# Initialisation du client avec la clé d'administration
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Constante métier : Volume arbitraire injecté pour l'initialisation des stocks disponibles
STOCK_INITIAL = 10


def nettoyer_et_uniformiser():
    """
    Rôle : Recréer un état propre et synchronisé de la table 'carpet_stock' 
           en fonction du catalogue de tapis disponibles dans 'inventory'.
    Méthode : Tronquage logique de la table cible, mapping conditionnel et Bulk Insert par lots.
    """
    try:
        # --- ÉTAPE 1 : TRONQUAGE LOGIQUE (PURGE) ---
        print("🗑️ Nettoyage de la table 'carpet_stock'...")
        # PostgREST n'autorisant pas le delete() sans filtre de sécurité, on cible
        # toutes les clés primaires supérieures à 0 pour purger intégralement la table.
        supabase.table("carpet_stock").delete().gt("inventory_id", 0).execute()
        
        # --- ÉTAPE 2 : EXTRACTION DU CATALOGUE RÉFÉRENT (READ) ---
        print("📥 Lecture du catalogue de référence 'inventory'...")
        # On extrait l'intégralité du catalogue ordonné par ID pour garantir le déterminisme de la boucle
        req_inventory = supabase.table("inventory").select("*").order("id").execute()
        tous_les_vehicules = req_inventory.data
        
        print(f"📋 {len(tous_les_vehicules)} véhicules trouvés. Début de la génération des stocks...")
        
        # Mapping de correspondance : [Colonne booléenne dans 'inventory'] -> [Colonne entière dans 'carpet_stock']
        liaison_tapis = {
            "tapis_avt": "tapis_avt_stock",
            "tapis_r1": "tapis_r1_stock",
            "tapis_r2": "tapis_r2_stock",
            "tapis_coffre": "tapis_coffre_stock",
            "tapis_pont": "tapis_pont_stock"
        }
        
        nouvelles_lignes_stock = []

        # --- ÉTAPE 3 : TRANSFORMATION & ALIGNEMENT DES DONNÉES (TRANSFORM) ---
        for vehicule in tous_les_vehicules:
            id_voiture = vehicule["id"]
            
            # Initialisation de la structure de base (Modèle de données cible)
            ligne_stock = {
                "inventory_id": id_voiture,
                "tapis_avt_stock": None,
                "tapis_r1_stock": None,
                "tapis_r2_stock": None,
                "tapis_pont_stock": None,
                "tapis_coffre_stock": None
            }
            
            # Évaluation de la présence réelle de chaque variante de tapis
            for col_inv, col_stock in liaison_tapis.items():
                # Si le catalogue indique que cette pièce existe spécifiquement pour ce véhicule (True)
                if vehicule.get(col_inv) is True:
                    ligne_stock[col_stock] = STOCK_INITIAL
                else:
                    # Reste explicitement à NULL (None) si le tapis n'est pas pris en compte pour ce modèle
                    ligne_stock[col_stock] = None
                    
            nouvelles_lignes_stock.append(ligne_stock)

        # --- ÉTAPE 4 : CHARGEMENT EN MASSE PAR LOTS (BULK INSERT / LOAD) ---
        print("📤 Insertion des nouvelles données alignées dans Supabase...")
        
        # Découpage de la liste globale en sous-paquets (Chunks) de 100 lignes.
        # Cette technique évite de surcharger la mémoire ou de déclencher un timeout HTTP sur l'API PostgREST.
        paquet_taille = 100
        for i in range(0, len(nouvelles_lignes_stock), paquet_taille):
            paquet = nouvelles_lignes_stock[i:i + paquet_taille]
            # Envoi d'une seule requête HTTP POST contenant 100 insertions simultanées
            supabase.table("carpet_stock").insert(paquet).execute()
            
        print(f"✨ Uniformisation réussie ! {len(nouvelles_lignes_stock)} lignes créées.")
        print("📦 Tous les tapis existants ont 10 en stock. Les variantes non applicables sont à NULL.")

    except Exception as e:
        # Capture de toute anomalie de transaction (Erreur SQL, rupture réseau, clé étrangère brisée...)
        print(f"❌ Une erreur critique est survenue durant le traitement : {str(e)}")


if __name__ == "__main__":
    # Exécution sécurisée du point d'entrée uniquement si le script est appelé directement
    nettoyer_et_uniformiser()