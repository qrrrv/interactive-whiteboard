// collaboration/collab-client.js
// Клиентская логика для совместной работы через Firebase

class CollaborationClient {
  constructor() {
    this.db = null;
    this.roomRef = null;
    this.currentRoomId = null;
    this.currentUserId = this.generateUserId();
    this.isTeacher = false;
    this.userName = '';
    this.isReceivingUpdate = false;
    this.cursorUpdateThrottle = null;
    this.listeners = {};
  }

  // Инициализация Firebase
  async initialize(firebaseConfig) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.db = firebase.database();
      console.log('Firebase initialized');
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return false;
    }
  }

  // Создать комнату (Учитель)
  async createRoom(roomName, userName) {
    const roomId = this.generateRoomId();
    this.currentRoomId = roomId;
    this.isTeacher = true;
    this.userName = userName;

    const roomData = {
      id: roomId,
      name: roomName,
      teacherId: this.currentUserId,
      teacherName: userName,
      canvasState: null,
      isLocked: false,
      createdAt: Date.now(),
      students: {}
    };

    await this.db.ref(`rooms/${roomId}`).set(roomData);
    await this.db.ref(`users/${this.currentUserId}`).set({
      id: this.currentUserId,
      name: userName,
      roomId: roomId,
      isTeacher: true,
      online: true,
      lastSeen: Date.now()
    });

    this.roomRef = this.db.ref(`rooms/${roomId}`);
    this.setupListeners();
    
    return roomId;
  }

  // Присоединиться к комнате (Ученик)
  async joinRoom(roomId, userName) {
    try {
      const roomSnapshot = await this.db.ref(`rooms/${roomId}`).once('value');
      if (!roomSnapshot.exists()) {
        throw new Error('Комната не найдена');
      }

      this.currentRoomId = roomId;
      this.isTeacher = false;
      this.userName = userName;

      await this.db.ref(`rooms/${roomId}/students/${this.currentUserId}`).set({
        id: this.currentUserId,
        name: userName,
        joinedAt: Date.now(),
        cursor: { x: 0, y: 0 }
      });

      await this.db.ref(`users/${this.currentUserId}`).set({
        id: this.currentUserId,
        name: userName,
        roomId: roomId,
        isTeacher: false,
        online: true,
        lastSeen: Date.now()
      });

      this.roomRef = this.db.ref(`rooms/${roomId}`);
      this.setupListeners();

      const roomData = roomSnapshot.val();
      return {
        success: true,
        room: roomData
      };
    } catch (error) {
      console.error('Join room error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Покинуть комнату
  async leaveRoom() {
    if (!this.currentRoomId) return;

    try {
      if (!this.isTeacher) {
        await this.db.ref(`rooms/${this.currentRoomId}/students/${this.currentUserId}`).remove();
      }
      
      await this.db.ref(`users/${this.currentUserId}`).update({
        online: false,
        lastSeen: Date.now()
      });

      this.removeListeners();
      this.roomRef = null;
      this.currentRoomId = null;
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  // Отправить обновление холста
  async sendCanvasUpdate(canvasData) {
    if (!this.roomRef || this.isReceivingUpdate) return;

    try {
      await this.roomRef.update({
        canvasState: canvasData,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Send canvas update error:', error);
    }
  }

  // Отправить действие рисования
  async sendDrawAction(actionData) {
    if (!this.roomRef || this.isReceivingUpdate) return;

    try {
      const actionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await this.db.ref(`rooms/${this.currentRoomId}/actions/${actionId}`).set({
        userId: this.currentUserId,
        userName: this.userName,
        type: actionData.type,
        data: actionData.data,
        timestamp: Date.now()
      });

      // Удаляем старые действия (старше 10 секунд)
      setTimeout(async () => {
        await this.db.ref(`rooms/${this.currentRoomId}/actions/${actionId}`).remove();
      }, 10000);
    } catch (error) {
      console.error('Send draw action error:', error);
    }
  }

  // Обновить позицию курсора
  async updateCursor(x, y) {
    if (!this.roomRef) return;

    // Throttle обновлений курсора
    if (this.cursorUpdateThrottle) return;
    
    this.cursorUpdateThrottle = setTimeout(() => {
      this.cursorUpdateThrottle = null;
    }, 50);

    try {
      const path = this.isTeacher 
        ? `teacherCursor`
        : `students/${this.currentUserId}/cursor`;
      
      await this.roomRef.child(path).update({ x, y });
    } catch (error) {
      console.error('Update cursor error:', error);
    }
  }

  // Заблокировать/разблокировать холст (только учитель)
  async toggleLock(isLocked) {
    if (!this.isTeacher || !this.roomRef) return;

    try {
      await this.roomRef.update({ isLocked });
    } catch (error) {
      console.error('Toggle lock error:', error);
    }
  }

  // Очистить холст (только учитель)
  async clearCanvas() {
    if (!this.isTeacher || !this.roomRef) return;

    try {
      await this.roomRef.update({
        canvasState: null,
        lastUpdated: Date.now()
      });
      await this.db.ref(`rooms/${this.currentRoomId}/actions`).remove();
    } catch (error) {
      console.error('Clear canvas error:', error);
    }
  }

  // Настроить слушатели событий
  setupListeners() {
    if (!this.roomRef) return;

    // Слушать обновления холста
    this.roomRef.child('canvasState').on('value', (snapshot) => {
      const canvasState = snapshot.val();
      if (canvasState && this.listeners.onCanvasUpdate) {
        this.isReceivingUpdate = true;
        this.listeners.onCanvasUpdate(canvasState);
        setTimeout(() => { this.isReceivingUpdate = false; }, 100);
      }
    });

    // Слушать действия рисования
    this.roomRef.child('actions').on('child_added', (snapshot) => {
      const action = snapshot.val();
      if (action && action.userId !== this.currentUserId && this.listeners.onDrawAction) {
        this.isReceivingUpdate = true;
        this.listeners.onDrawAction(action);
        setTimeout(() => { this.isReceivingUpdate = false; }, 100);
      }
    });

    // Слушать изменения учеников
    this.roomRef.child('students').on('value', (snapshot) => {
      const students = snapshot.val() || {};
      if (this.listeners.onStudentsUpdate) {
        this.listeners.onStudentsUpdate(Object.values(students));
      }
    });

    // Слушать блокировку
    this.roomRef.child('isLocked').on('value', (snapshot) => {
      const isLocked = snapshot.val();
      if (this.listeners.onLockChange) {
        this.listeners.onLockChange(isLocked);
      }
    });

    // Слушать курсоры других пользователей
    if (this.isTeacher) {
      this.roomRef.child('students').on('value', (snapshot) => {
        const students = snapshot.val() || {};
        if (this.listeners.onCursorsUpdate) {
          const cursors = Object.entries(students).map(([id, student]) => ({
            userId: id,
            userName: student.name,
            x: student.cursor?.x || 0,
            y: student.cursor?.y || 0
          }));
          this.listeners.onCursorsUpdate(cursors);
        }
      });
    } else {
      this.roomRef.child('teacherCursor').on('value', (snapshot) => {
        const cursor = snapshot.val();
        if (cursor && this.listeners.onTeacherCursor) {
          this.listeners.onTeacherCursor(cursor.x, cursor.y);
        }
      });
    }
  }

  // Удалить слушатели
  removeListeners() {
    if (this.roomRef) {
      this.roomRef.off();
    }
  }

  // Подписаться на события
  on(event, callback) {
    this.listeners[event] = callback;
  }

  // Отписаться от события
  off(event) {
    delete this.listeners[event];
  }

  // Генерировать ID пользователя
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Генерировать ID комнаты
  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Проверить, является ли пользователь учителем
  isCurrentUserTeacher() {
    return this.isTeacher;
  }

  // Получить текущий ID комнаты
  getCurrentRoomId() {
    return this.currentRoomId;
  }
}

// Экспорт для использования
if (typeof window !== 'undefined') {
  window.CollaborationClient = CollaborationClient;
}