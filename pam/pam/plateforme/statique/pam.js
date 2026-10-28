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
  for (const id of ["panneau-balance", "panneau-releve", "panneau-paie"]) {
    $(id).hidden = id !== `panneau-${nom}`;
  }
  for (const id of ["onglet-balance", "onglet-releve", "onglet-paie"]) {
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

function montrerReleve(releve) {
  const racine = $("panneau-releve");
  vider(racine);
  if (!releve || !releve.length) {
    const vide = document.createElement("p");
    vide.textContent = "Aucun relevé PER n'est disponible pour le moment.";
    racine.appendChild(vide);
    return;
  }
  for (const photo of releve) {
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
}

function montrerBulletin(bulletin) {
  const detail = $("detail-bulletin");
  vider(detail);
  periodeBulletin = bulletin.periode;
  const titre = document.createElement("h3");
  titre.textContent = bulletin.periode_fr || bulletin.periode;
  const sous = document.createElement("p");
  sous.textContent = `Paie du ${bulletin.date_paie} · net ${bulletin.total}`;
  detail.appendChild(titre);
  detail.appendChild(sous);
  const visibles = (bulletin.lignes || []).filter((ligne) => ligne.nature !== "employeur");
  if (visibles.length) {
    detail.appendChild(
      tableau(
        ["Rubrique", "Montant"],
        visibles.map((ligne) => [ligne.libelle, ligne.montant]),
      ),
    );
  }
  const net = document.createElement("p");
  net.textContent = `Gains ${bulletin.gains} · retenues ${bulletin.retenues} · net à payer ${bulletin.total}`;
  detail.appendChild(net);
  $("telecharger-pdf").hidden = false;
}

function montrerBulletins(bulletins) {
  const liste = $("liste-bulletins");
  vider(liste);
  vider($("detail-bulletin"));
  $("telecharger-pdf").hidden = true;
  periodeBulletin = "";
  if (!bulletins || !bulletins.length) {
    const vide = document.createElement("p");
    vide.textContent = "Aucun bulletin n'est disponible pour le moment.";
    liste.appendChild(vide);
    return;
  }
  for (const bulletin of bulletins) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "secondaire";
    bouton.textContent = `${bulletin.periode_fr || bulletin.periode} — net ${bulletin.total}`;
    bouton.onclick = () => montrerBulletin(bulletin);
    liste.appendChild(bouton);
  }
  montrerBulletin(bulletins[0]);
}

$("onglet-balance").onclick = () => panneau("balance");
$("onglet-releve").onclick = () => panneau("releve");
$("onglet-paie").onclick = () => panneau("paie");

$("telecharger-pdf").onclick = async () => {
  $("message-balance").textContent = "";
  try {
    const reponse = await fetch(`/api/fiche.pdf?periode=${encodeURIComponent(periodeBulletin)}`, {
      credentials: "same-origin",
    });
    if (!reponse.ok) {
      const charge = await reponse.json();
      throw new Error(charge.message || "La fiche n'a pas pu être préparée.");
    }
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(await reponse.blob());
    lien.download = `fiche-paie-${periodeBulletin}.pdf`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  } catch (erreur) {
    $("message-balance").textContent = erreur.message;
  }
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
      $("montant").textContent = charge.balance.montant;
      $("date-maj").textContent = charge.balance.periode_fr
        ? `${charge.balance.periode_fr} · mise à jour le ${charge.balance.date_mise_a_jour}`
        : `Mise à jour le ${charge.balance.date_mise_a_jour}`;
    } else {
      $("montant").textContent = "";
      $("date-maj").textContent = charge.message || "";
    }
    montrerReleve(charge.releve || []);
    montrerBulletins(charge.bulletins || []);
    $("message-balance").textContent = "";
    panneau("balance");
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
