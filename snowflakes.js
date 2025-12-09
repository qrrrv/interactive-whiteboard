// snowflakes.js - Анимация снежинок

let isSnowflakesActive = false;
let snowflakeElements = [];

function clearSnowflakes() {
  snowflakeElements.forEach(el => el.remove());
  snowflakeElements = [];
}

function toggleSnowflakes(shouldBeActive) {
  isSnowflakesActive = shouldBeActive;
  if (isSnowflakesActive) {
    createSnowflakes();
  } else {
    clearSnowflakes();
  }
}

function createSnowflakes() {
  if (!isSnowflakesActive) return;
  const snowflakeCount = 50;
  const snowflakeSymbols = ['❄', '❅', '❆'];
  
  for (let i = 0; i < snowflakeCount; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
    
    // Случайная позиция по горизонтали
    snowflake.style.left = Math.random() * 100 + '%';
    
    // Случайная задержка анимации
    snowflake.style.animationDelay = Math.random() * 10 + 's';
    
    // Случайная продолжительность анимации
    const duration = Math.random() * 5 + 10;
    snowflake.style.animationDuration = duration + 's';
    
    document.body.appendChild(snowflake);
    snowflakeElements.push(snowflake);
  }
}

// Экспорт функции для использования в ui.js
// Снежинки будут инициализированы через ui.js, если тема "winter" активна по умолчанию
// или через переключатель в настройках.
// export { toggleSnowflakes };
