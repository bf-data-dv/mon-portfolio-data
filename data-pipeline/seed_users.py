import os
import random
from supabase import create_client
from faker import Faker
from dotenv import load_dotenv

# 1. Chargement des variables
load_dotenv()
fake = Faker('fr_FR')
URL = os.getenv("SUPABASE_URL")
# IMPORTANT : Utilise la Service Role Key pour avoir les droits admin
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

if not URL or not KEY:
    raise ValueError("❌ Erreur : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans le .env")

supabase = create_client(URL, KEY)

def create_mock_users(n=30):
    print(f"🚀 Début de la création de {n} utilisateurs via Auth API...")
    
    for i in range(n):
        email = fake.unique.email()
        
        # 1. Création de l'utilisateur dans Supabase Auth
        # Le Trigger dans SQL Editor va automatiquement créer la ligne dans 'profiles'
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": "TemporaryPassword123!",
                "email_confirm": True
            })
            user_id = auth_response.user.id
            
            # 2. Mise à jour du profil avec les données Faker
            profile_data = {
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "address_number": fake.building_number(),
                "address_street": fake.street_name(),
                "city": fake.city(),
                "zip_code": fake.postcode()
            }
            
            supabase.table("profiles").update(profile_data).eq("id", user_id).execute()
            print(f"✅ {i+1}/{n} | Utilisateur {email} créé et profil complété.")
            
        except Exception as e:
            print(f"❌ Erreur sur {email} : {e}")

    print("🏁 Opération terminée !")

if __name__ == "__main__":
    create_mock_users(30)