import json
import boto3
import os
import urllib.parse
from datetime import datetime
from fpdf import FPDF

# Initialisation du client S3
s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
        
        # 1. SÉCURITÉ : Vérification du dossier source
        if not key.startswith("raw/ventes/"):
            return {'statusCode': 200, 'body': "Ignoré"}

        # 2. EXTRACTION DE LA DATE
        parts = key.split('/')
        year = parts[2].split('=')[1]
        month = parts[3].split('=')[1]
        day = parts[4].split('=')[1]
        
        # 3. LECTURE DU JSON
        reponse_s3 = s3.get_object(Bucket=bucket, Key=key)
        contenu_json = json.loads(reponse_s3['Body'].read().decode('utf-8'))
        
        # Gestion liste ou objet seul
        ventes = contenu_json if isinstance(contenu_json, list) else [contenu_json]
        
        for vente in ventes:
            nom_pdf = generer_facture(vente)
            filename = os.path.basename(nom_pdf)
            
            # 4. ARCHIVAGE
            target_key = f"raw/factures/annee={year}/mois={month}/jour={day}/{filename}"
            with open(nom_pdf, "rb") as f:
                s3.put_object(Bucket=bucket, Key=target_key, Body=f, ContentType='application/pdf')
            os.remove(nom_pdf)
            
        return {'statusCode': 200, 'body': "Succès"}
    except Exception as e:
        print(f"Erreur : {str(e)}")
        return {'statusCode': 500, 'body': str(e)}

def generer_facture(vente):
    # Identifiant unique
    vente_id = str(vente.get("saleId", "unknown"))
    nom_fichier = f"/tmp/facture_{vente_id}.pdf"
    
    # Données véhicule et finition
    marque = vente.get("brand", "N/A")
    modele = vente.get("modelName", "N/A")
    finish = vente.get("finish", "N/A")
    qte = vente.get("quantity", 1)
    
    # Calcul des prix
    base = float(vente.get("basePrice", 0))
    options = vente.get("options", {})
    prix_opt = vente.get("optionPrices", {})
    
    prix_total_unitaire = base
    libelle_produit = "Pack Avant"
    
    if options.get("rear"):
        prix_total_unitaire += float(prix_opt.get("rear", 0))
        libelle_produit += " + Arrière"
    if options.get("trunk"):
        prix_total_unitaire += float(prix_opt.get("trunk", 0))
        libelle_produit += " + Coffre"
        
    total_ligne = qte * prix_total_unitaire
    
    # Génération PDF
    pdf = FPDF()
    pdf.add_page()
    
    if os.path.exists('logo.png'):
        pdf.image('logo.png', 10, 8, 35)

    pdf.set_y(40) 
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, "FACTURE DE VENTE", ln=True, align='R')
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 7, txt=f"Véhicule : {marque} {modele}", ln=True)
    pdf.ln(10)
    
    # Tableau
    pdf.set_fill_color(230, 230, 230)
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(60, 10, "Produit", 1, 0, 'C', True)
    pdf.cell(30, 10, "Qualité", 1, 0, 'C', True)
    pdf.cell(20, 10, "Qté", 1, 0, 'C', True)
    pdf.cell(35, 10, "Prix Uni.", 1, 0, 'C', True)
    pdf.cell(35, 10, "Total", 1, 1, 'C', True)
    
    pdf.set_font("Arial", '', 10)
    pdf.cell(60, 10, libelle_produit, 1)
    pdf.cell(30, 10, finish, 1, 0, 'C')
    pdf.cell(20, 10, str(qte), 1, 0, 'C')
    pdf.cell(35, 10, f"{prix_total_unitaire:.2f} EUR", 1, 0, 'R')
    pdf.cell(35, 10, f"{total_ligne:.2f} EUR", 1, 1, 'R')
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(145, 10, "TOTAL GÉNÉRAL", 1, 0, 'R')
    pdf.cell(35, 10, f"{total_ligne:.2f} EUR", 1, 1, 'R')
    
    pdf.output(nom_fichier)
    return nom_fichier