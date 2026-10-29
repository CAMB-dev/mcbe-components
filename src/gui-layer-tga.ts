const tgaTypes = new Set(['image/tga', 'image/x-tga', 'image/targa', 'image/x-targa']);
const genericTypes = new Set(['', 'application/octet-stream', 'binary/octet-stream']);
const signature = (bytes: Uint8Array, offset: number, values: readonly number[]) => values.every((value, index) => bytes[offset + index] === value);

/** Private content discriminator only; pixel/RLE decoding stays in decodeTga. */
export function inspectGuiLayerTga(header: Uint8Array, footer: Uint8Array, mime: string, encodedBytes: number): { width: number; height: number } | undefined {
  // These existing browser formats retain their original Blob/decoder options,
  // including when a server or data URL supplies a misleading TGA MIME.
  if (signature(header, 0, [137, 80, 78, 71, 13, 10, 26, 10]) || signature(header, 0, [255, 216, 255])
    || signature(header, 0, [82, 73, 70, 70]) && signature(header, 8, [87, 69, 66, 80])) return undefined;
  const type = mime.split(';', 1)[0]!.trim().toLowerCase();
  const tagged = tgaTypes.has(type);
  const signed = footer.length >= 18 && signature(footer, footer.length - 18, [84, 82, 85, 69, 86, 73, 83, 73, 79, 78, 45, 88, 70, 73, 76, 69, 46, 0]);
  const depth = header[16], descriptor = header[17];
  const width = (header[12] ?? 0) | (header[13] ?? 0) << 8, height = (header[14] ?? 0) | (header[15] ?? 0) << 8;
  const supported = header.length >= 18 && header[1] === 0 && (header[2] === 2 || header[2] === 10)
    && width > 0 && height > 0 && (depth === 24 || depth === 32) && descriptor !== undefined && (descriptor & 192) === 0
    && (depth === 24 ? (descriptor & 15) === 0 : (descriptor & 15) === 0 || (descriptor & 15) === 8)
    && 18 + header[0]! <= encodedBytes;
  if (signed || tagged) {
    if (!supported) throw new Error('Invalid or unsupported GUI TGA header.');
    return { width, height };
  }
  return supported && genericTypes.has(type) ? { width, height } : undefined;
}
