import { defineConfig } from 'vite';

// По умолчанию Vite резолвит host "localhost" в IPv6 (::1), из-за чего
// dev-сервер недоступен по 127.0.0.1 — фиксируем IPv4 явно.
export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
});
