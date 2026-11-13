# Consignes du projet Kultiled

- Site en français : textes, commentaires et messages en français.
- Travailler uniquement sur la branche `main` (pas d'autre branche, pas de pull request sauf demande).
- Vérifications avant chaque envoi : `npm test` et `npm run build`.

## Génération d'images

- **Utiliser OpenArt** pour générer des images, lorsqu'il est connecté à la session.
- Si OpenArt n'est pas disponible : le dire et **demander l'accord** avant d'utiliser un autre service.
- **Faire attention aux coûts** : annoncer le coût en crédits avant chaque génération, attendre l'accord, générer une seule variante par défaut.
- Les photos générées vont dans `public/images/` (voir la section « Images » du README) ; le pied de page signale qu'elles sont générées par IA.

## Fiches à jour à chaque changement (règle de Jean, 22 octobre 2026)

Le Studio de Jean affiche les fiches de ce dépôt (docs/INFRA.md, docs/MARKETING.md, docs/PUBLICATION.md) et le README. Elles doivent toujours dire la vérité d'aujourd'hui.

- Dès qu'un travail change un fait affiché par ces fiches — version envoyée ou en ligne (App Store, Google Play, site), date de mise en ligne, hébergement ou domaine, service ajouté ou retiré, code Amazon Partenaires, état AdSense ou Pinterest, monétisation, nombre de contenus publiés —, mets à jour **dans le même envoi** toutes les phrases concernées des trois fiches (En bref, Parcours, Boutiques, Vue d'ensemble, Ce qui reste…) et du README.
- Une ancienne valeur ne reste qu'au passé, datée (« la 1.0.4 a été mise en ligne le 15 octobre »).
- Ne recopie jamais de secret ni de clé dans ces fichiers.
- Chaque matin, la tâche « Fiches Mes Apps » du Studio vérifie derrière toi, compare les versions avec ce que servent réellement les boutiques et signale toute phrase fausse.

## Images des articles : libres de droits d'abord (règle de Jean, 11/11/2026)

- Pour chaque article, chercher d'abord une image libre de droits (gratuite) : `node ~/Dev/apps/Studio/tool/images-libres/chercher.mjs "<mots-clés>" --dossier <dossier temporaire>` (Wikimedia Commons, Openverse ; seulement domaine public, CC0, CC BY, CC BY-SA, au moins 1200 px).
- Regarder chaque image avant de la garder : elle doit montrer vraiment le sujet de l'article, nette, sans filigrane, texte, logo ni gros plan sur une personne privée.
- Crédit à la fin de l'article : « *Photo : auteur, licence, via source (lien vers la page source).* » (obligatoire en CC BY et CC BY-SA).
- OpenArt seulement si aucune image libre ne convient vraiment, et jamais sans l'accord de Jean : annoncer le coût (ou déposer une carte dans le Studio) et attendre son oui.
