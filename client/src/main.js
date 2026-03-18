import { io } from "socket.io-client";

const Icons = {
  chat: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  shield:
    '<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
  logout:
    '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
  search:
    '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  send: '<svg class="icon" viewBox="0 0 24 24" style="fill:currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>',
  mic: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
  video:
    '<svg class="icon" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" style="fill:currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
  pause:
    '<svg class="icon" viewBox="0 0 24 24" style="fill:currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
  clip: '<svg class="icon" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>',
  file: '<svg class="icon" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
  trash:
    '<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  check:
    '<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  chevronLeft:
    '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>',
  sun: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  moon: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  bookmark:
    '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
};

const state = {
  token: localStorage.getItem("avgchat_token"),
  user: JSON.parse(localStorage.getItem("avgchat_user") || "null"),
  theme: localStorage.getItem("avgchat_theme") || "dark",
  socket: null,
  chats: [],
  currentChatId: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: {},
  pendingFile: null,
  activePage: "chats",
  searchQuery: "",
};

let mediaRecorder = null;
let audioChunks = [];
let recordStream = null;

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const tb = document.getElementById("theme-toggle-btn");
  if (tb) tb.innerHTML = state.theme === "dark" ? Icons.sun : Icons.moon;
}

const api = async (url, options = {}) => {
  const headers = { ...options.headers };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (!(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    if (
      (res.status === 401 || res.status === 403) &&
      data.error !== "Неверные учетные данные"
    )
      logout(false);
    throw new Error(data.error || "Ошибка сервера");
  }
  return data;
};

function showToast(msg, type = "success") {
  let toaster = document.getElementById("toaster");
  if (!toaster) {
    toaster = document.createElement("div");
    toaster.id = "toaster";
    toaster.className = "toaster";
    document.body.appendChild(toaster);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div>${msg}</div>`;
  toaster.appendChild(el);
  setTimeout(() => {
    el.style.animation = "slideInRight 0.3s forwards reverse";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};
const formatTime = (iso) =>
  new Date(iso + "Z").toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });
const formatDate = (iso) => {
  const d = new Date(iso + "Z");
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Сегодня";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long" });
};

function autoHeight(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

window.handleAudio = (el, action) => {
  const container = el.closest(".audio-player");
  const audio = container.querySelector("audio");
  const btn = container.querySelector(".audio-play-btn");
  const slider = container.querySelector(".audio-slider");
  const timeCurrent = container.querySelector(".cur-time");
  const timeTotal = container.querySelector(".total-time");

  if (action === "toggle") {
    if (audio.paused) {
      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audio) a.pause();
      });
      audio.play();
    } else {
      audio.pause();
    }
  }

  audio.onplay = () => (btn.innerHTML = Icons.pause);
  audio.onpause = () => (btn.innerHTML = Icons.play);

  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 100;
    slider.value = p;
    const cur = Math.floor(audio.currentTime);
    timeCurrent.innerText = `${Math.floor(cur / 60)}:${(cur % 60).toString().padStart(2, "0")}`;
  };

  audio.onloadedmetadata = () => {
    const dur = Math.floor(audio.duration || 0);
    timeTotal.innerText = `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`;
  };

  audio.onended = () => {
    btn.innerHTML = Icons.play;
    slider.value = 0;
  };

  if (action === "seek") {
    audio.currentTime = (slider.value / 100) * audio.duration;
  }
};

window.openLightbox = (src, type) => {
  const lb = document.getElementById("lightbox");
  const cnt = document.getElementById("lightbox-content");
  lb.classList.add("active");
  if (type === "video")
    cnt.innerHTML = `<video src="${src}" controls autoplay style="max-width:100%; max-height:85vh; border-radius:12px;"></video>`;
  else
    cnt.innerHTML = `<img src="${src}" style="max-width:100%; max-height:85vh; border-radius:12px;" />`;
};
window.closeLightbox = () =>
  document.getElementById("lightbox").classList.remove("active");

function logout(manual = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem("avgchat_token");
  localStorage.removeItem("avgchat_user");
  if (state.socket) state.socket.disconnect();
  location.reload();
}

const getAvatarStyle = (u) =>
  u.avatar_url
    ? `background-image: url('${u.avatar_url}'); border:none; color:transparent;`
    : `background: ${u.avatar_color || "#8b5cf6"};`;

const getChatName = (c) => {
  if (c.name) return c.name;
  if (c.type === "private" && c.members) {
    const o = c.members.find((m) => m.id !== state.user.id);
    return o ? o.display_name : "Избранное";
  }
  return c.members?.map((m) => m.display_name).join(", ") || "Группа";
};

const getChatAvatar = (c) => {
  if (c.type === "private" && c.members) {
    const o = c.members.find((m) => m.id !== state.user.id);
    if (!o)
      return {
        l: Icons.bookmark,
        s: "background: linear-gradient(135deg, #a78bfa, #8b5cf6)",
        o: false,
        isIcon: true,
      };
    return {
      l: o.display_name[0].toUpperCase(),
      s: getAvatarStyle(o),
      o: state.onlineUsers.has(o.id),
    };
  }
  return {
    l: (c.name || "Г")[0].toUpperCase(),
    s: "background: #8b5cf6",
    o: false,
  };
};

// ===== SOCKET =====
function initSocket() {
  if (state.socket) state.socket.disconnect();
  state.socket = io("/", { auth: { token: state.token } });
  state.socket.on("online_users", (u) => {
    state.onlineUsers = new Set(u);
    renderReactively();
  });
  state.socket.on("user_online", ({ userId }) => {
    state.onlineUsers.add(userId);
    renderReactively();
  });
  state.socket.on("user_offline", ({ userId }) => {
    state.onlineUsers.delete(userId);
    renderReactively();
  });
  state.socket.on("new_chat", () => {
    loadChats();
    showToast("Новый чат создан");
  });
  state.socket.on("chat_updated", () => loadChats());
  state.socket.on("chat_deleted", ({ chatId }) => {
    if (state.currentChatId === chatId) {
      state.currentChatId = null;
      renderMainWorkspace();
    }
    loadChats();
  });
  state.socket.on("user_updated", (u) => {
    if (state.user.id === u.id) {
      if (u.avatar_url) state.user.avatar_url = u.avatar_url;
      if (u.display_name) state.user.display_name = u.display_name;
      localStorage.setItem("avgchat_user", JSON.stringify(state.user));
    }
    loadChats();
    if (state.activePage === "profile") renderProfilePage();
  });
  state.socket.on("new_message", (msg) => {
    if (state.currentChatId === msg.chat_id) {
      state.messages.push(msg);
      renderMessagesArea();
      if (msg.sender_id !== state.user.id)
        state.socket.emit("mark_read", {
          chatId: msg.chat_id,
          messageIds: [msg.id],
        });
    }
    loadChats();
  });
  state.socket.on("message_deleted", ({ messageId, chatId }) => {
    if (state.currentChatId === chatId) {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.classList.add("msg-deleting");
        setTimeout(() => {
          state.messages = state.messages.filter((m) => m.id !== messageId);
          renderMessagesArea(false);
        }, 300);
      } else state.messages = state.messages.filter((m) => m.id !== messageId);
    }
    loadChats();
  });
  state.socket.on("messages_read", ({ chatId, userId, messageIds }) => {
    if (state.currentChatId === chatId) {
      state.messages.forEach((m) => {
        if (messageIds.includes(m.id)) {
          if (!m.read_by) m.read_by = [];
          if (!m.read_by.find((r) => r.user_id === userId))
            m.read_by.push({ user_id: userId });
        }
      });
      renderMessagesArea(false);
    }
    if (userId === state.user.id) loadChats();
  });
  state.socket.on("user_typing", ({ chatId, userId, display_name }) => {
    if (!state.typingUsers[chatId]) state.typingUsers[chatId] = {};
    state.typingUsers[chatId][userId] = display_name;
    renderTypingIndicator();
  });
  state.socket.on("user_stop_typing", ({ chatId, userId }) => {
    if (state.typingUsers[chatId]) delete state.typingUsers[chatId][userId];
    renderTypingIndicator();
  });
}

async function loadChats() {
  try {
    const d = await api("/api/chats");
    state.chats = d.chats;
    renderChatList();
  } catch (e) {
    console.error(e);
  }
}
async function loadMessages(chatId) {
  try {
    const d = await api(`/api/chats/${chatId}/messages`);
    state.messages = d.messages;
    renderMessagesArea();
    const unread = state.messages
      .filter(
        (m) =>
          m.sender_id !== state.user.id &&
          (!m.read_by || !m.read_by.find((r) => r.user_id === state.user.id)),
      )
      .map((m) => m.id);
    if (unread.length > 0) {
      state.socket.emit("mark_read", { chatId, messageIds: unread });
      const c = state.chats.find((x) => x.id === chatId);
      if (c && c.unread_count > 0) {
        c.unread_count = 0;
        renderChatList();
      }
    }
  } catch (e) {
    showToast(e.message, "error");
  }
}

function mount() {
  const app = document.getElementById("app");
  applyTheme();
  if (!state.token || !state.user) {
    app.innerHTML = `<div class="auth-page" id="auth-view">${renderLoginForm()}</div>`;
    bindAuthEvents();
  } else {
    app.innerHTML = renderAppLayout();
    initSocket();
    bindAppEvents();
    loadChats();
    if (!document.getElementById("lightbox")) {
      const lb = document.createElement("div");
      lb.id = "lightbox";
      lb.className = "lightbox";
      lb.innerHTML = `<div class="lightbox-content" id="lightbox-content"></div><button class="btn-icon lightbox-close" onclick="window.closeLightbox()">${Icons.x}</button>`;
      document.body.appendChild(lb);
      lb.onclick = (e) => {
        if (e.target === lb) window.closeLightbox();
      };
    }
  }
}

function renderLoginForm() {
  return `
    <div class="auth-card">
      <div class="auth-header"><img src="/logo.png" style="width:72px; margin-bottom:16px;" /><h1 class="auth-title">AvgChat</h1><p class="auth-subtitle">С возвращением!</p></div>
      <div id="auth-alert"></div>
      <form id="auth-form">
        <div class="form-group"><label class="form-label">Имя пользователя</label><input type="text" id="log-user" class="form-input" placeholder="Введите логин" /></div>
        <div class="form-group"><label class="form-label">Пароль</label><input type="password" id="log-pass" class="form-input" placeholder="••••••••" /></div>
        <button type="submit" class="btn btn-primary">Войти</button>
      </form>
      <div class="auth-footer">Нет аккаунта? <a id="switch-reg" style="cursor:pointer">Создать аккаунт</a></div>
    </div>
  `;
}
function renderRegForm() {
  return `
    <div class="auth-card">
      <div class="auth-header"><img src="/logo.png" style="width:72px; margin-bottom:16px;" /><h1 class="auth-title">AvgChat</h1><p class="auth-subtitle">Присоединяйтесь к нам</p></div>
      <div id="auth-alert"></div>
      <form id="reg-form">
        <div class="form-group"><label class="form-label">Отображаемое имя</label><input type="text" id="reg-name" class="form-input" placeholder="Как вас называть?" /></div>
        <div class="form-group"><label class="form-label">Логин</label><input type="text" id="reg-user" class="form-input" placeholder="Выберите уникальный логин" /></div>
        <div class="form-group"><label class="form-label">Пароль</label><input type="password" id="reg-pass" class="form-input" placeholder="Придумайте пароль" /></div>
        <button type="submit" class="btn btn-brand">Зарегистрироваться</button>
      </form>
      <div class="auth-footer">Уже есть аккаунт? <a id="switch-log" style="cursor:pointer">Войти</a></div>
    </div>
  `;
}

function renderAppLayout() {
  const av = state.user.avatar_url
    ? `background-image: url('${state.user.avatar_url}'); border: none; color: transparent;`
    : `background: ${state.user.avatar_color}`;
  return `
    <div class="app-layout">
      <div class="nav-rail">
        <button class="nav-item ${state.activePage === "chats" ? "active" : ""}" id="nav-chats" title="Чаты">${Icons.chat}</button>
        ${state.user.role === "admin" ? `<button class="nav-item ${state.activePage === "admin" ? "active" : ""}" id="nav-admin" title="Админка">${Icons.shield}<div id="admin-badge" class="nav-badge" style="display:none">0</div></button>` : ""}
        <div class="nav-spacer"></div>
        <button class="nav-item" id="theme-toggle-btn" title="Тема" style="color:var(--text-muted); padding-top:8px">${state.theme === "dark" ? Icons.sun : Icons.moon}</button>
        <button class="nav-item avatar-btn ${state.activePage === "profile" ? "active" : ""}" id="nav-profile" title="Профиль" style="padding:0; border-radius:16px; overflow:hidden;"><div class="avatar" style="${av}; border-radius:16px;">${state.user.display_name[0].toUpperCase()}<div class="avatar-online"></div></div></button>
      </div>
      <div class="list-pane" id="list-pane" style="display: ${state.activePage === "chats" ? "flex" : "none"}">
        <div class="list-header"><h2 class="list-title">Чаты</h2><button class="btn-icon" id="btn-new-chat" title="Новый чат">${Icons.plus}</button></div>
        <div class="search-container"><div class="search-box">${Icons.search}<input type="text" class="search-input" id="search-input" placeholder="Поиск чатов..." /></div></div>
        <div class="item-list" id="chat-list"></div>
      </div>
      <div class="workspace" id="workspace"></div>
      <div id="rec-overlay-root"></div>
    </div>
  `;
}

function bindAuthEvents() {
  const av = document.getElementById("auth-view");
  if (!av) return;
  const bindLog = () => {
    document
      .getElementById("auth-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const d = await api("/api/login", {
            method: "POST",
            body: JSON.stringify({
              username: document.getElementById("log-user").value,
              password: document.getElementById("log-pass").value,
            }),
          });
          state.token = d.token;
          state.user = d.user;
          localStorage.setItem("avgchat_token", d.token);
          localStorage.setItem("avgchat_user", JSON.stringify(d.user));
          mount();
        } catch (err) {
          document.getElementById("auth-alert").innerHTML =
            `<div class="alert alert-error">${err.message}</div>`;
        }
      });
    document.getElementById("switch-reg")?.addEventListener("click", () => {
      av.innerHTML = renderRegForm();
      bindReg();
    });
  };
  const bindReg = () => {
    document
      .getElementById("reg-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const d = await api("/api/register", {
            method: "POST",
            body: JSON.stringify({
              display_name: document.getElementById("reg-name").value,
              username: document.getElementById("reg-user").value,
              password: document.getElementById("reg-pass").value,
            }),
          });
          document.getElementById("auth-alert").innerHTML =
            `<div class="alert alert-success">${d.message}</div>`;
          document.getElementById("reg-form").reset();
        } catch (err) {
          document.getElementById("auth-alert").innerHTML =
            `<div class="alert alert-error">${err.message}</div>`;
        }
      });
    document.getElementById("switch-log")?.addEventListener("click", () => {
      av.innerHTML = renderLoginForm();
      bindLog();
    });
  };
  bindLog();
}

function bindAppEvents() {
  const setActive = (id) => {
    document
      .querySelectorAll(".nav-item")
      .forEach((b) => b.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  };
  document.getElementById("nav-chats")?.addEventListener("click", () => {
    state.activePage = "chats";
    setActive("nav-chats");
    document.getElementById("list-pane").style.display = "flex";
    renderMainWorkspace();
  });
  document.getElementById("nav-admin")?.addEventListener("click", async () => {
    state.activePage = "admin";
    state.currentChatId = null;
    setActive("nav-admin");
    document.getElementById("list-pane").style.display = "none";
    renderMainWorkspace();
    try {
      const [pen, all, c] = await Promise.all([
        api("/api/admin/pending-users"),
        api("/api/admin/all-users"),
        api("/api/admin/chats"),
      ]);
      if (state.activePage === "admin")
        renderAdminPage(pen.users, all.users, c.chats);
    } catch (e) {}
  });
  document.getElementById("nav-profile")?.addEventListener("click", () => {
    state.activePage = "profile";
    state.currentChatId = null;
    setActive("nav-profile");
    document.getElementById("list-pane").style.display = "none";
    renderMainWorkspace();
  });
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("avgchat_theme", state.theme);
    applyTheme();
  });
  document.getElementById("search-input")?.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderChatList();
  });
  document
    .getElementById("btn-new-chat")
    ?.addEventListener("click", showCreateChatModal);
  renderMainWorkspace();
}

function renderReactively() {
  if (state.activePage === "chats") {
    renderChatList();
    renderTypingIndicator();
  }
}

function renderChatList() {
  const container = document.getElementById("chat-list");
  if (!container) return;
  const filtered = state.chats.filter((c) =>
    getChatName(c).toLowerCase().includes(state.searchQuery),
  );
  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted)">Чаты не найдены</div>`;
    return;
  }
  container.innerHTML = filtered
    .map((c) => {
      const isAct = c.id === state.currentChatId;
      const av = getChatAvatar(c);
      const last = c.last_message;
      const ty = state.typingUsers[c.id];
      const typingArr = ty ? Object.values(ty).filter(Boolean) : [];
      let mc = "";
      if (typingArr.length > 0)
        mc = `<span class="typing">${escapeHtml(typingArr[0])} печатает...</span>`;
      else if (last) {
        const isMe = last.sender_id === state.user.id;
        let t = last.content || "";
        if (!t) {
          if (last.file_type?.startsWith("audio/"))
            t = "🎤 Голосовое сообщение";
          else if (last.file_type?.startsWith("video/"))
            t = "🎬 Видеосообщение";
          else if (last.file_url) t = "📎 Вложение";
        }
        mc = isMe
          ? `<span class="sender">Вы: </span>${escapeHtml(t)}`
          : `<span class="sender">${escapeHtml(last.sender_name)}: </span>${escapeHtml(t)}`;
      } else mc = "Нет сообщений";
      return `<div class="chat-item ${isAct ? "active" : ""}" data-id="${c.id}"><div class="avatar" style="${av.s}; width:48px; height:48px; border-radius:18px;">${av.isIcon ? av.l : av.l}${av.o ? '<div class="avatar-online"></div>' : ""}</div><div class="chat-item-content"><div class="chat-item-top"><span class="chat-item-name">${escapeHtml(getChatName(c))}</span>${last ? `<span class="chat-item-time">${formatTime(last.created_at)}</span>` : ""}</div><div class="chat-item-bottom"><div class="chat-item-msg">${mc}</div>${c.unread_count > 0 ? `<div class="unread-badge">${c.unread_count}</div>` : ""}</div></div></div>`;
    })
    .join("");
  container.querySelectorAll(".chat-item").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      if (state.currentChatId !== id) {
        state.socket.emit("join_chat", id);
        state.currentChatId = id;
        state.messages = [];
        if (window.innerWidth <= 900)
          document.getElementById("list-pane").classList.add("hidden-mobile");
        renderChatList();
        renderMainWorkspace();
        loadMessages(id);
      }
    });
  });
}

function renderMainWorkspace() {
  const ws = document.getElementById("workspace");
  if (!ws) return;
  if (state.activePage === "admin") {
    ws.innerHTML = `<div class="full-page-ws" id="admin-container"><div style="text-align:center; padding:100px; color:var(--text-muted)">Загрузка админ-панели...</div></div>`;
    return;
  }
  if (state.activePage === "profile") {
    renderProfilePage();
    return;
  }
  if (!state.currentChatId) {
    ws.innerHTML = `<div class="empty-workspace"><div class="icon-wrapper">${Icons.chat}</div><h3>Выберите чат</h3><p>Выберите диалог или создайте новый для начала общения.</p></div>`;
    return;
  }
  const c = state.chats.find((ch) => ch.id === state.currentChatId);
  if (!c) return;
  const av = getChatAvatar(c);
  ws.innerHTML = `<div class="chat-header"><div class="chat-header-info"><button class="btn-icon" id="mobile-back" style="display: ${window.innerWidth <= 900 ? "flex" : "none"}; margin-left:-10px; margin-right:8px;">${Icons.chevronLeft}</button><div class="avatar" style="${av.s}; border-radius:14px;">${av.isIcon ? av.l : av.l}${av.o ? '<div class="avatar-online"></div>' : ""}</div><div class="chat-header-text"><h3>${escapeHtml(getChatName(c))}</h3><div class="chat-header-status" id="chat-status"></div></div></div><div class="chat-header-actions">${state.user.role === "admin" ? `<button class="btn-icon" id="del-chat-btn" title="Удалить чат" style="color:var(--danger)">${Icons.trash}</button>` : ""}</div></div><div class="messages-scroll" id="msg-scroll"></div><div class="input-area"><div id="file-preview-area"></div><div class="input-container"><label class="clip-btn" for="file-in" title="Файл" style="margin-bottom:2px">${Icons.clip}</label><input type="file" id="file-in" style="display:none" /><textarea class="chat-textfield" id="chat-input" rows="1" placeholder="Cообщение..."></textarea><button class="clip-btn" id="mic-btn" title="Голосовое" style="margin-bottom:2px; color:var(--text-secondary)">${Icons.mic}</button><button class="clip-btn" id="video-btn" title="Видео-кружок" style="margin-bottom:2px; color:var(--text-secondary)">${Icons.video}</button><button class="send-btn" id="send-btn" style="display:none; margin-bottom:2px">${Icons.send}</button></div></div>`;
  document.getElementById("mobile-back")?.addEventListener("click", () => {
    state.currentChatId = null;
    document.getElementById("list-pane").classList.remove("hidden-mobile");
    renderMainWorkspace();
    renderChatList();
  });
  document
    .getElementById("del-chat-btn")
    ?.addEventListener("click", async () => {
      if (confirm("Полностью удалить чат?")) {
        try {
          await api(`/api/admin/chat/${state.currentChatId}`, {
            method: "DELETE",
          });
          state.currentChatId = null;
          renderMainWorkspace();
          loadChats();
        } catch (e) {
          showToast(e.message, "error");
        }
      }
    });
  renderMessagesArea();
  renderTypingIndicator();
  const inp = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const micBtn = document.getElementById("mic-btn");
  const vidBtn = document.getElementById("video-btn");
  let tOut;
  const toggleSendIcons = () => {
    if (inp.value.trim() || state.pendingFile) {
      sendBtn.style.display = "flex";
      micBtn.style.display = "none";
      vidBtn.style.display = "none";
    } else {
      sendBtn.style.display = "none";
      micBtn.style.display = "flex";
      vidBtn.style.display = "flex";
    }
  };
  inp.addEventListener("input", () => {
    autoHeight(inp);
    toggleSendIcons();
    state.socket.emit("typing", { chatId: state.currentChatId });
    clearTimeout(tOut);
    tOut = setTimeout(
      () => state.socket.emit("stop_typing", { chatId: state.currentChatId }),
      2000,
    );
  });
  const send = async () => {
    const txt = inp.value.trim();
    if (!txt && !state.pendingFile) return;
    let fData = {};
    if (state.pendingFile) {
      if (state.pendingFile.size > 30 * 1024 * 1024)
        return showToast("Файл слишком велик (Макс 30МБ)", "error");
      try {
        const fd = new FormData();
        fd.append("file", state.pendingFile);
        const res = await api("/api/upload", { method: "POST", body: fd });
        fData = res;
        state.pendingFile = null;
        document.getElementById("file-preview-area").innerHTML = "";
      } catch (e) {
        return showToast("Ошибка загрузки", "error");
      }
    }
    state.socket.emit("send_message", {
      chatId: state.currentChatId,
      content: txt || null,
      ...fData,
    });
    inp.value = "";
    inp.style.height = "auto";
    toggleSendIcons();
    state.socket.emit("stop_typing", { chatId: state.currentChatId });
  };
  sendBtn.addEventListener("click", send);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  document.getElementById("file-in").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) {
      state.pendingFile = f;
      toggleSendIcons();
      document.getElementById("file-preview-area").innerHTML =
        `<div style="position:absolute; top:-60px; left:32px; background:var(--bg-panel); border:1px solid var(--border); padding:8px 16px; border-radius:12px; display:flex; gap:12px; z-index:5;">${Icons.file} <div style="flex:1; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</div><div id="file-close" style="color:var(--danger); cursor:pointer">${Icons.x}</div></div>`;
      document.getElementById("file-close").onclick = () => {
        state.pendingFile = null;
        document.getElementById("file-preview-area").innerHTML = "";
        document.getElementById("file-in").value = "";
        toggleSendIcons();
      };
    }
  });

  const startRec = async (type) => {
    try {
      const isV = type === "video";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isV ? { width: 640, height: 640, facingMode: "user" } : false,
      });
      recordStream = stream;
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: isV ? "video/webm;codecs=vp8,opus" : "audio/webm",
      });
      audioChunks = [];
      let shape = "circle";
      let seconds = 0;
      const MAX_SEC = 60;

      const overlay = document.getElementById("rec-overlay-root");
      overlay.innerHTML = `
        <div class="rec-overlay" style="${!isV ? "background:rgba(0,0,0,0.7);" : ""}">
          <div class="rec-container">
            ${
              isV
                ? `<svg class="rec-progress-svg">
              <circle class="rec-progress-bg" cx="150" cy="150" r="140"></circle>
              <circle id="rec-progress-fill" class="rec-progress-fill" cx="150" cy="150" r="140"></circle>
            </svg>`
                : ""
            }
            <div id="rec-preview-wrap" class="rec-media-preview ${isV ? "circle" : "audio-mode"}" style="${isV ? "" : "background:transparent; box-shadow:none;"}">
              ${
                isV
                  ? '<video id="live-p" autoplay muted></video>'
                  : `
                <div class="rec-audio-wave">
                  ${Array(12).fill('<div class="wave-bar"></div>').join("")}
                </div>
              `
              }
            </div>
            ${
              isV
                ? `
              <div class="rec-shape-selector">
                <button class="shape-btn active" data-shape="circle" title="Круг" style="border-radius:50%"></button>
                <button class="shape-btn" data-shape="square" title="Квадрат" style="border-radius:4px"></button>
              </div>
            `
                : ""
            }
          </div>
          <div class="rec-controls">
            <div class="rec-timer" id="rec-timer">0:00</div>
            <button class="rec-stop-btn" id="rec-stop-btn" title="Отправить">${Icons.send}</button>
          </div>
        </div>
      `;

      if (isV) document.getElementById("live-p").srcObject = stream;

      const timerEl = document.getElementById("rec-timer");
      const progressEl = document.getElementById("rec-progress-fill");
      const stopBtn = document.getElementById("rec-stop-btn");

      const interval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerEl.innerText = `${m}:${s.toString().padStart(2, "0")}`;

        const offset = 879 - 879 * (seconds / MAX_SEC);
        progressEl.style.strokeDashoffset = offset;

        if (seconds >= MAX_SEC) stopBtn.click();
      }, 1000);

      overlay.querySelectorAll(".shape-btn").forEach((btn) => {
        btn.onclick = () => {
          overlay
            .querySelectorAll(".shape-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          shape = btn.dataset.shape;
          document.getElementById("rec-preview-wrap").className =
            `rec-media-preview ${shape}`;
        };
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        clearInterval(interval);
        const b = new Blob(audioChunks, {
          type: isV ? "video/webm" : "audio/webm",
        });
        const fd = new FormData();
        fd.append("file", b, isV ? "circle.webm" : "voice.webm");
        try {
          const res = await api("/api/upload", { method: "POST", body: fd });
          state.socket.emit("send_message", {
            chatId: state.currentChatId,
            content: null,
            ...res,
            is_circle: shape === "circle",
          });
        } catch (e) {
          showToast("Ошибка при отправке", "error");
        }
      };

      stopBtn.onclick = () => {
        mediaRecorder.stop();
        stream.getTracks().forEach((t) => t.stop());
        overlay.innerHTML = "";
      };

      mediaRecorder.start();
    } catch (e) {
      showToast("Доступ к медиа невозможен", "error");
    }
  };

  micBtn.onclick = () => startRec("audio");
  vidBtn.onclick = () => startRec("video");
}

function renderTypingIndicator() {
  const st = document.getElementById("chat-status");
  if (!st || !state.currentChatId) return;
  const c = state.chats.find((ch) => ch.id === state.currentChatId);
  if (!c) return;
  const ty = state.typingUsers[state.currentChatId];
  const typingArr = ty ? Object.values(ty).filter(Boolean) : [];
  if (typingArr.length > 0) {
    st.textContent = typingArr.join(", ") + " печатает...";
    st.className = "chat-header-status typing";
    return;
  }
  if (c.type === "private" && c.members) {
    const o = c.members.find((m) => m.id !== state.user.id);
    if (!o) {
      st.textContent = "Личное хранилище";
      st.className = "chat-header-status";
      return;
    }
    const iso = state.onlineUsers.has(o.id);
    st.textContent = iso ? "В сети" : "Не в сети";
    st.className = `chat-header-status ${iso ? "online" : ""}`;
  } else {
    st.textContent = `${c.member_count || c.members?.length || 0} участников`;
    st.className = "chat-header-status";
  }
}

function renderMessagesArea(scroll = true) {
  const container = document.getElementById("msg-scroll");
  if (!container || !state.currentChatId) return;
  if (state.messages.length === 0) {
    container.innerHTML = `<div style="margin:auto; text-align:center; color:var(--text-muted)">Напишите что-нибудь, чтобы начать общение!</div>`;
    return;
  }
  const c = state.chats.find((ch) => ch.id === state.currentChatId);
  const oMembers = c?.members?.filter((m) => m.id !== state.user.id) || [];
  let html = "";
  let lastDate = "";
  state.messages.forEach((m) => {
    const date = formatDate(m.created_at);
    if (date !== lastDate) {
      html += `<div class="date-divider"><span>${date}</span></div>`;
      lastDate = date;
    }
    const isOwn = m.sender_id === state.user.id;
    const canDel = isOwn || state.user.role === "admin";
    const read =
      isOwn &&
      m.read_by &&
      oMembers.length > 0 &&
      m.read_by.some((r) => r.user_id !== state.user.id);
    let attachmentHtml = "";
    if (m.file_url) {
      if (m.file_type?.startsWith("image/"))
        attachmentHtml = `<img src="${m.file_url}" class="msg-image" onclick="window.openLightbox('${m.file_url}', 'image')" />`;
      else if (m.file_type?.startsWith("video/"))
        attachmentHtml = `<div class="video-circle-container" onclick="window.openLightbox('${m.file_url}', 'video')"><video src="${m.file_url}" class="video-circle" loop muted autoplay></video></div>`;
      else if (m.file_type?.startsWith("audio/"))
        attachmentHtml = `
          <div class="audio-player">
            <audio src="${m.file_url}" style="display:none"></audio>
            <button class="audio-play-btn" onclick="window.handleAudio(this, 'toggle')">${Icons.play}</button>
            <div class="audio-slider-container">
              <input type="range" class="audio-slider" value="0" step="0.1" oninput="window.handleAudio(this, 'seek')" />
              <div class="audio-time-row">
                <span class="cur-time">0:00</span>
                <span class="total-time">0:00</span>
              </div>
            </div>
          </div>`;
      else
        attachmentHtml = `<a href="${m.file_url}" target="_blank" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(0,0,0,0.2); border-radius:12px; margin-top:6px; color:inherit; text-decoration:none;"><div style="width:36px; height:36px; background:rgba(255,255,255,0.1); border-radius:8px; display:flex; align-items:center; justify-content:center;">${Icons.file}</div><div><div style="font-weight:600; font-size:14px;">${escapeHtml(m.file_name || "Файл")}</div><div style="font-size:12px; opacity:0.7;">${m.file_size ? Math.round(m.file_size / 1024) + " KB" : ""}</div></div></a>`;
    }
    const avSt = m.sender_url
      ? `background-image: url('${m.sender_url}'); border:none; color:transparent;`
      : `background:${m.sender_color || "#8b5cf6"};`;
    html += `<div class="msg-wrapper ${isOwn ? "own" : "other"}" id="msg-${m.id}"><div class="avatar msg-avatar" style="${avSt} width:32px; height:32px; font-size:12px">${m.sender_name[0].toUpperCase()}</div><div class="msg-bubble">${canDel ? `<div class="msg-actions"><div class="msg-del-btn" data-del="${m.id}">${Icons.trash}</div></div>` : ""}<div class="msg-sender">${escapeHtml(m.sender_name)}</div>${attachmentHtml}${m.content ? `<div class="msg-text">${escapeHtml(m.content)}</div>` : ""}<div class="msg-meta">${formatTime(m.created_at)}${isOwn ? `<div class="read-ticks ${read ? "read" : ""}">${Icons.check}${read ? `<div class="read-tick-extra">${Icons.check}</div>` : ""}</div>` : ""}</div></div></div>`;
  });
  const isBN =
    container.scrollHeight - container.scrollTop - container.clientHeight < 150;
  container.innerHTML = html;
  container.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/messages/${btn.dataset.del}`, { method: "DELETE" });
      } catch (e) {
        showToast(e.message, "error");
      }
    }),
  );
  if (scroll || isBN) container.scrollTop = container.scrollHeight;
}

async function showCreateChatModal() {
  try {
    const res = await api("/api/users");
    const allUsers = res.users;
    let selected = [];
    let isGroup = false;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Filter: for private chats, hide self
    const getVisibleUsers = () =>
      isGroup ? allUsers : allUsers.filter((u) => u.id !== state.user.id);

    const r = () => {
      const visibleUsers = getVisibleUsers();
      overlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>Новый чат</h2><button class="btn-icon" id="mc-close">${Icons.x}</button></div><div class="modal-body">
        <div style="display:flex; gap:12px; margin-bottom:20px;">
          <button class="btn ${!isGroup ? "btn-brand" : "btn-primary"}" id="v-priv" style="flex:1">Личный</button>
          <button class="btn ${isGroup ? "btn-brand" : "btn-primary"}" id="v-grp" style="flex:1">Групповой</button>
        </div>
        ${!isGroup ? `<button class="btn btn-primary" id="mc-fav" style="width:100%; margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:8px;">${Icons.bookmark} Избранное (чат с собой)</button>` : ""}
        ${isGroup ? '<div class="form-group"><label class="form-label">Название группы</label><input type="text" id="grp-name" class="form-input" placeholder="Введите название" /></div>' : ""}
        <label class="form-label">Выберите пользовател${isGroup ? "ей" : "я"} (${selected.length})</label>
        <div class="user-selector">${visibleUsers.map((u) => `<div class="user-select-item ${selected.includes(u.id) ? "selected" : ""}" data-uid="${u.id}"><div class="avatar" style="${getAvatarStyle(u)} width:32px; height:32px; margin-right:12px; font-size:12px">${u.display_name[0].toUpperCase()}</div><div style="flex:1"><div style="font-size:14px; font-weight:600">${escapeHtml(u.display_name)}</div><div style="font-size:12px; color:var(--text-secondary)">@${escapeHtml(u.username)}</div></div>${selected.includes(u.id) ? `<div style="color:var(--accent)">${Icons.check}</div>` : ""}</div>`).join("")}</div>
        <button class="btn btn-brand" id="mc-create" style="width:100%; margin-top:24px;">${isGroup ? "Создать группу" : "Начать чат"}</button>
      </div></div>`;

      overlay.querySelector("#mc-close").onclick = () => overlay.remove();
      overlay.querySelector("#v-priv")?.addEventListener("click", () => {
        isGroup = false;
        selected = [];
        r();
      });
      overlay.querySelector("#v-grp")?.addEventListener("click", () => {
        isGroup = true;
        selected = [];
        r();
      });

      // Favorites button
      overlay.querySelector("#mc-fav")?.addEventListener("click", () => {
        // Check if favorites already exists (private chat where both members are self)
        const existing = state.chats.find(
          (c) =>
            c.type === "private" &&
            c.members &&
            c.members.length <= 2 &&
            c.members.every((m) => m.id === state.user.id),
        );
        if (existing) {
          overlay.remove();
          state.currentChatId = existing.id;
          state.socket.emit("join_chat", existing.id);
          renderMainWorkspace();
          loadMessages(existing.id);
          return;
        }
        submit("private", [state.user.id], null);
      });

      overlay.querySelectorAll(".user-select-item").forEach((el) => {
        el.onclick = () => {
          const id = el.dataset.uid;
          if (!isGroup) {
            selected = selected.includes(id) ? [] : [id];
          } else {
            if (selected.includes(id))
              selected = selected.filter((i) => i !== id);
            else selected.push(id);
          }
          r();
        };
      });

      overlay.querySelector("#mc-create").onclick = () => {
        if (selected.length === 0)
          return showToast("Выберите хотя бы одного участника", "error");
        if (isGroup && !overlay.querySelector("#grp-name")?.value.trim())
          return showToast("Введите название группы", "error");

        // Dedupe: check if private chat already exists
        if (!isGroup && selected.length === 1) {
          const targetId = selected[0];
          const existing = state.chats.find(
            (c) =>
              c.type === "private" &&
              c.members &&
              c.members.some((m) => m.id === targetId) &&
              c.members.some((m) => m.id === state.user.id),
          );
          if (existing) {
            overlay.remove();
            state.currentChatId = existing.id;
            state.socket.emit("join_chat", existing.id);
            renderMainWorkspace();
            loadMessages(existing.id);
            return;
          }
        }
        submit(
          isGroup ? "group" : "private",
          selected,
          overlay.querySelector("#grp-name")?.value.trim(),
        );
      };
    };
    const submit = async (t, s, n) => {
      try {
        const d = await api("/api/chats", {
          method: "POST",
          body: JSON.stringify({ type: t, memberIds: s, name: n }),
        });
        overlay.remove();
        await loadChats();
        state.currentChatId = d.chat.id;
        state.socket.emit("join_chat", d.chat.id);
        renderMainWorkspace();
        loadMessages(d.chat.id);
      } catch (e) {
        showToast(e.message, "error");
      }
    };
    r();
    document.body.appendChild(overlay);
  } catch (e) {
    showToast("Не удалось загрузить список пользователей", "error");
  }
}

function renderProfilePage() {
  const ws = document.getElementById("workspace");
  if (!ws) return;
  const avBg = state.user.avatar_url
    ? `background-image: url('${state.user.avatar_url}');`
    : `background: ${state.user.avatar_color}`;
  ws.innerHTML = `<div class="full-page-ws"><div class="page-header"><h2 class="page-title">Настройки профиля</h2><button class="btn btn-danger" id="prof-logout">${Icons.logout} Выйти из аккаунта</button></div><div class="profile-card"><div class="profile-avatar-sec"><label class="avatar-upload" for="avatar-input" style="${avBg}">${state.user.avatar_url ? "" : state.user.display_name[0].toUpperCase()}</label><input type="file" id="avatar-input" accept="image/*" style="display:none" /><div><h3 style="font-size:20px; color:var(--text-pure)">${escapeHtml(state.user.display_name)}</h3><p style="color:var(--text-secondary)">@${escapeHtml(state.user.username)}</p></div></div><form id="prof-form"><div class="form-group"><label class="form-label">Отображаемое имя</label><input type="text" id="prof-name" class="form-input" value="${escapeHtml(state.user.display_name)}" /></div><div style="height:1px; background:var(--border-light); margin:24px 0;"></div><p style="margin-bottom:16px; font-weight:600; color:var(--text-pure)">Смена пароля</p><div class="form-group"><label class="form-label">Текущий пароль</label><input type="password" id="prof-oldpass" class="form-input" placeholder="Для смены пароля" /></div><div class="form-group"><label class="form-label">Новый пароль</label><input type="password" id="prof-newpass" class="form-input" placeholder="Оставьте пустым, если не хотите менять" /></div><button type="submit" class="btn btn-brand" style="margin-top:12px;">Сохранить изменения</button></form></div></div>`;
  document.getElementById("prof-logout").onclick = () => logout();
  document.getElementById("avatar-input").onchange = async (e) => {
    const f = e.target.files[0];
    if (f) {
      if (f.size > 5 * 1024 * 1024)
        return showToast("Макс. размер 5МБ", "error");
      const fd = new FormData();
      fd.append("file", f);
      try {
        await api("/api/me/avatar", { method: "POST", body: fd });
        showToast("Аватар обновлен");
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  };
  document.getElementById("prof-form").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("prof-name").value.trim();
    const oldp = document.getElementById("prof-oldpass").value;
    const newp = document.getElementById("prof-newpass").value;
    if (!name) return showToast("Имя обязательно", "error");
    const body = { display_name: name };
    if (newp) {
      body.old_password = oldp;
      body.password = newp;
    }
    try {
      const res = await api("/api/me/update", {
        method: "POST",
        body: JSON.stringify(body),
      });
      state.token = res.token;
      localStorage.setItem("avgchat_token", res.token);
      showToast("Профиль обновлен!");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}

function renderAdminPage(pending, all, chats) {
  const ws = document.getElementById("admin-container");
  if (!ws) return;
  const badgeEl = document.getElementById("admin-badge");
  if (badgeEl) {
    badgeEl.style.display = pending.length > 0 ? "flex" : "none";
    badgeEl.innerText = pending.length;
  }
  const uBlock = (u, isP) =>
    `<div class="admin-list-item"><div class="admin-user-info"><div class="avatar" style="${getAvatarStyle(u)} width:40px; height:40px;">${u.display_name[0].toUpperCase()}</div><div class="admin-user-details"><h4>${escapeHtml(u.display_name)} ${u.role === "admin" ? "👑" : ""}</h4><p>@${escapeHtml(u.username)} • <span class="badge ${isP ? "pending" : u.status === "approved" ? "approved" : "pending"}">${isP ? "Ожидает" : u.status === "approved" ? "Одобрен" : "Заблокирован"}</span></p></div></div><div class="admin-actions">${isP || u.status === "pending" ? `<button class="btn-icon" data-adm-ok="${u.id}" style="color:var(--success); background:rgba(16,185,129,0.1)">${Icons.check}</button><button class="btn-icon" data-adm-rej="${u.id}" style="color:var(--danger); background:rgba(239,68,68,0.1)">${Icons.x}</button>` : ""}${!isP && u.role !== "admin" ? `<button class="btn-icon" data-adm-del="${u.id}" style="color:var(--danger); background:rgba(239,68,68,0.1)">${Icons.trash}</button>` : ""}</div></div>`;
  ws.innerHTML = `<div class="page-header"><h2 class="page-title">Панель администратора</h2></div><div class="admin-grid">${pending.length > 0 ? `<div class="admin-card" style="grid-column: 1/-1; border-color:var(--warning)"><h3 class="admin-card-title" style="color:var(--warning)">Ожидают подтверждения (${pending.length})</h3><div class="admin-list">${pending.map((u) => uBlock(u, true)).join("")}</div></div>` : ""}<div class="admin-card"><h3 class="admin-card-title">Все пользователи (${all.length})</h3><div class="admin-list">${all.map((u) => uBlock(u, false)).join("")}</div></div><div class="admin-card"><h3 class="admin-card-title">Глобальные чаты (${chats.length})</h3><div class="admin-list">${chats.map((c) => `<div class="admin-list-item"><div class="admin-user-info"><div class="avatar" style="background:#8b5cf6; width:40px; height:40px;">${(c.name || "Ч")[0].toUpperCase()}</div><div class="admin-user-details"><h4>${escapeHtml(c.name || "Чат")}</h4><p>${c.member_count} Участников • ${c.message_count} сообщ.</p></div></div><div class="admin-actions"><button class="btn-icon" data-adm-chat="${c.id}" style="color:var(--danger); background:rgba(239,68,68,0.1)">${Icons.trash}</button></div></div>`).join("")}</div></div></div>`;
  const bnd = (attr, apiPth, method) =>
    ws.querySelectorAll(`[${attr}]`).forEach(
      (b) =>
        (b.onclick = async () => {
          if (method === "DELETE" && !confirm("Удалить?")) return;
          try {
            await api(`${apiPth}${b.getAttribute(attr)}`, { method });
            document.getElementById("nav-admin").click();
            showToast("Выполнено");
          } catch (e) {}
        }),
    );
  bnd("data-adm-ok", "/api/admin/approve-user/", "POST");
  bnd("data-adm-rej", "/api/admin/reject-user/", "POST");
  bnd("data-adm-del", "/api/admin/user/", "DELETE");
  bnd("data-adm-chat", "/api/admin/chat/", "DELETE");
}

mount();
window.addEventListener("resize", () => {
  if (state.activePage === "chats") {
    if (window.innerWidth > 900)
      document.getElementById("list-pane")?.classList.remove("hidden-mobile");
    else if (state.currentChatId)
      document.getElementById("list-pane")?.classList.add("hidden-mobile");
  }
});
