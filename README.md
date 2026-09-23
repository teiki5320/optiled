# OptiLED — éclairage LED et culture indoor de légumes

Site web statique (Vite + TypeScript, sans backend), en français et pensé d'abord pour le mobile, construit autour d'un **calculateur d'éclairage LED** (page d'accueil), complété par des guides sur l'éclairage LED horticole et la culture de légumes en intérieur, des fiches légumes et un glossaire.

| Page | Contenu |
| --- | --- |
| `index.html` | **Accueil = calculateur** : PPFD, DLI, PPF, puissance, barres LED et plan de pose, coût annuel, liste d'achat (copie / impression), puis accès aux guides |
| `calculateur.html` | Ancienne adresse du calculateur : redirige vers l'accueil en gardant le légume choisi |
| `led.html` + `led-*.html` | Guides LED : bases (PAR, PPFD, DLI, spectre), choisir ses LED, installer et mesurer |
| `culture.html` + `culture-*.html` | Guides culture : démarrer, substrats et hydroponie, nutriments/pH/EC, climat, semis, problèmes et ravageurs |
| `legumes.html` | Fiches légumes, **générées au build** depuis `src/data/legumes.json` |
| `glossaire.html` | Glossaire des termes techniques |

Le calculateur accepte un légume présélectionné dans l'adresse : `index.html?legume=tomate#calculateur`. Tous les réglages différents des valeurs par défaut sont reflétés dans l'adresse (`?l=tomate&s=floraison&n=3…`, voir `src/etat.ts`) : le bouton **Partager** envoie ce lien, et les derniers réglages sont mémorisés sur l'appareil du visiteur. Chaque bloc de résultat renvoie vers le guide qui l'explique ; sur mobile, une barre fixe rappelle la puissance et le nombre de barres pendant la saisie.

## Voir le site en ligne

Le site est publié automatiquement sur GitHub Pages à chaque envoi sur `main` : **https://teiki5320.github.io/optiled/**

(À activer une fois : *Settings* → *Pages* → *Source* : **GitHub Actions**. Le suivi des publications est dans l'onglet *Actions*.)

## Démarrage

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests unitaires (Vitest)
npm run build    # vérification TypeScript + site statique dans dist/
npm run preview  # prévisualise le contenu de dist/
npm run test:e2e # test de bout en bout dans Chromium (après npm run build)
```

Node.js 20 ou plus récent est requis.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `*.html` (racine) | Une page du site chacune (détectées automatiquement par le build) |
| `build/site.ts` | Plugin Vite : en-tête, menu, pied de page, cartes de guides, mise en page automatique des articles (bandeau, sommaire latéral, temps de lecture) ; génère `sitemap.xml` et `robots.txt` |
| `build/icones.ts` | Icônes SVG et logo |
| `build/fiches.ts` | Génération HTML des fiches légumes |
| `src/site.css`, `src/site.ts` | Styles communs (thème clair/sombre, polices Inter et Bricolage Grotesque hébergées avec le site) ; barre de progression et sommaire actif |
| `src/schema.ts` | Visuels du calculateur : plan vu de dessus des barres LED, jauge du DLI |
| `src/data/legumes.json` | **Toutes les données légumes** : une valeur `{ valeur, source }` par paramètre |
| `src/data.ts` | Types et accès aux données |
| `src/calc.ts` | **Module de calcul isolé** (fonctions pures, aucun accès au DOM) |
| `src/liste.ts` | Liste d'achat et résumé texte (copie) |
| `src/main.ts`, `src/style.css` | Interface du calculateur |
| `src/*.test.ts` | Tests Vitest (calculs, intégrité du JSON, liste d'achat) |

## Ajouter une page

1. Copiez une page existante (par exemple `led-bases.html`) sous un nouveau nom à la racine.
2. Gardez les marqueurs `<!--#head-->`, `<!--#header-->` et `<!--#footer-->` : le build les remplace par les parties communes. La page est ajoutée automatiquement au build et au `sitemap.xml`. Une page d'article (`<main id="contenu" class="page">` avec fil d'Ariane et `<article class="prose">` contenant `h1`, `p.chapo` et `nav.sommaire`) reçoit automatiquement le bandeau de titre et le sommaire latéral.
   Autres marqueurs : `<!--#cartes:led-->` / `<!--#cartes:culture-->` (cartes des guides), `<!--#icone:nom-->` (icône de `build/icones.ts`), `<!--#fiches-->`.
3. Pour l'ajouter à une rubrique, nommez-la `led-….html` ou `culture-….html` et déclarez-la dans `RUBRIQUES` (`build/site.ts`) : elle apparaîtra dans les cartes, le pied de page et la numérotation « Guide n sur N ».

Classes CSS utiles dans les articles : `prose`, `chapo`, `sommaire`, `encadre`, `encadre attention`, `formule`, `tableau-defile` + `tableau`, `suite`, `bouton` / `bouton bouton--plein`.

## Images

- `public/images/guides/<page>-800.webp` et `-1600.webp` : photo de couverture de chaque guide (affichée sous le bandeau et en vignette dans les cartes). Le texte alternatif est déclaré dans `RUBRIQUES` (`build/site.ts`, champ `photo`). Une page sans photo s'affiche simplement sans couverture.
- Pour ajouter ou remplacer une photo : placez `<page>.png` (ou `.jpg`) dans un dossier, puis `npm run images -- <dossier>` génère les deux WebP recadrés en 16:9.
- `public/images/legumes/<id>.webp` : miniature ronde de chaque culture (tuiles du calculateur, en-tête des fiches). Elles sont découpées dans une seule planche : `npm run planche -- planche.png 5 3 laitue epinard …` (ids dans l'ordre de lecture, `-` pour sauter une case). Sans miniature, la tuile garde sa pastille de couleur.
- `public/images/schemas/*.svg` : schémas explicatifs insérés dans les guides avec `<figure class="schema">`.
- Les photos actuelles ont été générées par IA (ElevenLabs, modèle Seedream) ; le pied de page le signale.
- Un test vérifie que chaque image référencée existe et possède un texte alternatif.

## Modifier ou ajouter un légume

Éditez `src/data/legumes.json`, puis relancez `npm test` et `npm run build`. Chaque légume ressemble à ceci :

```json
{
  "id": "laitue",
  "nom": "Laitue",
  "famille": "Légumes feuilles",
  "stades": {
    "croissance": {
      "ppfd":         { "valeur": 250, "source": "…" },
      "photoperiode": { "valeur": 16,  "source": "…" },
      "hauteur_cm":   { "valeur": [20, 30], "source": "…" },
      "spectre":      { "valeur": "Blanc plein spectre 4000–5000 K…", "source": "…" }
    },
    "floraison": null
  }
}
```

- `ppfd` en µmol/m²/s, `photoperiode` en h/jour, `hauteur_cm` = [min, max] au-dessus du feuillage.
- `floraison: null` pour les cultures récoltées avant floraison (le choix du stade est alors désactivé).
- `avertissement` (facultatif) : mise en garde affichée dans le calculateur et la fiche (ex. réglementation du chanvre CBD).
- `famille` sert à regrouper la liste déroulante et les fiches.
- `culture` : plages [min, max] de température (°C), humidité (%), pH, EC (mS/cm), jours jusqu'à la première récolte, espacement (cm, `null` pour un semis à la volée), et un conseil ; affichées dans les fiches légumes.
- Chaque valeur **doit** avoir une `source` non vide : les tests vérifient la présence des sources et la plausibilité des valeurs (PPFD entre 50 et 1 500, photopériode ≤ 24 h, etc.).

Les valeurs fournies sont des **ordres de grandeur indicatifs** tirés de la littérature horticole (références listées dans la clé `references` du JSON). Ajustez-les selon la variété et vos mesures au PAR-mètre.

## Formules

Notations : PPFD en µmol/m²/s, S la surface en m², h la photopériode en heures.

**Surface**
- Mode rectangle : `S = longueur × largeur`
- Mode rangs : `S = nb_rangs × longueur_rang × largeur_rang`

**DLI (Daily Light Integral)**, en mol/m²/jour :

```
DLI = PPFD × h × 3600 / 1 000 000
```

Exemple : 250 µmol/m²/s pendant 16 h → 14,4 mol/m²/j.

**Flux photonique (PPF)**, en µmol/s :

```
PPF_utile      = PPFD × S
PPF_nécessaire = PPF_utile / coefficient_d'utilisation
```

Le coefficient d'utilisation (0,8 par défaut) représente la part du flux émis qui atteint réellement la culture (pertes sur les bords, réflexions, allées). Mettez 1 pour l'ignorer.

**Puissance électrique**, en W :

```
P = PPF_nécessaire / efficacité      (efficacité en µmol/J, 2,7 par défaut)
```

**Barres LED** (calculées pour chaque zone : le rectangle, ou chaque rang) :

- Barres bout à bout dans la longueur : `ceil(longueur / longueur_barre − 0,25)` — on n'ajoute pas une barre pour combler moins d'un quart de sa longueur (au moins 1).
- Lignes parallèles dans la largeur, au maximum de :
  - l'uniformité : `ceil(largeur / hauteur_moyenne)`, l'entraxe entre lignes ne dépassant pas la hauteur de suspension moyenne (règle usuelle pour des optiques ~120°) ;
  - la puissance, si la puissance d'une barre est connue : `ceil(P_zone / (barres_par_ligne × P_barre))`.
- Entraxe = `largeur / lignes` ; la première ligne est placée à un demi-entraxe du bord.
- Sans puissance de barre saisie, le site indique la puissance minimale que chaque barre doit fournir (`P / nb_barres`). Avec une puissance saisie, il indique le taux de gradation nécessaire (`P / puissance_installée`).
- Longueur de barre par défaut : 1,2 m.

**Consommation et coût**

```
kWh/jour = P × h / 1000
kWh/an   = kWh/jour × jours_par_an       (365 par défaut)
€/an     = kWh/an × prix_du_kWh
```

La consommation est calculée sur la puissance nécessaire (barres gradées à la valeur cible), pas sur la puissance maximale installée.

**Liste d'achat** : les puissances affichées pour les barres, l'alimentation et le programmateur sont arrondies au multiple de 5 W supérieur ; l'alimentation et le programmateur prévoient 10 % de marge.

## Référencement, hors ligne, audience

- Chaque page reçoit une adresse canonique, des balises de partage (Open Graph : image `public/images/partage/<page>.jpg`, 1200 × 630) et, pour l'accueil et les guides, des données structurées schema.org (`build/site.ts`, fonction `referencement`).
- Le site est installable et consultable hors ligne (`public/manifest.webmanifest`, `public/sw.js`) ; changez `VERSION` dans `sw.js` pour forcer le renouvellement du cache.
- Mesure d'audience facultative et sans cookie (Plausible) : `PLAUSIBLE_DOMAIN=mon-domaine.fr npm run build`. Sans cette variable, aucun script de mesure n'est ajouté.
- Mentions légales : `mentions-legales.html` — **complétez les champs entre crochets** (éditeur, contact).

## Domaine personnalisé (IONOS + GitHub Pages)

1. Dans IONOS, *Domaines & SSL* → votre domaine → *DNS* : ajoutez un enregistrement **CNAME** `www` → `teiki5320.github.io` (et, pour le domaine nu, les 4 enregistrements **A** vers 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153).
2. Dans GitHub, *Settings* → *Pages* → *Custom domain* : saisissez `www.votre-domaine.fr`, puis cochez *Enforce HTTPS* une fois le certificat émis.
3. Dans `.github/workflows/pages.yml`, passez l'adresse au build : `SITE_URL=https://www.votre-domaine.fr/ npm run build` (pour que sitemap, balises de partage et adresses canoniques soient justes).

## Déploiement sur IONOS (SFTP)

Le site est entièrement statique : il suffit d'envoyer le contenu du dossier `dist/`. Construisez-le avec l'adresse de votre domaine pour que le `sitemap.xml` soit juste : `SITE_URL=https://mon-domaine.fr/ npm run build`. Comme `vite.config.ts` utilise `base: './'`, les chemins sont relatifs et le site fonctionne à la racine d'un domaine comme dans un sous-dossier.

1. **Construire le site**
   ```bash
   npm install
   npm run build
   ```
   Le dossier `dist/` contient `index.html` et `assets/`.

2. **Récupérer les accès SFTP** dans l'espace client IONOS : *Hébergement* → votre contrat → *SFTP & SSH*. Notez l'hôte (du type `accessXXXXXXXX.webspace-data.io`), le port (22), l'utilisateur et le mot de passe (créez un utilisateur SFTP si besoin).

3. **Repérer le dossier cible** : *Domaines & SSL* → votre domaine → le « répertoire » vers lequel il pointe (par exemple `/calculateur-led`). Créez-le si nécessaire.

4. **Envoyer les fichiers**

   *Avec FileZilla* : Fichier → Gestionnaire de sites → protocole **SFTP**, hôte, port 22, utilisateur, mot de passe. Ouvrez le dossier cible à droite, puis glissez-y **le contenu** de `dist/` (et non le dossier `dist` lui-même).

   *En ligne de commande* :
   ```bash
   sftp -P 22 utilisateur@accessXXXXXXXX.webspace-data.io
   sftp> cd /calculateur-led
   sftp> lcd dist
   sftp> put index.html
   sftp> mkdir assets
   sftp> put -r assets
   sftp> bye
   ```

   *Ou avec rsync* (si l'accès SSH est inclus dans votre offre) :
   ```bash
   rsync -avz --delete -e "ssh -p 22" dist/ utilisateur@accessXXXXXXXX.webspace-data.io:/calculateur-led/
   ```

5. **Vérifier** en ouvrant le domaine dans un navigateur (videz le cache au besoin). Activez le certificat SSL dans IONOS : le bouton « Copier » utilise l'API presse-papiers, disponible uniquement en HTTPS (un repli existe pour les autres cas).

À chaque mise à jour : `npm run build`, puis renvoyez le contenu de `dist/`. Les fichiers de `assets/` ont un nom qui change à chaque build ; avec FileZilla, supprimez les anciens pour ne pas encombrer l'hébergement (rsync `--delete` le fait automatiquement).
