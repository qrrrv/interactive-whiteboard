// collaboration/collab-init.js
// Инициализация совместной работы с проверками

let collabClient = null;
let collabUI = null;

// Инициализация при загрузке страницы
function initCollaboration() {
  // Проверка наличия Firebase
  if (typeof firebase === 'undefined') {
    console.error('Firebase не загружен');
    showCollabError('Firebase не загружен. Проверьте подключение к интернету.');
    return;
  }

  // Проверка конфигурации
  if (typeof firebaseConfig === 'undefined' || !isFirebaseConfigured()) {
    console.warn('Firebase не настроен');
    updateCollabAlert();
    return;
  }

  // Создание клиента
  collabClient = new CollaborationClient();
  
  // Инициализация Firebase
  collabClient.initialize(firebaseConfig).then(success => {
    if (success) {
      console.log('Совместная работа готова');
      // Создание UI после успешной инициализации
      if (typeof canvas !== 'undefined') {
        collabUI = new CollaborationUI(canvas, collabClient);
      }
      setupCollabButtons();
    } else {
      showCollabError('Ошибка инициализации Firebase. Проверьте конфигурацию.');
    }
  });
}

// Настройка кнопок
function setupCollabButtons() {
  // Кнопка "Создать урок" (Учитель)
  $('#startClassBtn').off('click').on('click', async function() {
    const roomName = $('#roomNameInput').val() || 'Урок рисования';
    const teacherName = $('#teacherNameInput').val() || 'Учитель';

    if (!collabClient) {
      showCollabError('Совместная работа не инициализирована');
      return;
    }

    try {
      $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Создание...');
      
      const roomId = await collabClient.createRoom(roomName, teacherName);
      
      // Показать панель информации о комнате
      $('#displayRoomId').text(roomId);
      $('#roomRole').text('Учитель: ' + roomName);
      $('#teacherControls').show();
      $('#roomInfoPanel').fadeIn();
      $('#collabModal').modal('hide');
      
      $(this).prop('disabled', false).html('<i class="fas fa-chalkboard-teacher"></i> Создать урок');
      
      showSuccess('Урок создан! Код: ' + roomId);
    } catch (error) {
      console.error('Ошибка создания урока:', error);
      showCollabError('Ошибка создания урока: ' + error.message);
      $(this).prop('disabled', false).html('<i class="fas fa-chalkboard-teacher"></i> Создать урок');
    }
  });

  // Кнопка "Присоединиться" (Ученик)
  $('#joinClassBtn').off('click').on('click', async function() {
    const roomId = $('#roomIdInput').val().toUpperCase().trim();
    const studentName = $('#studentNameInput').val() || 'Ученик';

    if (!roomId) {
      alert('Введите код урока');
      return;
    }

    if (!collabClient) {
      showCollabError('Совместная работа не инициализирована');
      return;
    }

    try {
      $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Подключение...');
      
      const result = await collabClient.joinRoom(roomId, studentName);
      
      if (result.success) {
        $('#displayRoomId').text(roomId);
        $('#roomRole').text('Ученик: ' + result.room.name);
        $('#teacherControls').hide();
        $('#roomInfoPanel').fadeIn();
        $('#collabModal').modal('hide');
        
        showSuccess('Подключено к уроку!');
      } else {
        throw new Error(result.error || 'Не удалось подключиться');
      }
      
      $(this).prop('disabled', false).html('<i class="fas fa-user-graduate"></i> Присоединиться');
    } catch (error) {
      console.error('Ошибка подключения:', error);
      showCollabError('Ошибка подключения: ' + error.message);
      $(this).prop('disabled', false).html('<i class="fas fa-user-graduate"></i> Присоединиться');
    }
  });

  // Кнопка "Выйти из урока"
  $('#leaveClassBtn').off('click').on('click', async function() {
    if (confirm('Вы уверены, что хотите выйти из урока?')) {
      if (collabClient) {
        await collabClient.leaveRoom();
      }
      $('#roomInfoPanel').fadeOut();
      showSuccess('Вы вышли из урока');
    }
  });

  // Кнопка "Копировать код"
  $('#copyRoomIdBtn').off('click').on('click', function() {
    const roomId = $('#displayRoomId').text();
    
    // Современный способ копирования
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId).then(() => {
        showSuccess('Код скопирован: ' + roomId);
      }).catch(() => {
        fallbackCopyText(roomId);
      });
    } else {
      fallbackCopyText(roomId);
    }
  });

  // Кнопка блокировки холста (только учитель)
  $('#lockCanvasBtn').off('click').on('click', async function() {
    if (!collabClient || !collabClient.isCurrentUserTeacher()) return;
    
    const isLocked = $(this).find('i').hasClass('fa-lock');
    await collabClient.toggleLock(!isLocked);
    
    if (isLocked) {
      $(this).html('<i class="fas fa-unlock"></i> Заблокировать холст');
      $(this).removeClass('btn-success').addClass('btn-warning');
    } else {
      $(this).html('<i class="fas fa-lock"></i> Разблокировать холст');
      $(this).removeClass('btn-warning').addClass('btn-success');
    }
  });
}

// Обновить предупреждение о конфигурации
function updateCollabAlert() {
  const alertHtml = `
    <div class="alert alert-warning mt-3">
      <i class="fas fa-exclamation-triangle"></i> 
      <strong>Внимание:</strong> Для работы совместного урока необходимо настроить Firebase.
      <br>
      <small>
        1. Откройте файл <code>firebase-config.js</code><br>
        2. Следуйте инструкциям в комментариях<br>
        3. Вставьте свою конфигурацию Firebase
      </small>
    </div>
  `;
  
  $('#collabModal .modal-body .alert').replaceWith(alertHtml);
}

// Показать ошибку
function showCollabError(message) {
  alert('❌ ' + message);
}

// Показать успех
function showSuccess(message) {
  // Можно заменить на более красивое уведомление
  const notification = $('<div class="collab-notification success">' + message + '</div>');
  $('body').append(notification);
  setTimeout(() => notification.fadeOut(() => notification.remove()), 3000);
}

// Fallback для копирования текста
function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showSuccess('Код скопирован: ' + text);
  } catch (err) {
    alert('Не удалось скопировать. Код: ' + text);
  }
  
  document.body.removeChild(textarea);
}

// Инициализация при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollaboration);
} else {
  initCollaboration();
}
