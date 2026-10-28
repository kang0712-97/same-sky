// 알림(웹 푸시): 서비스 워커 등록, 구독 켜기/끄기, 상대에게 알림 요청.
// 알림은 서버 함수(api/push)가 보낸다. 이 기기의 구독 정보는 DB(토큰 검증)에 맡겨 둔다.
(function () {
  const cfg = window.SS_CONFIG || {};
  const API_BASE = /github\.io$/.test(location.hostname) ? 'https://same-sky-hazel.vercel.app' : '';
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const b64 = s => { const r = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const capable = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let regP = null;
  const reg = () => regP || (regP = navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));

  // 'unsupported' | 'noserver' | 'install'(아이폰은 홈 화면에 추가해야 함) | 'denied' | 'off' | 'on'
  async function state() {
    if (!cfg.vapid) return 'noserver';
    if (isIOS && !standalone()) return 'install';
    if (!capable()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try { const r = await reg(), sub = await r.pushManager.getSubscription(); return sub && Notification.permission === 'granted' ? 'on' : 'off'; } catch (e) { return 'unsupported'; }
  }
  async function enable(code, slot) {
    const p = await Notification.requestPermission(); if (p !== 'granted') throw new Error('denied');
    const r = await reg(); let sub = await r.pushManager.getSubscription();
    if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.vapid) });
    await window.SSApi.savePush(code, slot, sub.toJSON());
  }
  async function disable(code, slot) {
    try { const r = await reg(), sub = await r.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { }
    try { await window.SSApi.clearPush(code, slot); } catch (e) { }
  }
  // 상대에게 알림을 보내 달라고 서버 함수에 요청 (실패해도 앱 동작에는 영향 없음)
  function notify(kind, code, slot) {
    if (!cfg.vapid || !window.SSApi || !window.SSApi.token || !code || !slot) return;
    try { fetch(API_BASE + '/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, slot, token: window.SSApi.token, kind }), keepalive: true }).catch(() => { }); } catch (e) { }
  }
  if (cfg.vapid && capable() && location.protocol !== 'file:') reg().catch(() => { });   // 알림을 켠 기기가 앱을 닫아도 받을 수 있게 미리 등록
  window.SSPush = { state, enable, disable, notify, isIOS, standalone };
})();
