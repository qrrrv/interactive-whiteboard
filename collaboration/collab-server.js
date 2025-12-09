// collaboration/collab-server.js
// Логика совместной работы через WebSocket (Socket.io)

class CollaborationServer {
  constructor() {
    this.rooms = new Map();
    this.users = new Map();
  }

  // Создать комнату урока
  createRoom(teacherId, roomName) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      name: roomName,
      teacherId: teacherId,
      students: new Set(),
      canvasState: null,
      isLocked: false,
      createdAt: Date.now()
    };
    
    this.rooms.set(roomId, room);
    return roomId;
  }

  // Присоединиться к комнате
  joinRoom(userId, roomId, userName, isTeacher = false) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };
    
    if (isTeacher && room.teacherId !== userId) {
      return { success: false, error: 'Вы не учитель этой комнаты' };
    }
    
    if (!isTeacher) {
      room.students.add(userId);
    }
    
    this.users.set(userId, {
      id: userId,
      name: userName,
      roomId: roomId,
      isTeacher: isTeacher,
      cursor: { x: 0, y: 0 }
    });
    
    return {
      success: true,
      room: {
        id: room.id,
        name: room.name,
        canvasState: room.canvasState,
        isLocked: room.isLocked,
        studentCount: room.students.size
      }
    };
  }

  // Покинуть комнату
  leaveRoom(userId) {
    const user = this.users.get(userId);
    if (!user) return;
    
    const room = this.rooms.get(user.roomId);
    if (room) {
      room.students.delete(userId);
      if (room.students.size === 0 && room.teacherId !== userId) {
        this.rooms.delete(room.id);
      }
    }
    
    this.users.delete(userId);
  }

  // Обновить состояние холста
  updateCanvasState(roomId, state) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.canvasState = state;
      return true;
    }
    return false;
  }

  // Заблокировать/разблокировать холст для учеников
  toggleLock(roomId, isLocked) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.isLocked = isLocked;
      return true;
    }
    return false;
  }

  // Получить информацию о комнате
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    const students = [];
    room.students.forEach(studentId => {
      const student = this.users.get(studentId);
      if (student) {
        students.push({
          id: student.id,
          name: student.name,
          cursor: student.cursor
        });
      }
    });
    
    return {
      id: room.id,
      name: room.name,
      studentCount: room.students.size,
      students: students,
      isLocked: room.isLocked
    };
  }

  // Обновить позицию курсора
  updateCursor(userId, x, y) {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = { x, y };
    }
  }

  // Генерировать ID комнаты
  generateRoomId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}

// Для использования на клиенте (GitHub Pages)
// Используем Firebase Realtime Database как бэкенд
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollaborationServer;
}