const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const isDev = require('electron-is-dev');
const fs = require('fs');
const http = require('http');

let mainWindow;
let serverProcess;

// ------------------ وظائف مساعدة ------------------

// التحقق من المنفذ
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// إيقاف أي عملية تستخدم المنفذ
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (!stdout) return resolve();
      const lines = stdout.split('\n');
      const pids = new Set();
      lines.forEach(line => {
        const pid = line.trim().split(/\s+/).pop();
        if (!isNaN(pid)) pids.add(pid);
      });
      pids.forEach(pid => {
        try { process.kill(pid); } catch {}
      });
      setTimeout(resolve, 500);
    });
  });
}

// نسخ مجلدات
function copyFolderRecursive(source, target) {
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  if (fs.lstatSync(source).isDirectory()) {
    fs.readdirSync(source).forEach(file => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursive(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

// ------------------ تشغيل Next Production ------------------

async function startProductionServer() {
  try {
    // kill port إذا مش فاضي
    const portAvailable = await checkPort(4001);
    if (!portAvailable) {
      console.log('Port 4001 in use, killing...');
      await killProcessOnPort(4001);
    }

    // البحث عن مسار Next.js standalone
    const possiblePaths = [
      // في حالة extraResources (Production)
      path.join(process.resourcesPath, 'app'),
      // في حالة development
      path.join(process.cwd(), '.next', 'standalone'),
      // fallback
      process.cwd()
    ];

    let appPath = null;
    let serverFile = null;

    // البحث عن server.js
    for (const testPath of possiblePaths) {
      const serverPath = path.join(testPath, 'server.js');
      console.log('Checking path:', serverPath);
      if (fs.existsSync(serverPath)) {
        appPath = testPath;
        serverFile = serverPath;
        console.log('✓ Found server at:', serverPath);
        break;
      }
    }

    // إذا مش لاقيين standalone، نستخدم npx next start
    if (!serverFile) {
      console.log('Standalone not found, using npx next start');
      appPath = possiblePaths.find(p => fs.existsSync(path.join(p, 'package.json')));
      if (!appPath) throw new Error('Next.js files not found');

      serverProcess = spawn('npx', ['next', 'start', '-p', '4001', '-H', '0.0.0.0'], {
        cwd: appPath,
        env: { ...process.env, NODE_ENV: 'production', PORT: '4001', HOSTNAME: '0.0.0.0' },
        shell: true,
        stdio: 'pipe'
      });
    } else {
      // تشغيل standalone server.js
      console.log('Starting standalone server');
      serverProcess = spawn('node', [serverFile], {
        cwd: appPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '4001',
          HOSTNAME: '0.0.0.0'
        },
        shell: false,
        stdio: 'pipe'
      });
    }

    serverProcess.stdout.on('data', data => console.log(`Next: ${data}`));
    serverProcess.stderr.on('data', data => console.error(`Next ERR: ${data}`));
    serverProcess.on('error', err => console.error('Server failed:', err));
    serverProcess.on('exit', code => { if (code !== 0) console.error('Server exited code:', code); });

  } catch (error) {
    console.error('Error starting server:', error);
    dialog.showErrorBox('خطأ في السيرفر', error.message);
  }
}

// ------------------ إنشاء نافذة Electron ------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    center: true,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: !isDev,
    title: 'نظام إدارة الصالة الرياضية',
    backgroundColor: '#ffffff',
    show: false
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  const startUrl = 'http://localhost:4001';
  let attempts = 0, maxAttempts = 30;

  const loadApp = () => {
    attempts++;
    http.get(startUrl, () => mainWindow.loadURL(startUrl))
      .on('error', () => {
        if (attempts < maxAttempts) setTimeout(loadApp, 1000);
        else {
          dialog.showErrorBox('خطأ في التشغيل', 'فشل في بدء خادم التطبيق. يرجى إعادة تشغيل البرنامج.');
          app.quit();
        }
      });
  };
  setTimeout(loadApp, isDev ? 100 : 3000);

  if (isDev) mainWindow.webContents.openDevTools();
  else {
    mainWindow.removeMenu();
    Menu.setApplicationMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

// ------------------ أحداث التطبيق ------------------

app.whenReady().then(async () => {
  if (!isDev) await startProductionServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  if (error.code !== 'EPIPE') dialog.showErrorBox('خطأ غير متوقع', error.message);
});

app.on('before-quit', async () => {
  if (serverProcess) serverProcess.kill();
  await killProcessOnPort(4001);
});
