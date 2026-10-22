import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  Download,
  PlusCircle,
  MessageCircle,
  FileCheck2,
  Building2,
  Users,
  CreditCard,
  ArrowLeft,
  IdCard,
  FileText,
  Receipt,
  Edit3,
} from 'lucide-react';
import {
  SubmittedRegistration,
  INFO_PEMBAYARAN,
  formatRupiah,
  buildWhatsAppMessage,
  formatTtlDisplay,
} from '../types/registration';
import {
  downloadReceiptAsPdf,
  downloadPaymentProofFile,
} from '../utils/downloadHelpers';
import { TunasKelapaLogo, WosmLogo } from './PramukaEmblems';
import { IdCardsShowcase } from './IdCardsShowcase';
import { KwitansiPramuka } from './KwitansiPramuka';
import { AdminEditModal } from './AdminEditModal';

interface SubmissionSuccessViewProps {
  registration: SubmittedRegistration;
  onCreateNew: () => void;
  onBackToHistory?: () => void;
  initialSubTab?: 'receipt' | 'cards' | 'kwitansi';
  onEdit?: (updated: SubmittedRegistration) => void;
}

export const SubmissionSuccessView: React.FC<SubmissionSuccessViewProps> = ({
  registration,
  onCreateNew,
  onBackToHistory,
  initialSubTab = 'receipt',
  onEdit,
}) => {
  const [subTab, setSubTab] = useState<'receipt' | 'cards' | 'kwitansi'>(initialSubTab);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedWaText, setCopiedWaText] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [downloadedProof, setDownloadedProof] = useState(false);

  const waMessage = buildWhatsAppMessage(registration, registration.nomorRegistrasi);
  const waHref = `https://wa.me/${INFO_PEMBAYARAN.waPanitiaInternational}?text=${encodeURIComponent(
    waMessage
  )}`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(waMessage);
      setCopiedWaText(true);
      setTimeout(() => setCopiedWaText(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(INFO_PEMBAYARAN.waPanitiaDisplay);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      await downloadReceiptAsPdf(registration);
    } finally {
      setTimeout(() => setDownloadingReceipt(false), 1200);
    }
  };

  const handleDownloadProof = () => {
    downloadPaymentProofFile(registration);
    setDownloadedProof(true);
    setTimeout(() => setDownloadedProof(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Navigasi Atas & Pemilih Tampilan (Bukti Pendaftaran vs Kartu Nama Portrait) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToHistory ? (
            <button
              type="button"
              onClick={onBackToHistory}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5DEC9] text-[#4A2C11] font-semibold text-xs sm:text-sm hover:bg-[#F5EFE6] active:scale-[0.99] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <div />
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
              title="Edit nama sekolah, kepala sekolah, pembina, atau peserta yang salah input"
            >
              <Edit3 className="w-4 h-4 text-[#BFDBFE]" />
              <span>Edit Data</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#E5DEC9] shadow-2xs">
          <button
            type="button"
            onClick={() => setSubTab('receipt')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === 'receipt'
                ? 'bg-[#4A2C11] text-white shadow-xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bukti Pendaftaran</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kwitansi')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === 'kwitansi'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            <Receipt className="w-4 h-4 text-[#F3D299]" />
            <span>Kwitansi Pembayaran Resmi</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cards')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === 'cards'
                ? 'bg-[#C81E1E] text-white shadow-xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            <IdCard className="w-4 h-4" />
            <span>Kartu Peserta (20 Kartu)</span>
          </button>
        </div>
      </div>

      {subTab === 'cards' ? (
        <IdCardsShowcase
          registration={registration}
          onSavePhotos={(allPhotos) => {
            if (onEdit) {
              onEdit({
                ...registration,
                fotoPeserta: allPhotos,
              });
            }
          }}
        />
      ) : subTab === 'kwitansi' ? (
        <KwitansiPramuka registration={registration} />
      ) : (
        <div className="bg-white rounded-3xl border border-[#E5DEC9] shadow-sm overflow-hidden">
          {/* Banner Berhasil */}
          <div className="bg-gradient-to-r from-[#14532D] via-[#15803D] to-[#166534] px-6 py-7 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-100">
                    Formulir Pendaftaran Berhasil Dikirim · {registration.tanggalDaftar}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-balance">
                    Pendaftaran Sekolah Telah Diterima
                  </h2>
                  <p className="text-sm text-emerald-50 mt-1">
                    Nomor Registrasi:{' '}
                    <span className="font-mono-num font-semibold underline decoration-emerald-300/60">
                      {registration.nomorRegistrasi}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubTab('cards')}
                className="no-print min-h-[48px] px-4 py-2.5 rounded-2xl bg-white text-[#14532D] hover:bg-emerald-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
              >
                <IdCard className="w-5 h-5 text-[#C81E1E]" />
                <span>Lihat 20 Kartu Peserta & Pembina</span>
              </button>
            </div>
          </div>

          {/* Instruksi Wajib Konfirmasi WhatsApp Panitia */}
          <div className="p-6 sm:p-8 bg-[#F0FDF4] border-b border-[#DCFCE7] no-print">
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-[#14532D]">
                Langkah Terakhir: Konfirmasi ke WhatsApp Panitia
              </h3>
              <p className="text-sm text-[#166534] mt-1.5 leading-relaxed">
                Sesuai ketentuan pendaftaran Pesta Penggalang Kecamatan Muara Kaman, silakan tekan
                tombol di bawah ini untuk mengirim konfirmasi pendaftaran beserta lampiran bukti
                transfer ke nomor WhatsApp Panitia:{' '}
                <span className="font-mono-num font-bold text-[#14532D]">
                  {INFO_PEMBAYARAN.waPanitiaDisplay}
                </span>
                .
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[56px] px-6 py-3.5 rounded-2xl bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-base flex items-center justify-center gap-3 shadow-md active:scale-[0.99] transition-all text-center"
              >
                <MessageCircle className="w-6 h-6 shrink-0" />
                <span>Konfirmasi via WhatsApp ({INFO_PEMBAYARAN.waPanitiaDisplay})</span>
              </a>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-[#14532D] border-2 border-[#15803D]/30 font-semibold text-sm flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all cursor-pointer"
              >
                {copiedWaText ? (
                  <>
                    <Check className="w-5 h-5 text-[#15803D] shrink-0" />
                    <span>Format Pesan WA Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 shrink-0" />
                    <span>Salin Teks Konfirmasi WhatsApp</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#166534]">
              <span>
                Nomor WhatsApp Panitia:{' '}
                <strong className="font-mono-num">{INFO_PEMBAYARAN.waPanitiaDisplay}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="underline font-semibold hover:text-[#14532D] min-h-[36px] px-2 cursor-pointer"
              >
                {copiedPhone ? 'Nomor WA Disalin!' : 'Salin Nomor WA Panitia'}
              </button>
            </div>

            {/* Tautan WA Group Pesta Penggalang Kec. Muara Kaman */}
            <div className="mt-4 pt-4 border-t border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/80 p-4 rounded-2xl border border-[#BBF7D0]">
              <div className="space-y-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#14532D] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span>{INFO_PEMBAYARAN.waGroupName}</span>
                </p>
                <p className="text-xs sm:text-sm text-[#166534] break-all">
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

          {/* Bukti Pendaftaran Resmi */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Kop Bukti Pendaftaran */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-[#E5DEC9] text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center shrink-0">
                  <TunasKelapaLogo className="w-8 h-10 text-[#4A2C11]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7A5C3E]">
                    GERAKAN PRAMUKA KWARTIR RANTING KECAMATAN MUARA KAMAN
                  </p>
                  <h3 className="text-lg font-bold text-[#23170D]">
                    BUKTI PENDAFTARAN PESERTA PESTA PENGGALANG
                  </h3>
                  <p className="text-xs text-[#6B5744] font-mono-num mt-0.5">
                    ID: {registration.nomorRegistrasi} · Terdaftar: {registration.tanggalDaftar}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] shrink-0">
                <WosmLogo className="w-9 h-9" />
              </div>
            </div>

            {/* 1. Data Sekolah & Pembina */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#4A2C11]">
                  <Building2 className="w-4 h-4 text-[#C81E1E]" />
                  <span>Identitas Sekolah & Kepala Sekolah</span>
                </div>
                <dl className="bg-[#FAF7F2] rounded-2xl p-4 space-y-2.5 text-sm border border-[#E5DEC9]/80">
                  <div>
                    <dt className="text-xs text-[#6B5744]">Nama Sekolah / Pangkalan</dt>
                    <dd className="font-bold text-[#23170D] text-base mt-0.5">
                      {registration.namaSekolah}
                    </dd>
                  </div>
                  <div className="pt-2 border-t border-[#E5DEC9]/70">
                    <dt className="text-xs text-[#6B5744]">Nama Kepala Sekolah (Kamabigus)</dt>
                    <dd className="font-semibold text-[#23170D] mt-0.5">
                      {registration.namaKepalaSekolah}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#6B5744]">NIP Kepala Sekolah</dt>
                    <dd className="font-mono-num font-medium text-[#4A2C11] mt-0.5">
                      {registration.nipKepalaSekolah}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#4A2C11]">
                  <Users className="w-4 h-4 text-[#4B1E78]" />
                  <span>Data Pembina Pendamping (Putra & Putri)</span>
                </div>
                <dl className="bg-[#FAF7F2] rounded-2xl p-4 space-y-3 text-sm border border-[#E5DEC9]/80">
                  <div>
                    <dt className="text-xs font-semibold text-[#7A5C3E]">
                      Pembina Pendamping Putra 1 & 2
                    </dt>
                    <dd className="font-semibold text-[#23170D] mt-1">
                      1. {registration.namaPembinaPutra}
                    </dd>
                    <dd className="text-xs font-mono-num text-[#6B5744]">
                      NIP: {registration.nipPembinaPutra}
                    </dd>
                    <dd className="font-semibold text-[#23170D] mt-1.5">
                      2. {registration.namaPembinaPutra2 || '-'}
                    </dd>
                    <dd className="text-xs font-mono-num text-[#6B5744]">
                      NIP: {registration.nipPembinaPutra2 || '-'}
                    </dd>
                  </div>
                  <div className="pt-2.5 border-t border-[#E5DEC9]/70">
                    <dt className="text-xs font-semibold text-[#4B1E78]">
                      Pembina Pendamping Putri 1 & 2
                    </dt>
                    <dd className="font-semibold text-[#23170D] mt-1">
                      1. {registration.namaPembinaPutri}
                    </dd>
                    <dd className="text-xs font-mono-num text-[#6B5744]">
                      NIP: {registration.nipPembinaPutri}
                    </dd>
                    <dd className="font-semibold text-[#23170D] mt-1.5">
                      2. {registration.namaPembinaPutri2 || '-'}
                    </dd>
                    <dd className="text-xs font-mono-num text-[#6B5744]">
                      NIP: {registration.nipPembinaPutri2 || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* 2. Daftar Peserta Putra & Putri (Masing-masing 8 Orang) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FAF7F2] rounded-2xl p-5 border border-[#E5DEC9]/80">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5DEC9]">
                  <div>
                    <h4 className="font-bold text-[#23170D] text-sm">
                      Daftar Peserta Regu Putra (8 Orang)
                    </h4>
                    {registration.namaReguPutra && (
                      <p className="text-xs text-[#6B5744] mt-0.5">
                        Nama Regu: <strong>{registration.namaReguPutra}</strong>
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono-num text-[#4A2C11] font-semibold">
                    8 Peserta
                  </span>
                </div>
                <ol className="space-y-2 text-sm">
                  {registration.pesertaPutra.map((nama, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between py-1.5 border-b border-[#E5DEC9]/50 last:border-none"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#4A2C11] text-white font-mono-num text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-[#23170D]">{nama}</div>
                          <div className="text-xs text-[#6B5744]">
                            TTL:{' '}
                            {formatTtlDisplay(
                              registration.tempatLahirPutra?.[idx],
                              registration.tanggalLahirPutra?.[idx]
                            )}
                          </div>
                        </div>
                      </div>
                      {idx === 0 && (
                        <span className="text-xs text-[#7A5C3E] font-medium">Pinru</span>
                      )}
                      {idx === 1 && (
                        <span className="text-xs text-[#7A5C3E] font-medium">Wapinru</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-[#FAF7F2] rounded-2xl p-5 border border-[#E5DEC9]/80">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5DEC9]">
                  <div>
                    <h4 className="font-bold text-[#23170D] text-sm">
                      Daftar Peserta Regu Putri (8 Orang)
                    </h4>
                    {registration.namaReguPutri && (
                      <p className="text-xs text-[#6B5744] mt-0.5">
                        Nama Regu: <strong>{registration.namaReguPutri}</strong>
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono-num text-[#4B1E78] font-semibold">
                    8 Peserta
                  </span>
                </div>
                <ol className="space-y-2 text-sm">
                  {registration.pesertaPutri.map((nama, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between py-1.5 border-b border-[#E5DEC9]/50 last:border-none"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#4B1E78] text-white font-mono-num text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-[#23170D]">{nama}</div>
                          <div className="text-xs text-[#6B5744]">
                            TTL:{' '}
                            {formatTtlDisplay(
                              registration.tempatLahirPutri?.[idx],
                              registration.tanggalLahirPutri?.[idx]
                            )}
                          </div>
                        </div>
                      </div>
                      {idx === 0 && (
                        <span className="text-xs text-[#6B5744] font-medium">Pinru</span>
                      )}
                      {idx === 1 && (
                        <span className="text-xs text-[#6B5744] font-medium">Wapinru</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* 3. Rincian Biaya & Bukti Pembayaran */}
            <div className="bg-[#FAF7F2] rounded-2xl p-5 border border-[#E5DEC9]/80">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#4A2C11]">
                  <CreditCard className="w-4 h-4 text-[#C81E1E]" />
                  <span>Rincian Pembayaran & Bukti Transfer</span>
                </div>

                {registration.buktiPembayaran && (
                  <button
                    type="button"
                    onClick={handleDownloadProof}
                    className="no-print min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#14532D] border border-[#15803D]/40 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {downloadedProof ? (
                      <>
                        <Check className="w-4 h-4 text-[#15803D]" />
                        <span>Bukti Pembayaran Disimpan!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-[#15803D]" />
                        <span>Simpan / Unduh File Bukti Pembayaran</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-[#E5DEC9]">
                    <span className="text-[#6B5744]">Biaya Pendaftaran per Regu</span>
                    <span className="font-mono-num font-semibold text-[#23170D]">
                      {INFO_PEMBAYARAN.biayaFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E5DEC9]">
                    <span className="text-[#6B5744]">Jumlah Regu Didaftarkan</span>
                    <span className="font-mono-num font-semibold text-[#23170D]">
                      {registration.jumlahRegu} Regu
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E5DEC9]">
                    <span className="text-[#6B5744]">Total Biaya Pendaftaran</span>
                    <span className="font-mono-num font-bold text-[#C81E1E] text-base">
                      {formatRupiah(registration.totalBiaya)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#6B5744]">Rekening Tujuan</span>
                    <span className="font-mono-num font-semibold text-[#23170D] text-right">
                      {INFO_PEMBAYARAN.bank} · {INFO_PEMBAYARAN.noRekening} a.n.{' '}
                      {INFO_PEMBAYARAN.atasNama}
                    </span>
                  </div>
                </div>

                {registration.buktiPembayaran && (
                  <div className="bg-white rounded-xl p-3.5 border border-[#E5DEC9]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] mb-2">
                      <FileCheck2 className="w-4 h-4" />
                      <span className="truncate">
                        Bukti Transfer: {registration.buktiPembayaran.fileName}
                      </span>
                    </div>
                    {registration.buktiPembayaran.fileType.startsWith('image/') ? (
                      <img
                        src={registration.buktiPembayaran.dataUrl}
                        alt="Bukti Pembayaran Pendaftaran Pesta Penggalang"
                        className="w-full max-h-48 object-contain rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    ) : (
                      <div className="py-6 px-4 rounded-lg bg-[#FAF7F2] text-center text-xs text-[#6B5744]">
                        Dokumen PDF Bukti Pembayaran Terlampir (
                        {registration.buktiPembayaran.fileName})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Aksi Bawah (Cetak Kwitansi, Simpan Bukti PDF, Lihat Kartu Nama, & Buat Pendaftaran Baru) */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
              <button
                type="button"
                onClick={() => setSubTab('kwitansi')}
                className="min-h-[52px] px-4 py-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
              >
                <Receipt className="w-5 h-5 text-[#F3D299]" />
                <span>Cetak Kwitansi Resmi</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={downloadingReceipt}
                className="min-h-[52px] px-4 py-3 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
              >
                {downloadingReceipt ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>File PDF Bukti Diunduh!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Simpan Bukti Daftar (.PDF)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSubTab('cards')}
                className="min-h-[52px] px-4 py-3 rounded-xl bg-[#C81E1E] hover:bg-[#A51717] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
              >
                <IdCard className="w-5 h-5" />
                <span>Kartu Peserta & Pembina (20)</span>
              </button>

              <button
                type="button"
                onClick={onCreateNew}
                className="min-h-[52px] px-4 py-3 rounded-xl bg-[#4A2C11] hover:bg-[#361F0B] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Isi Pendaftaran Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditing && onEdit && (
        <AdminEditModal
          registration={registration}
          onClose={() => setIsEditing(false)}
          onSave={async (updated) => {
            await onEdit(updated);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
};
