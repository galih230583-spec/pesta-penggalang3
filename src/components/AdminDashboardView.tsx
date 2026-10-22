import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowLeft,
  Building2,
  Users,
  Wallet,
  Printer,
  IdCard,
  Check,
  RotateCcw,
  History,
  AlertTriangle,
  Receipt,
  Edit3,
} from 'lucide-react';
import {
  SubmittedRegistration,
  formatRupiah,
  formatTtlDisplay,
} from '../types/registration';
import {
  downloadAdminRecapAsPdf,
  downloadPaymentProofFile,
} from '../utils/downloadHelpers';
import { KwitansiPramuka } from './KwitansiPramuka';
import { AdminEditModal } from './AdminEditModal';

interface AdminDashboardViewProps {
  submissions: SubmittedRegistration[];
  deletedSubmissions: SubmittedRegistration[];
  onViewReceipt: (reg: SubmittedRegistration, initialTab?: 'receipt' | 'cards' | 'kwitansi') => void;
  onToggleVerify: (id: string) => void;
  onDeleteSubmission: (id: string) => void;
  onRestoreSubmission: (id: string) => void;
  onPermanentDeleteSubmission: (id: string) => void;
  onEmptyTrash: () => void;
  onBackToForm: () => void;
  onEditSubmission?: (updated: SubmittedRegistration) => Promise<void> | void;
}

const ADMIN_USERNAME = 'admin';
const ADMIN_PIN = 'pramuka2026';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  submissions,
  deletedSubmissions,
  onViewReceipt,
  onToggleVerify,
  onDeleteSubmission,
  onRestoreSubmission,
  onPermanentDeleteSubmission,
  onEmptyTrash,
  onBackToForm,
  onEditSubmission,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('pramuka_admin_logged_in') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'deleted'>('all');
  const [recapPrintedNotice, setRecapPrintedNotice] = useState(false);
  const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);
  const [selectedKwitansi, setSelectedKwitansi] = useState<SubmittedRegistration | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<SubmittedRegistration | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      username.trim().toLowerCase() === ADMIN_USERNAME &&
      password.trim() === ADMIN_PIN
    ) {
      sessionStorage.setItem('pramuka_admin_logged_in', 'true');
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError(
        'Username atau Kata Sandi salah. Hanya Panitia resmi yang memiliki akses.'
      );
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pramuka_admin_logged_in');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) return;

    const headers = [
      'No Registrasi',
      'Tanggal Daftar',
      'Status Verifikasi',
      'Nama Sekolah',
      'Nama Kepala Sekolah',
      'NIP Kepala Sekolah',
      'Pembina Putra 1',
      'NIP Pembina Putra 1',
      'Pembina Putra 2',
      'NIP Pembina Putra 2',
      'Pembina Putri 1',
      'NIP Pembina Putri 1',
      'Pembina Putri 2',
      'NIP Pembina Putri 2',
      'Nama Regu Putra',
      ...Array.from({ length: 8 }, (_, i) => [
        `Nama Peserta Putra ${i + 1}`,
        `Tempat & Tgl Lahir Putra ${i + 1}`,
      ]).flat(),
      'Nama Regu Putri',
      ...Array.from({ length: 8 }, (_, i) => [
        `Nama Peserta Putri ${i + 1}`,
        `Tempat & Tgl Lahir Putri ${i + 1}`,
      ]).flat(),
      'Jumlah Regu',
      'Total Biaya (Rp)',
    ];

    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    // Format NIP as Excel literal string so 18-digit NIP is never rounded/altered by Excel
    const formatExcelText = (val: string | undefined) => {
      const clean = (val ?? '-').trim();
      if (!clean || clean === '-') return '-';
      return `="${clean.replace(/"/g, '""')}"`;
    };

    const rows = submissions.map((s) => [
      s.nomorRegistrasi,
      s.tanggalDaftar,
      s.statusVerifikasi || 'Menunggu Verifikasi',
      s.namaSekolah,
      s.namaKepalaSekolah,
      formatExcelText(s.nipKepalaSekolah),
      s.namaPembinaPutra,
      formatExcelText(s.nipPembinaPutra),
      s.namaPembinaPutra2 || '-',
      formatExcelText(s.nipPembinaPutra2),
      s.namaPembinaPutri,
      formatExcelText(s.nipPembinaPutri),
      s.namaPembinaPutri2 || '-',
      formatExcelText(s.nipPembinaPutri2),
      s.namaReguPutra || '-',
      ...s.pesertaPutra
        .map((p, i) => [
          p || '-',
          formatTtlDisplay(s.tempatLahirPutra?.[i], s.tanggalLahirPutra?.[i]),
        ])
        .flat(),
      s.namaReguPutri || '-',
      ...s.pesertaPutri
        .map((p, i) => [
          p || '-',
          formatTtlDisplay(s.tempatLahirPutri?.[i], s.tanggalLahirPutri?.[i]),
        ])
        .flat(),
      s.jumlahRegu,
      s.totalBiaya,
    ]);

    const formatCell = (val: string | number | undefined) => {
      const str = String(val ?? '');
      if (str.startsWith('="') && str.endsWith('"')) {
        return str;
      }
      return escapeCsv(val);
    };

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsv).join(','),
        ...rows.map((r) => r.map(formatCell).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Pendaftaran_Pesta_Penggalang_Muara_Kaman_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintRecap = () => {
    downloadAdminRecapAsPdf(submissions);
    setRecapPrintedNotice(true);
    setTimeout(() => setRecapPrintedNotice(false), 3500);
  };

  // IF NOT LOGGED IN -> SHOW ADMIN LOGIN FORM
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-4 sm:py-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={onBackToForm}
            className="inline-flex items-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#E5DEC9] text-[#4A2C11] font-semibold text-sm hover:bg-[#F5EFE6] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Formulir Pendaftaran</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5DEC9] shadow-sm overflow-hidden">
          <div className="bg-[#4A2C11] px-6 py-6 text-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-[#F3D299]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#F3D299]">
                PANEL PANITIA KWARRAN MUARA KAMAN
              </p>
              <h2 className="text-xl sm:text-2xl font-bold">Login Admin Pendaftaran</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5" autoComplete="off">
            <p className="text-xs sm:text-sm text-[#6B5744] leading-relaxed">
              Halaman ini khusus untuk Panitia Pesta Penggalang Kwartir Ranting Kecamatan Muara
              Kaman. Silakan masukkan kredensial resmi untuk mengelola dan memverifikasi data
              pendaftaran.
            </p>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs sm:text-sm text-red-800 font-medium">
                {loginError}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="adminUsername"
                className="block text-sm font-bold text-[#23170D]"
              >
                Username Admin
              </label>
              <input
                id="adminUsername"
                type="text"
                required
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin"
                className="w-full min-h-[52px] px-4 py-3 text-base rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] text-[#23170D] focus:bg-white focus:border-[#4A2C11] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="adminPassword"
                className="block text-sm font-bold text-[#23170D]"
              >
                Kata Sandi / PIN Panitia
              </label>
              <input
                id="adminPassword"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full min-h-[52px] px-4 py-3 text-base rounded-2xl bg-[#FAF7F2] border border-[#D8CEBE] text-[#23170D] focus:bg-white focus:border-[#4A2C11] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-[#C81E1E] hover:bg-[#A51717] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Masuk ke Dashboard Admin</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // FILTERED SUBMISSIONS FOR ADMIN DASHBOARD
  const filteredSubmissions = submissions.filter((item) => {
    const matchesSearch =
      item.namaSekolah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaKepalaSekolah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'verified') return item.statusVerifikasi === 'Terverifikasi';
    if (filterStatus === 'pending')
      return !item.statusVerifikasi || item.statusVerifikasi === 'Menunggu Verifikasi';
    return true;
  });

  // FILTERED DELETED SUBMISSIONS (RIWAYAT HAPUS)
  const filteredDeletedSubmissions = deletedSubmissions.filter((item) => {
    return (
      item.namaSekolah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaKepalaSekolah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalRegu = submissions.reduce((acc, s) => acc + (s.jumlahRegu || 2), 0);
  const totalDana = submissions.reduce((acc, s) => acc + (s.totalBiaya || 0), 0);
  const totalVerified = submissions.filter(
    (s) => s.statusVerifikasi === 'Terverifikasi'
  ).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar Admin */}
      <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#4A2C11] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#F3D299]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#7A5C3E]">
              DASHBOARD ADMIN PANITIA · KWARRAN KECAMATAN MUARA KAMAN
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#23170D]">
              Rekapitulasi Pendaftaran Pesta Penggalang
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToForm}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ke Formulir</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel/CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintRecap}
            disabled={submissions.length === 0}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#4A2C11] hover:bg-[#361F0B] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            {recapPrintedNotice ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>File PDF Rekap Diunduh!</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh Rekap (.PDF)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#991B1B] border border-red-200 font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#4A2C11]" />
          </div>
          <div>
            <p className="text-xs text-[#6B5744]">Total Sekolah Pendaftar Aktif</p>
            <p className="text-2xl font-mono-num font-bold text-[#23170D]">
              {submissions.length} Sekolah
            </p>
            <p className="text-xs text-[#15803D] font-medium">
              {totalVerified} Terverifikasi Lunas · {deletedSubmissions.length} di Riwayat Hapus
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-[#4B1E78]" />
          </div>
          <div>
            <p className="text-xs text-[#6B5744]">Total Regu & Peserta</p>
            <p className="text-2xl font-mono-num font-bold text-[#23170D]">
              {totalRegu} Regu ({submissions.length * 16} Peserta)
            </p>
            <p className="text-xs text-[#6B5744]">
              {submissions.length * 4} Pembina Pendamping
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-[#15803D]" />
          </div>
          <div>
            <p className="text-xs text-[#6B5744]">Total Biaya Pendaftaran</p>
            <p className="text-xl sm:text-2xl font-mono-num font-bold text-[#C81E1E]">
              {formatRupiah(totalDana)}
            </p>
            <p className="text-xs text-[#6B5744] font-mono-num">
              Bank Kaltimtara 0042830798
            </p>
          </div>
        </div>
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white rounded-3xl border border-[#E5DEC9] p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 no-print">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-[#8C735B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama sekolah, kepala sekolah, atau nomor registrasi..."
            className="w-full min-h-[48px] pl-11 pr-4 py-2.5 text-sm rounded-xl bg-[#FAF7F2] border border-[#D8CEBE] focus:bg-white focus:border-[#4A2C11] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#E5DEC9]">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-[#4A2C11] text-white shadow-2xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            Semua ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('verified')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'verified'
                ? 'bg-[#15803D] text-white shadow-2xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            Terverifikasi ({totalVerified})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-[#B45309] text-white shadow-2xs'
                : 'text-[#6B5744] hover:text-[#23170D]'
            }`}
          >
            Menunggu ({submissions.length - totalVerified})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('deleted')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'deleted'
                ? 'bg-[#991B1B] text-white shadow-2xs'
                : 'text-[#991B1B] hover:bg-red-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Hapus ({deletedSubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* MODE TAMPILAN: RIWAYAT HAPUS SEKOLAH (RECYCLE BIN) */}
      {filterStatus === 'deleted' ? (
        <div className="space-y-4">
          <div className="bg-[#FFFBEB] rounded-3xl border border-[#FDE68A] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[#92400E]">
                <History className="w-4 h-4 shrink-0" />
                <span>Riwayat Hapus Data Sekolah Pendaftar ({deletedSubmissions.length} Data)</span>
              </div>
              <p className="text-xs sm:text-sm text-[#78350F] leading-relaxed">
                Data sekolah di bawah ini telah dihapus dari daftar aktif. Anda dapat menekan{' '}
                <strong>Kembalikan Data</strong> sewaktu-waktu diperlukan agar kembali ke daftar
                pendaftar aktif, atau menekan <strong>Hapus Permanen</strong> untuk menghapus
                selamanya.
              </p>
            </div>

            {deletedSubmissions.length > 0 && (
              <div className="shrink-0">
                {confirmEmptyAll ? (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-red-300">
                    <span className="text-xs font-bold text-red-800 px-1">
                      Hapus permanen semua ({deletedSubmissions.length})?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onEmptyTrash();
                        setConfirmEmptyAll(false);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-xs cursor-pointer"
                    >
                      Ya, Kosongkan
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEmptyAll(false)}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyAll(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-[#991B1B] border border-red-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Kosongkan Semua Riwayat Hapus</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredDeletedSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5DEC9] p-10 text-center space-y-3">
              <p className="text-base font-bold text-[#23170D]">
                Riwayat Hapus Kosong
              </p>
              <p className="text-sm text-[#6B5744]">
                Belum ada data sekolah pendaftar yang dihapus, atau tidak ada yang cocok dengan kata
                kunci pencarian.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeletedSubmissions.map((item) => {
                const isConfirmingThis = confirmPermanentId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border-2 border-red-200/80 p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5DEC9]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num text-[#6B5744]">
                          <span className="font-bold text-[#991B1B]">{item.nomorRegistrasi}</span>
                          <span aria-hidden="true">·</span>
                          <span>Daftar: {item.tanggalDaftar}</span>
                          {item.tanggalDihapus && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans font-semibold text-[#991B1B]">
                                Dihapus: {item.tanggalDihapus}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#23170D]">
                          {item.namaSekolah}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#5C4328]">
                          Kepala Sekolah: <strong>{item.namaKepalaSekolah}</strong> (NIP:{' '}
                          <span className="font-mono-num">{item.nipKepalaSekolah}</span>)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 no-print">
                        <button
                          type="button"
                          onClick={() => onRestoreSubmission(item.id)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Kembalikan Data Sekolah</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewReceipt(item, 'receipt')}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Lihat Detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedKwitansi(item)}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#4A2C11] border border-[#D8CEBE] font-semibold text-xs flex items-center gap-1 cursor-pointer"
                          title="Lihat Kwitansi"
                        >
                          <Receipt className="w-4 h-4 text-[#B45309]" />
                          <span>Kwitansi</span>
                        </button>

                        {isConfirmingThis ? (
                          <div className="flex items-center gap-1.5 bg-red-50 p-1.5 rounded-xl border border-red-300">
                            <AlertTriangle className="w-4 h-4 text-red-700 ml-1 shrink-0" />
                            <span className="text-xs font-bold text-red-800">Hapus selamanya?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onPermanentDeleteSubmission(item.id);
                                setConfirmPermanentId(null);
                              }}
                              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-xs cursor-pointer"
                            >
                              Ya, Hapus Permanen
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPermanentId(null)}
                              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmPermanentId(item.id)}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#991B1B] border border-red-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Hapus Permanen</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Pembina & Peserta */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 space-y-1">
                        <p className="font-bold text-[#8B1E1E] text-xs">
                          Pembina Pendamping Putra (2 Orang)
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          1. {item.namaPembinaPutra}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutra})
                          </span>
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          2. {item.namaPembinaPutra2 || '-'}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutra2 || '-'})
                          </span>
                        </p>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 space-y-1">
                        <p className="font-bold text-[#4B1E78] text-xs">
                          Pembina Pendamping Putri (2 Orang)
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          1. {item.namaPembinaPutri}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutri})
                          </span>
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          2. {item.namaPembinaPutri2 || '-'}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutri2 || '-'})
                          </span>
                        </p>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-[#14532D] text-xs">
                            Pembayaran & Peserta
                          </p>
                          <p className="font-mono-num font-bold text-[#C81E1E] text-base mt-0.5">
                            {formatRupiah(item.totalBiaya)} ({item.jumlahRegu} Regu)
                          </p>
                        </div>
                        <p className="text-xs text-[#6B5744]">
                          Putra: {item.pesertaPutra.filter(Boolean).length} org · Putri:{' '}
                          {item.pesertaPutri.filter(Boolean).length} org
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MODE TAMPILAN: DAFTAR PENDAFTAR AKTIF */
        <>
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5DEC9] p-10 text-center space-y-3">
              <p className="text-base font-bold text-[#23170D]">
                Belum ada data pendaftaran aktif yang sesuai pencarian.
              </p>
              <p className="text-sm text-[#6B5744]">
                Setiap kali peserta mengirim formulir pendaftaran, datanya akan otomatis muncul di
                halaman Admin ini.{' '}
                {deletedSubmissions.length > 0 && (
                  <span>
                    Terdapat <strong>{deletedSubmissions.length} sekolah</strong> di tab{' '}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('deleted')}
                      className="text-[#991B1B] font-bold underline cursor-pointer"
                    >
                      Riwayat Hapus
                    </button>{' '}
                    yang dapat dikembalikan kapan saja.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((item) => {
                const isVerified = item.statusVerifikasi === 'Terverifikasi';
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-[#E5DEC9] p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5DEC9]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num text-[#6B5744]">
                          <span className="font-bold text-[#4A2C11]">{item.nomorRegistrasi}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.tanggalDaftar}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-sans font-bold ${
                              isVerified ? 'text-[#15803D]' : 'text-[#B45309]'
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terverifikasi Lunas</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Menunggu Verifikasi</span>
                              </>
                            )}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#23170D]">
                          {item.namaSekolah}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#5C4328]">
                          Kepala Sekolah: <strong>{item.namaKepalaSekolah}</strong> (NIP:{' '}
                          <span className="font-mono-num">{item.nipKepalaSekolah}</span>)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 no-print">
                        <button
                          type="button"
                          onClick={() => onToggleVerify(item.id)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isVerified
                              ? 'bg-[#FAF7F2] text-[#4A2C11] border border-[#D8CEBE]'
                              : 'bg-[#15803D] hover:bg-[#14532D] text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isVerified ? 'Batalkan Verifikasi' : 'Verifikasi Lunas'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingSubmission(item)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                          title="Edit nama sekolah, kepala sekolah, pembina, atau nama peserta"
                        >
                          <Edit3 className="w-4 h-4 text-[#BFDBFE]" />
                          <span>Edit Data</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedKwitansi(item)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Cetak Kwitansi Pembayaran Resmi"
                        >
                          <Receipt className="w-4 h-4 text-[#F3D299]" />
                          <span>Cetak Kwitansi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewReceipt(item, 'receipt')}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#4A2C11] hover:bg-[#361F0B] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Bukti Daftar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewReceipt(item, 'cards')}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#C81E1E] hover:bg-[#A51717] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <IdCard className="w-4 h-4" />
                          <span>Kartu Peserta (20)</span>
                        </button>

                        {item.buktiPembayaran && (
                          <button
                            type="button"
                            onClick={() => downloadPaymentProofFile(item)}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#14532D] border border-[#D8CEBE] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Unduh Bukti Bayar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteSubmission(item.id)}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#991B1B] border border-red-200 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                          title="Pindahkan ke Riwayat Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    {/* Ringkasan Pembina Putra 1 & 2, Pembina Putri 1 & 2, serta Biaya */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 space-y-1">
                        <p className="font-bold text-[#8B1E1E] text-xs">
                          Pembina Pendamping Putra (2 Orang)
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          1. {item.namaPembinaPutra}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutra})
                          </span>
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          2. {item.namaPembinaPutra2 || '-'}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutra2 || '-'})
                          </span>
                        </p>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 space-y-1">
                        <p className="font-bold text-[#4B1E78] text-xs">
                          Pembina Pendamping Putri (2 Orang)
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          1. {item.namaPembinaPutri}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutri})
                          </span>
                        </p>
                        <p className="font-semibold text-[#23170D]">
                          2. {item.namaPembinaPutri2 || '-'}{' '}
                          <span className="font-mono-num text-xs text-[#6B5744]">
                            (NIP: {item.nipPembinaPutri2 || '-'})
                          </span>
                        </p>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DEC9]/80 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-[#14532D] text-xs">
                            Pembayaran & Peserta
                          </p>
                          <p className="font-mono-num font-bold text-[#C81E1E] text-base mt-0.5">
                            {formatRupiah(item.totalBiaya)} ({item.jumlahRegu} Regu)
                          </p>
                        </div>
                        <p className="text-xs text-[#6B5744]">
                          Putra: {item.pesertaPutra.filter(Boolean).length} org · Putri:{' '}
                          {item.pesertaPutri.filter(Boolean).length} org
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL CETAK KWITANSI RESMI PRAMUKA */}
      {selectedKwitansi && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto no-print"
        >
          <div className="bg-[#FAF7F2] w-full max-w-5xl rounded-3xl border-2 border-[#4A2C11] shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5DEC9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4A2C11] flex items-center justify-center text-white">
                  <Receipt className="w-5 h-5 text-[#F3D299]" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#23170D]">
                    Kwitansi Pembayaran: {selectedKwitansi.namaSekolah}
                  </h3>
                  <p className="text-xs text-[#6B5744]">
                    ID: {selectedKwitansi.nomorRegistrasi} · Bendahara: Susilawati, S.Pd.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKwitansi(null)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <KwitansiPramuka
              registration={selectedKwitansi}
              onClose={() => setSelectedKwitansi(null)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA PENDAFTARAN OLEH ADMIN */}
      {editingSubmission && (
        <AdminEditModal
          registration={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSave={async (updated) => {
            if (onEditSubmission) {
              await onEditSubmission(updated);
            }
            setEditingSubmission(null);
          }}
        />
      )}
    </div>
  );
};
