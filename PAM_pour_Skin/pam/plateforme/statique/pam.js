const INACTIVITE_MS = 300000;
let defi = "";
let finOtp = 0;
let minuteur = 0;
let inactivite = 0;
let periodeBulletin = "";

const $ = (id) => document.getElementById(id);

function ecran(nom) {
  for (const id of ["ecran-identification", "ecran-canal", "ecran-otp", "ecran-balance"]) {
    $(id).hidden = id !== nom;
  }
}

function bras() {
  clearTimeout(inactivite);
  inactivite = setTimeout(() => {
    fetch("/api/sortir", { method: "POST", credentials: "same-origin" });
    ecran("ecran-identification");
    $("message-identification").textContent = "Session fermée après 5 minutes sans action.";
  }, INACTIVITE_MS);
}

async function poster(url, corps) {
  const reponse = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const charge = await reponse.json();
  if (!reponse.ok) {
    throw new Error(charge.message || "Opération refusée.");
  }
  return charge;
}

$("naissance").addEventListener("input", () => {
  const champ = $("naissance");
  const chiffres = champ.value.replace(/\D/g, "").slice(0, 8);
  if (champ.value !== chiffres) {
    champ.value = chiffres;
  }
});

$("voir-naissance").onclick = () => {
  const champ = $("naissance");
  const masque = champ.type === "password";
  champ.type = masque ? "text" : "password";
  $("voir-naissance").textContent = masque ? "Masquer" : "Afficher";
};

$("continuer").onclick = async () => {
  $("message-identification").textContent = "";
  try {
    const charge = await poster("/api/identifier", {
      code: $("code").value,
      naissance: $("naissance").value,
      captcha: $("reponse-captcha").value,
    });
    if (charge.captcha) {
      $("captcha").hidden = false;
      $("captcha").textContent = charge.captcha;
      $("ligne-captcha").hidden = false;
    }
    if (charge.etape !== "canal") {
      $("message-identification").textContent = charge.message;
      return;
    }
    defi = charge.defi;
    const courriel = charge.canaux.find((canal) => canal.canal === "email");
    const bouton = $("canal-email");
    bouton.disabled = !courriel.disponible;
    bouton.textContent = courriel.disponible
      ? `Recevoir le code par courriel (${courriel.masque})`
      : `Courriel — ${courriel.motif}`;
    ecran("ecran-canal");
    bras();
  } catch (erreur) {
    $("message-identification").textContent = erreur.message;
  }
};

$("canal-email").onclick = async () => {
  try {
    await poster("/api/envoyer", { defi, canal: "email" });
    finOtp = Date.now() + 5 * 60 * 1000;
    ecran("ecran-otp");
    clearInterval(minuteur);
    minuteur = setInterval(() => {
      const reste = Math.max(0, finOtp - Date.now());
      const secondes = Math.ceil(reste / 1000);
      $("compte-a-rebours").textContent = `Valable encore ${secondes} s`;
      if (reste === 0) {
        clearInterval(minuteur);
      }
    }, 1000);
    bras();
  } catch (erreur) {
    $("message-canal").textContent = erreur.message;
  }
};

function vider(noeud) {
  while (noeud.firstChild) {
    noeud.removeChild(noeud.firstChild);
  }
}

function panneau(nom) {
  for (const id of ["panneau-balance", "panneau-releve", "panneau-paie", "panneau-main"]) {
    $(id).hidden = id !== `panneau-${nom}`;
  }
  for (const id of ["onglet-balance", "onglet-releve", "onglet-paie", "onglet-main"]) {
    $(id).classList.toggle("actif", id === `onglet-${nom}`);
  }
}

function tableau(entetes, lignes) {
  const cadre = document.createElement("div");
  cadre.className = "defile";
  const table = document.createElement("table");
  const tete = document.createElement("tr");
  for (const entete of entetes) {
    const th = document.createElement("th");
    th.textContent = entete;
    if (entete !== "Compte" && entete !== "Rubrique" && entete !== "Ouverture") {
      th.className = "montant";
    }
    tete.appendChild(th);
  }
  table.appendChild(tete);
  for (const ligne of lignes) {
    const tr = document.createElement("tr");
    ligne.forEach((valeur, index) => {
      const td = document.createElement("td");
      td.textContent = valeur;
      const entete = entetes[index];
      if (entete !== "Compte" && entete !== "Rubrique" && entete !== "Ouverture") {
        td.className = "montant";
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }
  cadre.appendChild(table);
  return cadre;
}

let releveComplet = [];

function isoVersFr(iso) {
  const [annee, mois, jour] = String(iso || "").split("-");
  if (!annee || !mois || !jour) {
    return "";
  }
  return `${jour}/${mois}/${annee}`;
}

function frVersIso(texte) {
  const morceaux = String(texte || "").trim().split("/");
  if (morceaux.length !== 3 || !morceaux.every((morceau) => /^\d+$/.test(morceau))) {
    return "";
  }
  const jour = morceaux[0].padStart(2, "0");
  const mois = morceaux[1].padStart(2, "0");
  const annee = morceaux[2];
  if (annee.length !== 4) {
    return "";
  }
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, Number(jour)));
  if (
    date.getUTCFullYear() !== Number(annee) ||
    date.getUTCMonth() !== Number(mois) - 1 ||
    date.getUTCDate() !== Number(jour)
  ) {
    return "";
  }
  return `${annee}-${mois}-${jour}`;
}

function saisirJour(evenement) {
  const champ = evenement.target;
  const chiffres = champ.value.replace(/\D/g, "").slice(0, 8);
  let affiche = chiffres;
  if (chiffres.length > 4) {
    affiche = `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`;
  } else if (chiffres.length > 2) {
    affiche = `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`;
  }
  if (champ.value !== affiche) {
    champ.value = affiche;
  }
}

function indiquerMois(releve) {
  const photos = (releve || [])
    .filter((photo) => photo.date_iso)
    .sort((a, b) => a.date_iso.localeCompare(b.date_iso));
  const libelles = [];
  for (const photo of photos) {
    const libelle = photo.periode_fr || photo.periode;
    if (libelle && !libelles.includes(libelle)) {
      libelles.push(libelle);
    }
  }
  $("mois-disponibles").textContent = libelles.length
    ? `Photos en base : ${libelles.join(", ")}.`
    : "Aucune photo PER n'est encore en base.";
  if (!$("releve-debut").value && photos.length) {
    $("releve-debut").value = isoVersFr(photos[0].date_iso);
  }
  if (!$("releve-fin").value && photos.length) {
    const aujourd = new Date();
    const fin = [
      aujourd.getFullYear(),
      String(aujourd.getMonth() + 1).padStart(2, "0"),
      String(aujourd.getDate()).padStart(2, "0"),
    ].join("-");
    const derniere = photos[photos.length - 1].date_iso;
    $("releve-fin").value = isoVersFr(derniere > fin ? derniere : fin);
  }
}

function montrerReleve(releve) {
  releveComplet = releve || [];
  vider($("releve-cartes"));
  $("releve-pdf").hidden = true;
  $("releve-cadre").hidden = true;
  $("message-releve").textContent = "";
  indiquerMois(releveComplet);
}

function dessinerReleve(photos) {
  const racine = $("releve-cartes");
  vider(racine);
  if (!photos.length) {
    const vide = document.createElement("p");
    vide.textContent = "Aucune photo PER entre ces deux dates.";
    racine.appendChild(vide);
    return;
  }
  for (const photo of photos) {
    const carte = document.createElement("div");
    carte.className = "carte";
    const titre = document.createElement("h3");
    titre.textContent = photo.periode_fr || photo.periode;
    const sous = document.createElement("p");
    sous.textContent = `Au ${photo.date_mise_a_jour} · balance ${photo.montant} · intérêt cumulé ${photo.interet_cumule}`;
    carte.appendChild(titre);
    carte.appendChild(sous);
    if (photo.comptes && photo.comptes.length) {
      carte.appendChild(
        tableau(
          ["Compte", "Ouverture", "Balance", "Intérêt"],
          photo.comptes.map((compte) => [compte.numero, compte.date_ouverture, compte.montant, compte.interet_cumule]),
        ),
      );
    }
    racine.appendChild(carte);
  }
  const mention = document.createElement("p");
  mention.className = "mention";
  mention.textContent = "Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.";
  racine.appendChild(mention);
}

let bulletinsConnus = [];

function dessinerMoisPaie() {
  const liste = $("liste-bulletins");
  vider(liste);
  if (!bulletinsConnus.length) {
    const vide = document.createElement("p");
    vide.textContent = "Aucune fiche de paie n'est disponible pour le moment.";
    liste.appendChild(vide);
    return;
  }
  for (const bulletin of bulletinsConnus) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "mois-paie";
    if (bulletin.periode === periodeBulletin) {
      bouton.classList.add("choisi");
    }
    bouton.textContent = bulletin.periode_fr || bulletin.periode;
    bouton.onclick = () => montrerBulletin(bulletin);
    liste.appendChild(bouton);
  }
}

function montrerBulletin(bulletin) {
  periodeBulletin = bulletin.periode;
  const cadre = $("fiche");
  cadre.hidden = false;
  $("enregistrer-pdf").hidden = false;
  $("enregistrer-pdf").disabled = true;
  cadre.src = `/api/fiche?periode=${encodeURIComponent(bulletin.periode)}`;
  dessinerMoisPaie();
}

function montrerBulletins(bulletins) {
  bulletinsConnus = bulletins || [];
  $("fiche").hidden = true;
  $("fiche").removeAttribute("src");
  $("enregistrer-pdf").hidden = true;
  periodeBulletin = "";
  if (!bulletinsConnus.length) {
    dessinerMoisPaie();
    return;
  }
  montrerBulletin(bulletinsConnus[0]);
}

$("releve-debut").addEventListener("input", saisirJour);
$("releve-fin").addEventListener("input", saisirJour);

$("afficher-releve").onclick = async () => {
  const message = $("message-releve");
  message.textContent = "";
  $("releve-pdf").hidden = true;
  $("releve-cadre").hidden = true;
  const debut = frVersIso($("releve-debut").value);
  const fin = frVersIso($("releve-fin").value);
  if (!debut || !fin) {
    message.textContent = "Indiquez le jour, le mois et l'année, par exemple 31/01/2026.";
    vider($("releve-cartes"));
    return;
  }
  if (debut > fin) {
    message.textContent = "La date de début est postérieure à la date de fin.";
    vider($("releve-cartes"));
    return;
  }
  try {
    const reponse = await fetch("/api/balance", { credentials: "same-origin" });
    const charge = await reponse.json();
    if (!reponse.ok) {
      throw new Error(charge.message || "Le relevé n'a pas pu être relu.");
    }
    releveComplet = charge.releve || [];
    indiquerMois(releveComplet);
  } catch (erreur) {
    message.textContent = erreur.message;
    return;
  }
  const photos = releveComplet
    .filter((photo) => photo.date_iso && photo.date_iso >= debut && photo.date_iso <= fin)
    .sort((a, b) => a.date_iso.localeCompare(b.date_iso));
  dessinerReleve(photos);
  $("releve-cadre").src = `/api/releve?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`;
  $("releve-pdf").hidden = false;
  bras();
};

$("releve-pdf").onclick = async () => {
  const message = $("message-releve");
  const debut = frVersIso($("releve-debut").value);
  const fin = frVersIso($("releve-fin").value);
  if (!debut || !fin || debut > fin) {
    message.textContent = "Affichez d'abord le relevé entre deux dates valides.";
    return;
  }
  const nom = `Releve-PER-${debut}-au-${fin}.pdf`;
  const url = `/api/releve-pdf?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`;
  message.className = "message";
  message.textContent = "";
  let destination = null;
  if (window.showSaveFilePicker) {
    try {
      destination = await window.showSaveFilePicker({
        suggestedName: nom,
        types: [{ description: "Document PDF", accept: { "application/pdf": [".pdf"] } }],
      });
    } catch (erreur) {
      if (erreur && erreur.name === "AbortError") {
        return;
      }
      destination = null;
    }
  }
  try {
    const reponse = await fetch(url, { credentials: "same-origin" });
    if (!reponse.ok) {
      let detail = "Le relevé PDF n'a pas pu être créé.";
      try {
        const charge = await reponse.json();
        detail = charge.message || detail;
      } catch (ignore) {
        /* le corps n'est pas du JSON */
      }
      throw new Error(detail);
    }
    const fichier = await reponse.blob();
    if (destination) {
      const flux = await destination.createWritable();
      await flux.write(fichier);
      await flux.close();
      message.className = "message ok";
      message.textContent = "Le relevé PDF a été enregistré.";
      bras();
      return;
    }
    const lien = document.createElement("a");
    const adresse = URL.createObjectURL(fichier);
    lien.href = adresse;
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 1000);
    message.className = "message ok";
    message.textContent = "Le relevé PDF a été enregistré.";
    bras();
  } catch (erreur) {
    message.className = "message";
    message.textContent = erreur.message;
  }
};

function menuPrincipal() {
  $("menu-principal").hidden = false;
  $("zone-documents").hidden = true;
  bras();
}

function ouvrirDocument(nom) {
  $("menu-principal").hidden = true;
  $("zone-documents").hidden = false;
  panneau(nom);
  bras();
}

$("choix-balance").onclick = () => ouvrirDocument("balance");
$("choix-releve").onclick = () => ouvrirDocument("releve");
$("choix-paie").onclick = () => ouvrirDocument("paie");
$("choix-main").onclick = () => ouvrirDocument("main");
$("retour-menu").onclick = () => menuPrincipal();

$("onglet-balance").onclick = () => panneau("balance");
$("onglet-releve").onclick = () => panneau("releve");
$("onglet-paie").onclick = () => panneau("paie");
$("onglet-main").onclick = () => panneau("main");

$("fiche").addEventListener("load", () => {
  if ($("fiche").getAttribute("src")) {
    $("enregistrer-pdf").disabled = false;
  }
});

$("enregistrer-pdf").onclick = () => {
  const cadre = $("fiche");
  if (!cadre.contentWindow) {
    return;
  }
  cadre.contentWindow.focus();
  cadre.contentWindow.print();
};

$("valider").onclick = async () => {
  try {
    await poster("/api/verifier", { defi, otp: $("otp").value });
    const reponse = await fetch("/api/balance", { credentials: "same-origin" });
    const charge = await reponse.json();
    if (!reponse.ok && !charge.balance && !(charge.bulletins || []).length && !(charge.releve || []).length) {
      throw new Error(charge.message || "Service momentanément indisponible.");
    }
    if (charge.balance) {
      $("montant").textContent = `${charge.balance.montant} USD`;
      $("date-maj").textContent = charge.balance.periode_fr
        ? `${charge.balance.periode_fr} · mise à jour le ${charge.balance.date_mise_a_jour}`
        : `Mise à jour le ${charge.balance.date_mise_a_jour}`;
    } else {
      $("montant").textContent = "";
      $("date-maj").textContent = charge.message || "";
    }
    montrerReleve(charge.releve || []);
    montrerBulletins(charge.bulletins || []);
    $("onglet-main").hidden = !charge.drh;
    $("choix-main").hidden = !charge.drh;
    $("message-balance").textContent = "";
    menuPrincipal();
    ecran("ecran-balance");
    bras();
  } catch (erreur) {
    $("message-otp").textContent = erreur.message;
  }
};

$("renvoyer").onclick = async () => {
  try {
    await poster("/api/envoyer", { defi, canal: "email" });
    $("message-otp").textContent = "Un nouveau code a été envoyé.";
    bras();
  } catch (erreur) {
    $("message-otp").textContent = erreur.message;
  }
};

$("lever-gel").onclick = async () => {
  const message = $("message-main-levee");
  message.classList.remove("ok");
  message.textContent = "";
  try {
    const charge = await poster("/api/main-levee", { code: $("code-main-levee").value });
    message.classList.add("ok");
    message.textContent = charge.message;
    bras();
  } catch (erreur) {
    message.textContent = erreur.message;
  }
};

$("sortir").onclick = async () => {
  await fetch("/api/sortir", { method: "POST", credentials: "same-origin" });
  ecran("ecran-identification");
};

["click", "keydown", "pointerdown"].forEach((evenement) => {
  document.addEventListener(evenement, () => {
    if (!$("ecran-balance").hidden || !$("ecran-otp").hidden) {
      bras();
    }
  });
});
