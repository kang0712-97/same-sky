// 목소리 쪽지 녹음(MediaRecorder, 최대 15초)과 재생. 소리는 base64 글자로 서버(DB)에 저장한다.
(function () {
  const MAX = 15;
  const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];   // iPhone은 mp4, 그 밖에는 webm
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
  const pick = () => MIMES.find(m => MediaRecorder.isTypeSupported(m)) || '';
  const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });

  async function start(onTick, onLimit) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pick(), opt = { audioBitsPerSecond: 24000 }; if (mime) opt.mimeType = mime;
    const rec = new MediaRecorder(stream, opt), chunks = [], t0 = Date.now(); let tick = 0, cancelled = false;
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(); }; });
    rec.start();
    tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); onTick && onTick(s); if (s >= MAX) { clearInterval(tick); onLimit && onLimit(); } }, 250);
    return {
      async stop() {
        clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); await stopped;
        if (cancelled) return null;
        const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
        return { mime: /^audio\/[a-z0-9.+-]+$/.test(type) ? type : 'audio/webm', dur: Math.min(15.9, (Date.now() - t0) / 1000), data: await toB64(new Blob(chunks, { type })) };
      },
      cancel() { cancelled = true; clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); }
    };
  }

  // 서버에서 온 값은 형식을 확인한 뒤에만 재생한다
  function audioFrom(v) {
    if (!v || !/^audio\/[a-z0-9.+-]+$/.test(v.mime || '') || !/^[A-Za-z0-9+/=]+$/.test(v.data || '')) return null;
    return new Audio('data:' + v.mime + ';base64,' + v.data);
  }
  window.SSVoice = { supported, start, audioFrom, MAX };
})();
