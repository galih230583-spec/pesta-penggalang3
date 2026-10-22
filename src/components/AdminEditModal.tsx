import React, { useState } from 'react';
import {
  X,
  Save,
  Building2,
  Users,
  ShieldCheck,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  SubmittedRegistration,
  BIAYA_PER_REGU,
  formatRupiah,
  checkParticipantAgeOnOct30,
} from '../types/registration';

interface AdminEditModalProps {
  registration: SubmittedRegistration;
  onClose: () => void;
  onSave: (updated: SubmittedRegistration) => Promise<void> | void;
}

type TabKey = 'sekolah' | 'putra' | 'putri' | 'status';

export const AdminEditModal: React.FC<AdminEditModalProps> = ({
  registration,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('sekolah');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [namaSekolah, setNamaSekolah] = useState(registration.namaSekolah || '');
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState(registration.namaKepalaSekolah || '');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState(registration.nipKepalaSekolah || '');

  const [namaPembinaPutra, setNamaPembinaPutra] = useState(registration.namaPembinaPutra || '');
  const [nipPembinaPutra, setNipPembinaPutra] = useState(registration.nipPembinaPutra || '');
  const [namaPembinaPutra2, setNamaPembinaPutra2] = useState(registration.namaPembinaPutra2 || '');
  const [nipPembinaPutra2, setNipPembinaPutra2] = useState(registration.nipPembinaPutra2 || '');

  const [namaPembinaPutri, setNamaPembinaPutri] = useState(registration.namaPembinaPutri || '');
  const [nipPembinaPutri, setNipPembinaPutri] = useState(registration.nipPembinaPutri || '');
  const [namaPembinaPutri2, setNamaPembinaPutri2] = useState(registration.namaPembinaPutri2 || '');
  const [nipPembinaPutri2, setNipPembinaPutri2] = useState(registration.nipPembinaPutri2 || '');

  const [namaReguPutra, setNamaReguPutra] = useState(registration.namaReguPutra || '');
  const [namaReguPutri, setNamaReguPutri] = useState(registration.namaReguPutri || '');

  // 8 Peserta Putra
  const [pesertaPutra, setPesertaPutra] = useState<string[]>(() => {
    const list = [...(registration.pesertaPutra || [])];
    while (list.length < 8) list.push('');
    return list;
  });
  const [tempatLahirPutra, setTempatLahirPutra] = useState<string[]>(() => {
    const list = [...(registration.tempatLahirPutra || [])];
    while (list.length < 8) list.push('');
    return list;
  });
  const [tanggalLahirPutra, setTanggalLahirPutra] = useState<string[]>(() => {
    const list = [...(registration.tanggalLahirPutra || [])];
    while (list.length < 8) list.push('');
    return list;
  });

  // 8 Peserta Putri
  const [pesertaPutri, setPesertaPutri] = useState<string[]>(() => {
    const list = [...(registration.pesertaPutri || [])];
    while (list.length < 8) list.push('');
    return list;
  });
  const [tempatLahirPutri, setTempatLahirPutri] = useState<string[]>(() => {
    const list = [...(registration.tempatLahirPutri || [])];
    while (list.length < 8) list.push('');
    return list;
  });
  const [tanggalLahirPutri, setTanggalLahirPutri] = useState<string[]>(() => {
    const list = [...(registration.tanggalLahirPutri || [])];
    while (list.length < 8) list.push('');
    return list;
  });

  const [jumlahRegu, setJumlahRegu] = useState<number>(registration.jumlahRegu || 2);
  const [statusVerifikasi, setStatusVerifikasi] = useState<'Menunggu Verifikasi' | 'Terverifikasi'>(
    registration.statusVerifikasi === 'Terverifikasi' ? 'Terverifikasi' : 'Menunggu Verifikasi'
  );
  const [nomorRegistrasi, setNomorRegistrasi] = useState(registration.nomorRegistrasi || '');
  const [tanggalDaftar, setTanggalDaftar] = useState(registration.tanggalDaftar || '');

  const handleUpdateArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!namaSekolah.trim()) {
      setErrorMessage('Nama Sekolah / Pangkalan wajib diisi.');
      setActiveTab('sekolah');
      return;
    }

    if (!namaKepalaSekolah.trim()) {
      setErrorMessage('Nama Kepala Sekolah (Kamabigus) wajib diisi.');
      setActiveTab('sekolah');
      return;
    }

    setSaving(true);
    try {
      const totalBiayaCalc = jumlahRegu * BIAYA_PER_REGU;
      const updatedSubmission: SubmittedRegistration = {
        ...registration,
        nomorRegistrasi: nomorRegistrasi.trim() || registration.nomorRegistrasi,
        tanggalDaftar: tanggalDaftar.trim() || registration.tanggalDaftar,
        namaSekolah: namaSekolah.trim(),
        namaKepalaSekolah: namaKepalaSekolah.trim(),
        nipKepalaSekolah: nipKepalaSekolah.trim() || '-',
        namaPembinaPutra: namaPembinaPutra.trim() || '-',
        nipPembinaPutra: nipPembinaPutra.trim() || '-',
        namaPembinaPutra2: namaPembinaPutra2.trim(),
        nipPembinaPutra2: nipPembinaPutra2.trim(),
        namaPembinaPutri: namaPembinaPutri.trim() || '-',
        nipPembinaPutri: nipPembinaPutri.trim() || '-',
        namaPembinaPutri2: namaPembinaPutri2.trim(),
        nipPembinaPutri2: nipPembinaPutri2.trim(),
        namaReguPutra: namaReguPutra.trim(),
        namaReguPutri: namaReguPutri.trim(),
        pesertaPutra: pesertaPutra.map((p) => p.trim()),
        tempatLahirPutra: tempatLahirPutra.map((p) => p.trim()),
        tanggalLahirPutra: tanggalLahirPutra.map((p) => p.trim()),
        pesertaPutri: pesertaPutri.map((p) => p.trim()),
        tempatLahirPutri: tempatLahirPutri.map((p) => p.trim()),
        tanggalLahirPutri: tanggalLahirPutri.map((p) => p.trim()),
        jumlahRegu,
        totalBiaya: totalBiayaCalc,
        statusVerifikasi,
      };

      await onSave(updatedSubmission);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Gagal menyimpan: ${err.message}`
          : 'Terjadi kesalahan saat memperbarui data pendaftaran.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-3xl border-2 border-[#D8CEBE] shadow-2xl w-full max-w-4xl my-auto max-h-[92vh] flex flex-col overflow-hidden text-[#23170D]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#4A2C11] via-[#5C3614] to-[#3B220C] text-white p-4 sm:p-6 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#F3D299]/20 text-[#F3D299] text-xs font-bold uppercase tracking-wider border border-[#F3D299]/30">
                Mode Edit Admin
              </span>
              <span className="text-xs text-[#E5DEC9] font-mono font-semibold">
                {registration.nomorRegistrasi}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1 text-[#FAF7F2]">
              Edit Data Pendaftaran: {namaSekolah || registration.namaSekolah}
            </h2>
            <p className="text-xs text-[#E5DEC9] mt-0.5">
              Perbaiki kesalahan input nama sekolah, kepala sekolah, pembina, atau daftar peserta
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5DEC9] bg-white px-3 sm:px-6 gap-2 sm:gap-4 overflow-x-auto shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('sekolah')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'sekolah'
                ? 'border-[#4A2C11] text-[#4A2C11]'
                : 'border-transparent text-[#6B5744] hover:text-[#4A2C11]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Sekolah & Pembina</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('putra')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'putra'
                ? 'border-[#8B1E1E] text-[#8B1E1E]'
                : 'border-transparent text-[#6B5744] hover:text-[#8B1E1E]'
            }`}
          >
            <Users className="w-4 h-4 text-[#8B1E1E]" />
            <span>Regu Putra (8)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('putri')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'putri'
                ? 'border-[#4B1E78] text-[#4B1E78]'
                : 'border-transparent text-[#6B5744] hover:text-[#4B1E78]'
            }`}
          >
            <Users className="w-4 h-4 text-[#4B1E78]" />
            <span>Regu Putri (8)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'status'
                ? 'border-[#15803D] text-[#15803D]'
                : 'border-transparent text-[#6B5744] hover:text-[#15803D]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            <span>Status & Rincian</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: IDENTITAS SEKOLAH & PEMBINA */}
          {activeTab === 'sekolah' && (
            <div className="space-y-6">
              {/* Bagian Sekolah */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-[#4A2C11] flex items-center gap-2 pb-2 border-b border-[#E5DEC9]">
                  <Building2 className="w-4 h-4 text-[#C8A97E]" />
                  <span>Identitas Sekolah & Kepala Sekolah</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Nama Sekolah / Pangkalan <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaSekolah}
                      onChange={(e) => setNamaSekolah(e.target.value)}
                      required
                      placeholder="Contoh: SMP Negeri 1 Muara Kaman"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] outline-none text-xs sm:text-sm font-semibold transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Nama Kepala Sekolah (Kamabigus) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaKepalaSekolah}
                      onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                      required
                      placeholder="Nama Kepala Sekolah beserta gelar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={nipKepalaSekolah}
                      onChange={(e) => setNipKepalaSekolah(e.target.value)}
                      placeholder="Isi '-' jika tidak ada NIP"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4A2C11] focus:ring-1 focus:ring-[#4A2C11] outline-none text-xs sm:text-sm font-mono transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian Pembina Putra */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-[#8B1E1E] flex items-center gap-2 pb-2 border-b border-[#E5DEC9]">
                  <Users className="w-4 h-4" />
                  <span>Pembina Pendamping Putra</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Pembina Pendamping Putra 1
                    </label>
                    <input
                      type="text"
                      value={namaPembinaPutra}
                      onChange={(e) => setNamaPembinaPutra(e.target.value)}
                      placeholder="Nama Pembina Putra 1"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#8B1E1E] focus:ring-1 focus:ring-[#8B1E1E] outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      NIP Pembina Putra 1
                    </label>
                    <input
                      type="text"
                      value={nipPembinaPutra}
                      onChange={(e) => setNipPembinaPutra(e.target.value)}
                      placeholder="NIP Pembina Putra 1"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#8B1E1E] focus:ring-1 focus:ring-[#8B1E1E] outline-none text-xs sm:text-sm font-mono transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Pembina Pendamping Putra 2 (Opsional)
                    </label>
                    <input
                      type="text"
                      value={namaPembinaPutra2}
                      onChange={(e) => setNamaPembinaPutra2(e.target.value)}
                      placeholder="Nama Pembina Putra 2 (jika ada)"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#8B1E1E] focus:ring-1 focus:ring-[#8B1E1E] outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      NIP Pembina Putra 2 (Opsional)
                    </label>
                    <input
                      type="text"
                      value={nipPembinaPutra2}
                      onChange={(e) => setNipPembinaPutra2(e.target.value)}
                      placeholder="NIP Pembina Putra 2 (jika ada)"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#8B1E1E] focus:ring-1 focus:ring-[#8B1E1E] outline-none text-xs sm:text-sm font-mono transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian Pembina Putri */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-[#4B1E78] flex items-center gap-2 pb-2 border-b border-[#E5DEC9]">
                  <Users className="w-4 h-4" />
                  <span>Pembina Pendamping Putri</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Pembina Pendamping Putri 1
                    </label>
                    <input
                      type="text"
                      value={namaPembinaPutri}
                      onChange={(e) => setNamaPembinaPutri(e.target.value)}
                      placeholder="Nama Pembina Putri 1"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4B1E78] focus:ring-1 focus:ring-[#4B1E78] outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      NIP Pembina Putri 1
                    </label>
                    <input
                      type="text"
                      value={nipPembinaPutri}
                      onChange={(e) => setNipPembinaPutri(e.target.value)}
                      placeholder="NIP Pembina Putri 1"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4B1E78] focus:ring-1 focus:ring-[#4B1E78] outline-none text-xs sm:text-sm font-mono transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Pembina Pendamping Putri 2 (Opsional)
                    </label>
                    <input
                      type="text"
                      value={namaPembinaPutri2}
                      onChange={(e) => setNamaPembinaPutri2(e.target.value)}
                      placeholder="Nama Pembina Putri 2 (jika ada)"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4B1E78] focus:ring-1 focus:ring-[#4B1E78] outline-none text-xs sm:text-sm transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      NIP Pembina Putri 2 (Opsional)
                    </label>
                    <input
                      type="text"
                      value={nipPembinaPutri2}
                      onChange={(e) => setNipPembinaPutri2(e.target.value)}
                      placeholder="NIP Pembina Putri 2 (jika ada)"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white focus:border-[#4B1E78] focus:ring-1 focus:ring-[#4B1E78] outline-none text-xs sm:text-sm font-mono transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGU PUTRA & 8 PESERTA PUTRA */}
          {activeTab === 'putra' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5DEC9]">
                  <h3 className="font-bold text-sm sm:text-base text-[#8B1E1E] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Daftar Peserta Regu Putra (8 Orang)</span>
                  </h3>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      value={namaReguPutra}
                      onChange={(e) => setNamaReguPutra(e.target.value)}
                      placeholder="Nama Regu Putra (cth: Garuda)"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {pesertaPutra.map((nama, idx) => {
                    const roleLabel =
                      idx === 0
                        ? '1. Pemimpin Regu (Pinru)'
                        : idx === 1
                        ? '2. Wakil Pinru (Wapinru)'
                        : `${idx + 1}. Anggota Regu #${idx + 1}`;
                    const ageCheck = checkParticipantAgeOnOct30(tanggalLahirPutra[idx]);

                    return (
                      <div
                        key={`putra-${idx}`}
                        className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#8B1E1E]">
                            {roleLabel}
                          </span>
                          {ageCheck.hasDate && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                ageCheck.isValid
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ageCheck.statusText}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <input
                              type="text"
                              value={nama}
                              onChange={(e) => handleUpdateArray(setPesertaPutra, idx, e.target.value)}
                              placeholder={`Nama Peserta #${idx + 1}`}
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#8B1E1E]"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={tempatLahirPutra[idx] || ''}
                              onChange={(e) =>
                                handleUpdateArray(setTempatLahirPutra, idx, e.target.value)
                              }
                              placeholder="Tempat Lahir (cth: Muara Kaman)"
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#8B1E1E]"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={tanggalLahirPutra[idx] || ''}
                              onChange={(e) =>
                                handleUpdateArray(setTanggalLahirPutra, idx, e.target.value)
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#8B1E1E]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGU PUTRI & 8 PESERTA PUTRI */}
          {activeTab === 'putri' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5DEC9]">
                  <h3 className="font-bold text-sm sm:text-base text-[#4B1E78] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Daftar Peserta Regu Putri (8 Orang)</span>
                  </h3>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      value={namaReguPutri}
                      onChange={(e) => setNamaReguPutri(e.target.value)}
                      placeholder="Nama Regu Putri (cth: Melati)"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {pesertaPutri.map((nama, idx) => {
                    const roleLabel =
                      idx === 0
                        ? '1. Pemimpin Regu (Pinru)'
                        : idx === 1
                        ? '2. Wakil Pinru (Wapinru)'
                        : `${idx + 1}. Anggota Regu #${idx + 1}`;
                    const ageCheck = checkParticipantAgeOnOct30(tanggalLahirPutri[idx]);

                    return (
                      <div
                        key={`putri-${idx}`}
                        className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#4B1E78]">
                            {roleLabel}
                          </span>
                          {ageCheck.hasDate && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                ageCheck.isValid
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ageCheck.statusText}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <input
                              type="text"
                              value={nama}
                              onChange={(e) => handleUpdateArray(setPesertaPutri, idx, e.target.value)}
                              placeholder={`Nama Peserta #${idx + 1}`}
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#4B1E78]"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={tempatLahirPutri[idx] || ''}
                              onChange={(e) =>
                                handleUpdateArray(setTempatLahirPutri, idx, e.target.value)
                              }
                              placeholder="Tempat Lahir (cth: Muara Kaman)"
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#4B1E78]"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={tanggalLahirPutri[idx] || ''}
                              onChange={(e) =>
                                handleUpdateArray(setTanggalLahirPutri, idx, e.target.value)
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-[#D8CEBE] bg-white text-xs outline-none focus:border-[#4B1E78]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STATUS & RINCIAN BIAYA */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-[#15803D] flex items-center gap-2 pb-2 border-b border-[#E5DEC9]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Status Verifikasi & Rincian Pembayaran</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Status Verifikasi Pembayaran
                    </label>
                    <select
                      value={statusVerifikasi}
                      onChange={(e) =>
                        setStatusVerifikasi(e.target.value as 'Menunggu Verifikasi' | 'Terverifikasi')
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-bold text-xs sm:text-sm outline-none"
                    >
                      <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                      <option value="Terverifikasi">Terverifikasi (Lunas)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Jumlah Regu Yang Didaftarkan
                    </label>
                    <select
                      value={jumlahRegu}
                      onChange={(e) => setJumlahRegu(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-bold text-xs sm:text-sm outline-none"
                    >
                      <option value={1}>1 Regu ({formatRupiah(BIAYA_PER_REGU)})</option>
                      <option value={2}>2 Regu ({formatRupiah(2 * BIAYA_PER_REGU)})</option>
                      <option value={3}>3 Regu ({formatRupiah(3 * BIAYA_PER_REGU)})</option>
                      <option value={4}>4 Regu ({formatRupiah(4 * BIAYA_PER_REGU)})</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Nomor Registrasi
                    </label>
                    <input
                      type="text"
                      value={nomorRegistrasi}
                      onChange={(e) => setNomorRegistrasi(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono text-xs sm:text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#4A2C11] block">
                      Tanggal Pendaftaran
                    </label>
                    <input
                      type="text"
                      value={tanggalDaftar}
                      onChange={(e) => setTanggalDaftar(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] text-xs sm:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF3E0] border border-[#E0D3B8] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A2C11]">
                    Total Biaya Kontribusi ({jumlahRegu} Regu):
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono-num text-[#8B1E1E]">
                    {formatRupiah(jumlahRegu * BIAYA_PER_REGU)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E5DEC9] flex flex-wrap items-center justify-end gap-3 sticky bottom-0 bg-[#FAF7F2] py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
