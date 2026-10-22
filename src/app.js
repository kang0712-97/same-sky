(function(){
const A=window.SS_ASSETS;
const KL={night:'맑음 · 밤',clear:'맑음',cloudy:'흐림',rain:'비',sunset:'노을',snow:'눈'};
const MSG={night:'달이 떴어. 오늘 하루 어땠어?',clear:'날씨 진짜 좋아! 너도 봤으면',cloudy:'구름이 많아. 괜히 조용하다',rain:'비 와… 우산 챙겨',sunset:'노을 진짜 예쁘다',snow:'눈 온다!! 첫눈이야'};
const CITY={seoul:{tz:'Asia/Seoul',lat:37.57,lon:126.98,who:'girl'},ny:{tz:'America/New_York',lat:40.71,lon:-74.01,who:'boy'}};
const st={seoul:{kind:'night',temp:14},ny:{kind:'cloudy',temp:12}};
const MOONN=['신월','초승달','상현달','상현망','보름달','하현망','하현달','그믐달'];
let manual=false, shots=1;
const $=id=>document.getElementById(id);
function mk(el,city){
 el.className='stage';el.dataset.city=city;
 el.innerHTML='<img class="L bg"><div class="L stars"><img class="L sa"><img class="L sb"></div><img class="L moon"><div class="L drift"><div class="in"></div></div><img class="L shadow"><img class="L char"><div class="L precip"><div class="in"></div></div><div class="bubble"></div><div class="notes"></div>';
 el.querySelector('.sa').src=A.starsA;el.querySelector('.sb').src=A.starsB;
 el.querySelector('.shadow').src=A.shadow;el.querySelector('.char').src=A[CITY[city].who];
}
function moonIdx(){const d=(Date.now()-Date.UTC(2000,0,6,18,14))/864e5;const p=((d/29.530588)%1+1)%1;return {i:Math.round(p*8)%8,p}}
function apply(el,city){
 const k=st[city].kind;
 el.querySelector('.bg').src=A.bg[k][city];
 const night=k==='night';
 el.querySelector('.stars').style.display=night?'block':'none';
 const m=el.querySelector('.moon');m.style.display=night?'block':'none';m.src=A.moons[moonIdx().i];
 const dr=el.querySelector('.drift .in');dr.style.backgroundImage=A.clouds[k]?'url('+A.clouds[k]+')':'none';
 const pr=el.querySelector('.precip .in');pr.style.backgroundImage=A.precip[k]?'url('+A.precip[k]+')':'none';
 pr.className='in '+(k==='rain'?'rain':k==='snow'?'snow':'');
}
function paint(){
 ['seoul','ny'].forEach(c=>{apply($('st-'+c),c);$('w-'+c).textContent=KL[st[c].kind]+' '+st[c].temp+'°'});
 apply($('st-town'),'ny');
 const d=$('desk');d.style.setProperty('--l',A.sky[st.seoul.kind][0]);d.style.setProperty('--r',A.sky[st.ny.kind][0]);
 $('townTitle').textContent='NEW YORK · 너의 동네 · '+KL[st.ny.kind]+' '+st.ny.temp+'°';
}
function fmt(tz){return new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function off(tz){const d=new Date();return (new Date(d.toLocaleString('en-US',{timeZone:tz}))-new Date(d.toLocaleString('en-US',{timeZone:'UTC'})))/36e5}
function clock(){
 const on=Math.floor(Date.now()/1000)%2===0;
 ['seoul','ny'].forEach(c=>{const t=fmt(CITY[c].tz).split(':');$('t-'+c).innerHTML=t[0]+'<span style="opacity:'+(on?1:.2)+'">:</span>'+t[1]});
 const df=Math.round(off(CITY.seoul.tz)-off(CITY.ny.tz));$('diff').textContent='시차 '+df+'시간';
 const m=moonIdx();$('moonIcon').src=A.moonsIcon[m.i];
 $('moonTxt').textContent='오늘의 달 · '+MOONN[m.i]+' ('+Math.round((1-Math.cos(2*Math.PI*m.p))/2*100)+'%)';
}
function say(stage,text){const b=stage.querySelector('.bubble');b.textContent=text;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),2600)}
function heart(stage,e){
 const r=stage.getBoundingClientRect();const h=document.createElement('img');h.src=A.heart;h.className='heart';
 h.style.left=((e.clientX-r.left)/r.width*100-4)+'%';h.style.top=((e.clientY-r.top)/r.height*100-4)+'%';stage.appendChild(h);setTimeout(()=>h.remove(),1200)}
['seoul','ny'].forEach(c=>{mk($('st-'+c),c);$('st-'+c).addEventListener('click',e=>{if(e.target.classList.contains('note'))return;say($('st-'+c),MSG[st[c].kind]);heart($('st-'+c),e)})});
mk($('st-town'),'ny');
// notes
const notes=[{x:12,y:80,t:'오늘 면접 잘 봐! ♥'},{x:44,y:86,t:'보고싶다'},{x:74,y:79,t:'우산 챙기는 거 잊지 마'}];
function drawNotes(){const box=$('st-town').querySelector('.notes');box.innerHTML='';notes.forEach(n=>{const i=document.createElement('img');i.src=A.note;i.className='note';i.style.left=n.x+'%';i.style.top=n.y+'%';i.onclick=e=>{e.stopPropagation();say($('st-town'),'쪽지: '+n.t)};box.appendChild(i)})}
$('st-town').addEventListener('click',e=>{if(e.target.classList.contains('note'))return;say($('st-town'),MSG[st.ny.kind]);heart($('st-town'),e)});
function view(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));$(id).classList.add('on')}
$('goTown').onclick=()=>{drawNotes();view('v-town')};$('back').onclick=()=>view('v-home');
$('addNote').onclick=()=>{const v=$('noteIn').value.trim();if(!v)return;notes.push({x:8+Math.random()*78,y:77+Math.random()*13,t:v});$('noteIn').value='';drawNotes();toast('쪽지를 붙였어요')};
$('noteIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('addNote').click()});
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200)}
$('photo').onclick=()=>{if(shots>=3)return;shots++;toast('서울 '+fmt('Asia/Seoul')+' 사진을 보냈어요 ('+shots+'/3)');$('photo').textContent=shots>=3?'▣ 오늘 3장 모두 보냈어요':'▣ 오늘의 사진 ('+shots+'/3)';if(shots>=3)$('photo').disabled=true};
// globe animation
let gi=0;setInterval(()=>{gi=(gi+1)%A.globe.length;$('globe').src=A.globe[gi]},350);$('globe').src=A.globe[0];
// demo controls
['seoul','ny'].forEach(c=>{const s=$('sel-'+c);Object.keys(KL).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=KL[k];s.appendChild(o)});s.value=st[c].kind;s.onchange=()=>{manual=true;st[c].kind=s.value;paint()}});
function kindFrom(code,isDay,now,sunrise,sunset){
 let k='clear';
 if([2,3,45,48].includes(code))k='cloudy';
 if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code))k='rain';
 if([71,73,75,77,85,86].includes(code))k='snow';
 const t=new Date(now).getTime(),near=x=>Math.abs(t-new Date(x).getTime())<45*60000;
 if((k==='clear'||k==='cloudy')&&(near(sunset)||near(sunrise)))return 'sunset';
 if(!isDay&&k==='clear')return 'night';
 if(!isDay&&k==='cloudy')return 'cloudy';
 return k;
}
async function real(){
 $('status').textContent='불러오는 중…';
 try{
  for(const c of ['seoul','ny']){
   const u='https://api.open-meteo.com/v1/forecast?latitude='+CITY[c].lat+'&longitude='+CITY[c].lon+'&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1';
   const j=await (await fetch(u)).json();
   st[c].kind=kindFrom(j.current.weather_code,j.current.is_day,j.current.time,j.daily.sunrise[0],j.daily.sunset[0]);
   st[c].temp=Math.round(j.current.temperature_2m);$('sel-'+c).value=st[c].kind;
  }
  manual=false;$('status').textContent='✓ 실시간 날씨 적용됨 (Open-Meteo)';$('live').textContent='● LIVE';
 }catch(e){$('status').textContent='불러오기 실패 — 데모값 사용 ('+(e.message||e)+')';$('live').textContent='DEMO'}
 paint();
}
$('real').onclick=real;
paint();clock();setInterval(clock,1000);real();
})();
