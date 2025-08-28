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
  // URL ini mengarah ke Bin privatmu di JSONBin menggunakan Bin ID yang kamu berikan
  const targetUrl = "https://api.jsonbin.io/v3/b/68b009b7ae596e708fd9cc60/latest";
  
  console.log("Menerima permintaan untuk leaderboard custom (privat)...");

  try {
    // Mengambil data dengan menyertakan Kunci API Rahasia (X-Master-Key) di header
    const response = await axios.get(targetUrl, {
      timeout: 15000, // Timeout 15 detik
      headers: {
        'X-Master-Key': '$2a$10$OItjJ4JteLcqXteWJ4JRTuSI7ZcMLA27MCqneBAsu/gcXWspKykrW'
      }
    });
    
    console.log("Berhasil mendapatkan data dari Bin privat.");
    // Kirimkan kembali data yang didapat
    res.json(response.data);

  } catch (error) {
    // Jika terjadi error saat mengambil data
    console.error("Gagal mengambil data dari JSONBin:", error.message);
    res.status(500).json({ error: "Gagal mengambil data dari JSONBin." });
  }
});

// Endpoint untuk cek kesehatan server
app.get('/', (req, res) => {
  res.send('Proxy server untuk Leaderboard Custom aktif!');
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
