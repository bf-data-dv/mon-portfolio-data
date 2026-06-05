# 🏎️ TapisAuto — Intelligent Automotive Inventory ERP

[![Live](https://img.shields.io/badge/Deployment-Live-brightgreen?style=flat-square&logo=vercel)](https://geardata-engine.vercel.app/)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20AWS-0ea5e9?style=flat-square)](#architecture)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python&logoColor=white)](#pipelines)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](#)

> Système ERP-Light de gestion d'inventaire automobile avec pipeline de données serverless sur AWS — né de la centralisation et de la purification d'un catalogue de **3 000+ références véhicules**.

**[🚀 Demo Live](https://geardata-engine.vercel.app/)** · **[📂 Code Source](https://github.com/bf-data-dv/geardata-optimization)**

---

## Table des matières

- [Contexte du projet](#contexte-du-projet)
- [Architecture des données](#architecture-des-données)
- [Pipelines Python](#pipelines-python)
- [Fonctionnalités front-end](#fonctionnalités-front-end)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)

---

## Contexte du projet

TapisAuto résout un problème concret de **gestion de stocks fragmentés** dans le secteur automobile : plusieurs types de produits et finitions par référence véhicule, sans vision unifiée.

Le projet couvre deux phases :

1. **Nettoyage & structuration** d'un dataset CSV brut (doublons, formats hétérogènes, anomalies sur les plages de production) vers un modèle relationnel PostgreSQL normalisé.
2. **Exploitation opérationnelle** via un ERP-Light React connecté à un pipeline ETL serverless automatisé sur AWS.

---

## Architecture des données

L'écosystème applique les patterns industriels de séparation OLTP / Orchestration / Data Lake.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUX DE DONNÉES                          │
│                                                                 │
│  AWS EventBridge  ──▶  AWS Lambda (ETL)  ──▶  Amazon S3        │
│      (scheduler)         (Python 3.x)       (Data Lake)        │
│                               │                                 │
│                               ▼                                 │
│              Supabase PostgreSQL (OLTP)                         │
│                    (SQL Views RBAC)                             │
│                               │                                 │
│                               ▼                                 │
│              React.js + Chart.js (ERP Client)                   │
└─────────────────────────────────────────────────────────────────┘
```

| Couche | Composant | Technologie | Rôle |
| :--- | :--- | :--- | :--- |
| **Production DB** | OLTP Database | **Supabase (PostgreSQL)** | Catalogues, états des stocks, historique des ventes. |
| **Orchestration** | Scheduler | **AWS EventBridge** | Déclenchement automatisé et autonome du pipeline à intervalles réguliers. |
| **Compute** | ETL Worker | **AWS Lambda + Python 3.x** | Fonction isolée calculant le delta temporel, extrayant les ventes et appliquant les règles métiers. |
| **Data Lake** | Cold Storage | **Amazon S3** | Stockage durable des fichiers JSON bruts, partitionnés temporellement à la volée. |
| **Abstraction** | Database Layer | **SQL Views** | Abstraction des requêtes lourdes via la vue optimisée `global_inventory_stock`. |
| **Client** | ERP App | **React.js + Chart.js** | Consommation sécurisée (RBAC), monitoring des ventes et reporting d'approvisionnement. |

---

## Pipelines Python

Trois scripts automatisés construits avec `boto3` et `supabase-py`.

### 1. ETL Delta-Loading Serverless · `etl_supabase_ingestion.py`

Déployé sur AWS sous le **principe de moindre privilège IAM**.

- **Fenêtre glissante** : calcul dynamique `datetime.now(UTC) - timedelta(hours=1)` pour capturer uniquement les mutations de la dernière heure, sans surcharge réseau.
- **Jointure relationnelle à la source** : récupération combinée des ventes + tables liées (`inventory`, `qualites_tapis`) en une seule passe API.
- **Partitionnement Hive sur S3** : structuration automatique du chemin `raw/ventes/annee=YYYY/mois=MM/jour=DD/` pour l'indexation analytique.

### 2. Alignement & Uniformisation d'Inventaire · `reset_and_uniformize.py`

Initialisation et purge déterministe de l'état des stocks.

- **Mapping conditionnel** : analyse des options habitacle (`tapis_avt`, `tapis_r1`, `tapis_r2`, `tapis_pont`, `tapis_coffre`) pour n'allouer du stock (`STOCK_INITIAL = 10`) qu'aux références réellement fabriquées.
- **Bulk insert optimisé** : insertions regroupées par paquets de 100 lignes pour maximiser le débit d'écriture vers PostgreSQL.

### 3. Simulateur d'Événements Métiers · `simulation_data.py`

Simulation autonome d'une plateforme e-commerce à haute intensité.

- **Vérification d'intégrité transactionnelle** : sélection aléatoire d'un véhicule, vérification de la disponibilité du pack en base, annulation immédiate si rupture.
- **Résolution des clés étrangères (UUID)** : liaison dynamique avec la table `qualites_tapis` avant écriture dans `sales_history`.

---

## Fonctionnalités front-end

| Fonctionnalité | Description |
|---|---|
| 📊 **Smart Stock Tracking** | Suivi granulaire par véhicule + tableau de bord analytique (`react-chartjs-2`) |
| 🛑 **Alertes Supply Chain** | Isolation automatique des produits en rupture critique (seuil ≤ 4 unités) |
| 🛒 **Panier à Clé Composite** | Signature unique `(ID produit × finition × options habitacle)` — zéro collision |
| 📄 **Export PDF Logistique** | Génération de bons de commande fournisseurs en mode paysage (`jsPDF-AutoTable`) |
| 🗺️ **Filtrage Multi-Génération** | Segmentation *Récentes / Youngtimers / Collection* persistée dans les Query Params URL |

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/bf-data-dv/geardata-optimization.git
cd geardata-optimization

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement (voir section suivante)
cp .env.example .env

# 4. Lancer l'application
npm start
```

---

## Variables d'environnement

Créer un fichier `.env` à la racine (déjà dans `.gitignore`) :

```env
REACT_APP_SUPABASE_URL=https://votre-projet.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre-cle-anonyme-publique
```

> 💡 Les clés de l'infrastructure AWS (Lambda, S3, EventBridge) sont gérées de manière transparente via des rôles d'exécution IAM. Aucune clé secrète ou identifiant AWS n'est inscrit en dur dans le code source.

---

---

## 🚀 Aller plus loin : Architecture Event-Driven & Facturation (Roadmap)

Pour transformer cet ERP-Light en une plateforme e-commerce totalement autonome, la suite logique de l'architecture consiste à implémenter un module de **facturation automatisée Serverless**, déclenché par les événements du Data Lake.

## 🏗️ Workflow de Facturation Cible

```text
┌────────────────┐   ⚡ ObjectCreated   ┌─────────────────┐   📜 Lit le JSON   ┌──────────────────┐
│  Amazon S3     │ ──────────────────── │   AWS Lambda    │ ────────────────── │   Amazon S3      │
│ (Bucket Sales) │                      │ (PDF Generator) │                    │  (Bucket PDFs)   │
└────────────────┘                      └─────────────────┘                    └──────────────────┘
                                                │
                                                │ ✉️ Envoie la facture
                                                ▼
                                        ┌─────────────────┐
                                        │   Amazon SES    │ ────────────────── (Email Client)
                                        └─────────────────┘
```
1. **S3 Event Notification :** Dès que le pipeline principal (`etl_supabase_ingestion.py`) dépose un fichier JSON contenant les mutations de ventes dans le bucket `brahim-data-storage-2026`, S3 émet un événement `ObjectCreated`.
2. **Calcul & Génération Serverless :** Cet événement réveille instantanément une seconde fonction **AWS Lambda** (Python + `FPDF2` / `ReportLab`) qui isole le JSON, calcule les montants HT/TVA/TTC et génère une facture au format PDF hautement personnalisée.
3. **Data Lake Factures :** Le PDF généré est automatiquement archivé de manière immuable et durable dans un compartiment dédié (`raw/factures/annee=YYYY/mois=MM/`).
4. **Notification Métier (Amazon SES) :** En fin de flux, la Lambda s'appuie sur **Amazon SES (Simple Email Service)** pour envoyer la facture par e-mail au client ou à l'équipe comptable en pièce jointe.

### 📝 Prototype de la Lambda de Facturation (`facturation_service.py`)

```python
import os
import json
import boto3
from fpdf import FPDF

s3_client = boto3.client('s3')
BUCKET_FACTURES = "brahim-factures-storage-2026"

def lambda_handler(event, context):
    # Récupération de l'objet JSON entrant
    bucket_source = event['Records'][0]['s3']['bucket']['name']
    cle_json = event['Records'][0]['s3']['object']['key']
    
    reponse = s3_client.get_object(Bucket=bucket_source, Key=cle_json)
    ventes_data = json.loads(reponse['Body'].read().decode('utf-8'))
    
    for vente in ventes_data:
        id_vente = vente.get('id', 'UNKNOWN')
        
        # Génération du PDF en mémoire
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(40, 10, f"FACTURE N° FAC-{id_vente}")
        
        # Sauvegarde temporaire locale à la Lambda
        chemin_local = f"/tmp/facture_{id_vente}.pdf"
        pdf.output(chemin_local)
        
        # Archivage permanent sur S3
        cle_s3 = f"factures/annee=2026/facture_{id_vente}.pdf"
        s3_client.upload_file(chemin_local, BUCKET_FACTURES, cle_s3)
        
    return {'statusCode': 200, 'body': "Factures archivées avec succès."}

👤 Auteur

Développé avec passion par Brahim Fettih — Certifié CDA (AFPA), admis à la Wild Code School et activement à la recherche d'une alternance en Data Engineering.

[![GitHub](https://img.shields.io/badge/GitHub-bf--data--dv-181717?style=flat-square&logo=github)](https://github.com/bf-data-dv)
