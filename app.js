/* Life Dashboard v3 — app.js */
'use strict';

/* ─── CONSTANTS ──────────────────────────────────────────── */
const STORAGE_KEY = 'life-dashboard-v3';
const AREA_COLORS = ['#EA580C','#F97316','#F59E0B','#FCD34D','#FB923C','#E11D48','#DC2626','#F43F5E','#10B981','#059669','#92400E','#78350F'];
const QUOTES = [
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
  'No cuentes los días, haz que los días cuenten.',
  'La disciplina es el puente entre metas y logros.',
  'Cada día es una nueva oportunidad de crecer.',
  'El único límite eres tú mismo.',
];

/* ─── STATE ──────────────────────────────────────────────── */
// IDs match sidebar page IDs so tasks sync to their individual pages
const DEFAULT_TASK_AREAS = [
  { id:'pending',   name:'Pendiente',   icon:'⏱',  color:'#EA580C', subcategories:[] },
  { id:'habits',    name:'Hábitos',     icon:'🔁', color:'#10B981', subcategories:['Espiritual','Salud','Mental'] },
  { id:'business',  name:'Negocios',    icon:'💼', color:'#F97316', subcategories:[] },
  { id:'personal',  name:'Personal',    icon:'👤', color:'#FCD34D', subcategories:[] },
  { id:'learning',  name:'Aprendizaje', icon:'📚', color:'#F59E0B', subcategories:[] },
  { id:'health',    name:'Salud',       icon:'💪', color:'#FB923C', subcategories:[] },
  { id:'family',    name:'Familia',     icon:'👨‍👩‍👧', color:'#E11D48', subcategories:[] },
];

// Migrate old area IDs to new ones (one-time fix for legacy data)
function migrateTaskAreas() {
  const remap = { work:'business', studies:'learning' };
  let changed = false;
  (state.taskAreas||[]).forEach(a => {
    if (remap[a.id]) {
      const newId = remap[a.id];
      // Move all tasks pointing to old id
      (state.unifiedTasks||[]).forEach(t => { if (t.area === a.id) t.area = newId; });
      a.id = newId;
      a.name = DEFAULT_TASK_AREAS.find(d => d.id === newId)?.name || a.name;
      changed = true;
    }
  });
  // Ensure all defaults exist
  DEFAULT_TASK_AREAS.forEach(d => {
    if (!state.taskAreas.find(a => a.id === d.id)) {
      state.taskAreas.push(JSON.parse(JSON.stringify(d)));
      changed = true;
    }
  });
  if (changed) saveState();
}

const defaultData = () => ({
  visions: { overview:'', business:'', health:'', family:'', finance:'', goals:'', time:'', learning:'', ejercicio:'', habits:'', consciousness:'' },
  exercise: { exercises:[], sessions:[] },
  habits: { viewMonth: '' },              // viewMonth = 'YYYY-MM'; empty = current
  sleepLog: [],                            // [{id, date, hours, notes}]
  agenda: { pomodoroSettings: { duration: 25, breakDuration: 5 } },
  financeV2: { accounts: [], transactions: [] },  // accounts: [{id,name,type,color}]; transactions: [{id,accountId,kind:'income'|'expense',amount,description,category,date,recurring,dueDate,paid}]
  learningV2: { topics: [], sessions: [] },  // topics: [{id,name,color,icon}]; sessions: [{id,topicId,date,minutes,note}]
  consciousness: { logs: [] },             // [{id, date, level:200, levelName, emotion, note}]
  notesV2: { areas: [], notes: [] },       // areas: [{id,name,icon,color}]; notes: [{id,areaId,title,body,landed,links:[],images:[]}]
  displayName: '',
  profilePhoto: '',
  customAreas: [],
  taskAreas: JSON.parse(JSON.stringify(DEFAULT_TASK_AREAS)),
  unifiedTasks: [],   // [{id,title,details,area,subcategory,date,repeat:{type,days},priority,startTime,endTime,subtasks:[],completionLog:{},done}]
  selectedDate: new Date().toISOString().slice(0,10),
  business: { projects:[], tasks:[] },
  health: { habits:[], weight:[], sleep:[], exercise:[], water:[] },
  family: { people:[], events:[], memories:[] },
  finance: { income:[], expenses:[], budget:[] },
  goals: [],
  time: { priorities:{}, blocks:[] },
  learning: { books:[], courses:[], keyLearnings:[], notToDo:[] },
  inbox: [],
  weeklyReviews: {},
  routines: { morning:[], evening:[] },
  moodLog: [],
  commitments: [],
  pomodoro: { sessions:[] },
  darkMode: false,
  filters: { taskArea:'all', goalArea:'all', bookStatus:'all' },
  nutrition: {
    foodLog: [],      // [{id,date,meal,name,amount,unit,cal,protein,carbs,fat,fiber,sodium,sugar,vitC,vitD,vitB12,calcium,iron,magnesium,zinc,omega3,notes}]
    supplements: [],  // [{id,name,brand,photo,frequency,takenLog:{date:bool},nutrients:{...},notes}]
    healthProfile: '',
    aiApiKey: '',
    aiProvider: 'anthropic',
    goals: { calories:2000, protein:150, carbs:250, fat:65, fiber:30, water:2500 },
    aiHistory: [],    // [{date, summary, recommendations}]
  },
});

let state = defaultData();

/* ─── AUTHENTICATION ──────────────────────────────────────────── */
function getCurrentUser() { return localStorage.getItem('current_user'); }
function setCurrentUser(username) { localStorage.setItem('current_user', username); }
function clearCurrentUser() { localStorage.removeItem('current_user'); }

function loadState() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) { state = defaultData(); return; }
    const raw = localStorage.getItem('user_' + currentUser);
    if (raw) state = deepMerge(defaultData(), JSON.parse(raw));
    else state = defaultData();
  } catch(e) { state = defaultData(); }
}

function saveState() {
  const currentUser = getCurrentUser();
  if (!currentUser) return; // No guardar si no hay usuario
  localStorage.setItem('user_' + currentUser, JSON.stringify(state));
}

function authLogin(username) {
  if (!username) username = el('loginUsername').value.trim();
  if (!username) { alert('⚠️ Ingresa tu nombre de usuario'); return; }
  const userData = localStorage.getItem('user_' + username);
  if (!userData) { alert('⚠️ Usuario no encontrado. Crea uno nuevo.'); return; }
  setCurrentUser(username);
  location.reload(); // Recargar para que init() detecte al usuario y muestre el dashboard
}

function authRegister(username, displayName) {
  if (!username) username = el('regUsername').value.trim();
  if (!displayName) displayName = el('regDisplayName').value.trim();
  if (!username || !displayName) { alert('⚠️ Completa todos los campos'); return; }
  if (localStorage.getItem('user_' + username)) { alert('⚠️ Este nombre de usuario ya existe'); return; }
  setCurrentUser(username);
  state = { ...defaultData(), displayName: displayName };
  saveState();
  location.reload(); // Recargar para que init() cargue al nuevo usuario
}

function authLogout() {
  if (confirm('¿Desconectarse del dashboard?')) {
    clearCurrentUser();
    location.reload();
  }
}

function showLoginForm() {
  el('loginForm').style.display = '';
  el('registerForm').style.display = 'none';
  el('loginUsername').focus();
}

function showRegisterForm() {
  el('loginForm').style.display = 'none';
  el('registerForm').style.display = '';
  el('regUsername').focus();
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      out[k] = deepMerge(target[k], source[k]);
    } else { out[k] = source[k]; }
  }
  return out;
}

/* ─── UTILS ──────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);
const el = id => document.getElementById(id);
const qs = (s,c=document) => c.querySelector(s);
const qsa = (s,c=document) => [...c.querySelectorAll(s)];

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d+'T00:00');
  return isNaN(dt) ? d : dt.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
}
function daysAgo(d) { return d ? Math.floor((Date.now()-new Date(d+'T00:00'))/86400000) : Infinity; }
function isoWeek(d=new Date()) {
  const t=new Date(d); t.setHours(0,0,0,0); t.setDate(t.getDate()+4-(t.getDay()||7));
  const y=t.getFullYear(), s=new Date(y,0,1);
  return `${y}-W${String(Math.ceil((((t-s)/86400000)+1)/7)).padStart(2,'0')}`;
}
function areaColor(id) { return state.customAreas.find(a=>a.id===id)?.color||'#EA580C'; }
function areaName(id) { return state.customAreas.find(a=>a.id===id)?.name||id; }
function sectionAreas(sec) { return state.customAreas.filter(a=>a.section===sec); }

function pill(color, text) {
  return `<span style="background:${color}22;color:${color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${color}44">${text}</span>`;
}
function bar(pct, color='var(--primary)', h=6) {
  const p=Math.min(100,Math.max(0,pct));
  return `<div style="background:var(--surface-3);border-radius:99px;height:${h}px;overflow:hidden"><div style="width:${p}%;height:100%;background:${color};border-radius:99px;transition:.3s"></div></div>`;
}
function empty(icon, msg) {
  return `<div class="list-empty"><span class="big-emoji">${icon}</span>${msg}</div>`;
}
function kpiCard(label, val, icon, color, sub='') {
  return `<div class="kpi"><div class="kpi-head"><span class="kpi-label">${label}</span><div class="kpi-icon" style="background:${color}18">${icon}</div></div>
    <div class="kpi-value" style="color:${color}">${val}</div>
    ${sub?`<div class="kpi-foot">${sub}</div>`:''}
  </div>`;
}
function priorityBadge(p) {
  const m={high:['#EF4444','Alta'],medium:['#F97316','Media'],low:['#10B981','Baja']};
  return pill(m[p]?.[0]||'#94A3B8', m[p]?.[1]||p||'—');
}

/* ─── CHARTS ─────────────────────────────────────────────── */
const charts = {};
function destroyChart(id) { if(charts[id]){charts[id].destroy();delete charts[id];} }
function lineChart(id, labels, datasets, opts={}) {
  const c=el(id); if(!c) return; destroyChart(id);
  charts[id]=new Chart(c,{type:'line',data:{labels,datasets:datasets.map(d=>({tension:.4,fill:false,pointRadius:3,pointHoverRadius:6,borderWidth:2.5,pointHoverBorderWidth:2,pointBorderWidth:1.5,...d}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:datasets.length>1,labels:{font:{size:11,weight:'600'},usePointStyle:true,boxWidth:8,padding:12}}},scales:{y:{beginAtZero:false},x:{grid:{display:false}}},interaction:{mode:'index',intersect:false},...opts}});
}
function doughnutChart(id, labels, data, colors) {
  const c=el(id); if(!c) return; destroyChart(id);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  charts[id]=new Chart(c,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:3,borderColor:isDark?'#141414':'#FFFFFF',hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11,weight:'600'},usePointStyle:true,boxWidth:8,padding:10}}},cutout:'70%'}});
}
function barChart(id, labels, datasets, opts={}) {
  const c=el(id); if(!c) return; destroyChart(id);
  charts[id]=new Chart(c,{type:'bar',data:{labels,datasets:datasets.map(d=>({borderRadius:8,borderSkipped:false,maxBarThickness:42,...d}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:datasets.length>1,labels:{font:{size:11,weight:'600'},usePointStyle:true,boxWidth:8,padding:12}}},scales:{y:{beginAtZero:true},x:{grid:{display:false}}},...opts}});
}

/* ─── MODAL ──────────────────────────────────────────────── */
let _onSave = null;
function openModal(title, html, onSave) {
  el('modalTitle').textContent = title;
  el('modalBody').innerHTML = html;
  el('modal').classList.add('active');
  _onSave = onSave;
}
function closeModal() {
  el('modal').classList.remove('active');
  el('modal').classList.remove('task-modal');
  _onSave=null;
  if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
}

/* ─── ALERTS ─────────────────────────────────────────────── */
function computeAlerts() {
  const alerts=[], t=today();
  state.business.tasks.filter(x=>x.dueDate&&x.dueDate<t&&!x.done).forEach(x=>alerts.push({type:'danger',sec:'business',msg:`Tarea vencida: "${x.title}"`}));
  state.goals.filter(g=>!g.done).forEach(g=>{
    if(g.target>0&&g.dueDate){
      const total=Math.max(1,(new Date(g.dueDate)-new Date(g.startDate||g.dueDate.slice(0,4)+'-01-01'))/86400000);
      const elapsed=Math.max(0,(new Date(t)-new Date(g.startDate||g.dueDate.slice(0,4)+'-01-01'))/86400000);
      if((g.current/g.target)*100<(elapsed/total)*100-15) alerts.push({type:'danger',sec:'goals',msg:`Meta retrasada: "${g.title}"`});
    }
  });
  state.family.people.filter(p=>daysAgo(p.lastContact)>30).forEach(p=>alerts.push({type:'warn',sec:'family',msg:`Sin contacto +30 días: ${p.name}`}));
  state.finance.budget.forEach(b=>{
    const spent=state.finance.expenses.filter(e=>e.category===b.category).reduce((s,e)=>s+Number(e.amount||0),0);
    const pct=b.limit>0?(spent/b.limit)*100:0;
    if(pct>=100) alerts.push({type:'danger',sec:'finance',msg:`Presupuesto excedido: ${b.category} (${Math.round(pct)}%)`});
    else if(pct>=80) alerts.push({type:'warn',sec:'finance',msg:`Presupuesto al ${Math.round(pct)}%: ${b.category}`});
  });
  state.commitments.filter(c=>!c.done&&c.deadline&&c.deadline<t).forEach(c=>alerts.push({type:'danger',sec:'overview',msg:`Compromiso vencido: "${c.title}"`}));
  return alerts;
}

function renderAlerts(containerId) {
  const p=el(containerId); if(!p) return;
  const alerts=computeAlerts();
  if(!alerts.length){
    p.className='alerts-card ok';
    p.innerHTML=`<div class="row gap-sm"><div class="alert-icon info">✅</div><div class="alert-text" style="font-weight:600;color:var(--success-2)">Todo en orden · Sin alertas activas</div></div>`;
    return;
  }
  p.className='alerts-card';
  p.innerHTML=alerts.map(a=>`<div class="alert-item">
    <div class="alert-icon ${a.type==='danger'?'danger':'warning'}">${a.type==='danger'?'🔴':'🟡'}</div>
    <div class="alert-text">${a.msg}</div>
  </div>`).join('');
}

function updateAlertDots() {
  const alerts=computeAlerts();
  qsa('[data-alert-dot]').forEach(dot=>{
    const sec=dot.dataset.alertDot;
    dot.style.display=alerts.some(a=>a.sec===sec)?'inline-block':'none';
  });
}

/* ─── VISIONS ────────────────────────────────────────────── */
function renderVisions() {
  qsa('[data-vision-text]').forEach(el=>{
    const sec=el.dataset.visionText;
    const v=state.visions[sec]||'';
    if(v){el.textContent=v;el.classList.remove('empty');}
    else{el.textContent='Haz clic en "Editar" para escribir tu visión para esta área...';el.classList.add('empty');}
  });
}

/* ─── ROUTING ────────────────────────────────────────────── */
let currentPage='overview';
const PAGE_META={
  overview:{title:'Centro de control',sub:'Tu día y tus áreas en un vistazo'},
  business:{title:'Negocios',sub:'Proyectos, tareas y ROI'},
  health:{title:'Salud',sub:'Hábitos, rutinas y métricas corporales'},
  family:{title:'Familia',sub:'Relaciones y momentos que importan'},
  finance:{title:'Finanzas',sub:'Ingresos, gastos y presupuesto'},
  goals:{title:'Metas / OKRs',sub:'Objetivos y resultados clave'},
  time:{title:'Tiempo / Agenda',sub:'Prioridades, Pomodoro y análisis 80/20'},
  learning:{title:'Aprendizaje',sub:'Libros, cursos e insights'},
  nutrition:{title:'Nutrición IA',sub:'Alimentación, suplementos y análisis inteligente'},
  ejercicio:{title:'Ejercicio',sub:'Tu rutina semanal y progreso'},
  habits:{title:'Hábitos',sub:'Tu consistencia en cada hábito, día a día'},
  consciousness:{title:'Nivel de conciencia',sub:'Escala de Hawkins — registra en qué vibras cada día'},
  profile:{title:'Mi perfil',sub:'Personaliza tu cuenta'},
  inbox:{title:'Notas',sub:'Áreas, ideas, links y capturas — todo a la mano'},
  weekly:{title:'Revisión Semanal',sub:'Tu sistema de mejora continua'},
};

function navigate(page) {
  currentPage=page;
  qsa('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  qsa('.bottom-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  qsa('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  const meta=PAGE_META[page]||{};
  el('pageTitle').textContent=meta.title||page;
  el('pageSubtitle').textContent=meta.sub||'';
  renderPage(page);
  renderVisions();
  updateAlertDots();
}

function renderPage(page) {
  ({overview:renderOverview,business:renderBusiness,health:renderHealth,family:renderFamily,
    finance:renderFinance,goals:renderGoals,time:renderTime,learning:renderLearning,
    nutrition:renderNutrition,ejercicio:renderEjercicio,habits:renderHabits,
    consciousness:renderConsciousness,profile:renderProfile,
    inbox:renderInbox,weekly:renderWeekly})[page]?.();
}

/* ─── OVERVIEW (NEW DESIGN) ──────────────────────────────── */
const REPEAT_LABELS = {
  none:'No repetir', daily:'Todos los días', weekdays:'Días hábiles',
  weekends:'Fines de semana', custom:'Personalizado'
};
const PRIORITY_LABELS = { normal:'Normal', important:'Importante', urgent:'Urgente' };
const WEEKDAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const WEEKDAY_SHORT = ['D','L','M','M','J','V','S'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let calendarViewDate = new Date();  // for calendar popup navigation

function getSelectedDate() {
  return state.selectedDate || today();
}

function setSelectedDate(d) {
  state.selectedDate = d;
  saveState();
  renderPage(currentPage);  // re-render whatever page user is on
}

function taskRunsOnDate(task, dateStr) {
  // dateStr: 'YYYY-MM-DD'
  const dt = new Date(dateStr + 'T00:00');
  const dow = dt.getDay();
  const t = today();
  if (!task.repeat || task.repeat.type === 'none') {
    if (task.date === dateStr) return true;
    // Bubble-up: overdue one-time tasks appear on today's view too
    if (dateStr === t && task.date && task.date < t && !task.done) return true;
    return false;
  }
  if (task.repeat.type === 'daily') return (!task.date || dateStr >= task.date);
  if (task.repeat.type === 'weekdays') return dow >= 1 && dow <= 5 && (!task.date || dateStr >= task.date);
  if (task.repeat.type === 'weekends') return (dow === 0 || dow === 6) && (!task.date || dateStr >= task.date);
  if (task.repeat.type === 'custom') return (task.repeat.days||[]).includes(dow) && (!task.date || dateStr >= task.date);
  return false;
}

function isTaskOverdue(task, dateStr) {
  if (isTaskDone(task, dateStr)) return false;
  const t = today();
  // One-time tasks: overdue if their scheduled date is in the past
  if (!task.repeat || task.repeat.type === 'none') {
    return task.date && task.date < t;
  }
  // Recurring tasks: overdue when viewing a past date and not completed
  return dateStr < t;
}

function isTaskDone(task, dateStr) {
  if (task.repeat && task.repeat.type !== 'none') return !!(task.completionLog && task.completionLog[dateStr]);
  return !!task.done;
}

function toggleTaskDone(taskId) {
  const task = state.unifiedTasks.find(t => t.id === taskId);
  if (!task) return;
  const d = getSelectedDate();
  if (task.repeat && task.repeat.type !== 'none') {
    task.completionLog = task.completionLog || {};
    task.completionLog[d] = !task.completionLog[d];
  } else {
    task.done = !task.done;
  }
  saveState();
  renderPage(currentPage);  // sync to whatever page user is on
}

function deleteTask(taskId) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  state.unifiedTasks = state.unifiedTasks.filter(t => t.id !== taskId);
  saveState();
  renderPage(currentPage);
}

function getGreeting() {
  const hour = new Date().getHours();
  const d = getSelectedDate();
  const dayTasks = (state.unifiedTasks||[]).filter(t => taskRunsOnDate(t, d));
  const total = dayTasks.length;
  const doneCount = dayTasks.filter(t => isTaskDone(t, d)).length;
  const pct = total > 0 ? Math.round((doneCount/total)*100) : 0;
  const habits = dayTasks.filter(t => t.area === 'habits');
  const habitsDone = habits.filter(t => isTaskDone(t, d)).length;

  // EARLY MORNING (00-06)
  if (hour < 6) {
    if (doneCount > 0) return { eyebrow:'TRASNOCHADO Y PRODUCTIVO', text:`Llevas ${doneCount} hechas,`, accent:'pero descansa pronto.' };
    return { eyebrow:'AÚN DESPIERTO', text:'¿No puedes dormir?', accent:'descansa para rendir mañana.' };
  }
  // MORNING (06-12)
  if (hour < 12) {
    if (pct === 100 && total > 0) return { eyebrow:'MAÑANA DE CAMPEÓN', text:'¡Día limpio antes del mediodía!', accent:'crack absoluto.' };
    if (habitsDone >= 3) return { eyebrow:'ARRANQUE PERFECTO', text:`${habitsDone} hábitos ya hechos,`, accent:'sigue con ese ritmo.' };
    if (doneCount > 0) return { eyebrow:'TEMPRANO Y PRODUCTIVO', text:`Llevas ${doneCount} ${doneCount===1?'tarea':'tareas'} hoy,`, accent:'vas adelante.' };
    return { eyebrow:'BUENOS DÍAS', text:'¿Te levantaste temprano?', accent:'el día es tuyo.' };
  }
  // AFTERNOON (12-19)
  if (hour < 19) {
    if (pct === 100 && total > 0) return { eyebrow:'TARDE DE LIBRE', text:'¡Día completo!', accent:'puedes relajarte.' };
    if (pct >= 70) return { eyebrow:'TARDE PRODUCTIVA', text:`Ya vas al ${pct}%,`, accent:'cierra fuerte.' };
    if (pct >= 30) return { eyebrow:'A MEDIO CAMINO', text:`Llevas ${doneCount} de ${total},`, accent:'no aflojes.' };
    if (total > 0) return { eyebrow:'RETOMA EL FOCO', text:'La tarde es para avanzar,', accent:'elige una y empieza.' };
    return { eyebrow:'TARDE LIBRE', text:'Hoy sin tareas,', accent:'agrega algo o disfruta.' };
  }
  // EVENING (19-24)
  if (pct === 100 && total > 0) return { eyebrow:'DÍA COMPLETADO', text:'¡Lograste todo lo que querías!', accent:'descansa con orgullo.' };
  if (pct >= 70) return { eyebrow:'CIERRE FUERTE', text:`${pct}% del día logrado,`, accent:'buen trabajo.' };
  if (pct > 0) return { eyebrow:'CIERRA EL DÍA', text:`${doneCount} ${doneCount===1?'tarea hecha':'tareas hechas'},`, accent:'mañana lo retomas.' };
  return { eyebrow:'NOCHE TRANQUILA', text:'Sin tareas terminadas,', accent:'descansa y reinicia mañana.' };
}

function formatSelectedDateLabel(dateStr) {
  const dt = new Date(dateStr + 'T00:00');
  const t = today();
  if (dateStr === t) return `Hoy, ${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()]}`;
  return `${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
}

function renderOverview() {
  const d = getSelectedDate();

  // Greeting
  const g = getGreeting();
  if (el('overviewEyebrow')) el('overviewEyebrow').textContent = g.eyebrow;
  if (el('overviewGreeting')) el('overviewGreeting').innerHTML = `${g.text} <span class="accent">${g.accent}</span>`;
  if (el('overviewDateLabel')) el('overviewDateLabel').textContent = formatSelectedDateLabel(d);

  // Stats — counts for this date
  const dayTasks = state.unifiedTasks.filter(t => taskRunsOnDate(t, d));
  const habits = dayTasks.filter(t => t.area === 'habits').length;
  const others = dayTasks.filter(t => t.area !== 'habits').length;
  if (el('overviewStats')) {
    el('overviewStats').innerHTML = `, tienes <strong>${habits} hábitos</strong> y <strong>${others} tareas</strong>.`;
  }

  // Goals strip
  renderGoalsStrip();

  // Areas grid
  renderAreasGrid(d);
}

function renderGoalsStrip() {
  const wrap = el('overviewGoalsStripWrap');
  const strip = el('overviewGoalsStrip');
  if (!wrap || !strip) return;
  const active = state.goals.filter(g => !g.done);
  if (!active.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  strip.innerHTML = active.slice(0, 8).map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.current/g.target)*100)) : 0;
    return `<div class="goal-chip" onclick="navigate('goals')">
      <span class="goal-chip-icon">${g.icon || '🎯'}</span>
      <div class="goal-chip-title">${escapeHtml(g.title)}</div>
      <div class="goal-chip-pct">${pct}% completado</div>
    </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderAreasGrid(dateStr) {
  const grid = el('overviewAreasGrid');
  if (!grid) return;
  // Ensure taskAreas exists
  if (!state.taskAreas || !state.taskAreas.length) {
    state.taskAreas = JSON.parse(JSON.stringify(DEFAULT_TASK_AREAS));
  }
  grid.innerHTML = state.taskAreas.map(area => renderAreaCard(area, dateStr)).join('');
}

function renderAreaCard(area, dateStr) {
  const tasks = state.unifiedTasks
    .filter(t => t.area === area.id && taskRunsOnDate(t, dateStr))
    .sort((a,b) => {
      // Done tasks at the bottom
      const dA = isTaskDone(a, dateStr) ? 1 : 0;
      const dB = isTaskDone(b, dateStr) ? 1 : 0;
      if (dA !== dB) return dA - dB;
      // Overdue tasks at the top (within the non-done group)
      const oA = isTaskOverdue(a, dateStr) ? 0 : 1;
      const oB = isTaskOverdue(b, dateStr) ? 0 : 1;
      if (oA !== oB) return oA - oB;
      // Then by priority
      const pri = { urgent:0, important:1, normal:2 };
      return (pri[a.priority]||2) - (pri[b.priority]||2);
    });
  const visible = tasks.slice(0, 6);
  const extra = tasks.length - visible.length;
  return `<div class="area-task-card" style="--area-color:${area.color}">
    <div class="area-task-head">
      <div class="area-task-title-wrap">
        <span class="area-task-icon">${area.icon}</span>
        <span class="area-task-title">${escapeHtml(area.name)}</span>
      </div>
      <div class="area-task-actions">
        <button class="btn-area-menu" onclick="editTaskArea('${area.id}')" title="Editar área">⋯</button>
        <button class="btn-icon-add" onclick="openTaskModal(null,'${area.id}')" title="Agregar tarea">+</button>
      </div>
    </div>
    <div class="area-task-list">
      ${visible.length ? visible.map(t => renderTaskRow(t, dateStr)).join('') : `<div class="area-empty">Sin tareas hoy. Toca + para agregar.</div>`}
    </div>
    ${extra > 0 ? `<div class="area-expand-more">+${extra} más</div>` : ''}
  </div>`;
}

function renderTaskRow(t, dateStr, opts = {}) {
  const done = isTaskDone(t, dateStr);
  const overdue = !done && isTaskOverdue(t, dateStr);
  const subcatBadge = (t.subcategory && !opts.hideSubcat) ? `<span class="task-row-subcat">${escapeHtml(t.subcategory)}</span>` : '';
  const repeatIcon = (t.repeat && t.repeat.type !== 'none') ? `<span class="repeat-ico" title="${REPEAT_LABELS[t.repeat.type]||'repite'}">⇄</span>` : '';
  const timeChip = (t.startTime || t.endTime) ? `<span class="time-chip">${t.startTime||''}${t.endTime?(' - '+t.endTime):''}</span>` : '';
  let dueChip = '';
  if (overdue && t.date) {
    const daysLate = Math.floor((new Date(today()+'T00:00') - new Date(t.date+'T00:00'))/86400000);
    dueChip = `<span class="overdue-badge">⚠ ${daysLate>0?daysLate+'d vencida':'Vencida'}</span>`;
  }
  const meta = (subcatBadge || repeatIcon || timeChip || dueChip)
    ? `<div class="task-row-meta">${dueChip}${repeatIcon}${timeChip}${subcatBadge}</div>` : '';
  const cls = ['task-row', `priority-${t.priority||'normal'}`];
  if (done) cls.push('done');
  if (overdue) cls.push('overdue');
  return `<div class="${cls.join(' ')}" onclick="openTaskModal('${t.id}')">
    <button class="task-check ${done?'checked':''}" onclick="event.stopPropagation(); toggleTaskDone('${t.id}')" title="Marcar completado">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <div class="task-row-main">
      <div class="task-row-title">${escapeHtml(t.title)}</div>
      ${meta}
    </div>
  </div>`;
}

/* ─── SYNCED TASKS PANEL (on connected pages) ────────────── */
function renderSyncedTasksPanel(areaId, mountId) {
  const mount = el(mountId);
  if (!mount) return;
  const area = state.taskAreas.find(a => a.id === areaId);
  if (!area) { mount.innerHTML = ''; return; }
  const d = getSelectedDate();
  const tasks = state.unifiedTasks
    .filter(t => t.area === areaId && taskRunsOnDate(t, d))
    .sort((a,b) => {
      const dA = isTaskDone(a, d) ? 1 : 0;
      const dB = isTaskDone(b, d) ? 1 : 0;
      if (dA !== dB) return dA - dB;
      const pri = { urgent:0, important:1, normal:2 };
      return (pri[a.priority]||2) - (pri[b.priority]||2);
    });
  const doneCount = tasks.filter(t => isTaskDone(t, d)).length;

  mount.innerHTML = `
    <div class="synced-tasks-card">
      <div class="synced-tasks-head">
        <div class="left">
          <span style="font-size:20px">${area.icon}</span>
          <h3>Mis tareas de ${escapeHtml(area.name).toLowerCase()}</h3>
          <span class="pill-count">${doneCount}/${tasks.length}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="synced-tasks-date-nav">
            <button onclick="shiftSelectedDate(-1)" title="Día anterior">‹</button>
            <span class="date-text">${formatSelectedDateLabel(d)}</span>
            <button onclick="shiftSelectedDate(1)" title="Día siguiente">›</button>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openTaskModal(null,'${areaId}')">+ Tarea</button>
        </div>
      </div>
      <div class="synced-tasks-list">
        ${tasks.length ? tasks.map(t => renderTaskRow(t, d)).join('') : `<div class="area-empty">Sin tareas para esta fecha. Toca + para agregar.</div>`}
      </div>
    </div>
  `;
}

function shiftSelectedDate(delta) {
  const d = new Date(getSelectedDate() + 'T00:00');
  d.setDate(d.getDate() + delta);
  setSelectedDate(d.toISOString().slice(0,10));
}

/* ─── BUSINESS-GROUPED PANEL (Negocios page) ─────────────── */
function renderBusinessGroupedPanel(mountId) {
  const mount = el(mountId);
  if (!mount) return;
  const area = (state.taskAreas||[]).find(a => a.id === 'business');
  if (!area) { mount.innerHTML = ''; return; }
  const businesses = area.subcategories || [];
  const d = getSelectedDate();

  const allTasks = state.unifiedTasks
    .filter(t => t.area === 'business' && taskRunsOnDate(t, d))
    .sort((a,b) => {
      const dA = isTaskDone(a, d) ? 1 : 0;
      const dB = isTaskDone(b, d) ? 1 : 0;
      if (dA !== dB) return dA - dB;
      const pri = { urgent:0, important:1, normal:2 };
      return (pri[a.priority]||2) - (pri[b.priority]||2);
    });

  const groups = [
    { id:'__general', name:'General', tasks: allTasks.filter(t => !t.subcategory) },
    ...businesses.map(b => ({ id:b, name:b, tasks: allTasks.filter(t => t.subcategory === b) })),
  ];
  groups.forEach(g => {
    g.done = g.tasks.filter(t => isTaskDone(t, d)).length;
    g.total = g.tasks.length;
  });

  mount.innerHTML = `
    <div class="biz-panel-head">
      <h2 class="biz-panel-title">💼 Mis negocios</h2>
      <div class="row gap-sm" style="align-items:center">
        <div class="synced-tasks-date-nav">
          <button onclick="shiftSelectedDate(-1)" title="Día anterior">‹</button>
          <span class="date-text">${formatSelectedDateLabel(d)}</span>
          <button onclick="shiftSelectedDate(1)" title="Día siguiente">›</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="addBusinessSubcategory()">+ Nuevo negocio</button>
      </div>
    </div>
    <div class="businesses-grid">
      ${groups.map(g => {
        const safeId = String(g.id).replace(/'/g,"\\'");
        return `<div class="business-card">
          <div class="business-card-head">
            <div class="business-card-title">
              <span>💼</span> ${escapeHtml(g.name)}
              <span class="pill-count">${g.done}/${g.total}</span>
            </div>
            <div style="display:flex;gap:4px">
              ${g.id !== '__general' ? `<button class="btn-area-menu" title="Renombrar / Eliminar" onclick="editBusinessSubcategory('${safeId}')">⋯</button>` : ''}
              <button class="btn-icon-add" title="Agregar tarea" onclick="openTaskModalForBusiness('${safeId}')">+</button>
            </div>
          </div>
          <div class="business-card-tasks">
            ${g.tasks.length ? g.tasks.map(t => renderTaskRow(t, d, {hideSubcat:true})).join('') : '<div class="area-empty">Sin tareas. Toca + para agregar.</div>'}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function openTaskModalForBusiness(businessName) {
  openTaskModal(null, 'business');
  if (businessName && businessName !== '__general') {
    setTimeout(() => {
      if (window._taskDraft) {
        window._taskDraft.subcategory = businessName;
        renderTaskModal();
      }
    }, 50);
  }
}

function addBusinessSubcategory() {
  const name = prompt('Nombre del nuevo negocio (ej. Tienda Online, Consultoría):');
  if (!name || !name.trim()) return;
  const area = state.taskAreas.find(a => a.id === 'business');
  area.subcategories = area.subcategories || [];
  const trimmed = name.trim();
  if (area.subcategories.includes(trimmed)) {
    alert('Ya tienes un negocio con ese nombre');
    return;
  }
  area.subcategories.push(trimmed);
  saveState();
  renderPage(currentPage);
}

function editBusinessSubcategory(name) {
  const choice = prompt(
    `Negocio: "${name}"\n\n` +
    `• Escribe un nuevo nombre para renombrar\n` +
    `• Escribe "eliminar" para borrarlo (las tareas pasan a General)\n` +
    `• Deja vacío para cancelar`,
    name
  );
  if (choice === null) return;
  const action = choice.trim();
  if (!action || action === name) return;
  const area = state.taskAreas.find(a => a.id === 'business');
  if (action.toLowerCase() === 'eliminar') {
    if (!confirm(`¿Eliminar el negocio "${name}"? Las tareas se moverán a General.`)) return;
    area.subcategories = area.subcategories.filter(s => s !== name);
    state.unifiedTasks.forEach(t => { if (t.area === 'business' && t.subcategory === name) t.subcategory = ''; });
  } else {
    if (area.subcategories.includes(action)) { alert('Ya existe un negocio con ese nombre'); return; }
    area.subcategories = area.subcategories.map(s => s === name ? action : s);
    state.unifiedTasks.forEach(t => { if (t.area === 'business' && t.subcategory === name) t.subcategory = action; });
  }
  saveState();
  renderPage(currentPage);
}

/* ─── TASK MODAL (CREATE / EDIT) ─────────────────────────── */
// NOTE: must be on window for inline onclick handlers to access it (let at script-level is not global)
window._taskDraft = null;

function openTaskModal(taskId = null, defaultArea = 'pending') {
  const existing = taskId ? state.unifiedTasks.find(t => t.id === taskId) : null;
  window._taskDraft = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: uid(),
        title: '',
        details: '',
        area: defaultArea,
        subcategory: '',
        date: getSelectedDate(),
        repeat: { type: 'none', days: [] },
        priority: 'normal',
        startTime: '',
        endTime: '',
        subtasks: [],
        completionLog: {},
        goalId: '',
        done: false,
      };
  _onSave = null;  // disable default modal save handler
  renderTaskModal();
  el('modal').classList.add('active');
  el('modal').classList.add('task-modal');
  setTimeout(() => el('f-task-title')?.focus(), 50);
}

function renderTaskModal() {
  const t = window._taskDraft;
  if (!t) return;
  const area = state.taskAreas.find(a => a.id === t.area) || state.taskAreas[0];
  const dateLbl = t.date ? new Date(t.date + 'T00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : 'Sin fecha';
  const repLbl = (t.repeat && t.repeat.type !== 'none')
    ? (t.repeat.type === 'custom' && t.repeat.days?.length
        ? t.repeat.days.map(d => WEEKDAY_SHORT[d]).join('·')
        : REPEAT_LABELS[t.repeat.type])
    : 'No repetir';
  const timeLbl = (t.startTime || t.endTime)
    ? `${t.startTime||'--:--'}${t.endTime?' → '+t.endTime:''}`
    : 'Libre';
  const subcatLbl = t.subcategory || 'Sin Subcategoría';
  const linkedGoal = (state.goals||[]).find(g => g.id === t.goalId);
  const goalLbl = linkedGoal ? linkedGoal.title : 'Sin meta';
  const isNew = !state.unifiedTasks.find(x => x.id === t.id);
  const tid = String(t.id).replace(/'/g, "\\'");

  el('modalTitle').innerHTML = '';
  el('modalBody').innerHTML = `
    <input id="f-task-title" class="task-modal-title-input" placeholder="ej: Ir al supermercado" value="${escapeHtml(t.title)}" oninput="window._taskDraft.title=this.value">
    <textarea id="f-task-details" class="task-modal-details" placeholder="Detalles, enlaces u observaciones (opcional)..." oninput="window._taskDraft.details=this.value">${escapeHtml(t.details||'')}</textarea>
    <div id="taskSubtasksList">${renderSubtasksList()}</div>
    <button class="task-add-subtask-btn" onclick="addSubtaskInput()">+ Agregar subtarea...</button>

    ${t.area === 'health' ? `
      <div class="task-options-row" style="border-top:none;padding-top:0;margin-top:8px">
        <button class="task-option-chip ${t.subcategory==='Rutina mañana'?'active':''}" onclick="setHealthRoutine('morning')"><span class="chip-icon">🌅</span><span>Rutina mañana</span></button>
        <button class="task-option-chip ${t.subcategory==='Rutina noche'?'active':''}" onclick="setHealthRoutine('evening')"><span class="chip-icon">🌙</span><span>Rutina noche</span></button>
      </div>
    ` : ''}

    <div class="task-options-row">
      <button class="task-option-chip" onclick="openAreaDropdown(event)" id="chip-area"><span class="chip-icon">📁</span><span>${escapeHtml(area.name)}</span></button>
      <button class="task-option-chip ${t.subcategory?'active':''}" onclick="openSubcatDropdown(event)" id="chip-subcat"><span class="chip-icon">🗂️</span><span>${escapeHtml(subcatLbl)}</span>${t.subcategory?`<span class="chip-clear" onclick="event.stopPropagation();window._taskDraft.subcategory='';renderTaskModal()">×</span>`:''}</button>
      <button class="task-option-chip ${t.date?'active':''}" onclick="openDateDropdown(event)" id="chip-date"><span class="chip-icon">📅</span><span>${dateLbl}</span>${t.date?`<span class="chip-clear" onclick="event.stopPropagation();window._taskDraft.date='';renderTaskModal()">×</span>`:''}</button>
      <button class="task-option-chip ${(t.repeat&&t.repeat.type!=='none')?'active':''}" onclick="openRepeatDropdown(event)" id="chip-repeat"><span class="chip-icon">🔁</span><span>${escapeHtml(repLbl)}</span></button>
      <button class="task-option-chip ${(t.startTime||t.endTime)?'active':''}" onclick="openTimeDropdown(event)" id="chip-time"><span class="chip-icon">🕐</span><span>${timeLbl}</span></button>
      <button class="task-option-chip priority-${t.priority||'normal'} ${t.priority!=='normal'?'active':''}" onclick="openPriorityDropdown(event)" id="chip-priority"><span class="priority-dot"></span><span>${PRIORITY_LABELS[t.priority||'normal']}</span></button>
      <button class="task-option-chip ${t.goalId?'active':''}" onclick="openGoalDropdown(event)" id="chip-goal"><span class="chip-icon">🎯</span><span>${escapeHtml(goalLbl)}</span>${t.goalId?`<span class="chip-clear" onclick="event.stopPropagation();window._taskDraft.goalId='';renderTaskModal()">×</span>`:''}</button>
    </div>

    <div class="task-modal-foot">
      <div class="left">
        ${!isNew ? `<button class="btn btn-danger" onclick="deleteTaskFromModal('${tid}')">🗑 Eliminar</button>` : ''}
      </div>
      <div class="right">
        <button class="btn btn-secondary" onclick="closeTaskModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTaskDraft()">${isNew?'Añadir Tarea →':'Guardar cambios'}</button>
      </div>
    </div>
  `;
}

// Wrapper called from inline onclick — guarantees the id is captured and the modal closes
function deleteTaskFromModal(taskId) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  state.unifiedTasks = state.unifiedTasks.filter(t => t.id !== taskId);
  saveState();
  closeTaskModal();
  renderPage(currentPage);
}

function renderSubtasksList() {
  if (!window._taskDraft.subtasks || !window._taskDraft.subtasks.length) return '';
  return window._taskDraft.subtasks.map((s, i) => `
    <div class="task-subtask-row">
      <input type="checkbox" ${s.done?'checked':''} onchange="window._taskDraft.subtasks[${i}].done=this.checked">
      <input type="text" value="${escapeHtml(s.title)}" style="flex:1;border:none;background:transparent;outline:none;color:var(--text);font-size:13px;font-family:inherit" oninput="window._taskDraft.subtasks[${i}].title=this.value">
      <button class="icon-btn danger" onclick="window._taskDraft.subtasks.splice(${i},1);el('taskSubtasksList').innerHTML=renderSubtasksList()">✕</button>
    </div>
  `).join('');
}

function addSubtaskInput() {
  window._taskDraft.subtasks = window._taskDraft.subtasks || [];
  window._taskDraft.subtasks.push({ id: uid(), title:'', done:false });
  el('taskSubtasksList').innerHTML = renderSubtasksList();
  // focus last input
  setTimeout(() => {
    const inputs = el('taskSubtasksList').querySelectorAll('input[type="text"]');
    inputs[inputs.length-1]?.focus();
  }, 30);
}

function closeTaskModal() {
  el('modal').classList.remove('active');
  el('modal').classList.remove('task-modal');
  closeAllDropdowns();
  window._taskDraft = null;
}

function saveTaskDraft() {
  if (!window._taskDraft.title.trim()) { alert('⚠️ Pon un título a la tarea'); return; }
  const idx = state.unifiedTasks.findIndex(t => t.id === window._taskDraft.id);
  if (idx >= 0) state.unifiedTasks[idx] = window._taskDraft;
  else state.unifiedTasks.push(window._taskDraft);
  saveState();
  closeTaskModal();
  renderPage(currentPage);
}

/* ─── TASK MODAL DROPDOWNS ───────────────────────────────── */
function closeAllDropdowns() {
  qsa('.task-dropdown').forEach(d => d.remove());
}

function showDropdown(anchor, html) {
  closeAllDropdowns();
  const dd = document.createElement('div');
  dd.className = 'task-dropdown';
  dd.innerHTML = html;
  document.body.appendChild(dd);
  const rect = anchor.getBoundingClientRect();
  dd.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  dd.style.left = (rect.left + window.scrollX) + 'px';
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dd.contains(e.target) && e.target !== anchor) {
        dd.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 50);
  return dd;
}

function openAreaDropdown(e) {
  e.stopPropagation();
  const html = state.taskAreas.map(a => `
    <div class="task-dropdown-item ${window._taskDraft.area===a.id?'active':''}" onclick="window._taskDraft.area='${a.id}'; window._taskDraft.subcategory=''; closeAllDropdowns(); renderTaskModal()">
      <span><span style="margin-right:8px">${a.icon}</span>${escapeHtml(a.name)}</span>
      ${window._taskDraft.area===a.id?'<span>✓</span>':''}
    </div>
  `).join('');
  showDropdown(e.currentTarget, html);
}

function openSubcatDropdown(e) {
  e.stopPropagation();
  const area = state.taskAreas.find(a => a.id === window._taskDraft.area);
  const subs = (area?.subcategories || []);
  const html = `
    <div class="task-dropdown-item ${!window._taskDraft.subcategory?'active':''}" onclick="window._taskDraft.subcategory=''; closeAllDropdowns(); renderTaskModal()">Sin Subcategoría</div>
    ${subs.map(s => `<div class="task-dropdown-item ${window._taskDraft.subcategory===s?'active':''}" onclick="window._taskDraft.subcategory='${escapeHtml(s).replace(/'/g,"&#39;")}'; closeAllDropdowns(); renderTaskModal()">${escapeHtml(s)}</div>`).join('')}
    <div class="task-dropdown-divider"></div>
    <div style="padding:6px"><input type="text" class="task-dropdown-input" placeholder="+ Nueva subcategoría" id="newSubcatInput" onkeydown="if(event.key==='Enter') addNewSubcat()"></div>
  `;
  showDropdown(e.currentTarget, html);
  setTimeout(() => el('newSubcatInput')?.focus(), 50);
}

function addNewSubcat() {
  const v = el('newSubcatInput').value.trim();
  if (!v) return;
  const area = state.taskAreas.find(a => a.id === window._taskDraft.area);
  if (area) {
    area.subcategories = area.subcategories || [];
    if (!area.subcategories.includes(v)) area.subcategories.push(v);
  }
  window._taskDraft.subcategory = v;
  saveState();
  closeAllDropdowns();
  renderTaskModal();
}

function openDateDropdown(e) {
  e.stopPropagation();
  const dd = showDropdown(e.currentTarget, '<div id="taskCalendarMount"></div>');
  dd.style.minWidth = '280px';
  renderInlineCalendar('taskCalendarMount', window._taskDraft.date || today(), (d) => {
    window._taskDraft.date = d;
    closeAllDropdowns();
    renderTaskModal();
  });
}

function openRepeatDropdown(e) {
  e.stopPropagation();
  const cur = window._taskDraft.repeat?.type || 'none';
  const items = [
    { type:'none', label:'No repetir' },
    { type:'daily', label:'Todos los días' },
    { type:'weekdays', label:'Días hábiles (L-V)' },
    { type:'weekends', label:'Fines de semana' },
  ];
  const customDays = window._taskDraft.repeat?.days || [];
  const html = `
    ${items.map(i => `<div class="task-dropdown-item ${cur===i.type?'active':''}" onclick="setRepeat('${i.type}')">${i.label}${cur===i.type?' ✓':''}</div>`).join('')}
    <div class="task-dropdown-divider"></div>
    <div style="padding:6px 12px;font-size:11px;color:var(--text-3);font-weight:700;text-transform:uppercase">Días específicos</div>
    <div style="padding:0 8px 8px;display:flex;gap:4px;justify-content:space-between">
      ${WEEKDAY_SHORT.map((d,i) => `
        <button class="task-option-chip ${customDays.includes(i)?'active':''}" style="padding:6px 8px;min-width:32px;justify-content:center" onclick="toggleRepeatDay(${i})">${d}</button>
      `).join('')}
    </div>
  `;
  showDropdown(e.currentTarget, html);
}

function setRepeat(type) {
  window._taskDraft.repeat = { type, days: type === 'custom' ? (window._taskDraft.repeat?.days || []) : [] };
  closeAllDropdowns();
  renderTaskModal();
}

function toggleRepeatDay(d) {
  window._taskDraft.repeat = window._taskDraft.repeat || { type:'custom', days:[] };
  window._taskDraft.repeat.days = window._taskDraft.repeat.days || [];
  const idx = window._taskDraft.repeat.days.indexOf(d);
  if (idx >= 0) window._taskDraft.repeat.days.splice(idx, 1);
  else window._taskDraft.repeat.days.push(d);
  window._taskDraft.repeat.type = window._taskDraft.repeat.days.length ? 'custom' : 'none';
  renderTaskModal();
  // Reopen dropdown to keep selecting
  setTimeout(() => openRepeatDropdown({ stopPropagation:()=>{}, currentTarget: el('chip-repeat') }), 30);
}

function openTimeDropdown(e) {
  e.stopPropagation();
  const html = `
    <div style="padding:8px">
      <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:6px">Inicio</div>
      <input type="time" class="task-dropdown-input" id="taskStartTime" value="${window._taskDraft.startTime||''}">
      <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin:10px 0 6px">Fin</div>
      <input type="time" class="task-dropdown-input" id="taskEndTime" value="${window._taskDraft.endTime||''}">
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="task-option-chip" style="flex:1;justify-content:center" onclick="clearTime()">Sin horario</button>
        <button class="task-option-chip active" style="flex:1;justify-content:center" onclick="applyTime()">Aplicar</button>
      </div>
    </div>
  `;
  showDropdown(e.currentTarget, html);
}

function clearTime() { window._taskDraft.startTime=''; window._taskDraft.endTime=''; closeAllDropdowns(); renderTaskModal(); }
function applyTime() {
  window._taskDraft.startTime = el('taskStartTime').value || '';
  window._taskDraft.endTime = el('taskEndTime').value || '';
  closeAllDropdowns();
  renderTaskModal();
}

function openGoalDropdown(e) {
  e.stopPropagation();
  const goals = state.goals || [];
  const active = goals.filter(g => !g.done);
  const html = `
    <div class="task-dropdown-item ${!window._taskDraft.goalId?'active':''}" onclick="window._taskDraft.goalId=''; closeAllDropdowns(); renderTaskModal()">Sin meta</div>
    ${active.length ? '<div class="task-dropdown-divider"></div>' : ''}
    ${active.map(g => `<div class="task-dropdown-item ${window._taskDraft.goalId===g.id?'active':''}" onclick="window._taskDraft.goalId='${g.id}'; closeAllDropdowns(); renderTaskModal()">
      <span><span style="margin-right:6px">${g.icon||'🎯'}</span>${escapeHtml(g.title)}</span>
      ${window._taskDraft.goalId===g.id?'<span>✓</span>':''}
    </div>`).join('')}
    ${!active.length ? '<div style="padding:10px;font-size:12px;color:var(--text-3);text-align:center">No tienes metas activas. Crea una desde Metas.</div>' : ''}
  `;
  showDropdown(e.currentTarget, html);
}

function openPriorityDropdown(e) {
  e.stopPropagation();
  const opts = [
    { v:'normal', l:'Normal', dot:'#94A3B8' },
    { v:'important', l:'Importante', dot:'#F59E0B' },
    { v:'urgent', l:'Urgente', dot:'#EF4444' },
  ];
  const html = opts.map(o => `
    <div class="task-dropdown-item ${window._taskDraft.priority===o.v?'active':''}" onclick="window._taskDraft.priority='${o.v}'; closeAllDropdowns(); renderTaskModal()">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${o.dot};margin-right:8px;vertical-align:middle"></span>${o.l}</span>
      ${window._taskDraft.priority===o.v?'<span>✓</span>':''}
    </div>
  `).join('');
  showDropdown(e.currentTarget, html);
}

/* ─── INLINE CALENDAR ────────────────────────────────────── */
function renderInlineCalendar(mountId, selectedStr, onPick) {
  const mount = el(mountId);
  if (!mount) return;
  const view = new Date(selectedStr + 'T00:00');
  let viewYear = view.getFullYear(), viewMonth = view.getMonth();
  function draw() {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const startDow = first.getDay();
    const days = [];
    // prev month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      days.push({ d, other:true });
    }
    for (let i = 1; i <= last.getDate(); i++) days.push({ d:new Date(viewYear, viewMonth, i), other:false });
    while (days.length % 7 !== 0) {
      const d = new Date(viewYear, viewMonth + 1, days.length - last.getDate() - startDow + 1);
      days.push({ d, other:true });
    }
    const t = today();
    mount.innerHTML = `
      <div class="calendar-head">
        <button class="calendar-nav-btn" id="calPrev">‹</button>
        <h4 class="calendar-month-label">${MONTH_NAMES[viewMonth]} ${viewYear}</h4>
        <button class="calendar-nav-btn" id="calNext">›</button>
      </div>
      <div class="calendar-weekdays">
        ${['D','L','M','M','J','V','S'].map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
      </div>
      <div class="calendar-days">
        ${days.map(({d,other}) => {
          const s = d.toISOString().slice(0,10);
          const cls = ['calendar-day'];
          if (other) cls.push('other-month');
          if (s === t) cls.push('today');
          if (s === selectedStr) cls.push('selected');
          return `<div class="${cls.join(' ')}" data-d="${s}">${d.getDate()}</div>`;
        }).join('')}
      </div>
    `;
    mount.querySelector('#calPrev').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } draw(); };
    mount.querySelector('#calNext').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } draw(); };
    mount.querySelectorAll('.calendar-day').forEach(el => {
      el.onclick = () => {
        selectedStr = el.dataset.d;
        onPick(selectedStr);
      };
    });
  }
  draw();
}

/* ─── DATE TRIGGER POPUP (Overview) ──────────────────────── */
function openOverviewDatePopup() {
  const popup = el('calendarPopup');
  const trigger = el('overviewDateTrigger');
  if (!popup || !trigger) return;
  if (popup.style.display !== 'none') { popup.style.display = 'none'; return; }
  popup.style.display = 'block';
  popup.innerHTML = '<div id="overviewCalMount"></div>';
  const rect = trigger.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  popup.style.left = (rect.left + window.scrollX) + 'px';
  renderInlineCalendar('overviewCalMount', getSelectedDate(), (d) => {
    setSelectedDate(d);
    popup.style.display = 'none';
  });
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!popup.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
        popup.style.display = 'none';
        document.removeEventListener('click', close);
      }
    });
  }, 50);
}

/* ─── TASK AREAS (CREATE / EDIT) ─────────────────────────── */
function addTaskAreaModal() {
  openModal('+ Nueva área',`
    <div class="form-grid">
      <div class="field"><label>Nombre del área</label>
        <input id="f-area-name" class="input" placeholder="ej. Mente, Espiritualidad, Hobbies..."></div>
      <div class="field"><label>Ícono (emoji)</label>
        <input id="f-area-icon" class="input" placeholder="🎨" maxlength="4" value="📌"></div>
      <div class="field"><label>Color</label>
        <div class="color-picker" id="f-area-colors">
          ${['#EA580C','#F97316','#FCD34D','#F59E0B','#FB923C','#E11D48','#10B981','#059669','#92400E'].map((c,i) => `<div class="color-swatch ${i===0?'selected':''}" data-color="${c}" style="background:${c}" onclick="qsa('#f-area-colors .color-swatch').forEach(s=>s.classList.remove('selected'));this.classList.add('selected')"></div>`).join('')}
        </div>
      </div>
    </div>
  `, () => {
    const name = el('f-area-name').value.trim();
    if (!name) { alert('⚠️ Ponle un nombre al área'); return false; }
    const icon = el('f-area-icon').value.trim() || '📌';
    const color = qs('#f-area-colors .color-swatch.selected')?.dataset.color || '#EA580C';
    state.taskAreas = state.taskAreas || [];
    state.taskAreas.push({
      id: 'area_' + uid(),
      name, icon, color, subcategories: []
    });
    return true;
  });
}

function editTaskArea(areaId) {
  const a = state.taskAreas.find(x => x.id === areaId);
  if (!a) return;
  const isDefault = DEFAULT_TASK_AREAS.some(d => d.id === a.id);
  openModal('✏️ Editar área',`
    <div class="form-grid">
      <div class="field"><label>Nombre</label>
        <input id="f-edit-area-name" class="input" value="${escapeHtml(a.name)}"></div>
      <div class="field"><label>Ícono</label>
        <input id="f-edit-area-icon" class="input" value="${escapeHtml(a.icon||'📌')}" maxlength="4"></div>
      <div class="field"><label>Color</label>
        <div class="color-picker" id="f-edit-area-colors">
          ${['#EA580C','#F97316','#FCD34D','#F59E0B','#FB923C','#E11D48','#10B981','#059669','#92400E'].map(c => `<div class="color-swatch ${a.color===c?'selected':''}" data-color="${c}" style="background:${c}" onclick="qsa('#f-edit-area-colors .color-swatch').forEach(s=>s.classList.remove('selected'));this.classList.add('selected')"></div>`).join('')}
        </div>
      </div>
      <div class="field"><label>Subcategorías (separadas por coma)</label>
        <input id="f-edit-area-subs" class="input" value="${escapeHtml((a.subcategories||[]).join(', '))}"></div>
      ${!isDefault ? `<button class="btn btn-danger" onclick="deleteTaskArea('${a.id}')">🗑 Eliminar área</button>` : '<div class="help-text">Esta es un área por defecto y no se puede eliminar (pero puedes renombrarla).</div>'}
    </div>
  `, () => {
    a.name = el('f-edit-area-name').value.trim() || a.name;
    a.icon = el('f-edit-area-icon').value.trim() || a.icon;
    a.color = qs('#f-edit-area-colors .color-swatch.selected')?.dataset.color || a.color;
    a.subcategories = el('f-edit-area-subs').value.split(',').map(s => s.trim()).filter(Boolean);
    return true;
  });
}

function deleteTaskArea(areaId) {
  if (!confirm('¿Eliminar esta área? Las tareas dentro también se eliminarán.')) return;
  state.taskAreas = state.taskAreas.filter(a => a.id !== areaId);
  state.unifiedTasks = state.unifiedTasks.filter(t => t.area !== areaId);
  saveState();
  closeModal();
  renderOverview();
}

function renderFinanceTrendChart() {
  const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now=new Date(); const labels=[]; const incData=[]; const expData=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    labels.push(months[d.getMonth()]);
    incData.push(state.finance.income.filter(x=>x.date?.startsWith(m)).reduce((s,x)=>s+Number(x.amount||0),0));
    expData.push(state.finance.expenses.filter(x=>x.date?.startsWith(m)).reduce((s,x)=>s+Number(x.amount||0),0));
  }
  lineChart('chartFinanceTrend',labels,[
    {label:'Ingresos',data:incData,borderColor:'#10B981',backgroundColor:'#10B98120',fill:true},
    {label:'Gastos',data:expData,borderColor:'#EF4444',backgroundColor:'#EF444420',fill:true},
  ]);
}

function renderExpenseCategoryChart() {
  const cats={}; state.finance.expenses.forEach(e=>{cats[e.category||'Otros']=(cats[e.category||'Otros']||0)+Number(e.amount||0);});
  doughnutChart('chartExpenseCategory',Object.keys(cats),Object.values(cats),AREA_COLORS);
}

function renderHabitsWeekChart() {
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});
  const labels=days.map(d=>new Date(d+'T00:00').toLocaleDateString('es-ES',{weekday:'short'}));
  const data=days.map(d=>state.health.habits.filter(h=>h.log?.[d]).length);
  barChart('chartHabitsWeek',labels,[{label:'Hábitos completados',data,backgroundColor:'#10B98180',borderColor:'#10B981',borderWidth:2}]);
}

function renderCommitmentsPanel() {
  const active=state.commitments.filter(c=>!c.done);
  const t=today();
  el('commitmentsPanel').innerHTML = active.length
    ? active.map(c=>`<div class="commitment-card ${c.deadline&&c.deadline<t?'broken':''}">
        <div class="row between">
          <div><div style="font-weight:600;font-size:13px">${c.title}</div>${c.deadline?`<div class="text-xs text-muted" style="margin-top:3px">Vence: ${fmt(c.deadline)}</div>`:''}</div>
          <div class="row gap-sm">
            ${c.deadline&&c.deadline<t?pill('#EF4444','VENCIDO'):''}
            <button class="btn btn-secondary btn-sm" onclick="completeCommitment('${c.id}')">✓ Cumplido</button>
          </div>
        </div>
      </div>`).join('')
    : empty('🤝','Sin compromisos activos');
}

function togglePriority(dateKey,idx,done){
  if(state.time.priorities[dateKey]) state.time.priorities[dateKey][idx].done=done;
  saveState();
}

function completeCommitment(id){
  const c=state.commitments.find(x=>x.id===id);
  if(c){c.done=true;c.completedAt=today();}
  saveState();renderPage(currentPage);updateAlertDots();
}

/* ─── BUSINESS ───────────────────────────────────────────── */
function renderBusiness() {
  renderBusinessGroupedPanel('businessSyncedTasks');
}

// Filter helper kept (used by other pages — Goals filter chips, etc.)
function setFilter(key,val){state.filters[key]=val;saveState();}
// Legacy helpers kept as no-ops so any stray inline onclick doesn't crash
function deleteArea(id){if(!confirm('¿Eliminar esta área?'))return;state.customAreas=state.customAreas.filter(a=>a.id!==id);saveState();renderPage(currentPage);}

/* ─── HEALTH ─────────────────────────────────────────────── */
function renderHealth() {
  renderSyncedTasksPanel('health', 'healthSyncedTasks');
  const t=today();
  const avgSleep=state.health.sleep.slice(-7).reduce((s,x)=>s+Number(x.value||0),0)/Math.max(1,Math.min(7,state.health.sleep.length));
  const lastWeight=state.health.weight.slice(-1)[0]?.value||'—';
  const habitsDone=state.health.habits.filter(h=>h.log?.[t]).length;

  el('healthKpis').innerHTML=[
    kpiCard('Hábitos hoy',`${habitsDone}/${state.health.habits.length}`,'🔥','var(--success)'),
    kpiCard('Sueño promedio',`${avgSleep.toFixed(1)}h`,'😴','var(--purple)','Últimos 7 días'),
    kpiCard('Peso actual',lastWeight!=='—'?`${lastWeight} kg`:'—','⚖️','var(--teal)'),
    kpiCard('Mood hoy',moodTodayDisplay(),'💭','var(--pink)'),
  ].join('');

  // Routines
  el('morningRoutine').innerHTML=routineHTML('morning');
  el('eveningRoutine').innerHTML=routineHTML('evening');

  // Mood tracker
  renderMoodTracker();

  // Habits
  el('habitsList').innerHTML=habitsHTML();

  // Charts
  renderMetricChart('chartWeight',state.health.weight,'⚖️ Peso','#6366F1');
  renderMetricChart('chartSleep',state.health.sleep,'😴 Sueño (h)','#A855F7');
  renderMetricChart('chartExercise',state.health.exercise,'💪 Ejercicio (min)','#10B981');
  renderMetricChart('chartWater',state.health.water,'💧 Agua (vasos)','#06B6D4');
  renderMoodChart();
}

function moodTodayDisplay(){
  const m=state.moodLog.find(x=>x.date===today());
  return m?['','😞','😕','😐','🙂','😄'][m.mood]||'—':'Sin registro';
}

function routineHTML(type) {
  const items=state.routines[type]||[];
  if(!items.length) return empty('📋','Sin ítems — agrega pasos a tu rutina');
  const t=today();
  return items.map((item,i)=>`<div class="routine-item ${item.doneDate===t?'done':''}">
    <input type="checkbox" ${item.doneDate===t?'checked':''} onchange="toggleRoutine('${type}',${i},this.checked)">
    <span class="routine-text" style="${item.doneDate===t?'text-decoration:line-through;color:var(--text-3)':''}">${item.text}</span>
    <button class="icon-btn danger" onclick="deleteRoutine('${type}',${i})">✕</button>
  </div>`).join('');
}

function toggleRoutine(type,idx,done){
  state.routines[type][idx].doneDate=done?today():'';
  saveState();renderPage('health');
}
function deleteRoutine(type,idx){state.routines[type].splice(idx,1);saveState();renderPage('health');}

function renderMoodTracker() {
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});
  const emojis=['','😞','😕','😐','🙂','😄'];
  el('moodTracker').innerHTML=`<div class="mood-track">${days.map(d=>{
    const entry=state.moodLog.find(m=>m.date===d);
    const isToday=d===today();
    return `<div class="mood-day" style="${isToday?'border-color:var(--primary);border-width:2px':''}" onclick="${isToday?'openMoodModal()':''}">
      <span class="mood-emoji">${entry?emojis[entry.mood]||'—':'➕'}</span>
      <div class="mood-score">${entry?`${entry.mood}/5`:'—'}</div>
      <div class="mood-date">${new Date(d+'T00:00').toLocaleDateString('es-ES',{weekday:'short'})}</div>
    </div>`;
  }).join('')}</div>`;
}

function habitsHTML() {
  const habits=state.health.habits;
  if(!habits.length) return empty('🔥','Agrega tu primer hábito');
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>Hábito</th>${days.map(d=>`<th style="text-align:center">${new Date(d+'T00:00').toLocaleDateString('es-ES',{weekday:'short'})}</th>`).join('')}<th>Racha</th><th></th></tr></thead>
    <tbody>${habits.map(h=>`<tr>
      <td style="font-weight:600">${h.name}</td>
      ${days.map(d=>`<td style="text-align:center"><div class="habit-day ${h.log?.[d]?'done':''} ${d===today()?'today':''}" onclick="toggleHabit('${h.id}','${d}')" style="width:28px;height:28px;border-radius:7px;cursor:pointer;display:inline-grid;place-items:center;${h.log?.[d]?'':'background:var(--surface-3);border:1px solid var(--border)'}">
        ${h.log?.[d]?'✓':''}</div></td>`).join('')}
      <td>${streakBadge(h)}</td>
      <td><button class="icon-btn danger" onclick="deleteHabit('${h.id}')">✕</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function streakBadge(h) {
  let s=0,d=new Date();
  while(h.log?.[d.toISOString().slice(0,10)]){s++;d.setDate(d.getDate()-1);}
  return s?`<span class="streak-badge">🔥 ${s} días</span>`:'<span class="streak-badge cold">Sin racha</span>';
}

function toggleHabit(id,dateKey){
  const h=state.health.habits.find(x=>x.id===id);if(!h)return;
  if(!h.log)h.log={};h.log[dateKey]=!h.log[dateKey];
  saveState();renderPage('health');
}
function deleteHabit(id){state.health.habits=state.health.habits.filter(h=>h.id!==id);saveState();renderPage('health');}

function renderMetricChart(canvasId,data,label,color) {
  const d=data.slice(-14);
  if(!d.length){destroyChart(canvasId);return;}
  lineChart(canvasId,d.map(x=>fmt(x.date)),[{label,data:d.map(x=>x.value),borderColor:color,backgroundColor:color+'20',fill:true}]);
}
function renderMoodChart() {
  const d=state.moodLog.slice(-14);if(!d.length)return;
  lineChart('chartMood',d.map(x=>fmt(x.date)),[
    {label:'Ánimo',data:d.map(x=>x.mood||0),borderColor:'#6366F1'},
    {label:'Energía',data:d.map(x=>x.energy||0),borderColor:'#F59E0B'},
  ],{scales:{y:{min:0,max:5}}});
}

/* ─── FAMILY ─────────────────────────────────────────────── */
function renderFamily() {
  renderFamilyGroupedPanel('familySyncedTasks');
  renderMemoriesByMonth('memoriesList');
}

/* ─── FAMILY GROUPED PANEL (personas como subcategorías) ─── */
function renderFamilyGroupedPanel(mountId) {
  const mount = el(mountId);
  if (!mount) return;
  const area = (state.taskAreas||[]).find(a => a.id === 'family');
  if (!area) { mount.innerHTML = ''; return; }
  const people = area.subcategories || [];
  const d = getSelectedDate();

  const allTasks = state.unifiedTasks
    .filter(t => t.area === 'family' && taskRunsOnDate(t, d))
    .sort((a,b) => {
      const dA = isTaskDone(a, d) ? 1 : 0;
      const dB = isTaskDone(b, d) ? 1 : 0;
      if (dA !== dB) return dA - dB;
      const pri = { urgent:0, important:1, normal:2 };
      return (pri[a.priority]||2) - (pri[b.priority]||2);
    });

  const groups = [
    { id:'__general', name:'General', tasks: allTasks.filter(t => !t.subcategory) },
    ...people.map(p => ({ id:p, name:p, tasks: allTasks.filter(t => t.subcategory === p) })),
  ];
  groups.forEach(g => {
    g.done = g.tasks.filter(t => isTaskDone(t, d)).length;
    g.total = g.tasks.length;
  });

  mount.innerHTML = `
    <div class="biz-panel-head">
      <h2 class="biz-panel-title">❤️ Mi familia</h2>
      <div class="row gap-sm" style="align-items:center">
        <div class="synced-tasks-date-nav">
          <button onclick="shiftSelectedDate(-1)" title="Día anterior">‹</button>
          <span class="date-text">${formatSelectedDateLabel(d)}</span>
          <button onclick="shiftSelectedDate(1)" title="Día siguiente">›</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="addFamilyPerson()">+ Agregar persona</button>
      </div>
    </div>
    <div class="businesses-grid">
      ${groups.map(g => {
        const safeId = String(g.id).replace(/'/g,"\\'");
        const initial = g.name && g.name !== 'General' ? g.name[0].toUpperCase() : '👨‍👩‍👧';
        return `<div class="business-card">
          <div class="business-card-head">
            <div class="business-card-title">
              <span class="family-avatar">${initial}</span> ${escapeHtml(g.name)}
              <span class="pill-count">${g.done}/${g.total}</span>
            </div>
            <div style="display:flex;gap:4px">
              ${g.id !== '__general' ? `<button class="btn-area-menu" title="Renombrar / Eliminar" onclick="editFamilyPerson('${safeId}')">⋯</button>` : ''}
              <button class="btn-icon-add" title="Agregar tarea" onclick="openTaskModalForPerson('${safeId}')">+</button>
            </div>
          </div>
          <div class="business-card-tasks">
            ${g.tasks.length ? g.tasks.map(t => renderTaskRow(t, d, {hideSubcat:true})).join('') : '<div class="area-empty">Sin tareas. Toca + para agregar.</div>'}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function openTaskModalForPerson(personName) {
  openTaskModal(null, 'family');
  if (personName && personName !== '__general') {
    setTimeout(() => {
      if (window._taskDraft) {
        window._taskDraft.subcategory = personName;
        renderTaskModal();
      }
    }, 50);
  }
}

function addFamilyPerson() {
  const name = prompt('Nombre de la persona (o el nombre que quieras darle):');
  if (!name || !name.trim()) return;
  const area = state.taskAreas.find(a => a.id === 'family');
  area.subcategories = area.subcategories || [];
  const trimmed = name.trim();
  if (area.subcategories.includes(trimmed)) {
    alert('Ya existe una persona con ese nombre');
    return;
  }
  area.subcategories.push(trimmed);
  saveState();
  renderPage(currentPage);
}

function editFamilyPerson(name) {
  const choice = prompt(
    `Persona: "${name}"\n\n` +
    `• Escribe un nuevo nombre para renombrar\n` +
    `• Escribe "eliminar" para borrarla (las tareas pasan a General)\n` +
    `• Deja vacío para cancelar`,
    name
  );
  if (choice === null) return;
  const action = choice.trim();
  if (!action || action === name) return;
  const area = state.taskAreas.find(a => a.id === 'family');
  if (action.toLowerCase() === 'eliminar') {
    if (!confirm(`¿Eliminar a "${name}"? Sus tareas pasan a General.`)) return;
    area.subcategories = area.subcategories.filter(s => s !== name);
    state.unifiedTasks.forEach(t => { if (t.area === 'family' && t.subcategory === name) t.subcategory = ''; });
  } else {
    if (area.subcategories.includes(action)) { alert('Ya existe una persona con ese nombre'); return; }
    area.subcategories = area.subcategories.map(s => s === name ? action : s);
    state.unifiedTasks.forEach(t => { if (t.area === 'family' && t.subcategory === name) t.subcategory = action; });
  }
  saveState();
  renderPage(currentPage);
}

/* ─── MEMORIES BY MONTH ──────────────────────────────────── */
const MEMORY_MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function renderMemoriesByMonth(mountId) {
  const mount = el(mountId);
  if (!mount) return;
  const mems = (state.family.memories||[]).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
  if (!mems.length) { mount.innerHTML = empty('✨','Sin momentos guardados. Toca "+ Momento" para agregar el primero.'); return; }

  // Group by year-month
  const groups = {};
  mems.forEach(m => {
    if (!m.date) return;
    const key = m.date.slice(0,7);  // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  const sortedKeys = Object.keys(groups).sort().reverse();
  state.memoryOpenMonths = state.memoryOpenMonths || {};
  // Open the most recent month by default if no preference
  if (sortedKeys.length && Object.keys(state.memoryOpenMonths).length === 0) {
    state.memoryOpenMonths[sortedKeys[0]] = true;
  }

  mount.innerHTML = sortedKeys.map(key => {
    const [year, month] = key.split('-');
    const monthLabel = `${MEMORY_MONTH_NAMES[Number(month)-1]} ${year}`;
    const items = groups[key];
    const isOpen = !!state.memoryOpenMonths[key];
    return `
      <div class="memory-month ${isOpen?'open':''}">
        <button class="memory-month-head" onclick="toggleMemoryMonth('${key}')">
          <div class="row gap-sm" style="align-items:center">
            <span class="memory-month-chevron">▸</span>
            <span class="memory-month-title">${monthLabel}</span>
          </div>
          <span class="memory-month-count">${items.length} ${items.length===1?'momento':'momentos'}</span>
        </button>
        <div class="memory-month-body" ${isOpen?'':'style="display:none"'}>
          ${items.map(m => `
            <div class="memory-card">
              <div class="memory-card-head">
                <div>
                  <div class="memory-card-date">${fmt(m.date)}</div>
                  <div class="memory-card-title">${m.emoji||'💝'} ${escapeHtml(m.title||'')}</div>
                </div>
                <button class="icon-btn danger" onclick="deleteMemory('${m.id}')" title="Eliminar">✕</button>
              </div>
              ${m.note||m.description ? `<div class="memory-card-desc">${escapeHtml(m.note||m.description||'')}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleMemoryMonth(key) {
  state.memoryOpenMonths = state.memoryOpenMonths || {};
  state.memoryOpenMonths[key] = !state.memoryOpenMonths[key];
  renderMemoriesByMonth('memoriesList');
}

function deleteMemory(id){
  if (!confirm('¿Eliminar este momento?')) return;
  state.family.memories=state.family.memories.filter(m=>m.id!==id);
  saveState();
  renderPage('family');
}

/* ─── FINANCE ────────────────────────────────────────────── */
function renderFinance() {
  const income=state.finance.income.reduce((s,i)=>s+Number(i.amount||0),0);
  const exp=state.finance.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const balance=income-exp;

  el('financeKpis').innerHTML=[
    kpiCard('Ingresos totales','$'+income.toLocaleString(),'💵','var(--success)'),
    kpiCard('Gastos totales','$'+exp.toLocaleString(),'💸','var(--danger)'),
    kpiCard('Balance','$'+Math.abs(balance).toLocaleString(),balance>=0?'📈':'📉',balance>=0?'var(--success)':'var(--danger)',balance>=0?'Superávit':'Déficit'),
    kpiCard('Categorías presupuesto',state.finance.budget.length,'🎯','var(--purple)'),
  ].join('');

  el('budgetList').innerHTML=state.finance.budget.length
    ?state.finance.budget.map(b=>{
      const spent=state.finance.expenses.filter(e=>e.category===b.category).reduce((s,e)=>s+Number(e.amount||0),0);
      const pct=b.limit>0?Math.min(100,(spent/b.limit)*100):0;
      const color=pct>=100?'#EF4444':pct>=80?'#F97316':'var(--success)';
      return `<div style="padding:14px 0;border-bottom:1px solid var(--border)">
        <div class="row between" style="margin-bottom:8px">
          <span style="font-weight:600">${b.category}</span>
          <span class="text-sm">${pct>=100?'<span style="color:#EF4444;font-weight:700">⚠ EXCEDIDO </span>':pct>=80?'<span style="color:#F97316;font-weight:700">⚠ 80%+ </span>':''}$${Math.round(spent).toLocaleString()} / $${Number(b.limit).toLocaleString()}</span>
        </div>
        ${bar(pct,color,10)}
        <div class="text-xs text-muted" style="margin-top:4px">${Math.round(pct)}% usado</div>
      </div>`;}).join('')
    :empty('📊','Agrega categorías de presupuesto');

  el('incomeTable').innerHTML=state.finance.income.slice(-10).length?`<table>
    <thead><tr><th>Fuente</th><th>Monto</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${state.finance.income.slice(-10).reverse().map(i=>`<tr>
      <td style="font-weight:500">${i.source}</td>
      <td style="color:var(--success);font-weight:600">$${Number(i.amount).toLocaleString()}</td>
      <td class="text-sm text-muted">${fmt(i.date)}</td>
      <td><button class="icon-btn danger" onclick="deleteIncome('${i.id}')">✕</button></td></tr>`).join('')}
    </tbody></table>`:empty('💵','Sin ingresos registrados');

  el('expenseTable').innerHTML=state.finance.expenses.slice(-10).length?`<table>
    <thead><tr><th>Descripción</th><th>Categoría</th><th>Monto</th><th></th></tr></thead>
    <tbody>${state.finance.expenses.slice(-10).reverse().map(e=>`<tr>
      <td style="font-weight:500">${e.description}</td>
      <td>${pill('#64748B',e.category||'—')}</td>
      <td style="color:var(--danger);font-weight:600">$${Number(e.amount).toLocaleString()}</td>
      <td><button class="icon-btn danger" onclick="deleteExpense('${e.id}')">✕</button></td></tr>`).join('')}
    </tbody></table>`:empty('💸','Sin gastos registrados');

  renderFinanceTrendChart();
  const cats={};state.finance.expenses.forEach(e=>{cats[e.category||'Otros']=(cats[e.category||'Otros']||0)+Number(e.amount||0);});
  doughnutChart('chartFinanceCategory',Object.keys(cats),Object.values(cats),AREA_COLORS);
  doughnutChart('chartFinanceMonthly',['Ingresos','Gastos'],[income,exp],['#10B981','#EF4444']);
}

function deleteIncome(id){state.finance.income=state.finance.income.filter(i=>i.id!==id);saveState();renderPage('finance');}
function deleteExpense(id){state.finance.expenses=state.finance.expenses.filter(e=>e.id!==id);saveState();renderPage('finance');updateAlertDots();}

/* ─── GOALS ──────────────────────────────────────────────── */
function renderGoals() {
  const areas=state.customAreas;
  const t=today();
  const fa=state.filters.goalArea;

  el('goalsKpis').innerHTML=[
    kpiCard('Total metas',state.goals.length,'🎯','var(--primary)'),
    kpiCard('Completadas',state.goals.filter(g=>g.done).length,'✅','var(--success)'),
    kpiCard('En progreso',state.goals.filter(g=>!g.done).length,'🚀','var(--orange)'),
    kpiCard('OKR promedio',state.goals.length?(state.goals.reduce((s,g)=>s+(g.okr||0),0)/state.goals.length).toFixed(2):'—','⭐','var(--purple)','Score 0.0–1.0'),
  ].join('');

  el('goalsAreas').innerHTML=areas.length
    ?`<div class="areas-grid">${areas.map(a=>{
        const gc=state.goals.filter(g=>g.area===a.id).length;
        const done=state.goals.filter(g=>g.area===a.id&&g.done).length;
        return `<div class="area-card" style="border-left-color:${a.color}">
          <div style="font-weight:700;color:${a.color}">${a.name}</div>
          <div class="text-xs text-muted" style="margin-top:3px">${a.vision||'Sin visión'}</div>
          <div style="margin-top:10px">${bar(gc>0?(done/gc)*100:0,a.color,8)}</div>
          <div class="row gap-sm" style="margin-top:6px">${pill(a.color,`${done}/${gc} metas`)}</div>
        </div>`;
      }).join('')}</div>`
    :empty('🗂️','Agrega áreas para organizar tus metas');

  // Filter chips
  el('goalAreaFilter').innerHTML=`
    <span class="chip ${fa==='all'?'active':''}" onclick="setFilter('goalArea','all');renderGoals()">Todas</span>
    ${areas.map(a=>`<span class="chip ${fa===a.id?'active':''}" style="${fa===a.id?`background:${a.color};border-color:${a.color}`:''}" onclick="setFilter('goalArea','${a.id}');renderGoals()">${a.name}</span>`).join('')}
    <span class="chip ${fa==='done'?'active':''}" onclick="setFilter('goalArea','done');renderGoals()">✅ Completadas</span>`;

  let goals=fa==='done'?state.goals.filter(g=>g.done):fa==='all'?state.goals:state.goals.filter(g=>g.area===fa);

  el('goalsList').innerHTML=goals.length
    ?goals.map(g=>{
      const pct=g.target>0?Math.min(100,(g.current/g.target)*100):0;
      const okrColor=g.okr>=0.7?'var(--success)':g.okr>=0.4?'var(--orange)':'var(--danger)';
      const area=state.customAreas.find(a=>a.id===g.area);
      const daysLeft=g.dueDate?Math.ceil((new Date(g.dueDate)-new Date())/86400000):null;
      return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${area?area.color:'var(--primary)'}">
        <div class="row between" style="margin-bottom:12px">
          <div style="flex:1">
            <div class="row gap-sm" style="flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:700;font-size:15px">${g.title}</span>
              ${area?pill(area.color,area.name):''}
              ${g.done?pill('var(--success)','✓ Completada'):''}
            </div>
            ${g.description?`<div class="text-xs text-muted">${g.description}</div>`:''}
          </div>
          <div class="row gap-sm">
            ${daysLeft!==null?`<span class="text-xs ${daysLeft<0?'text-danger':daysLeft<7?'text-warning':'text-muted'}">${daysLeft<0?`${Math.abs(daysLeft)}d vencida`:daysLeft===0?'Hoy vence':`${daysLeft}d`}</span>`:''}
            <button class="btn btn-secondary btn-sm" onclick="openGoalDetail('${g.id}')" title="Ver tareas y consistencia">📊</button>
            <button class="btn btn-secondary btn-sm" onclick="editGoalProgress('${g.id}')">📝</button>
            <button class="icon-btn danger" onclick="deleteGoal('${g.id}')">✕</button>
          </div>
        </div>
        <div class="row" style="gap:20px;align-items:center">
          <div style="flex:1">
            ${bar(pct,area?area.color:'var(--primary)',10)}
            <div class="row between" style="margin-top:4px"><span class="text-xs text-muted">${g.current||0} / ${g.target||0} ${g.unit||''}</span><span class="text-xs text-muted">${Math.round(pct)}%</span></div>
          </div>
          <div style="text-align:center;min-width:90px">
            <div class="text-xs text-muted">OKR Score</div>
            <div style="font-size:1.5rem;font-weight:800;color:${okrColor}">${(g.okr||0).toFixed(1)}</div>
            <input type="range" min="0" max="1" step="0.1" value="${g.okr||0}" style="width:80px"
              oninput="updateOKR('${g.id}',this.value);this.previousElementSibling.textContent=Number(this.value).toFixed(1);this.previousElementSibling.style.color='${okrColor}'">
            <div class="text-xs text-muted">${g.okr>=0.7?'🟢 On track':g.okr>=0.4?'🟡 Riesgo':'🔴 Off track'}</div>
          </div>
        </div>
      </div>`;}).join('')
    :empty('🎯','Agrega tu primera meta');
}

function updateOKR(id,val){const g=state.goals.find(x=>x.id===id);if(g){g.okr=Number(val);saveState();}}
function deleteGoal(id){state.goals=state.goals.filter(g=>g.id!==id);saveState();renderPage('goals');updateAlertDots();}

/* ─── GOAL DETAIL (linked tasks + consistency) ───────────── */
function computeTaskStats(task) {
  // Returns { completedDays, totalDays, consistencyPct, totalMinutes }
  const today_ = today();
  const log = task.completionLog || {};
  const completedDays = Object.values(log).filter(Boolean).length;

  // Determine "active days" — how many days since the task could first appear
  let startDate = task.date || task.createdAt || today_;
  let totalDays = 0;
  if (task.repeat && task.repeat.type !== 'none') {
    const start = new Date(startDate + 'T00:00');
    const end = new Date(today_ + 'T00:00');
    let d = new Date(start);
    while (d <= end) {
      const s = d.toISOString().slice(0,10);
      if (taskRunsOnDate(task, s)) totalDays++;
      d.setDate(d.getDate() + 1);
    }
  } else {
    totalDays = 1;
  }

  const consistencyPct = totalDays > 0 ? Math.round((completedDays/totalDays)*100) : 0;

  // Time per completion = endTime - startTime in minutes (if set)
  let minutesPerCompletion = 0;
  if (task.startTime && task.endTime) {
    const [sh,sm] = task.startTime.split(':').map(Number);
    const [eh,em] = task.endTime.split(':').map(Number);
    minutesPerCompletion = (eh*60+em) - (sh*60+sm);
    if (minutesPerCompletion < 0) minutesPerCompletion = 0;
  }
  const totalMinutes = minutesPerCompletion * completedDays + (task.done && !task.repeat?.type !== 'none' ? minutesPerCompletion : 0);

  return { completedDays, totalDays, consistencyPct, totalMinutes, minutesPerCompletion };
}

function formatMinutes(m) {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
}

function openGoalDetail(goalId) {
  const g = state.goals.find(x => x.id === goalId);
  if (!g) return;
  const linked = state.unifiedTasks.filter(t => t.goalId === goalId);
  const pct = g.target > 0 ? Math.min(100, Math.round((g.current/g.target)*100)) : 0;

  // Aggregate stats
  const aggMinutes = linked.reduce((s,t) => s + computeTaskStats(t).totalMinutes, 0);
  const avgConsistency = linked.length
    ? Math.round(linked.reduce((s,t) => s + computeTaskStats(t).consistencyPct, 0) / linked.length)
    : 0;

  const body = `
    <div style="background:var(--primary-soft);padding:14px;border-radius:10px;margin-bottom:14px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--primary-2);font-weight:700;margin-bottom:4px">META</div>
      <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:6px">${g.icon||'🎯'} ${escapeHtml(g.title)}</div>
      ${g.description ? `<div style="font-size:13px;color:var(--text-2);margin-bottom:8px">${escapeHtml(g.description)}</div>` : ''}
      ${bar(pct, 'var(--primary)', 8)}
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--text-2)">
        <span>${g.current||0} / ${g.target||0} ${g.unit||''}</span>
        <span><strong>${pct}%</strong> completado</span>
      </div>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="kpi" style="padding:12px"><div class="kpi-label" style="font-size:11px">Tareas vinculadas</div><div class="kpi-value" style="font-size:20px">${linked.length}</div></div>
      <div class="kpi success" style="padding:12px"><div class="kpi-label" style="font-size:11px">Consistencia promedio</div><div class="kpi-value" style="font-size:20px">${avgConsistency}%</div></div>
      <div class="kpi purple" style="padding:12px"><div class="kpi-label" style="font-size:11px">Tiempo total invertido</div><div class="kpi-value" style="font-size:20px">${formatMinutes(aggMinutes)}</div></div>
    </div>

    <h4 style="font-size:13px;font-weight:800;margin-bottom:10px;font-family:'Plus Jakarta Sans',sans-serif">📋 Tareas vinculadas</h4>
    ${linked.length ? `
      <table style="width:100%;font-size:12.5px">
        <thead><tr>
          <th style="text-align:left">Tarea</th>
          <th style="text-align:center">Cumplidas</th>
          <th style="text-align:center">Posibles</th>
          <th style="text-align:center">Consistencia</th>
          <th style="text-align:right">Tiempo</th>
        </tr></thead>
        <tbody>
          ${linked.map(t => {
            const s = computeTaskStats(t);
            const repIcon = (t.repeat && t.repeat.type !== 'none') ? '🔁' : '⏱';
            const color = s.consistencyPct >= 70 ? 'var(--success-2)' : s.consistencyPct >= 40 ? 'var(--warning)' : 'var(--danger)';
            return `<tr>
              <td><span style="margin-right:6px">${repIcon}</span><strong>${escapeHtml(t.title)}</strong>${t.repeat?.type !== 'none' ? `<br><span class="text-xs text-muted">${REPEAT_LABELS[t.repeat.type]||''}</span>` : ''}</td>
              <td style="text-align:center;font-weight:700;color:var(--success-2)">${s.completedDays}</td>
              <td style="text-align:center;color:var(--text-3)">${s.totalDays}</td>
              <td style="text-align:center">
                <div style="display:inline-block;min-width:60px">
                  ${bar(s.consistencyPct, color, 6)}
                  <div style="font-size:11px;font-weight:700;color:${color};margin-top:2px">${s.consistencyPct}%</div>
                </div>
              </td>
              <td style="text-align:right;font-weight:600">${formatMinutes(s.totalMinutes)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : `<div class="list-empty"><span class="big-emoji">🔗</span>Sin tareas vinculadas a esta meta.<br><span class="text-xs text-muted">Crea una tarea desde Resumen y enlázala a esta meta con el chip 🎯.</span></div>`}
  `;
  openModal('📊 Detalle de meta', body, () => true);
}

/* ─── TIME ───────────────────────────────────────────────── */
function renderTime() {
  const t=today(),blocks=state.time.blocks;
  const totalH=blocks.reduce((s,b)=>s+Number(b.hours||0),0);
  const highH=blocks.filter(b=>b.leverage==='high').reduce((s,b)=>s+Number(b.hours||0),0);
  el('todayLabel').textContent=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});

  el('timeKpis').innerHTML=[
    kpiCard('Bloques de tiempo',blocks.length,'⏱️','var(--primary)'),
    kpiCard('Horas alto impacto',`${highH}h`,'🚀','var(--success)',totalH>0?`${Math.round(highH/totalH*100)}% del total`:''),
    kpiCard('Sesiones Pomodoro hoy',todayPomodoros(),'🍅','var(--orange)'),
    kpiCard('Prioridades hoy',(state.time.priorities[t]||[]).length,'⭐','var(--purple)',`${(state.time.priorities[t]||[]).filter(p=>p.done).length} completadas`),
  ].join('');

  // Priorities
  const prios=state.time.priorities[t]||[];
  el('todayPrioritiesList').innerHTML=prios.length
    ?prios.map((p,i)=>`<div class="priority-item ${p.done?'done':''}">
        <div class="priority-rank">${i+1}</div>
        <input type="checkbox" ${p.done?'checked':''} onchange="togglePriority('${t}',${i},this.checked)">
        <span class="priority-text">${p.text}</span>
        <button class="icon-btn danger" onclick="deletePriority('${t}',${i})">✕</button>
      </div>`).join('')
    :empty('⭐','Sin prioridades para hoy');

  // Pomodoro
  el('pomodoroSection').innerHTML=pomodoroPageHTML();

  // 80/20
  el('analysis8020').innerHTML=`
    <div class="leverage-row high"><span style="font-size:18px">🚀</span><div style="flex:1"><strong>Alto apalancamiento</strong><div class="text-xs text-muted">${highH}h — Máximo impacto en tus resultados</div></div></div>
    ${blocks.filter(b=>b.leverage==='high').map(b=>`<div style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:13px;display:flex;gap:8px"><strong>${b.activity}</strong> — ${b.hours}h ${b.area?pill(areaColor(b.area),areaName(b.area)):''}</div>`).join('')||`<div class="text-xs text-muted" style="padding:8px 12px">Sin actividades de alto impacto</div>`}
    <div class="leverage-row low" style="margin-top:12px"><span style="font-size:18px">⬇️</span><div style="flex:1"><strong>Bajo apalancamiento</strong><div class="text-xs text-muted">Considera delegar, automatizar o eliminar</div></div></div>
    ${blocks.filter(b=>b.leverage==='low').map(b=>`<div style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:13px"><strong>${b.activity}</strong> — ${b.hours}h</div>`).join('')||`<div class="text-xs text-muted" style="padding:8px 12px">Sin actividades de bajo impacto</div>`}`;

  // Blocks table
  el('timeBlocksTable').innerHTML=blocks.length?`<table>
    <thead><tr><th>Actividad</th><th>Área</th><th>Horas/sem</th><th>Apalancamiento</th><th></th></tr></thead>
    <tbody>${blocks.map(b=>{
      const levColor={high:'var(--success)',low:'var(--danger)',neutral:'var(--text-3)'}[b.leverage]||'inherit';
      const levLabel={high:'✅ Alto',low:'❌ Bajo',neutral:'➡ Neutral'}[b.leverage]||'—';
      return `<tr><td style="font-weight:500">${b.activity}</td>
        <td>${b.area?pill(areaColor(b.area),areaName(b.area)):'—'}</td>
        <td style="font-weight:600">${b.hours}h</td>
        <td style="color:${levColor};font-weight:600;font-size:12px">${levLabel}</td>
        <td><button class="icon-btn danger" onclick="deleteBlock('${b.id}')">✕</button></td></tr>`;}).join('')}
    </tbody></table>`
    :empty('📦','Sin bloques registrados');

  // Chart
  const areaMap={};blocks.forEach(b=>{const k=b.area?areaName(b.area):'Sin área';areaMap[k]=(areaMap[k]||0)+Number(b.hours||0);});
  doughnutChart('chartTimeCategory',Object.keys(areaMap),Object.values(areaMap),AREA_COLORS);
}

function deletePriority(dateKey,idx){state.time.priorities[dateKey]?.splice(idx,1);saveState();renderPage('time');}
function deleteBlock(id){state.time.blocks=state.time.blocks.filter(b=>b.id!==id);saveState();renderPage('time');}

/* ═══════════════════════════════════════════════════════════
   EJERCICIO MODULE
   ═══════════════════════════════════════════════════════════ */
const EX_DAYS = [
  { v:'lunes',     l:'Lunes' },
  { v:'martes',    l:'Martes' },
  { v:'miercoles', l:'Miércoles' },
  { v:'jueves',    l:'Jueves' },
  { v:'viernes',   l:'Viernes' },
  { v:'sabado',    l:'Sábado' },
  { v:'domingo',   l:'Domingo' },
  { v:'diario',    l:'Diario' },
];
const EX_TYPE_LABEL = { strength:'Fuerza', cardio:'Cardio', sport:'Deporte' };
const EX_TYPE_ICON = { strength:'💪', cardio:'🏃', sport:'⚽' };
const JS_DAY_TO_KEY = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];

function todayDayKey() { return JS_DAY_TO_KEY[new Date().getDay()]; }

function renderEjercicio() {
  if (!state.exercise) state.exercise = { exercises:[], sessions:[] };
  renderExerciseStreak();
  renderExerciseRoutine();
  renderExerciseHistory();
  renderExerciseHeatmap();
}

function renderExerciseStreak() {
  const sessions = state.exercise.sessions || [];
  const t = today();
  // Streak: count consecutive days ending today/yesterday with a completed session
  let streak = 0;
  let cur = new Date(t + 'T00:00');
  while (true) {
    const s = cur.toISOString().slice(0,10);
    if (sessions.some(x => x.date === s && x.endedAt)) { streak++; cur.setDate(cur.getDate()-1); }
    else break;
  }
  const wrap = el('exerciseStreakWrap');
  if (!wrap) return;
  wrap.innerHTML = streak > 0
    ? `<div style="display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;font-size:13px;box-shadow:0 4px 12px rgba(16,185,129,.3)">🔥 ${streak} ${streak===1?'día':'días'} seguidos</div>`
    : '';
}

function renderHeatmapGrid(mountId, byDateCount, tooltipFormatter) {
  // Generic consistency heatmap: shared between Exercise and Learning.
  // byDateCount: { 'YYYY-MM-DD': count }
  const mount = el(mountId);
  if (!mount) return;

  const todayDate = new Date(today() + 'T00:00');
  // Start: first day of current month (skip earlier months — no April for May etc)
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const yearEnd = new Date(todayDate.getFullYear(), 11, 31);

  // Step back to previous Monday for grid start
  const startDate = new Date(monthStart);
  while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() - 1);
  // Step forward to next Sunday after Dec 31
  const endDate = new Date(yearEnd);
  while (endDate.getDay() !== 0) endDate.setDate(endDate.getDate() + 1);

  // Build weeks (Mon→Sun)
  const weeks = [];
  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate()+1); }
    weeks.push(week);
  }

  // Month labels — only label months >= currentMonth, and avoid duplicates
  const MONTH_ABBR = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const currentMonthIdx = todayDate.getMonth();
  const monthLabels = new Array(weeks.length).fill('');
  let labeledMonths = new Set();
  weeks.forEach((week, wi) => {
    // Pick a day in this week whose month is >= currentMonth (prefer Thursday or later)
    let monthToLabel = -1;
    for (let i = 6; i >= 0; i--) {
      const m = week[i].getMonth();
      if (m >= currentMonthIdx && m <= 11) { monthToLabel = m; break; }
    }
    if (monthToLabel >= 0 && !labeledMonths.has(monthToLabel)) {
      monthLabels[wi] = MONTH_ABBR[monthToLabel];
      labeledMonths.add(monthToLabel);
    }
  });

  const DAYS_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const todayStr = today();

  // Single CSS grid with rows [month-labels, day1...day7] and columns [day-label-col, week-col1, week-col2, ...]
  const colTemplate = `38px repeat(${weeks.length}, 14px)`;
  let html = `<div class="heatmap-wrap"><div class="heatmap-grid-v2" style="grid-template-columns:${colTemplate}">`;

  // Row 0: empty corner + month labels
  html += '<div></div>';
  weeks.forEach((_, wi) => {
    html += `<div class="heatmap-month-cell">${monthLabels[wi]}</div>`;
  });

  // Rows 1-7: day label + 7 cells (one per week)
  for (let day = 0; day < 7; day++) {
    html += `<div class="heatmap-day-label-v2">${DAYS_LABELS[day]}</div>`;
    weeks.forEach(week => {
      const d = week[day];
      const ds = d.toISOString().slice(0,10);
      const future = d > todayDate;
      const count = byDateCount[ds] || 0;
      const cls = ['heatmap-cell'];
      if (future) cls.push('future');
      if (ds === todayStr) cls.push('today');
      if (count > 0) cls.push('done');
      if (count > 1) cls.push('intense');
      const tooltip = tooltipFormatter ? tooltipFormatter(d, count, future)
        : `${d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}${count?' — '+count:''}`;
      html += `<div class="${cls.join(' ')}" title="${tooltip}"></div>`;
    });
  }

  html += '</div>'; // close grid

  // Legend
  html += `<div class="heatmap-legend">
    <span>Menos</span>
    <div class="heatmap-legend-cell"></div>
    <div class="heatmap-legend-cell done" style="opacity:.6"></div>
    <div class="heatmap-legend-cell done"></div>
    <span>Más</span>
    <span style="margin-left:auto">Verde = día completado</span>
  </div>`;
  html += '</div>'; // close wrap

  mount.innerHTML = html;
}

function renderExerciseHeatmap() {
  const sessions = state.exercise.sessions || [];
  const byDate = {};
  sessions.filter(s => s.endedAt).forEach(s => { byDate[s.date] = (byDate[s.date]||0) + 1; });
  renderHeatmapGrid('exerciseHeatmap', byDate, (d, count, future) =>
    future ? d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})
           : `${d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})} — ${count?count+' sesión'+(count>1?'es':''):'sin sesión'}`
  );
}

function renderExerciseRoutine() {
  const mount = el('exerciseRoutine');
  if (!mount) return;
  const exs = state.exercise.exercises || [];
  if (!exs.length) { mount.innerHTML = empty('🏋','Sin ejercicios en tu rutina. Toca "+ Ejercicio" para empezar.'); return; }

  const todayK = todayDayKey();
  const html = EX_DAYS.map(d => {
    const list = exs.filter(e => e.day === d.v);
    if (!list.length) return '';
    const isToday = d.v === todayK || d.v === 'diario';
    return `<div class="ex-day-group">
      <div class="ex-day-head">
        <div class="ex-day-title">
          <span>📅</span> ${d.l}
          <span class="ex-day-count">${list.length} ${list.length===1?'ejercicio':'ejercicios'}</span>
          ${isToday ? '<span class="ex-day-count" style="background:var(--success-soft);color:var(--success-2)">HOY</span>' : ''}
        </div>
        <div class="ex-day-actions">
          <button class="ex-play-btn" onclick="startWorkoutSession('${d.v}')">▶ Empezar</button>
        </div>
      </div>
      <div class="ex-day-body">
        ${list.map(ex => `
          <div class="ex-item">
            <div class="ex-item-info">
              <div class="ex-item-name">${EX_TYPE_ICON[ex.type]||'💪'} ${escapeHtml(ex.name)}</div>
              <div class="ex-item-meta">
                <span class="ex-type-pill ${ex.type}">${EX_TYPE_LABEL[ex.type]||'Fuerza'}</span>
                ${ex.type === 'strength'
                  ? `${ex.setCount||3} series × ${ex.targetReps||10} reps${ex.targetWeight?' · '+ex.targetWeight+'kg':''}`
                  : `${ex.targetDuration||20} min${ex.targetDistance?' · '+ex.targetDistance+'km':''}`}
              </div>
            </div>
            <div class="row gap-sm">
              <button class="icon-btn primary" onclick="editExerciseModal('${ex.id}')" title="Editar">✏</button>
              <button class="icon-btn danger" onclick="deleteExercise('${ex.id}')" title="Eliminar">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
  mount.innerHTML = html || empty('🏋','Agrega tu primer ejercicio.');
}

function renderExerciseHistory() {
  const mount = el('exerciseHistory');
  if (!mount) return;
  const sessions = (state.exercise.sessions || []).filter(s => s.endedAt).slice().sort((a,b) => (b.startedAt||'').localeCompare(a.startedAt||'')).slice(0, 20);
  if (!sessions.length) { mount.innerHTML = empty('📋','Sin sesiones completadas aún. ¡Pulsa ▶ Empezar para tu primera!'); return; }
  mount.innerHTML = sessions.map(s => {
    const dayLabel = EX_DAYS.find(d => d.v === s.day)?.l || s.day;
    const totalSets = (s.entries||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0);
    const totalEx = (s.entries||[]).filter(e => e.done || (e.sets||[]).some(x=>x.done)).length;
    const dur = s.endedAt && s.startedAt ? Math.round((new Date(s.endedAt) - new Date(s.startedAt))/60000) : 0;
    return `<div class="hist-row">
      <div><div class="hist-day">${dayLabel}</div><div class="hist-date">${fmt(s.date)}</div></div>
      <div><strong>${totalEx}</strong> <span class="text-xs text-muted">ejercicios</span></div>
      <div><strong>${totalSets}</strong> <span class="text-xs text-muted">series · ${dur}min</span></div>
      <button class="icon-btn danger" onclick="deleteWorkoutSession('${s.id}')">✕</button>
    </div>`;
  }).join('');
}

function deleteWorkoutSession(id) {
  if (!confirm('¿Eliminar esta sesión del historial?')) return;
  state.exercise.sessions = state.exercise.sessions.filter(s => s.id !== id);
  saveState();
  renderEjercicio();
}

/* ─── EXERCISE: ADD / EDIT ───────────────────────────────── */
function addExerciseModal(prefill = null) {
  const ex = prefill || { id:uid(), name:'', day:todayDayKey(), type:'strength', setCount:3, targetReps:10, targetWeight:0, targetDuration:20, targetDistance:0, notes:'' };
  const isEdit = !!prefill;
  openModal(isEdit ? '✏ Editar ejercicio' : '🏋 Nuevo ejercicio', `
    <div class="form-grid">
      <div class="field"><label>Nombre del ejercicio</label>
        <input id="f-ex-name" class="input" value="${escapeHtml(ex.name||'')}" placeholder="ej. Press banca, Bici, Fútbol..."></div>
      <div class="form-row">
        <div class="field"><label>Día</label>
          <select id="f-ex-day" class="input">
            ${EX_DAYS.map(d => `<option value="${d.v}" ${ex.day===d.v?'selected':''}>${d.l}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Tipo</label>
          <select id="f-ex-type" class="input" onchange="toggleExerciseFields(this.value)">
            <option value="strength" ${ex.type==='strength'?'selected':''}>💪 Fuerza</option>
            <option value="cardio" ${ex.type==='cardio'?'selected':''}>🏃 Cardio</option>
            <option value="sport" ${ex.type==='sport'?'selected':''}>⚽ Deporte</option>
          </select>
        </div>
      </div>
      <div id="ex-strength-fields" style="${ex.type==='strength'?'':'display:none'}">
        <div class="form-row-3">
          <div class="field"><label>Series</label><input id="f-ex-sets" type="number" class="input" min="1" value="${ex.setCount||3}"></div>
          <div class="field"><label>Reps por serie</label><input id="f-ex-reps" type="number" class="input" min="1" value="${ex.targetReps||10}"></div>
          <div class="field"><label>Peso meta (kg)</label><input id="f-ex-weight" type="number" step="0.5" class="input" value="${ex.targetWeight||0}"></div>
        </div>
      </div>
      <div id="ex-cardio-fields" style="${ex.type!=='strength'?'':'display:none'}">
        <div class="form-row">
          <div class="field"><label>Duración (min)</label><input id="f-ex-duration" type="number" class="input" min="1" value="${ex.targetDuration||20}"></div>
          <div class="field"><label>Distancia meta (km, opcional)</label><input id="f-ex-distance" type="number" step="0.1" class="input" value="${ex.targetDistance||0}"></div>
        </div>
      </div>
      <div class="field"><label>Notas (opcional)</label><textarea id="f-ex-notes" class="input" rows="2" placeholder="Detalles, técnica, observaciones...">${escapeHtml(ex.notes||'')}</textarea></div>
    </div>
  `, () => {
    const name = el('f-ex-name').value.trim();
    if (!name) { alert('⚠️ Ponle un nombre al ejercicio'); return false; }
    const merged = {
      id: ex.id,
      name,
      day: el('f-ex-day').value,
      type: el('f-ex-type').value,
      setCount: Number(el('f-ex-sets').value) || 3,
      targetReps: Number(el('f-ex-reps').value) || 10,
      targetWeight: Number(el('f-ex-weight').value) || 0,
      targetDuration: Number(el('f-ex-duration').value) || 20,
      targetDistance: Number(el('f-ex-distance').value) || 0,
      notes: el('f-ex-notes').value,
    };
    const idx = state.exercise.exercises.findIndex(x => x.id === merged.id);
    if (idx >= 0) state.exercise.exercises[idx] = merged;
    else state.exercise.exercises.push(merged);
    return true;
  });
}

function toggleExerciseFields(type) {
  el('ex-strength-fields').style.display = type === 'strength' ? '' : 'none';
  el('ex-cardio-fields').style.display = type !== 'strength' ? '' : 'none';
}

function editExerciseModal(id) {
  const ex = state.exercise.exercises.find(x => x.id === id);
  if (ex) addExerciseModal(ex);
}

function deleteExercise(id) {
  if (!confirm('¿Eliminar este ejercicio de tu rutina?')) return;
  state.exercise.exercises = state.exercise.exercises.filter(x => x.id !== id);
  saveState();
  renderEjercicio();
}

/* ─── ACTIVE WORKOUT SESSION ─────────────────────────────── */
let _workoutTimerInterval = null;
window._activeSession = null;

function startWorkoutSession(day) {
  const t = today();
  const exs = state.exercise.exercises.filter(e => e.day === day || e.day === 'diario');
  if (!exs.length) { alert('No tienes ejercicios para este día. Agrega algunos primero.'); return; }
  // Look up an existing active session for this date+day
  let session = (state.exercise.sessions || []).find(s => s.date === t && s.day === day && !s.endedAt);
  if (!session) {
    session = {
      id: uid(),
      date: t,
      day,
      startedAt: new Date().toISOString(),
      endedAt: null,
      entries: exs.map(e => ({
        exerciseId: e.id,
        // for strength: pre-fill from previous session or defaults
        sets: e.type === 'strength'
          ? Array.from({length: e.setCount || 3}, () => ({ weight: e.targetWeight||0, reps: e.targetReps||10, done:false }))
          : [],
        duration: e.type !== 'strength' ? 0 : null,
        distance: e.type === 'cardio' ? 0 : null,
        done: false,
      })),
    };
    state.exercise.sessions.push(session);
    saveState();
  }
  window._activeSession = session;
  openWorkoutModal();
}

function openWorkoutModal() {
  _onSave = null;
  el('modal').classList.add('active');
  el('modal').classList.add('workout-modal');
  renderWorkoutSession();
  // Start timer
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
}

function closeWorkoutModal() {
  el('modal').classList.remove('active');
  el('modal').classList.remove('workout-modal');
  if (_workoutTimerInterval) { clearInterval(_workoutTimerInterval); _workoutTimerInterval = null; }
  window._activeSession = null;
}

function updateWorkoutTimer() {
  const s = window._activeSession;
  if (!s || !s.startedAt) return;
  const ms = Date.now() - new Date(s.startedAt).getTime();
  const m = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const tEl = el('workoutTimer');
  if (tEl) tEl.textContent = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function renderWorkoutSession() {
  const s = window._activeSession;
  if (!s) return;
  const dayLabel = EX_DAYS.find(d => d.v === s.day)?.l || s.day;
  const exsById = Object.fromEntries(state.exercise.exercises.map(e => [e.id, e]));
  const totalSets = s.entries.reduce((a,e)=>a+(e.sets||[]).length,0);
  const doneSets = s.entries.reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0);

  el('modalBody').innerHTML = `
    <div class="workout-head">
      <div>
        <div class="workout-head-title">${dayLabel}</div>
        <div class="workout-head-meta">${doneSets} de ${totalSets} series · ${s.entries.length} ${s.entries.length===1?'ejercicio':'ejercicios'}</div>
      </div>
      <div class="workout-timer"><span class="pulse-dot"></span><span id="workoutTimer">00:00</span></div>
    </div>
    <div class="workout-body">
      ${s.entries.map((entry, ei) => {
        const ex = exsById[entry.exerciseId];
        if (!ex) return '';
        const isStrength = ex.type === 'strength';
        return `<div class="workout-exercise">
          <div class="workout-exercise-head">
            <div>
              <div class="workout-exercise-title">${EX_TYPE_ICON[ex.type]||'💪'} ${escapeHtml(ex.name)}</div>
              <div class="workout-exercise-sub">${isStrength
                ? `${entry.sets.length} series · meta ${ex.targetReps} reps`
                : `meta ${ex.targetDuration} min${ex.targetDistance?' · '+ex.targetDistance+'km':''}`}</div>
            </div>
          </div>
          ${isStrength
            ? entry.sets.map((set, si) => `
                <div class="set-row ${set.done?'done':''}">
                  <button class="set-check ${set.done?'checked':''}" onclick="toggleWorkoutSet(${ei}, ${si})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <span class="set-label">Serie ${si+1}</span>
                  <input type="number" step="0.5" class="set-input" value="${set.weight||0}" onchange="updateWorkoutSet(${ei}, ${si}, 'weight', this.value)">
                  <span class="set-unit">kg</span>
                  <span class="set-times">×</span>
                  <input type="number" class="set-input" value="${set.reps||0}" onchange="updateWorkoutSet(${ei}, ${si}, 'reps', this.value)">
                  <span class="set-unit">reps</span>
                  <button class="icon-btn danger" onclick="removeWorkoutSet(${ei}, ${si})" style="margin-left:auto">✕</button>
                </div>
              `).join('') + `
              <button class="workout-add-set" onclick="addWorkoutSet(${ei})">+ Agregar serie</button>
              `
            : `
              <div class="set-row ${entry.done?'done':''}">
                <button class="set-check ${entry.done?'checked':''}" onclick="toggleWorkoutCardio(${ei})">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <span class="set-label">${ex.type==='cardio'?'Sesión':'Práctica'}</span>
                ${ex.type==='cardio' ? `
                  <input type="number" step="0.1" class="set-input" value="${entry.distance||0}" onchange="updateWorkoutCardio(${ei}, 'distance', this.value)">
                  <span class="set-unit">km</span>
                  <span class="set-times">·</span>
                ` : ''}
                <input type="number" class="set-input" value="${entry.duration||0}" onchange="updateWorkoutCardio(${ei}, 'duration', this.value)">
                <span class="set-unit">min</span>
              </div>
            `
          }
        </div>`;
      }).join('')}
    </div>
    <div class="workout-foot">
      <button class="btn btn-secondary" onclick="closeWorkoutModal()">Pausar (continuar después)</button>
      <button class="btn btn-success" onclick="finishWorkoutSession()">✓ Terminar sesión</button>
    </div>
  `;
}

function toggleWorkoutSet(ei, si) {
  const s = window._activeSession; if (!s) return;
  const set = s.entries[ei].sets[si];
  set.done = !set.done;
  saveState();
  renderWorkoutSession();
}

function updateWorkoutSet(ei, si, key, val) {
  const s = window._activeSession; if (!s) return;
  s.entries[ei].sets[si][key] = Number(val) || 0;
  saveState();
}

function addWorkoutSet(ei) {
  const s = window._activeSession; if (!s) return;
  const sets = s.entries[ei].sets;
  const last = sets[sets.length-1] || { weight:0, reps:10 };
  sets.push({ weight:last.weight, reps:last.reps, done:false });
  saveState();
  renderWorkoutSession();
}

function removeWorkoutSet(ei, si) {
  const s = window._activeSession; if (!s) return;
  s.entries[ei].sets.splice(si, 1);
  saveState();
  renderWorkoutSession();
}

function toggleWorkoutCardio(ei) {
  const s = window._activeSession; if (!s) return;
  s.entries[ei].done = !s.entries[ei].done;
  saveState();
  renderWorkoutSession();
}

function updateWorkoutCardio(ei, key, val) {
  const s = window._activeSession; if (!s) return;
  s.entries[ei][key] = Number(val) || 0;
  saveState();
}

function finishWorkoutSession() {
  const s = window._activeSession; if (!s) return;
  s.endedAt = new Date().toISOString();
  saveState();
  closeWorkoutModal();
  renderEjercicio();
  setTimeout(() => alert('✅ ¡Sesión completada! Buen trabajo.'), 200);
}

/* ─── LEARNING ───────────────────────────────────────────── */
function renderLearning() {
  renderSyncedTasksPanel('learning', 'learningSyncedTasks');
  const books=state.learning.books;
  el('learningKpis').innerHTML=[
    kpiCard('Libros leídos',books.filter(b=>b.status==='done').length,'📚','var(--primary)'),
    kpiCard('Leyendo ahora',books.filter(b=>b.status==='reading').length,'📖','var(--teal)'),
    kpiCard('Cursos activos',state.learning.courses.filter(c=>c.progress<100).length,'🎓','var(--purple)'),
    kpiCard('Aprendizajes',state.learning.keyLearnings.length,'💡','var(--orange)'),
  ].join('');

  const fa=state.filters.bookStatus;
  el('bookFilter').innerHTML=`
    ${['all','want','reading','done'].map((s,i)=>{
      const labels=['Todos','Por leer','Leyendo','Leídos'];
      return `<span class="chip ${fa===s?'active':''}" onclick="setFilter('bookStatus','${s}');renderLearning()">${labels[i]}</span>`;
    }).join('')}`;

  const filtered=fa==='all'?books:books.filter(b=>b.status===fa);
  el('booksList').innerHTML=filtered.length
    ?filtered.map(b=>`<div class="book-card">
        <div class="book-spine" style="background:${{'want':'var(--surface-3)','reading':'var(--primary-soft)','done':'var(--success-soft)'}[b.status]||'var(--surface-3)'}">
          ${b.status==='reading'?'📖':b.status==='done'?'✅':'📚'}
        </div>
        <div class="book-info">
          <div class="book-title">${b.title}</div>
          <div class="book-author">${b.author||''}</div>
          ${b.status==='reading'?`${bar(b.progress||0,'var(--primary)',6)}<div class="text-xs text-muted" style="margin-top:2px">${b.progress||0}%</div>`:''}
          <div class="row gap-sm" style="margin-top:8px">
            ${b.status!=='reading'?`<button class="btn btn-secondary btn-sm" onclick="moveBook('${b.id}','reading')">📖 Leer</button>`:''}
            ${b.status!=='done'?`<button class="btn btn-secondary btn-sm" onclick="moveBook('${b.id}','done')">✅ Leído</button>`:''}
            <button class="icon-btn danger" onclick="deleteBook('${b.id}')">✕</button>
          </div>
        </div>
      </div>`).join('')
    :empty('📚','Sin libros en esta categoría');

  el('coursesList').innerHTML=state.learning.courses.length
    ?state.learning.courses.map(c=>`<div style="padding:12px 0;border-bottom:1px solid var(--border)">
        <div class="row between" style="margin-bottom:6px"><span style="font-weight:600;font-size:13px">${c.name}</span>${c.platform?pill('#64748B',c.platform):''}</div>
        ${bar(c.progress||0,'var(--purple)',8)}
        <div class="row between" style="margin-top:4px">
          <span class="text-xs text-muted">${c.progress||0}% completado</span>
          <input type="range" min="0" max="100" value="${c.progress||0}" style="width:100px" onchange="updateCourse('${c.id}',this.value)">
          <button class="icon-btn danger" onclick="deleteCourse('${c.id}')">✕</button>
        </div>
      </div>`).join('')
    :empty('🎓','Sin cursos registrados');

  el('keyLearningsList').innerHTML=state.learning.keyLearnings.length
    ?state.learning.keyLearnings.map((l,i)=>`<div style="padding:12px 0;border-bottom:1px solid var(--border)">
        <div class="row between"><span class="text-xs text-muted">${fmt(l.date)}${l.source?` · ${l.source}`:''}</span><button class="icon-btn danger" onclick="deleteLearning(${i})">✕</button></div>
        <div style="font-size:13px;margin-top:4px">💡 ${l.text}</div>
      </div>`).join('')
    :empty('💡','Captura tus aprendizajes clave');

  el('notodoList').innerHTML=state.learning.notToDo.length
    ?state.learning.notToDo.map((n,i)=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="color:var(--danger);font-size:16px">✗</span>
        <span style="flex:1;font-size:13px">${n.text}</span>
        <button class="icon-btn danger" onclick="deleteNotToDo(${i})">✕</button>
      </div>`).join('')
    :empty('🚫','Agrega tus reglas de no-hacer');
}

function moveBook(id,status){const b=state.learning.books.find(x=>x.id===id);if(b){b.status=status;if(status==='done')b.progress=100;}saveState();renderPage('learning');}
function deleteBook(id){state.learning.books=state.learning.books.filter(b=>b.id!==id);saveState();renderPage('learning');}
function updateCourse(id,val){const c=state.learning.courses.find(x=>x.id===id);if(c)c.progress=Number(val);saveState();}
function deleteCourse(id){state.learning.courses=state.learning.courses.filter(c=>c.id!==id);saveState();renderPage('learning');}
function deleteLearning(i){state.learning.keyLearnings.splice(i,1);saveState();renderPage('learning');}
function deleteNotToDo(i){state.learning.notToDo.splice(i,1);saveState();renderPage('learning');}

/* ─── INBOX ──────────────────────────────────────────────── */
function renderInbox() {
  const pending=state.inbox.filter(i=>!i.processed);
  const done=state.inbox.filter(i=>i.processed).length;

  el('inboxKpis').innerHTML=[
    kpiCard('Por procesar',pending.length,'📥','var(--orange)'),
    kpiCard('Procesados',done,'✅','var(--success)'),
    kpiCard('Total capturado',state.inbox.length,'📋','var(--primary)'),
  ].join('');

  el('inboxList').innerHTML=pending.length
    ?pending.map(i=>`<div class="inbox-item">
        <div style="flex:1">
          <div class="inbox-text">${i.text}</div>
          <div class="inbox-date" style="margin-top:4px">${fmt(i.date)}</div>
          <div class="process-btns">
            <button class="process-btn" onclick="processInbox('${i.id}','task')">→ Tarea</button>
            <button class="process-btn" onclick="processInbox('${i.id}','goal')">→ Meta</button>
            <button class="process-btn" onclick="processInbox('${i.id}','someday')">→ Algún día</button>
            <button class="process-btn" onclick="processInbox('${i.id}','delete')" style="color:var(--danger)">✗ Eliminar</button>
          </div>
        </div>
      </div>`).join('')
    :empty('📥','Inbox vacío — ¡excelente trabajo!');

  // Wire capture button
  const btn=el('btnCapture');
  if(btn){btn.onclick=captureInbox;}
  const txt=el('inboxCapture');
  if(txt){txt.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')captureInbox();};}

  // Clear processed
  el('btnClearProcessed').onclick=()=>{
    if(!confirm('¿Limpiar todos los ítems procesados?'))return;
    state.inbox=state.inbox.filter(i=>!i.processed);saveState();renderPage('inbox');
  };
}

function captureInbox(){
  const txt=el('inboxCapture'),text=txt?.value.trim();if(!text)return;
  state.inbox.unshift({id:uid(),text,date:today(),processed:false});
  txt.value='';saveState();renderPage('inbox');
}

function processInbox(id,action){
  const item=state.inbox.find(i=>i.id===id);if(!item)return;
  if(action==='delete'){state.inbox=state.inbox.filter(i=>i.id!==id);}
  else{
    item.processed=true;item.processedAs=action;
    if(action==='task') state.business.tasks.push({id:uid(),title:item.text,area:'',priority:'medium',dueDate:'',recurring:false,done:false,createdAt:today()});
    else if(action==='goal') state.goals.push({id:uid(),title:item.text,description:'',area:'',target:100,current:0,unit:'',dueDate:'',startDate:today(),okr:0,done:false});
  }
  saveState();renderPage('inbox');
}

/* ─── WEEKLY REVIEW ──────────────────────────────────────── */
function renderWeekly() {
  const week=isoWeek();
  el('weekLabel').textContent=week;

  // Scores per area
  el('weekScores').innerHTML=`
    <div class="score-slider"><label>Semana general</label><input type="range" id="score-overall" min="1" max="10" value="${state.weeklyReviews[week]?.score||5}" oninput="el('val-overall').textContent=this.value"><span class="score-val" id="val-overall">${state.weeklyReviews[week]?.score||5}</span></div>
    ${state.customAreas.map(a=>`<div class="score-slider"><label style="color:${a.color}">${a.name}</label>
      <input type="range" id="score-${a.id}" min="1" max="10" value="${state.weeklyReviews[week]?.scores?.[a.id]||5}"
        oninput="el('val-${a.id}').textContent=this.value;updateAvgScore()">
      <span class="score-val" id="val-${a.id}">${state.weeklyReviews[week]?.scores?.[a.id]||5}</span></div>`).join('')}`;

  // Pre-fill text fields
  const rv=state.weeklyReviews[week]||{};
  ['wins','challenges','lessons','next'].forEach(k=>{
    const f=qs(`[name="rv_${k}"]`);if(f)f.value=rv[k]||'';
  });

  updateAvgScore();
  renderWeeklyHistory();
  renderWeeklyChart();
}

function updateAvgScore(){
  const scores=[el('score-overall')?.value,...state.customAreas.map(a=>el(`score-${a.id}`)?.value)].filter(Boolean).map(Number);
  const avg=scores.length?scores.reduce((s,x)=>s+x,0)/scores.length:0;
  if(el('avgScore'))el('avgScore').textContent=avg.toFixed(1);
}

function saveWeeklyReview(){
  const week=isoWeek();
  const scores={};
  state.customAreas.forEach(a=>{const inp=el(`score-${a.id}`);if(inp)scores[a.id]=Number(inp.value);});
  state.weeklyReviews[week]={
    wins:qs('[name="rv_wins"]')?.value||'',
    challenges:qs('[name="rv_challenges"]')?.value||'',
    lessons:qs('[name="rv_lessons"]')?.value||'',
    next:qs('[name="rv_next"]')?.value||'',
    score:Number(el('score-overall')?.value||5),
    scores,savedAt:new Date().toISOString()
  };
  saveState();
  renderWeeklyHistory();renderWeeklyChart();
  // Visual feedback
  const btn=el('btnSaveReview');if(btn){btn.textContent='✅ Guardado';setTimeout(()=>btn.textContent='💾 Guardar revisión',2000);}
}

function renderWeeklyHistory(){
  const weeks=Object.keys(state.weeklyReviews).sort().slice(-8).reverse();
  el('reviewHistory').innerHTML=weeks.length
    ?weeks.map(w=>{
      const r=state.weeklyReviews[w]||{};
      const sc=Number(r.score||0);
      const color=sc>=8?'var(--success)':sc>=5?'var(--orange)':'var(--danger)';
      return `<div class="review-history-item">
        <div class="row between"><span style="font-weight:600;font-size:13px">${w}</span>
          <span style="font-size:1.4rem;font-weight:800;color:${color}">${sc}/10</span></div>
        ${r.wins?`<div class="text-xs text-muted" style="margin-top:4px">🏆 ${r.wins.slice(0,80)}${r.wins.length>80?'...':''}</div>`:''}
      </div>`;}).join('')
    :empty('📋','Sin historial aún');
}

function renderWeeklyChart(){
  const weeks=Object.keys(state.weeklyReviews).sort().slice(-8);
  if(!weeks.length)return;
  lineChart('chartWeeklyScores',weeks,[
    {label:'Puntuación',data:weeks.map(w=>state.weeklyReviews[w]?.score||0),borderColor:'#6366F1',backgroundColor:'#6366F120',fill:true},
  ],{scales:{y:{min:0,max:10}}});
}

/* ─── POMODORO ───────────────────────────────────────────── */
const POMO_DURATIONS={work:25*60,short:5*60,long:15*60};
let pomoState={running:false,remaining:POMO_DURATIONS.work,total:POMO_DURATIONS.work,mode:'work',count:0};
let pomoInterval=null;

function pomodoroPageHTML(){
  const m=String(Math.floor(pomoState.remaining/60)).padStart(2,'0');
  const s=String(pomoState.remaining%60).padStart(2,'0');
  const pct=((pomoState.total-pomoState.remaining)/pomoState.total)*100;
  const modeLabel={work:'🍅 Trabajo enfocado',short:'☕ Descanso corto',long:'🛋️ Descanso largo'}[pomoState.mode];
  return `<div style="text-align:center">
    <div style="width:130px;height:130px;border-radius:50%;background:conic-gradient(var(--primary) ${pct}%,var(--surface-3) 0%);display:grid;place-items:center;margin:0 auto 12px;box-shadow:0 0 0 8px var(--primary-soft)">
      <div style="width:106px;height:106px;background:var(--surface);border-radius:50%;display:grid;place-items:center">
        <span style="font-size:1.6rem;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif">${m}:${s}</span>
      </div>
    </div>
    <div class="text-sm text-muted" style="margin-bottom:12px">${modeLabel} · Sesión ${pomoState.count+1}</div>
    <div class="row" style="justify-content:center;gap:8px">
      <button class="pomo-btn ${pomoState.running?'pause':'play'}" onclick="${pomoState.running?'pausePomo()':'startPomo()'}">${pomoState.running?'⏸':'▶'}</button>
      <button class="pomo-btn stop" onclick="stopPomo()">⏹</button>
    </div>
    <div class="text-xs text-muted" style="margin-top:10px">Sesiones hoy: ${todayPomodoros()}</div>
  </div>`;
}

function startPomo(){
  if(pomoState.running)return;
  pomoState.running=true;
  pomoInterval=setInterval(()=>{
    pomoState.remaining--;
    updatePomoUI();
    if(pomoState.remaining<=0){clearInterval(pomoInterval);pomoState.running=false;onPomoComplete();}
  },1000);
  updatePomoUI();
}
function pausePomo(){clearInterval(pomoInterval);pomoState.running=false;updatePomoUI();}
function stopPomo(){clearInterval(pomoInterval);pomoState={...pomoState,running:false,remaining:POMO_DURATIONS.work,total:POMO_DURATIONS.work,mode:'work'};updatePomoUI();}
function onPomoComplete(){
  if(pomoState.mode==='work'){
    state.pomodoro.sessions.push({date:today(),at:new Date().toISOString()});saveState();
    pomoState.count++;
    const next=pomoState.count%4===0?'long':'short';
    pomoState.mode=next;pomoState.remaining=POMO_DURATIONS[next];pomoState.total=POMO_DURATIONS[next];
  } else {
    pomoState.mode='work';pomoState.remaining=POMO_DURATIONS.work;pomoState.total=POMO_DURATIONS.work;
  }
  updatePomoUI();
  if('Notification' in window && Notification.permission==='granted')
    new Notification(pomoState.mode==='work'?'⏰ ¡Descanso terminado!':'🍅 ¡Pomodoro completado!');
}
function todayPomodoros(){return state.pomodoro.sessions.filter(s=>s.date===today()).length;}

function updatePomoUI(){
  // Floating widget
  const m=String(Math.floor(pomoState.remaining/60)).padStart(2,'0');
  const s=String(pomoState.remaining%60).padStart(2,'0');
  const pct=((pomoState.total-pomoState.remaining)/pomoState.total)*100;
  if(el('pomoTime'))el('pomoTime').textContent=`${m}:${s}`;
  if(el('pomoRing'))el('pomoRing').style.cssText=`--pct:${pct}%`;
  if(el('pomoLabel'))el('pomoLabel').textContent={work:'Trabajo enfocado',short:'Descanso corto',long:'Descanso largo'}[pomoState.mode];
  if(el('pomoPlayBtn')){el('pomoPlayBtn').textContent=pomoState.running?'⏸':'▶';el('pomoPlayBtn').className=`pomo-btn ${pomoState.running?'pause':'play'}`;}
  // Page section
  if(el('pomodoroSection'))el('pomodoroSection').innerHTML=pomodoroPageHTML();
}

function togglePomo(){pomoState.running?pausePomo():startPomo();}

/* ─── DARK MODE ──────────────────────────────────────────── */
function applyDarkMode(){
  document.documentElement.setAttribute('data-theme',state.darkMode?'dark':'light');
  if(el('darkModeLabel'))el('darkModeLabel').textContent=state.darkMode?'Modo claro':'Modo oscuro';
  const icon=el('darkIcon');if(!icon)return;
  icon.innerHTML=state.darkMode
    ?'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    :'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

/* ─── SEARCH ─────────────────────────────────────────────── */
function openSearch(){
  el('searchModal').classList.add('active');
  el('searchInput').value='';el('searchInput').focus();
  el('searchResults').innerHTML='<div class="search-empty">Escribe para buscar en tu dashboard...</div>';
}
function closeSearch(){el('searchModal').classList.remove('active');}

function doSearch(q){
  if(!q.trim()){el('searchResults').innerHTML='<div class="search-empty">Escribe para buscar...</div>';return;}
  const lq=q.toLowerCase(),results=[];
  state.business.tasks.filter(t=>t.title.toLowerCase().includes(lq)).forEach(t=>results.push({icon:'✅',type:'Tarea',text:t.title,page:'business'}));
  state.goals.filter(g=>g.title.toLowerCase().includes(lq)).forEach(g=>results.push({icon:'🎯',type:'Meta',text:g.title,page:'goals'}));
  state.business.projects.filter(p=>p.name.toLowerCase().includes(lq)).forEach(p=>results.push({icon:'🚀',type:'Proyecto',text:p.name,page:'business'}));
  state.learning.books.filter(b=>b.title.toLowerCase().includes(lq)).forEach(b=>results.push({icon:'📚',type:'Libro',text:b.title,page:'learning'}));
  state.learning.keyLearnings.filter(l=>l.text.toLowerCase().includes(lq)).forEach(l=>results.push({icon:'💡',type:'Aprendizaje',text:l.text.slice(0,80),page:'learning'}));
  state.commitments.filter(c=>c.title.toLowerCase().includes(lq)).forEach(c=>results.push({icon:'🤝',type:'Compromiso',text:c.title,page:'overview'}));
  state.family.people.filter(p=>p.name.toLowerCase().includes(lq)).forEach(p=>results.push({icon:'👥',type:'Persona',text:p.name,page:'family'}));
  el('searchResults').innerHTML=results.length
    ?results.map(r=>`<div class="search-result" onclick="closeSearch();navigate('${r.page}')">
        <div class="search-result-icon" style="background:var(--surface-2)">${r.icon}</div>
        <div><div style="font-weight:600;font-size:13px">${r.text}</div><div class="search-result-type">${r.type}</div></div>
      </div>`).join('')
    :'<div class="search-empty">Sin resultados para "'+q+'"</div>';
}

/* ─── MODALS: QUICK ADD ──────────────────────────────────── */
function quickAdd(){
  const page=currentPage;
  const map={
    overview:()=>addCommitmentModal(),
    business:()=>addTaskModal(),
    health:()=>addHabitModal(),
    family:()=>addPersonModal(),
    finance:()=>addExpenseModal(),
    goals:()=>addGoalModal(),
    time:()=>addPriorityModal(),
    learning:()=>addBookModal(),
    nutrition:()=>addFoodModal(),
    inbox:()=>captureInbox(),
    weekly:()=>{},
  };
  (map[page]||addTaskModal)();
}

function addAreaModal(section){
  const swatches=AREA_COLORS.map((c,i)=>`<div class="color-swatch${i===0?' selected':''}" style="background:${c}" onclick="this.parentNode.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));this.classList.add('selected');el('f-area-color').value='${c}'"></div>`).join('');
  openModal('Nueva Área',`
    <div class="form-grid">
      <div class="field"><label>Nombre del área</label><input id="f-area-name" class="input" placeholder="ej. Proyecto Alpha"></div>
      <div class="field"><label>Color</label><div class="color-picker">${swatches}</div><input type="hidden" id="f-area-color" value="${AREA_COLORS[0]}"></div>
      <div class="field"><label>Visión / Objetivo</label><textarea id="f-area-vision" class="input" placeholder="¿Qué quieres lograr en esta área?"></textarea></div>
      ${section==='business'?`<div class="field"><label>Ingresos mensuales (para ROI)</label><input id="f-area-revenue" type="number" class="input" value="0"></div>`:''}
    </div>`,
    ()=>{
      const name=el('f-area-name').value.trim();if(!name)return false;
      state.customAreas.push({id:uid(),section,name,color:el('f-area-color').value,vision:el('f-area-vision').value.trim(),revenue:Number(el('f-area-revenue')?.value||0)});
      return true;
    });
}

function addTaskModal(){
  openModal('Nueva Tarea',`
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-task-title" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Área</label><select id="f-task-area" class="input"><option value="">Sin área</option>${sectionAreas('business').map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridad</label><select id="f-task-prio" class="input"><option value="high">Alta</option><option value="medium" selected>Media</option><option value="low">Baja</option></select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Fecha límite</label><input id="f-task-due" type="date" class="input"></div>
        <div class="field" style="justify-content:flex-end;flex-direction:row;align-items:center;gap:8px"><input id="f-task-rec" type="checkbox"><label for="f-task-rec">Recurrente</label></div>
      </div>
    </div>`,
    ()=>{
      const t=el('f-task-title').value.trim();if(!t)return false;
      state.business.tasks.push({id:uid(),title:t,area:el('f-task-area').value,priority:el('f-task-prio').value,dueDate:el('f-task-due').value,recurring:el('f-task-rec').checked,done:false,createdAt:today()});
      return true;
    });
}

function addProjectModal(){
  openModal('Nuevo Proyecto',`
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-proj-name" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Área</label><select id="f-proj-area" class="input"><option value="">Sin área</option>${sectionAreas('business').map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
        <div class="field"><label>Estado</label><select id="f-proj-status" class="input"><option value="active">Activo</option><option value="paused">Pausado</option><option value="done">Completado</option></select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Progreso (%)</label><input id="f-proj-prog" type="number" min="0" max="100" class="input" value="0"></div>
        <div class="field"><label>Ingresos / mes ($)</label><input id="f-proj-rev" type="number" class="input" value="0"></div>
      </div>
    </div>`,
    ()=>{
      const n=el('f-proj-name').value.trim();if(!n)return false;
      const aId=el('f-proj-area').value;
      state.business.projects.push({id:uid(),name:n,area:aId,status:el('f-proj-status').value,progress:Number(el('f-proj-prog').value)});
      const a=state.customAreas.find(x=>x.id===aId);if(a)a.revenue=Number(el('f-proj-rev').value)||a.revenue||0;
      return true;
    });
}

function addHabitModal(){
  openModal('Nuevo Hábito',`
    <div class="form-grid">
      <div class="field"><label>Nombre del hábito</label><input id="f-habit-name" class="input" placeholder="ej. Leer 30 minutos"></div>
      <div class="field"><label>Tipo</label><select id="f-habit-type" class="input"><option value="daily">Diario</option><option value="weekly">Semanal</option></select></div>
    </div>`,
    ()=>{
      const n=el('f-habit-name').value.trim();if(!n)return false;
      state.health.habits.push({id:uid(),name:n,type:el('f-habit-type').value,log:{},createdAt:today()});
      return true;
    });
}

function addRoutineModal(type){
  openModal(`Nuevo paso — Rutina ${type==='morning'?'matutina':'nocturna'}`,`
    <div class="field"><label>Paso de rutina</label><input id="f-routine-text" class="input" placeholder="ej. Meditación 10 min"></div>`,
    ()=>{
      const t=el('f-routine-text').value.trim();if(!t)return false;
      if(!state.routines[type])state.routines[type]=[];
      state.routines[type].push({text:t,doneDate:''});
      return true;
    });
}

function openMoodModal(){
  openModal('Estado de ánimo — Hoy',`
    <div class="form-grid">
      <div class="field"><label>Ánimo (1-5)</label>
        <div style="display:flex;gap:16px;justify-content:center;padding:12px">
          ${[1,2,3,4,5].map(v=>`<div onclick="this.parentNode.querySelectorAll('[data-mood]').forEach(x=>x.style.opacity='.3');this.style.opacity='1';el('f-mood-val').value=${v}" data-mood="${v}" style="font-size:2rem;cursor:pointer;opacity:${getMoodToday()===v?1:.3}">${['😞','😕','😐','🙂','😄'][v-1]}</div>`).join('')}
        </div>
        <input type="hidden" id="f-mood-val" value="${getMoodToday()||3}">
      </div>
      <div class="field"><label>Energía (1-5)</label><input id="f-energy-val" type="range" min="1" max="5" value="${getEnergyToday()}" class="input"></div>
      <div class="field"><label>Nota (opcional)</label><input id="f-mood-note" class="input" placeholder="¿Cómo fue tu día?"></div>
    </div>`,
    ()=>{
      const t=today(),mood=Number(el('f-mood-val').value),energy=Number(el('f-energy-val').value);
      const entry=state.moodLog.find(m=>m.date===t);
      if(entry){entry.mood=mood;entry.energy=energy;entry.note=el('f-mood-note').value;}
      else state.moodLog.push({date:t,mood,energy,note:el('f-mood-note').value});
      return true;
    });
}

function getMoodToday(){return state.moodLog.find(m=>m.date===today())?.mood||0;}
function getEnergyToday(){return state.moodLog.find(m=>m.date===today())?.energy||3;}

function addMetricModal(type,label){
  openModal(`Registrar — ${label}`,`
    <div class="form-row">
      <div class="field"><label>Fecha</label><input id="f-metric-date" type="date" class="input" value="${today()}"></div>
      <div class="field"><label>${label}</label><input id="f-metric-val" type="number" step="0.1" class="input"></div>
    </div>`,
    ()=>{
      const v=el('f-metric-val').value;if(!v)return false;
      state.health[type].push({date:el('f-metric-date').value,value:Number(v)});
      state.health[type].sort((a,b)=>a.date.localeCompare(b.date));
      return true;
    });
}

function addPersonModal(){
  openModal('Nueva Persona',`
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-person-name" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Relación</label><input id="f-person-rel" class="input" placeholder="ej. Amigo, Familiar"></div>
        <div class="field"><label>Último contacto</label><input id="f-person-contact" type="date" class="input" value="${today()}"></div>
      </div>
    </div>`,
    ()=>{
      const n=el('f-person-name').value.trim();if(!n)return false;
      state.family.people.push({id:uid(),name:n,relationship:el('f-person-rel').value,lastContact:el('f-person-contact').value});
      return true;
    });
}

function addEventModal(){
  openModal('Nuevo Evento',`
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-ev-title" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Fecha</label><input id="f-ev-date" type="date" class="input"></div>
        <div class="field"><label>Nota</label><input id="f-ev-note" class="input"></div>
      </div>
    </div>`,
    ()=>{
      const t=el('f-ev-title').value.trim();if(!t)return false;
      state.family.events.push({id:uid(),title:t,date:el('f-ev-date').value,note:el('f-ev-note').value});
      return true;
    });
}

function addMemoryModal(){
  openModal('✨ Nuevo momento',`
    <div class="form-grid">
      <div class="form-row">
        <div class="field" style="max-width:90px"><label>Emoji</label><input id="f-mem-emoji" class="input" maxlength="2" value="💝" style="font-size:18px;text-align:center"></div>
        <div class="field"><label>Fecha</label><input id="f-mem-date" type="date" class="input" value="${today()}"></div>
      </div>
      <div class="field"><label>Título del momento</label><input id="f-mem-title" class="input" placeholder="ej. Cumpleaños de mamá, Cena familiar..."></div>
      <div class="field"><label>Descripción</label><textarea id="f-mem-note" class="input" rows="4" placeholder="¿Qué pasó? ¿Por qué fue especial? ¿Quiénes estuvieron?"></textarea></div>
    </div>`,
    ()=>{
      const t=el('f-mem-title').value.trim();
      if(!t){ alert('⚠️ Ponle un título al momento'); return false; }
      state.family.memories.push({
        id:uid(),
        emoji:el('f-mem-emoji').value || '💝',
        title:t,
        date:el('f-mem-date').value || today(),
        description:el('f-mem-note').value,
        note:el('f-mem-note').value,  // backwards compat
      });
      // Make sure the month for the new memory opens
      const key = (el('f-mem-date').value || today()).slice(0,7);
      state.memoryOpenMonths = state.memoryOpenMonths || {};
      state.memoryOpenMonths[key] = true;
      return true;
    });
}

function addIncomeModal(){
  openModal('Nuevo Ingreso',`
    <div class="form-grid">
      <div class="field"><label>Fuente</label><input id="f-inc-src" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Monto</label><input id="f-inc-amt" type="number" class="input"></div>
        <div class="field"><label>Fecha</label><input id="f-inc-date" type="date" class="input" value="${today()}"></div>
      </div>
    </div>`,
    ()=>{
      const s=el('f-inc-src').value.trim(),a=el('f-inc-amt').value;if(!s||!a)return false;
      state.finance.income.push({id:uid(),source:s,amount:Number(a),date:el('f-inc-date').value});
      return true;
    });
}

function addExpenseModal(){
  const cats=[...new Set(state.finance.budget.map(b=>b.category))];
  openModal('Nuevo Gasto',`
    <div class="form-grid">
      <div class="field"><label>Descripción</label><input id="f-exp-desc" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Categoría</label><input id="f-exp-cat" class="input" list="cat-list" placeholder="ej. Alimentación"><datalist id="cat-list">${cats.map(c=>`<option value="${c}">`).join('')}</datalist></div>
        <div class="field"><label>Monto</label><input id="f-exp-amt" type="number" class="input"></div>
      </div>
      <div class="field"><label>Fecha</label><input id="f-exp-date" type="date" class="input" value="${today()}"></div>
    </div>`,
    ()=>{
      const d=el('f-exp-desc').value.trim(),a=el('f-exp-amt').value;if(!d||!a)return false;
      state.finance.expenses.push({id:uid(),description:d,category:el('f-exp-cat').value,amount:Number(a),date:el('f-exp-date').value});
      return true;
    });
}

function addBudgetModal(){
  openModal('Nueva Categoría',`
    <div class="form-row">
      <div class="field"><label>Categoría</label><input id="f-bud-cat" class="input"></div>
      <div class="field"><label>Límite mensual</label><input id="f-bud-limit" type="number" class="input"></div>
    </div>`,
    ()=>{
      const c=el('f-bud-cat').value.trim(),l=el('f-bud-limit').value;if(!c||!l)return false;
      state.finance.budget.push({id:uid(),category:c,limit:Number(l)});
      return true;
    });
}

function addGoalModal(){
  openModal('Nueva Meta',`
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-goal-title" class="input"></div>
      <div class="field"><label>Descripción</label><input id="f-goal-desc" class="input"></div>
      <div class="field"><label>Área</label><select id="f-goal-area" class="input"><option value="">Sin área</option>${state.customAreas.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
      <div class="form-row-3">
        <div class="field"><label>Meta numérica</label><input id="f-goal-target" type="number" class="input" value="100"></div>
        <div class="field"><label>Actual</label><input id="f-goal-current" type="number" class="input" value="0"></div>
        <div class="field"><label>Unidad</label><input id="f-goal-unit" class="input" placeholder="kg, $, km"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Inicio</label><input id="f-goal-start" type="date" class="input" value="${today()}"></div>
        <div class="field"><label>Fecha límite</label><input id="f-goal-due" type="date" class="input"></div>
      </div>
    </div>`,
    ()=>{
      const t=el('f-goal-title').value.trim();if(!t)return false;
      state.goals.push({id:uid(),title:t,description:el('f-goal-desc').value,area:el('f-goal-area').value,target:Number(el('f-goal-target').value),current:Number(el('f-goal-current').value),unit:el('f-goal-unit').value,dueDate:el('f-goal-due').value,startDate:el('f-goal-start').value,okr:0,done:false});
      return true;
    });
}

function editGoalProgress(id){
  const g=state.goals.find(x=>x.id===id);if(!g)return;
  openModal('Actualizar Meta',`
    <div class="form-grid">
      <div class="field"><label>Progreso actual (${g.unit||''})</label><input id="f-gp-current" type="number" class="input" value="${g.current}"></div>
      <div class="field" style="flex-direction:row;gap:8px;align-items:center"><input id="f-gp-done" type="checkbox" ${g.done?'checked':''}><label>Marcar como completada</label></div>
    </div>`,
    ()=>{g.current=Number(el('f-gp-current').value);g.done=el('f-gp-done').checked;return true;});
}

function addPriorityModal(){
  openModal('Nueva Prioridad',`
    <div class="field"><label>Prioridad del día</label><input id="f-prio" class="input" placeholder="Lo más importante hoy..."></div>`,
    ()=>{
      const t=today(),v=el('f-prio').value.trim();if(!v)return false;
      if(!state.time.priorities[t])state.time.priorities[t]=[];
      state.time.priorities[t].push({text:v,done:false});
      return true;
    });
}

function addTimeBlockModal(){
  openModal('Nuevo Bloque de Tiempo',`
    <div class="form-grid">
      <div class="field"><label>Actividad</label><input id="f-blk-act" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Área</label><select id="f-blk-area" class="input"><option value="">Sin área</option>${state.customAreas.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
        <div class="field"><label>Horas / semana</label><input id="f-blk-hours" type="number" step="0.5" class="input"></div>
      </div>
      <div class="field"><label>Apalancamiento (80/20)</label><select id="f-blk-lev" class="input">
        <option value="high">🚀 Alto — genera mayor impacto</option>
        <option value="neutral">➡ Neutral — necesario pero no diferenciador</option>
        <option value="low">⬇️ Bajo — consume tiempo sin retorno proporcional</option>
      </select></div>
    </div>`,
    ()=>{
      const a=el('f-blk-act').value.trim();if(!a)return false;
      state.time.blocks.push({id:uid(),activity:a,area:el('f-blk-area').value,hours:Number(el('f-blk-hours').value),leverage:el('f-blk-lev').value});
      return true;
    });
}

function addBookModal(){
  openModal('Nuevo Libro',`
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-book-title" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Autor</label><input id="f-book-author" class="input"></div>
        <div class="field"><label>Estado</label><select id="f-book-status" class="input"><option value="want">Por leer</option><option value="reading">Leyendo</option><option value="done">Leído</option></select></div>
      </div>
    </div>`,
    ()=>{
      const t=el('f-book-title').value.trim();if(!t)return false;
      state.learning.books.push({id:uid(),title:t,author:el('f-book-author').value,status:el('f-book-status').value,progress:0});
      return true;
    });
}

function addCourseModal(){
  openModal('Nuevo Curso',`
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-crs-name" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Plataforma</label><input id="f-crs-plat" class="input" placeholder="ej. Udemy"></div>
        <div class="field"><label>Progreso (%)</label><input id="f-crs-prog" type="number" min="0" max="100" class="input" value="0"></div>
      </div>
    </div>`,
    ()=>{
      const n=el('f-crs-name').value.trim();if(!n)return false;
      state.learning.courses.push({id:uid(),name:n,platform:el('f-crs-plat').value,progress:Number(el('f-crs-prog').value)});
      return true;
    });
}

function addKeyLearningModal(){
  openModal('Nuevo Aprendizaje',`
    <div class="form-grid">
      <div class="field"><label>¿Qué aprendiste?</label><textarea id="f-learn-text" class="input"></textarea></div>
      <div class="field"><label>Fuente</label><input id="f-learn-src" class="input" placeholder="ej. Libro, curso, experiencia"></div>
    </div>`,
    ()=>{
      const t=el('f-learn-text').value.trim();if(!t)return false;
      state.learning.keyLearnings.unshift({text:t,source:el('f-learn-src').value,date:today()});
      return true;
    });
}

function addNotToDoModal(){
  openModal('Nueva regla de No-Hacer',`
    <div class="field"><label>No voy a...</label><input id="f-ntd-text" class="input" placeholder="ej. Revisar redes antes de las 10am"></div>`,
    ()=>{
      const t=el('f-ntd-text').value.trim();if(!t)return false;
      state.learning.notToDo.push({text:t,createdAt:today()});
      return true;
    });
}

function addCommitmentModal(){
  openModal('Nuevo Compromiso',`
    <div class="form-grid">
      <div class="field"><label>Me comprometo a...</label><input id="f-com-title" class="input"></div>
      <div class="form-row">
        <div class="field"><label>Fecha límite</label><input id="f-com-dead" type="date" class="input"></div>
        <div class="field"><label>Área</label><select id="f-com-area" class="input"><option value="">General</option>${state.customAreas.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
      </div>
    </div>`,
    ()=>{
      const t=el('f-com-title').value.trim();if(!t)return false;
      state.commitments.push({id:uid(),title:t,deadline:el('f-com-dead').value,area:el('f-com-area').value,done:false,createdAt:today()});
      return true;
    });
}

/* ─── EXCEL IMPORT ───────────────────────────────────────── */
function importExcelForPage(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let n=0;
      rows.forEach(row=>{
        const title=row['Tarea']||row['Task']||row['Título']||row['title']||row['Meta']||row['Goal'];
        if(title){
          if(currentPage==='business') state.business.tasks.push({id:uid(),title:String(title),area:'',priority:'medium',dueDate:'',recurring:false,done:false,createdAt:today()});
          else if(currentPage==='goals') state.goals.push({id:uid(),title:String(title),description:'',area:'',target:100,current:0,unit:'',dueDate:'',startDate:today(),okr:0,done:false});
          n++;
        }
        const amount=row['Monto']||row['Amount']||row['amount'];
        const desc=row['Descripción']||row['description']||row['Concepto'];
        if(amount&&desc&&currentPage==='finance'){
          if(Number(amount)>=0) state.finance.income.push({id:uid(),source:String(desc),amount:Number(amount),date:today()});
          else state.finance.expenses.push({id:uid(),description:String(desc),category:'Importado',amount:Math.abs(Number(amount)),date:today()});
          n++;
        }
      });
      saveState();renderPage(currentPage);
      alert(`✅ ${n} registros importados`);
    }catch(err){alert('Error al leer Excel: '+err.message);}
  };
  reader.readAsArrayBuffer(file);
}

/* ─── EXPORT / IMPORT ────────────────────────────────────── */
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`life-dashboard-${today()}.json`;a.click();URL.revokeObjectURL(url);
}

function importData(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{state=deepMerge(defaultData(),JSON.parse(e.target.result));saveState();applyDarkMode();renderPage(currentPage);updateAlertDots();alert('✅ Datos importados');}
    catch(err){alert('Error al importar: '+err.message);}
  };
  reader.readAsText(file);
}

/* ─── VISION EDIT ────────────────────────────────────────── */
function openVisionEdit(section){
  openModal('Editar Visión',`
    <div class="field"><label>Mi visión para esta área</label><textarea id="f-vision" class="input" rows="4">${state.visions[section]||''}</textarea></div>
    <div class="help-text">Escribe de forma inspiradora y en tiempo presente. Esta visión guiará todas tus decisiones en esta área.</div>`,
    ()=>{state.visions[section]=el('f-vision').value.trim();renderVisions();return true;});
}

/* ─── INIT ───────────────────────────────────────────────── */
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? 'rgba(255,255,255,.7)' : 'rgba(15,15,15,.7)';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(15,15,15,.07)';
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter','Plus Jakarta Sans',-apple-system,sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.font.weight = '600';
  Chart.defaults.borderColor = gridColor;
  if (Chart.defaults.scale) {
    if (Chart.defaults.scale.grid) Chart.defaults.scale.grid.color = gridColor;
    if (Chart.defaults.scale.ticks) Chart.defaults.scale.ticks.color = textColor;
  }
  // Set common scale defaults
  ['linear','category','time'].forEach(t => {
    if (Chart.defaults.scales && Chart.defaults.scales[t]) {
      if (Chart.defaults.scales[t].grid) Chart.defaults.scales[t].grid.color = gridColor;
      if (Chart.defaults.scales[t].ticks) Chart.defaults.scales[t].ticks.color = textColor;
    }
  });
  // Plugin defaults
  Chart.defaults.plugins = Chart.defaults.plugins || {};
  Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
  Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
  Chart.defaults.plugins.legend.labels.color = textColor;
  Chart.defaults.plugins.legend.labels.font = { size: 11, weight: '600' };
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: isDark ? 'rgba(20,20,20,.95)' : 'rgba(255,255,255,.98)',
    titleColor: isDark ? '#fff' : '#0F0F0F',
    bodyColor: isDark ? '#C7C7C7' : '#525252',
    borderColor: isDark ? 'rgba(255,107,53,.4)' : 'rgba(234,88,12,.3)',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 12,
    titleFont: { size: 12, weight: '700' },
    bodyFont: { size: 12, weight: '600' },
    boxPadding: 6,
    usePointStyle: true,
  });
}

function init(){
  // CHECK AUTHENTICATION — si no hay usuario, mostrar login y ocultar dashboard
  if (!getCurrentUser()) {
    document.body.classList.add('auth-mode');
    // Asegurar foco en input de login
    setTimeout(() => { const u = el('loginUsername'); if (u) u.focus(); }, 100);
    return;
  }

  // Hay usuario — quitar modo auth, mostrar dashboard
  document.body.classList.remove('auth-mode');

  loadState();
  migrateTaskAreas();  // ensure taskAreas use new IDs (business/learning/family)
  // Auto-update selectedDate to today if it's stale (left over from a previous session)
  const t = new Date().toISOString().slice(0,10);
  if (!state.selectedDate || state.selectedDate < t) {
    state.selectedDate = t;
    saveState();
  }
  applyDarkMode();
  applyChartDefaults();

  // Date chip
  el('todayChip').textContent=new Date().toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

  // Nav
  qsa('.nav-item').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));

  // Bottom nav (mobile)
  qsa('.bottom-nav-item').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));

  // Overview interactions (date picker, eyebrow, add area)
  el('overviewDateTrigger')?.addEventListener('click', openOverviewDatePopup);
  el('overviewEyebrow')?.addEventListener('click', openOverviewDatePopup);
  el('btnAddTaskArea')?.addEventListener('click', addTaskAreaModal);

  // Sidebar footer buttons
  el('btnSearch').addEventListener('click',openSearch);
  el('btnDarkMode').addEventListener('click',()=>{state.darkMode=!state.darkMode;applyDarkMode();applyChartDefaults();saveState();renderPage(currentPage);});
  el('btnExport').addEventListener('click',exportData);
  el('btnImport').addEventListener('click',()=>el('fileImport').click());
  el('btnReset').addEventListener('click',()=>{if(!confirm('⚠️ ¿Eliminar TODOS los datos? No se puede deshacer.'))return;state=defaultData();saveState();renderPage(currentPage);updateAlertDots();});
  el('fileImport').addEventListener('change',e=>{importData(e.target.files[0]);e.target.value='';});
  el('fileExcel').addEventListener('change',e=>{importExcelForPage(e.target.files[0]);e.target.value='';});
  el('fileNutritionImg').addEventListener('change',e=>{if(e.target.files[0])readSupplementLabel(e.target.files[0]);e.target.value='';});

  // Topbar
  el('btnImportExcel').addEventListener('click',()=>el('fileExcel').click());
  el('btnQuickAdd').addEventListener('click',quickAdd);

  // Modal
  el('modalClose').addEventListener('click',closeModal);
  el('modalCancel').addEventListener('click',closeModal);
  el('modalSave').addEventListener('click',()=>{if(_onSave&&_onSave()){closeModal();saveState();renderPage(currentPage);updateAlertDots();}});
  el('modal').addEventListener('click',e=>{if(e.target===el('modal'))closeModal();});

  // Search
  el('searchModal').addEventListener('click',e=>{if(e.target===el('searchModal'))closeSearch();});
  el('searchInput').addEventListener('input',e=>doSearch(e.target.value));

  // Vision edit (event delegation)
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-edit-vision]');
    if(btn)openVisionEdit(btn.dataset.editVision);
    const add=e.target.closest('[data-add]');
    if(add){
      const map={
        'task':addTaskModal,'project':addProjectModal,'habit':addHabitModal,
        'routine-morning':()=>addRoutineModal('morning'),'routine-evening':()=>addRoutineModal('evening'),
        'mood':openMoodModal,
        'weight':()=>addMetricModal('weight','Peso (kg)'),'sleep':()=>addMetricModal('sleep','Horas de sueño'),
        'exercise':()=>addMetricModal('exercise','Minutos de ejercicio'),'water':()=>addMetricModal('water','Vasos de agua'),
        'person':addPersonModal,'event':addEventModal,'memory':addMemoryModal,
        'income':addIncomeModal,'expense':addExpenseModal,'budget':addBudgetModal,
        'goal':addGoalModal,'priority':addPriorityModal,'timeblock':addTimeBlockModal,
        'book':addBookModal,'course':addCourseModal,'keylearning':addKeyLearningModal,'notodo':addNotToDoModal,
        'commitment':addCommitmentModal,
      };
      map[add.dataset.add]?.();
    }
    const addArea=e.target.closest('[data-add-area]');
    if(addArea)addAreaModal(addArea.dataset.addArea);
    const importExcel=e.target.closest('[data-import-excel]');
    if(importExcel)el('fileExcel').click();
    const pageJump=e.target.closest('[data-page-jump]');
    if(pageJump)navigate(pageJump.dataset.pageJump);
    const btnSave=e.target.closest('#btnSaveReview');
    if(btnSave)saveWeeklyReview();
  });

  // Keyboard
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openSearch();}
    if(e.key==='Escape'){closeModal();closeSearch();}
  });

  // Pomodoro popup deshabilitado — ahora solo está en la pestaña Agenda
  const pw = el('pomodoroWidget'); if (pw) pw.style.display = 'none';

  // Notification permission
  if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();

  if (typeof refreshSidebarAvatar === 'function') refreshSidebarAvatar();
  navigate('overview');
}

/* ═══════════════════════════════════════════════════════════
   NUTRITION MODULE
   ═══════════════════════════════════════════════════════════ */

/* ─── NUTRITION HELPERS ──────────────────────────────────── */
const NUTRIENT_LABELS = {
  cal:'Calorías', protein:'Proteínas (g)', carbs:'Carbohidratos (g)', fat:'Grasas (g)',
  fiber:'Fibra (g)', sodium:'Sodio (mg)', sugar:'Azúcar (g)',
  vitC:'Vitamina C (mg)', vitD:'Vitamina D (mcg)', vitB12:'Vitamina B12 (mcg)',
  vitA:'Vitamina A (mcg)', vitE:'Vitamina E (mg)', vitK:'Vitamina K (mcg)',
  calcium:'Calcio (mg)', iron:'Hierro (mg)', magnesium:'Magnesio (mg)',
  potassium:'Potasio (mg)', zinc:'Zinc (mg)', selenium:'Selenio (mcg)', omega3:'Omega-3 (mg)',
};
const MEAL_LABELS = {breakfast:'☀️ Desayuno',lunch:'🌤 Almuerzo',dinner:'🌙 Cena',snack:'🍎 Snack'};

function nutTodayTotals(date=today()) {
  const foods=state.nutrition.foodLog.filter(f=>f.date===date);
  const totals={};
  Object.keys(NUTRIENT_LABELS).forEach(k=>{totals[k]=foods.reduce((s,f)=>s+Number(f[k]||0),0);});
  return totals;
}

function nutDateRange(days) {
  const dates=[];
  for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(d.toISOString().slice(0,10));}
  return dates;
}

function nutAvg(days,key) {
  const vals=nutDateRange(days).map(d=>state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f[key]||0),0));
  const nz=vals.filter(v=>v>0);
  return nz.length?(nz.reduce((s,v)=>s+v,0)/nz.length):0;
}

/* ─── RENDER NUTRITION PAGE ──────────────────────────────── */
function renderNutrition() {
  const nut=state.nutrition, t=today(), totals=nutTodayTotals(t), goals=nut.goals;
  const suppTaken=nut.supplements.filter(s=>s.takenLog?.[t]).length;

  const hpEl=el('healthProfileDisplay');
  if(hpEl) hpEl.textContent=nut.healthProfile||'Configura tu perfil de salud para que la IA entienda tu contexto.';

  const apiLabel=el('apiStatusLabel');
  if(apiLabel) apiLabel.textContent=nut.aiApiKey
    ?`✅ API key configurada (${nut.aiProvider==='anthropic'?'Claude / Anthropic':'OpenAI GPT-4o'})`
    :'⚠️ Sin API key — configura para activar análisis de etiquetas y recomendaciones';

  const dateEl=el('nutritionDateLabel');
  if(dateEl) dateEl.textContent=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});

  el('nutritionKpis').innerHTML=[
    kpiCard('Calorías hoy',`${Math.round(totals.cal)} kcal`,'🔥','#F97316',`Meta: ${goals.calories} kcal · ${totals.cal>0?Math.round((totals.cal/goals.calories)*100)+'%':'0%'}`),
    kpiCard('Proteínas',`${Math.round(totals.protein)}g`,'💪','#6366F1',`Meta: ${goals.protein}g`),
    kpiCard('Carbohidratos',`${Math.round(totals.carbs)}g`,'🌾','#10B981',`Meta: ${goals.carbs}g`),
    kpiCard('Grasas',`${Math.round(totals.fat)}g`,'🥑','#EC4899',`Meta: ${goals.fat}g`),
    kpiCard('Suplementos',`${suppTaken}/${nut.supplements.length}`,'💊','#14B8A6','tomados hoy'),
  ].join('');

  renderFoodLogToday();
  renderSupplementsList();
  renderNutrientBreakdown(totals);
  renderNutritionCharts();
  renderNutritionHistory();
}

/* ─── FOOD LOG ───────────────────────────────────────────── */
function renderFoodLogToday() {
  const t=today(), foods=state.nutrition.foodLog.filter(f=>f.date===t);
  const byMeal={breakfast:[],lunch:[],dinner:[],snack:[]};
  foods.forEach(f=>{(byMeal[f.meal]||byMeal.snack).push(f);});
  if(!foods.length){el('foodLogToday').innerHTML=empty('🍽️','Sin alimentos registrados hoy');return;}
  el('foodLogToday').innerHTML=Object.entries(byMeal).map(([meal,items])=>{
    if(!items.length)return'';
    const mCal=items.reduce((s,f)=>s+Number(f.cal||0),0);
    return`<div class="meal-section">
      <div class="meal-label">${MEAL_LABELS[meal]||meal}<span style="float:right;color:var(--orange);font-weight:700">${Math.round(mCal)} kcal</span></div>
      ${items.map(f=>`<div class="food-row">
        <div class="food-name">${f.name}<span class="text-xs text-muted"> ${f.amount||''} ${f.unit||''}</span></div>
        <div class="food-macros">${f.protein?`P:${Math.round(f.protein)}g `:''}${f.carbs?`C:${Math.round(f.carbs)}g `:''}${f.fat?`G:${Math.round(f.fat)}g`:''}</div>
        <div class="food-cals">${Math.round(f.cal||0)}</div>
        <button class="icon-btn danger" onclick="deleteFoodEntry('${f.id}')">✕</button>
      </div>`).join('')}
    </div>`;
  }).join('');
}

function deleteFoodEntry(id){state.nutrition.foodLog=state.nutrition.foodLog.filter(f=>f.id!==id);saveState();renderNutrition();}

/* ─── SUPPLEMENTS ────────────────────────────────────────── */
function renderSupplementsList() {
  const t=today(),supps=state.nutrition.supplements;
  if(!supps.length){el('supplementsList').innerHTML=empty('💊','Agrega suplementos o toma foto de la etiqueta');return;}
  el('supplementsList').innerHTML=supps.map(s=>{
    const taken=s.takenLog?.[t];
    const topNuts=Object.entries(s.nutrients||{}).filter(([,v])=>v>0).slice(0,4).map(([k,v])=>`${NUTRIENT_LABELS[k]?.split(' ')[0]||k}: ${v}`).join(' · ');
    return`<div class="supp-item" style="${taken?'opacity:.75':''}">
      <div class="supp-img" onclick="viewSuppPhoto('${s.id}')" style="cursor:${s.photo?'pointer':'default'}">
        ${s.photo?`<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`:'💊'}
      </div>
      <div class="supp-info">
        <div class="supp-name">${s.name}${taken?' <span style="color:var(--success);font-size:11px">✓ Tomado</span>':''}</div>
        <div class="supp-brand">${s.brand||''}</div>
        <div class="supp-nutrients">${topNuts||'Sin datos nutricionales'}</div>
      </div>
      <div class="row gap-sm">
        <button class="btn btn-secondary btn-sm" style="${taken?'color:var(--success);border-color:var(--success)':''}" onclick="toggleSuppTaken('${s.id}')">${taken?'✓ Tomado':'Tomar'}</button>
        <button class="icon-btn danger" onclick="deleteSupp('${s.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function toggleSuppTaken(id){
  const s=state.nutrition.supplements.find(x=>x.id===id);if(!s)return;
  if(!s.takenLog)s.takenLog={};
  s.takenLog[today()]=!s.takenLog[today()];
  saveState();renderNutrition();
}
function deleteSupp(id){state.nutrition.supplements=state.nutrition.supplements.filter(s=>s.id!==id);saveState();renderNutrition();}
function viewSuppPhoto(id){const s=state.nutrition.supplements.find(x=>x.id===id);if(s?.photo)openModal(s.name,`<img src="${s.photo}" style="width:100%;border-radius:12px">`,()=>true);}

/* ─── NUTRIENT BREAKDOWN ─────────────────────────────────── */
function renderNutrientBreakdown(totals) {
  const g=state.nutrition.goals;
  const main=[
    {key:'cal',label:'🔥 Calorías',goal:g.calories,color:'#F97316'},
    {key:'protein',label:'💪 Proteínas',goal:g.protein,color:'#6366F1'},
    {key:'carbs',label:'🌾 Carbohidratos',goal:g.carbs,color:'#10B981'},
    {key:'fat',label:'🥑 Grasas',goal:g.fat,color:'#EC4899'},
    {key:'fiber',label:'🌿 Fibra',goal:g.fiber,color:'#F59E0B'},
  ];
  const extra=['vitC','vitD','vitB12','vitA','vitE','calcium','iron','magnesium','potassium','zinc','selenium','omega3']
    .filter(k=>totals[k]>0).map(k=>({key:k,label:NUTRIENT_LABELS[k],goal:0,color:'#64748B'}));

  el('nutrientBreakdown').innerHTML=[...main,...extra].map(n=>{
    const val=Math.round(totals[n.key]||0);
    const pct=n.goal>0?Math.min(115,(val/n.goal)*100):0;
    const over=n.goal>0&&pct>100;
    return`<div class="nutrient-bar-row">
      <div class="nutrient-bar-label"><span>${n.label}</span>
        <span class="val" style="${over?'color:var(--danger);font-weight:700':''}">${val}${n.goal?` / ${n.goal} · ${Math.round(pct)}%`:''}${over?' ⚠️':''}</span>
      </div>
      ${bar(pct,over?'#EF4444':n.color,10)}
    </div>`;
  }).join('')||empty('📊','Registra alimentos para ver el análisis');
}

/* ─── CHARTS ─────────────────────────────────────────────── */
function renderNutritionCharts() {
  const dates=nutDateRange(14);
  const labels=dates.map(d=>new Date(d+'T00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'}));
  const calData=dates.map(d=>state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f.cal||0),0));
  destroyChart('chartNutritionCalories');
  const cCalEl=el('chartNutritionCalories');
  if(cCalEl) charts['chartNutritionCalories']=new Chart(cCalEl,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Calorías',data:calData,backgroundColor:'#F9731680',borderColor:'#F97316',borderWidth:2,borderRadius:5},
      {label:'Meta',data:dates.map(()=>state.nutrition.goals.calories),type:'line',borderColor:'#EF444480',borderDash:[5,5],borderWidth:2,pointRadius:0,fill:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:11}}}},scales:{y:{beginAtZero:true}}}
  });
  lineChart('chartNutritionMacros',labels,[
    {label:'Proteínas (g)',data:dates.map(d=>state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f.protein||0),0)),borderColor:'#6366F1'},
    {label:'Carbos (g)',data:dates.map(d=>state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f.carbs||0),0)),borderColor:'#10B981'},
    {label:'Grasas (g)',data:dates.map(d=>state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f.fat||0),0)),borderColor:'#EC4899'},
  ]);
}

/* ─── HISTORY TABLE ──────────────────────────────────────── */
function renderNutritionHistory() {
  const filterEl=el('nutritionHistoryFilter');
  const days=filterEl?Number(filterEl.value):7;
  const dates=nutDateRange(isNaN(days)?90:days).reverse();
  const withData=dates.filter(d=>state.nutrition.foodLog.some(f=>f.date===d));
  if(!withData.length){el('nutritionHistoryTable').innerHTML=empty('📋','Sin historial');return;}
  const tot=(d,k)=>Math.round(state.nutrition.foodLog.filter(f=>f.date===d).reduce((s,f)=>s+Number(f[k]||0),0));
  el('nutritionHistoryTable').innerHTML=`<table>
    <thead><tr><th>Fecha</th><th>Calorías</th><th>Proteínas</th><th>Carbos</th><th>Grasas</th><th>Fibra</th><th>Alimentos</th></tr></thead>
    <tbody>${withData.map(d=>{
      const foods=state.nutrition.foodLog.filter(f=>f.date===d);
      return`<tr>
        <td style="font-weight:600">${fmt(d)}</td>
        <td style="color:#F97316;font-weight:700">${tot(d,'cal')}</td>
        <td style="color:#6366F1">${tot(d,'protein')}g</td>
        <td style="color:#10B981">${tot(d,'carbs')}g</td>
        <td style="color:#EC4899">${tot(d,'fat')}g</td>
        <td>${tot(d,'fiber')}g</td>
        <td class="text-sm text-muted">${foods.map(f=>f.name).join(', ').slice(0,55)}${foods.length>3?'…':''}</td>
      </tr>`;}).join('')}
    </tbody></table>
    <div style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:10px;font-size:12px;display:flex;gap:20px;flex-wrap:wrap">
      <span>📊 <strong>Promedios ${days} días:</strong></span>
      <span>🔥 <strong>${Math.round(nutAvg(days,'cal'))} kcal</strong></span>
      <span>💪 <strong>${Math.round(nutAvg(days,'protein'))}g prot.</strong></span>
      <span>🌾 <strong>${Math.round(nutAvg(days,'carbs'))}g carbs</strong></span>
      <span>🥑 <strong>${Math.round(nutAvg(days,'fat'))}g grasas</strong></span>
    </div>`;
}

/* ─── ADD FOOD MODAL (manual) ────────────────────────────── */
function addFoodModal(prefill={}) {
  openModal('Registrar Alimento',`
    <div class="form-grid">
      <div class="form-row">
        <div class="field"><label>Nombre del alimento</label><input id="f-food-name" class="input" value="${prefill.name||''}" placeholder="ej. Pechuga de pollo"></div>
        <div class="field"><label>Comida</label><select id="f-food-meal" class="input">
          <option value="breakfast">☀️ Desayuno</option><option value="lunch">🌤 Almuerzo</option>
          <option value="dinner">🌙 Cena</option><option value="snack">🍎 Snack</option>
        </select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Cantidad</label><input id="f-food-amount" type="number" class="input" value="${prefill.amount||100}"></div>
        <div class="field"><label>Unidad</label><select id="f-food-unit" class="input">
          <option>g</option><option>ml</option><option>porción</option><option>taza</option><option>unidad</option>
        </select></div>
      </div>
      <div style="background:var(--surface-2);border-radius:10px;padding:12px">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-2)">📊 Macronutrientes</div>
        <div class="form-row-3">
          <div class="field"><label>Calorías</label><input id="f-food-cal" type="number" step="0.1" class="input" value="${prefill.cal||0}"></div>
          <div class="field"><label>Proteínas (g)</label><input id="f-food-protein" type="number" step="0.1" class="input" value="${prefill.protein||0}"></div>
          <div class="field"><label>Carbos (g)</label><input id="f-food-carbs" type="number" step="0.1" class="input" value="${prefill.carbs||0}"></div>
        </div>
        <div class="form-row-3">
          <div class="field"><label>Grasas (g)</label><input id="f-food-fat" type="number" step="0.1" class="input" value="${prefill.fat||0}"></div>
          <div class="field"><label>Fibra (g)</label><input id="f-food-fiber" type="number" step="0.1" class="input" value="${prefill.fiber||0}"></div>
          <div class="field"><label>Sodio (mg)</label><input id="f-food-sodium" type="number" step="0.1" class="input" value="${prefill.sodium||0}"></div>
        </div>
      </div>
      <div style="background:var(--surface-2);border-radius:10px;padding:12px">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-2)">🧪 Micronutrientes (opcional)</div>
        <div class="form-row">
          <div class="field"><label>Vit. C (mg)</label><input id="f-food-vitC" type="number" step="0.1" class="input" value="${prefill.vitC||0}"></div>
          <div class="field"><label>Vit. D (mcg)</label><input id="f-food-vitD" type="number" step="0.1" class="input" value="${prefill.vitD||0}"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Calcio (mg)</label><input id="f-food-calcium" type="number" step="0.1" class="input" value="${prefill.calcium||0}"></div>
          <div class="field"><label>Hierro (mg)</label><input id="f-food-iron" type="number" step="0.1" class="input" value="${prefill.iron||0}"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Omega-3 (mg)</label><input id="f-food-omega3" type="number" step="0.1" class="input" value="${prefill.omega3||0}"></div>
          <div class="field"><label>Zinc (mg)</label><input id="f-food-zinc" type="number" step="0.1" class="input" value="${prefill.zinc||0}"></div>
        </div>
      </div>
      <div class="field"><label>Fecha</label><input id="f-food-date" type="date" class="input" value="${today()}"></div>
    </div>`,
    ()=>{
      const name=el('f-food-name').value.trim();if(!name)return false;
      const v=k=>Number(el(`f-food-${k}`)?.value||0);
      state.nutrition.foodLog.push({id:uid(),date:el('f-food-date').value,meal:el('f-food-meal').value,
        name,amount:v('amount'),unit:el('f-food-unit').value,
        cal:v('cal'),protein:v('protein'),carbs:v('carbs'),fat:v('fat'),
        fiber:v('fiber'),sodium:v('sodium'),vitC:v('vitC'),vitD:v('vitD'),
        calcium:v('calcium'),iron:v('iron'),omega3:v('omega3'),zinc:v('zinc')});
      return true;
    });
}

/* ─── ADD FOOD VIA AI ESTIMATION ─────────────────────────── */
async function addFoodAIModal() {
  if(!state.nutrition.aiApiKey){alert('⚠️ Configura tu API key primero (botón ⚙️ Configurar IA)');return;}
  openModal('🤖 Estimar nutrientes con IA',`
    <div class="form-grid">
      <div class="help-text" style="background:var(--primary-soft);border-radius:8px;padding:10px;font-size:13px">Describe el alimento y cantidad. Ej: "2 huevos revueltos con 50g de queso" o "1 taza de avena con leche"</div>
      <div class="field"><label>Describe el alimento</label><textarea id="f-ai-food-desc" class="input" rows="3" placeholder="ej. 200g pechuga de pollo a la plancha con limón y ajo"></textarea></div>
      <div class="field"><label>Comida</label><select id="f-ai-food-meal" class="input">
        <option value="breakfast">☀️ Desayuno</option><option value="lunch">🌤 Almuerzo</option>
        <option value="dinner">🌙 Cena</option><option value="snack">🍎 Snack</option>
      </select></div>
      <div id="aiEstimateStatus"></div>
    </div>`,()=>true);
  el('modalSave').textContent='🤖 Estimar y agregar';
  el('modalSave').onclick=async()=>{
    const desc=el('f-ai-food-desc')?.value.trim();if(!desc){alert('Describe el alimento');return;}
    const meal=el('f-ai-food-meal')?.value||'snack';
    el('aiEstimateStatus').innerHTML=`<div class="scanning-overlay"><div class="spin">🤖</div><div style="margin-top:8px">Estimando nutrientes...</div></div>`;
    el('modalSave').disabled=true;
    try{
      const prompt=`Estima los valores nutricionales de este alimento: "${desc}"\nResponde ÚNICAMENTE con JSON válido sin markdown:\n{"name":"${desc.slice(0,50)}","cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sodium":0,"vitC":0,"vitD":0,"calcium":0,"iron":0,"magnesium":0,"zinc":0,"omega3":0,"amount":100,"unit":"g"}`;
      const nutrients=await callNutritionAI(prompt,null);
      closeModal();saveState();
      addFoodModal({...nutrients,name:desc.slice(0,60)});
      setTimeout(()=>{const m=el('f-food-meal');if(m)m.value=meal;},100);
    }catch(e){
      el('aiEstimateStatus').innerHTML=`<div style="color:var(--danger);font-size:13px;padding:8px">❌ Error: ${e.message}</div>`;
      el('modalSave').disabled=false;el('modalSave').textContent='🤖 Estimar y agregar';
    }
  };
}

/* ─── SUPPLEMENT MODALS ──────────────────────────────────── */
function addSupplementModal(prefill={}) {
  const nutFields=['cal','protein','carbs','fat','vitA','vitC','vitD','vitE','vitK','vitB12','calcium','iron','magnesium','potassium','zinc','selenium','omega3'];
  openModal('Agregar Suplemento',`
    <div class="form-grid">
      <div class="form-row">
        <div class="field"><label>Nombre</label><input id="f-supp-name" class="input" value="${prefill.name||''}" placeholder="ej. Whey Protein"></div>
        <div class="field"><label>Marca</label><input id="f-supp-brand" class="input" value="${prefill.brand||''}" placeholder="ej. Optimum"></div>
      </div>
      ${prefill.photo?`<img src="${prefill.photo}" style="width:100%;max-height:150px;object-fit:contain;border-radius:10px;background:var(--surface-3)">`:'' }
      <div style="background:var(--surface-2);border-radius:10px;padding:12px">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">📊 Nutrientes por porción</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          ${nutFields.map(k=>`<div class="field"><label style="font-size:10px">${NUTRIENT_LABELS[k]||k}</label><input id="f-supp-${k}" type="number" step="0.01" class="input" value="${prefill.nutrients?.[k]||0}" style="padding:6px 8px;font-size:12px"></div>`).join('')}
        </div>
      </div>
      <div class="field"><label>Notas</label><textarea id="f-supp-notes" class="input" rows="2">${prefill.notes||''}</textarea></div>
    </div>`,
    ()=>{
      const name=el('f-supp-name').value.trim();if(!name)return false;
      const nutrients={};nutFields.forEach(k=>{const v=Number(el(`f-supp-${k}`)?.value||0);if(v)nutrients[k]=v;});
      state.nutrition.supplements.push({id:uid(),name,brand:el('f-supp-brand').value,photo:prefill.photo||null,frequency:'daily',takenLog:{},nutrients,notes:el('f-supp-notes').value});
      return true;
    });
}

/* ─── AI LABEL READER ────────────────────────────────────── */
async function readSupplementLabel(file) {
  if(!state.nutrition.aiApiKey){alert('⚠️ Configura tu API key primero para usar el lector de etiquetas IA');return;}
  const base64=await fileToBase64(file);
  const mimeType=file.type||'image/jpeg';
  openModal('📷 Leyendo etiqueta con IA...',`
    <div class="scanning-overlay">
      <div class="spin">🔍</div>
      <div style="margin-top:12px;font-weight:600">Analizando etiqueta nutricional...</div>
      <div class="text-sm text-muted" style="margin-top:6px">La IA extrae vitaminas, minerales y macros automáticamente</div>
      <img src="${base64}" style="width:100%;max-height:220px;object-fit:contain;border-radius:10px;margin-top:14px;background:var(--surface-3)">
    </div>`,()=>true);
  el('modalSave').style.display='none';
  try{
    const prompt=`Analiza esta etiqueta nutricional de suplemento. Extrae la información por porción.\nResponde ÚNICAMENTE con JSON válido sin markdown ni código:\n{"name":"nombre","brand":"marca","serving":"tamaño porción","nutrients":{"cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sodium":0,"vitA":0,"vitC":0,"vitD":0,"vitE":0,"vitK":0,"vitB12":0,"calcium":0,"iron":0,"magnesium":0,"potassium":0,"zinc":0,"selenium":0,"omega3":0}}\nUsa 0 para nutrientes no presentes. Convierte todas las unidades.`;
    const dataOnly=base64.split(',')[1]||base64;
    const result=await callNutritionAI(prompt,{data:dataOnly,mediaType:mimeType});
    closeModal();el('modalSave').style.display='';
    addSupplementModal({name:result.name||'',brand:result.brand||'',photo:base64,nutrients:result.nutrients||{}});
  }catch(e){
    closeModal();el('modalSave').style.display='';
    alert('❌ Error al leer la etiqueta: '+e.message+'\n\nVerifica tu API key y que la imagen sea clara.');
  }
}

/* ─── CORE AI CALLER ─────────────────────────────────────── */
async function callNutritionAI(prompt,image) {
  const nut=state.nutrition;
  if(!nut.aiApiKey)throw new Error('API key no configurada');
  const content=[];
  if(image)content.push({type:'image',source:{type:'base64',media_type:image.mediaType,data:image.data}});
  content.push({type:'text',text:prompt});
  let url,headers,body;
  if(nut.aiProvider==='openai'){
    url='https://api.openai.com/v1/chat/completions';
    headers={'Content-Type':'application/json','Authorization':`Bearer ${nut.aiApiKey}`};
    const msgs=[{role:'user',content:image
      ?[{type:'image_url',image_url:{url:`data:${image.mediaType};base64,${image.data}`}},{type:'text',text:prompt}]
      :prompt}];
    body=JSON.stringify({model:'gpt-4o',messages:msgs,max_tokens:1500});
  }else{
    url='https://api.anthropic.com/v1/messages';
    headers={'Content-Type':'application/json','x-api-key':nut.aiApiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-client-side-request-allowed':'true'};
    body=JSON.stringify({model:'claude-opus-4-5',max_tokens:1500,messages:[{role:'user',content}]});
  }
  const resp=await fetch(url,{method:'POST',headers,body});
  if(!resp.ok){const e=await resp.json();throw new Error(e.error?.message||`HTTP ${resp.status}`);}
  const data=await resp.json();
  const text=nut.aiProvider==='openai'?data.choices[0].message.content:data.content[0].text;
  const match=text.match(/\{[\s\S]*\}/);
  if(!match)throw new Error('La IA no devolvió JSON válido. Intenta con una imagen más clara.');
  return JSON.parse(match[0]);
}

/* ─── AI FULL ANALYSIS ───────────────────────────────────── */
async function getAIAnalysis() {
  if(!state.nutrition.aiApiKey){alert('⚠️ Configura tu API key primero (botón ⚙️ Configurar IA)');return;}
  const btn=el('btnGetAIAnalysis'),panel=el('aiAnalysisPanel');
  btn.disabled=true;btn.textContent='⏳ Analizando...';
  panel.innerHTML=`<div class="scanning-overlay"><div class="spin">🤖</div><div style="margin-top:8px">Generando análisis personalizado...</div></div>`;
  try{
    const avg7=k=>Math.round(nutAvg(7,k));
    const totToday=nutTodayTotals();const g=state.nutrition.goals;
    const supps=state.nutrition.supplements.map(s=>`- ${s.name}${s.brand?` (${s.brand})`:''}: ${Object.entries(s.nutrients||{}).filter(([,v])=>v>0).slice(0,6).map(([k,v])=>`${NUTRIENT_LABELS[k]?.split(' ')[0]||k}:${v}`).join(', ')}`).join('\n');
    const prompt=`Eres nutricionista experto. Analiza los datos del usuario y da recomendaciones personalizadas en español.

PERFIL DE SALUD:
${state.nutrition.healthProfile||'No especificado'}

DATOS DE HOY (${today()}):
Calorías: ${Math.round(totToday.cal)}/${g.calories} | Proteínas: ${Math.round(totToday.protein)}g/${g.protein}g | Carbos: ${Math.round(totToday.carbs)}g | Grasas: ${Math.round(totToday.fat)}g | Fibra: ${Math.round(totToday.fiber)}g

PROMEDIOS 7 DÍAS:
Cal: ${avg7('cal')} kcal | Prot: ${avg7('protein')}g | Carbs: ${avg7('carbs')}g | Grasas: ${avg7('fat')}g | Fibra: ${avg7('fiber')}g
Vit C: ${avg7('vitC')}mg | Vit D: ${avg7('vitD')}mcg | Calcio: ${avg7('calcium')}mg | Hierro: ${avg7('iron')}mg | Zinc: ${avg7('zinc')}mg | Omega-3: ${avg7('omega3')}mg

SUPLEMENTOS:
${supps||'Ninguno'}

Proporciona:
**1. Evaluación general** (estado nutricional en 2-3 frases)
**2. Fortalezas** (qué está haciendo bien, con datos)
**3. Deficiencias críticas** (nutrientes por debajo del rango óptimo)
**4. Excesos** (si hay algo en exceso)
**5. Acciones concretas** (3-5 cambios específicos con alimentos reales)
**6. Suplementos sugeridos** (basado en deficiencias)
**7. Meta esta semana** (un objetivo concreto y medible)

Sé específico, usa los números reales, adapta al perfil de salud. Tono motivador y directo.`;

    const nut=state.nutrition;
    const resp=await fetch(nut.aiProvider==='openai'?'https://api.openai.com/v1/chat/completions':'https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:nut.aiProvider==='openai'
        ?{'Content-Type':'application/json','Authorization':`Bearer ${nut.aiApiKey}`}
        :{'Content-Type':'application/json','x-api-key':nut.aiApiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-client-side-request-allowed':'true'},
      body:nut.aiProvider==='openai'
        ?JSON.stringify({model:'gpt-4o',messages:[{role:'user',content:prompt}],max_tokens:1400})
        :JSON.stringify({model:'claude-opus-4-5',max_tokens:1400,messages:[{role:'user',content:[{type:'text',text:prompt}]}]})
    });
    if(!resp.ok){const e=await resp.json();throw new Error(e.error?.message||`HTTP ${resp.status}`);}
    const data=await resp.json();
    const text=nut.aiProvider==='openai'?data.choices[0].message.content:data.content[0].text;
    const formatted=text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^(\d+\.)/gm,'<br>$1').replace(/^[-•]/gm,'<br>•');
    panel.innerHTML=`<div class="ai-bubble">${formatted}</div>
      <div class="text-xs text-muted" style="margin-top:6px;display:flex;justify-content:space-between">
        <span>📅 Generado: ${new Date().toLocaleString('es-ES')}</span>
        <span>🤖 ${nut.aiProvider==='openai'?'GPT-4o':'Claude Opus'}</span>
      </div>`;
    state.nutrition.aiHistory.unshift({date:today(),text:text.slice(0,300)});
    if(state.nutrition.aiHistory.length>20)state.nutrition.aiHistory.pop();
    saveState();
  }catch(e){
    panel.innerHTML=`<div style="color:var(--danger);padding:14px;border-radius:10px;background:var(--danger-soft)">❌ ${e.message}</div>`;
  }finally{btn.disabled=false;btn.textContent='✨ Analizar';}
}

/* ─── HEALTH PROFILE ─────────────────────────────────────── */
function editHealthProfile() {
  openModal('📋 Mi perfil de salud',`
    <div class="form-grid">
      <div class="help-text" style="background:var(--teal-soft);border-radius:8px;padding:10px;font-size:13px">
        Incluye: edad, peso, altura, objetivos, condiciones médicas, alergias, dieta actual, medicamentos, nivel de actividad. La IA usará esto en cada análisis para personalizar sus recomendaciones.
      </div>
      <div class="field"><label>Tu perfil de salud</label>
        <textarea id="f-health-profile" class="input" rows="8" placeholder="ej. Hombre, 35 años, 80kg, 1.78m. Objetivo: perder 5kg y ganar músculo. Sin alergias. Entreno 4x semana (fuerza). Deficiencia de vitamina D diagnosticada. Duermo 6-7h. Tomo metformina...">${state.nutrition.healthProfile||''}</textarea>
      </div>
    </div>`,
    ()=>{
      state.nutrition.healthProfile=el('f-health-profile').value.trim();
      const hpEl=el('healthProfileDisplay');
      if(hpEl)hpEl.textContent=state.nutrition.healthProfile||'Perfil no configurado';
      return true;
    });
}

/* ─── NUTRITION GOALS ────────────────────────────────────── */
function editNutritionGoals() {
  const g=state.nutrition.goals;
  openModal('⚙️ Metas nutricionales diarias',`
    <div class="form-grid">
      <div class="form-row">
        <div class="field"><label>🔥 Calorías (kcal)</label><input id="f-ng-cal" type="number" class="input" value="${g.calories}"></div>
        <div class="field"><label>💪 Proteínas (g)</label><input id="f-ng-protein" type="number" class="input" value="${g.protein}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>🌾 Carbohidratos (g)</label><input id="f-ng-carbs" type="number" class="input" value="${g.carbs}"></div>
        <div class="field"><label>🥑 Grasas (g)</label><input id="f-ng-fat" type="number" class="input" value="${g.fat}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>🌿 Fibra (g)</label><input id="f-ng-fiber" type="number" class="input" value="${g.fiber}"></div>
        <div class="field"><label>💧 Agua (ml)</label><input id="f-ng-water" type="number" class="input" value="${g.water||2500}"></div>
      </div>
    </div>`,
    ()=>{
      state.nutrition.goals={
        calories:Number(el('f-ng-cal').value)||2000,protein:Number(el('f-ng-protein').value)||150,
        carbs:Number(el('f-ng-carbs').value)||250,fat:Number(el('f-ng-fat').value)||65,
        fiber:Number(el('f-ng-fiber').value)||30,water:Number(el('f-ng-water').value)||2500,
      };return true;
    });
}

/* ─── API CONFIG ─────────────────────────────────────────── */
function configureApiModal() {
  openModal('⚙️ Configurar IA',`
    <div class="form-grid">
      <div class="help-text" style="background:var(--warning-soft);border-radius:8px;padding:10px;font-size:13px">
        🔐 Tu API key se guarda solo en tu navegador (localStorage). Nunca viaja a ningún servidor nuestro — va directamente a la API del proveedor que elijas.
      </div>
      <div class="field"><label>Proveedor</label>
        <select id="f-api-provider" class="input">
          <option value="anthropic" ${state.nutrition.aiProvider==='anthropic'?'selected':''}>Claude (Anthropic) — Recomendado para leer etiquetas</option>
          <option value="openai" ${state.nutrition.aiProvider==='openai'?'selected':''}>GPT-4o (OpenAI)</option>
        </select>
      </div>
      <div class="field"><label>API Key</label>
        <input id="f-api-key" type="password" class="input" value="${state.nutrition.aiApiKey||''}" placeholder="sk-ant-... ó sk-...">
      </div>
      <div class="help-text">🔑 Obtén tu key en: <strong>console.anthropic.com</strong> (Claude) o <strong>platform.openai.com</strong> (OpenAI)</div>
    </div>`,
    ()=>{
      state.nutrition.aiApiKey=el('f-api-key').value.trim();
      state.nutrition.aiProvider=el('f-api-provider').value;
      return true;
    });
}

/* ─── FILE HELPERS ───────────────────────────────────────── */
function fileToBase64(file){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=e=>resolve(e.target.result);r.onerror=reject;r.readAsDataURL(file);});
}

/* ═══════════════════════════════════════════════════════════
   NEW PAGE IMPLEMENTATIONS (replaces legacy render functions)
   These declarations come last, so they win for duplicates.
   ═══════════════════════════════════════════════════════════ */

/* ─── HÁBITOS (ciclos de 30 días desde el inicio de cada hábito) ── */
function renderHabits() {
  const mount = el('habitsMount');
  if (!mount) return;
  if (!state.habits) state.habits = { viewCycle: 0 };
  if (typeof state.habits.viewCycle !== 'number') state.habits.viewCycle = 0;
  const today_ = today();
  const todayDate = new Date(today_+'T00:00');
  const cycle = state.habits.viewCycle;
  const cycleStartDay = cycle * 30 + 1;       // e.g., 1, 31, 61
  const cycleEndDay = cycleStartDay + 29;     // e.g., 30, 60, 90

  const habits = (state.unifiedTasks || []).filter(t => t.repeat && t.repeat.type !== 'none');

  // Stats
  const totalPossibleToday = habits.filter(h => taskRunsOnDate(h, today_)).length;
  const completedToday = habits.filter(h => taskRunsOnDate(h, today_) && h.completionLog?.[today_]).length;
  const pctToday = totalPossibleToday > 0 ? Math.round((completedToday/totalPossibleToday)*100) : 0;

  let html = `
    <div class="habits-page-head">
      <div class="habits-month-nav">
        <button onclick="shiftHabitCycle(-1)" title="Ciclo anterior" ${cycle===0?'disabled style="opacity:.4;cursor:not-allowed"':''}>‹</button>
        <span class="habits-month-label">Días ${cycleStartDay}–${cycleEndDay}</span>
        <button onclick="shiftHabitCycle(1)" title="Ciclo siguiente">›</button>
      </div>
      <div class="row gap-sm">
        ${cycle !== 0 ? `<button class="btn btn-secondary btn-sm" onclick="state.habits.viewCycle=0;saveState();renderHabits()">Volver al ciclo 1</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="addHabitFromHabitsPage()">+ Nuevo hábito</button>
      </div>
    </div>

    <div class="habits-stats">
      <div class="habit-stat"><div class="habit-stat-value">${habits.length}</div><div class="habit-stat-label">Hábitos activos</div></div>
      <div class="habit-stat"><div class="habit-stat-value">${completedToday}/${totalPossibleToday}</div><div class="habit-stat-label">Cumplidos hoy</div></div>
      <div class="habit-stat"><div class="habit-stat-value">${pctToday}%</div><div class="habit-stat-label">% del día</div></div>
    </div>

    <div class="card">
      <div class="habits-grid-wrap">
  `;

  if (!habits.length) {
    html += `<div class="list-empty"><span class="big-emoji">🔁</span>Sin hábitos. Crea uno con "+ Nuevo hábito"<br><span class="text-xs text-muted">Cualquier tarea con repetición se vuelve hábito automáticamente</span></div>`;
  } else {
    const colStyle = `grid-template-columns: 220px repeat(30, 22px) 60px`;
    html += `<div class="habits-grid" style="${colStyle}">`;
    // Day number header
    html += `<div></div>`;
    for (let n = cycleStartDay; n <= cycleEndDay; n++) {
      html += `<div class="habits-day-num">${n}</div>`;
    }
    html += `<div class="habits-day-num" title="Racha actual">🔥</div>`;

    habits.forEach(h => {
      const startStr = h.date || h.createdAt || today_;
      const startDate = new Date(startStr + 'T00:00');
      const daysSinceStart = Math.floor((todayDate - startDate) / 86400000);
      const currentDayNum = daysSinceStart + 1;

      html += `<div class="habits-row-name" title="${escapeHtml(h.title)} · empezó ${fmt(startStr)}"><span class="dot" style="background:${h.area==='habits'?'var(--success)':'var(--primary)'}"></span>${escapeHtml(h.title)}<span class="text-xs text-muted" style="margin-left:6px;font-weight:500">D${Math.max(1,currentDayNum)}</span></div>`;

      for (let n = cycleStartDay; n <= cycleEndDay; n++) {
        // Day N for this habit = startDate + N - 1
        const d = new Date(startDate);
        d.setDate(d.getDate() + n - 1);
        const dateStr = d.toISOString().slice(0,10);
        const isFuture = d > todayDate;
        const isToday = dateStr === today_;
        const isBeforeStart = d < startDate;
        const done = !!(h.completionLog && h.completionLog[dateStr]);
        const cls = ['habits-cell'];
        if (done) cls.push('done');
        if (isToday) cls.push('today');
        if (isFuture) cls.push('future');
        if (isBeforeStart) cls.push('disabled');
        const onclick = !isFuture && !isBeforeStart ? `onclick="toggleHabitDay('${h.id}','${dateStr}')"` : '';
        const tooltip = isBeforeStart ? `Antes del inicio` : `Día ${n} · ${dateStr}`;
        html += `<button class="${cls.join(' ')}" ${onclick} title="${tooltip}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></button>`;
      }

      // Streak: consecutive completed days back from today
      let streak = 0;
      let cur = new Date(today_+'T00:00');
      for (let i = 0; i < 400; i++) {
        const s = cur.toISOString().slice(0,10);
        if (startStr && s < startStr) break;
        if (h.completionLog?.[s]) { streak++; cur.setDate(cur.getDate()-1); }
        else if (s === today_) { cur.setDate(cur.getDate()-1); }
        else break;
      }
      html += `<div class="habits-row-streak">${streak}</div>`;
    });

    html += `</div>`;
  }

  html += `</div></div>`;
  mount.innerHTML = html;
}

function shiftHabitCycle(delta) {
  state.habits = state.habits || { viewCycle: 0 };
  state.habits.viewCycle = Math.max(0, (state.habits.viewCycle || 0) + delta);
  saveState();
  renderHabits();
}

function toggleHabitDay(habitId, dateStr) {
  const h = state.unifiedTasks.find(t => t.id === habitId);
  if (!h) return;
  h.completionLog = h.completionLog || {};
  h.completionLog[dateStr] = !h.completionLog[dateStr];
  saveState();
  renderHabits();
}

function addHabitFromHabitsPage() {
  openTaskModal(null, 'habits');
  setTimeout(() => {
    if (window._taskDraft) {
      window._taskDraft.repeat = { type:'daily', days:[] };
      renderTaskModal();
    }
  }, 80);
}

/* ─── SALUD V2 (morning/evening routines + sleep) ───────── */
function renderHealth() {
  renderSyncedTasksPanel('health', 'healthSyncedTasks');
  renderRoutineList('morning', 'morningRoutineList');
  renderRoutineList('evening', 'eveningRoutineList');
  renderSleepLog();
}

function renderRoutineList(timeOfDay, mountId) {
  const subcategoryName = timeOfDay === 'morning' ? 'Rutina mañana' : 'Rutina noche';
  const mount = el(mountId);
  if (!mount) return;
  const d = getSelectedDate();
  const tasks = state.unifiedTasks.filter(t => t.area === 'health' && t.subcategory === subcategoryName && taskRunsOnDate(t, d))
    .sort((a,b) => (a.startTime||'').localeCompare(b.startTime||''));
  if (!tasks.length) {
    mount.innerHTML = `<div class="area-empty">Sin tareas. Toca + para agregar.</div>`;
    return;
  }
  mount.innerHTML = tasks.map(t => renderTaskRow(t, d, {hideSubcat:true})).join('');
}

function addRoutineStep(timeOfDay) {
  const subcategoryName = timeOfDay === 'morning' ? 'Rutina mañana' : 'Rutina noche';
  // Make sure subcategory exists in area
  const area = state.taskAreas.find(a => a.id === 'health');
  if (area) {
    area.subcategories = area.subcategories || [];
    if (!area.subcategories.includes(subcategoryName)) {
      area.subcategories.push(subcategoryName);
      saveState();
    }
  }
  openTaskModal(null, 'health');
  setTimeout(() => {
    if (window._taskDraft) {
      window._taskDraft.subcategory = subcategoryName;
      window._taskDraft.repeat = { type:'daily', days:[] };
      renderTaskModal();
    }
  }, 80);
}

function renderSleepLog() {
  const mount = el('sleepLogList');
  if (!mount) return;
  const logs = (state.sleepLog||[]).slice().sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 14);
  if (!logs.length) {
    mount.innerHTML = empty('😴','Sin registros de sueño aún.');
  } else {
    mount.innerHTML = logs.map(s => `
      <div class="sleep-row">
        <div class="sleep-hours">${s.hours}h</div>
        <div>
          <div style="font-weight:600">${fmt(s.date)}</div>
          ${s.notes ? `<div class="text-xs text-muted">${escapeHtml(s.notes)}</div>` : ''}
        </div>
        <div class="text-xs text-muted">${s.hours >= 7 ? '✅ Bien' : s.hours >= 6 ? '⚠ Mejorable' : '❌ Poco'}</div>
        <button class="icon-btn danger" onclick="deleteSleepLog('${s.id}')">✕</button>
      </div>
    `).join('');
  }
  const last7 = (state.sleepLog||[]).slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')).slice(-7);
  if (last7.length) {
    const labels = last7.map(s => new Date(s.date+'T00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric'}));
    const data = last7.map(s => Number(s.hours)||0);
    barChart('chartSleepLog', labels, [{label:'Horas dormidas', data, backgroundColor:'rgba(234,88,12,.5)', borderColor:'#EA580C', borderWidth:2, borderRadius:6}]);
  }
}

function addSleepLog() {
  openModal('😴 Registrar sueño', `
    <div class="form-grid">
      <div class="form-row">
        <div class="field"><label>Fecha</label><input id="f-sleep-date" type="date" class="input" value="${today()}"></div>
        <div class="field"><label>Horas dormidas</label><input id="f-sleep-hours" type="number" step="0.5" min="0" max="24" class="input" value="8"></div>
      </div>
      <div class="field"><label>Notas (opcional)</label><textarea id="f-sleep-notes" class="input" rows="2" placeholder="¿Cómo dormiste? Dificultades, sueños..."></textarea></div>
    </div>
  `, () => {
    const h = Number(el('f-sleep-hours').value);
    if (!h || h < 0) { alert('Pon una cantidad válida'); return false; }
    state.sleepLog = state.sleepLog || [];
    state.sleepLog.push({
      id: uid(),
      date: el('f-sleep-date').value || today(),
      hours: h,
      notes: el('f-sleep-notes').value.trim(),
    });
    return true;
  });
}

function deleteSleepLog(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  state.sleepLog = state.sleepLog.filter(s => s.id !== id);
  saveState();
  renderHealth();
}

function setHealthRoutine(timeOfDay) {
  if (!window._taskDraft) return;
  const name = timeOfDay === 'morning' ? 'Rutina mañana' : 'Rutina noche';
  window._taskDraft.subcategory = (window._taskDraft.subcategory === name) ? '' : name;
  // Ensure the subcategory exists in the health area
  const area = state.taskAreas.find(a => a.id === 'health');
  if (area && window._taskDraft.subcategory) {
    area.subcategories = area.subcategories || [];
    if (!area.subcategories.includes(name)) area.subcategories.push(name);
  }
  renderTaskModal();
}

/* ─── FINANZAS V2 (multi-account) ───────────────────────── */
function renderFinance() {
  const mount = el('financeMount');
  if (!mount) return;
  if (!state.financeV2) state.financeV2 = { accounts:[], transactions:[] };
  const accounts = state.financeV2.accounts;

  if (!accounts.length) {
    mount.innerHTML = `
      <div class="card mt-24">
        <div class="card-head"><div><h3 class="card-title">💰 Cuentas</h3><p class="card-sub">Crea tu primera cuenta para empezar</p></div></div>
        <button class="habits-add-btn" onclick="addFinanceAccountModal()">+ Crear primera cuenta</button>
      </div>`;
    return;
  }
  if (!state.financeV2.selectedAccountId || !accounts.find(a => a.id === state.financeV2.selectedAccountId)) {
    state.financeV2.selectedAccountId = accounts[0].id;
  }
  const selectedId = state.financeV2.selectedAccountId;
  const txs = state.financeV2.transactions.filter(t => t.accountId === selectedId);
  const income = txs.filter(t => t.kind === 'income' && (!t.dueDate || t.paid)).reduce((s,t) => s + Number(t.amount||0), 0);
  const expense = txs.filter(t => t.kind === 'expense' && (!t.dueDate || t.paid)).reduce((s,t) => s + Number(t.amount||0), 0);
  const balance = income - expense;
  const pendingTxs = txs.filter(t => t.dueDate && !t.paid).sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const recentTxs = txs.filter(t => !t.dueDate || t.paid).sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 30);
  const t = today();

  mount.innerHTML = `
    <div class="fin-accounts-tabs">
      ${accounts.map(a => {
        const acTxs = state.financeV2.transactions.filter(x => x.accountId === a.id);
        const acInc = acTxs.filter(x => x.kind === 'income' && (!x.dueDate || x.paid)).reduce((s,x) => s + Number(x.amount||0), 0);
        const acExp = acTxs.filter(x => x.kind === 'expense' && (!x.dueDate || x.paid)).reduce((s,x) => s + Number(x.amount||0), 0);
        const acBal = acInc - acExp;
        return `<button class="fin-tab ${a.id===selectedId?'active':''}" onclick="selectFinanceAccount('${a.id}')">
          <span>${a.icon||'💰'}</span> ${escapeHtml(a.name)}
          <span class="fin-tab-balance">$${Math.round(acBal).toLocaleString()}</span>
        </button>`;
      }).join('')}
      <button class="fin-tab" onclick="addFinanceAccountModal()">+ Cuenta</button>
    </div>

    <div class="fin-account-body">
      <div class="fin-summary">
        <div class="fin-summary-card income"><div class="label">Ingresos</div><div class="val">$${income.toLocaleString()}</div></div>
        <div class="fin-summary-card expense"><div class="label">Egresos</div><div class="val">$${expense.toLocaleString()}</div></div>
        <div class="fin-summary-card balance"><div class="label">Balance</div><div class="val ${balance>=0?'positive':'negative'}">$${balance.toLocaleString()}</div></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div><h3 class="card-title">📅 Pagos pendientes / recurrentes</h3><p class="card-sub">${pendingTxs.length} ${pendingTxs.length===1?'pago':'pagos'} por hacer · click "Marcar pagado" cuando lo hagas</p></div>
          <button class="btn btn-primary btn-sm" onclick="openFinanceTxModal('${selectedId}', 'scheduled')">+ Programar pago/cobro</button>
        </div>
        <div>
          ${pendingTxs.length ? pendingTxs.map(tx => {
            const overdue = tx.dueDate < t;
            return `<div class="fin-tx-row ${overdue?'overdue':''}">
              <div class="tx-icon pending">${tx.recurring ? '🔁' : '📅'}</div>
              <div>
                <div class="fin-tx-desc">${escapeHtml(tx.description)}</div>
                <div class="fin-tx-meta">Vence ${fmt(tx.dueDate)} ${overdue?'· ⚠ VENCIDO':''} ${tx.recurring?'· recurrente':''}</div>
              </div>
              <div class="fin-tx-amount ${tx.kind}">${tx.kind==='income'?'+':'-'}$${Number(tx.amount).toLocaleString()}</div>
              <div class="row gap-sm">
                <button class="btn btn-success btn-sm" onclick="markFinanceTxPaid('${tx.id}')">✓ Marcar pagado</button>
                <button class="icon-btn danger" onclick="deleteFinanceTx('${tx.id}')">✕</button>
              </div>
            </div>`;
          }).join('') : '<div class="area-empty">Sin pagos pendientes. Toca "+ Programar pago/cobro" para añadir uno.</div>'}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div><h3 class="card-title">💱 Movimientos ya hechos</h3><p class="card-sub">Ingresos cobrados y gastos pagados (últimos 30)</p></div>
          <div class="row gap-sm">
            <button class="btn btn-success btn-sm" onclick="openFinanceTxModal('${selectedId}', 'income')">+ Ingreso recibido</button>
            <button class="btn btn-danger btn-sm" onclick="openFinanceTxModal('${selectedId}', 'expense')">+ Gasto pagado</button>
          </div>
        </div>
        <div>
          ${recentTxs.length ? recentTxs.map(tx => `
            <div class="fin-tx-row">
              <div class="tx-icon ${tx.kind}">${tx.kind==='income'?'↑':'↓'}</div>
              <div>
                <div class="fin-tx-desc">${escapeHtml(tx.description)}</div>
                <div class="fin-tx-meta">${fmt(tx.date)} ${tx.category?'· '+escapeHtml(tx.category):''}</div>
              </div>
              <div class="fin-tx-amount ${tx.kind}">${tx.kind==='income'?'+':'-'}$${Number(tx.amount).toLocaleString()}</div>
              <button class="icon-btn danger" onclick="deleteFinanceTx('${tx.id}')">✕</button>
            </div>
          `).join('') : '<div class="area-empty">Sin movimientos. Toca + para agregar.</div>'}
        </div>
      </div>

      <div class="row" style="margin-top:6px;justify-content:flex-end">
        <button class="btn btn-secondary btn-sm" onclick="editFinanceAccountModal('${selectedId}')">⚙ Editar cuenta</button>
      </div>
    </div>
  `;
}

function selectFinanceAccount(id) {
  state.financeV2.selectedAccountId = id;
  saveState();
  renderFinance();
}

function addFinanceAccountModal() {
  openModal('💰 Nueva cuenta', `
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-acc-name" class="input" placeholder="ej. Personal, Familia, Tienda Online"></div>
      <div class="form-row">
        <div class="field"><label>Tipo</label>
          <select id="f-acc-type" class="input">
            <option value="personal">👤 Personal</option>
            <option value="family">👨‍👩‍👧 Familiar</option>
            <option value="business">💼 Negocio</option>
          </select>
        </div>
        <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-acc-icon" class="input" value="💰" maxlength="2" style="font-size:18px;text-align:center"></div>
      </div>
    </div>
  `, () => {
    const name = el('f-acc-name').value.trim();
    if (!name) { alert('Pon un nombre'); return false; }
    const acc = { id: uid(), name, type: el('f-acc-type').value, icon: el('f-acc-icon').value || '💰' };
    state.financeV2.accounts.push(acc);
    state.financeV2.selectedAccountId = acc.id;
    return true;
  });
}

function editFinanceAccountModal(id) {
  const acc = state.financeV2.accounts.find(a => a.id === id);
  if (!acc) return;
  openModal('⚙ Editar cuenta', `
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-eacc-name" class="input" value="${escapeHtml(acc.name)}"></div>
      <div class="form-row">
        <div class="field"><label>Tipo</label>
          <select id="f-eacc-type" class="input">
            <option value="personal" ${acc.type==='personal'?'selected':''}>👤 Personal</option>
            <option value="family" ${acc.type==='family'?'selected':''}>👨‍👩‍👧 Familiar</option>
            <option value="business" ${acc.type==='business'?'selected':''}>💼 Negocio</option>
          </select>
        </div>
        <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-eacc-icon" class="input" value="${acc.icon||'💰'}" maxlength="2" style="font-size:18px;text-align:center"></div>
      </div>
      <button class="btn btn-danger" onclick="deleteFinanceAccount('${id}')">🗑 Eliminar cuenta (y sus movimientos)</button>
    </div>
  `, () => {
    acc.name = el('f-eacc-name').value.trim() || acc.name;
    acc.type = el('f-eacc-type').value;
    acc.icon = el('f-eacc-icon').value || acc.icon;
    return true;
  });
}

function deleteFinanceAccount(id) {
  if (!confirm('¿Eliminar esta cuenta y TODOS sus movimientos?')) return;
  state.financeV2.accounts = state.financeV2.accounts.filter(a => a.id !== id);
  state.financeV2.transactions = state.financeV2.transactions.filter(t => t.accountId !== id);
  saveState();
  closeModal();
  renderFinance();
}

// New unified modal — mode: 'income' | 'expense' | 'scheduled'
function openFinanceTxModal(accountId, mode) {
  const isScheduled = mode === 'scheduled';
  const defaultKind = mode === 'income' ? 'income' : (mode === 'expense' ? 'expense' : 'expense');
  const title = isScheduled
    ? '📅 Programar pago / cobro'
    : (mode === 'income' ? '💚 Registrar ingreso recibido' : '💸 Registrar gasto pagado');
  const subtitle = isScheduled
    ? 'Este pago aún NO se ha hecho. Aparecerá en "Pagos pendientes" hasta que lo marques como pagado.'
    : 'Movimiento ya completado. Aparecerá en "Movimientos ya hechos" y afectará el balance al instante.';

  openModal(title, `
    <div class="form-grid">
      <div class="help-text" style="background:${isScheduled?'var(--warning-soft)':'var(--success-soft)'};border-radius:9px;padding:10px 12px;font-size:12.5px;color:var(--text-2);line-height:1.5">
        ${isScheduled?'⏱':'✓'} ${subtitle}
      </div>
      <div class="field"><label>Descripción</label><input id="f-tx-desc" class="input" placeholder="ej. Renta, Sueldo, Cliente X..."></div>
      <div class="form-row">
        <div class="field"><label>Monto</label><input id="f-tx-amount" type="number" step="0.01" min="0" class="input"></div>
        <div class="field"><label>Tipo</label>
          <select id="f-tx-kind" class="input">
            <option value="income" ${defaultKind==='income'?'selected':''}>💚 Ingreso (entra dinero)</option>
            <option value="expense" ${defaultKind==='expense'?'selected':''}>💸 Gasto (sale dinero)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>${isScheduled?'Fecha de vencimiento':'Fecha del movimiento'}</label><input id="f-tx-date" type="date" class="input" value="${today()}"></div>
        <div class="field"><label>Categoría (opcional)</label><input id="f-tx-cat" class="input" placeholder="ej. Comida, Renta..."></div>
      </div>
      ${isScheduled ? `<label class="row gap-sm" style="margin-top:4px;font-size:13px;color:var(--text-2)"><input type="checkbox" id="f-tx-recurring"> <span>🔁 Pago recurrente cada mes (al marcar pagado se genera automáticamente el del mes siguiente)</span></label>` : ''}
    </div>
  `, () => {
    const desc = el('f-tx-desc').value.trim();
    const amount = Number(el('f-tx-amount').value);
    if (!desc) { alert('⚠️ Pon una descripción'); return false; }
    if (!amount || amount <= 0) { alert('⚠️ Pon un monto válido'); return false; }
    const tx = {
      id: uid(), accountId,
      kind: el('f-tx-kind').value,
      description: desc, amount,
      category: el('f-tx-cat').value.trim(),
    };
    if (isScheduled) {
      tx.dueDate = el('f-tx-date').value;
      tx.recurring = el('f-tx-recurring').checked;
      tx.paid = false;     // ← explícitamente no pagado
    } else {
      tx.date = el('f-tx-date').value;
      tx.paid = true;       // ← ya hecho
    }
    state.financeV2.transactions.push(tx);
    return true;
  });
}

// Backwards-compat alias for any orphan calls
function addFinanceTransactionModal(accountId, isPending, defaultKind) {
  openFinanceTxModal(accountId, isPending ? 'scheduled' : (defaultKind || 'expense'));
}

function markFinanceTxPaid(id) {
  const tx = state.financeV2.transactions.find(x => x.id === id);
  if (!tx) return;
  tx.paid = true;
  tx.date = today();
  if (tx.recurring) {
    const nextDate = new Date(tx.dueDate + 'T00:00');
    nextDate.setMonth(nextDate.getMonth() + 1);
    state.financeV2.transactions.push({
      id: uid(), accountId: tx.accountId, kind: tx.kind, description: tx.description,
      amount: tx.amount, category: tx.category,
      dueDate: nextDate.toISOString().slice(0,10),
      recurring: true, paid: false,
    });
  }
  saveState();
  renderFinance();
}

function deleteFinanceTx(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  state.financeV2.transactions = state.financeV2.transactions.filter(t => t.id !== id);
  saveState();
  renderFinance();
}

/* ─── METAS V2 ──────────────────────────────────────────── */
function renderGoals() {
  const mount = el('goalsGrid');
  if (!mount) return;
  const goals = state.goals || [];
  mount.innerHTML = `
    <div class="goals-grid-wrap">
      ${goals.map(g => {
        // Compute progress: average if both, otherwise the one set, otherwise simple done/not
        let amountPct = (g.hasAmount && g.targetAmount > 0) ? Math.min(100, (g.currentAmount/g.targetAmount)*100) : null;
        let countPct  = (g.hasCount  && g.targetCount  > 0) ? Math.min(100, (g.currentCount /g.targetCount )*100) : null;
        let pct;
        if (amountPct !== null && countPct !== null) pct = Math.round((amountPct + countPct)/2);
        else if (amountPct !== null) pct = Math.round(amountPct);
        else if (countPct !== null) pct = Math.round(countPct);
        else pct = g.done ? 100 : 0;

        const today_ = today();
        let dueText = '', statusBadge = '';
        if (g.done) { dueText = '✓ Completada'; statusBadge = '<span class="goal-status ontrack">✓ Completada</span>'; }
        else if (g.dueDate) {
          const days = Math.ceil((new Date(g.dueDate) - new Date(today_)) / 86400000);
          if (days < 0) { dueText = `📅 Vencida hace ${-days}d`; statusBadge = '<span class="goal-status late">Vencida</span>'; }
          else { dueText = `📅 Faltan ${days}d`; statusBadge = '<span class="goal-status ontrack">En curso</span>'; }
        }
        const cover = g.cover ? `background-image:url('${g.cover}');background-size:cover;background-position:center` : '';
        const progressLines = [];
        if (g.hasAmount) progressLines.push(`<span class="text-xs">💰 ${g.currentAmount||0}/${g.targetAmount||0} ${escapeHtml(g.amountUnit||'')}</span>`);
        if (g.hasCount)  progressLines.push(`<span class="text-xs">🔢 ${g.currentCount||0}/${g.targetCount||0} ${escapeHtml(g.countUnit||'')}</span>`);
        return `<div class="goal-card-v2" onclick="editGoalModal('${g.id}')">
          <div class="goal-cover" style="${cover}">
            ${!g.cover ? (g.icon||'🎯') : ''}
            ${statusBadge}
          </div>
          <div class="goal-body-v2">
            <div class="goal-due ${dueText.includes('Vencida')?'overdue':''}">${dueText}</div>
            <div class="goal-title-v2">${escapeHtml(g.title)}</div>
            ${g.description ? `<div class="text-xs text-muted">${escapeHtml(g.description).slice(0,80)}${g.description.length>80?'…':''}</div>` : ''}
            <div class="progress" style="margin-top:8px;height:6px"><div class="progress-bar" style="width:${pct}%"></div></div>
            <div class="goal-progress-row">
              <span>Progreso</span>
              <span class="goal-progress-val">${pct}%</span>
            </div>
            ${progressLines.length?`<div style="display:flex;gap:10px;color:var(--text-2);font-weight:600;margin-top:2px">${progressLines.join('')}</div>`:''}
          </div>
        </div>`;
      }).join('')}
      <div class="goal-card-v2 goal-add-card" onclick="addGoalModal()">
        <div>+ Nueva meta</div>
      </div>
    </div>
  `;
}

function addGoalModal() { editGoalModal(null); }
function editGoalModal(id) {
  const isEdit = !!id;
  const g = isEdit ? state.goals.find(x => x.id === id) : {
    id: uid(), title:'', description:'', cover:'', icon:'🎯',
    dueDate: '',
    hasAmount: false, targetAmount: 0, currentAmount: 0, amountUnit: 'US$',
    hasCount: false, targetCount: 0, currentCount: 0, countUnit: 'veces',
    done:false,
  };
  if (!g) return;
  // Backwards compat: migrate old type field to new flags
  if (g.type && !g.hasAmount && !g.hasCount) {
    if (g.type === 'amount') { g.hasAmount = true; g.targetAmount = g.target||0; g.currentAmount = g.current||0; g.amountUnit = g.unit||'US$'; }
    if (g.type === 'count')  { g.hasCount = true;  g.targetCount  = g.target||0; g.currentCount  = g.current||0; g.countUnit  = g.unit||'veces'; }
  }
  // Linked tasks for the linked tasks section
  const linked = isEdit ? state.unifiedTasks.filter(t => t.goalId === g.id) : [];

  openModal(isEdit ? '✏ Editar meta' : '+ Nueva meta', `
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-goal-title" class="input" value="${escapeHtml(g.title)}" placeholder="ej. Ahorrar para viaje, Leer 12 libros..."></div>
      <div class="field"><label>Descripción / detalle</label><textarea id="f-goal-desc" class="input" rows="2">${escapeHtml(g.description||'')}</textarea></div>

      <div class="field"><label>Imagen de portada</label>
        <div class="row gap-sm" style="align-items:center">
          <div id="goal-cover-preview" style="width:80px;height:80px;border-radius:10px;background-size:cover;background-position:center;background-color:var(--surface-2);background-image:${g.cover?`url('${g.cover}')`:'none'};display:grid;place-items:center;color:var(--text-3);font-size:24px;border:1px solid var(--border)">${g.cover?'':(g.icon||'🎯')}</div>
          <div style="flex:1">
            <input type="file" id="f-goal-cover-file" accept="image/*" style="display:none" onchange="handleGoalCoverUpload(event)">
            <button class="btn btn-secondary btn-sm" onclick="el('f-goal-cover-file').click()">📷 Subir desde dispositivo</button>
            <input id="f-goal-cover-url" class="input" value="${escapeHtml(g.cover||'')}" placeholder="o pega URL de imagen" style="margin-top:6px" oninput="el('goal-cover-preview').style.backgroundImage = this.value ? \`url('\${this.value}')\` : 'none'; el('goal-cover-preview').textContent = this.value ? '' : (el('f-goal-icon').value||'🎯')">
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-goal-icon" class="input" value="${g.icon||'🎯'}" maxlength="2" style="font-size:18px;text-align:center" oninput="if(!el('f-goal-cover-url').value) el('goal-cover-preview').textContent = this.value"></div>
        <div class="field"><label>Fecha límite</label><input id="f-goal-due" type="date" class="input" value="${g.dueDate||''}"></div>
      </div>

      <div class="field">
        <label>¿Qué quieres medir? (puedes elegir uno, ambos o ninguno)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
          <div style="border:1px solid var(--border);border-radius:10px;padding:12px">
            <label class="row gap-sm" style="font-weight:700"><input type="checkbox" id="f-goal-has-amount" ${g.hasAmount?'checked':''} onchange="toggleGoalAmountFields(this.checked)"> 💰 Monto</label>
            <div id="goal-amount-fields" style="margin-top:8px;${g.hasAmount?'':'display:none'}">
              <div class="form-row">
                <div class="field"><label>Meta</label><input id="f-goal-target-amt" type="number" step="0.01" class="input" value="${g.targetAmount||0}"></div>
                <div class="field"><label>Avance</label><input id="f-goal-current-amt" type="number" step="0.01" class="input" value="${g.currentAmount||0}"></div>
              </div>
              <input id="f-goal-unit-amt" class="input" value="${g.amountUnit||'US$'}" placeholder="US$, EUR..." style="margin-top:6px">
            </div>
          </div>
          <div style="border:1px solid var(--border);border-radius:10px;padding:12px">
            <label class="row gap-sm" style="font-weight:700"><input type="checkbox" id="f-goal-has-count" ${g.hasCount?'checked':''} onchange="toggleGoalCountFields(this.checked)"> 🔢 Conteo / repeticiones</label>
            <div id="goal-count-fields" style="margin-top:8px;${g.hasCount?'':'display:none'}">
              <div class="form-row">
                <div class="field"><label>Meta</label><input id="f-goal-target-cnt" type="number" class="input" value="${g.targetCount||0}"></div>
                <div class="field"><label>Avance</label><input id="f-goal-current-cnt" type="number" class="input" value="${g.currentCount||0}"></div>
              </div>
              <input id="f-goal-unit-cnt" class="input" value="${g.countUnit||'veces'}" placeholder="veces, libros..." style="margin-top:6px">
            </div>
          </div>
        </div>
      </div>

      ${isEdit ? `
        <label class="row gap-sm"><input type="checkbox" id="f-goal-done" ${g.done?'checked':''}> <span>Marcar como completada</span></label>
        ${linked.length ? `
          <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:6px">
            <div style="font-size:11px;font-weight:800;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Tareas vinculadas (${linked.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${linked.map(t => {
                const stats = computeTaskStats(t);
                return `<div style="background:var(--surface-2);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:13px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600">${(t.repeat&&t.repeat.type!=='none')?'🔁 ':''}${escapeHtml(t.title)}</div>
                    <div class="text-xs text-muted">${stats.completedDays}/${stats.totalDays} cumplidas · ${stats.consistencyPct}% consistencia${stats.totalMinutes?' · '+formatMinutes(stats.totalMinutes):''}</div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : `<div class="text-xs text-muted" style="border-top:1px solid var(--border);padding-top:14px;margin-top:6px">Aún no has vinculado tareas. Cuando crees una tarea en Centro de control, usa el chip 🎯 para enlazarla a esta meta.</div>`}
        <button class="btn btn-danger" onclick="deleteGoalAndClose('${g.id}')">🗑 Eliminar meta</button>
      ` : ''}
    </div>
  `, () => {
    const title = el('f-goal-title').value.trim();
    if (!title) { alert('Pon un título'); return false; }
    g.title = title;
    g.description = el('f-goal-desc').value.trim();
    g.cover = el('f-goal-cover-url').value.trim();
    g.icon = el('f-goal-icon').value || '🎯';
    g.dueDate = el('f-goal-due').value;
    g.hasAmount = el('f-goal-has-amount').checked;
    g.hasCount = el('f-goal-has-count').checked;
    if (g.hasAmount) {
      g.targetAmount = Number(el('f-goal-target-amt').value) || 0;
      g.currentAmount = Number(el('f-goal-current-amt').value) || 0;
      g.amountUnit = el('f-goal-unit-amt').value.trim() || 'US$';
    }
    if (g.hasCount) {
      g.targetCount = Number(el('f-goal-target-cnt').value) || 0;
      g.currentCount = Number(el('f-goal-current-cnt').value) || 0;
      g.countUnit = el('f-goal-unit-cnt').value.trim() || 'veces';
    }
    if (isEdit) g.done = el('f-goal-done').checked;
    if (!isEdit) state.goals.push(g);
    return true;
  });
}

function handleGoalCoverUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  // Validate size — max 2MB
  if (f.size > 2 * 1024 * 1024) { alert('La imagen es muy grande (máx 2MB). Comprímela o usa una URL.'); return; }
  fileToBase64(f).then(dataUrl => {
    el('f-goal-cover-url').value = dataUrl;
    el('goal-cover-preview').style.backgroundImage = `url('${dataUrl}')`;
    el('goal-cover-preview').textContent = '';
  });
}

function toggleGoalAmountFields(on) {
  const f = el('goal-amount-fields');
  if (f) f.style.display = on ? '' : 'none';
}
function toggleGoalCountFields(on) {
  const f = el('goal-count-fields');
  if (f) f.style.display = on ? '' : 'none';
}

function deleteGoalAndClose(id) {
  if (!confirm('¿Eliminar esta meta?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  closeModal();
  renderPage('goals');
}

/* ─── APRENDIZAJE V2 (topics + time tracking) ───────────── */
function renderLearning() {
  const mount = el('learningMount');
  if (!mount) return;
  if (!state.learningV2) state.learningV2 = { topics:[], sessions:[] };
  const topics = state.learningV2.topics || [];
  const sessions = state.learningV2.sessions || [];
  const today_ = today();

  mount.innerHTML = `
    <div class="card mt-24">
      <div class="card-head">
        <div><h3 class="card-title">📚 Mis temas de estudio</h3><p class="card-sub">Cada tema acumula tu tiempo invertido</p></div>
        <button class="btn btn-primary btn-sm" onclick="addLearningTopicModal()">+ Nuevo tema</button>
      </div>
      ${topics.length ? `
        <div class="lrn-topics" style="margin-top:14px">
          ${topics.map(tp => {
            const topicMin = sessions.filter(s => s.topicId === tp.id).reduce((a,s)=>a+Number(s.minutes||0),0);
            const todayMin = sessions.filter(s => s.topicId === tp.id && s.date === today_).reduce((a,s)=>a+Number(s.minutes||0),0);
            const sessCount = sessions.filter(s => s.topicId === tp.id).length;
            // Bar shows accumulated time relative to the most-studied topic (visual comparison)
            const maxMin = Math.max(60, ...topics.map(x => sessions.filter(s => s.topicId === x.id).reduce((a,s)=>a+Number(s.minutes||0),0)));
            const pct = (topicMin/maxMin)*100;
            return `<div class="lrn-topic-card">
              <div class="lrn-topic-head">
                <div class="lrn-topic-name"><span>${tp.icon||'📖'}</span> ${escapeHtml(tp.name)}</div>
                <button class="icon-btn danger" onclick="event.stopPropagation();deleteLearningTopic('${tp.id}')">✕</button>
              </div>
              <div class="lrn-topic-time-bar"><div style="width:${pct}%;background:${tp.color||'#EA580C'}"></div></div>
              <div class="lrn-topic-meta">
                <span><strong>${formatMinutes(topicMin)}</strong> acumulado</span>
                <span>${sessCount} ${sessCount===1?'sesión':'sesiones'}</span>
              </div>
              ${todayMin > 0 ? `<div class="text-xs" style="color:var(--success-2);margin-top:4px;font-weight:700">✓ Hoy: ${formatMinutes(todayMin)}</div>` : ''}
              <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:10px" onclick="logLearningSession('${tp.id}')">+ Registrar sesión</button>
            </div>`;
          }).join('')}
        </div>
      ` : '<div class="list-empty" style="margin-top:14px"><span class="big-emoji">📚</span>Sin temas. Crea tu primero para empezar a registrar tiempo.</div>'}
    </div>

    <div class="card mt-24">
      <div class="card-head"><div><h3 class="card-title">📅 Consistencia de aprendizaje</h3><p class="card-sub">Cada celda verde = sesión de estudio ese día</p></div></div>
      <div id="learningHeatmapMount"></div>
    </div>
  `;
  renderLearningHeatmap('learningHeatmapMount');
}

function addLearningTopicModal() {
  openModal('+ Nuevo tema de estudio', `
    <div class="form-grid">
      <div class="field"><label>Nombre del tema</label><input id="f-tp-name" class="input" placeholder="ej. JavaScript, IA, Neurociencia..."></div>
      <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-tp-icon" class="input" value="📖" maxlength="2" style="font-size:18px;text-align:center"></div>
    </div>
  `, () => {
    const name = el('f-tp-name').value.trim();
    if (!name) { alert('Pon un nombre'); return false; }
    state.learningV2.topics.push({
      id: uid(), name,
      icon: el('f-tp-icon').value || '📖',
      color: '#EA580C',
    });
    return true;
  });
}

function deleteLearningTopic(id) {
  if (!confirm('¿Eliminar este tema? Sus sesiones también se eliminan.')) return;
  state.learningV2.topics = state.learningV2.topics.filter(t => t.id !== id);
  state.learningV2.sessions = state.learningV2.sessions.filter(s => s.topicId !== id);
  saveState();
  renderLearning();
}

function logLearningSession(topicId) {
  openModal('⏱ Registrar sesión de estudio', `
    <div class="form-grid">
      <div class="form-row">
        <div class="field"><label>Fecha</label><input id="f-lrn-date" type="date" class="input" value="${today()}"></div>
        <div class="field"><label>Minutos</label><input id="f-lrn-min" type="number" min="1" class="input" value="30"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><textarea id="f-lrn-note" class="input" rows="2" placeholder="¿Qué estudiaste?"></textarea></div>
    </div>
  `, () => {
    const min = Number(el('f-lrn-min').value);
    if (!min || min <= 0) { alert('Pon minutos válidos'); return false; }
    state.learningV2.sessions.push({
      id: uid(), topicId,
      date: el('f-lrn-date').value || today(),
      minutes: min,
      note: el('f-lrn-note').value.trim(),
    });
    return true;
  });
}

function renderLearningHeatmap(mountId) {
  const sessions = state.learningV2.sessions || [];
  const byDate = {};
  sessions.forEach(s => {
    byDate[s.date] = (byDate[s.date]||0) + Math.max(1, Math.floor(Number(s.minutes||0)/30));  // 30+ min counts as more intense
  });
  renderHeatmapGrid(mountId, byDate, (d, count, future) => {
    const totalMin = sessions.filter(s => s.date === d.toISOString().slice(0,10)).reduce((a,s)=>a+Number(s.minutes||0),0);
    return future ? d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})
           : `${d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})} — ${totalMin?totalMin+'min':'sin sesión'}`;
  });
}

/* ─── AGENDA V2 (today's tasks + pomodoro) ──────────────── */
function renderTime() {
  const mount = el('agendaMount');
  if (!mount) return;
  const t = today();
  const allToday = state.unifiedTasks.filter(task => taskRunsOnDate(task, t));
  const prios = state.time.priorities[t] || [];
  const prioIds = new Set(prios.map(p => p.taskId).filter(Boolean));

  const completedTasks = allToday.filter(task => isTaskDone(task, t));
  const todoTasks = allToday.filter(task => !isTaskDone(task, t) && !prioIds.has(task.id));
  const priorityTasks = prios.map(p => state.unifiedTasks.find(x => x.id === p.taskId)).filter(Boolean);

  mount.innerHTML = `
    <div class="card mt-24">
      <div class="card-head">
        <div><h3 class="card-title">📋 Tu día — ${new Date(t+'T00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</h3>
        <p class="card-sub">Arrastra tareas a "Prioridades" o marca el check para terminarlas</p></div>
      </div>
      <div class="agenda-cols">
        <div class="agenda-col">
          <div class="agenda-col-head">📋 Por hacer <span class="count">${todoTasks.length}</span></div>
          <div class="agenda-col-drop" data-col="todo" ondragover="event.preventDefault();this.classList.add('drop-over')" ondragleave="this.classList.remove('drop-over')" ondrop="dropAgendaTask(event,'todo')">
            ${todoTasks.map(task => renderAgendaTask(task, t)).join('') || '<div class="text-xs text-muted" style="padding:8px;text-align:center">Sin pendientes</div>'}
          </div>
        </div>
        <div class="agenda-col">
          <div class="agenda-col-head">⭐ Prioridades hoy <span class="count">${priorityTasks.length}</span></div>
          <div class="agenda-col-drop" data-col="priority" ondragover="event.preventDefault();this.classList.add('drop-over')" ondragleave="this.classList.remove('drop-over')" ondrop="dropAgendaTask(event,'priority')">
            ${priorityTasks.map(task => renderAgendaTask(task, t)).join('') || '<div class="text-xs text-muted" style="padding:8px;text-align:center">Arrastra aquí lo importante</div>'}
          </div>
        </div>
        <div class="agenda-col">
          <div class="agenda-col-head">✅ Terminado <span class="count">${completedTasks.length}</span></div>
          <div class="agenda-col-drop" data-col="done" ondragover="event.preventDefault();this.classList.add('drop-over')" ondragleave="this.classList.remove('drop-over')" ondrop="dropAgendaTask(event,'done')">
            ${completedTasks.map(task => renderAgendaTask(task, t)).join('') || '<div class="text-xs text-muted" style="padding:8px;text-align:center">Aún nada</div>'}
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-24">
      <div class="card-head"><div><h3 class="card-title">🍅 Pomodoro</h3><p class="card-sub">Configura la duración y enfoca</p></div></div>
      <div id="pomodoroInline"></div>
    </div>
  `;
  renderPomodoroInline();
}

function renderAgendaTask(task, dateStr) {
  const done = isTaskDone(task, dateStr);
  const overdue = !done && isTaskOverdue(task, dateStr);
  return `<div class="agenda-task ${done?'done':''} ${overdue?'overdue':''}" draggable="true" data-task-id="${task.id}" ondragstart="event.dataTransfer.setData('text/plain',this.dataset.taskId);this.classList.add('dragging')" ondragend="this.classList.remove('dragging')">
    <button class="check ${done?'checked':''}" onclick="event.stopPropagation();toggleTaskDone('${task.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <div class="title">${escapeHtml(task.title)}</div>
  </div>`;
}

function dropAgendaTask(e, col) {
  e.preventDefault();
  qsa('.agenda-col-drop').forEach(d => d.classList.remove('drop-over'));
  const taskId = e.dataTransfer.getData('text/plain');
  const task = state.unifiedTasks.find(t => t.id === taskId);
  if (!task) return;
  const t = today();

  if (col === 'priority') {
    if (!state.time.priorities[t]) state.time.priorities[t] = [];
    if (!state.time.priorities[t].find(p => p.taskId === taskId)) {
      state.time.priorities[t].push({ taskId, text: task.title, done: false });
    }
    if (isTaskDone(task, t)) {
      // Un-complete it
      if (task.repeat?.type !== 'none') task.completionLog[t] = false;
      else task.done = false;
    }
  } else if (col === 'todo') {
    if (state.time.priorities[t]) {
      state.time.priorities[t] = state.time.priorities[t].filter(p => p.taskId !== taskId);
    }
    if (isTaskDone(task, t)) {
      if (task.repeat?.type !== 'none') task.completionLog[t] = false;
      else task.done = false;
    }
  } else if (col === 'done') {
    if (!isTaskDone(task, t)) {
      if (task.repeat && task.repeat.type !== 'none') {
        task.completionLog = task.completionLog || {};
        task.completionLog[t] = true;
      } else {
        task.done = true;
      }
    }
  }
  saveState();
  renderPage(currentPage);
}

/* ─── POMODORO INLINE (replaces floating widget) ────────── */
let _pomoInterval = null;
window._pomoState = { running:false, mode:'work', secondsLeft:25*60 };

function renderPomodoroInline() {
  const mount = el('pomodoroInline');
  if (!mount) return;
  if (!state.agenda) state.agenda = { pomodoroSettings: { duration:25, breakDuration:5 } };
  const s = window._pomoState;
  const settings = state.agenda.pomodoroSettings;
  const totalSec = (s.mode === 'work' ? settings.duration : settings.breakDuration) * 60;
  const pct = totalSec > 0 ? Math.min(100, ((totalSec - s.secondsLeft) / totalSec) * 100) : 0;
  const min = Math.floor(s.secondsLeft / 60);
  const sec = s.secondsLeft % 60;
  mount.innerHTML = `
    <div class="pomo-inline">
      <div class="pomo-circle" style="--pct:${pct}%">
        <div class="pomo-circle-content">
          <div class="pomo-time-big">${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
          <div class="pomo-label-small">${s.mode==='work'?'Trabajo enfocado':'Descanso'}</div>
        </div>
      </div>
      <div class="pomo-controls">
        ${s.running
          ? `<button class="pomo-btn pause" onclick="pausePomo()">⏸</button>`
          : `<button class="pomo-btn play" onclick="startPomo()">▶</button>`}
        <button class="pomo-btn stop" onclick="resetPomo()">⏹</button>
      </div>
      <div class="pomo-settings">
        Trabajo:
        <input type="number" id="pomoWorkInput" min="1" max="180" value="${settings.duration}" onchange="updatePomoSettings()">min
        ·
        Descanso:
        <input type="number" id="pomoBreakInput" min="1" max="60" value="${settings.breakDuration}" onchange="updatePomoSettings()">min
      </div>
    </div>
  `;
}

function updatePomoSettings() {
  state.agenda.pomodoroSettings.duration = Number(el('pomoWorkInput').value) || 25;
  state.agenda.pomodoroSettings.breakDuration = Number(el('pomoBreakInput').value) || 5;
  saveState();
  if (!window._pomoState.running) {
    window._pomoState.secondsLeft = state.agenda.pomodoroSettings.duration * 60;
    window._pomoState.mode = 'work';
  }
  renderPomodoroInline();
}

function startPomo() {
  if (window._pomoState.running) return;
  if (window._pomoState.secondsLeft <= 0) {
    window._pomoState.secondsLeft = state.agenda.pomodoroSettings.duration * 60;
  }
  window._pomoState.running = true;
  if (_pomoInterval) clearInterval(_pomoInterval);
  _pomoInterval = setInterval(() => {
    window._pomoState.secondsLeft--;
    if (window._pomoState.secondsLeft <= 0) {
      window._pomoState.running = false;
      clearInterval(_pomoInterval);
      if (window._pomoState.mode === 'work') {
        window._pomoState.mode = 'break';
        window._pomoState.secondsLeft = state.agenda.pomodoroSettings.breakDuration * 60;
        setTimeout(() => alert('🎉 ¡Sesión completada! Toca ▶ para empezar el descanso.'), 100);
      } else {
        window._pomoState.mode = 'work';
        window._pomoState.secondsLeft = state.agenda.pomodoroSettings.duration * 60;
        setTimeout(() => alert('🍅 ¡Descanso terminado! Toca ▶ para volver al trabajo.'), 100);
      }
    }
    renderPomodoroInline();
  }, 1000);
  renderPomodoroInline();
}

function pausePomo() {
  window._pomoState.running = false;
  if (_pomoInterval) { clearInterval(_pomoInterval); _pomoInterval = null; }
  renderPomodoroInline();
}

function resetPomo() {
  window._pomoState.running = false;
  if (_pomoInterval) { clearInterval(_pomoInterval); _pomoInterval = null; }
  window._pomoState.mode = 'work';
  window._pomoState.secondsLeft = (state.agenda?.pomodoroSettings?.duration || 25) * 60;
  renderPomodoroInline();
}

/* ═══════════════════════════════════════════════════════════
   NIVEL DE CONCIENCIA · Dr. David R. Hawkins
   ═══════════════════════════════════════════════════════════ */
const HAWKINS_SCALE = [
  // High vibration (≥200 = integrity)
  { level:1000, name:'Iluminación', emotion:'Inefable',     process:'Ser puro',      color:'#FFFFFF', textColor:'#000' },
  { level:700,  name:'Iluminación', emotion:'Inefable',     process:'Pura conciencia', color:'#F5F5F5', textColor:'#000' },
  { level:600,  name:'Paz',         emotion:'Bienaventuranza', process:'Iluminación',   color:'#FEF3C7' },
  { level:540,  name:'Alegría',     emotion:'Serenidad',    process:'Transfiguración',  color:'#FDE68A' },
  { level:500,  name:'Amor',        emotion:'Reverencia',   process:'Revelación',       color:'#A7F3D0' },
  { level:400,  name:'Razón',       emotion:'Comprensión',  process:'Abstracción',      color:'#86EFAC' },
  { level:350,  name:'Aceptación',  emotion:'Perdón',       process:'Trascendencia',    color:'#6EE7B7' },
  { level:310,  name:'Voluntad',    emotion:'Optimismo',    process:'Intención',        color:'#5EEAD4' },
  { level:250,  name:'Neutralidad', emotion:'Confianza',    process:'Liberación',       color:'#67E8F9' },
  { level:200,  name:'Coraje',      emotion:'Afirmación',   process:'Empoderamiento',   color:'#7DD3FC', isThreshold:true },
  // Below 200 = destructive
  { level:175,  name:'Orgullo',     emotion:'Desprecio',    process:'Inflación del ego', color:'#FCD34D' },
  { level:150,  name:'Ira',         emotion:'Odio',         process:'Agresión',          color:'#FB923C' },
  { level:125,  name:'Deseo',       emotion:'Anhelo',       process:'Esclavitud',        color:'#F87171' },
  { level:100,  name:'Miedo',       emotion:'Ansiedad',     process:'Aislamiento',       color:'#EF4444' },
  { level:75,   name:'Pena',        emotion:'Arrepentimiento', process:'Desaliento',     color:'#B91C1C', textColor:'#fff' },
  { level:50,   name:'Apatía',      emotion:'Desesperación', process:'Renuncia',         color:'#7F1D1D', textColor:'#fff' },
  { level:30,   name:'Culpa',       emotion:'Acusación',    process:'Destrucción',       color:'#451A03', textColor:'#fff' },
  { level:20,   name:'Vergüenza',   emotion:'Humillación',  process:'Eliminación',       color:'#1C1917', textColor:'#fff' },
];

function getHawkinsLevel(level) {
  return HAWKINS_SCALE.find(x => x.level === level) || HAWKINS_SCALE[HAWKINS_SCALE.length-1];
}

function renderConsciousness() {
  const mount = el('consciousnessMount');
  if (!mount) return;
  if (!state.consciousness) state.consciousness = { logs: [] };
  const logs = state.consciousness.logs || [];
  const hasLogs = logs.length > 0;

  let html = `
    <div class="grid-2 mt-24">
      <div class="card">
        <div class="card-head"><div><h3 class="card-title">📈 Fluctuación de tu vibración</h3><p class="card-sub">Cómo se mueve tu nivel de conciencia día a día</p></div></div>
        <div class="chart-wrap" style="height:260px"><canvas id="chartConsciousnessLine"></canvas></div>
        ${!hasLogs ? '<div class="text-xs text-muted" style="text-align:center;padding:14px">Registra emociones para ver la curva</div>' : ''}
      </div>
      <div class="card">
        <div class="card-head"><div><h3 class="card-title">🥧 Distribución de emociones</h3><p class="card-sub">% que ocupa cada emoción en tu historial</p></div></div>
        <div class="chart-wrap" style="height:260px"><canvas id="chartConsciousnessDonut"></canvas></div>
        ${!hasLogs ? '<div class="text-xs text-muted" style="text-align:center;padding:14px">Registra emociones para ver la repartición</div>' : ''}
      </div>
    </div>

    <div class="card mt-24">
      <div class="card-head">
        <div><h3 class="card-title">📊 Escala de Hawkins</h3><p class="card-sub">Click en cualquier emoción para registrar que vibras ahí ahora</p></div>
      </div>
      <div class="consciousness-table">
  `;

  let thresholdShown = false;
  HAWKINS_SCALE.forEach(h => {
    if (!thresholdShown && h.level < 200) {
      html += `<div class="cons-threshold-line">↑ Integridad · Energía constructiva ↑    ━━━    ↓ Energía destructiva ↓</div>`;
      thresholdShown = true;
    }
    const cls = ['cons-row'];
    if (h.isThreshold) cls.push('threshold');
    if (h.level < 200) cls.push('below-int');
    else if (h.level >= 500) cls.push('high');
    html += `<div class="${cls.join(' ')}" onclick="logConsciousness(${h.level})" title="Click para registrar">
      <div class="cons-level">${h.level}</div>
      <div class="cons-color" style="background:${h.color};border:1px solid var(--border)"></div>
      <div class="cons-name">${h.name}${h.isThreshold?' · 🔑':''}</div>
      <button class="cons-log-btn" onclick="event.stopPropagation();logConsciousness(${h.level})">+ Sentir</button>
    </div>`;
  });

  html += `</div></div>`;

  // Monthly summary
  const byMonth = {};
  logs.forEach(l => {
    if (!l.date) return;
    const key = l.date.slice(0,7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(l);
  });
  const months = Object.keys(byMonth).sort().reverse();
  const MONTH_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if (months.length) {
    html += `
      <div class="card mt-24">
        <div class="card-head"><div><h3 class="card-title">📅 Resumen mensual</h3><p class="card-sub">Cómo vibraste cada mes</p></div></div>
        <div class="cons-month-summary-grid">
          ${months.map(key => {
            const items = byMonth[key];
            const avg = Math.round(items.reduce((s,l)=>s+Number(l.level||0),0)/items.length);
            const lev = closestHawkinsLevel(avg);
            // Most frequent emotion
            const freq = {};
            items.forEach(l => { const n = l.levelName || getHawkinsLevel(l.level).name; freq[n] = (freq[n]||0)+1; });
            const topEmotion = Object.entries(freq).sort((a,b) => b[1]-a[1])[0];
            const [y,m] = key.split('-');
            const monthLabel = `${MONTH_FULL[Number(m)-1]} ${y}`;
            // Range
            const levels = items.map(l => Number(l.level||0));
            const minL = Math.min(...levels), maxL = Math.max(...levels);
            return `<div class="cons-month-card" style="border-left:4px solid ${lev.color}">
              <div class="cons-month-card-head">
                <div class="cons-month-card-title">${monthLabel}</div>
                <div class="cons-month-card-count">${items.length} registro${items.length===1?'':'s'}</div>
              </div>
              <div class="cons-month-card-body">
                <div class="cons-month-stat">
                  <div class="lbl">Promedio</div>
                  <div class="val" style="color:${lev.textColor==='#fff'?lev.color:'var(--text)'}">${avg} · ${lev.name}</div>
                </div>
                <div class="cons-month-stat">
                  <div class="lbl">Rango</div>
                  <div class="val">${minL} → ${maxL}</div>
                </div>
                <div class="cons-month-stat">
                  <div class="lbl">Predominante</div>
                  <div class="val">${escapeHtml(topEmotion[0])} <span class="text-xs text-muted">(${topEmotion[1]}x)</span></div>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // History
  const recentLogs = logs.slice().sort((a,b) => (b.date+(b.time||'')).localeCompare(a.date+(a.time||''))).slice(0, 30);
  html += `
    <div class="card cons-history-card">
      <div class="card-head"><div><h3 class="card-title">📝 Registros recientes</h3><p class="card-sub">${logs.length} registro${logs.length===1?'':'s'} en total</p></div></div>
      ${recentLogs.length ? recentLogs.map(l => {
        const lev = getHawkinsLevel(l.level);
        return `<div class="cons-history-row">
          <div class="cons-history-dot" style="background:${lev.color}"></div>
          <div class="cons-history-name-block">
            <div class="nm">${lev.name}</div>
            <div class="sub">${fmt(l.date)}${l.emotion?' · '+escapeHtml(l.emotion):''}</div>
          </div>
          <div class="cons-history-note">${l.note?escapeHtml(l.note):'<span style="color:var(--text-3);font-style:italic">Sin nota</span>'}</div>
          <div class="cons-history-level">${l.level}</div>
          <button class="icon-btn danger" onclick="deleteConsciousnessLog('${l.id}')">✕</button>
        </div>`;
      }).join('') : empty('✨','Sin registros aún. Click en cualquier emoción arriba para empezar.')}
    </div>
  `;

  mount.innerHTML = html;

  // Render charts after the DOM is in place
  if (hasLogs) {
    renderConsciousnessLineChart();
    renderConsciousnessDonut();
  }
}

function renderConsciousnessLineChart() {
  const logs = state.consciousness.logs || [];
  if (!logs.length) return;
  const canvas = el('chartConsciousnessLine');
  if (!canvas) return;

  const sorted = logs.slice().sort((a,b) => (a.date+(a.time||'00:00')).localeCompare(b.date+(b.time||'00:00')));
  const labels = sorted.map(l => {
    const d = new Date(l.date+'T00:00');
    return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}) + (l.time?' '+l.time:'');
  });
  const data = sorted.map(l => Number(l.level||0));
  const pointColors = sorted.map(l => getHawkinsLevel(l.level).color);
  const N = labels.length;

  destroyChart('chartConsciousnessLine');

  // Scriptable gradients for premium look
  const lineGradient = (ctx) => {
    const chart = ctx.chart;
    const { ctx: canvasCtx, chartArea } = chart;
    if (!chartArea) return '#EA580C';
    const g = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    g.addColorStop(0, '#E11D48');
    g.addColorStop(0.5, '#F97316');
    g.addColorStop(1, '#FCD34D');
    return g;
  };
  const fillGradient = (ctx) => {
    const chart = ctx.chart;
    const { ctx: canvasCtx, chartArea } = chart;
    if (!chartArea) return 'rgba(244,63,94,.2)';
    const g = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(252,211,77,.35)');
    g.addColorStop(0.5, 'rgba(249,115,22,.18)');
    g.addColorStop(1, 'rgba(244,63,94,.02)');
    return g;
  };

  // Glow plugin — applies shadowBlur to the line dataset
  const glowPlugin = {
    id: 'lineGlow',
    beforeDatasetDraw(chart, args) {
      if (args.index !== 0) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = 'rgba(249,115,22,.55)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    },
    afterDatasetDraw(chart, args) {
      if (args.index !== 0) return;
      chart.ctx.restore();
    },
  };

  charts['chartConsciousnessLine'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nivel de vibración',
          data,
          borderColor: lineGradient,
          backgroundColor: fillGradient,
          fill: true,
          tension: 0.45,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBorderWidth: 2.5,
          order: 1,
        },
        {
          label: 'Razón (400)',
          data: Array(N).fill(400),
          borderColor: 'rgba(252,211,77,.7)',
          backgroundColor: 'transparent',
          borderDash: [6, 5],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          tension: 0,
          order: 2,
        },
        {
          label: 'Voluntad (310)',
          data: Array(N).fill(310),
          borderColor: 'rgba(251,146,60,.7)',
          backgroundColor: 'transparent',
          borderDash: [6, 5],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          tension: 0,
          order: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { min: 0, max: 1000, beginAtZero: true, ticks: { stepSize: 200, font: { size: 10, weight: '600' } } },
        x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: '600' }, usePointStyle: true, boxWidth: 8, padding: 14 } },
      },
    },
    plugins: [glowPlugin],
  });
}

function renderConsciousnessDonut() {
  const logs = state.consciousness.logs || [];
  if (!logs.length) return;
  const byName = {};
  logs.forEach(l => {
    const name = l.levelName || getHawkinsLevel(l.level).name;
    byName[name] = (byName[name] || 0) + 1;
  });
  const entries = Object.entries(byName).sort((a,b) => {
    const la = (HAWKINS_SCALE.find(x => x.name === a[0])?.level) || 0;
    const lb = (HAWKINS_SCALE.find(x => x.name === b[0])?.level) || 0;
    return lb - la;
  });
  const total = entries.reduce((s,e) => s + e[1], 0);
  const labels = entries.map(e => {
    const pct = total > 0 ? Math.round((e[1]/total)*100) : 0;
    return `${e[0]} ${pct}%`;
  });
  const data = entries.map(e => e[1]);
  const colors = labels.map((_, i) => HAWKINS_SCALE.find(x => x.name === entries[i][0])?.color || '#94A3B8');

  destroyChart('chartConsciousnessDonut');
  const c = el('chartConsciousnessDonut');
  if (!c) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  charts['chartConsciousnessDonut'] = new Chart(c, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: isDark ? '#141414' : '#FFFFFF', hoverOffset: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11, weight: '600' }, boxWidth: 10, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => {
          const pct = total > 0 ? Math.round((ctx.parsed/total)*100) : 0;
          return ` ${entries[ctx.dataIndex][0]}: ${ctx.parsed} (${pct}%)`;
        }}},
      },
    },
  });
}

function closestHawkinsLevel(value) {
  if (!value) return HAWKINS_SCALE[HAWKINS_SCALE.length-1];
  let best = HAWKINS_SCALE[0], bestDiff = Infinity;
  for (const h of HAWKINS_SCALE) {
    const diff = Math.abs(h.level - value);
    if (diff < bestDiff) { best = h; bestDiff = diff; }
  }
  return best;
}

function logConsciousness(level) {
  const h = getHawkinsLevel(level);
  openModal(`✨ Vibrando en ${h.name} (${level})`, `
    <div class="form-grid">
      <div style="background:${h.color};color:${h.textColor||'#000'};padding:14px;border-radius:10px;text-align:center">
        <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.8">Nivel ${level}</div>
        <div style="font-size:22px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;margin:4px 0">${h.name}</div>
        <div style="font-size:13px;opacity:.85">${h.emotion} · ${h.process}</div>
      </div>
      <div class="form-row">
        <div class="field"><label>Fecha</label><input id="f-cons-date" type="date" class="input" value="${today()}"></div>
        <div class="field"><label>Hora</label><input id="f-cons-time" type="time" class="input" value="${new Date().toTimeString().slice(0,5)}"></div>
      </div>
      <div class="field"><label>Emoción específica (opcional)</label><input id="f-cons-emotion" class="input" placeholder="ej. gratitud, irritación, calma..."></div>
      <div class="field"><label>Nota / contexto (opcional)</label><textarea id="f-cons-note" class="input" rows="2" placeholder="¿Qué pasó? ¿Por qué te sentiste así?"></textarea></div>
    </div>
  `, () => {
    state.consciousness = state.consciousness || { logs:[] };
    state.consciousness.logs.push({
      id: uid(),
      date: el('f-cons-date').value || today(),
      time: el('f-cons-time').value || '',
      level,
      levelName: h.name,
      emotion: el('f-cons-emotion').value.trim(),
      note: el('f-cons-note').value.trim(),
    });
    return true;
  });
}

/* ─── REVISIÓN SEMANAL V2 ───────────────────────────────── */
function renderWeekly() {
  const mount = el('weeklyMount');
  if (!mount) return;

  // Determine current week (Mon-Sun) — by default this week, can be navigated
  const today_ = today();
  state.weeklyOffset = state.weeklyOffset || 0;  // 0 = this week, -1 = last week, etc.
  const todayD = new Date(today_+'T00:00');
  const monday = new Date(todayD);
  const dow = monday.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  monday.setDate(monday.getDate() - daysSinceMonday + (state.weeklyOffset * 7));
  const sunday = new Date(monday); sunday.setDate(sunday.getDate()+6);
  const weekKey = monday.toISOString().slice(0,10);
  const isThisWeek = state.weeklyOffset === 0;

  // Compute weekly stats — only for past/current days in the week
  const allTasks = state.unifiedTasks || [];
  let weekScheduled = 0, weekDone = 0, weekOverdue = 0;
  const byAreaScheduled = {}, byAreaDone = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(d.getDate()+i);
    const ds = d.toISOString().slice(0,10);
    if (ds > today_) continue; // skip future days
    allTasks.forEach(t => {
      if (taskRunsOnDate(t, ds)) {
        weekScheduled++;
        byAreaScheduled[t.area] = (byAreaScheduled[t.area]||0) + 1;
        if (isTaskDone(t, ds)) {
          weekDone++;
          byAreaDone[t.area] = (byAreaDone[t.area]||0) + 1;
        } else if (isTaskOverdue(t, ds)) {
          weekOverdue++;
        }
      }
    });
  }
  const completionPct = weekScheduled > 0 ? Math.round((weekDone/weekScheduled)*100) : 0;

  // Habit consistency (subset where repeat !== none)
  const habits = allTasks.filter(t => t.repeat && t.repeat.type !== 'none');
  let habitScheduled = 0, habitDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(d.getDate()+i);
    const ds = d.toISOString().slice(0,10);
    if (ds > today_) continue;
    habits.forEach(h => {
      if (taskRunsOnDate(h, ds)) {
        habitScheduled++;
        if (h.completionLog?.[ds]) habitDone++;
      }
    });
  }
  const habitPct = habitScheduled > 0 ? Math.round((habitDone/habitScheduled)*100) : 0;

  // Area rankings
  const areas = state.taskAreas || [];
  const areaRanks = areas.map(a => {
    const sched = byAreaScheduled[a.id] || 0;
    const done = byAreaDone[a.id] || 0;
    return { area:a, sched, done, pct: sched>0 ? Math.round((done/sched)*100) : 0 };
  }).filter(r => r.sched > 0).sort((a,b) => b.pct - a.pct);

  // Per-day completion for the week (for line/bar chart)
  const dayLabels = []; const dayData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(d.getDate()+i);
    const ds = d.toISOString().slice(0,10);
    dayLabels.push(d.toLocaleDateString('es-ES',{weekday:'short'}));
    if (ds > today_) { dayData.push(null); continue; }
    let s = 0, c = 0;
    allTasks.forEach(t => {
      if (taskRunsOnDate(t, ds)) { s++; if (isTaskDone(t, ds)) c++; }
    });
    dayData.push(s>0 ? Math.round((c/s)*100) : 0);
  }

  // Load or create review for this week
  state.weeklyReviews = state.weeklyReviews || {};
  const review = state.weeklyReviews[weekKey] || {
    title: `Semana del ${monday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} al ${sunday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`,
    wins:'', challenges:'', lessons:'', next:'',
    collapsed: false,
  };
  if (!state.weeklyReviews[weekKey]) state.weeklyReviews[weekKey] = review;

  // Past weekly reviews for history list
  const allReviews = state.weeklyReviews || {};
  const pastWeeks = Object.keys(allReviews)
    .filter(k => k !== weekKey)
    .filter(k => (allReviews[k].wins||'').trim() || (allReviews[k].challenges||'').trim() || (allReviews[k].lessons||'').trim() || (allReviews[k].next||'').trim())
    .sort()
    .reverse()
    .slice(0, 12);

  // Render
  const consistencyEmoji = habitPct >= 80 ? '🔥' : habitPct >= 50 ? '👍' : habitPct >= 25 ? '⚠️' : '😴';
  mount.innerHTML = `
    <div class="weekly-week-nav mt-24">
      <button class="btn btn-secondary btn-sm" onclick="shiftWeeklyOffset(-1)">‹ Semana anterior</button>
      <div class="weekly-week-label">
        ${isThisWeek ? '📅 Esta semana' : (state.weeklyOffset === -1 ? '📅 Semana pasada' : '📅 Semana ' + (state.weeklyOffset>0?'+'+state.weeklyOffset:state.weeklyOffset))}
        <div class="weekly-week-date">${monday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} → ${sunday.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="shiftWeeklyOffset(1)" ${state.weeklyOffset>=0?'disabled style="opacity:.4;cursor:not-allowed"':''}>Semana siguiente ›</button>
    </div>

    <div class="weekly-kpis-grid">
      <div class="weekly-kpi" style="--from:#10B981;--to:#059669">
        <div class="label">Tareas completadas</div>
        <div class="value">${weekDone}/${weekScheduled}</div>
        <div class="sub">${completionPct}% de lo planeado</div>
      </div>
      <div class="weekly-kpi" style="--from:#EF4444;--to:#F97316">
        <div class="label">Tareas atrasadas</div>
        <div class="value">${weekOverdue}</div>
        <div class="sub">${weekOverdue===0?'¡Todo al día!':'Pendientes de recuperar'}</div>
      </div>
      <div class="weekly-kpi" style="--from:#FB923C;--to:#FCD34D">
        <div class="label">Consistencia hábitos</div>
        <div class="value">${habitPct}% ${consistencyEmoji}</div>
        <div class="sub">${habitDone}/${habitScheduled} cumplidos</div>
      </div>
      <div class="weekly-kpi" style="--from:#F59E0B;--to:#F97316">
        <div class="label">Áreas con actividad</div>
        <div class="value">${areaRanks.length}</div>
        <div class="sub">de ${areas.length} configuradas</div>
      </div>
    </div>

    <div class="weekly-charts-grid">
      <div class="card">
        <div class="card-head"><div><h3 class="card-title">📊 % Completado por día</h3><p class="card-sub">Semana de ${monday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} al ${sunday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</p></div></div>
        <div class="chart-wrap"><canvas id="chartWeeklyDays"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3 class="card-title">🏆 Ranking por área</h3><p class="card-sub">% de cumplimiento esta semana</p></div></div>
        <div class="weekly-area-rank">
          ${areaRanks.length ? areaRanks.map(r => `
            <div class="weekly-area-rank-row">
              <div class="nm"><span>${r.area.icon}</span>${escapeHtml(r.area.name)}</div>
              <div class="progress" style="height:6px"><div class="progress-bar ${r.pct>=70?'success':r.pct>=40?'warning':'danger'}" style="width:${r.pct}%"></div></div>
              <div class="pct">${r.pct}%</div>
            </div>
          `).join('') : '<div class="area-empty">Sin actividad por áreas esta semana</div>'}
        </div>
      </div>
    </div>

    <div class="weekly-journal ${review.collapsed?'collapsed':''}" id="weeklyJournal">
      <div class="weekly-journal-head" onclick="toggleWeeklyJournal()">
        <div class="weekly-journal-title">
          <span class="weekly-journal-chev">▼</span>
          <input class="weekly-journal-title-input" type="text" value="${escapeHtml(review.title)}" placeholder="ej. Semana del 26 may al 1 jun" onclick="event.stopPropagation()" oninput="updateWeeklyReviewField('${weekKey}','title',this.value)">
        </div>
        <span id="weeklySaveIndicator" class="weekly-save-ind">✓ Auto-guardado</span>
      </div>
      <div class="weekly-journal-body">
        <div class="form-grid">
          <div class="field"><label>🏆 ¿Qué logré esta semana? (celebra)</label><textarea class="input" rows="3" placeholder="Mis victorias, avances, logros..." oninput="updateWeeklyReviewField('${weekKey}','wins',this.value)">${escapeHtml(review.wins||'')}</textarea></div>
          <div class="field"><label>🧠 ¿Qué fue difícil o no salió bien?</label><textarea class="input" rows="3" placeholder="Obstáculos, errores, situaciones difíciles..." oninput="updateWeeklyReviewField('${weekKey}','challenges',this.value)">${escapeHtml(review.challenges||'')}</textarea></div>
          <div class="field"><label>🔄 ¿Qué haré diferente la próxima semana?</label><textarea class="input" rows="3" placeholder="Ajustes, nuevo hábito, nueva estrategia..." oninput="updateWeeklyReviewField('${weekKey}','lessons',this.value)">${escapeHtml(review.lessons||'')}</textarea></div>
          <div class="field"><label>⭐ Mis 3 prioridades de la siguiente semana</label><textarea class="input" rows="3" placeholder="1. ...&#10;2. ...&#10;3. ..." oninput="updateWeeklyReviewField('${weekKey}','next',this.value)">${escapeHtml(review.next||'')}</textarea></div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:14px;gap:10px">
          <button class="btn btn-primary" onclick="saveWeeklyReviewExplicit('${weekKey}')">💾 Guardar revisión</button>
        </div>
      </div>
    </div>

    ${pastWeeks.length ? `
      <div class="card mt-24">
        <div class="card-head"><div><h3 class="card-title">📚 Revisiones anteriores</h3><p class="card-sub">Click para abrir esa semana</p></div></div>
        <div class="weekly-past-grid">
          ${pastWeeks.map(k => {
            const r = allReviews[k];
            const md = new Date(k+'T00:00');
            const sd = new Date(md); sd.setDate(sd.getDate()+6);
            return `<button class="weekly-past-card" onclick="jumpToWeek('${k}')">
              <div class="wp-title">${escapeHtml(r.title || ('Semana del '+md.toLocaleDateString('es-ES',{day:'numeric',month:'short'})))}</div>
              <div class="wp-range">${md.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} → ${sd.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</div>
              ${r.wins ? `<div class="wp-snippet">🏆 ${escapeHtml(r.wins).slice(0,80)}${r.wins.length>80?'…':''}</div>` : ''}
            </button>`;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Render daily chart
  barChart('chartWeeklyDays', dayLabels, [{
    label: '% Completado',
    data: dayData,
    backgroundColor: dayData.map(v => v===null?'#94A3B8':(v>=70?'#10B98180':v>=40?'#F59E0B80':'#EF444480')),
    borderColor: dayData.map(v => v===null?'#94A3B8':(v>=70?'#10B981':v>=40?'#F59E0B':'#EF4444')),
    borderWidth: 2,
    borderRadius: 6,
  }], { scales: { y: { min:0, max:100, ticks: { stepSize: 25, callback: v => v+'%' } } }, plugins: { legend: { display: false } } });
}

function updateWeeklyReviewField(weekKey, field, value) {
  state.weeklyReviews = state.weeklyReviews || {};
  if (!state.weeklyReviews[weekKey]) state.weeklyReviews[weekKey] = {};
  state.weeklyReviews[weekKey][field] = value;
  saveState();
  // Show save indicator briefly
  const ind = el('weeklySaveIndicator');
  if (ind) {
    ind.textContent = '✓ Guardado';
    ind.classList.add('saved');
    clearTimeout(window._weeklySaveTimer);
    window._weeklySaveTimer = setTimeout(() => {
      const i2 = el('weeklySaveIndicator');
      if (i2) { i2.textContent = '✓ Auto-guardado'; i2.classList.remove('saved'); }
    }, 1500);
  }
}

function saveWeeklyReviewExplicit(weekKey) {
  // Force a save (state is already updated via oninput; just confirm visually)
  saveState();
  const ind = el('weeklySaveIndicator');
  if (ind) {
    ind.textContent = '✅ Revisión guardada';
    ind.classList.add('saved');
    setTimeout(() => {
      const i2 = el('weeklySaveIndicator');
      if (i2) { i2.textContent = '✓ Auto-guardado'; i2.classList.remove('saved'); }
    }, 2500);
  }
  alert('✅ Revisión semanal guardada. Cuando empiece la nueva semana, usa "Semana siguiente" para escribir esa.');
}

function shiftWeeklyOffset(delta) {
  state.weeklyOffset = (state.weeklyOffset || 0) + delta;
  if (state.weeklyOffset > 0) state.weeklyOffset = 0; // no future weeks
  saveState();
  renderWeekly();
}

function jumpToWeek(weekKey) {
  // Compute offset from today's Monday to the given Monday
  const today_ = today();
  const todayD = new Date(today_+'T00:00');
  const todayMon = new Date(todayD);
  const dow = todayMon.getDay();
  todayMon.setDate(todayMon.getDate() - (dow === 0 ? 6 : dow - 1));
  const target = new Date(weekKey+'T00:00');
  const diffDays = Math.round((target - todayMon)/86400000);
  state.weeklyOffset = Math.round(diffDays/7);
  saveState();
  renderWeekly();
}

function toggleWeeklyJournal() {
  const el_ = el('weeklyJournal');
  if (!el_) return;
  const collapsed = el_.classList.toggle('collapsed');
  // Persist for current viewed week (respect weeklyOffset)
  const today_ = today();
  const todayD = new Date(today_+'T00:00');
  const monday = new Date(todayD);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1) + ((state.weeklyOffset||0) * 7));
  const weekKey = monday.toISOString().slice(0,10);
  state.weeklyReviews = state.weeklyReviews || {};
  if (!state.weeklyReviews[weekKey]) state.weeklyReviews[weekKey] = {};
  state.weeklyReviews[weekKey].collapsed = collapsed;
  saveState();
}

/* ─── NOTAS (antes Inbox) ───────────────────────────────── */
function renderInbox() {
  const mount = el('notesMount');
  if (!mount) return;
  if (!state.notesV2) state.notesV2 = { areas: [], notes: [] };
  const areas = state.notesV2.areas;
  const notes = state.notesV2.notes;

  let html = `
    <div class="row between mt-24" style="margin-bottom:14px">
      <div></div>
      <button class="btn btn-primary btn-sm" onclick="addNotesAreaModal()">+ Nueva área</button>
    </div>
  `;

  if (!areas.length) {
    html += `<div class="card"><div class="list-empty"><span class="big-emoji">📝</span>Sin áreas aún. Crea tu primera área (ej: "Ideas de negocio", "Aprendizajes", "Inspiración")</div></div>`;
  } else {
    html += `<div class="notes-areas-grid">`;
    areas.forEach(area => {
      const areaNotes = notes.filter(n => n.areaId === area.id);
      const landedCount = areaNotes.filter(n => n.landed).length;
      html += `<div class="notes-area-card">
        <div class="notes-area-head">
          <div class="notes-area-title"><span>${area.icon||'📝'}</span> ${escapeHtml(area.name)} <span class="notes-area-count">${landedCount}/${areaNotes.length}</span></div>
          <div class="row gap-sm">
            <button class="btn-area-menu" onclick="editNotesArea('${area.id}')" title="Editar">⋯</button>
            <button class="btn-icon-add" onclick="addNoteModal('${area.id}')" title="Nueva idea">+</button>
          </div>
        </div>
        <div class="notes-list">
          ${areaNotes.length ? areaNotes.map(n => `
            <div class="note-item ${n.landed?'landed':''}" onclick="editNoteModal('${n.id}')">
              <div class="note-item-title">${n.landed?'✓ ':''}${escapeHtml(n.title)}</div>
              ${n.body ? `<div class="note-item-snippet">${escapeHtml(n.body).slice(0,100)}${n.body.length>100?'…':''}</div>` : ''}
              <div class="note-item-meta">
                ${n.links?.length ? `<span class="badge-chip">🔗 ${n.links.length}</span>` : ''}
                ${n.images?.length ? `<span class="badge-chip">🖼 ${n.images.length}</span>` : ''}
              </div>
            </div>
          `).join('') : '<div class="area-empty">Sin ideas aún. Toca + para empezar.</div>'}
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  mount.innerHTML = html;
}

function addNotesAreaModal() {
  openModal('+ Nueva área de notas', `
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-narea-name" class="input" placeholder="ej. Ideas de negocio, Inspiración..."></div>
      <div class="form-row">
        <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-narea-icon" class="input" value="📝" maxlength="2" style="font-size:18px;text-align:center"></div>
      </div>
    </div>
  `, () => {
    const name = el('f-narea-name').value.trim();
    if (!name) { alert('Pon un nombre'); return false; }
    state.notesV2.areas.push({
      id: uid(), name, icon: el('f-narea-icon').value || '📝', color: '#EA580C',
    });
    return true;
  });
}

function editNotesArea(areaId) {
  const a = state.notesV2.areas.find(x => x.id === areaId);
  if (!a) return;
  openModal('✏ Editar área', `
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-narea-name" class="input" value="${escapeHtml(a.name)}"></div>
      <div class="field" style="max-width:90px"><label>Ícono</label><input id="f-narea-icon" class="input" value="${a.icon||'📝'}" maxlength="2" style="font-size:18px;text-align:center"></div>
      <button class="btn btn-danger" onclick="deleteNotesArea('${a.id}')">🗑 Eliminar área (y sus ideas)</button>
    </div>
  `, () => {
    a.name = el('f-narea-name').value.trim() || a.name;
    a.icon = el('f-narea-icon').value || a.icon;
    return true;
  });
}

function deleteNotesArea(id) {
  if (!confirm('¿Eliminar esta área y todas sus ideas?')) return;
  state.notesV2.areas = state.notesV2.areas.filter(a => a.id !== id);
  state.notesV2.notes = state.notesV2.notes.filter(n => n.areaId !== id);
  saveState();
  closeModal();
  renderInbox();
}

function addNoteModal(areaId) {
  editNoteModal(null, areaId);
}

function editNoteModal(id, areaId) {
  const isEdit = !!id;
  const n = isEdit
    ? state.notesV2.notes.find(x => x.id === id)
    : { id: uid(), areaId, title:'', body:'', landed:false, links:[], images:[] };
  if (!n) return;
  window._noteDraft = JSON.parse(JSON.stringify(n));
  // Ensure arrays exist
  window._noteDraft.links = window._noteDraft.links || [];
  window._noteDraft.images = window._noteDraft.images || [];

  renderNoteModal(isEdit);
}

function renderNoteModal(isEdit) {
  const n = window._noteDraft;
  if (!n) return;
  openModal(isEdit ? '✏ Editar idea' : '+ Nueva idea', `
    <div class="form-grid">
      <div class="field"><label>Título</label><input id="f-note-title" class="input" value="${escapeHtml(n.title)}" placeholder="Resumen breve de la idea" oninput="window._noteDraft.title=this.value"></div>
      <div class="field"><label>Idea / descripción</label><textarea id="f-note-body" class="input" rows="5" placeholder="Desarrolla aquí la idea..." oninput="window._noteDraft.body=this.value">${escapeHtml(n.body||'')}</textarea></div>

      <label class="row gap-sm" style="font-weight:600"><input type="checkbox" id="f-note-landed" ${n.landed?'checked':''} onchange="window._noteDraft.landed=this.checked"> <span>✓ Aterrizada (idea ya implementada o concretada)</span></label>

      <div class="field"><label>🔗 Links</label>
        <div id="noteLinks">${(n.links||[]).map((l,i) => `
          <div class="note-link-row">
            <span>🔗</span>
            <input class="input" type="text" placeholder="https://..." value="${escapeHtml(l)}" oninput="window._noteDraft.links[${i}]=this.value">
            <button class="icon-btn danger" onclick="window._noteDraft.links.splice(${i},1);renderNoteModal(${isEdit})">✕</button>
          </div>
        `).join('')}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="window._noteDraft.links.push('');renderNoteModal(${isEdit})">+ Agregar link</button>
      </div>

      <div class="field"><label>🖼 Capturas / imágenes</label>
        <div class="note-editor-imgs" id="noteImgs">
          ${(n.images||[]).map((src,i) => `
            <div class="note-editor-img-thumb" style="background-image:url('${src}')">
              <button class="remove" onclick="window._noteDraft.images.splice(${i},1);renderNoteModal(${isEdit})">×</button>
            </div>
          `).join('')}
        </div>
        <input type="file" id="f-note-img-file" accept="image/*" multiple style="display:none" onchange="handleNoteImagesUpload(event,${isEdit})">
        <button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="el('f-note-img-file').click()">📷 Subir imagen / captura</button>
      </div>

      ${isEdit ? `<button class="btn btn-danger" onclick="deleteNoteAndClose('${n.id}')">🗑 Eliminar idea</button>` : ''}
    </div>
  `, () => {
    if (!window._noteDraft.title.trim()) { alert('Ponle un título a la idea'); return false; }
    const idx = state.notesV2.notes.findIndex(x => x.id === window._noteDraft.id);
    if (idx >= 0) state.notesV2.notes[idx] = window._noteDraft;
    else state.notesV2.notes.push(window._noteDraft);
    window._noteDraft = null;
    return true;
  });
  setTimeout(() => el('f-note-title')?.focus(), 50);
}

function handleNoteImagesUpload(e, isEdit) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const oversize = files.find(f => f.size > 2 * 1024 * 1024);
  if (oversize) { alert(`${oversize.name} es muy grande (máx 2MB c/u)`); return; }
  Promise.all(files.map(fileToBase64)).then(urls => {
    window._noteDraft.images = window._noteDraft.images || [];
    urls.forEach(u => window._noteDraft.images.push(u));
    renderNoteModal(isEdit);
  });
  e.target.value = '';
}

function deleteNoteAndClose(id) {
  if (!confirm('¿Eliminar esta idea?')) return;
  state.notesV2.notes = state.notesV2.notes.filter(x => x.id !== id);
  window._noteDraft = null;
  saveState();
  closeModal();
  renderInbox();
}

/* ─── PROFILE ───────────────────────────────────────────── */
function renderProfile() {
  const mount = el('profileMount');
  if (!mount) return;
  const username = getCurrentUser() || '';
  const displayName = state.displayName || username;
  const photo = state.profilePhoto || '';
  const initial = (displayName || username || 'U')[0].toUpperCase();

  // Count stuff
  const numTasks = (state.unifiedTasks||[]).length;
  const numGoals = (state.goals||[]).length;
  const numSessions = (state.exercise?.sessions||[]).filter(s => s.endedAt).length;

  mount.innerHTML = `
    <div class="card mt-24">
      <div class="profile-card">
        <div class="profile-avatar-big" style="${photo?`background-image:url('${photo}')`:''}">${photo?'':initial}</div>
        <div class="profile-info">
          <h3>${escapeHtml(displayName)}</h3>
          <div class="username">@${escapeHtml(username)}</div>
          <div class="stat-row">
            <div><strong>${numTasks}</strong> tareas</div>
            <div><strong>${numGoals}</strong> metas</div>
            <div><strong>${numSessions}</strong> sesiones de ejercicio</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="editProfileModal()">✏ Editar perfil</button>
      </div>
    </div>

    <div class="card mt-24">
      <div class="card-head"><div><h3 class="card-title">⚙ Cuenta</h3><p class="card-sub">Gestiona tu sesión y datos</p></div></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-secondary" style="justify-content:flex-start" onclick="authLogout()">🚪 Desconectarse</button>
      </div>
    </div>
  `;
  refreshSidebarAvatar();
}

function refreshSidebarAvatar() {
  const av = el('sidebarAvatar');
  const lbl = el('sidebarDisplayName');
  if (!av || !lbl) return;
  const displayName = state.displayName || getCurrentUser() || 'Usuario';
  const photo = state.profilePhoto || '';
  if (photo) {
    av.style.backgroundImage = `url('${photo}')`;
    av.textContent = '';
  } else {
    av.style.backgroundImage = '';
    av.textContent = (displayName||'U')[0].toUpperCase();
  }
  lbl.textContent = displayName;
}

function editProfileModal() {
  const username = getCurrentUser() || '';
  openModal('✏ Editar perfil', `
    <div class="form-grid">
      <div class="field"><label>Nombre que mostramos</label><input id="f-prof-name" class="input" value="${escapeHtml(state.displayName||username)}"></div>
      <div class="field"><label>Foto de perfil</label>
        <div class="row gap-sm" style="align-items:center">
          <div id="profile-photo-preview" class="profile-avatar-big" style="width:70px;height:70px;font-size:24px;${state.profilePhoto?`background-image:url('${state.profilePhoto}')`:''}">${state.profilePhoto?'':(state.displayName||username||'U')[0].toUpperCase()}</div>
          <div style="flex:1">
            <input type="file" id="f-prof-photo-file" accept="image/*" style="display:none" onchange="handleProfilePhotoUpload(event)">
            <button class="btn btn-secondary btn-sm" onclick="el('f-prof-photo-file').click()">📷 Subir foto</button>
            ${state.profilePhoto ? `<button class="btn btn-danger btn-sm" onclick="state.profilePhoto='';el('profile-photo-preview').style.backgroundImage='';el('profile-photo-preview').textContent=(el('f-prof-name').value||'U')[0].toUpperCase()">Quitar foto</button>` : ''}
          </div>
        </div>
        <div class="text-xs text-muted" style="margin-top:6px">Máx 2MB · JPG, PNG, WebP</div>
      </div>
      <div class="text-xs text-muted">Tu nombre de usuario (<strong>@${escapeHtml(username)}</strong>) no se puede cambiar — es como identificas tu cuenta.</div>
    </div>
  `, () => {
    state.displayName = el('f-prof-name').value.trim() || username;
    return true;
  });
}

function handleProfilePhotoUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) { alert('La imagen es muy grande (máx 2MB).'); return; }
  fileToBase64(f).then(dataUrl => {
    state.profilePhoto = dataUrl;
    const p = el('profile-photo-preview');
    if (p) { p.style.backgroundImage = `url('${dataUrl}')`; p.textContent = ''; }
  });
}

function deleteConsciousnessLog(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  state.consciousness.logs = state.consciousness.logs.filter(l => l.id !== id);
  saveState();
  renderConsciousness();
}

document.addEventListener('DOMContentLoaded',init);
