// public/telegram-tracker.js
// Robust visit + affiliate click tracking
// Multi-fallback location APIs
// Auto-injected by server into every HTML page

(function() {
  'use strict';

  var TRACKER_API = 'https://sharkmcp.onrender.com/api/track-visit';
  var CLICK_API = 'https://sharkmcp.onrender.com/api/track-click';

  // ============================================================
  // ===== LOCATION APIS (Fallback Chain) =====
  // ============================================================
  var LOCATION_APIS = [
    {
      url: 'https://ipapi.co/json/',
      parse: function(d) {
        if (!d || !d.country_name) return null;
        return {
          country: d.country_name || 'Unknown',
          region: d.region || 'Unknown',
          city: d.city || 'Unknown',
          postal: d.postal || '',
          ip: d.ip || '',
          location: [d.country_name, d.region, d.city].filter(Boolean).join(', '),
        };
      }
    },
    {
      url: 'https://ipwho.is/',
      parse: function(d) {
        if (!d || !d.country) return null;
        return {
          country: d.country || 'Unknown',
          region: d.region || 'Unknown',
          city: d.city || 'Unknown',
          postal: d.postal || '',
          ip: d.ip || '',
          location: [d.country, d.region, d.city].filter(Boolean).join(', '),
        };
      }
    },
    {
      url: 'https://ipinfo.io/json',
      parse: function(d) {
        if (!d || !d.country) return null;
        var parts = (d.loc || '').split(',');
        return {
          country: d.country || 'Unknown',
          region: d.region || 'Unknown',
          city: d.city || 'Unknown',
          postal: d.postal || '',
          ip: d.ip || '',
          location: [d.country, d.region, d.city].filter(Boolean).join(', '),
        };
      }
    },
    {
      url: 'https://api.ipify.org?format=json',
      parse: function(d) {
        if (!d || !d.ip) return null;
        return {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          postal: '',
          ip: d.ip || '',
          location: 'Unknown',
        };
      }
    },
  ];

  async function getLocationData() {
    // Check cache first
    try {
      var stored = localStorage.getItem('sm_location_v2');
      if (stored) {
        var cached = JSON.parse(stored);
        // Cache valid for 1 hour
        if (cached && cached.ts && (Date.now() - cached.ts) < 3600000) {
          return cached;
        }
      }
    } catch (e) {}

    // Try each API in sequence
    for (var i = 0; i < LOCATION_APIS.length; i++) {
      var api = LOCATION_APIS[i];
      try {
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 4000);

        var res = await fetch(api.url, {
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) continue;

        var data = await res.json();
        var parsed = api.parse(data);

        if (parsed) {
          parsed.ts = Date.now();
          try { localStorage.setItem('sm_location_v2', JSON.stringify(parsed)); } catch (e) {}
          console.log('[Tracker] ✅ Location:', parsed.location, '| IP:', parsed.ip);
          return parsed;
        }
      } catch (e) {
        console.log('[Tracker] ⚠️ API failed:', api.url, '-', e.message);
      }
    }

    // All failed
    console.log('[Tracker] ❌ All location APIs failed');
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      postal: '',
      ip: '',
      location: 'Unknown',
      ts: Date.now(),
    };
  }

  // ============================================================
  // ===== AFFILIATE LINK DETECTION =====
  // ============================================================
  var AFFILIATE_PATTERNS = [
    /amazon\./i, /amzn\.to/i, /amzn\.in/i, /amzn\.eu/i, /amzn\.asia/i,
    /flipkart\.com/i, /fkrt\.it/i, /fkrt\.co/i,
    /myntra\.com/i, /ajio\.com/i, /meesho\.com/i,
    /snapdeal\.com/i, /tatacliq\.com/i, /nykaa\.com/i,
    /croma\.com/i, /reliancedigital\.in/i, /vijaysales\.com/i,
    /bit\.ly/i, /tinyurl\.com/i,
    /cuelinks\.com/i, /earnkaro\.com/i, /earnkaro\.in/i,
    /inr\.deals/i, /linksredirect\.com/i,
    /affiliate/i, /referral/i,
  ];

  function isAffiliateLink(url) {
    if (!url) return false;
    return AFFILIATE_PATTERNS.some(function(p) { return p.test(url); });
  }

  function detectAffiliateSource(url) {
    if (!url) return 'Other';
    var u = url.toLowerCase();
    if (u.includes('amazon') || u.includes('amzn.')) return 'Amazon';
    if (u.includes('flipkart') || u.includes('fkrt.')) return 'Flipkart';
    if (u.includes('myntra')) return 'Myntra';
    if (u.includes('ajio')) return 'Ajio';
    if (u.includes('meesho')) return 'Meesho';
    if (u.includes('snapdeal')) return 'Snapdeal';
    if (u.includes('tatacliq')) return 'TataCliq';
    if (u.includes('nykaa')) return 'Nykaa';
    if (u.includes('croma')) return 'Croma';
    if (u.includes('reliancedigital')) return 'RelianceDigital';
    if (u.includes('vijaysales')) return 'VijaySales';
    if (u.includes('cuelinks')) return 'Cuelinks';
    if (u.includes('earnkaro')) return 'EarnKaro';
    return 'Other';
  }

  // ============================================================
  // ===== DEVICE / OS / BROWSER DETECTORS =====
  // ============================================================
  function detectDevice() {
    var ua = navigator.userAgent;
    if (/iphone/i.test(ua)) return 'iPhone';
    if (/ipad|tablet/i.test(ua)) return 'Tablet';
    if (/mobile|android/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function detectBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('OPR') > -1) return 'Opera';
    return 'Unknown';
  }

  function detectOS() {
    var ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  function getReferrer() {
    if (!document.referrer) return 'Direct';
    try {
      return new URL(document.referrer).hostname.replace(/^www\./, '');
    } catch (e) {
      return 'Direct';
    }
  }

  function getPageTitle() {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) return ogTitle.content.substring(0, 140);
    if (document.title) return document.title.substring(0, 140);
    return 'Untitled';
  }

  // ============================================================
  // ===== DUPLICATE CLICK PREVENTION =====
  // ============================================================
  var recentClicks = {};
  var CLICK_COOLDOWN = 30000; // 30 sec

  function isDuplicateClick(key) {
    var now = Date.now();
    var last = recentClicks[key];
    if (last && (now - last) < CLICK_COOLDOWN) return true;
    recentClicks[key] = now;
    return false;
  }

  // ============================================================
  // ===== SEND VISIT (2 sec after page load) =====
  // ============================================================
  async function sendVisit() {
    console.log('[Tracker] 📤 Sending visit...');
    var loc = await getLocationData();

    var payload = {
      title: getPageTitle(),
      url: window.location.href,
      host: window.location.hostname,
      location: loc.location,
      city: loc.city,
      country: loc.country,
      region: loc.region,
      postal: loc.postal,
      client_ip: loc.ip,
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
      referrer: getReferrer(),
    };

    try {
      var res = await fetch(TRACKER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (data.success) {
        console.log('[Tracker] ✅ Visit tracked:', loc.city, loc.country);
      } else {
        console.warn('[Tracker] ⚠️', data.error);
      }
    } catch (e) {
      console.warn('[Tracker] ❌ Visit fail:', e.message);
    }
  }

  // ============================================================
  // ===== VISIT TRIGGER (2 sec after load) =====
  // ============================================================
  var pageKey = 'sm_visit_v2_' + location.pathname;
  if (!sessionStorage.getItem(pageKey)) {
    sessionStorage.setItem(pageKey, '1');
    setTimeout(sendVisit, 2000);
  }

  // ============================================================
  // ===== CLICK TRACKING (capture phase) =====
  // ============================================================
  document.addEventListener('click', async function(e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.href || '';
    var text = (link.textContent || '').trim().substring(0, 100);

    // ✅ Only affiliate links
    if (!isAffiliateLink(href)) return;

    var dedupKey = location.pathname + '::' + href;
    if (isDuplicateClick(dedupKey)) {
      console.log('[Tracker] ⏭️ Duplicate click ignored');
      return;
    }

    var source = detectAffiliateSource(href);
    console.log('[Tracker] 🛒 Click:', source, '→', href);

    // Get location (from cache if available)
    var loc = await getLocationData();

    var payload = {
      page_path: location.pathname,
      page_title: getPageTitle(),
      link_url: href,
      link_text: text,
      affiliate_source: source,
      city: loc.city || 'Unknown',
      country: loc.country || 'Unknown',
      region: loc.region || 'Unknown',
      postal: loc.postal || '',
      client_ip: loc.ip || '',
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
      referrer: getReferrer(),
    };

    // Non-blocking send
    try {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      var sent = navigator.sendBeacon(CLICK_API, blob);
      if (!sent) throw new Error('beacon failed');
      console.log('[Tracker] ✅ Click tracked:', source);
    } catch (err) {
      fetch(CLICK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(function() { console.log('[Tracker] ✅ Click tracked (fetch)'); })
        .catch(function(e) { console.warn('[Tracker] ❌ Click fail:', e.message); });
    }
  }, true);

})();