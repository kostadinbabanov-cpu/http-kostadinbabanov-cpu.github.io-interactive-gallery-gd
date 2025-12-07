/* quiz.js
   Локален админ панел + динамичен куиз
   Парола по подразбиране: teacher123
   Модифицирай стойността на adminPassword по желание.
*/

// ====== Конфигурация =========
const adminPassword = "ivana123"; // смени ако искаш
const STORAGE_KEY = "gd_quiz_questions_v1";
const DEFAULT_QUESTIONS = [
  { q:"Кой уред се използва най-често за откриване на метални предмети под земята?", answers:["Магнитометър","Металдетектор","Сонар","Георадар"], correct:1 },
  { q:"Как се нарича техниката за риболов с използване на изкуствена примамка?", answers:["Тролинг","Спининг","Плувкарство","Фидер"], correct:1 },
  { q:"Кой е основният инструмент за диагностика на автомобилни повреди?", answers:["Компресор","Динамометър","Диагностичен скенер","Гаечен ключ"], correct:2 }
];

// ====== DOM елементи ======
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const questionText = document.getElementById("questionText");
const answersEl = document.getElementById("answers");
const ansButtons = Array.from(document.querySelectorAll(".answer-btn"));
const currentIdxEl = document.getElementById("currentIdx");
const totalQEl = document.getElementById("totalQ");
const scoreVal = document.getElementById("scoreVal");
const shuffleQ = document.getElementById("shuffleQ");
const limitQ = document.getElementById("limitQ");
const muteBtn = document.getElementById("muteBtn");

// Admin
const openAdmin = document.getElementById("openAdmin");
const adminModal = document.getElementById("adminModal");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminPass = document.getElementById("adminPass");
const adminArea = document.getElementById("adminArea");
const addQBtn = document.getElementById("addQBtn");
const newQ = document.getElementById("newQ");
const newA0 = document.getElementById("newA0");
const newA1 = document.getElementById("newA1");
const newA2 = document.getElementById("newA2");
const newA3 = document.getElementById("newA3");
const newCorrect = document.getElementById("newCorrect");
const questionsList = document.getElementById("questionsList");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const importBtn = document.getElementById("importBtn");
const closeAdmin = document.getElementById("closeAdmin");
const closeModalBtn = document.getElementById("closeModalBtn");

// Audio
const bgMusic = document.getElementById("bgMusic");
const soundCorrect = document.getElementById("soundCorrect");
const soundWrong = document.getElementById("soundWrong");
const soundSelect = document.getElementById("soundSelect");
let muted = false;

// State
let questions = loadQuestions();
let runtimeQuestions = [];
let currentIndex = 0;
let score = 0;

// ====== хелпъри ======
function loadQuestions(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUESTIONS));
      return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    }
    return JSON.parse(raw);
  } catch(e){
    console.error(e);
    return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
  }
}
function saveQuestions(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}
function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

// ====== UI логика за играта ======
function prepareRun(){
  // клонираме
  runtimeQuestions = questions.slice();
  if(shuffleQ.checked) shuffleArray(runtimeQuestions);
  const limit = parseInt(limitQ.value) || runtimeQuestions.length;
  runtimeQuestions = runtimeQuestions.slice(0, Math.min(limit, runtimeQuestions.length));
  totalQEl.textContent = runtimeQuestions.length;
  currentIndex = 0;
  score = 0;
  scoreVal.textContent = score;
  currentIdxEl.textContent = 0;
  nextBtn.style.display = "none";
  restartBtn.style.display = "none";
  startBtn.style.display = "inline-block";
  questionText.textContent = 'Натисни "Старт", за да започнеш.';
  ansButtons.forEach(b=>{ b.style.display='none'; b.className='answer-btn'; });
}

function startQuiz(){
  if(runtimeQuestions.length===0){
    alert("Няма въпроси в базата. Добави въпроси в админ панела.");
    return;
  }
  startBtn.style.display='none';
  currentIndex = 0;
  score = 0;
  scoreVal.textContent = score;
  showQuestion();
  playBackground();
}

function showQuestion(){
  const item = runtimeQuestions[currentIndex];
  questionText.textContent = item.q;
  ansButtons.forEach((btn, i)=>{
    btn.textContent = item.answers[i] || "";
    btn.disabled=false;
    btn.className='answer-btn';
    btn.style.display = 'inline-block';
  });
  currentIdxEl.textContent = currentIndex+1;
  totalQEl.textContent = runtimeQuestions.length;
  nextBtn.style.display='none';
  restartBtn.style.display='none';
}

function handleAnswer(e){
  const idx = parseInt(this.getAttribute("data-index"));
  const item = runtimeQuestions[currentIndex];
  disableAnswers();
  playSelect();
  setTimeout(()=>{
    // проверка
    if(idx === item.correct){
      this.classList.add('correct');
      playSound(soundCorrect);
      score += 1;
      scoreVal.textContent = score;
    } else {
      this.classList.add('wrong');
      // маркираме правилния
      const rightBtn = ansButtons[item.correct];
      if(rightBtn) rightBtn.classList.add('correct');
      playSound(soundWrong);
    }
    nextBtn.style.display = 'inline-block';
    restartBtn.style.display = 'inline-block';
  }, 350);
}

function disableAnswers(){
  ansButtons.forEach(b=>{ b.disabled=true; b.classList.add('disabled'); });
}

function nextQuestion(){
  currentIndex++;
  if(currentIndex >= runtimeQuestions.length){
    finishQuiz();
    return;
  }
  showQuestion();
}

function finishQuiz(){
  stopBackground();
  questionText.textContent = `Край! Вашият резултат: ${score} от ${runtimeQuestions.length}`;
  ansButtons.forEach(b=> b.style.display='none');
  startBtn.style.display='none';
  nextBtn.style.display='none';
  restartBtn.style.display='inline-block';
}

// ====== аудио функции ======
function playBackground(){ if(!muted){ bgMusic.currentTime=0; bgMusic.play(); } }
function stopBackground(){ bgMusic.pause(); bgMusic.currentTime=0; }
function playSound(s){ if(!muted){ try{ s.currentTime=0; s.play(); }catch(e){} } }
function playSelect(){ playSound(soundSelect); }
muteBtn.addEventListener('click', ()=>{
  muted = !muted;
  muteBtn.textContent = muted ? 'Включи звук':'Изключи звук';
  if(muted) stopBackground(); else playBackground();
});

// ====== Прикачване на събития ======
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', ()=>{ nextQuestion(); });
restartBtn.addEventListener('click', ()=>{ prepareRun(); startQuiz(); });

ansButtons.forEach(btn=> btn.addEventListener('click', handleAnswer));

// при първо зареждане
prepareRun();

// ====== Admin функции ======
openAdmin.addEventListener('click', ()=>{ adminModal.style.display='flex'; adminPass.value=''; adminArea.style.display='none'; });
closeModalBtn.addEventListener('click', ()=>{ adminModal.style.display='none'; });
closeAdmin.addEventListener('click', ()=>{ adminModal.style.display='none'; });

adminLoginBtn.addEventListener('click', ()=>{
  const p = adminPass.value.trim();
  if(p === adminPassword){
    adminArea.style.display='block';
    renderAdminList();
  } else {
    alert('Грешна парола.');
  }
});

function renderAdminList(){
  questionsList.innerHTML='';
  questions.forEach((q, idx)=>{
    const div = document.createElement('div');
    div.className='q-item';
    div.innerHTML = `
      <div>
        <strong>${idx+1}.</strong> <span>${escapeHtml(q.q)}</span><br/>
        <small>Отговори: ${q.answers.map((a,i)=> i===q.correct? `<b>${escapeHtml(a)}</b>`:escapeHtml(a)).join(' | ')}</small>
      </div>
      <div class="q-actions">
        <button data-idx="${idx}" class="secondary editBtn">Edit</button>
        <button data-idx="${idx}" class="secondary delBtn">Delete</button>
      </div>
    `;
    questionsList.appendChild(div);
  });
  Array.from(document.querySelectorAll('.delBtn')).forEach(b=>{
    b.addEventListener('click',(e)=>{
      const i=parseInt(e.target.dataset.idx);
      if(confirm('Сигурни ли сте, че искате да изтриете въпроса?')) {
        questions.splice(i,1); saveQuestions(); renderAdminList(); prepareRun();
      }
    });
  });
  Array.from(document.querySelectorAll('.editBtn')).forEach(b=>{
    b.addEventListener('click',(e)=>{
      const i=parseInt(e.target.dataset.idx);
      const q=questions[i];
      const newText = prompt('Редактирай въпроса:', q.q);
      if(newText!==null) {
        q.q = newText;
        for(let k=0;k<4;k++){
          const na = prompt(`Отговор ${k+1}:`, q.answers[k]||'');
          if(na!==null) q.answers[k]=na;
        }
        const nc = prompt('Индекс на правилния (0-3):', q.correct);
        if(nc!==null) q.correct = Math.max(0, Math.min(3, parseInt(nc)||0));
        saveQuestions(); renderAdminList(); prepareRun();
      }
    });
  });
}

addQBtn.addEventListener('click', ()=>{
  const q = newQ.value.trim();
  const a0 = newA0.value.trim();
  const a1 = newA1.value.trim();
  const a2 = newA2.value.trim();
  const a3 = newA3.value.trim();
  const corr = parseInt(newCorrect.value);
  if(!q || !a0 || !a1 || !a2 || !a3 || isNaN(corr)){
    alert('Попълни всички полета и правилен индекс (0-3).');
    return;
  }
  const obj = { q:q, answers:[a0,a1,a2,a3], correct: Math.max(0, Math.min(3, corr)) };
  questions.push(obj);
  saveQuestions();
  newQ.value=''; newA0.value=''; newA1.value=''; newA2.value=''; newA3.value=''; newCorrect.value=0;
  renderAdminList();
  prepareRun();
});

// Експорт / Импорт
exportBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(questions, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='quiz_questions.json'; a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', ()=> {
  const file = importFile.files[0];
  if(!file){ alert('Избери JSON файл.'); return; }
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const imported = JSON.parse(e.target.result);
      if(!Array.isArray(imported)) throw new Error('Невалиден формат');
      // basic validation
      for(const it of imported){
        if(typeof it.q !== 'string' || !Array.isArray(it.answers) || typeof it.correct !== 'number') throw new Error('Невалидна структура');
      }
      if(confirm('Импортираните въпроси ще заменят сегашните. Продължавате ли?')){
        questions = imported;
        saveQuestions();
        renderAdminList(); prepareRun();
        alert('Импортирано успешно.');
      }
    }catch(err){
      alert('Грешка при импортиране: '+err.message);
    }
  };
  reader.readAsText(file);
});

// escape HTML
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// първоначално render на админ листа (ако отворят и се логнат)
renderAdminList();
