import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
  query,
  where,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SubmittedRegistration, PaymentProofFile } from './types/registration';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const REGISTRATIONS_COLLECTION = 'registrations';
const DELETED_REGISTRATIONS_COLLECTION = 'deleted_registrations';

/**
 * Compresses large image dataUrls if needed so that the document always stays well under
 * the 1MB Firestore document limit and the 950,000-char blueprint rule constraint.
 */
export async function optimizePaymentProofForFirestore(
  proof: PaymentProofFile | null
): Promise<PaymentProofFile | null> {
  if (!proof) return null;
  const safeFileName = String(proof.fileName || 'bukti_transfer').trim().slice(0, 300) || 'bukti_transfer';
  const safeFileSize = Math.min(Math.max(0, Math.round(Number(proof.fileSize) || 0)), 10485760);
  const safeFileType = String(proof.fileType || 'image/jpeg').trim().slice(0, 120) || 'image/jpeg';
  const safeUploadedAt = String(proof.uploadedAt || '-').trim().slice(0, 64) || '-';
  const rawDataUrl = String(proof.dataUrl || '');

  if (!rawDataUrl || rawDataUrl.length <= 350000 || safeFileType.includes('svg')) {
    return {
      fileName: safeFileName,
      fileSize: safeFileSize,
      fileType: safeFileType,
      dataUrl: rawDataUrl.slice(0, 800000),
      uploadedAt: safeUploadedAt,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 960;
        let width = img.width || 800;
        let height = img.height || 600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            fileName: safeFileName,
            fileSize: safeFileSize,
            fileType: safeFileType,
            dataUrl: rawDataUrl.slice(0, 650000),
            uploadedAt: safeUploadedAt,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.68;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (compressedDataUrl.length > 650000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.48);
        }
        resolve({
          fileName: safeFileName,
          fileSize: Math.min(Math.max(0, Math.round(compressedDataUrl.length * 0.75)), 10485760),
          fileType: 'image/jpeg',
          dataUrl: compressedDataUrl.slice(0, 650000),
          uploadedAt: safeUploadedAt,
        });
      } catch {
        resolve({
          fileName: safeFileName,
          fileSize: safeFileSize,
          fileType: safeFileType,
          dataUrl: rawDataUrl.slice(0, 650000),
          uploadedAt: safeUploadedAt,
        });
      }
    };
    img.onerror = () => {
      resolve({
        fileName: safeFileName,
        fileSize: safeFileSize,
        fileType: safeFileType,
        dataUrl: rawDataUrl.slice(0, 650000),
        uploadedAt: safeUploadedAt,
      });
    };
    img.src = rawDataUrl;
  });
}

function normalizeArray8(arr: string[] | undefined, maxLen: number): string[] {
  const base = Array.isArray(arr) ? arr.slice(0, 8) : [];
  while (base.length < 8) {
    base.push('');
  }
  return base.map((item) => String(item ?? '').trim().slice(0, maxLen));
}

function safeNonEmptyString(val: unknown, fallback: string, maxLen: number): string {
  const trimmed = String(val ?? '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function saveRegistrationToFirestore(reg: SubmittedRegistration): Promise<void> {
  const rawId = String(reg.id || `reg-${Date.now()}`);
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || `reg-${Date.now()}`;
  const path = `${REGISTRATIONS_COLLECTION}/${safeId}`;
  const optimizedProof = await optimizePaymentProofForFirestore(reg.buktiPembayaran);

  const rawJumlahRegu = Number(reg.jumlahRegu);
  const safeJumlahRegu = Number.isFinite(rawJumlahRegu)
    ? Math.min(Math.max(1, Math.round(rawJumlahRegu)), 10)
    : 2;

  const rawTotalBiaya = Number(reg.totalBiaya);
  const safeTotalBiaya = Number.isFinite(rawTotalBiaya)
    ? Math.min(Math.max(0, Math.round(rawTotalBiaya)), 100000000)
    : 2600000;

  const buildPayload = (proofValue: PaymentProofFile | null) => ({
    id: safeId,
    nomorRegistrasi: safeNonEmptyString(reg.nomorRegistrasi, 'PP-MK-2026-0000', 64),
    tanggalDaftar: safeNonEmptyString(reg.tanggalDaftar, '-', 100),
    namaSekolah: safeNonEmptyString(reg.namaSekolah, 'Sekolah Peserta', 200),
    namaKepalaSekolah: safeNonEmptyString(reg.namaKepalaSekolah, '-', 200),
    nipKepalaSekolah: safeNonEmptyString(reg.nipKepalaSekolah, '-', 64),
    namaPembinaPutra: safeNonEmptyString(reg.namaPembinaPutra, '-', 200),
    nipPembinaPutra: safeNonEmptyString(reg.nipPembinaPutra, '-', 64),
    namaPembinaPutra2: String(reg.namaPembinaPutra2 ?? '').trim().slice(0, 200),
    nipPembinaPutra2: String(reg.nipPembinaPutra2 ?? '').trim().slice(0, 64),
    namaPembinaPutri: safeNonEmptyString(reg.namaPembinaPutri, '-', 200),
    nipPembinaPutri: safeNonEmptyString(reg.nipPembinaPutri, '-', 64),
    namaPembinaPutri2: String(reg.namaPembinaPutri2 ?? '').trim().slice(0, 200),
    nipPembinaPutri2: String(reg.nipPembinaPutri2 ?? '').trim().slice(0, 64),
    namaReguPutra: String(reg.namaReguPutra ?? '').trim().slice(0, 120),
    namaReguPutri: String(reg.namaReguPutri ?? '').trim().slice(0, 120),
    pesertaPutra: normalizeArray8(reg.pesertaPutra, 160),
    tempatLahirPutra: normalizeArray8(reg.tempatLahirPutra, 120),
    tanggalLahirPutra: normalizeArray8(reg.tanggalLahirPutra, 32),
    pesertaPutri: normalizeArray8(reg.pesertaPutri, 160),
    tempatLahirPutri: normalizeArray8(reg.tempatLahirPutri, 120),
    tanggalLahirPutri: normalizeArray8(reg.tanggalLahirPutri, 32),
    jumlahRegu: safeJumlahRegu,
    totalBiaya: safeTotalBiaya,
    statusVerifikasi:
      reg.statusVerifikasi === 'Terverifikasi' ? 'Terverifikasi' : 'Menunggu Verifikasi',
    pernyataanBenar: true,
    buktiPembayaran: proofValue,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, REGISTRATIONS_COLLECTION, safeId), buildPayload(optimizedProof));
  } catch (firstError) {
    // If the proof image is still too large or malformed, retry with lightweight proof metadata
    try {
      const compactProof: PaymentProofFile | null = optimizedProof
        ? {
            fileName: optimizedProof.fileName,
            fileSize: optimizedProof.fileSize,
            fileType: optimizedProof.fileType,
            dataUrl: optimizedProof.dataUrl.slice(0, 250000),
            uploadedAt: optimizedProof.uploadedAt,
          }
        : null;
      await setDoc(doc(db, REGISTRATIONS_COLLECTION, safeId), buildPayload(compactProof));
    } catch (error) {
      handleFirestoreError(error ?? firstError, OperationType.CREATE, path);
    }
  }
}

export async function updateRegistrationInFirestore(reg: SubmittedRegistration): Promise<void> {
  const rawId = String(reg.id || '');
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `${REGISTRATIONS_COLLECTION}/${safeId}`;
  const optimizedProof = await optimizePaymentProofForFirestore(reg.buktiPembayaran);

  const rawJumlahRegu = Number(reg.jumlahRegu);
  const safeJumlahRegu = Number.isFinite(rawJumlahRegu)
    ? Math.min(Math.max(1, Math.round(rawJumlahRegu)), 10)
    : 2;

  const rawTotalBiaya = Number(reg.totalBiaya);
  const safeTotalBiaya = Number.isFinite(rawTotalBiaya)
    ? Math.min(Math.max(0, Math.round(rawTotalBiaya)), 100000000)
    : safeJumlahRegu * 1300000;

  const payload: Record<string, any> = {
    nomorRegistrasi: safeNonEmptyString(reg.nomorRegistrasi, 'PP-MK-2026-0000', 64),
    tanggalDaftar: safeNonEmptyString(reg.tanggalDaftar, '-', 100),
    namaSekolah: safeNonEmptyString(reg.namaSekolah, 'Sekolah Peserta', 200),
    namaKepalaSekolah: safeNonEmptyString(reg.namaKepalaSekolah, '-', 200),
    nipKepalaSekolah: safeNonEmptyString(reg.nipKepalaSekolah, '-', 64),
    namaPembinaPutra: safeNonEmptyString(reg.namaPembinaPutra, '-', 200),
    nipPembinaPutra: safeNonEmptyString(reg.nipPembinaPutra, '-', 64),
    namaPembinaPutra2: String(reg.namaPembinaPutra2 ?? '').trim().slice(0, 200),
    nipPembinaPutra2: String(reg.nipPembinaPutra2 ?? '').trim().slice(0, 64),
    namaPembinaPutri: safeNonEmptyString(reg.namaPembinaPutri, '-', 200),
    nipPembinaPutri: safeNonEmptyString(reg.nipPembinaPutri, '-', 64),
    namaPembinaPutri2: String(reg.namaPembinaPutri2 ?? '').trim().slice(0, 200),
    nipPembinaPutri2: String(reg.nipPembinaPutri2 ?? '').trim().slice(0, 64),
    namaReguPutra: String(reg.namaReguPutra ?? '').trim().slice(0, 120),
    namaReguPutri: String(reg.namaReguPutri ?? '').trim().slice(0, 120),
    pesertaPutra: normalizeArray8(reg.pesertaPutra, 160),
    tempatLahirPutra: normalizeArray8(reg.tempatLahirPutra, 120),
    tanggalLahirPutra: normalizeArray8(reg.tanggalLahirPutra, 32),
    pesertaPutri: normalizeArray8(reg.pesertaPutri, 160),
    tempatLahirPutri: normalizeArray8(reg.tempatLahirPutri, 120),
    tanggalLahirPutri: normalizeArray8(reg.tanggalLahirPutri, 32),
    jumlahRegu: safeJumlahRegu,
    totalBiaya: safeTotalBiaya,
    statusVerifikasi:
      reg.statusVerifikasi === 'Terverifikasi' ? 'Terverifikasi' : 'Menunggu Verifikasi',
    pernyataanBenar: true,
    buktiPembayaran: optimizedProof,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, REGISTRATIONS_COLLECTION, safeId), payload);
  } catch (error) {
    try {
      await saveRegistrationToFirestore(reg);
    } catch (saveError) {
      handleFirestoreError(saveError ?? error, OperationType.UPDATE, path);
    }
  }
}

export async function updateRegistrationVerificationInFirestore(
  id: string,
  newStatus: 'Menunggu Verifikasi' | 'Terverifikasi'
): Promise<void> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `${REGISTRATIONS_COLLECTION}/${safeId}`;
  try {
    await updateDoc(doc(db, REGISTRATIONS_COLLECTION, safeId), {
      statusVerifikasi: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRegistrationFromFirestore(id: string): Promise<void> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `${REGISTRATIONS_COLLECTION}/${safeId}`;
  try {
    await deleteDoc(doc(db, REGISTRATIONS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function moveRegistrationToTrashInFirestore(reg: SubmittedRegistration): Promise<void> {
  const rawId = String(reg.id || `reg-${Date.now()}`);
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || `reg-${Date.now()}`;
  const trashPath = `${DELETED_REGISTRATIONS_COLLECTION}/${safeId}`;
  const optimizedProof = await optimizePaymentProofForFirestore(reg.buktiPembayaran);

  const rawJumlahRegu = Number(reg.jumlahRegu);
  const safeJumlahRegu = Number.isFinite(rawJumlahRegu)
    ? Math.min(Math.max(1, Math.round(rawJumlahRegu)), 10)
    : 2;

  const rawTotalBiaya = Number(reg.totalBiaya);
  const safeTotalBiaya = Number.isFinite(rawTotalBiaya)
    ? Math.min(Math.max(0, Math.round(rawTotalBiaya)), 100000000)
    : 2600000;

  const formattedDeletedAt = safeNonEmptyString(
    reg.tanggalDihapus,
    new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    100
  );

  const buildDeletedPayload = (proofValue: PaymentProofFile | null) => ({
    id: safeId,
    nomorRegistrasi: safeNonEmptyString(reg.nomorRegistrasi, 'PP-MK-2026-0000', 64),
    tanggalDaftar: safeNonEmptyString(reg.tanggalDaftar, '-', 100),
    tanggalDihapus: formattedDeletedAt,
    namaSekolah: safeNonEmptyString(reg.namaSekolah, 'Sekolah Peserta', 200),
    namaKepalaSekolah: safeNonEmptyString(reg.namaKepalaSekolah, '-', 200),
    nipKepalaSekolah: safeNonEmptyString(reg.nipKepalaSekolah, '-', 64),
    namaPembinaPutra: safeNonEmptyString(reg.namaPembinaPutra, '-', 200),
    nipPembinaPutra: safeNonEmptyString(reg.nipPembinaPutra, '-', 64),
    namaPembinaPutra2: String(reg.namaPembinaPutra2 ?? '').trim().slice(0, 200),
    nipPembinaPutra2: String(reg.nipPembinaPutra2 ?? '').trim().slice(0, 64),
    namaPembinaPutri: safeNonEmptyString(reg.namaPembinaPutri, '-', 200),
    nipPembinaPutri: safeNonEmptyString(reg.nipPembinaPutri, '-', 64),
    namaPembinaPutri2: String(reg.namaPembinaPutri2 ?? '').trim().slice(0, 200),
    nipPembinaPutri2: String(reg.nipPembinaPutri2 ?? '').trim().slice(0, 64),
    namaReguPutra: String(reg.namaReguPutra ?? '').trim().slice(0, 120),
    namaReguPutri: String(reg.namaReguPutri ?? '').trim().slice(0, 120),
    pesertaPutra: normalizeArray8(reg.pesertaPutra, 160),
    tempatLahirPutra: normalizeArray8(reg.tempatLahirPutra, 120),
    tanggalLahirPutra: normalizeArray8(reg.tanggalLahirPutra, 32),
    pesertaPutri: normalizeArray8(reg.pesertaPutri, 160),
    tempatLahirPutri: normalizeArray8(reg.tempatLahirPutri, 120),
    tanggalLahirPutri: normalizeArray8(reg.tanggalLahirPutri, 32),
    jumlahRegu: safeJumlahRegu,
    totalBiaya: safeTotalBiaya,
    statusVerifikasi:
      reg.statusVerifikasi === 'Terverifikasi' ? 'Terverifikasi' : 'Menunggu Verifikasi',
    pernyataanBenar: true,
    buktiPembayaran: proofValue,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, DELETED_REGISTRATIONS_COLLECTION, safeId), buildDeletedPayload(optimizedProof));
  } catch (firstError) {
    try {
      const compactProof: PaymentProofFile | null = optimizedProof
        ? {
            fileName: optimizedProof.fileName,
            fileSize: optimizedProof.fileSize,
            fileType: optimizedProof.fileType,
            dataUrl: optimizedProof.dataUrl.slice(0, 250000),
            uploadedAt: optimizedProof.uploadedAt,
          }
        : null;
      await setDoc(doc(db, DELETED_REGISTRATIONS_COLLECTION, safeId), buildDeletedPayload(compactProof));
    } catch (error) {
      handleFirestoreError(error ?? firstError, OperationType.CREATE, trashPath);
    }
  }

  await deleteRegistrationFromFirestore(safeId);
}

export async function restoreRegistrationFromTrashInFirestore(reg: SubmittedRegistration): Promise<void> {
  const safeId = String(reg.id || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  await saveRegistrationToFirestore(reg);
  await permanentlyDeleteFromTrashInFirestore(safeId);
}

export async function permanentlyDeleteFromTrashInFirestore(id: string): Promise<void> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `${DELETED_REGISTRATIONS_COLLECTION}/${safeId}`;
  try {
    await deleteDoc(doc(db, DELETED_REGISTRATIONS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function mapDocToRegistration(docId: string, d: Record<string, any>): SubmittedRegistration {
  return {
    id: d.id || docId,
    nomorRegistrasi: d.nomorRegistrasi || '',
    tanggalDaftar: d.tanggalDaftar || '',
    tanggalDihapus: d.tanggalDihapus || undefined,
    namaSekolah: d.namaSekolah || '',
    namaKepalaSekolah: d.namaKepalaSekolah || '',
    nipKepalaSekolah: d.nipKepalaSekolah || '',
    namaPembinaPutra: d.namaPembinaPutra || '',
    nipPembinaPutra: d.nipPembinaPutra || '',
    namaPembinaPutra2: d.namaPembinaPutra2 || '',
    nipPembinaPutra2: d.nipPembinaPutra2 || '',
    namaPembinaPutri: d.namaPembinaPutri || '',
    nipPembinaPutri: d.nipPembinaPutri || '',
    namaPembinaPutri2: d.namaPembinaPutri2 || '',
    nipPembinaPutri2: d.nipPembinaPutri2 || '',
    namaReguPutra: d.namaReguPutra || '',
    namaReguPutri: d.namaReguPutri || '',
    pesertaPutra: Array.isArray(d.pesertaPutra) ? d.pesertaPutra : Array(8).fill(''),
    tempatLahirPutra: Array.isArray(d.tempatLahirPutra) ? d.tempatLahirPutra : Array(8).fill(''),
    tanggalLahirPutra: Array.isArray(d.tanggalLahirPutra) ? d.tanggalLahirPutra : Array(8).fill(''),
    pesertaPutri: Array.isArray(d.pesertaPutri) ? d.pesertaPutri : Array(8).fill(''),
    tempatLahirPutri: Array.isArray(d.tempatLahirPutri) ? d.tempatLahirPutri : Array(8).fill(''),
    tanggalLahirPutri: Array.isArray(d.tanggalLahirPutri) ? d.tanggalLahirPutri : Array(8).fill(''),
    jumlahRegu: typeof d.jumlahRegu === 'number' ? d.jumlahRegu : 2,
    totalBiaya: typeof d.totalBiaya === 'number' ? d.totalBiaya : 2600000,
    statusVerifikasi:
      d.statusVerifikasi === 'Terverifikasi' ? 'Terverifikasi' : 'Menunggu Verifikasi',
    pernyataanBenar: Boolean(d.pernyataanBenar),
    buktiPembayaran: d.buktiPembayaran || null,
  };
}

export function subscribeToAllRegistrations(
  onData: (registrations: SubmittedRegistration[]) => void
): () => void {
  const q = query(
    collection(db, REGISTRATIONS_COLLECTION),
    where('pernyataanBenar', '==', true),
    limit(500)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aTime =
          typeof aData.createdAt?.toMillis === 'function' ? aData.createdAt.toMillis() : Date.now();
        const bTime =
          typeof bData.createdAt?.toMillis === 'function' ? bData.createdAt.toMillis() : Date.now();
        return bTime - aTime;
      });
      const items: SubmittedRegistration[] = sortedDocs.map((docSnap) =>
        mapDocToRegistration(docSnap.id, docSnap.data())
      );
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REGISTRATIONS_COLLECTION);
    }
  );
}

export function subscribeToDeletedRegistrations(
  onData: (deletedRegistrations: SubmittedRegistration[]) => void
): () => void {
  const q = query(
    collection(db, DELETED_REGISTRATIONS_COLLECTION),
    where('pernyataanBenar', '==', true),
    limit(500)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aTime =
          typeof aData.updatedAt?.toMillis === 'function' ? aData.updatedAt.toMillis() : Date.now();
        const bTime =
          typeof bData.updatedAt?.toMillis === 'function' ? bData.updatedAt.toMillis() : Date.now();
        return bTime - aTime;
      });
      const items: SubmittedRegistration[] = sortedDocs.map((docSnap) =>
        mapDocToRegistration(docSnap.id, docSnap.data())
      );
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, DELETED_REGISTRATIONS_COLLECTION);
    }
  );
}
