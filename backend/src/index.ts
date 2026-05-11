import 'dotenv/config';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './services/socket.service';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketHandlers(io);

// Make io available to route handlers
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
