# 🔒 Security Checklist للـ Port Forwarding

## ⚠️ IMPORTANT: لا تفتح النظام على الإنترنت إلا بعد تطبيق كل النقاط دي!

## 1️⃣ إضافة HTTPS/SSL (إجباري!)

### باستخدام Cloudflare Tunnel (الأسهل - مجاني):
```bash
# تثبيت cloudflared
# Windows: حمل من https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation

# بعدين:
cloudflared tunnel --url http://localhost:3000
```

### أو باستخدام Nginx + Let's Encrypt:
```bash
# على Linux VPS
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 2️⃣ تشغيل في Production Mode

```bash
# في package.json أضف:
"scripts": {
  "build": "next build",
  "start": "next start -p 3000"
}

# ثم شغل:
npm run build
npm start
```

## 3️⃣ تأمين Environment Variables

أنشئ ملف `.env.production`:
```env
# JWT Secret (غيره لكود قوي جداً!)
JWT_SECRET=YOUR_VERY_STRONG_RANDOM_SECRET_HERE_MIN_32_CHARS

# Database URL (غير SQLite لو ممكن)
DATABASE_URL="file:./dev.db"

# Node Environment
NODE_ENV=production

# Domain
NEXT_PUBLIC_DOMAIN=https://yourdomain.com
```

## 4️⃣ إضافة Rate Limiting

ثبت:
```bash
npm install express-rate-limit
```

## 5️⃣ تأمين الـ Cookies

في `app/api/auth/login/route.ts`:
```typescript
// غير الـ cookie options:
{
  httpOnly: true,
  secure: true,        // ✅ إضافة
  sameSite: 'strict',  // ✅ إضافة
  maxAge: 60 * 60 * 24 * 7
}
```

## 6️⃣ تفعيل Firewall

```bash
# Windows Firewall:
# Settings > Network & Internet > Windows Firewall
# اسمح فقط للـ Port اللي محتاجه

# Linux:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 7️⃣ Database Backup (مهم جداً!)

```bash
# عمل backup كل يوم:
# Windows Task Scheduler
# أضف task تشغل:
xcopy "C:\Users\amran\Desktop\gym\gym-management\prisma\dev.db" "D:\Backups\gym-db-%date%.db"
```

## 8️⃣ Monitoring & Logging

أضف logging لكل العمليات المهمة:
- Login attempts
- Failed authentications
- File uploads
- Database changes

## 9️⃣ استخدام Reverse Proxy

استخدم Nginx أو Caddy قدام Next.js للحماية الإضافية.

## 🔟 Security Headers

أضف في `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

---

## ⚠️ التحذيرات:

1. **SQLite مش مناسب للـ production** - استخدم PostgreSQL أو MySQL
2. **الـ uploads folder** - محتاج يكون خارج الـ public folder
3. **لا تستخدم port 3000** - استخدم 80 أو 443 فقط
4. **Dynamic IP** - لو الـ IP بتاعك بيتغير، استخدم Dynamic DNS (No-IP, DuckDNS)
5. **Router Security** - غير الـ default password بتاع الراوتر

---

## ✅ البديل الموصى به:

**استخدم Vercel** (مجاني ✅):
1. سجل في vercel.com
2. ارفع الكود على GitHub
3. اربط Vercel بـ GitHub
4. Deploy تلقائي بـ HTTPS!

أو **Railway.app** (أسهل):
1. سجل في railway.app
2. ارفع المشروع
3. Deploy مباشر!

---

## 📊 مقارنة الحلول:

| الحل | السعر | السهولة | الأمان | الأداء |
|-----|-------|---------|--------|--------|
| **Vercel** | مجاني | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Railway** | $5/شهر | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Port Forward** | مجاني | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 🚨 تنبيه نهائي:

**لا تفتح Port Forwarding إلا لو:**
- ✅ عندك Static IP أو Dynamic DNS
- ✅ طبقت كل التأمينات فوق
- ✅ عارف تتعامل مع الـ security issues
- ✅ عندك backup system
- ✅ HTTPS شغال

**وإلا استخدم Cloud Hosting!**
