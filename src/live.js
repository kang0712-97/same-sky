// 실시간 신호: Supabase Realtime Broadcast 로 '바뀌었어요' 신호(데이터 없음)만 주고받는다.
// 신호를 받으면 앱이 평소처럼 서버에서 새로 받아 오므로 내용은 서버(토큰 검증)를 거친다. 연결이 안 되면 주기 확인이 대신한다.
(function () {
  const cfg = window.SS_CONFIG || {};
  let ws = null, code = '', onPing = null, timer = 0, hb = 0, ref = 0, tries = 0, on = false;
  const topic = () => 'realtime:ss-' + code;
  const send = o => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch (e) { } };

  function open() {
    if (!on || !cfg.url || !cfg.anonKey || typeof WebSocket === 'undefined') return;
    try { ws = new WebSocket(cfg.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(cfg.anonKey) + '&vsn=1.0.0'); } catch (e) { return retry(); }
    ws.onopen = () => {
      tries = 0;
      send({ topic: topic(), event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } }, ref: String(++ref), join_ref: '1' });
      clearInterval(hb); hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
    };
    ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.event === 'broadcast' && m.payload && m.payload.event === 'ping' && onPing) onPing(); } catch (x) { } };
    ws.onclose = () => { clearInterval(hb); retry(); };
    ws.onerror = () => { try { ws.close(); } catch (e) { } };
  }
  function retry() { if (!on) return; clearTimeout(timer); timer = setTimeout(open, Math.min(30000, 1500 * Math.pow(2, tries++))); }

  const Live = {
    start(c, fn) { if (on && code === c) { onPing = fn; return; } Live.stop(); code = c; onPing = fn; on = true; open(); },
    stop() { on = false; clearTimeout(timer); clearInterval(hb); if (ws) { try { ws.onclose = null; ws.close(); } catch (e) { } } ws = null; },
    ping() { send({ topic: topic(), event: 'broadcast', payload: { type: 'broadcast', event: 'ping', payload: {} }, ref: String(++ref) }); },
    live: () => !!(ws && ws.readyState === 1)
  };
  window.SSLive = Live;

  // 쓰기 API 가 끝나면 상대에게 신호를 보낸다
  const A = window.SSApi;
  if (A) ['saveMember', 'addPhoto', 'heartPhoto', 'addNote', 'saveRoom', 'addVoice', 'markRead', 'deleteItem'].forEach(n => {
    const f = A[n]; if (typeof f !== 'function') return;
    A[n] = async function () { const r = await f.apply(this, arguments); Live.ping(); return r; };
  });
})();
