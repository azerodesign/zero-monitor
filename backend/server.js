require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const cors = require('cors');

const app = express();
app.use(cors()); // Penting agar frontend bisa akses API

const server = http.createServer(app);

// Setup Socket.io dengan CORS agar bisa diakses dari domain Vercel nanti
const io = new Server(server, {
  cors: {
    origin: "*", // Nanti bisa diganti dengan URL Vercel-mu biar lebih aman
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('Zero Monitor Backend is Running! 🚀');
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start-monitor', (config) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      socket.emit('status', 'SSH Connected! Monitoring started...');
      
      // Contoh command untuk monitor RAM setiap 2 detik
      setInterval(() => {
        conn.exec('free -m', (err, stream) => {
          if (err) return;
          stream.on('data', (data) => {
            socket.emit('data-ram', data.toString());
          });
        });
      }, 2000);
    }).connect({
      host: config.host || process.env.SSH_HOST,
      port: 22,
      username: config.username || process.env.SSH_USER,
      password: config.password || process.env.SSH_PASS // Pakai .env buat lokal, atau kirim via frontend
    });

    socket.on('disconnect', () => {
      conn.end();
      console.log('SSH Disconnected');
    });
  });
});

// Port harus dinamis untuk Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
