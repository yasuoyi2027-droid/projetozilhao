// GhostSpy — Alerta agressivo "IP exposto" para /cta e /checkout/
// Carrega sozinho, detecta IP real + localização via ipapi.co, e mostra modal fullscreen.
(function(){
  'use strict';

  var SHOWN_KEY = 'gs_ip_alert_shown_v1';
  var ARMED_ROUTES = ['/checkout', '/checkout/'];

  function shouldArm(){
    var path = location.pathname;
    for (var i = 0; i < ARMED_ROUTES.length; i++){
      if (path === ARMED_ROUTES[i]) return true;
    }
    return false;
  }

  function alreadyShown(){
    try { return sessionStorage.getItem(SHOWN_KEY) === '1'; } catch(_){ return false; }
  }
  function markShown(){
    try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch(_){}
  }

  function injectStyles(){
    if (document.getElementById('gs-ip-alert-style')) return;
    var s = document.createElement('style');
    s.id = 'gs-ip-alert-style';
    s.textContent = [
      '#gs-ip-root{position:fixed;inset:0;z-index:2147483646;display:none;font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}',
      '#gs-ip-root.on{display:block}',
      '#gs-ip-overlay{position:absolute;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:gsIpFadeIn .3s ease-out}',
      '@keyframes gsIpFadeIn{from{opacity:0}to{opacity:1}}',
      '#gs-ip-dialog{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 32px);max-width:420px;max-height:calc(100vh - 32px);overflow-y:auto;background:linear-gradient(180deg,#1A0A0B 0%,#0F0608 100%);border:2px solid #DC2626;border-radius:20px;padding:24px 22px 20px;box-shadow:0 30px 80px rgba(220,38,38,.35),0 0 0 1px rgba(255,255,255,.04) inset;animation:gsIpPop .4s cubic-bezier(.17,.89,.32,1.28)}',
      '@keyframes gsIpPop{0%{transform:translate(-50%,-50%) scale(.75);opacity:0}60%{transform:translate(-50%,-50%) scale(1.03)}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}',
      '.gs-ip-siren{width:76px;height:76px;margin:0 auto 14px;border-radius:50%;background:radial-gradient(circle,rgba(220,38,38,.4) 0%,rgba(220,38,38,0) 70%);display:flex;align-items:center;justify-content:center;position:relative}',
      '.gs-ip-siren::before,.gs-ip-siren::after{content:"";position:absolute;inset:8px;border:2px solid #DC2626;border-radius:50%;animation:gsSiren 1.6s ease-out infinite}',
      '.gs-ip-siren::after{animation-delay:.6s}',
      '@keyframes gsSiren{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.4);opacity:0}}',
      '.gs-ip-siren svg{width:40px;height:40px;color:#F87171;animation:gsBlink 1s ease-in-out infinite;z-index:2;position:relative}',
      '@keyframes gsBlink{0%,100%{opacity:1;filter:drop-shadow(0 0 8px #DC2626)}50%{opacity:.5;filter:drop-shadow(0 0 2px #DC2626)}}',
      '.gs-ip-tag{display:inline-block;background:#DC2626;color:#fff;font-size:10px;font-weight:900;letter-spacing:.18em;padding:4px 12px;border-radius:999px;text-transform:uppercase;margin:0 auto 10px;text-align:center}',
      '.gs-ip-tag-wrap{text-align:center}',
      '.gs-ip-title{text-align:center;font-size:24px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.1;letter-spacing:-.02em}',
      '.gs-ip-title em{color:#F87171;font-style:normal}',
      '.gs-ip-sub{text-align:center;color:#FCA5A5;font-size:13px;margin:0 0 18px;line-height:1.45}',
      '.gs-ip-detect{background:rgba(0,0,0,.4);border:1px solid rgba(220,38,38,.3);border-radius:12px;padding:12px 14px;margin:0 0 14px}',
      '.gs-ip-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed rgba(220,38,38,.25);font-size:13px}',
      '.gs-ip-row:last-child{border-bottom:none}',
      '.gs-ip-label{color:#FCA5A5;font-weight:600;letter-spacing:.04em;font-size:11px;text-transform:uppercase}',
      '.gs-ip-value{color:#fff;font-weight:800;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:13px}',
      '.gs-ip-value.mut{color:#9CA3AF;font-weight:600}',
      '.gs-ip-value .red-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#DC2626;margin-right:6px;animation:gsRedPulse 1s ease-in-out infinite}',
      '@keyframes gsRedPulse{0%,100%{opacity:1;box-shadow:0 0 8px #DC2626}50%{opacity:.4;box-shadow:0 0 2px #DC2626}}',
      '.gs-ip-warn{background:linear-gradient(135deg,rgba(220,38,38,.18),rgba(153,27,27,.15));border:1px solid rgba(220,38,38,.4);border-radius:12px;padding:12px 14px;margin:0 0 16px}',
      '.gs-ip-warn p{margin:0;color:#FEE2E2;font-size:13px;line-height:1.5}',
      '.gs-ip-warn p+p{margin-top:8px}',
      '.gs-ip-warn b{color:#fff;font-weight:900}',
      '.gs-ip-timer{display:flex;justify-content:center;align-items:center;gap:10px;background:#000;border:1px solid rgba(220,38,38,.4);border-radius:10px;padding:10px;margin:0 0 14px}',
      '.gs-ip-timer-lbl{color:#9CA3AF;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}',
      '.gs-ip-timer-val{color:#DC2626;font-weight:900;font-size:22px;font-family:"SF Mono",Menlo,Consolas,monospace;letter-spacing:-.02em}',
      '.gs-ip-timer-val.red{color:#F87171;animation:gsBlink .6s ease-in-out infinite}',
      '.gs-ip-cta{display:block;width:100%;appearance:none;border:none;cursor:pointer;background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:16px 14px;border-radius:14px;font-family:inherit;text-align:center;line-height:1.15;box-shadow:0 14px 32px rgba(16,185,129,.42);transition:transform .15s,box-shadow .15s}',
      '.gs-ip-cta:hover{transform:translateY(-1px);box-shadow:0 18px 40px rgba(16,185,129,.55)}',
      '.gs-ip-cta-lbl{display:block;font-weight:900;font-size:16px;letter-spacing:.03em;text-transform:uppercase;text-shadow:0 1px 2px rgba(0,0,0,.2)}',
      '.gs-ip-cta-sub{display:block;font-weight:700;font-size:11px;margin-top:4px;background:rgba(0,0,0,.2);padding:3px 8px;border-radius:999px;display:inline-block;margin-top:6px;letter-spacing:.04em}',
      '.gs-ip-footnote{text-align:center;color:#6B7280;font-size:10px;margin:10px 0 0;line-height:1.5}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildDom(){
    if (document.getElementById('gs-ip-root')) return;
    var root = document.createElement('div');
    root.id = 'gs-ip-root';
    
  function __gsLocale(){ try { return localStorage.getItem('app_locale') || ''; } catch(_e){ return ''; } }
  function __gsTranslate(html){
    var loc = __gsLocale();
    if (loc !== 'es-MX' && loc !== 'pt-PT') return html;
    var mapEs = [
      ['⚠ Alert bezpieczeństwa', '⚠ Alerta de Seguridad'],
      ['Twój IP i lokalizacja zostały <em>ujawnione</em>', 'Tu IP y ubicación han sido <em>expuestas</em>'],
      ['Wykrywanie w czasie rzeczywistym podczas analizy profilu', 'Detección en tiempo real durante el análisis del perfil'],
      ['Wykryty IP', 'IP Detectada'],
      ['Wykrywanie<span class="gs-dots">', 'Detectando<span class="gs-dots">'],
      ['Lokalizacja', 'Ubicación'],
      ['Urządzenie', 'Dispositivo'],
      ['>Status<', '>Estado<'],
      ['UJAWNIONY', 'EXPUESTO'],
      ['Analizowana osoba zobaczy Twoje konto w "kto wyświetlił Twój profil", gdy otworzy Instagram.', 'La persona analizada verá tu cuenta en "quién vio tu perfil" cuando abra Instagram.'],
      ['Aktywuj Ochronę teraz, aby zamaskować IP i usunąć wszystkie śledy, zanim ona wejdzie do aplikacji.', 'Activa la Protección ahora para enmascarar tu IP y borrar todo rastro antes de que ella entre a la app.'],
      ['Pozostały czas na ochronę', 'Tiempo restante para proteger'],
      ['🛡 Aktywuj Ochronę Teraz', '🛡 Activar Protección Ahora'],
      ['Chroni IP · Usuwa śledy · Poufne', 'Protege IP · Elimina rastros · Confidencial'],
      ['Warstwa ochrony wojskowej · Pełna poufność gwarantowana', 'Capa de protección militar · Confidencialidad total garantizada'],
    ];
    var mapPt = [
      ['⚠ Alert bezpieczeństwa', '⚠ Alerta de Segurança'],
      ['Twój IP i lokalizacja zostały <em>ujawnione</em>', 'O teu IP e localização foram <em>expostos</em>'],
      ['Wykrywanie w czasie rzeczywistym podczas analizy profilu', 'Deteção em tempo real durante a análise do perfil'],
      ['Wykryty IP', 'IP Detetado'],
      ['Wykrywanie<span class="gs-dots">', 'A detetar<span class="gs-dots">'],
      ['Lokalizacja', 'Localização'],
      ['Urządzenie', 'Dispositivo'],
      ['>Status<', '>Estado<'],
      ['UJAWNIONY', 'EXPOSTO'],
      ['Analizowana osoba zobaczy Twoje konto w "kto wyświetlił Twój profil", gdy otworzy Instagram.', 'A pessoa analisada vai ver a tua conta em "quem viu o teu perfil" quando abrir o Instagram.'],
      ['Aktywuj Ochronę teraz, aby zamaskować IP i usunąć wszystkie śledy, zanim ona wejdzie do aplikacji.', 'Ativa a Blindagem agora para mascarar o IP e apagar todo o rasto antes que ela entre na app.'],
      ['Pozostały czas na ochronę', 'Tempo restante para blindar'],
      ['🛡 Aktywuj Ochronę Teraz', '🛡 Ativar Blindagem Agora'],
      ['Chroni IP · Usuwa śledy · Poufne', 'Protege o IP · Remove rasto · Confidencial'],
      ['Warstwa ochrony wojskowej · Pełna poufność gwarantowana', 'Camada de proteção militar · Confidencialidade total garantida'],
    ];
    var map = loc === 'pt-PT' ? mapPt : mapEs;
    for (var i = 0; i < map.length; i++) html = html.split(map[i][0]).join(map[i][1]);
    return html;
  }

    root.innerHTML = __gsTranslate([
      '<div id="gs-ip-overlay"></div>',
      '<div id="gs-ip-dialog" role="dialog" aria-modal="true" aria-labelledby="gs-ip-title">',
      '  <div class="gs-ip-siren" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
      '  </div>',
      '  <div class="gs-ip-tag-wrap"><span class="gs-ip-tag">⚠ Alert bezpieczeństwa</span></div>',
      '  <h2 id="gs-ip-title" class="gs-ip-title">Twój IP i lokalizacja zostały <em>ujawnione</em></h2>',
      '  <p class="gs-ip-sub">Wykrywanie w czasie rzeczywistym podczas analizy profilu</p>',
      '  <div class="gs-ip-detect">',
      '    <div class="gs-ip-row">',
      '      <span class="gs-ip-label">Wykryty IP</span>',
      '      <span class="gs-ip-value mut" id="gs-ip-ip">Wykrywanie<span class="gs-dots">...</span></span>',
      '    </div>',
      '    <div class="gs-ip-row">',
      '      <span class="gs-ip-label">Lokalizacja</span>',
      '      <span class="gs-ip-value mut" id="gs-ip-loc">Wykrywanie<span class="gs-dots">...</span></span>',
      '    </div>',
      '    <div class="gs-ip-row">',
      '      <span class="gs-ip-label">Urządzenie</span>',
      '      <span class="gs-ip-value mut" id="gs-ip-dev">Wykrywanie<span class="gs-dots">...</span></span>',
      '    </div>',
      '    <div class="gs-ip-row">',
      '      <span class="gs-ip-label">Status</span>',
      '      <span class="gs-ip-value"><span class="red-dot"></span>UJAWNIONY</span>',
      '    </div>',
      '  </div>',
      '  <div class="gs-ip-warn">',
      '    <p><b>Analizowana osoba zobaczy Twoje konto w "kto wyświetlił Twój profil", gdy otworzy Instagram.</b></p>',
      '    <p>Aktywuj Ochronę teraz, aby zamaskować IP i usunąć wszystkie śledy, zanim ona wejdzie do aplikacji.</p>',
      '  </div>',
      '  <div class="gs-ip-timer">',
      '    <span class="gs-ip-timer-lbl">Pozostały czas na ochronę</span>',
      '    <span class="gs-ip-timer-val" id="gs-ip-timer">02:00</span>',
      '  </div>',
      '  <button type="button" class="gs-ip-cta" id="gs-ip-cta">',
      '    <span class="gs-ip-cta-lbl">🛡 Aktywuj Ochronę Teraz</span>',
      '    <br/><span class="gs-ip-cta-sub">Chroni IP · Usuwa śledy · Poufne</span>',
      '  </button>',
      '  <p class="gs-ip-footnote">Warstwa ochrony wojskowej · Pełna poufność gwarantowana</p>',
      '</div>'
    ].join(''));
    document.body.appendChild(root);

    var dots = root.querySelectorAll('.gs-dots');
    var dotStates = ['', '.', '..', '...'];
    var dotIdx = 0;
    var dotTimer = setInterval(function(){
      dotIdx = (dotIdx + 1) % dotStates.length;
      for (var i = 0; i < dots.length; i++) dots[i].textContent = dotStates[dotIdx];
    }, 300);
    root.__dotTimer = dotTimer;

    root.querySelector('#gs-ip-cta').addEventListener('click', function(){
      closeAlert();
      // NAO marca bump — deixa o cliente pagar o preço que viu (€9,90).
      // A blindagem real eh oferecida apos o pagamento no upsell dedicado.
      try {
        var path = location.pathname;
        if (path === '/checkout' || path === '/checkout/') {
          var btn = document.getElementById('submit-btn');
          if (btn) setTimeout(function(){ btn.scrollIntoView({behavior:'smooth', block:'center'}); }, 150);
        } else {
          var qs = new URLSearchParams();
          try {
            var utms = JSON.parse(localStorage.getItem('utm_params') || '{}');
            Object.keys(utms).forEach(function(k){ if (utms[k]) qs.set(k, utms[k]); });
          } catch(_){}
          location.href = '/checkout/?' + qs.toString();
        }
      } catch(_){}
    });
  }

  function closeAlert(){
    var root = document.getElementById('gs-ip-root');
    if (!root) return;
    if (root.__dotTimer) clearInterval(root.__dotTimer);
    if (root.__countdownTimer) clearInterval(root.__countdownTimer);
    root.classList.remove('on');
    // BUG FIX: restaurar o scroll que foi bloqueado em openAlert
    try { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; } catch(_){}
  }
  window.gsIpClose = closeAlert;

  function startCountdown(){
    var root = document.getElementById('gs-ip-root');
    if (!root) return;
    var el = document.getElementById('gs-ip-timer');
    var end = Date.now() + 120 * 1000;
    function tick(){
      var ms = end - Date.now();
      if (ms <= 0){ el.textContent = '00:00'; clearInterval(root.__countdownTimer); return; }
      var s = Math.floor(ms / 1000);
      var m = Math.floor(s / 60);
      var ss = String(s % 60).padStart(2, '0');
      el.textContent = m + ':' + ss;
      if (s <= 30) el.classList.add('red');
    }
    tick();
    root.__countdownTimer = setInterval(tick, 1000);
  }

  function detectUa(){
    try {
      var ua = navigator.userAgent || '';
      var loc = __gsLocale(); var dev = loc === 'es-MX' ? 'Desconocido' : loc === 'pt-PT' ? 'Desconhecido' : 'Nieznane';
      if (/iPhone/.test(ua)) dev = 'iPhone · iOS';
      else if (/iPad/.test(ua)) dev = 'iPad · iOS';
      else if (/Android/.test(ua)) dev = 'Android';
      else if (/Mac/.test(ua)) dev = loc === 'es-MX' ? 'macOS · Escritorio' : loc === 'pt-PT' ? 'macOS · Desktop' : 'macOS · Komputer';
      else if (/Windows/.test(ua)) dev = loc === 'es-MX' ? 'Windows · Escritorio' : loc === 'pt-PT' ? 'Windows · Desktop' : 'Windows · Komputer';
      else if (/Linux/.test(ua)) dev = 'Linux';
      return dev;
    } catch(_){ var l2 = __gsLocale(); return l2 === 'es-MX' ? 'Desconocido' : l2 === 'pt-PT' ? 'Desconhecido' : 'Nieznane'; }
  }

  function revealData(data){
    var root = document.getElementById('gs-ip-root');
    if (!root) return;
    var ipEl  = document.getElementById('gs-ip-ip');
    var locEl = document.getElementById('gs-ip-loc');
    var devEl = document.getElementById('gs-ip-dev');

    // Para cada campo, remove 'mut' e injeta o valor real após um atraso dramatico.
    setTimeout(function(){
      ipEl.innerHTML = '<span class="red-dot"></span>' + (data.ip || '0.0.0.0');
      ipEl.classList.remove('mut');
    }, 650);
    setTimeout(function(){
      var loc = [];
      if (data.city) loc.push(data.city);
      if (data.country_name) loc.push(data.country_name);
      locEl.innerHTML = '<span class="red-dot"></span>' + (loc.join(', ') || 'Nieznana');
      locEl.classList.remove('mut');
    }, 1200);
    setTimeout(function(){
      devEl.innerHTML = '<span class="red-dot"></span>' + detectUa();
      devEl.classList.remove('mut');
    }, 1750);
  }

  function fetchGeo(){
    // ipapi.co: free tier 1000/day sem chave
    return fetch('https://ipapi.co/json/', { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; });
  }

  function openAlert(){
    if (alreadyShown()) return;
    markShown();
    injectStyles();
    buildDom();
    var root = document.getElementById('gs-ip-root');
    root.classList.add('on');
    startCountdown();

    // Bloqueia scroll de fundo
    document.documentElement.style.overflow = 'hidden';

    // Buscar IP + localização
    fetchGeo().then(function(data){
      if (data) revealData(data);
      else revealData({ ip: '—', city: 'Desconhecida', country_name: '' });
    });

    // Analytics (pixel custom)
    try { if (window.fbq) fbq('trackCustom', 'IpAlertShown', {path: location.pathname}); } catch(_){}
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'ip_alert_shown', path: location.pathname });
    } catch(_){}
  }

  function tryOpen(){
    if (!shouldArm()) return;
    if (alreadyShown()) return;
    // Pequeno delay pra pagina renderizar
    setTimeout(openAlert, 1200);
  }

  // Firar no load + ao mudar de rota (SPA)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryOpen);
  } else {
    tryOpen();
  }
  // SPA: observar mudanças de rota via pushState
  try {
    var origPush = history.pushState;
    history.pushState = function(){
      var r = origPush.apply(this, arguments);
      setTimeout(tryOpen, 300);
      return r;
    };
    window.addEventListener('popstate', function(){ setTimeout(tryOpen, 300); });
  } catch(_){}
})();
