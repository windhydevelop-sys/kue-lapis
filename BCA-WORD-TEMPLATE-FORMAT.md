# Format Word Template untuk BCA - PENTING

## Masalah yang Teridentifikasi
- ❌ **Pin Mobile belum ada atau kosong di UI** → Field harus ada di Word template dengan nama header yang benar
- ❌ **Kode Akses kosong** → Harus ada di Word template
- ❌ **Pass IB masih kosong** → Internet Banking password harus ada di Word template

---

## Format Tabel Word yang Benar untuk BCA

Buat tabel dengan header kolom PERSIS seperti ini (case-sensitive):

| NIK | Nama | No. Rekening | No. ATM | Valid Thru | No. HP | Pin ATM | Email | BCA-ID | Pass BCA-ID | Pin Transaksi | Kode Akses | Pin M-BCA | User I-Banking | Pass I-Banking | Pin I-Banking |
|-----|------|--------------|---------|-----------|---------|----------|-------|---------|-------------|----------------|------------|-----------|----------------|----------------|---------------|
| 1234567890123456 | Budi Santoso | 1234567890 | 4111111111111111 | 12/26 | 081234567890 | 1234 | budi@email.com | BUDISANTOSO01 | BudiBCA123! | 9876 | 654321 | 4567 | budiibbanking | BudiIB123! | 5678 |

---

## Penjelasan Setiap Kolom (untuk BCA)

### Kolom Wajib Ada (Mandatory):
1. **NIK** - 16 digit KTP (contoh: 1234567890123456)
2. **Nama** - Nama lengkap pemilik rekening
3. **No. Rekening** - Nomor rekening BCA (10 digit)
4. **No. ATM** - Nomor kartu ATM (16 digit)
5. **No. HP** - Nomor handphone (10-15 digit)
6. **Pin ATM** - PIN ATM (4-6 digit)
7. **Email** - Email address

### Kolom BCA-ID (Internet Banking BCA-ID):
- **BCA-ID** → Simpan sebagai: `myBCAUser`
- **Pass BCA-ID** → Simpan sebagai: `myBCAPassword`
- **Pin Transaksi** → Simpan sebagai: `myBCAPin`

### Kolom M-BCA (Mobile Banking M-BCA):
- **Kode Akses** → Simpan sebagai: `kodeAkses` ← **INI YANG KOSONG!**
- **Pin M-BCA** → Simpan sebagai: `pinMBca` ← **INI YANG KOSONG!**
- **Pin Mobile** → Alternative untuk: `mobilePin`

### Kolom Internet Banking (I-Banking):
- **User I-Banking** → Simpan sebagai: `ibUser`
- **Pass I-Banking** → Simpan sebagai: `ibPassword` ← **INI YANG KOSONG!**
- **Pin I-Banking** → Simpan sebagai: `ibPin`

---

## Alternatif Header yang DIGUNAKAN (case-insensitive):

### Untuk Kode Akses:
- ✅ Kode Akses
- ✅ Kode Akses M-BCA
- ✅ Access Code
- ✅ Kode M-BCA

### Untuk Pin M-BCA:
- ✅ Pin M-BCA
- ✅ P-BCA
- ✅ Pin Mobile
- ✅ Pin M BCA
- ✅ Pin BCA
- ✅ Pin MBCA

### Untuk Pass I-Banking:
- ✅ Pass I-Banking
- ✅ Pass IB
- ✅ Password I-Banking
- ✅ Password IB
- ✅ Password Internet Banking
- ✅ User Internet Banking (jika di kolom password)

---

## Contoh Word Template yang BENAR

```
┌──────────┬────────────┬────────────┬──────────────┬──────────┬────────────┬──────────┬──────────────┬────────────┬────────────┬────────────┬────────────┬──────────────┬──────────────┬──────────────┬───────────────┐
│ NIK      │ Nama       │ No. Rek    │ No. ATM      │ Tgl Exp  │ No. HP     │ Pin ATM  │ Email        │ BCA-ID     │ Pass BID   │ Pin Trans  │ Kode Akses │ Pin M-BCA    │ User I-Bank  │ Pass I-Bank   │ Pin I-Bank    │
├──────────┼────────────┼────────────┼──────────────┼──────────┼────────────┼──────────┼──────────────┼────────────┼────────────┼────────────┼────────────┼──────────────┼──────────────┼──────────────┼───────────────┤
│ 123456.. │ Budi S.    │ 1234567890 │ 4111111111.. │ 12/26    │ 0812345678 │ 1234     │ budi@email   │ BUDIID01   │ BudiBCA!   │ 9876       │ 654321     │ 4567         │ budiib       │ BudiIB123!   │ 5678          │
│ 234567.. │ Ani W.     │ 2345678901 │ 5111111111.. │ 11/26    │ 0823456789 │ 2345     │ ani@email    │ ANIID02    │ AniBCA!    │ 8765       │ 543210     │ 3456         │ aniib        │ AniIB123!    │ 4567          │
└──────────┴────────────┴────────────┴──────────────┴──────────┴────────────┴──────────┴──────────────┴────────────┴────────────┴────────────┴────────────┴──────────────┴──────────────┴──────────────┴───────────────┘
```

---

## Cara Mengecek Format di Word

1. **Buat tabel** di Word dengan header kolom
2. **Header HARUS tepat** dengan nama-nama di atas (atau alternatif yang disebutkan)
3. **Isi data** di setiap baris
4. **Pastikan TIDAK ADA kolom kosong** untuk field mandatory
5. **Export/Save** sebagai .docx

---

## Debugging: Lihat Log Saat Import

Saat import Word, sistem akan log field-field yang terdeteksi:

```
BCA Product Field Extraction Debug:
{
  mobilePin: '4567',          // ← Harus terisi
  kodeAkses: '654321',        // ← Harus terisi
  ibPassword: 'BudiIB123!',  // ← Harus terisi
  ibUser: 'budiib',
  ibPin: '5678'
}
```

**Jika semua KOSONG** → Header di Word template tidak match dengan fieldMapping

---

## Mapping Internal - Untuk Referensi Developer

```
Word Header Column → Field Database
════════════════════════════════════
BCA-ID → myBCAUser (encrypted)
Pass BCA-ID → myBCAPassword (encrypted)
Pin Transaksi → myBCAPin (encrypted)
Kode Akses → kodeAkses (encrypted) ⚠️
Pin M-BCA → pinMBca (encrypted) ⚠️
User I-Banking → ibUser (encrypted)
Pass I-Banking → ibPassword (encrypted) ⚠️
Pin I-Banking → ibPin (encrypted)
Pin Mobile → mobilePin (encrypted)
```

---

## Checklist Sebelum Import

- [ ] Semua 16 kolom ada di tabel (atau minimal 9 kolom mandatory)
- [ ] Header nama sesuai dengan format di atas
- [ ] Semua data filled (tidak ada cell kosong untuk mandatory fields)
- [ ] NIK 16 digit, No HP valid, Email valid
- [ ] **Terutama untuk BCA: Kode Akses, Pin M-BCA, Pass I-Banking ADA DATA**
- [ ] File disave sebagai .docx (Word format)

---

## Testing

1. Import Word template
2. Lihat response → Harus menunjukkan:
   - `mobilePin` ✅ Ada
   - `kodeAkses` ✅ Ada  
   - `ibPassword` ✅ Ada
3. Save ke database
4. Lihat di ProductDetail → Semua 3 field muncul ✅

---

## Support

Jika masih gagal:
1. Cek logs: `docker logs backend` (cari "BCA Product Field Extraction Debug")
2. Pastikan header kolom PERSIS seperti di atas
3. Test dengan data minimal 3 orang

