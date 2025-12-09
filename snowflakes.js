// snowflakes.js - Анимация снежинок

function createSnowflakes() {
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
  }
}

// Инициализация снежинок при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSnowflakes);
} else {
  createSnowflakes();
}
