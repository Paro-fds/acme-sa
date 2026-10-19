/** US-102 (RG-82) : les trois méthodes au choix de la personne. */
export const METHODS = {
  WHATSAPP: {
    title: 'WhatsApp',
    icon: 'chat',
    help: 'Un code à 6 chiffres par message WhatsApp.',
    destinationLabel: 'Numéro WhatsApp',
    destinationHelp: 'Au format international, par exemple +509 3722 1111.',
    inputType: 'tel',
    autoComplete: 'tel',
    channel: 'par WhatsApp',
  },
  EMAIL: {
    title: 'Email',
    icon: 'mail',
    help: 'Un code à 6 chiffres par email.',
    destinationLabel: 'Adresse email',
    destinationHelp: null,
    inputType: 'email',
    autoComplete: 'email',
    channel: 'par email',
  },
  TOTP: {
    title: "Application d'authentification",
    icon: 'qr_code_2',
    help: 'Microsoft Authenticator ou une autre application : un code qui change toutes les 30 secondes, même sans réseau.',
    destinationLabel: null,
    channel: 'dans votre application',
  },
}

export const METHOD_ORDER = ['WHATSAPP', 'EMAIL', 'TOTP']

/** « Saisissez le code reçu par WhatsApp au +509 •••• 1111 » ; « … affiché dans votre application ». */
export function codeInstruction(method, destination) {
  if (method === 'TOTP') return "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."
  return `Saisissez le code à 6 chiffres envoyé ${METHODS[method].channel} au ${destination}.`
}
