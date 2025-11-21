// shapes.js - Рисование математических фигур

let isDrawingShape = false;
let shapeStartX = 0;
let shapeStartY = 0;
let tempShape = null;

function initializeShapeDrawing() {
  const canvasEl = document.querySelector('.upper-canvas') || document.getElementById('whiteboard');
  
  canvas.on('mouse:down', function(opt) {
    if (canvas.isDrawingMode || currentMode === 'select') return;
    
    const pointer = canvas.getPointer(opt.e);
    isDrawingShape = true;
    shapeStartX = pointer.x;
    shapeStartY = pointer.y;
    
    tempShape = createShapePreview(currentMode, pointer.x, pointer.y);
    if (tempShape) canvas.add(tempShape);
  });

  canvas.on('mouse:move', function(opt) {
    if (!isDrawingShape || !tempShape) return;
    
    const pointer = canvas.getPointer(opt.e);
    updateShapePreview(tempShape, currentMode, shapeStartX, shapeStartY, pointer.x, pointer.y);
    canvas.renderAll();
  });

  canvas.on('mouse:up', function() {
    if (!isDrawingShape) return;
    isDrawingShape = false;
    
    if (tempShape) {
      tempShape.setCoords();
      saveState();
      if (!isReceivingData) broadcastData({ type: 'add', data: tempShape.toJSON() });
    }
    tempShape = null;
  });
}

function createShapePreview(mode, x, y) {
  const stroke = currentColor;
  const fill = currentFillMode === 'solid' ? currentColor : 'transparent';
  const sw = brushWidth;
  const opts = { left: x, top: y, stroke, fill, strokeWidth: sw, originX: 'left', originY: 'top' };

  switch (mode) {
    case 'line':
      return new fabric.Line([x, y, x, y], { ...opts, fill: null });
    case 'rectangle':
      return new fabric.Rect({ ...opts, width: 0, height: 0 });
    case 'circle':
      return new fabric.Circle({ ...opts, radius: 0, originX: 'center', originY: 'center', left: x, top: y });
    case 'ellipse':
      return new fabric.Ellipse({ ...opts, rx: 0, ry: 0, originX: 'center', originY: 'center', left: x, top: y });
    case 'triangle':
      return new fabric.Triangle({ ...opts, width: 0, height: 0 });
    case 'polygon':
      return createRegularPolygon(x, y, 0, 6, stroke, fill, sw);
    case 'star':
      return createStar(x, y, 0, 5, stroke, fill, sw);
    case 'arrow':
      return createArrow(x, y, x, y, stroke, sw);
    default:
      return null;
  }
}

function updateShapePreview(shape, mode, x1, y1, x2, y2) {
  const w = x2 - x1;
  const h = y2 - y1;
  const absW = Math.abs(w);
  const absH = Math.abs(h);

  switch (mode) {
    case 'line':
      shape.set({ x2: x2, y2: y2 });
      break;
    case 'rectangle':
      shape.set({
        left: w > 0 ? x1 : x2,
        top: h > 0 ? y1 : y2,
        width: absW,
        height: absH
      });
      break;
    case 'circle':
      const radius = Math.sqrt(w * w + h * h) / 2;
      shape.set({ radius: radius });
      break;
    case 'ellipse':
      shape.set({ rx: absW / 2, ry: absH / 2 });
      break;
    case 'triangle':
      shape.set({
        left: w > 0 ? x1 : x2,
        top: h > 0 ? y1 : y2,
        width: absW,
        height: absH
      });
      break;
    case 'polygon':
      canvas.remove(shape);
      const polyRadius = Math.sqrt(w * w + h * h) / 2;
      tempShape = createRegularPolygon(x1, y1, polyRadius, 6, shape.stroke, shape.fill, shape.strokeWidth);
      canvas.add(tempShape);
      break;
    case 'star':
      canvas.remove(shape);
      const starRadius = Math.sqrt(w * w + h * h) / 2;
      tempShape = createStar(x1, y1, starRadius, 5, shape.stroke, shape.fill, shape.strokeWidth);
      canvas.add(tempShape);
      break;
    case 'arrow':
      canvas.remove(shape);
      tempShape = createArrow(x1, y1, x2, y2, shape.stroke, shape.strokeWidth);
      canvas.add(tempShape);
      break;
  }
}

// Правильный многоугольник
function createRegularPolygon(cx, cy, radius, sides, stroke, fill, sw) {
  const points = [];
  const angle = (2 * Math.PI) / sides;
  
  for (let i = 0; i < sides; i++) {
    const x = cx + radius * Math.cos(angle * i - Math.PI / 2);
    const y = cy + radius * Math.sin(angle * i - Math.PI / 2);
    points.push({ x, y });
  }
  
  return new fabric.Polygon(points, {
    stroke: stroke,
    fill: fill,
    strokeWidth: sw,
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy
  });
}

// Звезда
function createStar(cx, cy, outerRadius, points, stroke, fill, sw) {
  const innerRadius = outerRadius * 0.5;
  const starPoints = [];
  const angle = Math.PI / points;
  
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + r * Math.cos(angle * i - Math.PI / 2);
    const y = cy + r * Math.sin(angle * i - Math.PI / 2);
    starPoints.push({ x, y });
  }
  
  return new fabric.Polygon(starPoints, {
    stroke: stroke,
    fill: fill,
    strokeWidth: sw,
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy
  });
}

// Стрелка
function createArrow(x1, y1, x2, y2, stroke, sw) {
  const headLen = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  const points = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x2 - headLen * Math.cos(angle - Math.PI / 6), y: y2 - headLen * Math.sin(angle - Math.PI / 6) },
    { x: x2, y: y2 },
    { x: x2 - headLen * Math.cos(angle + Math.PI / 6), y: y2 - headLen * Math.sin(angle + Math.PI / 6) }
  ];
  
  return new fabric.Polyline(points, {
    stroke: stroke,
    fill: 'transparent',
    strokeWidth: sw,
    strokeLineCap: 'round',
    strokeLineJoin: 'round'
  });
}

// Дополнительные математические фигуры

// Ромб
function createDiamond(cx, cy, width, height, stroke, fill, sw) {
  const points = [
    { x: cx, y: cy - height / 2 },
    { x: cx + width / 2, y: cy },
    { x: cx, y: cy + height / 2 },
    { x: cx - width / 2, y: cy }
  ];
  return new fabric.Polygon(points, { stroke, fill, strokeWidth: sw, originX: 'center', originY: 'center', left: cx, top: cy });
}

// Параллелограмм
function createParallelogram(x, y, width, height, skew, stroke, fill, sw) {
  const points = [
    { x: x + skew, y: y },
    { x: x + width + skew, y: y },
    { x: x + width, y: y + height },
    { x: x, y: y + height }
  ];
  return new fabric.Polygon(points, { stroke, fill, strokeWidth: sw });
}

// Трапеция
function createTrapezoid(cx, cy, topWidth, bottomWidth, height, stroke, fill, sw) {
  const points = [
    { x: cx - topWidth / 2, y: cy - height / 2 },
    { x: cx + topWidth / 2, y: cy - height / 2 },
    { x: cx + bottomWidth / 2, y: cy + height / 2 },
    { x: cx - bottomWidth / 2, y: cy + height / 2 }
  ];
  return new fabric.Polygon(points, { stroke, fill, strokeWidth: sw, originX: 'center', originY: 'center', left: cx, top: cy });
}

// Правильный пятиугольник
function createPentagon(cx, cy, radius, stroke, fill, sw) {
  return createRegularPolygon(cx, cy, radius, 5, stroke, fill, sw);
}

// Правильный шестиугольник
function createHexagon(cx, cy, radius, stroke, fill, sw) {
  return createRegularPolygon(cx, cy, radius, 6, stroke, fill, sw);
}

// Правильный восьмиугольник
function createOctagon(cx, cy, radius, stroke, fill, sw) {
  return createRegularPolygon(cx, cy, radius, 8, stroke, fill, sw);
}

// Функция для добавления фигуры на холст по клику (можно вызывать из меню)
function addShapeToCanvas(shapeType, options = {}) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const stroke = options.stroke || currentColor;
  const fill = options.fill || (currentFillMode === 'solid' ? currentColor : 'transparent');
  const sw = options.strokeWidth || brushWidth;
  const size = options.size || 100;
  
  let shape;
  
  switch (shapeType) {
    case 'pentagon':
      shape = createPentagon(cx, cy, size / 2, stroke, fill, sw);
      break;
    case 'hexagon':
      shape = createHexagon(cx, cy, size / 2, stroke, fill, sw);
      break;
    case 'octagon':
      shape = createOctagon(cx, cy, size / 2, stroke, fill, sw);
      break;
    case 'diamond':
      shape = createDiamond(cx, cy, size, size * 1.5, stroke, fill, sw);
      break;
    case 'trapezoid':
      shape = createTrapezoid(cx, cy, size * 0.6, size, size * 0.6, stroke, fill, sw);
      break;
    case 'parallelogram':
      shape = createParallelogram(cx - size / 2, cy - size / 4, size, size / 2, size / 4, stroke, fill, sw);
      break;
    default:
      return;
  }
  
  if (shape) {
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    saveState();
  }
}