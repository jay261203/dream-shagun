"""Suggest free link names when the one a family wanted is taken."""

from collections.abc import Callable, Iterable


def candidate_slugs(slug: str, year: int | None = None) -> list[str]:
    """Alternatives in the order we would offer them."""
    base = slug[:50].rstrip("-")
    out = [f"{base}-2", f"{base}-3"]
    if year:
        out.insert(0, f"{base}-{year}")
    return out


def suggest_free(slug: str, taken: Callable[[Iterable[str]], set[str]], year: int | None = None) -> list[str]:
    """Return up to two candidates that are not taken. `taken` looks up which of them already exist."""
    candidates = candidate_slugs(slug, year)
    used = taken(candidates)
    return [c for c in candidates if c not in used][:2]
