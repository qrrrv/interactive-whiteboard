// firebase-config.js
// Конфигурация Firebase для совместной работы

// ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
// 1. Перейдите на https://console.firebase.google.com/
// 2. Создайте новый проект или используйте существующий
// 3. В настройках проекта найдите "Ваши приложения" -> "Веб-приложение"
// 4. Скопируйте конфигурацию и вставьте ниже
// 5. В разделе "Realtime Database" создайте базу данных
// 6. В правилах безопасности установите:
/*
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    },
    "users": {
      ".read": true,
      ".write": true
    }
  }
}
*/

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Проверка конфигурации
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// Экспорт
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
}
