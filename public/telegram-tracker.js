// public/telegram-tracker.js
// Real-time visit tracking with location, host URL, and device info

(function() {
  'use strict';

  const cfg = window.SHOPMAZE_CONFIG;
  if (!cfg || !cfg.telegram || !cfg.telegram.botToken) {
    console.warn('[Tracker] Telegram config missing.');
    return;
  }

  // Session dedup — skip if already tracked this page
  const pageKey = 'sm_visit_' + location.pathname;
  if (sessionStorage.getItem(pageKey)) {
    console.log('[Tracker] Already tracked this session.');
    return;
  }
  sessionStorage.setItem(pageKey, '1');

  // ⭐ 1 SECOND DELAY (as requested)
  setTimeout(sendVisit, 1000);

  function detectDevice() {
    const ua = navigator.userAgent;
    if (/mobile|android|iphone|ipod/i.test(ua)) return /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile';
    return 'Desktop';
  }

  function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('OPR') > -1) return 'Opera';
    return 'Unknown';
  }

  function detectOS() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  function getReferrer() {
    if (!document.referrer) return 'Direct';
    try { return new URL(document.referrer).hostname || 'Direct'; }
    catch (e) { return 'Direct'; }
  }

  // Get page title — prefer og:title for accuracy
  function getPageTitle() {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) return ogTitle.content.substring(0, 140);
    if (document.title) return document.title.substring(0, 140);
    return 'Untitled';
  }

  // Get real location — with multiple fallbacks
  async function getLocation() {
    // Try ipapi.co first
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.country_name) {
          const parts = [data.country_name];
          if (data.region) parts.push(data.region);
          if (data.city) parts.push(data.city);
          return parts.join(', ');
        }
      }
    } catch (e) { /* continue to fallback */ }

    // Fallback: ipwho.is
    try {
      const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          const parts = [data.country];
          if (data.region) parts.push(data.region);
          if (data.city) parts.push(data.city);
          return parts.join(', ');
        }
      }
    } catch (e) { /* continue */ }

    return 'Unknown';
  }

  async function sendVisit() {
    console.log('[Tracker] Sending visit...');
    const location = await getLocation();
    const title = getPageTitle();
    const host = location.hostname;
    const pageUrl = location.href;
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const referrer = getReferrer();
    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const message = 
      '<b>🔔 New Visit</b>\n\n' +
      '<b>📄 Page:</b> ' + title + '\n' +
      '<b>🔗 URL:</b> ' + pageUrl + '\n' +
      '<b>🌐 Host:</b> ' + host + '\n' +
      '<b>🌍 Location:</b> ' + location + '\n' +
      '<b>📱 Device:</b> ' + device + ' / ' + browser + ' / ' + os + '\n' +
      '<b>↩️ From:</b> ' + referrer + '\n' +
      '<b>🕐 Time:</b> ' + now;

    const apiUrl = 'https://api.telegram.org/bot' + cfg.telegram.botToken + '/sendMessage';

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          chat_id: cfg.telegram.chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: 'true'
        })
      });
      const data = await res.json();
      if (data.ok) {
        console.log('[Tracker] ✅ Sent successfully');
      } else {
        console.warn('[Tracker] ❌ Telegram error:', data.description);
      }
    } catch (e) {
      console.warn('[Tracker] Send failed:', e.message);
    }
  }
})();
