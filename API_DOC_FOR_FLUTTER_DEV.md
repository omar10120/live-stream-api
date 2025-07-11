# noejs-api Backend — API Documentation for Flutter Developer

## Base URLs
- REST: `http://localhost:3000`
- Socket.IO: `ws://localhost:3000`

---

## Authentication
- Register/Login returns a JWT token.
- Pass JWT as `Authorization: Bearer <token>` in REST requests.
- For Socket.IO, send userId in event payloads.

---

## REST API Endpoints

### Auth
| Endpoint         | Method | Body / Params                        | Description                |
|-----------------|--------|--------------------------------------|----------------------------|
| /auth/register   | POST   | email, password, username            | Register new user          |
| /auth/login      | POST   | email, password                      | Login                      |
| /auth/social     | POST   | provider, providerId, email, ...     | Social login (Google/Apple)|
| /auth/me         | GET    | (JWT in header)                      | Get current user           |

### User
| Endpoint                | Method | Body / Params         | Description                |
|-------------------------|--------|-----------------------|----------------------------|
| /user/:id               | GET    |                       | Get user profile           |
| /user/:id               | PUT    | username, avatar, bio | Update profile (auth)      |
| /user/:id/follow        | POST   |                       | Follow user (auth)         |
| /user/:id/unfollow      | POST   |                       | Unfollow user (auth)       |
| /user/search?q=term     | GET    |                       | Search users               |

### Stream
| Endpoint                | Method | Body / Params         | Description                |
|-------------------------|--------|-----------------------|----------------------------|
| /stream/create          | POST   | title, category, ...  | Start a stream (auth)      |
| /stream/end             | POST   | streamId              | End a stream (auth)        |
| /stream/list            | GET    |                       | List live streams          |
| /stream/:id             | GET    |                       | View stream details        |
| /stream/trending        | GET    |                       | Trending streams           |
| /stream/search?q=term   | GET    |                       | Search streams             |

### Message
| Endpoint                | Method | Body / Params         | Description                |
|-------------------------|--------|-----------------------|----------------------------|
| /message/send           | POST   | streamId, content     | Send message (auth)        |
| /message/:streamId      | GET    |                       | List messages for stream   |

### Category
| Endpoint                | Method | Body / Params         | Description                |
|-------------------------|--------|-----------------------|----------------------------|
| /category/list          | GET    |                       | List categories            |
| /category/create        | POST   | name, icon, order     | Create category (auth)     |

### Follow
| Endpoint                        | Method | Body / Params         | Description                |
|----------------------------------|--------|-----------------------|----------------------------|
| /follow/:id/followers            | GET    |                       | Get followers for user     |
| /follow/:id/following            | GET    |                       | Get following for user     |

---

## Socket.IO Events
- Connect to: `ws://localhost:3000`

| Event Name      | Payload Example                                      | Listen For         | Description                  |
|-----------------|-----------------------------------------------------|--------------------|------------------------------|
| join_stream     | {"streamId": "...", "userId": "..."}             | viewer_count       | Join stream room, get count  |
| leave_stream    | {"streamId": "...", "userId": "..."}             | viewer_count       | Leave stream room, get count |
| send_message    | {"streamId": "...", "userId": "...", "content": "Hi"} | new_message        | Send chat message            |
| stream_status   | {"streamId": "...", "status": "start"}           | stream_status      | Start/stop stream status     |

---

## Example: Register & Start Stream
1. **Register:**
   ```json
   POST /auth/register
   {
     "email": "user@example.com",
     "password": "password123",
     "username": "user1"
   }
   ```
2. **Login:**
   ```json
   POST /auth/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   // Response: { token: "..." }
   ```
3. **Start Stream:**
   ```json
   POST /stream/create
   (Header: Authorization: Bearer <token>)
   {
     "title": "My Live Stream",
     "category": "<categoryId>",
     "tags": ["game"],
     "type": "Game"
   }
   ```
4. **Join Stream (Socket.IO):**
   ```json
   Event: join_stream
   {
     "streamId": "<streamId>",
     "userId": "<userId>"
   }
   ```

---

## Notes for Flutter Dev
- Use REST for user, stream, and message CRUD.
- Use Socket.IO for real-time chat, viewers, and stream status.
- For camera streaming, use a video streaming package (WebRTC, RTMP, etc.) — backend only handles signaling, chat, and metadata.
- See provided Postman collections for ready-to-test examples.

---

**Contact backend dev for any questions or to request new endpoints/events.** 