// ====== FIREBASE CONFIG ======
const firebaseConfig = {
    apiKey: "AIzaSyAV13nj5-G1vaUanLuz95Ni_JZWZOVsgI0",
    authDomain: "gallerygd-db3e0.firebaseapp.com",
    projectId: "gallerygd-db3e0",
    storageBucket: "gallerygd-db3e0.firebasestorage.app",
    messagingSenderId: "15172686148",
    appId: "1:15172686148:web:a2f633fd8399112760c711",
    databaseURL: "https://gallerygd-db3e0-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ====== ПРОМЕНЛИВИ ======
const adminPassword = "ivana123";
const TERRITORIES = [
    { name: "Градски парк", points: 100, owner: null },
    { name: "Панорама", points: 150, owner: null },
    { name: "Дом на културата", points: 200, owner: null },
    { name: "Исторически музей", points: 120, owner: null },
    { name: "Манастир", points: 250, owner: null },
    { name: "Център", points: 180, owner: null }
];

let questions = []; 
let roomID = new URLSearchParams(window.location.search).get('room');
let myRole = roomID ? 'player2' : 'player1';
let currentTIdx = -1;
let currentQIndex = -1;
let myScore = 0, oppScore = 0;
let myZones = 0, oppZones = 0;
let timerInterval, startTime, timeLeft = 15;
let isMuted = false;

// DOM елементи
const qText = document.getElementById("questionText");
const ansButtons = Array.from(document.querySelectorAll(".answer-btn"));
const setupContainer = document.getElementById("setup-container");
const createRoomBtn = document.getElementById("createRoomBtn");
const territoryStatus = document.getElementById("territoryStatus");

// ====== ПОМОЩНИ ФУНКЦИИ ======

// Разбъркване на масив (Fisher-Yates Shuffle) за предотвратяване на повторения
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ====== ЗАРЕЖДАНЕ НА ВЪПРОСИ ОТ ОБЛАКА ======
function loadQuestionsFromDB(callback) {
    db.ref('shared_questions').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            questions = Object.values(data);
        }
        if (callback) callback();
    });
}

// ====== ИНИЦИАЛИЗАЦИЯ ======
loadQuestionsFromDB(() => {
    if (roomID) {
        setupContainer.innerHTML = "<h3>Свързване към играта...</h3>";
        db.ref('rooms/' + roomID).update({ status: 'playing' });
        initGame();
    }
});

createRoomBtn.onclick = () => {
    if (questions.length < 6) {
        alert("Моля, добавете поне 6 въпроса в Админ панела!");
        return;
    }
    roomID = "room_" + Math.random().toString(36).substr(2, 6);
    const url = window.location.href + "?room=" + roomID;
    
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), url);
    document.getElementById("setup-msg").innerHTML = `<b>Стаята е създадена!</b><br>Сканирайте QR кода.`;
    createRoomBtn.style.display = "none";

    db.ref('rooms/' + roomID).set({
        status: 'waiting',
        currentTIdx: -1,
        currentQIdx: -1,
        p1Ready: false, p2Ready: false,
        p1Correct: false, p2Correct: false,
        p1Time: 999, p2Time: 999,
        battleResolved: false
    });

    db.ref('rooms/' + roomID + '/status').on('value', (snap) => {
        if (snap.val() === 'playing') initGame();
    });
};

function initGame() {
    setupContainer.style.display = "none";
    updateTerritoryUI();
    if (myRole === 'player1') {
        shuffleArray(questions); // Разбъркваме въпросите само веднъж в началото
        currentTIdx = 0;
        nextBattle();
    }
    listenForUpdates();
}

// ====== ЛОГИКА НА БИТКАТА ======

function nextBattle() {
    if (currentTIdx >= TERRITORIES.length) {
        db.ref('rooms/' + roomID).update({ status: 'finished' });
        return;
    }

    // Взимаме въпросите подред от вече разбъркания масив
    const qIdx = currentTIdx % questions.length; 

    db.ref('rooms/' + roomID).update({
        currentTIdx: currentTIdx,
        currentQIdx: qIdx,
        p1Ready: false, 
        p2Ready: false,
        p1Correct: false, 
        p2Correct: false,
        p1Time: 999, 
        p2Time: 999,
        battleResolved: false // Нулираме флага за нов рунд
    });
}

function listenForUpdates() {
    db.ref('rooms/' + roomID).on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        if (data.status === 'finished') {
            showFinalResults();
            return;
        }

        // Следене за нов въпрос
        if (data.currentQIdx !== -1 && data.currentQIdx !== currentQIndex) {
            currentQIndex = data.currentQIdx;
            currentTIdx = data.currentTIdx;
            showQuestion(questions[currentQIndex]);
        }

        // Когато и двамата са готови - изчисляваме победител
        if (data.p1Ready && data.p2Ready && !data.battleResolved) {
            clearInterval(timerInterval);
            resolveBattle(data);
        }
    });
}

function showQuestion(q) {
    if (!q) return;
    ansButtons.forEach(btn => {
        btn.style.display = "inline-block";
        btn.className = "answer-btn";
        btn.disabled = false;
    });

    const t = TERRITORIES[currentTIdx] || {name: "Територия", points: 0};
    qText.innerHTML = `<b style="color:#2c3e50">Битка за: ${t.name}</b><br>${q.q}`;
    
    startTime = Date.now();
    timeLeft = 15;
    document.getElementById("timeLeft").textContent = timeLeft;

    ansButtons.forEach((btn, i) => {
        btn.textContent = q.answers[i];
        btn.onclick = () => handleAnswer(i, q.correct);
    });

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timeLeft").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleAnswer(-1, q.correct);
        }
    }, 1000);
}

function handleAnswer(idx, correct) {
    clearInterval(timerInterval);
    const timeTaken = (Date.now() - startTime) / 1000;
    ansButtons.forEach(b => b.disabled = true);

    const isCorrect = (idx === correct);
    if (isCorrect) {
        if (idx !== -1) ansButtons[idx].classList.add('correct');
        if (!isMuted) document.getElementById("soundCorrect").play();
    } else {
        if (idx !== -1) ansButtons[idx].classList.add('wrong');
        ansButtons[correct].classList.add('correct');
        if (!isMuted) document.getElementById("soundWrong").play();
    }

    const update = {};
    const prefix = myRole === 'player1' ? 'p1' : 'p2';
    update[prefix + 'Ready'] = true;
    update[prefix + 'Correct'] = isCorrect;
    update[prefix + 'Time'] = isCorrect ? timeTaken : 999;
    db.ref('rooms/' + roomID).update(update);
}

function resolveBattle(data) {
    const t = TERRITORIES[currentTIdx];
    if (!t || data.battleResolved) return; 

    // Веднага маркираме като обработено в базата, за да не забие
    db.ref('rooms/' + roomID).update({ battleResolved: true });

    let winner = null;
    if (data.p1Correct && data.p2Correct) {
        winner = data.p1Time < data.p2Time ? 'p1' : 'p2';
    } else if (data.p1Correct) winner = 'p1';
    else if (data.p2Correct) winner = 'p2';

    if (winner === 'p1') {
        t.owner = 'p1';
        if (myRole === 'player1') { myScore += t.points; myZones++; } 
        else { oppScore += t.points; oppZones++; }
    } else if (winner === 'p2') {
        t.owner = 'p2';
        if (myRole === 'player2') { myScore += t.points; myZones++; }
        else { oppScore += t.points; oppZones++; }
    }

    updateTerritoryUI();
    document.getElementById("scoreVal").textContent = `Вие: ${myScore} | Опонент: ${oppScore}`;

    if (myRole === 'player1') {
        setTimeout(() => {
            currentTIdx++;
            nextBattle();
        }, 3000); 
    }
}

function updateTerritoryUI() {
    territoryStatus.innerHTML = TERRITORIES.map(t => {
        let ownerLabel = "(Свободна)";
        let color = "#666";
        if (t.owner === myRole) { ownerLabel = "(Ваша)"; color = "#27ae60"; }
        else if (t.owner) { ownerLabel = "(Опонент)"; color = "#e74c3c"; }
        return `<p style="color:${color}; font-weight:bold; margin:5px 0;">● ${t.name}: ${t.points}т. ${ownerLabel}</p>`;
    }).join('');
}

function showFinalResults() {
    let resultTitle = "";
    if (myZones > oppZones) {
        resultTitle = "🏆 ВЕЛИКА ПОБЕДА!";
    } else if (oppZones > myZones) {
        resultTitle = "❌ ЗАГУБА";
    } else {
        resultTitle = myScore >= oppScore ? "🏆 ПОБЕДА ПО ТОЧКИ!" : "❌ ЗАГУБА ПО ТОЧКИ";
    }

    qText.innerHTML = `
        <div style="text-align:center">
            <h2>${resultTitle}</h2>
            <p style="font-size:1.2em">Вашият резултат: <b>${myScore}</b> т. (${myZones} зони)</p>
            <p>Опонентът: <b>${oppScore}</b> т. (${oppZones} зони)</p>
        </div>
    `;
    ansButtons.forEach(b => b.style.display = 'none');
    document.getElementById("restartBtn").style.display = "block";
    document.getElementById("restartBtn").onclick = () => window.location.href = "quiz.html";
}

// ====== АДМИН ПАНЕЛ ======
const adminModal = document.getElementById("adminModal");
const adminArea = document.getElementById("adminArea");

document.getElementById("openAdmin").onclick = () => {
    adminModal.style.display = 'flex';
    renderAdminList();
};
document.getElementById("closeModalBtn").onclick = () => adminModal.style.display = 'none';
document.getElementById("closeAdmin").onclick = () => adminModal.style.display = 'none';

document.getElementById("adminLoginBtn").onclick = () => {
    if (document.getElementById("adminPass").value === adminPassword) {
        adminArea.style.display = 'block';
    } else alert("Грешна парола!");
};

function renderAdminList() {
    db.ref('shared_questions').on('value', (snapshot) => {
        const data = snapshot.val();
        const list = document.getElementById("questionsList");
        list.innerHTML = "";
        if (data) {
            Object.keys(data).forEach((key) => {
                const q = data[key];
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                        <span style="font-size:0.9em">${q.q}</span>
                        <button onclick="deleteFromFirebase('${key}')" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">X</button>
                    </div>
                `;
            });
        }
    });
}

window.deleteFromFirebase = (key) => {
    if (confirm("Изтриване на въпроса от облака?")) {
        db.ref('shared_questions/' + key).remove();
    }
};

document.getElementById("addQBtn").onclick = () => {
    const qVal = document.getElementById("newQ").value;
    const a0 = document.getElementById("newA0").value;
    const a1 = document.getElementById("newA1").value;
    const a2 = document.getElementById("newA2").value;
    const a3 = document.getElementById("newA3").value;

    if(!qVal || !a0 || !a1) { alert("Попълнете поне въпроса и първите два отговора!"); return; }

    const newQuestion = {
        q: qVal,
        answers: [a0, a1, a2, a3],
        correct: parseInt(document.getElementById("newCorrect").value)
    };

    db.ref('shared_questions').push(newQuestion).then(() => {
        alert("Въпросът е успешно добавен!");
        document.getElementById("newQ").value = "";
    });
};

document.getElementById("muteBtn").onclick = () => {
    isMuted = !isMuted;
    document.getElementById("muteBtn").textContent = isMuted ? "Включи звук" : "Изключи звук";
};
