// Функция за инициализиране на слайдера
function initializeSlider() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');

    // Проверка дали има снимки
    if (slides.length === 0) {
        console.error("Не са намерени елементи с клас '.slide'. Проверете пътищата.");
        return; 
    }

    // 1. Скриване на всички снимки и показване само на първата
    slides.forEach(slide => slide.style.display = 'none');
    slides[currentSlide].style.display = 'block';

    // Функция за показване на следваща снимка
    const showNext = () => {
        slides[currentSlide].style.display = 'none';
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].style.display = 'block';
    };

    // Функция за показване на предишна снимка
    const showPrev = () => {
        slides[currentSlide].style.display = 'none';
        // Логиката гарантира, че index-ът винаги ще е положителен
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        slides[currentSlide].style.display = 'block';
    };

    // Прикачване на събития към бутоните
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');

    if (prevButton) {
        prevButton.addEventListener('click', showPrev);
    }
    if (nextButton) {
        nextButton.addEventListener('click', showNext);
    }
}

// Изпълнение на функцията, след като цялата страница се е заредила
window.onload = function () {
    initializeSlider();

    // Ако имаш и куиз логиката в същия файл, тя е тук:
    /*
    function checkAnswer(button, isCorrect) {
        const result = document.getElementById('quizResult');
        if (isCorrect) {
            result.textContent = 'Верно! ✅';
            result.style.color = 'green';
        } else {
            result.textContent = 'Грешно! ❌';
            result.style.color = 'red';
        }
    }
    // Глобално излагане на функцията, за да работи с onclick="checkAnswer..."
    window.checkAnswer = checkAnswer; 
    */
};
window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bgMusic');
    const playBtn = document.getElementById('playMusicBtn');

    // Настройка на силата на звука
    bgMusic.volume = 0.5; // 50%

    // Опит за автоматично пускане
    bgMusic.play().catch(error => {
        console.log('Автоматичното пускане на музиката е блокирано от браузъра:', error);
        // Бутонът остава видим за ръчно пускане
    });

    // Функция за бутон
    playBtn.addEventListener('click', () => {
        if (bgMusic.paused) {
            bgMusic.play();
        } else {
            bgMusic.pause();
        }
    });
});
