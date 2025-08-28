// Memanggil library yang kita butuhkan
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Mengizinkan akses dari mana saja (termasuk Roblox)
app.use(cors());

// Ini adalah endpoint atau alamat yang akan kita panggil dari Roblox
app.get('/getLeaderboard', async (req, res) => {
  // URL leaderboard Tako yang spesifik
  const targetUrl = "https://tako.id/overlay/leaderboard?overlay_key=clwf4nasl01iztom7cgffbwzo";

  console.log("Menerima permintaan untuk leaderboard Tako...");

  try {
    // Server kita mengambil data dari URL Tako
    // PENAMBAHAN PENTING ADA DI BAGIAN 'headers'
    const response = await axios.get(targetUrl, {
      timeout: 15000, // Timeout 15 detik
      headers: {
        // Ini membuat permintaan kita terlihat seperti berasal dari browser Chrome di Windows
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    // Cek jika data yang diterima bukan object (kemungkinan HTML)
    if (typeof response.data !== 'object') {
        console.error("Gagal mendapatkan JSON, Tako mengirimkan tipe data lain.");
        return res.status(502).json({ error: "Bad Gateway: Gagal mendapatkan data JSON dari server target." });
    }

    console.log("Berhasil mendapatkan data dari Tako, mengirimkan ke Roblox.");
    // Kirimkan data yang didapat kembali ke Roblox
    res.json(response.data);

  } catch (error) {
    // Jika terjadi error saat mengambil data
    console.error("Gagal mengambil data dari Tako:", error.message);
    res.status(500).json({ error: "Gagal mengambil data dari server Tako." });
  }
});

// Endpoint untuk cek kesehatan server
app.get('/', (req, res) => {
  res.send('Proxy server untuk Roblox Tako aktif!');
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
