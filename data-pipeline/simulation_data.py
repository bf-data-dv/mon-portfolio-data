import os
import random
import time
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# ==============================================================================
# CONFIGURATION ET SETUP (SCOPE GLOBAL)
# ==============================================================================
# Ingestion des variables de configuration locales (.env)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Clause de garde pour bloquer l'exécution en cas d'absence d'identifiants valides
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Erreur : Clés Supabase non trouvées dans le fichier .env.")

# Initialisation du point d'accès à l'API de base de données Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def simuler_un_achat_aleatoire():
    """
    Rôle : Simuler le parcours d'achat complet d'un client sur le site.
    Logique métier : 
        1. Choix d'un véhicule et d'un pack de tapis au hasard.
        2. Contrôle de la disponibilité des stocks (sécurité transactionnelle).
        3. Décrémentation des stocks correspondants (Update).
        4. Enregistrement de l'achat dans l'historique des ventes (Insert avec clé étrangère UUID).
    """
    try:
        # --- ÉTAPE 1 : SÉLECTION ALÉATOIRE DU VÉHICULE ---
        # Simulation d'un utilisateur naviguant sur le catalogue d'un modèle précis
        vehicules = supabase.table("inventory").select("*").execute().data
        if not vehicules: 
            return # Arrêt de sécurité si le catalogue est vide
            
        vehicule = random.choice(vehicules)
        id_vehicule = vehicule["id"]

        # --- ÉTAPE 2 : DÉFINITION & SÉLECTION COMPOSITE DU PACK DE TAPIS ---
        # Structure de données associant un nom commercial aux colonnes de stock techniques impactées
        packs = {
            "Pack Avant": ["tapis_avt_stock"],
            "Pack Avant + Arrière": ["tapis_avt_stock", "tapis_r1_stock", "tapis_pont_stock"],
            "Pack Complet": ["tapis_avt_stock", "tapis_r1_stock", "tapis_pont_stock", "tapis_coffre_stock"]
        }
        nom_pack = random.choice(list(packs.keys()))
        colonnes = packs[nom_pack]

        # --- ÉTAPE 3 : VÉRIFICATION ET SÉCURISATION DES STOCKS (BUSINESS LOGIC) ---
        # Extraction de la ligne de stock associée au véhicule sélectionné
        req_stock = supabase.table("carpet_stock").select("*").eq("inventory_id", id_vehicule).execute()
        if not req_stock.data: 
            return
            
        stock = req_stock.data[0]
        
        # Simulation d'un "panier refusé" si l'une des pièces demandées est à NULL (inexistante) ou à 0 (rupture)
        for col in colonnes:
            if stock.get(col) is None or stock[col] <= 0:
                print(f"⚠️ Achat annulé : Rupture ou indisponibilité de l'élément [{col}] pour ce modèle.")
                return 

        # --- ÉTAPE 4 : RÉSOLUTION DES CLÉS ÉTRANGÈRES RELATIONNELLES (UUID) ---
        # Récupération dynamique des qualités disponibles en base pour lier l'achat à l'ID réel (UUID) de la table 'qualites_tapis'
        req_qualites = supabase.table("qualites_tapis").select("id, nom").execute()
        qualite = random.choice(req_qualites.data)
        id_qualite_uuid = qualite["id"]

        # --- ÉTAPE 5 : MISE À JOUR DE L'ÉTAT DU STOCK (UPDATE) ---
        # Génération d'un dictionnaire de mise à jour dynamique (Décrémentation de -1 pour les pièces achetées)
        update_data = {col: stock[col] - 1 for col in colonnes}
        supabase.table("carpet_stock").update(update_data).eq("inventory_id", id_vehicule).execute()

        # --- ÉTAPE 6 : ENREGISTREMENT DE LA TRANSACTION DANS L'OLTP (INSERT) ---
        donnees_vente = {
            "inventory_id": id_vehicule,
            "marque": vehicule.get("marque", "Inconnue"),
            "modele_voiture": vehicule.get("modele_voiture", "Inconnu"),
            "tapis_vendu": nom_pack,
            "items_details": colonnes,  # Stocké sous forme de tableau JSON dans PostgreSQL
            "quantite": 1,
            "total_price": 89.95,
            "qualite_id": id_qualite_uuid # Lien direct via clé étrangère UUID
        }
        
        supabase.table("sales_history").insert(donnees_vente).execute()
        
        print(f"🛒 Vente simulée avec succès : {nom_pack} ({qualite['nom']}) pour {vehicule.get('modele_voiture')}")

    except Exception as e:
        # Journalisation des exceptions pour la maintenance de la simulation
        print(f"❌ Erreur système lors de la simulation de la transaction : {str(e)}")


if __name__ == "__main__":
    print("🚀 Pipeline de simulation d'activité en continu démarré (Mode UUID) !")
    print("📢 Fréquence d'injection : 1 transaction toutes les 90 secondes.")
    
    # Boucle infinie (Daemon d'injection) pour alimenter en continu la base de données
    while True:
        simuler_un_achat_aleatoire()
        time.sleep(90) # Temporisation de 1 minute 30 secondes entre chaque événement