const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const {
  initDatabase,
  queryAll,
  queryOne,
  runSql,
  saveDatabase,
} = require("./database");

const JWT_SECRET = "avgchat-secret-key-2024";
const PORT = 3001;
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: MAX_FILE_SIZE,
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

// ----------- UTILS -----------
function deleteFile(fileUrl) {
  if (!fileUrl) return;
  const fileName = fileUrl.split("/").pop();
  const filePath = path.join(uploadsDir, fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("Error deleting file:", e);
    }
  }
}

// ----------- AUTH MIDDLEWARE -----------
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not authorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  next();
}

// ----------- AUTH ROUTES -----------
app.post("/api/register", (req, res) => {
  const { username, display_name, password } = req.body;
  if (!username || !password || !display_name)
    return res.status(400).json({ error: "All fields required" });
  if (username.length < 3)
    return res.status(400).json({ error: "Username too short" });

  const existing = queryOne("SELECT id FROM users WHERE username = ?", [
    username,
  ]);
  if (existing) return res.status(400).json({ error: "Username exists" });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const colors = [
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#ec4899",
    "#14b8a6",
    "#f43f5e",
  ];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  runSql(
    "INSERT INTO users (id, username, display_name, password, role, status, avatar_color) VALUES (?, ?, ?, ?, 'user', 'pending', ?)",
    [id, username, display_name, hashedPassword, avatarColor],
  );

  io.emit("new_registration", { id, username, display_name });
  res.json({ message: "Registration pending admin approval." });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields required" });

  const user = queryOne("SELECT * FROM users WHERE username = ?", [username]);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: "Invalid credentials" });
  if (user.status === "pending")
    return res.status(403).json({ error: "Account pending approval" });
  if (user.status === "rejected")
    return res.status(403).json({ error: "Account rejected" });

  runSql("UPDATE users SET last_seen = datetime('now') WHERE id = ?", [
    user.id,
  ]);
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar_url: user.avatar_url,
      avatar_color: user.avatar_color,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar_color: user.avatar_color,
      avatar_url: user.avatar_url,
    },
  });
});

app.get("/api/me", authMiddleware, (req, res) => {
  const user = queryOne(
    "SELECT id, username, display_name, role, avatar_color, avatar_url, status FROM users WHERE id = ?",
    [req.user.id],
  );
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});

app.post("/api/me/update", authMiddleware, (req, res) => {
  const { display_name, password, old_password } = req.body;
  const user = queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]);

  if (display_name && display_name !== user.display_name) {
    runSql("UPDATE users SET display_name = ? WHERE id = ?", [
      display_name,
      req.user.id,
    ]);
  }

  if (password) {
    if (!bcrypt.compareSync(old_password || "", user.password)) {
      return res.status(400).json({ error: "Invalid old password" });
    }
    runSql("UPDATE users SET password = ? WHERE id = ?", [
      bcrypt.hashSync(password, 10),
      req.user.id,
    ]);
  }

  const updated = queryOne(
    "SELECT id, username, display_name, role, avatar_color, avatar_url, status FROM users WHERE id = ?",
    [req.user.id],
  );
  const token = jwt.sign(
    {
      id: updated.id,
      username: updated.username,
      display_name: updated.display_name,
      role: updated.role,
      avatar_url: updated.avatar_url,
      avatar_color: updated.avatar_color,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );

  io.emit("user_updated", updated);
  res.json({ token, user: updated });
});

app.post(
  "/api/me/avatar",
  authMiddleware,
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const user = queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]);

    if (user && user.avatar_url && fileUrl !== user.avatar_url) {
      deleteFile(user.avatar_url);
    }

    runSql("UPDATE users SET avatar_url = ? WHERE id = ?", [
      fileUrl,
      req.user.id,
    ]);
    io.emit("user_updated", { id: req.user.id, avatar_url: fileUrl });
    res.json({ avatar_url: fileUrl });
  },
);

// ----------- ADMIN ROUTES -----------
app.get(
  "/api/admin/pending-users",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const users = queryAll(
      "SELECT id, username, display_name, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC",
    );
    res.json({ users });
  },
);
app.get("/api/admin/all-users", authMiddleware, adminMiddleware, (req, res) => {
  const users = queryAll(
    "SELECT id, username, display_name, role, status, avatar_color, avatar_url, created_at, last_seen FROM users ORDER BY created_at DESC",
  );
  res.json({ users });
});
app.post(
  "/api/admin/approve-user/:userId",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    runSql("UPDATE users SET status = 'approved' WHERE id = ?", [
      req.params.userId,
    ]);
    io.emit("user_approved", { userId: req.params.userId });
    res.json({ message: "Approved" });
  },
);
app.post(
  "/api/admin/reject-user/:userId",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    runSql("UPDATE users SET status = 'rejected' WHERE id = ?", [
      req.params.userId,
    ]);
    res.json({ message: "Rejected" });
  },
);
app.delete(
  "/api/admin/user/:userId",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const user = queryOne("SELECT avatar_url FROM users WHERE id = ?", [
      req.params.userId,
    ]);
    if (user && user.avatar_url) deleteFile(user.avatar_url);

    runSql("DELETE FROM users WHERE id = ? AND role != 'admin'", [
      req.params.userId,
    ]);
    res.json({ message: "Deleted" });
  },
);
app.get("/api/admin/chats", authMiddleware, adminMiddleware, (req, res) => {
  const chats = queryAll(
    `SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count, (SELECT COUNT(*) FROM chat_members cm WHERE cm.chat_id = c.id) as member_count FROM chats c ORDER BY c.created_at DESC`,
  );
  res.json({ chats });
});
app.delete(
  "/api/admin/chat/:chatId",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const messagesWithFiles = queryAll(
      "SELECT file_url FROM messages WHERE chat_id = ? AND file_url IS NOT NULL",
      [req.params.chatId],
    );
    messagesWithFiles.forEach((m) => deleteFile(m.file_url));

    runSql(
      "DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE chat_id = ?)",
      [req.params.chatId],
    );
    runSql("DELETE FROM messages WHERE chat_id = ?", [req.params.chatId]);
    runSql("DELETE FROM chat_members WHERE chat_id = ?", [req.params.chatId]);
    runSql("DELETE FROM chats WHERE id = ?", [req.params.chatId]);
    io.emit("chat_deleted", { chatId: req.params.chatId });
    res.json({ message: "Deleted" });
  },
);

// ----------- CHAT ROUTES -----------
app.get("/api/users", authMiddleware, (req, res) => {
  const users = queryAll(
    "SELECT id, username, display_name, avatar_color, avatar_url, last_seen FROM users WHERE status = 'approved' ORDER BY display_name",
  );
  res.json({ users });
});

app.post("/api/chats", authMiddleware, (req, res) => {
  const { name, type, memberIds } = req.body;
  const chatId = uuidv4();
  const chatType =
    type || (memberIds && memberIds.length > 1 ? "group" : "private");

  if (chatType === "private" && memberIds && memberIds.length === 1) {
    const existing = queryOne(
      `SELECT c.id FROM chats c WHERE c.type = 'private' AND (SELECT COUNT(*) FROM chat_members cm WHERE cm.chat_id = c.id) = 2 AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = ?) AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = ?)`,
      [req.user.id, memberIds[0]],
    );
    if (existing) {
      const chat = queryOne("SELECT * FROM chats WHERE id = ?", [existing.id]);
      chat.members = queryAll(
        "SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.last_seen FROM chat_members cm JOIN users u ON cm.user_id = u.id WHERE cm.chat_id = ?",
        [existing.id],
      );
      return res.json({ chat, existing: true });
    }
  }

  runSql("INSERT INTO chats (id, name, type, created_by) VALUES (?, ?, ?, ?)", [
    chatId,
    name || null,
    chatType,
    req.user.id,
  ]);
  runSql("INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)", [
    chatId,
    req.user.id,
  ]);
  // Filter out creator's own ID to prevent UNIQUE constraint violation
  const otherMembers = (memberIds || []).filter((mid) => mid !== req.user.id);
  otherMembers.forEach((mid) =>
    runSql("INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)", [
      chatId,
      mid,
    ]),
  );

  const chat = queryOne("SELECT * FROM chats WHERE id = ?", [chatId]);
  chat.members = queryAll(
    "SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.last_seen FROM chat_members cm JOIN users u ON cm.user_id = u.id WHERE cm.chat_id = ?",
    [chatId],
  );

  const allMembers = [req.user.id, ...(memberIds || [])];
  allMembers.forEach((mid) => io.to(`user_${mid}`).emit("new_chat", chat));
  res.json({ chat });
});

app.get("/api/chats", authMiddleware, (req, res) => {
  const chats =
    req.user.role === "admin"
      ? queryAll(
          "SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count FROM chats c ORDER BY c.created_at DESC",
        )
      : queryAll(
          "SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count FROM chats c JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = ? ORDER BY c.created_at DESC",
          [req.user.id],
        );

  for (const chat of chats) {
    chat.members = queryAll(
      "SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.last_seen FROM chat_members cm JOIN users u ON cm.user_id = u.id WHERE cm.chat_id = ?",
      [chat.id],
    );
    chat.last_message = queryOne(
      "SELECT m.*, u.display_name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at DESC LIMIT 1",
      [chat.id],
    );
    const unread = queryOne(
      "SELECT COUNT(*) as count FROM messages m WHERE m.chat_id = ? AND m.sender_id != ? AND NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = ?)",
      [chat.id, req.user.id, req.user.id],
    );
    chat.unread_count = unread ? unread.count : 0;
  }
  chats.sort((a, b) => {
    const at = a.last_message?.created_at || a.created_at;
    const bt = b.last_message?.created_at || b.created_at;
    return bt > at ? 1 : -1;
  });
  res.json({ chats });
});

app.get("/api/chats/:chatId/messages", authMiddleware, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !queryOne("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?", [
      req.params.chatId,
      req.user.id,
    ])
  )
    return res.status(403).json({ error: "Access denied" });

  const messages = queryAll(
    "SELECT m.*, u.display_name as sender_name, u.avatar_color as sender_color, u.avatar_url as sender_url, u.username as sender_username FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at ASC",
    [req.params.chatId],
  );
  for (const msg of messages)
    msg.read_by = queryAll(
      "SELECT user_id, read_at FROM message_reads WHERE message_id = ?",
      [msg.id],
    );
  res.json({ messages });
});

app.post("/api/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({
    file_url: `/uploads/${req.file.filename}`,
    file_name: req.file.originalname,
    file_type: req.file.mimetype,
    file_size: req.file.size,
  });
});

app.delete("/api/messages/:messageId", authMiddleware, (req, res) => {
  const msg = queryOne("SELECT * FROM messages WHERE id = ?", [
    req.params.messageId,
  ]);
  if (!msg) return res.status(404).json({ error: "Not found" });
  if (msg.sender_id !== req.user.id && req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  if (msg.file_url) deleteFile(msg.file_url);

  runSql("DELETE FROM message_reads WHERE message_id = ?", [msg.id]);
  runSql("DELETE FROM messages WHERE id = ?", [msg.id]);
  io.to(`chat_${msg.chat_id}`).emit("message_deleted", {
    messageId: msg.id,
    chatId: msg.chat_id,
  });
  res.json({ message: "Deleted" });
});

// ----------- SOCKET.IO -----------
const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Auth error"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.id;
  socket.join(`user_${userId}`);
  onlineUsers.set(userId, socket.id);

  io.emit("user_online", { userId });
  socket.emit("online_users", Array.from(onlineUsers.keys()));

  runSql("UPDATE users SET last_seen = datetime('now') WHERE id = ?", [userId]);
  queryAll("SELECT chat_id FROM chat_members WHERE user_id = ?", [
    userId,
  ]).forEach((c) => socket.join(`chat_${c.chat_id}`));
  if (socket.user.role === "admin")
    queryAll("SELECT id FROM chats").forEach((c) =>
      socket.join(`chat_${c.id}`),
    );

  socket.on("join_chat", (chatId) => socket.join(`chat_${chatId}`));
  socket.on("send_message", (data) => {
    const { chatId, content, file_url, file_name, file_type, file_size } = data;
    const msgId = uuidv4();
    runSql(
      "INSERT INTO messages (id, chat_id, sender_id, content, file_url, file_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        msgId,
        chatId,
        userId,
        content || null,
        file_url || null,
        file_name || null,
        file_type || null,
        file_size || null,
      ],
    );

    const message = queryOne(
      "SELECT m.*, u.display_name as sender_name, u.avatar_color as sender_color, u.avatar_url as sender_url, u.username as sender_username FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?",
      [msgId],
    );
    if (message) {
      message.read_by = [];
      io.to(`chat_${chatId}`).emit("new_message", message);
    }
  });

  socket.on("typing", (d) =>
    socket.to(`chat_${d.chatId}`).emit("user_typing", {
      chatId: d.chatId,
      userId,
      display_name: socket.user.display_name,
    }),
  );
  socket.on("stop_typing", (d) =>
    socket
      .to(`chat_${d.chatId}`)
      .emit("user_stop_typing", { chatId: d.chatId, userId }),
  );

  socket.on("mark_read", ({ chatId, messageIds }) => {
    messageIds.forEach((mid) => {
      if (
        !queryOne(
          "SELECT 1 FROM message_reads WHERE message_id = ? AND user_id = ?",
          [mid, userId],
        )
      ) {
        runSql(
          "INSERT INTO message_reads (message_id, user_id) VALUES (?, ?)",
          [mid, userId],
        );
      }
    });
    // Ensure all senders are notified appropriately via chat room
    io.to(`chat_${chatId}`).emit("messages_read", {
      chatId,
      userId,
      messageIds,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    runSql("UPDATE users SET last_seen = datetime('now') WHERE id = ?", [
      userId,
    ]);
    io.emit("user_offline", { userId });
  });
});

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

async function start() {
  await initDatabase();
  server.listen(process.env.PORT || PORT, () =>
    console.log(`Server on port ${process.env.PORT || PORT}`),
  );
}
start().catch(console.error);
