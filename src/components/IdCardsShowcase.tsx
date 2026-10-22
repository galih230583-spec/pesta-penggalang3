import React, { useState, useEffect } from 'react';
import {
  Download,
  FileDown,
  Camera,
  Check,
  IdCard,
  Loader2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { SubmittedRegistration } from '../types/registration';
import {
  IdCardPerson,
  buildIdCardsFromRegistration,
  downloadIdCardAsPng,
  downloadSingleIdCardAsPdf,
  downloadAllCardsAsPdf,
} from '../utils/downloadHelpers';
import { TunasKelapaLogo, WosmLogo } from './PramukaEmblems';

interface IdCardsShowcaseProps {
  registration: SubmittedRegistration;
  onSavePhotos?: (allPhotos: Record<string, string>) => void;
}

const STORAGE_KEY_SUBMISSIONS = 'pramuka_muara_kaman_submissions_v2';

/**
 * Compresses and center-crops uploaded photos into a crisp 4x6 / 3:4 portrait pasfoto.
 * Produces ~20KB - 40KB JPEG for fast local storage & server persistence without degradation.
 */
async function compressPasfoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file foto'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format foto tidak valid'));
      img.onload = () => {
        try {
          const targetW = 320;
          const targetH = 400; // Pasfoto portrait aspect ratio
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          // Center-crop to prevent image distortion
          const scale = Math.max(targetW / img.width, targetH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const offsetX = (targetW - drawW) / 2;
          const offsetY = (targetH - drawH) / 2;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const IdCardsShowcase: React.FC<IdCardsShowcaseProps> = ({
  registration,
  onSavePhotos,
}) => {
  // Initialize photos from registration.fotoPeserta and localStorage backup
  const [customPhotos, setCustomPhotos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { ...(registration.fotoPeserta || {}) };
    try {
      const localSaved = localStorage.getItem(`pramuka_card_photos_${registration.id}`);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && typeof parsed === 'object') {
          Object.assign(initial, parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return initial;
  });

  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'PEMBINA' | 'PUTRA' | 'PUTRI'
  >('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAllPdf, setDownloadingAllPdf] = useState(false);
  const [pdfSuccessNotice, setPdfSuccessNotice] = useState(false);

  // Sync photos from backend server on mount
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/registrations/${encodeURIComponent(registration.id)}/photos`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.photos && typeof data.photos === 'object') {
          setCustomPhotos((prev) => {
            const merged = { ...data.photos, ...prev };
            try {
              localStorage.setItem(
                `pramuka_card_photos_${registration.id}`,
                JSON.stringify(merged)
              );
            } catch {
              // Ignore storage errors
            }
            return merged;
          });
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });

    return () => {
      isMounted = false;
    };
  }, [registration.id]);

  const allCards = buildIdCardsFromRegistration(registration).map((card) => ({
    ...card,
    customPhotoUrl: customPhotos[card.id],
  }));

  const totalPhotosCount = Object.keys(customPhotos).filter(
    (k) => !!customPhotos[k]
  ).length;

  const filteredCards = allCards.filter((c) => {
    if (categoryFilter === 'PEMBINA')
      return c.kategori === 'PEMBINA PUTRA' || c.kategori === 'PEMBINA PUTRI';
    if (categoryFilter === 'PUTRA') return c.kategori === 'PESERTA PUTRA';
    if (categoryFilter === 'PUTRI') return c.kategori === 'PESERTA PUTRI';
    return true;
  });

  const handlePhotoUpload = async (
    cardId: string,
    personName: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCardId(cardId);
    try {
      const compressedDataUrl = await compressPasfoto(file);

      const nextPhotos = {
        ...customPhotos,
        [cardId]: compressedDataUrl,
      };

      setCustomPhotos(nextPhotos);

      // 1. Simpan di Local Storage
      try {
        localStorage.setItem(
          `pramuka_card_photos_${registration.id}`,
          JSON.stringify(nextPhotos)
        );

        // Update in global submissions store in localStorage
        const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        if (savedSubmissions) {
          const parsed = JSON.parse(savedSubmissions);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((item: any) =>
              item && item.id === registration.id
                ? { ...item, fotoPeserta: nextPhotos }
                : item
            );
            localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.warn('Gagal menyimpan foto ke localStorage:', err);
      }

      // 2. Simpan di Server (API Backend)
      try {
        await fetch(`/api/registrations/${encodeURIComponent(registration.id)}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            photoDataUrl: compressedDataUrl,
          }),
        });
      } catch (err) {
        console.warn('Gagal menyimpan foto ke server:', err);
      }

      // 3. Callback update ke parent jika ada
      if (onSavePhotos) {
        onSavePhotos(nextPhotos);
      }

      setSaveStatusMessage(`Pasfoto untuk "${personName}" berhasil tersimpan di local & server!`);
      setTimeout(() => setSaveStatusMessage(null), 3500);
    } catch (err) {
      console.error('Error saat memproses foto:', err);
    } finally {
      setUploadingCardId(null);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (cardId: string, personName: string) => {
    const nextPhotos = { ...customPhotos };
    delete nextPhotos[cardId];
    setCustomPhotos(nextPhotos);

    // 1. Hapus dari Local Storage
    try {
      localStorage.setItem(
        `pramuka_card_photos_${registration.id}`,
        JSON.stringify(nextPhotos)
      );

      const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (savedSubmissions) {
        const parsed = JSON.parse(savedSubmissions);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) =>
            item && item.id === registration.id
              ? { ...item, fotoPeserta: nextPhotos }
              : item
          );
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
        }
      }
    } catch {
      // Ignore
    }

    // 2. Hapus dari Server
    try {
      await fetch(
        `/api/registrations/${encodeURIComponent(registration.id)}/photos/${encodeURIComponent(cardId)}`,
        { method: 'DELETE' }
      );
    } catch {
      // Ignore
    }

    if (onSavePhotos) {
      onSavePhotos(nextPhotos);
    }

    setSaveStatusMessage(`Pasfoto "${personName}" dihapus dari local & server.`);
    setTimeout(() => setSaveStatusMessage(null), 3000);
  };

  const handleDownloadSinglePdf = async (card: IdCardPerson) => {
    setDownloadingId(`${card.id}-pdf`);
    try {
      await downloadSingleIdCardAsPdf(card);
    } finally {
      setTimeout(() => setDownloadingId(null), 900);
    }
  };

  const handleDownloadSinglePng = async (card: IdCardPerson) => {
    setDownloadingId(`${card.id}-png`);
    try {
      await downloadIdCardAsPng(card);
    } finally {
      setTimeout(() => setDownloadingId(null), 900);
    }
  };

  const handleDownloadAllPdf = async () => {
    if (downloadingAllPdf) return;
    setDownloadingAllPdf(true);
    try {
      await downloadAllCardsAsPdf(registration, filteredCards);
      setPdfSuccessNotice(true);
      setTimeout(() => setPdfSuccessNotice(false), 3500);
    } finally {
      setDownloadingAllPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Status Penyimpanan Foto */}
      {saveStatusMessage && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveStatusMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Tombol Unduh Semua Kartu Langsung File PDF (.pdf) */}
      <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 sm:p-6 space-y-5 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#4A2C11] text-white flex items-center justify-center shrink-0">
              <IdCard className="w-6 h-6 text-[#F3D299]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#23170D]">
                  Kartu Tanda Peserta & Pembina Pendamping (Tipe Portrait)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#14532D]/10 text-[#14532D] border border-[#14532D]/20 flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#14532D]" />
                  <span>Foto Tersimpan di Local & Server ({totalPhotosCount}/{allCards.length})</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B5744] mt-1">
                Otomatis dibuat dari data pendaftaran <strong>{registration.namaSekolah}</strong>.
                Setiap pasfoto yang Anda tambahkan otomatis <strong>tersimpan permanen di perangkat lokal dan server</strong>,
                sehingga tidak akan hilang saat halaman dimuat ulang.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadAllPdf}
            disabled={downloadingAllPdf}
            className="min-h-[52px] px-5 py-3 rounded-2xl bg-[#C81E1E] hover:bg-[#A51717] disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-all cursor-pointer shrink-0"
          >
            {downloadingAllPdf ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menyiapkan File PDF ({filteredCards.length} Kartu)...</span>
              </>
            ) : pdfSuccessNotice ? (
              <>
                <Check className="w-5 h-5" />
                <span>File PDF Berhasil Diunduh!</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span>Unduh Semua Kartu ({filteredCards.length}) — File PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Kategori Kartu & Status Foto */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F0EAE0]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-[#4A2C11] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] text-[#4A2C11] border border-[#D8CEBE] hover:bg-[#EFE8DC]'
              }`}
            >
              Semua Kartu ({allCards.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('PEMBINA')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                categoryFilter === 'PEMBINA'
                  ? 'bg-[#B45309] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] text-[#4A2C11] border border-[#D8CEBE] hover:bg-[#EFE8DC]'
              }`}
            >
              Pembina Pendamping (4)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('PUTRA')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                categoryFilter === 'PUTRA'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] text-[#8B1E1E] border border-[#D8CEBE] hover:bg-[#EFE8DC]'
              }`}
            >
              Peserta Putra (8)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('PUTRI')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                categoryFilter === 'PUTRI'
                  ? 'bg-[#4B1E78] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] text-[#4B1E78] border border-[#D8CEBE] hover:bg-[#EFE8DC]'
              }`}
            >
              Peserta Putri (8)
            </button>
          </div>

          <div className="text-xs text-[#6B5744] flex items-center gap-1.5 font-medium">
            <ImageIcon className="w-4 h-4 text-[#B45309]" />
            <span>Klik tombol kamera di sudut pasfoto untuk menambah / mengganti foto</span>
          </div>
        </div>
      </div>

      {/* Grid Kartu Nama Portrait */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((card) => {
          const isPembina =
            card.kategori === 'PEMBINA PUTRA' || card.kategori === 'PEMBINA PUTRI';
          const isPutra = card.kategori === 'PESERTA PUTRA';

          const headerGradient = isPembina
            ? 'from-[#4A2C11] via-[#5C3614] to-[#3B220C]'
            : isPutra
            ? 'from-[#7F1D1D] via-[#991B1B] to-[#651515]'
            : 'from-[#4B1E78] via-[#5B21B6] to-[#3B1561]';

          const roleBadgeBg = isPembina
            ? 'bg-[#B45309] text-white'
            : isPutra
            ? 'bg-[#C81E1E] text-white'
            : 'bg-[#6B21A8] text-white';

          const frameBorderColor = isPembina
            ? 'border-[#D97706]'
            : isPutra
            ? 'border-[#C81E1E]'
            : 'border-[#6B21A8]';

          const initials = card.nama
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('');

          const isUploading = uploadingCardId === card.id;

          return (
            <div key={card.id} className="flex flex-col items-center space-y-3">
              {/* PORTRAIT ID CARD CONTAINER (Height 11 cm, Matches renderIdCardToCanvas 1:1) */}
              <div className="w-full max-w-[325px] h-[11cm] rounded-3xl bg-[#FAF7F2] border-[3px] border-[#4A2C11] shadow-md overflow-hidden flex flex-col justify-between relative">
                {/* TOP HEADER BLOCK */}
                <div>
                  <div
                    className={`bg-gradient-to-b ${headerGradient} px-3.5 pt-2 pb-2.5 text-white text-center relative`}
                  >
                    {/* Lanyard Hole Visual */}
                    <div className="w-12 h-1.5 rounded-full bg-[#FAF7F2] mx-auto mb-1.5 shadow-inner" />

                    <div className="flex items-center justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                        <TunasKelapaLogo className="w-6 h-7 text-[#23170D]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-extrabold tracking-wide text-[#F3D299] leading-tight">
                          GERAKAN PRAMUKA KWARRAN
                        </p>
                        <p className="text-[11px] font-extrabold tracking-wide text-[#F3D299] leading-tight mt-0.5">
                          KECAMATAN MUARA KAMAN
                        </p>
                        <h4 className="text-[16px] font-extrabold tracking-tight text-white mt-0.5 leading-none">
                          PESTA PENGGALANG
                        </h4>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                        <WosmLogo className="w-7 h-7" />
                      </div>
                    </div>
                  </div>

                  {/* Pita Merah Putih Kacu Pramuka */}
                  <div className="h-2 w-full flex border-b border-[#D8CEBE]">
                    <div className="w-1/2 h-full bg-[#C81E1E]" />
                    <div className="w-1/2 h-full bg-white" />
                  </div>
                </div>

                {/* CENTER WIDENED ROUNDED PHOTO FRAME & ENLARGED IDENTITY TEXT */}
                <div className="px-3.5 py-1.5 flex-1 flex flex-col items-center justify-between text-center">
                  {/* Widened Portrait Photo Frame with All Corners Rounded */}
                  <div className="relative group">
                    <div
                      className={`w-[98px] h-[120px] rounded-2xl border-4 ${frameBorderColor} bg-white shadow-sm overflow-hidden flex items-center justify-center relative`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-[#4A2C11] p-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#C81E1E]" />
                          <span className="text-[9px] font-bold">Menyimpan...</span>
                        </div>
                      ) : card.customPhotoUrl ? (
                        <>
                          <img
                            src={card.customPhotoUrl}
                            alt={card.nama}
                            className="w-full h-full object-cover"
                          />
                          {/* Green badge indicator on card */}
                          <div
                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[8px] font-bold flex items-center gap-0.5 shadow-xs"
                            title="Tersimpan di Local & Server"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Tersimpan</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#4A2C11] px-2">
                          <span className="text-3xl font-extrabold tracking-tight">
                            {initials || 'GP'}
                          </span>
                          <span className="text-[10px] font-extrabold text-[#7A5C3E] mt-1">
                            PRAMUKA
                          </span>
                          <span className="text-[9px] font-semibold text-[#A38B73] mt-0.5">
                            PASFOTO 4x6
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls for Photo (Upload / Ganti & Hapus) */}
                    <div className="no-print absolute -bottom-1 -right-1 flex items-center gap-1">
                      {card.customPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(card.id, card.nama)}
                          title="Hapus Pasfoto"
                          className="w-7 h-7 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <label
                        htmlFor={`photo-upload-${card.id}`}
                        title={card.customPhotoUrl ? 'Ganti Pasfoto 4x6' : 'Unggah Pasfoto 4x6'}
                        className="w-7 h-7 rounded-xl bg-[#4A2C11] hover:bg-[#C81E1E] text-white flex items-center justify-center shadow-md cursor-pointer transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          id={`photo-upload-${card.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(card.id, card.nama, e)}
                          className="sr-only"
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Role / Category Ribbon & Name Block */}
                  <div className="w-full flex flex-col items-center">
                    <div
                      className={`px-4 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider ${roleBadgeBg} shadow-2xs`}
                    >
                      {card.kategori}
                    </div>

                    {/* Full Name */}
                    <h5 className="mt-1 text-[16.5px] font-extrabold text-[#23170D] leading-tight line-clamp-1 px-1">
                      {card.nama}
                    </h5>

                    {/* Jabatan / Peran */}
                    <p className="text-xs font-bold text-[#7A5C3E]">
                      {card.jabatan}
                    </p>
                  </div>

                  {/* Details Table Card */}
                  <div className="w-full bg-white rounded-2xl border border-[#E5DEC9] px-3 py-1.5 text-left text-[12px] space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-b border-[#F3ECE0] pb-0.5">
                      <span className="text-[#6B5744] font-semibold shrink-0">Pangkalan</span>
                      <span className="font-extrabold text-[#23170D] text-right truncate">
                        {card.namaSekolah}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b border-[#F3ECE0] pb-0.5">
                      <span className="text-[#6B5744] font-semibold shrink-0">
                        {card.nipAtauReguLabel}
                      </span>
                      <span className="font-mono-num font-bold text-[#23170D] text-right truncate">
                        {card.nipAtauReguValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#6B5744] font-semibold shrink-0">ID Kartu</span>
                      <span className="font-mono-num font-extrabold text-[#4A2C11] text-right">
                        {card.nomorKartu}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM FOOTER BAND */}
                <div
                  className={`bg-gradient-to-r ${headerGradient} py-1.5 px-3 text-center text-[10px] font-extrabold tracking-wider text-[#F3D299]`}
                >
                  PANITIA PESTA PENGGALANG KEC. MUARA KAMAN
                </div>
              </div>

              {/* Action Buttons Under Each Card (PDF & PNG) */}
              <div className="no-print w-full max-w-[325px] grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePdf(card)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#4A2C11] hover:bg-[#361F0B] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  {downloadingId === `${card.id}-pdf` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>PDF Diunduh!</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5 text-[#F3D299]" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSinglePng(card)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  {downloadingId === `${card.id}-png` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>PNG Diunduh!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-[#C81E1E]" />
                      <span>Unduh PNG</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
