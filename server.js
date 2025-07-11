const http = require('http');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noejs-api';

// MongoDB connection
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });
require('./socket')(io);

// Socket.IO logic placeholder
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
  
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 