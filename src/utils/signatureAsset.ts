/**
 * Signature asset utility for Bendahara Susilawati, S.Pd.
 * Menyediakan manajemen penyimpanan tanda tangan kustom via localStorage,
 * tanpa ketergantungan pada file eksternal yang telah dihapus.
 */

const STORAGE_KEY = 'kwitansi_custom_signature';

/**
 * Returns default signature URL/DataURL.
 * Default kosong agar area tanda tangan bersih untuk tanda tangan basah,
 * kecuali jika pengguna mengunggah gambar tanda tangan kustom.
 */
export function getDefaultSignature(): string {
  return '';
}

/**
 * Checks whether a custom signature is stored in localStorage.
 */
export function hasCustomSignature(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return Boolean(val && val.trim().length > 0);
  } catch {
    return false;
  }
}

/**
 * Returns active signature URL.
 * Mengembalikan tanda tangan kustom jika ada di localStorage, atau string kosong.
 */
export function getActiveSignature(): string {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // fallback
  }
  return '';
}

/**
 * Saves a user-uploaded custom signature to localStorage.
 */
export function saveCustomSignature(dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } catch (err) {
    console.warn('Gagal menyimpan tanda tangan ke localStorage:', err);
  }
}

/**
 * Resets/removes any custom signature from localStorage.
 */
export function resetCustomSignature(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus tanda tangan dari localStorage:', err);
  }
}

export const TTD_PENGGALANG_IMAGE_PATH = '';
export const TTD_PENGGALANG_FALLBACK_BASE64 = '';
