/**
 * Downscales and recompresses an image before upload, entirely client-side
 * via Canvas -- no server-side image library exists (sharp was a one-off
 * scratchpad script for the favicon, never a project dependency), so this
 * is what "optimized" actually means for asset uploads. Non-image files
 * pass through untouched.
 */
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function optimizeImage(
  file: File,
  options?: { maxDimension?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const maxDimension = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? JPEG_QUALITY;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob || blob.size >= file.size) return file; // optimization didn't help -- keep the original

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
