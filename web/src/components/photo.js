import { api } from '../api.js';

/** Shrink a picked photo to a square-ish 320px JPEG in the browser, then upload it. */
export async function uploadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Pick a photo');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that photo'));
      i.src = url;
    });
    // Crop to a centred square, then scale down.
    const side = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 320, 320);
    return api.put('/me/avatar', { image: c.toDataURL('image/jpeg', 0.85) });
  } finally {
    URL.revokeObjectURL(url);
  }
}
