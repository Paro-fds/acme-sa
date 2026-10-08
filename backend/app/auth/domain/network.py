"""US-102 CA-06 : l'espace RH ne s'ouvre que depuis le réseau des bureaux (pas de VPN, D-36)."""

import ipaddress


def parse_networks(value: str) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """« 196.3.0.0/24, 200.1.2.3 » → réseaux ; une adresse seule vaut /32."""
    return [ipaddress.ip_network(part.strip(), strict=False) for part in value.split(",") if part.strip()]


def is_allowed(address: str | None, networks: list) -> bool:
    """Sans réseau configuré, aucune restriction (démonstrateur, poste du développeur)."""
    if not networks:
        return True
    try:
        ip = ipaddress.ip_address(address or "")
    except ValueError:
        return False
    return any(ip in network for network in networks)
