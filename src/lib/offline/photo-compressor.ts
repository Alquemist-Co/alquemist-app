/**
 * Client-side photo compression using Canvas API.
 * Targets max 1200px, JPEG 80%. Falls back to 800px/60% if >5MB.
 */

const MAX_SIZE = 1200;
const QUALITY = 0.8;
const FALLBACK_MAX_SIZE = 800;
const FALLBACK_QUALITY = 0.6;
const SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB

export type CompressedPhoto = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
};

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // First pass: standard compression
  let result = await compress(bitmap, width, height, MAX_SIZE, QUALITY);

  // If still too large, fallback
  if (result.blob.size > SIZE_THRESHOLD) {
    result = await compress(bitmap, width, height, FALLBACK_MAX_SIZE, FALLBACK_QUALITY);
  }

  bitmap.close();
  return result;
}

async function compress(
  bitmap: ImageBitmap,
  origWidth: number,
  origHeight: number,
  maxSize: number,
  quality: number,
): Promise<CompressedPhoto> {
  // Calculate scaled dimensions
  let width = origWidth;
  let height = origHeight;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height / width) * maxSize);
      width = maxSize;
    } else {
      width = Math.round((width / height) * maxSize);
      height = maxSize;
    }
  }

  // Use OffscreenCanvas if available, else regular canvas
  let blob: Blob;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        "image/jpeg",
        quality,
      );
    });
  }

  return { blob, width, height, mimeType: "image/jpeg" };
}
