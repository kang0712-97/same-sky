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
      const err = new Error(m); err.code = /Could not find the function|PGRST202|schema cache/i.test(m) ? 'no_schema' : (/limit/.test(m) ? 'limit' : /too_big/.test(m) ? 'too_big' : 'rpc'); throw err;
    }
    return text ? JSON.parse(text) : null;
  }
  window.SSApi = {
    createCouple: () => rpc('ss_create_couple'),
    getCouple: code => rpc('ss_get_couple', { p_code: code }),
    saveMember: (code, slot, m) => rpc('ss_save_member', { p_code: code, p_slot: slot, p_name: m.name, p_avatar: m.avatar, p_city: m.city, p_profile: m.profile || null }),
    addPhoto: (code, slot, p) => rpc('ss_add_photo', { p_code: code, p_slot: slot, p_local_date: p.date, p_caption: p.caption || '', p_weather: p.weather || '', p_data: p.data }),
    listPhotos: code => rpc('ss_list_photos', { p_code: code, p_limit: 40 }),
    getState: code => rpc('ss_state', { p_code: code }),
    heartPhoto: (code, id, slot) => rpc('ss_heart_photo', { p_code: code, p_photo_id: id, p_slot: slot }),
    addNote: (code, slot, n) => rpc('ss_add_note', { p_code: code, p_slot: slot, p_body: n.body, p_x: n.x, p_y: n.y }),
    listNotes: code => rpc('ss_list_notes', { p_code: code })
  };
})();
