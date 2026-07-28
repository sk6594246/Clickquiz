/* --------------------------------------------------------------
   0️⃣  Imports & token bootstrap
   -------------------------------------------------------------- */
import tokens from './tokens.json' assert { type: 'json' };

// Turn tokens into CSS custom properties (run once)
function applyTokens(obj, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const name = `--${prefix}${k}`.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (v && typeof v === 'object') applyTokens(v, `${k}-`);
    else document.documentElement.style.setProperty(name, v);
  }
}
applyTokens(tokens.color);
applyTokens(tokens.colorDark, 'dark-');
applyTokens(tokens.space, 'space-');
applyTokens(tokens.radius, 'radius-');
applyTokens(tokens.shadow, 'shadow-');
document.documentElement.style.setProperty('--transition', tokens.transition);
document.documentElement.style.setProperty('--font-family', tokens.type.fontFamily);
document.documentElement.style.setProperty('--type-base', tokens.type.base);
document.documentElement.style.setProperty('--type-scale', tokens.type.scale);
for (const [k, v] of Object.entries(tokens.zIndex)) {
  document.documentElement.style.setProperty(`--z-${k}`, v);
}

/* --------------------------------------------------------------
   1️⃣  DOM shortcuts
   -------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const els = {
  panels: $('#panels'),
  tabs: $$('.tab-btn'),
  themeToggle: $('#themeToggle'),
  imagePicker: $('#imagePicker'),
  btnGenerate: $('#btnGenerate'),
  quizContainer: $('#quizContainer'),
  quizProgress: $('#quizProgress'),
  btnPrev: $('#btnPrev'),
  btnNext: $('#btnNext'),
  historyList: $('#historyList'),
  toastContainer: $('#toastContainer'),
  loader: $('#loaderOverlay')
};

/* --------------------------------------------------------------
   2️⃣  State (persisted in localStorage)
   -------------------------------------------------------------- */
const STORAGE_KEY = 'photoQuizState';
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  theme: 'light',
  images: [],          // DataURLs (images) or {type:'pdf', data:DataURL, name}
  quiz: null,          // {questions:[{q, options:[], answerIdx}], current:0, score:0, answers:[]}
  history: []          // [{date, title, score, total}]
};

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* --------------------------------------------------------------
   3️⃣  Theme handling
   -------------------------------------------------------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  els.themeToggle.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}
applyTheme(state.theme);
els.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  persist();
});

/* --------------------------------------------------------------
   4️⃣  Tab navigation (keyboard 1/2/3)
   -------------------------------------------------------------- */
const TABS = ['create','quiz','history'];
function showTab(name) {
  TABS.forEach(t => {
    const panel = $(`#tab-${t}`);
    const btn = $(`#btn-${t}`);
    const active = t === name;
    panel.classList.toggle('hidden', !active);
    btn.setAttribute('aria-selected', active);
  });
  // scroll panels to top
  els.panels.scrollTop = 0;
}
els.tabs.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
window.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '3' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const idx = Number(e.key) - 1;
    if (TABS[idx]) showTab(TABS[idx]);
  }
});

/* --------------------------------------------------------------
   5️⃣  Toast / Loader helpers
   -------------------------------------------------------------- */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  els.toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function showLoader(on) { els.loader.classList.toggle('hidden', !on); }

/* --------------------------------------------------------------
   6️⃣  Image / PDF picker (Create tab)
   -------------------------------------------------------------- */
const MAX_FILES = 6;
const ACCEPT_IMG = 'image/*';
const ACCEPT_PDF = 'application/pdf';

function renderPicker() {
  const slots = [];
  for (let i = 0; i < MAX_FILES; i++) {
    const file = state.images[i];
    if (file) {
      const src = file.type === 'pdf' ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23dc2626" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 6h5v5h-5z"/></svg>' : file.data;
      slots.push(`
        <div class="image-slot has-image" data-index="${i}" tabindex="0" role="button" aria-label="Remove ${file.type === 'pdf' ? 'PDF' : 'image'} ${i+1}">
          ${file.type === 'pdf' ? `<img src="${src}" alt="PDF">` : `<img src="${src}" alt="Image ${i+1}">`}
          <button class="remove-btn" data-index="${i}" aria-label="Delete">&times;</button>
        </div>
      `);
    } else {
      slots.push(`
        <div class="image-slot empty" data-index="${i}" role="group" aria-label="Add file ${i+1}">
          <button class="add-opt" data-source="camera" type="button" aria-label="Take photo">
            <svg class="icon" viewBox="0 0 24 24"><path d="M12 4a8 8 0 0 1 8 8v2H4v-2a8 8 0 0 1 8-8zm0 2a6 6 0 0 0-6 6v2h12v-2a6 6 0 0 0-6-6zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>
            <span>Take photo</span>
          </button>
          <input id="cam${i}" class="hidden-input" type="file" accept="${ACCEPT_IMG}" capture="environment" multiple aria-hidden="true">

          <button class="add-opt" data-source="library" type="button" aria-label="Choose image or PDF">
            <svg class="icon" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            <span>Choose file</span>
          </button>
          <input id="lib${i}" class="hidden-input" type="file" accept="${ACCEPT_IMG},${ACCEPT_PDF}" multiple aria-hidden="true">
        </div>
      `);
    }
  }
  els.imagePicker.innerHTML = slots.join('');
  bindPicker();
}

function bindPicker() {
  // camera buttons
  $$('.add-opt[data-source="camera"]', els.imagePicker).forEach(btn => {
    const idx = +btn.closest('.image-slot').dataset.index;
    const input = $(`#cam${idx}`);
    btn.onclick = () => input.click();
    btn.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => handleFiles(input.files, idx);
  });
  // library buttons
  $$('.add-opt[data-source="library"]', els.imagePicker).forEach(btn => {
    const idx = +btn.closest('.image-slot').dataset.index;
    const input = $(`#lib${idx}`);
    btn.onclick = () => input.click();
    btn.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => handleFiles(input.files, idx);
  });
  // remove buttons
  $$('.remove-btn', els.imagePicker).forEach(btn => {
    btn.onclick = e => { e.stopPropagation(); removeFile(+btn.dataset.index); };
  });
  // slot click to remove (optional)
  $$('.image-slot.has-image', els.imagePicker).forEach(slot => {
    slot.onclick = () => removeFile(+slot.dataset.index);
    slot.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeFile(+slot.dataset.index); } };
  });
  updateGenerateBtn();
}

function handleFiles(fileList, startIdx) {
  const files = [...fileList];
  let idx = startIdx;
  for (const f of files) {
    if (idx >= MAX_FILES) break;
    const reader = new FileReader();
    reader.onload = () => {
      const type = f.type.startsWith('image/') ? 'image' : 'pdf';
      state.images[idx] = { type, data: reader.result, name: f.name };
      idx++;
      persist(); renderPicker();
    };
    reader.readAsDataURL(f);
  }
}
function removeFile(i) {
  state.images.splice(i,1);
  persist(); renderPicker();
}
function updateGenerateBtn() {
  els.btnGenerate.disabled = state.images.length === 0;
}

/* --------------------------------------------------------------
   7️⃣  Quiz generation (Gemini API – placeholder)
   -------------------------------------------------------------- */
async function callGemini(prompt, images) {
  // ---- USER: replace with your real Gemini call ----
  // Example using fetch to a proxy you host:
  // const res = await fetch('/api/gemini', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt, images})});
  // return res.json();
  // -------------------------------------------------
  // Mock response for demo:
  return {
    questions: [
      { q: "What is the dominant color in the first image?", options: ["Red","Blue","Green","Yellow"], answerIdx: 1 },
      { q: "How many pages does the PDF have?", options: ["1","2","3","4"], answerIdx: 2 }
    ]
  };
}

els.btnGenerate.addEventListener('click', async () => {
  showLoader(true);
  try {
    // Build prompt + send only image data URLs (PDF ignored by vision model)
    const imageData = state.images.filter(f => f.type === 'image').map(f => f.data);
    const result = await callGemini('Create a 2‑question multiple‑choice quiz from these files.', imageData);
    state.quiz = { ...result, current: 0, score: 0, answers: [] };
    persist(); showTab('quiz'); renderQuiz();
    toast('Quiz ready!', 'success');
  } catch (e) {
    console.error(e); toast('Generation failed', 'error');
  } finally { showLoader(false); }
});

/* --------------------------------------------------------------
   8️⃣  Quiz rendering & navigation
   -------------------------------------------------------------- */
function renderQuiz() {
  if (!state.quiz) return;
  const q = state.quiz.questions[state.quiz.current];
  const answered = state.quiz.answers[state.quiz.current] !== undefined;
  els.quizContainer.innerHTML = `
    <article class="question-card" role="region" aria-label="Question ${state.quiz.current+1} of ${state.quiz.questions.length}">
      <h3>${q.q}</h3>
      <div class="options" role="radiogroup" aria-label="Answer options">
        ${q.options.map((opt,i)=>`<button class="option-btn ${answered ? (i===q.answerIdx?'correct':(i===state.quiz.answers[state.quiz.current]?'incorrect':'')) : ''}" data-idx="${i}" ${answered?'disabled':''}>${opt}</button>`).join('')}
      </div>
    </article>
  `;
  // progress bar
  const pct = ((state.quiz.current+1)/state.quiz.questions.length)*100;
  els.quizProgress.innerHTML = `
    <span>Question ${state.quiz.current+1} / ${state.quiz.questions.length}</span>
    <div class="progress-bar"><div style="width:${pct}%"></div></div>
  `;
  // button states
  els.btnPrev.disabled = state.quiz.current === 0;
  els.btnNext.disabled = !answered && state.quiz.current === state.quiz.questions.length-1;
  els.btnNext.textContent = state.quiz.current === state.quiz.questions.length-1 ? 'Finish' : 'Next';

  // bind option clicks
  $$('.option-btn:not(:disabled)', els.quizContainer).forEach(btn => {
    btn.onclick = () => selectAnswer(+btn.dataset.idx);
  });
}
function selectAnswer(idx) {
  const q = state.quiz.questions[state.quiz.current];
  state.quiz.answers[state.quiz.current] = idx;
  if (idx === q.answerIdx) state.quiz.score++;
  persist(); renderQuiz();
}
els.btnPrev.onclick = () => { if (state.quiz.current>0){ state.quiz.current--; persist(); renderQuiz(); } };
els.btnNext.onclick = () => {
  if (state.quiz.current < state.quiz.questions.length-1) {
    state.quiz.current++; persist(); renderQuiz();
  } else {
    finishQuiz();
  }
};
function finishQuiz() {
  const record = { date: Date.now(), title: `Quiz ${new Date().toLocaleString()}`, score: state.quiz.score, total: state.quiz.questions.length };
  state.history.unshift(record); state.quiz = null; persist();
  showTab('history'); renderHistory(); toast(`Finished – ${record.score}/${record.total}`, 'success');
}

/* --------------------------------------------------------------
   9️⃣  History tab + PDF export
   -------------------------------------------------------------- */
function renderHistory() {
  els.historyList.innerHTML = state.history.map((h,i)=>`<li class="history-item" data-idx="${i}">
    <div><h4>${h.title}</h4><div class="history-meta">${new Date(h.date).toLocaleString()} – ${h.score}/${h.total}</div></div>
    <div class="history-actions">
      <button class="btn ghost" data-action="view" data-idx="${i}">View</button>
      <button class="btn ghost" data-action="pdf" data-idx="${i}">PDF</button>
      <button class="btn ghost" data-action="del" data-idx="${i}">Delete</button>
    </div>
  </li>`).join('');
  $$('.history-item button', els.historyList).forEach(b=>b.onclick=()=>historyAction(b.dataset.action, +b.dataset.idx));
}
function historyAction(act, idx) {
  const rec = state.history[idx];
  if (act==='del') { state.history.splice(idx,1); persist(); renderHistory(); toast('Deleted','success'); return; }
  if (act==='view') { alert(`Score: ${rec.score}/${rec.total}`); return; }
  if (act==='pdf') exportPDF(rec);
}
function exportPDF(rec) {
  const { jsPDF } = window.jspdf; // loaded via CDN in index.html (see below)
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text(rec.title, 14, 22);
  doc.setFontSize(12); doc.text(`Date: ${new Date(rec.date).toLocaleString()}`, 14, 30);
  doc.text(`Score: ${rec.score} / ${rec.total}`, 14, 38);
  doc.save(`quiz-${rec.date}.pdf`);
}

/* --------------------------------------------------------------
   🔟  Service‑worker registration
   -------------------------------------------------------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => console.log('SW registered', reg.scope))
    .catch(err => console.warn('SW registration failed', err));
}

/* --------------------------------------------------------------
   1️⃣1️⃣  Initial render
   -------------------------------------------------------------- */
renderPicker();
renderHistory();
showTab('create');   // default tab
