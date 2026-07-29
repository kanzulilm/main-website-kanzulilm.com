/**
 * KANZ UL ILM — admin-auth.js
 * Admin Panel Password Protection
 * localStorage-based session with SHA-256 hashed password
 *
 * HOW TO USE:
 * 1. Set your password hash below (default: kanzadmin2024)
 * 2. Add this script as the FIRST <script> tag in admin/index.html:
 *    <script src="../admin-auth.js"></script>
 * 3. To change password: run in browser console:
 *    crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourNewPassword'))
 *      .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
 */

(function() {
  'use strict';

  /* ── CONFIGURATION ── */
  // Default password: kanzadmin2024
  // To generate a new hash, run in browser console:
  // crypto.subtle.digest('SHA-256',new TextEncoder().encode('YourPassword'))
  //   .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  // Default password: kanzadmin2024
  // SHA-256 hash of "kanzadmin2024"
  const PASSWORD_HASH = '3135a343709525c35552ae02ff974fac99c95bb5ac89f258513ac5a4f6155f39';

  const SESSION_KEY  = 'kanz_admin_auth';
  const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 hours in ms
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  /* ── HELPER: SHA-256 via Web Crypto API ── */
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return [...new Uint8Array(hashBuffer)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ── SESSION CHECK ── */
  function isAuthenticated() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session.authed || !session.ts) return false;
      if (Date.now() - session.ts > SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      return true;
    } catch { return false; }
  }

  function setAuthenticated() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ authed: true, ts: Date.now() }));
  }

  /* ── LOCKOUT CHECK ── */
  function getLockout() {
    try {
      const raw = localStorage.getItem('kanz_admin_lockout');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function setAttempt(count) {
    localStorage.setItem('kanz_admin_lockout', JSON.stringify({ count, ts: Date.now() }));
  }

  function clearAttempts() {
    localStorage.removeItem('kanz_admin_lockout');
  }

  function isLockedOut() {
    const lockout = getLockout();
    if (!lockout) return false;
    if (lockout.count >= MAX_ATTEMPTS) {
      const elapsed = Date.now() - lockout.ts;
      if (elapsed < LOCKOUT_TIME) return Math.ceil((LOCKOUT_TIME - elapsed) / 60000);
      clearAttempts();
      return false;
    }
    return false;
  }

  /* ── LOGIN UI ── */
  function showLoginUI() {
    // Hide page content immediately
    document.documentElement.style.visibility = 'hidden';

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'kanz-admin-auth';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:linear-gradient(135deg,#5c1010 0%,#7a1515 50%,#8b1a1a 100%);
      display:flex;align-items:center;justify-content:center;
      font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif;
      direction:rtl;
    `;

    overlay.innerHTML = `
      <div style="
        background:#fff;border-radius:16px;padding:2.5rem 2rem;
        width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.4);
        text-align:center;
      ">
        <!-- Logo -->
        <div style="
          width:64px;height:64px;border-radius:50%;
          background:linear-gradient(135deg,#5c1010,#7a1515);
          color:#fff;font-size:1.6rem;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 1rem;border:3px solid #9a7b2c;
        ">ک</div>

        <div style="font-size:1.1rem;font-weight:700;color:#7a1515;margin-bottom:.3rem">
          کنز العلم ایڈمن
        </div>
        <div style="font-size:.78rem;color:#999;margin-bottom:1.75rem;font-family:sans-serif">
          Admin Panel — Kanz ul Ilm International
        </div>

        <!-- Error / Status -->
        <div id="auth-msg" style="
          min-height:2rem;margin-bottom:1rem;
          font-size:.82rem;border-radius:8px;padding:.5rem .75rem;
          display:none;
        "></div>

        <!-- Password field -->
        <div style="position:relative;margin-bottom:1rem;">
          <input id="auth-pass" type="password"
            placeholder="پاس ورڈ درج کریں"
            autocomplete="current-password"
            style="
              width:100%;padding:.75rem 1rem .75rem 2.75rem;
              border:1.5px solid #ddd;border-radius:10px;
              font-size:.95rem;font-family:sans-serif;
              outline:none;transition:border .15s;box-sizing:border-box;
              direction:ltr;letter-spacing:.12em;
            "
          >
          <span style="
            position:absolute;left:.85rem;top:50%;transform:translateY(-50%);
            color:#aaa;font-size:1rem;cursor:pointer;user-select:none;
          " id="auth-eye" title="دکھائیں/چھپائیں">👁️</span>
        </div>

        <!-- Submit -->
        <button id="auth-btn" style="
          width:100%;padding:.8rem;
          background:linear-gradient(135deg,#5c1010,#7a1515);
          color:#fff;border:none;border-radius:10px;
          font-size:1rem;font-family:var(--font,serif);
          cursor:pointer;transition:opacity .15s;
        ">🔐 داخل ہوں</button>

        <div style="margin-top:1.25rem;font-size:.7rem;color:#ccc;font-family:sans-serif">
          محفوظ session — 8 گھنٹے
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';

    const input = overlay.querySelector('#auth-pass');
    const btn   = overlay.querySelector('#auth-btn');
    const msg   = overlay.querySelector('#auth-msg');
    const eye   = overlay.querySelector('#auth-eye');

    // Eye toggle
    eye.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    function showMsg(text, isError) {
      msg.style.display = 'block';
      msg.style.background = isError ? '#fef2f2' : '#f0fdf4';
      msg.style.color       = isError ? '#8b1a1a' : '#1a4731';
      msg.style.border      = isError ? '1px solid #fca5a5' : '1px solid #a3d9b8';
      msg.textContent = text;
    }

    async function tryLogin() {
      const lockMins = isLockedOut();
      if (lockMins) {
        showMsg(`⛔ ${lockMins} منٹ بعد دوبارہ کوشش کریں`, true);
        return;
      }

      const pwd = input.value;
      if (!pwd) { input.focus(); return; }

      btn.disabled = true;
      btn.textContent = '⏳ تصدیق ہو رہی ہے...';

      const hash = await sha256(pwd);

      // Check against stored custom hash OR default
      const storedHash = localStorage.getItem('kanz_admin_pass_hash');
      const validHash  = storedHash || PASSWORD_HASH;

      if (hash === validHash) {
        clearAttempts();
        setAuthenticated();
        showMsg('✅ خوش آمدید! ایڈمن پینل کھل رہا ہے...', false);
        setTimeout(() => {
          overlay.remove();
          document.documentElement.style.visibility = 'visible';
        }, 600);
      } else {
        const lockout = getLockout();
        const attempts = (lockout?.count || 0) + 1;
        setAttempt(attempts);
        const remaining = MAX_ATTEMPTS - attempts;
        if (remaining > 0) {
          showMsg(`❌ غلط پاس ورڈ — ${remaining} کوشش باقی`, true);
        } else {
          showMsg(`⛔ بہت زیادہ غلط کوششیں — 15 منٹ انتظار کریں`, true);
        }
        input.value = '';
        btn.disabled = false;
        btn.textContent = '🔐 داخل ہوں';
        input.focus();
      }
    }

    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

    // Lockout check on open
    const lockMins = isLockedOut();
    if (lockMins) showMsg(`⛔ ${lockMins} منٹ بعد دوبارہ کوشش کریں`, true);

    input.focus();
  }

  /* ── LOGOUT FUNCTION (available globally) ── */
  window.adminLogout = function() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  };

  /* ── CHANGE PASSWORD FUNCTION (available globally) ── */
  window.adminChangePassword = async function(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      alert('پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے');
      return;
    }
    const hash = await sha256(newPassword);
    localStorage.setItem('kanz_admin_pass_hash', hash);
    alert('✅ پاس ورڈ تبدیل ہو گیا!\nاگلی بار نئے پاس ورڈ سے لاگ ان کریں۔');
  };

  /* ── MAIN EXECUTION ── */
  if (!isAuthenticated()) {
    // Wait for DOM then show login
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLoginUI);
    } else {
      showLoginUI();
    }
  }

})();
