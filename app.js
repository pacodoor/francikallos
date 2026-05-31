

// ══════════════════════════════
//  SUPABASE (raw fetch)
// ══════════════════════════════
const SURL = 'https://ngzuhtsxytbalxzrhdxj.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nenVodHN4eXRiYWx4enJoZHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDAyNDgsImV4cCI6MjA5NTMxNjI0OH0.I4ffhC3lbZltQ1YiMh2IroGGY6KGD9pzMxj8aRdolDw';
const SH = {'Content-Type':'application/json','apikey':SKEY,'Authorization':'Bearer '+SKEY};

class Q {
  constructor(t){this.t=t;this.url=SURL+'/rest/v1/'+t;this.method='GET';this.body=null;this.prefer='';this.hasSel=false}
  select(c='*'){const sep=this.url.includes('?')?'&':'?';this.url+=sep+'select='+(c||'*');this.hasSel=true;return this}
  order(c,o={}){const sep=this.url.includes('?')?'&':'?';this.url+=sep+'order='+c+(o.ascending===false?'.desc':'.asc');return this}
  eq(c,v){this.url+=(this.url.includes('?')?'&':'?')+c+'=eq.'+encodeURIComponent(v);return this}
  in(c,vs){this.url+=(this.url.includes('?')?'&':'?')+c+'=in.('+vs.map(v=>encodeURIComponent(v)).join(',')+ ')';return this}
  insert(d){this.method='POST';this.body=JSON.stringify(d);this.prefer='return=representation';return this}
  update(d){this.method='PATCH';this.body=JSON.stringify(d);this.prefer='return=representation';return this}
  delete(){this.method='DELETE';this.prefer='return=representation';return this}
  async run(){
    if(this.method==='GET'&&!this.hasSel){const sep=this.url.includes('?')?'&':'?';this.url+=sep+'select=*';}
    const h={...SH};if(this.prefer)h['Prefer']=this.prefer;
    try{
      const r=await fetch(this.url,{method:this.method,headers:h,body:this.body||undefined});
      const txt=await r.text();
      const data=txt?JSON.parse(txt):null;
      if(!r.ok)return{data:null,error:{message:(data&&(data.message||data.hint||data.error))||'HTTP '+r.status}};
      return{data,error:null};
    }catch(e){return{data:null,error:{message:e.message}};}
  }
  then(res,rej){return this.run().then(res,rej);}
}
const sb={from:t=>new Q(t)};

// ══════════════════════════════
//  STATE
// ══════════════════════════════
const S={clients:[],workouts:[],blocks:[],videos:[],completions:[],currentClientId:null};
const _blockRegistry={};

function safeContent(s){
  if(!s)return "";
  // Replace literal backslash-n with actual newline
  return s.split("\\n").join("\n");


// ══════════════════════════════
//  INIT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded',async()=>{
  const params=new URLSearchParams(location.search);
  const token=params.get('t');
  if(token){showClientView(token);return;}
  setupNav();
  await loadAll();
  renderDashboard();
});

function setupNav(){
  document.querySelectorAll('.nav-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.getElementById('page-'+tab.dataset.page).classList.add('active');
      if(tab.dataset.page==='videos')renderVideos();
      if(tab.dataset.page==='workouts')renderWorkouts();
    });
  });
}

async function loadAll(){
  const [c,w,b,v]=await Promise.all([
    sb.from('clients').select('*').order('created_at'),
    sb.from('workouts').select('*').order('created_at'),
    sb.from('blocks').select('*').order('sort_order'),
    sb.from('videos').select('*').order('created_at'),
  ]);
  S.clients=c.data||[];S.workouts=w.data||[];S.blocks=b.data||[];S.videos=v.data||[];
  document.getElementById('st-clients').textContent=S.clients.length;
  document.getElementById('st-workouts').textContent=S.workouts.length;
  document.getElementById('st-videos').textContent=S.videos.length;
}

// ══════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});});

// ══════════════════════════════
//  TOAST
// ══════════════════════════════
let _tt;
function toast(msg,type='ok'){
  const el=document.getElementById('toast');
  el.textContent=msg;el.className=`toast toast-${type} show`;
  clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),2800);
}

// ══════════════════════════════
//  DASHBOARD
// ══════════════════════════════
function renderDashboard(){
  const el=document.getElementById('clientsList');
  if(!S.clients.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🤸</div><div>Ainda não tens clientes. Clica em "+ Novo cliente"!</div></div>`;return;}
  const avs=['av1','av2','av3','av4','av5'];
  el.innerHTML=`<div class="client-list">`+S.clients.map((c,i)=>{
    const ini=c.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    const wks=S.workouts.filter(w=>w.client_id===c.id);
    const sent=wks.filter(w=>w.status==='sent').length;
    const done=wks.filter(w=>w.status==='done').length;
    let badge=`<span class="badge badge-prep">Sem treinos</span>`;
    if(done>0)badge=`<span class="badge badge-done">✓ ${done} concluído${done>1?'s':''}</span>`;
    else if(sent>0)badge=`<span class="badge badge-sent">📤 ${sent} enviado${sent>1?'s':''}</span>`;
    else if(wks.length>0)badge=`<span class="badge badge-prep">⚪ ${wks.length} em prep.</span>`;
    return `<div class="client-card" style="flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer" onclick="selectClient('${c.id}')">
        <div class="avatar ${avs[i%5]}">${ini}</div>
        <div class="client-info"><div class="client-name">${c.name}</div><div class="client-meta">${c.level||'—'} · ${c.location||'—'} · ${c.frequency||'—'}</div></div>
      </div>
      <div class="client-actions" style="display:flex;flex-wrap:wrap;gap:5px;width:100%">
        ${badge}
        <button class="btn btn-accent btn-sm" onclick="selectClient('${c.id}')">📋 Ver treinos</button>
        <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="shareClient('${c.id}')">🔗 Link</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">✕</button>
      </div>
    </div>`;
  }).join('')+`</div>`;
}

// ══════════════════════════════
//  CLIENT CRUD
// ══════════════════════════════
function openNewClient(){
  ['cId','cName','cDob','cProf','cPhone','cEmail','cGoals','cInjuries','cExp','cEquipExtra','tPushup','tPullup','tSquat','tSitup','tPlank','tHollow','tWallsit','tCooper','tBurpees','tRope','cNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('cSex').value='';
  document.getElementById('cLevel').value='Iniciante';
  document.getElementById('cLocation').value='Em casa';
  document.getElementById('cFreq').value='3×/semana';
  setEquip([]);
  document.getElementById('modalClientTitle').textContent='Ficha de Anamnese';
  openModal('modalClient');
}
function setEquip(arr){document.querySelectorAll('#equipGrid input').forEach(i=>i.checked=arr&&arr.includes(i.value));}
function getEquip(){const a=[...document.querySelectorAll('#equipGrid input:checked')].map(i=>i.value);const ex=document.getElementById('cEquipExtra').value.trim();if(ex)a.push(ex);return a;}

async function saveClient(){
  const id=document.getElementById('cId').value;
  const data={name:document.getElementById('cName').value.trim(),dob:document.getElementById('cDob').value||null,sex:document.getElementById('cSex').value||null,profession:document.getElementById('cProf').value.trim(),phone:document.getElementById('cPhone').value.trim(),email:document.getElementById('cEmail').value.trim(),goals:document.getElementById('cGoals').value.trim(),injuries:document.getElementById('cInjuries').value.trim(),experience:document.getElementById('cExp').value.trim(),level:document.getElementById('cLevel').value,location:document.getElementById('cLocation').value,frequency:document.getElementById('cFreq').value,equipment:getEquip(),test_pushup:document.getElementById('tPushup').value.trim(),test_pullup:document.getElementById('tPullup').value.trim(),test_squat:document.getElementById('tSquat').value.trim(),test_situp:document.getElementById('tSitup').value.trim(),test_plank:document.getElementById('tPlank').value.trim(),test_hollow:document.getElementById('tHollow').value.trim(),test_wallsit:document.getElementById('tWallsit').value.trim(),test_cooper:document.getElementById('tCooper').value.trim(),test_burpees:document.getElementById('tBurpees').value.trim(),test_rope:document.getElementById('tRope').value.trim(),notes:document.getElementById('cNotes').value.trim()};
  if(!data.name){toast('Insere o nome do cliente','err');return;}
  const{error}=id?await sb.from('clients').update(data).eq('id',id):await sb.from('clients').insert(data);
  if(error){toast('Erro: '+error.message,'err');return;}
  closeModal('modalClient');toast(id?'Ficha atualizada!':'Cliente criado!');
  await loadAll();renderDashboard();
}

function editClient(id){
  const c=S.clients.find(x=>x.id===id);
  document.getElementById('cId').value=c.id;
  document.getElementById('cName').value=c.name||'';
  document.getElementById('cDob').value=c.dob||'';
  document.getElementById('cSex').value=c.sex||'';
  document.getElementById('cProf').value=c.profession||'';
  document.getElementById('cPhone').value=c.phone||'';
  document.getElementById('cEmail').value=c.email||'';
  document.getElementById('cGoals').value=c.goals||'';
  document.getElementById('cInjuries').value=c.injuries||'';
  document.getElementById('cExp').value=c.experience||'';
  document.getElementById('cLevel').value=c.level||'Iniciante';
  document.getElementById('cLocation').value=c.location||'Em casa';
  document.getElementById('cFreq').value=c.frequency||'3×/semana';
  setEquip(c.equipment||[]);
  document.getElementById('cEquipExtra').value='';
  document.getElementById('tPushup').value=c.test_pushup||'';
  document.getElementById('tPullup').value=c.test_pullup||'';
  document.getElementById('tSquat').value=c.test_squat||'';
  document.getElementById('tSitup').value=c.test_situp||'';
  document.getElementById('tPlank').value=c.test_plank||'';
  document.getElementById('tHollow').value=c.test_hollow||'';
  document.getElementById('tWallsit').value=c.test_wallsit||'';
  document.getElementById('tCooper').value=c.test_cooper||'';
  document.getElementById('tBurpees').value=c.test_burpees||'';
  document.getElementById('tRope').value=c.test_rope||'';
  document.getElementById('cNotes').value=c.notes||'';
  document.getElementById('modalClientTitle').textContent='Editar ficha';
  openModal('modalClient');
}

async function deleteClient(id){
  if(!confirm('Apagar este cliente e todos os seus treinos?'))return;
  await sb.from('clients').delete().eq('id',id);
  toast('Cliente apagado');await loadAll();renderDashboard();
}

// ══════════════════════════════
//  WORKOUTS
// ══════════════════════════════
function selectClient(id){
  S.currentClientId=id;
  const c=S.clients.find(x=>x.id===id);
  document.getElementById('wk-title').textContent='Treinos · '+c.name;
  document.getElementById('wk-sub').textContent=c.level+' · '+c.location+' · '+c.frequency;
  document.getElementById('wk-actions').style.display='flex';
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector('[data-page="workouts"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-workouts').classList.add('active');
  renderWorkouts();
}

function renderWorkouts(){
  const el=document.getElementById('workoutsList');
  const wks=S.workouts.filter(w=>w.client_id===S.currentClientId);
  if(!S.currentClientId){el.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div>Seleciona um cliente no Dashboard.</div></div>`;return;}
  if(!wks.length){el.innerHTML=`<div class="empty"><div class="empty-icon">💪</div><div>Ainda não há treinos.<br>Clica em "+ Novo treino"!</div></div>`;return;}

  el.innerHTML=wks.map(w=>{
    const blks=S.blocks.filter(b=>b.workout_id===w.id);
    const statusClass=w.status==='sent'?'status-sent':w.status==='done'?'status-done':'status-prep';
    const statusLabel=w.status==='sent'?'<span class="badge badge-sent">📤 Enviado</span>':w.status==='done'?'<span class="badge badge-done">✓ Concluído</span>':'<span class="badge badge-prep">⚪ Em preparação</span>';
    return `<div class="workout-card ${statusClass}" id="wcard-${w.id}">
      <div class="wk-head" onclick="toggleWk(this)">
        <div style="flex:1;min-width:0">
          <div class="wk-title">${w.title}</div>
          <div class="wk-sub">${w.day||''} ${w.week?'· '+w.week:''} ${w.duration?'· '+w.duration+' min':''}</div>
        </div>
        <div class="wk-meta">${statusLabel}<div class="chevron">&#8964;</div></div>
      </div>
      <div class="wk-body">
        <div class="block-list">
          ${blks.map(b=>renderBlockPT(b)).join('')}
          ${w.notes?`<div style="font-size:13px;color:var(--muted);line-height:1.6;padding:4px 2px">📝 ${w.notes}</div>`:''}
        </div>
        <div class="wk-footer">
          <div class="status-row">
            <span style="font-size:11px;color:var(--muted);font-weight:600">Estado:</span>
            <button class="status-btn prep ${w.status==='prep'||!w.status?'active-prep':''}" onclick="setStatus('${w.id}','prep')">⚪ Em preparação</button>
            <button class="status-btn sent ${w.status==='sent'?'active-sent':''}" onclick="setStatus('${w.id}','sent')">📤 Enviado</button>
            <button class="status-btn done ${w.status==='done'?'active-done':''}" onclick="setStatus('${w.id}','done')">✓ Concluído</button>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editWorkout('${w.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteWorkout('${w.id}')">Apagar</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderBlockPT(b){
  const timerInfo=b.timer_type&&b.timer_type!=='none'?`<span class="timer-badge">⏱ ${timerLabel(b)}</span>`:'';
  const vidBtn=b.video_url?`<button class="block-video-btn" onclick="playUrl('${b.video_url}','${b.name}')">▶ Vídeo</button>`:'';
  return `<div class="block-item">
    <div class="block-header">
      <div class="block-name">${b.name}</div>
      ${b.duration?`<span class="block-duration">${b.duration}</span>`:''}
      ${timerInfo}
      ${vidBtn}
    </div>
    <div class="block-content">${safeContent(b.content)}</div>
  </div>`;
}

function timerLabel(b){
  const t=b.timer_type;
  if(t==='amrap')return`AMRAP ${b.timer_duration||''}min`;
  if(t==='emom')return`EMOM ${b.timer_interval||1}min × ${b.timer_rounds||''}rds`;
  if(t==='tabata')return`Tabata ${b.timer_work||20}"/${b.timer_rest||10}" × ${b.timer_rounds||8}`;
  if(t==='fortime')return`For Time`;
  if(t==='countdown')return`Countdown ${b.timer_duration||''}min`;
  return t;
}

function toggleWk(el){
  const body=el.nextElementSibling;
  const ch=el.querySelector('.chevron');
  body.classList.toggle('open');ch.classList.toggle('open');
}

async function setStatus(id,status){
  await sb.from('workouts').update({status}).eq('id',id);
  const w=S.workouts.find(x=>x.id===id);if(w)w.status=status;
  renderWorkouts();
  toast(status==='sent'?'Marcado como enviado!':status==='done'?'Marcado como concluído!':'Em preparação');
}

// ── Block form ──
let blockCount=0;
function addBlockForm(data={}){
  blockCount++;
  const id='blk'+blockCount;
  const timerType=data.timer_type||'none';
  const div=document.createElement('div');
  div.className='block-form-item';div.id='bfi-'+id;
  div.innerHTML=`
    <div class="block-form-row">
      <div class="form-group" style="margin:0"><label class="form-label">Nome do bloco</label><input class="form-input bname" placeholder="Ex: Warm Up, Bloco 1, Finisher..." value="${data.name||''}" style="font-size:13px;padding:8px 10px"></div>
      <div class="form-group" style="margin:0"><label class="form-label">Duração (ex: 15')</label><input class="form-input bdur" placeholder="Ex: 15'" value="${data.duration||''}" style="font-size:13px;padding:8px 10px"></div>
    </div>
    <div class="form-group" style="margin-bottom:6px"><label class="form-label">Conteúdo do bloco</label><textarea class="form-input bcontent" rows="4" placeholder="Escreve aqui os exercícios, séries, reps, notas... exatamente como fazes no Excel">${data.content||''}</textarea></div>
    <div class="form-group" style="margin-bottom:6px"><label class="form-label">Link do vídeo (YouTube/Drive)</label><input class="form-input bvideo" placeholder="https://..." value="${data.video_url||''}" style="font-size:13px;padding:8px 10px"></div>
    <div class="form-group" style="margin-bottom:4px">
      <label class="form-label" style="margin-bottom:6px">Timer <span style="color:var(--muted);font-weight:400;text-transform:none">(opcional)</span></label>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <select class="form-input btimer-type" style="font-size:12px;padding:6px 10px;max-width:160px" onchange="onTimerTypeChange(this,'${id}')">
          <option value="none" ${timerType==='none'?'selected':''}>Sem timer</option>
          <option value="amrap" ${timerType==='amrap'?'selected':''}>AMRAP</option>
          <option value="emom" ${timerType==='emom'?'selected':''}>EMOM</option>
          <option value="tabata" ${timerType==='tabata'?'selected':''}>Tabata</option>
          <option value="fortime" ${timerType==='fortime'?'selected':''}>For Time</option>
          <option value="countdown" ${timerType==='countdown'?'selected':''}>Countdown</option>
        </select>
      </div>
      <div class="timer-config ${timerType!=='none'?'show':''}" id="tcfg-${id}">
        ${renderTimerConfig(id,data)}
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-danger btn-xs" onclick="document.getElementById('bfi-${id}').remove()">Remover bloco</button></div>`;
  document.getElementById('blocksFormList').appendChild(div);
}

function renderTimerConfig(id,data={}){
  const t=data.timer_type||'none';
  if(t==='none')return'';
  if(t==='amrap')return`<div class="form-row-2" style="margin-top:8px"><div class="form-group"><label class="form-label">Duração (min)</label><input class="form-input btdur" value="${data.timer_duration||''}" placeholder="8" style="font-size:13px;padding:7px 10px"></div></div>`;
  if(t==='emom')return`<div class="form-row-2" style="margin-top:8px"><div class="form-group"><label class="form-label">Intervalo (min)</label><input class="form-input btemom-int" value="${data.timer_interval||1}" placeholder="1" type="number" min="1" style="font-size:13px;padding:7px 10px"></div><div class="form-group"><label class="form-label">Rounds</label><input class="form-input btrounds" value="${data.timer_rounds||''}" placeholder="10" style="font-size:13px;padding:7px 10px"></div></div>`;
  if(t==='tabata')return`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px"><div class="form-group"><label class="form-label">Trabalho (seg)</label><input class="form-input btwork" value="${data.timer_work||20}" placeholder="20" style="font-size:13px;padding:7px 10px"></div><div class="form-group"><label class="form-label">Descanso (seg)</label><input class="form-input btrest" value="${data.timer_rest||10}" placeholder="10" style="font-size:13px;padding:7px 10px"></div><div class="form-group"><label class="form-label">Rounds</label><input class="form-input btrounds" value="${data.timer_rounds||8}" placeholder="8" style="font-size:13px;padding:7px 10px"></div></div>`;
  if(t==='countdown')return`<div class="form-row-2" style="margin-top:8px"><div class="form-group"><label class="form-label">Duração (min)</label><input class="form-input btdur" value="${data.timer_duration||''}" placeholder="5" style="font-size:13px;padding:7px 10px"></div></div>`;
  if(t==='fortime')return`<div style="margin-top:6px;font-size:12px;color:var(--muted)">Cronómetro crescente — o cliente para quando terminar.</div>`;
  return'';
}

function onTimerTypeChange(sel,id){
  const cfg=document.getElementById('tcfg-'+id);
  const t=sel.value;
  const item=sel.closest('.block-form-item');
  cfg.innerHTML=renderTimerConfig(id,{timer_type:t});
  cfg.classList.toggle('show',t!=='none');
}

function getBlocksFromForm(){
  return [...document.querySelectorAll('.block-form-item')].map((el,i)=>{
    const tt=el.querySelector('.btimer-type')?.value||'none';
    return{
      name:el.querySelector('.bname')?.value.trim()||'Bloco',
      duration:el.querySelector('.bdur')?.value.trim()||null,
      content:el.querySelector('.bcontent')?.value||'',
      video_url:el.querySelector('.bvideo')?.value.trim()||null,
      timer_type:tt,
      timer_duration:el.querySelector('.btdur')?.value||null,
      timer_interval:el.querySelector('.btemom-int')?.value||null,
      timer_work:el.querySelector('.btwork')?.value||null,
      timer_rest:el.querySelector('.btrest')?.value||null,
      timer_rounds:el.querySelector('.btrounds')?.value||null,
      sort_order:i,
    };
  });
}
// end
