// Jeu de données de démonstration partagé entre seed-full.js (Render/prod) et
// seed-local.js (base Docker locale). Module pur : aucun effet de bord, aucune
// connexion DB, aucune lecture d'environnement.

const img = (seed, w = 400, h = 300) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const PASSWORD = 'admin123456789';

const companies = [
  {
    name: 'Leclerc',
    email: 'contact@leclerc-demo.fr',
    street: '15 Rue du Commerce',
    zip_code: '75015',
    city: 'Paris',
    siret: '40248849800019',
    token_balance: 5000,
  },
  {
    name: 'Aldi',
    email: 'contact@aldi-demo.fr',
    street: '8 Avenue des Champs',
    zip_code: '69001',
    city: 'Lyon',
    siret: '31594504200019',
    token_balance: 5000,
  },
  {
    name: 'Amazon',
    email: 'contact@amazon-demo.fr',
    street: '67 Boulevard Haussmann',
    zip_code: '75008',
    city: 'Paris',
    siret: '48775117400019',
    token_balance: 5000,
  },
];

const employeesByCompany = [
  // Leclerc
  [
    { name: 'Martin', first_name: 'Sophie', email: 'sophie.martin@leclerc-demo.fr' },
    { name: 'Bernard', first_name: 'Lucas', email: 'lucas.bernard@leclerc-demo.fr' },
    { name: 'Dubois', first_name: 'Emma', email: 'emma.dubois@leclerc-demo.fr' },
  ],
  // Aldi
  [
    { name: 'Petit', first_name: 'Hugo', email: 'hugo.petit@aldi-demo.fr' },
    { name: 'Leroy', first_name: 'Camille', email: 'camille.leroy@aldi-demo.fr' },
    { name: 'Moreau', first_name: 'Nathan', email: 'nathan.moreau@aldi-demo.fr' },
  ],
  // Amazon
  [
    { name: 'Simon', first_name: 'Léa', email: 'lea.simon@amazon-demo.fr' },
    { name: 'Laurent', first_name: 'Tom', email: 'tom.laurent@amazon-demo.fr' },
    { name: 'Michel', first_name: 'Jade', email: 'jade.michel@amazon-demo.fr' },
  ],
];

const employersByCompany = [
  { name: 'Dupont', first_name: 'Pierre', email: 'pierre.dupont@leclerc-demo.fr' },
  { name: 'Garcia', first_name: 'Marie', email: 'marie.garcia@aldi-demo.fr' },
  { name: 'Thomas', first_name: 'Paul', email: 'paul.thomas@amazon-demo.fr' },
];

const vouchers = [
  // SPORT (10)
  { partner: 'Décathlon', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'sport', images: [img('sport1')], promo_code: 'DECA20' },
  { partner: 'Nike', title: 'Réduction 15 € sur commande', token_cost: 60, category: 'sport', images: [img('sport2')], promo_code: 'NIKE15' },
  { partner: 'Adidas', title: 'Bon d\'achat 25 €', token_cost: 100, category: 'sport', images: [img('sport3')], promo_code: 'ADIDAS25' },
  { partner: 'Go Sport', title: 'Bon d\'achat 30 €', token_cost: 120, category: 'sport', images: [img('sport4')], promo_code: 'GOSPORT30' },
  { partner: 'Intersport', title: 'Réduction 20 € dès 60 €', token_cost: 80, category: 'sport', images: [img('sport5')], promo_code: 'INTER20' },
  { partner: 'Asics', title: 'Bon d\'achat 35 €', token_cost: 140, category: 'sport', images: [img('sport6')], promo_code: 'ASICS35' },
  { partner: 'Puma', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'sport', images: [img('sport7')], promo_code: 'PUMA20' },
  { partner: 'Salomon', title: 'Réduction 40 € dès 120 €', token_cost: 160, category: 'sport', images: [img('sport8')], promo_code: 'SALO40' },
  { partner: 'Under Armour', title: 'Bon d\'achat 30 €', token_cost: 120, category: 'sport', images: [img('sport9')], promo_code: 'UA30' },
  { partner: 'Kiprun', title: 'Bon d\'achat 15 €', token_cost: 60, category: 'sport', images: [img('sport10')], promo_code: 'KIP15' },

  // VOYAGE (10)
  { partner: 'Booking.com', title: 'Réduction 30 € sur séjour', token_cost: 120, category: 'voyage', images: [img('voyage1')], promo_code: 'BOOK30' },
  { partner: 'Airbnb', title: 'Bon de 25 € pour logement', token_cost: 100, category: 'voyage', images: [img('voyage2')], promo_code: 'AIRBNB25' },
  { partner: 'SNCF', title: 'Réduction 20 € sur billet', token_cost: 80, category: 'voyage', images: [img('voyage3')], promo_code: 'SNCF20' },
  { partner: 'Air France', title: 'Bon d\'achat 50 €', token_cost: 200, category: 'voyage', images: [img('voyage4')], promo_code: 'AF50' },
  { partner: 'Opodo', title: 'Réduction 40 € sur vol', token_cost: 160, category: 'voyage', images: [img('voyage5')], promo_code: 'OPODO40' },
  { partner: 'Club Med', title: 'Bon de 80 € sur séjour all-inclusive', token_cost: 320, category: 'voyage', images: [img('voyage6')], promo_code: 'CLUBMED80' },
  { partner: 'Trivago', title: 'Réduction 20 € sur hôtel', token_cost: 80, category: 'voyage', images: [img('voyage7')], promo_code: 'TRIV20' },
  { partner: 'Europcar', title: 'Location voiture 1 jour offert', token_cost: 140, category: 'voyage', images: [img('voyage8')], promo_code: 'EURO1J' },
  { partner: 'Corsair', title: 'Réduction 60 € vol long-courrier', token_cost: 240, category: 'voyage', images: [img('voyage9')], promo_code: 'CORS60' },
  { partner: 'Flixbus', title: 'Trajet aller offert', token_cost: 40, category: 'voyage', images: [img('voyage10')], promo_code: 'FLIX1' },

  // CULTURE (10)
  { partner: 'Fnac', title: 'Bon d\'achat livres 15 €', token_cost: 60, category: 'culture', images: [img('culture1')], promo_code: 'FNAC15' },
  { partner: 'Cultura', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'culture', images: [img('culture2')], promo_code: 'CULT20' },
  { partner: 'France Billet', title: 'Réduction 10 € sur spectacle', token_cost: 40, category: 'culture', images: [img('culture3')], promo_code: 'FB10' },
  { partner: 'Pathé Gaumont', title: '2 places de cinéma', token_cost: 100, category: 'culture', images: [img('culture4')], promo_code: 'PATHE2' },
  { partner: 'Ticketmaster', title: 'Réduction 15 € sur concert', token_cost: 60, category: 'culture', images: [img('culture5')], promo_code: 'TM15' },
  { partner: 'Audible', title: '3 mois Premium offerts', token_cost: 120, category: 'culture', images: [img('culture6')], promo_code: 'AUD3M' },
  { partner: 'Deezer', title: '6 mois Premium offerts', token_cost: 150, category: 'culture', images: [img('culture7')], promo_code: 'DEE6M' },
  { partner: 'Kindle', title: 'Bon d\'achat ebooks 10 €', token_cost: 40, category: 'culture', images: [img('culture8')], promo_code: 'KIN10' },
  { partner: 'MK2', title: 'Pass cinéma 1 mois', token_cost: 100, category: 'culture', images: [img('culture9')], promo_code: 'MK2PASS' },
  { partner: 'Babelio', title: 'Bon d\'achat 12 €', token_cost: 50, category: 'culture', images: [img('culture10')], promo_code: 'BAB12' },

  // NOURRITURE (10)
  { partner: 'Uber Eats', title: 'Réduction 10 € sur commande', token_cost: 40, category: 'nourriture', images: [img('food1')], promo_code: 'UE10' },
  { partner: 'Deliveroo', title: 'Livraison offerte x5', token_cost: 50, category: 'nourriture', images: [img('food2')], promo_code: 'DELIV5' },
  { partner: 'Just Eat', title: 'Réduction 8 € sur commande', token_cost: 32, category: 'nourriture', images: [img('food3')], promo_code: 'JE8' },
  { partner: 'Nespresso', title: 'Capsules offert 30 €', token_cost: 120, category: 'nourriture', images: [img('food4')], promo_code: 'NESP30' },
  { partner: 'HelloFresh', title: 'Box repas 3 recettes offerte', token_cost: 140, category: 'nourriture', images: [img('food5')], promo_code: 'HF3R' },
  { partner: 'Domino\'s', title: 'Pizza offerte à l\'achat d\'une', token_cost: 60, category: 'nourriture', images: [img('food6')], promo_code: 'DOM1+1' },
  { partner: 'Frichti', title: 'Bon repas 15 €', token_cost: 60, category: 'nourriture', images: [img('food7')], promo_code: 'FRIC15' },
  { partner: 'Grand Frais', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'nourriture', images: [img('food8')], promo_code: 'GF20' },
  { partner: 'Picard', title: 'Bon d\'achat 15 €', token_cost: 60, category: 'nourriture', images: [img('food9')], promo_code: 'PIC15' },
  { partner: 'Marcel', title: 'Repas gastronomique -20 €', token_cost: 80, category: 'nourriture', images: [img('food10')], promo_code: 'MARC20' },

  // LOISIRS (10)
  { partner: 'Disney+', title: '3 mois offerts', token_cost: 120, category: 'loisirs', images: [img('leisure1')], promo_code: 'DIS3M' },
  { partner: 'Netflix', title: '1 mois Premium offert', token_cost: 80, category: 'loisirs', images: [img('leisure2')], promo_code: 'NET1M' },
  { partner: 'Canal+', title: '2 mois offerts', token_cost: 120, category: 'loisirs', images: [img('leisure3')], promo_code: 'CANAL2M' },
  { partner: 'PlayStation Store', title: 'Carte 20 €', token_cost: 80, category: 'loisirs', images: [img('leisure4')], promo_code: 'PS20' },
  { partner: 'Xbox Game Pass', title: '3 mois Ultimate offerts', token_cost: 150, category: 'loisirs', images: [img('leisure5')], promo_code: 'XBOX3M' },
  { partner: 'Laser Game', title: '2 parties offertes', token_cost: 60, category: 'loisirs', images: [img('leisure6')], promo_code: 'LASER2' },
  { partner: 'Paintball Park', title: 'Séance 2h pour 2', token_cost: 100, category: 'loisirs', images: [img('leisure7')], promo_code: 'PAINT2H' },
  { partner: 'Karting', title: '2 courses offertes', token_cost: 80, category: 'loisirs', images: [img('leisure8')], promo_code: 'KART2' },
  { partner: 'Bowling', title: '2 parties + chaussures', token_cost: 50, category: 'loisirs', images: [img('leisure9')], promo_code: 'BOWL2' },
  { partner: 'Escape Game', title: '1 session pour 2 joueurs', token_cost: 100, category: 'loisirs', images: [img('leisure10')], promo_code: 'ESC2P' },

  // TECH (10)
  { partner: 'Amazon', title: 'Carte cadeau 20 €', token_cost: 80, category: 'tech', images: [img('tech1')], promo_code: 'AMZ20' },
  { partner: 'Fnac', title: 'Bon high-tech 30 €', token_cost: 120, category: 'tech', images: [img('tech2')], promo_code: 'FNATECH30' },
  { partner: 'Darty', title: 'Bon d\'achat 25 €', token_cost: 100, category: 'tech', images: [img('tech3')], promo_code: 'DARTY25' },
  { partner: 'Apple Store', title: 'Bon d\'achat 30 €', token_cost: 120, category: 'tech', images: [img('tech4')], promo_code: 'APPLE30' },
  { partner: 'Boulanger', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'tech', images: [img('tech5')], promo_code: 'BOUL20' },
  { partner: 'LDLC', title: 'Réduction 25 € dès 150 €', token_cost: 100, category: 'tech', images: [img('tech6')], promo_code: 'LDLC25' },
  { partner: 'Samsung', title: 'Bon d\'achat 40 €', token_cost: 160, category: 'tech', images: [img('tech7')], promo_code: 'SAM40' },
  { partner: 'Cdiscount', title: 'Réduction 15 € sur commande', token_cost: 60, category: 'tech', images: [img('tech8')], promo_code: 'CDIS15' },
  { partner: 'Rue du Commerce', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'tech', images: [img('tech9')], promo_code: 'RDC20' },
  { partner: 'SFR', title: 'Option gaming 1 mois offert', token_cost: 60, category: 'tech', images: [img('tech10')], promo_code: 'SFRG1M' },

  // SERVICES (10)
  { partner: 'BlaBlaCar', title: '3 trajets offerts', token_cost: 60, category: 'services', images: [img('service1')], promo_code: 'BBC3' },
  { partner: 'Headspace', title: '3 mois Premium offerts', token_cost: 90, category: 'services', images: [img('service2')], promo_code: 'HEAD3M' },
  { partner: 'Calm', title: '1 an d\'abonnement offert', token_cost: 200, category: 'services', images: [img('service3')], promo_code: 'CALM1A' },
  { partner: 'ExpressVPN', title: '3 mois offerts', token_cost: 80, category: 'services', images: [img('service4')], promo_code: 'VPN3M' },
  { partner: 'Doctolib', title: 'Téléconsultation offerte', token_cost: 60, category: 'services', images: [img('service5')], promo_code: 'DOCTO1' },
  { partner: 'Alan', title: '1 mois assurance santé offert', token_cost: 120, category: 'services', images: [img('service6')], promo_code: 'ALAN1M' },
  { partner: 'Vinted Pro', title: 'Bon d\'achat 15 €', token_cost: 60, category: 'services', images: [img('service7')], promo_code: 'VINT15' },
  { partner: 'MyCoach', title: '5 séances coaching en ligne', token_cost: 150, category: 'services', images: [img('service8')], promo_code: 'COACH5' },
  { partner: 'Qonto', title: 'Frais bancaires 3 mois offerts', token_cost: 100, category: 'services', images: [img('service9')], promo_code: 'QONT3M' },
  { partner: 'Shine', title: '6 mois sans frais', token_cost: 150, category: 'services', images: [img('service10')], promo_code: 'SHINE6' },

  // SHOPPING (10)
  { partner: 'Zara', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'shopping', images: [img('shop1')], promo_code: 'ZARA20' },
  { partner: 'H&M', title: 'Réduction 15 € dès 50 €', token_cost: 60, category: 'shopping', images: [img('shop2')], promo_code: 'HM15' },
  { partner: 'Zalando', title: 'Réduction 20 € dès 80 €', token_cost: 80, category: 'shopping', images: [img('shop3')], promo_code: 'ZAL20' },
  { partner: 'Sephora', title: 'Bon d\'achat beauté 25 €', token_cost: 100, category: 'shopping', images: [img('shop4')], promo_code: 'SEP25' },
  { partner: 'Uniqlo', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'shopping', images: [img('shop5')], promo_code: 'UNI20' },
  { partner: 'Asos', title: 'Réduction 25 € dès 80 €', token_cost: 100, category: 'shopping', images: [img('shop6')], promo_code: 'ASOS25' },
  { partner: 'Mango', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'shopping', images: [img('shop7')], promo_code: 'MANGO20' },
  { partner: 'Kiabi', title: 'Réduction 10 € dès 40 €', token_cost: 40, category: 'shopping', images: [img('shop8')], promo_code: 'KIABI10' },
  { partner: 'La Redoute', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'shopping', images: [img('shop9')], promo_code: 'LR20' },
  { partner: 'Maisons du Monde', title: 'Bon déco 30 €', token_cost: 120, category: 'shopping', images: [img('shop10')], promo_code: 'MDM30' },

  // BIEN-ÊTRE (10)
  { partner: 'L\'Occitane', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'bien-être', images: [img('wellness1')], promo_code: 'OCC20' },
  { partner: 'Rituals', title: 'Coffret soin 25 €', token_cost: 100, category: 'bien-être', images: [img('wellness2')], promo_code: 'RIT25' },
  { partner: 'Yves Rocher', title: 'Bon d\'achat 15 €', token_cost: 60, category: 'bien-être', images: [img('wellness3')], promo_code: 'YR15' },
  { partner: 'The Body Shop', title: 'Bon d\'achat 20 €', token_cost: 80, category: 'bien-être', images: [img('wellness4')], promo_code: 'TBS20' },
  { partner: 'Nuxe', title: 'Soin visage offert', token_cost: 100, category: 'bien-être', images: [img('wellness5')], promo_code: 'NUXE1' },
  { partner: 'Spa Thermé', title: 'Entrée journée 1 personne', token_cost: 160, category: 'bien-être', images: [img('wellness6')], promo_code: 'THERME1' },
  { partner: 'Yoga Studio', title: '5 séances de yoga offertes', token_cost: 120, category: 'bien-être', images: [img('wellness7')], promo_code: 'YOGA5' },
  { partner: 'Urban Wellness', title: 'Massage 1h offert', token_cost: 200, category: 'bien-être', images: [img('wellness8')], promo_code: 'MASS1H' },
  { partner: 'Pilates Studio', title: '3 cours offerts', token_cost: 90, category: 'bien-être', images: [img('wellness9')], promo_code: 'PIL3' },
  { partner: 'Clarins', title: 'Bon d\'achat 30 €', token_cost: 120, category: 'bien-être', images: [img('wellness10')], promo_code: 'CLAR30' },
];

module.exports = { img, PASSWORD, companies, employeesByCompany, employersByCompany, vouchers };
