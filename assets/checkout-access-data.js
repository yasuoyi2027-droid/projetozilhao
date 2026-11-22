// checkout-access-data.js (pt-PT / MBWay)
// Intercepta links de checkout e anexa o IP do utilizador como access_data.
// TODO: definir window.__CHECKOUT_HOSTS com os domínios do novo gateway MBWay.
// Exemplo: window.__CHECKOUT_HOSTS = ["pay.mbway.pt", "checkout.meugateway.pt"];
(function () {
  var PARAM = "access_data";
  window.__ghostspyIp = window.__ghostspyIp || "";
  // Promise que resolve com o IP (ou "" em falha) — permite ao checkout esperar o IP.
  window.__ghostspyIpReady = window.__ghostspyIpReady || new Promise(function (resolve) {
    window.__ghostspyIpResolve = resolve;
  });

  function isCheckoutHref(href) {
    var hosts = window.__CHECKOUT_HOSTS || [];
    for (var i = 0; i < hosts.length; i++) {
      if (href.indexOf(hosts[i]) !== -1) return true;
    }
    return false;
  }

  // encodeURIComponent UMA vez + concat manual: searchParams.set()/append()
  // recodificaria (% -> %25) e quebraria o IPv6 com double-encoding.
  function setOnce(url, key, raw) {
    var enc = encodeURIComponent(raw);
    url.searchParams.delete(key);
    var hash = url.hash;
    var base = url.toString();
    if (hash) base = base.substring(0, base.length - hash.length);
    return base + (base.indexOf("?") === -1 ? "?" : "&") + key + "=" + enc + hash;
  }

  function applyToLink(link, ip) {
    try {
      if (!link || !link.href) return;
      var url = new URL(link.getAttribute("href"), window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (!isCheckoutHref(url.href)) return;
      if (ip) {
        link.href = setOnce(url, PARAM, ip);
      } else {
        link.href = url.toString();
      }
    } catch (e) {}
  }

  function applyToAll(ip) {
    try {
      document.querySelectorAll("a[href]").forEach(function (link) {
        applyToLink(link, ip);
      });
    } catch (e) {}
  }

  // Helper sincrono para os builders JS (CTA/back-redirect/camera/painel).
  // Usa setOnce (encode 1x) pelo mesmo motivo anti-double-encoding.
  window.__ghostspyWithAccessData = function (urlStr) {
    try {
      if (!urlStr) return urlStr;
      var url = new URL(urlStr);
      if (!isCheckoutHref(url.href)) return urlStr;
      var ip = window.__ghostspyIp;
      if (!ip) return url.toString();
      return setOnce(url, PARAM, ip);
    } catch (e) {
      return urlStr;
    }
  };

  function observe(ip) {
    try {
      var mo = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === "A") applyToLink(node, window.__ghostspyIp || ip);
            else if (node.querySelectorAll) {
              node.querySelectorAll("a[href]").forEach(function (link) {
                applyToLink(link, window.__ghostspyIp || ip);
              });
            }
          });
        });
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  async function boot() {
    observe("");
    try {
      // api64 retorna IPv6 quando disponivel, com fallback automatico p/ IPv4.
      var res = await fetch("https://api64.ipify.org?format=json");
      var data = await res.json();
      var ip = data && data.ip ? String(data.ip) : "";
      if (window.__ghostspyIpResolve) window.__ghostspyIpResolve(ip);
      if (!ip) return;
      window.__ghostspyIp = ip;
      applyToAll(ip);
      observe(ip);
    } catch (e) {
      if (window.__ghostspyIpResolve) window.__ghostspyIpResolve("");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

