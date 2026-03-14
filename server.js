const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 5000;

// Файлы для хранения данных
const messagesFilePath = path.join(__dirname, 'messages.json');
const usersFilePath = path.join(__dirname, 'users.json');
const avatarsDir = path.join(__dirname, 'avatars');

// Убедимся, что директории существуют
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir);

// Секрет JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

app.use(cors());
app.use(express.json());

// ------------------- Сообщения (старый функционал) -------------------
// Функции для работы с сообщениями (как в вашем коде)
function loadMessages() {
  try {
    if (fs.existsSync(messagesFilePath)) {
      const data = fs.readFileSync(messagesFilePath, 'utf8');
      if (!data) return [];
      return JSON.parse(data);
    } else {
      fs.writeFileSync(messagesFilePath, '[]', 'utf8');
      return [];
    }
  } catch (error) {
    console.error("Ошибка при чтении файла messages.json:", error);
    return [];
  }
}
function saveMessages(messages) {
  try {
    fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2), 'utf8');
  } catch (error) {
    console.error("Ошибка при записи в файл messages.json:", error);
  }
}
let messages = loadMessages();
console.log(`Загружено сообщений из ${messagesFilePath}`);

// Маршрут для получения всех сообщений (GET)
app.get('/messages', (req, res) => {
  console.log('GET /messages - Отправляем текущие сообщения');
  res.json(messages);
});

// Маршрут для добавления нового сообщения (POST)
app.post('/messages', (req, res) => {
  const newMessage = req.body;
  if (!newMessage ||
      typeof newMessage.message !== 'string' ||
      typeof newMessage.sender !== 'string' ||
      typeof newMessage.id !== 'string') {
    return res.status(400).json({ error: 'Некорректное сообщение' });
  }

  // avatar не обязателен; по умолчанию пустая строка
  if (typeof newMessage.avatar !== 'string') newMessage.avatar = '';

  messages.push(newMessage);
  console.log('Новое сообщение получено и добавлено в память:', newMessage);
  saveMessages(messages);
  res.status(200).json({ message: 'Сообщение успешно добавлено' });
});

// Маршрут для добавления нового сообщения (POST)
app.post('/messages', (req, res) => {
  const newMessage = req.body;
  if (!newMessage ||
      typeof newMessage.message !== 'string' ||
      typeof newMessage.sender !== 'string' ||
      typeof newMessage.id !== 'string') {
    return res.status(400).json({ error: 'Некорректное сообщение' });
  }

  // avatar не обязателен; по умолчанию пустая строка
  if (typeof newMessage.avatar !== 'string') newMessage.avatar = '';

  messages.push(newMessage);
  console.log('Новое сообщение получено и добавлено в память:', newMessage);
  saveMessages(messages);
  res.status(200).json({ message: 'Сообщение успешно добавлено' });
});


// app.post('/messages', (req, res) => {
//   let newMessage = req.body;
//   if (!newMessage ||
//       typeof newMessage.message !== 'string' ||
//       typeof newMessage.sender !== 'string' ||
//       typeof newMessage.id !== 'string') {
//     return res.status(400).json({ error: 'Некорректное сообщение' });
//   }

//   // avatar не обязателен; по умолчанию пустая строка
//   if (typeof newMessage.avatar !== 'string') newMessage.avatar = '';

//   // Если аватара в сообщении нет, попробуем заполнить по автору
//   if (!newMessage.avatar && newMessage.authorName) {
//     const userForName = users.find(u => u.username === newMessage.authorName);
//     if (userForName && userForName.avatar) {
//       newMessage.avatar = userForName.avatar;
//     }
//   }

//   messages.push(newMessage);
//   console.log('Новое сообщение получено и добавлено в память:', newMessage);
//   saveMessages(messages);
//   res.status(200).json({ message: 'Сообщение успешно добавлено' });
// });
// ------------------- Пользователи и аутентификация -------------------

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      if (!data) return [];
      return JSON.parse(data);
    } else {
      fs.writeFileSync(usersFilePath, '[]', 'utf8');
      return [];
    }
  } catch (error) {
    console.error("Ошибка при чтении файла users.json:", error);
    return [];
  }
}
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error("Ошибка при записи в файл users.json:", error);
  }
}
let users = loadUsers();

function generateId() {
  return 'usr_' + Math.random().toString(36).slice(2, 9);
}

// Middleware проверки токена
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Токен отсутствует' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = payload; // { id, username }
    next();
  });
}

// Multer для загрузки аватара
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const userId = (req.user && req.user.id) ? req.user.id : 'guest';
    cb(null, `avatar_Missing superscript or subscript argument{Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Регистрация
app.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Пользователь уже существует' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const user = { id: generateId(), username, passwordHash, avatar: '', createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar } });
});

// Авторизация
// Регистрация (обновлённая: принимает username, email, password)
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Укажите имя пользователя, email и пароль' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Пользователь уже существует' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email уже используется' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = {
    id: generateId(),
    username,
    email,
    passwordHash,
    avatar: '',
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar } });
});

// Авторизация (логин) — оставляем без изменений
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });

  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Неверный логин или пароль' });

  const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar } });
});

// Получение профиля
app.get('/profile', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ id: user.id, username: user.username, email: user.email, avatar: user.avatar });
});

// Обновление профиля (имя пользователя и аватар)
app.put('/profile', verifyToken, upload.single('avatar'), (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ error: 'Пользователь не найден' });

  const newUsername = req.body.username;
  if (newUsername) {
    if (users.some((u, idx) => u.username === newUsername && idx !== userIndex)) {
      return res.status(400).json({ error: 'Имя занято' });
    }
    users[userIndex].username = newUsername;
  }

  if (req.file) {
    const oldAvatar = users[userIndex].avatar;
    if (oldAvatar) {
      const oldPath = path.join(avatarsDir, path.basename(oldAvatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    users[userIndex].avatar = '/avatars/' + req.file.filename;
  }

  saveUsers(users);
  res.json({ id: users[userIndex].id, username: users[userIndex].username, avatar: users[userIndex].avatar });
});

// Раздача аватаров
app.use('/avatars', express.static(avatarsDir));

// Приветственный вывод сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});