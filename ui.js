// ui.js - Интерфейс и обработчики событий

// Добавляем функцию toggleSnowflakes в глобальную область видимости, чтобы ui.js мог ее использовать
// Предполагается, что snowflakes.js загружается перед ui.js
// В реальном проекте использовался бы import/export, но здесь делаем через глобальную область
// для совместимости с текущей структурой.
// ВАЖНО: В реальном проекте нужно убедиться, что snowflakes.js загружен.
// В данном случае, мы просто предполагаем, что он доступен.
// Если snowflakes.js не использует export, то функция toggleSnowflakes уже глобальна.

let isGridVisible = false;
let isRulerVisible = false;
let isMinimapVisible = false;
let isLayersPanelOpen = false;

function initializeUI() {
  initializeSidebar();
  initializeDrawingToolbar();
  initializeColorPicker();
  initializeCalculator();
  initializeModals();
  initializeKeyboardShortcuts();
  initializeExtraFeatures();
}

function initializeSidebar() {
  $('#sidebarToggle').click(() => $('#sidebar').addClass('open'));
  $('#sidebarClose').click(() => $('#sidebar').removeClass('open'));
  
  $(document).click(function(e) {
    if (!$(e.target).closest('#sidebar, #sidebarToggle').length) {
      $('#sidebar').removeClass('open');
    }
  });

  // Темы
  $('.theme-option').click(function() {
    const theme = $(this).data('theme');
    $('body').removeClass('theme-default theme-dark theme-ocean theme-sunset');
    if (theme !== 'default') $('body').addClass(`theme-${theme}`);
    $('.theme-option').removeClass('active');
    $(this).addClass('active');
    localStorage.setItem('theme', theme);
  });

  // Загрузка сохраненной темы
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) $(`.theme-option[data-theme="${savedTheme}"]`).click();

  // Инициализация снежинок
  let isSnowflakesOn = localStorage.getItem('snowflakes');
  if (isSnowflakesOn === null) {
    // Включаем по умолчанию, если тема зимняя
    isSnowflakesOn = savedTheme === 'winter' ? 'true' : 'false';
    localStorage.setItem('snowflakes', isSnowflakesOn);
  }
  isSnowflakesOn = isSnowflakesOn === 'true';
  
  $('#snowflakesToggle').prop('checked', isSnowflakesOn);
  if (typeof toggleSnowflakes === 'function') {
    toggleSnowflakes(isSnowflakesOn);
  }

  // Обработчик переключателя снежинок
  $('#snowflakesToggle').change(function() {
    const isActive = $(this).is(':checked');
    localStorage.setItem('snowflakes', isActive);
    if (typeof toggleSnowflakes === 'function') {
      toggleSnowflakes(isActive);
    }
  });
}

function initializeDrawingToolbar() {
  // Инструменты
  $('.tool-btn[data-mode]').click(function() {
    $('.tool-btn[data-mode]').removeClass('active');
    $(this).addClass('active');
    currentMode = $(this).data('mode');
    updateDrawingMode();
  });

  // Цвета
  $('.color-btn').click(function() {
    $('.color-btn').removeClass('active');
    $(this).addClass('active');
    currentColor = $(this).data('color');
    if (currentMode !== 'eraser') updateBrush();
  });

  // Цветовой пикер
  $('#floating-color-picker').spectrum({
    color: currentColor,
    showInput: true,
    showPalette: true,
    preferredFormat: 'hex',
    change: function(color) {
      currentColor = color.toHexString();
      $('.floating-color').removeClass('active');
      if (currentMode !== 'eraser') updateBrush();
    }
  });

  // Толщина кисти
  $('#floatingBrushWidth').on('input', function() {
    brushWidth = parseInt($(this).val());
    $('#floatingBrushValue').text(brushWidth);
    updateBrush();
  });

  // Заливка
  $('#fillToggle').click(function() {
    $(this).toggleClass('active');
    currentFillMode = $(this).hasClass('active') ? 'solid' : 'none';
    updateStatus(currentFillMode === 'solid' ? 'Заливка включена' : 'Заливка выключена');
  });

  // Действия
  $('#undoBtn').click(undo);
  $('#redoBtn').click(redo);
  $('#clearBtn').click(function() {
    if (confirm('Очистить холст?')) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      saveState();
      broadcastData({ type: 'clear' });
    }
  });

  // Сворачивание панели
  $('#collapseToolbar').click(function(e) {
    e.stopPropagation();
    $('#drawingToolbar').toggleClass('collapsed');
    const icon = $(this).find('i');
    if ($('#drawingToolbar').hasClass('collapsed')) {
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });

}

// Дополнительные функции
function initializeExtraFeatures() {
  // Сетка
  $('#gridToggle').click(function() {
    $(this).toggleClass('active');
    isGridVisible = !isGridVisible;
    toggleGrid();
  });

  // Слои
  $('#layersToggle').click(function() {
    $(this).toggleClass('active');
    isLayersPanelOpen = !isLayersPanelOpen;
    $('#layersPanel').toggleClass('open', isLayersPanelOpen);
    if (isLayersPanelOpen) updateLayersList();
  });
  
  $('#closeLayers').click(function() {
    isLayersPanelOpen = false;
    $('#layersPanel').removeClass('open');
    $('#layersToggle').removeClass('active');
  });

  // Линейка
  $('#rulerToggle').click(function() {
    $(this).toggleClass('active');
    isRulerVisible = !isRulerVisible;
    toggleRulers();
  });

  // Миникарта
  $('#minimapToggle').click(function() {
    $(this).toggleClass('active');
    isMinimapVisible = !isMinimapVisible;
    $('#minimap').toggleClass('open', isMinimapVisible);
    if (isMinimapVisible) updateMinimap();
  });

  // Обновление миникарты при изменениях
  canvas.on('after:render', function() {
    if (isMinimapVisible) updateMinimap();
    if (isLayersPanelOpen) updateLayersList();
  });

  // Текстовая панель
  initializeTextTool();
}

function toggleGrid() {
  const wrapper = $('#canvasWrapper');
  if (isGridVisible) {
    wrapper.addClass('dot-grid');
  } else {
    wrapper.removeClass('dot-grid');
  }
  updateStatus(isGridVisible ? 'Сетка включена' : 'Сетка выключена');
}

function toggleRulers() {
  if (isRulerVisible) {
    createRulers();
  } else {
    $('.ruler-h, .ruler-v').remove();
  }
}

function createRulers() {
  $('.ruler-h, .ruler-v').remove();
  
  const wrapper = $('#canvasWrapper');
  const width = canvas.width;
  const height = canvas.height;
  
  // Горизонтальная линейка
  let rulerH = $('<div class="ruler-h"></div>');
  for (let i = 0; i <= width; i += 50) {
    rulerH.append(`<div class="ruler-mark" style="left:${i}px"><span style="position:absolute;top:0;left:2px">${i}</span></div>`);
  }
  wrapper.append(rulerH);
  
  // Вертикальная линейка  
  let rulerV = $('<div class="ruler-v"></div>');
  for (let i = 0; i <= height; i += 50) {
    rulerV.append(`<div class="ruler-mark" style="top:${i}px"><span style="position:absolute;left:2px;top:2px">${i}</span></div>`);
  }
  wrapper.append(rulerV);
}

function updateMinimap() {
  const minimapCanvas = document.getElementById('minimapCanvas');
  if (!minimapCanvas) return;
  
  const ctx = minimapCanvas.getContext('2d');
  const scale = 150 / canvas.width;
  
  minimapCanvas.width = 150;
  minimapCanvas.height = canvas.height * scale;
  
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  
  // Рисуем уменьшенную копию
  const dataUrl = canvas.toDataURL();
  const img = new Image();
  img.onload = function() {
    ctx.drawImage(img, 0, 0, minimapCanvas.width, minimapCanvas.height);
  };
  img.src = dataUrl;
}

function updateLayersList() {
  const list = $('#layersList');
  list.empty();
  
  const objects = canvas.getObjects();
  if (objects.length === 0) {
    list.append('<div style="padding:15px;text-align:center;color:#888">Нет объектов</div>');
    return;
  }
  
  objects.forEach((obj, index) => {
    const typeName = getObjectTypeName(obj.type);
    const isActive = canvas.getActiveObject() === obj;
    const item = $(`
      <div class="layer-item ${isActive ? 'active' : ''}" data-index="${index}">
        <i class="fas ${getObjectIcon(obj.type)}"></i>
        <span>${typeName} ${index + 1}</span>
        <div class="layer-actions">
          <button class="layer-up" title="Вверх"><i class="fas fa-chevron-up"></i></button>
          <button class="layer-down" title="Вниз"><i class="fas fa-chevron-down"></i></button>
          <button class="layer-delete" title="Удалить"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `);
    
    item.click(function(e) {
      if ($(e.target).closest('.layer-actions').length) return;
      canvas.setActiveObject(obj);
      canvas.renderAll();
      updateLayersList();
    });
    
    item.find('.layer-up').click(function(e) {
      e.stopPropagation();
      canvas.bringForward(obj);
      canvas.renderAll();
      updateLayersList();
    });
    
    item.find('.layer-down').click(function(e) {
      e.stopPropagation();
      canvas.sendBackwards(obj);
      canvas.renderAll();
      updateLayersList();
    });
    
    item.find('.layer-delete').click(function(e) {
      e.stopPropagation();
      canvas.remove(obj);
      canvas.renderAll();
      saveState();
      updateLayersList();
    });
    
    list.prepend(item);
  });
}

function getObjectTypeName(type) {
  const names = {
    'path': 'Линия',
    'rect': 'Прямоугольник',
    'circle': 'Круг',
    'triangle': 'Треугольник',
    'ellipse': 'Эллипс',
    'polygon': 'Многоугольник',
    'polyline': 'Стрелка',
    'line': 'Линия',
    'i-text': 'Текст',
    'text': 'Текст',
    'image': 'Изображение',
    'group': 'Группа'
  };
  return names[type] || type;
}

function getObjectIcon(type) {
  const icons = {
    'path': 'fa-pencil-alt',
    'rect': 'fa-square',
    'circle': 'fa-circle',
    'triangle': 'fa-play',
    'ellipse': 'fa-circle',
    'polygon': 'fa-draw-polygon',
    'polyline': 'fa-long-arrow-alt-right',
    'line': 'fa-minus',
    'i-text': 'fa-font',
    'text': 'fa-font',
    'image': 'fa-image',
    'group': 'fa-object-group'
  };
  return icons[type] || 'fa-shapes';
}

function initializeTextTool() {
  // Показ панели текста при выборе режима
  $('.floating-tool[data-mode="text"]').click(function() {
    showTextPanel();
  });
  
  // Скрыть при смене режима
  $('.floating-tool[data-mode]').not('[data-mode="text"]').click(function() {
    $('#textPanel').removeClass('open');
  });
  
  // Добавление текста по клику на холст
  canvas.on('mouse:down', function(opt) {
    if (currentMode !== 'text') return;
    
    const pointer = canvas.getPointer(opt.e);
    const text = new fabric.IText('Текст', {
      left: pointer.x,
      top: pointer.y,
      fontFamily: $('#fontFamily').val(),
      fontSize: parseInt($('#fontSize').val()),
      fill: currentColor,
      fontWeight: $('#boldText').hasClass('active') ? 'bold' : 'normal',
      fontStyle: $('#italicText').hasClass('active') ? 'italic' : 'normal',
      underline: $('#underlineText').hasClass('active')
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
    saveState();
  });
  
  // Кнопки форматирования
  $('#boldText').click(function() { $(this).toggleClass('active'); });
  $('#italicText').click(function() { $(this).toggleClass('active'); });
  $('#underlineText').click(function() { $(this).toggleClass('active'); });
}

function showTextPanel() {
  const toolbar = $('#floatingToolbar');
  const panel = $('#textPanel');
  const toolbarRect = toolbar[0].getBoundingClientRect();
  
  panel.css({
    top: (toolbarRect.bottom + 10) + 'px',
    left: toolbarRect.left + 'px'
  }).addClass('open');
}

function makeToolbarDraggable() {
  const toolbar = document.getElementById('floatingToolbar');
  let isDragging = false;
  let startX, startY, initialX, initialY;

  toolbar.addEventListener('mousedown', function(e) {
    if (e.target.closest('.floating-tool, .floating-color, input, .floating-toolbar-collapse')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = toolbar.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    toolbar.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    toolbar.style.left = (initialX + dx) + 'px';
    toolbar.style.top = (initialY + dy) + 'px';
    toolbar.style.transform = 'none';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    toolbar.style.cursor = 'default';
  });
}

function initializeColorPicker() {
  // Основной пикер уже инициализирован в floating toolbar
}

function initializeCalculator() {
  let calcDisplay = '0';
  let calcOperation = '';
  let firstOperand = null;
  let operator = null;
  let waitingForSecond = false;

  function updateCalcDisplay() {
    $('#calcDisplay').text(calcDisplay);
    $('#calcOperation').text(calcOperation);
  }

  $('.calculator-btn[data-number]').click(function() {
    const num = $(this).data('number');
    if (waitingForSecond) {
      calcDisplay = String(num);
      waitingForSecond = false;
    } else {
      calcDisplay = calcDisplay === '0' ? String(num) : calcDisplay + num;
    }
    updateCalcDisplay();
  });

  $('.calculator-btn[data-operator]').click(function() {
    const op = $(this).data('operator');
    const current = parseFloat(calcDisplay);
    
    if (firstOperand === null) {
      firstOperand = current;
    } else if (operator) {
      const result = calculate(firstOperand, current, operator);
      calcDisplay = String(result);
      firstOperand = result;
    }
    
    operator = op;
    calcOperation = `${firstOperand} ${op}`;
    waitingForSecond = true;
    updateCalcDisplay();
  });

  $('#calcEquals').click(function() {
    if (operator === null || waitingForSecond) return;
    const current = parseFloat(calcDisplay);
    const result = calculate(firstOperand, current, operator);
    calcOperation = `${firstOperand} ${operator} ${current} =`;
    calcDisplay = String(result);
    firstOperand = null;
    operator = null;
    waitingForSecond = false;
    updateCalcDisplay();
  });

  $('#calcClear').click(function() {
    calcDisplay = '0';
    calcOperation = '';
    firstOperand = null;
    operator = null;
    waitingForSecond = false;
    updateCalcDisplay();
  });

  $('#calcDelete').click(function() {
    calcDisplay = calcDisplay.length > 1 ? calcDisplay.slice(0, -1) : '0';
    updateCalcDisplay();
  });

  $('#calcDecimal').click(function() {
    if (!calcDisplay.includes('.')) calcDisplay += '.';
    updateCalcDisplay();
  });

  function calculate(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      case '%': return a % b;
      default: return b;
    }
  }
}

function initializeModals() {
  // Размеры холста
  $('.size-btn').click(function() {
    $('.size-btn').removeClass('active');
    $(this).addClass('active');
  });

  $('#createCanvasBtn').click(function() {
    const name = $('#canvasName').val() || 'Новый Холст';
    const size = $('.size-btn.active').data('size');
    const sizes = { standard: [800, 500], wide: [1200, 500], large: [1200, 800] };
    const [w, h] = sizes[size] || [800, 500];
    createNewCanvas(name, w, h);
    $('#newCanvasModal').modal('hide');
  });

  // Сохранение/Загрузка
  $('#saveCanvasBtn').click(saveCanvas);
  $('#loadCanvasBtn').click(loadCanvas);

  // Зум
  $('#zoomInBtn').click(() => adjustZoom(0.1));
  $('#zoomOutBtn').click(() => adjustZoom(-0.1));

  // Quick tools
  $('#quick-tool-copy').click(copySelected);
  $('#quick-tool-duplicate').click(duplicateSelected);
  $('#quick-tool-delete').click(deleteSelected);

  // Верхняя панель
  $('#nightModeToggle').click(function() {
    isNightMode = !isNightMode;
    $('body').toggleClass('theme-dark', isNightMode);
    $(this).toggleClass('active', isNightMode);
  });

  $('#rainbowBrushToggle').click(function() {
    isRainbowMode = !isRainbowMode;
    $(this).toggleClass('active', isRainbowMode);
    updateBrush();
    if (isRainbowMode) startRainbowAnimation();
  });

  // Easter egg
  $('#easterEggButton').click(function() {
    $('body').css('animation', 'rainbow 2s ease');
    setTimeout(() => $('body').css('animation', ''), 2000);
  });
}

function startRainbowAnimation() {
  if (isRainbowMode && canvas.isDrawingMode && currentMode === 'pencil') {
    canvas.freeDrawingBrush.color = getRainbowColor();
    requestAnimationFrame(startRainbowAnimation);
  }
}

function initializeKeyboardShortcuts() {
  $(document).keydown(function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); undo(); }
      else if (e.key === 'y') { e.preventDefault(); redo(); }
      else if (e.key === 'c') { e.preventDefault(); copySelected(); }
      else if (e.key === 'v') { e.preventDefault(); pasteFromClipboard(); }
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (canvas.getActiveObject()) { e.preventDefault(); deleteSelected(); }
    }
  });
}