# World Chat - Global Communication App

A real-time chat application that lets you connect with people from all around the world, with group video calls and personal photo/video albums.

## Features

### Real-Time Chat
- Multiple public chat rooms (Global, English, Espanol)
- Real-time messaging with Socket.IO
- Typing indicators
- Online user tracking

### Video Room
- Global video call room using WebRTC
- Multi-participant video calls (mesh architecture)
- Toggle camera and microphone
- Responsive video grid

### User Profiles & Albums
- Customizable profile with bio and country
- Photo and video album (upload up to 50MB each)
- Lightbox viewer for media
- Filter by photos or videos

### Authentication
- Secure registration and login
- JWT-based authentication
- Persistent sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Video | WebRTC (peer-to-peer) |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| File Upload | Multer |
| Styling | Custom CSS (Dark theme) |

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

```bash
# Clone the repository
git clone https://github.com/snalty04-glitch/snalty04-glitch.git
cd snalty04-glitch

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Configure Environment

```bash
# Copy environment example
cp backend/.env.example backend/.env
# Edit backend/.env and set your JWT_SECRET
```

### Running in Development

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

### Access the App
Open your browser at: **http://localhost:5173**

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:id/messages` - Get room messages

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user profile

### Media
- `POST /api/media/upload` - Upload photos/videos
- `GET /api/media/album/:userId` - Get user album
- `DELETE /api/media/:id` - Delete media item

## Socket Events

### Chat
- `room:join` / `room:leave`
- `message:send` / `message:received`
- `typing:start` / `typing:stop`

### Video (WebRTC Signaling)
- `video:join` / `video:leave`
- `video:offer` / `video:answer`
- `video:ice-candidate`
- `video:toggle-media`

## License

MIT
