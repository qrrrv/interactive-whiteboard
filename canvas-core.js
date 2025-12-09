// canvas-core.js - Основная логика холста

let canvas;
let currentMode = 'pencil';
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
let currentFillMode = 'none';
let clipboard = null;
let isReceivingData = false;

// Инициализация Canvas
function initializeCanvas() {
  canvas = new fabric.Canvas('whiteboard', {
    isDrawingMode: true,
    width: 800,
    height: 500,
    backgroundColor: '#ffffff'
  });

  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.width = brushWidth;
  canvas.freeDrawingBrush.color = currentColor;

  // События canvas
  canvas.on('path:created', function(e) {
    saveState();
    if (!isReceivingData) broadcastData({ type: 'draw', data: e.path.toJSON() });
  });

  canvas.on('object:added', function(e) {
    if (!isReceivingData && e.target.type !== 'path') {
      broadcastData({ type: 'add', data: e.target.toJSON() });
    }
  });

  canvas.on('object:modified', function() {
    saveState();
    if (!isReceivingData) broadcastData({ type: 'state', data: JSON.stringify(canvas.toJSON()) });
  });

  canvas.on('selection:created', e => showQuickTools(e.target));
  canvas.on('selection:updated', e => showQuickTools(e.target));
  canvas.on('selection:cleared', hideQuickTools);
  canvas.on('object:moving', e => canvas.getActiveObject() && positionQuickTools(e.target));
  canvas.on('object:scaling', e => canvas.getActiveObject() && positionQuickTools(e.target));

  canvas.on('mouse:move', function(opt) {
    const pointer = canvas.getPointer(opt.e);
    $('#coordinates').text(`X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`);
  });
}

// Обновление кисти
function updateBrush() {
  if (!canvas.isDrawingMode) return;
  
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.strokeLineCap = 'round';
  canvas.freeDrawingBrush.strokeLineJoin = 'round';

  if (currentMode === 'eraser') {
    canvas.freeDrawingBrush.color = canvas.backgroundColor || '#ffffff';
    canvas.freeDrawingBrush.width = 30;
  } else {
    canvas.freeDrawingBrush.width = brushWidth;
    canvas.freeDrawingBrush.color = isRainbowMode ? getRainbowColor() : currentColor;
  }
}

function getRainbowColor() {
  return `hsl(${(Date.now() / 50) % 360}, 100%, 50%)`;
}

// История (Undo/Redo)
function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(canvas.toJSON()));
  historyIndex++;
  if (history.length > 50) { history.shift(); historyIndex--; }
  updateUndoRedoButtons();
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    canvas.loadFromJSON(history[historyIndex], () => canvas.renderAll());
    updateUndoRedoButtons();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    canvas.loadFromJSON(history[historyIndex], () => canvas.renderAll());
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  $('#undoBtn, #undo-btn').toggleClass('disabled', historyIndex <= 0);
  $('#redoBtn, #redo-btn').toggleClass('disabled', historyIndex >= history.length - 1);
}

// Обновление режима рисования
function updateDrawingMode() {
  const drawModes = [\'pencil\', \'eraser\'];
  canvas.isDrawingMode = drawModes.includes(currentMode);
  
  if (canvas.isDrawingMode) {
    updateBrush();
  }

  // Обновление курсора
  const canvasWrapper = $(\'#canvasWrapper\');
  canvasWrapper.removeClass(\'cursor-pencil cursor-eraser\');
  if (currentMode === \'pencil\') {
    canvasWrapper.addClass(\'cursor-pencil\');
    canvas.defaultCursor = \'url("data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z\"></path></svg>") 0 24, auto\';
  } else if (currentMode === \'eraser\') {
    canvasWrapper.addClass(\'cursor-eraser\');
    canvas.defaultCursor = \'url("data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"4.93\" y1=\"4.93\" x2=\"19.07\" y2=\"19.07\"></line></svg>") 12 12, auto\';
  } else {
    canvas.defaultCursor = \'default\';
  }

  updateStatus(`Режим: ${getModeName(currentMode)}`);
}

function getModeName(mode) {
  const names = {
    pencil: 'Карандаш', eraser: 'Ластик', line: 'Линия',
    rectangle: 'Прямоугольник', circle: 'Круг', triangle: 'Треугольник',
    ellipse: 'Эллипс', polygon: 'Многоугольник', star: 'Звезда',
    arrow: 'Стрелка', select: 'Выбор', text: 'Текст'
  };
  return names[mode] || mode;
}

// Управление холстами
function createNewCanvas(name, width, height) {
  const id = `canvas-${Date.now()}`;
  canvases[id] = { id, name, width, height, data: null };
  addCanvasTab(id, name);
  switchCanvas(id);
  return id;
}

function addCanvasTab(id, name) {
  const tab = $(`<div class="canvas-tab active" data-canvas="${id}"><i class="fas fa-palette"></i> ${name}<button class="canvas-tab-close"><i class="fas fa-times"></i></button></div>`);
  $('#canvasTabs').append(tab);
  tab.click(function(e) { if (!$(e.target).hasClass('canvas-tab-close')) switchCanvas(id); });
  tab.find('.canvas-tab-close').click(function(e) { e.stopPropagation(); closeCanvas(id); });
}

function switchCanvas(id) {
  if (currentCanvas && canvases[currentCanvas]) {
    canvases[currentCanvas].data = JSON.stringify(canvas.toJSON());
  }
  $('.canvas-tab').removeClass('active');
  $(`.canvas-tab[data-canvas="${id}"]`).addClass('active');
  
  const data = canvases[id];
  canvas.setDimensions({ width: data.width, height: data.height });
  if (data.data) canvas.loadFromJSON(data.data, () => canvas.renderAll());
  else { canvas.clear(); canvas.backgroundColor = '#ffffff'; }
  
  currentCanvas = id;
  saveState();
  updateDrawingMode();
}

function closeCanvas(id) {
  if (Object.keys(canvases).length <= 1) { alert('Нельзя закрыть последний холст!'); return; }
  delete canvases[id];
  $(`.canvas-tab[data-canvas="${id}"]`).remove();
  switchCanvas(Object.keys(canvases)[0]);
}

// Зум
function adjustZoom(delta) {
  currentZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
  $('#canvasWrapper').css('transform', `scale(${currentZoom})`);
  $('#zoom-display').text(`${Math.round(currentZoom * 100)}%`);
}

// Сохранение/Загрузка
function saveCanvas() {
  const link = document.createElement('a');
  link.download = 'canvas.png';
  link.href = canvas.toDataURL({ format: 'png', quality: 1 });
  link.click();
  updateStatus('Холст сохранен');
}

function loadCanvas() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        fabric.Image.fromURL(ev.target.result, function(img) {
          canvas.clear();
          canvas.add(img);
          canvas.renderAll();
          saveState();
        });
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function updateStatus(msg) { $('#status').text(msg); }

// Quick Tools
function showQuickTools(target) {
  const panel = $('#quick-tools');
  if (!canvas.getActiveObject()) { hideQuickTools(); return; }
  panel.show();
  positionQuickTools(target);
}

function positionQuickTools(target) {
  const panel = $('#quick-tools');
  if (!panel.is(':visible')) return;
  const wrapper = $('#canvasWrapper');
  const offset = wrapper.offset();
  const rect = target.getBoundingRect();
  let top = offset.top + (rect.top * currentZoom) - panel.outerHeight() - 10;
  let left = offset.left + (rect.left * currentZoom) + ((rect.width * currentZoom) / 2) - (panel.outerWidth() / 2);
  if (top < 10) top = offset.top + ((rect.top + rect.height) * currentZoom) + 10;
  panel.css({ top: `${top}px`, left: `${Math.max(10, left)}px` });
}

function hideQuickTools() { $('#quick-tools').hide(); }

function copySelected() {
  const obj = canvas.getActiveObject();
  if (obj) obj.clone(c => { clipboard = c; updateStatus('Скопировано'); });
}

function pasteFromClipboard() {
  if (!clipboard) return;
  clipboard.clone(function(c) {
    c.set({ left: c.left + 15, top: c.top + 15, evented: true });
    canvas.add(c);
    canvas.setActiveObject(c);
    canvas.renderAll();
    saveState();
  });
}

function duplicateSelected() {
  const obj = canvas.getActiveObject();
  if (obj) obj.clone(function(c) {
    c.set({ left: c.left + 15, top: c.top + 15 });
    canvas.add(c);
    canvas.setActiveObject(c);
    canvas.renderAll();
    saveState();
  });
}

function deleteSelected() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (obj.type === 'activeSelection') obj.forEachObject(o => canvas.remove(o));
  else canvas.remove(obj);
  canvas.discardActiveObject();
  canvas.renderAll();
  saveState();
}