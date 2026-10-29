"""Mémoire durable des défis, sessions et verrous. Une invocation Lambda n'a pas d'état."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any

import noyau


def _iso(moment: datetime | None) -> str:
    if moment is None:
        return ""
    return moment.isoformat(timespec="seconds")


def _moment(texte: str) -> datetime | None:
    if not texte:
        return None
    return datetime.fromisoformat(texte)


def coder_defi(defi: noyau.Defi) -> dict[str, Any]:
    return {
        "identifiant": defi.identifiant,
        "code": defi.code,
        "hmac_otp": defi.hmac_otp,
        "expire": _iso(defi.expire),
        "essais": defi.essais,
        "renvois": defi.renvois,
        "dernier_envoi": _iso(defi.dernier_envoi),
        "fenetre_renvoi": _iso(defi.fenetre_renvoi),
        "consomme": defi.consomme,
    }


def decoder_defi(document: dict[str, Any]) -> noyau.Defi:
    return noyau.Defi(
        identifiant=document["identifiant"],
        code=document["code"],
        hmac_otp=document.get("hmac_otp", ""),
        expire=_moment(document.get("expire", "")) or datetime.min,
        essais=int(document.get("essais", 0)),
        renvois=int(document.get("renvois", 0)),
        dernier_envoi=_moment(document.get("dernier_envoi", "")),
        fenetre_renvoi=_moment(document.get("fenetre_renvoi", "")),
        consomme=bool(document.get("consomme", False)),
    )


def coder_session(session: noyau.Session) -> dict[str, Any]:
    return {"jeton": session.jeton, "code": session.code, "expire": _iso(session.expire)}


def decoder_session(document: dict[str, Any]) -> noyau.Session:
    return noyau.Session(document["jeton"], document["code"], _moment(document.get("expire", "")) or datetime.min)


def coder_verrou(verrou: noyau.Verrou) -> dict[str, Any]:
    return {"echecs": verrou.echecs, "jusqua": _iso(verrou.jusqua)}


def decoder_verrou(document: dict[str, Any]) -> noyau.Verrou:
    return noyau.Verrou(int(document.get("echecs", 0)), _moment(document.get("jusqua", "")))


def coder_contact(suivi: noyau.SuiviContact) -> dict[str, Any]:
    return {
        "empreinte_courriel": suivi.empreinte_courriel,
        "empreinte_telephone": suivi.empreinte_telephone,
        "courriel": suivi.courriel,
        "telephone": suivi.telephone,
        "gele_courriel": _iso(suivi.gele_courriel),
        "gele_telephone": _iso(suivi.gele_telephone),
    }


def decoder_contact(document: dict[str, Any]) -> noyau.SuiviContact:
    return noyau.SuiviContact(
        document.get("empreinte_courriel", ""),
        document.get("empreinte_telephone", ""),
        document.get("courriel", ""),
        document.get("telephone", ""),
        _moment(document.get("gele_courriel", "")),
        _moment(document.get("gele_telephone", "")),
    )


def _epoch(moment: datetime) -> int:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return int(moment.timestamp())


class DepotDynamo:
    def __init__(self, nom_table: str, client: Any, maintenant: Any) -> None:
        self.table = nom_table
        self.client = client
        self.maintenant = maintenant

    def _lire(self, cle: str) -> dict[str, Any] | None:
        reponse = self.client.get_item(TableName=self.table, Key={"pk": {"S": cle}}, ConsistentRead=True)
        brut = reponse.get("Item", {}).get("document", {}).get("S")
        if not brut:
            return None
        return json.loads(brut)

    def _ecrire(self, cle: str, document: dict[str, Any], duree_secondes: int | None) -> None:
        item: dict[str, Any] = {"pk": {"S": cle}, "document": {"S": json.dumps(document, ensure_ascii=False)}}
        if duree_secondes is not None:
            item["expire"] = {"N": str(_epoch(self.maintenant()) + duree_secondes)}
        self.client.put_item(TableName=self.table, Item=item)

    def lire_defi(self, identifiant: str) -> noyau.Defi | None:
        document = self._lire(f"DEFI#{identifiant}")
        return decoder_defi(document) if document else None

    def ecrire_defi(self, defi: noyau.Defi) -> None:
        self._ecrire(f"DEFI#{defi.identifiant}", coder_defi(defi), 20 * 60)

    def lire_session(self, jeton: str) -> noyau.Session | None:
        document = self._lire(f"SESSION#{jeton}")
        return decoder_session(document) if document else None

    def ecrire_session(self, session: noyau.Session) -> None:
        self._ecrire(f"SESSION#{session.jeton}", coder_session(session), 16 * 60)

    def effacer_session(self, jeton: str) -> None:
        self.client.delete_item(TableName=self.table, Key={"pk": {"S": f"SESSION#{jeton}"}})

    def lire_verrou(self, genre: str, cle: str) -> noyau.Verrou:
        document = self._lire(f"VERROU#{genre}#{cle}")
        return decoder_verrou(document) if document else noyau.Verrou()

    def ecrire_verrou(self, genre: str, cle: str, verrou: noyau.Verrou) -> None:
        self._ecrire(f"VERROU#{genre}#{cle}", coder_verrou(verrou), 7 * 24 * 3600)

    def lire_captcha(self, cle: str) -> tuple[str, str]:
        document = self._lire(f"CAPTCHA#{cle}")
        if not document:
            return "", ""
        return document.get("question", ""), document.get("reponse", "")

    def ecrire_captcha(self, cle: str, question: str, reponse: str) -> None:
        self._ecrire(f"CAPTCHA#{cle}", {"question": question, "reponse": reponse}, 3600)

    def lire_contact(self, code: str) -> noyau.SuiviContact | None:
        document = self._lire(f"CONTACT#{code}")
        return decoder_contact(document) if document else None

    def ecrire_contact(self, code: str, suivi: noyau.SuiviContact) -> None:
        self._ecrire(f"CONTACT#{code}", coder_contact(suivi), None)

    def ajouter_audit(self, ligne: dict[str, Any]) -> None:
        cle = f"AUDIT#{ligne.get('quand', '')}#{secrets.token_hex(4)}"
        self._ecrire(cle, ligne, None)
