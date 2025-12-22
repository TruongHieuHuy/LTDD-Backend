# Socket.IO Real-Time Chat Guide

## 📦 Installation (Client)

### Flutter
```yaml
# pubspec.yaml
dependencies:
  socket_io_client: ^2.0.3+1
```

### JavaScript/React
```bash
npm install socket.io-client
```

---

## 🔌 Connection Setup

### Flutter Example
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? socket;
  
  void connect(String token) {
    socket = IO.io('http://localhost:3000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {
        'token': token,
      },
    });

    socket!.connect();

    socket!.onConnect((_) {
      print('Connected to Socket.IO server');
    });

    socket!.onDisconnect((_) {
      print('Disconnected from server');
    });

    socket!.on('error', (data) {
      print('Socket error: $data');
    });
  }

  void disconnect() {
    socket?.disconnect();
    socket?.dispose();
  }
}
```

### JavaScript Example
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

## 💬 Chat Events

### 1. Join Chat Room

**Emit:**
```dart
socket!.emit('chat:join', {
  'otherUserId': friendId,
});
```

**Listen:**
```dart
socket!.on('chat:joined', (data) {
  print('Joined room: ${data['roomId']}');
});
```

---

### 2. Send Message

**Emit:**
```dart
socket!.emit('message:send', {
  'receiverId': friendId,
  'content': 'Hello!',
  'type': 'text',
});
```

**Listen for new messages:**
```dart
socket!.on('message:new', (data) {
  final message = Message.fromJson(data);
  // Add to chat list
});
```

---

### 3. Typing Indicator

**Start typing:**
```dart
socket!.emit('typing:start', {
  'receiverId': friendId,
});
```

**Stop typing:**
```dart
socket!.emit('typing:stop', {
  'receiverId': friendId,
});
```

**Listen:**
```dart
socket!.on('typing:user', (data) {
  final isTyping = data['isTyping'];
  final username = data['username'];
  // Show/hide typing indicator
});
```

---

### 4. Mark Message as Read

**Emit:**
```dart
socket!.emit('message:read', {
  'messageId': message.id,
  'senderId': message.senderId,
});
```

**Listen:**
```dart
socket!.on('message:read', (data) {
  final messageId = data['messageId'];
  final readAt = data['readAt'];
  // Update message UI (double check mark)
});
```

---

### 5. Online Status

**Request online friends:**
```dart
socket!.emit('friends:online');
```

**Listen:**
```dart
socket!.on('friends:online', (data) {
  final onlineFriends = List<String>.from(data['onlineFriends']);
  // Update friend list with online status
});
```

**Listen for status changes:**
```dart
socket!.on('user:status', (data) {
  final userId = data['userId'];
  final status = data['status']; // 'online' or 'offline'
  // Update friend's online indicator
});
```

---

### 6. Message Notifications

**Listen for notifications (when not in chat room):**
```dart
socket!.on('message:notification', (data) {
  final senderId = data['senderId'];
  final senderName = data['senderName'];
  final content = data['content'];
  
  // Show notification banner or badge
  showNotification('$senderName: $content');
});
```

---

### 7. Leave Chat Room

**Emit:**
```dart
socket!.emit('chat:leave', {
  'otherUserId': friendId,
});
```

---

## 🎯 Complete Flutter Example

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatService {
  IO.Socket? socket;
  String? currentRoomId;

  void connect(String token) {
    socket = IO.io('http://10.0.2.2:3000', {
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {'token': token},
    });

    socket!.connect();
    _setupListeners();
  }

  void _setupListeners() {
    socket!.onConnect((_) {
      print('✅ Connected to chat server');
      requestOnlineFriends();
    });

    socket!.on('chat:joined', (data) {
      currentRoomId = data['roomId'];
      print('💬 Joined chat room: $currentRoomId');
    });

    socket!.on('message:new', (data) {
      print('📨 New message received');
      // Handle new message
    });

    socket!.on('typing:user', (data) {
      print('⌨️ ${data['username']} is typing...');
      // Show typing indicator
    });

    socket!.on('message:read', (data) {
      print('✓✓ Message read: ${data['messageId']}');
      // Update message status
    });

    socket!.on('user:status', (data) {
      print('👤 ${data['userId']} is ${data['status']}');
      // Update online status
    });

    socket!.on('friends:online', (data) {
      final online = List<String>.from(data['onlineFriends']);
      print('👥 Online friends: ${online.length}');
    });

    socket!.on('message:notification', (data) {
      print('🔔 New message from ${data['senderName']}');
      // Show notification
    });

    socket!.onDisconnect((_) => print('❌ Disconnected'));
  }

  void joinChat(String friendId) {
    socket!.emit('chat:join', {'otherUserId': friendId});
  }

  void sendMessage(String friendId, String content) {
    socket!.emit('message:send', {
      'receiverId': friendId,
      'content': content,
      'type': 'text',
    });
  }

  void startTyping(String friendId) {
    socket!.emit('typing:start', {'receiverId': friendId});
  }

  void stopTyping(String friendId) {
    socket!.emit('typing:stop', {'receiverId': friendId});
  }

  void markAsRead(String messageId, String senderId) {
    socket!.emit('message:read', {
      'messageId': messageId,
      'senderId': senderId,
    });
  }

  void requestOnlineFriends() {
    socket!.emit('friends:online');
  }

  void leaveChat(String friendId) {
    socket!.emit('chat:leave', {'otherUserId': friendId});
  }

  void disconnect() {
    socket?.disconnect();
    socket?.dispose();
  }
}
```

---

## 🔥 Best Practices

### 1. Connection Management
- Connect once when app starts
- Reconnect automatically on disconnect
- Use authentication token from login

### 2. Room Management
- Join room when opening chat screen
- Leave room when closing chat screen
- Handle multiple chat rooms properly

### 3. Message Handling
- Save to local database first (offline-first)
- Sync with server via Socket.IO
- Handle message failures gracefully

### 4. Performance
- Debounce typing indicators (don't send every keystroke)
- Batch mark-as-read operations
- Limit message history loading

### 5. Error Handling
```dart
socket!.on('error', (error) {
  print('Socket error: $error');
  // Show error to user
  // Attempt reconnection
});
```

---

## 🧪 Testing

### Test with Postman or Socket.IO Client
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Test join
  socket.emit('chat:join', { otherUserId: 'friend-id' });
  
  // Test send message
  socket.emit('message:send', {
    receiverId: 'friend-id',
    content: 'Test message',
    type: 'text'
  });
});
```

---

## 📊 Event Flow Diagram

```
User A                 Server              User B
  |                      |                    |
  |---connect----------->|                    |
  |<--connect-ack--------|                    |
  |                      |<---connect---------|
  |                      |----connect-ack---->|
  |                      |                    |
  |---chat:join--------->|                    |
  |<--chat:joined--------|                    |
  |                      |                    |
  |---message:send------>|                    |
  |                      |----message:new---->|
  |<--message:new--------|                    |
  |                      |                    |
  |                      |<--message:read-----|
  |<--message:read-------|                    |
```

---

## 🎯 Events Summary

| Event | Direction | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `chat:join` | Client → Server | Join chat room | Yes |
| `chat:joined` | Server → Client | Room joined confirmation | - |
| `chat:leave` | Client → Server | Leave chat room | Yes |
| `message:send` | Client → Server | Send message | Yes |
| `message:new` | Server → Client | New message received | - |
| `message:read` | Bidirectional | Mark message as read | Yes |
| `typing:start` | Client → Server | Start typing | Yes |
| `typing:stop` | Client → Server | Stop typing | Yes |
| `typing:user` | Server → Client | Typing indicator | - |
| `friends:online` | Bidirectional | Get/update online friends | Yes |
| `user:status` | Server → Client | User online/offline | - |
| `message:notification` | Server → Client | Message notification | - |
| `error` | Server → Client | Error message | - |

---

## 🔐 Security

- JWT authentication required for connection
- Only friends can message each other
- Room validation before joining
- Rate limiting on message sending (implement if needed)
- Input sanitization on server side

---

**Happy Chatting! 💬**
