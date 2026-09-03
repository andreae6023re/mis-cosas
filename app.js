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
 recipes:JSON.parse(localStorage.getItem(KEY+'recipes')||'[]')
};
const cats={Casa:'#ab858f',Cumpleaños:'#a0acb9',Familia:'#9ebdb8',Médico:'#b3ad8c','Médicos familia':'#67a48b',Otros:'#7f9a7d',Social:'#9998b1',Vacaciones:'#cbafab',Viajes:'#9cabc8'};
const habitColors=['#7F9A7D','#9CABC8','#A0ACB9','#9EBDB8','#B3AD8C','#CBAFAB','#9998B1','#8F9E92'];
const foodTypes=['Comidas','Cenas','Dulces','Pan','Preparaciones'];
const fmt=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0);
const todayKey=()=>{const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const today=new Date();
function save(){Object.keys(state).filter(k=>Array.isArray(state[k])).forEach(k=>localStorage.setItem(KEY+k,JSON.stringify(state[k])))}
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
 <div class="card span-4"><h3>Comidas</h3><div class="item">Comida pendiente de planificar</div><div class="item">Cena pendiente de planificar</div></div>
 <div class="card span-12"><div class="row"><div><h3>Hábitos de hoy</h3><span class="muted">Toca el botón para marcar cada hábito.</span></div><button class="secondary" onclick="go('habits')">Gestionar hábitos</button></div><div class="habit-home-grid">${habitButtons()}</div></div>
 <div class="card span-12"><div class="row"><div><h3>Preparar esta semana</h3><span class="muted">Aquí conectaremos menú, preparaciones e inventario.</span></div><button class="secondary" onclick="go('food')">Ir a Comidas</button></div></div>
 </div>`;
 renderMiniCalendar(c.querySelector('.calendar-mini'));
}
function homePendingTasks(){const list=state.tasks.filter(x=>!x.done).sort(taskSort).slice(0,3);if(!list.length)return '<div class="item muted">No hay tareas pendientes.</div>';return list.map(t=>`<button class="home-task" onclick="go('tasks')"><span>${esc(t.title)}</span>${isOverdue(t)?'<span class="overdue-label">Atrasada</span>':''}</button>`).join('')}
function todayHabitsSummary(){const n=state.habits.length;if(!n)return 'Aún no tienes hábitos';const done=state.habits.filter(h=>isHabitDone(h,todayKey())).length;return `${done} de ${n} hábitos completados`}
function habitButtons(){if(!state.habits.length)return `<div class="empty-state"><span>No hay hábitos todavía.</span><button class="secondary" onclick="openModal('Nuevo hábito',habitForm())">+ Añadir hábito</button></div>`;return state.habits.map(h=>habitButton(h,true)).join('')}
function habitButton(h,home=false){const done=isHabitDone(h,todayKey());return `<button class="habit-button ${done?'done':''}" style="--habit-color:${h.color||habitColors[0]}" onclick="toggleHabit('${h.id}')" aria-label="${esc(h.name)} ${done?'completado':'pendiente'}"><span class="habit-check">${done?'✓':''}</span><span class="habit-name">${esc(h.name)}</span>${h.reminder?`<span class="habit-reminder">${h.reminderTime||''}</span>`:''}<span class="habit-frequency">${frequencyLabel(h)}</span></button>`}
function habits(c){
 const done=state.habits.filter(h=>isHabitDone(h,todayKey())).length;
 c.innerHTML=`<div class="grid"><div class="card span-12"><div class="row"><div><h3>Hoy</h3><span class="muted">${done}/${state.habits.length} completados</span></div><button class="primary" onclick="openModal('Nuevo hábito',habitForm())">+ Añadir hábito</button></div><div class="habit-grid">${state.habits.length?state.habits.map(h=>habitButton(h)).join(''):'<div class="empty-state"><span>Crea tu primer hábito.</span></div>'}</div></div>
 <div class="card span-12"><h3>Mis hábitos</h3><div class="list">${state.habits.map(h=>`<div class="habit-row"><span class="color-dot" style="background:${h.color}"></span><div class="habit-row-main"><b>${esc(h.name)}</b><span class="muted">${frequencyLabel(h)}${h.reminder?' · Recordatorio '+(h.reminderTime||''):''}</span></div><button class="secondary small" onclick="editHabit('${h.id}')">Editar</button></div>`).join('')||'<div class="muted">Aquí aparecerán tus hábitos.</div>'}</div></div></div>`;
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
const expenseCategories={"Gastos fijos":["Alquiler","Seguro"],"Suministros":["Agua","Luz","Aerotermia","Móvil","Internet"],"Suscripciones":["Spotify","Podimo","ACNUR"],"Otros gastos":["Comida","Paga","Transporte","Otros gastos"],"Ingresos":["Nómina","Otros ingresos"]};
const defaultAccounts=["Cuenta de gastos","Cuenta nómina","Cuenta ahorro","Revolut"];
if(!Array.isArray(state.accounts))state.accounts=defaultAccounts.map(name=>({id:crypto.randomUUID(),name,startingBalance:0,active:true}));
if(!Array.isArray(state.transactions))state.transactions=[];
if(!Array.isArray(state.budgets))state.budgets=[];

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
function money(n){return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0)}
function accountOptions(sel){return state.accounts.filter(a=>a.active!==false).map(a=>`<option value="${a.id}" ${a.id===sel?'selected':''}>${esc(a.name)}</option>`).join('')}
function categoryOptions(){return Object.entries(expenseCategories).map(([g,arr])=>`<optgroup label="${g}">${arr.map(x=>`<option>${esc(x)}</option>`).join('')}</optgroup>`).join('')}
function accountBalance(a){return Number(a.startingBalance||0)+state.transactions.reduce((s,t)=>{if(t.type==='transfer'){if(t.from===a.id)s-=+t.amount;if(t.to===a.id)s+=+t.amount}else if(t.account===a.id)s+=(t.type==='income'?1:-1)*(+t.amount);return s},0)}
function expenses(c){
 ensureRecurringTransactions();
 const key=state.expenseMonth||monthKey(), tx=state.transactions.filter(t=>(t.date||'').startsWith(key));
 const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+ +t.amount,0), spent=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+ +t.amount,0);
 const budgets=state.budgets.filter(b=>b.month===key), totalBudget=budgets.reduce((s,b)=>s+ +b.amount,0);
 const byCat={};tx.filter(t=>t.type==='expense').forEach(t=>byCat[t.category]=(byCat[t.category]||0)+ +t.amount);
 c.innerHTML=`<div class="grid">
 <div class="card span-12"><div class="row"><div><h3>Gastos</h3><span class="muted">Tus movimientos, cuentas y presupuestos.</span></div><div class="actions"><button class="secondary" onclick="openModal('Nueva transferencia',transferForm())">↔ Transferencia</button><button class="primary" onclick="openModal('Nuevo gasto',expenseForm())">+ Nuevo gasto</button></div></div>
 <div class="month-switch"><button onclick="changeExpenseMonth(-1)">‹</button><b>${new Date(key+'-01T12:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</b><button onclick="changeExpenseMonth(1)">›</button></div>
 <div class="expense-summary"><div><span>Ingresos</span><b>${money(income)}</b></div><div><span>Gastos</span><b>${money(spent)}</b></div><div><span>Saldo</span><b>${money(income-spent)}</b></div><div><span>Presupuesto</span><b>${totalBudget?money(totalBudget-spent):'Sin definir'}</b></div></div></div>
 <div class="card span-7"><h3>Movimientos</h3><div class="list">${tx.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(expenseRow).join('')||'<div class="empty-state">No hay movimientos este mes.</div>'}</div></div>
 <div class="card span-5"><h3>Cuentas</h3><div class="accounts-list">${state.accounts.map(a=>`<div class="account-row"><div><b>${esc(a.name)}</b><span class="muted">Saldo actual</span></div><strong>${money(accountBalance(a))}</strong></div>`).join('')}</div></div>
 <div class="card span-7"><div class="row"><div><h3>Presupuestos</h3><span class="muted">Límite mensual por categoría.</span></div><button class="secondary small" onclick="openModal('Nuevo presupuesto',budgetForm())">+ Añadir</button></div><div class="budget-list">${budgets.map(b=>{let s=byCat[b.category]||0,p=Math.min(100,s/b.amount*100);return `<div><div class="row"><b>${esc(b.category)}</b><span>${money(s)} / ${money(b.amount)}</span></div><div class="budget-bar"><i style="width:${p}%"></i></div></div>`}).join('')||'<div class="empty-state">No hay presupuestos.</div>'}</div></div>
 <div class="card span-5"><h3>Por categoría</h3><div class="category-totals">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('')||'<span class="muted">Sin gastos.</span>'}</div></div></div>`;
}
function expenseRow(t){if(t.type==='transfer')return `<div class="item expense-row"><div class="expense-row-main"><b>${esc(t.concept||'Transferencia')}</b><span class="muted">${esc(state.accounts.find(a=>a.id===t.from)?.name||'')} → ${esc(state.accounts.find(a=>a.id===t.to)?.name||'')} · ${new Date(t.date+'T12:00').toLocaleDateString('es-ES')}${t.recurring?' · Recurrente mensual':''}</span></div><strong>${money(t.amount)}</strong><button class="secondary small" onclick="editTransfer('${t.id}')">Editar</button></div>`;return `<div class="item expense-row"><div class="expense-row-main"><b>${esc(t.concept||t.category)}</b><span class="muted">${esc(t.category)} · ${esc(state.accounts.find(a=>a.id===t.account)?.name||'')} · ${new Date(t.date+'T12:00').toLocaleDateString('es-ES')}${t.recurring?' · Recurrente mensual':''}</span>${t.ticket?'<span class="receipt-tag">Ticket</span>':''}</div><strong class="${t.type==='income'?'income-amount':''}">${t.type==='income'?'+':'-'}${money(t.amount)}</strong><button class="secondary small" onclick="editExpense('${t.id}')">Editar</button></div>`}
function expenseForm(t=null){const cat=t?.category||'Comida';return `<div class="form"><label>Tipo<select id="fExpenseType"><option value="expense" ${t?.type!=='income'?'selected':''}>Gasto</option><option value="income" ${t?.type==='income'?'selected':''}>Ingreso</option></select></label><label>Importe<input id="fExpenseAmount" type="number" step="0.01" min="0" value="${t?.amount??''}"></label><label>Categoría<select id="fExpenseCategory">${categoryOptions().replace(`<option>${esc(cat)}</option>`,`<option selected>${esc(cat)}</option>`)}</select></label><label>Concepto<input id="fExpenseConcept" value="${esc(t?.concept||'')}" placeholder="Ej. Compra semanal"></label><div class="form-two"><label>Fecha<input id="fExpenseDate" type="date" value="${t?.date||todayKey()}"></label><label>Cuenta<select id="fExpenseAccount">${accountOptions(t?.account)}</select></label></div><label>Notas<textarea id="fExpenseNotes">${esc(t?.notes||'')}</textarea></label><label>Foto del ticket<input id="fExpenseTicket" type="file" accept="image/*"></label><label class="checkline"><input id="fExpenseRecurring" type="checkbox" ${t?.recurring?'checked':''}> Repetir mensualmente</label><label id="expenseRecurringDayLabel">Día del mes<input id="fExpenseRecurringDay" type="number" min="1" max="31" value="${t?.recurringDay||String(t?.date||todayKey()).slice(8,10)}"></label><button class="primary" onclick="saveExpense('${t?.id||''}')">${t?'Guardar cambios':'Guardar'}</button>${t&&!t.recurringFrom?`<button class="danger-button" onclick="deleteTransaction('${t.id}')">Eliminar</button>`:''}</div>`}
async function saveExpense(id){const amount=+document.querySelector('#fExpenseAmount').value;if(!amount)return;let t=id?state.transactions.find(x=>x.id===id):null;if(!t){t={id:crypto.randomUUID()};state.transactions.push(t)}t.type=document.querySelector('#fExpenseType').value;t.amount=amount;t.category=document.querySelector('#fExpenseCategory').value;t.concept=document.querySelector('#fExpenseConcept').value.trim();t.date=document.querySelector('#fExpenseDate').value;t.account=document.querySelector('#fExpenseAccount').value;t.notes=document.querySelector('#fExpenseNotes').value.trim();const f=document.querySelector('#fExpenseTicket').files[0];if(f)t.ticket=await fileToData(f);t.recurring=document.querySelector('#fExpenseRecurring').checked;t.recurringDay=Math.min(31,Math.max(1,+document.querySelector('#fExpenseRecurringDay').value||+t.date.slice(8,10)||1));if(t.recurring&&!t.recurringFrom){t.recurringMonths=Array.isArray(t.recurringMonths)?t.recurringMonths:[];t.recurringMonths=t.recurringMonths.filter(m=>m!==monthKey(new Date(t.date+'T12:00')))}save();closeModal();render()}
function editExpense(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal(t.type==='income'?'Editar ingreso':'Editar gasto',expenseForm(t))}
function deleteTransaction(id){state.transactions=state.transactions.filter(x=>x.id!==id);save();closeModal();render()}
function transferForm(t=null){return `<div class="form"><label>De<select id="fTransferFrom">${accountOptions(t?.from)}</select></label><label>A<select id="fTransferTo">${accountOptions(t?.to)}</select></label><label>Importe<input id="fTransferAmount" type="number" step="0.01" min="0" value="${t?.amount??''}"></label><label>Fecha<input id="fTransferDate" type="date" value="${t?.date||todayKey()}"></label><label>Concepto<input id="fTransferConcept" value="${esc(t?.concept||'')}"></label><label class="checkline"><input id="fTransferRecurring" type="checkbox" ${t?.recurring?'checked':''}> Repetir mensualmente</label><label id="transferRecurringDayLabel">Día del mes<input id="fTransferRecurringDay" type="number" min="1" max="31" value="${t?.recurringDay||String(t?.date||todayKey()).slice(8,10)}"></label><button class="primary" onclick="saveTransfer('${t?.id||''}')">${t?'Guardar cambios':'Guardar transferencia'}</button>${t&&!t.recurringFrom?`<button class="danger-button" onclick="deleteTransaction('${t.id}')">Eliminar</button>`:''}</div>`}
function saveTransfer(id=''){const from=document.querySelector('#fTransferFrom').value,to=document.querySelector('#fTransferTo').value,amount=+document.querySelector('#fTransferAmount').value;if(!amount||from===to)return;let t=id?state.transactions.find(x=>x.id===id):null;if(!t){t={id:crypto.randomUUID()};state.transactions.push(t)}t.type='transfer';t.amount=amount;t.from=from;t.to=to;t.date=document.querySelector('#fTransferDate').value;t.concept=document.querySelector('#fTransferConcept').value.trim();t.recurring=document.querySelector('#fTransferRecurring').checked;t.recurringDay=Math.min(31,Math.max(1,+document.querySelector('#fTransferRecurringDay').value||+t.date.slice(8,10)||1));if(t.recurring&&!t.recurringFrom){t.recurringMonths=Array.isArray(t.recurringMonths)?t.recurringMonths:[];t.recurringMonths=t.recurringMonths.filter(m=>m!==monthKey(new Date(t.date+'T12:00')))}save();closeModal();render()}
function editTransfer(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal('Editar transferencia',transferForm(t))}
function budgetForm(){return `<div class="form"><label>Categoría<select id="fBudgetCategory">${Object.entries(expenseCategories).filter(([g])=>g!=='Ingresos').map(([g,a])=>`<optgroup label="${g}">${a.map(x=>`<option>${esc(x)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Importe mensual<input id="fBudgetAmount" type="number" step="0.01"></label><button class="primary" onclick="saveBudget()">Guardar presupuesto</button></div>`}
function saveBudget(){let category=document.querySelector('#fBudgetCategory').value,amount=+document.querySelector('#fBudgetAmount').value,key=state.expenseMonth||monthKey();if(!amount)return;let b=state.budgets.find(x=>x.month===key&&x.category===category);if(b)b.amount=amount;else state.budgets.push({id:crypto.randomUUID(),month:key,category,amount});save();closeModal();render()}
function changeExpenseMonth(n){let d=new Date((state.expenseMonth||monthKey())+'-01T12:00');d.setMonth(d.getMonth()+n);state.expenseMonth=monthKey(d);render()}

function food(c){c.innerHTML=`<div class="grid"><div class="card span-8"><h3>Menú semanal</h3><div class="list"><div class="item"><b>Lunes</b><br><span class="muted">Generar propuesta de comida y cena</span></div><div class="item"><b>Martes</b><br><span class="pill">Tupper</span></div><div class="item"><b>Viernes</b><br><span class="pill">Comida divertida</span></div></div><button class="primary" onclick="alert('El generador de menú conectado al inventario llegará en la siguiente iteración.')">Generar menú</button></div><div class="card span-4"><h3>Inventario</h3><div class="item">Congelador</div><div class="item">Despensa</div><div class="item">Frescos</div><button class="secondary" onclick="alert('Inventario: siguiente iteración')">Gestionar inventario</button></div><div class="card span-12"><div class="row"><div><h3>Recetas</h3><span class="muted">Tus recetas con ingredientes estructurados.</span></div><button class="primary" onclick="openModal('Añadir receta',recipeForm())">+ Añadir receta</button></div><div class="actions">${foodTypes.map(x=>`<span class="pill">${x}</span>`).join('')}</div><div class="list">${state.recipes.map(r=>`<div class="item row"><div><b>${esc(r.name)}</b><div class="muted">${r.type} · ${r.servings} raciones · ${r.time||'—'}</div></div>${r.favorite?'<span class="pill">Favorita</span>':''}</div>`).join('')||'<div class="muted">Todavía no hay recetas. Añade la primera.</div>'}</div></div><div class="card span-12"><h3>Lista de la compra</h3><div class="muted">Se calculará automáticamente al aceptar un menú.</div></div></div>`}
function recipeForm(){return `<div class="form"><label>Nombre de la receta<input id="fRecipeName" placeholder="Ej. Pollo al horno"></label><label>Tipo<select id="fRecipeType">${foodTypes.map(x=>`<option>${x}</option>`).join('')}</select></label><div class="form-two"><label>Raciones<input id="fRecipeServings" type="number" min="1" value="2"></label><label>Tiempo<input id="fRecipeTime" placeholder="30 min"></label></div><label>Ingredientes<textarea id="fRecipeIngredients" placeholder="1 tomate — 150 g\nArroz — 80 g\nAceite de oliva — 10 ml"></textarea></label><label>Preparación<textarea id="fRecipeSteps" placeholder="Pasos de elaboración"></textarea></label><label>Descripción<textarea id="fRecipeDesc" placeholder="Cómo es y cuándo te gusta prepararla"></textarea></label><label>Combina con<input id="fRecipePairs" placeholder="Ej. ensalada verde"></label><label class="checkline"><input id="fRecipeFav" type="checkbox"> Marcar como favorita</label><label class="checkline"><input id="fRecipeFreezable" type="checkbox"> Se puede congelar</label><button class="primary" onclick="saveRecipe()">Guardar receta</button></div>`}
function saveRecipe(){const name=document.querySelector('#fRecipeName').value.trim();if(!name)return;state.recipes.push({id:crypto.randomUUID(),name,type:document.querySelector('#fRecipeType').value,servings:Number(document.querySelector('#fRecipeServings').value)||1,time:document.querySelector('#fRecipeTime').value,ingredients:document.querySelector('#fRecipeIngredients').value,steps:document.querySelector('#fRecipeSteps').value,description:document.querySelector('#fRecipeDesc').value,pairs:document.querySelector('#fRecipePairs').value,favorite:document.querySelector('#fRecipeFav').checked,freezable:document.querySelector('#fRecipeFreezable').checked});save();closeModal();render()}
function calendar(c){const evcats=Object.entries(cats).map(([n,col])=>`<span class="pill" style="background:${col}22;color:${col}">${n}</span>`).join('');const events=state.events.filter(e=>e.date).map(e=>`<div class="item"><b>${esc(e.title)}</b><div class="muted">${new Date(e.date).toLocaleDateString('es-ES')} · ${esc(e.category||'Otros')}</div></div>`).join('');c.innerHTML=`<div class="card"><div class="row"><h3>Septiembre 2026</h3><button class="primary" onclick="openModal('Nuevo evento',eventForm())">+ Evento</button></div><div class="calendar">${['L','M','X','J','V','S','D'].map(x=>`<div class="cal-head">${x}</div>`).join('')}${Array.from({length:30},(_,i)=>`<div class="day ${i+1===today.getDate()?'today':''}"><b>${i+1}</b>${(i+1)%5===0?'<div><span class="dot" style="background:'+cats.Social+'"></span></div>':''}</div>`).join('')}</div><div class="actions">${evcats}</div><div class="list">${events||'<div class="muted">No hay eventos guardados todavía.</div>'}</div></div>`}
function settings(c){c.innerHTML=`<div class="card"><h3>Preferencias</h3><div class="setting"><b>Apariencia</b><div class="muted">Pastel moderno, neutro y sin rosa como color principal.</div></div><div class="setting"><b>Calendario</b><div class="muted">Categorías y colores preparados para editar.</div></div><div class="setting"><b>Hábitos</b><div class="muted">Colores, frecuencia y recordatorios se guardan en este dispositivo.</div></div><div class="setting"><b>Datos</b><div class="muted">La V2 guarda los datos localmente. Después añadiremos copia/sincronización.</div></div><div class="setting"><b>PWA</b><div class="muted">La app está preparada para instalarse como aplicación en móvil.</div></div></div>`}
function eventForm(){return `<div class="form"><label>Título<input id="fTitle" required></label><label>Fecha<input id="fDate" type="date" value="${todayKey()}"></label><label>Categoría<select id="fCat">${Object.keys(cats).map(x=>`<option>${x}</option>`).join('')}</select></label><label>Notas<textarea id="fNotes"></textarea></label><button class="primary" onclick="saveEvent()">Guardar</button></div>`}
function bindTaskFormEvents(){
  const repeat=document.querySelector("#fTaskRepeat");
  const label=document.querySelector("#customRepeatLabel");
  if(repeat&&label)repeat.addEventListener("change",()=>label.classList.toggle("hidden",repeat.value!=="custom"));
}
function openModal(t,b){document.querySelector('#modalTitle').textContent=t;document.querySelector('#modalBody').innerHTML=b;document.querySelector('#modal').classList.remove('hidden');bindTaskFormEvents()}
function closeModal(){document.querySelector('#modal').classList.add('hidden')}
function saveEvent(){const title=document.querySelector('#fTitle').value.trim();if(!title)return;state.events.push({id:crypto.randomUUID(),title,date:document.querySelector('#fDate').value,category:document.querySelector('#fCat').value,notes:document.querySelector('#fNotes').value});save();closeModal();render()}
function sameMonth(s){const d=new Date(s);return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()}
function cap(s){return s[0].toUpperCase()+s.slice(1)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
document.querySelector('#closeModal').addEventListener('click',closeModal);
document.querySelector('#quickAdd').addEventListener('click',()=>{
 if(state.view==='tasks')openModal('Nueva tarea',taskForm());
 else if(state.view==='expenses')openModal('Nuevo gasto',expenseForm());
 else if(state.view==='calendar')openModal('Nuevo evento',eventForm());
 else if(state.view==='habits')openModal('Nuevo hábito',habitForm());
 else if(state.view==='food')openModal('Añadir a Comidas',`<div class="actions"><button class="primary" onclick="closeModal();openModal('Añadir receta',recipeForm())">+ Añadir receta</button><button class="secondary" onclick="closeModal();alert('Inventario: siguiente iteración')">+ Añadir producto</button><button class="secondary" onclick="closeModal();alert('Preparaciones: siguiente iteración')">+ Añadir preparación</button></div>`);
 else openModal('Añadir',`<div class="actions"><button class="primary" onclick="closeModal();openModal('Nueva tarea',taskForm())">Nueva tarea</button><button class="secondary" onclick="closeModal();openModal('Nuevo gasto',expenseForm())">Nuevo gasto</button><button class="secondary" onclick="closeModal();openModal('Nuevo evento',eventForm())">Nuevo evento</button><button class="secondary" onclick="closeModal();openModal('Nuevo hábito',habitForm())">Nuevo hábito</button></div>`)
});
render();
