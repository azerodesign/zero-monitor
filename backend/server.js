const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);
  let sshClient = new Client();
  let sshStream = null;
  let metricsInterval = null;

  socket.on('connect_vps', (credentials) => {
    sshClient.on('ready', () => {
      // 1. Jalur Terminal
      sshClient.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) return;
        sshStream = stream;
        stream.on('data', (d) => socket.emit('terminal_output', d.toString('utf-8')));
        socket.on('terminal_input', (d) => { if (sshStream) sshStream.write(d); });
      });

      // 2. Jalur Metrik Real-time
      const fetchMetrics = () => {
        const cmd = `OS=$(cat /etc/os-release | grep PRETTY_NAME | cut -d '=' -f 2 | tr -d '"'); UP=$(uptime -p | sed 's/up //'); RAM=$(free -m | awk 'NR==2{printf "%s,%s", $3, $2}'); DISK=$(df -h / | awk '$NF=="/"{printf "%s", $5}' | sed 's/%//'); CPU=$(grep 'cpu ' /proc/stat | awk '{printf "%.1f", ($2+$4)*100/($2+$4+$5)}'); VENDOR=$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo "Unknown"); echo "$OS|$UP|$RAM|$DISK|$CPU|$VENDOR"`;
        sshClient.exec(cmd, (err, stream) => {
          if (err) return;
          stream.on('data', (data) => {
            const out = data.toString('utf-8').trim().split('|');
            if (out.length >= 6) {
              const r = out[2].split(',');
              socket.emit('vps_metrics', { 
                os: out[0], uptime: out[1], 
                ramText: `${(r[0]/1024).toFixed(1)} / ${(r[1]/1024).toFixed(1)}`, 
                ramPercent: Math.round((r[0]/r[1])*100), 
                disk: parseInt(out[3]), cpu: parseFloat(out[4]), vendor: out[5] 
              });
            }
          });
        });
      };
      fetchMetrics();
      metricsInterval = setInterval(fetchMetrics, 5000);

      // 3. FITUR BARU: Scan Software Terinstall
      socket.on('get_installed_apps', () => {
        sshClient.exec("dpkg-query -W -f='${Package}|${Version}|${Description}\n' | head -n 100", (err, stream) => {
          if (err) return;
          let buffer = "";
          stream.on('data', (d) => buffer += d);
          stream.on('close', () => {
            const apps = buffer.trim().split('\n').map(line => {
              const [name, version, desc] = line.split('|');
              return { name, version, description: desc ? desc.split('.')[0] : "No info" };
            });
            socket.emit('installed_apps', apps);
          });
        });
      });

    }).connect({ host: credentials.ip, port: 22, username: credentials.username, password: credentials.password, readyTimeout: 10000 });
  });

  const cleanup = () => { if (metricsInterval) clearInterval(metricsInterval); if (sshClient) sshClient.end(); };
  socket.on('disconnect', cleanup);
});

server.listen(3001, () => console.log('🚀 Backend Monitoring Active on 3001'));