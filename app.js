// ========== ПЕРЕМЕННЫЕ ==========
let canvas, ctx;
let currentMode = 'pencil';
let currentColor = '#000000';
let brushWidth = 5;
let fillMode = false;
let isDrawing = false;
let startX, startY;
let tempShape = null;
let history = [];
let historyIndex = -1;
let currentZoom = 1;
let canvases = {};
let currentCanvasId = null;
let isRainbowMode = false;
let isFullscreen = false;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
$(document).ready(function() {
  initCanvas();
  initToolbar();
  initCalculator();
  initCanvasResize();
  initFullscreen();
  initCollaboration();
  createNewCanvas('Основной', 800, 500);
  saveState();
});

function initCanvas() {
  canvas = new fabric.Canvas('whiteboard', {
    isDrawingMode: true,
    width: 800,
    height: 500,
    backgroundColor: '#ffffff'
  });
  
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.width = brushWidth;
  canvas.freeDrawingBrush.color = currentColor;
  
  // Сохранение после рисования
  canvas.on('path:created', () => saveState());
  canvas.on('object:modified', () => saveState());
  
  // Координаты мыши
  canvas.on('mouse:move', function(e) {
    const p = canvas.getPointer(e.e);
    $('#coordinates').text(`X: ${Math.round(p.x)}, Y: ${Math.round(p.y)}`);
  });
  
  // Рисование фигур
  canvas.on('mouse:down', onMouseDown);
  canvas.on('mouse:move', onMouseMove);
  canvas.on('mouse:up', onMouseUp);
}

// ========== ИЗМЕНЕНИЕ РАЗМЕРА ХОЛСТА ==========
function initCanvasResize() {
  // Открытие модалки
  $('#resizeCanvasBtn').click(function() {
    updateCurrentSizeDisplay();
    $('#resizeCanvasModal').modal('show');
  });
  
  // Быстрые пресеты
  $('.preset-btn').click(function() {
    $('.preset-btn').removeClass('active');
    $(this).addClass('active');
    const width = $(this).data('width');
    const height = $(this).data('height');
    $('#canvasWidth').val(width);
    $('#canvasHeight').val(height);
  });
  
  // Применить размер
  $('#applyResize').click(function() {
    const width = parseInt($('#canvasWidth').val());
    const height = parseInt($('#canvasHeight').val());
    
    if (width < 100 || width > 5000 || height < 100 || height > 5000) {
      alert('Размер должен быть от 100 до 5000 пикселей');
      return;
    }
    
    resizeCanvas(width, height);
    $('#resizeCanvasModal').modal('hide');
    updateStatus(`Размер изменен: ${width}×${height}`);
  });
}

function resizeCanvas(width, height) {
  // Сохраняем текущее содержимое
  const jsonData = JSON.stringify(canvas.toJSON());
  
  // Изменяем размер
  canvas.setDimensions({ width: width, height: height });
  
  // Восстанавливаем содержимое
  canvas.loadFromJSON(jsonData, () => {
    canvas.renderAll();
    saveState();
  });
  
  // Обновляем данные холста
  if (currentCanvasId && canvases[currentCanvasId]) {
    canvases[currentCanvasId].w = width;
    canvases[currentCanvasId].h = height;
  }
  
  // Центрируем если нужно
  centerCanvas();
}

function updateCurrentSizeDisplay() {
  const width = canvas.width;
  const height = canvas.height;
  $('#currentSize').text(`${width}×${height}`);
  $('#canvasWidth').val(width);
  $('#canvasHeight').val(height);
}

function centerCanvas() {
  const wrapper = $('#canvasWrapper');
  const container = $('.whiteboard-container');
  
  // Центрируем холст в контейнере
  const containerWidth = container.width();
  const canvasWidth = canvas.width * currentZoom;
  
  if (canvasWidth < containerWidth) {
    wrapper.css('margin', '0 auto');
  }
}

// ========== ПОЛНОЭКРАННЫЙ РЕЖИМ (ИСПРАВЛЕН) ==========
function initFullscreen() {
  $('#fullscreenBtn').click(function() {
    toggleFullscreen();
  });
  
  // Кнопки в полноэкранном режиме
  $('#fullscreenSaveBtn').click(saveImage);
  $('#fullscreenClearBtn').click(clearCanvas);
  $('#fullscreenUndoBtn').click(undo);
  $('#fullscreenRedoBtn').click(redo);
  
  // ESC для выхода
  $(document).keydown(function(e) {
    if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  });
}

function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  $('body').toggleClass('fullscreen-mode', isFullscreen);
  
  if (isFullscreen) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
}

function enterFullscreen() {
  // Сохраняем оригинальные размеры
  canvas._originalWidth = canvas.width;
  canvas._originalHeight = canvas.height;
  
  // Сохраняем содержимое
  const canvasData = JSON.stringify(canvas.toJSON());
  
  // Устанавливаем размер холста на весь экран
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Изменяем размер холста БЕЗ масштабирования объектов
  canvas.setWidth(screenWidth);
  canvas.setHeight(screenHeight);
  
  // Восстанавливаем содержимое с правильным масштабированием
  canvas.loadFromJSON(canvasData, function() {
    // Масштабируем все объекты пропорционально
    const scaleX = screenWidth / canvas._originalWidth;
    const scaleY = screenHeight / canvas._originalHeight;
    const scale = Math.min(scaleX, scaleY); // Используем меньший масштаб
    
    canvas.getObjects().forEach(function(obj) {
      obj.scaleX = (obj.scaleX || 1) * scale;
      obj.scaleY = (obj.scaleY || 1) * scale;
      obj.left = obj.left * scale;
      obj.top = obj.top * scale;
      obj.setCoords();
    });
    
    canvas.renderAll();
  });
  
  // Сбрасываем зум
  currentZoom = 1;
  $('#canvasWrapper').css('transform', 'scale(1)');
  
  updateStatus('Полноэкранный режим (ESC для выхода)');
  
  // Меняем иконку кнопки
  $('#fullscreenBtn i').removeClass('fa-expand').addClass('fa-compress');
  $('#fullscreenBtn').addClass('active');
}

function exitFullscreen() {
  // Сохраняем содержимое
  const canvasData = JSON.stringify(canvas.toJSON());
  
  // Восстанавливаем оригинальный размер
  const originalWidth = canvas._originalWidth || 800;
  const originalHeight = canvas._originalHeight || 500;
  
  // Изменяем размер обратно
  canvas.setWidth(originalWidth);
  canvas.setHeight(originalHeight);
  
  // Восстанавливаем содержимое с обратным масштабированием
  canvas.loadFromJSON(canvasData, function() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = originalWidth / screenWidth;
    const scaleY = originalHeight / screenHeight;
    const scale = Math.max(scaleX, scaleY);
    
    canvas.getObjects().forEach(function(obj) {
      obj.scaleX = (obj.scaleX || 1) * scale;
      obj.scaleY = (obj.scaleY || 1) * scale;
      obj.left = obj.left * scale;
      obj.top = obj.top * scale;
      obj.setCoords();
    });
    
    canvas.renderAll();
  });
  
  // Возвращаем обычный масштаб
  currentZoom = 1;
  $('#canvasWrapper').css('transform', 'scale(1)');
  $('#zoomLevel').text('100%');
  
  updateStatus('Обычный режим');
  
  // Меняем иконку кнопки обратно
  $('#fullscreenBtn i').removeClass('fa-compress').addClass('fa-expand');
  $('#fullscreenBtn').removeClass('active');
}

// ========== ПАНЕЛЬ ИНСТРУМЕНТОВ ==========
function initToolbar() {
  // Выбор инструмента
  $('.tool-btn[data-mode]').click(function() {
    $('.tool-btn[data-mode]').removeClass('active');
    $(this).addClass('active');
    currentMode = $(this).data('mode');
    updateMode();
  });
  
  // Выбор цвета
  $('.color-btn').click(function() {
    $('.color-btn').removeClass('active');
    $(this).addClass('active');
    currentColor = $(this).data('color');
    updateBrush();
  });
  
  $('#colorPicker').on('input', function() {
    currentColor = $(this).val();
    $('.color-btn').removeClass('active');
    updateBrush();
  });
  
  // Размер кисти
  $('#brushSize').on('input', function() {
    brushWidth = parseInt($(this).val());
    $('#brushSizeValue').text(brushWidth);
    updateBrush();
  });
  
  // Заливка
  $('#fillToggle').click(function() {
    fillMode = !fillMode;
    $(this).toggleClass('active', fillMode);
    updateStatus(fillMode ? 'Заливка ВКЛ' : 'Заливка ВЫКЛ');
  });
  
  // Действия
  $('#undoBtn').click(undo);
  $('#redoBtn').click(redo);
  $('#clearBtn').click(clearCanvas);
  
  // Свернуть панель
  $('#collapseToolbar').click(function() {
    $('#floatingToolbar').toggleClass('collapsed');
  });
  
  // Зум
  $('#zoomIn').click(() => zoom(0.1));
  $('#zoomOut').click(() => zoom(-0.1));
  
  // Сохранить/Загрузить
  $('#saveCanvasBtn').click(saveImage);
  $('#loadCanvasBtn').click(loadImage);
  $('#newCanvasBtn').click(() => {
    const name = prompt('Название холста:', 'Новый холст');
    if (name) createNewCanvas(name, 800, 500);
  });
  
  // Радужная кисть
  $('#rainbowBrushToggle').click(function() {
    isRainbowMode = !isRainbowMode;
    $(this).toggleClass('active', isRainbowMode);
    if (isRainbowMode) animateRainbow();
  });
  
  // Настройки
  $('#settingsBtn').click(function() {
    $('#settingsPanel').toggleClass('open');
  });
  
  $('#closeSettings').click(function() {
    $('#settingsPanel').removeClass('open');
  });
  
  // Темы
  $('.theme-option').click(function() {
    $('.theme-option').removeClass('active');
    $(this).addClass('active');
    const theme = $(this).data('theme');
    
    $('body').removeClass('dark-mode theme-winter theme-ocean theme-sunset theme-forest theme-purple');
    if (theme === 'dark') $('body').addClass('dark-mode');
    else if (theme !== 'light') $('body').addClass('theme-' + theme);
    
    localStorage.setItem('theme', theme);
    updateStatus('Тема изменена: ' + $(this).find('span').text());
  });
  
  // Загрузка сохраненной темы или зимней по умолчанию
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    $(`.theme-option[data-theme="${savedTheme}"]`).click();
  } else {
    // Установка зимней темы по умолчанию
    $(`.theme-option[data-theme="winter"]`).click();
  }
  
  // Настройки интерфейса
  $('#showCoordinates').change(function() {
    $('#coordinates').toggle(this.checked);
  });
  
  $('#showStatusBar').change(function() {
    $('.status-bar').toggle(this.checked);
  });
  
  $('#autoSave').change(function() {
    if (this.checked) {
      window.autoSaveInterval = setInterval(() => {
        if (currentCanvasId) {
          canvases[currentCanvasId].data = JSON.stringify(canvas.toJSON());
          updateStatus('Автосохранение выполнено');
        }
      }, 300000);
    } else {
      clearInterval(window.autoSaveInterval);
    }
  });
  
  $('#smoothDrawing').change(function() {
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.strokeLineCap = this.checked ? 'round' : 'square';
      canvas.freeDrawingBrush.strokeLineJoin = this.checked ? 'round' : 'miter';
    }
  });
  
  // Горячие клавиши
  $(document).keydown(function(e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 'Delete') deleteSelected();
  });
}

// ========== РЕЖИМЫ РИСОВАНИЯ ==========
function updateMode() {
  const drawModes = ['pencil', 'eraser'];
  canvas.isDrawingMode = drawModes.includes(currentMode);
  canvas.selection = (currentMode === 'select');
  
  if (canvas.isDrawingMode) updateBrush();
  updateStatus('Режим: ' + getModeName(currentMode));
}

function updateBrush() {
  if (!canvas.isDrawingMode) return;
  canvas.freeDrawingBrush.width = currentMode === 'eraser' ? 30 : brushWidth;
  canvas.freeDrawingBrush.color = currentMode === 'eraser' ? '#ffffff' : currentColor;
}

function getModeName(m) {
  const names = { pencil:'Кисть', eraser:'Ластик', select:'Выбор', line:'Линия', rectangle:'Прямоугольник', circle:'Круг', triangle:'Треугольник', ellipse:'Эллипс', star:'Звезда', arrow:'Стрелка', text:'Текст' };
  return names[m] || m;
}

// ========== РИСОВАНИЕ ФИГУР ==========
function onMouseDown(e) {
  if (canvas.isDrawingMode || currentMode === 'select') return;
  
  const p = canvas.getPointer(e.e);
  isDrawing = true;
  startX = p.x;
  startY = p.y;
  
  if (currentMode === 'text') {
    addText(p.x, p.y);
    isDrawing = false;
    return;
  }
  
  tempShape = createShape(currentMode, p.x, p.y, 0, 0);
  if (tempShape) canvas.add(tempShape);
}

function onMouseMove(e) {
  if (!isDrawing || !tempShape) return;
  const p = canvas.getPointer(e.e);
  updateShape(tempShape, currentMode, startX, startY, p.x, p.y);
  canvas.renderAll();
}

function onMouseUp() {
  if (!isDrawing) return;
  isDrawing = false;
  if (tempShape) {
    tempShape.setCoords();
    saveState();
  }
  tempShape = null;
}

function createShape(mode, x, y, w, h) {
  const stroke = currentColor;
  const fill = fillMode ? currentColor : 'transparent';
  const sw = brushWidth;
  
  switch(mode) {
    case 'line': return new fabric.Line([x,y,x,y], {stroke, strokeWidth:sw, selectable:true});
    case 'rectangle': return new fabric.Rect({left:x, top:y, width:0, height:0, stroke, fill, strokeWidth:sw});
    case 'circle': return new fabric.Circle({left:x, top:y, radius:0, stroke, fill, strokeWidth:sw, originX:'center', originY:'center'});
    case 'ellipse': return new fabric.Ellipse({left:x, top:y, rx:0, ry:0, stroke, fill, strokeWidth:sw, originX:'center', originY:'center'});
    case 'triangle': return new fabric.Triangle({left:x, top:y, width:0, height:0, stroke, fill, strokeWidth:sw});
    case 'star': return createStar(x, y, 0, stroke, fill, sw);
    case 'arrow': return createArrow(x, y, x, y, stroke, sw);
    default: return null;
  }
}

function updateShape(shape, mode, x1, y1, x2, y2) {
  const w = x2 - x1, h = y2 - y1;
  const aw = Math.abs(w), ah = Math.abs(h);
  
  switch(mode) {
    case 'line': shape.set({x2:x2, y2:y2}); break;
    case 'rectangle': shape.set({left: w>0?x1:x2, top: h>0?y1:y2, width:aw, height:ah}); break;
    case 'circle': shape.set({radius: Math.sqrt(w*w+h*h)/2}); break;
    case 'ellipse': shape.set({rx:aw/2, ry:ah/2}); break;
    case 'triangle': shape.set({left: w>0?x1:x2, top: h>0?y1:y2, width:aw, height:ah}); break;
    case 'star':
      canvas.remove(shape);
      tempShape = createStar(x1, y1, Math.sqrt(w*w+h*h)/2, shape.stroke, shape.fill, shape.strokeWidth);
      canvas.add(tempShape);
      break;
    case 'arrow':
      canvas.remove(shape);
      tempShape = createArrow(x1, y1, x2, y2, shape.stroke, shape.strokeWidth);
      canvas.add(tempShape);
      break;
  }
}

function createStar(cx, cy, r, stroke, fill, sw) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.5;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push({x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle)});
  }
  return new fabric.Polygon(pts, {stroke, fill, strokeWidth:sw, originX:'center', originY:'center', left:cx, top:cy});
}

function createArrow(x1, y1, x2, y2, stroke, sw) {
  const angle = Math.atan2(y2-y1, x2-x1);
  const len = 15;
  return new fabric.Polyline([
    {x:x1, y:y1}, {x:x2, y:y2},
    {x: x2-len*Math.cos(angle-Math.PI/6), y: y2-len*Math.sin(angle-Math.PI/6)},
    {x:x2, y:y2},
    {x: x2-len*Math.cos(angle+Math.PI/6), y: y2-len*Math.sin(angle+Math.PI/6)}
  ], {stroke, fill:'transparent', strokeWidth:sw, strokeLineCap:'round'});
}

function addText(x, y) {
  const txt = new fabric.IText('Текст', {left:x, top:y, fontSize:24, fill:currentColor, fontFamily:'Arial'});
  canvas.add(txt);
  canvas.setActiveObject(txt);
  txt.enterEditing();
  saveState();
}

// ========== ИСТОРИЯ ==========
function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(canvas.toJSON()));
  historyIndex++;
  if (history.length > 30) { history.shift(); historyIndex--; }
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    canvas.loadFromJSON(history[historyIndex], () => canvas.renderAll());
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    canvas.loadFromJSON(history[historyIndex], () => canvas.renderAll());
  }
}

function clearCanvas() {
  if (confirm('Очистить холст?')) {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    saveState();
  }
}

function deleteSelected() {
  const obj = canvas.getActiveObject();
  if (obj) { canvas.remove(obj); saveState(); }
}

// ========== ХОЛСТЫ ==========
function createNewCanvas(name, w, h) {
  const id = 'c' + Date.now();
  canvases[id] = {name, w, h, data: null};
  
  $('.canvas-tab').removeClass('active');
  const tab = $(`<div class="canvas-tab active" data-id="${id}"><i class="fas fa-palette"></i> ${name} <button class="canvas-tab-close">×</button></div>`);
  $('#canvasTabs').append(tab);
  
  tab.click(function(e) { if (!$(e.target).is('.canvas-tab-close')) switchCanvas(id); });
  tab.find('.canvas-tab-close').click(function(e) { e.stopPropagation(); closeCanvas(id); });
  
  switchCanvas(id);
}

function switchCanvas(id) {
  if (currentCanvasId && canvases[currentCanvasId]) {
    canvases[currentCanvasId].data = JSON.stringify(canvas.toJSON());
  }
  $('.canvas-tab').removeClass('active');
  $(`.canvas-tab[data-id="${id}"]`).addClass('active');
  
  const c = canvases[id];
  canvas.setDimensions({width: c.w, height: c.h});
  if (c.data) canvas.loadFromJSON(c.data, () => canvas.renderAll());
  else { canvas.clear(); canvas.backgroundColor = '#ffffff'; }
  
  currentCanvasId = id;
  history = []; historyIndex = -1; saveState();
}

function closeCanvas(id) {
  if (Object.keys(canvases).length <= 1) { alert('Нельзя закрыть последний холст'); return; }
  delete canvases[id];
  $(`.canvas-tab[data-id="${id}"]`).remove();
  switchCanvas(Object.keys(canvases)[0]);
}

// ========== ПРОЧЕЕ ==========
function zoom(d) {
  if (isFullscreen) return;
  currentZoom = Math.max(0.5, Math.min(2, currentZoom + d));
  $('#canvasWrapper').css('transform', `scale(${currentZoom})`);
  $('#zoomLevel').text(Math.round(currentZoom * 100) + '%');
}

function saveImage() {
  const link = document.createElement('a');
  link.download = 'canvas.png';
  link.href = canvas.toDataURL();
  link.click();
}

function loadImage() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0];
    if (f) {
      const r = new FileReader();
      r.onload = ev => fabric.Image.fromURL(ev.target.result, img => { canvas.add(img); saveState(); });
      r.readAsDataURL(f);
    }
  };
  inp.click();
}

function updateStatus(msg) { $('#status').text(msg); }

function animateRainbow() {
  if (!isRainbowMode) return;
  const hue = (Date.now() / 20) % 360;
  canvas.freeDrawingBrush.color = `hsl(${hue}, 100%, 50%)`;
  requestAnimationFrame(animateRainbow);
}

// ========== КАЛЬКУЛЯТОР С ПАСХАЛКОЙ ==========
function initCalculator() {
  let display = '0', firstNum = null, op = null, newNum = true;
  
  function update() { 
    $('#calcDisplay').val(display);
    // Проверка пасхалки
    if (display === '3301') {
      setTimeout(() => {
        window.location.href = 'https://qrrrv.github.io/Perexodnik/';
      }, 500);
    }
  }
  
  $('.calc-btn.num').click(function() {
    const n = $(this).text();
    if (newNum) { display = n === '.' ? '0.' : n; newNum = false; }
    else { display = display === '0' && n !== '.' ? n : display + n; }
    update();
  });
  
  $('.calc-btn.op').click(function() {
    const o = $(this).text();
    if (o === '±') { display = String(-parseFloat(display)); update(); return; }
    if (o === '%') { display = String(parseFloat(display) / 100); update(); return; }
    if (firstNum !== null && op) {
      display = String(calc(firstNum, parseFloat(display), op));
    }
    firstNum = parseFloat(display);
    op = o;
    newNum = true;
    update();
  });
  
  $('.calc-btn.equals').click(function() {
    if (firstNum !== null && op) {
      display = String(calc(firstNum, parseFloat(display), op));
      firstNum = null; op = null; newNum = true;
      update();
    }
  });
  
  $('.calc-btn.clear').click(function() {
    display = '0'; firstNum = null; op = null; newNum = true;
    update();
  });
  
  function calc(a, b, o) {
    switch(o) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 'Ошибка';
      default: return b;
    }
  }
}

// ========== СОВМЕСТНАЯ РАБОТА ==========
function initCollaboration() {
  // Заглушка для совместной работы
  console.log('Collaboration initialized');
}