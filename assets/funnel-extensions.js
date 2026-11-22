(function () {
  const QUIZ_KEY = "ghostspy_quiz_completed_v1";
  const QUIZ_DATA_KEY = "ghostspy_quiz_data_v1";
  const VSL_KEY_PREFIX = "ghostspy_vsl_completed_";
  const VSL_ROUTE = "/vsl";
  const SKIP_VSL_FLOW = true;
  const REQUESTED_VSL_ON_LOAD = location.pathname === VSL_ROUTE;
  let pendingInitialVslBootstrap = REQUESTED_VSL_ON_LOAD && !SKIP_VSL_FLOW;
  if (REQUESTED_VSL_ON_LOAD) {
    if (SKIP_VSL_FLOW) {
      const params = new URLSearchParams(location.search);
      params.set("auto_login", "1");
      location.replace(`/?${params.toString()}`);
    } else {
      history.replaceState(
        { ghostspyVslBootstrap: true },
        "",
        `/${location.search || ""}`,
      );
    }
  }
  //remove o quiz
  sessionStorage.setItem(QUIZ_KEY, "1");
  sessionStorage.setItem(
    QUIZ_DATA_KEY,
    JSON.stringify({
      goals: ["dm", "media", "location", "feed"],
      gender: "homem",
      invisible: "sim",
    }),
  );
  const APP_ACCENT = "#0E82F8";
  const APP_ACCENT_2 = "#0D54A3";
  const APP_BG = "#F8FAFC";
  const APP_CARD = "#FFFFFF";
  const APP_TEXT = "#0F172A";
  const APP_MUTED = "#64748B";
  const APP_BORDER = "#E2E8F0";
  const LOCAL_IMAGE_PROXY = "/api/proxy/image-proxy.php?url=";
  const DEFAULT_VSL_EMBED_BASE =
    "https://scripts.converteai.net/d1eca794-9532-407d-999d-9c6685f29657/players/6a02666213e1196421810c92/v4/embed.html";
  const CONFIG_VIDEO_IFRAME_URL = window.GHOSTSPY_VSL_IFRAME_URL || "";
  const CONFIG_VIDEO_FILE_URL = window.GHOSTSPY_VSL_VIDEO_URL || "";
  const SLIDES = [
    {
      src: "/images/screenshots/fotoblur1.jpg",
      title: "Rastreamento de conversas privadas",
      caption: "IA cruzando conteúdos sensíveis e mensagens apagadas.",
    },
    {
      src: "/images/screenshots/chat2.nudes1.png",
      title: "Análise de mídias ocultas",
      caption: "Arquivos privados encontrados e classificados por prioridade.",
    },
    {
      src: "/images/screenshots/fundomaps.png",
      title: "Verificação de locais suspeitos",
      caption: "Comparando check-ins, horários e padrões de deslocamento.",
    },
  ];

  const QUIZ_ICONS = {
    dm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    feed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    male: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.6" y2="10.4"/><polyline points="14 5 19 5 19 10"/></svg>`,
    female: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    live: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2.8" fill="currentColor" stroke="none"/><path d="M5.5 12a6.5 6.5 0 0 1 13 0"/><path d="M3 12a9 9 0 0 1 18 0"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="8" r="4"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.8 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 8.5v5"/><circle cx="12" cy="16.6" r="1"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>`,
    tick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  let quizOpen = false;
  let vslOpen = false;
  let bypassConfirm = false;
  let activeQuizEl = null;
  let activeVslEl = null;
  let monitorStarted = false;
  let suppressVslUntil = 0;

  function ensureStyles() {
    if (document.getElementById("ghostspy-funnel-extensions-style")) return;
    const style = document.createElement("style");
    style.id = "ghostspy-funnel-extensions-style";
    style.textContent = `
            .ghostspy-ext-overlay {
                position: fixed;
                inset: 0;
                z-index: 2147483000;
                background:
                    radial-gradient(circle at top, rgba(14,130,248,0.06), transparent 45%),
                    linear-gradient(180deg, rgba(248,250,252,0.97), rgba(241,245,249,0.98));
                backdrop-filter: blur(8px);
                display: flex;
                justify-content: center;
                align-items: flex-start;
                overflow-y: auto;
                padding: 24px 16px 48px;
                box-sizing: border-box;
            }
            .ghostspy-ext-shell {
                width: min(100%, 420px);
                color: ${APP_TEXT};
                font-family: Inter, Roboto, system-ui, sans-serif;
            }
            .ghostspy-ext-card {
                background: ${APP_CARD};
                border: 1px solid ${APP_BORDER};
                border-radius: 28px;
                box-shadow: 0 24px 90px rgba(0,0,0,0.45);
                overflow: hidden;
            }
            .ghostspy-ext-pad {
                padding: 24px 22px;
            }
            .ghostspy-ext-logo {
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
            }
            .ghostspy-ext-logo img {
                width: 94px;
                height: auto;
                object-fit: contain;
            }
            .ghostspy-ext-title {
                margin: 0 0 10px;
                font-size: clamp(23px, 6vw, 32px);
                line-height: 1.18;
                font-weight: 800;
                text-align: center;
                letter-spacing: -0.03em;
            }
            .ghostspy-ext-subtitle {
                margin: 0 0 18px;
                color: ${APP_MUTED};
                text-align: center;
                font-size: 15px;
                line-height: 1.55;
            }
            .ghostspy-ext-progress {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 18px;
                color: ${APP_MUTED};
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }
            .ghostspy-ext-progress-bar {
                width: 100%;
                height: 8px;
                border-radius: 999px;
                background: #E2E8F0;
                overflow: hidden;
                margin-bottom: 16px;
            }
            .ghostspy-ext-progress-fill {
                height: 100%;
                width: 33.333%;
                border-radius: inherit;
                background: linear-gradient(135deg, ${APP_ACCENT}, ${APP_ACCENT_2});
                transition: width 0.25s ease;
            }
            .ghostspy-ext-option-grid {
                display: grid;
                gap: 12px;
            }
            .ghostspy-ext-option {
                width: 100%;
                border: 1.5px solid #E2E8F0;
                background: #FFFFFF;
                color: ${APP_TEXT};
                border-radius: 18px;
                padding: 14px 14px;
                text-align: left;
                font-size: 14px;
                line-height: 1.4;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 14px;
                transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
            }
            .ghostspy-ext-option:hover {
                transform: translateY(-1px);
                border-color: #60A5FA;
                background: #EFF6FF;
            }
            .ghostspy-ext-option:active {
                transform: translateY(0);
            }
            .ghostspy-ext-option.active {
                background: #EFF6FF;
                border-color: #0E82F8;
                box-shadow: inset 0 0 0 1px #0E82F8, 0 4px 14px rgba(14, 130, 248, 0.08);
            }
            .ghostspy-ext-option small {
                display: block;
                margin-top: 4px;
                color: ${APP_MUTED};
                font-size: 12px;
                font-weight: 500;
                line-height: 1.45;
            }
            .ghostspy-ext-option-content {
                min-width: 0;
                flex: 1;
            }
            .ghostspy-ext-option-label {
                display: block;
                font-weight: 700;
                font-size: 15px;
                line-height: 1.3;
                color: ${APP_TEXT};
            }
            .ghostspy-ext-option-icon {
                width: 38px;
                height: 38px;
                border-radius: 12px;
                flex: 0 0 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #F8FAFC;
                border: 1px solid #CBD5E1;
                color: #0E82F8;
                transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .ghostspy-ext-option-icon svg {
                width: 18px;
                height: 18px;
                display: block;
            }
            .ghostspy-ext-option.active .ghostspy-ext-option-icon {
                background: linear-gradient(135deg, #0E82F8, #0D54A3);
                border-color: #0E82F8;
                color: #fff;
                box-shadow: 0 6px 16px rgba(14,130,248,0.28);
            }
            .ghostspy-ext-option-check {
                width: 22px;
                height: 22px;
                border-radius: 999px;
                flex: 0 0 22px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: #F8FAFC;
                border: 1.5px solid #CBD5E1;
                color: #fff;
                transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .ghostspy-ext-option-check svg {
                width: 12px;
                height: 12px;
                display: block;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .ghostspy-ext-option.active .ghostspy-ext-option-check {
                background: #0E82F8;
                border-color: #0E82F8;
                box-shadow: 0 4px 12px rgba(14,130,248,0.28);
            }
            .ghostspy-ext-option.active .ghostspy-ext-option-check svg {
                opacity: 1;
            }
            .ghostspy-ext-actions {
                display: flex;
                gap: 10px;
                margin-top: 18px;
            }
            .ghostspy-ext-btn {
                appearance: none;
                border: none;
                cursor: pointer;
                border-radius: 18px;
                padding: 16px 18px;
                font-weight: 800;
                font-size: 15px;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }
            .ghostspy-ext-btn:hover {
                transform: translateY(-1px);
            }
            .ghostspy-ext-btn-primary {
                width: 100%;
                color: #fff;
                background: linear-gradient(135deg, ${APP_ACCENT}, ${APP_ACCENT_2});
                box-shadow: 0 10px 24px -4px rgba(14, 130, 248, 0.35);
            }
            .ghostspy-ext-btn-secondary {
                flex: 1;
                color: #334155;
                background: #F1F5F9;
                border: 1px solid #CBD5E1;
            }
            .ghostspy-ext-pill {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                border-radius: 999px;
                background: rgba(255,92,92,0.12);
                color: #ff6b6b;
                border: 1px solid rgba(255,107,107,0.2);
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 0.03em;
                margin: 0 auto 18px;
                max-width: 100%;
                text-align: center;
                white-space: normal;
            }
            .ghostspy-ext-pill svg {
                width: 14px;
                height: 14px;
                flex: 0 0 14px;
            }
            .ghostspy-ext-video-frame {
                position: relative;
                border-radius: 26px;
                overflow: hidden;
                background: #090d10;
                border: 1px solid #E2E8F0;
                margin-bottom: 18px;
                aspect-ratio: 16 / 9;
            }
            .ghostspy-ext-video-frame img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
                filter: saturate(1.05) contrast(1.02);
            }
            .ghostspy-ext-video-media {
                width: 100%;
                height: 100%;
                display: block;
                border: 0;
                object-fit: cover;
                background: #090d10;
            }
            .ghostspy-ext-video-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.42));
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 16px;
                box-sizing: border-box;
            }
            .ghostspy-ext-video-caption {
                align-self: flex-start;
                max-width: 78%;
                background: rgba(4,6,7,0.7);
                color: #fff;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 16px;
                padding: 12px 14px;
                font-size: 12px;
                line-height: 1.45;
            }
            .ghostspy-ext-video-play {
                width: 68px;
                height: 68px;
                border-radius: 999px;
                background: linear-gradient(135deg, #0E82F8, #0D54A3);
                box-shadow: 0 10px 24px rgba(14,130,248,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }
            .ghostspy-ext-video-play::before {
                content: "";
                display: block;
                margin-left: 4px;
                width: 0;
                height: 0;
                border-top: 10px solid transparent;
                border-bottom: 10px solid transparent;
                border-left: 16px solid #fff;
            }
            .ghostspy-ext-profile {
                display: grid;
                grid-template-columns: 64px minmax(0, 1fr);
                gap: 14px;
                align-items: start;
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 22px;
                padding: 14px;
                margin-bottom: 16px;
            }
            .ghostspy-ext-profile-avatar-wrap {
                position: relative;
                width: 64px;
                height: 64px;
            }
            .ghostspy-ext-profile-avatar-wrap::after {
                content: "";
                position: absolute;
                inset: -3px;
                border-radius: 50%;
                border: 1px solid #BFDBFE;
                pointer-events: none;
            }
            .ghostspy-ext-profile img {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                object-fit: cover;
                background: #F1F5F9;
            }
            .ghostspy-ext-profile-avatar-fallback {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                background: #EFF6FF;
                border: 1px solid #E2E8F0;
            }
            .ghostspy-ext-profile-avatar-fallback svg {
                width: 22px;
                height: 22px;
            }
            .ghostspy-ext-profile-main {
                min-width: 0;
            }
            .ghostspy-ext-profile h3 {
                margin: 0 0 4px;
                font-size: 18px;
                line-height: 1.1;
            }
            .ghostspy-ext-profile p {
                margin: 0;
                color: ${APP_MUTED};
                font-size: 12px;
                line-height: 1.35;
            }
            .ghostspy-ext-metrics {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                margin-top: 10px;
            }
            .ghostspy-ext-metric {
                text-align: center;
                background: #FFFFFF;
                border-radius: 14px;
                padding: 10px 8px;
                border: 1px solid #E2E8F0;
            }
            .ghostspy-ext-metric strong {
                display: block;
                font-size: 15px;
                color: ${APP_TEXT};
            }
            .ghostspy-ext-metric span {
                display: block;
                font-size: 11px;
                color: ${APP_MUTED};
                margin-top: 4px;
            }
            .ghostspy-ext-analysis {
                margin-bottom: 18px;
            }
            .ghostspy-ext-analysis-row {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 16px;
                border-radius: 18px;
                border: 1px solid #E2E8F0;
                background: #FFFFFF;
                margin-bottom: 10px;
            }
            .ghostspy-ext-analysis-row:not(:first-child) {
                display: none;
            }
            .ghostspy-ext-analysis-row strong {
                display: block;
                margin-bottom: 4px;
                font-size: 14px;
            }
            .ghostspy-ext-analysis-copy {
                min-width: 0;
                flex: 1;
            }
            .ghostspy-ext-analysis-row span {
                color: ${APP_MUTED};
                font-size: 12px;
                line-height: 1.45;
            }
            .ghostspy-ext-analysis-badge {
                min-width: 40px;
                height: 40px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: 800;
                background: #EFF6FF;
                color: #0E82F8;
                border: 1px solid #BFDBFE;
                flex: 0 0 40px;
            }
            .ghostspy-ext-analysis-badge svg {
                width: 18px;
                height: 18px;
            }
            .ghostspy-ext-analysis-badge.is-status {
                background: linear-gradient(135deg, rgba(14,130,248,0.25), rgba(13,84,163,0.15));
                color: #fff;
            }
            .ghostspy-ext-analysis-badge.is-alert {
                color: #ff8c98;
                background: rgba(255,95,109,0.12);
                border-color: rgba(255,95,109,0.18);
            }
            .ghostspy-ext-final-warning {
                border: 1px solid rgba(255,74,91,0.45);
                background: linear-gradient(135deg, rgba(255,74,91,0.14), rgba(14,130,248,0.06));
                border-radius: 14px;
                padding: 14px;
                margin: 0 0 12px;
            }
            .ghostspy-ext-final-warning strong {
                display: block;
                color: #ff5f6d;
                font-size: 13px;
                margin-bottom: 8px;
                letter-spacing: 0.02em;
                text-transform: uppercase;
            }
            .ghostspy-ext-final-warning p {
                margin: 0;
                color: #f3f4f6;
                font-size: 12px;
                line-height: 1.45;
            }
            .ghostspy-ext-section-title {
                margin: 16px 0 10px;
                font-size: 15px;
                color: ${APP_TEXT};
            }
            .ghostspy-ext-suspect-grid {
                display: grid;
                gap: 12px;
                margin-bottom: 16px;
            }
            .ghostspy-ext-suspect-card {
                border: 1px solid rgba(255,74,91,0.38);
                background: linear-gradient(135deg, rgba(255,74,91,0.10), rgba(14,130,248,0.05));
                border-radius: 14px;
                padding: 14px;
            }
            .ghostspy-ext-suspect-head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 8px;
            }
            .ghostspy-ext-suspect-label {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }
            .ghostspy-ext-suspect-icon,
            .ghostspy-ext-suspect-flag {
                width: 32px;
                height: 32px;
                border-radius: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 32px;
            }
            .ghostspy-ext-suspect-icon {
                color: #ffd2d7;
                background: #F1F5F9;
                border: 1px solid #E2E8F0;
            }
            .ghostspy-ext-suspect-icon svg,
            .ghostspy-ext-suspect-flag svg {
                width: 16px;
                height: 16px;
            }
            .ghostspy-ext-suspect-head strong {
                color: ${APP_TEXT};
                font-size: 14px;
                line-height: 1.25;
            }
            .ghostspy-ext-suspect-flag {
                color: #ff7a86;
                background: rgba(255,95,109,0.12);
                border: 1px solid rgba(255,95,109,0.18);
            }
            .ghostspy-ext-suspect-result {
                color: #ff6472;
                font-size: 12px;
                font-weight: 700;
                min-height: 18px;
                margin-bottom: 8px;
                line-height: 1.45;
            }
            .ghostspy-ext-suspect-progress {
                height: 6px;
                border-radius: 999px;
                background: rgba(255,255,255,0.1);
                overflow: hidden;
            }
            .ghostspy-ext-suspect-progress div {
                width: 0;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg, #ff4f6d, ${APP_ACCENT_2}, #2d8cff);
                transition: width 0.45s linear;
            }
            .ghostspy-ext-suspect-preview {
                display: none;
                gap: 8px;
                margin-top: 10px;
            }
            .ghostspy-ext-suspect-card.complete .ghostspy-ext-suspect-preview {
                display: grid;
            }
            .ghostspy-ext-suspect-preview[data-preview="single"] {
                grid-template-columns: 40px minmax(0, 1fr);
                align-items: start;
            }
            .ghostspy-ext-suspect-preview[data-preview="single"] p {
                margin: 0;
                color: #f3f4f6;
                font-size: 12px;
                line-height: 1.45;
            }
            .ghostspy-ext-suspect-preview[data-preview="media"] {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .ghostspy-ext-preview-tile {
                min-height: 56px;
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(61,75,92,0.9), rgba(20,28,37,0.96));
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffd166;
                font-size: 18px;
            }
            .ghostspy-ext-preview-tile svg {
                width: 18px;
                height: 18px;
            }
            .ghostspy-ext-location-result {
                border: 1px solid rgba(255,74,91,0.36);
                background: rgba(255,74,91,0.08);
                border-radius: 12px;
                padding: 12px;
                color: ${APP_TEXT};
                font-size: 12px;
                line-height: 1.35;
                display: grid;
                grid-template-columns: 30px minmax(0, 1fr);
                gap: 10px;
                align-items: start;
            }
            .ghostspy-ext-location-result svg {
                width: 16px;
                height: 16px;
                color: #ff8c98;
                margin-top: 2px;
            }
            .ghostspy-ext-location-result p {
                margin: 3px 0 0;
                color: ${APP_MUTED};
            }
            .ghostspy-ext-final-cta {
                margin: 12px 0 16px;
                border-radius: 14px;
                background: linear-gradient(135deg, #0E82F8, #0D54A3);
                box-shadow: 0 10px 24px rgba(14,130,248,0.35);
                color: #fff;
                border: 0;
                width: 100%;
                padding: 18px 16px;
                font-weight: 900;
                font-size: 14px;
                cursor: pointer;
            }
            .ghostspy-ext-footer-note {
                color: ${APP_MUTED};
                font-size: 12px;
                line-height: 1.5;
                text-align: center;
            }
            .ghostspy-ext-hidden {
                display: none !important;
            }
            @media (max-width: 480px) {
                .ghostspy-ext-overlay {
                    padding: 14px 10px 28px;
                }
                .ghostspy-ext-shell {
                    width: min(100%, 390px);
                }
                .ghostspy-ext-card {
                    border-radius: 22px;
                }
                .ghostspy-ext-pad {
                    padding: 18px 14px 20px;
                }
                .ghostspy-ext-logo {
                    margin-bottom: 16px;
                }
                .ghostspy-ext-logo img {
                    width: 84px;
                }
                .ghostspy-ext-pill {
                    gap: 6px;
                    padding: 8px 12px;
                    margin-bottom: 14px;
                    font-size: 10.5px;
                }
                .ghostspy-ext-pill svg {
                    width: 12px;
                    height: 12px;
                    flex-basis: 12px;
                }
                .ghostspy-ext-title {
                    font-size: clamp(21px, 7vw, 27px);
                    margin-bottom: 8px;
                }
                .ghostspy-ext-subtitle {
                    font-size: 13px;
                    margin: 0 0 14px;
                }
                .ghostspy-ext-progress {
                    font-size: 11px;
                    margin-bottom: 14px;
                }
                .ghostspy-ext-progress-bar {
                    margin-bottom: 14px;
                }
                .ghostspy-ext-video-frame {
                    border-radius: 18px;
                    margin-bottom: 14px;
                }
                .ghostspy-ext-video-overlay {
                    padding: 12px;
                }
                .ghostspy-ext-video-caption {
                    max-width: 100%;
                    padding: 10px 12px;
                    font-size: 11px;
                }
                .ghostspy-ext-video-play {
                    width: 54px;
                    height: 54px;
                }
                .ghostspy-ext-video-play::before {
                    border-top-width: 8px;
                    border-bottom-width: 8px;
                    border-left-width: 13px;
                }
                .ghostspy-ext-option-grid {
                    gap: 10px;
                }
                .ghostspy-ext-option {
                    padding: 12px 12px;
                    border-radius: 16px;
                    gap: 12px;
                }
                .ghostspy-ext-option-icon {
                    width: 34px;
                    height: 34px;
                    flex: 0 0 34px;
                    border-radius: 10px;
                }
                .ghostspy-ext-option-icon svg {
                    width: 16px;
                    height: 16px;
                }
                .ghostspy-ext-option-label {
                    font-size: 14px;
                }
                .ghostspy-ext-option small {
                    font-size: 11.5px;
                }
                .ghostspy-ext-option-check {
                    width: 20px;
                    height: 20px;
                    flex: 0 0 20px;
                }
                .ghostspy-ext-profile {
                    grid-template-columns: 52px minmax(0, 1fr);
                    gap: 10px;
                    padding: 12px;
                    border-radius: 18px;
                }
                .ghostspy-ext-profile-avatar-wrap,
                .ghostspy-ext-profile img,
                .ghostspy-ext-profile-avatar-fallback {
                    width: 52px;
                    height: 52px;
                }
                .ghostspy-ext-profile h3 {
                    font-size: 16px;
                }
                .ghostspy-ext-profile p {
                    font-size: 11.5px;
                }
                .ghostspy-ext-metrics {
                    gap: 6px;
                    margin-top: 8px;
                }
                .ghostspy-ext-metric {
                    padding: 8px 6px;
                    border-radius: 12px;
                }
                .ghostspy-ext-metric strong {
                    font-size: 13px;
                }
                .ghostspy-ext-metric span {
                    font-size: 10px;
                }
                .ghostspy-ext-analysis {
                    margin-bottom: 16px;
                }
                .ghostspy-ext-analysis-row {
                    padding: 12px;
                    border-radius: 16px;
                    gap: 10px;
                }
                .ghostspy-ext-analysis-row strong {
                    font-size: 13.5px;
                }
                .ghostspy-ext-analysis-row span {
                    font-size: 11.5px;
                }
                .ghostspy-ext-analysis-badge {
                    min-width: 36px;
                    height: 36px;
                    flex-basis: 36px;
                    border-radius: 10px;
                }
                .ghostspy-ext-analysis-badge svg {
                    width: 16px;
                    height: 16px;
                }
                .ghostspy-ext-section-title {
                    margin: 14px 0 10px;
                    font-size: 14px;
                }
                .ghostspy-ext-suspect-grid {
                    gap: 10px;
                }
                .ghostspy-ext-suspect-card {
                    padding: 12px;
                    border-radius: 16px;
                }
                .ghostspy-ext-suspect-icon,
                .ghostspy-ext-suspect-flag {
                    width: 28px;
                    height: 28px;
                    flex-basis: 28px;
                    border-radius: 10px;
                }
                .ghostspy-ext-suspect-icon svg,
                .ghostspy-ext-suspect-flag svg {
                    width: 14px;
                    height: 14px;
                }
                .ghostspy-ext-suspect-head strong {
                    font-size: 13px;
                }
                .ghostspy-ext-suspect-result {
                    font-size: 11.5px;
                    margin-bottom: 7px;
                }
                .ghostspy-ext-suspect-preview {
                    gap: 6px;
                    margin-top: 8px;
                }
                .ghostspy-ext-suspect-preview[data-preview="single"] {
                    grid-template-columns: 36px minmax(0, 1fr);
                }
                .ghostspy-ext-suspect-preview[data-preview="single"] p {
                    font-size: 11.5px;
                }
                .ghostspy-ext-preview-tile {
                    min-height: 48px;
                    border-radius: 10px;
                }
                .ghostspy-ext-location-result {
                    grid-template-columns: 28px minmax(0, 1fr);
                    gap: 8px;
                    padding: 10px;
                    font-size: 11.5px;
                }
                .ghostspy-ext-footer-note {
                    font-size: 11.5px;
                }
                .ghostspy-ext-actions {
                    gap: 8px;
                    margin-top: 16px;
                }
                .ghostspy-ext-btn {
                    padding: 15px 16px;
                    font-size: 14.5px;
                    border-radius: 14px;
                }
            }
            @media (max-width: 360px) {
                .ghostspy-ext-pad {
                    padding: 16px 12px 18px;
                }
                .ghostspy-ext-pill {
                    width: 100%;
                    font-size: 10px;
                }
                .ghostspy-ext-title {
                    font-size: 21px;
                }
                .ghostspy-ext-subtitle {
                    font-size: 12.5px;
                }
                .ghostspy-ext-profile {
                    grid-template-columns: 48px minmax(0, 1fr);
                    gap: 8px;
                }
                .ghostspy-ext-profile-avatar-wrap,
                .ghostspy-ext-profile img,
                .ghostspy-ext-profile-avatar-fallback {
                    width: 48px;
                    height: 48px;
                }
                .ghostspy-ext-profile h3 {
                    font-size: 15px;
                }
                .ghostspy-ext-option {
                    padding: 11px 11px;
                    gap: 10px;
                }
                .ghostspy-ext-option-icon {
                    width: 32px;
                    height: 32px;
                    flex: 0 0 32px;
                }
                .ghostspy-ext-option-label {
                    font-size: 13.5px;
                }
                .ghostspy-ext-option small {
                    font-size: 11px;
                }
                .ghostspy-ext-btn {
                    padding: 14px 14px;
                    font-size: 14px;
                }
                .ghostspy-ext-suspect-head {
                    gap: 8px;
                }
                .ghostspy-ext-suspect-label {
                    gap: 8px;
                }
            }
        `;
    document.head.appendChild(style);
  }

  function normalizeText(value) {
    return (value || "")
      .replace(/\s+/g, " ")
      .replace(/\u00a0/g, " ")
      .trim()
      .toLowerCase();
  }

  function readText(node) {
    return normalizeText(node ? node.textContent : "");
  }

  function getQuizData() {
    try {
      return JSON.parse(sessionStorage.getItem(QUIZ_DATA_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function setQuizData(data) {
    sessionStorage.setItem(QUIZ_DATA_KEY, JSON.stringify(data));
  }

  function getSpyButton() {
    return Array.from(document.querySelectorAll("button")).find((button) =>
      readText(button).includes("analisar agora"),
    );
  }

  function getConfirmButton() {
    if (
      !document.body ||
      !document.body.innerText.includes("Confirme o Instagram")
    ) {
      return null;
    }
    return Array.from(document.querySelectorAll("button")).find(
      (button) => readText(button) === "confirmar",
    );
  }

  function getUsernameInputVisible() {
    return Array.from(document.querySelectorAll("input")).find((input) =>
      normalizeText(input.getAttribute("placeholder")).includes(
        "nomedoconjuge_10",
      ),
    );
  }

  function formatCount(value, label) {
    if (!value) return "";
    return `<div class="ghostspy-ext-metric"><strong>${value}</strong><span>${label}</span></div>`;
  }

  function isInstagramCdnUrl(url) {
    return (
      typeof url === "string" &&
      (url.includes("fbcdn.net") || url.includes("cdninstagram.com"))
    );
  }

  function proxifyImage(url) {
    if (!url || typeof url !== "string") return "";
    // Limpa URLs antigas do worker morto (cache localStorage pre-fix).
    if (url.includes("projetinho-solo.workers.dev") || url.includes("userfounded.workers.dev")) {
      try {
        const q = new URL(url).searchParams.get("url");
        if (q) url = q;
      } catch { return ""; }
    }
    if (url.startsWith(LOCAL_IMAGE_PROXY)) return url;
    if (isInstagramCdnUrl(url))
      return `${LOCAL_IMAGE_PROXY}${encodeURIComponent(url)}`;
    return url;
  }

  function getStoredProfile() {
    try {
      return JSON.parse(localStorage.getItem("instagram_profile") || "{}");
    } catch {
      return {};
    }
  }

  function resolveProfileImage(rawImage) {
    const stored = getStoredProfile();
    const candidates = [
      rawImage,
      stored.profile_pic_url,
      stored.profile_pic_url_hd,
      "/images/avatars/perfil-sem-foto.jpeg",
    ].filter(Boolean);

    for (const candidate of candidates) {
      const proxied = proxifyImage(candidate);
      if (proxied && proxied !== "about:blank") {
        return proxied;
      }
    }

    return "/images/avatars/perfil-sem-foto.jpeg";
  }

  function getDefaultVslUrl() {
    const search = location.search || "?";
    return `${DEFAULT_VSL_EMBED_BASE}${search}&vl=${encodeURIComponent(location.href)}`;
  }

  function ensureVslSdk() {
    if (document.getElementById("ghostspy-vturb-sdk")) return;
    const script = document.createElement("script");
    script.id = "ghostspy-vturb-sdk";
    script.src =
      "https://scripts.converteai.net/lib/js/smartplayer-wc/v4/sdk.js";
    script.async = true;
    document.head.appendChild(script);
  }

  function renderVslMedia() {
    if (CONFIG_VIDEO_IFRAME_URL) {
      ensureVslSdk();
      return `
                <iframe
                    src="${CONFIG_VIDEO_IFRAME_URL}"
                    class="ghostspy-ext-video-media"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowfullscreen
                    referrerpolicy="origin"
                ></iframe>
            `;
    }

    if (CONFIG_VIDEO_FILE_URL) {
      return `
                <video
                    class="ghostspy-ext-video-media"
                    src="${CONFIG_VIDEO_FILE_URL}"
                    autoplay
                    muted
                    loop
                    playsinline
                    controls
                ></video>
            `;
    }

    ensureVslSdk();
    return `
            <iframe
                src="${getDefaultVslUrl()}"
                class="ghostspy-ext-video-media"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowfullscreen
                referrerpolicy="origin"
            ></iframe>
        `;
  }

  function extractProfileData() {
    const bodyText = document.body ? document.body.innerText : "";
    const usernameMatch = bodyText.match(/@([a-zA-Z0-9._]+)/);
    const metrics = Array.from(document.querySelectorAll("p"))
      .map((p) => p.textContent.trim())
      .filter(Boolean);

    const numericValues = metrics.filter((value) =>
      /^(\d{1,3}(\.\d{3})*|\d{1,3}(,\d)?\s?(mi|mil)?|\d+)$/.test(
        value.toLowerCase(),
      ),
    );

    const profileImage =
      Array.from(document.querySelectorAll("img")).find((img) =>
        normalizeText(img.alt).includes("foto de perfil"),
      ) || null;

    const imageCandidates = [
      profileImage ? profileImage.currentSrc : "",
      profileImage ? profileImage.getAttribute("src") : "",
      profileImage ? profileImage.getAttribute("data-src") : "",
    ].filter(Boolean);

    return {
      username: usernameMatch ? usernameMatch[1] : "perfil_privado",
      image: resolveProfileImage(
        profileImage
          ? profileImage.currentSrc ||
          profileImage.getAttribute("src") ||
          profileImage.src
          : "",
      ),
      imageCandidates,
      posts: numericValues[0] || "8.436",
      followers: numericValues[1] || "685,7 mi",
      following: numericValues[2] || "188",
    };
  }

  function getProfileFromStorageOrUrl() {
    const params = new URLSearchParams(location.search);
    const stored = getStoredProfile();
    const username =
      params.get("username") ||
      stored.username ||
      localStorage.getItem("espionado_username") ||
      "perfil_privado";

    return {
      username: username.replace(/^@+/, ""),
      image: resolveProfileImage(
        stored.profile_pic_url || stored.profile_pic_url_hd || "",
      ),
      imageCandidates: [
        stored.profile_pic_url,
        stored.profile_pic_url_hd,
      ].filter(Boolean),
      posts: stored.media_count || stored.posts || "8.436",
      followers: stored.follower_count || stored.followers || "685,7 mi",
      following: stored.following_count || stored.following || "188",
    };
  }

  function openVslRoute(profile) {
    if (location.pathname === VSL_ROUTE) return;
    const username =
      profile && profile.username
        ? `?username=${encodeURIComponent(profile.username)}`
        : "";
    history.pushState({ ghostspyVsl: true }, "", `${VSL_ROUTE}${username}`);
  }

  function buildAvatarCandidates(profile) {
    const stored = getStoredProfile();
    const rawCandidates = [
      ...(Array.isArray(profile.imageCandidates)
        ? profile.imageCandidates
        : []),
      profile.image,
      stored.profile_pic_url,
      stored.profile_pic_url_hd,
      "/images/avatars/perfil-sem-foto.jpeg",
    ].filter(Boolean);

    const uniqueCandidates = [];
    const seen = new Set();

    for (const candidate of rawCandidates) {
      const proxied = proxifyImage(candidate);
      if (!proxied || seen.has(proxied)) continue;
      seen.add(proxied);
      uniqueCandidates.push(proxied);
    }

    return uniqueCandidates;
  }

  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  async function hydrateProfileAvatar(avatarImage, avatarFallback, candidates) {
    if (!avatarImage) return;

    for (const candidate of candidates) {
      try {
        await preloadImage(candidate);
        avatarImage.src = candidate;
        avatarImage.style.display = "block";
        if (avatarFallback) avatarFallback.style.display = "none";
        return;
      } catch { }
    }

    avatarImage.src = "/images/avatars/perfil-sem-foto.jpeg";
    avatarImage.style.display = "block";
    if (avatarFallback) avatarFallback.style.display = "none";
  }

  function removeQuiz() {
    quizOpen = false;
    if (activeQuizEl) {
      activeQuizEl.remove();
      activeQuizEl = null;
    }
  }

  function removeVsl() {
    vslOpen = false;
    if (activeVslEl) {
      activeVslEl.remove();
      activeVslEl = null;
    }
  }

  function completeQuiz() {
    sessionStorage.setItem(QUIZ_KEY, "1");
    removeQuiz();
    const spyButton = getSpyButton();
    if (spyButton) {
      setTimeout(() => spyButton.click(), 120);
    }
  }

  function renderQuizStepContent(step, data) {
    if (step === 1) {
      const selected = new Set(
        data.goals || ["dm", "media", "location", "feed"],
      );
      return {
        title: "O que você quer descobrir?",
        subtitle:
          "O sistema já deixou tudo pronto. Escolha quais áreas você quer liberar primeiro na análise desse Instagram.",
        body: `
                    <div class="ghostspy-ext-option-grid" data-quiz-options>
                        ${[
            [
              "dm",
              "Mensagens apagadas e DMs do Instagram",
              "Conversas ocultas, mensagens removidas e sinais suspeitos.",
              QUIZ_ICONS.dm,
            ],
            [
              "media",
              "Fotos e vídeos privados",
              "Mídias sensíveis detectadas em trocas recentes.",
              QUIZ_ICONS.media,
            ],
            [
              "location",
              "Localizações suspeitas",
              "Check-ins e deslocamentos que merecem atenção.",
              QUIZ_ICONS.location,
            ],
            [
              "feed",
              "Feed, Stories e interações",
              "Stories ocultos, curtidas e comportamento no perfil.",
              QUIZ_ICONS.feed,
            ],
          ]
            .map(
              ([value, label, hint, icon]) => `
                                    <button type="button" class="ghostspy-ext-option ${selected.has(value) ? "active" : ""}" data-quiz-goal="${value}" aria-pressed="${selected.has(value) ? "true" : "false"}">
                                        <span class="ghostspy-ext-option-icon">${icon}</span>
                                        <span class="ghostspy-ext-option-content">
                                            <span class="ghostspy-ext-option-label">${label}</span>
                                            <small>${hint}</small>
                                        </span>
                                        <span class="ghostspy-ext-option-check" aria-hidden="true">${QUIZ_ICONS.tick}</span>
                                    </button>
                                `,
            )
            .join("")}
                    </div>
                    <div class="ghostspy-ext-actions">
                        <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-primary" data-quiz-next onclick="window.dataLayer.push({'event': 'quiz_next_1'});">Confirmar e avançar</button>
                    </div>
                `,
        afterRender(container) {
          container.querySelectorAll("[data-quiz-goal]").forEach((button) => {
            button.addEventListener("click", () => {
              const goals = new Set(
                getQuizData().goals || ["dm", "media", "location", "feed"],
              );
              const goal = button.getAttribute("data-quiz-goal");
              if (goals.has(goal)) {
                goals.delete(goal);
              } else {
                goals.add(goal);
              }
              if (goals.size === 0) goals.add(goal);
              setQuizData({ ...getQuizData(), goals: Array.from(goals) });
              renderQuiz(1);
            });
          });
        },
      };
    }

    if (step === 2) {
      const gender = data.gender || "homem";
      return {
        title: "Quem você quer analisar?",
        subtitle:
          "Isso ajuda a personalizar a sequência de verificação e o tipo de alerta mostrado no relatório.",
        body: `
                    <div class="ghostspy-ext-option-grid">
                        <button type="button" class="ghostspy-ext-option ${gender === "homem" ? "active" : ""}" data-quiz-gender="homem" aria-pressed="${gender === "homem" ? "true" : "false"}">
                            <span class="ghostspy-ext-option-icon">${QUIZ_ICONS.male}</span>
                            <span class="ghostspy-ext-option-content">
                                <span class="ghostspy-ext-option-label">Homem</span>
                                <small>Mensagens, mídias e locais filtrados para perfis masculinos.</small>
                            </span>
                        </button>
                        <button type="button" class="ghostspy-ext-option ${gender === "mulher" ? "active" : ""}" data-quiz-gender="mulher" aria-pressed="${gender === "mulher" ? "true" : "false"}">
                            <span class="ghostspy-ext-option-icon">${QUIZ_ICONS.female}</span>
                            <span class="ghostspy-ext-option-content">
                                <span class="ghostspy-ext-option-label">Mulher</span>
                                <small>Fluxo ajustado para perfis femininos e interações associadas.</small>
                            </span>
                        </button>
                    </div>
                    <div class="ghostspy-ext-actions">
                        <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-secondary" data-quiz-back>Voltar</button>
                        <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-primary" data-quiz-next onclick="window.dataLayer.push({'event': 'quiz_next_2'});">Continuar</button>
                    </div>
                `,
        afterRender(container) {
          container.querySelectorAll("[data-quiz-gender]").forEach((button) => {
            button.addEventListener("click", () => {
              setQuizData({
                ...getQuizData(),
                gender: button.getAttribute("data-quiz-gender"),
              });
              renderQuiz(2);
            });
          });
        },
      };
    }

    const invisible = data.invisible || "sim";
    return {
      title: "Ativar modo invisível?",
      subtitle:
        "Com o modo invisível, a análise fica mais discreta e a experiência prioriza alertas silenciosos no relatório.",
      body: `
                <div class="ghostspy-ext-option-grid">
                    <button type="button" class="ghostspy-ext-option ${invisible === "sim" ? "active" : ""}" data-quiz-invisible="sim" aria-pressed="${invisible === "sim" ? "true" : "false"}">
                        <span class="ghostspy-ext-option-icon">${QUIZ_ICONS.eyeOff}</span>
                        <span class="ghostspy-ext-option-content">
                            <span class="ghostspy-ext-option-label">Sim, quero análise 100% invisível</span>
                            <small>Esconde rastros visuais e prioriza alertas silenciosos.</small>
                        </span>
                    </button>
                    <button type="button" class="ghostspy-ext-option ${invisible === "nao" ? "active" : ""}" data-quiz-invisible="nao" aria-pressed="${invisible === "nao" ? "true" : "false"}">
                        <span class="ghostspy-ext-option-icon">${QUIZ_ICONS.eye}</span>
                        <span class="ghostspy-ext-option-content">
                            <span class="ghostspy-ext-option-label">Não precisa</span>
                            <small>Segue com a configuração padrão do relatório.</small>
                        </span>
                    </button>
                </div>
                <div class="ghostspy-ext-actions">
                    <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-secondary" data-quiz-back>Voltar</button>
                    <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-primary" data-quiz-finish onclick="window.dataLayer.push({'event': 'quiz_next_3'});">Começar análise</button>
                </div>
            `,
      afterRender(container) {
        container
          .querySelectorAll("[data-quiz-invisible]")
          .forEach((button) => {
            button.addEventListener("click", () => {
              setQuizData({
                ...getQuizData(),
                invisible: button.getAttribute("data-quiz-invisible"),
              });
              renderQuiz(3);
            });
          });
      },
    };
  }

  function renderQuiz(step) {
    if (!activeQuizEl) return;
    const data = getQuizData();
    const view = renderQuizStepContent(step, data);
    activeQuizEl.innerHTML = `
            <div class="ghostspy-ext-shell">
                <div class="ghostspy-ext-card">
                    <div class="ghostspy-ext-pad">
                        <div class="ghostspy-ext-logo">
                            <img src="/images/logos/logo-vert-transparente.png?v=20261103" alt="GhostSpy Logo" />
                        </div>
                        <div class="ghostspy-ext-progress">
                            <span>Etapa ${step} de 3</span>
                            <span>Pré-análise</span>
                        </div>
                        <div class="ghostspy-ext-progress-bar">
                            <div class="ghostspy-ext-progress-fill" style="width: ${step * 33.333}%;"></div>
                        </div>
                        <h2 class="ghostspy-ext-title">${view.title}</h2>
                        <p class="ghostspy-ext-subtitle">${view.subtitle}</p>
                        ${view.body}
                    </div>
                </div>
            </div>
        `;

    const backButton = activeQuizEl.querySelector("[data-quiz-back]");
    const nextButton = activeQuizEl.querySelector("[data-quiz-next]");
    const finishButton = activeQuizEl.querySelector("[data-quiz-finish]");

    if (backButton) {
      backButton.addEventListener("click", () => renderQuiz(step - 1));
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => renderQuiz(step + 1));
    }
    if (finishButton) {
      finishButton.addEventListener("click", completeQuiz);
    }
    if (typeof view.afterRender === "function") {
      view.afterRender(activeQuizEl);
    }
  }

  function showQuiz() {
    if (quizOpen || sessionStorage.getItem(QUIZ_KEY) === "1") return;
    quizOpen = true;
    ensureStyles();

    const defaults = getQuizData();
    if (!defaults.goals) {
      setQuizData({
        goals: ["dm", "media", "location", "feed"],
        gender: "homem",
        invisible: "sim",
        ...defaults,
      });
    }

    activeQuizEl = document.createElement("div");
    activeQuizEl.className = "ghostspy-ext-overlay";
    document.body.appendChild(activeQuizEl);
    renderQuiz(1);
  }

  function proceedAfterConfirm(profile, originalButton) {
    pendingInitialVslBootstrap = false;
    suppressVslUntil = Date.now() + 30000;
    sessionStorage.setItem(`${VSL_KEY_PREFIX}${profile.username}`, "1");
    if (location.pathname === VSL_ROUTE) {
      history.replaceState({}, "", `/${location.search || ""}`);
    }
    removeVsl();
    bypassConfirm = true;
    const button =
      originalButton && document.body.contains(originalButton)
        ? originalButton
        : getConfirmButton();
    if (button) {
      setTimeout(() => {
        button.click();
        setTimeout(() => {
          bypassConfirm = false;
        }, 450);
      }, 80);
    } else {
      bypassConfirm = false;
      location.href = "/?auto_login=1";
    }
  }

  function showVsl(profile, originalButton, options = {}) {
    if (vslOpen) return;
    vslOpen = true;
    pendingInitialVslBootstrap = false;
    ensureStyles();
    if (!options.standalone) {
      openVslRoute(profile);
    }

    const totalDurationMs = 5 * 60 * 1000;
    const progressStart = Date.now();
    let progress = 2;
    let slideIndex = 0;
    let autoAdvance = false;
    const avatarCandidates = buildAvatarCandidates(profile);
    const avatarTarget = resolveProfileImage(profile.image);
    const hasRealVslMedia = Boolean(
      CONFIG_VIDEO_IFRAME_URL ||
      CONFIG_VIDEO_FILE_URL ||
      DEFAULT_VSL_EMBED_BASE,
    );
    const statusMessages = [
      "Estabelecendo conexão segura com o perfil analisado...",
      "Sincronizando histórico do Direct e mídias privadas...",
      "Aplicando IA para detectar padrões suspeitos...",
      "Indexando mensagens, arquivos e localizações relevantes...",
      "Finalizando a prévia segura do relatório...",
    ];

    activeVslEl = document.createElement("div");
    activeVslEl.className = "ghostspy-ext-overlay";
    activeVslEl.innerHTML = `
            <div class="ghostspy-ext-shell">
                <div class="ghostspy-ext-card">
                    <div class="ghostspy-ext-pad">
                        <div class="ghostspy-ext-pill">${QUIZ_ICONS.live}<span>ANÁLISE EM TEMPO REAL</span></div>
                        <h2 class="ghostspy-ext-title">Assista à análise enquanto o perfil é processado</h2>
                        <p class="ghostspy-ext-subtitle">Estamos cruzando mensagens, mídias privadas e localizações do perfil <strong>@${profile.username}</strong> para montar a próxima etapa do acesso.</p>
                        <div class="ghostspy-ext-video-frame">
                            ${renderVslMedia()}
                            <div class="ghostspy-ext-video-overlay${hasRealVslMedia ? " ghostspy-ext-hidden" : ""}">
                                <div class="ghostspy-ext-video-caption" data-vsl-caption>
                                    <strong>${SLIDES[0].title}</strong><br />
                                    ${SLIDES[0].caption}
                                </div>
                                <div class="ghostspy-ext-video-play"></div>
                                <div class="ghostspy-ext-progress-bar" style="margin: 0;">
                                    <div class="ghostspy-ext-progress-fill" data-vsl-slide-progress style="width: 18%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="ghostspy-ext-final-warning ghostspy-ext-hidden" data-vsl-final-warning>
                            <strong>Conte&uacute;do suspeito identificado</strong>
                            <p>A an&aacute;lise de <b>@${profile.username}</b> foi conclu&iacute;da. Foram encontradas conversas, fotos e localiza&ccedil;&otilde;es suspeitas que exigem aten&ccedil;&atilde;o imediata.</p>
                        </div>
                        <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-primary ghostspy-ext-hidden" data-vsl-top-continue>
                            Clique aqui para ver tudo
                        </button>
                        <div class="ghostspy-ext-profile">
                            <div class="ghostspy-ext-profile-avatar-wrap">
                                <img src="/images/avatars/perfil-sem-foto.jpeg" alt="Foto de perfil" data-vsl-profile-avatar data-vsl-profile-avatar-target="${avatarTarget}" />
                                <div class="ghostspy-ext-profile-avatar-fallback" data-vsl-profile-avatar-fallback>${QUIZ_ICONS.user}</div>
                            </div>
                            <div class="ghostspy-ext-profile-main">
                                <h3>@${profile.username}</h3>
                                <p>Perfil protegido • análise confidencial ativada</p>
                                <div class="ghostspy-ext-metrics">
                                    ${formatCount(profile.posts, "posts")}
                                    ${formatCount(profile.followers, "seguidores")}
                                    ${formatCount(profile.following, "seguindo")}
                                </div>
                            </div>
                        </div>
                        <div class="ghostspy-ext-analysis">
                            <div class="ghostspy-ext-analysis-row">
                                <div class="ghostspy-ext-analysis-copy">
                                    <strong data-vsl-status-title>Análise em andamento</strong>
                                    <span data-vsl-status-text>${statusMessages[0]}</span>
                                </div>
                                <div class="ghostspy-ext-analysis-badge is-status" data-vsl-progress-badge>2%</div>
                            </div>
                            <div class="ghostspy-ext-analysis-row">
                                <div class="ghostspy-ext-analysis-copy">
                                    <strong>Mensagens suspeitas</strong>
                                    <span data-vsl-messages>Mapeando conversas ocultas e mensagens apagadas...</span>
                                </div>
                                <div class="ghostspy-ext-analysis-badge">${QUIZ_ICONS.dm}</div>
                            </div>
                            <div class="ghostspy-ext-analysis-row">
                                <div class="ghostspy-ext-analysis-copy">
                                    <strong>Imagens sensíveis</strong>
                                    <span data-vsl-media>Classificando arquivos privados por prioridade...</span>
                                </div>
                                <div class="ghostspy-ext-analysis-badge">${QUIZ_ICONS.media}</div>
                            </div>
                            <div class="ghostspy-ext-analysis-row">
                                <div class="ghostspy-ext-analysis-copy">
                                    <strong>Locais recentes</strong>
                                    <span data-vsl-locations>Comparando padrões de check-in e horários...</span>
                                </div>
                                <div class="ghostspy-ext-analysis-badge">${QUIZ_ICONS.location}</div>
                            </div>
                        </div>
                        <h3 class="ghostspy-ext-section-title">Dados suspeitos detectados:</h3>
                        <div class="ghostspy-ext-suspect-grid">
                            <div class="ghostspy-ext-suspect-card" data-vsl-card="photo">
                                <div class="ghostspy-ext-suspect-head">
                                    <div class="ghostspy-ext-suspect-label">
                                        <span class="ghostspy-ext-suspect-icon">${QUIZ_ICONS.media}</span>
                                        <strong>Imagem suspeita encontrada</strong>
                                    </div>
                                    <span class="ghostspy-ext-suspect-flag">${QUIZ_ICONS.alert}</span>
                                </div>
                                <div class="ghostspy-ext-suspect-result" data-vsl-result="photo">Aguardando an&aacute;lise...</div>
                                <div class="ghostspy-ext-suspect-progress"><div data-vsl-card-progress="photo"></div></div>
                                <div class="ghostspy-ext-suspect-preview" data-preview="single">
                                    <div class="ghostspy-ext-preview-tile">${QUIZ_ICONS.lock}</div>
                                    <p>Uma foto &iacute;ntima trocada recentemente foi identificada nas mensagens ocultas.</p>
                                </div>
                            </div>
                            <div class="ghostspy-ext-suspect-card" data-vsl-card="messages">
                                <div class="ghostspy-ext-suspect-head">
                                    <div class="ghostspy-ext-suspect-label">
                                        <span class="ghostspy-ext-suspect-icon">${QUIZ_ICONS.dm}</span>
                                        <strong>Mensagens suspeitas</strong>
                                    </div>
                                    <span class="ghostspy-ext-suspect-flag">${QUIZ_ICONS.alert}</span>
                                </div>
                                <div class="ghostspy-ext-suspect-result" data-vsl-result="messages">Aguardando an&aacute;lise...</div>
                                <div class="ghostspy-ext-suspect-progress"><div data-vsl-card-progress="messages"></div></div>
                            </div>
                            <div class="ghostspy-ext-suspect-card" data-vsl-card="media">
                                <div class="ghostspy-ext-suspect-head">
                                    <div class="ghostspy-ext-suspect-label">
                                        <span class="ghostspy-ext-suspect-icon">${QUIZ_ICONS.media}</span>
                                        <strong>Imagens suspeitas</strong>
                                    </div>
                                    <span class="ghostspy-ext-suspect-flag">${QUIZ_ICONS.alert}</span>
                                </div>
                                <div class="ghostspy-ext-suspect-result" data-vsl-result="media">Aguardando an&aacute;lise...</div>
                                <div class="ghostspy-ext-suspect-progress"><div data-vsl-card-progress="media"></div></div>
                                <div class="ghostspy-ext-suspect-preview" data-preview="media">
                                    <div class="ghostspy-ext-preview-tile">${QUIZ_ICONS.lock}</div>
                                    <div class="ghostspy-ext-preview-tile">${QUIZ_ICONS.lock}</div>
                                    <div class="ghostspy-ext-preview-tile">${QUIZ_ICONS.lock}</div>
                                </div>
                            </div>
                            <div class="ghostspy-ext-suspect-card" data-vsl-card="location">
                                <div class="ghostspy-ext-suspect-head">
                                    <div class="ghostspy-ext-suspect-label">
                                        <span class="ghostspy-ext-suspect-icon">${QUIZ_ICONS.location}</span>
                                        <strong>Localiza&ccedil;&otilde;es suspeitas</strong>
                                    </div>
                                    <span class="ghostspy-ext-suspect-flag">${QUIZ_ICONS.alert}</span>
                                </div>
                                <div class="ghostspy-ext-suspect-result" data-vsl-result="location">Aguardando an&aacute;lise...</div>
                                <div class="ghostspy-ext-suspect-progress"><div data-vsl-card-progress="location"></div></div>
                                <div class="ghostspy-ext-suspect-preview" data-preview="location">
                                    <div class="ghostspy-ext-location-result">
                                        ${QUIZ_ICONS.location}
                                        <div>
                                            <strong>Motel/Casa de Massagem</strong>
                                            <p>Nos &uacute;ltimos 30 dias</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ghostspy-ext-actions">
                            <button type="button" class="ghostspy-ext-btn ghostspy-ext-btn-primary ghostspy-ext-hidden" data-vsl-continue>Acessar Instagram e ver tudo</button>
                        </div>
                        <p class="ghostspy-ext-footer-note">Os dados são processados em tempo real e permanecem confidenciais durante toda a análise.</p>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(activeVslEl);

    const slideImage = activeVslEl.querySelector("[data-vsl-slide-image]");
    const slideCaption = activeVslEl.querySelector("[data-vsl-caption]");
    const slideProgress = activeVslEl.querySelector(
      "[data-vsl-slide-progress]",
    );
    const statusText = activeVslEl.querySelector("[data-vsl-status-text]");
    const progressBadge = activeVslEl.querySelector(
      "[data-vsl-progress-badge]",
    );
    const messagesEl = activeVslEl.querySelector("[data-vsl-messages]");
    const mediaEl = activeVslEl.querySelector("[data-vsl-media]");
    const locationsEl = activeVslEl.querySelector("[data-vsl-locations]");
    const continueButton = activeVslEl.querySelector("[data-vsl-continue]");
    const topContinueButton = activeVslEl.querySelector(
      "[data-vsl-top-continue]",
    );
    const finalWarning = activeVslEl.querySelector("[data-vsl-final-warning]");
    const avatarImage = activeVslEl.querySelector("[data-vsl-profile-avatar]");
    const avatarFallback = activeVslEl.querySelector(
      "[data-vsl-profile-avatar-fallback]",
    );
    const suspectPhases = [
      {
        key: "photo",
        start: 0,
        end: 60 * 1000,
        result: "1 imagem suspeita encontrada",
      },
      {
        key: "messages",
        start: 60 * 1000,
        end: 135 * 1000,
        result: "90 itens suspeitos identificados",
      },
      {
        key: "media",
        start: 135 * 1000,
        end: 220 * 1000,
        result: "3 itens suspeitos identificados",
      },
      {
        key: "location",
        start: 220 * 1000,
        end: totalDurationMs,
        result: "2 itens suspeitos identificados",
      },
    ];

    hydrateProfileAvatar(avatarImage, avatarFallback, avatarCandidates);

    function updateSlide() {
      if (!slideImage) return;
      slideIndex = (slideIndex + 1) % SLIDES.length;
      const slide = SLIDES[slideIndex];
      slideImage.src = slide.src;
      slideImage.alt = slide.title;
      slideCaption.innerHTML = `<strong>${slide.title}</strong><br />${slide.caption}`;
      slideProgress.style.width = `${18 + slideIndex * 28}%`;
    }

    function continueFlow() {
      if (autoAdvance) return;
      autoAdvance = true;
      proceedAfterConfirm(profile, originalButton);
    }

    continueButton.addEventListener("click", continueFlow);
    if (topContinueButton) {
      topContinueButton.addEventListener("click", continueFlow);
    }

    const slideTimer = setInterval(updateSlide, 6500);
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - progressStart;
      const ratio = Math.min(1, elapsed / totalDurationMs);
      progress = Math.min(100, 2 + ratio * 98);
      if (progress > 100) progress = 100;

      const statusIndex = Math.min(
        statusMessages.length - 1,
        Math.floor(progress / 22),
      );

      progressBadge.textContent = `${Math.floor(progress)}%`;
      statusText.textContent = statusMessages[statusIndex];

      suspectPhases.forEach((phase) => {
        const card = activeVslEl.querySelector(
          `[data-vsl-card="${phase.key}"]`,
        );
        const bar = activeVslEl.querySelector(
          `[data-vsl-card-progress="${phase.key}"]`,
        );
        const result = activeVslEl.querySelector(
          `[data-vsl-result="${phase.key}"]`,
        );
        const phaseRatio = Math.max(
          0,
          Math.min(1, (elapsed - phase.start) / (phase.end - phase.start)),
        );

        if (bar) bar.style.width = `${Math.floor(phaseRatio * 100)}%`;
        if (result) {
          result.textContent =
            phaseRatio >= 1
              ? phase.result
              : phaseRatio > 0
                ? `Analisando... ${Math.floor(phaseRatio * 100)}%`
                : "Aguardando analise...";
        }
        if (card && phaseRatio >= 1) {
          card.classList.add("complete");
        }
      });

      if (progress >= 28) {
        messagesEl.textContent =
          "41 conversas sensíveis identificadas e classificadas.";
      }
      if (progress >= 54) {
        mediaEl.textContent = "9 mídias privadas encontradas e validadas.";
      }
      if (progress >= 76) {
        locationsEl.textContent =
          "3 pontos suspeitos cruzados com horários de atividade.";
      }

      if (progress >= 100) {
        clearInterval(progressTimer);
        clearInterval(slideTimer);
        if (finalWarning) finalWarning.classList.remove("ghostspy-ext-hidden");
        if (topContinueButton)
          topContinueButton.classList.remove("ghostspy-ext-hidden");
        continueButton.classList.remove("ghostspy-ext-hidden");
        statusText.textContent =
          "Analise concluida. Clique no botao para liberar a proxima etapa.";
      }
    }, 1000);
  }

  function maybeShowQuiz() {
    if (!document.body) return;
    if (REQUESTED_VSL_ON_LOAD || location.pathname === VSL_ROUTE) return;
    if (location.pathname !== "/" && location.pathname !== "/index.html")
      return;
    //mostra o botao antes de mostrar o input
    if (sessionStorage.getItem(QUIZ_KEY) === "1") return;
    //faz ir direto para inserir o insta
    // if (sessionStorage.getItem(QUIZ_KEY) === "1") {
    //   const spyButton = getSpyButton();
    //   if (spyButton) {
    //     setTimeout(() => spyButton.click(), 120);
    //   }
    //   return;
    // }
    if (!getSpyButton()) return;
    showQuiz();
  }

  function maybeShowVslRoute() {
    if (SKIP_VSL_FLOW) return;
    if (!document.body) return;
    if (Date.now() < suppressVslUntil) return;
    if (vslOpen && activeVslEl && !document.body.contains(activeVslEl)) {
      vslOpen = false;
      activeVslEl = null;
    }
    if (vslOpen) return;
    if (!pendingInitialVslBootstrap && location.pathname !== VSL_ROUTE) return;
    removeQuiz();
    const profile = getProfileFromStorageOrUrl();
    showVsl(profile, null, { standalone: false });
    if (location.pathname !== VSL_ROUTE) {
      setTimeout(() => openVslRoute(profile), 650);
    }
  }

  function monitorFlow() {
    if (monitorStarted) return;
    monitorStarted = true;
    ensureStyles();

    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target && event.target.closest
            ? event.target.closest("button")
            : null;
        if (!button || bypassConfirm || vslOpen) return;
        if (Date.now() < suppressVslUntil) return;
        if (location.pathname !== "/" && location.pathname !== "/index.html")
          return;
        if (readText(button) !== "confirmar") return;
        if (
          !document.body ||
          !document.body.innerText.includes("Confirme o Instagram")
        )
          return;

        const profile = extractProfileData();
        const vslKey = `${VSL_KEY_PREFIX}${profile.username}`;
        if (sessionStorage.getItem(vslKey) === "1") return;

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
        if (SKIP_VSL_FLOW) {
          proceedAfterConfirm(profile, button);
        } else {
          showVsl(profile, button);
        }
      },
      true,
    );

    const observer = new MutationObserver(() => {
      if (
        location.pathname === "/feed" ||
        location.pathname === "/cta" ||
        location.pathname === "/back-redirect" ||
        location.pathname === "/back-redirect/"
      ) {
        removeQuiz();
        removeVsl();
        return;
      }
      maybeShowVslRoute();
      maybeShowQuiz();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", () => {
      if (SKIP_VSL_FLOW && location.pathname === VSL_ROUTE) {
        location.replace("/?auto_login=1");
        return;
      }
      if (activeVslEl || location.pathname === VSL_ROUTE) {
        window.location.href = `/back-redirect/${window.location.search || ""}`;
        return;
      }

      setTimeout(() => {
        maybeShowVslRoute();
        maybeShowQuiz();
      }, 50);
    });

    setTimeout(maybeShowVslRoute, 350);
    maybeShowQuiz();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", monitorFlow);
  } else {
    monitorFlow();
  }
})();

