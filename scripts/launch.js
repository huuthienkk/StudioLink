const { spawn } = require('child_process');
const path = require('path');

const target = (process.argv[2] || 'linkedin').toLowerCase();
console.log(`[Launcher] Khởi chạy NexaLink - LinkedIn Edition...`);

const env = { ...process.env, APP_TARGET: target };
const viteJs = path.resolve(__dirname, '../node_modules/vite/bin/vite.js');
const electronExe = require('electron');

// 1. Khởi chạy Vite Dev Server bằng Node.js trực tiếp (không dùng shell, không cảnh báo deprecation)
const viteProcess = spawn(process.execPath, [viteJs], {
  env,
  stdio: 'inherit',
});

// 2. Chờ Vite khởi động ổn định rồi mở cửa sổ Electron Desktop
setTimeout(() => {
  const electronProcess = spawn(electronExe, ['.'], {
    env,
    stdio: 'inherit',
  });

  electronProcess.on('exit', (code) => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', viteProcess.pid, '/f', '/t']);
      } else {
        viteProcess.kill();
      }
    } catch {}
    process.exit(code || 0);
  });
}, 1200);

viteProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    process.exit(code || 0);
  }
});
