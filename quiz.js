// ====== FIREBASE CONFIG (Твоите данни) ======
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
const STORAGE_KEY = "gd_quiz_questions_v1";
const TERRITORIES = [
    { name: "Градски парк", points: 100, owner: null },
    { name: "Панорама", points: 150, owner: null },
    { name: "Дом на културата", points: 200, owner: null },
    { name: "Исторически музей", points: 120, owner: null },
    { name: "Манастир", points: 250, owner: null },
    { name: "Център", points: 180, owner: null }
];

let questions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let roomID = new URLSearchParams(window.location.search).get('room');
let myRole = roomID ? 'player2' : 'player1';
let currentTIdx = 0;
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

// ====== ИНИЦИАЛИЗАЦИЯ ======

if (roomID) {
    setupContainer.innerHTML = "<h3>Свързване към играта...</h3>";
    db.ref('rooms/' + roomID).update({ status: 'playing' });
    initGame();
}

createRoomBtn.onclick = () => {
    roomID = "room_" + Math.random().toString(36).substr(2, 6);
    const url = window.location.href + "?room=" + roomID;
    
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), url);
    document.getElementById("setup-msg").innerHTML = `<b>Стаята е създадена!</b><br>Сканирайте QR кода с втория телефон.`;
    createRoomBtn.style.display = "none";

    db.ref('rooms/' + roomID).set({
        status: 'waiting',
        currentTIdx: -1,
        p1Ready: false, p2Ready: false,
        p1Correct: false, p2Correct: false,
        p1Time: 999, p2Time: 999
    });

    db.ref('rooms/' + roomID + '/status').on('value', (snap) => {
        if (snap.val() === 'playing') initGame();
    });
};

function initGame() {
    setupContainer.style.display = "none";
    updateTerritoryUI();
    if (myRole === 'player1') nextBattle();
    listenForUpdates();
}

// ====== ЛОГИКА НА БИТКАТА ======

function nextBattle() {
    if (currentTIdx >= TERRITORIES.length) {
        db.ref('rooms/' + roomID).update({ status: 'finished' });
        return;
    }
    // Player 1 избира случаен въпрос
    const qIdx = Math.floor(Math.random() * questions.length);
    db.ref('rooms/' + roomID).update({
        currentTIdx: currentTIdx,
        currentQIdx: qIdx,
        p1Ready: false, p2Ready: false
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

        // Нов въпрос
        if (data.currentTIdx !== -1 && data.currentTIdx !== currentTIdx - 1) {
            if (data.p1Ready === false && data.p2Ready === false) {
                currentTIdx = data.currentTIdx;
                showQuestion(questions[data.currentQIdx]);
            }
        }

        // Когато и двамата са отговорили
        if (data.p1Ready && data.p2Ready) {
            resolveBattle(data);
        }
    });
}

function showQuestion(q) {
    const t = TERRITORIES[currentTIdx];
    qText.innerHTML = `<small>Битка за: ${t.name}</small><br>${q.q}`;
    startTime = Date.now();
    timeLeft = 15;
    document.getElementById("timeLeft").textContent = timeLeft;

    ansButtons.forEach((btn, i) => {
        btn.textContent = q.answers[i];
        btn.className = "answer-btn";
        btn.style.display = "inline-block";
        btn.disabled = false;
        btn.onclick = () => handleAnswer(i, q.correct);
    });

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timeLeft").textContent = timeLeft;
        if (timeLeft <= 0) handleAnswer(-1, q.correct);
    }, 1000);
}

function handleAnswer(idx, correct) {
    clearInterval(timerInterval);
    const timeTaken = (Date.now() - startTime) / 1000;
    ansButtons.forEach(b => b.disabled = true);

    const isCorrect = (idx === correct);
    if (isCorrect) {
        ansButtons[idx].classList.add('correct');
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
        if (t.owner === myRole) { ownerLabel = "(Ваша)"; color = "green"; }
        else if (t.owner) { ownerLabel = "(Опонент)"; color = "red"; }
        return `<p style="color:${color}">● ${t.name}: ${t.points}т. ${ownerLabel}</p>`;
    }).join('');
}

function showFinalResults() {
    let msg = myZones > oppZones ? "ПОБЕДА! Вие завладяхте града!" : "ЗАГУБА! Опонентът беше по-добър.";
    if (myZones === oppZones) {
        msg = myScore >= oppScore ? "ПОБЕДА ПО ТОЧКИ!" : "ЗАГУБА ПО ТОЧКИ!";
    }
    qText.innerHTML = `<h3>Играта приключи</h3>${msg}<br>Територии: ${myZones} срещу ${oppZones}`;
    ansButtons.forEach(b => b.style.display = 'none');
    document.getElementById("restartBtn").style.display = "block";
    document.getElementById("restartBtn").onclick = () => window.location.href = "quiz.html";
}

// ====== АДМИН ПАНЕЛ (Твоят код) ======

const adminModal = document.getElementById("adminModal");
const adminArea = document.getElementById("adminArea");

document.getElementById("openAdmin").onclick = () => adminModal.style.display = 'flex';
document.getElementById("closeModalBtn").onclick = () => adminModal.style.display = 'none';
document.getElementById("closeAdmin").onclick = () => adminModal.style.display = 'none';

document.getElementById("adminLoginBtn").onclick = () => {
    if (document.getElementById("adminPass").value === adminPassword) {
        adminArea.style.display = 'block';
        renderAdminList();
    } else alert("Грешна парола!");
};

function renderAdminList() {
    const list = document.getElementById("questionsList");
    list.innerHTML = questions.map((q, i) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #eee;">
            <span>${q.q}</span>
            <button onclick="deleteQ(${i})" class="tertiary">X</button>
        </div>
    `).join('');
}

window.deleteQ = (i) => {
    if (confirm("Изтриване?")) {
        questions.splice(i, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
        renderAdminList();
    }
};

document.getElementById("addQBtn").onclick = () => {
    const q = {
        q: document.getElementById("newQ").value,
        answers: [
            document.getElementById("newA0").value,
            document.getElementById("newA1").value,
            document.getElementById("newA2").value,
            document.getElementById("newA3").value
        ],
        correct: parseInt(document.getElementById("newCorrect").value)
    };
    questions.push(q);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    renderAdminList();
    alert("Въпросът е добавен!");
};

document.getElementById("muteBtn").onclick = () => {
    isMuted = !isMuted;
    document.getElementById("muteBtn").textContent = isMuted ? "Включи звук" : "Изключи звук";
};
