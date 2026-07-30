/**
 * KANZ UL ILM — admin-additions.js
 * Admin Panel Extensions:
 *   1. AI Article Writer (Claude API)
 *   2. Bulk CSV Import
 *   3. Comments Viewer & Manager
 *
 * HOW TO USE:
 * Add this script at the END of admin/index.html, before </body>:
 *   <script src="./admin-additions.js"></script>
 *
 * Then add these buttons to the admin sidebar (inside <aside class="aside">):
 *   <button class="aside-item" id="nav-ai-writer" onclick="showPanel('ai-writer')">🤖 AI مضمون</button>
 *   <button class="aside-item" id="nav-csv-import" onclick="showPanel('csv-import')">📥 CSV درآمد</button>
 *   <button class="aside-item" id="nav-comments-mgr" onclick="showPanel('comments-mgr')">💬 تبصرے</button>
 *
 * And add these panel divs inside <main class="main">:
 *   <div id="panel-ai-writer"   style="display:none"></div>
 *   <div id="panel-csv-import"  style="display:none"></div>
 *   <div id="panel-comments-mgr" style="display:none"></div>
 */

(function() {
'use strict';

/* ============================================================
   WAIT FOR DOM
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  /* ── Inject panel HTML if panels exist ── */
  injectAIWriterPanel();
  injectCSVImportPanel();
  injectCommentsManagerPanel();

  /* ── Patch showPanel to handle new panels ── */
  const _origShow = window.showPanel;
  window.showPanel = function(name) {
    const extras = ['ai-writer','csv-import','comments-mgr'];
    if (extras.includes(name)) {
      // Hide all panels
      document.querySelectorAll('.main > div[id^="panel-"]').forEach(p => p.style.display = 'none');
      // Remove active from sidebar
      document.querySelectorAll('.aside-item').forEach(b => b.classList.remove('active'));
      // Show target
      const target = document.getElementById('panel-' + name);
      if (target) { target.style.display = 'block'; }
      const btn = document.getElementById('nav-' + name);
      if (btn) btn.classList.add('active');

      // Load dynamic content
      if (name === 'comments-mgr') loadAllComments();
      if (name === 'ai-writer') resetAIWriter();
    } else if (_origShow) {
      _origShow(name);
    }
  };

});

/* ============================================================
   HELPER: shared styles
   ============================================================ */
function addPanelStyles() {
  if (document.getElementById('kanz-add-styles')) return;
  const s = document.createElement('style');
  s.id = 'kanz-add-styles';
  s.textContent = `
    .add-section { background:#fff; border:1.5px solid #e0d8cc; border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.25rem; }
    .add-section-title { font-size:.88rem; font-weight:700; color:#7a1515; margin-bottom:1rem; border-bottom:1.5px solid #f0ead8; padding-bottom:.5rem; display:flex; align-items:center; gap:.5rem; }
    .add-field { display:flex; flex-direction:column; gap:.3rem; margin-bottom:.85rem; }
    .add-label { font-size:.75rem; font-weight:700; color:#7a7060; }
    .add-input { font-family:inherit; font-size:.92rem; direction:rtl; border:1.5px solid #ddd5c0; border-radius:8px; padding:.5rem .85rem; background:#fff; color:#1c1810; outline:none; transition:border .15s; width:100%; box-sizing:border-box; }
    .add-input:focus { border-color:#7a1515; }
    .add-textarea { font-family:inherit; font-size:.92rem; direction:rtl; border:1.5px solid #ddd5c0; border-radius:8px; padding:.5rem .85rem; background:#fff; color:#1c1810; outline:none; transition:border .15s; width:100%; box-sizing:border-box; resize:vertical; min-height:120px; }
    .add-textarea:focus { border-color:#7a1515; }
    .add-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.6rem 1.25rem; border-radius:8px; border:none; font-family:inherit; font-size:.88rem; cursor:pointer; transition:opacity .15s; }
    .add-btn:disabled { opacity:.55; cursor:not-allowed; }
    .add-btn-primary { background:#7a1515; color:#fff; }
    .add-btn-primary:hover:not(:disabled) { background:#5c1010; }
    .add-btn-green  { background:#1a4731; color:#fff; }
    .add-btn-green:hover:not(:disabled) { background:#2d6a4f; }
    .add-btn-gold   { background:#9a7b2c; color:#fff; }
    .add-btn-gold:hover:not(:disabled) { background:#7a6020; }
    .add-log { background:#0f0e0c; color:#a8f0b8; font-family:monospace; font-size:.78rem; border-radius:8px; padding:.85rem 1rem; margin-top:.85rem; min-height:60px; white-space:pre-wrap; display:none; }
    .add-log.visible { display:block; }
    .add-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .add-table th { background:#7a1515; color:#fff; padding:.5rem .75rem; text-align:right; }
    .add-table td { padding:.5rem .75rem; border-bottom:1px solid #ede7dc; text-align:right; vertical-align:top; }
    .add-table tr:hover td { background:#fdf7f0; }
    .add-badge { display:inline-block; border-radius:20px; padding:1px 8px; font-size:.7rem; font-weight:600; }
    .add-badge-green { background:#e8f4ee; color:#1a4731; border:1px solid #a3d9b8; }
    .add-badge-red   { background:#fef2f2; color:#7a1515; border:1px solid #fca5a5; }
    .ai-stream-box { background:#f0fdf4; border:1.5px solid #a3d9b8; border-radius:10px; padding:1rem 1.25rem; margin-top:.85rem; min-height:80px; font-size:.92rem; line-height:2.1; direction:rtl; white-space:pre-wrap; display:none; }
    .ai-stream-box.visible { display:block; }
    @keyframes add-spin { to { transform:rotate(360deg); } }
    .add-spinner { width:18px;height:18px;border:2.5px solid #ddd;border-top-color:#7a1515;border-radius:50%;animation:add-spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-left:.4rem; }
  `;
  document.head.appendChild(s);
}

/* ============================================================
   1. AI ARTICLE WRITER
   ============================================================ */
function injectAIWriterPanel() {
  addPanelStyles();
  const panel = document.getElementById('panel-ai-writer');
  if (!panel) return;

  panel.innerHTML = `
    <div class="page-title" style="font-size:1.3rem;font-weight:700;color:#7a1515;border-bottom:2px solid #7a1515;padding-bottom:.6rem;margin-bottom:1.25rem;">🤖 AI سے مضمون لکھوائیں</div>

    <div class="add-section">
      <div class="add-section-title">📝 مضمون کی معلومات</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="add-field">
          <label class="add-label">موضوع / عنوان</label>
          <input class="add-input" id="ai-topic" dir="rtl" placeholder="مثلاً: نماز کی اہمیت اسلام میں">
        </div>
        <div class="add-field">
          <label class="add-label">مصنف کا نام</label>
          <input class="add-input" id="ai-author" dir="rtl" placeholder="مثلاً: مفتی محمد قاسم">
        </div>
        <div class="add-field">
          <label class="add-label">مضمون کی قسم</label>
          <select class="add-input" id="ai-style">
            <option value="academic">علمی / تحقیقی</option>
            <option value="simple">آسان / عوامی</option>
            <option value="kids">بچوں کے لیے</option>
            <option value="fatwa">فتوی انداز</option>
            <option value="story">کہانی انداز</option>
          </select>
        </div>
        <div class="add-field">
          <label class="add-label">لمبائی</label>
          <select class="add-input" id="ai-length">
            <option value="short">مختصر (300-500 الفاظ)</option>
            <option value="medium" selected>درمیانہ (600-900 الفاظ)</option>
            <option value="long">تفصیلی (1000+ الفاظ)</option>
          </select>
        </div>
      </div>
      <div class="add-field">
        <label class="add-label">اضافی ہدایات (اختیاری)</label>
        <textarea class="add-textarea" id="ai-extra" dir="rtl" rows="2" placeholder="مثلاً: حنفی فقہ کے مطابق لکھیں، قرآنی آیات شامل کریں..."></textarea>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
        <button class="add-btn add-btn-green" id="ai-generate-btn" onclick="generateAIArticle()">
          ✨ مضمون لکھوائیں
        </button>
        <button class="add-btn add-btn-gold" id="ai-use-btn" onclick="useAIArticle()" style="display:none;">
          📋 ایڈیٹر میں بھیجیں
        </button>
        <button class="add-btn" onclick="resetAIWriter()" style="background:#f5f0e8;color:#7a7060;">
          🗑️ صاف کریں
        </button>
      </div>
    </div>

    <div class="add-section" id="ai-result-section" style="display:none;">
      <div class="add-section-title">✅ AI کا لکھا مضمون</div>
      <div class="ai-stream-box visible" id="ai-result-box" dir="rtl"></div>
      <div id="ai-word-count" style="font-size:.75rem;color:#9a9080;margin-top:.5rem;font-family:sans-serif;"></div>
    </div>
  `;
}

window._aiGeneratedArticle = null;

window.generateAIArticle = async function() {
  const topic  = document.getElementById('ai-topic')?.value.trim();
  const author = document.getElementById('ai-author')?.value.trim() || 'ادارہ';
  const style  = document.getElementById('ai-style')?.value || 'academic';
  const length = document.getElementById('ai-length')?.value || 'medium';
  const extra  = document.getElementById('ai-extra')?.value.trim() || '';

  if (!topic) { alert('موضوع لکھنا ضروری ہے!'); document.getElementById('ai-topic')?.focus(); return; }

  const btn = document.getElementById('ai-generate-btn');
  const resultSection = document.getElementById('ai-result-section');
  const resultBox = document.getElementById('ai-result-box');
  const useBtn = document.getElementById('ai-use-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="add-spinner"></span> AI لکھ رہا ہے...';
  resultSection.style.display = 'block';
  resultBox.textContent = '⏳ مضمون تیار ہو رہا ہے...';
  useBtn.style.display = 'none';

  const styleMap = {
    academic: 'علمی اور تحقیقی انداز میں، حوالہ جات کے ساتھ',
    simple:   'آسان اور عوامی زبان میں',
    kids:     'بچوں کی سمجھ کے مطابق آسان زبان میں',
    fatwa:    'فتوی کے انداز میں، مسئلہ اور جواب کی شکل میں',
    story:    'کہانی اور واقعات کے انداز میں'
  };
  const lengthMap = {
    short: '300 سے 500 الفاظ',
    medium: '600 سے 900 الفاظ',
    long: '1000 سے 1500 الفاظ'
  };

  const prompt = `آپ کنز العلم انٹرنیشنل کے لیے ایک اردو مضمون لکھیں۔

موضوع: "${topic}"
انداز: ${styleMap[style]}
لمبائی: ${lengthMap[length]}
${extra ? 'اضافی ہدایات: ' + extra : ''}

ہدایات:
- مکمل مضمون اردو میں لکھیں
- مضمون کا آغاز عنوان سے نہ کریں (وہ الگ دیا جائے گا)
- مضمون کو منطقی طور پر ترتیب دیں
- اسلامی مضمون ہو تو قرآنی آیات یا احادیث کا حوالہ شامل کریں
- ${styleMap[style]}
- صرف مضمون کا متن لکھیں، کوئی ابتدائیہ یا اختتامیہ نہیں`;

  try {
    // ⚠️ براہِ راست api.anthropic.com کال CORS سے بلاک ہوتی ہے اور API key
    //    براؤزر میں ظاہر کر دیتی ہے۔ اس لیے Cloudflare Function کے ذریعے۔
    const res = await fetch('/api/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, maxTokens: 2000 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.summary || data.error || ('API خرابی: ' + res.status));
    const text = data.text || data.summary || '';
    if (!text) throw new Error('AI نے خالی جواب دیا');

    window._aiGeneratedArticle = { title: topic, body: text, author };
    resultBox.textContent = text;
    const wc = text.trim().split(/\s+/).length;
    document.getElementById('ai-word-count').textContent = `الفاظ: ${wc}`;
    useBtn.style.display = 'inline-flex';
    btn.innerHTML = '✨ دوبارہ لکھوائیں';
  } catch(e) {
    resultBox.textContent = '⚠️ خرابی: ' + e.message + '\n\nدوبارہ کوشش کریں۔';
  } finally {
    btn.disabled = false;
  }
};

window.useAIArticle = function() {
  const art = window._aiGeneratedArticle;
  if (!art) return;

  // Fill write panel fields
  const titleEl = document.getElementById('f-title');
  if (titleEl) titleEl.value = art.title;

  const authorEl = document.getElementById('f-author');
  if (authorEl) authorEl.value = art.author;

  // Fill editor
  const ED = document.getElementById('editor') || document.querySelector('[contenteditable="true"]');
  if (ED) {
    // Convert newlines to paragraphs
    ED.innerHTML = art.body.split('\n\n').filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`).join('');
  }

  if (window.showPanel) window.showPanel('write');
  alert('✅ مضمون ایڈیٹر میں بھیج دیا گیا!\nاب تفصیلات مکمل کریں اور شائع کریں۔');
};

window.resetAIWriter = function() {
  const fields = ['ai-topic','ai-author','ai-extra'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const rs = document.getElementById('ai-result-section');
  if (rs) rs.style.display = 'none';
  const ub = document.getElementById('ai-use-btn');
  if (ub) ub.style.display = 'none';
  const btn = document.getElementById('ai-generate-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = '✨ مضمون لکھوائیں'; }
  window._aiGeneratedArticle = null;
};

/* ============================================================
   2. BULK CSV IMPORT
   ============================================================ */
function injectCSVImportPanel() {
  const panel = document.getElementById('panel-csv-import');
  if (!panel) return;

  panel.innerHTML = `
    <div class="page-title" style="font-size:1.3rem;font-weight:700;color:#7a1515;border-bottom:2px solid #7a1515;padding-bottom:.6rem;margin-bottom:1.25rem;">📥 CSV سے مضامین درآمد کریں</div>

    <div class="add-section">
      <div class="add-section-title">📋 CSV فارمیٹ</div>
      <p style="font-size:.85rem;color:#7a7060;margin-bottom:.75rem;direction:rtl;line-height:1.9;">
        CSV فائل میں پہلی لائن headings ہونی چاہیے۔ ضروری columns:
      </p>
      <code style="display:block;background:#0f0e0c;color:#a8f0b8;padding:.75rem 1rem;border-radius:8px;font-size:.78rem;direction:ltr;line-height:1.8;">
title,author,subcategoryId,body,summary,tags,date,hasPdf,status
      </code>
      <p style="font-size:.78rem;color:#9a9080;margin-top:.5rem;direction:rtl;">
        • <strong>title, author, subcategoryId, body</strong> — ضروری<br>
        • <strong>tags</strong> — پائپ سے الگ کریں: <code>نماز|فقہ|عبادت</code><br>
        • <strong>status</strong> — published یا draft (default: published)<br>
        • <strong>subcategoryId</strong> مثال: <code>namaz-farz</code>, <code>islamic-finance</code>
      </p>
      <button class="add-btn add-btn-gold" onclick="downloadCSVTemplate()" style="margin-top:.75rem;">
        ⬇️ نمونہ CSV ڈاؤنلوڈ کریں
      </button>
    </div>

    <div class="add-section">
      <div class="add-section-title">📂 CSV فائل منتخب کریں</div>
      <input type="file" id="csv-file-input" accept=".csv,text/csv"
        style="font-family:sans-serif;font-size:.88rem;padding:.4rem;border:1.5px dashed #ddd5c0;border-radius:8px;width:100%;box-sizing:border-box;cursor:pointer;"
        onchange="previewCSV(this)">
      <div id="csv-preview" style="margin-top:1rem;display:none;">
        <div style="font-size:.82rem;font-weight:700;color:#7a7060;margin-bottom:.6rem;">پیش نظارہ (پہلے 5 مضامین):</div>
        <div style="overflow-x:auto;"><table class="add-table" id="csv-table"></table></div>
        <div id="csv-summary" style="margin-top:.6rem;font-size:.82rem;color:#1a4731;font-family:sans-serif;"></div>
        <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap;">
          <button class="add-btn add-btn-primary" id="csv-import-btn" onclick="importCSV()">
            📥 تمام درآمد کریں
          </button>
          <button class="add-btn" onclick="clearCSV()" style="background:#f5f0e8;color:#7a7060;">
            🗑️ منسوخ
          </button>
        </div>
      </div>
      <div class="add-log" id="csv-log"></div>
    </div>
  `;
}

window._csvParsed = [];

window.downloadCSVTemplate = function() {
  const header = 'title,author,subcategoryId,body,summary,tags,date,hasPdf,status';
  const row1   = '"نماز کی اہمیت","مفتی محمد قاسم","namaz-farz","نماز اسلام کا دوسرا رکن ہے...","نماز کی اہمیت کا بیان","نماز|عبادت|فقہ","2024-01-15","false","published"';
  const row2   = '"اسلامی بینکاری","ڈاکٹر عمر","islamic-finance","اسلامی بینکاری کا تعارف...","بینکاری کے اصول","معاشیات|بینک","2024-01-20","false","published"';
  const csv    = [header, row1, row2].join('\n');
  const blob   = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a'); a.href = url; a.download = 'kanz-template.csv'; a.click();
  URL.revokeObjectURL(url);
};

window.previewCSV = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result.replace(/^\uFEFF/, ''); // remove BOM
      const rows = parseCSVText(text);
      if (rows.length < 2) { alert('CSV خالی یا غلط فارمیٹ میں ہے'); return; }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const required = ['title','author','subcategoryid','body'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length) { alert('ضروری columns نہیں ملیں: ' + missing.join(', ')); return; }

      window._csvParsed = rows.slice(1).filter(r => r.some(c => c.trim())).map((row, idx) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (row[i] || '').trim(); });
        return {
          id:            'csv-' + Date.now() + '-' + idx,
          title:         obj.title || '',
          author:        obj.author || 'ادارہ',
          subcategoryId: obj.subcategoryid || obj.subcategoryId || '',
          body:          obj.body || '',
          summary:       obj.summary || '',
          tags:          obj.tags ? obj.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
          date:          obj.date || new Date().toISOString().slice(0,10),
          hasPdf:        obj.haspdf === 'true',
          status:        obj.status || 'published',
          type:          'مضمون'
        };
      }).filter(a => a.title && a.subcategoryId);

      // Preview table
      const preview = window._csvParsed.slice(0,5);
      const tbl = document.getElementById('csv-table');
      tbl.innerHTML = `<thead><tr><th>#</th><th>عنوان</th><th>مصنف</th><th>ذیلی موضوع</th><th>حالت</th></tr></thead>
        <tbody>${preview.map((a,i) => `<tr><td>${i+1}</td><td>${a.title.slice(0,40)}</td><td>${a.author}</td><td><code style="font-size:.7rem;">${a.subcategoryId}</code></td><td><span class="add-badge ${a.status==='published'?'add-badge-green':'add-badge-red'}">${a.status}</span></td></tr>`).join('')}</tbody>`;

      document.getElementById('csv-summary').textContent = `مجموعی: ${window._csvParsed.length} مضامین پائے گئے (${rows.length-1} قطاروں میں سے ${rows.length-1-window._csvParsed.length} نامکمل چھوڑ دیے گئے)`;
      document.getElementById('csv-preview').style.display = 'block';
    } catch(e) { alert('CSV پڑھنے میں خرابی: ' + e.message); }
  };
  reader.readAsText(file, 'UTF-8');
};

/* Simple CSV parser — handles quoted fields with commas */
function parseCSVText(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) { row.push(cur); cur = ''; }
      else cur += ch;
    }
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

window.importCSV = async function() {
  const arts = window._csvParsed;
  if (!arts.length) { alert('پہلے CSV فائل منتخب کریں'); return; }

  const log = document.getElementById('csv-log');
  log.className = 'add-log visible';
  log.textContent = '';

  const addLog = (msg) => { log.textContent += msg + '\n'; log.scrollTop = log.scrollHeight; };
  const btn = document.getElementById('csv-import-btn');
  btn.disabled = true; btn.textContent = '⏳ درآمد ہو رہا ہے...';

  // Check if GitHub is configured
  const ghUser  = localStorage.getItem('kanz_gh_user');
  const ghRepo  = localStorage.getItem('kanz_gh_repo');
  const ghToken = localStorage.getItem('kanz_gh_token');
  const ghPath  = localStorage.getItem('kanz_gh_path') || 'articles/en/data/content.json';
  const ghBranch= localStorage.getItem('kanz_gh_branch') || 'main';

  if (ghToken && ghUser && ghRepo) {
    // GitHub mode — push directly
    addLog(`GitHub موڈ: ${ghUser}/${ghRepo}`);
    try {
      const cfg = { user: ghUser, repo: ghRepo, token: ghToken, path: ghPath, branch: ghBranch };
      const cur = await fetchGHFile(cfg, cfg.path);
      if (!cur) throw new Error('content.json نہیں ملی');
      const data = JSON.parse(atou(cur.content));
      if (!data.articles) data.articles = [];

      let added = 0, skipped = 0;
      for (const art of arts) {
        if (data.articles.find(x => x.title === art.title)) { skipped++; continue; }
        data.articles.push(art); added++;
      }
      addLog(`شامل: ${added} | موجود (چھوڑے): ${skipped}`);
      await pushGHFile(cfg, cfg.path, JSON.stringify(data,null,2), cur.sha, `CSV درآمد: ${added} مضامین [admin]`);
      addLog('✅ GitHub پر push مکمل!');
      addLog(`Cloudflare 1-2 منٹ میں deploy کرے گا`);
    } catch(e) { addLog('❌ خرابی: ' + e.message); }
  } else {
    // Local session mode
    addLog('GitHub غیر مربوط — session میں شامل کیا جا رہا ہے...');
    const SK = 'kanz_admin_session';
    let session = [];
    try { session = JSON.parse(localStorage.getItem(SK) || '[]'); } catch {}
    let added = 0, skipped = 0;
    for (const art of arts) {
      if (session.find(x => x.title === art.title)) { skipped++; continue; }
      session.push(art); added++;
    }
    localStorage.setItem(SK, JSON.stringify(session));
    addLog(`✅ Session میں شامل: ${added} مضامین (${skipped} موجود تھے)`);
    addLog('⚠️ GitHub ترتیبات سیٹ کریں تاکہ براہ راست publish ہو سکے');
    if (window.updateCount) window.updateCount();
  }
  btn.disabled = false; btn.textContent = '📥 تمام درآمد کریں';
};

window.clearCSV = function() {
  window._csvParsed = [];
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-log').className = 'add-log';
  document.getElementById('csv-log').textContent = '';
  const inp = document.getElementById('csv-file-input');
  if (inp) inp.value = '';
};

/* ============================================================
   3. COMMENTS MANAGER
   ============================================================ */
function injectCommentsManagerPanel() {
  const panel = document.getElementById('panel-comments-mgr');
  if (!panel) return;

  panel.innerHTML = `
    <div class="page-title" style="font-size:1.3rem;font-weight:700;color:#7a1515;border-bottom:2px solid #7a1515;padding-bottom:.6rem;margin-bottom:1.25rem;">💬 قارئین کے تبصرے</div>
    <div class="add-section">
      <div class="add-section-title">
        <span>تمام تبصرے</span>
        <button class="add-btn" onclick="loadAllComments()" style="background:#f5f0e8;color:#7a7060;padding:.3rem .75rem;font-size:.75rem;">🔄 تازہ کریں</button>
        <button class="add-btn add-btn-red" onclick="clearAllComments()" style="background:#fef2f2;color:#7a1515;border:1px solid #fca5a5;padding:.3rem .75rem;font-size:.75rem;">🗑️ سب حذف</button>
      </div>
      <div id="comments-mgr-body">
        <div style="text-align:center;padding:2rem;color:#9a9080;">لوڈ ہو رہا ہے...</div>
      </div>
    </div>
  `;
}

window.loadAllComments = function() {
  const body = document.getElementById('comments-mgr-body');
  if (!body) return;

  // Collect all comment keys from localStorage
  const allComments = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kanz_cmts_')) {
      const articleId = key.replace('kanz_cmts_', '');
      try {
        const cmts = JSON.parse(localStorage.getItem(key) || '[]');
        cmts.forEach(c => allComments.push({ ...c, articleId }));
      } catch {}
    }
  }

  if (!allComments.length) {
    body.innerHTML = `<div style="text-align:center;padding:2rem;color:#9a9080;">ابھی کوئی تبصرہ نہیں ہے</div>`;
    return;
  }

  // Sort by date desc
  allComments.sort((a,b) => new Date(b.date) - new Date(a.date));

  body.innerHTML = `
    <div style="font-size:.78rem;color:#9a9080;margin-bottom:.75rem;font-family:sans-serif;">مجموعی تبصرے: ${allComments.length}</div>
    ${allComments.map(c => `
      <div style="border:1px solid #e0d8cc;border-radius:10px;padding:1rem;margin-bottom:.75rem;direction:rtl;background:#faf7f0;" id="cmt-mgr-${c.id}">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap;">
          <span style="background:#7a1515;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;flex-shrink:0;">${(c.name||'م')[0]}</span>
          <strong style="font-size:.9rem;">${escCmt(c.name)}</strong>
          <span style="font-size:.72rem;color:#9a9080;">${new Date(c.date).toLocaleDateString('ur-PK',{year:'numeric',month:'long',day:'numeric'})}</span>
          <code style="font-size:.68rem;background:#f0ead8;padding:1px 6px;border-radius:4px;margin-right:auto;">${escCmt(c.articleId)}</code>
          <button onclick="deleteComment('${c.articleId}','${c.id}')" style="background:none;border:1px solid #fca5a5;color:#7a1515;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:.72rem;">🗑️ حذف</button>
        </div>
        <div style="font-size:.9rem;line-height:2;color:#1c1810;">${escCmt(c.text)}</div>
      </div>`).join('')}
  `;
};

window.deleteComment = function(articleId, commentId) {
  if (!confirm('یہ تبصرہ حذف کریں؟')) return;
  const key = 'kanz_cmts_' + articleId;
  try {
    let cmts = JSON.parse(localStorage.getItem(key) || '[]');
    cmts = cmts.filter(c => String(c.id) !== String(commentId));
    localStorage.setItem(key, JSON.stringify(cmts));
    const el = document.getElementById('cmt-mgr-' + commentId);
    if (el) el.remove();
  } catch(e) { alert('خرابی: ' + e.message); }
};

window.clearAllComments = function() {
  if (!confirm('تمام تبصرے ہمیشہ کے لیے حذف کریں؟')) return;
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kanz_cmts_')) keysToDelete.push(key);
  }
  keysToDelete.forEach(k => localStorage.removeItem(k));
  loadAllComments();
};

function escCmt(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   AUTO-INJECT SIDEBAR BUTTONS & PANELS (if not already present)
   ============================================================ */
(function autoInject() {
  // Add sidebar buttons
  const aside = document.querySelector('.aside');
  if (aside && !document.getElementById('nav-ai-writer')) {
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top:1px solid #e0d8cc;margin:.5rem 0;';
    aside.appendChild(divider);

    [
      { id: 'nav-ai-writer',   label: '🤖 AI مضمون',    panel: 'ai-writer'   },
      { id: 'nav-csv-import',  label: '📥 CSV درآمد',    panel: 'csv-import'  },
      { id: 'nav-comments-mgr',label: '💬 تبصرے مینیجر', panel: 'comments-mgr'}
    ].forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'aside-item';
      btn.id = item.id;
      btn.onclick = () => window.showPanel(item.panel);
      btn.textContent = item.label;
      aside.appendChild(btn);
    });
  }

  // Add panel divs to main
  const main = document.querySelector('.main');
  if (main) {
    ['ai-writer','csv-import','comments-mgr'].forEach(name => {
      if (!document.getElementById('panel-' + name)) {
        const div = document.createElement('div');
        div.id = 'panel-' + name;
        div.style.display = 'none';
        main.appendChild(div);
      }
    });
    // Re-inject content (panels now exist)
    injectAIWriterPanel();
    injectCSVImportPanel();
    injectCommentsManagerPanel();
  }
})();

})(); // end IIFE
