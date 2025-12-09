// collaboration/collab-ui.js
// UI и интеграция с главным приложением

class CollaborationUI {
  constructor(canvas, collabClient) {
    this.canvas = canvas;
    this.client = collabClient;
    this.isConnected = false;
    this.remoteCursors = new Map();
    this.cursorElements = new Map();
    this.setupEventListeners();
  }

  // Настроить слушатели событий клиента
  setupEventListeners() {
    // Обновление холста от других пользователей
    this.client.on('onCanvasUpdate', (canvasState) => {
      this.loadCanvasState(canvasState);
    });

    // Действие рисования от других пользователей
    this.client.on('onDrawAction', (action) => {
      this.handleDrawAction(action);
    });

    // Обновление списка учеников
    this.client.on('onStudentsUpdate', (students) => {
      this.updateStudentsList(students);
    });

    // Изменение блокировки
    this.client.on('onLockChange', (isLocked) => {
      this.handleLockChange(isLocked);
    });

    // Обновление курсоров
    this.client.on('onCursorsUpdate', (cursors) => {
      this.updateRemoteCursors(cursors);
    });

    // Курсор учителя (для учеников)
    this.client.on('onTeacherCursor', (x, y) => {
      this.updateTeacherCursor(x, y);
    });

    // Отслеживание движения мыши для отправки курсора
    this.canvas.on('mouse:move', (e) => {
      if (this.isConnected) {
        const pointer = this.canvas.getPointer(e.e);
        this.client.updateCursor(pointer.x, pointer.y);
      }
    });

    // Отправка обновлений холста
    this.canvas.on('object:added', () => {
      if (this.isConnected && !this.client.isReceivingUpdate) {
        this.sendCanvasUpdate();
      }
    });

    this.canvas.on('object:modified', () => {
      if (this.isConnected && !this.client.isReceivingUpdate) {
        this.sendCanvasUpdate();
      }
    });

    this.canvas.on('object:removed', () => {
      if (this.isConnected && !this.client.isReceivingUpdate) {
        this.sendCanvasUpdate();
      }
    });
  }

  // Загрузить состояние холста
  loadCanvasState(canvasState) {
    if (!canvasState) return;
    
    try {
      const state = typeof canvasState === 'string' 
        ? JSON.parse(canvasState) 
        : canvasState;
      
      this.canvas.loadFromJSON(state, () => {
        this.canvas.renderAll();
      });
    } catch (error) {
      console.error('Load canvas state error:', error);
    }
  }

  // Отправить обновление холста
  sendCanvasUpdate() {
    const canvasState = JSON.stringify(this.canvas.toJSON());
    this.client.sendCanvasUpdate(canvasState);
  }

  // Обработать действие рисования
  handleDrawAction(action) {
    try {
      if (action.type === 'path') {
        fabric.util.enlivenObjects([action.data], (objects) => {
          objects.forEach(obj => this.canvas.add(obj));
          this.canvas.renderAll();
        });
      } else if (action.type === 'clear') {
        this.canvas.clear();
        this.canvas.backgroundColor = '#ffffff';
        this.canvas.renderAll();
      }
    } catch (error) {
      console.error('Handle draw action error:', error);
    }
  }

  // Обновить список учеников
  updateStudentsList(students) {
    const list = $('#studentsList');
    list.empty();

    if (students.length === 0) {
      list.append('<div class="no-students">Учеников пока нет</div>');
      $('#studentCount').text('0');
      return;
    }

    $('#studentCount').text(students.length);
    
    students.forEach(student => {
      const item = $(`
        <div class="student-item" data-student-id="${student.id}">
          <div class="student-avatar">${student.name.charAt(0).toUpperCase()}</div>
          <div class="student-info">
            <div class="student-name">${student.name}</div>
            <div class="student-status online">В сети</div>
          </div>
        </div>
      `);
      list.append(item);
    });
  }

  // Обработать изменение блокировки
  handleLockChange(isLocked) {
    if (!this.client.isCurrentUserTeacher()) {
      this.canvas.isDrawingMode = !isLocked;
      this.canvas.selection = !isLocked;
      
      const status = isLocked 
        ? '🔒 Холст заблокирован учителем' 
        : '✅ Можно рисовать';
      
      updateStatus(status);
      
      // Показать уведомление
      this.showNotification(
        isLocked ? 'Холст заблокирован' : 'Холст разблокирован',
        isLocked ? 'warning' : 'success'
      );
    }
  }

  // Обновить удаленные курсоры (для учителя)
  updateRemoteCursors(cursors) {
    // Удалить старые курсоры
    this.remoteCursors.forEach((_, userId) => {
      if (!cursors.find(c => c.userId === userId)) {
        this.removeCursor(userId);
      }
    });

    // Обновить или создать курсоры
    cursors.forEach(cursor => {
      this.updateCursor(cursor.userId, cursor.userName, cursor.x, cursor.y);
    });
  }

  // Обновить курсор учителя (для учеников)
  updateTeacherCursor(x, y) {
    this.updateCursor('teacher', 'Учитель', x, y, '#ff0000');
  }

  // Обновить курсор
  updateCursor(userId, userName, x, y, color = '#4361ee') {
    let cursorEl = this.cursorElements.get(userId);
    
    if (!cursorEl) {
      cursorEl = $(`
        <div class="remote-cursor" style="
          position: absolute;
          pointer-events: none;
          z-index: 1000;
          transition: all 0.1s ease;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
            <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"/>
          </svg>
          <div style="
            background: ${color};
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 24px;
            margin-top: -20px;
            white-space: nowrap;
          ">${userName}</div>
        </div>
      `);
      $('#canvasWrapper').append(cursorEl);
      this.cursorElements.set(userId, cursorEl);
    }

    const canvasOffset = $('#whiteboard').offset();
    cursorEl.css({
      left: (canvasOffset.left + x * currentZoom) + 'px',
      top: (canvasOffset.top + y * currentZoom) + 'px'
    });

    this.remoteCursors.set(userId, { x, y });
  }

  // Удалить курсор
  removeCursor(userId) {
    const cursorEl = this.cursorElements.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      this.cursorElements.delete(userId);
    }
    this.remoteCursors.delete(userId);
  }

  // Показать уведомление
  showNotification(message, type = 'info') {
    const notification = $(`
      <div class="collab-notification ${type}" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4bb543' : type === 'warning' ? '#ff9500' : '#4361ee'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInFromRight 0.3s ease;
      ">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        ${message}
      </div>
    `);

    $('body').append(notification);

    setTimeout(() => {
      notification.fadeOut(() => notification.remove());
    }, 3000);
  }

  // Подключиться к уроку
  async connect() {
    this.isConnected = true;
    this.showNotification('Подключено к уроку', 'success');
  }

  // Отключиться от урока
  async disconnect() {
    this.isConnected = false;
    
    // Очистить курсоры
    this.cursorElements.forEach(el => el.remove());
    this.cursorElements.clear();
    this.remoteCursors.clear();
    
    await this.client.leaveRoom();
    this.showNotification('Отключено от урока', 'info');
  }
}

// Экспорт
if (typeof window !== 'undefined') {
  window.CollaborationUI = CollaborationUI;
}