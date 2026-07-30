/* ============================================================
   GESTAO V8 — Modulos Comercial / Estoque / Financeiro
   Painel Cowork CHR — V8 + Drywall Paris
   Estado local (localStorage) sincronizado via sync.js (Firebase)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- STORE ---------------- */
  var LS = 'v8_gestao_v1';
  var DEF = { itens: [], mov: [], ap: [], ar: [], cfg: { crit: [] } };
  var S = loadState();

  function loadState() {
    try {
      var o = JSON.parse(localStorage.getItem(LS) || '{}');
      return {
        itens: o.itens || [], mov: o.mov || [], ap: o.ap || [], ar: o.ar || [],
        cfg: o.cfg || { crit: [] }
      };
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { alert('Nao foi possivel salvar (armazenamento cheio).'); }
  }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 9) + (seq++); }
  var seq = 0;

  /* ---------------- HELPERS ---------------- */
  function brl(v) {
    v = Number(v) || 0;
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(v, d) {
    v = Number(v) || 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 0 : d, maximumFractionDigits: d == null ? 2 : d });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mesAtual() { return today().slice(0, 7); }
  function fmtD(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function diasEntre(a, b) {
    if (!a || !b) return 0;
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  function addDias(iso, n) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addMeses(iso, n) {
    var d = new Date(iso + 'T00:00:00');
    var dia = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    var ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ult));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* aceita 1.234,56 | 1,234.56 | 1234.56 | R$ 1.234,56 */
  function pnum(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    var s = String(v).replace(/[^0-9,.\-]/g, '').trim();
    if (!s) return 0;
    var vi = s.lastIndexOf(','), pt = s.lastIndexOf('.');
    if (vi > -1 && pt > -1) {
      if (vi > pt) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (vi > -1) {
      s = (s.split(',')[1] || '').length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  /* aceita DD/MM/AAAA, AAAA-MM-DD, DD-MM-AAAA, serial Excel */
  function pdate(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    var s = String(v).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
      var a = m[3].length === 2 ? '20' + m[3] : m[3];
      return a + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    }
    if (/^\d{5}$/.test(s)) { // serial excel
      var d = new Date(Date.UTC(1899, 11, 30) + parseInt(s, 10) * 86400000);
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    }
    return '';
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function csvDown(nome, linhas) {
    var txt = linhas.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(';');
    }).join('\n');
    var blob = new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function on(sel, ev, fn, root) {
    (root || document).querySelectorAll(sel).forEach(function (el) { el.addEventListener(ev, fn); });
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ''; }

  /* ---------------- CSS ---------------- */
  var CSS = [
    /* impede que tabelas largas estourem o layout */
    '.app{grid-template-columns:240px minmax(0,1fr);}',
    '.main{min-width:0;}',
    '.table-card,.chart-card,.gx-form,.gx-filters{max-width:100%;}',
    '.nav-group{margin:2px 0;}',
    '.nav-group>.nav-head{display:flex;align-items:center;gap:12px;padding:12px 24px;color:rgba(255,255,255,.75);cursor:pointer;font-weight:600;font-size:13.5px;border-left:3px solid transparent;transition:all .18s;}',
    '.nav-group>.nav-head:hover{background:rgba(255,255,255,.06);color:#fff;}',
    '.nav-group.open>.nav-head{color:#fff;}',
    '.nav-group>.nav-head .icon{font-size:17px;width:22px;text-align:center;}',
    '.nav-group>.nav-head .arw{margin-left:auto;font-size:10px;opacity:.7;transition:transform .18s;}',
    '.nav-group.open>.nav-head .arw{transform:rotate(90deg);}',
    '.nav-sub{display:none;padding:2px 0 6px;}',
    '.nav-group.open>.nav-sub{display:block;}',
    '.nav-sub .nav-item{padding:8px 24px 8px 58px;font-size:12.8px;font-weight:500;}',
    '.nav-badge{margin-left:auto;background:#b22222;color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:1px 7px;min-width:18px;text-align:center;}',
    '.nav-group>.nav-head .nav-badge{margin-left:6px;}',
    '.nav-sub .nav-item .nav-badge{margin-left:auto;}',
    /* toolbar / forms */
    '.gx-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}',
    '.gx-btn{border:1px solid var(--cinza-claro);background:#fff;color:var(--azul-marinho);padding:7px 13px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;}',
    '.gx-btn:hover{border-color:var(--azul-chr);color:var(--azul-chr);}',
    '.gx-btn.pri{background:var(--azul-chr);border-color:var(--azul-chr);color:#fff;}',
    '.gx-btn.pri:hover{background:var(--azul-marinho);border-color:var(--azul-marinho);color:#fff;}',
    '.gx-btn.dgr{color:var(--vermelho);border-color:rgba(178,34,34,.35);}',
    '.gx-btn.sm{padding:4px 9px;font-size:11.5px;border-radius:6px;}',
    '.gx-form{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:18px 20px;margin-bottom:22px;}',
    '.gx-form h3{font-family:Montserrat,sans-serif;font-size:15px;font-weight:700;margin-bottom:14px;color:var(--azul-marinho);}',
    '.gx-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end;}',
    '.gx-f{display:flex;flex-direction:column;gap:4px;}',
    '.gx-f label{font-size:10.5px;font-weight:600;text-transform:uppercase;color:var(--marrom-claro);letter-spacing:.5px;}',
    '.gx-f input,.gx-f select,.gx-f textarea{padding:7px 10px;border:1px solid var(--cinza-claro);border-radius:6px;font-family:inherit;font-size:13px;background:#fff;color:var(--azul-marinho);width:100%;}',
    '.gx-f input:focus,.gx-f select:focus{outline:none;border-color:var(--azul-chr);}',
    '.gx-hint{font-size:11.5px;color:var(--marrom-claro);margin-top:10px;line-height:1.5;}',
    '.gx-filters{background:var(--card);padding:12px 16px;border-radius:10px;box-shadow:var(--shadow);display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;align-items:end;margin-bottom:20px;}',
    '.gx-empty{padding:28px;text-align:center;color:var(--marrom-claro);font-size:13px;}',
    '.gx-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;}',
    '.gx-tab{padding:7px 15px;border-radius:8px;background:#fff;border:1px solid var(--cinza-claro);font-size:12.5px;font-weight:600;cursor:pointer;color:var(--marrom-claro);}',
    '.gx-tab.on{background:var(--azul-marinho);border-color:var(--azul-marinho);color:#fff;}',
    '.gx-pane{display:none;} .gx-pane.on{display:block;}',
    '.gx-pill{display:inline-block;padding:2px 9px;border-radius:14px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}',
    '.pill-ok{background:rgba(39,102,58,.12);color:var(--verde);}',
    '.pill-warn{background:rgba(200,155,30,.18);color:#8a6b0d;}',
    '.pill-bad{background:rgba(178,34,34,.12);color:var(--vermelho);}',
    '.pill-neu{background:rgba(54,75,129,.10);color:var(--azul-chr);}',
    '.pill-mut{background:#eceef4;color:var(--marrom-claro);}',
    '.gx-scroll{max-height:620px;overflow:auto;}',
    '.gx-scroll thead th{position:sticky;top:0;z-index:2;}',
    'td.neg{color:var(--vermelho);font-weight:600;}',
    'td.pos{color:var(--verde);font-weight:600;}',
    /* modal */
    '.gx-mod{position:fixed;inset:0;background:rgba(9,10,15,.55);display:none;align-items:flex-start;justify-content:center;z-index:9999;padding:40px 16px;overflow:auto;}',
    '.gx-mod.on{display:flex;}',
    '.gx-mod-box{background:#fff;border-radius:14px;max-width:900px;width:100%;box-shadow:0 20px 60px rgba(9,10,15,.35);}',
    '.gx-mod-hd{padding:16px 22px;border-bottom:1px solid #ecedf2;display:flex;justify-content:space-between;align-items:center;}',
    '.gx-mod-hd h3{font-family:Montserrat,sans-serif;font-size:17px;font-weight:700;}',
    '.gx-mod-bd{padding:18px 22px;max-height:70vh;overflow:auto;}',
    '.gx-mod-ft{padding:14px 22px;border-top:1px solid #ecedf2;display:flex;gap:10px;justify-content:flex-end;}',
    '.gx-x{cursor:pointer;font-size:20px;line-height:1;color:var(--marrom-claro);background:none;border:none;}',
    '.gx-map{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:14px 0;}',
    '.gx-prev{border:1px solid #ecedf2;border-radius:8px;overflow:auto;max-height:230px;}',
    '.gx-prev table{font-size:12px;} .gx-prev td{padding:6px 10px;white-space:nowrap;}',
    'textarea.gx-paste{width:100%;height:120px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;padding:10px;border:1px solid var(--cinza-claro);border-radius:8px;}',
    '@media(max-width:820px){.main{padding:20px 16px;}.gx-row{grid-template-columns:1fr 1fr;}}'
  ].join('\n');

  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------------- NAV ---------------- */
  var NAV = [
    { t: 'i', page: 'painel', icon: '●', label: 'Painel' },
    {
      t: 'g', key: 'comercial', icon: '▦', label: 'Comercial', kids: [
        { page: 'semanal', label: 'Semana a semana' },
        { page: 'mensal', label: 'Mensal' },
        { page: 'vendedores', label: 'Vendedores' },
        { page: 'clientes', label: 'Top clientes' },
        { page: 'produtos', label: 'Top produtos' },
        { page: 'risco', label: 'Clientes em risco' },
        { page: 'metas', label: 'Metas' }
      ]
    },
    {
      t: 'g', key: 'estoque', icon: '▣', label: 'Estoque', kids: [
        { page: 'compras', label: 'Compras V8' },
        { page: 'estoque-atual', label: 'Estoque atual' },
        { page: 'ponto-pedido', label: 'Ponto de pedido', badge: 'pp' },
        { page: 'mov-estoque', label: 'Lançamentos de estoque' }
      ]
    },
    {
      t: 'g', key: 'financeiro', icon: '$', label: 'Financeiro', kids: [
        { page: 'lucro', label: 'Lucro & margem' },
        { page: 'contas-pagar', label: 'Contas a pagar', badge: 'ap' },
        { page: 'contas-receber', label: 'Contas a receber', badge: 'ar' },
        { page: 'pagamentos', label: 'Pagamentos & boletos' }
      ]
    },
    { t: 'i', page: 'jornada', icon: '🧭', label: 'Jornada da Mentoria' }
  ];

  function buildNav() {
    var sb = document.querySelector('.sidebar');
    if (!sb) return;
    sb.querySelectorAll('.nav-item').forEach(function (n) { n.remove(); });
    var wrap = document.createElement('div');
    wrap.className = 'gx-nav';
    var html = '';
    NAV.forEach(function (n) {
      if (n.t === 'i') {
        html += '<div class="nav-item" data-page="' + n.page + '"><span class="icon">' + n.icon + '</span><span>' + n.label + '</span></div>';
      } else {
        html += '<div class="nav-group" data-group="' + n.key + '">' +
          '<div class="nav-head"><span class="icon">' + n.icon + '</span><span>' + n.label + '</span>' +
          '<span class="nav-badge" data-badge="g-' + n.key + '" style="display:none"></span><span class="arw">▶</span></div><div class="nav-sub">';
        n.kids.forEach(function (k) {
          html += '<div class="nav-item" data-page="' + k.page + '"><span>' + k.label + '</span>' +
            (k.badge ? '<span class="nav-badge" data-badge="' + k.badge + '" style="display:none"></span>' : '') + '</div>';
        });
        html += '</div></div>';
      }
    });
    wrap.innerHTML = html;
    var ft = sb.querySelector('.sidebar-footer');
    if (ft) sb.insertBefore(wrap, ft); else sb.appendChild(wrap);

    wrap.querySelectorAll('.nav-head').forEach(function (h) {
      h.addEventListener('click', function () { h.parentNode.classList.toggle('open'); });
    });
    wrap.querySelectorAll('.nav-item').forEach(function (it) {
      it.addEventListener('click', function () { go(it.dataset.page); });
    });
  }

  var HOOKS = {};
  function go(page) {
    var pg = el('page-' + page);
    if (!pg) return;
    document.querySelectorAll('.nav-item').forEach(function (i) { i.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var nv = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (nv) {
      nv.classList.add('active');
      var gp = nv.closest('.nav-group');
      if (gp) gp.classList.add('open');
    }
    pg.classList.add('active');
    try { localStorage.setItem('v8_nav_page', page); } catch (e) { }
    if (HOOKS[page]) { try { HOOKS[page](); } catch (e) { console.warn('hook ' + page, e); } }
    window.scrollTo(0, 0);
  }

  function setBadge(key, n, cls) {
    document.querySelectorAll('[data-badge="' + key + '"]').forEach(function (b) {
      if (n > 0) { b.style.display = ''; b.textContent = n; b.style.background = cls || '#b22222'; }
      else b.style.display = 'none';
    });
  }

  /* ---------------- PAGE HELPER ---------------- */
  function addPage(id, html) {
    var m = document.querySelector('.main');
    var d = document.createElement('div');
    d.className = 'page';
    d.id = 'page-' + id;
    d.innerHTML = html;
    m.appendChild(d);
    return d;
  }
  function hdr(titulo, sub, tools) {
    return '<div class="page-header"><div><h2>' + titulo + '</h2><div class="subtitle">' + sub + '</div></div>' +
      '<div class="gx-tools">' + (tools || '') + '</div></div>';
  }
  function kpi(label, value, sub, cls) {
    return '<div class="kpi-card ' + (cls || '') + '"><div class="label">' + label + '</div>' +
      '<div class="value">' + value + '</div><div class="sub">' + (sub || '') + '</div></div>';
  }

  /* ---------------- ITENS ---------------- */
  var UNS = ['UN', 'PC', 'CX', 'M', 'M2', 'KG', 'SC', 'RL', 'LT', 'PCT', 'BARRA', 'CH'];
  var CATS_PAD = ['Placa/Gesso', 'Perfil/Metal', 'Massa/Rejunte', 'Parafuso/Fixação', 'Isolamento', 'Tinta/Acabamento', 'Ferramenta', 'Outros'];

  function findItem(nome) {
    var n = norm(nome);
    if (!n) return null;
    for (var i = 0; i < S.itens.length; i++) {
      if (norm(S.itens[i].nome) === n || (S.itens[i].cod && norm(S.itens[i].cod) === n)) return S.itens[i];
    }
    return null;
  }
  function ensureItem(nome, extra) {
    var it = findItem(nome);
    if (it) {
      if (extra && extra.custo && !it.custo) it.custo = extra.custo;
      if (extra && extra.forn && !it.forn) it.forn = extra.forn;
      return it;
    }
    it = {
      id: uid('i'), cod: '', nome: String(nome).trim(), cat: '', un: 'UN', forn: '',
      custo: 0, pp: 0, lote: 0, lead: 0, emp: 'V8', crit: 0, ativo: 1
    };
    if (extra) for (var k in extra) { if (extra[k] !== undefined && extra[k] !== '') it[k] = extra[k]; }
    S.itens.push(it);
    return it;
  }
  function itemById(id) { for (var i = 0; i < S.itens.length; i++) if (S.itens[i].id === id) return S.itens[i]; return null; }
  function cats() {
    var s = {};
    S.itens.forEach(function (i) { if (i.cat) s[i.cat] = 1; });
    CATS_PAD.forEach(function (c) { s[c] = 1; });
    return Object.keys(s).sort();
  }
  function forns() {
    var s = {};
    S.itens.forEach(function (i) { if (i.forn) s[i.forn] = 1; });
    S.mov.forEach(function (m) { if (m.forn) s[m.forn] = 1; });
    return Object.keys(s).sort();
  }
  function optList(arr, sel, vazio) {
    var h = vazio ? '<option value="">' + vazio + '</option>' : '';
    arr.forEach(function (a) {
      var v = typeof a === 'object' ? a.v : a, t = typeof a === 'object' ? a.t : a;
      h += '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return h;
  }

  /* ---------------- CALCULO DE ESTOQUE ---------------- */
  /* mov: {id,t:'E'|'S'|'C'|'A', d, it, q, vu, forn, doc, dest, desp, ped, obs, quem} */
  function calcEstoque() {
    var map = {};
    S.itens.forEach(function (i) {
      map[i.id] = {
        it: i, ent: 0, sai: 0, aj: 0, res: 0, resV: 0, cont: null, contD: '',
        entPos: 0, saiPos: 0, ajPos: 0, entAte: 0, saiAte: 0, ajAte: 0,
        sai30: 0, ultEnt: '', ultSai: ''
      };
    });
    var lim30 = addDias(today(), -30);
    /* 1a passada: acha a ultima contagem por item */
    S.mov.forEach(function (m) {
      var r = map[m.it]; if (!r) return;
      if (m.t === 'C' && (!r.contD || m.d >= r.contD)) { r.contD = m.d; r.cont = Number(m.q) || 0; }
    });
    /* 2a passada: acumula */
    S.mov.forEach(function (m) {
      var r = map[m.it]; if (!r) return;
      var q = Number(m.q) || 0;
      if (m.t === 'E') {
        r.ent += q;
        if (m.d > r.ultEnt) r.ultEnt = m.d;
        if (r.contD && m.d > r.contD) r.entPos += q; else r.entAte += q;
      } else if (m.t === 'S') {
        if (m.desp) {
          r.sai += q;
          if (m.d > r.ultSai) r.ultSai = m.d;
          if (m.d >= lim30) r.sai30 += q;
          if (r.contD && m.d > r.contD) r.saiPos += q; else r.saiAte += q;
        } else {
          r.res += q; /* pedido nao despachado = reservado */
        }
      } else if (m.t === 'A') {
        r.aj += q;
        if (r.contD && m.d > r.contD) r.ajPos += q; else r.ajAte += q;
      }
    });
    var out = [];
    for (var id in map) {
      var r = map[id];
      r.teorico = r.ent - r.sai + r.aj;
      r.saldo = (r.cont != null) ? (r.cont + r.entPos - r.saiPos + r.ajPos) : r.teorico;
      r.divg = (r.cont != null) ? (r.cont - (r.entAte - r.saiAte + r.ajAte)) : null;
      r.disp = r.saldo - r.res;
      r.consumo = r.sai30 / 30;
      r.cobertura = r.consumo > 0 ? (r.saldo / r.consumo) : null;
      r.valor = r.saldo * (Number(r.it.custo) || 0);
      r.diasCont = r.contD ? diasEntre(r.contD, today()) : null;
      r.pp = Number(r.it.pp) || 0;
      if (r.saldo <= 0) r.status = 'zerado';
      else if (r.pp > 0 && r.saldo <= r.pp) r.status = 'pedir';
      else if (r.pp > 0 && r.saldo <= r.pp * 1.3) r.status = 'atencao';
      else if (r.pp > 0) r.status = 'ok';
      else r.status = 'sempp';
      r.sugestao = 0;
      if (r.status === 'pedir' || r.status === 'zerado') {
        var lote = Number(r.it.lote) || 0;
        r.sugestao = lote > 0 ? Math.max(lote, r.pp + lote - r.saldo) : Math.max(r.pp - r.saldo, 0);
        if (r.sugestao <= 0 && lote > 0) r.sugestao = lote;
      }
      out.push(r);
    }
    return out;
  }
  function alertasEstoque() {
    return calcEstoque().filter(function (r) {
      return r.it.ativo && (r.status === 'pedir' || r.status === 'zerado');
    });
  }
  function pillStatus(s) {
    if (s === 'zerado') return '<span class="gx-pill pill-bad">Sem estoque</span>';
    if (s === 'pedir') return '<span class="gx-pill pill-bad">Pedir</span>';
    if (s === 'atencao') return '<span class="gx-pill pill-warn">Atenção</span>';
    if (s === 'ok') return '<span class="gx-pill pill-ok">OK</span>';
    return '<span class="gx-pill pill-mut">Sem ponto</span>';
  }

  /* ================= PAGINA: ESTOQUE ATUAL ================= */
  addPage('estoque-atual',
    hdr('Estoque atual', 'Saldo por item = última contagem física + entradas − saídas despachadas',
      '<button class="gx-btn" id="ea-exp">Exportar CSV</button><button class="gx-btn pri" id="ea-lanc">Lançar movimento</button>') +
    '<div class="kpi-grid" id="ea-kpis"></div>' +
    '<div class="gx-filters">' +
    '<div class="gx-f"><label>Buscar item</label><input id="ea-q" placeholder="nome ou código"></div>' +
    '<div class="gx-f"><label>Categoria</label><select id="ea-cat"></select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="ea-emp"><option value="">Todas</option><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>Situação</label><select id="ea-st">' +
    '<option value="">Todas</option><option value="pedir">Abaixo do ponto de pedido</option><option value="zerado">Sem estoque</option>' +
    '<option value="atencao">Em atenção</option><option value="ok">OK</option><option value="divg">Com divergência</option>' +
    '<option value="semcont">Sem contagem recente (7d+)</option></select></div>' +
    '<div class="gx-f"><label>Ordenar por</label><select id="ea-ord">' +
    '<option value="crit">Criticidade</option><option value="nome">Nome</option><option value="valor">Valor em estoque</option>' +
    '<option value="saldo">Saldo</option><option value="cob">Cobertura (dias)</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="ea-clr">Limpar filtros</button></div>' +
    '</div>' +
    '<div class="table-card"><div class="table-header"><h3>Posição de estoque</h3><span id="ea-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-ea"><thead><tr>' +
    '<th>Item</th><th>Cat.</th><th class="right">Últ. contagem</th><th class="right">Entradas</th><th class="right">Saídas</th>' +
    '<th class="right">Saldo</th><th class="right">A despachar</th><th class="right">Disponível</th><th class="right">Divergência</th>' +
    '<th class="right">Ponto</th><th class="right">Cobertura</th><th class="right">R$ estoque</th><th>Situação</th>' +
    '</tr></thead><tbody></tbody></table></div></div>');

  function renderEstoqueAtual() {
    var rows = calcEstoque();
    var q = norm(val('ea-q')), cat = val('ea-cat'), emp = val('ea-emp'), stf = val('ea-st'), ord = val('ea-ord') || 'crit';
    var tot = rows.reduce(function (a, r) { return a + r.valor; }, 0);
    var nPedir = rows.filter(function (r) { return r.status === 'pedir' || r.status === 'zerado'; }).length;
    var nDivg = rows.filter(function (r) { return r.divg != null && Math.abs(r.divg) > 0.001; }).length;
    var nSemC = rows.filter(function (r) { return r.diasCont == null || r.diasCont > 7; }).length;
    el('ea-kpis').innerHTML =
      kpi('Itens cadastrados', num(rows.length), rows.filter(function (r) { return r.it.crit; }).length + ' marcados como críticos', 'v8') +
      kpi('Valor em estoque', brl(tot), 'saldo × custo cadastrado', 'total') +
      kpi('Abaixo do ponto', num(nPedir), 'itens para pedir agora', nPedir ? 'dp' : '') +
      kpi('Com divergência', num(nDivg), 'contagem ≠ saldo teórico') +
      kpi('Sem contagem (7d+)', num(nSemC), 'itens sem contagem recente');

    var f = rows.filter(function (r) {
      if (q && norm(r.it.nome).indexOf(q) < 0 && norm(r.it.cod).indexOf(q) < 0) return false;
      if (cat && r.it.cat !== cat) return false;
      if (emp && r.it.emp !== emp) return false;
      if (stf === 'divg') return r.divg != null && Math.abs(r.divg) > 0.001;
      if (stf === 'semcont') return r.diasCont == null || r.diasCont > 7;
      if (stf && r.status !== stf) return false;
      return true;
    });
    var pri = { zerado: 0, pedir: 1, atencao: 2, ok: 3, sempp: 4 };
    f.sort(function (a, b) {
      if (ord === 'nome') return a.it.nome.localeCompare(b.it.nome);
      if (ord === 'valor') return b.valor - a.valor;
      if (ord === 'saldo') return a.saldo - b.saldo;
      if (ord === 'cob') return (a.cobertura == null ? 1e9 : a.cobertura) - (b.cobertura == null ? 1e9 : b.cobertura);
      return (pri[a.status] - pri[b.status]) || (b.valor - a.valor);
    });
    var tb = document.querySelector('#tb-ea tbody');
    if (!f.length) {
      tb.innerHTML = '<tr><td colspan="13"><div class="gx-empty">Nenhum item para exibir. Cadastre itens em <b>Estoque › Ponto de pedido</b> ou importe um relatório em <b>Lançamentos de estoque</b>.</div></td></tr>';
    } else {
      tb.innerHTML = f.map(function (r) {
        var dv = r.divg;
        return '<tr>' +
          '<td><b>' + esc(r.it.nome) + '</b>' + (r.it.cod ? '<div style="font-size:11px;color:#99807a">' + esc(r.it.cod) + '</div>' : '') + '</td>' +
          '<td>' + esc(r.it.cat || '—') + '</td>' +
          '<td class="right">' + (r.cont == null ? '—' : num(r.cont) + '<div style="font-size:11px;color:#99807a">' + fmtD(r.contD) + '</div>') + '</td>' +
          '<td class="right">' + num(r.ent) + '</td>' +
          '<td class="right">' + num(r.sai) + '</td>' +
          '<td class="right"><b>' + num(r.saldo) + '</b> ' + esc(r.it.un) + '</td>' +
          '<td class="right">' + (r.res ? num(r.res) : '—') + '</td>' +
          '<td class="right">' + num(r.disp) + '</td>' +
          '<td class="right ' + (dv == null ? '' : (dv < 0 ? 'neg' : (dv > 0 ? 'pos' : ''))) + '">' + (dv == null ? '—' : (dv > 0 ? '+' : '') + num(dv)) + '</td>' +
          '<td class="right">' + (r.pp ? num(r.pp) : '—') + '</td>' +
          '<td class="right">' + (r.cobertura == null ? '—' : Math.round(r.cobertura) + 'd') + '</td>' +
          '<td class="right">' + brl(r.valor) + '</td>' +
          '<td>' + pillStatus(r.status) + '</td></tr>';
      }).join('');
    }
    el('ea-cont').textContent = f.length + ' de ' + rows.length + ' itens';
    var sel = el('ea-cat');
    if (sel.dataset.n !== String(S.itens.length)) { sel.innerHTML = optList(cats(), cat, 'Todas'); sel.dataset.n = String(S.itens.length); }
  }
  HOOKS['estoque-atual'] = renderEstoqueAtual;

  /* ================= PAGINA: PONTO DE PEDIDO ================= */
  addPage('ponto-pedido',
    hdr('Ponto de pedido', 'Defina o estoque mínimo de cada item — o painel avisa quando é hora de comprar',
      '<button class="gx-btn" id="pp-imp">Importar itens</button><button class="gx-btn" id="pp-exp">Exportar CSV</button><button class="gx-btn pri" id="pp-novo">+ Novo item</button>') +
    '<div class="kpi-grid" id="pp-kpis"></div>' +
    '<div class="table-card" id="pp-alertas-card"><div class="table-header"><h3>⚠ Alertas de compra</h3><span class="tag warn">Ação</span></div>' +
    '<div class="gx-scroll"><table id="tb-pp-al"><thead><tr><th>Item</th><th>Fornecedor</th><th class="right">Saldo</th><th class="right">Ponto</th>' +
    '<th class="right">Consumo/dia</th><th class="right">Cobertura</th><th class="right">Sugestão de compra</th><th class="right">R$ estimado</th><th>Situação</th></tr></thead><tbody></tbody></table></div></div>' +
    '<div class="gx-form" id="pp-form" style="display:none"><h3 id="pp-form-t">Novo item</h3>' +
    '<input type="hidden" id="pp-id">' +
    '<div class="gx-row">' +
    '<div class="gx-f"><label>Código</label><input id="pp-cod" placeholder="opcional"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Nome do item *</label><input id="pp-nome" placeholder="ex.: PLACA GESSO ST 12,5 1200x1800"></div>' +
    '<div class="gx-f"><label>Categoria</label><input id="pp-cat" list="dl-cats" placeholder="ex.: Placa/Gesso"></div>' +
    '<div class="gx-f"><label>Unidade</label><select id="pp-un">' + optList(UNS, 'UN') + '</select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="pp-emp"><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '</div><div class="gx-row" style="margin-top:12px">' +
    '<div class="gx-f"><label>Fornecedor principal</label><input id="pp-forn" list="dl-forns"></div>' +
    '<div class="gx-f"><label>Custo unitário (R$)</label><input id="pp-custo" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Ponto de pedido</label><input id="pp-pp" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Qtde de reposição (lote)</label><input id="pp-lote" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Prazo entrega (dias)</label><input id="pp-lead" type="number"></div>' +
    '<div class="gx-f"><label>Item crítico</label><select id="pp-crit"><option value="0">Não</option><option value="1">Sim — contagem diária</option></select></div>' +
    '</div><div class="gx-tools" style="margin-top:14px">' +
    '<button class="gx-btn pri" id="pp-salvar">Salvar item</button><button class="gx-btn" id="pp-cancel">Cancelar</button>' +
    '<span class="gx-hint" style="margin:0 0 0 8px">Sugestão: ponto de pedido = consumo médio por dia × prazo de entrega + margem de segurança.</span></div></div>' +
    '<datalist id="dl-cats"></datalist><datalist id="dl-forns"></datalist>' +
    '<div class="gx-filters">' +
    '<div class="gx-f"><label>Buscar</label><input id="pp-q" placeholder="nome ou código"></div>' +
    '<div class="gx-f"><label>Categoria</label><select id="pp-fcat"></select></div>' +
    '<div class="gx-f"><label>Fornecedor</label><select id="pp-fforn"></select></div>' +
    '<div class="gx-f"><label>Mostrar</label><select id="pp-fst"><option value="">Todos os itens</option><option value="crit">Só críticos</option><option value="sempp">Sem ponto definido</option><option value="pedir">Para pedir</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="pp-clr">Limpar filtros</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Cadastro de itens e ponto de pedido</h3><span id="pp-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-pp"><thead><tr><th>Item</th><th>Cat.</th><th>Un.</th><th class="right">Saldo</th>' +
    '<th class="right" style="width:110px">Ponto de pedido</th><th class="right" style="width:110px">Lote</th><th class="right">Custo</th>' +
    '<th class="right">Consumo/dia</th><th>Crítico</th><th>Situação</th><th></th></tr></thead><tbody></tbody></table></div></div>');

  function renderPP() {
    var rows = calcEstoque();
    var idx = {}; rows.forEach(function (r) { idx[r.it.id] = r; });
    var al = rows.filter(function (r) { return r.it.ativo && (r.status === 'pedir' || r.status === 'zerado'); })
      .sort(function (a, b) { return (a.cobertura == null ? 1e9 : a.cobertura) - (b.cobertura == null ? 1e9 : b.cobertura); });
    var custoAl = al.reduce(function (a, r) { return a + r.sugestao * (Number(r.it.custo) || 0); }, 0);
    el('pp-kpis').innerHTML =
      kpi('Itens cadastrados', num(S.itens.length), S.itens.filter(function (i) { return i.pp > 0; }).length + ' com ponto definido', 'v8') +
      kpi('Alertas de compra', num(al.length), 'itens no ou abaixo do ponto', al.length ? 'dp' : '') +
      kpi('Compra sugerida', brl(custoAl), 'para repor os itens em alerta', 'total') +
      kpi('Itens críticos', num(S.itens.filter(function (i) { return i.crit; }).length), 'entram na contagem diária');

    var tba = document.querySelector('#tb-pp-al tbody');
    tba.innerHTML = al.length ? al.map(function (r) {
      return '<tr><td><b>' + esc(r.it.nome) + '</b></td><td>' + esc(r.it.forn || '—') + '</td>' +
        '<td class="right ' + (r.saldo <= 0 ? 'neg' : '') + '">' + num(r.saldo) + '</td>' +
        '<td class="right">' + num(r.pp) + '</td>' +
        '<td class="right">' + (r.consumo ? num(r.consumo, 1) : '—') + '</td>' +
        '<td class="right">' + (r.cobertura == null ? '—' : Math.round(r.cobertura) + 'd') + '</td>' +
        '<td class="right"><b>' + num(r.sugestao) + '</b> ' + esc(r.it.un) + '</td>' +
        '<td class="right">' + brl(r.sugestao * (Number(r.it.custo) || 0)) + '</td>' +
        '<td>' + pillStatus(r.status) + '</td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="gx-empty">Nenhum item abaixo do ponto de pedido. 👍</div></td></tr>';

    var q = norm(val('pp-q')), fc = val('pp-fcat'), ff = val('pp-fforn'), fs = val('pp-fst');
    var lista = S.itens.filter(function (i) {
      if (q && norm(i.nome).indexOf(q) < 0 && norm(i.cod).indexOf(q) < 0) return false;
      if (fc && i.cat !== fc) return false;
      if (ff && i.forn !== ff) return false;
      if (fs === 'crit' && !i.crit) return false;
      if (fs === 'sempp' && Number(i.pp) > 0) return false;
      if (fs === 'pedir') { var r = idx[i.id]; if (!r || (r.status !== 'pedir' && r.status !== 'zerado')) return false; }
      return true;
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });

    var tb = document.querySelector('#tb-pp tbody');
    tb.innerHTML = lista.length ? lista.map(function (i) {
      var r = idx[i.id] || { saldo: 0, consumo: 0, status: 'sempp' };
      return '<tr data-id="' + i.id + '">' +
        '<td><b>' + esc(i.nome) + '</b>' + (i.cod ? '<div style="font-size:11px;color:#99807a">' + esc(i.cod) + '</div>' : '') + '</td>' +
        '<td>' + esc(i.cat || '—') + '</td><td>' + esc(i.un) + '</td>' +
        '<td class="right">' + num(r.saldo) + '</td>' +
        '<td class="right"><input class="pp-in" data-k="pp" type="number" step="0.01" value="' + (i.pp || '') + '" style="width:95px;text-align:right;padding:5px 7px;border:1px solid #d1d0d0;border-radius:6px;font-family:inherit"></td>' +
        '<td class="right"><input class="pp-in" data-k="lote" type="number" step="0.01" value="' + (i.lote || '') + '" style="width:95px;text-align:right;padding:5px 7px;border:1px solid #d1d0d0;border-radius:6px;font-family:inherit"></td>' +
        '<td class="right">' + brl(i.custo) + '</td>' +
        '<td class="right">' + (r.consumo ? num(r.consumo, 1) : '—') + '</td>' +
        '<td>' + (i.crit ? '<span class="gx-pill pill-neu">Crítico</span>' : '—') + '</td>' +
        '<td>' + pillStatus(r.status) + '</td>' +
        '<td style="white-space:nowrap"><button class="gx-btn sm pp-ed">Editar</button> <button class="gx-btn sm dgr pp-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="11"><div class="gx-empty">Nenhum item cadastrado ainda. Clique em <b>+ Novo item</b> ou use <b>Importar itens</b> para subir sua lista.</div></td></tr>';

    on('.pp-in', 'change', function (e) {
      var tr = e.target.closest('tr'), i = itemById(tr.dataset.id);
      if (!i) return;
      i[e.target.dataset.k] = pnum(e.target.value);
      save(); renderPP(); refreshBadges();
    });
    on('.pp-ed', 'click', function (e) { editItem(e.target.closest('tr').dataset.id); });
    on('.pp-del', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id, i = itemById(id);
      if (!i) return;
      var nMov = S.mov.filter(function (m) { return m.it === id; }).length;
      if (!confirm('Excluir "' + i.nome + '"?' + (nMov ? '\n' + nMov + ' movimento(s) deste item também serão removidos.' : ''))) return;
      S.itens = S.itens.filter(function (x) { return x.id !== id; });
      S.mov = S.mov.filter(function (m) { return m.it !== id; });
      save(); renderPP(); refreshBadges();
    });

    el('pp-cont').textContent = lista.length + ' de ' + S.itens.length + ' itens';
    el('dl-cats').innerHTML = cats().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    el('dl-forns').innerHTML = forns().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    el('pp-fcat').innerHTML = optList(cats(), fc, 'Todas');
    el('pp-fforn').innerHTML = optList(forns(), ff, 'Todos');
  }
  HOOKS['ponto-pedido'] = renderPP;

  function editItem(id) {
    var i = id ? itemById(id) : null;
    el('pp-form').style.display = '';
    el('pp-form-t').textContent = i ? 'Editar item' : 'Novo item';
    el('pp-id').value = i ? i.id : '';
    el('pp-cod').value = i ? i.cod : '';
    el('pp-nome').value = i ? i.nome : '';
    el('pp-cat').value = i ? i.cat : '';
    el('pp-un').value = i ? i.un : 'UN';
    el('pp-emp').value = i ? (i.emp || 'V8') : 'V8';
    el('pp-forn').value = i ? i.forn : '';
    el('pp-custo').value = i ? (i.custo || '') : '';
    el('pp-pp').value = i ? (i.pp || '') : '';
    el('pp-lote').value = i ? (i.lote || '') : '';
    el('pp-lead').value = i ? (i.lead || '') : '';
    el('pp-crit').value = i && i.crit ? '1' : '0';
    el('pp-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ================= PAGINA: LANCAMENTOS DE ESTOQUE ================= */
  addPage('mov-estoque',
    hdr('Lançamentos de estoque', 'Entradas (compras), saídas (vendas), contagens e ajustes — a base do estoque atual',
      '<button class="gx-btn" id="mv-exp">Exportar CSV</button>') +
    '<div class="gx-tabs">' +
    '<div class="gx-tab on" data-pane="mv-e">Entradas (compras)</div>' +
    '<div class="gx-tab" data-pane="mv-s">Saídas (vendas)</div>' +
    '<div class="gx-tab" data-pane="mv-c">Contagem diária</div>' +
    '<div class="gx-tab" data-pane="mv-a">Ajustes</div>' +
    '</div>' +
    /* ENTRADAS */
    '<div class="gx-pane on" id="pane-mv-e">' +
    '<div class="gx-form"><h3>Nova entrada</h3><div class="gx-row">' +
    '<div class="gx-f"><label>Data</label><input id="me-d" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Item *</label><input id="me-it" list="dl-itens" placeholder="digite o nome do item"></div>' +
    '<div class="gx-f"><label>Qtde *</label><input id="me-q" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Custo unit. (R$)</label><input id="me-vu" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Fornecedor</label><input id="me-forn" list="dl-forns2"></div>' +
    '<div class="gx-f"><label>Documento</label><input id="me-doc" placeholder="NF 1234 ou SEM NF"></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="me-add">Lançar entrada</button></div>' +
    '</div><div class="gx-hint">Compras sem nota: escreva <b>SEM NF</b> no documento. Se a compra foi a prazo, lance também o boleto em <b>Financeiro › Pagamentos &amp; boletos</b>.</div>' +
    '<div class="gx-tools" style="margin-top:12px"><button class="gx-btn" id="me-imp">Importar relatório de compras (planilha)</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Entradas lançadas</h3><span id="me-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-me"><thead><tr><th>Data</th><th>Item</th><th class="right">Qtde</th><th class="right">Custo un.</th><th class="right">Total</th><th>Fornecedor</th><th>Doc.</th><th></th></tr></thead><tbody></tbody></table></div></div></div>' +
    /* SAIDAS */
    '<div class="gx-pane" id="pane-mv-s">' +
    '<div class="gx-form"><h3>Nova saída</h3><div class="gx-row">' +
    '<div class="gx-f"><label>Data</label><input id="ms-d" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Item *</label><input id="ms-it" list="dl-itens" placeholder="digite o nome do item"></div>' +
    '<div class="gx-f"><label>Qtde *</label><input id="ms-q" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Pedido</label><input id="ms-ped"></div>' +
    '<div class="gx-f"><label>Destino</label><select id="ms-dest"><option value="Cliente">Cliente</option><option value="Estoque Drywall Paris">Estoque Drywall Paris</option><option value="Uso interno">Uso interno</option></select></div>' +
    '<div class="gx-f"><label>Despachado?</label><select id="ms-desp"><option value="1">Sim — já saiu</option><option value="0">Não — a despachar</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="ms-add">Lançar saída</button></div>' +
    '</div><div class="gx-hint">Só as saídas <b>despachadas</b> baixam o estoque. As não despachadas aparecem como <b>“A despachar”</b> e reduzem o disponível.</div>' +
    '<div class="gx-tools" style="margin-top:12px"><button class="gx-btn" id="ms-imp">Importar relatório de vendas (planilha)</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Saídas lançadas</h3><span id="ms-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-ms"><thead><tr><th>Data</th><th>Item</th><th class="right">Qtde</th><th>Pedido</th><th>Destino</th><th>Situação</th><th></th></tr></thead><tbody></tbody></table></div></div></div>' +
    /* CONTAGEM */
    '<div class="gx-pane" id="pane-mv-c">' +
    '<div class="gx-form"><h3>Contagem diária</h3><div class="gx-row">' +
    '<div class="gx-f"><label>Data</label><input id="mc-d" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Item *</label><input id="mc-it" list="dl-itens"></div>' +
    '<div class="gx-f"><label>Qtde contada *</label><input id="mc-q" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Responsável</label><input id="mc-quem"></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="mc-add">Lançar contagem</button></div>' +
    '</div><div class="gx-tools" style="margin-top:12px"><button class="gx-btn" id="mc-imp">Importar contagem (planilha)</button>' +
    '<button class="gx-btn" id="mc-crit">Contagem rápida dos itens críticos</button></div></div>' +
    '<div id="mc-rapida"></div>' +
    '<div class="table-card"><div class="table-header"><h3>Contagens registradas</h3><span id="mc-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-mc"><thead><tr><th>Data</th><th>Item</th><th class="right">Contado</th><th class="right">Saldo teórico</th><th class="right">Divergência</th><th>Responsável</th><th></th></tr></thead><tbody></tbody></table></div></div></div>' +
    /* AJUSTES */
    '<div class="gx-pane" id="pane-mv-a">' +
    '<div class="gx-form"><h3>Ajuste de estoque</h3><div class="gx-row">' +
    '<div class="gx-f"><label>Data</label><input id="ma-d" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Item *</label><input id="ma-it" list="dl-itens"></div>' +
    '<div class="gx-f"><label>Qtde (+ entra / − sai) *</label><input id="ma-q" type="number" step="0.01"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Motivo</label><input id="ma-obs" placeholder="perda, avaria, devolução, correção..."></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="ma-add">Lançar ajuste</button></div>' +
    '</div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Ajustes</h3></div>' +
    '<div class="gx-scroll"><table id="tb-ma"><thead><tr><th>Data</th><th>Item</th><th class="right">Qtde</th><th>Motivo</th><th></th></tr></thead><tbody></tbody></table></div></div></div>' +
    '<datalist id="dl-itens"></datalist><datalist id="dl-forns2"></datalist>');

  function movLinha(m) { return m; }
  function renderMov() {
    el('dl-itens').innerHTML = S.itens.map(function (i) { return '<option value="' + esc(i.nome) + '">'; }).join('');
    el('dl-forns2').innerHTML = forns().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    var byDate = function (a, b) { return (b.d || '').localeCompare(a.d || '') || (b.id > a.id ? 1 : -1); };

    var ent = S.mov.filter(function (m) { return m.t === 'E'; }).sort(byDate).slice(0, 400);
    document.querySelector('#tb-me tbody').innerHTML = ent.length ? ent.map(function (m) {
      var i = itemById(m.it) || { nome: '?', un: '' };
      return '<tr data-id="' + m.id + '"><td>' + fmtD(m.d) + '</td><td>' + esc(i.nome) + '</td>' +
        '<td class="right">' + num(m.q) + ' ' + esc(i.un) + '</td><td class="right">' + brl(m.vu) + '</td>' +
        '<td class="right">' + brl((Number(m.q) || 0) * (Number(m.vu) || 0)) + '</td><td>' + esc(m.forn || '—') + '</td>' +
        '<td>' + esc(m.doc || '—') + '</td><td><button class="gx-btn sm dgr mv-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="gx-empty">Nenhuma entrada lançada.</div></td></tr>';
    el('me-cont').textContent = S.mov.filter(function (m) { return m.t === 'E'; }).length + ' entradas';

    var sai = S.mov.filter(function (m) { return m.t === 'S'; }).sort(byDate).slice(0, 400);
    document.querySelector('#tb-ms tbody').innerHTML = sai.length ? sai.map(function (m) {
      var i = itemById(m.it) || { nome: '?', un: '' };
      return '<tr data-id="' + m.id + '"><td>' + fmtD(m.d) + '</td><td>' + esc(i.nome) + '</td>' +
        '<td class="right">' + num(m.q) + ' ' + esc(i.un) + '</td><td>' + esc(m.ped || '—') + '</td>' +
        '<td>' + esc(m.dest || '—') + '</td>' +
        '<td>' + (m.desp ? '<span class="gx-pill pill-ok">Despachado</span>' : '<span class="gx-pill pill-warn">A despachar</span>') + '</td>' +
        '<td style="white-space:nowrap">' + (m.desp ? '' : '<button class="gx-btn sm mv-desp">Despachar</button> ') + '<button class="gx-btn sm dgr mv-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="gx-empty">Nenhuma saída lançada.</div></td></tr>';
    el('ms-cont').textContent = S.mov.filter(function (m) { return m.t === 'S'; }).length + ' saídas';

    var rows = calcEstoque(), idx = {};
    rows.forEach(function (r) { idx[r.it.id] = r; });
    var cts = S.mov.filter(function (m) { return m.t === 'C'; }).sort(byDate).slice(0, 400);
    document.querySelector('#tb-mc tbody').innerHTML = cts.length ? cts.map(function (m) {
      var i = itemById(m.it) || { nome: '?', un: '' }, r = idx[m.it];
      var teo = r ? (r.entAte - r.saiAte + r.ajAte) : 0;
      var dv = (r && r.contD === m.d) ? r.divg : null;
      return '<tr data-id="' + m.id + '"><td>' + fmtD(m.d) + '</td><td>' + esc(i.nome) + '</td>' +
        '<td class="right"><b>' + num(m.q) + '</b></td>' +
        '<td class="right">' + (dv == null ? '—' : num(teo)) + '</td>' +
        '<td class="right ' + (dv == null ? '' : (dv < 0 ? 'neg' : (dv > 0 ? 'pos' : ''))) + '">' + (dv == null ? '—' : (dv > 0 ? '+' : '') + num(dv)) + '</td>' +
        '<td>' + esc(m.quem || '—') + '</td><td><button class="gx-btn sm dgr mv-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="gx-empty">Nenhuma contagem registrada.</div></td></tr>';
    el('mc-cont').textContent = S.mov.filter(function (m) { return m.t === 'C'; }).length + ' contagens';

    var ajs = S.mov.filter(function (m) { return m.t === 'A'; }).sort(byDate).slice(0, 200);
    document.querySelector('#tb-ma tbody').innerHTML = ajs.length ? ajs.map(function (m) {
      var i = itemById(m.it) || { nome: '?' };
      return '<tr data-id="' + m.id + '"><td>' + fmtD(m.d) + '</td><td>' + esc(i.nome) + '</td>' +
        '<td class="right ' + (m.q < 0 ? 'neg' : 'pos') + '">' + (m.q > 0 ? '+' : '') + num(m.q) + '</td>' +
        '<td>' + esc(m.obs || '—') + '</td><td><button class="gx-btn sm dgr mv-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="gx-empty">Nenhum ajuste.</div></td></tr>';

    on('.mv-del', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      if (!confirm('Excluir este lançamento?')) return;
      S.mov = S.mov.filter(function (m) { return m.id !== id; });
      save(); renderMov(); refreshBadges();
    });
    on('.mv-desp', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.mov.forEach(function (m) { if (m.id === id) { m.desp = 1; m.d = m.d || today(); } });
      save(); renderMov(); refreshBadges();
    });
  }
  HOOKS['mov-estoque'] = renderMov;

  function addMov(o) {
    o.id = uid('m');
    S.mov.push(o);
  }

  /* ================= FINANCEIRO — modelos ================= */
  var SUBCATS = ['Fornecedor/Mercadoria', 'Aluguel', 'Energia', 'Água', 'Internet/Telefone', 'Folha/Pró-labore',
    'Impostos', 'Combustível/Frete', 'Manutenção', 'Marketing', 'Software/Sistema', 'Copa/Limpeza', 'Contabilidade', 'Outros'];
  var FORMAS = ['Boleto', 'PIX', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Débito automático', 'Cheque'];
  var MEIOS = ['PIX', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Cheque', 'Prazo 30 dias', 'Prazo 30/60', 'Transferência'];
  var MEIOS_VISTA = ['PIX', 'Dinheiro', 'Cartão de débito'];

  function apStatus(c) {
    if (c.st === 'pago') return { k: 'pago', h: '<span class="gx-pill pill-ok">Pago</span>' };
    var d = diasEntre(c.venc, today());
    if (d > 0) return { k: 'vencido', h: '<span class="gx-pill pill-bad">Vencida ' + d + 'd</span>' };
    if (d === 0) return { k: 'hoje', h: '<span class="gx-pill pill-warn">Vence hoje</span>' };
    if (d >= -7) return { k: 'prox', h: '<span class="gx-pill pill-warn">Em ' + (-d) + 'd</span>' };
    return { k: 'aberto', h: '<span class="gx-pill pill-neu">Em aberto</span>' };
  }
  function arStatus(c) {
    if (c.st === 'recebido') return { k: 'recebido', h: '<span class="gx-pill pill-ok">Recebido</span>' };
    var d = diasEntre(c.venc, today());
    if (d > 0) return { k: 'vencido', h: '<span class="gx-pill pill-bad">Atrasado ' + d + 'd</span>' };
    if (d === 0) return { k: 'hoje', h: '<span class="gx-pill pill-warn">Vence hoje</span>' };
    if (d >= -7) return { k: 'prox', h: '<span class="gx-pill pill-warn">Em ' + (-d) + 'd</span>' };
    return { k: 'aberto', h: '<span class="gx-pill pill-neu">A receber</span>' };
  }
  function mesesDisponiveis(arr, campo) {
    var s = {};
    arr.forEach(function (c) { if (c[campo]) s[c[campo].slice(0, 7)] = 1; });
    s[mesAtual()] = 1;
    return Object.keys(s).sort().reverse();
  }
  function mesNome(m) {
    var N = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    var p = m.split('-');
    return N[+p[1] - 1] + '/' + p[0];
  }

  /* ================= PAGINA: CONTAS A PAGAR ================= */
  addPage('contas-pagar',
    hdr('Contas a pagar', 'Custos fixos e variáveis, boletos de fornecedores e despesas do dia a dia',
      '<button class="gx-btn" id="ap-imp">Importar planilha</button><button class="gx-btn" id="ap-exp">Exportar CSV</button><button class="gx-btn pri" id="ap-nova">+ Nova conta</button>') +
    '<div class="kpi-grid" id="ap-kpis"></div>' +
    '<div class="gx-form" id="ap-form" style="display:none"><h3 id="ap-form-t">Nova conta a pagar</h3><input type="hidden" id="ap-id">' +
    '<div class="gx-row">' +
    '<div class="gx-f"><label>Vencimento *</label><input id="ap-venc" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Fornecedor / descrição *</label><input id="ap-desc" placeholder="ex.: Plack Atacadista NF 1234 / Enel / Internet"></div>' +
    '<div class="gx-f"><label>Valor (R$) *</label><input id="ap-valor" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Tipo de custo</label><select id="ap-cat"><option>Variável</option><option>Fixo</option></select></div>' +
    '<div class="gx-f"><label>Categoria</label><select id="ap-sub">' + optList(SUBCATS, 'Fornecedor/Mercadoria') + '</select></div>' +
    '<div class="gx-f"><label>Forma de pagamento</label><select id="ap-forma">' + optList(FORMAS, 'Boleto') + '</select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="ap-emp"><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>Documento / NF</label><input id="ap-doc"></div>' +
    '<div class="gx-f"><label>Situação</label><select id="ap-st"><option value="aberto">Em aberto</option><option value="pago">Já pago</option></select></div>' +
    '<div class="gx-f"><label>Pago em</label><input id="ap-pgem" type="date"></div>' +
    '</div><div class="gx-tools" style="margin-top:14px"><button class="gx-btn pri" id="ap-salvar">Salvar</button><button class="gx-btn" id="ap-cancel">Cancelar</button></div></div>' +
    '<div class="grid-2" style="margin-bottom:22px"><div class="chart-card"><h3>Fixo × Variável — últimos 6 meses</h3><div class="chart-wrapper" style="height:260px"><canvas id="ch-ap-fv"></canvas></div></div>' +
    '<div class="chart-card"><h3>Por categoria — mês selecionado</h3><div class="chart-wrapper" style="height:260px"><canvas id="ch-ap-cat"></canvas></div></div></div>' +
    '<div class="gx-filters">' +
    '<div class="gx-f"><label>Mês (vencimento)</label><select id="ap-fmes"></select></div>' +
    '<div class="gx-f"><label>Situação</label><select id="ap-fst"><option value="">Todas</option><option value="aberto">Em aberto</option><option value="vencido">Vencidas</option><option value="7">Vencendo em 7 dias</option><option value="pago">Pagas</option></select></div>' +
    '<div class="gx-f"><label>Tipo</label><select id="ap-fcat"><option value="">Todos</option><option>Fixo</option><option>Variável</option></select></div>' +
    '<div class="gx-f"><label>Categoria</label><select id="ap-fsub"></select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="ap-femp"><option value="">Todas</option><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>Buscar</label><input id="ap-q" placeholder="fornecedor, NF..."></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="ap-clr">Limpar</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Contas</h3><span id="ap-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-ap"><thead><tr><th>Vencimento</th><th>Fornecedor / descrição</th><th>Tipo</th><th>Categoria</th>' +
    '<th>Forma</th><th>Emp.</th><th class="right">Valor</th><th>Situação</th><th>Pago em</th><th></th></tr></thead><tbody></tbody></table></div></div>');

  var CH = {};
  function chart(id, cfg) {
    if (typeof Chart === 'undefined') return;
    var c = el(id); if (!c) return;
    if (CH[id]) { try { CH[id].destroy(); } catch (e) { } }
    CH[id] = new Chart(c.getContext('2d'), cfg);
  }

  function apFiltradas() {
    var mes = val('ap-fmes'), st = val('ap-fst'), cat = val('ap-fcat'), sub = val('ap-fsub'),
      emp = val('ap-femp'), q = norm(val('ap-q'));
    return S.ap.filter(function (c) {
      if (mes && (c.venc || '').slice(0, 7) !== mes) return false;
      if (cat && c.cat !== cat) return false;
      if (sub && c.sub !== sub) return false;
      if (emp && c.emp !== emp) return false;
      if (q && norm(c.desc + ' ' + (c.doc || '')).indexOf(q) < 0) return false;
      if (st) {
        var k = apStatus(c).k;
        if (st === 'aberto' && c.st === 'pago') return false;
        if (st === 'pago' && c.st !== 'pago') return false;
        if (st === 'vencido' && k !== 'vencido') return false;
        if (st === '7' && !(k === 'prox' || k === 'hoje')) return false;
      }
      return true;
    }).sort(function (a, b) { return (a.venc || '').localeCompare(b.venc || ''); });
  }

  function renderAP() {
    var meses = mesesDisponiveis(S.ap, 'venc');
    var selMes = el('ap-fmes');
    if (!selMes.dataset.init || selMes.dataset.n !== String(S.ap.length)) {
      var cur = selMes.value || mesAtual();
      selMes.innerHTML = '<option value="">Todos os meses</option>' + meses.map(function (m) {
        return '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + mesNome(m) + '</option>';
      }).join('');
      selMes.dataset.init = '1'; selMes.dataset.n = String(S.ap.length);
    }
    if (!el('ap-fsub').dataset.init) { el('ap-fsub').innerHTML = optList(SUBCATS, '', 'Todas'); el('ap-fsub').dataset.init = '1'; }

    var abertas = S.ap.filter(function (c) { return c.st !== 'pago'; });
    var venc = abertas.filter(function (c) { return apStatus(c).k === 'vencido'; });
    var prox = abertas.filter(function (c) { var k = apStatus(c).k; return k === 'prox' || k === 'hoje'; });
    var m = val('ap-fmes') || mesAtual();
    var doMes = S.ap.filter(function (c) { return (c.venc || '').slice(0, 7) === m; });
    var pagoMes = S.ap.filter(function (c) { return c.st === 'pago' && (c.pgEm || c.venc || '').slice(0, 7) === m; });
    var sum = function (a) { return a.reduce(function (x, c) { return x + (Number(c.valor) || 0); }, 0); };
    el('ap-kpis').innerHTML =
      kpi('Em aberto', brl(sum(abertas)), abertas.length + ' contas', 'v8') +
      kpi('Vencidas', brl(sum(venc)), venc.length + ' contas', venc.length ? 'dp' : '') +
      kpi('Vence em 7 dias', brl(sum(prox)), prox.length + ' contas') +
      kpi('Pago em ' + mesNome(m), brl(sum(pagoMes)), pagoMes.length + ' pagamentos', 'total') +
      kpi('Custo fixo ' + mesNome(m), brl(sum(doMes.filter(function (c) { return c.cat === 'Fixo'; }))), 'previsto no mês') +
      kpi('Custo variável ' + mesNome(m), brl(sum(doMes.filter(function (c) { return c.cat !== 'Fixo'; }))), 'previsto no mês');

    /* graficos */
    var ms = [];
    for (var i = 5; i >= 0; i--) { ms.push(addMeses(today().slice(0, 7) + '-01', -i).slice(0, 7)); }
    var fx = ms.map(function (mm) { return sum(S.ap.filter(function (c) { return (c.venc || '').slice(0, 7) === mm && c.cat === 'Fixo'; })); });
    var vr = ms.map(function (mm) { return sum(S.ap.filter(function (c) { return (c.venc || '').slice(0, 7) === mm && c.cat !== 'Fixo'; })); });
    chart('ch-ap-fv', {
      type: 'bar',
      data: {
        labels: ms.map(mesNome), datasets: [
          { label: 'Fixo', data: fx, backgroundColor: '#364b81' },
          { label: 'Variável', data: vr, backgroundColor: '#99807a' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: function (v) { return 'R$ ' + (v / 1000).toFixed(0) + 'k'; } } } }
      }
    });
    var porSub = {};
    doMes.forEach(function (c) { porSub[c.sub || 'Outros'] = (porSub[c.sub || 'Outros'] || 0) + (Number(c.valor) || 0); });
    var ks = Object.keys(porSub).sort(function (a, b) { return porSub[b] - porSub[a]; }).slice(0, 8);
    chart('ch-ap-cat', {
      type: 'doughnut',
      data: {
        labels: ks.length ? ks : ['Sem lançamentos'],
        datasets: [{
          data: ks.length ? ks.map(function (k) { return porSub[k]; }) : [1],
          backgroundColor: ['#364b81', '#503f3d', '#27663a', '#c89b1e', '#b22222', '#99807a', '#8fa1c9', '#d1d0d0']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    var f = apFiltradas();
    var tb = document.querySelector('#tb-ap tbody');
    tb.innerHTML = f.length ? f.map(function (c) {
      var s = apStatus(c);
      return '<tr data-id="' + c.id + '"><td>' + fmtD(c.venc) + '</td>' +
        '<td><b>' + esc(c.desc) + '</b>' + (c.doc ? '<div style="font-size:11px;color:#99807a">' + esc(c.doc) + '</div>' : '') +
        (c.parc ? '<span class="gx-pill pill-mut" style="margin-left:6px">' + esc(c.parc) + '</span>' : '') + '</td>' +
        '<td>' + esc(c.cat || '—') + '</td><td>' + esc(c.sub || '—') + '</td><td>' + esc(c.forma || '—') + '</td>' +
        '<td>' + (c.emp === 'DRYWALL PARIS' ? '<span class="tag dp">DP</span>' : '<span class="tag v8">V8</span>') + '</td>' +
        '<td class="right"><b>' + brl(c.valor) + '</b></td><td>' + s.h + '</td><td>' + (c.pgEm ? fmtD(c.pgEm) : '—') + '</td>' +
        '<td style="white-space:nowrap">' + (c.st === 'pago' ? '<button class="gx-btn sm ap-desf">Reabrir</button>' : '<button class="gx-btn sm ap-pg">Pagar</button>') +
        ' <button class="gx-btn sm ap-ed">Editar</button> <button class="gx-btn sm dgr ap-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="10"><div class="gx-empty">Nenhuma conta com esses filtros. Use <b>+ Nova conta</b> ou <b>Importar planilha</b> com as contas pagas do dia.</div></td></tr>';
    el('ap-cont').textContent = f.length + ' contas • ' + brl(f.reduce(function (a, c) { return a + (Number(c.valor) || 0); }, 0));

    on('.ap-pg', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ap.forEach(function (c) { if (c.id === id) { c.st = 'pago'; c.pgEm = today(); } });
      save(); renderAP(); refreshBadges();
    });
    on('.ap-desf', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ap.forEach(function (c) { if (c.id === id) { c.st = 'aberto'; c.pgEm = ''; } });
      save(); renderAP(); refreshBadges();
    });
    on('.ap-ed', 'click', function (e) { editAP(e.target.closest('tr').dataset.id); });
    on('.ap-del', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      if (!confirm('Excluir esta conta?')) return;
      S.ap = S.ap.filter(function (c) { return c.id !== id; });
      save(); renderAP(); refreshBadges();
    });
  }
  HOOKS['contas-pagar'] = renderAP;

  function editAP(id) {
    var c = id ? S.ap.filter(function (x) { return x.id === id; })[0] : null;
    el('ap-form').style.display = '';
    el('ap-form-t').textContent = c ? 'Editar conta' : 'Nova conta a pagar';
    el('ap-id').value = c ? c.id : '';
    el('ap-venc').value = c ? c.venc : today();
    el('ap-desc').value = c ? c.desc : '';
    el('ap-valor').value = c ? c.valor : '';
    el('ap-cat').value = c ? (c.cat || 'Variável') : 'Variável';
    el('ap-sub').value = c ? (c.sub || 'Fornecedor/Mercadoria') : 'Fornecedor/Mercadoria';
    el('ap-forma').value = c ? (c.forma || 'Boleto') : 'Boleto';
    el('ap-emp').value = c ? (c.emp || 'V8') : 'V8';
    el('ap-doc').value = c ? (c.doc || '') : '';
    el('ap-st').value = c ? (c.st || 'aberto') : 'aberto';
    el('ap-pgem').value = c ? (c.pgEm || '') : '';
    el('ap-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ================= PAGINA: CONTAS A RECEBER ================= */
  addPage('contas-receber',
    hdr('Contas a receber', 'Recebimentos por cliente e por meio de pagamento (à vista e a prazo)',
      '<button class="gx-btn" id="ar-imp">Importar planilha</button><button class="gx-btn" id="ar-exp">Exportar CSV</button><button class="gx-btn pri" id="ar-nova">+ Novo recebimento</button>') +
    '<div class="kpi-grid" id="ar-kpis"></div>' +
    '<div class="gx-form" id="ar-form" style="display:none"><h3 id="ar-form-t">Novo recebimento</h3><input type="hidden" id="ar-id">' +
    '<div class="gx-row">' +
    '<div class="gx-f"><label>Vencimento *</label><input id="ar-venc" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Cliente *</label><input id="ar-cli"></div>' +
    '<div class="gx-f"><label>Pedido / NF</label><input id="ar-ped"></div>' +
    '<div class="gx-f"><label>Valor (R$) *</label><input id="ar-valor" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Meio de pagamento</label><select id="ar-meio">' + optList(MEIOS, 'PIX') + '</select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="ar-emp"><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>Vendedor</label><input id="ar-vend"></div>' +
    '<div class="gx-f"><label>Situação</label><select id="ar-st"><option value="aberto">A receber</option><option value="recebido">Recebido</option></select></div>' +
    '<div class="gx-f"><label>Recebido em</label><input id="ar-rcem" type="date"></div>' +
    '</div><div class="gx-tools" style="margin-top:14px"><button class="gx-btn pri" id="ar-salvar">Salvar</button><button class="gx-btn" id="ar-cancel">Cancelar</button>' +
    '<span class="gx-hint" style="margin:0 0 0 8px">Vendas à vista (PIX, dinheiro, débito) podem ser lançadas direto como <b>Recebido</b>.</span></div></div>' +
    '<div class="grid-2" style="margin-bottom:22px"><div class="chart-card"><h3>Em aberto por meio de pagamento</h3><div class="chart-wrapper" style="height:260px"><canvas id="ch-ar-meio"></canvas></div></div>' +
    '<div class="chart-card"><h3>Aging — quanto está atrasado</h3><div class="chart-wrapper" style="height:260px"><canvas id="ch-ar-age"></canvas></div></div></div>' +
    '<div class="gx-filters">' +
    '<div class="gx-f"><label>Mês (vencimento)</label><select id="ar-fmes"></select></div>' +
    '<div class="gx-f"><label>Situação</label><select id="ar-fst"><option value="">Todas</option><option value="aberto">A receber</option><option value="vencido">Atrasadas</option><option value="recebido">Recebidas</option></select></div>' +
    '<div class="gx-f"><label>Meio de pagamento</label><select id="ar-fmeio"></select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="ar-femp"><option value="">Todas</option><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>Buscar</label><input id="ar-q" placeholder="cliente, pedido..."></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="ar-clr">Limpar</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Recebimentos</h3><span id="ar-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-ar"><thead><tr><th>Vencimento</th><th>Cliente</th><th>Pedido</th><th>Meio</th><th>Emp.</th>' +
    '<th>Vendedor</th><th class="right">Valor</th><th>Situação</th><th>Recebido em</th><th></th></tr></thead><tbody></tbody></table></div></div>');

  function renderAR() {
    var meses = mesesDisponiveis(S.ar, 'venc'), selMes = el('ar-fmes');
    if (!selMes.dataset.init || selMes.dataset.n !== String(S.ar.length)) {
      var cur = selMes.value || '';
      selMes.innerHTML = '<option value="">Todos os meses</option>' + meses.map(function (m) {
        return '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + mesNome(m) + '</option>';
      }).join('');
      selMes.dataset.init = '1'; selMes.dataset.n = String(S.ar.length);
    }
    if (!el('ar-fmeio').dataset.init) { el('ar-fmeio').innerHTML = optList(MEIOS, '', 'Todos'); el('ar-fmeio').dataset.init = '1'; }

    var sum = function (a) { return a.reduce(function (x, c) { return x + (Number(c.valor) || 0); }, 0); };
    var abertas = S.ar.filter(function (c) { return c.st !== 'recebido'; });
    var atr = abertas.filter(function (c) { return arStatus(c).k === 'vencido'; });
    var prox = abertas.filter(function (c) { var k = arStatus(c).k; return k === 'prox' || k === 'hoje'; });
    var m = mesAtual();
    var recMes = S.ar.filter(function (c) { return c.st === 'recebido' && (c.rcEm || c.venc || '').slice(0, 7) === m; });
    el('ar-kpis').innerHTML =
      kpi('A receber', brl(sum(abertas)), abertas.length + ' títulos', 'v8') +
      kpi('Atrasado', brl(sum(atr)), atr.length + ' títulos', atr.length ? 'dp' : '') +
      kpi('Vence em 7 dias', brl(sum(prox)), prox.length + ' títulos') +
      kpi('Recebido em ' + mesNome(m), brl(sum(recMes)), recMes.length + ' recebimentos', 'total');

    var porMeio = {};
    abertas.forEach(function (c) { porMeio[c.meio || 'Não informado'] = (porMeio[c.meio || 'Não informado'] || 0) + (Number(c.valor) || 0); });
    var ks = Object.keys(porMeio).sort(function (a, b) { return porMeio[b] - porMeio[a]; });
    chart('ch-ar-meio', {
      type: 'doughnut',
      data: {
        labels: ks.length ? ks : ['Sem títulos em aberto'],
        datasets: [{
          data: ks.length ? ks.map(function (k) { return porMeio[k]; }) : [1],
          backgroundColor: ['#364b81', '#27663a', '#c89b1e', '#503f3d', '#b22222', '#99807a', '#8fa1c9', '#d1d0d0', '#6b8f7a']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });
    var buckets = [0, 0, 0, 0, 0], lbl = ['A vencer', '1-15 dias', '16-30 dias', '31-60 dias', '60+ dias'];
    abertas.forEach(function (c) {
      var d = diasEntre(c.venc, today()), v = Number(c.valor) || 0;
      if (d <= 0) buckets[0] += v; else if (d <= 15) buckets[1] += v; else if (d <= 30) buckets[2] += v;
      else if (d <= 60) buckets[3] += v; else buckets[4] += v;
    });
    chart('ch-ar-age', {
      type: 'bar',
      data: { labels: lbl, datasets: [{ label: 'R$', data: buckets, backgroundColor: ['#364b81', '#c89b1e', '#d08b2c', '#b25a22', '#b22222'] }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: function (v) { return 'R$ ' + (v / 1000).toFixed(0) + 'k'; } } } }
      }
    });

    var fm = val('ar-fmes'), fst = val('ar-fst'), fme = val('ar-fmeio'), fe = val('ar-femp'), q = norm(val('ar-q'));
    var f = S.ar.filter(function (c) {
      if (fm && (c.venc || '').slice(0, 7) !== fm) return false;
      if (fme && c.meio !== fme) return false;
      if (fe && c.emp !== fe) return false;
      if (q && norm((c.cli || '') + ' ' + (c.ped || '')).indexOf(q) < 0) return false;
      if (fst) {
        var k = arStatus(c).k;
        if (fst === 'aberto' && c.st === 'recebido') return false;
        if (fst === 'recebido' && c.st !== 'recebido') return false;
        if (fst === 'vencido' && k !== 'vencido') return false;
      }
      return true;
    }).sort(function (a, b) { return (a.venc || '').localeCompare(b.venc || ''); });

    document.querySelector('#tb-ar tbody').innerHTML = f.length ? f.map(function (c) {
      var s = arStatus(c);
      return '<tr data-id="' + c.id + '"><td>' + fmtD(c.venc) + '</td><td><b>' + esc(c.cli) + '</b></td><td>' + esc(c.ped || '—') + '</td>' +
        '<td>' + esc(c.meio || '—') + '</td>' +
        '<td>' + (c.emp === 'DRYWALL PARIS' ? '<span class="tag dp">DP</span>' : '<span class="tag v8">V8</span>') + '</td>' +
        '<td>' + esc(c.vend || '—') + '</td><td class="right"><b>' + brl(c.valor) + '</b></td><td>' + s.h + '</td>' +
        '<td>' + (c.rcEm ? fmtD(c.rcEm) : '—') + '</td>' +
        '<td style="white-space:nowrap">' + (c.st === 'recebido' ? '<button class="gx-btn sm ar-desf">Reabrir</button>' : '<button class="gx-btn sm ar-rc">Receber</button>') +
        ' <button class="gx-btn sm ar-ed">Editar</button> <button class="gx-btn sm dgr ar-del">Excluir</button></td></tr>';
    }).join('') : '<tr><td colspan="10"><div class="gx-empty">Nenhum recebimento com esses filtros. Use <b>+ Novo recebimento</b> ou importe o relatório de vendas com o meio de pagamento.</div></td></tr>';
    el('ar-cont').textContent = f.length + ' títulos • ' + brl(f.reduce(function (a, c) { return a + (Number(c.valor) || 0); }, 0));

    on('.ar-rc', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ar.forEach(function (c) { if (c.id === id) { c.st = 'recebido'; c.rcEm = today(); } });
      save(); renderAR(); refreshBadges();
    });
    on('.ar-desf', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ar.forEach(function (c) { if (c.id === id) { c.st = 'aberto'; c.rcEm = ''; } });
      save(); renderAR(); refreshBadges();
    });
    on('.ar-ed', 'click', function (e) { editAR(e.target.closest('tr').dataset.id); });
    on('.ar-del', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      if (!confirm('Excluir este título?')) return;
      S.ar = S.ar.filter(function (c) { return c.id !== id; });
      save(); renderAR(); refreshBadges();
    });
  }
  HOOKS['contas-receber'] = renderAR;

  function editAR(id) {
    var c = id ? S.ar.filter(function (x) { return x.id === id; })[0] : null;
    el('ar-form').style.display = '';
    el('ar-form-t').textContent = c ? 'Editar recebimento' : 'Novo recebimento';
    el('ar-id').value = c ? c.id : '';
    el('ar-venc').value = c ? c.venc : today();
    el('ar-cli').value = c ? c.cli : '';
    el('ar-ped').value = c ? (c.ped || '') : '';
    el('ar-valor').value = c ? c.valor : '';
    el('ar-meio').value = c ? (c.meio || 'PIX') : 'PIX';
    el('ar-emp').value = c ? (c.emp || 'V8') : 'V8';
    el('ar-vend').value = c ? (c.vend || '') : '';
    el('ar-st').value = c ? (c.st || 'aberto') : 'aberto';
    el('ar-rcem').value = c ? (c.rcEm || '') : '';
    el('ar-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ================= PAGINA: PAGAMENTOS & BOLETOS ================= */
  addPage('pagamentos',
    hdr('Pagamentos & boletos', 'Lance o que foi pago no dia e gere os boletos das compras a prazo', '') +
    '<div class="kpi-grid" id="pg-kpis"></div>' +
    '<div class="gx-tabs">' +
    '<div class="gx-tab on" data-pane="pg-p">Pagamentos do dia</div>' +
    '<div class="gx-tab" data-pane="pg-b">Compra a prazo / boletos</div>' +
    '<div class="gx-tab" data-pane="pg-a">Contas em aberto</div></div>' +
    /* pagamentos */
    '<div class="gx-pane on" id="pane-pg-p">' +
    '<div class="gx-form"><h3>Registrar pagamento realizado</h3>' +
    '<div class="gx-row"><div class="gx-f" style="grid-column:span 3"><label>Quitar uma conta já lançada</label><select id="pg-conta"></select></div>' +
    '<div class="gx-f"><label>Data do pagamento</label><input id="pg-data" type="date"></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="pg-quitar">Marcar como paga</button></div></div>' +
    '<div class="gx-hint" style="margin:16px 0 8px"><b>Ou lance um pagamento avulso</b> (água, luz, internet, café, combustível...):</div>' +
    '<div class="gx-row">' +
    '<div class="gx-f"><label>Data</label><input id="pg-ad" type="date"></div>' +
    '<div class="gx-f" style="grid-column:span 2"><label>Descrição *</label><input id="pg-adesc" placeholder="ex.: Enel - conta de energia"></div>' +
    '<div class="gx-f"><label>Valor (R$) *</label><input id="pg-aval" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Tipo</label><select id="pg-acat"><option>Variável</option><option>Fixo</option></select></div>' +
    '<div class="gx-f"><label>Categoria</label><select id="pg-asub">' + optList(SUBCATS, 'Outros') + '</select></div>' +
    '<div class="gx-f"><label>Forma</label><select id="pg-aforma">' + optList(FORMAS, 'PIX') + '</select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="pg-aemp"><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="pg-aadd">Lançar pagamento</button></div></div>' +
    '<div class="gx-tools" style="margin-top:12px"><button class="gx-btn" id="pg-imp">Importar contas pagas do dia (planilha)</button></div></div>' +
    '<div class="gx-filters"><div class="gx-f"><label>De</label><input id="pg-de" type="date"></div>' +
    '<div class="gx-f"><label>Até</label><input id="pg-ate" type="date"></div>' +
    '<div class="gx-f"><label>Tipo</label><select id="pg-fcat"><option value="">Todos</option><option>Fixo</option><option>Variável</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="pg-hoje">Só hoje</button></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn" id="pg-mes">Mês atual</button></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Pagamentos realizados</h3><span id="pg-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-pg"><thead><tr><th>Pago em</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Forma</th><th>Emp.</th><th class="right">Valor</th><th></th></tr></thead><tbody></tbody></table></div></div></div>' +
    /* boletos */
    '<div class="gx-pane" id="pane-pg-b">' +
    '<div class="gx-form"><h3>Compra a prazo — gerar boletos</h3><div class="gx-row">' +
    '<div class="gx-f" style="grid-column:span 2"><label>Fornecedor *</label><input id="bo-forn" list="dl-forns3"></div>' +
    '<div class="gx-f"><label>NF / documento</label><input id="bo-doc"></div>' +
    '<div class="gx-f"><label>Valor total (R$) *</label><input id="bo-total" type="number" step="0.01"></div>' +
    '<div class="gx-f"><label>Nº de parcelas *</label><input id="bo-parc" type="number" value="1" min="1" max="36"></div>' +
    '<div class="gx-f"><label>1º vencimento *</label><input id="bo-venc" type="date"></div>' +
    '<div class="gx-f"><label>Intervalo</label><select id="bo-int"><option value="30">30 dias</option><option value="m">Mensal (mesmo dia)</option><option value="15">15 dias</option><option value="7">Semanal</option></select></div>' +
    '<div class="gx-f"><label>Empresa</label><select id="bo-emp"><option>V8</option><option>DRYWALL PARIS</option></select></div>' +
    '<div class="gx-f"><label>&nbsp;</label><button class="gx-btn pri" id="bo-gerar">Gerar boletos</button></div>' +
    '</div><div class="gx-hint">As parcelas entram automaticamente em <b>Contas a pagar</b> como boletos em aberto, com a marcação 1/3, 2/3...</div>' +
    '<div id="bo-prev" style="margin-top:14px"></div></div>' +
    '<div class="table-card"><div class="table-header"><h3>Boletos em aberto</h3><span id="bo-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-bo"><thead><tr><th>Vencimento</th><th>Fornecedor</th><th>Doc.</th><th>Parcela</th><th class="right">Valor</th><th>Situação</th><th></th></tr></thead><tbody></tbody></table></div></div>' +
    '<datalist id="dl-forns3"></datalist></div>' +
    /* em aberto */
    '<div class="gx-pane" id="pane-pg-a">' +
    '<div class="table-card"><div class="table-header"><h3>Tudo que está em aberto</h3><span id="ab-cont" class="subtitle"></span></div>' +
    '<div class="gx-scroll"><table id="tb-ab"><thead><tr><th>Vencimento</th><th>Fornecedor / descrição</th><th>Tipo</th><th>Forma</th><th class="right">Valor</th><th>Situação</th><th></th></tr></thead><tbody></tbody></table></div></div></div>');

  function renderPG() {
    var sum = function (a) { return a.reduce(function (x, c) { return x + (Number(c.valor) || 0); }, 0); };
    var hoje = today();
    var pagosHoje = S.ap.filter(function (c) { return c.st === 'pago' && c.pgEm === hoje; });
    var pagosMes = S.ap.filter(function (c) { return c.st === 'pago' && (c.pgEm || '').slice(0, 7) === mesAtual(); });
    var abertas = S.ap.filter(function (c) { return c.st !== 'pago'; });
    var bols = abertas.filter(function (c) { return c.forma === 'Boleto'; });
    el('pg-kpis').innerHTML =
      kpi('Pago hoje', brl(sum(pagosHoje)), pagosHoje.length + ' pagamentos', 'v8') +
      kpi('Pago no mês', brl(sum(pagosMes)), pagosMes.length + ' pagamentos', 'total') +
      kpi('Boletos em aberto', brl(sum(bols)), bols.length + ' boletos') +
      kpi('Total em aberto', brl(sum(abertas)), abertas.length + ' contas', abertas.length ? 'dp' : '');

    var sel = el('pg-conta');
    var ab = abertas.sort(function (a, b) { return (a.venc || '').localeCompare(b.venc || ''); });
    sel.innerHTML = '<option value="">— selecione uma conta em aberto —</option>' + ab.map(function (c) {
      return '<option value="' + c.id + '">' + esc(fmtD(c.venc) + ' • ' + c.desc + ' • ' + brl(c.valor) + (c.parc ? ' (' + c.parc + ')' : '')) + '</option>';
    }).join('');

    var de = val('pg-de'), ate = val('pg-ate'), fc = val('pg-fcat');
    var pg = S.ap.filter(function (c) {
      if (c.st !== 'pago') return false;
      var d = c.pgEm || c.venc || '';
      if (de && d < de) return false;
      if (ate && d > ate) return false;
      if (fc && c.cat !== fc) return false;
      return true;
    }).sort(function (a, b) { return (b.pgEm || '').localeCompare(a.pgEm || ''); });
    document.querySelector('#tb-pg tbody').innerHTML = pg.length ? pg.map(function (c) {
      return '<tr data-id="' + c.id + '"><td>' + fmtD(c.pgEm) + '</td><td><b>' + esc(c.desc) + '</b>' +
        (c.doc ? '<div style="font-size:11px;color:#99807a">' + esc(c.doc) + '</div>' : '') + '</td>' +
        '<td>' + esc(c.cat || '—') + '</td><td>' + esc(c.sub || '—') + '</td><td>' + esc(c.forma || '—') + '</td>' +
        '<td>' + (c.emp === 'DRYWALL PARIS' ? '<span class="tag dp">DP</span>' : '<span class="tag v8">V8</span>') + '</td>' +
        '<td class="right"><b>' + brl(c.valor) + '</b></td>' +
        '<td><button class="gx-btn sm pgx-desf">Estornar</button></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="gx-empty">Nenhum pagamento no período.</div></td></tr>';
    el('pg-cont').textContent = pg.length + ' pagamentos • ' + brl(sum(pg)) +
      '  |  Fixo ' + brl(sum(pg.filter(function (c) { return c.cat === 'Fixo'; }))) +
      '  •  Variável ' + brl(sum(pg.filter(function (c) { return c.cat !== 'Fixo'; })));

    document.querySelector('#tb-bo tbody').innerHTML = bols.length ? bols.map(function (c) {
      return '<tr data-id="' + c.id + '"><td>' + fmtD(c.venc) + '</td><td><b>' + esc(c.desc) + '</b></td><td>' + esc(c.doc || '—') + '</td>' +
        '<td>' + esc(c.parc || '—') + '</td><td class="right">' + brl(c.valor) + '</td><td>' + apStatus(c).h + '</td>' +
        '<td><button class="gx-btn sm pgx-pg">Pagar</button></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="gx-empty">Nenhum boleto em aberto.</div></td></tr>';
    el('bo-cont').textContent = bols.length + ' boletos • ' + brl(sum(bols));

    document.querySelector('#tb-ab tbody').innerHTML = ab.length ? ab.map(function (c) {
      return '<tr data-id="' + c.id + '"><td>' + fmtD(c.venc) + '</td><td><b>' + esc(c.desc) + '</b></td><td>' + esc(c.cat || '—') + '</td>' +
        '<td>' + esc(c.forma || '—') + '</td><td class="right">' + brl(c.valor) + '</td><td>' + apStatus(c).h + '</td>' +
        '<td><button class="gx-btn sm pgx-pg">Pagar</button></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="gx-empty">Nada em aberto. 👍</div></td></tr>';
    el('ab-cont').textContent = ab.length + ' contas • ' + brl(sum(ab));
    el('dl-forns3').innerHTML = forns().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');

    on('.pgx-pg', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ap.forEach(function (c) { if (c.id === id) { c.st = 'pago'; c.pgEm = today(); } });
      save(); renderPG(); refreshBadges();
    });
    on('.pgx-desf', 'click', function (e) {
      var id = e.target.closest('tr').dataset.id;
      S.ap.forEach(function (c) { if (c.id === id) { c.st = 'aberto'; c.pgEm = ''; } });
      save(); renderPG(); refreshBadges();
    });
  }
  HOOKS['pagamentos'] = renderPG;

  /* ================= IMPORTADOR DE PLANILHAS ================= */
  var modal = document.createElement('div');
  modal.className = 'gx-mod';
  modal.id = 'gx-import';
  modal.innerHTML =
    '<div class="gx-mod-box"><div class="gx-mod-hd"><h3 id="imp-t">Importar</h3><button class="gx-x" id="imp-x">×</button></div>' +
    '<div class="gx-mod-bd">' +
    '<div id="imp-s1"><div class="gx-hint" id="imp-hint"></div>' +
    '<div class="gx-row" style="margin:14px 0"><div class="gx-f"><label>Arquivo (.csv, .xlsx, .xls)</label><input type="file" id="imp-file" accept=".csv,.txt,.xls,.xlsx"></div></div>' +
    '<div class="gx-f"><label>Ou copie no Excel e cole aqui (com a linha de títulos)</label><textarea class="gx-paste" id="imp-paste" placeholder="Data\tItem\tQtde\n01/07/2026\tPLACA GESSO ST 12,5\t120"></textarea></div>' +
    '<button class="gx-btn pri" id="imp-ler" style="margin-top:12px">Ler dados</button></div>' +
    '<div id="imp-s2" style="display:none"><div class="gx-hint">Confira de qual coluna da sua planilha vem cada campo. Campos com * são obrigatórios.</div>' +
    '<div class="gx-map" id="imp-map"></div><div id="imp-extra"></div>' +
    '<div class="gx-hint" style="margin:10px 0 6px">Prévia das primeiras linhas:</div><div class="gx-prev" id="imp-prev"></div></div>' +
    '</div><div class="gx-mod-ft"><span class="gx-hint" id="imp-msg" style="margin-right:auto"></span>' +
    '<button class="gx-btn" id="imp-cancel">Cancelar</button><button class="gx-btn pri" id="imp-ok" style="display:none">Importar</button></div></div>';
  document.body.appendChild(modal);

  var IMP = { spec: null, head: [], rows: [] };

  function openImport(spec) {
    IMP.spec = spec; IMP.head = []; IMP.rows = [];
    el('imp-t').textContent = spec.title;
    el('imp-hint').innerHTML = spec.hint || '';
    el('imp-paste').value = '';
    el('imp-file').value = '';
    el('imp-s1').style.display = '';
    el('imp-s2').style.display = 'none';
    el('imp-ok').style.display = 'none';
    el('imp-msg').textContent = '';
    el('imp-extra').innerHTML = spec.extra || '';
    modal.classList.add('on');
  }
  function closeImport() { modal.classList.remove('on'); }

  function splitLines(t) { return t.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; }); }
  function detectSep(l) {
    var t = (l.match(/\t/g) || []).length, p = (l.match(/;/g) || []).length, c = (l.match(/,/g) || []).length;
    if (t >= p && t >= c && t > 0) return '\t';
    if (p >= c && p > 0) return ';';
    if (c > 0) return ',';
    return '\t';
  }
  function splitCSVLine(line, sep) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }
  function parseTexto(txt) {
    var ls = splitLines(txt);
    if (!ls.length) return null;
    var sep = detectSep(ls[0]);
    var m = ls.map(function (l) { return splitCSVLine(l, sep); });
    return { head: m[0], rows: m.slice(1) };
  }
  function loadXLSX(cb) {
    if (window.XLSX) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function () { cb(); };
    s.onerror = function () { alert('Não consegui carregar o leitor de Excel (sem internet?).\nSalve a planilha como CSV ou copie e cole os dados na caixa de texto.'); };
    document.head.appendChild(s);
  }
  function lerArquivo(file, cb) {
    var nome = (file.name || '').toLowerCase();
    if (/\.(xlsx|xls)$/.test(nome)) {
      loadXLSX(function () {
        var fr = new FileReader();
        fr.onload = function (e) {
          try {
            var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            var sh = wb.Sheets[wb.SheetNames[0]];
            var aoa = XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
            aoa = aoa.filter(function (r) { return r && r.join('').trim() !== ''; });
            cb({ head: (aoa[0] || []).map(String), rows: aoa.slice(1) });
          } catch (err) { alert('Não consegui ler a planilha: ' + err.message); }
        };
        fr.readAsArrayBuffer(file);
      });
    } else {
      var fr2 = new FileReader();
      fr2.onload = function (e) { cb(parseTexto(e.target.result)); };
      fr2.readAsText(file, 'UTF-8');
    }
  }
  function autoMap(col, head) {
    var alias = [col.k, col.label].concat(col.alias || []).map(norm);
    for (var i = 0; i < head.length; i++) {
      var h = norm(head[i]);
      for (var j = 0; j < alias.length; j++) {
        if (h === alias[j]) return i;
      }
    }
    for (var i2 = 0; i2 < head.length; i2++) {
      var h2 = norm(head[i2]);
      for (var j2 = 0; j2 < alias.length; j2++) {
        if (alias[j2] && (h2.indexOf(alias[j2]) >= 0 || alias[j2].indexOf(h2) >= 0) && h2.length > 2) return i2;
      }
    }
    return -1;
  }
  function showStep2() {
    var sp = IMP.spec;
    el('imp-map').innerHTML = sp.cols.map(function (c) {
      var g = autoMap(c, IMP.head);
      return '<div class="gx-f"><label>' + esc(c.label) + (c.req ? ' *' : '') + '</label><select data-col="' + c.k + '">' +
        '<option value="-1">— ignorar —</option>' +
        IMP.head.map(function (h, i) { return '<option value="' + i + '"' + (i === g ? ' selected' : '') + '>' + esc(h || ('coluna ' + (i + 1))) + '</option>'; }).join('') +
        '</select></div>';
    }).join('');
    var pv = IMP.rows.slice(0, 5);
    el('imp-prev').innerHTML = '<table><thead><tr>' + IMP.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      pv.map(function (r) { return '<tr>' + IMP.head.map(function (h, i) { return '<td>' + esc(r[i]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    el('imp-s1').style.display = 'none';
    el('imp-s2').style.display = '';
    el('imp-ok').style.display = '';
    el('imp-msg').textContent = IMP.rows.length + ' linhas encontradas';
  }
  el('imp-x').addEventListener('click', closeImport);
  el('imp-cancel').addEventListener('click', closeImport);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeImport(); });
  el('imp-ler').addEventListener('click', function () {
    var f = el('imp-file').files[0];
    if (f) {
      lerArquivo(f, function (r) { if (!r || !r.head) return alert('Arquivo vazio ou ilegível.'); IMP.head = r.head; IMP.rows = r.rows; showStep2(); });
      return;
    }
    var t = el('imp-paste').value;
    if (!t.trim()) return alert('Escolha um arquivo ou cole os dados.');
    var r2 = parseTexto(t);
    if (!r2) return alert('Não consegui interpretar os dados colados.');
    IMP.head = r2.head; IMP.rows = r2.rows; showStep2();
  });
  el('imp-ok').addEventListener('click', function () {
    var mapa = {};
    el('imp-map').querySelectorAll('select').forEach(function (s) { mapa[s.dataset.col] = parseInt(s.value, 10); });
    var falta = IMP.spec.cols.filter(function (c) { return c.req && (mapa[c.k] == null || mapa[c.k] < 0); });
    if (falta.length) return alert('Faltou indicar: ' + falta.map(function (c) { return c.label; }).join(', '));
    var objs = IMP.rows.map(function (r) {
      var o = {};
      IMP.spec.cols.forEach(function (c) { o[c.k] = mapa[c.k] >= 0 ? (r[mapa[c.k]] == null ? '' : r[mapa[c.k]]) : ''; });
      return o;
    }).filter(function (o) {
      return IMP.spec.cols.some(function (c) { return c.req && String(o[c.k]).trim() !== ''; });
    });
    var n = 0;
    try { n = IMP.spec.onConfirm(objs) || objs.length; } catch (e) { alert('Erro na importação: ' + e.message); return; }
    save();
    closeImport();
    refreshBadges();
    var pg = localStorage.getItem('v8_nav_page');
    if (HOOKS[pg]) HOOKS[pg]();
    alert(n + ' linha(s) importada(s) com sucesso.');
  });

  function simNao(v) {
    var s = norm(v);
    if (!s) return 0;
    return /^(S|SIM|1|X|OK|TRUE|DESPACHAD|ENTREGUE|PAGO|RECEBIDO)/.test(s) ? 1 : 0;
  }

  /* --------- specs de importacao --------- */
  function impItens() {
    openImport({
      title: 'Importar itens do estoque',
      hint: 'Suba a lista de itens com o ponto de pedido. Colunas aceitas: nome, código, categoria, unidade, fornecedor, custo, ponto de pedido, lote, prazo, crítico.',
      cols: [
        { k: 'nome', label: 'Nome do item', req: 1, alias: ['produto', 'descricao', 'descrição', 'item'] },
        { k: 'cod', label: 'Código', alias: ['codigo', 'sku', 'ref'] },
        { k: 'cat', label: 'Categoria', alias: ['grupo', 'familia'] },
        { k: 'un', label: 'Unidade', alias: ['un', 'unid'] },
        { k: 'forn', label: 'Fornecedor', alias: ['fabricante'] },
        { k: 'custo', label: 'Custo unitário', alias: ['custo', 'preco de custo', 'valor unitario'] },
        { k: 'pp', label: 'Ponto de pedido', alias: ['estoque minimo', 'minimo', 'ponto'] },
        { k: 'lote', label: 'Qtde de reposição', alias: ['lote', 'compra padrao'] },
        { k: 'lead', label: 'Prazo entrega (dias)', alias: ['lead time', 'prazo'] },
        { k: 'crit', label: 'Item crítico (S/N)', alias: ['critico'] }
      ],
      onConfirm: function (rows) {
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.nome).trim()) return;
          var it = ensureItem(r.nome, {});
          if (r.cod) it.cod = String(r.cod).trim();
          if (r.cat) it.cat = String(r.cat).trim();
          if (r.un) it.un = String(r.un).trim().toUpperCase();
          if (r.forn) it.forn = String(r.forn).trim();
          if (r.custo !== '') it.custo = pnum(r.custo);
          if (r.pp !== '') it.pp = pnum(r.pp);
          if (r.lote !== '') it.lote = pnum(r.lote);
          if (r.lead !== '') it.lead = pnum(r.lead);
          if (r.crit !== '') it.crit = simNao(r.crit);
          n++;
        });
        return n;
      }
    });
  }
  function impEntradas() {
    openImport({
      title: 'Importar relatório de compras',
      hint: 'Relatório diário de compras (com ou sem NF). Itens que ainda não existem são cadastrados automaticamente.',
      cols: [
        { k: 'd', label: 'Data', req: 1, alias: ['data', 'dt', 'emissao', 'entrada'] },
        { k: 'item', label: 'Item/produto', req: 1, alias: ['produto', 'descricao', 'material'] },
        { k: 'q', label: 'Quantidade', req: 1, alias: ['qtde', 'qtd', 'quantidade'] },
        { k: 'vu', label: 'Custo unitário', alias: ['unitario', 'vl unit', 'preco'] },
        { k: 'forn', label: 'Fornecedor', alias: ['fornecedor'] },
        { k: 'doc', label: 'Documento/NF', alias: ['nf', 'nota', 'documento'] }
      ],
      onConfirm: function (rows) {
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.item).trim()) return;
          var it = ensureItem(r.item, { custo: pnum(r.vu), forn: String(r.forn || '').trim() });
          addMov({ t: 'E', d: pdate(r.d) || today(), it: it.id, q: pnum(r.q), vu: pnum(r.vu), forn: String(r.forn || '').trim(), doc: String(r.doc || '').trim() });
          if (pnum(r.vu) > 0) it.custo = pnum(r.vu);
          n++;
        });
        return n;
      }
    });
  }
  function impSaidas() {
    openImport({
      title: 'Importar relatório de vendas',
      hint: 'Relatório diário de vendas. Marque na planilha se o pedido já foi <b>despachado</b> e se foi para <b>cliente</b> ou para o <b>estoque da Drywall Paris</b>.',
      cols: [
        { k: 'd', label: 'Data', req: 1, alias: ['data', 'dt', 'emissao'] },
        { k: 'item', label: 'Item/produto', req: 1, alias: ['produto', 'descricao', 'material'] },
        { k: 'q', label: 'Quantidade', req: 1, alias: ['qtde', 'qtd', 'quantidade'] },
        { k: 'ped', label: 'Pedido/NF', alias: ['pedido', 'nf', 'nota'] },
        { k: 'dest', label: 'Destino (cliente / Paris)', alias: ['destino', 'cliente', 'para'] },
        { k: 'desp', label: 'Despachado (S/N)', alias: ['despachado', 'entregue', 'status'] }
      ],
      onConfirm: function (rows) {
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.item).trim()) return;
          var it = ensureItem(r.item, {});
          var dest = String(r.dest || '').trim();
          if (/paris|estoque/i.test(dest)) dest = 'Estoque Drywall Paris'; else if (dest) dest = dest; else dest = 'Cliente';
          addMov({ t: 'S', d: pdate(r.d) || today(), it: it.id, q: pnum(r.q), ped: String(r.ped || '').trim(), dest: dest, desp: simNao(r.desp) });
          n++;
        });
        return n;
      }
    });
  }
  function impContagem() {
    openImport({
      title: 'Importar contagem de estoque',
      hint: 'Contagem diária dos itens críticos. Uma linha por item contado.',
      cols: [
        { k: 'd', label: 'Data', req: 1, alias: ['data', 'dt'] },
        { k: 'item', label: 'Item/produto', req: 1, alias: ['produto', 'descricao', 'material'] },
        { k: 'q', label: 'Qtde contada', req: 1, alias: ['qtde', 'qtd', 'quantidade', 'contagem', 'saldo'] },
        { k: 'quem', label: 'Responsável', alias: ['responsavel', 'conferente', 'quem'] }
      ],
      onConfirm: function (rows) {
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.item).trim()) return;
          var it = ensureItem(r.item, {});
          addMov({ t: 'C', d: pdate(r.d) || today(), it: it.id, q: pnum(r.q), quem: String(r.quem || '').trim() });
          n++;
        });
        return n;
      }
    });
  }
  function impAP(pagas) {
    openImport({
      title: pagas ? 'Importar contas pagas do dia' : 'Importar contas a pagar',
      hint: pagas ? 'Relatório diário de contas pagas (boletos, água, luz, internet, café...). Entram já como <b>pagas</b>.'
        : 'Contas a pagar (boletos de fornecedores e despesas). Se a coluna “pago em” estiver preenchida, a conta entra como paga.',
      cols: [
        { k: 'venc', label: pagas ? 'Data do pagamento' : 'Vencimento', req: 1, alias: ['vencimento', 'data', 'venc', 'pagamento'] },
        { k: 'desc', label: 'Fornecedor / descrição', req: 1, alias: ['fornecedor', 'descricao', 'historico', 'conta'] },
        { k: 'valor', label: 'Valor', req: 1, alias: ['valor', 'total', 'vl'] },
        { k: 'cat', label: 'Tipo (Fixo/Variável)', alias: ['tipo', 'custo', 'classificacao'] },
        { k: 'sub', label: 'Categoria', alias: ['categoria', 'grupo', 'natureza'] },
        { k: 'forma', label: 'Forma de pagamento', alias: ['forma', 'pagamento', 'meio'] },
        { k: 'doc', label: 'Documento/NF', alias: ['nf', 'documento', 'boleto'] },
        { k: 'emp', label: 'Empresa', alias: ['empresa', 'loja'] },
        { k: 'pgEm', label: 'Pago em', alias: ['pago em', 'baixa', 'data pagamento'] }
      ],
      onConfirm: function (rows) {
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.desc).trim()) return;
          var venc = pdate(r.venc) || today();
          var pg = pdate(r.pgEm) || (pagas ? venc : '');
          S.ap.push({
            id: uid('a'), venc: venc, desc: String(r.desc).trim(), valor: pnum(r.valor),
            cat: /fix/i.test(String(r.cat)) ? 'Fixo' : (String(r.cat).trim() ? 'Variável' : (pagas ? 'Variável' : 'Variável')),
            sub: String(r.sub || '').trim() || 'Outros', forma: String(r.forma || '').trim() || (pagas ? 'PIX' : 'Boleto'),
            doc: String(r.doc || '').trim(), emp: /paris/i.test(String(r.emp)) ? 'DRYWALL PARIS' : 'V8',
            st: pg ? 'pago' : 'aberto', pgEm: pg, obs: ''
          });
          n++;
        });
        return n;
      }
    });
  }
  function impAR() {
    openImport({
      title: 'Importar contas a receber',
      hint: 'Vendas com o <b>meio de pagamento</b> de cada cliente. Vendas à vista (PIX, dinheiro, débito) podem entrar já como recebidas.',
      extra: '<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:10px 0"><input type="checkbox" id="imp-vista" checked> Marcar vendas à vista (PIX, dinheiro, cartão de débito) como já recebidas</label>',
      cols: [
        { k: 'venc', label: 'Vencimento', req: 1, alias: ['vencimento', 'data', 'venc'] },
        { k: 'cli', label: 'Cliente', req: 1, alias: ['cliente', 'nome'] },
        { k: 'valor', label: 'Valor', req: 1, alias: ['valor', 'total', 'liquido'] },
        { k: 'meio', label: 'Meio de pagamento', alias: ['meio', 'forma', 'pagamento', 'condicao'] },
        { k: 'ped', label: 'Pedido/NF', alias: ['pedido', 'nf', 'nota'] },
        { k: 'emp', label: 'Empresa', alias: ['empresa', 'loja'] },
        { k: 'vend', label: 'Vendedor', alias: ['vendedor'] },
        { k: 'rcEm', label: 'Recebido em', alias: ['recebido', 'baixa'] }
      ],
      onConfirm: function (rows) {
        var vista = el('imp-vista') ? el('imp-vista').checked : true;
        var n = 0;
        rows.forEach(function (r) {
          if (!String(r.cli).trim()) return;
          var meio = String(r.meio || '').trim();
          var meioN = norm(meio);
          var ehVista = MEIOS_VISTA.some(function (mv) { return norm(mv) === meioN; }) || /VISTA|PIX|DINHEIRO|DEBITO/.test(meioN);
          var rc = pdate(r.rcEm) || ((vista && ehVista) ? (pdate(r.venc) || today()) : '');
          S.ar.push({
            id: uid('r'), venc: pdate(r.venc) || today(), cli: String(r.cli).trim(), ped: String(r.ped || '').trim(),
            valor: pnum(r.valor), meio: meio || 'Não informado',
            emp: /paris/i.test(String(r.emp)) ? 'DRYWALL PARIS' : 'V8', vend: String(r.vend || '').trim(),
            st: rc ? 'recebido' : 'aberto', rcEm: rc
          });
          n++;
        });
        return n;
      }
    });
  }

  /* ================= WIRING ================= */
  function wire() {
    /* abas internas */
    on('.gx-tab', 'click', function (e) {
      var t = e.currentTarget, pane = t.dataset.pane, pai = t.closest('.page');
      pai.querySelectorAll('.gx-tab').forEach(function (x) { x.classList.remove('on'); });
      pai.querySelectorAll('.gx-pane').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      var p = el('pane-' + pane); if (p) p.classList.add('on');
    });

    /* ESTOQUE ATUAL */
    ['ea-q', 'ea-cat', 'ea-emp', 'ea-st', 'ea-ord'].forEach(function (id) {
      el(id).addEventListener(el(id).tagName === 'SELECT' ? 'change' : 'input', renderEstoqueAtual);
    });
    el('ea-clr').addEventListener('click', function () {
      ['ea-q', 'ea-cat', 'ea-emp', 'ea-st'].forEach(function (i) { el(i).value = ''; });
      el('ea-ord').value = 'crit'; renderEstoqueAtual();
    });
    el('ea-lanc').addEventListener('click', function () { go('mov-estoque'); });
    el('ea-exp').addEventListener('click', function () {
      var rows = calcEstoque();
      var l = [['Item', 'Codigo', 'Categoria', 'Un', 'Ult contagem', 'Data contagem', 'Entradas', 'Saidas', 'Saldo', 'A despachar', 'Disponivel', 'Divergencia', 'Ponto pedido', 'Consumo/dia', 'Cobertura dias', 'Custo', 'Valor estoque', 'Situacao']];
      rows.forEach(function (r) {
        l.push([r.it.nome, r.it.cod, r.it.cat, r.it.un, r.cont == null ? '' : r.cont, r.contD, r.ent, r.sai, r.saldo, r.res, r.disp,
        r.divg == null ? '' : r.divg, r.pp, r.consumo.toFixed(2), r.cobertura == null ? '' : Math.round(r.cobertura), r.it.custo, r.valor.toFixed(2), r.status]);
      });
      csvDown('estoque_atual_' + today() + '.csv', l);
    });

    /* PONTO DE PEDIDO */
    ['pp-q', 'pp-fcat', 'pp-fforn', 'pp-fst'].forEach(function (id) {
      el(id).addEventListener(el(id).tagName === 'SELECT' ? 'change' : 'input', renderPP);
    });
    el('pp-clr').addEventListener('click', function () {
      ['pp-q', 'pp-fcat', 'pp-fforn', 'pp-fst'].forEach(function (i) { el(i).value = ''; }); renderPP();
    });
    el('pp-novo').addEventListener('click', function () { editItem(null); });
    el('pp-cancel').addEventListener('click', function () { el('pp-form').style.display = 'none'; });
    el('pp-imp').addEventListener('click', impItens);
    el('pp-salvar').addEventListener('click', function () {
      var nome = val('pp-nome');
      if (!nome) return alert('Informe o nome do item.');
      var id = val('pp-id'), it = id ? itemById(id) : null;
      if (!it) {
        var dup = findItem(nome);
        if (dup) return alert('Já existe um item com esse nome: ' + dup.nome);
        it = { id: uid('i'), ativo: 1 };
        S.itens.push(it);
      }
      it.cod = val('pp-cod'); it.nome = nome; it.cat = val('pp-cat'); it.un = val('pp-un');
      it.emp = val('pp-emp'); it.forn = val('pp-forn'); it.custo = pnum(val('pp-custo'));
      it.pp = pnum(val('pp-pp')); it.lote = pnum(val('pp-lote')); it.lead = pnum(val('pp-lead'));
      it.crit = val('pp-crit') === '1' ? 1 : 0;
      save(); el('pp-form').style.display = 'none'; renderPP(); refreshBadges();
    });
    el('pp-exp').addEventListener('click', function () {
      var l = [['Codigo', 'Nome', 'Categoria', 'Unidade', 'Fornecedor', 'Custo', 'Ponto de pedido', 'Lote', 'Prazo dias', 'Critico', 'Empresa']];
      S.itens.forEach(function (i) { l.push([i.cod, i.nome, i.cat, i.un, i.forn, i.custo, i.pp, i.lote, i.lead, i.crit ? 'S' : 'N', i.emp]); });
      csvDown('itens_ponto_pedido_' + today() + '.csv', l);
    });

    /* MOVIMENTOS */
    el('me-add').addEventListener('click', function () {
      var nome = val('me-it'), q = pnum(val('me-q'));
      if (!nome || !q) return alert('Informe item e quantidade.');
      var it = ensureItem(nome, { custo: pnum(val('me-vu')), forn: val('me-forn') });
      if (pnum(val('me-vu')) > 0) it.custo = pnum(val('me-vu'));
      addMov({ t: 'E', d: val('me-d') || today(), it: it.id, q: q, vu: pnum(val('me-vu')), forn: val('me-forn'), doc: val('me-doc') });
      save();
      ['me-it', 'me-q', 'me-vu', 'me-doc'].forEach(function (i) { el(i).value = ''; });
      renderMov(); refreshBadges();
    });
    el('ms-add').addEventListener('click', function () {
      var nome = val('ms-it'), q = pnum(val('ms-q'));
      if (!nome || !q) return alert('Informe item e quantidade.');
      var it = ensureItem(nome, {});
      addMov({ t: 'S', d: val('ms-d') || today(), it: it.id, q: q, ped: val('ms-ped'), dest: val('ms-dest'), desp: val('ms-desp') === '1' ? 1 : 0 });
      save();
      ['ms-it', 'ms-q', 'ms-ped'].forEach(function (i) { el(i).value = ''; });
      renderMov(); refreshBadges();
    });
    el('mc-add').addEventListener('click', function () {
      var nome = val('mc-it'), q = val('mc-q');
      if (!nome || q === '') return alert('Informe item e quantidade contada.');
      var it = ensureItem(nome, {});
      addMov({ t: 'C', d: val('mc-d') || today(), it: it.id, q: pnum(q), quem: val('mc-quem') });
      save();
      ['mc-it', 'mc-q'].forEach(function (i) { el(i).value = ''; });
      renderMov(); refreshBadges();
    });
    el('ma-add').addEventListener('click', function () {
      var nome = val('ma-it'), q = pnum(val('ma-q'));
      if (!nome || !q) return alert('Informe item e quantidade (use valor negativo para baixa).');
      var it = ensureItem(nome, {});
      addMov({ t: 'A', d: val('ma-d') || today(), it: it.id, q: q, obs: val('ma-obs') });
      save();
      ['ma-it', 'ma-q', 'ma-obs'].forEach(function (i) { el(i).value = ''; });
      renderMov(); refreshBadges();
    });
    el('me-imp').addEventListener('click', impEntradas);
    el('ms-imp').addEventListener('click', impSaidas);
    el('mc-imp').addEventListener('click', impContagem);
    el('mc-crit').addEventListener('click', function () {
      var crit = S.itens.filter(function (i) { return i.crit; });
      if (!crit.length) return alert('Nenhum item está marcado como crítico.\nMarque os itens em Estoque › Ponto de pedido (coluna “Item crítico”).');
      var rows = calcEstoque(), idx = {};
      rows.forEach(function (r) { idx[r.it.id] = r; });
      el('mc-rapida').innerHTML = '<div class="table-card"><div class="table-header"><h3>Contagem rápida — itens críticos</h3>' +
        '<button class="gx-btn pri" id="mcq-save">Salvar contagem</button></div>' +
        '<table><thead><tr><th>Item</th><th class="right">Saldo no sistema</th><th class="right" style="width:150px">Contado hoje</th></tr></thead><tbody>' +
        crit.map(function (i) {
          return '<tr><td><b>' + esc(i.nome) + '</b></td><td class="right">' + num(idx[i.id] ? idx[i.id].saldo : 0) + '</td>' +
            '<td class="right"><input class="mcq" data-id="' + i.id + '" type="number" step="0.01" style="width:120px;text-align:right;padding:6px 8px;border:1px solid #d1d0d0;border-radius:6px;font-family:inherit"></td></tr>';
        }).join('') + '</tbody></table></div>';
      el('mcq-save').addEventListener('click', function () {
        var n = 0;
        document.querySelectorAll('.mcq').forEach(function (inp) {
          if (inp.value === '') return;
          addMov({ t: 'C', d: val('mc-d') || today(), it: inp.dataset.id, q: pnum(inp.value), quem: val('mc-quem') });
          n++;
        });
        if (!n) return alert('Preencha ao menos uma contagem.');
        save(); el('mc-rapida').innerHTML = ''; renderMov(); refreshBadges();
        alert(n + ' contagem(ns) registrada(s).');
      });
    });
    el('mv-exp').addEventListener('click', function () {
      var l = [['Tipo', 'Data', 'Item', 'Qtde', 'Custo un', 'Fornecedor', 'Documento', 'Pedido', 'Destino', 'Despachado', 'Responsavel', 'Obs']];
      var T = { E: 'Entrada', S: 'Saida', C: 'Contagem', A: 'Ajuste' };
      S.mov.slice().sort(function (a, b) { return (a.d || '').localeCompare(b.d || ''); }).forEach(function (m) {
        var i = itemById(m.it) || { nome: '?' };
        l.push([T[m.t], m.d, i.nome, m.q, m.vu || '', m.forn || '', m.doc || '', m.ped || '', m.dest || '', m.t === 'S' ? (m.desp ? 'S' : 'N') : '', m.quem || '', m.obs || '']);
      });
      csvDown('movimentos_estoque_' + today() + '.csv', l);
    });

    /* CONTAS A PAGAR */
    ['ap-fmes', 'ap-fst', 'ap-fcat', 'ap-fsub', 'ap-femp', 'ap-q'].forEach(function (id) {
      el(id).addEventListener(el(id).tagName === 'SELECT' ? 'change' : 'input', renderAP);
    });
    el('ap-clr').addEventListener('click', function () {
      ['ap-fmes', 'ap-fst', 'ap-fcat', 'ap-fsub', 'ap-femp', 'ap-q'].forEach(function (i) { el(i).value = ''; }); renderAP();
    });
    el('ap-nova').addEventListener('click', function () { editAP(null); });
    el('ap-cancel').addEventListener('click', function () { el('ap-form').style.display = 'none'; });
    el('ap-imp').addEventListener('click', function () { impAP(false); });
    el('ap-salvar').addEventListener('click', function () {
      var desc = val('ap-desc'), valor = pnum(val('ap-valor'));
      if (!desc || !valor) return alert('Informe descrição e valor.');
      var id = val('ap-id'), c = id ? S.ap.filter(function (x) { return x.id === id; })[0] : null;
      if (!c) { c = { id: uid('a') }; S.ap.push(c); }
      c.venc = val('ap-venc') || today(); c.desc = desc; c.valor = valor;
      c.cat = val('ap-cat'); c.sub = val('ap-sub'); c.forma = val('ap-forma'); c.emp = val('ap-emp');
      c.doc = val('ap-doc'); c.st = val('ap-st');
      c.pgEm = c.st === 'pago' ? (val('ap-pgem') || today()) : '';
      save(); el('ap-form').style.display = 'none'; renderAP(); refreshBadges();
    });
    el('ap-exp').addEventListener('click', function () {
      var l = [['Vencimento', 'Descricao', 'Tipo', 'Categoria', 'Forma', 'Empresa', 'Documento', 'Valor', 'Situacao', 'Pago em', 'Parcela']];
      apFiltradas().forEach(function (c) { l.push([c.venc, c.desc, c.cat, c.sub, c.forma, c.emp, c.doc, c.valor, c.st, c.pgEm, c.parc || '']); });
      csvDown('contas_a_pagar_' + today() + '.csv', l);
    });

    /* CONTAS A RECEBER */
    ['ar-fmes', 'ar-fst', 'ar-fmeio', 'ar-femp', 'ar-q'].forEach(function (id) {
      el(id).addEventListener(el(id).tagName === 'SELECT' ? 'change' : 'input', renderAR);
    });
    el('ar-clr').addEventListener('click', function () {
      ['ar-fmes', 'ar-fst', 'ar-fmeio', 'ar-femp', 'ar-q'].forEach(function (i) { el(i).value = ''; }); renderAR();
    });
    el('ar-nova').addEventListener('click', function () { editAR(null); });
    el('ar-cancel').addEventListener('click', function () { el('ar-form').style.display = 'none'; });
    el('ar-imp').addEventListener('click', impAR);
    el('ar-salvar').addEventListener('click', function () {
      var cli = val('ar-cli'), valor = pnum(val('ar-valor'));
      if (!cli || !valor) return alert('Informe cliente e valor.');
      var id = val('ar-id'), c = id ? S.ar.filter(function (x) { return x.id === id; })[0] : null;
      if (!c) { c = { id: uid('r') }; S.ar.push(c); }
      c.venc = val('ar-venc') || today(); c.cli = cli; c.ped = val('ar-ped'); c.valor = valor;
      c.meio = val('ar-meio'); c.emp = val('ar-emp'); c.vend = val('ar-vend'); c.st = val('ar-st');
      c.rcEm = c.st === 'recebido' ? (val('ar-rcem') || today()) : '';
      save(); el('ar-form').style.display = 'none'; renderAR(); refreshBadges();
    });
    el('ar-exp').addEventListener('click', function () {
      var l = [['Vencimento', 'Cliente', 'Pedido', 'Meio', 'Empresa', 'Vendedor', 'Valor', 'Situacao', 'Recebido em']];
      S.ar.forEach(function (c) { l.push([c.venc, c.cli, c.ped, c.meio, c.emp, c.vend, c.valor, c.st, c.rcEm]); });
      csvDown('contas_a_receber_' + today() + '.csv', l);
    });

    /* PAGAMENTOS & BOLETOS */
    el('pg-quitar').addEventListener('click', function () {
      var id = val('pg-conta');
      if (!id) return alert('Selecione uma conta em aberto.');
      S.ap.forEach(function (c) { if (c.id === id) { c.st = 'pago'; c.pgEm = val('pg-data') || today(); } });
      save(); renderPG(); refreshBadges();
    });
    el('pg-aadd').addEventListener('click', function () {
      var d = val('pg-adesc'), v = pnum(val('pg-aval'));
      if (!d || !v) return alert('Informe descrição e valor.');
      var dt = val('pg-ad') || today();
      S.ap.push({
        id: uid('a'), venc: dt, desc: d, valor: v, cat: val('pg-acat'), sub: val('pg-asub'),
        forma: val('pg-aforma'), emp: val('pg-aemp'), doc: '', st: 'pago', pgEm: dt
      });
      save();
      ['pg-adesc', 'pg-aval'].forEach(function (i) { el(i).value = ''; });
      renderPG(); refreshBadges();
    });
    el('pg-imp').addEventListener('click', function () { impAP(true); });
    ['pg-de', 'pg-ate', 'pg-fcat'].forEach(function (id) { el(id).addEventListener('change', renderPG); });
    el('pg-hoje').addEventListener('click', function () { el('pg-de').value = today(); el('pg-ate').value = today(); renderPG(); });
    el('pg-mes').addEventListener('click', function () {
      el('pg-de').value = mesAtual() + '-01'; el('pg-ate').value = today(); renderPG();
    });
    el('bo-gerar').addEventListener('click', function () {
      var forn = val('bo-forn'), total = pnum(val('bo-total')), np = parseInt(val('bo-parc'), 10) || 1, v1 = val('bo-venc');
      if (!forn || !total || !v1) return alert('Informe fornecedor, valor total e o 1º vencimento.');
      if (np < 1 || np > 36) return alert('Número de parcelas inválido.');
      var intv = val('bo-int'), emp = val('bo-emp'), doc = val('bo-doc');
      var base = Math.floor((total / np) * 100) / 100;
      var resto = Math.round((total - base * np) * 100) / 100;
      var criadas = [];
      for (var i = 0; i < np; i++) {
        var venc = intv === 'm' ? addMeses(v1, i) : addDias(v1, parseInt(intv, 10) * i);
        var valor = base + (i === np - 1 ? resto : 0);
        var c = {
          id: uid('a'), venc: venc, desc: forn + (doc ? ' — NF ' + doc : ''), valor: Math.round(valor * 100) / 100,
          cat: 'Variável', sub: 'Fornecedor/Mercadoria', forma: 'Boleto', emp: emp, doc: doc,
          st: 'aberto', pgEm: '', parc: (i + 1) + '/' + np, grupo: 'g' + Date.now()
        };
        S.ap.push(c); criadas.push(c);
      }
      save();
      el('bo-prev').innerHTML = '<div class="gx-hint" style="color:#27663a"><b>' + np + ' boleto(s) gerado(s):</b> ' +
        criadas.map(function (c) { return fmtD(c.venc) + ' ' + brl(c.valor); }).join(' • ') + '</div>';
      ['bo-total', 'bo-doc'].forEach(function (i) { el(i).value = ''; });
      renderPG(); refreshBadges();
    });

    /* datas default */
    ['me-d', 'ms-d', 'mc-d', 'ma-d', 'pg-data', 'pg-ad'].forEach(function (i) { if (el(i)) el(i).value = today(); });
    el('pg-de').value = mesAtual() + '-01';
    el('pg-ate').value = today();
  }

  /* ================= BADGES ================= */
  function refreshBadges() {
    var al = alertasEstoque().length;
    var apv = S.ap.filter(function (c) { var k = apStatus(c).k; return k === 'vencido' || k === 'hoje'; }).length;
    var arv = S.ar.filter(function (c) { return arStatus(c).k === 'vencido'; }).length;
    setBadge('pp', al, '#b22222');
    setBadge('ap', apv, '#b22222');
    setBadge('ar', arv, '#c89b1e');
    setBadge('g-estoque', al, '#b22222');
    setBadge('g-financeiro', apv + arv, '#b22222');
  }

  /* ================= INIT ================= */
  function init() {
    buildNav();
    wire();
    refreshBadges();
    renderEstoqueAtual(); renderPP(); renderMov(); renderAP(); renderAR(); renderPG();
    var last = null;
    try { last = localStorage.getItem('v8_nav_page'); } catch (e) { }
    go(el('page-' + last) ? last : 'painel');
    /* revalida badges a cada 5 min (virada de dia / sync) */
    setInterval(refreshBadges, 300000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.V8GESTAO = {
    state: function () { return S; },
    go: go,
    reset: function () {
      if (!confirm('Apagar TODOS os lançamentos de estoque e financeiro? Esta ação não pode ser desfeita.')) return;
      S = JSON.parse(JSON.stringify(DEF)); save(); location.reload();
    }
  };
})();
