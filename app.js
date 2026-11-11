/* Le Club Clem · app */
const SB_URL = 'https://rqlvodbmlctxgjtrlehe.supabase.co';
const SB_KEY = 'sb_publishable_tYvlB9impvgQ_4zdGYX2-w_kwhMPA_x';
const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  journee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M9 21h6M12 7c0-2 1.5-3 3-3M8 8c0-1.5 1-2.5 2-3"/></svg>',
  bouger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 16.5h19v1.5a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1Z"/><path d="M2.5 16.5V9.5l4-1 2 2.5 5 2.5 6 1.5c1 .3 2 1 2 2.5"/><path d="M9 11l1-1.5M11 12l1-1.5M13 13l1-1.5"/></svg>',
  rituel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11Z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/></svg>',
  journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5Z"/><path d="M8 3.5v17"/><path d="M13.5 14.5s-2.5-1.5-2.5-3a1.2 1.2 0 0 1 2.5-.5 1.2 1.2 0 0 1 2.5.5c0 1.5-2.5 3-2.5 3Z"/></svg>'
};
const TABS = [['journee', 'Ma journée'], ['table', 'À table'], ['bouger', 'Bouger'], ['rituel', 'Mon rituel'], ['journal', 'Mon journal']];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SPORTS = ['Marche', 'Course', 'Vélo', 'Natation', 'Yoga', 'Pilates', 'Renfo / salle', 'Danse', 'Cours collectif', 'Autre'];
const LEVELS = { debute: ['Je débute', 30, 30], reprends: ['Je reprends', 40, 20], aise: ["Je suis à l'aise", 45, 15] };
const SLOTS = [['b', 'Petit-déj'], ['l', 'Midi'], ['d', 'Soir']];
const MOMENTS = [['matin', 'Le matin'], ['repas', 'Avant ton plus gros repas'], ['soir', 'Au dîner'], ['coucher', 'Au coucher']];

let C = null;          // contenu
let ME = null;         // membre
let USER = null;
let S = null;          // état synchronisé
let L = null;          // état local (journal, mesures)
let ui = { tab: 'journee', sub: null, arg: null, tableSeg: 'semaine', filter: 'all', day: null, jday: null, timer: null };

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const longDate = s => { const d = parse(s); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- stockage ---------- */
const DEF_S = () => ({ favs: [], plan: {}, extra: [], checked: {}, mine: {}, taken: {}, moves: {}, acts: {}, badges: {}, level: 'debute', own: [], updated: 0 });
const DEF_L = () => ({ journal: {}, mesures: [], showMes: true });
function loadLocal() {
  try { S = Object.assign(DEF_S(), JSON.parse(localStorage.getItem('cc_s_' + USER.id) || '{}')); } catch (e) { S = DEF_S(); }
  try { L = Object.assign(DEF_L(), JSON.parse(localStorage.getItem('cc_l_' + USER.id) || '{}')); } catch (e) { L = DEF_L(); }
}
let syncT = null;
function save() {
  S.updated = Date.now();
  try { localStorage.setItem('cc_s_' + USER.id, JSON.stringify(S)); localStorage.setItem('cc_l_' + USER.id, JSON.stringify(L)); } catch (e) { }
  clearTimeout(syncT);
  syncT = setTimeout(async () => { try { await sb.from('user_state').upsert({ user_id: USER.id, data: S, updated_at: new Date().toISOString() }); } catch (e) { } }, 1500);
}
async function pullRemote() {
  try {
    const { data } = await sb.from('user_state').select('data').eq('user_id', USER.id).maybeSingle();
    if (data && data.data && (data.data.updated || 0) > (S.updated || 0)) S = Object.assign(DEF_S(), data.data);
  } catch (e) { }
}

/* ---------- utilitaires UI ---------- */
function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800); }
function go(tab, sub = null, arg = null) { stopTimer(); ui.tab = tab; ui.sub = sub; ui.arg = arg; render(); window.scrollTo(0, 0); }
function sheet(html, onmount) {
  const el = document.createElement('div'); el.className = 'sheet';
  el.innerHTML = `<div class="in"><div class="wrapi">${html}</div></div>`;
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el); if (onmount) onmount(el); return el;
}
const R = id => C.recipes.find(r => r.id === id) || S.own.find(r => r.id === id);
const P = id => C.produits.find(p => p.id === id);
const back = (label, tab, sub = null, arg = null) => `<button class="back" data-go="${tab}|${sub || ''}|${arg || ''}">‹ ${esc(label)}</button>`;

function nav() {
  return `<nav class="tabs">${TABS.map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-go="${k}||">${ICON[k]}<span>${l}</span></button>`).join('')}</nav>`;
}

/* ---------- connexion ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (!isStandalone() && document.getElementById('skip')) installView(); });
const UA = navigator.userAgent;
const IS_IOS = /iphone|ipad|ipod/i.test(UA), IN_APP = /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Line\//i.test(UA), IOS_CHROME = /CriOS|FxiOS|EdgiOS/i.test(UA);
const SHARE_ICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/></svg>';
function installSteps() {
  const st = (n, t) => `<div class="row" style="align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--filet)"><span style="width:28px;height:28px;border-radius:50%;background:var(--brun);color:var(--ivoire);display:flex;align-items:center;justify-content:center;font-size:14px;flex:none">${n}</span><div style="padding-top:3px">${t}</div></div>`;
  if (IN_APP) return st(1, `Tu es dans le navigateur d'Instagram (ou d'une autre app) : il ne permet pas d'installer le Club. Appuie sur les <b>trois petits points ⋯</b> en haut à droite, puis sur <b>Ouvrir dans ${IS_IOS ? 'Safari' : 'le navigateur'}</b>.`) + st(2, `Une fois la page ouverte, suis les étapes qui s'afficheront.`);
  if (IS_IOS && IOS_CHROME) return st(1, `Appuie sur l'icône <b>Partager</b> ${SHARE_ICO}, en haut à droite à côté de l'adresse.`) + st(2, `Choisis <b>Sur l'écran d'accueil</b> (fais défiler si besoin), puis <b>Ajouter</b>.`) + st(3, `Ferme ton navigateur et ouvre l'icône <b>Club Clem</b> qui vient d'apparaître sur ton écran d'accueil.`);
  if (IS_IOS) return st(1, `Appuie sur l'icône <b>Partager</b> ${SHARE_ICO}, en bas de l'écran (sur certains iPhone, elle est dans le menu <b>⋯</b>).`) + st(2, `Fais défiler et choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b> en haut à droite.`) + st(3, `Ferme ton navigateur et ouvre l'icône <b>Club Clem</b> qui vient d'apparaître sur ton écran d'accueil.`);
  if (deferredPrompt) return `<button class="btn full mt" id="inst">Installer le Club sur mon téléphone</button>` + st(2, `Ouvre ensuite l'icône <b>Club Clem</b> sur ton écran d'accueil.`);
  return st(1, `Ouvre le menu <b>⋮</b> de ton navigateur, en haut à droite.`) + st(2, `Choisis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.`) + st(3, `Ouvre l'icône <b>Club Clem</b> qui vient d'apparaître sur ton écran d'accueil.`);
}
function installView() {
  document.body.classList.add('nonav');
  app.innerHTML = `<div class="wrap" style="padding-top:calc(48px + env(safe-area-inset-top))">
    <div class="head"><span class="lab">Le Club</span><div class="clem">Clem</div><div class="sub">pour celles qui m'ont fait confiance</div></div>
    <div class="card mt2"><span class="lab">Étape 1 sur 2</span><h3 class="mt">D'abord, installe le Club sur ton téléphone</h3>
    <p class="small muted">C'est gratuit et ça prend 10 secondes. Le Club s'ouvrira ensuite comme une vraie app, depuis ton écran d'accueil.</p>
    ${installSteps()}</div>
    <div class="card"><span class="lab">Étape 2 sur 2</span><p style="margin:8px 0 0">Dans l'app installée, entre l'adresse e-mail de tes commandes : tu recevras ton code de connexion.</p></div>
    <p class="center mt"><button class="link small" id="skip">Je préfère continuer sans installer</button></p></div>`;
  $('#skip').onclick = () => loginView('email', localStorage.getItem('cc_email') || '', true);
  const ib = $('#inst'); if (ib) ib.onclick = async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installView(); };
}
function loginView(step = 'email', email = '', forced = false) {
  if (step === 'email' && !forced && !isStandalone() && !sessionStorage.getItem('cc_skip')) { installView(); return; }
  if (forced) sessionStorage.setItem('cc_skip', '1');
  document.body.classList.add('nonav');
  app.innerHTML = `<div class="wrap" style="padding-top:calc(60px + env(safe-area-inset-top))">
    <div class="head"><span class="lab">Le Club</span><div class="clem">Clem</div><div class="sub">pour celles qui m'ont fait confiance</div></div>
    <div class="card mt2">
    ${step === 'email' ? `
      <h3>${isStandalone() ? 'Bienvenue dans le Club' : 'Bienvenue'}</h3>
      <p class="muted small">Entre l'adresse e-mail que tu utilises pour tes commandes chez Clem. Tu vas recevoir un code de connexion par e-mail.</p>
      <input id="em" type="email" autocomplete="email" inputmode="email" placeholder="ton@email.fr" value="${esc(email)}">
      <button class="btn full mt" id="send">Recevoir mon code</button>`
      : `
      <h3>Ton code</h3>
      <p class="muted small">Un e-mail vient d'être envoyé à <b>${esc(email)}</b> (pense à regarder dans tes spams).</p>
      <p class="small">Entre ci-dessous le code à 6 chiffres qu'il contient.</p>
      <input id="code" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="200" placeholder="······">
      <button class="btn full mt" id="verify">Entrer dans le Club</button>
      <details class="mt"><summary class="small" style="cursor:pointer;color:var(--txt2);text-decoration:underline">Je n'ai pas reçu de code</summary>
      <div class="small" style="margin-top:8px;line-height:1.5">Le code arrive en général en moins d'une minute, de la part de <b>Le Club Clem</b> (leclubclem@gmail.com).<br>• Regarde dans tes <b>courriers indésirables</b> ou <b>spams</b>, et dans l'onglet <b>Autres</b> si tu es sur Hotmail ou Outlook.<br>• Ajoute leclubclem@gmail.com à tes contacts, puis redemande un code.<br>• Toujours rien ? Écris-moi sur Instagram, <b>@clemence.marchadour</b>, je t'aide.</div>
      <button class="btn ghost full mt" id="resend" disabled>Renvoyer un code</button></details>
      <p class="center mt"><button class="link" id="again">Changer d'adresse</button></p>`}
      <p class="small" id="err" style="color:#9b2c2c"></p>
    </div>
  </div>`;
  if (step === 'email') {
    $('#send').onclick = async () => {
      const em = $('#em').value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(em)) { $('#err').textContent = "Cette adresse ne semble pas valide."; return; }
      $('#send').disabled = true; $('#send').textContent = 'Envoi…';
      const { error } = await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
      if (error && (error.status === 403 || /réservé|reserve/i.test(error.message || ''))) { $('#send').disabled = false; $('#send').textContent = 'Recevoir mon code'; $('#err').innerHTML = "Cet espace est réservé à mes clientes. Si tu as déjà commandé chez moi, essaie avec l'adresse utilisée pour tes commandes.<br><br><span style='color:var(--brun)'>Pas encore cliente ? Ta première commande t'ouvre les portes du Club.</span><a class='btn full mt' href='https://shop.sellingathome.com/clemencemarchadour/products' target='_blank'>Découvrir la boutique</a>"; return; }
      if (error) { $('#send').disabled = false; $('#send').textContent = 'Recevoir mon code'; $('#err').textContent = /rate|limit|seconds/i.test(error.message) ? "Trop de demandes d'un coup. Réessaie dans quelques minutes." : "L'envoi n'a pas marché : " + error.message; return; }
      localStorage.setItem('cc_email', em); loginView('code', em);
    };
  } else {
    $('#again').onclick = () => loginView('email', email, true);
    let wait = 60; const rb = $('#resend');
    const tickR = setInterval(() => { if (!document.body.contains(rb)) { clearInterval(tickR); return; } wait--; rb.textContent = wait > 0 ? `Renvoyer un code (${wait} s)` : 'Renvoyer un code'; rb.disabled = wait > 0; if (wait <= 0) clearInterval(tickR); }, 1000);
    rb.onclick = async () => { rb.disabled = true; const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); if (error) { $('#err').textContent = /rate|limit|seconds/i.test(error.message) ? "Patiente encore un peu avant de redemander un code." : "L'envoi n'a pas marché : " + error.message; rb.disabled = false; return; } toast('Nouveau code envoyé'); loginView('code', email); };
    $('#verify').onclick = async () => {
      const raw = $('#code').value.trim();
      let res;
      const m = raw.match(/[?&]token=([^&\s]+)/);
      if (m) {
        const ty = (raw.match(/[?&]type=([a-z_]+)/) || [])[1] || 'magiclink';
        $('#verify').disabled = true;
        res = await sb.auth.verifyOtp({ token_hash: decodeURIComponent(m[1]), type: ty === 'signup' ? 'signup' : ty === 'invite' ? 'invite' : 'magiclink' });
      } else {
        const token = raw.replace(/\D/g, '');
        if (token.length < 6) { $('#err').textContent = 'Le code fait 6 chiffres.'; return; }
        $('#verify').disabled = true;
        res = await sb.auth.verifyOtp({ email, token, type: 'email' });
      }
      const { error } = res;
      if (error) { $('#verify').disabled = false; $('#err').textContent = 'Ce code ne fonctionne pas ou a expiré. Redemande un code.'; return; }
      boot();
    };
  }
}
function isStandalone() { return window.navigator.standalone || matchMedia('(display-mode: standalone)').matches; }
function installHint() {
  if (isStandalone()) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="card"><span class="lab">Installe le Club sur ton téléphone</span>
  ${ios ? `<ol class="steps small"><li>Ouvre cette page dans <b>Safari</b>.</li><li>Appuie sur l'icône <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li></ol>`
      : `<p class="small muted">Dans Chrome, ouvre le menu ⋮ puis choisis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.</p>`}</div>`;
}
function gateView() {
  document.body.classList.add('nonav');
  app.innerHTML = `<div class="wrap" style="padding-top:calc(60px + env(safe-area-inset-top))">
  <div class="head"><span class="lab">Le Club</span><div class="clem">Clem</div></div>
  <div class="card mt2 center"><h3>Cet espace est réservé à mes clientes</h3>
  <p class="muted">Je ne retrouve pas ton adresse dans ma liste. Si tu as déjà commandé chez moi, c'est peut-être une autre adresse : essaie avec celle de tes commandes.</p>
  <a class="btn full mt" href="${C ? C.shop : 'https://shop.sellingathome.com/clemencemarchadour/products'}" target="_blank">Découvrir la boutique</a>
  <p class="mt"><button class="link" id="out">Essayer une autre adresse</button></p></div></div>`;
  $('#out').onclick = async () => { await sb.auth.signOut(); loginView(); };
}

/* ---------- démarrage ---------- */
async function decryptContent(k) {
  const buf = await (await fetch('content.bin', { cache: 'no-cache' })).arrayBuffer();
  const key = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k)), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function boot() {
  app.innerHTML = '<div class="wrap center" style="padding-top:30vh"><div class="lab">Le Club</div><div class="serif" style="font-size:40px">Clem</div></div>';
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { loginView('email', localStorage.getItem('cc_email') || ''); return; }
  USER = session.user;
  let k = localStorage.getItem('cc_k');
  try {
    const { data, error } = await sb.from('app_keys').select('k').eq('id', 1).maybeSingle();
    if (data && data.k) { k = data.k; localStorage.setItem('cc_k', k); }
    else if (!error) { localStorage.removeItem('cc_k'); gateView(); return; }
  } catch (e) { }
  if (!k) { gateView(); return; }
  try { C = await decryptContent(k); } catch (e) { app.innerHTML = '<div class="wrap"><div class="card">Impossible de charger le Club. Vérifie ta connexion et réessaie.</div></div>'; return; }
  try { const { data } = await sb.from('members').select('prenom,role').maybeSingle(); ME = data || {}; } catch (e) { ME = {}; }
  loadLocal(); await pullRemote();
  document.body.classList.remove('nonav');
  render();
}
sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { C = null; loginView(); } });

/* ---------- rendu ---------- */
function render() {
  const v = { journee: vJournee, table: vTable, bouger: vBouger, rituel: vRituel, journal: vJournal, profil: vProfil }[ui.tab];
  const full = ui.sub === 'seance';
  app.innerHTML = `<div class="wrap">${v()}</div>${full ? '' : nav()}`;
  document.body.classList.toggle('nonav', full);
  bind();
  setTimeout(checkBadges, 400);
}
function bind() {
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = e => { e.stopPropagation(); const [t, s, a] = b.dataset.go.split('|'); go(t, s || null, a || null); });
  app.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); ACT[b.dataset.act](b.dataset.v, b); });
}
const prenom = () => (ME && ME.prenom) || '';
const avatarInner = () => S.photo ? `<img src="${S.photo}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : esc((prenom() || 'C').charAt(0).toUpperCase());
function headBlock() {
  return `<div class="top"><span style="width:40px"></span><div class="head"><span class="lab">Le Club</span><div class="clem">Clem</div><div class="sub">pour celles qui m'ont fait confiance</div></div><button class="avatar" data-go="profil||" style="padding:0;overflow:hidden">${avatarInner()}</button></div>`;
}

/* ---------- badges ---------- */
const BADGES = [
  [1, 'Premier pas', "Tu as fait le premier pas, et c'est souvent le plus dur. Je suis fière de toi.", 1, '1', 'jour'],
  [2, "C'est parti", "Deux jours où tu t'es choisie. On continue ensemble.", 1, '2', 'jours'],
  [3, 'Trois jours pour toi', 'Trois jours rien que pour toi. Tu mérites ce temps-là.', 1, '3', 'jours'],
  [4, 'Tu prends le pli', 'Ton corps commence à reconnaître ce nouveau rythme. Garde le cap, en douceur.', 1, '4', 'jours'],
  [5, 'Cinq jours, bravo', "Pas besoin d'être parfaite, juste présente. Et tu l'es.", 1, '5', 'jours'],
  [6, 'Presque une semaine', "Encore un jour et tu boucles ta première semaine. Je t'attends demain.", 1, '6', 'jours'],
  [7, 'Ta première semaine', "Une semaine entière à prendre soin de toi. Savoure, tu l'as méritée.", 1, '7', 'jours'],
  [14, 'Deux semaines', 'Ce qui te demandait un effort devient peu à peu naturel.', 2, '14', 'jours'],
  [21, 'Ton habitude est ancrée', 'Vingt et un jours de petits gestes. Ils font maintenant partie de toi.', 2, '21', 'jours'],
  [30, 'Ton premier mois', 'Regarde le chemin parcouru, et sois fière de chaque pas.', 2, '1', 'mois'],
  [60, 'Deux mois', "Tu n'as plus besoin de te motiver : c'est devenu ton rythme.", 3, '2', 'mois'],
  [90, 'Un rituel complet', "Trois mois de constance. C'est là que tout s'installe vraiment.", 3, '3', 'mois'],
  [180, 'Six mois', "Tu as construit quelque chose de solide, et ça, personne ne te l'enlève.", 3, '6', 'mois'],
  [365, 'Un an', "Merci de ta confiance, du fond du cœur. Ce chemin, c'est toi qui l'as tracé. 🤎", 3, '1', 'an']];
function activeDays() {
  const ks = new Set([...Object.keys(S.taken || {}), ...Object.keys(S.moves || {}), ...Object.keys(S.plan || {}), ...Object.keys(L.journal || {})]);
  let n = 0;
  ks.forEach(x => { if (x > today()) return; if ((S.taken[x] && Object.values(S.taken[x]).some(Boolean)) || S.moves[x] || Object.values(S.plan[x] || {}).some(Boolean) || (L.journal[x] && Object.keys(L.journal[x]).length)) n++; });
  return n;
}
const medal = (b, cls = '') => `<div class="med t${b[3]} ${cls}"><b>${b[4]}</b><span>${b[5]}</span></div>`;
let badgeShown = false;
function checkBadges() {
  if (!S || !L || badgeShown) return;
  S.badges = S.badges || {};
  const n = activeDays(), news = BADGES.filter(b => n >= b[0] && !S.badges[b[0]]);
  if (!news.length) return;
  news.forEach(b => S.badges[b[0]] = today()); save();
  const b = news[news.length - 1], nx = BADGES.find(x => x[0] > b[0]);
  badgeShown = true;
  const o = document.createElement('div'); o.className = 'bmodal';
  o.innerHTML = `<div class="bbox"><span class="lab" style="color:var(--sauge-f)">Nouveau badge</span><div class="bd big">${medal(b)}</div>
  <h2 class="serif" style="font-size:30px;margin:22px 0 0">${esc(b[1])}</h2><p class="bmot">« ${esc(b[2])} »</p><p class="lab" style="margin:10px 0 24px">Clem 🤎</p>
  <button class="btn full" id="bok">Merci Clem</button>${nx ? `<p class="small muted" style="margin-top:14px">Prochain badge à ton ${nx[0] < 30 ? nx[0] + 'e jour actif' : nx[0] === 30 ? '1er mois' : nx[4] + (nx[5] === 'an' ? ' an' : ' mois')}</p>` : ''}</div>`;
  document.body.appendChild(o);
  o.querySelector('#bok').onclick = () => { o.remove(); badgeShown = false; };
}
function badgesBlock() {
  const got = S.badges || {}, n = BADGES.filter(b => got[b[0]]).length;
  const grp = (l, t) => `<p class="lab mt2">${l}</p><div class="bgrid">${BADGES.filter(b => b[3] === t).map(b => `<div class="bd">${medal(b, got[b[0]] ? '' : 'off')}<div class="nm">${esc(b[1])}</div></div>`).join('')}</div>`;
  return `<div class="row between mt2"><h3>Mes badges</h3><span class="small muted">${n} sur ${BADGES.length}</span></div>
  ${grp('Ta première semaine', 1)}${grp('Ton premier mois', 2)}${grp('Et ensuite', 3)}`;
}

/* ---------- Ma journée ---------- */
function streak() {
  let n = 0, d = today();
  const active = x => (S.taken[x] && Object.values(S.taken[x]).some(Boolean)) || S.moves[x] || L.journal[x];
  if (!active(d)) d = addDays(d, -1);
  while (active(d)) { n++; d = addDays(d, -1); }
  return n;
}
function vJournee() {
  const t = today(), d = new Date();
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mot = (C.special && C.special[md]) || C.mots[((diffDays('2026-11-09', t) % C.mots.length) + C.mots.length) % C.mots.length];
  const plan = S.plan[t] || {};
  const prises = todayPrises();
  const done = prises.filter(p => (S.taken[t] || {})[p.id]).length;
  const st = streak();
  return `${headBlock()}
  <div class="card"><span class="lab">${esc(longDate(t).toUpperCase())}</span>
    <h2 class="mt">Bonjour${prenom() ? ' ' + esc(prenom()) : ''}</h2>
    <p class="muted" style="margin:8px 0 0">${esc(mot)}</p>
    <p class="lab mt" style="text-align:right">Le mot de Clem</p></div>
  <div class="card tap" data-go="rituel||"><div class="row between"><span class="lab">Mon rituel</span><span class="pill">${prises.length ? done + ' / ' + prises.length : 'à configurer'}</span></div>
    ${prises.length ? prises.slice(0, 4).map(p => `<div class="check ${(S.taken[t] || {})[p.id] ? 'on' : ''}" data-act="take" data-v="${p.id}"><span class="box">${(S.taken[t] || {})[p.id] ? '✓' : ''}</span><span class="ctext grow">${esc(p.name)} <span class="small muted">· ${esc(p.dose)}</span></span></div>`).join('')
      : '<p class="muted small" style="margin:8px 0 0">Choisis tes compléments pour retrouver tes prises du jour ici.</p>'}</div>
  <div class="card"><div class="row between"><span class="lab">Au menu aujourd'hui</span><button class="link" data-act="tableSemaine">Ma semaine</button></div>
    ${SLOTS.map(([k, l]) => slotRow(t, k, l)).join('')}</div>
  <div class="grid2">
    <div class="card tap" data-go="bouger||" style="margin:0"><span class="lab">Bouger</span><div class="serif" style="font-size:28px;margin-top:6px">${S.moves[t] || 0} min</div><div class="small muted">aujourd'hui</div></div>
    <div class="card" style="margin:0"><span class="lab">Régularité</span><div class="serif" style="font-size:28px;margin-top:6px">${st} jour${st > 1 ? 's' : ''}</div><div class="small muted">${st > 1 ? "d'affilée, bravo" : 'on commence aujourd’hui'}</div></div>
  </div>
  <div class="card tap" data-act="sucre"><span class="lab">Envie de sucré ?</span><h3 class="mt">Mes alternatives gourmandes</h3><p class="small muted" style="margin:4px 0 0">Les douceurs du Club, sans tout lâcher.</p></div>`;
}
function slotRow(day, k, l) {
  const id = (S.plan[day] || {})[k], r = id && R(id);
  return `<div class="slot">${r ? (r.img ? `<img src="${r.img}" alt="">` : '<div class="empty filled">✎</div>') : `<div class="empty" data-act="pick" data-v="${day}|${k}">+</div>`}
    <div class="grow" ${r ? `data-go="table|recette|${r.id}"` : `data-act="pick" data-v="${day}|${k}"`} style="cursor:pointer"><div class="lab">${l}</div><div>${r ? esc(r.t) : '<span class="muted">Choisir une recette</span>'}</div>${r && (r.kcal || r.time) ? `<div class="small muted">${[r.time, r.kcal ? r.kcal + ' kcal' : ''].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</div>
    ${r ? `<button class="heart" data-act="unplan" data-v="${day}|${k}" aria-label="Retirer">×</button>` : ''}</div>`;
}

/* ---------- À table ---------- */
function vTable() {
  if (ui.sub === 'recette') return vRecette(ui.arg);
  if (ui.sub === 'ajout') return vAjout();
  const seg = ui.tableSeg;
  return `${headBlock()}
  <div class="seg">${[['semaine', 'Ma semaine'], ['recettes', 'Recettes'], ['courses', 'Courses']].map(([k, l]) => `<button class="${seg === k ? 'on' : ''}" data-act="seg" data-v="${k}">${l}</button>`).join('')}</div>
  ${seg === 'semaine' ? vSemaine() : seg === 'recettes' ? vRecettes() : vCourses()}`;
}
function vSemaine() {
  const t = today(); if (!ui.day) ui.day = t;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i));
  const plan = S.plan[ui.day] || {};
  const tot = { kcal: 0, p: 0, g: 0, l: 0 };
  SLOTS.forEach(([k]) => { const r = plan[k] && R(plan[k]); if (r) ['kcal', 'p', 'g', 'l'].forEach(x => tot[x] += (+r[x] || 0)); });
  return `<div class="days">${days.map(d => { const x = parse(d); return `<div class="day ${d === ui.day ? 'on' : ''} ${Object.values(S.plan[d] || {}).some(Boolean) ? 'has' : ''}" data-act="day" data-v="${d}"><span>${JOURS[x.getDay()].slice(0, 3)}</span><b>${x.getDate()}</b></div>`; }).join('')}</div>
  <div class="card"><span class="lab">${esc(longDate(ui.day))}</span>${SLOTS.map(([k, l]) => slotRow(ui.day, k, l)).join('')}</div>
  <div class="card"><span class="lab">Total de la journée</span>
    <div class="macros"><div><b>${tot.kcal}</b><span>kcal</span></div><div><b>${tot.p}</b><span>protéines</span></div><div><b>${tot.g}</b><span>glucides</span></div><div><b>${tot.l}</b><span>lipides</span></div></div>
    <p class="fine" style="margin:0">Des repères, pas un régime : écoute ta faim et adapte les portions.</p></div>
  <button class="btn ghost full" data-act="seg" data-v="courses">Voir ma liste de courses</button>`;
}
function filtered() {
  const f = ui.filter;
  const all = C.recipes.concat(S.own.map(r => Object.assign({ mine: true }, r)));
  return all.filter(r => f === 'all' || (f === 'sucre' && r.type === 'pdj' && r.cat === 'sucre') || (f === 'sale' && r.type === 'pdj' && r.cat === 'sale')
    || (f === 'plat' && r.type === 'plat' && r.cat === 'plat') || (f === 'dessert' && r.cat === 'dessert') || (f === 'favs' && S.favs.includes(r.id)) || (f === 'mine' && r.mine));
}
function vRecettes() {
  const F = [['all', 'Toutes'], ['sucre', 'Petit-déj sucré'], ['sale', 'Petit-déj salé'], ['plat', 'Plats'], ['dessert', 'Desserts'], ['favs', 'Favorites'], ['mine', 'Mes recettes']];
  const list = filtered();
  return `<div class="chips">${F.map(([k, l]) => `<button class="chip ${ui.filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="rlist">${list.map(rCard).join('') || '<p class="muted center mt2">Rien ici pour l\'instant.</p>'}</div>
  <button class="btn ghost full mt" data-act="newOwn">+ Ajouter ma propre recette</button>`;
}
function rCard(r) {
  return `<div class="card tap row" data-go="table|recette|${r.id}">${r.img ? `<img class="thumb" src="${r.img}" alt="" loading="lazy">` : '<div class="thumb"></div>'}
  <div class="grow"><div class="lab">${esc(r.tag || 'Ma recette')}</div><div class="serif" style="font-size:17px;margin:3px 0">${esc(r.t)}</div><div class="small muted">${esc(r.time || '')}${r.kcal ? ' · ' + r.kcal + ' kcal' : ''}</div></div>
  <button class="heart" data-act="fav" data-v="${r.id}" aria-label="Favori">${S.favs.includes(r.id) ? '♥' : '♡'}</button></div>`;
}
function vRecette(id) {
  const r = R(id); if (!r) return back('Recettes', 'table') + '<p>Recette introuvable.</p>';
  return `${back('Recettes', 'table')}
  ${r.img ? `<img class="hero" src="${r.img}" alt="">` : ''}
  <div class="row between mt"><span class="lab">${esc(r.tag || 'Ma recette')}</span><button class="heart" data-act="fav" data-v="${r.id}">${S.favs.includes(r.id) ? '♥' : '♡'}</button></div>
  <h1 style="margin-top:4px">${esc(r.t)}</h1>
  <p class="muted small">${[r.time, r.pers].filter(Boolean).map(esc).join(' · ')}</p>
  ${r.kcal ? `<div class="macros"><div><b>${r.kcal}</b><span>kcal</span></div><div><b>${r.p}</b><span>protéines</span></div><div><b>${r.g}</b><span>glucides</span></div><div><b>${r.l}</b><span>lipides</span></div></div><p class="fine center" style="margin-top:-6px">par portion</p>` : ''}
  <div class="grid2 mt"><button class="btn" data-act="addDay" data-v="${r.id}">+ À ma journée</button><button class="btn ghost" data-act="addCourses" data-v="${r.id}">+ Courses</button></div>
  <div class="card"><span class="lab">Ingrédients</span><ul class="clean mt">${(r.ing || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
  <div class="card"><span class="lab">Préparation</span><ol class="steps">${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
  ${r.note ? `<div class="note">${esc(r.note)}<div class="lab" style="font-style:normal;margin-top:6px">La note de Clem</div></div>` : ''}
  ${r.alt ? `<div class="card"><span class="lab">Variante</span><p style="margin:8px 0 0">${esc(r.alt)}</p></div>` : ''}
  ${String(r.id).startsWith('own') ? `<button class="link mt" data-act="delOwn" data-v="${r.id}">Supprimer cette recette</button>` : ''}`;
}
function vAjout() {
  const pd = ui.pending;
  if (!ui.draft) ui.draft = { rows: [{ f: '', g: '' }], pers: 1, img: null };
  const d = ui.draft;
  const sel = v => pd && ((pd.slot === 'b' && v === 'sucre') || (pd.slot !== 'b' && v === 'plat')) ? ' selected' : '';
  return `${pd ? `<button class="back" data-act="cancelOwn">‹ Retour</button>` : `<button class="back" data-act="cancelOwn">‹ Recettes</button>`}<h2>Ma recette</h2>
  ${pd ? `<p class="small muted">Elle sera ajoutée à : ${SLOTS.find(x => x[0] === pd.slot)[1].toLowerCase()}, ${esc(longDate(pd.day))}.</p>` : ''}
  <label style="display:block;cursor:pointer;margin-top:12px">${d.img ? `<img class="hero" src="${d.img}" alt="">` : `<div class="hero" style="display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;border:1.5px dashed var(--taupe);background:var(--ivoire);color:var(--txt2)">+ Ajouter une photo</div>`}<input type="file" accept="image/*" id="o_img" style="display:none"></label>
  <div class="field mt"><label>Nom de la recette</label><input id="o_t" placeholder="Ex. : Salade de ma grand-mère" value="${esc(d.t || '')}"></div>
  <div class="grid2 mt"><div class="field"><label>Type</label><select id="o_type"><option value="plat"${sel('plat')}>Plat</option><option value="sucre"${sel('sucre')}>Petit-déj sucré</option><option value="sale">Petit-déj salé</option><option value="dessert">Dessert</option></select></div>
  <div class="field"><label>Nombre de portions</label><input id="o_pers" inputmode="numeric" value="${d.pers}"></div></div>
  <div class="card"><span class="lab">Ingrédients</span>
  <p class="fine" style="margin:6px 0 10px">Tape l'aliment comme tu le dis, par exemple « 2 œufs » ou « 150 g de riz », puis touche la bonne proposition : les calories et les macros se calculent toutes seules.</p>
  ${d.rows.map((r, i) => { const f = foodOf(r.f), hasU = f && f[5]; if (!hasU) r.u = 'g'; else if (!r.u) r.u = 'u';
    return `<div style="padding:10px 0;border-bottom:1px solid var(--filet)"><div class="row" style="gap:8px"><input data-row="${i}" data-k="f" placeholder="Tape un aliment : œuf, riz, pomme…" value="${esc(r.f)}" autocomplete="off" autocorrect="off" style="flex:1"><button class="heart" data-act="rmRow" data-v="${i}">×</button></div>
    <div id="sug_${i}"></div>
    <div class="row" style="gap:8px;margin-top:8px"><input inputmode="decimal" data-row="${i}" data-k="g" placeholder="Quantité" value="${esc(r.g)}" style="flex:1">
    <select data-row="${i}" data-k="u" style="flex:1">${hasU ? `<option value="u"${r.u === 'u' ? ' selected' : ''}>${esc(f[6])}${f[6].length < 12 ? '(s)' : ''} (${f[5]} g)</option>` : ''}<option value="g"${r.u === 'g' ? ' selected' : ''}>grammes</option></select></div></div>`; }).join('')}
  <button class="link" data-act="addRow">+ Ajouter un ingrédient</button>
  <div id="o_tot">${totBlock()}</div></div>
  <div class="field mt"><label>Préparation (facultatif, une étape par ligne)</label><textarea id="o_steps">${esc(d.steps || '')}</textarea></div>
  <button class="btn full mt" data-act="saveOwn">Enregistrer</button>`;
}
const norm = t => String(t || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const sing = w => w.length > 3 ? w.replace(/(s|x)$/, '') : w;
const splitQty = t => { const m = String(t || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|grammes?\b)?\s*(?:de |d')?(.*)$/i); return m ? { q: m[1].replace(',', '.'), g: /^\d+(?:[.,]\d+)?\s*(g|gr|gramme)/i.test(t), name: m[2] } : { q: '', name: t }; };
const STOP = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'au', 'aux', 'a', 'en', 'et', 'd', 'l', 'un', 'une', 'avec', 'sans', 'g', 'gr']);
let FIDX = null;
function fidx() { if (!FIDX) FIDX = C.foods.map(f => { const n = norm(f[0]); return { f, n, w: n.split(' ').map(sing) }; }); return FIDX; }
function suggest(t) {
  const full = norm(splitQty(t).name), words = full.split(' ').filter(w => w && !STOP.has(w)).map(sing);
  if (!words.length) return [];
  const score = (strict) => fidx().map(({ f, n, w: nw }) => { let sc = 0, hit = 0;
    for (const w of words) { if (nw.includes(w)) { sc += 3; hit++; } else if (nw.some(x => x.startsWith(w))) { sc += 2; hit++; } else if (w.length > 3 && n.includes(w)) { sc += 1; hit++; } else if (strict) return null; }
    if (!hit) return null; if (!strict) sc -= (words.length - hit) * 3;
    if (nw[0] === words[0] || nw[0].startsWith(words[0])) sc += 2;
    if (!words.some(w => w.startsWith('cru')) && /\bcrue?s?\b/.test(n)) sc -= 2.5;
    if (f[7]) sc += 2.5; if (n === full || n.split(' ').map(sing).join(' ') === full.split(' ').map(sing).join(' ')) sc += 10; return [sc - n.length / 60, f]; }).filter(Boolean).sort((x, y) => y[0] - x[0]).slice(0, 8).map(x => x[1]);
  const r = score(true); return r.length ? r : score(false);
}
const foodOf = n => C.foods.find(f => f[0].toLowerCase() === String(n || '').trim().toLowerCase());
function resolveRow(r) {
  if (!r.f || foodOf(r.f)) return;
  const sq = splitQty(r.f), sg = suggest(r.f);
  if (sg.length) { r.f = sg[0][0]; if (sq.q && !r.g) { r.g = sq.q; r.u = sg[0][5] && !sq.g ? 'u' : 'g'; } }
}
function calcDraft() {
  const d = ui.draft, t = { kcal: 0, p: 0, g: 0, l: 0 }, miss = [];
  d.rows.forEach(r => { const q = parseFloat(String(r.g).replace(',', '.')) || 0; if (!r.f) return; const f = foodOf(r.f); if (!f) { miss.push(r.f); return; } const g = r.u === 'u' && f[5] ? q * f[5] : q; t.kcal += f[1] * g / 100; t.p += f[2] * g / 100; t.g += f[3] * g / 100; t.l += f[4] * g / 100; });
  const n = Math.max(1, parseInt(d.pers) || 1);
  return { kcal: Math.round(t.kcal / n), p: Math.round(t.p / n), g: Math.round(t.g / n), l: Math.round(t.l / n), miss };
}
function totBlock() {
  const t = calcDraft();
  return `<div class="macros" style="margin-bottom:4px"><div><b>${t.kcal}</b><span>kcal</span></div><div><b>${t.p}</b><span>protéines</span></div><div><b>${t.g}</b><span>glucides</span></div><div><b>${t.l}</b><span>lipides</span></div></div><p class="fine center" style="margin:0">par portion · valeurs moyennes</p>
  ${t.miss.length ? `<p class="fine" style="color:#9b2c2c">Non compté (pas dans la liste) : ${t.miss.map(esc).join(', ')}</p>` : ''}`;
}
function vCourses() {
  const t = today(), ids = new Set(S.extra);
  for (let i = 0; i < 7; i++) Object.values(S.plan[addDays(t, i)] || {}).forEach(id => ids.add(id));
  const list = [...ids].map(R).filter(Boolean);
  if (!list.length) return '<div class="card center"><p class="muted">Ta liste est vide. Ajoute des recettes à ta semaine ou appuie sur « + Courses » dans une recette.</p></div>';
  return list.map(r => `<div class="card"><div class="row between"><span class="serif" style="font-size:17px">${esc(r.t)}</span>${S.extra.includes(r.id) ? `<button class="heart" data-act="rmCourses" data-v="${r.id}">×</button>` : ''}</div>
    ${(r.ing || []).map((i, n) => { const k = r.id + ':' + n; return `<div class="check ${S.checked[k] ? 'on' : ''}" data-act="chk" data-v="${k}"><span class="box">${S.checked[k] ? '✓' : ''}</span><span class="ctext">${esc(i)}</span></div>`; }).join('')}</div>`).join('')
    + '<button class="btn soft full" data-act="clearCourses">Tout décocher</button>';
}
function pickSheet(day, slot) {
  const opts = C.recipes.concat(S.own).filter(r => slot === 'b' ? (r.type === 'pdj' || ['sucre', 'sale'].includes(r.cat)) : (r.type !== 'pdj' && !['sucre', 'sale'].includes(r.cat)));
  const el = sheet(`<div class="row between"><h3>${SLOTS.find(s => s[0] === slot)[1]} · ${esc(longDate(day))}</h3><button class="heart" data-x>×</button></div>
    <button class="btn ghost full" data-own>+ Ajouter ma propre recette</button>
    <p class="small muted mt">Ou choisis parmi les idées de Clem :</p>
    ${opts.map(r => `<div class="card tap row" data-pick="${r.id}" style="padding:10px">${r.img ? `<img class="thumb" style="width:60px;height:60px" src="${r.img}" alt="" loading="lazy">` : ''}<div class="grow"><div>${esc(r.t)}</div><div class="small muted">${esc(r.time || '')}${r.kcal ? ' · ' + r.kcal + ' kcal' : ''}</div></div></div>`).join('')}`);
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('[data-own]').onclick = () => { el.remove(); ui.draft = null; ui.pending = { day, slot, from: ui.tab }; go('table', 'ajout'); };
  el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { (S.plan[day] = S.plan[day] || {})[slot] = b.dataset.pick; save(); el.remove(); render(); toast('Ajouté à ta journée'); });
}

/* ---------- Bouger ---------- */
function vBouger() {
  if (ui.sub === 'seance') return vSeance(ui.arg);
  if (ui.sub === 'exos') return vExos();
  if (ui.sub === 'exo') return vExo(ui.arg);
  const t = today();
  const week = Array.from({ length: 7 }, (_, i) => S.moves[addDays(t, -i)] || 0).reduce((a, b) => a + b, 0);
  const groups = [['express', '5 minutes'], ['court', '10 minutes'], ['complet', '20 minutes']];
  return `${headBlock()}
  <div class="card"><div class="row between"><div><span class="lab">Aujourd'hui</span><div class="serif" style="font-size:30px">${S.moves[t] || 0} / 30 min</div></div><div style="text-align:right"><span class="lab">Cette semaine</span><div class="serif" style="font-size:22px">${week} min</div></div></div>
  <div class="progress"><i style="width:${Math.min(100, (S.moves[t] || 0) / 30 * 100)}%"></i></div>
  <button class="btn full mt" data-act="five">Je n'ai que 5 minutes</button></div>
  ${actsCard(t)}
  <span class="lab">Mon niveau</span>
  <div class="chips">${Object.entries(LEVELS).map(([k, v]) => `<button class="chip ${S.level === k ? 'on' : ''}" data-act="level" data-v="${k}">${v[0]}</button>`).join('')}</div>
  ${groups.map(([g, l]) => `<h3 class="mt2" id="g_${g}">${l}</h3>${Object.entries(C.seances).filter(([, s]) => s.g === g).map(([id, s]) => seanceCard(id, s)).join('')}`).join('')}
  <button class="btn ghost full mt2" data-go="bouger|exos|">Tous les exercices</button>
  <p class="fine mt">Écoute ton corps : en cas de douleur, arrête l'exercice. En cas de problème de santé, demande l'avis de ton médecin.</p>`;
}
function actsCard(t) {
  const xs = (S.acts && S.acts[t]) || [], f = ui.actForm;
  return `<div class="card"><div class="row between"><span class="lab">Mes activités du jour</span>${f ? '' : '<button class="link" data-act="actOpen">+ Ajouter</button>'}</div>
  ${xs.length ? xs.map((x, i) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--filet)"><span>${esc(x.a)}</span><span class="row" style="gap:12px"><b>${x.m} min</b><button class="link small" data-act="actRm" data-v="${i}">Retirer</button></span></div>`).join('') : (f ? '' : '<p class="small muted" style="margin:6px 0 0">Marche, course, vélo, cours de yoga… Tout ce que tu fais en dehors de l\'app compte aussi.</p>')}
  ${f ? `<p class="lab mt">Qu'as-tu fait ?</p><div class="chips" style="flex-wrap:wrap;overflow:visible">${SPORTS.map(a => `<button class="chip ${f.a === a ? 'on' : ''}" data-act="actA" data-v="${a}">${a}</button>`).join('')}</div>
  ${f.a === 'Autre' ? `<div class="field mt"><input id="act_o" placeholder="Ex. : tennis, randonnée…" value="${esc(f.o || '')}"></div>` : ''}
  <p class="lab mt">Combien de temps ?</p><div class="chips" style="flex-wrap:wrap;overflow:visible">${[15, 30, 45, 60, 90].map(m => `<button class="chip ${f.m == m ? 'on' : ''}" data-act="actM" data-v="${m}">${m} min</button>`).join('')}</div>
  <div class="field mt"><input id="act_m" inputmode="numeric" placeholder="Ou tape le nombre de minutes" value="${f.m && ![15, 30, 45, 60, 90].includes(+f.m) ? f.m : ''}"></div>
  <div class="grid2 mt"><button class="btn ghost sm" data-act="actCancel">Annuler</button><button class="btn sm" data-act="actSave">Enregistrer</button></div>` : ''}</div>`;
}
function keepAct() { const f = ui.actForm; if (!f) return; const o = $('#act_o'), m = $('#act_m'); if (o) f.o = o.value; if (m && m.value) f.m = m.value; }
function seanceCard(id, s) {
  const ids = [...new Set(s.steps.map(x => x[0]))].slice(0, 4);
  return `<div class="card tap" data-go="bouger|seance|${id}"><div class="row between"><div><div class="serif" style="font-size:18px">${esc(s.t)}</div><div class="small muted">${s.d} min · ${s.steps.length} exercices${s.rounds ? ' · ' + s.rounds + ' tours' : ''}</div></div><span class="pill">Go</span></div>
  <div class="row mt" style="gap:6px">${ids.map(e => `<img src="${C.ex[e].img}" style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:#fff" alt="" loading="lazy">`).join('')}</div></div>`;
}
function seqOf(id) {
  const s = C.seances[id], lv = LEVELS[S.level] || LEVELS.debute, out = [];
  for (let r = 0; r < (s.rounds || 1); r++) s.steps.forEach(([e, side, sec]) => { out.push({ e, side, sec: sec || lv[1], rest: sec ? 0 : lv[2], round: r + 1 }); });
  return out;
}
let PL = null;
function vSeance(id) {
  const s = C.seances[id];
  if (!PL || PL.id !== id) PL = { id, i: 0, left: null, resting: false, run: false, done: false };
  const seq = seqOf(id);
  if (PL.done) return `<div class="center" style="padding-top:12vh"><span class="lab">Séance terminée</span><h1 class="mt">Bravo${prenom() ? ' ' + esc(prenom()) : ''} !</h1><p class="muted">${s.d} minutes ajoutées à ta journée.</p><button class="btn full mt2" data-act="endSeance">Retour</button></div>`;
  const st = seq[PL.i], ex = C.ex[st.e];
  if (PL.left === null) PL.left = st.sec;
  return `<div class="row between">${back('Bouger', 'bouger')}<span class="small muted">${PL.i + 1} / ${seq.length}${s.rounds ? ' · tour ' + st.round : ''}</span></div>
  <div class="progress"><i style="width:${PL.i / seq.length * 100}%"></i></div>
  ${PL.resting ? `<div class="center" style="padding:8vh 0"><span class="lab">Récupération</span><div class="timer" id="tm">${PL.left}</div><p class="muted">Ensuite : ${esc(C.ex[seq[PL.i + 1]?.e]?.n || '')}</p></div>`
      : `<img class="exi" src="${ex.img}" alt="">
  <h2 class="mt">${esc(ex.n)}</h2>${st.side ? `<span class="pill">${esc(st.side)}</span>` : ''}
  <div class="timer" id="tm">${PL.left}</div>`}
  <div class="grid2"><button class="btn ghost" data-act="pPrev" ${PL.i === 0 ? 'disabled' : ''}>‹ Précédent</button><button class="btn" data-act="pPlay">${PL.run ? 'Pause' : 'Démarrer'}</button></div>
  <button class="btn soft full mt" data-act="pNext">Exercice suivant ›</button>
  ${PL.resting ? '' : `<div class="card"><ol class="steps">${ex.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
  <div class="note">${esc(ex.c)}<div class="lab" style="font-style:normal;margin-top:6px">Le conseil de Clem</div></div>
  <div class="card"><span class="lab">Plus facile</span><p style="margin:6px 0 0">${esc(ex.f)}</p></div>`}`;
}
function stopTimer() { if (ui.timer) { clearInterval(ui.timer); ui.timer = null; } if (PL) PL.run = false; }
function beep() { try { navigator.vibrate && navigator.vibrate(200); const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); o.stop(a.currentTime + .15); } catch (e) { } }
function tick() {
  PL.left--;
  if (PL.left <= 0) {
    beep(); const seq = seqOf(PL.id), st = seq[PL.i];
    if (!PL.resting && st.rest && PL.i < seq.length - 1) { PL.resting = true; PL.left = st.rest; }
    else { PL.resting = false; PL.i++; if (PL.i >= seq.length) { finishSeance(); return; } PL.left = seq[PL.i].sec; }
    const run = PL.run; clearInterval(ui.timer); ui.timer = null; render(); if (run) { PL.run = true; ui.timer = setInterval(tick, 1000); app.querySelector('[data-act=pPlay]').textContent = 'Pause'; }
    return;
  }
  const t = $('#tm'); if (t) t.textContent = PL.left;
}
function finishSeance() { stopTimer(); const t = today(); S.moves[t] = (S.moves[t] || 0) + C.seances[PL.id].d; S.acts = S.acts || {}; (S.acts[t] = S.acts[t] || []).push({ a: 'Séance Club Clem : ' + C.seances[PL.id].t, m: C.seances[PL.id].d }); save(); PL.done = true; render(); }
function vExos() {
  return `${back('Bouger', 'bouger')}<h2>Les exercices</h2>${Object.entries(C.ex).map(([k, e]) => `<div class="card tap row" data-go="bouger|exo|${k}" style="padding:10px"><img src="${e.img}" class="thumb" style="width:64px;height:64px;background:#fff;object-fit:contain" alt="" loading="lazy"><div class="grow"><div class="serif" style="font-size:17px">${esc(e.n)}</div><div class="small muted">${esc(e.z)}</div></div></div>`).join('')}`;
}
function vExo(k) {
  const e = C.ex[k];
  return `${back('Exercices', 'bouger', 'exos')}<img class="exi" src="${e.img}" alt=""><h2 class="mt">${esc(e.n)}</h2><p class="small muted">${esc(e.z)}</p>
  <div class="card"><ol class="steps">${e.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
  <div class="note">${esc(e.c)}<div class="lab" style="font-style:normal;margin-top:6px">Le conseil de Clem</div></div>
  <div class="card"><span class="lab">Plus facile</span><p style="margin:6px 0 0">${esc(e.f)}</p></div>`;
}

/* ---------- Mon rituel ---------- */
function todayPrises(day = today()) {
  return C.produits.filter(p => S.mine[p.id]).filter(p => {
    if (p.id !== 'gut') return true;
    const n = diffDays(S.mine.gut.start, day); return n < 30 || (n - 30) % 2 === 0;
  });
}
function vRituel() {
  if (ui.sub === 'fiche') return vFiche(ui.arg);
  if (ui.sub === 'choix' || !Object.keys(S.mine).length) return vChoix();
  const t = today(), pr = todayPrises(), tk = S.taken[t] || {};
  const low = Object.entries(S.mine).map(([id, m]) => ({ p: P(id), left: 30 - diffDays(m.start, t) })).filter(x => x.p && x.left <= 5);
  return `${headBlock()}
  ${low.map(x => `<div class="alert"><span class="lab" style="color:var(--filet)">Bientôt en rupture</span><h3 class="mt">${x.left > 0 ? `Il te reste environ ${x.left} jour${x.left > 1 ? 's' : ''} de ${esc(x.p.name)}` : `Ta boîte de ${esc(x.p.name)} doit être terminée`}</h3>
    <div class="grid2 mt"><a class="btn sm" href="${x.p.link || C.shop}" target="_blank">Je recommande chez Clem</a><button class="btn sm" style="background:transparent;color:var(--ivoire);border:1px solid var(--ivoire)" data-act="newBox" data-v="${x.p.id}">J'ai reçu ma boîte</button></div></div>`).join('')}
  <div class="card"><span class="lab">Mes prises du jour</span>
  ${MOMENTS.map(([m, l]) => { const xs = pr.filter(p => p.moment === m); return xs.length ? `<p class="lab mt" style="color:var(--brun)">${l}</p>` + xs.map(p => `<div class="check ${tk[p.id] ? 'on' : ''}" data-act="take" data-v="${p.id}"><span class="box">${tk[p.id] ? '✓' : ''}</span><img class="prod" src="${p.img}" alt=""><span class="ctext grow">${esc(p.name)}<br><span class="small muted">${esc(p.dose)}</span></span></div>`).join('') : ''; }).join('')}
  ${S.mine.gut && !pr.find(p => p.id === 'gut') ? '<p class="small muted mt">Gut & Balance : pas de prise aujourd’hui, on est en un jour sur deux.</p>' : ''}
  </div>
  <div class="card"><span class="lab">${cap(MOIS[new Date().getMonth()])}</span>${calendar()}</div>
  <div class="row between mt2"><h3>Mes compléments</h3><button class="link" data-go="rituel|choix|">Modifier</button></div>
  ${C.produits.filter(p => S.mine[p.id]).map(p => `<div class="card tap row" data-go="rituel|fiche|${p.id}" style="padding:12px"><img class="prod" src="${p.img}" alt=""><div class="grow"><div class="serif" style="font-size:17px">${esc(p.name)}</div><div class="small muted">Boîte commencée le ${parse(S.mine[p.id].start).getDate()} ${MOIS[parse(S.mine[p.id].start).getMonth()]}</div></div><span class="muted">›</span></div>`).join('')}
  <h3 class="mt2">Toute la gamme</h3>
  ${C.produits.map(p => `<div class="card tap row" data-go="rituel|fiche|${p.id}" style="padding:12px"><img class="prod" src="${p.img}" alt=""><div class="grow"><div class="serif" style="font-size:17px">${esc(p.name)}</div><div class="small muted">${esc(cap(p.phrase || ''))}</div></div><span class="muted">›</span></div>`).join('')}
  <a class="btn full mt" href="${C.shop}" target="_blank">Commander chez Clem</a>
  <p class="fine mt">Les compléments alimentaires ne remplacent pas une alimentation variée et équilibrée ni un mode de vie sain. Ne pas dépasser la dose journalière recommandée. Tenir hors de portée des enfants.</p>`;
}
function calendar() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7; let h = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<div class="small muted">${x}</div>`).join('') + '<div></div>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const k = `${y}-${pad(m + 1)}-${pad(i)}`, pr = todayPrises(k), tk = S.taken[k] || {}, c = pr.filter(p => tk[p.id]).length;
    h += `<div class="d ${pr.length && c === pr.length ? 'ok' : c ? 'part' : ''} ${k === today() ? 'today' : ''}">${i}</div>`;
  }
  return `<div class="cal mt">${h}</div>`;
}
function vChoix() {
  const has = Object.keys(S.mine).length;
  return `${has ? back('Mon rituel', 'rituel') : headBlock()}<h2 class="${has ? '' : 'mt'}">Quels compléments prends-tu ?</h2>
  <p class="muted small">Coche ceux que tu as commencés. Je te rappelle tes prises et je te préviens quand ta boîte arrive à sa fin.</p>
  <div class="pgrid mt">${C.produits.map(p => `<div class="card ${S.mine[p.id] ? 'on' : ''}" data-act="toggleMine" data-v="${p.id}">${S.mine[p.id] ? '<span class="tick">✓</span>' : ''}<img src="${p.img}" alt=""><div class="small" style="margin-top:6px">${esc(p.name)}</div></div>`).join('')}</div>
  <button class="btn full mt2" data-go="rituel||">C'est bon</button>`;
}
function vFiche(id) {
  const p = P(id); const sec = (l, k) => p[k] ? `<div class="card"><span class="lab">${l}</span><p style="margin:6px 0 0">${esc(cap(p[k]))}</p></div>` : '';
  return `${back('Mon rituel', 'rituel')}<img class="hero" src="${p.img}" style="aspect-ratio:1" alt="">
  <h1 class="mt">${esc(p.name)}</h1><p class="muted">${esc(cap(p.phrase || ''))}</p>
  ${sec('Pour qui', 'pourqui')}${sec("Ce qu'il fait", 'fait')}${sec('Les actifs clés', 'actifs')}${sec('Comment le prendre', 'comment')}
  ${p.note ? `<div class="note">${esc(p.note)}<div class="lab" style="font-style:normal;margin-top:6px">La note de Clem</div></div>` : ''}
  <button class="btn ${S.mine[id] ? 'ghost' : ''} full mt" data-act="toggleMine" data-v="${id}">${S.mine[id] ? 'Retirer de mon rituel' : 'Ajouter à mon rituel'}</button>
  <a class="btn soft full mt" href="${p.link || C.shop}" target="_blank">Commander chez Clem</a>
  ${p.precautions ? `<p class="fine mt2"><b>Précautions.</b> ${esc(p.precautions)}</p>` : ''}
  <p class="fine">Les compléments alimentaires ne remplacent pas une alimentation variée et équilibrée ni un mode de vie sain. Ne pas dépasser la dose journalière recommandée. Tenir hors de portée des enfants.</p>`;
}

/* ---------- Mon journal ---------- */
const FEEL = [['e', 'Énergie', ['À plat', 'Fatiguée', 'Correcte', 'En forme', 'Au top']], ['s', 'Sommeil', ['Très mauvaise nuit', 'Nuit agitée', 'Nuit correcte', 'Bonne nuit', 'Nuit réparatrice']],
  ['d', 'Digestion', ['Très inconfortable', 'Ballonnée', 'Correcte', 'Bonne', 'Ventre léger']], ['c', 'Envies de sucré', ['Irrésistibles', 'Fortes', 'Présentes', 'Légères', 'Aucune']]];
function vJournal() {
  if (ui.sub === 'guide') return vGuide();
  const d = ui.jday || today(), j = L.journal[d] || {};
  return `${headBlock()}
  <div class="row between"><button class="heart" data-act="jday" data-v="-1">‹</button><span class="lab">${esc(longDate(d))}</span><button class="heart" data-act="jday" data-v="1" ${d === today() ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div class="card"><span class="lab">Mon ressenti</span>
  <p class="fine" style="margin:6px 0 4px">Plus c'est rempli, mieux je me sens.</p>
  ${FEEL.map(([k, l, w]) => `<div style="padding:10px 0;border-bottom:1px solid var(--filet)"><div class="row between"><span>${l}</span><div class="dots">${[1, 2, 3, 4, 5].map(n => `<button class="${(j[k] || 0) >= n ? 'on' : ''}" data-act="feel" data-v="${k}|${n}" aria-label="${esc(w[n - 1])}"></button>`).join('')}</div></div>
  <div class="small" style="text-align:right;margin-top:4px;color:${j[k] ? 'var(--brun)' : 'var(--taupe)'}">${j[k] ? esc(w[j[k] - 1]) : esc(w[0]) + ' → ' + esc(w[4])}</div></div>`).join('')}</div>
  <div class="card"><span class="lab">Ma note du jour</span><textarea id="jnote" class="mt" placeholder="Ce que j'ai remarqué aujourd'hui…">${esc(j.note || '')}</textarea></div>
  <div class="card"><span class="lab">Mes 14 derniers jours</span>${chart()}</div>
  <div class="card"><div class="row between"><span class="lab">Mes mesures · privé</span><button class="toggle ${L.showMes ? 'on' : ''}" data-act="showMes" aria-label="Afficher"></button></div>
  ${L.showMes ? `<p class="fine">Tes mesures restent uniquement sur ton téléphone. Personne d'autre n'y a accès, même pas Clem.</p>
    <div class="grid2 mt">${[['poids', 'Poids', 'kg'], ['taille', 'Tour de taille', 'cm'], ['hanches', 'Tour de hanches', 'cm'], ['cuisse', 'Tour de cuisse', 'cm']].map(([k, l, u]) => `<div class="field"><label>${l}</label><div class="unit"><input id="m_${k}" inputmode="decimal" placeholder="..."><span>${u}</span></div></div>`).join('')}</div>
    <button class="btn full mt" data-act="saveMes">Enregistrer</button>
    <p class="center mt"><button class="link" data-go="journal|guide|">Comment prendre mes mensurations ?</button></p>
    ${L.mesures.length ? `<ul class="clean mt">${L.mesures.slice().reverse().slice(0, 8).map(m => `<li class="small"><b>${parse(m.date).getDate()} ${MOIS[parse(m.date).getMonth()]}</b> · ${['poids', 'taille', 'hanches', 'cuisse'].filter(k => m[k]).map(k => m[k] + (k === 'poids' ? ' kg' : ' cm') + ' ' + ({ poids: '', taille: 'taille', hanches: 'hanches', cuisse: 'cuisse' }[k])).join(' · ')}</li>`).join('')}</ul>` : ''}`
      : '<p class="fine">Tes mesures sont masquées.</p>'}</div>`;
}
function chart() {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const W = 300, H = 110, x = i => 10 + i * (W - 20) / 13, y = v => H - 12 - (v - 1) * (H - 24) / 4;
  const line = (k, col, dash) => { const pts = days.map((d, i) => L.journal[d] && L.journal[d][k] ? [x(i), y(L.journal[d][k])] : null).filter(Boolean); return pts.length > 1 ? `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="2" ${dash ? 'stroke-dasharray="4 4"' : ''}/>` : '' + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${col}"/>`).join(''); };
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:10px">${[1, 3, 5].map(v => `<line x1="10" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="#E2D6C3"/>`).join('')}${line('e', '#3B2314')}${line('s', '#B08D57', 1)}</svg>
  <div class="row small muted" style="gap:16px"><span>━ Énergie</span><span style="color:#B08D57">┅ Sommeil</span></div>`;
}
const SIL = `<svg width="140" height="262" viewBox="0 0 140 262" role="img" aria-label="Dessin d'une silhouette de femme indiquant où prendre le tour de taille, de hanches et de cuisse" style="flex-shrink: 0"> <path d="M63 18 C60 26 61 36 66 41 C68.5 43.6 72 43.6 75 41 C80 36 81 26 78 18 C75 12.6 66 12.6 63 18 Z" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M65.5 48 C58 50 49 51 46 56 C42 64 41 78 40 92 C39 104 38 116 37 126 C36 130 34.5 136 36.5 139.5 C38.5 141.5 41 138 41.2 133.5 C41.8 130 43 128 43.2 124 C45 112 46.5 98 48 84 C49 77 49.6 71 50 66" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M 74.5 48 C 82 50 91 51 94 56 C 98 64 99 78 100 92 C 101 104 102 116 103 126 C 104 130 105.5 136 103.5 139.5 C 101.5 141.5 99 138 98.8 133.5 C 98.2 130 97 128 96.8 124 C 95 112 93.5 98 92 84 C 91 77 90.4 71 90 66" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M50 66 C52 76 55.5 84 55 92 C53 100 46.5 108 45.5 118 C44.5 134 46.5 150 48.5 166 C50 186 51.5 210 52.5 228 C53 236 53 242 53 246 C52.5 250 50.5 253.5 53 255.5 L61 255.5 C62 252 62.2 248 62 244 C62.5 222 64 190 66 160 C67 146 68 136 70 129" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M 90 66 C 88 76 84.5 84 85 92 C 87 100 93.5 108 94.5 118 C 95.5 134 93.5 150 91.5 166 C 90 186 88.5 210 87.5 228 C 87 236 87 242 87 246 C 87.5 250 89.5 253.5 87 255.5 L 79 255.5 C 78 252 77.8 248 78 244 C 77.5 222 76 190 74 160 C 73 146 72 136 70 129" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M61 11 C53 21 52.5 40 54.5 50 C55.5 56 53.5 61 50.5 65" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M 79 11 C 87 21 87.5 40 85.5 50 C 84.5 56 86.5 61 89.5 65" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M61 11 C66 3.5 75 3 79 11" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M66.5 42 L65.5 48 M74 42 L74.5 48" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M53.5 69 C57 76 64 76.5 68 71 M72 71 C76 76.5 83 76 86.5 69" fill="none" stroke="#6F5F4F" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/> <path d="M44 92 H96" stroke="#3B2314" stroke-width="1.3" stroke-dasharray="3 3"/> <path d="M34 118 H106" stroke="#3B2314" stroke-width="1.3" stroke-dasharray="3 3"/> <path d="M38 148 H70" stroke="#3B2314" stroke-width="1.3" stroke-dasharray="3 3"/> <circle cx="112" cy="92" r="9" fill="#3B2314"/><text x="112" y="96" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="#FCFAF2">1</text> <circle cx="120" cy="118" r="9" fill="#3B2314"/><text x="120" y="122" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="#FCFAF2">2</text> <circle cx="26" cy="148" r="9" fill="#3B2314"/><text x="26" y="152" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="#FCFAF2">3</text> </svg>`;
function vGuide() {
  const step = (n, t, d) => `<div class="row" style="align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--filet)"><span style="width:26px;height:26px;border-radius:50%;background:var(--brun);color:var(--ivoire);display:flex;align-items:center;justify-content:center;font-size:13px;flex:none">${n}</span><div><b>${t}</b><div class="small muted">${d}</div></div></div>`;
  return `${back('Mon journal', 'journal')}<h2>Bien prendre mes mensurations</h2>
  <div class="card"><div class="center">${SIL}</div>
  ${step(1, 'Tour de taille', "À l'endroit le plus fin, environ deux doigts au-dessus du nombril.")}
  ${step(2, 'Tour de hanches', "À l'endroit le plus large des fesses, pieds joints.")}
  ${step(3, 'Tour de cuisse', 'Au plus large, juste sous la fesse. Toujours la même jambe.')}</div>
  <div class="card"><span class="lab">Mes astuces</span><ul class="clean mt">
  <li>Le matin, avant le petit-déjeuner, toujours dans les mêmes conditions.</li>
  <li>Un mètre ruban souple, bien à plat, sans serrer.</li>
  <li>Debout, détendue, sans rentrer le ventre.</li>
  <li>Une fois toutes les deux semaines suffit, ton corps change plus lentement qu'on ne le croit.</li></ul></div>`;
}

/* ---------- Profil ---------- */
function vProfil() {
  return `${back('Ma journée', 'journee')}
  <div class="center"><label style="cursor:pointer;display:inline-block"><div class="avatar" style="width:88px;height:88px;font-size:36px;margin:0 auto;overflow:hidden">${avatarInner()}</div><input type="file" accept="image/*" id="photo" style="display:none"><div class="small muted mt" style="text-decoration:underline">${S.photo ? 'Changer ma photo' : 'Ajouter ma photo'}</div></label>
  ${S.photo ? '<div><button class="link small" data-act="rmPhoto">Retirer la photo</button></div>' : ''}<h2 class="mt">${esc(prenom() || 'Mon profil')}</h2><p class="small muted">${esc(USER.email || '')}</p></div>
  <div class="grid2 mt"><div class="card" style="margin:0"><span class="lab">Jours actifs</span><div class="serif" style="font-size:26px">${activeDays()}</div></div><div class="card" style="margin:0"><span class="lab">Favorites</span><div class="serif" style="font-size:26px">${S.favs.length}</div></div></div>
  ${badgesBlock()}
  <a class="card tap row mt2" href="${C.shop}" target="_blank" style="text-decoration:none"><div class="grow"><span class="lab">Ma boutique</span><div>Commander chez Clem</div></div><span>›</span></a>
  <a class="card tap row" href="${C.insta}" target="_blank" style="text-decoration:none"><div class="grow"><span class="lab">Instagram</span><div>@clemence.marchadour</div></div><span>›</span></a>
  ${installHint()}
  <div class="card"><span class="lab">Confidentialité</span><p class="small" style="margin:6px 0 0">Ton journal et tes mesures restent sur ton téléphone. Tes favoris, ta semaine et ton rituel sont sauvegardés de façon privée sur ton compte.</p></div>
  <button class="btn ghost full mt" data-act="logout">Me déconnecter</button>`;
}

/* ---------- actions ---------- */
const ACT = {
  take: v => { const t = today(); (S.taken[t] = S.taken[t] || {})[v] = !S.taken[t][v]; save(); render(); },
  tableSemaine: () => { ui.tableSeg = 'semaine'; ui.day = today(); go('table'); },
  sucre: () => { ui.tableSeg = 'recettes'; ui.filter = 'dessert'; go('table'); },
  pick: v => { const [d, s] = v.split('|'); pickSheet(d, s); },
  unplan: v => { const [d, s] = v.split('|'); if (S.plan[d]) delete S.plan[d][s]; save(); render(); },
  seg: v => { ui.tableSeg = v; ui.sub = null; render(); },
  day: v => { ui.day = v; render(); },
  filter: v => { ui.filter = v; render(); },
  fav: v => { S.favs = S.favs.includes(v) ? S.favs.filter(x => x !== v) : S.favs.concat(v); save(); render(); },
  addDay: v => {
    const r = R(v), t = today(), p = S.plan[t] = S.plan[t] || {};
    const breakfast = r.type === 'pdj' || ['sucre', 'sale'].includes(r.cat);
    const slot = breakfast ? 'b' : (!p.l ? 'l' : 'd');
    p[slot] = v; save(); toast('Ajouté : ' + SLOTS.find(s => s[0] === slot)[1].toLowerCase() + " d'aujourd'hui");
  },
  addCourses: v => { if (!S.extra.includes(v)) S.extra.push(v); save(); toast('Ajouté à tes courses'); },
  rmCourses: v => { S.extra = S.extra.filter(x => x !== v); save(); render(); },
  chk: v => { S.checked[v] = !S.checked[v]; save(); render(); },
  clearCourses: () => { S.checked = {}; save(); render(); },
  saveOwn: () => {
    const d = ui.draft; d.t = $('#o_t').value.trim(); d.steps = $('#o_steps').value; d.pers = $('#o_pers').value;
    if (!d.t) { toast('Donne un nom à ta recette'); return; }
    const ty = $('#o_type').value, t = calcDraft(), n = Math.max(1, parseInt(d.pers) || 1);
    const r = { id: 'own' + Date.now(), t: d.t, type: ['sucre', 'sale'].includes(ty) ? 'pdj' : 'plat', cat: ty === 'plat' ? 'plat' : ty, tag: 'Ma recette', time: '', pers: n + (n > 1 ? ' pers.' : ' pers.'),
      kcal: t.kcal, p: t.p, g: t.g, l: t.l, img: d.img || null,
      ing: d.rows.filter(x => x.f).map(x => { const f = foodOf(x.f); if (!x.g) return x.f; if (f && x.u === 'u' && f[5]) return `${x.f} : ${x.g} ${f[6]}${parseFloat(x.g) > 1 && !f[6].includes(' ') && !/s$/.test(f[6]) ? 's' : ''}`; return `${x.f} : ${x.g} g`; }), steps: d.steps.split('\n').map(x => x.trim()).filter(Boolean) };
    S.own.push(r); ui.draft = null;
    const pd = ui.pending; ui.pending = null;
    if (pd) { (S.plan[pd.day] = S.plan[pd.day] || {})[pd.slot] = r.id; save(); if (pd.from === 'table') { ui.tableSeg = 'semaine'; ui.day = pd.day; } go(pd.from); toast('Ajouté à ta journée'); return; }
    save(); ui.filter = 'mine'; ui.tableSeg = 'recettes'; go('table'); toast('Recette enregistrée');
  },
  newOwn: () => { ui.draft = null; ui.pending = null; go('table', 'ajout'); },
  addRow: () => { keepDraft(); ui.draft.rows.push({ f: '', g: '', u: '' }); render(); },
  rmRow: v => { keepDraft(); ui.draft.rows.splice(+v, 1); if (!ui.draft.rows.length) ui.draft.rows.push({ f: '', g: '', u: '' }); render(); },
  cancelOwn: () => { const pd = ui.pending; ui.pending = null; ui.draft = null; go(pd ? pd.from : 'table'); },
  delOwn: v => { if (!confirm('Supprimer cette recette ?')) return; S.own = S.own.filter(r => r.id !== v); save(); go('table'); },
  five: () => { ui.sub = null; render(); const g = $('#g_express'); if (g) g.scrollIntoView({ behavior: 'smooth' }); },
  actOpen: () => { ui.actForm = { a: '', m: '' }; render(); },
  actCancel: () => { ui.actForm = null; render(); },
  actA: v => { keepAct(); ui.actForm.a = v; render(); },
  actM: v => { keepAct(); ui.actForm.m = v; render(); },
  actSave: () => {
    keepAct(); const f = ui.actForm, t = today();
    const a = f.a === 'Autre' ? (f.o || '').trim() || 'Autre activité' : f.a, m = parseInt(f.m);
    if (!f.a) { toast('Choisis ton activité'); return; }
    if (!m || m < 1 || m > 600) { toast('Indique la durée en minutes'); return; }
    S.acts = S.acts || {}; (S.acts[t] = S.acts[t] || []).push({ a, m }); S.moves[t] = (S.moves[t] || 0) + m;
    ui.actForm = null; save(); render(); toast('Activité ajoutée 🤎');
  },
  actRm: v => { const t = today(), x = S.acts[t][+v]; if (!x) return; S.acts[t].splice(+v, 1); S.moves[t] = Math.max(0, (S.moves[t] || 0) - x.m); save(); render(); },
  level: v => { S.level = v; save(); render(); },
  pPlay: () => { if (PL.run) { stopTimer(); render(); } else { PL.run = true; ui.timer = setInterval(tick, 1000); render(); PL.run = true; } },
  pNext: () => { const seq = seqOf(PL.id), run = PL.run; stopTimer(); PL.resting = false; PL.i++; if (PL.i >= seq.length) { finishSeance(); return; } PL.left = seq[PL.i].sec; render(); if (run) ACT.pPlay(); },
  pPrev: () => { const run = PL.run; stopTimer(); PL.resting = false; PL.i = Math.max(0, PL.i - 1); PL.left = seqOf(PL.id)[PL.i].sec; render(); if (run) ACT.pPlay(); },
  endSeance: () => { PL = null; go('bouger'); },
  toggleMine: v => { if (S.mine[v]) delete S.mine[v]; else S.mine[v] = { start: today() }; save(); render(); },
  newBox: v => { S.mine[v] = { start: today() }; save(); render(); toast('Nouvelle boîte notée'); },
  feel: v => { const [k, n] = v.split('|'), d = ui.jday || today(); const j = L.journal[d] = L.journal[d] || {}; j[k] = +n; save(); render(); },
  jday: v => { const d = addDays(ui.jday || today(), +v); if (d > today()) return; ui.jday = d; render(); },
  showMes: () => { L.showMes = !L.showMes; save(); render(); },
  saveMes: () => {
    const m = { date: today() }; let any = false;
    ['poids', 'taille', 'hanches', 'cuisse'].forEach(k => { const v = parseFloat(($('#m_' + k).value || '').replace(',', '.')); if (v) { m[k] = v; any = true; } });
    if (!any) { toast('Remplis au moins une mesure'); return; }
    L.mesures = L.mesures.filter(x => x.date !== m.date).concat(m); save(); render(); toast('Mesures enregistrées');
  },
  logout: async () => { await sb.auth.signOut(); localStorage.removeItem('cc_k'); location.reload(); }
};
function keepDraft() { const d = ui.draft; if (!d) return; const q = x => document.getElementById(x); if (q('o_t')) d.t = q('o_t').value; if (q('o_steps')) d.steps = q('o_steps').value; if (q('o_pers')) d.pers = q('o_pers').value; }
function shrink(file, n, square, cb) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement('canvas');
    if (square) { const k = Math.min(img.width, img.height); c.width = c.height = n; c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n); }
    else { const r = Math.min(1, n / Math.max(img.width, img.height)); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); }
    URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.8));
  };
  img.src = url;
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('[data-sug]'); if (!b || !ui.draft) return;
  e.preventDefault(); const r = ui.draft.rows[+b.dataset.sug], sq = splitQty(r.f), f = foodOf(b.dataset.name);
  r.f = f[0]; if (sq.q && !r.g) r.g = sq.q; r.u = f[5] && !sq.g ? 'u' : 'g'; keepDraft(); render();
  const q = document.querySelector(`[data-row="${b.dataset.sug}"][data-k="g"]`); if (q && !r.g) q.focus();
});
document.addEventListener('change', e => {
  if (e.target.id === 'o_img' && e.target.files[0]) { keepDraft(); shrink(e.target.files[0], 900, false, u => { ui.draft.img = u; render(); }); return; }
  if (e.target.dataset && e.target.dataset.row !== undefined) { const r = ui.draft.rows[+e.target.dataset.row], k = e.target.dataset.k; r[k] = e.target.value; if (k === 'f') { r.u = ''; resolveRow(r); keepDraft(); render(); return; } const tb = document.getElementById('o_tot'); if (tb) tb.innerHTML = totBlock(); return; }
  if (e.target.id === 'o_pers' && ui.draft) { ui.draft.pers = e.target.value; const tb = document.getElementById('o_tot'); if (tb) tb.innerHTML = totBlock(); return; }
  if (e.target.id !== 'photo' || !e.target.files[0]) return;
  const f = e.target.files[0], img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const n = 240, c = document.createElement('canvas'); c.width = c.height = n;
    const k = Math.min(img.width, img.height), x = (img.width - k) / 2, y = (img.height - k) / 2;
    c.getContext('2d').drawImage(img, x, y, k, k, 0, 0, n, n);
    S.photo = c.toDataURL('image/jpeg', 0.82); URL.revokeObjectURL(url); save(); render(); toast('Photo enregistrée');
  };
  img.src = url;
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.row !== undefined && ui.draft) { const i = +e.target.dataset.row; ui.draft.rows[i][e.target.dataset.k] = e.target.value; const tb = document.getElementById('o_tot'); if (tb) tb.innerHTML = totBlock();
    if (e.target.dataset.k === 'f') { const box = document.getElementById('sug_' + i); if (box) { const sg = foodOf(e.target.value) ? [] : suggest(e.target.value); box.innerHTML = sg.length ? `<div class="chips" style="flex-wrap:wrap;padding-top:8px">${sg.map(f => `<button class="chip" data-sug="${i}" data-name="${esc(f[0])}">${esc(f[0])}</button>`).join('')}</div>` : (e.target.value.trim().length > 2 ? '<p class="fine" style="margin:6px 0 0">Pas dans la liste : il ne sera pas compté.</p>' : ''); } } }
  if (e.target.id === 'o_pers' && ui.draft) { ui.draft.pers = e.target.value; const tb = document.getElementById('o_tot'); if (tb) tb.innerHTML = totBlock(); } if (e.target.id === 'jnote') { const d = ui.jday || today(); (L.journal[d] = L.journal[d] || {}).note = e.target.value; clearTimeout(e.target._t); e.target._t = setTimeout(save, 600); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && PL && PL.run) { /* le minuteur continue en arrière-plan si possible */ } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
