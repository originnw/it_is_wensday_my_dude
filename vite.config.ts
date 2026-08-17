import { defineConfig } from 'vite';

// По умолчанию Vite резолвит host "localhost" в IPv6 (::1), из-за чего
// dev-сервер недоступен по 127.0.0.1 — фиксируем IPv4 явно.
export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  // Игровая логика (game/*.ts) не трогает DOM/canvas (принцип IV конституции,
  // AC-12 фичи 001-frog-movement), поэтому окружение "node" достаточно —
  // jsdom не подключаем.
  test: {
    environment: 'node',
  },
});
