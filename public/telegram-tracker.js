// public/telegram-tracker.js
// Real-time visit tracking via secure server API
// Token ab server-side (Render env vars) me hai — browser me nahi

(function() {
  'use strict';

  const TRACKER_API = 'https://sharkmcp.onrender.com/api/track-visit';

  // Session dedup — same page ek session me ek baar
  const pageKey = 'sm_visit_' + location.pathname;
  if (sessionStorage.getItem(pageKey)) {
    console.log('[Tracker] Already tracked this session.');
    return;
  }
  sessionStorage.setItem(pageKey, '1');

  // 1 second delay — page load hone do
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

  function getPageTitle() {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) return ogTitle.content.substring(0, 140);
    if (document.title) return document.title.substring(0, 140);
    return 'Untitled';
  }

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
    } catch (e) {}

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
    } catch (e) {}

    return 'Unknown';
  }

  async function sendVisit() {
    console.log('[Tracker] Sending visit...');

    const loc = await getLocation();
    const title = getPageTitle();
    const host = window.location.hostname;
    const pageUrl = window.location.href;
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const referrer = getReferrer();

    // Server API ko bhejo — token server side hai
    try {
      const res = await fetch(TRACKER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url: pageUrl,
          host,
          location: loc,
          device,
          browser,
          os,
          referrer,
        }),
      });

      const data = await res.json();

      if (data.success) {
        console.log('[Tracker] ✅ Sent successfully');
      } else {
        console.warn('[Tracker] ❌ Failed:', data.error);
      }
    } catch (e) {
      console.warn('[Tracker] Send failed:', e.message);
    }
  }
})();
