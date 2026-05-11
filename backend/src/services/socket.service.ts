import { Server as SocketIO, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: SocketIO): void => {
  // Authenticate socket connections
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
        id: string;
        role: string;
      };
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.userRole})`);

    // Join personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Service providers join their own room for broadcasting
    if (socket.userRole === 'SERVICE_PROVIDER') {
      socket.join(`provider:${socket.userId}`);
    }

    socket.on('join:provider-room', (providerId: string) => {
      socket.join(`provider-clients:${providerId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });
};

// Helper to emit appointment updates
export const emitAppointmentUpdate = (io: SocketIO, userId: string, data: object): void => {
  io.to(`user:${userId}`).emit('appointment:updated', data);
};

export const emitBroadcast = (io: SocketIO, providerId: string, data: object): void => {
  io.to(`provider-clients:${providerId}`).emit('broadcast:message', data);
};
