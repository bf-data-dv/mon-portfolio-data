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
    Rôle : Extraction incrémentale (toutes les heures) des transactions de ventes depuis 
           l'OLTP Supabase (PostgreSQL) et archivage brut partitionné dans le Data Lake S3 (Raw Zone).
    """
    try:
        # --- ÉTAPE 1 : CONTRÔLE DES PRÉREQUIS DE SÉCURITÉ ---
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {
                'statusCode': 500,
                'body': json.dumps("❌ Erreur : Variables d'environnement Supabase manquantes dans la configuration de la Lambda.")
            }
            
        # Instance éphémère du client Supabase pour isoler la connexion au scope du handler
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # --- ÉTAPE 2 : CALCUL DE LA FENÊTRE DE TEMPS (INGESTION INCRÉMENTALE) ---
        # Utilisation systématique de timezone.utc pour éviter les décalages d'heures d'été/hiver sur les serveurs AWS.
        maintenant = datetime.now(timezone.utc)
        il_y_a_une_heure = maintenant - timedelta(hours=1)
        timestamp_filtre = il_y_a_une_heure.isoformat() # Format ISO 8601 requis pour le filtrage PostgREST / Supabase

        print(f"🔄 Début du traitement - Extraction des ventes créées depuis : {timestamp_filtre}")

        # --- ÉTAPE 3 : EXTRACTION DE DONNÉES ET REQUÊTAGE AVEC JOINTURES (READ) ---
        # .select("*, ...") : Extrait toutes les colonnes de la table pivots 'sales_history'.
        # Jointures relationnelles incluses : Récupère la marque et le modèle dans 'inventory', ainsi que le nom dans 'qualites_tapis'.
        # .gte(...) : Filtre "Greater Than or Equal" pour assurer l'incrémentalité.
        reponse = supabase.table("sales_history") \
            .select("*, inventory(marque, modele_voiture), qualites_tapis(nom)") \
            .gte("created_at", timestamp_filtre) \
            .execute()

        ventes = reponse.data

        # --- ÉTAPE 4 : CHECK D'IDEMPOTENCE ET TRAITEMENT DU CAS VIDE ---
        # Si aucune transaction n'a eu lieu la dernière heure, on coupe l'exécution pour économiser les coûts de stockage S3.
        if not ventes:
            print("📭 Aucune nouvelle vente trouvée dans Supabase. Fin de la session d'ingestion.")
            return {
                'statusCode': 200,
                'body': json.dumps("Aucune nouvelle vente à traiter.")
            }

        print(f"📊 Extraction réussie : {len(ventes)} lignes de transactions prêtes à être ingérées.")

        # --- ÉTAPE 5 : SÉRIALISATION & FORMATAGE DATA LAKE ---
        # ensure_ascii=False préserve le codage des caractères accentués (ex: "Qualité Velours").
        # indent=4 structure le JSON pour faciliter les futures requêtes manuelles ou le debugging dans S3.
        donnees_json = json.dumps(ventes, ensure_ascii=False, indent=4)

        # --- ÉTAPE 6 : STRATÉGIE DE PARTITIONNEMENT HIERARCHIQUE ---
        # Structure de nommage standardisée de type Data Lake (Year/Month/Day).
        # Le formatage :02d garantit des dossiers à 2 chiffres (ex: mois=06 au lieu de mois=6), 
        # ce qui est une convention essentielle pour les outils d'analyses massives comme AWS Athena ou AWS Glue.
        chemin_s3 = f"raw/ventes/annee={maintenant.year}/mois={maintenant.month:02d}/jour={maintenant.day:02d}/ventes_{maintenant.strftime('%H%M')}.json"

        # --- ÉTAPE 7 : INGESTION (LOAD) DANS LA COUCHE RAW DU DATA LAKE ---
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=chemin_s3,
            Body=donnees_json,
            ContentType='application/json' # Définit explicitement le MIME-type pour la lecture directe dans S3
        )

        message_succes = f"✅ Pipeline terminé avec succès ! Objet JSON stocké : {chemin_s3}"
        print(message_succes)
        
        return {
            'statusCode': 200,
            'body': json.dumps(message_succes)
        }

    except Exception as e:
        # Capture globale de toute défaillance (Réseau, API Supabase saturée, Permission IAM S3 refusée...)
        # Idéal pour la traçabilité des erreurs dans AWS CloudWatch Logs.
        print(f"❌ Erreur critique lors de l'exécution du pipeline ETL : {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Erreur interne du pipeline : {str(e)}")
        }