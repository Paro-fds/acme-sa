---
created: 2026-09-08T17:38:40Z
updated: 2026-10-02T09:26:31Z
---

# technical-specs/

**Répond à :** comment un Workstream livré est-il réellement construit, du point de vue de l'implémentation ?

**Pas de gabarit figé**, même logique que `functional-specs/` — sections décidées par Workstream, de façon incrémentale, une fois qu'il y a une implémentation réelle à documenter.

**Convention de nommage des fichiers :** `ws-tech-NN-nom.md`, même appariement que du côté fonctionnel, correspondant à l'identifiant du Workstream.

> **Questions à se poser pour décider si une section est nécessaire :**
> 1. Que devrait savoir un nouvel ingénieur pour modifier ceci sans danger, sans casser un invariant ?
> 2. Quel est le contrat de données, le schéma ou la règle de nommage exacts, assez précis pour que deux implémentations ne dérivent pas ?
> 3. Quelle décision prise ici était assez peu évidente pour que quelqu'un puisse plus tard la « corriger » en revenant à la mauvaise option ?
>
> **La question qui gouverne tout le reste : une user story de ce Workstream s'est-elle réellement close ? Si non, attendez.**
