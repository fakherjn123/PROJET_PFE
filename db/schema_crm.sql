-- ============================================
-- NETTOYAGE
-- ============================================
DROP TABLE IF EXISTS facture_details CASCADE;
DROP TABLE IF EXISTS factures CASCADE;
DROP TABLE IF EXISTS bon_commande_details CASCADE;
DROP TABLE IF EXISTS bon_commandes CASCADE;
DROP TABLE IF EXISTS bon_livraison_details CASCADE;
DROP TABLE IF EXISTS bon_livraisons CASCADE;
DROP TABLE IF EXISTS devis_details CASCADE;
DROP TABLE IF EXISTS devis CASCADE;
DROP TABLE IF EXISTS mouvements_stock CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS produits CASCADE;
DROP TABLE IF EXISTS entrepots CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS comptes_bancaires CASCADE;
DROP TABLE IF EXISTS caisse CASCADE;
DROP TABLE IF EXISTS adresses CASCADE;
DROP TABLE IF EXISTS comptes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS fournisseurs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE UTILISATEURS
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, user, manager
    
    -- Informations système
    device_hostname VARCHAR(255),
    device_type VARCHAR(50),
    device_platform VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- MODULE CLIENTS
-- ============================================

-- Table principale des clients
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(20),
    mobile VARCHAR(20),
    statut VARCHAR(50) DEFAULT 'Prospect', -- Prospect, Client, Actif, Inactif
    type VARCHAR(50) DEFAULT 'Particulier', -- Particulier, Entreprise
    
    -- Entreprise
    raison_sociale VARCHAR(255),
    siret VARCHAR(20),
    tva_intracommunautaire VARCHAR(20),
    
    -- Commercial
    remise_pourcentage DECIMAL(5,2) DEFAULT 0,
    plafond_credit DECIMAL(12,2) DEFAULT 0,
    delai_paiement INTEGER DEFAULT 30, -- jours
    
    -- Système
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    notes TEXT
);

-- Comptes clients (pour facturation)
CREATE TABLE comptes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    numero_compte VARCHAR(50) UNIQUE NOT NULL,
    solde DECIMAL(12,2) DEFAULT 0,
    solde_du DECIMAL(12,2) DEFAULT 0, -- Montant dû
    limite_credit DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adresses clients
CREATE TABLE adresses (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- Facturation, Livraison, Siège social
    adresse VARCHAR(255) NOT NULL,
    complement_adresse VARCHAR(255),
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Tunisie',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MODULE FOURNISSEURS
-- ============================================
CREATE TABLE fournisseurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(20),
    raison_sociale VARCHAR(255),
    siret VARCHAR(20),
    
    adresse VARCHAR(255),
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Tunisie',
    
    delai_paiement INTEGER DEFAULT 30,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- MODULE PRODUITS
-- ============================================

-- Entrepôts
CREATE TABLE entrepots (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse VARCHAR(255),
    ville VARCHAR(100),
    responsable VARCHAR(100),
    telephone VARCHAR(20),
    capacite INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produits
CREATE TABLE produits (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    categorie VARCHAR(100),
    
    -- Prix
    prix_achat DECIMAL(10,2) DEFAULT 0,
    prix_vente_ht DECIMAL(10,2) NOT NULL,
    prix_vente_ttc DECIMAL(10,2),
    tva_pourcentage DECIMAL(5,2) DEFAULT 19, -- TVA en Tunisie
    
    -- Stock
    stock_min INTEGER DEFAULT 0,
    stock_alert INTEGER DEFAULT 10,
    unite VARCHAR(50) DEFAULT 'unité', -- unité, kg, litre, m2...
    
    -- Gestion
    code_barre VARCHAR(100),
    fournisseur_id INTEGER REFERENCES fournisseurs(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stocks par entrepôt
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    produit_id INTEGER REFERENCES produits(id) ON DELETE CASCADE,
    entrepot_id INTEGER REFERENCES entrepots(id) ON DELETE CASCADE,
    quantite INTEGER DEFAULT 0,
    quantite_reservee INTEGER DEFAULT 0, -- Réservé pour commandes
    emplacement VARCHAR(100), -- A1, B2, etc.
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(produit_id, entrepot_id)
);

-- Mouvements de stock
CREATE TABLE mouvements_stock (
    id SERIAL PRIMARY KEY,
    produit_id INTEGER REFERENCES produits(id),
    entrepot_id INTEGER REFERENCES entrepots(id),
    type VARCHAR(50) NOT NULL, -- Entrée, Sortie, Transfert, Inventaire
    quantite INTEGER NOT NULL,
    quantite_avant INTEGER,
    quantite_apres INTEGER,
    motif VARCHAR(255),
    reference_document VARCHAR(100), -- N° bon commande, facture, etc.
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MODULE VENTES - DEVIS
-- ============================================
CREATE TABLE devis (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL, -- DEV-2026-001
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    
    date_devis DATE NOT NULL DEFAULT CURRENT_DATE,
    date_validite DATE, -- Date d'expiration
    
    -- Montants
    montant_ht DECIMAL(12,2) DEFAULT 0,
    montant_tva DECIMAL(12,2) DEFAULT 0,
    montant_ttc DECIMAL(12,2) DEFAULT 0,
    remise_pourcentage DECIMAL(5,2) DEFAULT 0,
    remise_montant DECIMAL(12,2) DEFAULT 0,
    
    statut VARCHAR(50) DEFAULT 'Brouillon', -- Brouillon, Envoyé, Accepté, Refusé, Expiré
    
    -- Commercial
    vendeur_id INTEGER REFERENCES users(id),
    conditions_paiement TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Détails des devis
CREATE TABLE devis_details (
    id SERIAL PRIMARY KEY,
    devis_id INTEGER REFERENCES devis(id) ON DELETE CASCADE,
    produit_id INTEGER REFERENCES produits(id),
    
    designation VARCHAR(255) NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    prix_unitaire_ht DECIMAL(10,2) NOT NULL,
    tva_pourcentage DECIMAL(5,2) DEFAULT 19,
    remise_pourcentage DECIMAL(5,2) DEFAULT 0,
    
    montant_ht DECIMAL(12,2),
    montant_tva DECIMAL(12,2),
    montant_ttc DECIMAL(12,2),
    
    ordre INTEGER DEFAULT 0
);

-- ============================================
-- MODULE VENTES - BON DE COMMANDE
-- ============================================
CREATE TABLE bon_commandes (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL, -- BC-2026-001
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    devis_id INTEGER REFERENCES devis(id) ON DELETE SET NULL,
    
    date_commande DATE NOT NULL DEFAULT CURRENT_DATE,
    date_livraison_prevue DATE,
    
    montant_ht DECIMAL(12,2) DEFAULT 0,
    montant_tva DECIMAL(12,2) DEFAULT 0,
    montant_ttc DECIMAL(12,2) DEFAULT 0,
    
    statut VARCHAR(50) DEFAULT 'En attente', -- En attente, Confirmé, En cours, Livré, Annulé
    
    vendeur_id INTEGER REFERENCES users(id),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bon_commande_details (
    id SERIAL PRIMARY KEY,
    bon_commande_id INTEGER REFERENCES bon_commandes(id) ON DELETE CASCADE,
    produit_id INTEGER REFERENCES produits(id),
    
    designation VARCHAR(255) NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    quantite_livree DECIMAL(10,2) DEFAULT 0,
    prix_unitaire_ht DECIMAL(10,2) NOT NULL,
    tva_pourcentage DECIMAL(5,2) DEFAULT 19,
    
    montant_ht DECIMAL(12,2),
    montant_tva DECIMAL(12,2),
    montant_ttc DECIMAL(12,2)
);

-- ============================================
-- MODULE VENTES - BON DE LIVRAISON
-- ============================================
CREATE TABLE bon_livraisons (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL, -- BL-2026-001
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    bon_commande_id INTEGER REFERENCES bon_commandes(id) ON DELETE SET NULL,
    
    date_livraison DATE NOT NULL DEFAULT CURRENT_DATE,
    entrepot_id INTEGER REFERENCES entrepots(id),
    
    adresse_livraison TEXT,
    transporteur VARCHAR(100),
    numero_suivi VARCHAR(100),
    
    statut VARCHAR(50) DEFAULT 'Préparé', -- Préparé, Expédié, Livré, Retourné
    
    livreur VARCHAR(100),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bon_livraison_details (
    id SERIAL PRIMARY KEY,
    bon_livraison_id INTEGER REFERENCES bon_livraisons(id) ON DELETE CASCADE,
    produit_id INTEGER REFERENCES produits(id),
    
    designation VARCHAR(255) NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    entrepot_id INTEGER REFERENCES entrepots(id)
);

-- ============================================
-- MODULE VENTES - FACTURES
-- ============================================
CREATE TABLE factures (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL, -- FA-2026-001
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    bon_commande_id INTEGER REFERENCES bon_commandes(id) ON DELETE SET NULL,
    bon_livraison_id INTEGER REFERENCES bon_livraisons(id) ON DELETE SET NULL,
    
    date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
    date_echeance DATE,
    
    montant_ht DECIMAL(12,2) DEFAULT 0,
    montant_tva DECIMAL(12,2) DEFAULT 0,
    montant_ttc DECIMAL(12,2) DEFAULT 0,
    montant_paye DECIMAL(12,2) DEFAULT 0,
    montant_reste DECIMAL(12,2) DEFAULT 0,
    
    statut VARCHAR(50) DEFAULT 'Impayée', -- Brouillon, Impayée, Payée partiellement, Payée, Annulée
    mode_paiement VARCHAR(50), -- Espèces, Chèque, Virement, Carte bancaire
    
    conditions_paiement TEXT,
    notes TEXT,
    
    vendeur_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facture_details (
    id SERIAL PRIMARY KEY,
    facture_id INTEGER REFERENCES factures(id) ON DELETE CASCADE,
    produit_id INTEGER REFERENCES produits(id),
    
    designation VARCHAR(255) NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    prix_unitaire_ht DECIMAL(10,2) NOT NULL,
    tva_pourcentage DECIMAL(5,2) DEFAULT 19,
    remise_pourcentage DECIMAL(5,2) DEFAULT 0,
    
    montant_ht DECIMAL(12,2),
    montant_tva DECIMAL(12,2),
    montant_ttc DECIMAL(12,2)
);

-- ============================================
-- MODULE TRÉSORERIE
-- ============================================

-- Caisse
CREATE TABLE caisse (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    solde DECIMAL(12,2) DEFAULT 0,
    devise VARCHAR(10) DEFAULT 'TND',
    responsable_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comptes bancaires
CREATE TABLE comptes_bancaires (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    banque VARCHAR(100),
    numero_compte VARCHAR(100) UNIQUE,
    iban VARCHAR(50),
    bic VARCHAR(20),
    solde DECIMAL(12,2) DEFAULT 0,
    devise VARCHAR(10) DEFAULT 'TND',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (Entrées/Sorties)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- Entrée, Sortie
    categorie VARCHAR(100), -- Vente, Achat, Frais, Salaire...
    montant DECIMAL(12,2) NOT NULL,
    
    -- Source
    caisse_id INTEGER REFERENCES caisse(id),
    compte_bancaire_id INTEGER REFERENCES comptes_bancaires(id),
    
    -- Lié à
    facture_id INTEGER REFERENCES factures(id),
    client_id INTEGER REFERENCES clients(id),
    fournisseur_id INTEGER REFERENCES fournisseurs(id),
    
    date_transaction DATE NOT NULL DEFAULT CURRENT_DATE,
    mode_paiement VARCHAR(50), -- Espèces, Chèque, Virement, Carte
    reference VARCHAR(100),
    description TEXT,
    
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_statut ON clients(statut);
CREATE INDEX idx_produits_reference ON produits(reference);
CREATE INDEX idx_stocks_produit ON stocks(produit_id);
CREATE INDEX idx_devis_client ON devis(client_id);
CREATE INDEX idx_devis_numero ON devis(numero);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_numero ON factures(numero);
CREATE INDEX idx_factures_statut ON factures(statut);
CREATE INDEX idx_transactions_date ON transactions(date_transaction);

-- ============================================
-- DONNÉES DE TEST
-- ============================================

-- Utilisateurs
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@bmz.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'admin'),
('vendeur1', 'vendeur1@bmz.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'user');

-- Clients (comme dans votre capture)
INSERT INTO clients (nom, prenom, email, telephone, statut) VALUES
('Ben', 'Aymen', 'aymen@exemple.com', '12345678', 'Actif'),
('Khaled', 'Ali', 'ali@exemple.com', '87654321', 'Prospect'),
('Sarra', 'Yasmine', 'yasmine@exemple.com', '11223344', 'Client'),
('Hedi', 'Omar', 'omar@exemple.com', '99887766', 'Actif'),
('Lina', 'Meriem', 'meriem@exemple.com', '22334455', 'Prospect'),
('Amina', 'Rania', 'rania@exemple.com', '66778899', 'Client'),
('Houssem', 'Youssef', 'youssef@exemple.com', '55667788', 'Actif'),
('Nesrine', 'Salma', 'salma@exemple.com', '44556677', 'Prospect'),
('Sofien', 'Kamel', 'kamel@exemple.com', '33445566', 'Client'),
('Meriem', 'Nour', 'nour@exemple.com', '77889900', 'Actif');

-- Entrepôts
INSERT INTO entrepots (nom, adresse, ville) VALUES
('Entrepôt Principal', 'Zone industrielle', 'Tunis'),
('Entrepôt Secondaire', 'Route de Sousse', 'Sfax');

-- Produits
INSERT INTO produits (reference, nom, prix_vente_ht, categorie) VALUES
('PROD-001', 'Ordinateur portable Dell', 2500.00, 'Informatique'),
('PROD-002', 'Imprimante HP', 450.00, 'Bureautique'),
('PROD-003', 'Clavier sans fil', 85.00, 'Accessoires'),
('PROD-004', 'Souris optique', 35.00, 'Accessoires'),
('PROD-005', 'Écran 24 pouces', 650.00, 'Informatique');

-- Stocks
INSERT INTO stocks (produit_id, entrepot_id, quantite) VALUES
(1, 1, 50),
(2, 1, 30),
(3, 1, 100),
(4, 1, 150),
(5, 1, 40);

-- Caisse
INSERT INTO caisse (nom, solde) VALUES
('Caisse principale', 5000.00);

-- Compte bancaire
INSERT INTO comptes_bancaires (nom, banque, numero_compte, solde) VALUES
('Compte principal', 'BIAT', '1234567890', 50000.00);