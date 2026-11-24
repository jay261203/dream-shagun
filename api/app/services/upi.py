"""Build UPI payment links. We never receive money: the link pays the family directly."""

import re
from urllib.parse import quote

UPI_ID_PATTERN = re.compile(r"^[\w.\-]{2,256}@[a-zA-Z]{2,64}$")


def is_valid_upi_id(upi_id: str) -> bool:
    return bool(UPI_ID_PATTERN.match(upi_id.strip()))


def build_upi_link(payee_upi_id: str, payee_name: str, amount_paise: int | None, note: str | None) -> str:
    """Return a upi://pay link. Amount is integer paise so no float rounding ever touches money.

    With no amount the paying app asks the guest how much; with no note it shows none.
    """
    if not is_valid_upi_id(payee_upi_id):
        raise ValueError("Invalid UPI ID")
    if amount_paise is not None and amount_paise < 100:
        raise ValueError("Amount must be at least ₹1")
    parts = [f"pa={quote(payee_upi_id.strip(), safe='@')}", f"pn={quote(payee_name.strip(), safe='')}"]
    if amount_paise is not None:
        parts.append(f"am={amount_paise // 100}.{amount_paise % 100:02d}")
    parts.append("cu=INR")
    if note and note.strip():
        parts.append(f"tn={quote(note.strip()[:50], safe='')}")
    return "upi://pay?" + "&".join(parts)
