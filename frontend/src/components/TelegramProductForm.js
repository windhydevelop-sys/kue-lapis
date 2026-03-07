import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import './Dashboard.css';

function TelegramProductForm() {
  const [tgUser, setTgUser] = useState(null);
  const [form, setForm] = useState({
    noOrder: '',
    bank: '',
    grade: '',
    kcp: '',
    nik: '',
    nama: '',
    namaIbuKandung: '',
    tempatTanggalLahir: '',
    noRek: '',
    noAtm: '',
    validThru: '',
    noHp: '',
    pinAtm: '',
    pinWondr: '',
    passWondr: '',
    email: '',
    passEmail: '',
    expired: '',
    myBCAUser: '',
    myBCAPassword: '',
    myBCAPin: '',
    kodeAkses: '',
    pinMBca: '',
    brimoUser: '',
    brimoPassword: '',
    briMerchantUser: '',
    briMerchantPassword: '',
    jenisRekening: '',
    mobileUser: '',
    mobilePassword: '',
    mobilePin: '',
    ibUser: '',
    ibPassword: '',
    ibPin: '',
    ocbcNyalaUser: ''
  });
  const [fotoKTP, setFotoKTP] = useState(null);
  const [fotoSelfie, setFotoSelfie] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) {
      tg.ready();
      const data = tg.initDataUnsafe || {};
      setTgUser(data?.user || null);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') fd.append(k, v);
      });
      if (fotoKTP) fd.append('uploadFotoId', fotoKTP);
      if (fotoSelfie) fd.append('uploadFotoSelfie', fotoSelfie);

      const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
      const tgUserId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

      const res = await axios.post('/api/telegram/products', fd, {
        headers: {
          ...(tgUserId ? { 'X-Telegram-User-Id': String(tgUserId) } : {}),
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.success) {
        setStatusMsg('Produk berhasil dikirim ke Ruang Tunggu.');
      } else {
        setStatusMsg(res.data?.error || 'Gagal membuat produk.');
      }
    } catch (e) {
      setStatusMsg('Terjadi kesalahan saat mengirim data.');
    }
  };

  const renderBankFields = () => {
    const b = (form.bank || '').toUpperCase();
    if (b === 'BCA') {
      return (
        <>
          <input name="kodeAkses" placeholder="Kode Akses (BCA)" value={form.kodeAkses} onChange={handleChange} />
          <input name="pinMBca" placeholder="PIN m-BCA" value={form.pinMBca} onChange={handleChange} />
          <input name="myBCAUser" placeholder="BCA-ID" value={form.myBCAUser} onChange={handleChange} />
          <input name="myBCAPassword" placeholder="Password BCA-ID" type="password" value={form.myBCAPassword} onChange={handleChange} />
          <input name="myBCAPin" placeholder="PIN Transaksi (BCA)" value={form.myBCAPin} onChange={handleChange} />
          <input name="ibUser" placeholder="User KlikBCA (IB)" value={form.ibUser} onChange={handleChange} />
          <input name="ibPassword" placeholder="PIN KlikBCA (IB)" type="password" value={form.ibPassword} onChange={handleChange} />
        </>
      );
    } else if (b === 'BRI') {
      return (
        <>
          <input name="jenisRekening" placeholder="Jenis Rekening (Britama/Simpedes/dll)" value={form.jenisRekening} onChange={handleChange} />
          <input name="brimoUser" placeholder="User BRImo" value={form.brimoUser} onChange={handleChange} />
          <input name="brimoPassword" placeholder="Password BRImo" type="password" value={form.brimoPassword} onChange={handleChange} />
          <input name="mobilePin" placeholder="PIN BRImo" value={form.mobilePin} onChange={handleChange} />
          <input name="briMerchantUser" placeholder="User BRI Merchant" value={form.briMerchantUser} onChange={handleChange} />
          <input name="briMerchantPassword" placeholder="Password BRI Merchant" type="password" value={form.briMerchantPassword} onChange={handleChange} />
        </>
      );
    } else if (b === 'BNI') {
      return (
        <>
          <input name="pinWondr" placeholder="PIN Wondr" value={form.pinWondr} onChange={handleChange} />
          <input name="passWondr" placeholder="Password Wondr" type="password" value={form.passWondr} onChange={handleChange} />
          <input name="mobileUser" placeholder="User Mobile (BNI)" value={form.mobileUser} onChange={handleChange} />
          <input name="mobilePassword" placeholder="Password Mobile (BNI)" type="password" value={form.mobilePassword} onChange={handleChange} />
        </>
      );
    } else if (b === 'OCBC' || b === 'OCBC NISP') {
      return (
        <>
          <input name="ocbcNyalaUser" placeholder="User ID Nyala" value={form.ocbcNyalaUser} onChange={handleChange} />
          <input name="mobileUser" placeholder="Username Mobile (One Mobile)" value={form.mobileUser} onChange={handleChange} />
          <input name="mobilePassword" placeholder="Password Mobile" type="password" value={form.mobilePassword} onChange={handleChange} />
          <input name="mobilePin" placeholder="PIN Mobile" value={form.mobilePin} onChange={handleChange} />
          <input name="ibUser" placeholder="Username I-Banking" value={form.ibUser} onChange={handleChange} />
          <input name="ibPassword" placeholder="Password I-Banking" type="password" value={form.ibPassword} onChange={handleChange} />
          <input name="ibPin" placeholder="PIN I-Banking" value={form.ibPin} onChange={handleChange} />
        </>
      );
    } else if (form.bank !== '') {
      return (
        <>
          <input name="mobileUser" placeholder="Username Mobile Banking / User Nyala" value={form.mobileUser} onChange={handleChange} />
          <input name="mobilePassword" placeholder="Password Mobile Banking" type="password" value={form.mobilePassword} onChange={handleChange} />
          <input name="mobilePin" placeholder="PIN Mobile Banking" value={form.mobilePin} onChange={handleChange} />
          <input name="ibUser" placeholder="Username I-Banking / User IB OCBC" value={form.ibUser} onChange={handleChange} />
          <input name="ibPassword" placeholder="Password I-Banking" type="password" value={form.ibPassword} onChange={handleChange} />
          <input name="ibPin" placeholder="PIN I-Banking" value={form.ibPin} onChange={handleChange} />
        </>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <h2>Form Input Produk (Telegram Web App)</h2>
      <p>Isi data dasar, kolom tambahan akan muncul sesuai bank.</p>
      {tgUser ? (
        <div>
          <p>Terhubung sebagai: {tgUser.username || tgUser.first_name}</p>
        </div>
      ) : (
        <p>Telegram Web App belum terdeteksi. Jika Anda membuka ini dari browser biasa, beberapa fitur tidak tersedia.</p>
      )}
      <div className="card">
        <div style={{ display: 'grid', gap: 12 }}>
          <input name="noOrder" placeholder="No. Order" value={form.noOrder} onChange={handleChange} />
          <select name="bank" value={form.bank} onChange={handleChange}>
            <option value="">Pilih Bank</option>
            <option value="BCA">BCA</option>
            <option value="BRI">BRI</option>
            <option value="BNI">BNI</option>
            <option value="MANDIRI">MANDIRI</option>
            <option value="DANAMON">DANAMON</option>
            <option value="LAINNYA">LAINNYA</option>
          </select>
          {renderBankFields()}
          {form.bank !== '' && (
            <>
              <input name="grade" placeholder="Grade" value={form.grade} onChange={handleChange} />
              <input name="kcp" placeholder="Kantor Cabang" value={form.kcp} onChange={handleChange} />
              <input name="nik" placeholder="NIK" value={form.nik} onChange={handleChange} />
              <input name="nama" placeholder="Nama (Sesuai KTP)" value={form.nama} onChange={handleChange} />
              <input name="namaIbuKandung" placeholder="Nama Ibu Kandung" value={form.namaIbuKandung} onChange={handleChange} />
              <input name="tempatTanggalLahir" placeholder="Tempat/Tanggal Lahir" value={form.tempatTanggalLahir} onChange={handleChange} />
              <input name="noRek" placeholder="No. Rekening" value={form.noRek} onChange={handleChange} />
              <input name="noAtm" placeholder="No. ATM" value={form.noAtm} onChange={handleChange} />
              <input name="validThru" placeholder="Valid Kartu (MM/YY)" value={form.validThru} onChange={handleChange} />
              <input name="noHp" placeholder="No. HP Terdaftar" value={form.noHp} onChange={handleChange} />
              <input name="pinAtm" placeholder="PIN ATM" value={form.pinAtm} onChange={handleChange} />
              <input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} />
              <input name="passEmail" placeholder="Password Email" type="password" value={form.passEmail} onChange={handleChange} />
              <input name="expired" placeholder="Expired (YYYY-MM-DD)" value={form.expired} onChange={handleChange} />
              <label>Upload Foto KTP: <input type="file" accept="image/*" onChange={e => setFotoKTP(e.target.files[0] || null)} /></label>
              <label>Upload Foto Selfie: <input type="file" accept="image/*" onChange={e => setFotoSelfie(e.target.files[0] || null)} /></label>
              <button onClick={handleSubmit}>Kirim</button>
            </>
          )}
          {statusMsg && <p>{statusMsg}</p>}
        </div>
      </div>
    </div>
  );
}

export default TelegramProductForm;
