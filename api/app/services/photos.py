"""Photos for a wedding: shrink and clean an upload, then keep it in the public bucket."""

import io
import uuid

from PIL import Image, ImageOps, UnidentifiedImageError
from supabase import Client

BUCKET = "wedding-photos"
LONGEST_SIDE = 1600
JPEG_QUALITY = 82
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_PHOTOS_PER_WEDDING = 40


class BadImage(ValueError):
    """The upload is not a picture we can use."""


def shrink(data: bytes) -> bytes:
    """Re-draw the picture as a plain JPEG no bigger than 1600 pixels on its longest side.

    Writing a new file drops everything else a phone puts in a photo, most importantly where it was taken (GPS).
    """
    try:
        with Image.open(io.BytesIO(data)) as source:
            source.load()
            picture = ImageOps.exif_transpose(source)
            if picture.mode in ("RGBA", "LA", "P"):
                rgba = picture.convert("RGBA")
                flat = Image.new("RGB", rgba.size, (255, 255, 255))
                flat.paste(rgba, mask=rgba.getchannel("A"))
                picture = flat
            elif picture.mode != "RGB":
                picture = picture.convert("RGB")
            picture.thumbnail((LONGEST_SIDE, LONGEST_SIDE), Image.Resampling.LANCZOS)
            out = io.BytesIO()
            picture.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            return out.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as error:
        raise BadImage("That file is not a photo we can use. Try a JPEG or PNG picture.") from error


def public_prefix(supabase_url: str, wedding_id: str) -> str:
    """Every photo of this wedding has an address starting with this."""
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{BUCKET}/{wedding_id}/"


def count(db: Client, wedding_id: str) -> int:
    return len(db.storage.from_(BUCKET).list(wedding_id))


def save(db: Client, wedding_id: str, jpeg: bytes, supabase_url: str) -> str:
    """Store the picture under the wedding's own folder and return its public address."""
    name = f"{uuid.uuid4()}.jpg"
    db.storage.from_(BUCKET).upload(f"{wedding_id}/{name}", jpeg, {"content-type": "image/jpeg"})
    return public_prefix(supabase_url, wedding_id) + name


def delete(db: Client, wedding_id: str, url: str | None, supabase_url: str) -> None:
    """Remove a stored photo when its moment goes. A failure here never blocks the delete."""
    prefix = public_prefix(supabase_url, wedding_id)
    if not url or not url.startswith(prefix):
        return
    try:
        db.storage.from_(BUCKET).remove([f"{wedding_id}/{url[len(prefix):]}"])
    except Exception:  # noqa: BLE001 - best-effort clean-up
        pass
