import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { registerRoutes } from './routes';
import { initOcppServer } from './ocpp/ocppServer';

const PORT = Number(process.env.PORT) || 3000;

const app = express();

// Middleware do logowania wszystkich requestów (diagnostyka)
app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

registerRoutes(app);

const server = http.createServer(app);

// Inicjalizacja Socket.io
const io = new SocketIOServer(server, {
  path: '/socket.io/',
  cors: {
    origin: '*', // Pozwól na wszystkie domeny
    credentials: true,
    methods: ['GET', 'POST']
  },
  allowEIO3: true
});

// Logowanie połączeń Socket.io
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Klient połączony: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Klient rozłączony: ${socket.id}`);
  });
});

initOcppServer(server);

server.listen(PORT, () => {
  console.log(`[HTTP] Express server listening on port ${PORT}`);
  console.log(`[Socket.IO] Server initialized`);
});

// Eksportuj instancję io, żeby można było jej używać w innych plikach
export const getIo = () => io;

