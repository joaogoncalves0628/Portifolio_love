import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { SignJWT, jwtVerify } from 'jose';
import multer from 'multer';
import mysql from 'mysql2/promise';

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);
const authSecretValue = process.env.AUTH_JWT_SECRET;
const authSecret = authSecretValue ? new TextEncoder().encode(authSecretValue) : null;
const authUsers = [
  { id: 'joao-lucas', username: 'joaolucas', name: 'João Lucas', password: process.env.AUTH_JOAO_PASSWORD },
  { id: 'caio-forini', username: 'caioforini', name: 'Caio Forini', password: process.env.AUTH_CAIO_PASSWORD },
];

if (!authSecret || authSecret.byteLength < 32) {
  throw new Error('Configure AUTH_JWT_SECRET com pelo menos 32 caracteres no ambiente do servidor.');
}
if (authUsers.some((user) => !user.password || user.password.length < 12)) {
  throw new Error('Configure AUTH_JOAO_PASSWORD e AUTH_CAIO_PASSWORD com pelo menos 12 caracteres cada.');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' },
});
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'portifolio_love',
  ssl: process.env.MYSQL_SSL === 'true' ? {} : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
});

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (
      ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif',
        'video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype)
    ) {
      callback(null, true);
      return;
    }
    const error = new Error('Envie uma imagem compatível ou um vídeo MP4, MOV ou WebM.');
    error.status = 415;
    callback(error);
  },
});

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: '128kb' }));

function normalizeUsername(value) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isSameSecret(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const prefix = `${name}=`;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function getRequestToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  return getCookie(request, 'velour_session');
}

async function requireAuth(request, response, next) {
  const token = getRequestToken(request);
  if (!token) {
    response.status(401).json({ error: 'Entre para continuar.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, authSecret, {
      issuer: 'portifolio-love',
      audience: 'portifolio-love',
    });
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string' || typeof payload.name !== 'string') {
      response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
      return;
    }
    request.auth = { id: payload.sub, username: payload.username, name: payload.name };
    next();
  } catch {
    response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
  }
}

app.post('/api/auth/login', loginLimiter, async (request, response, next) => {
  const { username, password, rememberMe } = request.body ?? {};
  const normalizedUsername = normalizeUsername(username);
  if (typeof password !== 'string' || !password || password.length > 256) {
    response.status(401).json({ error: 'Usuário ou senha inválidos.' });
    return;
  }

  const user = authUsers.find((candidate) => candidate.username === normalizedUsername);
  if (!user || !isSameSecret(password, user.password)) {
    response.status(401).json({ error: 'Usuário ou senha inválidos.' });
    return;
  }

  const remember = rememberMe === true;
  const expiresIn = remember ? '30d' : '12h';
  try {
    const token = await new SignJWT({ username: user.username, name: user.name })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer('portifolio-love')
      .setAudience('portifolio-love')
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(authSecret);

    if (request.get('X-Auth-Transport') === 'cookie') {
      response.cookie('velour_session', token, {
        ...cookieOptions,
        ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
      });
      response.json({ user: { id: user.id, username: user.username, name: user.name } });
      return;
    }

    response.json({ user: { id: user.id, username: user.username, name: user.name }, token });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ user: request.auth });
});

app.post('/api/auth/logout', (_request, response) => {
  response.clearCookie('velour_session', cookieOptions);
  response.json({ success: true });
});

app.use('/api', requireAuth);

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function jsonArray(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeMemoryInput(body, includeFavorite = false) {
  const {
    contentType,
    author,
    location,
    date,
    time,
    images,
    title,
    description,
    tags,
    privatePinned,
    isFavorite,
  } = body ?? {};
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';
  const isValidMemoryDate = (value) => {
    if (typeof value !== 'string') return false;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return false;
    const [, dayText, monthText, yearText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    return parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day;
  };
  const normalizedImages = Array.isArray(images)
    ? images.map((media) => typeof media === 'string' ? { type: 'image', uri: media } : media)
    : [];
  const isValidMedia = (media) =>
    media &&
    typeof media === 'object' &&
    ['image', 'video'].includes(media.type) &&
    typeof media.uri === 'string' &&
    /^https:\/\//i.test(media.uri);

  if (
    !['photo', 'carousel', 'text'].includes(contentType) ||
    !normalizedTitle ||
    normalizedTitle.length > 60 ||
    !isValidMemoryDate(date) ||
    (typeof description !== 'undefined' && typeof description !== 'string') ||
    normalizedDescription.length > 5000 ||
    (contentType === 'text' && normalizedImages.length !== 0) ||
    (contentType === 'photo' && (normalizedImages.length !== 1 || normalizedImages[0]?.type !== 'image')) ||
    (contentType === 'carousel' && (normalizedImages.length < 2 || normalizedImages.length > 10)) ||
    normalizedImages.some((media) => !isValidMedia(media))
  ) {
    return { error: 'Confira o tipo, o conteúdo e as imagens do post.' };
  }
  if (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== 'string' || tag.length > 40)) {
    return { error: 'As tags do post são inválidas.' };
  }
  if (typeof author === 'string' && author.trim().length > 100) {
    return { error: 'O nome do autor deve ter até 100 caracteres.' };
  }
  if (typeof location === 'string' && location.trim().length > 160) {
    return { error: 'O local deve ter até 160 caracteres.' };
  }
  if (typeof date === 'string' && date.trim().length > 40) {
    return { error: 'A data deve ter até 40 caracteres.' };
  }
  if (time && (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    return { error: 'Informe o horário no formato HH:MM.' };
  }
  if (privatePinned !== undefined && typeof privatePinned !== 'boolean') {
    return { error: 'A opção de destaque é inválida.' };
  }
  if (includeFavorite && typeof isFavorite !== 'boolean') {
    return { error: 'A opção de curtida é inválida.' };
  }

  return {
    value: {
      contentType,
      author: typeof author === 'string' && author.trim() ? author.trim() : 'Registrado por Você',
      location: typeof location === 'string' && location.trim() ? location.trim() : 'Nosso cantinho',
      date: typeof date === 'string' && date.trim() ? date.trim() : 'Hoje',
      time: time || null,
      images: normalizedImages,
      title: normalizedTitle,
      description: normalizedDescription,
      tags,
      isFavorite: includeFavorite ? isFavorite : false,
      privatePinned: Boolean(privatePinned),
    },
  };
}

app.get('/health', async (_request, response) => {
  let database = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Database health check failed:', error);
    database = 'disconnected';
  }
  const ready = database === 'connected' && cloudinaryConfigured;
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    database,
    cloudinary: cloudinaryConfigured,
  });
});

app.get('/api/memories', async (_request, response, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, content_type AS contentType, author, location,
        memory_date AS date, memory_time AS time, image_urls AS images,
        title, description, tags, is_favorite AS isFavorite,
        private_pinned AS privatePinned, created_at AS createdAt
       FROM memories
       ORDER BY created_at DESC`,
    );

    response.json(rows.map((memory) => ({
      ...memory,
      images: jsonArray(memory.images).map((media) =>
        typeof media === 'string' ? { type: 'image', uri: media } : media,
      ),
      tags: jsonArray(memory.tags),
      time: memory.time ? String(memory.time).slice(0, 5) : '',
      isFavorite: Boolean(memory.isFavorite),
      privatePinned: Boolean(memory.privatePinned),
    })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads', mediaUpload.single('file'), async (request, response, next) => {
  if (!cloudinaryConfigured) {
    response.status(503).json({ error: 'Configure o Cloudinary no servidor antes de enviar mídias.' });
    return;
  }
  if (!request.file) {
    response.status(400).json({ error: 'Selecione uma imagem ou vídeo para enviar.' });
    return;
  }

  try {
    const type = request.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'portifolio-love/memories', resource_type: type },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        },
      );
      stream.end(request.file.buffer);
    });

    response.status(201).json({ url: uploaded.secure_url, type });
  } catch (error) {
    next(error);
  }
});

app.post('/api/memories', async (request, response, next) => {
  const parsed = normalizeMemoryInput(request.body);
  if (parsed.error) {
    response.status(400).json({ error: parsed.error });
    return;
  }

  const memory = {
    id: randomUUID(),
    ...parsed.value,
    createdAt: new Date().toISOString(),
  };

  try {
    await pool.execute(
      `INSERT INTO memories
        (id, content_type, author, location, memory_date, memory_time, image_urls,
          title, description, tags, private_pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memory.id,
        memory.contentType,
        memory.author,
        memory.location,
        memory.date,
        memory.time,
        JSON.stringify(memory.images),
        memory.title,
        memory.description,
        JSON.stringify(memory.tags),
        memory.privatePinned,
      ],
    );
    response.status(201).json(memory);
  } catch (error) {
    next(error);
  }
});

app.put('/api/memories/:id', async (request, response, next) => {
  const parsed = normalizeMemoryInput(request.body, true);
  if (parsed.error) {
    response.status(400).json({ error: parsed.error });
    return;
  }

  const memory = parsed.value;
  try {
    await pool.execute(
      `UPDATE memories SET content_type = ?, author = ?, location = ?, memory_date = ?,
        memory_time = ?, image_urls = ?, title = ?, description = ?, tags = ?,
        is_favorite = ?, private_pinned = ? WHERE id = ?`,
      [
        memory.contentType,
        memory.author,
        memory.location,
        memory.date,
        memory.time,
        JSON.stringify(memory.images),
        memory.title,
        memory.description,
        JSON.stringify(memory.tags),
        memory.isFavorite,
        memory.privatePinned,
        request.params.id,
      ],
    );
    const [rows] = await pool.execute(
      'SELECT created_at AS createdAt FROM memories WHERE id = ?',
      [request.params.id],
    );
    if (rows.length === 0) {
      response.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    response.json({ id: request.params.id, ...memory, createdAt: rows[0].createdAt });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/memories/:id', async (request, response, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM memories WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) {
      response.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    response.json({ id: request.params.id });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/memories/:id/favorite', async (request, response, next) => {
  const { isFavorite } = request.body ?? {};
  if (typeof isFavorite !== 'boolean') {
    response.status(400).json({ error: 'Informe se o post está curtido.' });
    return;
  }

  try {
    const [result] = await pool.execute(
      'UPDATE memories SET is_favorite = ? WHERE id = ?',
      [isFavorite, request.params.id],
    );
    if (result.affectedRows === 0) {
      const [rows] = await pool.execute('SELECT id FROM memories WHERE id = ?', [request.params.id]);
      if (rows.length === 0) {
        response.status(404).json({ error: 'Post não encontrado.' });
        return;
      }
    }
    response.json({ id: request.params.id, isFavorite });
  } catch (error) {
    next(error);
  }
});

app.get('/api/notes', async (_request, response, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, author, content, created_at AS createdAt FROM love_notes ORDER BY created_at DESC',
    );
    response.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/notes', async (request, response, next) => {
  const { author, content } = request.body ?? {};
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 1000) {
    response.status(400).json({ error: 'Escreva um bilhete de até 1000 caracteres.' });
    return;
  }

  const note = {
    id: randomUUID(),
    author: typeof author === 'string' && author.trim() ? author.trim().slice(0, 100) : 'Você',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  try {
    await pool.execute(
      'INSERT INTO love_notes (id, author, content) VALUES (?, ?, ?)',
      [note.id, note.author, note.content],
    );
    response.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', async (_request, response, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, event_date AS date, event_time AS time,
        description, created_at AS createdAt
       FROM couple_events
       ORDER BY event_date, event_time`,
    );
    response.json(rows.map((event) => ({ ...event, time: event.time ? String(event.time).slice(0, 5) : '' })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/events', async (request, response, next) => {
  const { title, date, time, description } = request.body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 || !isValidDate(date)) {
    response.status(400).json({ error: 'Informe um título e uma data válida para o evento.' });
    return;
  }
  if (time && (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    response.status(400).json({ error: 'Informe o horário no formato HH:MM.' });
    return;
  }

  const event = {
    id: randomUUID(),
    title: title.trim(),
    date,
    time: time || '',
    description: typeof description === 'string' ? description.trim().slice(0, 500) : '',
    createdAt: new Date().toISOString(),
  };
  try {
    await pool.execute(
      'INSERT INTO couple_events (id, title, event_date, event_time, description) VALUES (?, ?, ?, ?, ?)',
      [event.id, event.title, event.date, event.time || null, event.description],
    );
    response.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

app.get('/api/settings', async (_request, response, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT person_one AS personOne, person_two AS personTwo,
        relationship_start_date AS relationshipStartDate,
        joao_avatar_url AS joaoAvatarUrl, caio_avatar_url AS caioAvatarUrl
       FROM couple_settings WHERE id = 1`,
    );
    response.json(rows[0] || {
      personOne: 'Você',
      personTwo: 'Seu amor',
      relationshipStartDate: '2026-08-16',
      joaoAvatarUrl: null,
      caioAvatarUrl: null,
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/settings', async (request, response, next) => {
  const { personOne, personTwo, relationshipStartDate, joaoAvatarUrl, caioAvatarUrl } = request.body ?? {};
  if (
    typeof personOne !== 'string' ||
    !personOne.trim() ||
    personOne.trim().length > 80 ||
    typeof personTwo !== 'string' ||
    !personTwo.trim() ||
    personTwo.trim().length > 80 ||
    !isValidDate(relationshipStartDate)
  ) {
    response.status(400).json({ error: 'Informe os dois nomes e uma data de namoro válida.' });
    return;
  }
  if (
    [joaoAvatarUrl, caioAvatarUrl].some((url) =>
      url !== undefined && url !== null && url !== '' &&
      (typeof url !== 'string' || url.length > 2048 || !/^https:\/\//i.test(url)),
    )
  ) {
    response.status(400).json({ error: 'As fotos de perfil precisam ser URLs HTTPS válidas.' });
    return;
  }

  const settings = {
    personOne: personOne.trim(),
    personTwo: personTwo.trim(),
    relationshipStartDate,
    joaoAvatarUrl: typeof joaoAvatarUrl === 'string' && joaoAvatarUrl ? joaoAvatarUrl : null,
    caioAvatarUrl: typeof caioAvatarUrl === 'string' && caioAvatarUrl ? caioAvatarUrl : null,
  };
  try {
    await pool.execute(
      `INSERT INTO couple_settings
         (id, person_one, person_two, relationship_start_date, joao_avatar_url, caio_avatar_url)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE person_one = VALUES(person_one),
         person_two = VALUES(person_two), relationship_start_date = VALUES(relationship_start_date),
         joao_avatar_url = COALESCE(VALUES(joao_avatar_url), joao_avatar_url),
         caio_avatar_url = COALESCE(VALUES(caio_avatar_url), caio_avatar_url)`,
      [
        settings.personOne,
        settings.personTwo,
        settings.relationshipStartDate,
        settings.joaoAvatarUrl,
        settings.caioAvatarUrl,
      ],
    );
    response.json(settings);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({ error: 'Cada mídia deve ter no máximo 100 MB.' });
    return;
  }
  if (error.status === 415) {
    response.status(415).json({ error: error.message });
    return;
  }
  response.status(500).json({ error: 'Erro interno ao acessar o banco de dados ou o armazenamento de fotos.' });
});

const server = app.listen(port, host, () => {
  console.log(`Portfolio API listening at http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
