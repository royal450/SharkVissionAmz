// public/telegram-tracker.js
// Real-time visit + Amazon click tracking
// Auto-injected by server into every HTML page

(function() {
  'use strict';

  const TRACKER_API = 'https://sharkmcp.onrender.com/api/track-visit';
  const CLICK_API = 'https://sharkmcp.onrender.com/api/track-click';

  // ============================================================
  // ===== AMAZON LINK DETECTION =====
  // ============================================================
  const AMAZON_PATTERNS = [
    /amazon\./i,           // amazon.in, amazon.com, amazon.co.uk
    /amzn\.to/i,           // amzn.to short
    /amzn\.in/i,           // amzn.in
    /amzn\.eu/i,           // amzn.eu
    /amzn\.asia/i,         // amzn.asia
  ];

  function isAmazonLink(url) {
    if (!url) return false;
    return AMAZON_PATTERNS.some(function(pattern) { return pattern.test(url); });
  }

  // ============================================================
  // ===== DUPLICATE CLICK PREVENTION =====
  // ============================================================
  const recentClicks = new Map();
  const CLICK_COOLDOWN = 60000; // 1 min

  function isDuplicateClick(key) {
    const last = recentClicks.get(key);
    const now = Date.now();
    if (last && (now - last) < CLICK_COOLDOWN) return true;
    recentClicks.set(key, now);
    return false;
  }

  // ============================================================
  // ===== AMAZON CLICK TRACKING =====
  // ============================================================
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.href || '';
    var text = (link.textContent || '').trim().substring(0, 100);

    // ✅ Only Amazon
    if (!isAmazonLink(href)) return;

    // Prevent spam
    var dedupKey = location.pathname + '::' + href;
    if (isDuplicateClick(dedupKey)) {
      console.log('[Tracker] ⏭️ Duplicate Amazon click ignored');
      return;
    }

    console.log('[Tracker] 🛒 Amazon click:', href);

    var loc = getCachedLocation();
    var payload = {
      page_path: location.pathname,
      page_title: getPageTitle(),
      link_url: href,
      link_text: text,
      city: loc.city || 'Unknown',
      country: loc.country || 'Unknown',
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
      console.log('[Tracker] ✅ Amazon click tracked (beacon)');
    } catch (err) {
      fetch(CLICK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(function() { console.log('[Tracker] ✅ Amazon click tracked (fetch)'); })
        .catch(function(e) { console.warn('[Tracker] ❌ Click fail:', e.message); });
    }
  }, true); // ← capture phase — navigation se pehle fire

  // ============================================================
  // ===== VISIT TRACKING =====
  // ============================================================
  var pageKey = 'sm_visit_' + location.pathname;
  if (!sessionStorage.getItem(pageKey)) {
    sessionStorage.setItem(pageKey, '1');
    setTimeout(sendVisit, 1000);
  }

  // ============================================================
  // ===== HELPERS =====
  // ============================================================
  var cachedLocation = null;

  function getCachedLocation() {
    if (cachedLocation) return cachedLocation;
    try {
      var stored = localStorage.getItem('sm_location');
      if (stored) {
        cachedLocation = JSON.parse(stored);
        return cachedLocation;
      }
    } catch (e) {}
    return { city: 'Unknown', country: 'Unknown' };
  }

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

  async function getLocation() {
    // Try ipapi.co
    try {
      var res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        var data = await res.json();
        if (data.country_name) {
          var loc = {
            country: data.country_name || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            location: [data.country_name, data.region, data.city].filter(Boolean).join(', '),
          };
          try { localStorage.setItem('sm_location', JSON.stringify(loc)); } catch (e) {}
          cachedLocation = loc;
          return loc;
        }
      }
    } catch (e) {}

    // Fallback ipwho.is
    try {
      var res2 = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (res2.ok) {
        var data2 = await res2.json();
        if (data2.country) {
          var loc2 = {
            country: data2.country || 'Unknown',
            city: data2.city || 'Unknown',
            region: data2.region || 'Unknown',
            location: [data2.country, data2.region, data2.city].filter(Boolean).join(', '),
          };
          try { localStorage.setItem('sm_location', JSON.stringify(loc2)); } catch (e) {}
          cachedLocation = loc2;
          return loc2;
        }
      }
    } catch (e) {}

    return { country: 'Unknown', city: 'Unknown', region: 'Unknown', location: 'Unknown' };
  }

  async function sendVisit() {
    console.log('[Tracker] 📤 Sending visit...');
    var loc = await getLocation();

    var payload = {
      title: getPageTitle(),
      url: window.location.href,
      host: window.location.hostname,
      location: loc.location,
      city: loc.city,
      country: loc.country,
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
        console.log('[Tracker] ✅ Visit tracked');
      } else {
        console.warn('[Tracker] ⚠️', data.error);
      }
    } catch (e) {
      console.warn('[Tracker] ❌ Visit fail:', e.message);
    }
  }
})();
