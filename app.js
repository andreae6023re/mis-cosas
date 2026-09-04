
// ============================================================
// SUPABASE / AUTENTICACIÓN
// ============================================================
const SUPABASE_URL='https://pmrhnwvrmqznenfkkumc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DCKU0ae2X_tXHyEwb6o1HA_OpP50Rpt';
const supabaseClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let currentUser=null;
let authMode='login';

function showAuthMessage(message,type=''){
 const el=document.querySelector('#authMessage');
 if(el){el.textContent=message||'';el.className='auth-message '+type}
}
function showAuth(mode='login'){
 authMode=mode;
 document.querySelector('#authScreen')?.classList.remove('hidden');
 document.querySelector('#appShell')?.classList.add('hidden');
 const title=document.querySelector('#authTitle'),sub=document.querySelector('#authSubtitle'),submit=document.querySelector('#authSubmit'),toggle=document.querySelector('#authToggle');
 if(!title)return;
 if(mode==='signup'){
  title.textContent='Crear cuenta';
  sub.textContent='Crea tu cuenta para usar Mis cosas en todos tus dispositivos.';
  submit.textContent='Crear cuenta';
  toggle.textContent='¿Ya tienes cuenta? Iniciar sesión';
 }else{
  title.textContent='Iniciar sesión';
  sub.textContent='Accede para tener tus datos sincronizados entre dispositivos.';
  submit.textContent='Entrar';
  toggle.textContent='¿No tienes cuenta? Crear una';
 }
 showAuthMessage('');
}
function showApp(){
 document.querySelector('#authScreen')?.classList.add('hidden');
 document.querySelector('#appShell')?.classList.remove('hidden');
}
async function ensureCloudRow(user){
 if(!supabaseClient||!user)return;
 const {data,error}=await supabaseClient.from('app_data').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(!data){
  const {error:insertError}=await supabaseClient.from('app_data').insert({user_id:user.id,data:{}});
  if(insertError)throw insertError;
 }
}
async function handleAuthSubmit(e){
 e.preventDefault();
 if(!supabaseClient){showAuthMessage('No se ha podido cargar el servicio de autenticación.','error');return}
 const email=document.querySelector('#authEmail')?.value.trim();
 const password=document.querySelector('#authPassword')?.value||'';
 if(!email||password.length<6){showAuthMessage('Introduce un email y una contraseña de al menos 6 caracteres.','error');return}
 const submit=document.querySelector('#authSubmit');
 submit.disabled=true;showAuthMessage('Conectando…');
 try{
  let result;
  if(authMode==='signup') result=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
  else result=await supabaseClient.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
  if(authMode==='signup'&&!result.data.session){
   showAuthMessage('Cuenta creada. Revisa tu email para confirmar la cuenta y después inicia sesión.','success');
   document.querySelector('#authPassword').value='';
  }else if(result.data.user){
   currentUser=result.data.user;
   await ensureCloudRow(currentUser);
   showApp();applyAppearance();render();checkNotifications();
  }
 }catch(err){showAuthMessage(authErrorText(err),'error')}
 finally{submit.disabled=false}
}
function authErrorText(err){
 const m=String(err?.message||err||'');
 if(/invalid login credentials/i.test(m))return 'Email o contraseña incorrectos.';
 if(/user already registered/i.test(m))return 'Este email ya tiene una cuenta. Inicia sesión.';
 if(/password/i.test(m)&&/6|characters|length/i.test(m))return 'La contraseña debe tener al menos 6 caracteres.';
 return m||'No se ha podido completar la operación.';
}
async function logout(){if(!supabaseClient)return;await supabaseClient.auth.signOut();currentUser=null;showAuth('login')}
async function initAuth(){
 if(!supabaseClient){showAuthMessage('No se ha podido cargar Supabase. Comprueba tu conexión.','error');showAuth('login');return}
 document.querySelector('#authForm')?.addEventListener('submit',handleAuthSubmit);
 document.querySelector('#authToggle')?.addEventListener('click',()=>showAuth(authMode==='login'?'signup':'login'));
 const {data,error}=await supabaseClient.auth.getSession();
 if(error){showAuthMessage(error.message,'error');showAuth('login');return}
 if(data.session?.user){
  currentUser=data.session.user;
  try{await ensureCloudRow(currentUser);showApp();applyAppearance();render();checkNotifications();setInterval(checkNotifications,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNotifications(true)})}
  catch(err){showAuthMessage('No se ha podido preparar tu espacio en la nube. '+authErrorText(err),'error');showAuth('login')}
 }else showAuth('login');
 supabaseClient.auth.onAuthStateChange((_event,session)=>{
  if(session?.user){currentUser=session.user;showApp()}
  else{currentUser=null;showAuth('login')}
 });
}
const KEY='mis_cosas_';
const state={
 view:'home',
 tasks:JSON.parse(localStorage.getItem(KEY+'tasks')||'[]'),
 expenses:JSON.parse(localStorage.getItem(KEY+'expenses')||'[]'),
 transactions:JSON.parse(localStorage.getItem(KEY+'transactions')||'[]'),
 accounts:JSON.parse(localStorage.getItem(KEY+'accounts')||'null')||null,
 budgets:JSON.parse(localStorage.getItem(KEY+'budgets')||'[]'),
 events:JSON.parse(localStorage.getItem(KEY+'events')||'[]'),
 habits:JSON.parse(localStorage.getItem(KEY+'habits')||'[]'),
 recipes:JSON.parse(localStorage.getItem(KEY+'recipes')||'[]'),
 inventory:JSON.parse(localStorage.getItem(KEY+'inventory')||'[]'),
 preparations:JSON.parse(localStorage.getItem(KEY+'preparations')||'[]'),
 shoppingChecks:JSON.parse(localStorage.getItem(KEY+'shoppingChecks')||'{}'),
 prepDone:JSON.parse(localStorage.getItem(KEY+'prepDone')||'{}'),
 menu:JSON.parse(localStorage.getItem(KEY+'menu')||'null')||null,
 calendarMonth:localStorage.getItem(KEY+'calendarMonth')||`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
};
const cats={Casa:'#ab858f',Cumpleaños:'#a0acb9',Familia:'#9ebdb8',Médico:'#b3ad8c','Médicos familia':'#67a48b',Otros:'#7f9a7d',Social:'#9998b1',Vacaciones:'#cbafab',Viajes:'#9cabc8'};
const habitColors=['#7F9A7D','#9CABC8','#A0ACB9','#9EBDB8','#B3AD8C','#CBAFAB','#9998B1','#8F9E92'];
const foodTypes=['Comidas','Cenas','Dulces','Pan','Preparaciones'];
const fmt=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:(state.settings?.currency||'EUR')}).format(n||0);
const todayKey=()=>{const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const today=new Date();
function save(){Object.keys(state).forEach(k=>{if(k==='calendarMonth'){localStorage.setItem(KEY+k,String(state[k]||''));return}if(Array.isArray(state[k])||k==='settings'||k==='menu'||k==='shoppingChecks'||k==='prepDone')localStorage.setItem(KEY+k,JSON.stringify(state[k]))})}
function go(v){state.view=v;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render()}
function render(){
 const names={home:['Inicio',''],tasks:['Tareas','Pendientes y recordatorios'],expenses:['Gastos','Control mensual y cuentas'],food:['Comidas','Menú, inventario y recetas'],calendar:['Calendario','Eventos y cumpleaños'],habits:['Hábitos','Pequeños hábitos, todos los días'],settings:['Ajustes','Configura la aplicación']};
 document.querySelector('#pageTitle').textContent=names[state.view][0];document.querySelector('#pageSubtitle').textContent=names[state.view][1];
 ({home,tasks,expenses,food,calendar,habits,settings}[state.view])(document.querySelector('#content'));
}
function home(c){
 const d=today.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}),pending=state.tasks.filter(x=>!x.done).length;
 const spent=state.transactions.filter(x=>x.type==='expense'&&sameMonth(x.date)).reduce((a,x)=>a+Number(x.amount||0),0);
 c.innerHTML=`<div class="grid">
 <div class="card span-8"><div class="muted">Hoy</div><div class="metric">${cap(d)}</div><div class="calendar-mini"></div></div>
 <div class="card span-4"><div class="row"><h3>Ahora</h3><span class="badge">${pending}</span></div><div class="list compact"><div class="item"><b>${pending}</b> tareas pendientes</div>${homePendingTasks()}<div class="item">${todayHabitsSummary()}</div></div><button class="primary" onclick="go('tasks')">Ver tareas</button></div>
 <div class="card span-4"><h3>Tareas</h3><div class="metric">${pending}</div><span class="muted">pendientes</span></div>
 <div class="card span-4"><h3>Gastos este mes</h3><div class="metric">${fmt(spent)}</div><span class="muted">de momento</span></div>
 <div class="card span-8 home-food-card"><div class="row"><div><h3>Comidas</h3><span class="muted">Tu menú y tus recetas, a mano.</span></div><button class="secondary small" onclick="go('food')">Ver Comidas</button></div><div class="home-food-content">${homeTodayMeal()}${homeRecipes()}</div></div>
 <div class="card span-4 home-prep-card"><div class="row"><div><h3>Preparar esta semana</h3><span class="muted">${state.preparations.length?`${state.preparations.filter(x=>!state.prepDone[x.id]).length} pendientes`:'Sin preparaciones'}</span></div><button class="secondary small" onclick="go('food')">Comidas</button></div>${homePreparations()}</div>
 <div class="card span-12"><div class="row"><div><h3>Hábitos de hoy</h3><span class="muted">Toca el botón para marcar cada hábito.</span></div><button class="secondary" onclick="go('habits')">Gestionar hábitos</button></div><div class="habit-home-grid">${habitButtons()}</div></div>
 </div>`;
 renderMiniCalendar(c.querySelector('.calendar-mini'));
}
function homeTodayMeal(){
 const menu=state.menu?.days;
 if(!menu)return '<div class="home-food-empty">Todavía no tienes un menú semanal. <button class="text-button" onclick="go(\'food\')">Ir a Comidas →</button></div>';
 const i=(today.getDay()+6)%7, day=menu[i];
 if(!day)return '<div class="home-food-empty">Todavía no hay menú para hoy.</div>';
 return `<div class="home-today-meal"><div class="eyebrow">Hoy</div><div><span>Comida</span><strong>${esc(day.lunch||'Sin planificar')}</strong></div><div><span>Cena</span><strong>${esc(day.dinner||'Sin planificar')}</strong></div>${day.tupper?'<span class="pill home-tupper">Tupper</span>':''}</div>`;
}
function homeRecipes(){
 const recipes=[...state.recipes].sort((a,b)=>(b.favorite?1:0)-(a.favorite?1:0)).slice(0,4);
 if(!recipes.length)return '<div class="home-recipes-empty"><span>Aún no tienes recetas guardadas.</span><button class="text-button" onclick="go(\'food\')">Añadir una →</button></div>';
 return `<div class="home-recipes"><div class="home-section-title"><b>Mis recetas</b><button class="text-button" onclick="go(\'food\')">Ver todas →</button></div>${recipes.map(r=>`<button class="home-recipe-row" onclick="viewRecipe(\'${r.id}\')"><span class="home-recipe-type">${esc(r.type||'Receta')}</span><span class="home-recipe-name">${esc(r.name)}</span>${r.favorite?'<span class="favorite-mark">★</span>':''}</button>`).join('')}</div>`;
}
function homePreparations(){
 const pending=state.preparations.filter(x=>!state.prepDone[x.id]).slice(0,3);
 if(!pending.length)return '<div class="home-prep-empty">Todo preparado. 🎉</div>';
 return `<div class="home-prep-list">${pending.map(x=>`<button class="home-prep-row" onclick="togglePrep(\'${x.id}\')"><span class="check-mini"></span><span>${esc(x.name)}</span></button>`).join('')}</div>${state.preparations.length>3?'<button class="text-button" onclick="go(\'food\')">Ver todas →</button>':''}`;
}
function homePendingTasks(){const list=state.tasks.filter(x=>!x.done).sort(taskSort).slice(0,3);if(!list.length)return '<div class="item muted">No hay tareas pendientes.</div>';return list.map(t=>`<button class="home-task" onclick="go('tasks')"><span>${esc(t.title)}</span>${isOverdue(t)?'<span class="overdue-label">Atrasada</span>':''}</button>`).join('')}
function todayHabitsSummary(){const n=state.habits.length;if(!n)return 'Aún no tienes hábitos';const done=state.habits.filter(h=>isHabitDone(h,todayKey())).length;return `${done} de ${n} hábitos completados`}
function habitButtons(){if(!state.habits.length)return `<div class="empty-state"><span>No hay hábitos todavía.</span><button class="secondary" onclick="openModal('Nuevo hábito',habitForm())">+ Añadir hábito</button></div>`;return state.habits.map(h=>habitButton(h,true)).join('')}
function habitButton(h,home=false){const done=isHabitDone(h,todayKey());return `<button class="habit-button ${done?'done':''}" style="--habit-color:${h.color||habitColors[0]}" onclick="toggleHabit('${h.id}')" aria-label="${esc(h.name)} ${done?'completado':'pendiente'}"><span class="habit-check">${done?'✓':''}</span><span class="habit-name">${esc(h.name)}</span>${h.reminder?`<span class="habit-reminder">${h.reminderTime||''}</span>`:''}<span class="habit-frequency">${frequencyLabel(h)}</span></button>`}
function habits(c){
 const done=state.habits.filter(h=>isHabitDone(h,todayKey())).length;
 const total=state.habits.length;
 c.innerHTML=`<div class="grid">
 <div class="card span-12"><div class="row"><div><div class="eyebrow">Hoy</div><h2>${done}/${total} hábitos completados</h2><span class="muted">Toca cada botón para marcarlo.</span></div><button class="primary" onclick="openModal('Nuevo hábito',habitForm())">+ Añadir hábito</button></div><div class="habit-grid">${total?state.habits.map(h=>habitButton(h)).join(''):'<div class="empty-state"><span>Crea tu primer hábito.</span></div>'}</div></div>
 <div class="card span-8"><div class="row"><div><h3>Mi progreso</h3><span class="muted">Resumen de los últimos 7 días.</span></div></div><div class="habit-progress-grid">${state.habits.map(h=>{const count=habitLastDaysCount(h,7);const pct=Math.round(count/7*100);return `<div class="habit-progress-row"><div class="habit-progress-head"><b>${esc(h.name)}</b><span>${count}/7</span></div><div class="progress"><i style="width:${pct}%;background:${h.color||habitColors[0]}"></i></div><span class="muted small-text">${habitStreak(h)} racha actual</span></div>`}).join('')||'<div class="muted">Cuando tengas hábitos aparecerá aquí su progreso.</div>'}</div></div>
 <div class="card span-4"><h3>Recordatorios</h3><p class="muted">${notificationStatusText()}</p><button class="secondary" onclick="requestNotificationPermission()">Activar notificaciones</button></div>
 <div class="card span-12"><h3>Mis hábitos</h3><div class="list">${state.habits.map(h=>`<div class="habit-row"><span class="color-dot" style="background:${h.color||habitColors[0]}"></span><div class="habit-row-main"><b>${esc(h.name)}</b><span class="muted">${frequencyLabel(h)}${h.reminder?' · Recordatorio '+(h.reminderTime||''):''}</span><span class="muted small-text">${habitStreak(h)} días seguidos · ${habitLastDaysCount(h,7)}/7 esta semana</span></div><button class="secondary small" onclick="editHabit('${h.id}')">Editar</button></div>`).join('')||'<div class="muted">Aquí aparecerán tus hábitos.</div>'}</div></div></div>`;
}
function dateKeyOffset(days){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function habitLastDaysCount(h,n=7){let count=0;for(let i=0;i<n;i++)if(isHabitDone(h,dateKeyOffset(-i)))count++;return count}
function habitStreak(h){let streak=0;for(let i=0;i<365;i++){if(isHabitDone(h,dateKeyOffset(-i)))streak++;else break}return streak}
function notificationStatusText(){if(!('Notification' in window))return 'Este navegador no permite notificaciones.';if(Notification.permission==='granted')return 'Notificaciones activadas. Los recordatorios se comprobarán cuando la app esté abierta.';if(Notification.permission==='denied')return 'Las notificaciones están bloqueadas en el navegador. Puedes reactivarlas desde los permisos del sitio.';return 'Activa los permisos para recibir recordatorios.'}
async function requestNotificationPermission(){if(!('Notification' in window)){alert('Este navegador no permite notificaciones.');return}try{const permission=await Notification.requestPermission();state.settings.notifications=state.settings.notifications||{};state.settings.notifications.browserPermission=permission;save();render();if(permission==='granted')checkNotifications(true)}catch(e){alert('No se ha podido solicitar el permiso de notificaciones.')}}
function notify(title,body,tag){if(!('Notification' in window)||Notification.permission!=='granted')return;if(navigator.serviceWorker?.controller){navigator.serviceWorker.controller.postMessage({type:'NOTIFY',title,body,tag});}else{try{new Notification(title,{body,tag})}catch(e){}}}
function notificationOnce(id,title,body){state.settings.notificationLog=state.settings.notificationLog||{};const todayKeyValue=todayKey();if(state.settings.notificationLog[id]===todayKeyValue)return;state.settings.notificationLog[id]=todayKeyValue;save();notify(title,body,id)}
function checkNotifications(force=false){const now=new Date();const n=state.settings.notifications||{};if(!('Notification' in window)||Notification.permission!=='granted')return;
 if(n.tasks!==false){state.tasks.filter(t=>!t.done&&t.date).forEach(t=>{const when=new Date(`${t.date}T${t.reminderTime||'09:00'}`);if(t.reminder==='1h')when.setHours(when.getHours()-1);else if(t.reminder==='1d')when.setDate(when.getDate()-1);if(when<=now&&now-when<70*60*1000)notificationOnce('task-'+t.id,'Tarea: '+t.title,'Tienes una tarea pendiente.')});}
 if(n.calendar!==false){state.events.filter(e=>e.date&&e.reminder).forEach(e=>{const when=new Date(`${e.date}T${e.startTime||'09:00'}`);when.setMinutes(when.getMinutes()-Number(e.reminderLead||0));if(when<=now&&now-when<70*60*1000)notificationOnce('event-'+e.id,'Calendario: '+e.title,'Tienes un evento programado.')});}
 if(n.food!==false){state.inventory.filter(x=>x.expiry).forEach(x=>{const exp=new Date(`${x.expiry}T12:00`);const diff=(exp-now)/(86400000);if(diff>=0&&diff<=1)notificationOnce('food-exp-'+x.id,'Comidas: '+(x.name||'Producto'),'Caduca hoy o mañana.')});}
 state.habits.filter(h=>h.reminder&&h.reminderTime&&!isHabitDone(h,todayKey())).forEach(h=>{const [hh,mm]=h.reminderTime.split(':').map(Number);const when=new Date();when.setHours(hh,mm,0,0);if(when<=now&&now-when<70*60*1000)notificationOnce('habit-'+h.id,'Hábito: '+h.name,'Es hora de hacerlo.')});
}
function frequencyLabel(h){if(h.frequency==='daily')return 'Todos los días';return `${h.daysPerWeek||5} días/semana`}
function isHabitDone(h,key){return Array.isArray(h.completed)&&h.completed.includes(key)}
function toggleHabit(id){const h=state.habits.find(x=>x.id===id);if(!h)return;const k=todayKey();h.completed=h.completed||[];const i=h.completed.indexOf(k);if(i>=0)h.completed.splice(i,1);else h.completed.push(k);save();render()}
function habitForm(h=null){const color=h?.color||habitColors[0];return `<div class="form"><label>Nombre del hábito<input id="fHabitName" value="${esc(h?.name||'')}" placeholder="Ej. Beber agua"></label><label>Frecuencia<select id="fHabitFreq"><option value="daily" ${h?.frequency==='daily'?'selected':''}>Todos los días</option><option value="weekly" ${h?.frequency!=='daily'?'selected':''}>Días por semana</option></select></label><label id="daysLabel">¿Cuántos días a la semana?<select id="fHabitDays">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${Number(h?.daysPerWeek||5)===n?'selected':''}>${n} días</option>`).join('')}</select></label><label class="checkline"><input id="fHabitReminder" type="checkbox" ${h?.reminder?'checked':''}> Quiero un recordatorio</label><label id="timeLabel">Hora del recordatorio<input id="fHabitTime" type="time" value="${h?.reminderTime||'09:00'}"></label><div><div class="field-title">Color del botón</div><div class="color-picker">${habitColors.map(col=>`<button type="button" class="color-choice ${color===col?'selected':''}" style="background:${col}" onclick="selectHabitColor('${col}')" data-color="${col}" aria-label="Color"></button>`).join('')}</div><input type="hidden" id="fHabitColor" value="${color}"></div><button class="primary" onclick="saveHabit('${h?.id||''}')">Guardar hábito</button>${h?`<button class="danger-button" onclick="deleteHabit('${h.id}')">Eliminar hábito</button>`:''}</div>`}
function selectHabitColor(col){document.querySelector('#fHabitColor').value=col;document.querySelectorAll('.color-choice').forEach(b=>b.classList.toggle('selected',b.dataset.color===col))}
function saveHabit(id){const name=document.querySelector('#fHabitName').value.trim();if(!name)return;const existing=id&&state.habits.find(x=>x.id===id);const h=existing||{id:crypto.randomUUID(),completed:[]};h.name=name;h.frequency=document.querySelector('#fHabitFreq').value;h.daysPerWeek=h.frequency==='daily'?7:Number(document.querySelector('#fHabitDays').value);h.reminder=document.querySelector('#fHabitReminder').checked;h.reminderTime=h.reminder?document.querySelector('#fHabitTime').value:'';h.color=document.querySelector('#fHabitColor').value; if(!existing)state.habits.push(h);save();closeModal();render()}
function editHabit(id){const h=state.habits.find(x=>x.id===id);if(h)openModal('Editar hábito',habitForm(h))}
function deleteHabit(id){state.habits=state.habits.filter(x=>x.id!==id);save();closeModal();render()}
function renderMiniCalendar(el){let y=today.getFullYear(),m=today.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let s='<div class="calendar">'+['L','M','X','J','V','S','D'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<first;i++)s+='<div></div>';for(let d=1;d<=days;d++){let ev=d%5===0?`<span class="dot" style="background:${cats.Social}"></span>`:'';s+=`<div class="day ${d===today.getDate()?'today':''}"><b>${d}</b><div>${ev}</div></div>`}el.innerHTML=s+'</div>'}
const taskCategories={
  Casas:["Mi casa","Casa mamá","Casa Suances","Casa pueblo","Casa Ara"],
  Coches:["Mercedes","Peugeot"],
  Personal:["Personal"]
};
const taskCategoryLabels=["Casas","Coches","Personal"];

function normalizeTask(t){
  if(!Array.isArray(t.categories)){
    t.categories=t.category?[t.category]:[];
  }
  t.subtasks=Array.isArray(t.subtasks)?t.subtasks:[];
  t.attachments=Array.isArray(t.attachments)?t.attachments:[];
  t.priority=t.priority||"Normal";
  t.status=t.done?"done":"pending";
  return t;
}
state.tasks=state.tasks.map(normalizeTask);

function isOverdue(t){
  if(t.done || !t.date)return false;
  const end=new Date(t.date+"T"+(t.time||"23:59"));
  return end < new Date();
}
function taskSort(a,b){
  const rank=t=>t.done?4:(isOverdue(t)?0:(t.date===todayKey()?1:(t.date?2:3)));
  return rank(a)-rank(b) || ((a.date||"9999")+(a.time||"")).localeCompare((b.date||"9999")+(b.time||""));
}
function taskCategoryPills(t){
  return (t.categories||[]).map(x=>`<span class="pill task-cat">${esc(x)}</span>`).join("");
}
function taskProgress(t){
  const total=t.subtasks?.length||0;
  if(!total)return "";
  const done=t.subtasks.filter(s=>s.done).length;
  return `<div class="subprogress"><span>${done}/${total} subtareas</span><div><i style="width:${done/total*100}%"></i></div></div>`;
}
function tasks(c){
  const all=state.tasks.map(normalizeTask);
  const pending=all.filter(t=>!t.done).sort(taskSort);
  const overdue=pending.filter(isOverdue).length;
  const todayCount=pending.filter(t=>t.date===todayKey()&&!isOverdue(t)).length;
  c.innerHTML=`<div class="grid">
    <div class="card span-12">
      <div class="row task-toolbar">
        <div><h3>Mis tareas</h3><span class="muted">${pending.length} pendientes${overdue?` · ${overdue} atrasadas`:''}</span></div>
        <button class="primary" onclick="openModal('Nueva tarea',taskForm())">+ Nueva tarea</button>
      </div>
      <div class="task-filters">
        <button class="filter active" onclick="filterTasks('all',this)">Todas <span>${pending.length}</span></button>
        <button class="filter" onclick="filterTasks('today',this)">Hoy <span>${todayCount}</span></button>
        <button class="filter" onclick="filterTasks('upcoming',this)">Próximas</button>
        <button class="filter" onclick="filterTasks('overdue',this)">Atrasadas <span>${overdue}</span></button>
        <button class="filter" onclick="filterTasks('nodate',this)">Sin fecha</button>
      </div>
      <div id="taskList" class="list task-list">${pending.length?pending.map(taskCard).join(""):'<div class="empty-state"><span>No tienes tareas pendientes.</span><button class="secondary" onclick="newTaskFromEmpty()">+ Añadir tarea</button></div>'}</div>
      <details class="completed-tasks"><summary>Tareas completadas (${all.filter(t=>t.done).length})</summary><div class="list">${all.filter(t=>t.done).sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||"")).slice(0,20).map(t=>`<div class="completed-task-row"><span class="completed-mark">✓</span><span>${esc(t.title)}</span><button class="secondary small" onclick="restoreTask('${t.id}')">Reabrir</button></div>`).join("")||'<div class="muted">Todavía no hay tareas completadas.</div>'}</div></details>
    </div>
    <div class="card span-12">
      <div class="row"><div><h3>Categorías</h3><span class="muted">Una tarea puede pertenecer a varias.</span></div></div>
      <div class="task-category-groups">${taskCategoryLabels.map(g=>`<div><b>${g}</b><div class="actions">${taskCategories[g].map(x=>`<span class="pill">${x}</span>`).join("")}</div></div>`).join("")}</div>
    </div>
  </div>`;
}
function taskCard(t){
  const date=t.date?new Date(t.date+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"}):"Sin fecha";
  const meta=[date,t.time||"",t.priority||"Normal"].filter(Boolean).join(" · ");
  const subs=(t.subtasks||[]).filter(s=>s.title);
  return `<div class="item task-card ${isOverdue(t)?"overdue":""}">
    <div class="task-main">
      <label class="task-check" title="Marcar como completada"><input type="checkbox" onchange="completeTask('${t.id}')"><span></span></label>
      <div class="task-body">
        <button class="task-title" onclick="editTask('${t.id}')">${esc(t.title)}</button>
        <div class="task-meta">${taskCategoryPills(t)}<span>${esc(meta)}</span>${t.reminder?`<span class="reminder-tag">Recordatorio${t.reminderTime?" · "+t.reminderTime:""}</span>`:""}${t.repeat?`<span class="repeat-tag">↻ ${esc(t.repeat.label||"Repite")}</span>`:""}</div>
        ${t.notes?`<div class="muted task-notes">${esc(t.notes)}</div>`:""}
        ${subs.length?`<div class="subtask-list">${subs.map(s=>`<label class="subtask-row"><input type="checkbox" ${s.done?'checked':''} onchange="toggleSubtask('${t.id}','${s.id}')"><span class="subtask-box"></span><span class="subtask-title ${s.done?'completed':''}">${esc(s.title)}</span></label>`).join("")}</div>`:""}
        ${taskProgress(t)}
        ${t.attachments?.length?`<div class="attachment-count">📎 ${t.attachments.length} ${t.attachments.length===1?"archivo":"archivos"}</div>`:""}
      </div>
      <button class="icon-button" onclick="editTask('${t.id}')" aria-label="Editar">⋯</button>
    </div>
  </div>`;
}
function filterTasks(kind,btn){
  document.querySelectorAll(".task-filters .filter").forEach(x=>x.classList.remove("active"));
  if(btn)btn.classList.add("active");
  let list=state.tasks.map(normalizeTask).filter(t=>!t.done);
  if(kind==="today")list=list.filter(t=>t.date===todayKey()&&!isOverdue(t));
  if(kind==="upcoming")list=list.filter(t=>t.date&&t.date>todayKey());
  if(kind==="overdue")list=list.filter(isOverdue);
  if(kind==="nodate")list=list.filter(t=>!t.date);
  list.sort(taskSort);
  document.querySelector("#taskList").innerHTML=list.length?list.map(taskCard).join(""):'<div class="empty-state"><span>No hay tareas en este filtro.</span></div>';
}
function taskCategoryOptions(selected=[]){
  return taskCategoryLabels.map(g=>`<div class="category-group"><div class="muted category-group-title">${g}</div>${taskCategories[g].map(x=>`<label class="checkline category-option"><input type="checkbox" class="task-category" value="${esc(x)}" ${selected.includes(x)?"checked":""}> ${esc(x)}</label>`).join("")}</div>`).join("");
}
function taskSubtasksHtml(items=[]){
  return `<div id="subtaskEditor" class="subtask-editor">${items.map((s,i)=>`<div class="subtask-input"><input data-subtask-index="${i}" value="${esc(s.title||"")}"><button type="button" onclick="this.parentElement.remove()">×</button></div>`).join("")}</div>
  <button type="button" class="secondary small" onclick="addSubtaskInput()">+ Añadir subtarea</button>`;
}
function addSubtaskInput(){
  const box=document.querySelector("#subtaskEditor");
  const i=box.children.length;
  const row=document.createElement("div");
  row.className="subtask-input";
  row.innerHTML=`<input data-subtask-index="${i}" placeholder="Nueva subtarea"><button type="button" onclick="this.parentElement.remove()">×</button>`;
  box.appendChild(row);
}
function taskForm(t=null){
  const selected=t?.categories||[];
  const repeat=t?.repeat?.type||"none";
  return `<div class="form task-form">
    <label>Título<input id="fTaskTitle" required value="${esc(t?.title||"")}" placeholder="Ej. Llevar el coche al taller"></label>
    <div class="form-two">
      <label>Fecha<input id="fTaskDate" type="date" value="${t?.date||""}"></label>
      <label>Hora<input id="fTaskTime" type="time" value="${t?.time||""}"></label>
    </div>
    <label>Prioridad<select id="fTaskPriority">${["Normal","Importante","Urgente"].map(x=>`<option ${t?.priority===x?"selected":""}>${x}</option>`).join("")}</select></label>
    <div><div class="field-title">Categorías</div><div class="category-picker">${taskCategoryOptions(selected)}</div></div>
    <div><div class="field-title">Subtareas</div>${taskSubtasksHtml(t?.subtasks||[])}</div>
    <label>Recordatorio<select id="fTaskReminder"><option value="">Sin recordatorio</option><option value="at_time" ${t?.reminder==="at_time"?"selected":""}>A la hora de la tarea</option><option value="1h" ${t?.reminder==="1h"?"selected":""}>1 hora antes</option><option value="1d" ${t?.reminder==="1d"?"selected":""}>1 día antes</option></select></label>
    <div class="form-two">
      <label>Repetir<select id="fTaskRepeat">${[
        ["none","No repetir"],["daily","Cada día"],["weekly","Cada semana"],["monthly","Cada mes"],["yearly","Cada año"],["custom","Cada X días"]
      ].map(x=>`<option value="${x[0]}" ${repeat===x[0]?"selected":""}>${x[1]}</option>`).join("")}</select></label>
      <label id="customRepeatLabel" class="${repeat==="custom"?"":"hidden"}">Cada cuántos días<input id="fTaskRepeatDays" type="number" min="1" value="${t?.repeat?.days||2}"></label>
    </div>
    <label>Notas<textarea id="fTaskNotes" placeholder="Detalles, instrucciones...">${esc(t?.notes||"")}</textarea></label>
    <label>Fotos / archivos<input id="fTaskFiles" type="file" accept="image/*" multiple></label>
    ${t?.attachments?.length?`<div class="attachment-preview">${t.attachments.map((a,i)=>`<div>📎 ${esc(a.name||"Foto")} <button type="button" onclick="removeTaskAttachment('${t.id}',${i})">×</button></div>`).join("")}</div>`:""}
    <button class="primary" onclick="saveTask('${t?.id||""}')">Guardar tarea</button>
    ${t?`<button class="danger-button" onclick="deleteTask('${t.id}')">Eliminar tarea</button>`:""}
  </div>`;
}
async function saveTask(id){
  const title=document.querySelector("#fTaskTitle").value.trim();
  if(!title)return;
  const existing=id&&state.tasks.find(x=>x.id===id);
  const t=existing||{id:crypto.randomUUID(),done:false,created:new Date().toISOString(),subtasks:[],attachments:[]};
  t.title=title;
  t.date=document.querySelector("#fTaskDate").value;
  t.time=document.querySelector("#fTaskTime").value;
  t.priority=document.querySelector("#fTaskPriority").value;
  t.categories=[...document.querySelectorAll(".task-category:checked")].map(x=>x.value);t.category=t.categories[0]||'';
  t.notes=document.querySelector("#fTaskNotes").value.trim();
  t.reminder=document.querySelector("#fTaskReminder").value;
  const rt=document.querySelector("#fTaskRepeat").value;
  t.repeat=rt==="none"?null:{type:rt,label:rt==="custom"?`Cada ${document.querySelector("#fTaskRepeatDays").value} días`:({daily:"Cada día",weekly:"Cada semana",monthly:"Cada mes",yearly:"Cada año"}[rt]||"Repite"),days:rt==="custom"?Number(document.querySelector("#fTaskRepeatDays").value):null};
  const subInputs=[...document.querySelectorAll("#subtaskEditor input")];
  const old=t.subtasks||[];
  t.subtasks=subInputs.map((el,i)=>({id:old[i]?.id||crypto.randomUUID(),title:el.value.trim(),done:old[i]?.done||false})).filter(x=>x.title);
  const files=[...document.querySelector("#fTaskFiles").files];
  if(files.length){
    const added=await Promise.all(files.map(fileToData));
    t.attachments=[...(t.attachments||[]),...added];
  }
  t.status=t.done?"done":"pending";
  if(!existing)state.tasks.push(t);
  save();closeModal();render();
}
function fileToData(file){
  return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result});r.readAsDataURL(file);});
}
function editTask(id){const t=state.tasks.find(x=>x.id===id);if(t)openModal("Editar tarea",taskForm(t));}
function removeTaskAttachment(id,index){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.attachments.splice(index,1);save();openModal("Editar tarea",taskForm(t));}
function toggleSubtask(taskId,subtaskId){
  const t=state.tasks.find(x=>x.id===taskId);if(!t)return;
  const sub=(t.subtasks||[]).find(x=>x.id===subtaskId);if(!sub)return;
  sub.done=!sub.done;
  save();render();
}
function deleteTask(id){state.tasks=state.tasks.filter(x=>x.id!==id);save();closeModal();render();}
function restoreTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.done=false;t.status='pending';t.completedAt=null;save();render()}
function nextTaskDate(date,type,days){
  const d=new Date(date+"T12:00");
  if(type==="daily")d.setDate(d.getDate()+1);
  if(type==="weekly")d.setDate(d.getDate()+7);
  if(type==="monthly")d.setMonth(d.getMonth()+1);
  if(type==="yearly")d.setFullYear(d.getFullYear()+1);
  if(type==="custom")d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function completeTask(id){
  const t=state.tasks.find(x=>x.id===id);if(!t)return;
  t.done=true;t.status="done";t.completedAt=new Date().toISOString();
  if(t.repeat&&t.date){
    const next={...t,id:crypto.randomUUID(),date:nextTaskDate(t.date,t.repeat.type,t.repeat.days),done:false,status:"pending",completedAt:null,created:new Date().toISOString(),subtasks:(t.subtasks||[]).map(s=>({...s,id:crypto.randomUUID(),done:false})),attachments:[]};
    state.tasks.push(next);
  }
  save();render();
}

function newTaskFromEmpty(){openModal('Nueva tarea',taskForm())}
let expenseCategories=JSON.parse(localStorage.getItem(KEY+'expenseCategories')||'null')||{"Gastos fijos":["Alquiler","Seguro"],"Suministros":["Agua","Luz","Aerotermia","Móvil","Internet"],"Suscripciones":["Spotify","Podomo","ACNUR"],"Otros gastos":["Comida","Paga","Transporte","Otros gastos"],"Ingresos":["Nómina","Otros ingresos"]};
// Compatibilidad con la categoría original de la V7.
if(expenseCategories.Suscripciones?.includes('Podomo') && !expenseCategories.Suscripciones.includes('Podimo')){expenseCategories.Suscripciones=expenseCategories.Suscripciones.map(x=>x==='Podomo'?'Podimo':x);localStorage.setItem(KEY+'expenseCategories',JSON.stringify(expenseCategories));}
const defaultAccounts=["Cuenta de gastos","Cuenta nómina","Cuenta ahorro","Revolut"];
if(!Array.isArray(state.accounts))state.accounts=defaultAccounts.map(name=>({id:crypto.randomUUID(),name,startingBalance:0,active:true}));
if(!Array.isArray(state.transactions))state.transactions=[];
if(!Array.isArray(state.budgets))state.budgets=[];
if(!state.settings || typeof state.settings!=='object')state.settings={};
state.settings.notifications=state.settings.notifications||{tasks:true,calendar:true,expenses:true,food:true};
state.settings.notifications.notificationLog=state.settings.notifications.notificationLog||{};
state.settings.food=state.settings.food||{cookingDays:4,weekdayMinutes:30,useInventory:true,quickMeals:true,vegetables:true,twoTuppers:true,fridayFun:true,snacks:true,sweet:false,bread:false,breakfast:'Café con leche + tostada con aceite y tomate'};
state.recipes.forEach(r=>{if(typeof r.ingredients==='string'){r.ingredientsText=r.ingredients;r.ingredients=parseIngredients(r.ingredients)}});

// Migración de gastos de versiones anteriores: conserva los datos y los integra en Movimientos.
(function migrateLegacyExpenses(){
 if(!Array.isArray(state.expenses)||!state.expenses.length)return;
 const accountByName=Object.fromEntries(state.accounts.map(a=>[a.name,a.id]));
 let changed=false;
 state.expenses.forEach(old=>{
   const exists=state.transactions.some(t=>t.legacyId===old.id);
   if(exists)return;
   state.transactions.push({id:crypto.randomUUID(),legacyId:old.id,type:'expense',amount:Number(old.amount)||0,category:old.category||'Otros gastos',concept:old.concept||'',date:(old.date||todayKey()).slice(0,10),account:accountByName[old.account]||state.accounts[0].id,notes:old.notes||'',ticket:old.ticket||''});
   changed=true;
 });
 if(changed)save();
})();

function ensureRecurringTransactions(){
 const key=state.expenseMonth||monthKey();
 let changed=false;
 const templates=state.transactions.filter(t=>t.recurring && !t.recurringFrom);
 templates.forEach(t=>{
   if(!t.recurringMonths||!Array.isArray(t.recurringMonths))t.recurringMonths=[];
   const templateMonth=monthKey(new Date((t.date||todayKey())+'T12:00'));
   if(templateMonth===key){if(!t.recurringMonths.includes(key))t.recurringMonths.push(key);return;}
   if(t.recurringMonths.includes(key))return;
   const day=Math.min(Number(t.recurringDay||String(t.date||todayKey()).slice(8,10))||1,new Date(Number(key.slice(0,4)),Number(key.slice(5,7)),0).getDate());
   const copy={...t,id:crypto.randomUUID(),date:`${key}-${String(day).padStart(2,'0')}`,recurring:false,recurringFrom:t.id,recurringMonths:undefined};
   delete copy.recurringMonths;
   state.transactions.push(copy);
   t.recurringMonths.push(key);
   changed=true;
 });
 if(changed)save();
}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function money(n){return new Intl.NumberFormat('es-ES',{style:'currency',currency:(state.settings?.currency||'EUR')}).format(Number(n)||0)}
function accountOptions(sel){return state.accounts.filter(a=>a.active!==false).map(a=>`<option value="${a.id}" ${a.id===sel?'selected':''}>${esc(a.name)}</option>`).join('')}
function accountBalance(a){return Number(a.startingBalance||0)+state.transactions.reduce((s,t)=>{if(t.type==='transfer'){if(t.from===a.id)s-=+t.amount;if(t.to===a.id)s+=+t.amount}else if(t.account===a.id)s+=(t.type==='income'?1:-1)*(+t.amount);return s},0)}
function expenses(c){
 ensureRecurringTransactions();
 const key=state.expenseMonth||monthKey(), tx=state.transactions.filter(t=>(t.date||'').startsWith(key));
 const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+ +t.amount,0), spent=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+ +t.amount,0);
 const transfers=tx.filter(t=>t.type==='transfer').length;
 const budgets=state.budgets.filter(b=>b.month===key), totalBudget=budgets.reduce((s,b)=>s+ +b.amount,0);
 const byCat={};tx.filter(t=>t.type==='expense').forEach(t=>byCat[t.category]=(byCat[t.category]||0)+ +t.amount);
 const title=new Date(key+'-01T12:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 c.innerHTML=`<div class="expenses-page">
  <section class="expense-header">
   <div><span class="eyebrow">Finanzas</span><h2>Gastos</h2><p>Controla tus cuentas, movimientos y presupuesto sin complicarte.</p></div>
   <div class="actions"><button class="secondary" onclick="openModal('Nueva transferencia',transferForm())">Transferir</button><button class="primary" onclick="openModal('Nuevo gasto',expenseForm())">+ Nuevo movimiento</button></div>
  </section>
  <section class="expense-monthbar"><button class="month-arrow" onclick="changeExpenseMonth(-1)">‹</button><div><span>Mes seleccionado</span><strong>${title}</strong></div><button class="month-arrow" onclick="changeExpenseMonth(1)">›</button></section>
  <section class="expense-kpis"><div><span>Ingresos</span><strong>${money(income)}</strong></div><div><span>Gastos</span><strong>${money(spent)}</strong></div><div><span>Balance</span><strong>${money(income-spent)}</strong></div><div><span>Presupuesto disponible</span><strong>${totalBudget?money(totalBudget-spent):'—'}</strong><small>${totalBudget?money(totalBudget)+' presupuestados':'Sin presupuestos este mes'}</small></div></section>
  <div class="expense-layout">
   <section class="expense-panel movements-panel"><div class="panel-heading"><div><h3>Movimientos</h3><span>${tx.length} movimientos en ${title}</span></div><div class="movement-legend"><span><i class="dot-income"></i>Ingreso</span><span><i class="dot-expense"></i>Gasto</span><span><i class="dot-transfer"></i>Transferencia</span></div></div>
    <div class="movement-list">${tx.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(expenseRow).join('')||'<div class="empty-state">No hay movimientos este mes.<button class="secondary small" onclick="openModal(\'Nuevo gasto\',expenseForm())">Añadir gasto</button></div>'}</div>
   </section>
   <aside class="expense-side"><section class="expense-panel"><div class="panel-heading"><div><h3>Cuentas</h3><span>Saldo actual</span></div><button class="secondary small" onclick="openModal('Configurar cuentas',accountsForm())">Editar</button></div><div class="account-cards">${state.accounts.map(a=>`<div class="account-card"><div><span>${esc(a.name)}</span><small>Saldo inicial ${money(a.startingBalance||0)}</small></div><strong>${money(accountBalance(a))}</strong></div>`).join('')}</div></section>
    <section class="expense-panel"><div class="panel-heading"><div><h3>Por categoría</h3><span>Gasto real del mes</span></div></div><div class="category-totals">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('')||'<span class="muted">Todavía no hay gastos.</span>'}</div></section></aside>
  </div>
  <div class="expense-bottom"><section class="expense-panel"><div class="panel-heading"><div><h3>Presupuestos</h3><span>Límite mensual por categoría</span></div><button class="secondary small" onclick="openModal('Nuevo presupuesto',budgetForm())">+ Añadir</button></div><div class="budget-list">${budgets.map(b=>{let s=byCat[b.category]||0,p=Math.min(100,s/b.amount*100),over=s>b.amount;return `<div class="budget-item"><div class="row"><div><b>${esc(b.category)}</b><small>${money(s)} de ${money(b.amount)}</small></div><div class="budget-actions"><strong class="${over?'over-budget':''}">${over?'Excedido':money(b.amount-s)+' disponible'}</strong><button class="icon-button" onclick="openModal('Editar presupuesto',budgetForm(${JSON.stringify(b).replace(/"/g,'&quot;')}))">⋯</button></div></div><div class="budget-bar"><i class="${over?'over':''}" style="width:${p}%"></i></div></div>`}).join('')||'<div class="empty-state">No tienes presupuestos configurados.</div>'}</div></section>
   <section class="expense-panel recurring-panel"><div class="panel-heading"><div><h3>Recurrentes</h3><span>Se generan automáticamente cada mes</span></div><button class="secondary small" onclick="openModal('Nuevo gasto recurrente',expenseForm())">+ Añadir</button></div><div class="recurring-list">${state.transactions.filter(t=>t.recurring&&!t.recurringFrom).map(t=>`<div class="recurring-row"><div><b>${esc(t.concept||t.category||'Movimiento')}</b><span>${t.type==='transfer'?`${esc(state.accounts.find(a=>a.id===t.from)?.name||'')} → ${esc(state.accounts.find(a=>a.id===t.to)?.name||'')}`:esc(t.category||'')} · día ${t.recurringDay||'—'}</span></div><strong>${money(t.amount)}</strong><button class="secondary small" onclick="${t.type==='transfer'?`editTransfer('${t.id}')`:`editExpense('${t.id}')`}">Editar</button></div>`).join('')||'<div class="muted">Todavía no hay movimientos recurrentes.</div>'}</div></section>
  </div>
 </div>`;
}
function expenseRow(t){
 if(t.type==='transfer')return `<div class="movement-row transfer"><div class="movement-icon">↔</div><div class="movement-main"><b>${esc(t.concept||'Transferencia')}</b><span>${esc(state.accounts.find(a=>a.id===t.from)?.name||'')} → ${esc(state.accounts.find(a=>a.id===t.to)?.name||'')} · ${new Date(t.date+'T12:00').toLocaleDateString('es-ES')}${t.recurring?' · Recurrente':''}</span></div><strong>${money(t.amount)}</strong><button class="secondary small" onclick="editTransfer('${t.id}')">Editar</button></div>`;
 const income=t.type==='income';
 return `<div class="movement-row ${income?'income':'expense'}"><div class="movement-icon">${income?'↓':'−'}</div><div class="movement-main"><b>${esc(t.concept||t.category)}</b><span>${esc(t.category||'')} · ${esc(state.accounts.find(a=>a.id===t.account)?.name||'')} · ${new Date(t.date+'T12:00').toLocaleDateString('es-ES')}${t.recurring?' · Recurrente':''}${t.ticket?' · Ticket':''}</span></div><strong>${income?'+':'−'}${money(t.amount)}</strong><button class="secondary small" onclick="editExpense('${t.id}')">Editar</button></div>`;
}
function expenseForm(t=null){const cat=t?.category||'Comida';return `<div class="form"><label>Tipo<select id="fExpenseType"><option value="expense" ${t?.type!=='income'?'selected':''}>Gasto</option><option value="income" ${t?.type==='income'?'selected':''}>Ingreso</option></select></label><label>Importe<input id="fExpenseAmount" type="number" step="0.01" min="0" value="${t?.amount??''}"></label><label>Categoría<select id="fExpenseCategory">${categoryOptions(cat)}</select></label><label>Concepto<input id="fExpenseConcept" value="${esc(t?.concept||'')}" placeholder="Ej. Compra semanal"></label><div class="form-two"><label>Fecha<input id="fExpenseDate" type="date" value="${t?.date||todayKey()}"></label><label>Cuenta<select id="fExpenseAccount">${accountOptions(t?.account)}</select></label></div><label>Notas<textarea id="fExpenseNotes">${esc(t?.notes||'')}</textarea></label><label>Foto del ticket<input id="fExpenseTicket" type="file" accept="image/*">${t?.ticket?'<small>Ya hay un ticket guardado. Si eliges otro, lo sustituirá.</small>':''}</label><label class="checkline"><input id="fExpenseRecurring" type="checkbox" ${t?.recurring?'checked':''}> Repetir mensualmente</label><label>Día del mes<input id="fExpenseRecurringDay" type="number" min="1" max="31" value="${t?.recurringDay||String(t?.date||todayKey()).slice(8,10)}"></label><button class="primary" onclick="saveExpense('${t?.id||''}')">${t?'Guardar cambios':'Guardar movimiento'}</button>${t&&!t.recurringFrom?`<button class="danger-button" onclick="deleteTransaction('${t.id}')">Eliminar</button>`:''}</div>`}
function categoryOptions(sel=''){return Object.entries(expenseCategories).map(([g,arr])=>`<optgroup label="${g}">${arr.map(x=>`<option value="${esc(x)}" ${x===sel?'selected':''}>${esc(x)}</option>`).join('')}</optgroup>`).join('')}
async function saveExpense(id){const amount=+document.querySelector('#fExpenseAmount').value;if(!amount)return;let t=id?state.transactions.find(x=>x.id===id):null;if(!t){t={id:crypto.randomUUID()};state.transactions.push(t)}t.type=document.querySelector('#fExpenseType').value;t.amount=amount;t.category=document.querySelector('#fExpenseCategory').value;t.concept=document.querySelector('#fExpenseConcept').value.trim();t.date=document.querySelector('#fExpenseDate').value;t.account=document.querySelector('#fExpenseAccount').value;t.notes=document.querySelector('#fExpenseNotes').value.trim();const f=document.querySelector('#fExpenseTicket').files[0];if(f)t.ticket=await fileToData(f);t.recurring=document.querySelector('#fExpenseRecurring').checked;t.recurringDay=Math.min(31,Math.max(1,+document.querySelector('#fExpenseRecurringDay').value||+t.date.slice(8,10)||1));if(t.recurring&&!t.recurringFrom){t.recurringMonths=Array.isArray(t.recurringMonths)?t.recurringMonths:[];t.recurringMonths=t.recurringMonths.filter(m=>m!==monthKey(new Date(t.date+'T12:00')))}save();closeModal();render()}
function editExpense(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal(t.type==='income'?'Editar ingreso':'Editar gasto',expenseForm(t))}
function deleteTransaction(id){state.transactions=state.transactions.filter(x=>x.id!==id);save();closeModal();render()}
function transferForm(t=null){return `<div class="form"><label>De<select id="fTransferFrom">${accountOptions(t?.from)}</select></label><label>A<select id="fTransferTo">${accountOptions(t?.to)}</select></label><label>Importe<input id="fTransferAmount" type="number" step="0.01" min="0" value="${t?.amount??''}"></label><label>Fecha<input id="fTransferDate" type="date" value="${t?.date||todayKey()}"></label><label>Concepto<input id="fTransferConcept" value="${esc(t?.concept||'')}"></label><label class="checkline"><input id="fTransferRecurring" type="checkbox" ${t?.recurring?'checked':''}> Repetir mensualmente</label><label>Día del mes<input id="fTransferRecurringDay" type="number" min="1" max="31" value="${t?.recurringDay||String(t?.date||todayKey()).slice(8,10)}"></label><button class="primary" onclick="saveTransfer('${t?.id||''}')">${t?'Guardar cambios':'Guardar transferencia'}</button>${t&&!t.recurringFrom?`<button class="danger-button" onclick="deleteTransaction('${t.id}')">Eliminar</button>`:''}</div>`}
function saveTransfer(id=''){const from=document.querySelector('#fTransferFrom').value,to=document.querySelector('#fTransferTo').value,amount=+document.querySelector('#fTransferAmount').value;if(!amount||from===to)return;let t=id?state.transactions.find(x=>x.id===id):null;if(!t){t={id:crypto.randomUUID()};state.transactions.push(t)}t.type='transfer';t.from=from;t.to=to;t.amount=amount;t.date=document.querySelector('#fTransferDate').value;t.concept=document.querySelector('#fTransferConcept').value.trim()||'Transferencia';t.recurring=document.querySelector('#fTransferRecurring').checked;t.recurringDay=Math.min(31,Math.max(1,+document.querySelector('#fTransferRecurringDay').value||+t.date.slice(8,10)||1));if(t.recurring&&!t.recurringFrom){t.recurringMonths=Array.isArray(t.recurringMonths)?t.recurringMonths:[];t.recurringMonths=t.recurringMonths.filter(m=>m!==monthKey(new Date(t.date+'T12:00')))}save();closeModal();render()}
function editTransfer(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal('Editar transferencia',transferForm(t))}
function budgetForm(b=null){return `<div class="form"><label>Categoría<select id="fBudgetCategory">${Object.entries(expenseCategories).filter(([g])=>g!=='Ingresos').map(([g,a])=>`<optgroup label="${g}">${a.map(x=>`<option value="${esc(x)}" ${x===b?.category?'selected':''}>${esc(x)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Importe mensual<input id="fBudgetAmount" type="number" step="0.01" value="${b?.amount??''}"></label><button class="primary" onclick="saveBudget('${b?.id||''}')">${b?'Guardar cambios':'Guardar presupuesto'}</button>${b?`<button class="danger-button" onclick="deleteBudget('${b.id}')">Eliminar</button>`:''}</div>`}
function saveBudget(id=''){let category=document.querySelector('#fBudgetCategory').value,amount=+document.querySelector('#fBudgetAmount').value,key=state.expenseMonth||monthKey();if(!amount)return;let b=id?state.budgets.find(x=>x.id===id):state.budgets.find(x=>x.month===key&&x.category===category);if(b){b.category=category;b.amount=amount;b.month=key}else state.budgets.push({id:crypto.randomUUID(),month:key,category,amount});save();closeModal();render()}
function deleteBudget(id){state.budgets=state.budgets.filter(x=>x.id!==id);save();closeModal();render()}
function accountsForm(){return `<div class="form accounts-form">${state.accounts.map(a=>`<div class="account-edit"><div><b>${esc(a.name)}</b><span>Saldo inicial</span></div><input id="acc-${a.id}" type="number" step="0.01" value="${a.startingBalance||0}"></div>`).join('')}<button class="primary" onclick="saveAccounts()">Guardar saldos</button></div>`}
function saveAccounts(){state.accounts.forEach(a=>{const el=document.querySelector('#acc-'+a.id);if(el)a.startingBalance=Number(el.value)||0});save();closeModal();render()}
function expiringInventory(){
 const limit=new Date(); limit.setHours(23,59,59,999); limit.setDate(limit.getDate()+7);
 return state.inventory.filter(x=>x.expiry&&new Date(x.expiry+'T12:00:00')<=limit&&new Date(x.expiry+'T12:00:00')>=new Date(todayKey()+'T00:00:00')).sort((a,b)=>String(a.expiry).localeCompare(String(b.expiry)));
}
function food(c){
 const inv=state.inventory, prep=state.preparations, menu=state.menu;
 const counts={freezer:inv.filter(x=>x.storage==='freezer').length,pantry:inv.filter(x=>x.storage==='pantry').length,fresh:inv.filter(x=>x.storage==='fresh').length};
 const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']; const slots=menu?.days||{}; const f=state.settings.food||{};
 const shopping=shoppingItems(), pendingShop=shopping.filter(x=>!state.shoppingChecks[x.key]).length, pendingPrep=prep.filter(x=>!state.prepDone[x.id]).length;
 c.innerHTML=`<div class="food-page">
 <section class="food-hero"><div><span class="eyebrow">Organización de comidas</span><h2>Comidas</h2><p>Planifica la semana aprovechando lo que ya tienes, sin obligarte a usarlo todo.</p></div><div class="actions"><button class="secondary" onclick="openModal('Añadir a Comidas',foodQuickForm())">+ Añadir</button><button class="primary" onclick="generateMenu()">Generar propuesta</button></div></section>
 <section class="food-preferences"><button class="pref-chip ${f.useInventory!==false?'active':''}" onclick="toggleFoodPref('useInventory')">Aprovechar lo que tengo</button><button class="pref-chip ${f.quickMeals!==false?'active':''}" onclick="toggleFoodPref('quickMeals')">Comidas rápidas</button><button class="pref-chip ${f.vegetables!==false?'active':''}" onclick="toggleFoodPref('vegetables')">Más verduras</button><button class="pref-chip ${f.twoTuppers!==false?'active':''}" onclick="toggleFoodPref('twoTuppers')">2 tuppers</button><button class="pref-chip ${f.sweet?'active':''}" onclick="toggleFoodPref('sweet')">Incluir dulce</button><button class="pref-chip ${f.bread?'active':''}" onclick="toggleFoodPref('bread')">Hacer pan</button></section>
 <section class="food-stats"><div><span>Congelador</span><strong>${counts.freezer}</strong><small>productos</small></div><div><span>Despensa</span><strong>${counts.pantry}</strong><small>productos</small></div><div><span>Frescos</span><strong>${counts.fresh}</strong><small>productos</small></div><div><span>Recetas</span><strong>${state.recipes.length}</strong><small>guardadas</small></div></section>
 <div class="food-layout"><section class="food-panel menu-panel"><div class="panel-heading"><div><h3>Menú semanal</h3><span>${menu?.status==='accepted'?'Menú aceptado':'Propuesta pendiente de revisar'}</span></div>${menu?`<div class="actions"><button class="secondary small" onclick="generateMenu()">Regenerar</button><button class="primary small" onclick="acceptMenu()">Aceptar menú</button></div>`:''}</div>
 <div class="weekly-menu">${days.map((d,i)=>{const x=slots[i]||{};return `<div class="menu-day"><div class="menu-day-head"><b>${d}</b>${x.tupper?'<span class="pill">Tupper</span>':''}${i===4&&f.fridayFun!==false?'<span class="pill">Comida divertida</span>':''}</div><div class="meal-line"><span>Comida</span><strong>${esc(x.lunch||'Sin planificar')}</strong><button class="icon-button" onclick="changeMeal(${i},'lunch')">↻</button></div><div class="meal-line"><span>Cena</span><strong>${esc(x.dinner||'Sin planificar')}</strong><button class="icon-button" onclick="changeMeal(${i},'dinner')">↻</button></div><div class="meal-line breakfast"><span>Desayuno</span><strong>${esc(x.breakfast||'Café con leche + tostada')}</strong></div><div class="meal-line snack"><span>Merienda</span><strong>${esc(x.snack||'')}</strong></div></div>`}).join('')||'<div class="empty-state">Genera una propuesta para empezar.</div>'}</div>
 ${menu?.status==='proposal'?'<div class="menu-hint">Revisa las comidas y usa ↻ para cambiar solo las que quieras. Cuando te guste, pulsa <b>Aceptar menú</b>.</div>':''}</section>
 <aside class="food-side"><section class="food-panel"><div class="panel-heading"><div><h3>Inventario</h3><span>Lo que tienes ahora</span></div><button class="secondary small" onclick="openModal('Nuevo producto',inventoryForm())">+ Añadir</button></div><div class="inventory-mini"><div><b>Congelador</b><span>${counts.freezer}</span></div><div><b>Despensa</b><span>${counts.pantry}</span></div><div><b>Frescos</b><span>${counts.fresh}</span></div></div>${expiringInventory().length?`<div class="food-alert"><b>Próximo a caducar</b><span>${expiringInventory().map(x=>esc(x.name)).join(', ')}</span></div>`:''}<button class="text-button" onclick="openModal('Inventario',inventoryListForm())">Ver y gestionar inventario →</button></section>
 <section class="food-panel"><div class="panel-heading"><div><h3>Preparar esta semana</h3><span>${pendingPrep} pendientes</span></div><button class="secondary small" onclick="openModal('Nueva preparación',preparationForm())">+ Añadir</button></div><div class="prep-list">${prep.slice(0,6).map(x=>`<button class="prep-row ${state.prepDone[x.id]?'done':''}" onclick="togglePrep('${x.id}')"><span class="check-mini">${state.prepDone[x.id]?'✓':''}</span><div><b>${esc(x.name)}</b><small>${esc(x.quantity||'')} · ${x.freezable?'Congelable':'Para consumir'}</small></div></button>`).join('')||'<div class="muted">Todavía no tienes preparaciones.</div>'}</div>${prep.length>6?`<button class="text-button" onclick="openModal('Preparaciones',preparationsListForm())">Ver todas →</button>`:''}</section></aside></div>
 <section class="food-panel shopping-panel"><div class="panel-heading"><div><h3>Lista de la compra</h3><span>${pendingShop} pendientes · ${shopping.length} en total</span></div><button class="secondary small" onclick="openModal('Lista de la compra',shoppingForm())">Ver lista</button></div><div class="shopping-progress"><div><span style="width:${shopping.length?Math.round((shopping.length-pendingShop)/shopping.length*100):0}%"></span></div><small>${shopping.length?Math.round((shopping.length-pendingShop)/shopping.length*100):0}% completada</small></div><div class="shopping-preview">${shopping.slice(0,8).map(x=>`<button class="shopping-item ${state.shoppingChecks[x.key]?'done':''}" onclick="toggleShopping('${x.key}')"><span>${state.shoppingChecks[x.key]?'✓':'○'}</span>${esc(x.name)}</button>`).join('')||'<span class="muted">Se calculará al aceptar un menú.</span>'}</div></section>
 <section class="food-panel recipes-panel"><div class="panel-heading"><div><h3>Mis recetas</h3><span>${state.recipes.length} guardadas</span></div><button class="primary small" onclick="openModal('Añadir receta',recipeForm())">+ Añadir receta</button></div><div class="recipe-grid">${state.recipes.map(r=>`<article class="recipe-card"><div class="recipe-card-top"><span class="pill">${esc(r.type)}</span>${r.favorite?'<span class="favorite-mark">★</span>':''}</div><h4>${esc(r.name)}</h4><p>${esc(r.description||'Sin descripción')}</p><div class="recipe-meta"><span>${r.servings||1} raciones</span><span>${esc(r.time||'Tiempo no indicado')}</span>${r.freezable?'<span>Congelable</span>':''}</div><div class="actions"><button class="secondary small" onclick="viewRecipe('${r.id}')">Ver</button><button class="secondary small" onclick="editRecipe('${r.id}')">Editar</button></div></article>`).join('')||'<div class="empty-state">Todavía no tienes recetas. Añade la primera.</div>'}</div></section></div>`;
}
function foodQuickForm(){return `<div class="actions food-quick"><button class="primary" onclick="closeModal();openModal('Nuevo producto',inventoryForm())">Producto de inventario</button><button class="secondary" onclick="closeModal();openModal('Añadir receta',recipeForm())">Receta</button><button class="secondary" onclick="closeModal();openModal('Nueva preparación',preparationForm())">Preparación</button></div>`}
function toggleFoodPref(key){state.settings.food=state.settings.food||{};state.settings.food[key]=!state.settings.food[key];save();render()}
function inventoryForm(item=null){return `<div class="form"><label>Producto<input id="fInvName" value="${esc(item?.name||'')}" placeholder="Ej. pechuga de pollo"></label><div class="form-two"><label>Cantidad<input id="fInvQty" value="${esc(item?.quantity||'')}" placeholder="Ej. 2 unidades"></label><label>Ubicación<select id="fInvStorage"><option value="freezer" ${item?.storage==='freezer'?'selected':''}>Congelador</option><option value="pantry" ${item?.storage==='pantry'?'selected':''}>Despensa</option><option value="fresh" ${item?.storage==='fresh'?'selected':''}>Frescos</option></select></label></div><label>Fecha de caducidad / consumo preferente<input id="fInvExpiry" type="date" value="${item?.expiry||''}"></label><label>Notas<textarea id="fInvNotes">${esc(item?.notes||'')}</textarea></label><button class="primary" onclick="saveInventory('${item?.id||''}')">${item?'Guardar cambios':'Añadir producto'}</button>${item?`<button class="danger-button" onclick="deleteInventory('${item.id}')">Eliminar</button>`:''}</div>`}
function saveInventory(id=''){const name=document.querySelector('#fInvName').value.trim();if(!name)return;let x=id?state.inventory.find(i=>i.id===id):null;if(!x){x={id:crypto.randomUUID()};state.inventory.push(x)}x.name=name;x.quantity=document.querySelector('#fInvQty').value.trim();x.storage=document.querySelector('#fInvStorage').value;x.expiry=document.querySelector('#fInvExpiry').value;x.notes=document.querySelector('#fInvNotes').value.trim();save();closeModal();render()}
function deleteInventory(id){state.inventory=state.inventory.filter(x=>x.id!==id);save();closeModal();render()}
function inventoryListForm(){return `<div class="inventory-full-list">${state.inventory.map(x=>`<div class="inventory-row"><div><b>${esc(x.name)}</b><span>${esc(x.quantity||'')} · ${x.storage==='freezer'?'Congelador':x.storage==='pantry'?'Despensa':'Frescos'}${x.expiry?' · '+new Date(x.expiry+'T12:00').toLocaleDateString('es-ES'):''}</span></div><button class="secondary small" onclick="openModal('Editar producto',inventoryForm(${JSON.stringify(x).replace(/"/g,'&quot;')}))">Editar</button></div>`).join('')||'<div class="muted">Inventario vacío.</div>'}</div>`}
function preparationForm(item=null){return `<div class="form"><label>Preparación<input id="fPrepName" value="${esc(item?.name||'')}" placeholder="Ej. sofrito casero"></label><label>Cantidad<input id="fPrepQty" value="${esc(item?.quantity||'')}" placeholder="Ej. 3 raciones"></label><label>Uso previsto<input id="fPrepUse" value="${esc(item?.use||'')}" placeholder="Ej. arroz, pasta, guisos"></label><label class="checkline"><input id="fPrepFreeze" type="checkbox" ${item?.freezable?'checked':''}> Se puede congelar</label><button class="primary" onclick="savePreparation('${item?.id||''}')">${item?'Guardar cambios':'Guardar preparación'}</button>${item?`<button class="danger-button" onclick="deletePreparation('${item.id}')">Eliminar</button>`:''}</div>`}
function savePreparation(id=''){const name=document.querySelector('#fPrepName').value.trim();if(!name)return;let x=id?state.preparations.find(i=>i.id===id):null;if(!x){x={id:crypto.randomUUID()};state.preparations.push(x)}x.name=name;x.quantity=document.querySelector('#fPrepQty').value.trim();x.use=document.querySelector('#fPrepUse').value.trim();x.freezable=document.querySelector('#fPrepFreeze').checked;save();closeModal();render()}
function deletePreparation(id){state.preparations=state.preparations.filter(x=>x.id!==id);save();closeModal();render()}
function recipeForm(r=null){return `<div class="form"><label>Nombre de la receta<input id="fRecipeName" value="${esc(r?.name||'')}" placeholder="Ej. Pollo al horno"></label><label>Tipo<select id="fRecipeType">${foodTypes.map(x=>`<option ${x===r?.type?'selected':''}>${x}</option>`).join('')}</select></label><div class="form-two"><label>Raciones<input id="fRecipeServings" type="number" min="1" value="${r?.servings||2}"></label><label>Tiempo<input id="fRecipeTime" value="${esc(r?.time||'')}" placeholder="30 min"></label></div><label>Ingredientes <small>uno por línea: ingrediente | cantidad | unidad</small><textarea id="fRecipeIngredients" placeholder="Tomate | 150 | g\nArroz | 80 | g\nAceite de oliva | 10 | ml">${esc(r?.ingredientsText||'')}</textarea><label>Preparación<textarea id="fRecipeSteps" placeholder="Pasos de elaboración">${esc(r?.steps||'')}</textarea></label><label>Descripción<textarea id="fRecipeDesc" placeholder="Cómo es y cuándo te gusta prepararla">${esc(r?.description||'')}</textarea></label><label>Combina con<input id="fRecipePairs" value="${esc(r?.pairs||'')}" placeholder="Ej. ensalada verde"></label><label class="checkline"><input id="fRecipeFav" type="checkbox" ${r?.favorite?'checked':''}> Marcar como favorita</label><label class="checkline"><input id="fRecipeFreezable" type="checkbox" ${r?.freezable?'checked':''}> Se puede congelar</label><button class="primary" onclick="saveRecipe('${r?.id||''}')">${r?'Guardar cambios':'Guardar receta'}</button>${r?`<button class="danger-button" onclick="deleteRecipe('${r.id}')">Eliminar receta</button>`:''}</div>`}
function parseIngredients(text=''){return text.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>{const p=line.split('|').map(x=>x.trim());return {ingredient:p[0],quantity:p[1]||'',unit:p[2]||''}})}
function saveRecipe(id=''){const name=document.querySelector('#fRecipeName').value.trim();if(!name)return;let r=id?state.recipes.find(x=>x.id===id):null;if(!r){r={id:crypto.randomUUID()};state.recipes.push(r)}r.name=name;r.type=document.querySelector('#fRecipeType').value;r.servings=Number(document.querySelector('#fRecipeServings').value)||1;r.time=document.querySelector('#fRecipeTime').value.trim();r.ingredients=parseIngredients(document.querySelector('#fRecipeIngredients').value);r.ingredientsText=document.querySelector('#fRecipeIngredients').value;r.steps=document.querySelector('#fRecipeSteps').value;r.description=document.querySelector('#fRecipeDesc').value;r.pairs=document.querySelector('#fRecipePairs').value;r.favorite=document.querySelector('#fRecipeFav').checked;r.freezable=document.querySelector('#fRecipeFreezable').checked;save();closeModal();render()}
function editRecipe(id){const r=state.recipes.find(x=>x.id===id);if(r)openModal('Editar receta',recipeForm(r))}
function deleteRecipe(id){state.recipes=state.recipes.filter(x=>x.id!==id);save();closeModal();render()}
function viewRecipe(id){const r=state.recipes.find(x=>x.id===id);if(!r)return;openModal(r.name,`<div class="recipe-detail"><p>${esc(r.description||'')}</p><h4>Ingredientes</h4><ul>${(r.ingredients||parseIngredients(r.ingredientsText||'')).map(x=>`<li>${esc(x.ingredient)} · ${esc(x.quantity)} ${esc(x.unit)}</li>`).join('')}</ul><h4>Preparación</h4><p class="recipe-steps">${esc(r.steps||'')}</p>${r.pairs?`<h4>Combina con</h4><p>${esc(r.pairs)}</p>`:''}</div>`)}
function normalizeIngredient(s=''){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function recipeScore(r,used=[]){const f=state.settings.food||{},inv=state.inventory.map(x=>normalizeIngredient(x.name));let score=0;(r.ingredients||parseIngredients(r.ingredientsText||'')).forEach(i=>{const n=normalizeIngredient(i.ingredient);if(f.useInventory!==false&&n&&inv.some(x=>x===n||x.includes(n)||n.includes(x)))score+=5});if(r.favorite)score+=3;if(f.quickMeals!==false&&r.time){const m=parseInt(String(r.time));if(!isNaN(m)&&m<=Number(f.weekdayMinutes||30))score+=2}if(used.includes(r.id))score-=8;if(f.vegetables!==false&&/(verdura|calabacin|berenjena|brocoli|espinaca|pimiento|tomate|ensalada|zanahoria|calabaza)/i.test((r.name||'')+' '+(r.description||'')))score+=2;return score}
function generateMenu(){const f=state.settings.food||{};let meals=state.recipes.filter(r=>r.type==='Comidas'), dinners=state.recipes.filter(r=>r.type==='Cenas');const both=state.recipes.filter(r=>r.type==='Comidas'||r.type==='Cenas');if(!both.length){alert('Añade algunas recetas de Comidas o Cenas antes de generar el menú.');return}if(!meals.length)meals=both;if(!dinners.length)dinners=both;const rank=p=>[...p].sort((a,b)=>recipeScore(b)-recipeScore(a));meals=rank(meals);dinners=rank(dinners);const daysObj={};let used=[];for(let i=0;i<7;i++){const choose=(pool,avoid)=>{const avail=pool.filter(r=>!avoid.includes(r.id));return (avail.length?avail:pool)[i%(avail.length||pool.length)]};const lunch=choose(meals,used.slice(-3));used.push(lunch.id);const dinner=choose(dinners,used.slice(-3));used.push(dinner.id);daysObj[i]={lunch:lunch.name,dinner:dinner.name,breakfast:i<5?(f.breakfast||'Café con leche + tostada con aceite y tomate'):'Desayuno especial sencillo',snack:f.snacks!==false?(f.sweet&&i===4?'Dulce saludable':'Fruta o yogur vegetal'):'',tupper:f.twoTuppers!==false&&[1,3].includes(i)}}state.menu={week:monthKey(),status:'proposal',days:daysObj,generatedAt:new Date().toISOString()};state.shoppingChecks={};save();render()}
function acceptMenu(){if(!state.menu)return;state.menu.status='accepted';state.menu.acceptedAt=new Date().toISOString();state.shoppingChecks={};save();render()}
function changeMeal(day,slot){if(!state.menu)return;const list=state.recipes.filter(r=>r.type==='Comidas'||r.type==='Cenas');if(!list.length){alert('Añade alguna receta primero.');return}const current=state.menu.days[day]?.[slot];const candidates=list.filter(r=>r.name!==current).sort((a,b)=>recipeScore(b)-recipeScore(a));if(!candidates.length)return;state.menu.days[day][slot]=candidates[0].name;state.menu.status='proposal';state.shoppingChecks={};save();render()}
function shoppingItems(){if(!state.menu||state.menu.status!=='accepted')return [];const map=new Map();Object.values(state.menu.days||{}).forEach(day=>{[day.lunch,day.dinner].forEach(name=>{const r=state.recipes.find(x=>x.name===name);(r?.ingredients||parseIngredients(r?.ingredientsText||'')).forEach(i=>{const raw=String(i.ingredient||'').trim();if(!raw)return;const key=normalizeIngredient(raw);const has=state.inventory.some(x=>{const n=normalizeIngredient(x.name);return n===key||n.includes(key)||key.includes(n)});if(!has&&!map.has(key))map.set(key,{key,name:`${raw}${i.quantity?' · '+i.quantity+' '+(i.unit||''):''}`,group:foodGroup(raw)})})})});return [...map.values()].sort((a,b)=>a.group.localeCompare(b.group,'es')||a.name.localeCompare(b.name,'es'))}
function foodGroup(name){const n=normalizeIngredient(name);if(/pollo|pavo|ternera|cerdo|carne|huevo|salmon|atun|merluza|pescado|tofu|lenteja|garbanzo|judia/.test(n))return 'Proteínas';if(/tomate|lechuga|espinaca|brocoli|calabacin|berenjena|pimiento|cebolla|zanahoria|patata|verdura|fruta|manzana|platano/.test(n))return 'Fruta y verdura';if(/arroz|pasta|harina|pan|avena|quinoa|cereal/.test(n))return 'Despensa';if(/leche|yogur|queso|burrata|mozzarella/.test(n))return 'Refrigerados';return 'Otros'}
function toggleShopping(key){state.shoppingChecks[key]=!state.shoppingChecks[key];save();render()}
function shoppingForm(){const items=shoppingItems(),groups=[...new Set(items.map(x=>x.group))];return `<div class="shopping-list-modal">${groups.map(g=>`<div class="shopping-group"><h4>${esc(g)}</h4>${items.filter(x=>x.group===g).map(x=>`<label class="checkline shopping-check ${state.shoppingChecks[x.key]?'done':''}"><input type="checkbox" ${state.shoppingChecks[x.key]?'checked':''} onchange="toggleShopping('${x.key}')"><span>${esc(x.name)}</span></label>`).join('')}</div>`).join('')||'<p class="muted">No hay compras pendientes.</p>'}</div>`}
function togglePrep(id){state.prepDone[id]=!state.prepDone[id];save();render()}
function preparationsListForm(){return `<div class="prep-full-list">${state.preparations.map(x=>`<div class="prep-row ${state.prepDone[x.id]?'done':''}"><button class="check-mini" onclick="togglePrep('${x.id}')">${state.prepDone[x.id]?'✓':''}</button><div><b>${esc(x.name)}</b><small>${esc(x.quantity||'')} · ${esc(x.use||'')}${x.freezable?' · Congelable':''}</small></div><button class="secondary small" onclick="openModal('Editar preparación',preparationForm(${JSON.stringify(x).replace(/"/g,'&quot;')}))">Editar</button></div>`).join('')||'<div class="muted">No hay preparaciones.</div>'}</div>`}
function calendar(c){
 const base=calendarMonthDate(); const y=base.getFullYear(),m=base.getMonth();
 const monthLabel=base.toLocaleDateString('es-ES',{month:'long',year:'numeric'}); const first=(new Date(y,m,1).getDay()+6)%7; const days=new Date(y,m+1,0).getDate();
 let grid=['L','M','X','J','V','S','D'].map(x=>`<div class="cal-head">${x}</div>`).join('');
 for(let i=0;i<first;i++)grid+='<div class="day empty-day"></div>';
 for(let d=1;d<=days;d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const evs=eventsForDate(date);const dots=evs.slice(0,3).map(e=>`<span class="calendar-dot" style="background:${cats[e.category]||cats.Otros}" title="${esc(e.title)}"></span>`).join('');grid+=`<button class="day calendar-day ${date===todayKey()?'today':''} ${evs.length?'has-events':''}" onclick="openNewEventForDate('${date}')"><b>${d}</b><div class="calendar-dots">${dots}</div></button>`}
 const monthEvents=monthEventsFor(y,m).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const list=monthEvents.length?monthEvents.map(e=>eventRow(e)).join(''):'<div class="empty-state"><span>No hay eventos este mes.</span><button class="secondary" onclick="openModal(\'Nuevo evento\',eventForm())">+ Añadir evento</button></div>';
 const evcats=Object.entries(cats).map(([n,col])=>`<span class="pill" style="background:${col}22;color:${col}">${n}</span>`).join('');
 c.innerHTML=`<div class="calendar-page"><div class="calendar-toolbar"><div><h2>${cap(monthLabel)}</h2><span class="muted">Planifica eventos, cumpleaños y recordatorios.</span></div><div class="calendar-actions"><button class="secondary month-arrow" onclick="changeCalendarMonth(-1)" aria-label="Mes anterior">‹</button><button class="secondary" onclick="goCalendarToday()">Hoy</button><button class="secondary month-arrow" onclick="changeCalendarMonth(1)" aria-label="Mes siguiente">›</button><button class="primary" onclick="openModal('Nuevo evento',eventForm())">+ Evento</button></div></div><div class="calendar-main"><section class="calendar-card"><div class="calendar-grid">${grid}</div></section><aside class="calendar-side"><section class="calendar-panel"><div class="row"><div><h3>Eventos de ${base.toLocaleDateString('es-ES',{month:'long'})}</h3><span class="muted">${monthEvents.length} evento${monthEvents.length===1?'':'s'}</span></div></div><div class="list">${list}</div></section><section class="calendar-panel"><h3>Categorías</h3><div class="actions calendar-categories">${evcats}</div></section></aside></div></div>`;
}
function calendarMonthDate(){if(!state.calendarMonth)state.calendarMonth=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;return new Date(state.calendarMonth+'-01T12:00:00')}
function changeCalendarMonth(n){const d=calendarMonthDate();d.setMonth(d.getMonth()+n);state.calendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;save();render()}
function goCalendarToday(){state.calendarMonth=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;save();render()}
function eventMatchesDate(e,date){if(!e.date)return false;if(e.date===date)return true;if(!e.recurrence||e.recurrence==='none')return false;const base=new Date(e.date+'T12:00:00'), target=new Date(date+'T12:00:00');if(target<base)return false;const diff=Math.floor((target-base)/86400000);if(e.recurrence==='daily')return true;if(e.recurrence==='weekly')return diff%7===0;if(e.recurrence==='monthly')return base.getDate()===target.getDate();if(e.recurrence==='yearly')return base.getMonth()===target.getMonth()&&base.getDate()===target.getDate();return false}
function eventsForDate(date){return state.events.filter(e=>eventMatchesDate(e,date))}
function monthEventsFor(y,m){const out=[];for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;eventsForDate(date).forEach(e=>out.push({...e,displayDate:date}))}return out}
function eventRow(e){const col=cats[e.category]||cats.Otros;const date=new Date(e.displayDate+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});return `<div class="event-row"><span class="event-color" style="background:${col}"></span><div class="event-main"><b>${esc(e.title)}</b><span>${date}${e.startTime?' · '+esc(e.startTime):''}${e.endTime?'–'+esc(e.endTime):''} · ${esc(e.category||'Otros')}</span>${e.location?`<small>📍 ${esc(e.location)}</small>`:''}</div><button class="secondary small" onclick="editEvent('${e.id}')">Editar</button></div>`}
function openNewEventForDate(date){openModal('Nuevo evento',eventForm({date}))}
function eventForm(e=null){const linked=state.tasks.filter(t=>!t.done).map(t=>`<option value="${t.id}" ${e?.linkedTask===t.id?'selected':''}>${esc(t.title)}</option>`).join('');return `<div class="form"><label>Título<input id="fTitle" value="${esc(e?.title||'')}" placeholder="Ej. Cita, cumpleaños, viaje…"></label><div class="form-two"><label>Fecha<input id="fDate" type="date" value="${e?.date||todayKey()}"></label><label>Categoría<select id="fCat">${Object.keys(cats).map(x=>`<option ${x===(e?.category||'Otros')?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div><div class="form-two"><label>Hora inicio<input id="fStart" type="time" value="${e?.startTime||''}"></label><label>Hora fin<input id="fEnd" type="time" value="${e?.endTime||''}"></label></div><label>Ubicación<input id="fLocation" value="${esc(e?.location||'')}" placeholder="Opcional"></label><label>Repetir<select id="fEventRepeat"><option value="none" ${!e?.recurrence||e.recurrence==='none'?'selected':''}>No repetir</option><option value="daily" ${e?.recurrence==='daily'?'selected':''}>Cada día</option><option value="weekly" ${e?.recurrence==='weekly'?'selected':''}>Cada semana</option><option value="monthly" ${e?.recurrence==='monthly'?'selected':''}>Cada mes</option><option value="yearly" ${e?.recurrence==='yearly'?'selected':''}>Cada año</option></select></label><label class="checkline"><input id="fReminder" type="checkbox" ${e?.reminder?'checked':''}> Recordarme</label><label>Antelación del recordatorio<select id="fReminderLead"><option value="0" ${Number(e?.reminderLead||0)===0?'selected':''}>A la hora del evento</option><option value="15" ${Number(e?.reminderLead||0)===15?'selected':''}>15 minutos antes</option><option value="60" ${Number(e?.reminderLead||0)===60?'selected':''}>1 hora antes</option><option value="1440" ${Number(e?.reminderLead||0)===1440?'selected':''}>1 día antes</option></select></label><label>Vincular con tarea<select id="fLinked"><option value="">Sin tarea vinculada</option>${linked}</select></label><label>Notas<textarea id="fNotes" placeholder="Opcional">${esc(e?.notes||'')}</textarea></label><button class="primary" onclick="saveEvent('${e?.id||''}')">${e?'Guardar cambios':'Guardar evento'}</button>${e?`<button class="danger-button" onclick="deleteEvent('${e.id}')">Eliminar evento</button>`:''}</div>`}
function saveEvent(id=''){const title=document.querySelector('#fTitle')?.value.trim();const date=document.querySelector('#fDate')?.value;if(!title||!date)return;let e=id&&state.events.find(x=>x.id===id);if(!e){e={id:crypto.randomUUID()};state.events.push(e)}Object.assign(e,{title,date,category:document.querySelector('#fCat').value,startTime:document.querySelector('#fStart').value,endTime:document.querySelector('#fEnd').value,location:document.querySelector('#fLocation').value.trim(),recurrence:document.querySelector('#fEventRepeat').value,reminder:document.querySelector('#fReminder').checked,reminderLead:Number(document.querySelector('#fReminderLead').value)||0,linkedTask:document.querySelector('#fLinked').value,notes:document.querySelector('#fNotes').value.trim()});save();state.calendarMonth=date.slice(0,7);closeModal();render()}
function editEvent(id){const e=state.events.find(x=>x.id===id);if(e)openModal('Editar evento',eventForm(e))}
function deleteEvent(id){if(!confirm('¿Eliminar este evento?'))return;state.events=state.events.filter(e=>e.id!==id);save();closeModal();render()}

function settings(c){
 const s=state.settings||{};s.notifications=s.notifications||{};s.food=s.food||{};
 c.innerHTML=`<div class="settings-page"><div class="settings-intro"><span class="eyebrow">Configuración</span><h2>Tu aplicación, a tu manera</h2><p>Los ajustes se guardan en este dispositivo y se aplican al resto de la aplicación.</p></div><div class="settings-grid">
 <section class="card settings-card"><div class="setting-head"><div><h3>Perfil y formato</h3><span class="muted">Datos básicos de uso.</span></div><button class="secondary small" onclick="openModal('Perfil y formato',profileSettingsForm())">Editar</button></div><div class="settings-list"><div class="setting-row"><div><b>${esc(s.name||'Sin nombre')}</b><span>Nombre</span></div></div><div class="setting-row"><div><b>${s.currency==='EUR'?'Euro (€)':s.currency}</b><span>Moneda</span></div><span class="pill">${esc(s.dateFormat||'DD/MM/YYYY')}</span></div><div class="setting-row"><div><b>${s.weekStartsMonday!==false?'Lunes':'Domingo'}</b><span>Primer día de la semana</span></div></div></div></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Apariencia</h3><span class="muted">Cómo quieres ver Mis cosas.</span></div><button class="secondary small" onclick="openModal('Apariencia',appearanceSettingsForm())">Editar</button></div><div class="settings-list"><div class="setting-row"><div><b>${s.theme==='dark'?'Oscuro':s.theme==='auto'?'Automático':'Claro'}</b><span>Modo de apariencia</span></div><span class="color-dot" style="background:var(--sage)"></span></div></div></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Notificaciones</h3><span class="muted">Preferencias de avisos.</span></div><button class="secondary small" onclick="openModal('Notificaciones',notificationSettingsForm())">Editar</button></div><div class="settings-list">${[['tasks','Tareas'],['calendar','Calendario'],['expenses','Gastos y presupuesto'],['food','Comidas y preparación']].map(([k,l])=>`<div class="setting-row"><div><b>${l}</b><span>${s.notifications[k]!==false?'Activadas':'Desactivadas'}</span></div></div>`).join('')}</div><p class="muted">Los avisos de tareas/calendario podrán aprovechar notificaciones del navegador cuando estén disponibles.</p></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Comidas</h3><span class="muted">Preferencias del menú semanal.</span></div><button class="secondary small" onclick="openModal('Preferencias de comidas',foodSettingsForm())">Editar</button></div><div class="settings-list"><div class="setting-row"><div><b>${s.food.useInventory!==false?'Sí':'No'}</b><span>Aprovechar inventario</span></div><span class="pill">${s.food.twoTuppers!==false?'2 tuppers':'Sin objetivo'}</span></div><div class="setting-row"><div><b>${s.food.quickMeals!==false?'Sí':'No'}</b><span>Priorizar comidas rápidas</span></div><span class="pill">${s.food.vegetables!==false?'Más verduras':''}</span></div></div></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Gastos</h3><span class="muted">Cuentas, categorías, presupuestos y recurrentes.</span></div><button class="secondary small" onclick="go('expenses')">Gestionar</button></div><div class="settings-list"><div class="setting-row"><div><b>${state.accounts.length}</b><span>Cuentas</span></div><span>${state.budgets.length} presupuestos</span></div><div class="setting-row"><div><b>${state.transactions.filter(t=>t.recurring&&!t.recurringFrom).length}</b><span>Movimientos recurrentes</span></div></div></div></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Datos</h3><span class="muted">Haz una copia antes de hacer cambios importantes.</span></div></div><div class="data-actions"><button class="secondary" onclick="exportData()">Exportar mis datos</button><button class="secondary" onclick="document.querySelector('#importDataInput').click()">Importar copia</button><input id="importDataInput" type="file" accept="application/json" hidden onchange="importData(this)"></div><p class="muted">La copia incluye también inventario, preparaciones, menú y configuración.</p></section>
 <section class="card settings-card"><div class="setting-head"><div><h3>Aplicación</h3><span class="muted">PWA y almacenamiento local.</span></div><span class="status-dot">● Local</span></div><p class="muted">Los datos se mantienen en este navegador. Puedes instalar la PWA desde el navegador cuando esté disponible.</p></section>
 </div><section class="card settings-card"><div class="setting-head"><div><h3>Cuenta y sincronización</h3><span class="muted">Sesión actual</span></div><button class="secondary small" onclick="logout()">Cerrar sesión</button></div><div class="settings-list"><div class="setting-row"><div><b>${esc(currentUser?.email||'Sin sesión')}</b><span>Cuenta de Mis cosas</span></div><span class="pill">☁️ Conectada</span></div></div></section></div>`;
}
function profileSettingsForm(){const s=state.settings;return `<div class="form"><label>Nombre<input id="fSetName" value="${esc(s.name||'')}" placeholder="Tu nombre"></label><label>Moneda<select id="fSetCurrency"><option value="EUR" selected>Euro (€)</option><option value="GBP" ${s.currency==='GBP'?'selected':''}>Libra (£)</option><option value="USD" ${s.currency==='USD'?'selected':''}>Dólar ($)</option></select></label><label>Formato de fecha<select id="fSetDate"><option ${s.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY</option><option ${s.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY</option></select></label><label class="checkline"><input id="fSetMonday" type="checkbox" ${s.weekStartsMonday!==false?'checked':''}> La semana empieza en lunes</label><button class="primary" onclick="saveProfileSettings()">Guardar</button></div>`}
function saveProfileSettings(){state.settings.name=document.querySelector('#fSetName').value.trim();state.settings.currency=document.querySelector('#fSetCurrency').value;state.settings.dateFormat=document.querySelector('#fSetDate').value;state.settings.weekStartsMonday=document.querySelector('#fSetMonday').checked;save();closeModal();applyAppearance();render()}
function appearanceSettingsForm(){const s=state.settings;return `<div class="form"><label>Apariencia<select id="fSetTheme"><option value="light" ${s.theme==='light'?'selected':''}>Claro</option><option value="dark" ${s.theme==='dark'?'selected':''}>Oscuro</option><option value="auto" ${s.theme==='auto'?'selected':''}>Automático</option></select></label><label>Color principal<select id="fSetAccent"><option value="sage" ${s.accent==='sage'?'selected':''}>Verde salvia</option><option value="blue" ${s.accent==='blue'?'selected':''}>Azul lavanda</option><option value="water" ${s.accent==='water'?'selected':''}>Verde agua</option></select></label><button class="primary" onclick="saveAppearanceSettings()">Guardar</button></div>`}
function saveAppearanceSettings(){state.settings.theme=document.querySelector('#fSetTheme').value;state.settings.accent=document.querySelector('#fSetAccent').value;save();closeModal();applyAppearance();render()}
function applyAppearance(){const s=state.settings||{};let theme=s.theme||'light';if(theme==='auto')theme=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.dataset.accent=s.accent||'sage'}
function notificationSettingsForm(){const n=state.settings.notifications||{};const perm='Notification' in window?Notification.permission:'unsupported';return `<div class="form"><p class="muted">Los avisos se comprueban automáticamente cuando la aplicación está abierta. Para recibirlos, primero activa los permisos del navegador.</p><div class="setting-row notification-permission"><div><b>Permiso del navegador</b><span>${perm==='granted'?'Activado':perm==='denied'?'Bloqueado':perm==='unsupported'?'No disponible':'Pendiente'}</span></div><button class="secondary small" onclick="requestNotificationPermission();closeModal()">Activar</button></div>${[['tasks','Tareas'],['calendar','Calendario'],['expenses','Gastos y presupuesto'],['food','Comidas y preparación']].map(([k,l])=>`<label class="checkline"><input id="notif-${k}" type="checkbox" ${n[k]!==false?'checked':''}> ${l}</label>`).join('')}<button class="primary" onclick="saveNotificationSettings()">Guardar</button></div>`}
function saveNotificationSettings(){state.settings.notifications=state.settings.notifications||{};['tasks','calendar','expenses','food'].forEach(k=>state.settings.notifications[k]=document.querySelector('#notif-'+k).checked);save();closeModal();render()}
function foodSettingsForm(){const f=state.settings.food||{};return `<div class="form"><label>¿Cuántos días cocinas?<select id="foodCookDays"><option value="3" ${Number(f.cookingDays||4)===3?'selected':''}>3 días</option><option value="4" ${Number(f.cookingDays||4)===4?'selected':''}>4 días</option></select></label><label>Tiempo máximo entre semana<select id="foodTime"><option value="30" ${Number(f.weekdayMinutes||30)===30?'selected':''}>30 minutos</option><option value="45" ${Number(f.weekdayMinutes||30)===45?'selected':''}>45 minutos</option><option value="60" ${Number(f.weekdayMinutes||30)===60?'selected':''}>60 minutos</option></select></label><label class="checkline"><input id="foodInv" type="checkbox" ${f.useInventory!==false?'checked':''}> Aprovechar lo que tengo</label><label class="checkline"><input id="foodQuick" type="checkbox" ${f.quickMeals!==false?'checked':''}> Comidas rápidas</label><label class="checkline"><input id="foodVeg" type="checkbox" ${f.vegetables!==false?'checked':''}> Más verduras</label><label class="checkline"><input id="foodTup" type="checkbox" ${f.twoTuppers!==false?'checked':''}> Planificar 2 tuppers</label><label class="checkline"><input id="foodFriday" type="checkbox" ${f.fridayFun!==false?'checked':''}> Viernes: comida divertida</label><label class="checkline"><input id="foodSnack" type="checkbox" ${f.snacks!==false?'checked':''}> Incluir meriendas</label><label class="checkline"><input id="foodSweet" type="checkbox" ${f.sweet?'checked':''}> Incluir dulce</label><label class="checkline"><input id="foodBread" type="checkbox" ${f.bread?'checked':''}> Hacer pan</label><label>Desayuno entre semana<input id="foodBreakfast" value="${esc(f.breakfast||'Café con leche + tostada con aceite y tomate') }"></label><button class="primary" onclick="saveFoodSettings()">Guardar</button></div>`}
function saveFoodSettings(){state.settings.food={cookingDays:Number(document.querySelector('#foodCookDays').value),weekdayMinutes:Number(document.querySelector('#foodTime').value),useInventory:document.querySelector('#foodInv').checked,quickMeals:document.querySelector('#foodQuick').checked,vegetables:document.querySelector('#foodVeg').checked,twoTuppers:document.querySelector('#foodTup').checked,fridayFun:document.querySelector('#foodFriday').checked,snacks:document.querySelector('#foodSnack').checked,sweet:document.querySelector('#foodSweet').checked,bread:document.querySelector('#foodBread').checked,breakfast:document.querySelector('#foodBreakfast').value.trim()};save();closeModal();render()}
function accountsSettingsForm(){return `<div class="form">${state.accounts.map(a=>`<div class="account-setting-block"><div class="form-two"><label>Nombre<input id="accName-${a.id}" value="${esc(a.name)}"></label><label>Saldo inicial<input id="accBalance-${a.id}" type="number" step="0.01" value="${a.startingBalance||0}"></label></div><label class="checkline"><input id="accActive-${a.id}" type="checkbox" ${a.active!==false?'checked':''}> Cuenta activa</label></div>`).join('')}<button class="primary" onclick="saveAccountsSettings()">Guardar cuentas</button></div>`}
function saveAccountsSettings(){
 state.accounts.forEach(a=>{const n=document.querySelector('#accName-'+a.id),b=document.querySelector('#accBalance-'+a.id),active=document.querySelector('#accActive-'+a.id);if(n&&n.value.trim())a.name=n.value.trim();if(b)a.startingBalance=Number(b.value)||0;if(active)a.active=active.checked});
 save();closeModal();render();
}
function categoriesSettingsForm(){return `<div class="form"><p class="muted">Puedes añadir categorías nuevas. Las categorías que ya tienen movimientos se conservan para no romper tu histórico.</p><div class="category-settings-list">${Object.entries(expenseCategories).map(([g,a])=>`<div class="category-group-setting"><div class="setting-group-title"><b>${esc(g)}</b><span>${a.length}</span></div>${a.map((x,i)=>`<div class="category-edit-row"><input id="cat-${encodeURIComponent(g)}-${i}" value="${esc(x)}"><button type="button" class="icon-button" title="Eliminar" onclick="removeCategory('${esc(g)}','${esc(x)}')">×</button></div>`).join('')}</div>`).join('')}<div class="form-two"><label>Grupo<select id="newCatGroup">${Object.keys(expenseCategories).map(g=>`<option>${esc(g)}</option>`).join('')}</select></label><label>Nueva categoría<input id="newCatName" placeholder="Ej. Hogar"></label></div><button class="secondary" onclick="addCategory()">+ Añadir categoría</button><button class="primary" onclick="saveCategoriesSettings()">Guardar categorías</button></div>`}
function addCategory(){const g=document.querySelector('#newCatGroup')?.value,n=document.querySelector('#newCatName')?.value.trim();if(!g||!n)return;if(!expenseCategories[g])expenseCategories[g]=[];if(!expenseCategories[g].includes(n))expenseCategories[g].push(n);saveCategories();openModal('Gestionar categorías',categoriesSettingsForm())}
function removeCategory(group,name){const used=state.transactions.some(t=>t.category===name);if(used){alert('Esta categoría tiene movimientos y no se puede eliminar del histórico. Puedes dejar de usarla en adelante.');return}expenseCategories[group]=(expenseCategories[group]||[]).filter(x=>x!==name);saveCategories();openModal('Gestionar categorías',categoriesSettingsForm())}
function saveCategoriesSettings(){
 Object.entries(expenseCategories).forEach(([g,a])=>a.forEach((old,i)=>{const el=document.querySelector('#cat-'+encodeURIComponent(g)+'-'+i);if(el&&el.value.trim()&&el.value.trim()!==old){const nn=el.value.trim();if(!a.includes(nn)||nn===old){const idx=expenseCategories[g].indexOf(old);if(idx>=0)expenseCategories[g][idx]=nn}}}));
 saveCategories();closeModal();render();
}
function saveCategories(){localStorage.setItem(KEY+'expenseCategories',JSON.stringify(expenseCategories))}
function exportData(){
 const data={version:18,exportedAt:new Date().toISOString(),tasks:state.tasks,expenses:state.expenses,transactions:state.transactions,accounts:state.accounts,budgets:state.budgets,events:state.events,habits:state.habits,recipes:state.recipes,inventory:state.inventory,preparations:state.preparations,shoppingChecks:state.shoppingChecks,prepDone:state.prepDone,menu:state.menu,calendarMonth:state.calendarMonth,settings:state.settings,expenseCategories};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`mis-cosas-copia-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function importData(input){const file=input.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!Array.isArray(data.transactions)||!Array.isArray(data.accounts))throw new Error('Formato no válido');if(!confirm('Esto sustituirá los datos actuales por los de la copia. ¿Continuar?')){input.value='';return}['tasks','expenses','transactions','accounts','budgets','events','habits','recipes','inventory','preparations','shoppingChecks','prepDone'].forEach(k=>{if(Array.isArray(data[k]))state[k]=data[k]});if(data.menu)state.menu=data.menu;if(data.calendarMonth)state.calendarMonth=data.calendarMonth;if(data.settings&&typeof data.settings==='object')state.settings=data.settings;if(data.expenseCategories&&typeof data.expenseCategories==='object')expenseCategories=data.expenseCategories;save();saveCategories();input.value='';render();alert('Copia restaurada correctamente.')}catch(e){input.value='';alert('No se ha podido importar la copia. Comprueba que sea un archivo de Mis cosas.')}}

initAuth();

// Utilidades y controles globales (restaurados y centralizados)
function changeExpenseMonth(n){let d=new Date((state.expenseMonth||monthKey())+'-01T12:00');d.setMonth(d.getMonth()+n);state.expenseMonth=monthKey(d);render()}
function bindTaskFormEvents(){const repeat=document.querySelector('#fTaskRepeat');const label=document.querySelector('#customRepeatLabel');if(repeat&&label)repeat.addEventListener('change',()=>label.classList.toggle('hidden',repeat.value!=='custom'))}
function openModal(t,b){document.querySelector('#modalTitle').textContent=t;document.querySelector('#modalBody').innerHTML=b;document.querySelector('#modal').classList.remove('hidden');bindTaskFormEvents()}
function closeModal(){document.querySelector('#modal').classList.add('hidden')}
function sameMonth(s){if(!s)return false;const d=new Date(String(s).length<=10?s+'T12:00:00':s);return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()}
function cap(s=''){return s?s[0].toUpperCase()+s.slice(1):s}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function closeMobileMenu(){document.querySelector('.sidebar')?.classList.remove('open');document.querySelector('.menu-backdrop')?.classList.remove('show');document.body.classList.remove('menu-open')}
function toggleMobileMenu(){const sidebar=document.querySelector('.sidebar');const backdrop=document.querySelector('.menu-backdrop');if(!sidebar)return;const open=!sidebar.classList.contains('open');sidebar.classList.toggle('open',open);backdrop?.classList.toggle('show',open);document.body.classList.toggle('menu-open',open)}
const menuBtn=document.querySelector('#menuBtn');
if(menuBtn)menuBtn.addEventListener('click',toggleMobileMenu);
document.querySelector('.menu-backdrop')?.addEventListener('click',closeMobileMenu);
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{go(b.dataset.view);closeMobileMenu();}));

document.querySelector('#closeModal').addEventListener('click',closeModal);
document.querySelector('#quickAdd').addEventListener('click',()=>{
 if(state.view==='tasks')openModal('Nueva tarea',taskForm());
 else if(state.view==='expenses')openModal('Nuevo gasto',expenseForm());
 else if(state.view==='calendar')openModal('Nuevo evento',eventForm());
 else if(state.view==='habits')openModal('Nuevo hábito',habitForm());
 else if(state.view==='food')openModal('Añadir a Comidas',foodQuickForm());
 else openModal('Añadir',`<div class="actions"><button class="primary" onclick="closeModal();openModal('Nueva tarea',taskForm())">Nueva tarea</button><button class="secondary" onclick="closeModal();openModal('Nuevo gasto',expenseForm())">Nuevo gasto</button><button class="secondary" onclick="closeModal();openModal('Nuevo evento',eventForm())">Nuevo evento</button><button class="secondary" onclick="closeModal();openModal('Nuevo hábito',habitForm())">Nuevo hábito</button></div>`)
});
