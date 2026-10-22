import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  UserCheck,
  Users,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  MessageCircle,
  Trash2,
  Sparkles,
  FileText,
  Image as ImageIcon,
  ClipboardPaste,
  Eye,
  History,
  ChevronRight,
  ShieldCheck,
  IdCard,
  Receipt,
} from 'lucide-react';
import {
  RegistrationFormData,
  SubmittedRegistration,
  INITIAL_FORM_DATA,
  INFO_PEMBAYARAN,
  BIAYA_PER_REGU,
  formatRupiah,
  buildWhatsAppMessage,
  checkParticipantAgeOnOct30,
} from './types/registration';
import { TunasKelapaLogo, WosmLogo } from './components/PramukaEmblems';
import { SubmissionSuccessView } from './components/SubmissionSuccessView';
import { AdminDashboardView } from './components/AdminDashboardView';
import {
  subscribeToAllRegistrations,
  subscribeToDeletedRegistrations,
  saveRegistrationToFirestore,
  updateRegistrationInFirestore,
  updateRegistrationVerificationInFirestore,
  moveRegistrationToTrashInFirestore,
  restoreRegistrationFromTrashInFirestore,
  permanentlyDeleteFromTrashInFirestore,
} from './firebase';

const STORAGE_KEY_SUBMISSIONS = 'pramuka_muara_kaman_submissions_v2';
const STORAGE_KEY_DELETED_SUBMISSIONS = 'pramuka_muara_kaman_deleted_submissions_v1';
const STORAGE_KEY_SYNCED_IDS = 'pramuka_muara_kaman_firestore_synced_v2';

function createEmptyForm(): RegistrationFormData {
  return {
    ...INITIAL_FORM_DATA,
    pesertaPutra: Array(8).fill(''),
    tempatLahirPutra: Array(8).fill(''),
    tanggalLahirPutra: Array(8).fill(''),
    pesertaPutri: Array(8).fill(''),
    tempatLahirPutri: Array(8).fill(''),
    tanggalLahirPutri: Array(8).fill(''),
  };
}

export default function App() {
  // Always start with a completely blank form on every link open / account
  const [formData, setFormData] = useState<RegistrationFormData>(() => createEmptyForm());

  const [submissions, setSubmissions] = useState<SubmittedRegistration[]>([]);
  const [deletedSubmissions, setDeletedSubmissions] = useState<SubmittedRegistration[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED_SUBMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && item.id);
        }
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const pendingSubmissionIdsRef = useRef<Set<string>>(new Set());
  const deletedSubmissionIdsRef = useRef<Set<string>>(new Set());
  const permanentlyDeletedIdsRef = useRef<Set<string>>(new Set());

  const [activeView, setActiveView] = useState<'form' | 'success' | 'history' | 'admin'>('form');
  const [currentReceipt, setCurrentReceipt] = useState<SubmittedRegistration | null>(null);
  const [receiptSubTab, setReceiptSubTab] = useState<'receipt' | 'cards' | 'kwitansi'>('receipt');

  // Copy states
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedWaNumber, setCopiedWaNumber] = useState(false);

  // Validation error message
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Quick paste drawers for 8 participants
  const [showPastePutra, setShowPastePutra] = useState(false);
  const [pasteTextPutra, setPasteTextPutra] = useState('');
  const [showPastePutri, setShowPastePutri] = useState(false);
  const [pasteTextPutri, setPasteTextPutri] = useState('');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  // Clear any legacy saved draft & subscribe to centralized Firebase Firestore registrations
  useEffect(() => {
    try {
      localStorage.removeItem('pramuka_muara_kaman_draft_v1');
      localStorage.removeItem('pramuka_muara_kaman_draft_v2');
    } catch {
      // Ignore storage errors
    }

    // Real-time listener to Firestore so every school registered or deleted from any account/device syncs everywhere
    const unsubscribe = subscribeToAllRegistrations((cloudRegistrations) => {
      const validCloud = cloudRegistrations.filter(
        (r) => r && r.id && r.id !== 'reg-1791548760281' && !deletedSubmissionIdsRef.current.has(r.id)
      );
      const cloudIds = new Set(validCloud.map((r) => r.id));

      // Clear pending flag for any registration that has now arrived in Firestore
      cloudIds.forEach((id) => {
        pendingSubmissionIdsRef.current.delete(id);
      });

      // One-time migration for any legacy local-only registration that was never uploaded to Firestore
      try {
        const syncedRaw = localStorage.getItem(STORAGE_KEY_SYNCED_IDS);
        const syncedSet = new Set<string>(syncedRaw ? JSON.parse(syncedRaw) : []);
        const localSaved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        const localList: SubmittedRegistration[] = localSaved ? JSON.parse(localSaved) : [];

        const filteredLocal = localList.filter(
          (item) =>
            item &&
            item.id &&
            item.id !== 'reg-1791548760281' &&
            !deletedSubmissionIdsRef.current.has(item.id)
        );

        filteredLocal.forEach((localItem) => {
          if (!cloudIds.has(localItem.id) && !syncedSet.has(localItem.id)) {
            syncedSet.add(localItem.id);
            pendingSubmissionIdsRef.current.add(localItem.id);
            saveRegistrationToFirestore(localItem)
              .catch(() => {})
              .finally(() => {
                pendingSubmissionIdsRef.current.delete(localItem.id);
              });
          }
        });
        validCloud.forEach((c) => syncedSet.add(c.id));
        localStorage.setItem(STORAGE_KEY_SYNCED_IDS, JSON.stringify(Array.from(syncedSet)));
      } catch {
        // Ignore storage errors
      }

      // Authoritative state from Firestore (+ any in-flight newly submitted item on this device)
      setSubmissions((prev) => {
        const map = new Map<string, SubmittedRegistration>();
        validCloud.forEach((item) => map.set(item.id, item));
        prev.forEach((item) => {
          if (
            item &&
            item.id &&
            !map.has(item.id) &&
            pendingSubmissionIdsRef.current.has(item.id) &&
            !deletedSubmissionIdsRef.current.has(item.id)
          ) {
            map.set(item.id, item);
          }
        });
        const nextList = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(nextList));
        } catch {
          // Ignore quota errors
        }
        return nextList;
      });
    });

    const unsubscribeDeleted = subscribeToDeletedRegistrations((cloudDeleted) => {
      const validDeleted = cloudDeleted.filter(
        (r) =>
          r &&
          r.id &&
          r.id !== 'reg-1791548760281' &&
          !permanentlyDeletedIdsRef.current.has(r.id)
      );
      validDeleted.forEach((item) => {
        deletedSubmissionIdsRef.current.add(item.id);
      });
      setDeletedSubmissions(validDeleted);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_SUBMISSIONS, JSON.stringify(validDeleted));
      } catch {
        // Ignore quota errors
      }
    });

    return () => {
      unsubscribe();
      unsubscribeDeleted();
    };
  }, []);

  // Field handlers
  const handleInputChange = (
    field: keyof RegistrationFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleParticipantChange = (
    gender: 'putra' | 'putri',
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const key = gender === 'putra' ? 'pesertaPutra' : 'pesertaPutri';
      const updated = [...prev[key]];
      updated[index] = value;
      return {
        ...prev,
        [key]: updated,
      };
    });
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleTempatLahirChange = (
    gender: 'putra' | 'putri',
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const key = gender === 'putra' ? 'tempatLahirPutra' : 'tempatLahirPutri';
      const updated = [...prev[key]];
      updated[index] = value;
      return {
        ...prev,
        [key]: updated,
      };
    });
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleTanggalLahirChange = (
    gender: 'putra' | 'putri',
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const key = gender === 'putra' ? 'tanggalLahirPutra' : 'tanggalLahirPutri';
      const updated = [...prev[key]];
      updated[index] = value;
      return {
        ...prev,
        [key]: updated,
      };
    });
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleBulkPaste = (gender: 'putra' | 'putri') => {
    const raw = gender === 'putra' ? pasteTextPutra : pasteTextPutri;
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\d+[\.\)\-\s]+/, '').trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    setFormData((prev) => {
      const key = gender === 'putra' ? 'pesertaPutra' : 'pesertaPutri';
      const updated = [...prev[key]];
      for (let i = 0; i < 8; i++) {
        if (lines[i]) {
          updated[i] = lines[i];
        }
      }
      return {
        ...prev,
        [key]: updated,
      };
    });

    if (gender === 'putra') {
      setPasteTextPutra('');
      setShowPastePutra(false);
    } else {
      setPasteTextPutri('');
      setShowPastePutri(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = 6 * 1024 * 1024; // 6 MB
    if (file.size > maxSizeBytes) {
      setUploadError(
        'Ukuran file maksimal 6 MB. Silakan pilih foto atau tangkapan layar bukti transfer yang lebih kecil.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => ({
        ...prev,
        buktiPembayaran: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'image/jpeg',
          dataUrl: result,
          uploadedAt: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      }));
      if (validationErrors.length > 0) {
        setValidationErrors([]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = async (text: string, type: 'rekening' | 'nominal' | 'wa') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'rekening') {
        setCopiedRekening(true);
        setTimeout(() => setCopiedRekening(false), 2200);
      } else if (type === 'nominal') {
        setCopiedNominal(true);
        setTimeout(() => setCopiedNominal(false), 2200);
      } else {
        setCopiedWaNumber(true);
        setTimeout(() => setCopiedWaNumber(false), 2200);
      }
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleFillSampleData = () => {
    const sampleReceiptSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <rect width="600" height="360" rx="16" fill="#F0FDF4" stroke="#15803D" stroke-width="3"/>
      <rect x="24" y="24" width="552" height="64" rx="10" fill="#14532D"/>
      <text x="44" y="62" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">BANK KALTIMTARA — BUKTI TRANSFER</text>
      <text x="44" y="130" fill="#14532D" font-family="monospace" font-size="16">Rekening Tujuan : 0042830798 (SUSILAWATI)</text>
      <text x="44" y="168" fill="#14532D" font-family="monospace" font-size="16">Nominal Transfer : Rp2.600.000,00 (2 Regu)</text>
      <text x="44" y="206" fill="#14532D" font-family="monospace" font-size="16">Berita Transfer  : Pesta Penggalang SMPN 6 Muara Kaman</text>
      <text x="44" y="244" fill="#15803D" font-family="sans-serif" font-size="18" font-weight="bold">STATUS: BERHASIL / LUNAS</text>
      <text x="44" y="310" fill="#6B5744" font-family="sans-serif" font-size="13">Kwarran Gerakan Pramuka Kecamatan Muara Kaman</text>
    </svg>`;
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sampleReceiptSvg)}`;

    setFormData({
      namaSekolah: 'SMP Negeri 6 Muara Kaman',
      namaKepalaSekolah: 'Sukriansyah, S.Pd',
      nipKepalaSekolah: '197012102008011019',
      namaPembinaPutra: 'Dedi Irawan, S.Pd',
      nipPembinaPutra: '199202192025211043',
      namaPembinaPutra2: 'Suwandi, S.Pd',
      nipPembinaPutra2: '198606102022211010',
      namaPembinaPutri: 'Ani Fitriani, S.Pd',
      nipPembinaPutri: '198705062022212003',
      namaPembinaPutri2: 'Ubung Sartika, S.Pd',
      nipPembinaPutri2: '199511012024212010',
      namaReguPutra: 'Elang Hitam',
      namaReguPutri: 'Melati Putih',
      pesertaPutra: [
        'Ahmad Fauzan Ramadhan',
        'Bagas Adi Saputra',
        'Chandra Wijaya Kusuma',
        'Dimas Prayoga',
        'Eko Prasetyo Utomo',
        'Fajar Siddiq Al-Faruq',
        'Gilang Dirga Pratama',
        'Hendra Setiawan',
      ],
      tempatLahirPutra: [
        'Muara Kaman',
        'Muara Kaman',
        'Tenggarong',
        'Muara Kaman',
        'Sebulu',
        'Muara Kaman',
        'Kota Bangun',
        'Muara Kaman',
      ],
      tanggalLahirPutra: [
        '2012-03-14',
        '2012-07-21',
        '2011-11-05',
        '2013-01-19',
        '2012-05-08',
        '2013-04-12',
        '2012-09-25',
        '2013-06-30',
      ],
      pesertaPutri: [
        'Aisyah Putri Maharani',
        'Bunga Citra Lestari',
        'Citra Kirana Dewi',
        'Dinda Permata Sari',
        'Eka Rahmawati',
        'Fitriani Nur Azizah',
        'Gita Gutawa Ramadhani',
        'Hana Saraswati',
      ],
      tempatLahirPutri: [
        'Muara Kaman',
        'Tenggarong',
        'Muara Kaman',
        'Muara Kaman',
        'Sebulu',
        'Muara Kaman',
        'Kota Bangun',
        'Muara Kaman',
      ],
      tanggalLahirPutri: [
        '2012-02-18',
        '2012-08-09',
        '2013-01-27',
        '2011-12-15',
        '2012-06-04',
        '2013-03-22',
        '2012-10-11',
        '2013-05-16',
      ],
      jumlahRegu: 2,
      buktiPembayaran: {
        fileName: 'Bukti_Transfer_Bank_Kaltimtara_SMPN6_MuaraKaman.svg',
        fileSize: 184320,
        fileType: 'image/svg+xml',
        dataUrl: svgDataUrl,
        uploadedAt: '09:30',
      },
      pernyataanBenar: true,
    });
    setValidationErrors([]);
  };

  const handleResetForm = () => {
    setFormData(createEmptyForm());
    setValidationErrors([]);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleVerify = (id: string) => {
    const target = submissions.find((item) => item.id === id);
    const nextStatus: 'Menunggu Verifikasi' | 'Terverifikasi' =
      target?.statusVerifikasi === 'Terverifikasi' ? 'Menunggu Verifikasi' : 'Terverifikasi';

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              statusVerifikasi: nextStatus,
            }
          : item
      )
    );
    updateRegistrationVerificationInFirestore(id, nextStatus).catch(() => {});
    fetch(`/api/registrations/${encodeURIComponent(id)}/verify`, {
      method: 'PATCH',
    }).catch(() => {});
  };

  const handleDeleteSubmission = (id: string) => {
    const target = submissions.find((item) => item.id === id);
    const deletedTimestamp = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    deletedSubmissionIdsRef.current.add(id);
    pendingSubmissionIdsRef.current.delete(id);

    setSubmissions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });

    if (target) {
      const deletedItem: SubmittedRegistration = {
        ...target,
        tanggalDihapus: deletedTimestamp,
      };
      setDeletedSubmissions((prev) => {
        const nextDeleted = [deletedItem, ...prev.filter((item) => item.id !== id)];
        try {
          localStorage.setItem(STORAGE_KEY_DELETED_SUBMISSIONS, JSON.stringify(nextDeleted));
        } catch {
          // Ignore storage errors
        }
        return nextDeleted;
      });
      moveRegistrationToTrashInFirestore(deletedItem).catch(() => {});
    }

    fetch(`/api/registrations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const handleRestoreSubmission = (id: string) => {
    const target = deletedSubmissions.find((item) => item.id === id);
    if (!target) return;

    deletedSubmissionIdsRef.current.delete(id);
    pendingSubmissionIdsRef.current.add(id);

    const restoredItem: SubmittedRegistration = {
      ...target,
      tanggalDihapus: undefined,
    };

    setDeletedSubmissions((prev) => {
      const nextDeleted = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_SUBMISSIONS, JSON.stringify(nextDeleted));
      } catch {
        // Ignore storage errors
      }
      return nextDeleted;
    });

    setSubmissions((prev) => {
      const next = [restoredItem, ...prev.filter((item) => item.id !== id)];
      try {
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });

    restoreRegistrationFromTrashInFirestore(restoredItem)
      .catch(() => {})
      .finally(() => {
        pendingSubmissionIdsRef.current.delete(id);
      });

    fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restoredItem),
    }).catch(() => {});
  };

  const handlePermanentDeleteSubmission = (id: string) => {
    permanentlyDeletedIdsRef.current.add(id);
    deletedSubmissionIdsRef.current.add(id);
    setDeletedSubmissions((prev) => {
      const nextDeleted = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_SUBMISSIONS, JSON.stringify(nextDeleted));
      } catch {
        // Ignore storage errors
      }
      return nextDeleted;
    });
    permanentlyDeleteFromTrashInFirestore(id).catch(() => {});
  };

  const handleEmptyTrash = () => {
    const idsToDelete = deletedSubmissions.map((item) => item.id);
    idsToDelete.forEach((id) => {
      permanentlyDeletedIdsRef.current.add(id);
      deletedSubmissionIdsRef.current.add(id);
      permanentlyDeleteFromTrashInFirestore(id).catch(() => {});
    });
    setDeletedSubmissions([]);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_SUBMISSIONS, JSON.stringify([]));
    } catch {
      // Ignore storage errors
    }
  };

  const handleEditSubmission = async (updated: SubmittedRegistration) => {
    // 1. Optimistic update of local submissions state
    setSubmissions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );

    // 2. If current active receipt is this item, update it immediately
    if (currentReceipt?.id === updated.id) {
      setCurrentReceipt(updated);
    }

    // 3. Save to localStorage backup
    try {
      setSubmissions((latest) => {
        const nextList = latest.map((item) => (item.id === updated.id ? updated : item));
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(nextList));
        } catch {
          // Ignore storage errors
        }
        return nextList;
      });
    } catch {
      // Ignore
    }

    // 4. Persist to Firebase Firestore
    try {
      await updateRegistrationInFirestore(updated);
    } catch (err) {
      console.error('Error updating registration in Firestore:', err);
    }

    // 5. Update local backend store if available
    fetch(`/api/registrations/${encodeURIComponent(updated.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  // Check valid participants (name + tempat lahir + tanggal lahir valid <= 16 years on 30 Oct)
  const validPutraCount = formData.pesertaPutra.filter((n, idx) => {
    const ageCheck = checkParticipantAgeOnOct30(formData.tanggalLahirPutra[idx]);
    return (
      n.trim() !== '' &&
      formData.tempatLahirPutra[idx]?.trim() !== '' &&
      ageCheck.hasDate &&
      ageCheck.isValid
    );
  }).length;

  const validPutriCount = formData.pesertaPutri.filter((n, idx) => {
    const ageCheck = checkParticipantAgeOnOct30(formData.tanggalLahirPutri[idx]);
    return (
      n.trim() !== '' &&
      formData.tempatLahirPutri[idx]?.trim() !== '' &&
      ageCheck.hasDate &&
      ageCheck.isValid
    );
  }).length;

  // Detect any participant over 16 years old on 30 October
  const rejectedPutraList = formData.pesertaPutra
    .map((nama, idx) => {
      const check = checkParticipantAgeOnOct30(formData.tanggalLahirPutra[idx]);
      return check.isOver16
        ? `Peserta Putra ${idx + 1} (${nama.trim() || 'Tanpa Nama'}): ${check.statusText}`
        : null;
    })
    .filter((v): v is string => v !== null);

  const rejectedPutriList = formData.pesertaPutri
    .map((nama, idx) => {
      const check = checkParticipantAgeOnOct30(formData.tanggalLahirPutri[idx]);
      return check.isOver16
        ? `Peserta Putri ${idx + 1} (${nama.trim() || 'Tanpa Nama'}): ${check.statusText}`
        : null;
    })
    .filter((v): v is string => v !== null);

  const hasOverAgeParticipant = rejectedPutraList.length > 0 || rejectedPutriList.length > 0;

  // Completion status checks (11 school & leader fields + 8 Putra + 8 Putri + 1 Bukti Bayar = 28 fields)
  const isSchoolAndLeadersComplete =
    formData.namaSekolah.trim() !== '' &&
    formData.namaKepalaSekolah.trim() !== '' &&
    formData.nipKepalaSekolah.trim() !== '' &&
    formData.namaPembinaPutra.trim() !== '' &&
    formData.nipPembinaPutra.trim() !== '' &&
    formData.namaPembinaPutra2.trim() !== '' &&
    formData.nipPembinaPutra2.trim() !== '' &&
    formData.namaPembinaPutri.trim() !== '' &&
    formData.nipPembinaPutri.trim() !== '' &&
    formData.namaPembinaPutri2.trim() !== '' &&
    formData.nipPembinaPutri2.trim() !== '';

  const filledPutraCount = validPutraCount;
  const filledPutriCount = validPutriCount;
  const isPutraComplete = filledPutraCount === 8;
  const isPutriComplete = filledPutriCount === 8;
  const isPaymentComplete = formData.buktiPembayaran !== null;

  const totalFieldsCount = 11 + 8 + 8 + 1; // 28 core items
  const completedFieldsCount =
    [
      formData.namaSekolah,
      formData.namaKepalaSekolah,
      formData.nipKepalaSekolah,
      formData.namaPembinaPutra,
      formData.nipPembinaPutra,
      formData.namaPembinaPutra2,
      formData.nipPembinaPutra2,
      formData.namaPembinaPutri,
      formData.nipPembinaPutri,
      formData.namaPembinaPutri2,
      formData.nipPembinaPutri2,
    ].filter((v) => v.trim() !== '').length +
    filledPutraCount +
    filledPutriCount +
    (formData.buktiPembayaran ? 1 : 0);

  const completionPercentage = Math.round((completedFieldsCount / totalFieldsCount) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!formData.namaSekolah.trim()) errors.push('Nama Sekolah wajib diisi.');
    if (!formData.namaKepalaSekolah.trim()) errors.push('Nama Kepala Sekolah wajib diisi.');
    if (!formData.nipKepalaSekolah.trim())
      errors.push('NIP Kepala Sekolah wajib diisi (isi tanda "-" jika Non-ASN).');
    if (!formData.namaPembinaPutra.trim())
      errors.push('Nama Pembina Pendamping Putra 1 wajib diisi.');
    if (!formData.nipPembinaPutra.trim())
      errors.push('NIP Pembina Pendamping Putra 1 wajib diisi (isi tanda "-" jika Non-ASN).');
    if (!formData.namaPembinaPutra2.trim())
      errors.push('Nama Pembina Pendamping Putra 2 wajib diisi.');
    if (!formData.nipPembinaPutra2.trim())
      errors.push('NIP Pembina Pendamping Putra 2 wajib diisi (isi tanda "-" jika Non-ASN).');
    if (!formData.namaPembinaPutri.trim())
      errors.push('Nama Pembina Pendamping Putri 1 wajib diisi.');
    if (!formData.nipPembinaPutri.trim())
      errors.push('NIP Pembina Pendamping Putri 1 wajib diisi (isi tanda "-" jika Non-ASN).');
    if (!formData.namaPembinaPutri2.trim())
      errors.push('Nama Pembina Pendamping Putri 2 wajib diisi.');
    if (!formData.nipPembinaPutri2.trim())
      errors.push('NIP Pembina Pendamping Putri 2 wajib diisi (isi tanda "-" jika Non-ASN).');

    const emptyPutraIndices = formData.pesertaPutra
      .map((val, i) => (val.trim() === '' ? i + 1 : null))
      .filter((v): v is number => v !== null);
    if (emptyPutraIndices.length > 0) {
      errors.push(
        `Nama Peserta Putra belum lengkap (Nomor ${emptyPutraIndices.join(', ')} masih kosong). Wajib 8 peserta.`
      );
    }

    const emptyTtlPutraIndices = formData.pesertaPutra
      .map((_, i) =>
        !formData.tempatLahirPutra[i]?.trim() || !formData.tanggalLahirPutra[i]?.trim()
          ? i + 1
          : null
      )
      .filter((v): v is number => v !== null);
    if (emptyTtlPutraIndices.length > 0) {
      errors.push(
        `Tempat & Tanggal Lahir Peserta Putra belum lengkap (Nomor ${emptyTtlPutraIndices.join(', ')} masih kosong).`
      );
    }

    formData.tanggalLahirPutra.forEach((tgl, i) => {
      if (tgl?.trim()) {
        const check = checkParticipantAgeOnOct30(tgl);
        if (check.isOver16) {
          errors.push(
            `PENDAFTARAN DITOLAK — Peserta Putra ${i + 1} (${
              formData.pesertaPutra[i]?.trim() || 'Tanpa Nama'
            }): Usia melewati batas maksimal 16 tahun pada 30 Oktober (${check.years} thn ${
              check.months
            } bln ${check.days} hr).`
          );
        } else if (!check.isValid) {
          errors.push(`Tanggal lahir Peserta Putra ${i + 1} tidak valid.`);
        }
      }
    });

    const emptyPutriIndices = formData.pesertaPutri
      .map((val, i) => (val.trim() === '' ? i + 1 : null))
      .filter((v): v is number => v !== null);
    if (emptyPutriIndices.length > 0) {
      errors.push(
        `Nama Peserta Putri belum lengkap (Nomor ${emptyPutriIndices.join(', ')} masih kosong). Wajib 8 peserta.`
      );
    }

    const emptyTtlPutriIndices = formData.pesertaPutri
      .map((_, i) =>
        !formData.tempatLahirPutri[i]?.trim() || !formData.tanggalLahirPutri[i]?.trim()
          ? i + 1
          : null
      )
      .filter((v): v is number => v !== null);
    if (emptyTtlPutriIndices.length > 0) {
      errors.push(
        `Tempat & Tanggal Lahir Peserta Putri belum lengkap (Nomor ${emptyTtlPutriIndices.join(', ')} masih kosong).`
      );
    }

    formData.tanggalLahirPutri.forEach((tgl, i) => {
      if (tgl?.trim()) {
        const check = checkParticipantAgeOnOct30(tgl);
        if (check.isOver16) {
          errors.push(
            `PENDAFTARAN DITOLAK — Peserta Putri ${i + 1} (${
              formData.pesertaPutri[i]?.trim() || 'Tanpa Nama'
            }): Usia melewati batas maksimal 16 tahun pada 30 Oktober (${check.years} thn ${
              check.months
            } bln ${check.days} hr).`
          );
        } else if (!check.isValid) {
          errors.push(`Tanggal lahir Peserta Putri ${i + 1} tidak valid.`);
        }
      }
    });

    if (!formData.buktiPembayaran) {
      errors.push(
        'Bukti Pembayaran Bank Kaltimtara (0042830798 a.n. Susilawati) wajib diunggah.'
      );
    }

    if (!formData.pernyataanBenar) {
      errors.push(
        'Silakan centang pernyataan bahwa seluruh data yang diisi telah benar sebelum mengirim formulir.'
      );
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newSubmission: SubmittedRegistration = {
      ...formData,
      id: `reg-${Date.now()}`,
      nomorRegistrasi: `PP-MK-2026-${randomCode}`,
      tanggalDaftar: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      totalBiaya: formData.jumlahRegu * BIAYA_PER_REGU,
      statusVerifikasi: 'Menunggu Verifikasi',
    };

    pendingSubmissionIdsRef.current.add(newSubmission.id);
    try {
      const syncedRaw = localStorage.getItem(STORAGE_KEY_SYNCED_IDS);
      const syncedSet = new Set<string>(syncedRaw ? JSON.parse(syncedRaw) : []);
      syncedSet.add(newSubmission.id);
      localStorage.setItem(STORAGE_KEY_SYNCED_IDS, JSON.stringify(Array.from(syncedSet)));
    } catch {
      // Ignore storage error
    }

    setSubmissions((prev) => {
      const next = [newSubmission, ...prev.filter((i) => i.id !== newSubmission.id)];
      try {
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
    saveRegistrationToFirestore(newSubmission)
      .catch(() => {})
      .finally(() => {
        pendingSubmissionIdsRef.current.delete(newSubmission.id);
      });
    fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSubmission),
    }).catch(() => {});

    // Automatically clear form inputs so the next school/account gets a clean empty form
    setFormData(createEmptyForm());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setCurrentReceipt(newSubmission);
    setReceiptSubTab('receipt');
    setActiveView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalNominalTransfer = formData.jumlahRegu * BIAYA_PER_REGU;
  const directWaUrl = `https://wa.me/${
    INFO_PEMBAYARAN.waPanitiaInternational
  }?text=${encodeURIComponent(
    formData.namaSekolah.trim()
      ? buildWhatsAppMessage(formData)
      : 'Assalamualaikum / Salam Pramuka, kami ingin menanyakan informasi pendaftaran Pesta Penggalang Kecamatan Muara Kaman.'
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#23170D]">
      {/* TOP BAR CONTRACT: Strictly 3 zones (Brand Title — 4-5 Nav Links — 1-2 Primary Actions) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5DEC9] px-4 sm:px-8 h-14 flex items-center justify-between no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-[#4A2C11] whitespace-nowrap truncate"
        >
          Pesta Penggalang Muara Kaman
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5C4328]">
          <a
            href="#identitas-sekolah"
            onClick={() => setActiveView('form')}
            className="hover:text-[#C81E1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Sekolah & Pembina
          </a>
          <a
            href="#peserta-putra"
            onClick={() => setActiveView('form')}
            className="hover:text-[#C81E1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Peserta Putra
          </a>
          <a
            href="#peserta-putri"
            onClick={() => setActiveView('form')}
            className="hover:text-[#C81E1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Peserta Putri
          </a>
          <a
            href="#pembayaran"
            onClick={() => setActiveView('form')}
            className="hover:text-[#C81E1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Pembayaran
          </a>
          <button
            type="button"
            onClick={() => setActiveView(activeView === 'history' ? 'form' : 'history')}
            className="hover:text-[#C81E1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Data Terkirim ({submissions.length})
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Login Admin & WA Panitia) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'admin'
                ? 'bg-[#C81E1E] text-white'
                : 'bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Login Admin</span>
          </button>

          <a
            href={directWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#15803D] hover:bg-[#14532D] rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WA Panitia</span>
          </a>
        </div>
      </header>

      {/* HERO BANNER KEGIATAN PRAMUKA */}
      <section
        id="top"
        className="bg-gradient-to-b from-[#4A2C11] via-[#3D220B] to-[#2E1907] text-white border-b-4 border-[#C81E1E] no-print"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left Emblem: Tunas Kelapa + Title */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center"
                  title="Lambang Gerakan Pramuka Tunas Kelapa"
                >
                  <TunasKelapaLogo className="w-12 h-14 text-[#1A120B]" />
                </div>
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center md:hidden"
                  title="Lambang WOSM Kepanduan Dunia"
                >
                  <WosmLogo className="w-13 h-13" />
                </div>
              </div>

              <div className="space-y-2 max-w-2xl">
                <div className="text-xs sm:text-sm font-medium text-[#F3D299]">
                  <span>Gerakan Pramuka</span>
                  <span aria-hidden="true" className="mx-2">
                    ·
                  </span>
                  <span>Kwartir Ranting Kecamatan Muara Kaman</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">
                  Formulir Pendaftaran Sekolah Pesta Penggalang
                </h1>

                <p className="text-sm sm:text-base text-[#EAE0D5] leading-relaxed">
                  Lengkapi data pangkalan sekolah, Kepala Sekolah, 2 Pembina Pendamping Putra & 2
                  Pembina Pendamping Putri, daftar 8 Peserta Putra dan 8 Peserta Putri, serta unggah
                  bukti pembayaran resmi.
                </p>

                {/* Unboxed Clean Metadata Line */}
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-[#F3D299] font-mono-num">
                  <span>Biaya: Rp1.300.000,00 / Regu</span>
                  <span aria-hidden="true">·</span>
                  <span>Bank Kaltimtara: 0042830798 (a.n. Susilawati)</span>
                  <span aria-hidden="true">·</span>
                  <span>Konfirmasi WA: 081253445433</span>
                </div>
              </div>
            </div>

            {/* Right Emblem on Desktop: WOSM Logo */}
            <div
              className="hidden md:flex w-22 h-22 rounded-3xl bg-white p-3 shadow-lg items-center justify-center shrink-0"
              title="Lambang WOSM Kepanduan Dunia"
            >
              <WosmLogo className="w-16 h-16" />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {activeView === 'admin' ? (
          <AdminDashboardView
            submissions={submissions}
            deletedSubmissions={deletedSubmissions}
            onViewReceipt={(reg, initialTab = 'receipt') => {
              setCurrentReceipt(reg);
              setReceiptSubTab(initialTab);
              setActiveView('success');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleVerify={handleToggleVerify}
            onDeleteSubmission={handleDeleteSubmission}
            onRestoreSubmission={handleRestoreSubmission}
            onPermanentDeleteSubmission={handlePermanentDeleteSubmission}
            onEmptyTrash={handleEmptyTrash}
            onBackToForm={() => {
              setActiveView('form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onEditSubmission={handleEditSubmission}
          />
        ) : activeView === 'success' && currentReceipt ? (
          <SubmissionSuccessView
            registration={currentReceipt}
            initialSubTab={receiptSubTab}
            onCreateNew={() => {
              handleResetForm();
              setActiveView('form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBackToHistory={() => setActiveView('history')}
            onEdit={handleEditSubmission}
          />
        ) : activeView === 'history' ? (
          /* RIWAYAT PENDAFTARAN YANG SUDAH DIKIRIM */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5DEC9]">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#23170D]">
                  Riwayat Formulir Terkirim ({submissions.length})
                </h2>
                <p className="text-sm text-[#6B5744] mt-1">
                  Daftar pendaftaran sekolah yang telah dikirim dari perangkat ini. Anda dapat
                  melihat bukti pendaftaran atau mengirim ulang konfirmasi WhatsApp ke panitia.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveView('admin')}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-sm flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Panel Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#4A2C11] text-white font-semibold text-sm hover:bg-[#361F0B] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Kembali ke Formulir
                </button>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E5DEC9] p-10 text-center space-y-4">
                <FileText className="w-12 h-12 text-[#8C735B] mx-auto" />
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#23170D]">
                    Belum Ada Pendaftaran yang Dikirim
                  </h3>
                  <p className="text-sm text-[#6B5744] mt-1">
                    Silakan isi formulir pendaftaran sekolah Pesta Penggalang Kecamatan Muara Kaman
                    terlebih dahulu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C81E1E] text-white font-semibold text-sm hover:bg-[#A51717] transition-colors cursor-pointer"
                >
                  Mulai Isi Formulir Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((item) => {
                  const waHref = `https://wa.me/${
                    INFO_PEMBAYARAN.waPanitiaInternational
                  }?text=${encodeURIComponent(buildWhatsAppMessage(item, item.nomorRegistrasi))}`;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-[#E5DEC9] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#C2B299] transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="text-xs text-[#6B5744] font-mono-num">
                          <span>{item.nomorRegistrasi}</span>
                          <span aria-hidden="true" className="mx-2">
                            ·
                          </span>
                          <span>{item.tanggalDaftar}</span>
                          <span aria-hidden="true" className="mx-2">
                            ·
                          </span>
                          <span>{formatRupiah(item.totalBiaya)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#23170D]">{item.namaSekolah}</h3>
                        <p className="text-sm text-[#5C4328]">
                          Kepala Sekolah: <strong>{item.namaKepalaSekolah}</strong> · Pembina Putra:{' '}
                          {item.namaPembinaPutra}, {item.namaPembinaPutra2 || '-'} · Pembina Putri:{' '}
                          {item.namaPembinaPutri}, {item.namaPembinaPutri2 || '-'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentReceipt(item);
                            setReceiptSubTab('kwitansi');
                            setActiveView('success');
                          }}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-4 h-4 text-[#F3D299]" />
                          <span>Cetak Kwitansi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentReceipt(item);
                            setReceiptSubTab('receipt');
                            setActiveView('success');
                          }}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Lihat Bukti</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentReceipt(item);
                            setReceiptSubTab('cards');
                            setActiveView('success');
                          }}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#C81E1E] hover:bg-[#A51717] text-white font-semibold text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <IdCard className="w-4 h-4" />
                          <span>Kartu Peserta (20)</span>
                        </button>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-semibold text-sm flex items-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Konfirmasi WA</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* FORMULIR PENDAFTARAN UTAMA */
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Bar Status Kelengkapan & Alat Bantu Cepat */}
            <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#23170D]">
                      Progres Pengisian Formulir Pendaftaran
                    </h2>
                    <span className="font-mono-num text-sm font-bold text-[#C81E1E]">
                      ({completionPercentage}%)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#6B5744] mt-0.5">
                    Formulir otomatis kosong setiap kali tautan dibuka atau selesai dikirim agar
                    nyaman digunakan oleh seluruh sekolah/akun.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {submissions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveView('history')}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                      <span>Riwayat & Kartu Peserta ({submissions.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFillSampleData}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C81E1E]" />
                    <span>Isi Contoh Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-[#7A271A] border border-[#E5DEC9] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Kosongkan</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#EFE8DC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4A2C11] via-[#C81E1E] to-[#15803D] transition-all duration-200"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Quick Jump Buttons for Touch Ergonomics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <a
                  href="#identitas-sekolah"
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
                    isSchoolAndLeadersComplete
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      : 'bg-[#FAF7F2] border-[#E5DEC9] text-[#4A2C11] hover:bg-[#EFE8DC]'
                  }`}
                >
                  <span className="truncate">1. Sekolah & Pembina</span>
                  {isSchoolAndLeadersComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                </a>

                <a
                  href="#peserta-putra"
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
                    isPutraComplete
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      : 'bg-[#FAF7F2] border-[#E5DEC9] text-[#4A2C11] hover:bg-[#EFE8DC]'
                  }`}
                >
                  <span className="truncate">2. Putra ({filledPutraCount}/8)</span>
                  {isPutraComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                </a>

                <a
                  href="#peserta-putri"
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
                    isPutriComplete
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      : 'bg-[#FAF7F2] border-[#E5DEC9] text-[#4A2C11] hover:bg-[#EFE8DC]'
                  }`}
                >
                  <span className="truncate">3. Putri ({filledPutriCount}/8)</span>
                  {isPutriComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                </a>

                <a
                  href="#pembayaran"
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
                    isPaymentComplete
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      : 'bg-[#FAF7F2] border-[#E5DEC9] text-[#4A2C11] hover:bg-[#EFE8DC]'
                  }`}
                >
                  <span className="truncate">4. Bukti Bayar</span>
                  {isPaymentComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                </a>
              </div>
            </div>

            {/* Banner Error Validasi (Jika Ada Kolom Belum Diisi) */}
            {validationErrors.length > 0 && (
              <div
                ref={errorBannerRef}
                role="alert"
                className="bg-[#FEF2F2] border-2 border-[#DC2626] rounded-3xl p-5 sm:p-6 text-[#7F1D1D] space-y-2.5"
              >
                <div className="flex items-center gap-2.5 font-bold text-base">
                  <AlertCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
                  <span>Mohon Lengkapi Data Berikut Sebelum Mengirim Formulir:</span>
                </div>
                <ul className="list-disc list-inside text-sm space-y-1 pl-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* BAGIAN 1: DATA SEKOLAH, KEPALA SEKOLAH, DAN PEMBINA PENDAMPING (PUTRA 1 & 2, PUTRI 1 & 2) */}
            <section
              id="identitas-sekolah"
              className="bg-white rounded-3xl border border-[#E5DEC9] overflow-hidden shadow-xs scroll-mt-20"
            >
              <div className="bg-[#4A2C11] px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#F3D299]" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      01. Data Sekolah & Pembina Pendamping
                    </h2>
                    <p className="text-xs text-[#E5DEC9]">
                      Identitas pangkalan sekolah, Kepala Sekolah, serta 2 Pembina Pendamping Putra
                      & 2 Pembina Pendamping Putri beserta NIP
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* Sub-bagian: Sekolah & Kepala Sekolah */}
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-[#4A2C11] pb-2 border-b border-[#E5DEC9]">
                    A. Identitas Sekolah & Kepala Sekolah
                  </h3>

                  <div className="space-y-2">
                    <label
                      htmlFor="namaSekolah"
                      className="block text-sm font-bold text-[#23170D]"
                    >
                      Nama Sekolah / Pangkalan <span className="text-[#C81E1E]">*</span>
                    </label>
                    <input
                      id="namaSekolah"
                      type="text"
                      required
                      value={formData.namaSekolah}
                      onChange={(e) => handleInputChange('namaSekolah', e.target.value)}
                      placeholder="Contoh: SMP Negeri 6 Muara Kaman"
                      className="w-full min-h-[52px] px-4 py-3 text-base rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:bg-white focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label
                        htmlFor="namaKepalaSekolah"
                        className="block text-sm font-bold text-[#23170D]"
                      >
                        Nama Kepala Sekolah <span className="text-[#C81E1E]">*</span>
                      </label>
                      <input
                        id="namaKepalaSekolah"
                        type="text"
                        required
                        value={formData.namaKepalaSekolah}
                        onChange={(e) => handleInputChange('namaKepalaSekolah', e.target.value)}
                        placeholder="Nama lengkap beserta gelar"
                        className="w-full min-h-[52px] px-4 py-3 text-base rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:bg-white focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="nipKepalaSekolah"
                          className="block text-sm font-bold text-[#23170D]"
                        >
                          NIP Kepala Sekolah <span className="text-[#C81E1E]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('nipKepalaSekolah', '-')}
                          className="text-xs font-semibold text-[#4A2C11] underline hover:text-[#C81E1E] cursor-pointer"
                        >
                          Isi &quot;-&quot; (Jika Non-ASN)
                        </button>
                      </div>
                      <input
                        id="nipKepalaSekolah"
                        type="text"
                        inputMode="text"
                        required
                        value={formData.nipKepalaSekolah}
                        onChange={(e) => handleInputChange('nipKepalaSekolah', e.target.value)}
                        placeholder="18 digit NIP atau ketik '-' jika Non-ASN"
                        className="w-full min-h-[52px] px-4 py-3 text-base font-mono-num rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:bg-white focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-bagian: Pembina Pendamping Putra 1 & 2 serta Putri 1 & 2 */}
                <div className="space-y-6 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E5DEC9]">
                    <UserCheck className="w-5 h-5 text-[#C81E1E]" />
                    <h3 className="text-base font-bold text-[#4A2C11]">
                      B. Data Pembina Pendamping Putra (2 Orang) & Putri (2 Orang)
                    </h3>
                  </div>

                  {/* Kelompok Pembina Pendamping Putra (1 & 2) */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-5">
                    <div className="text-sm font-bold text-[#8B1E1E] border-b border-[#E5DEC9] pb-2">
                      Identitas Pembina Pendamping Putra (1 & 2)
                    </div>

                    {/* Pembina Putra 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label
                          htmlFor="namaPembinaPutra"
                          className="block text-sm font-bold text-[#23170D]"
                        >
                          Nama Pembina Pendamping Putra 1 <span className="text-[#C81E1E]">*</span>
                        </label>
                        <input
                          id="namaPembinaPutra"
                          type="text"
                          required
                          value={formData.namaPembinaPutra}
                          onChange={(e) => handleInputChange('namaPembinaPutra', e.target.value)}
                          placeholder="Nama lengkap Pembina Pendamping Putra 1"
                          className="w-full min-h-[52px] px-4 py-3 text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="nipPembinaPutra"
                            className="block text-sm font-bold text-[#23170D]"
                          >
                            NIP Pembina Pendamping Putra 1 <span className="text-[#C81E1E]">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleInputChange('nipPembinaPutra', '-')}
                            className="text-xs font-semibold text-[#4A2C11] underline hover:text-[#C81E1E] cursor-pointer"
                          >
                            Isi &quot;-&quot; (Non-ASN)
                          </button>
                        </div>
                        <input
                          id="nipPembinaPutra"
                          type="text"
                          required
                          value={formData.nipPembinaPutra}
                          onChange={(e) => handleInputChange('nipPembinaPutra', e.target.value)}
                          placeholder="NIP Pembina Putra 1 atau '-' jika Non-ASN"
                          className="w-full min-h-[52px] px-4 py-3 text-base font-mono-num rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Pembina Putra 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#E5DEC9]/80">
                      <div className="space-y-2">
                        <label
                          htmlFor="namaPembinaPutra2"
                          className="block text-sm font-bold text-[#23170D]"
                        >
                          Nama Pembina Pendamping Putra 2 <span className="text-[#C81E1E]">*</span>
                        </label>
                        <input
                          id="namaPembinaPutra2"
                          type="text"
                          required
                          value={formData.namaPembinaPutra2}
                          onChange={(e) => handleInputChange('namaPembinaPutra2', e.target.value)}
                          placeholder="Nama lengkap Pembina Pendamping Putra 2"
                          className="w-full min-h-[52px] px-4 py-3 text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="nipPembinaPutra2"
                            className="block text-sm font-bold text-[#23170D]"
                          >
                            NIP Pembina Pendamping Putra 2 <span className="text-[#C81E1E]">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleInputChange('nipPembinaPutra2', '-')}
                            className="text-xs font-semibold text-[#4A2C11] underline hover:text-[#C81E1E] cursor-pointer"
                          >
                            Isi &quot;-&quot; (Non-ASN)
                          </button>
                        </div>
                        <input
                          id="nipPembinaPutra2"
                          type="text"
                          required
                          value={formData.nipPembinaPutra2}
                          onChange={(e) => handleInputChange('nipPembinaPutra2', e.target.value)}
                          placeholder="NIP Pembina Putra 2 atau '-' jika Non-ASN"
                          className="w-full min-h-[52px] px-4 py-3 text-base font-mono-num rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4A2C11] focus:ring-3 focus:ring-[#4A2C11]/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok Pembina Pendamping Putri (1 & 2) */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-5">
                    <div className="text-sm font-bold text-[#4B1E78] border-b border-[#E5DEC9] pb-2">
                      Identitas Pembina Pendamping Putri (1 & 2)
                    </div>

                    {/* Pembina Putri 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label
                          htmlFor="namaPembinaPutri"
                          className="block text-sm font-bold text-[#23170D]"
                        >
                          Nama Pembina Pendamping Putri 1 <span className="text-[#C81E1E]">*</span>
                        </label>
                        <input
                          id="namaPembinaPutri"
                          type="text"
                          required
                          value={formData.namaPembinaPutri}
                          onChange={(e) => handleInputChange('namaPembinaPutri', e.target.value)}
                          placeholder="Nama lengkap Pembina Pendamping Putri 1"
                          className="w-full min-h-[52px] px-4 py-3 text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:ring-3 focus:ring-[#4B1E78]/15 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="nipPembinaPutri"
                            className="block text-sm font-bold text-[#23170D]"
                          >
                            NIP Pembina Pendamping Putri 1 <span className="text-[#C81E1E]">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleInputChange('nipPembinaPutri', '-')}
                            className="text-xs font-semibold text-[#4B1E78] underline hover:text-[#C81E1E] cursor-pointer"
                          >
                            Isi &quot;-&quot; (Non-ASN)
                          </button>
                        </div>
                        <input
                          id="nipPembinaPutri"
                          type="text"
                          required
                          value={formData.nipPembinaPutri}
                          onChange={(e) => handleInputChange('nipPembinaPutri', e.target.value)}
                          placeholder="NIP Pembina Putri 1 atau '-' jika Non-ASN"
                          className="w-full min-h-[52px] px-4 py-3 text-base font-mono-num rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:ring-3 focus:ring-[#4B1E78]/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Pembina Putri 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#E5DEC9]/80">
                      <div className="space-y-2">
                        <label
                          htmlFor="namaPembinaPutri2"
                          className="block text-sm font-bold text-[#23170D]"
                        >
                          Nama Pembina Pendamping Putri 2 <span className="text-[#C81E1E]">*</span>
                        </label>
                        <input
                          id="namaPembinaPutri2"
                          type="text"
                          required
                          value={formData.namaPembinaPutri2}
                          onChange={(e) => handleInputChange('namaPembinaPutri2', e.target.value)}
                          placeholder="Nama lengkap Pembina Pendamping Putri 2"
                          className="w-full min-h-[52px] px-4 py-3 text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:ring-3 focus:ring-[#4B1E78]/15 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="nipPembinaPutri2"
                            className="block text-sm font-bold text-[#23170D]"
                          >
                            NIP Pembina Pendamping Putri 2 <span className="text-[#C81E1E]">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleInputChange('nipPembinaPutri2', '-')}
                            className="text-xs font-semibold text-[#4B1E78] underline hover:text-[#C81E1E] cursor-pointer"
                          >
                            Isi &quot;-&quot; (Non-ASN)
                          </button>
                        </div>
                        <input
                          id="nipPembinaPutri2"
                          type="text"
                          required
                          value={formData.nipPembinaPutri2}
                          onChange={(e) => handleInputChange('nipPembinaPutri2', e.target.value)}
                          placeholder="NIP Pembina Putri 2 atau '-' jika Non-ASN"
                          className="w-full min-h-[52px] px-4 py-3 text-base font-mono-num rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:ring-3 focus:ring-[#4B1E78]/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BAGIAN 2: DAFTAR 8 PESERTA PUTRA */}
            <section
              id="peserta-putra"
              className="bg-white rounded-3xl border border-[#E5DEC9] overflow-hidden shadow-xs scroll-mt-20"
            >
              <div className="bg-[#8B1E1E] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      02. Daftar Nama Peserta Putra (8 Orang)
                    </h2>
                    <p className="text-xs text-red-100">
                      Masukkan 8 nama lengkap beserta Tempat & Tanggal Lahir ({filledPutraCount}/8
                      memenuhi syarat)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPastePutra(!showPastePutra)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{showPastePutra ? 'Tutup Tempel Cepat' : 'Tempel 8 Nama Sekaligus'}</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {showPastePutra && (
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] space-y-3">
                    <label className="block text-xs sm:text-sm font-semibold text-[#4A2C11]">
                      Tempel daftar 8 nama Peserta Putra (pisahkan per baris dari WhatsApp/Catatan):
                    </label>
                    <textarea
                      rows={4}
                      value={pasteTextPutra}
                      onChange={(e) => setPasteTextPutra(e.target.value)}
                      placeholder={'1. Ahmad Fauzan\n2. Bagas Adi\n3. Chandra Wijaya...'}
                      className="w-full p-3 text-sm rounded-xl bg-white border border-[#D8CEBE] focus:outline-none focus:border-[#8B1E1E]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPastePutra(false)}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[#6B5744] hover:bg-[#EFE8DC] cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkPaste('putra')}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-semibold hover:bg-[#701616] cursor-pointer"
                      >
                        Masukkan ke 8 Kolom Putra
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9]">
                  <div className="lg:col-span-6 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <label
                        htmlFor="namaReguPutra"
                        className="block text-sm font-bold text-[#23170D]"
                      >
                        Nama Regu Putra <span className="text-xs font-normal text-[#6B5744]">(Opsional)</span>
                      </label>
                      <span className="text-xs text-[#6B5744]">
                        Contoh: Regu Elang / Rajawali
                      </span>
                    </div>
                    <input
                      id="namaReguPutra"
                      type="text"
                      value={formData.namaReguPutra}
                      onChange={(e) => handleInputChange('namaReguPutra', e.target.value)}
                      placeholder="Ketik nama hewan / regu putra (opsional)"
                      className="w-full min-h-[48px] px-4 py-2.5 text-sm sm:text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#8B1E1E] focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-6 p-3.5 rounded-xl bg-white border border-[#D8CEBE] flex flex-col justify-center text-xs sm:text-sm text-[#4A2C11] leading-relaxed">
                    <span className="font-bold text-[#8B1E1E]">
                      Ketentuan Usia Peserta Putra:
                    </span>
                    <span>
                      Maksimal <strong>16 Tahun</strong> pada <strong>30 Oktober 2026</strong> (Lahir paling awal{' '}
                      <span className="font-mono-num font-bold">30 Oktober 2010</span>). Jika lewat 16 tahun otomatis ditolak.
                    </span>
                  </div>
                </div>

                {/* 8 Kolom Input Peserta Putra (Nama + Tempat Lahir + Tanggal Lahir) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {formData.pesertaPutra.map((nama, index) => {
                    const ageCheck = checkParticipantAgeOnOct30(formData.tanggalLahirPutra[index]);
                    return (
                      <div
                        key={`putra-${index}`}
                        className={`p-4 rounded-2xl border space-y-3 transition-all ${
                          ageCheck.isOver16
                            ? 'bg-red-50/90 border-2 border-[#DC2626]'
                            : 'bg-[#FAF7F2]/60 border-[#E5DEC9]'
                        }`}
                      >
                        <label
                          htmlFor={`pesertaPutra-${index}`}
                          className="flex items-center justify-between text-sm font-bold text-[#23170D]"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#8B1E1E] text-white font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <span>
                              Peserta Putra {index + 1} <span className="text-[#C81E1E]">*</span>
                            </span>
                          </span>
                          {index === 0 && (
                            <span className="text-xs font-semibold text-[#8B1E1E]">
                              Pemimpin Regu (Pinru)
                            </span>
                          )}
                          {index === 1 && (
                            <span className="text-xs font-semibold text-[#6B5744]">
                              Wakil Pinru (Wapinru)
                            </span>
                          )}
                        </label>

                        <input
                          id={`pesertaPutra-${index}`}
                          type="text"
                          required
                          value={nama}
                          onChange={(e) =>
                            handleParticipantChange('putra', index, e.target.value)
                          }
                          placeholder={`Nama lengkap Peserta Putra ${index + 1}`}
                          className="w-full min-h-[48px] px-3.5 py-2.5 text-sm sm:text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/15 focus:outline-none transition-all"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label
                              htmlFor={`tempatLahirPutra-${index}`}
                              className="block text-xs font-semibold text-[#5C4328]"
                            >
                              Tempat Lahir <span className="text-[#C81E1E]">*</span>
                            </label>
                            <input
                              id={`tempatLahirPutra-${index}`}
                              type="text"
                              required
                              value={formData.tempatLahirPutra[index] || ''}
                              onChange={(e) =>
                                handleTempatLahirChange('putra', index, e.target.value)
                              }
                              placeholder="Contoh: Muara Kaman"
                              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#8B1E1E] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label
                              htmlFor={`tanggalLahirPutra-${index}`}
                              className="block text-xs font-semibold text-[#5C4328]"
                            >
                              Tanggal Lahir <span className="text-[#C81E1E]">*</span>
                            </label>
                            <input
                              id={`tanggalLahirPutra-${index}`}
                              type="date"
                              required
                              max="2026-10-30"
                              value={formData.tanggalLahirPutra[index] || ''}
                              onChange={(e) =>
                                handleTanggalLahirChange('putra', index, e.target.value)
                              }
                              className={`w-full min-h-[44px] px-3 py-2 text-sm font-mono-num rounded-xl bg-white border focus:outline-none ${
                                ageCheck.isOver16
                                  ? 'border-[#DC2626] text-[#991B1B] font-bold'
                                  : 'border-[#D8CEBE] text-[#23170D] focus:border-[#8B1E1E]'
                              }`}
                            />
                          </div>
                        </div>

                        {ageCheck.hasDate && (
                          <div
                            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                              ageCheck.isOver16
                                ? 'bg-[#DC2626] text-white'
                                : ageCheck.isValid
                                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{ageCheck.statusText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* BAGIAN 3: DAFTAR 8 PESERTA PUTRI */}
            <section
              id="peserta-putri"
              className="bg-white rounded-3xl border border-[#E5DEC9] overflow-hidden shadow-xs scroll-mt-20"
            >
              <div className="bg-[#4B1E78] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      03. Daftar Nama Peserta Putri (8 Orang)
                    </h2>
                    <p className="text-xs text-purple-100">
                      Masukkan 8 nama lengkap beserta Tempat & Tanggal Lahir ({filledPutriCount}/8
                      memenuhi syarat)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPastePutri(!showPastePutri)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{showPastePutri ? 'Tutup Tempel Cepat' : 'Tempel 8 Nama Sekaligus'}</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {showPastePutri && (
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] space-y-3">
                    <label className="block text-xs sm:text-sm font-semibold text-[#4B1E78]">
                      Tempel daftar 8 nama Peserta Putri (pisahkan per baris dari WhatsApp/Catatan):
                    </label>
                    <textarea
                      rows={4}
                      value={pasteTextPutri}
                      onChange={(e) => setPasteTextPutri(e.target.value)}
                      placeholder={'1. Aisyah Putri\n2. Bunga Citra\n3. Citra Kirana...'}
                      className="w-full p-3 text-sm rounded-xl bg-white border border-[#D8CEBE] focus:outline-none focus:border-[#4B1E78]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPastePutri(false)}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[#6B5744] hover:bg-[#EFE8DC] cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkPaste('putri')}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#4B1E78] text-white text-xs font-semibold hover:bg-[#38145C] cursor-pointer"
                      >
                        Masukkan ke 8 Kolom Putri
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9]">
                  <div className="lg:col-span-6 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <label
                        htmlFor="namaReguPutri"
                        className="block text-sm font-bold text-[#23170D]"
                      >
                        Nama Regu Putri <span className="text-xs font-normal text-[#6B5744]">(Opsional)</span>
                      </label>
                      <span className="text-xs text-[#6B5744]">
                        Contoh: Regu Melati / Anggrek
                      </span>
                    </div>
                    <input
                      id="namaReguPutri"
                      type="text"
                      value={formData.namaReguPutri}
                      onChange={(e) => handleInputChange('namaReguPutri', e.target.value)}
                      placeholder="Ketik nama bunga / regu putri (opsional)"
                      className="w-full min-h-[48px] px-4 py-2.5 text-sm sm:text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-6 p-3.5 rounded-xl bg-white border border-[#D8CEBE] flex flex-col justify-center text-xs sm:text-sm text-[#4B1E78] leading-relaxed">
                    <span className="font-bold text-[#4B1E78]">
                      Ketentuan Usia Peserta Putri:
                    </span>
                    <span>
                      Maksimal <strong>16 Tahun</strong> pada <strong>30 Oktober 2026</strong> (Lahir paling awal{' '}
                      <span className="font-mono-num font-bold">30 Oktober 2010</span>). Jika lewat 16 tahun otomatis ditolak.
                    </span>
                  </div>
                </div>

                {/* 8 Kolom Input Peserta Putri (Nama + Tempat Lahir + Tanggal Lahir) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {formData.pesertaPutri.map((nama, index) => {
                    const ageCheck = checkParticipantAgeOnOct30(formData.tanggalLahirPutri[index]);
                    return (
                      <div
                        key={`putri-${index}`}
                        className={`p-4 rounded-2xl border space-y-3 transition-all ${
                          ageCheck.isOver16
                            ? 'bg-red-50/90 border-2 border-[#DC2626]'
                            : 'bg-[#FAF7F2]/60 border-[#E5DEC9]'
                        }`}
                      >
                        <label
                          htmlFor={`pesertaPutri-${index}`}
                          className="flex items-center justify-between text-sm font-bold text-[#23170D]"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#4B1E78] text-white font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <span>
                              Peserta Putri {index + 1} <span className="text-[#C81E1E]">*</span>
                            </span>
                          </span>
                          {index === 0 && (
                            <span className="text-xs font-semibold text-[#4B1E78]">
                              Pemimpin Regu (Pinru)
                            </span>
                          )}
                          {index === 1 && (
                            <span className="text-xs font-semibold text-[#6B5744]">
                              Wakil Pinru (Wapinru)
                            </span>
                          )}
                        </label>

                        <input
                          id={`pesertaPutri-${index}`}
                          type="text"
                          required
                          value={nama}
                          onChange={(e) =>
                            handleParticipantChange('putri', index, e.target.value)
                          }
                          placeholder={`Nama lengkap Peserta Putri ${index + 1}`}
                          className="w-full min-h-[48px] px-3.5 py-2.5 text-sm sm:text-base rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:ring-2 focus:ring-[#4B1E78]/15 focus:outline-none transition-all"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label
                              htmlFor={`tempatLahirPutri-${index}`}
                              className="block text-xs font-semibold text-[#5C4328]"
                            >
                              Tempat Lahir <span className="text-[#C81E1E]">*</span>
                            </label>
                            <input
                              id={`tempatLahirPutri-${index}`}
                              type="text"
                              required
                              value={formData.tempatLahirPutri[index] || ''}
                              onChange={(e) =>
                                handleTempatLahirChange('putri', index, e.target.value)
                              }
                              placeholder="Contoh: Muara Kaman"
                              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl bg-white border border-[#D8CEBE] text-[#23170D] placeholder:text-[#8C735B] focus:border-[#4B1E78] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label
                              htmlFor={`tanggalLahirPutri-${index}`}
                              className="block text-xs font-semibold text-[#5C4328]"
                            >
                              Tanggal Lahir <span className="text-[#C81E1E]">*</span>
                            </label>
                            <input
                              id={`tanggalLahirPutri-${index}`}
                              type="date"
                              required
                              max="2026-10-30"
                              value={formData.tanggalLahirPutri[index] || ''}
                              onChange={(e) =>
                                handleTanggalLahirChange('putri', index, e.target.value)
                              }
                              className={`w-full min-h-[44px] px-3 py-2 text-sm font-mono-num rounded-xl bg-white border focus:outline-none ${
                                ageCheck.isOver16
                                  ? 'border-[#DC2626] text-[#991B1B] font-bold'
                                  : 'border-[#D8CEBE] text-[#23170D] focus:border-[#4B1E78]'
                              }`}
                            />
                          </div>
                        </div>

                        {ageCheck.hasDate && (
                          <div
                            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                              ageCheck.isOver16
                                ? 'bg-[#DC2626] text-white'
                                : ageCheck.isValid
                                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{ageCheck.statusText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* BAGIAN 4: INFORMASI BIAYA, REKENING BANK KALTIMTARA, & UPLOAD BUKTI PEMBAYARAN */}
            <section
              id="pembayaran"
              className="bg-white rounded-3xl border border-[#E5DEC9] overflow-hidden shadow-xs scroll-mt-20"
            >
              <div className="bg-[#14532D] px-6 py-4 text-white flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">
                    04. Biaya Pendaftaran & Upload Bukti Pembayaran
                  </h2>
                  <p className="text-xs text-emerald-100">
                    Biaya pendaftaran Rp1.300.000,00 per regu melalui Bank Kaltimtara
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* Kartu Informasi Rekening Bank Kaltimtara */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Detail Bank */}
                  <div className="lg:col-span-7 bg-[#FAF7F2] rounded-2xl p-5 sm:p-6 border border-[#D8CEBE] flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-[#7A5C3E]">
                        REKENING RESMI PANITIA PESTA PENGGALANG MUARA KAMAN
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5DEC9]">
                        <div>
                          <p className="text-xs text-[#6B5744]">Nama Bank</p>
                          <p className="text-lg sm:text-xl font-bold text-[#23170D]">
                            {INFO_PEMBAYARAN.bank}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-xs text-[#6B5744]">Atas Nama Rekening</p>
                          <p className="text-lg sm:text-xl font-bold text-[#4A2C11]">
                            {INFO_PEMBAYARAN.atasNama}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <p className="text-xs text-[#6B5744]">Nomor Rekening Bank Kaltimtara</p>
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#D8CEBE]">
                          <span className="text-2xl sm:text-3xl font-mono-num font-bold tracking-wider text-[#23170D] select-all">
                            {INFO_PEMBAYARAN.noRekening}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(INFO_PEMBAYARAN.noRekening, 'rekening')
                            }
                            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#4A2C11] hover:bg-[#361F0B] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                          >
                            {copiedRekening ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span>Disalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Salin No. Rekening</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B5744] leading-relaxed">
                      Pastikan nama penerima saat transfer adalah{' '}
                      <strong className="text-[#23170D]">Susilawati (Bank Kaltimtara)</strong>.
                      Simpan struk ATM atau tangkapan layar m-Banking untuk diunggah di bawah ini.
                    </p>
                  </div>

                  {/* Kalkulator Biaya Per Regu */}
                  <div className="lg:col-span-5 bg-[#FAF7F2] rounded-2xl p-5 sm:p-6 border border-[#D8CEBE] flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-[#7A5C3E]">
                        RINCIAN BIAYA PENDAFTARAN
                      </p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-[#6B5744]">Biaya per Regu:</span>
                        <span className="text-lg font-mono-num font-bold text-[#23170D]">
                          Rp1.300.000,00
                        </span>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-bold text-[#23170D]">
                          Pilih Jumlah Regu yang Didaftarkan:
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleInputChange('jumlahRegu', 2)}
                            className={`min-h-[48px] px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all cursor-pointer ${
                              formData.jumlahRegu === 2
                                ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                                : 'bg-white text-[#4A2C11] border-[#D8CEBE] hover:bg-[#EFE8DC]'
                            }`}
                          >
                            2 Regu (Putra & Putri)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('jumlahRegu', 1)}
                            className={`min-h-[48px] px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all cursor-pointer ${
                              formData.jumlahRegu === 1
                                ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                                : 'bg-white text-[#4A2C11] border-[#D8CEBE] hover:bg-[#EFE8DC]'
                            }`}
                          >
                            1 Regu Saja
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#D8CEBE] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#6B5744]">
                          Total Transfer ({formData.jumlahRegu} Regu):
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(String(totalNominalTransfer), 'nominal')
                          }
                          className="text-xs font-semibold text-[#15803D] underline hover:text-[#14532D] cursor-pointer"
                        >
                          {copiedNominal ? 'Nominal Disalin!' : 'Salin Angka'}
                        </button>
                      </div>
                      <p className="text-xl sm:text-2xl font-mono-num font-bold text-[#C81E1E]">
                        {formatRupiah(totalNominalTransfer)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Area Upload Bukti Pembayaran */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="buktiPembayaranInput"
                      className="block text-base font-bold text-[#23170D]"
                    >
                      Upload Bukti Pembayaran <span className="text-[#C81E1E]">*</span>
                    </label>
                    <span className="text-xs text-[#6B5744]">
                      Format: Foto (JPG, PNG) atau PDF · Maks. 6 MB
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="buktiPembayaranInput"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />

                  {uploadError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs sm:text-sm text-red-800 font-medium">
                      {uploadError}
                    </div>
                  )}

                  {!formData.buktiPembayaran ? (
                    <label
                      htmlFor="buktiPembayaranInput"
                      className="min-h-[168px] w-full rounded-2xl border-2 border-dashed border-[#B8A68E] bg-[#FAF7F2] hover:bg-[#F3ECE0] hover:border-[#4A2C11] p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#4A2C11] text-white flex items-center justify-center shadow-xs">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <p className="text-base font-bold text-[#23170D]">
                          Ketuk di Sini untuk Mengunggah Bukti Pembayaran
                        </p>
                        <p className="text-xs sm:text-sm text-[#6B5744]">
                          Ambil foto struk transfer atau pilih gambar tangkapan layar m-Banking ke
                          Bank Kaltimtara 0042830798 a.n. Susilawati
                        </p>
                      </div>
                      <span className="mt-1 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-[#D8CEBE] text-[#4A2C11] font-semibold text-sm shadow-2xs">
                        <ImageIcon className="w-4 h-4 text-[#C81E1E]" />
                        <span>Pilih File / Foto Bukti Transfer</span>
                      </span>
                    </label>
                  ) : (
                    <div className="rounded-2xl border-2 border-[#15803D] bg-[#F0FDF4] p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-[#15803D] text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#15803D]">
                              BUKTI PEMBAYARAN BERHASIL DIUNGGAH
                            </p>
                            <p className="text-sm font-bold text-[#23170D] truncate">
                              {formData.buktiPembayaran.fileName}
                            </p>
                            <p className="text-xs text-[#6B5744] font-mono-num">
                              Ukuran: {(formData.buktiPembayaran.fileSize / 1024).toFixed(1)} KB ·
                              Diunggah pukul {formData.buktiPembayaran.uploadedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <label
                            htmlFor="buktiPembayaranInput"
                            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-[#14532D] border border-[#15803D]/30 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Ganti File</span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleInputChange('buktiPembayaran', null as unknown as boolean)
                            }
                            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-[#991B1B] border border-red-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>

                      {formData.buktiPembayaran.fileType.startsWith('image/') && (
                        <div className="bg-white rounded-xl p-3 border border-[#BBF7D0]">
                          <p className="text-xs font-semibold text-[#6B5744] mb-2">
                            Pratinjau Bukti Pembayaran:
                          </p>
                          <img
                            src={formData.buktiPembayaran.dataUrl}
                            alt="Pratinjau Bukti Pembayaran Pesta Penggalang"
                            className="max-h-72 w-auto mx-auto object-contain rounded-lg border border-[#E5DEC9]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* BAGIAN 5: VERIFIKASI AKHIR, TOMBOL KIRIM FORMULIR, & INFO KONFIRMASI WHATSAPP */}
            <section className="bg-white rounded-3xl border border-[#E5DEC9] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#23170D]">
                  05. Pemeriksaan Akhir & Pengiriman Formulir
                </h2>
                <p className="text-sm text-[#5C4328] leading-relaxed">
                  Pastikan seluruh data diisi dengan benar sebelum menekan tombol kirim formulir.
                  Setelah semua selesai, silakan konfirmasi melalui WhatsApp ke nomor panitia yang
                  tertera (<strong className="font-mono-num">081253445433</strong>).
                </p>
              </div>

              {/* Kotak Centang Pernyataan Kebenaran Data (Hitbox Besar untuk Layar Sentuh) */}
              <label
                htmlFor="pernyataanBenar"
                className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                  formData.pernyataanBenar
                    ? 'bg-[#F0FDF4] border-[#15803D]'
                    : 'bg-[#FAF7F2] border-[#D8CEBE] hover:border-[#4A2C11]'
                }`}
              >
                <input
                  id="pernyataanBenar"
                  type="checkbox"
                  checked={formData.pernyataanBenar}
                  onChange={(e) => handleInputChange('pernyataanBenar', e.target.checked)}
                  className="mt-0.5 w-6 h-6 rounded-lg accent-[#15803D] shrink-0 cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="block text-sm sm:text-base font-bold text-[#23170D]">
                    Saya telah memeriksa dan memastikan seluruh data diisi dengan benar
                  </span>
                  <span className="block text-xs sm:text-sm text-[#6B5744] leading-relaxed">
                    Data Nama Sekolah, Kepala Sekolah beserta NIP, 2 Pembina Pendamping Putra & 2
                    Pembina Pendamping Putri beserta NIP, 8 Peserta Putra, 8 Peserta Putri, serta
                    Bukti Pembayaran ke Bank Kaltimtara (0042830798 a.n. Susilawati) sudah sesuai
                    dan siap dikirim.
                  </span>
                </div>
              </label>

              {hasOverAgeParticipant && (
                <div
                  role="alert"
                  className="bg-[#FEF2F2] border-2 border-[#DC2626] rounded-2xl p-4 sm:p-5 text-[#7F1D1D] space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-[#DC2626]">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>
                      Pendaftaran Otomatis Ditolak: Ada Peserta Melewati Batas Usia 16 Tahun (30
                      Oktober 2026)
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1">
                    {[...rejectedPutraList, ...rejectedPutriList].map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tombol Utama Kirim Formulir (Ukuran Besar & Nyaman untuk Ibu Jari) */}
              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={hasOverAgeParticipant}
                  className={`w-full min-h-[60px] px-6 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md transition-all ${
                    hasOverAgeParticipant
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-[#C81E1E] hover:bg-[#A51717] text-white active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  <Send className="w-6 h-6 shrink-0" />
                  <span>
                    {hasOverAgeParticipant
                      ? 'Pendaftaran Ditolak (Usia Peserta > 16 Tahun pada 30 Oktober)'
                      : 'Kirim Formulir Pendaftaran'}
                  </span>
                </button>

                {/* Box Informasi Konfirmasi WhatsApp Panitia & WA Group Pesta Penggalang */}
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#14532D]">
                        KONFIRMASI WHATSAPP PANITIA PESTA PENGGALANG
                      </p>
                      <p className="text-sm text-[#5C4328]">
                        Setelah mengirim formulir, konfirmasi langsung ke nomor panitia:{' '}
                        <strong className="font-mono-num text-[#23170D] text-base">
                          {INFO_PEMBAYARAN.waPanitiaDisplay}
                        </strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(INFO_PEMBAYARAN.waPanitiaDisplay, 'wa')
                        }
                        className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        {copiedWaNumber ? (
                          <>
                            <Check className="w-4 h-4 text-[#15803D]" />
                            <span>Nomor Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Salin No. WA</span>
                          </>
                        )}
                      </button>

                      <a
                        href={directWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat WA ({INFO_PEMBAYARAN.waPanitiaDisplay})</span>
                      </a>
                    </div>
                  </div>

                  {/* WA Group Pesta Penggalang Kec. Muara Kaman */}
                  <div className="pt-3.5 border-t border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#15803D] shrink-0" />
                        <span>{INFO_PEMBAYARAN.waGroupName}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-[#5C4328] break-all">
                        Buka tautan ini untuk bergabung ke grup WhatsApp saya:{' '}
                        <a
                          href={INFO_PEMBAYARAN.waGroupLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#15803D] underline hover:text-[#14532D]"
                        >
                          {INFO_PEMBAYARAN.waGroupLink}
                        </a>
                      </p>
                    </div>

                    <a
                      href={INFO_PEMBAYARAN.waGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 transition-colors"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span>Gabung WA Group Pesta Penggalang</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </form>
        )}
      </main>

      {/* CLEAN FOOTER */}
      <footer className="bg-white border-t border-[#E5DEC9] py-6 px-4 sm:px-8 text-center text-xs sm:text-sm text-[#6B5744] no-print">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-[#4A2C11]">
            Gerakan Pramuka Pesta Penggalang — Kwartir Ranting Kecamatan Muara Kaman
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono-num">
            <span>Rekening Bank Kaltimtara: 0042830798 (Susilawati)</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveView('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-sans font-semibold text-[#4A2C11] underline hover:text-[#C81E1E] cursor-pointer"
            >
              Panel Login Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
