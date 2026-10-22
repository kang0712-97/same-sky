// 나라 선택 + 도시 검색 (도시는 선택 입력, 비우면 수도)
(function () {
  // 코드|나라|수도|위도|경도|시간대
  const C = `KR|대한민국|서울|37.57|126.98|Asia/Seoul
JP|일본|도쿄|35.68|139.69|Asia/Tokyo
CN|중국|베이징|39.90|116.41|Asia/Shanghai
TW|대만|타이베이|25.03|121.57|Asia/Taipei
HK|홍콩|홍콩|22.32|114.17|Asia/Hong_Kong
MN|몽골|울란바토르|47.92|106.92|Asia/Ulaanbaatar
US|미국|워싱턴 D.C.|38.91|-77.04|America/New_York
CA|캐나다|오타와|45.42|-75.70|America/Toronto
MX|멕시코|멕시코시티|19.43|-99.13|America/Mexico_City
BR|브라질|브라질리아|-15.79|-47.88|America/Sao_Paulo
AR|아르헨티나|부에노스아이레스|-34.60|-58.38|America/Argentina/Buenos_Aires
CL|칠레|산티아고|-33.45|-70.67|America/Santiago
PE|페루|리마|-12.05|-77.04|America/Lima
CO|콜롬비아|보고타|4.71|-74.07|America/Bogota
GB|영국|런던|51.51|-0.13|Europe/London
IE|아일랜드|더블린|53.35|-6.26|Europe/Dublin
FR|프랑스|파리|48.86|2.35|Europe/Paris
DE|독일|베를린|52.52|13.40|Europe/Berlin
IT|이탈리아|로마|41.90|12.50|Europe/Rome
ES|스페인|마드리드|40.42|-3.70|Europe/Madrid
PT|포르투갈|리스본|38.72|-9.14|Europe/Lisbon
NL|네덜란드|암스테르담|52.37|4.90|Europe/Amsterdam
BE|벨기에|브뤼셀|50.85|4.35|Europe/Brussels
CH|스위스|베른|46.95|7.45|Europe/Zurich
AT|오스트리아|빈|48.21|16.37|Europe/Vienna
SE|스웨덴|스톡홀름|59.33|18.07|Europe/Stockholm
NO|노르웨이|오슬로|59.91|10.75|Europe/Oslo
DK|덴마크|코펜하겐|55.68|12.57|Europe/Copenhagen
FI|핀란드|헬싱키|60.17|24.94|Europe/Helsinki
IS|아이슬란드|레이캬비크|64.15|-21.94|Atlantic/Reykjavik
PL|폴란드|바르샤바|52.23|21.01|Europe/Warsaw
CZ|체코|프라하|50.08|14.44|Europe/Prague
HU|헝가리|부다페스트|47.50|19.04|Europe/Budapest
GR|그리스|아테네|37.98|23.73|Europe/Athens
TR|튀르키예|앙카라|39.93|32.86|Europe/Istanbul
RU|러시아|모스크바|55.76|37.62|Europe/Moscow
UA|우크라이나|키이우|50.45|30.52|Europe/Kyiv
EG|이집트|카이로|30.04|31.24|Africa/Cairo
ZA|남아프리카공화국|프리토리아|-25.75|28.19|Africa/Johannesburg
KE|케냐|나이로비|-1.29|36.82|Africa/Nairobi
NG|나이지리아|아부자|9.08|7.40|Africa/Lagos
MA|모로코|라바트|34.02|-6.84|Africa/Casablanca
AE|아랍에미리트|아부다비|24.45|54.38|Asia/Dubai
SA|사우디아라비아|리야드|24.71|46.68|Asia/Riyadh
IL|이스라엘|예루살렘|31.77|35.21|Asia/Jerusalem
IN|인도|뉴델리|28.61|77.21|Asia/Kolkata
PK|파키스탄|이슬라마바드|33.68|73.05|Asia/Karachi
BD|방글라데시|다카|23.81|90.41|Asia/Dhaka
NP|네팔|카트만두|27.72|85.32|Asia/Kathmandu
LK|스리랑카|콜롬보|6.93|79.86|Asia/Colombo
TH|태국|방콕|13.76|100.50|Asia/Bangkok
VN|베트남|하노이|21.03|105.85|Asia/Ho_Chi_Minh
PH|필리핀|마닐라|14.60|120.98|Asia/Manila
ID|인도네시아|자카르타|-6.21|106.85|Asia/Jakarta
MY|말레이시아|쿠알라룸푸르|3.14|101.69|Asia/Kuala_Lumpur
SG|싱가포르|싱가포르|1.35|103.82|Asia/Singapore
KH|캄보디아|프놈펜|11.56|104.92|Asia/Phnom_Penh
AU|호주|캔버라|-35.28|149.13|Australia/Sydney
NZ|뉴질랜드|웰링턴|-41.29|174.78|Pacific/Auckland
KZ|카자흐스탄|아스타나|51.17|71.43|Asia/Almaty
UZ|우즈베키스탄|타슈켄트|41.30|69.24|Asia/Tashkent`;

  // 코드|한글|영문|위도|경도|시간대  (주요 도시 — 한글/영문 어디든 "포함"되면 검색됨)
  const T = `KR|부산|Busan|35.18|129.08|Asia/Seoul
KR|인천|Incheon|37.46|126.71|Asia/Seoul
KR|대구|Daegu|35.87|128.60|Asia/Seoul
KR|대전|Daejeon|36.35|127.38|Asia/Seoul
KR|광주|Gwangju|35.16|126.85|Asia/Seoul
KR|울산|Ulsan|35.54|129.31|Asia/Seoul
KR|수원|Suwon|37.26|127.03|Asia/Seoul
KR|제주|Jeju|33.50|126.53|Asia/Seoul
KR|서울|Seoul|37.57|126.98|Asia/Seoul
JP|도쿄|Tokyo|35.68|139.69|Asia/Tokyo
JP|오사카|Osaka|34.69|135.50|Asia/Tokyo
JP|교토|Kyoto|35.01|135.77|Asia/Tokyo
JP|후쿠오카|Fukuoka|33.59|130.40|Asia/Tokyo
JP|삿포로|Sapporo|43.06|141.35|Asia/Tokyo
JP|나고야|Nagoya|35.18|136.91|Asia/Tokyo
JP|요코하마|Yokohama|35.44|139.64|Asia/Tokyo
JP|오키나와 나하|Naha|26.21|127.68|Asia/Tokyo
CN|베이징|Beijing|39.90|116.41|Asia/Shanghai
CN|상하이|Shanghai|31.23|121.47|Asia/Shanghai
CN|광저우|Guangzhou|23.13|113.26|Asia/Shanghai
CN|선전|Shenzhen|22.54|114.06|Asia/Shanghai
CN|청두|Chengdu|30.57|104.07|Asia/Shanghai
CN|시안|Xi'an|34.34|108.94|Asia/Shanghai
CN|항저우|Hangzhou|30.27|120.15|Asia/Shanghai
CN|칭다오|Qingdao|36.07|120.38|Asia/Shanghai
CN|하얼빈|Harbin|45.80|126.53|Asia/Shanghai
TW|타이베이|Taipei|25.03|121.57|Asia/Taipei
TW|가오슝|Kaohsiung|22.63|120.30|Asia/Taipei
US|뉴욕|New York|40.71|-74.01|America/New_York
US|로스앤젤레스|Los Angeles|34.05|-118.24|America/Los_Angeles
US|샌프란시스코|San Francisco|37.77|-122.42|America/Los_Angeles
US|시카고|Chicago|41.88|-87.63|America/Chicago
US|시애틀|Seattle|47.61|-122.33|America/Los_Angeles
US|보스턴|Boston|42.36|-71.06|America/New_York
US|워싱턴 D.C.|Washington|38.91|-77.04|America/New_York
US|휴스턴|Houston|29.76|-95.37|America/Chicago
US|라스베이거스|Las Vegas|36.17|-115.14|America/Los_Angeles
US|마이애미|Miami|25.76|-80.19|America/New_York
US|호놀룰루|Honolulu|21.31|-157.86|Pacific/Honolulu
US|애틀랜타|Atlanta|33.75|-84.39|America/New_York
US|샌디에이고|San Diego|32.72|-117.16|America/Los_Angeles
CA|토론토|Toronto|43.65|-79.38|America/Toronto
CA|밴쿠버|Vancouver|49.28|-123.12|America/Vancouver
CA|몬트리올|Montreal|45.50|-73.57|America/Toronto
GB|런던|London|51.51|-0.13|Europe/London
GB|맨체스터|Manchester|53.48|-2.24|Europe/London
GB|에든버러|Edinburgh|55.95|-3.19|Europe/London
FR|파리|Paris|48.86|2.35|Europe/Paris
FR|마르세유|Marseille|43.30|5.37|Europe/Paris
FR|니스|Nice|43.70|7.27|Europe/Paris
FR|리옹|Lyon|45.76|4.84|Europe/Paris
DE|베를린|Berlin|52.52|13.40|Europe/Berlin
DE|뮌헨|Munich|48.14|11.58|Europe/Berlin
DE|프랑크푸르트|Frankfurt|50.11|8.68|Europe/Berlin
DE|함부르크|Hamburg|53.55|9.99|Europe/Berlin
IT|로마|Rome|41.90|12.50|Europe/Rome
IT|밀라노|Milan|45.46|9.19|Europe/Rome
IT|베네치아|Venice|45.44|12.32|Europe/Rome
IT|피렌체|Florence|43.77|11.26|Europe/Rome
ES|바르셀로나|Barcelona|41.39|2.17|Europe/Madrid
ES|마드리드|Madrid|40.42|-3.70|Europe/Madrid
NL|암스테르담|Amsterdam|52.37|4.90|Europe/Amsterdam
CH|취리히|Zurich|47.38|8.54|Europe/Zurich
CH|제네바|Geneva|46.20|6.14|Europe/Zurich
AT|빈|Vienna|48.21|16.37|Europe/Vienna
CZ|프라하|Prague|50.08|14.44|Europe/Prague
HU|부다페스트|Budapest|47.50|19.04|Europe/Budapest
TR|이스탄불|Istanbul|41.01|28.98|Europe/Istanbul
RU|상트페테르부르크|Saint Petersburg|59.93|30.34|Europe/Moscow
RU|블라디보스토크|Vladivostok|43.12|131.89|Asia/Vladivostok
AE|두바이|Dubai|25.20|55.27|Asia/Dubai
TH|치앙마이|Chiang Mai|18.79|98.98|Asia/Bangkok
TH|푸켓|Phuket|7.88|98.39|Asia/Bangkok
VN|호치민|Ho Chi Minh City|10.82|106.63|Asia/Ho_Chi_Minh
VN|다낭|Da Nang|16.05|108.20|Asia/Ho_Chi_Minh
PH|세부|Cebu|10.32|123.89|Asia/Manila
ID|발리 덴파사르|Denpasar|-8.65|115.22|Asia/Makassar
IN|뭄바이|Mumbai|19.08|72.88|Asia/Kolkata
AU|시드니|Sydney|-33.87|151.21|Australia/Sydney
AU|멜버른|Melbourne|-37.81|144.96|Australia/Melbourne
AU|브리즈번|Brisbane|-27.47|153.03|Australia/Brisbane
AU|퍼스|Perth|-31.95|115.86|Australia/Perth
NZ|오클랜드|Auckland|-36.85|174.76|Pacific/Auckland
BR|상파울루|Sao Paulo|-23.55|-46.63|America/Sao_Paulo
BR|리우데자네이루|Rio de Janeiro|-22.91|-43.17|America/Sao_Paulo
MX|칸쿤|Cancun|21.16|-86.85|America/Cancun`;

  const parse = (s, cols) => s.split('\n').map(l => l.split('|'));
  const COUNTRIES = parse(C).map(a => ({ cc: a[0], name: a[1], capital: a[2], lat: +a[3], lon: +a[4], tz: a[5] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const CITIES = parse(T).map(a => ({ cc: a[0], name: a[1], en: a[2], lat: +a[3], lon: +a[4], tz: a[5] }));

  const country = cc => COUNTRIES.find(c => c.cc === cc);
  function capitalOf(cc) {
    const c = country(cc);
    return { name: c.capital, country: c.name, cc, lat: c.lat, lon: c.lon, tz: c.tz };
  }

  // q: 사용자가 입력한 글자 — 이름에 "포함"되면 결과에 나옴
  async function search(cc, q) {
    q = q.trim();
    if (!q) return [];
    const ql = q.toLowerCase(), cn = country(cc);
    const out = [];
    const push = r => { if (!out.some(o => Math.abs(o.lat - r.lat) < .25 && Math.abs(o.lon - r.lon) < .25)) out.push(r); };
    CITIES.filter(c => c.cc === cc && (c.name.includes(q) || c.en.toLowerCase().includes(ql)))
      .forEach(c => push({ name: c.name, label: c.name + ' (' + c.en + ')', country: cn.name, cc, lat: c.lat, lon: c.lon, tz: c.tz }));
    if (cn.capital.includes(q)) push({ name: cn.capital, label: cn.capital + ' (수도)', country: cn.name, cc, lat: cn.lat, lon: cn.lon, tz: cn.tz });
    // 영문 입력이면 Open-Meteo Geocoding으로 더 찾기 (이 API는 한글 검색을 지원하지 않음)
    if (/[a-z]/i.test(q) && q.length >= 2) {
      try {
        const j = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=60&language=ko&countryCode=' + cc + '&name=' + encodeURIComponent(q))).json();
        (j.results || []).filter(r => (r.name + ' ' + (r.admin1 || '')).toLowerCase().includes(ql) || (r.name || '').includes(q))
          .forEach(r => push({ name: r.name, label: [r.name, r.admin1].filter(Boolean).join(', '), country: cn.name, cc, lat: r.latitude, lon: r.longitude, tz: r.timezone }));
      } catch (e) { /* 내장 목록 결과만 사용 */ }
    }
    return out.slice(0, 12);
  }

  window.SSGeo = { COUNTRIES, country, capitalOf, search };
})();
