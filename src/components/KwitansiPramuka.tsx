import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Check,
  ShieldCheck,
  FileText,
  CreditCard,
  X,
  Upload,
  RotateCcw,
  Edit3,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  SubmittedRegistration,
  formatRupiah,
} from '../types/registration';
import { terbilangRupiah } from '../utils/terbilang';
import {
  TunasKelapaLogo,
  WosmLogo,
} from './PramukaEmblems';
import {
  downloadKwitansiAsPdf,
  downloadKwitansiAsPng,
  formatKwitansiDate,
} from '../utils/downloadHelpers';
import {
  getActiveSignature,
  saveCustomSignature,
  resetCustomSignature,
  hasCustomSignature,
} from '../utils/signatureAsset';

interface KwitansiPramukaProps {
  registration: SubmittedRegistration;
  onClose?: () => void;
  isModal?: boolean;
}

export const KwitansiPramuka: React.FC<KwitansiPramukaProps> = ({
  registration,
  onClose,
  isModal = false,
}) => {
  const kwitansiRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>(getActiveSignature());
  const [isCustomSig, setIsCustomSig] = useState<boolean>(hasCustomSignature());

  // Default values
  const defaultUangSejumlah = terbilangRupiah(registration.totalBiaya);
  const defaultUntukKeperluan = 'Kontribusi Perkemahan Pesta Penggalang';
  const defaultCatatan = 'Pembayaran Via Transfer';
  const defaultTerbilangNominal = formatRupiah(registration.totalBiaya);

  // Editable fields state
  const [uangSejumlah, setUangSejumlah] = useState(defaultUangSejumlah);
  const [untukKeperluan, setUntukKeperluan] = useState(defaultUntukKeperluan);
  const [catatan, setCatatan] = useState(defaultCatatan);
  const [terbilangNominal, setTerbilangNominal] = useState(defaultTerbilangNominal);

  // Edit panel toggle state
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

  // Update defaults when registration changes
  useEffect(() => {
    setUangSejumlah(terbilangRupiah(registration.totalBiaya));
    setUntukKeperluan('Kontribusi Perkemahan Pesta Penggalang');
    setCatatan('Pembayaran Via Transfer');
    setTerbilangNominal(formatRupiah(registration.totalBiaya));
  }, [registration.id, registration.totalBiaya]);

  const isCustomized =
    uangSejumlah !== defaultUangSejumlah ||
    untukKeperluan !== defaultUntukKeperluan ||
    catatan !== defaultCatatan ||
    terbilangNominal !== defaultTerbilangNominal;

  const handleResetFields = () => {
    setUangSejumlah(defaultUangSejumlah);
    setUntukKeperluan(defaultUntukKeperluan);
    setCatatan(defaultCatatan);
    setTerbilangNominal(defaultTerbilangNominal);
  };

  const handleAutoTerbilangFromNominal = () => {
    // Extract numbers from nominal
    const numOnly = terbilangNominal.replace(/[^0-9]/g, '');
    if (numOnly) {
      const val = parseInt(numOnly, 10);
      if (!isNaN(val) && val > 0) {
        setUangSejumlah(terbilangRupiah(val));
      }
    }
  };

  // Tanggal Kwitansi Resmi dengan Tahun (Muara Kaman, 13 Oktober 2026)
  const dateDisplay = formatKwitansiDate(registration.tanggalDaftar);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadKwitansiAsPdf(registration, {
        uangSejumlah,
        untukKeperluan,
        catatan,
        terbilangNominal,
      });
    } finally {
      setTimeout(() => setDownloadingPdf(false), 1200);
    }
  };

  const handleDownloadPng = async () => {
    setDownloadingPng(true);
    try {
      await downloadKwitansiAsPng(registration, {
        uangSejumlah,
        untukKeperluan,
        catatan,
        terbilangNominal,
      });
    } finally {
      setTimeout(() => setDownloadingPng(false), 1200);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        saveCustomSignature(result);
        setSignatureImage(result);
        setIsCustomSig(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetSignature = () => {
    resetCustomSignature();
    setSignatureImage(getActiveSignature());
    setIsCustomSig(false);
  };

  return (
    <div className={`space-y-4 ${isModal ? 'p-1 sm:p-2' : ''}`}>
      {/* Control Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5DEC9] shadow-2xs no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#4A2C11] text-white flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#F3D299]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[#23170D]">
                Kwitansi Pembayaran Resmi (18 x 7 cm)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF3E0] text-[#7A4C1E] border border-[#E5DEC9]">
                Format 18 x 7 cm
              </span>
              {isCustomized && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Diedit
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B5744]">
              {registration.namaSekolah} · Bendahara: Susilawati, S.Pd.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Toggle Panel Edit Teks */}
          <button
            type="button"
            onClick={() => setIsEditPanelOpen(!isEditPanelOpen)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isEditPanelOpen
                ? 'bg-[#4A2C11] text-white border-[#4A2C11]'
                : 'bg-[#FAF3E0] hover:bg-[#F3E6C8] text-[#7A4C1E] border-[#E0D3B8]'
            }`}
            title="Buka panel untuk mengedit teks Kwitansi"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isEditPanelOpen ? 'Tutup Panel Edit' : 'Edit Teks Kwitansi'}</span>
          </button>

          {/* Reset Teks ke Default jika ada perubahan */}
          {isCustomized && (
            <button
              type="button"
              onClick={handleResetFields}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs flex items-center gap-1 cursor-pointer"
              title="Kembalikan semua teks ke bawaan pendaftaran"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Teks</span>
            </button>
          )}

          {/* Input file untuk unggah gambar tanda tangan kustom jika diinginkan */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FAF3E0] hover:bg-[#F3E6C8] text-[#7A4C1E] border border-[#E0D3B8] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Upload gambar tanda tangan (opsional)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload TTD</span>
          </button>

          {isCustomSig && (
            <button
              type="button"
              onClick={handleResetSignature}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
              title="Hapus gambar tanda tangan kustom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hapus TTD</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#4A2C11] hover:bg-[#38210D] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak (18x7 cm)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            {downloadingPdf ? (
              <>
                <Check className="w-4 h-4" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh PDF (18x7 cm)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloadingPng}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            {downloadingPng ? (
              <>
                <Check className="w-4 h-4 text-[#15803D]" />
                <span>Menyimpan PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh PNG</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* PANEL EDIT TEKS KWITANSI (Collapsible Drawer) */}
      {isEditPanelOpen && (
        <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border-2 border-[#C8A97E]/70 shadow-sm space-y-3.5 no-print animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E5DEC9]">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#7A4C1E]" />
              <h4 className="font-bold text-sm text-[#4A2C11]">
                Edit Isi Teks Kwitansi Pembayaran
              </h4>
              <span className="text-[11px] text-[#7A5C3E] italic">
                (Perubahan langsung terlihat pada kwitansi, cetakan, dan unduhan)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoTerbilangFromNominal}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF3E0] hover:bg-[#F3E6C8] text-[#7A4C1E] border border-[#E0D3B8] font-bold flex items-center gap-1 cursor-pointer"
                title="Sesuaikan ejaan terbilang dari angka nominal"
              >
                <Sparkles className="w-3 h-3 text-[#B45309]" />
                <span>Eja Ulang Terbilang</span>
              </button>
              <button
                type="button"
                onClick={handleResetFields}
                className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold flex items-center gap-1 cursor-pointer"
                title="Kembalikan semua teks ke default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Bawaan</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Uang Sejumlah (Terbilang) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A2C11] block flex items-center justify-between">
                <span>1. Uang Sejumlah (Terbilang):</span>
                <span className="text-[10px] text-[#8C6D46] font-normal">Huruf/Kalimat</span>
              </label>
              <textarea
                rows={2}
                value={uangSejumlah}
                onChange={(e) => setUangSejumlah(e.target.value)}
                placeholder="Contoh: Tujuh Ratus Ribu Rupiah"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[#D8CEBE] bg-white focus:bg-[#FFFDF9] focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] text-[#23170D] font-serif italic outline-none transition"
              />
            </div>

            {/* 2. Terbilang Nominal (Angka / Format Rp) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A2C11] block flex items-center justify-between">
                <span>2. Terbilang Nominal (Angka):</span>
                <span className="text-[10px] text-[#8C6D46] font-normal">Format Rp</span>
              </label>
              <input
                type="text"
                value={terbilangNominal}
                onChange={(e) => setTerbilangNominal(e.target.value)}
                placeholder="Contoh: Rp 700.000,-"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D8CEBE] bg-white focus:bg-[#FFFDF9] focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] text-[#23170D] font-mono font-bold outline-none transition"
              />
            </div>

            {/* 3. Untuk Keperluan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A2C11] block">
                3. Untuk Keperluan:
              </label>
              <input
                type="text"
                value={untukKeperluan}
                onChange={(e) => setUntukKeperluan(e.target.value)}
                placeholder="Contoh: Kontribusi Perkemahan Pesta Penggalang"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D8CEBE] bg-white focus:bg-[#FFFDF9] focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] text-[#23170D] font-semibold outline-none transition"
              />
            </div>

            {/* 4. Catatan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A2C11] block">
                4. Catatan:
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Pembayaran Via Transfer"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D8CEBE] bg-white focus:bg-[#FFFDF9] focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] text-[#23170D] font-semibold outline-none transition"
              />
            </div>
          </div>

          <p className="text-[11px] text-[#7A5C3E] italic">
            💡 Tips: Anda juga dapat langsung mengklik dan mengedit teks tersebut pada lembar kwitansi di bawah.
          </p>
        </div>
      )}

      {/* Kwitansi Printable Canvas Sheet (Ukuran 18 x 7 cm) - TAMPIL LENGKAP SEMUA PADA PRATINJAU */}
      <div className="w-full overflow-x-auto pb-4">
        <div
          ref={kwitansiRef}
          id="kwitansi-print-area"
          className="w-full max-w-[920px] mx-auto bg-[#FDFBF7] text-[#23170D] rounded-2xl border-4 border-[#4A2C11] shadow-lg p-4 sm:p-6 relative select-none print:border-2 print:shadow-none print:m-0 print:p-2.5 print:rounded-none flex flex-col justify-between"
          style={{
            fontFamily: '"Plus Jakarta Sans", "Georgia", serif',
          }}
        >
          {/* Watermark Logo Siluet Tunas Kelapa Transparan di Tengah */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none overflow-hidden"
            aria-hidden="true"
          >
            <TunasKelapaLogo className="w-[300px] h-[300px] text-[#4A2C11]" />
          </div>

          {/* Double Frame Classic Guilloche Border Lines */}
          <div className="absolute inset-1.5 sm:inset-2.5 border-2 border-dashed border-[#C8A97E]/70 rounded-xl pointer-events-none" />
          <div className="absolute inset-2.5 sm:inset-4 border border-[#8C6D46]/40 rounded-lg pointer-events-none" />

          {/* Ornamen Pita Merah Putih Kacu Pramuka di Atas */}
          <div className="h-1.5 sm:h-2 w-full flex rounded-t mb-2 sm:mb-2.5 print:mb-1 overflow-hidden border border-[#D8CEBE]">
            <div className="w-1/2 bg-[#C81E1E]" />
            <div className="w-1/2 bg-white" />
          </div>

          {/* TOP HEADER: Tunas Kelapa (Kiri), Judul KWITANSI PEMBAYARAN (Tengah), Pandu Dunia WOSM (Kanan) - TANPA KOP */}
          <div className="flex items-center justify-between gap-3 pb-2 sm:pb-2.5 print:pb-1 border-b-2 border-[#4A2C11] relative z-10">
            {/* Logo Siluet Tunas Kelapa (Kiri) */}
            <div className="w-11 h-11 sm:w-14 sm:h-14 print:w-10 print:h-10 rounded-xl bg-[#4A2C11] text-[#F3D299] p-1.5 flex items-center justify-center shrink-0 shadow-2xs border-2 border-[#C8A97E]">
              <TunasKelapaLogo className="w-8 h-9 sm:w-11 sm:h-12 print:w-8 print:h-8 text-[#F3D299]" />
            </div>

            {/* Judul Kwitansi Pembayaran (Tengah) - BESAR & JELAS */}
            <div className="text-center flex-1 px-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl print:text-lg font-black tracking-wider text-[#4A2C11] uppercase font-serif">
                KWITANSI PEMBAYARAN
              </h1>
              <div className="w-28 sm:w-44 print:w-28 h-0.5 bg-[#C8A97E] mx-auto mt-1" />
            </div>

            {/* Logo Tanda Pandu Dunia / WOSM (Kanan) */}
            <div className="w-11 h-11 sm:w-14 sm:h-14 print:w-10 print:h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border-2 border-[#4B1E78]/30">
              <WosmLogo className="w-9 h-9 sm:w-12 sm:h-12 print:w-8 print:h-8" />
            </div>
          </div>

          {/* ISI DETAIL KWITANSI - FONT BESAR, TEGAS & JELAS (DAPAT DIEDIT) */}
          <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base relative z-10 print:mt-1 print:space-y-1">
            {/* 1. Telah terima dari : [Hanya nama sekolah] */}
            <div className="flex items-baseline gap-2 sm:gap-3 pb-1 sm:pb-1.5 border-b border-[#E5DEC9] print:pb-0.5">
              <div className="w-36 sm:w-48 font-bold text-[#4A2C11] shrink-0 flex items-center justify-between text-xs sm:text-sm md:text-base print:text-[11px] print:w-32">
                <span>Telah terima dari</span>
                <span>:</span>
              </div>
              <div className="flex-1 font-black text-[#23170D] text-sm sm:text-base md:text-lg print:text-xs">
                {registration.namaSekolah}
              </div>
            </div>

            {/* 2. Uang sejumlah : [Terbilang - BISA DIEDIT LANGSUNG] */}
            <div className="flex items-center gap-2 sm:gap-3 pb-1 sm:pb-1.5 border-b border-[#E5DEC9] print:pb-0.5">
              <div className="w-36 sm:w-48 font-bold text-[#4A2C11] shrink-0 flex items-center justify-between text-xs sm:text-sm md:text-base print:text-[11px] print:w-32">
                <span>Uang sejumlah</span>
                <span>:</span>
              </div>
              <div className="flex-1">
                <div className="bg-[#FAF3E0] px-3 py-1 sm:py-1.5 rounded-lg border border-[#E0D3B8] italic font-serif font-bold text-[#4A2C11] text-xs sm:text-sm md:text-base leading-snug print:text-[11px] print:py-0.5 flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#4A2C11]/30 group">
                  <span className="select-none text-[#7A4C1E]">&ldquo;</span>
                  <input
                    type="text"
                    value={uangSejumlah}
                    onChange={(e) => setUangSejumlah(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none p-0 text-[#4A2C11] font-bold font-serif italic text-xs sm:text-sm md:text-base print:text-[11px] focus:ring-0"
                    title="Klik untuk mengedit Uang Sejumlah"
                    placeholder="Uang sejumlah (terbilang)..."
                  />
                  <span className="select-none text-[#7A4C1E]">&rdquo;</span>
                  <Edit3 className="w-3 h-3 text-[#C8A97E] opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0" />
                </div>
              </div>
            </div>

            {/* 3. Untuk Keperluan : [BISA DIEDIT LANGSUNG] */}
            <div className="flex items-baseline gap-2 sm:gap-3 pb-1 sm:pb-1.5 border-b border-[#E5DEC9] print:pb-0.5">
              <div className="w-36 sm:w-48 font-bold text-[#4A2C11] shrink-0 flex items-center justify-between text-xs sm:text-sm md:text-base print:text-[11px] print:w-32">
                <span>Untuk Keperluan</span>
                <span>:</span>
              </div>
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={untukKeperluan}
                  onChange={(e) => setUntukKeperluan(e.target.value)}
                  className="w-full bg-transparent border-b border-transparent hover:border-[#C8A97E]/70 focus:border-[#4A2C11] focus:bg-[#FAF3E0]/30 rounded px-1 -mx-1 py-0.5 outline-none font-extrabold text-[#23170D] text-xs sm:text-sm md:text-base print:text-[11px] print:border-none print:p-0 print:m-0"
                  title="Klik untuk mengedit Untuk Keperluan"
                  placeholder="Untuk keperluan..."
                />
                <Edit3 className="w-3 h-3 text-[#C8A97E] opacity-0 group-hover:opacity-100 transition-opacity no-print absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Catatan : [BISA DIEDIT LANGSUNG] */}
            <div className="flex items-center gap-2 sm:gap-3 pb-1 sm:pb-1.5 border-b border-[#E5DEC9] print:pb-0.5">
              <div className="w-36 sm:w-48 font-bold text-[#4A2C11] shrink-0 flex items-center justify-between text-xs sm:text-sm md:text-base print:text-[11px] print:w-32">
                <span>Catatan</span>
                <span>:</span>
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-[#14532D] font-bold text-xs sm:text-sm print:text-[10px] print:py-0.5 focus-within:ring-2 focus-within:ring-[#15803D]/30 group">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#15803D]" />
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="bg-transparent border-0 outline-none p-0 text-[#14532D] font-bold text-xs sm:text-sm print:text-[10px] min-w-[200px]"
                    title="Klik untuk mengedit Catatan"
                    placeholder="Catatan pembayaran..."
                  />
                  <Edit3 className="w-3 h-3 text-[#15803D]/70 opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN BAWAH: NOMINAL BOX & TANDA TANGAN BENDAHARA */}
          {/* Terbilang Nominal Bisa Diedit Langsung */}
          <div className="mt-3 sm:mt-4 grid grid-cols-12 gap-3 sm:gap-4 items-end relative z-10 print:mt-1.5 print:gap-2">
            {/* Box Nominal Rp & Status Lunas (Kiri) - BISA DIEDIT LANGSUNG */}
            <div className="col-span-6 sm:col-span-5 space-y-1.5 sm:space-y-2 print:space-y-1">
              <div className="bg-[#4A2C11] text-[#FAF7F2] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-[#C8A97E] shadow-2xs print:px-2.5 print:py-1 group relative focus-within:ring-2 focus-within:ring-[#F3D299]/50">
                <div className="flex items-center justify-between mb-0.5 print:mb-0">
                  <span className="text-[10px] sm:text-xs font-serif italic text-[#F3D299] block font-semibold print:text-[9px] tracking-wide">
                    Terbilang Nominal :
                  </span>
                  <Edit3 className="w-3 h-3 text-[#F3D299]/60 opacity-0 group-hover:opacity-100 transition-opacity no-print" />
                </div>
                <input
                  type="text"
                  value={terbilangNominal}
                  onChange={(e) => setTerbilangNominal(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none p-0 text-base sm:text-xl md:text-2xl font-black font-mono-num text-[#F3D299] tracking-wider leading-snug print:text-sm placeholder-[#F3D299]/40"
                  title="Klik untuk mengedit Terbilang Nominal"
                  placeholder="Rp 0,-"
                />
              </div>

              {/* Status Badge Lunas */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#15803D] bg-[#F0FDF4] text-[#15803D] font-black text-[11px] sm:text-xs print:text-[9px] print:py-0.5">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>LUNAS / TERVERIFIKASI</span>
              </div>
            </div>

            {/* Tanda Tangan Bendahara Susilawati, S.Pd. (Kanan) - JARAK DITINGGIKAN & DISESUAIKAN */}
            <div className="col-span-6 sm:col-span-7 flex flex-col items-end text-right">
              {/* Tanggal dengan Tahun: Muara Kaman, 13 Oktober 2026 */}
              <p className="text-xs sm:text-sm font-semibold text-[#4A2C11] print:text-[10px]">
                {dateDisplay}
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#4A2C11] mt-0.5 print:text-[10px]">
                Bendahara,
              </p>

              {/* Area Tanda Tangan: DITINGGIKAN & DISESUAIKAN (Jarak Tinggi & Luas untuk Tanda Tangan Basah) */}
              <div className="relative w-48 sm:w-64 print:w-48 h-32 sm:h-40 md:h-44 print:h-20 my-1.5 sm:my-2 print:my-0.5 flex items-center justify-end">
                {/* Gambar Tanda Tangan HANYA jika ada unggahan kustom oleh user */}
                {signatureImage && signatureImage.trim() !== '' && (
                  <div className="relative z-10 flex items-center justify-end">
                    <img
                      src={signatureImage}
                      alt="Tanda Tangan Bendahara Susilawati, S.Pd."
                      className="w-44 sm:w-60 print:w-40 h-28 sm:h-36 print:h-18 object-contain pointer-events-none select-none drop-shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Nama Terang Susilawati, S.Pd. (Ditebalkan & Bergaris Bawah) */}
              <div className="border-t-2 border-[#4A2C11] pt-1 min-w-[170px] sm:min-w-[210px] print:min-w-[140px] text-right">
                <p className="font-black text-[#4A2C11] text-xs sm:text-sm md:text-base print:text-[11px] tracking-wide underline decoration-[#4A2C11] decoration-2 underline-offset-4">
                  Susilawati, S.Pd.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
