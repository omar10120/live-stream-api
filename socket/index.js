const Message = require('../models/Message');
const Stream = require('../models/Stream');
const User = require('../models/User');

// Store offers and viewers in memory (for demo, use Redis/DB for scale)
const offers = {}; // { streamId: { offer, broadcasterSocketId, viewers: [] } }

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // JOIN STREAM (with WebRTC offer relay if available)
    socket.on('join_stream', async ({ streamId, userId }) => {
      try {
        if (!streamId || !userId) {
          return socket.emit('error', { message: 'streamId and userId are required' });
        }

        socket.join(streamId);

        // Update DB
        await Stream.findByIdAndUpdate(streamId, { $addToSet: { viewers: userId } });
        const stream = await Stream.findById(streamId);

        // Notify viewer count
        io.to(streamId).emit('viewer_count', { count: stream.viewers.length });
        console.log(`[join_stream] User ${userId} joined stream ${streamId}`);

        // Relay WebRTC offer if available
        if (offers[streamId]?.offer) {
          io.to(socket.id).emit('stream_offer', offers[streamId].offer);
          offers[streamId].viewers.push(socket.id);
          console.log(`[join_stream] Sent WebRTC offer to viewer: ${userId}`);
        } else {
          console.log(`[join_stream] No offer yet for stream ${streamId}`);
        }

      } catch (err) {
        console.error('Error in join_stream:', err);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    // LEAVE STREAM
    socket.on('leave_stream', async ({ streamId, userId }) => {
      try {
        if (!streamId || !userId) {
          return socket.emit('error', { message: 'streamId and userId are required' });
        }

        socket.leave(streamId);
        await Stream.findByIdAndUpdate(streamId, { $pull: { viewers: userId } });
        const stream = await Stream.findById(streamId);

        io.to(streamId).emit('viewer_count', { count: stream.viewers.length });
        console.log(`[leave_stream] User ${userId} left stream ${streamId}`);
      } catch (err) {
        console.error('Error in leave_stream:', err);
        socket.emit('error', { message: 'Failed to leave stream' });
      }
    });

    // SEND MESSAGE
    socket.on('send_message', async ({ streamId, userId, content, type }) => {
      try {
        if (!streamId || !userId || !content) {
          return socket.emit('error', { message: 'streamId, userId, and content are required' });
        }

        const message = await Message.create({
          streamId,
          userId,
          content,
          type: type || 'text',
          filtered: false
        });

        io.to(streamId).emit('new_message', {
          _id: message._id,
          streamId,
          userId,
          content,
          type: message.type,
          timestamp: message.timestamp
        });

        console.log(`[send_message] Message sent by ${userId} in stream ${streamId}`);
      } catch (err) {
        console.error('Error in send_message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // STREAM STATUS UPDATE
    socket.on('stream_status', ({ streamId, status }) => {
      if (!streamId || !status) {
        return socket.emit('error', { message: 'streamId and status are required' });
      }

      io.to(streamId).emit('stream_status', { streamId, status });
      console.log(`[stream_status] Stream ${streamId} status: ${status}`);
    });

    // BROADCASTER OFFERS SDP
    socket.on('stream_offer', ({ streamId, sdp, type }) => {
      try {
        if (!streamId || !sdp || !type) {
          return socket.emit('error', { message: 'streamId, sdp, and type are required' });
        }

        offers[streamId] = {
          offer: { streamId, sdp, type },
          broadcasterSocketId: socket.id,
          viewers: []
        };

        socket.emit('offer-stored', { streamId });
        console.log(`[stream_offer] Offer stored for stream ${streamId}`);
      } catch (err) {
        console.error('Error in stream_offer:', err);
        socket.emit('error', { message: 'Failed to store offer' });
      }
    });

    // VIEWER SENDS ANSWER TO BROADCASTER
    socket.on('stream_answer', ({ streamId, userId, sdp, type }) => {
      try {
        if (!streamId || !userId || !sdp || !type) {
          return socket.emit('error', { message: 'Missing stream answer data' });
        }

        const broadcasterId = offers[streamId]?.broadcasterSocketId;
        if (broadcasterId) {
          io.to(broadcasterId).emit('stream_answer', { streamId, userId, sdp, type });
          console.log(`[stream_answer] Answer relayed from ${userId} to broadcaster of stream ${streamId}`);
        } else {
          socket.emit('error', { message: 'No broadcaster found for this stream' });
        }
      } catch (err) {
        console.error('Error in stream_answer:', err);
        socket.emit('error', { message: 'Failed to relay answer' });
      }
    });

    // ICE CANDIDATES
    socket.on('ice_candidate', ({ streamId, userId, candidate }) => {
      try {
        if (!streamId || !userId || !candidate) {
          return socket.emit('error', { message: 'Missing ICE candidate data' });
        }

        const streamOffer = offers[streamId];
        if (!streamOffer) {
          return socket.emit('error', { message: 'No stream offer found' });
        }

        if (socket.id === streamOffer.broadcasterSocketId) {
          // Broadcaster ICE → Viewers
          streamOffer.viewers.forEach(viewerSocketId => {
            io.to(viewerSocketId).emit('ice_candidate', { streamId, userId, candidate });
          });
          console.log(`[ice_candidate] Broadcaster ICE relayed to ${streamOffer.viewers.length} viewers`);
        } else {
          // Viewer ICE → Broadcaster
          io.to(streamOffer.broadcasterSocketId).emit('ice_candidate', { streamId, userId, candidate });
          console.log(`[ice_candidate] Viewer ${userId} ICE relayed to broadcaster`);
        }
      } catch (err) {
        console.error('Error in ice_candidate:', err);
        socket.emit('error', { message: 'Failed to relay ICE candidate' });
      }
    });

    // DISCONNECT HANDLER
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);

      Object.keys(offers).forEach(streamId => {
        const offer = offers[streamId];

        if (offer.viewers.includes(socket.id)) {
          offer.viewers = offer.viewers.filter(sid => sid !== socket.id);
          console.log(`[disconnect] Viewer removed from stream ${streamId}`);
        }

        if (offer.broadcasterSocketId === socket.id) {
          delete offers[streamId];
          io.to(streamId).emit('broadcaster_disconnected', { streamId });
          console.log(`[disconnect] Broadcaster disconnected for stream ${streamId}`);
        }
      });
    });
  });
};
