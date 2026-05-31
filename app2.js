
function openNewWorkout(){
  document.getElementById('wId').value='';
  document.getElementById('wTitle').value='';
  document.getElementById('wWeek').value='';
  document.getElementById('wDuration').value='';
  document.getElementById('wNotes').value='';
  document.getElementById('blocksFormList').innerHTML='';
  blockCount=0;
  // Add default blocks
  addBlockForm({name:'Warm Up'});
  addBlockForm({name:'Bloco 1'});
  addBlockForm({name:'Bloco 2'});
  document.getElementById('modalWkTitle').textContent='Novo treino';
  openModal('modalWorkout');
}

async function saveWorkout(){
  const id=document.getElementById('wId').value;
  const data={
    client_id:S.currentClientId,
    title:document.getElementById('wTitle').value.trim(),
    day:document.getElementById('wDay').value,
    week:document.getElementById('wWeek').value.trim(),
    duration:document.getElementById('wDuration').value||null,
    notes:document.getElementById('wNotes').value.trim(),
    status:id?(S.workouts.find(w=>w.id===id)?.status||'prep'):'prep',
  };
  if(!data.title){toast('Insere o nome do treino','err');return;}
  const blockData=getBlocksFromForm();

  let wId=id;
  if(id){
    const{error}=await sb.from('workouts').update(data).eq('id',id);
    if(error){toast('Erro: '+error.message,'err');return;}
    await sb.from('blocks').delete().eq('workout_id',id);
  } else {
    const{data:rows,error}=await sb.from('workouts').insert(data).select('*');
    if(error){toast('Erro: '+error.message,'err');return;}
    wId=Array.isArray(rows)?rows[0].id:rows.id;
  }
  if(blockData.length){
    const{error:be}=await sb.from('blocks').insert(blockData.map(b=>({...b,workout_id:wId})));
    if(be){toast('Erro nos blocos: '+be.message,'err');return;}
  }
  closeModal('modalWorkout');toast(id?'Treino atualizado!':'Treino criado!');
  await loadAll();renderWorkouts();
}

function editWorkout(id){
  const w=S.workouts.find(x=>x.id===id);
  const blks=S.blocks.filter(b=>b.workout_id===id);
  document.getElementById('wId').value=w.id;
  document.getElementById('wTitle').value=w.title||'';
  document.getElementById('wDay').value=w.day||'Segunda';
  document.getElementById('wWeek').value=w.week||'';
  document.getElementById('wDuration').value=w.duration||'';
  document.getElementById('wNotes').value=w.notes||'';
  document.getElementById('blocksFormList').innerHTML='';
  blockCount=0;
  blks.forEach(b=>addBlockForm(b));
  if(!blks.length){addBlockForm({name:'Warm Up'});addBlockForm({name:'Bloco 1'});}
  document.getElementById('modalWkTitle').textContent='Editar treino';
  openModal('modalWorkout');
}

async function deleteWorkout(id){
  if(!confirm('Apagar este treino?'))return;
  await sb.from('workouts').delete().eq('id',id);
  toast('Treino apagado');await loadAll();renderWorkouts();
}

// ══════════════════════════════
//  VIDEOS
// ══════════════════════════════
function openNewVideo(){
  ['vId','vName','vBase','vUrl','vNotes'].forEach(i=>document.getElementById(i).value='');
  openModal('modalVideo');
}
function renderVideos(){
  const el=document.getElementById('videosList');
  if(!S.videos.length){el.innerHTML=`<div class="empty"><div class="empty-icon">📹</div><div>Ainda não tens vídeos.<br>Adiciona links do YouTube ou Google Drive.</div></div>`;return;}
  const ti={'Demonstração':'🎬','Regressão':'⬇️','Progressão':'⬆️','Erros comuns':'⚠️'};
  el.innerHTML=`<div class="videos-grid">${S.videos.map(v=>`
    <div class="video-card">
      <div onclick="playVideo('${v.id}')" style="cursor:pointer">
        <div class="video-thumb">${ti[v.type]||'🎬'}<div class="video-play-ov"><div class="play-circle"><div class="play-tri"></div></div></div></div>
      </div>
      <div class="video-info">
        <div class="video-name">${v.name}</div>
        <div class="video-type">${v.type}${v.base_exercise?' · '+v.base_exercise:''}</div>
        <div style="display:flex;gap:5px;margin-top:8px">
          <button class="btn btn-ghost btn-xs" style="flex:1" onclick="editVideo('${v.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-xs" style="flex:1" onclick="deleteVideo('${v.id}')">✕ Apagar</button>
        </div>
      </div>
    </div>`).join('')}</div>`;
}
async function saveVideo(){
  const id=document.getElementById('vId').value;
  const data={name:document.getElementById('vName').value.trim(),type:document.getElementById('vType').value,base_exercise:document.getElementById('vBase').value.trim(),url:document.getElementById('vUrl').value.trim(),notes:document.getElementById('vNotes').value.trim()};
  if(!data.name){toast('Insere o nome do exercício','err');return;}
  const{error}=id?await sb.from('videos').update(data).eq('id',id):await sb.from('videos').insert(data);
  if(error){toast('Erro: '+error.message,'err');return;}
  closeModal('modalVideo');toast('Vídeo guardado!');
  ['vId','vName','vBase','vUrl','vNotes'].forEach(i=>document.getElementById(i).value='');
  await loadAll();renderVideos();
}
function editVideo(id){
  const v=S.videos.find(x=>x.id===id);
  document.getElementById('vId').value=v.id;
  document.getElementById('vName').value=v.name||'';
  document.getElementById('vType').value=v.type||'Demonstração';
  document.getElementById('vBase').value=v.base_exercise||'';
  document.getElementById('vUrl').value=v.url||'';
  document.getElementById('vNotes').value=v.notes||'';
  openModal('modalVideo');
}
async function deleteVideo(id){
  if(!confirm('Apagar este vídeo?'))return;
  const{error}=await sb.from('videos').delete().eq('id',id);
  if(error){toast('Erro ao apagar','err');return;}
  toast('Vídeo apagado');
  await loadAll();renderVideos();
}
function playVideo(vid){
  const v=S.videos.find(x=>x.id===vid);if(!v)return;
  playUrl(v.url,v.name,v.notes,v);
}
function playUrl(url,title,notes,v){
  document.getElementById('playerTitle').textContent=title||'Vídeo';
  const prev=document.getElementById('playerPreview');
  if(url){
    const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?]+)/);
    if(yt)prev.innerHTML=`<iframe src="https://www.youtube.com/embed/${yt[1]}?rel=0" allowfullscreen></iframe>`;
    else prev.innerHTML=`<div style="text-align:center;color:var(--muted)"><div style="font-size:28px;margin-bottom:8px">🔗</div><a href="${url}" target="_blank" style="color:var(--accent);font-size:13px">Abrir vídeo ↗</a></div>`;
  } else {prev.innerHTML=`<div style="text-align:center;color:var(--muted)"><div style="font-size:28px;margin-bottom:8px">📹</div><div style="font-size:13px">Sem vídeo</div></div>`;}
  document.getElementById('playerNotes').textContent=notes||'';
  let html='';
  if(v){
    const base=v.base_exercise||v.name;
    const regs=S.videos.filter(x=>x.id!==v.id&&x.type==='Regressão'&&(x.base_exercise===base||x.base_exercise===v.name));
    const progs=S.videos.filter(x=>x.id!==v.id&&x.type==='Progressão'&&(x.base_exercise===base||x.base_exercise===v.name));
    if(regs.length)html+=`<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Regressões</div>${regs.map(r=>`<div onclick="playVideo('${r.id}')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;background:var(--s2);margin-bottom:5px;cursor:pointer;font-size:13px"><span style="color:var(--muted)">⬇</span>${r.name}<span style="font-size:11px;color:var(--muted);margin-left:auto">mais fácil</span></div>`).join('')}</div>`;
    if(progs.length)html+=`<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Progressões</div>${progs.map(p=>`<div onclick="playVideo('${p.id}')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;background:var(--s2);margin-bottom:5px;cursor:pointer;font-size:13px"><span style="color:var(--green)">⬆</span>${p.name}<span style="font-size:11px;color:var(--muted);margin-left:auto">mais difícil</span></div>`).join('')}</div>`;
  }
  document.getElementById('playerProgs').innerHTML=html;
  openModal('modalPlayer');
}

// ══════════════════════════════
//  SHARE
// ══════════════════════════════
function shareClient(id){S.currentClientId=id;openShareModal();}
function openShareModal(){
  const c=S.clients.find(x=>x.id===S.currentClientId);if(!c)return;
  document.getElementById('shareTitle').textContent='Link · '+c.name;
  document.getElementById('shareLinkInput').value=location.origin+location.pathname+'?t='+c.access_token;
  openModal('modalShare');
}
function copyLink(){navigator.clipboard.writeText(document.getElementById('shareLinkInput').value);toast('Link copiado!');}
function openWhatsApp(){const url=document.getElementById('shareLinkInput').value;const c=S.clients.find(x=>x.id===S.currentClientId);window.open(`https://wa.me/?text=Olá ${c?.name?.split(' ')[0]}! Aqui estão os teus treinos: ${url}`);}
function openEmail(){const url=document.getElementById('shareLinkInput').value;const c=S.clients.find(x=>x.id===S.currentClientId);window.open(`mailto:?subject=Os teus treinos CaliPT&body=Olá ${c?.name?.split(' ')[0]}!%0A%0AOs teus treinos estão aqui:%0A${url}`);}

// ══════════════════════════════════════════
//  CLIENT PUBLIC VIEW
// ══════════════════════════════════════════
async function showClientView(token){
  document.getElementById('topnav').innerHTML=`<div class="logo">CALI<span>PT</span></div>`;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-client').classList.add('active');
  const content=document.getElementById('clientViewContent');
  content.innerHTML=`<div class="loading"><div class="spinner"></div><span>A carregar os teus treinos...</span></div>`;

  const{data:clients}=await sb.from('clients').select('*').eq('access_token',token);
  if(!clients||!clients.length){content.innerHTML=`<div class="empty"><div class="empty-icon">😕</div><div>Link inválido. Pede um novo link ao teu PT.</div></div>`;return;}
  const client=clients[0];

  const[{data:workouts},{data:blocks},{data:videos}]=await Promise.all([
    sb.from('workouts').select('*').eq('client_id',client.id).order('created_at'),
    sb.from('blocks').select('*').order('sort_order'),
    sb.from('videos').select('*'),
  ]);

  // Only show sent or done workouts
  const visibleWks=(workouts||[]).filter(w=>w.status==='sent'||w.status==='done');

  const wIds=visibleWks.map(w=>w.id);
  let completions=[];
  if(wIds.length){const{data:comp}=await sb.from('completions').select('*').in('workout_id',wIds);completions=comp||[];}

  S.videos=videos||[];

  const total=visibleWks.length;
  const done=visibleWks.filter(w=>completions.some(c=>c.workout_id===w.id)).length;
  const pct=total?Math.round((done/total)*100):0;
  const ini=client.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

  content.innerHTML=`
    <div class="cv-header">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="avatar av1" style="width:52px;height:52px;font-size:17px">${ini}</div>
        <div><div class="cv-greeting">Olá, ${client.name.split(' ')[0]}! 👋</div><div class="cv-sub">${client.level||''} · ${client.location||''} · ${client.frequency||''}</div></div>
      </div>
      <div style="margin-top:14px">
        <div class="prog-label"><span>Progresso</span><span id="cvProgLabel">${done}/${total} treinos concluídos</span></div>
        <div class="prog-track"><div class="prog-fill" id="cvProgFill" style="width:${pct}%"></div></div>
      </div>
    </div>
    ${total===0?`<div class="empty"><div class="empty-icon">🏋️</div><div>O teu PT ainda não enviou treinos.<br>Fica atento!</div></div>`:''}
    ${visibleWks.map(w=>{
      const blks=(blocks||[]).filter(b=>b.workout_id===w.id);
      const isDone=completions.some(c=>c.workout_id===w.id);
      return `<div class="cwc" id="cwc-${w.id}">
        <div class="cwc-head">
          <div style="flex:1">
            <div class="cwc-day">${w.day||''} ${w.week?'· '+w.week:''}</div>
            <div class="cwc-title">${w.title}</div>
          </div>
          <div class="done-circle ${isDone?'done':''}" id="dcirc-${w.id}">${isDone?'✓':'○'}</div>
        </div>
        <div class="cv-blocks">
          ${blks.map(b=>renderClientBlock(b,videos||[])).join('')}
          ${w.notes?`<div style="font-size:12px;color:var(--muted);line-height:1.6;padding:4px 2px">📝 ${w.notes}</div>`:''}
        </div>
        <button class="complete-btn ${isDone?'done':''}" id="cbtn-${w.id}" onclick="clientComplete('${w.id}')" ${isDone?'disabled':''}>
          ${isDone?'✓ Treino concluído':'Marcar como concluído ✓'}
        </button>
      </div>`;
    }).join('')}`;

  window._cvDone=done;window._cvTotal=total;
}

function renderClientBlock(b,videos){
  _blockRegistry[b.id]=b;
  const hasTimer=b.timer_type&&b.timer_type!=='none';
  const vidBtn=b.video_url?`<button class="block-video-btn" onclick="playUrl('${b.video_url}','${b.name}')">▶ Vídeo</button>`:'';
  const timerBadge=hasTimer?`<span class="timer-badge">⏱ ${timerLabel(b)}</span>`:'';
  return `<div class="cv-block">
    <div class="cv-block-head">
      <div class="cv-block-name">${b.name}</div>
      ${b.duration?`<span class="cv-block-dur">${b.duration}</span>`:''}
      ${timerBadge}
      ${vidBtn}
    </div>
    <div class="cv-block-content">${safeContent(b.content)}</div>
    ${hasTimer?`<div class="timer-wrap">${renderTimer(b)}</div>`:''}
  </div>`;
}

// ══════════════════════════════
//  TIMER RENDER + ENGINE
// ══════════════════════════════
let timers={};// {blockId: timerState}

function renderTimer(b){
  _blockRegistry[b.id]=b;
  const bid=b.id;
  const t=b.timer_type;
  let infoText='';
  if(t==='amrap')infoText=`AMRAP · ${b.timer_duration||'?'} minutos`;
  else if(t==='emom')infoText=`EMOM · a cada ${b.timer_interval||1} min · ${b.timer_rounds||'?'} rounds`;
  else if(t==='tabata')infoText=`Tabata · ${b.timer_work||20}"/${b.timer_rest||10}" · ${b.timer_rounds||8} rounds`;
  else if(t==='fortime')infoText=`For Time`;
  else if(t==='countdown')infoText=`Countdown · ${b.timer_duration||'?'} minutos`;

  return `<div class="timer-top">
      <span class="timer-type-label">${t.toUpperCase()}</span>
      <span class="timer-info">${infoText}</span>
    </div>
    <div class="timer-display">
      <div class="timer-phase countdown" id="tphase-${bid}">PRONTO</div>
      <div class="timer-clock countdown" id="tclock-${bid}">
        ${t==='amrap'||t==='fortime'?'00:00':t==='tabata'?fmt(parseInt(b.timer_work||20)):t==='emom'?fmt(parseInt((b.timer_interval||1)*60)):fmt(parseInt((b.timer_duration||5)*60))}
      </div>
      <div class="timer-rounds" id="trounds-${bid}">${t==='tabata'||t==='emom'?'Round 0 / '+(b.timer_rounds||'?'):''}</div>
    </div>
    <div class="timer-controls">
      <button class="timer-btn timer-btn-start" id="tbtn-${bid}" onclick="timerAction('${bid}','start')">Iniciar</button>
      <button class="timer-btn timer-btn-reset" onclick="timerReset('${bid}')">Reset</button>
    </div>`;
}

function fmt(s){if(isNaN(s)||s<0)s=0;const m=Math.floor(s/60),sec=s%60;return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}

// Audio beeps
function beep(freq=880,dur=0.1,vol=0.3){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=freq;g.gain.value=vol;
    o.start();o.stop(ctx.currentTime+dur);
    setTimeout(()=>ctx.close(),dur*1000+100);
  }catch(e){}
}
function beepShort(){beep(880,0.08);}
function beepLong(){beep(660,0.4,0.4);}
function beepCountdown(){beep(1000,0.06);}

function timerAction(bid,action){
  const b=_blockRegistry[bid];if(!b)return;
  const btn=document.getElementById('tbtn-'+bid);
  const state=timers[bid];

  if(action==='start'){
    if(state&&state.running){
      // Pause
      clearInterval(state.interval);state.running=false;
      btn.textContent='Continuar';btn.className='timer-btn timer-btn-start';
    } else if(state&&!state.running&&state.started){
      // Resume
      state.running=true;btn.textContent='Pausar';btn.className='timer-btn timer-btn-pause';
      state.interval=setInterval(()=>timerTick(bid),1000);
    } else {
      // Fresh start — 5s countdown
      timers[bid]={b,running:true,started:true,phase:'countdown',countdownSec:5,elapsed:0,round:1,workPhase:true,interval:null};
      btn.textContent='Pausar';btn.className='timer-btn timer-btn-pause';
      setClock(bid,'countdown','PRONTO','5',timers[bid]);
      timers[bid].interval=setInterval(()=>timerTick(bid),1000);
    }
  }
}

function timerReset(bid){
  const b=_blockRegistry[bid];if(!b)return;
  const state=timers[bid];
  if(state){clearInterval(state.interval);}
  timers[bid]=null;
  const btn=document.getElementById('tbtn-'+bid);
  btn.textContent='Iniciar';btn.className='timer-btn timer-btn-start';
  const t=b.timer_type;
  let initTime='00:00';
  if(t==='tabata')initTime=fmt(parseInt(b.timer_work||20));
  else if(t==='emom')initTime=fmt(parseInt((b.timer_interval||1)*60));
  else if(t==='countdown')initTime=fmt(parseInt((b.timer_duration||5)*60));
  document.getElementById('tclock-'+bid).textContent=initTime;
  document.getElementById('tclock-'+bid).className='timer-clock countdown';
  document.getElementById('tphase-'+bid).textContent='PRONTO';
  document.getElementById('tphase-'+bid).className='timer-phase countdown';
  document.getElementById('trounds-'+bid).textContent=(t==='tabata'||t==='emom')?`Round 0 / ${b.timer_rounds||'?'}`:'';
}

function setClock(bid,phase,phaseLabel,timeStr,state){
  const cl=document.getElementById('tclock-'+bid);
  const ph=document.getElementById('tphase-'+bid);
  const rd=document.getElementById('trounds-'+bid);
  if(cl){cl.textContent=timeStr;cl.className='timer-clock '+phase;}
  if(ph){ph.textContent=phaseLabel;ph.className='timer-phase '+phase;}
  const b=state.b;
  const t=b.timer_type;
  if(rd){
    if(t==='tabata'||t==='emom')rd.textContent=`Round ${state.round} / ${b.timer_rounds||'?'}`;
    else rd.textContent='';
  }
}

function timerTick(bid){
  const state=timers[bid];if(!state||!state.running)return;
  const b=state.b;const t=b.timer_type;

  // ── Countdown 5s before start ──
  if(state.phase==='countdown'){
    state.countdownSec--;
    if(state.countdownSec>0){
      beepCountdown();
      setClock(bid,'countdown','PREPARAR',String(state.countdownSec),state);
    } else {
      beepLong();
      state.phase='work';state.elapsed=0;
      if(t==='tabata'){state.phaseSec=parseInt(b.timer_work||20);}
      else if(t==='emom'){state.phaseSec=parseInt((b.timer_interval||1)*60);}
      else if(t==='countdown'||t==='amrap'){state.phaseSec=parseInt((b.timer_duration||5)*60);}
      else if(t==='fortime'){state.phaseSec=0;}
      setClock(bid,'work',t==='fortime'?'FOR TIME':t==='amrap'?'AMRAP':t==='countdown'?'COUNTDOWN':t==='emom'?'EMOM':'TRABALHO',t==='fortime'||t==='amrap'?'00:00':fmt(state.phaseSec),state);
    }
    return;
  }

  // ── AMRAP / For Time (count up) ──
  if(t==='amrap'||t==='fortime'){
    state.elapsed++;
    const beepThreshold=[3,2,1];
    if(t==='amrap'){
      const remaining=parseInt((b.timer_duration||5)*60)-state.elapsed;
      if(beepThreshold.includes(remaining))beepShort();
      if(remaining<=0){beepLong();timerDone(bid);return;}
      setClock(bid,'work',t==='amrap'?'AMRAP':'FOR TIME',fmt(state.elapsed),state);
    } else {
      setClock(bid,'work','FOR TIME',fmt(state.elapsed),state);
    }
    return;
  }

  // ── Countdown ──
  if(t==='countdown'){
    state.phaseSec--;
    if([3,2,1].includes(state.phaseSec))beepShort();
    if(state.phaseSec<=0){beepLong();timerDone(bid);return;}
    setClock(bid,'work','COUNTDOWN',fmt(state.phaseSec),state);
    return;
  }

  // ── Tabata ──
  if(t==='tabata'){
    state.phaseSec--;
    if([3,2,1].includes(state.phaseSec))beepShort();
    if(state.phaseSec<=0){
      beepLong();
      if(state.workPhase){
        // Switch to rest
        state.workPhase=false;state.phaseSec=parseInt(b.timer_rest||10);
        setClock(bid,'rest','DESCANSO',fmt(state.phaseSec),state);
      } else {
        // End of rest — next round
        state.round++;
        if(state.round>parseInt(b.timer_rounds||8)){timerDone(bid);return;}
        state.workPhase=true;state.phaseSec=parseInt(b.timer_work||20);
        setClock(bid,'work','TRABALHO',fmt(state.phaseSec),state);
      }
      return;
    }
    setClock(bid,state.workPhase?'work':'rest',state.workPhase?'TRABALHO':'DESCANSO',fmt(state.phaseSec),state);
    return;
  }

  // ── EMOM ──
  if(t==='emom'){
    state.phaseSec--;
    if([3,2,1].includes(state.phaseSec))beepShort();
    if(state.phaseSec<=0){
      beepLong();
      state.round++;
      if(state.round>parseInt(b.timer_rounds||10)){timerDone(bid);return;}
      state.phaseSec=parseInt((b.timer_interval||1)*60);
      setClock(bid,'work','EMOM',fmt(state.phaseSec),state);
      return;
    }
    setClock(bid,'work','EMOM',fmt(state.phaseSec),state);
    return;
  }
}

function timerDone(bid){
  const state=timers[bid];if(!state)return;
  clearInterval(state.interval);state.running=false;
  beepLong();setTimeout(beepLong,400);
  const btn=document.getElementById('tbtn-'+bid);
  if(btn){btn.textContent='Iniciar';btn.className='timer-btn timer-btn-start';}
  setClock(bid,'work','CONCLUÍDO','✓',state);
  timers[bid]=null;
}

// ══════════════════════════════
//  CLIENT COMPLETE
// ══════════════════════════════
async function clientComplete(wId){
  const btn=document.getElementById('cbtn-'+wId);
  const circ=document.getElementById('dcirc-'+wId);
  btn.disabled=true;btn.textContent='A guardar...';
  const{error}=await sb.from('completions').insert({workout_id:wId});
  if(error&&!error.message.includes('duplicate')){
    btn.disabled=false;btn.textContent='Marcar como concluído ✓';
    toast('Erro ao guardar','err');return;
  }
  btn.classList.add('done');btn.textContent='✓ Treino concluído';
  circ.classList.add('done');circ.textContent='✓';
  window._cvDone=(window._cvDone||0)+1;
  const pct=Math.round((window._cvDone/window._cvTotal)*100);
  document.getElementById('cvProgFill').style.width=pct+'%';
  document.getElementById('cvProgLabel').textContent=`${window._cvDone}/${window._cvTotal} treinos concluídos`;
  toast('Excelente! Treino concluído 💪');
}
// end
