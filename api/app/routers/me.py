from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, str | None]:
    """Smallest protected route. Proves the login check works; later routes build on it."""
    return {"id": user.id, "email": user.email, "phone": user.phone}
