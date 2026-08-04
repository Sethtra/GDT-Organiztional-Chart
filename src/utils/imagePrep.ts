const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const OUTPUT_QUALITY = 0.85;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImagePrepError extends Error {}

/** Rejects anything over 10MB or not jpg/png/webp. Throws on failure. */
export function validateOfficerPhotoFile(file: File): void {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new ImagePrepError(
      "Please choose a JPG, PNG, or WebP photo (HEIC/iPhone photos aren't supported — export or share as JPG first).",
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImagePrepError("Photo must be smaller than 10MB.");
  }
}

export async function loadOfficerPhotoBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImagePrepError("This file doesn't look like a valid image.");
  }
}

/**
 * Crops the given square region (in the bitmap's own natural pixel space)
 * and encodes it as a fixed 512x512 WebP blob. The caller — PhotoCropDialog
 * — decides the square via user-controlled pan/zoom rather than a blind
 * auto-crop, since how tightly to crop depends on the photo (a face-filled
 * headshot and a badge/seal graphic with a decorative border need very
 * different treatment).
 */
export async function cropOfficerPhoto(
  bitmap: ImageBitmap,
  sourceX: number,
  sourceY: number,
  sourceSide: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new ImagePrepError("This browser can't process images.");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSide,
    sourceSide,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", OUTPUT_QUALITY),
  );
  if (!blob) {
    throw new ImagePrepError("Unable to process this image.");
  }
  return blob;
}
