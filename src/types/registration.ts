export interface PaymentProofFile {
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface RegistrationFormData {
  namaSekolah: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  namaPembinaPutra: string;
  nipPembinaPutra: string;
  namaPembinaPutra2: string;
  nipPembinaPutra2: string;
  namaPembinaPutri: string;
  nipPembinaPutri: string;
  namaPembinaPutri2: string;
  nipPembinaPutri2: string;
  namaReguPutra: string;
  namaReguPutri: string;
  pesertaPutra: string[]; // 8 orang
  tempatLahirPutra: string[]; // 8 orang
  tanggalLahirPutra: string[]; // 8 orang (YYYY-MM-DD)
  pesertaPutri: string[]; // 8 orang
  tempatLahirPutri: string[]; // 8 orang
  tanggalLahirPutri: string[]; // 8 orang (YYYY-MM-DD)
  jumlahRegu: number; // Default 2 (Putra & Putri), biaya Rp1.300.000,00 / regu
  buktiPembayaran: PaymentProofFile | null;
  pernyataanBenar: boolean;
}

export interface SubmittedRegistration extends RegistrationFormData {
  id: string;
  nomorRegistrasi: string;
  tanggalDaftar: string;
  totalBiaya: number;
  statusVerifikasi?: 'Menunggu Verifikasi' | 'Terverifikasi';
  tanggalDihapus?: string;
  fotoPeserta?: Record<string, string>;
}

export const BIAYA_PER_REGU = 1300000;

export const INFO_PEMBAYARAN = {
  bank: 'Bank Kaltimtara',
  noRekening: '0042830798',
  atasNama: 'Susilawati',
  biayaPerRegu: BIAYA_PER_REGU,
  biayaFormatted: 'Rp1.300.000,00',
  waPanitiaDisplay: '081253445433',
  waPanitiaInternational: '6281253445433',
  waGroupName: 'WA Group Pesta Penggalang Kec. Muara Kaman',
  waGroupLink:
    'https://chat.whatsapp.com/JWHDv5RmDah8dEudHknLa1?s=sh&p=a&mlu=4&ilr=4',
};

export const INITIAL_FORM_DATA: RegistrationFormData = {
  namaSekolah: '',
  namaKepalaSekolah: '',
  nipKepalaSekolah: '',
  namaPembinaPutra: '',
  nipPembinaPutra: '',
  namaPembinaPutra2: '',
  nipPembinaPutra2: '',
  namaPembinaPutri: '',
  nipPembinaPutri: '',
  namaPembinaPutri2: '',
  nipPembinaPutri2: '',
  namaReguPutra: '',
  namaReguPutri: '',
  pesertaPutra: Array(8).fill(''),
  tempatLahirPutra: Array(8).fill(''),
  tanggalLahirPutra: Array(8).fill(''),
  pesertaPutri: Array(8).fill(''),
  tempatLahirPutri: Array(8).fill(''),
  tanggalLahirPutri: Array(8).fill(''),
  jumlahRegu: 2,
  buktiPembayaran: null,
  pernyataanBenar: false,
};

// Cutoff date: 30 Oktober 2026 (Max age 16 years old on 30 October)
export const CUTOFF_YEAR = 2026;
export const CUTOFF_MONTH = 10; // October (1-indexed)
export const CUTOFF_DAY = 30;
export const MIN_ALLOWED_BIRTHDATE = '2010-10-30'; // Born before 2010-10-30 means > 16 years old on 30 Oct 2026

export interface AgeCheckResult {
  hasDate: boolean;
  isValid: boolean;
  isOver16: boolean;
  years: number;
  months: number;
  days: number;
  statusText: string;
}

export function checkParticipantAgeOnOct30(birthDateStr?: string): AgeCheckResult {
  if (!birthDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr.trim())) {
    return {
      hasDate: false,
      isValid: false,
      isOver16: false,
      years: 0,
      months: 0,
      days: 0,
      statusText: '',
    };
  }

  const [bYear, bMonth, bDay] = birthDateStr.trim().split('-').map(Number);
  const birthDate = new Date(bYear, bMonth - 1, bDay);
  const cutoffDate = new Date(CUTOFF_YEAR, CUTOFF_MONTH - 1, CUTOFF_DAY);

  if (isNaN(birthDate.getTime()) || birthDate > cutoffDate) {
    return {
      hasDate: true,
      isValid: false,
      isOver16: false,
      years: 0,
      months: 0,
      days: 0,
      statusText: 'Tanggal lahir tidak valid (melewati 30 Oktober 2026)',
    };
  }

  let years = CUTOFF_YEAR - bYear;
  let months = CUTOFF_MONTH - bMonth;
  let days = CUTOFF_DAY - bDay;

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(CUTOFF_YEAR, CUTOFF_MONTH - 1, 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Exceeds 16 years on 30 October if years > 16 OR (years === 16 and (months > 0 or days > 0))
  const isOver16 = years > 16 || (years === 16 && (months > 0 || days > 0));

  if (isOver16) {
    return {
      hasDate: true,
      isValid: false,
      isOver16: true,
      years,
      months,
      days,
      statusText: `DITOLAK: Usia ${years} thn ${months} bln ${days} hr pada 30 Okt 2026 (Lewat 16 Tahun)`,
    };
  }

  return {
    hasDate: true,
    isValid: true,
    isOver16: false,
    years,
    months,
    days,
    statusText: `Memenuhi Syarat: ${years} thn ${months} bln (pada 30 Okt 2026)`,
  };
}

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr || '-';
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${d} ${months[m - 1] || ''} ${y}`;
}

export function formatTtlDisplay(tempat?: string, tanggal?: string): string {
  const t = (tempat || '').trim();
  const d = (tanggal || '').trim();
  if (!t && !d) return '-';
  if (t && d) return `${t}, ${formatIndonesianDate(d)}`;
  return t || formatIndonesianDate(d);
}

export function formatRupiah(amount: number): string {
  return (
    'Rp' +
    amount.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function buildWhatsAppMessage(
  reg: SubmittedRegistration | RegistrationFormData,
  nomorReg?: string
): string {
  const totalBiaya = formatRupiah(reg.jumlahRegu * BIAYA_PER_REGU);
  const listPutra = reg.pesertaPutra
    .map((nama, idx) => {
      const ttl = formatTtlDisplay(
        reg.tempatLahirPutra?.[idx],
        reg.tanggalLahirPutra?.[idx]
      );
      const role = idx === 0 ? ' (Pinru)' : idx === 1 ? ' (Wapinru)' : '';
      return `${idx + 1}. ${nama.trim() || '-'}${role} — TTL: ${ttl}`;
    })
    .join('\n');
  const listPutri = reg.pesertaPutri
    .map((nama, idx) => {
      const ttl = formatTtlDisplay(
        reg.tempatLahirPutri?.[idx],
        reg.tanggalLahirPutri?.[idx]
      );
      const role = idx === 0 ? ' (Pinru)' : idx === 1 ? ' (Wapinru)' : '';
      return `${idx + 1}. ${nama.trim() || '-'}${role} — TTL: ${ttl}`;
    })
    .join('\n');

  return [
    `*KONFIRMASI PENDAFTARAN PESTA PENGGALANG*`,
    `*KWARRAN KECAMATAN MUARA KAMAN*`,
    `----------------------------------------`,
    nomorReg ? `*No. Registrasi:* ${nomorReg}` : null,
    `*Nama Sekolah:* ${reg.namaSekolah.trim()}`,
    `*Kepala Sekolah:* ${reg.namaKepalaSekolah.trim()}`,
    `*NIP Kepala Sekolah:* ${reg.nipKepalaSekolah.trim()}`,
    ``,
    `*DATA PEMBINA PENDAMPING PUTRA*`,
    `1. ${reg.namaPembinaPutra.trim()} (NIP: ${reg.nipPembinaPutra.trim()})`,
    `2. ${(reg.namaPembinaPutra2 || '-').trim()} (NIP: ${(reg.nipPembinaPutra2 || '-').trim()})`,
    ``,
    `*DATA PEMBINA PENDAMPING PUTRI*`,
    `1. ${reg.namaPembinaPutri.trim()} (NIP: ${reg.nipPembinaPutri.trim()})`,
    `2. ${(reg.namaPembinaPutri2 || '-').trim()} (NIP: ${(reg.nipPembinaPutri2 || '-').trim()})`,
    ``,
    `*DAFTAR PESERTA PUTRA (8 Orang)*${
      reg.namaReguPutra ? ` - Regu ${reg.namaReguPutra.trim()}` : ''
    }`,
    listPutra,
    ``,
    `*DAFTAR PESERTA PUTRI (8 Orang)*${
      reg.namaReguPutri ? ` - Regu ${reg.namaReguPutri.trim()}` : ''
    }`,
    listPutri,
    ``,
    `*RINCIAN PEMBAYARAN*`,
    `• Jumlah Regu: ${reg.jumlahRegu} Regu (@ Rp1.300.000,00)`,
    `• Total Biaya: ${totalBiaya}`,
    `• Tujuan Transfer: Bank Kaltimtara 0042830798 a.n. Susilawati`,
    `• Bukti Pembayaran: ${
      reg.buktiPembayaran
        ? `Sudah diunggah (${reg.buktiPembayaran.fileName})`
        : 'Terlampir'
    }`,
    `----------------------------------------`,
    `Mohon konfirmasi penerimaan pendaftaran dari pangkalan kami. Terima kasih. Salam Pramuka!`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
