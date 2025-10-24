// Основные переменные и инициализация
let canvas;
let currentMode = 'pencil';
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#000000';
let brushWidth = 5;
let currentZoom = 1;
let history = [];
let historyIndex = -1;
let isGridVisible = false;
let gridSize = 20;
let currentCanvas = 'default';
let canvases = {};
let selectedObject = null;
let isRainbowMode = false;
let isNightMode = false;
let isSoundEnabled = false;
let currentFillMode = 'none';

// Звуковые эффекты
const sounds = {
  draw: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='),
  click: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='),
  erase: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==')
};

// Инициализация при загрузке страницы
$(document).ready(function() {
  initializeCanvas();
  initializeEventListeners();
  initializeColorPicker();
  initializeSidebar();
  initializeToolbar();
  loadSettings();
  saveState();
  
  // Создаем начальный холст
  createNewCanvas('Основной Холст', 800, 500);
});

// Инициализация Canvas
function initializeCanvas() {
  canvas = new fabric.Canvas('whiteboard', {
    isDrawingMode: true,
    width: 800,
    height: 500,
    backgroundColor: 'rgba(255, 255, 255, 1)'
  });

  canvas.freeDrawingBrush.width = brushWidth;
  canvas.freeDrawingBrush.color = currentColor;

  // Обработчики событий canvas
  canvas.on('path:created', function() {
    saveState();
    playSound('draw');
  });

  canvas.on('object:selected', function(e) {
    selectedObject = e.target;
    updateStatus(`Выбран объект: ${e.target.type}`);
  });

  canvas.on('selection:cleared', function() {
    selectedObject = null;
    updateStatus('Готов к рисованию');
  });
}

// Инициализация обработчиков событий
function initializeEventListeners() {
  // Режимы рисования
  $('.drawing-tool').click(function() {
    $('.drawing-tool').removeClass('active');
    $(this).addClass('active');
    currentMode = $(this).data('mode');
    updateDrawingMode();
  });

  // Цвета
  $('.color-option').click(function() {
    $('.color-option').removeClass('active');
    $(this).addClass('active');
    currentColor = $(this).data('color');
    updateBrush();
  });

  // Толщина кисти
  $('#brushWidth').on('input', function() {
    brushWidth = $(this).val();
    $('#brush-width-value').text(brushWidth);
    updateBrushPreview();
    updateBrush();
  });

  // Очистка холста
  $('#clearCanvasBtn').click(function() {
    if (confirm('Вы уверены, что хотите очистить холст?')) {
      canvas.clear();
      canvas.backgroundColor = 'rgba(255, 255, 255, 1)';
      saveState();
      playSound('erase');
    }
  });

  // Отмена/возврат действий
  $('#undo-btn').click(undo);
  $('#redo-btn').click(redo);

  // Горячие клавиши
  $(document).keydown(function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
  });

  // Сетка
  $('#toggle-grid').click(toggleGrid);
  $('.grid-btn').not('#toggle-grid').click(function() {
    $('.grid-btn').removeClass('active');
    $(this).addClass('active');
    gridSize = parseInt($(this).data('size'));
    if (isGridVisible) {
      drawGrid();
    }
  });

  // Зум
  $('#zoomInBtn').click(() => adjustZoom(0.1));
  $('#zoomOutBtn').click(() => adjustZoom(-0.1));
  $('#resetZoomBtn').click(resetZoom);

  // Сохранение/загрузка
  $('#saveCanvasBtn').click(saveCanvas);
  $('#loadCanvasBtn').click(loadCanvas);

  // Переключение рисования
  $('#toggle-drawing').click(function() {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    $(this).toggleClass('btn-success btn-danger');
    $(this).html(canvas.isDrawingMode ? 
      '<i class="fas fa-pencil-alt"></i> Рисование Включено' : 
      '<i class="fas fa-ban"></i> Рисование Выключено');
    updateStatus(canvas.isDrawingMode ? 'Режим рисования' : 'Режим просмотра');
  });

  // Слои
  $('#sendBackwardBtn').click(sendBackward);
  $('#bringForwardBtn').click(bringForward);
  $('#sendToBackBtn').click(sendToBack);
  $('#bringToFrontBtn').click(bringToFront);

  // Создание нового холста
  $('#createCanvasBtn').click(createCanvasFromModal);

  // Размер холста
  $('#applyCustomSizeBtn').click(applyCustomSize);

  // Настройки интерфейса
  $('#sidebarWidth').on('input', updateSidebarWidth);
  $('#animationSpeed').change(updateAnimationSpeed);
  $('#cursorStyle').change(updateCursorStyle);
  $('#smoothScroll').change(toggleSmoothScroll);
  $('#canvasBgOpacity').on('input', updateCanvasBackgroundOpacity);
  $('#canvasBgColor').on('change', updateCanvasBackgroundColor);

  // Координаты мыши
  $('#whiteboard').on('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    $('#coordinates').text(`X: ${Math.round(x)}, Y: ${Math.round(y)}`);
  });
}

// Инициализация цветового пикера
function initializeColorPicker() {
  $('#color-picker').spectrum({
    color: currentColor,
    showInput: true,
    className: "full-spectrum",
    showInitial: true,
    showPalette: true,
    showSelectionPalette: true,
    maxSelectionSize: 10,
    preferredFormat: "hex",
    localStorageKey: "spectrum.demo",
    move: function(color) {
      currentColor = color.toHexString();
      updateBrush();
    },
    change: function(color) {
      currentColor = color.toHexString();
      $('.color-option').removeClass('active');
      updateBrush();
    }
  });

  $('#canvasBgColor').spectrum({
    color: "#ffffff",
    showInput: true,
    change: function(color) {
      updateCanvasBackgroundColor();
    }
  });
}

// Инициализация бокового меню
function initializeSidebar() {
  $('#sidebarToggle').click(function() {
    $('#sidebar').addClass('open');
  });

  $('#sidebarClose').click(function() {
    $('#sidebar').removeClass('open');
  });

  // Выбор темы
  $('.theme-option').click(function() {
    const theme = $(this).data('theme');
    applyTheme(theme);
    $('.theme-option').removeClass('active');
    $(this).addClass('active');
    saveSettings();
  });

  // Закрытие меню при клике вне его
  $(document).click(function(e) {
    if (!$(e.target).closest('#sidebar, #sidebarToggle').length) {
      $('#sidebar').removeClass('open');
    }
  });
}

// Инициализация панели инструментов
function initializeToolbar() {
  $('#nightModeToggle').click(toggleNightMode);
  $('#rainbowBrushToggle').click(toggleRainbowBrush);
  $('#soundEffectToggle').click(toggleSoundEffects);

  // Easter egg
  $('#easterEggButton').click(activateEasterEgg);
}

// Обновление режима рисования
function updateDrawingMode() {
  canvas.isDrawingMode = (currentMode === 'pencil');
  
  // Показ/скрытие дополнительных панелей
  $('#shape-controls-section').toggle(['rectangle', 'circle', 'line'].includes(currentMode));
  $('#text-controls-section').toggle(currentMode === 'text');
  
  updateStatus(`Режим: ${getModeName(currentMode)}`);
}

// Получение читаемого имени режима
function getModeName(mode) {
  const names = {
    'pencil': 'Карандаш',
    'line': 'Линия',
    'rectangle': 'Прямоугольник',
    'circle': 'Круг',
    'text': 'Текст',
    'select': 'Выбор'
  };
  return names[mode] || mode;
}

// Обновление кисти
function updateBrush() {
  if (canvas.isDrawingMode) {
    canvas.freeDrawingBrush.width = brushWidth;
    canvas.freeDrawingBrush.color = isRainbowMode ? getRainbowColor() : currentColor;
  }
  updateBrushPreview();
}

// Обновление превью кисти
function updateBrushPreview() {
  const preview = $('#brush-preview');
  preview.css({
    'width': `${brushWidth * 4}px`,
    'height': `${brushWidth * 4}px`,
    'background': isRainbowMode ? 'linear-gradient(45deg, #ff0000, #ff9900, #ffff00, #00ff00, #00ffff, #0000ff, #9900ff)' : currentColor
  });
  preview.text(brushWidth);
}

// Получение радужного цвета
function getRainbowColor() {
  const hue = (Date.now() / 50) % 360;
  return `hsl(${hue}, 100%, 50%)`;
}

// Сохранение состояния в историю
function saveState() {
  // Удаляем все состояния после текущего индекса
  history = history.slice(0, historyIndex + 1);
  
  // Сохраняем текущее состояние
  const state = JSON.stringify(canvas.toJSON());
  history.push(state);
  historyIndex++;
  
  // Ограничиваем размер истории
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
  
  updateUndoRedoButtons();
}

// Отмена действия
function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    canvas.loadFromJSON(history[historyIndex], function() {
      canvas.renderAll();
    });
    updateUndoRedoButtons();
    playSound('click');
  }
}

// Возврат действия
function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    canvas.loadFromJSON(history[historyIndex], function() {
      canvas.renderAll();
    });
    updateUndoRedoButtons();
    playSound('click');
  }
}

// Обновление состояния кнопок отмены/возврата
function updateUndoRedoButtons() {
  $('#undo-btn').prop('disabled', historyIndex <= 0);
  $('#redo-btn').prop('disabled', historyIndex >= history.length - 1);
}

// Включение/выключение сетки
function toggleGrid() {
  isGridVisible = !isGridVisible;
  drawGrid();
  updateStatus(isGridVisible ? `Сетка включена (${gridSize}px)` : 'Сетка выключена');
}

// Отрисовка сетки
function drawGrid() {
  // Удаляем старую сетку
  canvas.getObjects().forEach(obj => {
    if (obj.gridLine) {
      canvas.remove(obj);
    }
  });

  if (!isGridVisible) return;

  // Рисуем новую сетку
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // Вертикальные линии
  for (let x = 0; x <= width; x += gridSize) {
    const line = new fabric.Line([x, 0, x, height], {
      stroke: 'rgba(0, 0, 0, 0.1)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      gridLine: true
    });
    canvas.add(line);
  }

  // Горизонтальные линии
  for (let y = 0; y <= height; y += gridSize) {
    const line = new fabric.Line([0, y, width, y], {
      stroke: 'rgba(0, 0, 0, 0.1)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      gridLine: true
    });
    canvas.add(line);
  }

  canvas.renderAll();
}

// Регулировка зума
function adjustZoom(delta) {
  currentZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
  applyZoom();
}

// Сброс зума
function resetZoom() {
  currentZoom = 1;
  applyZoom();
}

// Применение зума
function applyZoom() {
  const zoomDisplay = $('#zoom-display');
  const wrapper = $('#canvasWrapper');
  
  wrapper.css('transform', `scale(${currentZoom})`);
  zoomDisplay.text(`${Math.round(currentZoom * 100)}%`);
  
  updateStatus(`Масштаб: ${Math.round(currentZoom * 100)}%`);
}

// Сохранение холста
function saveCanvas() {
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1
  });
  
  const link = document.createElement('a');
  link.download = 'canvas.png';
  link.href = dataURL;
  link.click();
  
  updateStatus('Холст сохранен как PNG');
  playSound('click');
}

// Загрузка холста
function loadCanvas() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        fabric.Image.fromURL(event.target.result, function(img) {
          canvas.clear();
          canvas.add(img);
          canvas.renderAll();
          saveState();
          updateStatus('Изображение загружено на холст');
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  input.click();
}

// Управление слоями
function sendBackward() {
  if (selectedObject) {
    canvas.sendBackwards(selectedObject);
    saveState();
  }
}

function bringForward() {
  if (selectedObject) {
    canvas.bringForward(selectedObject);
    saveState();
  }
}

function sendToBack() {
  if (selectedObject) {
    canvas.sendToBack(selectedObject);
    saveState();
  }
}

function bringToFront() {
  if (selectedObject) {
    canvas.bringToFront(selectedObject);
    saveState();
  }
}

// Создание нового холста
function createNewCanvas(name, width, height) {
  const canvasId = `canvas-${Date.now()}`;
  
  canvases[canvasId] = {
    id: canvasId,
    name: name,
    width: width,
    height: height,
    data: null
  };
  
  addCanvasTab(canvasId, name);
  switchCanvas(canvasId);
  
  return canvasId;
}

// Добавление вкладки холста
function addCanvasTab(canvasId, name) {
  const tab = $(`
    <div class="canvas-tab active" data-canvas="${canvasId}">
      <i class="fas fa-palette"></i>
      ${name}
      <button class="canvas-tab-close"><i class="fas fa-times"></i></button>
    </div>
  `);
  
  $('#canvasTabs').append(tab);
  
  // Обработчик переключения вкладок
  tab.click(function(e) {
    if (!$(e.target).hasClass('canvas-tab-close')) {
      switchCanvas(canvasId);
    }
  });
  
  // Обработчик закрытия вкладки
  tab.find('.canvas-tab-close').click(function(e) {
    e.stopPropagation();
    closeCanvas(canvasId);
  });
}

// Переключение между холстами
function switchCanvas(canvasId) {
  // Сохраняем текущее состояние
  if (currentCanvas && canvases[currentCanvas]) {
    canvases[currentCanvas].data = JSON.stringify(canvas.toJSON());
  }
  
  // Обновляем активную вкладку
  $('.canvas-tab').removeClass('active');
  $(`.canvas-tab[data-canvas="${canvasId}"]`).addClass('active');
  
  // Загружаем новый холст
  const canvasData = canvases[canvasId];
  canvas.setDimensions({
    width: canvasData.width,
    height: canvasData.height
  });
  
  if (canvasData.data) {
    canvas.loadFromJSON(canvasData.data, function() {
      canvas.renderAll();
    });
  } else {
    canvas.clear();
    canvas.backgroundColor = 'rgba(255, 255, 255, 1)';
  }
  
  currentCanvas = canvasId;
  saveState();
  updateStatus(`Активный холст: ${canvasData.name}`);
}

// Закрытие холста
function closeCanvas(canvasId) {
  if (Object.keys(canvases).length <= 1) {
    alert('Нельзя закрыть последний холст!');
    return;
  }
  
  delete canvases[canvasId];
  $(`.canvas-tab[data-canvas="${canvasId}"]`).remove();
  
  // Переключаемся на первый доступный холст
  const firstCanvasId = Object.keys(canvases)[0];
  if (firstCanvasId) {
    switchCanvas(firstCanvasId);
  }
}

// Создание холста из модального окна - ИСПРАВЛЕННАЯ ВЕРСИЯ
function createCanvasFromModal() {
  const name = $('#canvasName').val() || 'Новый Холст';
  const activeSizeBtn = $('.size-btn.active');
  const sizeType = activeSizeBtn.data('size');
  
  let width, height;
  
  console.log('Selected size type:', sizeType); // Для отладки
  
  if (sizeType === 'custom') {
    width = parseInt($('#newCanvasWidth').val()) || 800;
    height = parseInt($('#newCanvasHeight').val()) || 500;
  } else {
    const sizes = {
      'standard': [800, 500],
      'wide': [1200, 500],
      'long': [800, 800],
      'large': [1200, 800]
    };
    
    if (sizes[sizeType]) {
      [width, height] = sizes[sizeType];
    } else {
      // Если тип размера не найден, используем стандартный
      [width, height] = [800, 500];
    }
  }
  
  console.log('Creating canvas with size:', width, 'x', height); // Для отладки
  createNewCanvas(name, width, height);
  $('#newCanvasModal').modal('hide');
}

// Применение пользовательского размера
function applyCustomSize() {
  const width = parseInt($('#customWidth').val()) || 800;
  const height = parseInt($('#customHeight').val()) || 500;
  
  canvas.setDimensions({
    width: width,
    height: height
  });
  
  if (isGridVisible) {
    drawGrid();
  }
  
  $('#canvasSizeModal').modal('hide');
  updateStatus(`Размер холста изменен: ${width}×${height}`);
}

// Применение темы оформления
function applyTheme(theme) {
  $('body').removeClass(function(index, className) {
    return (className.match(/(^|\s)theme-\S+/g) || []).join(' ');
  });
  
  if (theme !== 'default') {
    $('body').addClass(`theme-${theme}`);
  }
  
  updateStatus(`Применена тема: ${getThemeName(theme)}`);
}

// Получение читаемого имени темы
function getThemeName(theme) {
  const names = {
    'default': 'По умолчанию',
    'dark': 'Темная',
    'nature': 'Природа',
    'ocean': 'Океан',
    'sunset': 'Закат',
    'purple': 'Фиолетовая',
    'cosmos': 'Космос'
  };
  return names[theme] || theme;
}

// Переключение ночного режима
function toggleNightMode() {
  isNightMode = !isNightMode;
  $('body').toggleClass('night-mode', isNightMode);
  $('#nightModeToggle').toggleClass('active', isNightMode);
  updateStatus(isNightMode ? 'Ночной режим включен' : 'Ночной режим выключен');
  saveSettings();
}

// Переключение радужной кисти
function toggleRainbowBrush() {
  isRainbowMode = !isRainbowMode;
  $('#rainbowBrushToggle').toggleClass('active', isRainbowMode);
  updateBrush();
  updateStatus(isRainbowMode ? 'Радужная кисть включена' : 'Радужная кисть выключена');
  
  if (isRainbowMode) {
    startRainbowAnimation();
  }
}

// Анимация радужной кисти
function startRainbowAnimation() {
  if (isRainbowMode) {
    updateBrush();
    requestAnimationFrame(startRainbowAnimation);
  }
}

// Переключение звуковых эффектов
function toggleSoundEffects() {
  isSoundEnabled = !isSoundEnabled;
  $('#soundEffectToggle').toggleClass('active', isSoundEnabled);
  updateStatus(isSoundEnabled ? 'Звуковые эффекты включены' : 'Звуковые эффекты выключены');
  saveSettings();
}

// Воспроизведение звука
function playSound(type) {
  if (isSoundEnabled && sounds[type]) {
    sounds[type].currentTime = 0;
    sounds[type].play().catch(() => {
      // Игнорируем ошибки воспроизведения
    });
  }
}

// Easter egg функция
function activateEasterEgg() {
  $('body').addClass('rainbow-mode');
  updateStatus('🎉 Пасхалка активирована! Волшебство начинается!');
  
  setTimeout(() => {
    $('body').removeClass('rainbow-mode');
  }, 3000);
}

// Обновление статуса
function updateStatus(message) {
  $('#status').text(message);
}

// Настройки интерфейса
function updateSidebarWidth() {
  const width = $('#sidebarWidth').val();
  document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  saveSettings();
}

function updateAnimationSpeed() {
  const speed = $('#animationSpeed').val();
  $('body').css('--animation-speed', speed);
  saveSettings();
}

function updateCursorStyle() {
  const style = $('#cursorStyle').val();
  const canvasElement = document.getElementById('whiteboard');
  
  if (style === 'custom') {
    const url = $('#cursorUrl').val();
    if (url) {
      canvasElement.style.cursor = `url('${url}'), auto`;
    }
  } else {
    canvasElement.style.cursor = style;
  }
  saveSettings();
}

function toggleSmoothScroll() {
  const enabled = $('#smoothScroll').is(':checked');
  $('html').css('scroll-behavior', enabled ? 'smooth' : 'auto');
  saveSettings();
}

function updateCanvasBackgroundOpacity() {
  const opacity = $('#canvasBgOpacity').val();
  const currentBg = canvas.backgroundColor;
  const newBg = currentBg.replace(/rgba?\(([^,]+),([^,]+),([^,]+)(?:,([^)]+))?\)/, 
    `rgba($1,$2,$3,${opacity})`);
  canvas.backgroundColor = newBg;
  canvas.renderAll();
  saveSettings();
}

function updateCanvasBackgroundColor() {
  const color = $('#canvasBgColor').spectrum('get').toHexString();
  const opacity = $('#canvasBgOpacity').val();
  canvas.backgroundColor = `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${opacity})`;
  canvas.renderAll();
  saveSettings();
}

// Сохранение настроек в localStorage
function saveSettings() {
  const settings = {
    theme: $('.theme-option.active').data('theme'),
    sidebarWidth: $('#sidebarWidth').val(),
    animationSpeed: $('#animationSpeed').val(),
    cursorStyle: $('#cursorStyle').val(),
    smoothScroll: $('#smoothScroll').is(':checked'),
    canvasBgOpacity: $('#canvasBgOpacity').val(),
    canvasBgColor: $('#canvasBgColor').spectrum('get').toHexString(),
    nightMode: isNightMode,
    soundEffects: isSoundEnabled
  };
  
  localStorage.setItem('canvasSettings', JSON.stringify(settings));
}

// Загрузка настроек из localStorage
function loadSettings() {
  const saved = localStorage.getItem('canvasSettings');
  if (saved) {
    const settings = JSON.parse(saved);
    
    // Применяем настройки
    if (settings.theme) {
      $(`.theme-option[data-theme="${settings.theme}"]`).click();
    }
    
    if (settings.sidebarWidth) {
      $('#sidebarWidth').val(settings.sidebarWidth).trigger('input');
    }
    
    if (settings.animationSpeed) {
      $('#animationSpeed').val(settings.animationSpeed).change();
    }
    
    if (settings.cursorStyle) {
      $('#cursorStyle').val(settings.cursorStyle).change();
    }
    
    if (settings.smoothScroll !== undefined) {
      $('#smoothScroll').prop('checked', settings.smoothScroll).change();
    }
    
    if (settings.canvasBgOpacity) {
      $('#canvasBgOpacity').val(settings.canvasBgOpacity).trigger('input');
    }
    
    if (settings.canvasBgColor) {
      $('#canvasBgColor').spectrum('set', settings.canvasBgColor);
    }
    
    if (settings.nightMode) {
      $('#nightModeToggle').click();
    }
    
    if (settings.soundEffects) {
      $('#soundEffectToggle').click();
    }
  }
}

// Калькулятор - ПОЛНОСТЬЮ НОВАЯ РАБОЧАЯ ВЕРСИЯ
class Calculator {
    constructor() {
        this.currentInput = '0';
        this.previousInput = '';
        this.operator = null;
        this.waitingForNewInput = false;
        
        this.displayElement = $('#calcDisplay');
        this.operationElement = $('#calcOperation');
        
        this.initializeEventListeners();
        this.updateDisplay();
    }
    
    initializeEventListeners() {
        // Цифры
        $('.calculator-btn[data-number]').click((e) => {
            this.inputNumber($(e.target).data('number'));
        });
        
        // Десятичная точка
        $('#calcDecimal').click(() => {
            this.inputDecimal();
        });
        
        // Операторы
        $('.calculator-btn[data-operator]').click((e) => {
            this.handleOperator($(e.target).data('operator'));
        });
        
        // Равно
        $('#calcEquals').click(() => {
            this.calculate();
        });
        
        // Очистка
        $('#calcClear').click(() => {
            this.clear();
        });
        
        // Удаление
        $('#calcDelete').click(() => {
            this.deleteLast();
        });
    }
    
    inputNumber(num) {
        if (this.waitingForNewInput) {
            this.currentInput = String(num);
            this.waitingForNewInput = false;
        } else {
            this.currentInput = this.currentInput === '0' ? String(num) : this.currentInput + String(num);
        }
        this.updateDisplay();
    }
    
    inputDecimal() {
        if (this.waitingForNewInput) {
            this.currentInput = '0.';
            this.waitingForNewInput = false;
        } else if (this.currentInput.indexOf('.') === -1) {
            this.currentInput += '.';
        }
        this.updateDisplay();
    }
    
    handleOperator(nextOperator) {
        const inputValue = parseFloat(this.currentInput);
        
        if (this.previousInput === '' && !isNaN(inputValue)) {
            this.previousInput = this.currentInput;
            this.operator = nextOperator;
            this.waitingForNewInput = true;
        } else if (this.operator) {
            this.calculate();
            this.operator = nextOperator;
            this.waitingForNewInput = true;
        }
        
        this.updateDisplay();
    }
    
    calculate() {
        if (this.operator === null || this.waitingForNewInput) return;
        
        const prevValue = parseFloat(this.previousInput);
        const currentValue = parseFloat(this.currentInput);
        let result;
        
        switch (this.operator) {
            case '+':
                result = prevValue + currentValue;
                break;
            case '-':
                result = prevValue - currentValue;
                break;
            case '*':
                result = prevValue * currentValue;
                break;
            case '/':
                result = currentValue !== 0 ? prevValue / currentValue : 0;
                break;
            case '%':
                result = prevValue % currentValue;
                break;
            default:
                return;
        }
        
        this.currentInput = String(result);
        this.previousInput = '';
        this.operator = null;
        this.waitingForNewInput = true;
        this.updateDisplay();
    }
    
    clear() {
        this.currentInput = '0';
        this.previousInput = '';
        this.operator = null;
        this.waitingForNewInput = false;
        this.updateDisplay();
    }
    
    deleteLast() {
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
        } else {
            this.currentInput = '0';
        }
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.displayElement.text(this.currentInput);
        
        if (this.previousInput !== '' && this.operator) {
            this.operationElement.text(`${this.previousInput} ${this.getOperatorSymbol(this.operator)}`);
        } else {
            this.operationElement.text('');
        }
    }
    
    getOperatorSymbol(op) {
        const symbols = {
            '+': '+',
            '-': '-',
            '*': '×',
            '/': '÷',
            '%': '%'
        };
        return symbols[op] || op;
    }
}

// Инициализация калькулятора
$(document).ready(function() {
    let calculator = null;
    
    // Инициализируем калькулятор когда открывается модальное окно
    $('#calculatorModal').on('shown.bs.modal', function() {
        calculator = new Calculator();
    });
    
    // Очищаем калькулятор при закрытии модального окна
    $('#calculatorModal').on('hidden.bs.modal', function() {
        if (calculator) {
            calculator.clear();
        }
    });
});

// Инициализация модальных окон
$(document).ready(function() {
  // Выбор размера холста - ИСПРАВЛЕННАЯ ВЕРСИЯ
  $('.size-btn').click(function() {
    $('.size-btn').removeClass('active');
    $(this).addClass('active');
    
    // Показываем/скрываем поля для пользовательского размера
    if ($(this).data('size') === 'custom') {
      $('#newCanvasWidth').closest('.form-group').show();
      $('#newCanvasHeight').closest('.form-group').show();
    } else {
      $('#newCanvasWidth').closest('.form-group').hide();
      $('#newCanvasHeight').closest('.form-group').hide();
    }
  });

  // При открытии модального окна скрываем поля пользовательского размера
  $('#newCanvasModal').on('show.bs.modal', function() {
    $('#newCanvasWidth').closest('.form-group').hide();
    $('#newCanvasHeight').closest('.form-group').hide();
  });

  // Автофокус на поле имени холста
  $('#newCanvasModal').on('shown.bs.modal', function() {
    $('#canvasName').focus();
  });
});