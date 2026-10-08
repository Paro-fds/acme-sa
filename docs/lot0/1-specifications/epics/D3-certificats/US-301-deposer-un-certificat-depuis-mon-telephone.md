# US-301 — Déposer un certificat depuis mon téléphone

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D3 Certificats |
| **Lot** | 1 (antivirus et stockage chiffré au lot 3, avec US-002) |
| **Priorité** | Must |
| **Exigences** | EF-301, EF-302, EF-308 |
| **Règles** | RG-20 → RG-25, RG-31 |
| **Décisions liées** | D-04, D-07 |

## Récit

> En tant qu'**employé au profil complet**, je veux déposer un ou plusieurs certificats en photo ou en PDF, **afin que mes qualifications soient reconnues par les RH**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** PDF, JPG ou PNG, vérifiés sur le contenu réel du fichier ; 5 Mo au plus, photos réduites avant l'envoi.
- **CA-02** Aperçu avant envoi.
- **CA-03** Champs obligatoires : type, niveau, intitulé, établissement, année ; pays si étranger ; domaine à partir de Bac + 2.
- **CA-04** Année dans le futur refusée ; 20 certificats au plus.
- **CA-05** Le fichier est enregistré sous un nom aléatoire.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
