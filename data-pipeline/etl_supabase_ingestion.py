import os
import json
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
import boto3

# =========================================================================
# CONFIGURATION & VARIABLES D'ENVIRONNEMENT (SCOPE GLOBAL)
# =========================================================================
# Récupération sécurisée des clés de l'API Supabase définies dans la configuration de la fonction Lambda.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Initialisation du client AWS S3. 
# Sur AWS Lambda, boto3 s'authentifie implicitement grâce au rôle d'exécution IAM associé à la fonction.
s3_client = boto3.client('s3')
BUCKET_NAME = "brahim-data-storage-2026" 

def lambda_handler(event, context):
    """
    Point d'entrée officiel (Handler) pour la fonction AWS Lambda.
    Rôle : Extraction incrémentale des ventes et dépôt dans le Data Lake (Raw Zone).
    Communication : Le dépôt dans S3 déclenchera via un S3 Trigger la Lambda de facturation.
    """
    try:
        # --- ÉTAPE 1 : CONTRÔLE DES PRÉREQUIS DE SÉCURITÉ ---
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {
                'statusCode': 500,
                'body': json.dumps("❌ Erreur : Variables d'environnement Supabase manquantes.")
            }
            
        # Instance éphémère du client Supabase pour isoler la connexion au scope du handler
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # --- ÉTAPE 2 : CALCUL DE LA FENÊTRE DE TEMPS (INGESTION INCRÉMENTALE) ---
        maintenant = datetime.now(timezone.utc)
        il_y_a_une_heure = maintenant - timedelta(hours=1)
        timestamp_filtre = il_y_a_une_heure.isoformat()

        print(f"🔄 Début du traitement - Extraction des ventes créées depuis : {timestamp_filtre}")

        # --- ÉTAPE 3 : EXTRACTION DE DONNÉES AVEC JOINTURES (READ) ---
        # Jointures enrichies pour inclure les détails clients nécessaires à la future facturation.
        reponse = supabase.table("sales_history") \
            .select("""
                *, 
                inventory(marque, modele_voiture), 
                qualites_tapis(nom), 
                profiles(first_name, last_name, city, zip_code, address_number, address_street)
            """) \
            .gte("created_at", timestamp_filtre) \
            .execute()

        ventes = reponse.data

        # --- ÉTAPE 4 : CHECK D'IDEMPOTENCE ET TRAITEMENT DU CAS VIDE ---
        if not ventes:
            print("📭 Aucune nouvelle vente trouvée. Fin de la session.")
            return {
                'statusCode': 200,
                'body': json.dumps("Aucune nouvelle vente à traiter.")
            }

        print(f"📊 Extraction réussie : {len(ventes)} lignes prêtes à être ingérées.")

        # --- ÉTAPE 5 : SÉRIALISATION & FORMATAGE DATA LAKE ---
        donnees_json = json.dumps(ventes, ensure_ascii=False, indent=4)

        # --- ÉTAPE 6 : STRATÉGIE DE PARTITIONNEMENT HIERARCHIQUE ---
        chemin_s3 = f"raw/ventes/annee={maintenant.year}/mois={maintenant.month:02d}/jour={maintenant.day:02d}/ventes_{maintenant.strftime('%H%M')}.json"

        # --- ÉTAPE 7 : INGESTION (LOAD) DANS LE DATA LAKE & SIGNALEMENT ---
        # Le dépôt de cet objet déclenchera automatiquement la Lambda de facturation via un S3 Trigger.
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=chemin_s3,
            Body=donnees_json,
            ContentType='application/json',
            Metadata={'pipeline_origin': 'supabase_etl_ingestion'} 
        )

        message_succes = f"✅ Pipeline terminé avec succès ! Objet JSON stocké : {chemin_s3}"
        print(message_succes)
        
        return {
            'statusCode': 200,
            'body': json.dumps(message_succes)
        }

    except Exception as e:
        # Capture globale de toute défaillance pour CloudWatch Logs
        print(f"❌ Erreur critique lors de l'exécution du pipeline ETL : {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Erreur interne du pipeline : {str(e)}")
        }