/* === V8 SYNC - Firebase RTDB (sincronizacao aberta entre dispositivos) ===
   Espelha o estado local do painel (tarefas, metas, rituais) num banco
   compartilhado, para que todos os aparelhos vejam a mesma versao. */
(function(){
  var URL = "https://jornada-v8-default-rtdb.firebaseio.com/v8state.json";
  var KEYS = ["cowork_chr_metas","cowork_chr_ritual","cowork_chr_mes_meta","jm_v8_cowork_v2"];

  // PULL inicial (sincrono): traz o estado remoto antes do painel iniciar
  try {
    var x = new XMLHttpRequest();
    x.open("GET", URL, false);
    x.send(null);
    if (x.status >= 200 && x.status < 300 && x.responseText && x.responseText !== "null") {
      var rem = JSON.parse(x.responseText) || {};
      KEYS.forEach(function(k){ if (rem[k] != null) { localStorage.setItem(k, rem[k]); } });
    }
  } catch (e) {}

  var origSet = localStorage.setItem.bind(localStorage);
  function bundle(){ var o = {}; KEYS.forEach(function(k){ var v = localStorage.getItem(k); if (v != null) o[k] = v; }); return o; }
  function push(){
    try {
      var p = new XMLHttpRequest();
      p.open("PUT", URL, true);
      p.setRequestHeader("Content-Type", "application/json");
      p.send(JSON.stringify(bundle()));
    } catch (e) {}
  }

  // PUSH ao alterar (agrupando mudancas)
  var tmr = null;
  localStorage.setItem = function(k, v){
    origSet(k, v);
    if (KEYS.indexOf(k) >= 0) { clearTimeout(tmr); tmr = setTimeout(push, 700); }
  };

  // semeia o remoto com o estado atual (cobre o primeiro uso)
  setTimeout(push, 1800);

  // PULL automatico a cada 15s: traz alteracoes feitas em outros aparelhos
  function sig(){ return KEYS.map(function(k){ return localStorage.getItem(k); }).join(""); }
  setInterval(function(){
    if (document.hidden) return;
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    try {
      var g = new XMLHttpRequest();
      g.open("GET", URL, true);
      g.onload = function(){
        if (g.status >= 200 && g.status < 300 && g.responseText && g.responseText !== "null") {
          try {
            var rem = JSON.parse(g.responseText) || {}, before = sig(), changed = false;
            KEYS.forEach(function(k){
              if (rem[k] != null && rem[k] !== localStorage.getItem(k)) { origSet(k, rem[k]); changed = true; }
            });
            if (changed && sig() !== before) { location.reload(); }
          } catch (e) {}
        }
      };
      g.send(null);
    } catch (e) {}
  }, 15000);
})();
