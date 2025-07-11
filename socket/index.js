const Message = require('../models/Message');
const Stream = require('../models/Stream');
const User = require('../models/User');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Join a stream room
    socket.on('join_stream', async ({ streamId, userId }) => {
      socket.join(streamId);
      // Increment viewers in DB
      await Stream.findByIdAndUpdate(streamId, { $addToSet: { viewers: userId } });
      // Broadcast new viewer count
      const stream = await Stream.findById(streamId);
      io.to(streamId).emit('viewer_count', { count: stream.viewers.length });
    });

    // Leave a stream room
    socket.on('leave_stream', async ({ streamId, userId }) => {
      socket.leave(streamId);
      // Decrement viewers in DB
      await Stream.findByIdAndUpdate(streamId, { $pull: { viewers: userId } });
      // Broadcast new viewer count
      const stream = await Stream.findById(streamId);
      io.to(streamId).emit('viewer_count', { count: stream.viewers.length });
    });

    // Live chat: send message
    socket.on('send_message', async ({ streamId, userId, content, type }) => {
      // Save message to DB
      const message = await Message.create({
        streamId,
        userId,
        content,
        type: type || 'text',
        filtered: false
      });
      // Broadcast to all in room
      io.to(streamId).emit('new_message', {
        _id: message._id,
        streamId,
        userId,
        content,
        type: message.type,
        timestamp: message.timestamp
      });
    });

    // Stream status updates
    socket.on('stream_status', ({ streamId, status }) => {
      // status: 'start' | 'stop'
      io.to(streamId).emit('stream_status', { streamId, status });
    });
  });
}; 