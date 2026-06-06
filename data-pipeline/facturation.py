import json
import boto3
import os
import urllib.parse
from datetime import datetime
from fpdf import FPDF

# Initialisation du client S3
s3 = boto3.client('s3')

def nettoyer_texte(texte):
    """Remplace les caractères spéciaux/exotiques par leurs équivalents standards"""
    if not isinstance(texte, str):
        return texte
    replacements = {
        "—": "-", "–": "-", "’": "'", "…": "...", "€": "EUR"
    }
    for old, new in replacements.items():
        texte = texte.replace(old, new)
    return texte

def lambda_handler(event, context):
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
        
        if not key.startswith("raw/ventes/"):
            return {'statusCode': 200, 'body': "Ignoré"}

        parts = key.split('/')
        year = parts[2].split('=')[1]
        month = parts[3].split('=')[1]
        day = parts[4].split('=')[1]
        
        reponse_s3 = s3.get_object(Bucket=bucket, Key=key)
        contenu_json = json.loads(reponse_s3['Body'].read().decode('utf-8'))
        
        for vente in contenu_json:
            nom_pdf = generer_facture(vente)
            filename = os.path.basename(nom_pdf)
            
            target_key = f"raw/factures/annee={year}/mois={month}/jour={day}/{filename}"
            
            with open(nom_pdf, "rb") as f:
                s3.put_object(
                    Bucket=bucket,
                    Key=target_key,
                    Body=f,
                    ContentType='application/pdf'
                )
            os.remove(nom_pdf)
            
        return {'statusCode': 200, 'body': "Succès"}
    except Exception as e:
        print(f"Erreur : {str(e)}")
        return {'statusCode': 500, 'body': str(e)}


class FacturePDF(FPDF):
    """Classe personnalisée pour héberger la structure globale de la facture"""
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align='C')
        self.set_y(-20)
        self.cell(0, 10, "TapisAuto ERP - Capital de 10 000 EUR - SIRET 123 456 789 00012", align='C')


def generer_facture(vente):
    vente_id = vente.get("id", "unknown")
    date_brute = vente.get("created_at", datetime.now().isoformat())
    
    try:
        date_obj = datetime.strptime(date_brute.split("T")[0], "%Y-%m-%d")
        date_facture = date_obj.strftime("%d/%m/%Y")
    except Exception:
        date_facture = datetime.now().strftime("%d/%m/%Y")
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nom_fichier = f"/tmp/facture_{vente_id}_{timestamp}.pdf"
    
    profil = vente.get("profiles", {})
    inventory = vente.get("inventory", {})
    qualite = vente.get("qualites_tapis", {})
    items = vente.get("items", [])
    
    marque = nettoyer_texte(inventory.get("marque", "N/A")).upper()
    modele = nettoyer_texte(inventory.get("modele_voiture", "N/A"))
    
    pdf = FacturePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # ─── EN-TÊTE CORPORATE AVEC LOGO ET TEXTE À DROITE ───────────────────────
    if os.path.exists('logo.png'):
        pdf.image('logo.png', 10, 10, 25) # Logo réduit à 25mm
        pdf.set_x(40) # On décale le texte à droite du logo (25+15 de marge)
        pdf.set_y(10)
        
        # Le titre "TapisAuto" en bleu a été retiré ici
        
        pdf.set_font("Helvetica", size=9)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(100, 4, "TapisAuto SAS", ln=True, x=40)
        pdf.set_x(40)
        pdf.cell(100, 4, "15 Rue de l'Innovation", ln=True)
        pdf.set_x(40)
        pdf.cell(100, 4, "59100 Roubaix, France", ln=True)
        pdf.set_x(40)
        pdf.cell(100, 4, "contact@tapisauto.fr", ln=True)
        pdf.set_y(35) # Repositionnement sous le bloc en-tête
    else:
        pdf.set_y(12)
        pdf.set_font("Helvetica", 'B', 22)
        pdf.set_text_color(79, 70, 229)
        pdf.cell(100, 10, "TapisAuto", ln=False)
        pdf.set_y(22)
        
    # Métadonnées Facture (Alignement à droite)
    pdf.set_y(12)
    pdf.set_x(120)
    pdf.set_font("Helvetica", 'B', 20)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(80, 10, "FACTURE", ln=True, align='R')
    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(100, 116, 139)
    pdf.set_x(120)
    pdf.cell(80, 5, f"Référence : FAC-{vente_id}", ln=True, align='R')
    pdf.set_x(120)
    pdf.cell(80, 5, f"Date d'émission : {date_facture}", ln=True, align='R')
    
    pdf.ln(12)
    
    # ─── BLOC CLIENT ──────────────────────────────────────────────────
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(10, pdf.get_y(), 190, 30, 'DF')
    pdf.set_y(pdf.get_y() + 3)
    pdf.set_x(14)
    pdf.set_font("Helvetica", 'B', 10)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(180, 5, "DESTINATAIRE", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(30, 41, 59)
    
    prenom = nettoyer_texte(profil.get('first_name', 'Client')).capitalize()
    nom = nettoyer_texte(profil.get('last_name', 'Visiteur')).upper()
    num_rue = nettoyer_texte(profil.get('address_number', ''))
    rue = nettoyer_texte(profil.get('address_street', 'Adresse inconnue'))
    cp = profil.get('zip_code', '')
    ville = nettoyer_texte(profil.get('city', '')).upper()
    
    pdf.set_x(14)
    pdf.cell(180, 5, f"{prenom} {nom}", ln=True)
    pdf.set_x(14)
    pdf.cell(180, 5, f"{num_rue} {rue}", ln=True)
    pdf.set_x(14)
    pdf.cell(180, 5, f"{cp} {ville}", ln=True)
    pdf.set_y(pdf.get_y() + 12)
    
    # ─── TABLEAU DES ARTICLES ────────────────────────────────────────────────
    pdf.set_fill_color(30, 41, 59)
    pdf.set_draw_color(30, 41, 59)
    pdf.set_font("Helvetica", 'B', 9)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(90, 8, " Description du produit", 1, 0, 'L', True)
    pdf.cell(25, 8, "Finition", 1, 0, 'C', True)
    pdf.cell(15, 8, "Qté", 1, 0, 'C', True)
    pdf.cell(30, 8, "Prix Unit. HT", 1, 0, 'C', True)
    pdf.cell(30, 8, "Total HT", 1, 1, 'C', True)
    
    pdf.set_font("Helvetica", '', 9)
    pdf.set_text_color(51, 65, 85)
    total_ht = 0
    alterner_fond = False
    
    for item in items:
        libelle = "Pack Tapis Avant"
        if item.get("avec_arriere"): libelle += " + Arriere"
        if item.get("avec_coffre"): libelle += " + Coffre"
        nom_complet = f"{libelle}\n({marque} {modele})"
        prix_ttc_unitaire = float(item.get("prix_base", 0)) + float(item.get("prix_arriere", 0) if item.get("avec_arriere") else 0) + float(item.get("prix_coffre", 0) if item.get("avec_coffre") else 0)
        prix_ht_unitaire = prix_ttc_unitaire / 1.20
        qte = item.get("quantite", 0)
        ligne_ht = qte * prix_ht_unitaire
        total_ht += ligne_ht
        
        pdf.set_fill_color(248, 250, 252) if alterner_fond else pdf.set_fill_color(255, 255, 255)
        current_x, current_y = pdf.get_x(), pdf.get_y()
        pdf.rect(current_x, current_y, 90, 12, 'F')
        pdf.multi_cell(90, 6, f" {nom_complet}", border=0, align='L', fill=True)
        pdf.set_xy(current_x + 90, current_y)
        pdf.cell(25, 12, nettoyer_texte(qualite.get("nom", "Classique")).capitalize(), border='B', align='C', fill=True)
        pdf.cell(15, 12, str(qte), border='B', align='C', fill=True)
        pdf.cell(30, 12, f"{prix_ht_unitaire:.2f} EUR", border='B', align='R', fill=True)
        pdf.cell(30, 12, f"{ligne_ht:.2f} EUR", border='B', align='R', fill=True)
        pdf.set_y(current_y + 12)
        alterner_fond = not alterner_fond
        
    pdf.ln(6)
    pdf.set_x(110)
    pdf.set_font("Helvetica", '', 10)
    pdf.cell(50, 7, "Total HT", 0, 0, 'R')
    pdf.cell(40, 7, f"{total_ht:.2f} EUR", 0, 1, 'R')
    pdf.set_x(110)
    pdf.cell(50, 7, "TVA (20%)", 0, 0, 'R')
    pdf.cell(40, 7, f"{total_ht * 0.20:.2f} EUR", 0, 1, 'R')
    pdf.ln(2)
    pdf.set_x(110)
    pdf.set_fill_color(79, 70, 229)
    pdf.set_font("Helvetica", 'B', 11)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(50, 10, "TOTAL TTC ", 0, 0, 'R', True)
    pdf.cell(40, 10, f"{total_ht * 1.20:.2f} EUR ", 0, 1, 'R', True)
    
    pdf.output(nom_fichier)
    return nom_fichier