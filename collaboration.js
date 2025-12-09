// collaboration.js - Логика совместной работы через PeerJS

let peer;
let connections = [];
let hostConnection = null;
let myPeerId = null;
let isHost = false;

function initializeCollaboration() {
  // Учитель - создать урок
  $('#startClassBtn').click(function() {
    if (window.location.protocol === 'file:') {
      alert('⚠️ Онлайн-функции не работают при открытии файла напрямую.\nЗапустите через локальный сервер (Live Server, http-server и т.д.)');
      return;
    }

    isHost = true;
    peer = new Peer({ debug: 2 });

    peer.on('open', function(id) {
      myPeerId = id;
      $('#myPeerId').val(id);
      $('#startClassBtn').hide();
      $('#teacherInfo').fadeIn();
      updateStatus('Вы Учитель. Ожидание учеников...');
    });

    peer.on('connection', function(conn) {
      setupConnection(conn);
      connections.push(conn);
      setTimeout(() => {
        conn.send({ type: 'state', data: JSON.stringify(canvas.toJSON()) });
      }, 1000);
      updateStatus('Ученик подключился!');
      $('#connectionStatus').show().removeClass('alert-warning').addClass('alert-success');
      $('#connectionStatusText').text('Ученик подключен');
    });

    peer.on('error', function(err) {
      console.error(err);
      alert('Ошибка PeerJS: ' + err.type);
    });

    peer.on('disconnected', function() {
      updateStatus('Отключено. Переподключение...');
      peer.reconnect();
    });
  });

  // Ученик - подключиться
  $('#joinClassBtn').click(function() {
    const hostId = $('#remoteIdInput').val();
    if (!hostId) { alert('Введите код урока'); return; }

    if (window.location.protocol === 'file:') {
      alert('⚠️ Запустите через локальный сервер');
      return;
    }

    isHost = false;
    peer = new Peer({ debug: 2 });

    peer.on('open', function() {
      hostConnection = peer.connect(hostId);
      setupConnection(hostConnection);
      $('#joinClassBtn').text('Подключение...').prop('disabled', true);

      hostConnection.on('open', function() {
        $('#collabModal').modal('hide');
        updateStatus('Подключено к уроку!');
        $('#connectionStatus').show().removeClass('alert-warning').addClass('alert-success');
        $('#connectionStatusText').text('Подключено');
      });

      hostConnection.on('error', function() {
        alert('Не удалось подключиться');
        $('#joinClassBtn').text('Подключиться').prop('disabled', false);
      });
    });

    peer.on('error', function(err) {
      console.error(err);
      alert('Ошибка: ' + err.type);
      $('#joinClassBtn').text('Подключиться').prop('disabled', false);
    });
  });

  // Копировать ID
  $('#copyIdBtn').click(function() {
    const el = document.getElementById('myPeerId');
    el.select();
    document.execCommand('copy');
    alert('Код скопирован!');
  });
}

function setupConnection(conn) {
  conn.on('data', function(data) {
    handleIncomingData(data, conn);
  });

  conn.on('close', function() {
    updateStatus('Соединение разорвано');
    $('#connectionStatus').removeClass('alert-success').addClass('alert-danger');
    $('#connectionStatusText').text('Отключено');
  });

  conn.on('error', function(err) {
    console.error('Connection error:', err);
  });
}

function broadcastData(data) {
  if (isHost) {
    connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  } else if (hostConnection && hostConnection.open) {
    hostConnection.send(data);
  }
}

function handleIncomingData(data, senderConn) {
  isReceivingData = true;

  try {
    if (data.type === 'draw') {
      fabric.util.enlivenObjects([data.data], function(objects) {
        objects.forEach(o => canvas.add(o));
      });
    } else if (data.type === 'add') {
      fabric.util.enlivenObjects([data.data], function(objects) {
        objects.forEach(o => canvas.add(o));
      });
    } else if (data.type === 'clear') {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
    } else if (data.type === 'state') {
      canvas.loadFromJSON(data.data, function() {
        canvas.renderAll();
      });
    }

    // Учитель пересылает другим ученикам
    if (isHost) {
      connections.forEach(conn => {
        if (conn !== senderConn && conn.open) conn.send(data);
      });
    }

    canvas.renderAll();
  } catch (e) {
    console.error('Ошибка обработки данных:', e);
  } finally {
    isReceivingData = false;
  }
}