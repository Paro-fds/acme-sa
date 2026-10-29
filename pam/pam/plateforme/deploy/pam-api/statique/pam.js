const INACTIVITE_MS = 300000;
let defi = "";
let finOtp = 0;
let minuteur = 0;
let inactivite = 0;

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

$("valider").onclick = async () => {
  try {
    await poster("/api/verifier", { defi, otp: $("otp").value });
    const reponse = await fetch("/api/balance", { credentials: "same-origin" });
    const charge = await reponse.json();
    if (charge.balance) {
      $("montant").textContent = charge.balance.montant;
      $("date-maj").textContent = `Mise à jour le ${charge.balance.date_mise_a_jour}`;
      $("message-balance").textContent = "";
    } else {
      $("montant").textContent = "";
      $("date-maj").textContent = "";
      $("message-balance").textContent = charge.message;
    }
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
