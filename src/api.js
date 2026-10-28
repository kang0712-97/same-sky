// Supabase RPC 호출 (SDK 없이 fetch). 설정이 없거나 스키마가 아직 없으면 오류를 던짐
(function () {
  const cfg = window.SS_CONFIG || {};
  async function rpc(name, args) {
    if (!cfg.url || !cfg.anonKey) throw new Error('no_config');
    const r = await fetch(cfg.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
      body: JSON.stringify(args || {})
    });
    const text = await r.text();
    if (!r.ok) {
      let m = text; try { m = JSON.parse(text).message || text; } catch (e) { }
      const err = new Error(m); err.code = /Could not find the function|PGRST202|schema cache/i.test(m) ? 'no_schema' : (/forbidden/.test(m) ? 'forbidden' : /limit/.test(m) ? 'limit' : /too_big/.test(m) ? 'too_big' : 'rpc'); throw err;
    }
    return text ? JSON.parse(text) : null;
  }
  window.SSApi = {
    token: '',   // 이 기기의 비밀 열쇠 (앱이 채움). 쓰기 함수는 서버에서 이 값을 검증함
    createCouple: () => rpc('ss_create_couple'),
    getCouple: code => rpc('ss_get_couple', { p_code: code }),
    saveMember: (code, slot, m) => rpc('ss_save_member', { p_code: code, p_slot: slot, p_name: m.name, p_avatar: m.avatar, p_city: m.city, p_profile: m.profile || null, p_token: window.SSApi.token }),
    addPhoto: (code, slot, p) => rpc('ss_add_photo', { p_code: code, p_slot: slot, p_local_date: p.date, p_caption: p.caption || '', p_weather: p.weather || '', p_data: p.data, p_token: window.SSApi.token }),
    listPhotos: code => rpc('ss_list_photos', { p_code: code, p_limit: 40 }),
    getState: code => rpc('ss_state', { p_code: code }),
    heartPhoto: (code, id, slot) => rpc('ss_heart_photo', { p_code: code, p_photo_id: id, p_slot: slot, p_token: window.SSApi.token }),
    addNote: (code, slot, n) => rpc('ss_add_note', { p_code: code, p_slot: slot, p_body: n.body, p_x: n.x, p_y: n.y, p_token: window.SSApi.token }),
    listNotes: code => rpc('ss_list_notes', { p_code: code }),
    addVoice: (code, slot, v) => rpc('ss_add_voice', { p_code: code, p_slot: slot, p_mime: v.mime, p_dur: v.dur, p_data: v.data, p_x: v.x, p_y: v.y, p_token: window.SSApi.token }),
    listVoices: code => rpc('ss_list_voices', { p_code: code }),
    savePush: (code, slot, sub) => rpc('ss_save_push', { p_code: code, p_slot: slot, p_token: window.SSApi.token, p_sub: sub }),
    clearPush: (code, slot) => rpc('ss_clear_push', { p_code: code, p_slot: slot, p_token: window.SSApi.token }),
    deleteItem: (code, slot, id) => rpc('ss_delete_item', { p_code: code, p_slot: slot, p_token: window.SSApi.token, p_id: id }),
    markRead: (code, slot, ids) => rpc('ss_mark_read', { p_code: code, p_slot: slot, p_token: window.SSApi.token, p_ids: ids || null }),
    getVoice: (code, id) => rpc('ss_get_voice', { p_code: code, p_id: id }),
    getRooms: code => rpc('ss_get_rooms', { p_code: code }),
    saveRoom: (code, slot, room) => rpc('ss_save_room', { p_code: code, p_slot: slot, p_room: room, p_token: window.SSApi.token })
  };
})();
