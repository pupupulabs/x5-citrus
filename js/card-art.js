export const CARD_WIDTH = .91;
export const CARD_HEIGHT = 1.44;

export async function loadCardArtwork() {
  const reference = new Image();
  reference.src = new URL('../assets/apelsin-reference.png', import.meta.url);
  await reference.decode();

  // Project the tilted card from the reference photo onto an upright texture.
  // Sample slightly inside its edges to keep the phone and background off the card.
  const origin = { x: 114.5, y: 56.5 };
  const horizontal = { x: 170.5, y: 29.7 };
  const vertical = { x: -50.7, y: 266.4 };
  const artwork = document.createElement('canvas');
  artwork.width = 272;
  artwork.height = 428;
  const ctx = artwork.getContext('2d');
  const determinant = horizontal.x * vertical.y - horizontal.y * vertical.x;
  const a = artwork.width * vertical.y / determinant;
  const b = -artwork.height * horizontal.y / determinant;
  const c = -artwork.width * vertical.x / determinant;
  const d = artwork.height * horizontal.x / determinant;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(a, b, c, d, -(a * origin.x + c * origin.y), -(b * origin.x + d * origin.y));
  ctx.drawImage(reference, 0, 0);
  return artwork;
}
