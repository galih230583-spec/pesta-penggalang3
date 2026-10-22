/**
 * Utility untuk mengubah nominal angka menjadi teks terbilang dalam Bahasa Indonesia.
 * Contoh: 2600000 -> "Dua Juta Enam Ratus Ribu Rupiah"
 */
export function angkaKeTerbilang(angka: number): string {
  if (isNaN(angka) || angka <= 0) {
    return 'Nol';
  }

  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    const nilai = Math.floor(n);
    if (nilai < 12) {
      return bilangan[nilai];
    } else if (nilai < 20) {
      return konversi(nilai - 10) + ' Belas';
    } else if (nilai < 100) {
      const sisa = nilai % 10;
      return konversi(Math.floor(nilai / 10)) + ' Puluh' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (nilai < 200) {
      return 'Seratus' + (nilai % 100 ? ' ' + konversi(nilai - 100) : '');
    } else if (nilai < 1000) {
      const sisa = nilai % 100;
      return konversi(Math.floor(nilai / 100)) + ' Ratus' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (nilai < 2000) {
      return 'Seribu' + (nilai % 1000 ? ' ' + konversi(nilai - 1000) : '');
    } else if (nilai < 1000000) {
      const sisa = nilai % 1000;
      return konversi(Math.floor(nilai / 1000)) + ' Ribu' + (sisa ? ' ' + konversi(sisa) : '');
    } else if (nilai < 1000000000) {
      const sisa = nilai % 1000000;
      return (
        konversi(Math.floor(nilai / 1000000)) +
        ' Juta' +
        (sisa ? ' ' + konversi(sisa) : '')
      );
    } else if (nilai < 1000000000000) {
      const sisa = nilai % 1000000000;
      return (
        konversi(Math.floor(nilai / 1000000000)) +
        ' Miliar' +
        (sisa ? ' ' + konversi(sisa) : '')
      );
    }
    return String(nilai);
  }

  const hasil = konversi(angka).replace(/\s+/g, ' ').trim();
  return hasil;
}

export function terbilangRupiah(nominal: number): string {
  const teks = angkaKeTerbilang(nominal);
  return `${teks} Rupiah`;
}
