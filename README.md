# 🎮 Game Mobile Backend

Backend API for Mobile Game with **Offline-First Architecture**  
**Stack**: Node.js + Express + PostgreSQL + Prisma

---

## 🚀 QUICK START

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database (Prisma)
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (tạo tables trong PostgreSQL)
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 3. Run Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

**Server chạy tại**: http://localhost:3000

---

## 📁 PROJECT STRUCTURE

```
Backend/
├── prisma/
│   └── schema.prisma          # Database schema (PostgreSQL)
├── src/
│   ├── config/
│   │   └── database.js        # Prisma connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Register/Login/Me
│   │   └── scores.js          # Game scores CRUD
│   └── server.js              # Main entry point
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 🔌 API ENDPOINTS

### **Authentication**

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "123456"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player1@example.com",
  "password": "123456"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <TOKEN>
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "player1@example.com"
}
```
**Response (Development):**
```json
{
  "success": true,
  "message": "If email exists, a reset token has been generated",
  "resetToken": "123456"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "player1@example.com",
  "resetToken": "123456",
  "newPassword": "newpassword123"
}
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "username": "newusername",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

---

### **Game Scores**

#### Save Score
```http
POST /api/scores
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "gameType": "sudoku",
  "score": 1500,
  "attempts": 1,
  "difficulty": "hard",
  "timeSpent": 300,
  "gameData": {}
}
```

**Valid Values**:
- `gameType`: `rubik` | `sudoku` | `caro` | `puzzle`
- `difficulty`: `easy` | `medium` | `hard` | `expert`

#### Get User Scores
```http
GET /api/scores?gameType=sudoku&limit=20
Authorization: Bearer <TOKEN>
```

#### Get Leaderboard
```http
GET /api/scores/leaderboard?gameType=all&limit=10
```

#### Get User Stats
```http
GET /api/scores/stats
Authorization: Bearer <TOKEN>
```

---

## 🗄️ DATABASE SCHEMA

### Users Table
- `id` (UUID)
- `username` (unique, 3-20 chars)
- `email` (unique)
- `password` (bcrypt hashed)
- `avatarUrl`
- `totalGamesPlayed`
- `totalScore`
- `createdAt`, `lastLoginAt`

### GameScores Table
- `id` (UUID)
- `userId` (foreign key)
- `gameType` (enum: rubik, sudoku, caro, puzzle)
- `score` (integer)
- `attempts`
- `difficulty` (enum: easy, medium, hard, expert)
- `timeSpent` (seconds)
- `gameData` (JSONB - flexible game-specific data)
- `version` (for sync)
- `syncedAt`
- `createdAt`, `updatedAt`

**Indexes**:
- `(userId, gameType, createdAt)` - Fast user score queries
- `(gameType, score DESC)` - Fast leaderboard queries

---

## 🔧 USEFUL COMMANDS

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run prisma:reset
```

---

## 🧪 TESTING WITH POSTMAN

1. **Register** → Get token
2. **Login** → Get token
3. **Save Score** → Use token in Authorization header
4. **Get Leaderboard** → No auth needed

---

## 🌐 DEPLOYMENT

### Railway.app (Free)
```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. Deploy on Railway
# - Connect GitHub repo
# - Add DATABASE_URL from Railway Postgres
# - Deploy!
```

### Render.com (Free)
- Build Command: `npm install && npm run prisma:generate`
- Start Command: `npm start`
- Add environment variables from .env

---

## ✅ TODO

- [x] Setup Express + Prisma
- [x] User authentication (Register/Login)
- [x] Game score CRUD
- [x] Leaderboard
- [ ] Challenge system
- [ ] Friend system
- [ ] Chat (WebSocket) - OPTIONAL

---

**Version**: 1.0.0  
**Last Updated**: 18/12/2025
