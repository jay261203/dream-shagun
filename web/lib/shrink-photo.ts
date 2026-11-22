import { fitWithin } from "./moments";

const LONGEST_SIDE = 1600;

/**
 * Shrink a photo in the browser before it is sent, so a 10 MB phone picture travels as a few hundred KB.
 * Drawing it onto a canvas also drops the location and other details the camera saved in the file.
 * The server shrinks again, so this is for speed, not for safety. Returns the original if the browser cannot decode it.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, LONGEST_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
