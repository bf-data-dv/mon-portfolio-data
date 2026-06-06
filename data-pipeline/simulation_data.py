import os
import random
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# ==============================================================================
# CONFIGURATION
# ==============================================================================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Erreur : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def simuler_un_achat_aleatoire():
    try:
        # --- ÉTAPE 0 : SÉLECTION DU CLIENT ---
        users = supabase.table("profiles").select("id").execute().data
        if not users:
            print("⚠️ Aucun profil client trouvé.")
            return
        client_aleatoire = random.choice(users)
        user_id = client_aleatoire["id"]

        # --- ÉTAPE 1 : CHOIX VÉHICULE ---
        vehicules = supabase.table("inventory").select("*").execute().data
        if not vehicules: return
        vehicule = random.choice(vehicules)
        id_vehicule = vehicule["id"]

        # --- ÉTAPE 2 : PACKS ---
        packs = {
            "Pack Avant": ["tapis_avt_stock"],
            "Pack Avant + Arrière": ["tapis_avt_stock", "tapis_r1_stock", "tapis_pont_stock"],
            "Pack Complet": ["tapis_avt_stock", "tapis_r1_stock", "tapis_pont_stock", "tapis_coffre_stock"]
        }
        nom_pack = random.choice(list(packs.keys()))
        colonnes = packs[nom_pack]

        # --- ÉTAPE 3 : STOCK ---
        req_stock = supabase.table("carpet_stock").select("*").eq("inventory_id", id_vehicule).execute()
        if not req_stock.data: return
        stock = req_stock.data[0]
        
        for col in colonnes:
            if stock.get(col) is None or stock[col] <= 0:
                print(f"⚠️ Stock insuffisant pour {nom_pack}.")
                return 

        # --- ÉTAPE 4 : QUALITÉ ---
        req_qualites = supabase.table("qualites_tapis").select("id, nom").execute()
        qualite = random.choice(req_qualites.data)

        # --- ÉTAPE 5 : MISE À JOUR STOCK ---
        update_data = {col: stock[col] - 1 for col in colonnes}
        supabase.table("carpet_stock").update(update_data).eq("inventory_id", id_vehicule).execute()

        # --- ÉTAPE 6 : INSERTION VENTE (LIÉE AU CLIENT) ---
        donnees_vente = {
            "user_id": user_id, 
            "inventory_id": id_vehicule,
            "marque": vehicule.get("marque", "Inconnue"),
            "modele_voiture": vehicule.get("modele_voiture", "Inconnu"),
            "tapis_vendu": nom_pack,
            "items_details": colonnes,
            "quantite": 1,
            "total_price": 89.95,
            "qualite_id": qualite["id"]
        }
        
        supabase.table("sales_history").insert(donnees_vente).execute()
        print(f"🛒 Vente validée | Client: {user_id[:6]}... | Pack: {nom_pack}")

    except Exception as e:
        print(f"❌ Erreur système : {str(e)}")

if __name__ == "__main__":
    print("🚀 Simulation démarrée. Press Ctrl+C pour arrêter.")
    while True:
        simuler_un_achat_aleatoire()
        time.sleep(90)