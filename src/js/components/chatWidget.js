import { auth } from '../firebase.js';
import { db } from '../firebase-config.js';

export function initChatWidget() {
  // Real-time helper variables/functions
  const seenMsgKeys = new Set();
  
  function getChatUser() {
    const user = auth.currentUser;
    const anonId = localStorage.getItem('pawdrop_chat_user_id') || 'user_' + Math.floor(100000 + Math.random() * 900000);
    if (!localStorage.getItem('pawdrop_chat_user_id')) {
      localStorage.setItem('pawdrop_chat_user_id', anonId);
    }
    return {
      id: user ? user.uid : anonId,
      email: user ? user.email : 'Guest Customer',
      name: user ? (user.displayName || user.email.split('@')[0]) : 'Guest'
    };
  }

  function setupSupportFirebaseSync(onAdminReplyCallback) {
    if (!db) return;
    const chatUser = getChatUser();
    
    // Clear unread count on chat setup
    db.ref(`support_chats/${chatUser.id}/metadata/unreadCount`).set(0);

    db.ref(`support_chats/${chatUser.id}/messages`).on('child_added', (snap) => {
      const key = snap.key;
      const msg = snap.val();
      if (!msg || seenMsgKeys.has(key)) return;
      seenMsgKeys.add(key);

      if (msg.sender === 'admin') {
        onAdminReplyCallback(msg.text);
      }
    });

    // Also update metadata when auth user shifts
    window.addEventListener('auth-changed', () => {
      const updatedUser = getChatUser();
      db.ref(`support_chats/${updatedUser.id}/metadata`).update({
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        userName: updatedUser.name
      }).catch(()=>{});
    });
  }

  async function uploadSupportMessage(text, sender) {
    if (!db) return;
    try {
      const chatUser = getChatUser();
      const msgRef = db.ref(`support_chats/${chatUser.id}/messages`).push();
      seenMsgKeys.add(msgRef.key);

      await msgRef.set({
        sender,
        text,
        time: new Date().toISOString()
      });

      await db.ref(`support_chats/${chatUser.id}/metadata`).update({
        userId: chatUser.id,
        userEmail: chatUser.email,
        userName: chatUser.name,
        lastMsg: text.replace(/<[^>]*>/g, ''), // strip HTML elements for preview
        lastTime: new Date().toISOString(),
        active: true
      });

      if (sender === 'user') {
        const unreadCountRef = db.ref(`support_chats/${chatUser.id}/metadata/unreadCount`);
        await unreadCountRef.transaction(c => (c || 0) + 1);
      }
    } catch(e) {
      console.warn("Firebase support sync error:", e);
    }
  }

  const body = document.body;
  const isContactPage = document.getElementById('embedChatForm') !== null;

  const chatContainer = document.createElement('div');
  chatContainer.id = 'pawdropChatWidget';
  chatContainer.innerHTML = `
    <style>
      #pawdropChatWidget {
        font-family: 'DM Sans', sans-serif;
      }
      .chat-bubble {
        position: fixed;
        bottom: 32px;
        right: 32px;
        width: 60px;
        height: 60px;
        background: #D2FF00;
        border-radius: 50%;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 24px rgba(210,255,0,0.4);
        transition: transform 0.3s ease;
        border: none;
      }
      .chat-bubble:hover {
        transform: scale(1.1);
      }
      .chat-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        font-size: 11px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-window {
        position: fixed;
        bottom: 104px;
        right: 32px;
        width: 360px;
        height: 500px;
        max-height: calc(100vh - 140px);
        overflow: hidden;
        background: #111112;
        border: 1px solid #222;
        border-top: 3px solid #D2FF00;
        display: flex;
        flex-direction: column;
        z-index: 10000;
        transform: translateY(20px);
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
        border-radius: 8px 8px 0 0;
      }
      .chat-window.is-open {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      .chat-header {
        display: flex;
        flex-direction: column;
        padding: 16px 20px;
        border-bottom: 1px solid #222;
      }
      .chat-header-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .chat-header__info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .chat-avatar {
        width: 40px;
        height: 40px;
        background: #D2FF00;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      .chat-header h4 {
        font-family: 'Syne', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        margin: 0;
      }
      .chat-status {
        font-size: 11px;
        color: #888;
      }
      .chat-close {
        color: #888;
        font-size: 16px;
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.2s;
        padding: 4px;
      }
      .chat-close:hover { color: #D2FF00; }
      .chat-header-toggles {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #222;
      }
      .chat-messages {
        flex: 1;
        min-height: 0; /* CRITICAL for scroll inside flex in Chrome/Safari */
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
      .chat-messages::-webkit-scrollbar { 
        width: 6px; 
      }
      .chat-messages::-webkit-scrollbar-track {
        background: #18181a;
      }
      .chat-messages::-webkit-scrollbar-thumb { 
        background: #D2FF00; 
        border-radius: 3px;
      }
      .chat-msg { display: flex; }
      .chat-msg.bot { justify-content: flex-start; }
      .chat-msg.user { justify-content: flex-end; }
      .chat-msg__bubble {
        max-width: 80%;
        padding: 12px 16px;
        font-size: 13px;
        line-height: 1.6;
        border-radius: 4px;
        word-wrap: break-word;
      }
      .chat-msg.bot .chat-msg__bubble {
        background: #18181a;
        color: #fff;
        border-left: 2px solid #D2FF00;
      }
      .chat-msg.bot .chat-msg__bubble strong { color: #D2FF00; font-weight: 600; }
      .chat-msg.bot .chat-msg__bubble p { margin: 0 0 8px 0; }
      .chat-msg.bot .chat-msg__bubble p:last-child { margin: 0; }
      .chat-msg.user .chat-msg__bubble {
        background: #D2FF00;
        color: #111112;
        font-weight: 600;
      }
      .chat-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: #18181a;
        width: fit-content;
        border-left: 2px solid #D2FF00;
      }
      .chat-typing span {
        width: 6px;
        height: 6px;
        background: #D2FF00;
        border-radius: 50%;
        animation: typingDot 1s infinite;
      }
      .chat-typing span:nth-child(2) { 
        animation-delay: 0.2s; 
      }
      .chat-typing span:nth-child(3) { 
        animation-delay: 0.4s; 
      }
      @keyframes typingDot {
        0%,100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }
      .chat-quick {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #222;
      }
      .quick-btn {
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        background: #18181a;
        color: #D2FF00;
        border: 1px solid #D2FF00;
        padding: 6px 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }
      .quick-btn:hover {
        background: #D2FF00;
        color: #111112;
      }
      .chat-input-wrap {
        display: flex;
        border-top: 1px solid #222;
        padding: 12px 16px;
        gap: 8px;
        background: #111112;
        position: relative;
      }
      .chat-input {
        flex: 1;
        background: #18181a;
        border: 1px solid #333;
        color: #fff;
        padding: 0 12px;
        height: 40px;
        font-size: 13px;
        outline: none;
        font-family: 'DM Sans', sans-serif;
        border-radius: 4px;
      }
      .chat-input:focus {
        border-color: #D2FF00;
      }
      .chat-send {
        width: 40px;
        height: 40px;
        background: #D2FF00;
        color: #111112;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        transition: transform 0.2s;
        padding: 0;
      }
      .chat-send:hover { transform: scale(1.05); }
      .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
      
      .chat-attach {
        background: #18181a;
        border: 1px solid #333;
        color: #888;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        padding: 0;
      }
      .chat-attach:hover {
        color: #D2FF00;
        border-color: #D2FF00;
      }
      
      .chat-mic {
        background: #18181a;
        border: 1px solid #333;
        color: #888;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        padding: 0;
      }
      .chat-mic:hover {
        color: #D2FF00;
        border-color: #D2FF00;
      }
      .chat-mic.is-listening {
        color: #ff4444;
        border-color: #ff4444;
        background: rgba(255, 68, 68, 0.1);
        animation: pulseMic 1.5s infinite;
      }
      @keyframes pulseMic {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .chat-image-preview {
        position: absolute;
        bottom: 60px;
        left: 16px;
        width: 60px;
        height: 60px;
        border-radius: 4px;
        object-fit: cover;
        border: 1px solid #D2FF00;
        background: #18181a;
        display: none;
      }
      .chat-image-preview.is-visible {
        display: block;
      }
      .chat-image-preview-clear {
        position: absolute;
        bottom: 105px;
        left: 65px;
        background: rgba(0,0,0,0.8);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        display: none;
      }
      .chat-image-preview-clear.is-visible {
        display: flex;
      }

      @media (max-width: 768px) {
        .chat-window {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
          border: none;
          border-top: 3px solid #D2FF00;
          max-height: none;
        }
        .chat-bubble {
          bottom: 20px;
          right: 20px;
        }
      }

      /* Tab Styling */
      .chat-tabs {
        display: flex;
        background: #141416;
        border-bottom: 1px solid #222;
      }
      .chat-tab-btn {
        flex: 1;
        padding: 12px;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        color: #888;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: all 0.25s ease;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .chat-tab-btn:hover {
        color: #fff;
      }
      .chat-tab-btn.is-active {
        color: #D2FF00;
        border-bottom-color: #D2FF00;
        background: rgba(210, 255, 0, 0.02);
      }
    </style>
    
    <!-- Floating Button -->
    <button class="chat-bubble" id="geminiChatFab">
      🐾
      <span class="chat-badge" id="chatBadge">
        1
      </span>
    </button>

    <!-- Chat Window -->
    <div class="chat-window" id="geminiChatWindow">
      
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-main">
          <div class="chat-header__info">
            <div class="chat-avatar" id="geminiChatAvatar">🐾</div>
            <div>
              <h4 id="geminiChatTitle">PAWDROP AI</h4>
              <span class="chat-status" id="geminiChatStatus">
                AI Companion Online
              </span>
            </div>
          </div>
          <button class="chat-close" id="geminiChatClose">✕</button>
        </div>
        <div class="chat-header-toggles" id="geminiChatHeaderToggles" style="display: flex;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #D2FF00; font-size: 11px; font-weight: 500;" title="Enable Veterinary Mode for medical search and professional advice">
            <input type="checkbox" id="geminiVetModeToggle" style="accent-color: #D2FF00; cursor: pointer;">
            Vet Mode
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #888; font-size: 11px;" title="Enable Google Search for facts">
            <input type="checkbox" id="geminiSearchToggle" checked style="accent-color: #D2FF00; cursor: pointer;">
            Search
          </label>
        </div>
      </div>

      <!-- Messages -->
      <div class="chat-messages" id="geminiChatMessages" data-lenis-prevent></div>

      <!-- Quick Replies -->
      <div class="chat-quick" id="quickReplies"></div>

      <!-- Input -->
      <form class="chat-input-wrap" id="geminiChatForm">
        <img id="geminiChatImagePreview" class="chat-image-preview" aria-hidden="true" />
        <button type="button" id="geminiChatImageClear" class="chat-image-preview-clear">✕</button>
        
        <button type="button" class="chat-attach" id="geminiChatAttach" title="Attach an image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
        <input type="file" id="geminiChatFile" accept="image/*" style="display: none;">
        
        <button type="button" class="chat-mic" id="geminiChatMic" title="Dictate message (Web Speech API)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
        </button>
        
        <input type="text" id="geminiChatInput" class="chat-input" placeholder="Type your message..." autocomplete="off">
        <button type="submit" class="chat-send" id="geminiChatSubmit">→</button>
      </form>

    </div>
  `;

  body.appendChild(chatContainer);
  if (isContactPage) {
    chatContainer.style.display = 'none';
  }

  const fab = document.getElementById('geminiChatFab');
  const badge = document.getElementById('chatBadge');
  const win = document.getElementById('geminiChatWindow');
  const closeBtn = document.getElementById('geminiChatClose');
  const form = document.getElementById('geminiChatForm');
  const input = document.getElementById('geminiChatInput');
  const attachBtn = document.getElementById('geminiChatAttach');
  const fileInput = document.getElementById('geminiChatFile');
  const imagePreview = document.getElementById('geminiChatImagePreview');
  const imageClear = document.getElementById('geminiChatImageClear');
  const messagesDiv = document.getElementById('geminiChatMessages');
  const submitBtn = document.getElementById('geminiChatSubmit');
  const micBtn = document.getElementById('geminiChatMic');
  const quickRepliesContainer = document.getElementById('quickReplies');

  const btnTabSupport = document.getElementById('btnTabSupport');
  const btnTabGeneral = document.getElementById('btnTabGeneral');
  const chatAvatar = document.getElementById('geminiChatAvatar');
  const chatTitle = document.getElementById('geminiChatTitle');
  const chatStatus = document.getElementById('geminiChatStatus');
  const headerToggles = document.getElementById('geminiChatHeaderToggles');

  let isOpen = false;
  let activeMode = 'general'; // default mode (care advisor companion for floating)
  let supportHistory = [];
  let generalHistory = [];

  let currentFile = null;
  let currentFileBase64 = null;
  let currentMimeType = null;

  const toggleChat = () => {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('is-open');
      if (badge) badge.style.display = 'none';
      setTimeout(() => input.focus(), 100);
    } else {
      win.classList.remove('is-open');
      stopListening();
    }
  };

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  const quickReplies = {
    support: [
      { text: '🚚 Shipping Info', reply: 'What is shipping delivery time?' },
      { text: '📦 Track Order', reply: 'How can I track my order?' },
      { text: '🔄 Return Policy', reply: 'What is your returns policy?' },
      { text: '💳 Payment', reply: 'What payment methods do you accept?' }
    ],
    general: [
      { text: '🍲 Dog Nutrition', reply: 'What are some key dog diet and nutrition advice?' },
      { text: '🐱 Stressed Cat', reply: 'How can I calm a stressed cat?' },
      { text: '⚡ LED Collars', reply: 'Are your LED collars completely safe for night walks?' },
      { text: '🧶 Recommended Play', reply: 'Tell me about safe toys for high-energy pets.' }
    ]
  };

  function renderQuickReplies() {
    if (!quickRepliesContainer) return;
    quickRepliesContainer.innerHTML = '';
    
    const currentHist = activeMode === 'support' ? supportHistory : generalHistory;
    if (currentHist.length > 0) {
      quickRepliesContainer.style.display = 'none';
      return;
    }
    
    quickRepliesContainer.style.display = 'flex';
    const list = quickReplies[activeMode] || [];
    list.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.setAttribute('data-reply', item.reply);
      btn.innerHTML = item.text;
      btn.type = 'button';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = item.reply;
        // Trigger submit
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
      quickRepliesContainer.appendChild(btn);
    });
  }

  function renderMessages() {
    if (!messagesDiv) return;
    messagesDiv.innerHTML = '';
    const currentHist = activeMode === 'support' ? supportHistory : generalHistory;
    
    if (currentHist.length === 0) {
      if (activeMode === 'support') {
        addMessage(`Hi! 👋 Welcome to PAWDROP Customer Support!<br>I can help you track orders, check shipping/delivery times, payment questions, or returns.<br/><br/>How can I help you today?`, 'bot');
      } else {
        addMessage(`Hello! 🐾 I'm your PawDrop AI Care Companion.<br>Ask me any questions about general pet health, nutrition tips, training, or symptom guidelines.<br/><br/><em>Enable **Vet Mode** for professional veterinary diagnostics & disclaimer safety!</em>`, 'bot');
      }
    } else {
      currentHist.forEach(msg => {
        let content = msg.text || '';
        if (msg.inlineData) {
          content = `<img src="data:${msg.inlineData.mimeType};base64,${msg.inlineData.data}" style="max-width: 100%; border-radius: 4px; margin-bottom: 8px;"><br/>` + content;
        }
        
        let formatted = content;
        if (msg.role === 'model') {
          formatted = content
             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\n/g, '<br/>');
        }
        addMessage(formatted, msg.role === 'model' ? 'bot' : 'user');
      });
    }
    
    renderQuickReplies();
    scrollToBottom();
  }

  function switchTab(mode) {
    if (activeMode === mode) return;
    activeMode = mode;
    
    // Stop speaking/listening
    stopListening();
    
    // Toggle active btn classes
    if (activeMode === 'support') {
      if (btnTabSupport) btnTabSupport.classList.add('is-active');
      if (btnTabGeneral) btnTabGeneral.classList.remove('is-active');
      
      // Update UI Header
      if (chatAvatar) chatAvatar.innerHTML = '📞';
      if (chatTitle) chatTitle.innerHTML = 'Contact Support';
      if (chatStatus) chatStatus.innerHTML = '24/7 Support Agent';
      if (headerToggles) headerToggles.style.display = 'none';
    } else {
      if (btnTabSupport) btnTabSupport.classList.remove('is-active');
      if (btnTabGeneral) btnTabGeneral.classList.add('is-active');
      
      // Update UI Header
      if (chatAvatar) chatAvatar.innerHTML = '🐾';
      if (chatTitle) chatTitle.innerHTML = 'PAWDROP AI';
      if (chatStatus) chatStatus.innerHTML = 'AI Companion Online';
      if (headerToggles) headerToggles.style.display = 'flex';
    }
    
    // Clear typing indicator and input
    hideTyping();
    input.value = '';
    
    // Render
    renderMessages();
  }

  if (btnTabSupport) {
    btnTabSupport.addEventListener('click', () => switchTab('support'));
  }
  if (btnTabGeneral) {
    btnTabGeneral.addEventListener('click', () => switchTab('general'));
  }

  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    currentFile = file;
    currentMimeType = file.type;

    const reader = new FileReader();
    reader.onload = (re) => {
      imagePreview.src = re.target.result;
      imagePreview.classList.add('is-visible');
      imageClear.classList.add('is-visible');
      
      // Store base64 data without prefix for Gemini API
      const base64Data = re.target.result.split(',')[1];
      currentFileBase64 = base64Data;
    };
    reader.readAsDataURL(file);
  });

  imageClear.addEventListener('click', () => {
    currentFile = null;
    currentFileBase64 = null;
    currentMimeType = null;
    imagePreview.src = '';
    imagePreview.classList.remove('is-visible');
    imageClear.classList.remove('is-visible');
    fileInput.value = '';
  });

  // Web Speech API / Speech Recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  function stopListening() {
    isListening = false;
    if (micBtn) {
      micBtn.classList.remove('is-listening');
      micBtn.title = 'Dictate message (Web Speech API)';
    }
    if (input) {
      input.placeholder = 'Type your message...';
    }
    if (recognition) {
      try {
        recognition.stop();
      } catch (err) {
        // Safe context check
      }
    }
  }

  function startListening() {
    if (!SpeechRecognition) {
      addMessage('Speech recognition is not supported in this browser. Please try another modern browser like Google Chrome.', 'bot');
      return;
    }
    try {
      if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          isListening = true;
          micBtn.classList.add('is-listening');
          micBtn.title = 'Stop listening';
          input.placeholder = 'Listening... Speak now';
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            const currentVal = input.value.trim();
            input.value = currentVal ? `${currentVal} ${transcript}` : transcript;
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          stopListening();
          if (event.error === 'not-allowed') {
            addMessage('Microphone access denied. Please click the "Open in new tab" icon at the top right of the application preview to allow microphone access, or verify your browser settings.', 'bot');
          } else {
            addMessage(`Voice input error: ${event.error}`, 'bot');
          }
        };

        recognition.onend = () => {
          stopListening();
        };
      }
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      stopListening();
    }
  }

  if (micBtn) {
    micBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    stopListening();
    const text = input.value.trim();
    if (!text && !currentFileBase64) return;
    
    // Hide quick replies
    if (quickRepliesContainer) quickRepliesContainer.style.display = 'none';

    // Add user message to UI
    let userMessageContent = text;
    if (currentFileBase64) {
      userMessageContent = `<img src="data:${currentMimeType};base64,${currentFileBase64}" style="max-width: 100%; border-radius: 4px; margin-bottom: 8px;"><br/>` + text;
    }
    addMessage(userMessageContent, 'user');
    input.value = '';
    submitBtn.disabled = true;

    // Sync user message to Firebase Realtime Database
    if (activeMode === 'support') {
      try {
        await uploadSupportMessage(text, 'user');
      } catch (fbErr) {
        console.warn("Could not sync user chat message to Firebase:", fbErr);
      }
    }

    // Update history
    const messageObject = { role: 'user', text };
    if (currentFileBase64) {
        messageObject.inlineData = {
            data: currentFileBase64,
            mimeType: currentMimeType
        };
    }
    
    const currentHist = activeMode === 'support' ? supportHistory : generalHistory;
    currentHist.push(messageObject);

    // Clear image selection
    if (currentFile) imageClear.click();

    // Show typing
    showTyping();

    try {
      const userProfile = auth.currentUser ? {
         uid: auth.currentUser.uid,
         email: auth.currentUser.email,
         displayName: auth.currentUser.displayName,
      } : null;

      const useSearch = document.getElementById('geminiSearchToggle').checked;
      const useVetMode = document.getElementById('geminiVetModeToggle').checked;

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentHist,
          userProfile,
          useSearch,
          useVetMode,
          assistantMode: activeMode
        })
      });
      
      const data = await res.json();
      
      hideTyping();
      if (data.text) {
        // Simple markdown naive parser to html
        let htmlResponse = data.text
           .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
           .replace(/\n/g, '<br/>');
        addMessage(htmlResponse, 'bot');
        currentHist.push({ role: 'model', text: data.text });

        // Sync bot reply to Firebase Realtime Database
        if (activeMode === 'support') {
          try {
            await uploadSupportMessage(data.text, 'bot');
          } catch(fbErr) {
            console.warn("Could not sync bot reply message to Firebase:", fbErr);
          }
        }
      } else if (data.error) {
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }

    } catch (err) {
      console.error(err);
      hideTyping();
      addMessage('Network error. Please try again later.', 'bot');
    } finally {
      submitBtn.disabled = false;
    }
  });

  function addMessage(text, sender) {
    if (!messagesDiv) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = `
      <div class="chat-msg__bubble">
        ${text}
      </div>
    `;
    messagesDiv.appendChild(div);
    scrollToBottom();
  }
  
  function showTyping() {
    if (!messagesDiv) return;
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'chat-msg bot';
    div.innerHTML = `
      <div class="chat-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesDiv.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function scrollToBottom() {
    if (!messagesDiv) return;
    setTimeout(() => {
      try {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      } catch (e) {
        messagesDiv.scroll({
          top: messagesDiv.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  }
  
  // Render initial messages
  renderMessages();

  // Set up Firebase Realtime Database sync for Live Admin Chat replies
  setupSupportFirebaseSync((replyText) => {
    // 1. If floating chat support is active, show the reply
    if (activeMode === 'support') {
      supportHistory.push({ role: 'model', text: replyText });
      addMessage(replyText, 'bot');
    }
    // 2. If contact page embedded support is active, show the reply
    if (embedForm) {
      embedHistory.push({ role: 'model', text: replyText });
      addEmbedMessage(replyText, 'bot');
    }
  });

  // EMBED CHAT WIDGET (for contact.html)
  const embedForm = document.getElementById('embedChatForm');
  if (embedForm) {
    const embedMessagesDiv = document.getElementById('embedChatMessages');
    const embedInput = document.getElementById('embedChatInput');
    const embedSubmitBtn = document.getElementById('embedChatSubmit');
    const embedAttachBtn = document.getElementById('embedChatAttach');
    const embedFileInput = document.getElementById('embedChatFile');
    const embedImagePreview = document.getElementById('embedChatImagePreview');
    const embedImageName = document.getElementById('embedChatImageName');
    const embedImageClear = document.getElementById('embedChatImageClear');
    const embedImagePreviewContainer = document.getElementById('embedImagePreviewContainer');
    const embedMicBtn = document.getElementById('embedChatMic');
    const embedQuickBtns = document.querySelectorAll('.quick-btn-embed');

    let embedHistory = [];
    let embedCurrentFile = null;
    let embedCurrentFileBase64 = null;
    let embedCurrentMimeType = null;

    // Render Welcome Message
    function renderEmbedWelcome() {
      if (!embedMessagesDiv) return;
      embedMessagesDiv.innerHTML = `
        <div class="embed-chat-msg bot">
          <div class="embed-chat-msg__bubble">
            Hi! 👋 Welcome to PAWDROP Customer Support directly on our contact page!<br>
            I can help you track orders, check shipping/delivery times, payment questions, or returns policy.<br/><br/>
            How can I assist you today?
          </div>
        </div>
      `;
    }

    renderEmbedWelcome();

    function addEmbedMessage(text, sender) {
      if (!embedMessagesDiv) return;
      const div = document.createElement('div');
      div.className = `embed-chat-msg ${sender}`;
      div.innerHTML = `
        <div class="embed-chat-msg__bubble">
          ${text}
        </div>
      `;
      embedMessagesDiv.appendChild(div);
      scrollEmbedToBottom();
    }

    function showEmbedTyping() {
      if (!embedMessagesDiv) return;
      const div = document.createElement('div');
      div.id = 'embedTypingIndicator';
      div.className = 'embed-chat-msg bot';
      div.innerHTML = `
        <div class="embed-chat-typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      embedMessagesDiv.appendChild(div);
      scrollEmbedToBottom();
    }

    function hideEmbedTyping() {
      const el = document.getElementById('embedTypingIndicator');
      if (el) el.remove();
    }

    function scrollEmbedToBottom() {
      if (!embedMessagesDiv) return;
      setTimeout(() => {
        embedMessagesDiv.scroll({
          top: embedMessagesDiv.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }

    // Attach File Listeners
    if (embedAttachBtn && embedFileInput) {
      embedAttachBtn.addEventListener('click', () => {
        embedFileInput.click();
      });

      embedFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        embedCurrentFile = file;
        embedCurrentMimeType = file.type;
        embedImageName.textContent = file.name;

        const reader = new FileReader();
        reader.onload = (re) => {
          embedImagePreview.src = re.target.result;
          embedImagePreviewContainer.style.display = 'flex';
          embedCurrentFileBase64 = re.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
      });
    }

    if (embedImageClear) {
      embedImageClear.addEventListener('click', () => {
        clearEmbedFile();
      });
    }

    function clearEmbedFile() {
      embedCurrentFile = null;
      embedCurrentFileBase64 = null;
      embedCurrentMimeType = null;
      if (embedImagePreview) embedImagePreview.src = '';
      if (embedImagePreviewContainer) embedImagePreviewContainer.style.display = 'none';
      if (embedFileInput) embedFileInput.value = '';
    }

    // Mic Voice Dictation Listeners
    let embedIsListening = false;
    let embedRecognition = null;

    function stopEmbedListening() {
      embedIsListening = false;
      if (embedMicBtn) {
        embedMicBtn.style.color = '#888';
        embedMicBtn.title = 'Dictate message';
      }
      if (embedInput) {
        embedInput.placeholder = 'Type or choose a request...';
      }
      if (embedRecognition) {
        try {
          embedRecognition.stop();
        } catch (err) {}
      }
    }

    function startEmbedListening() {
      if (!SpeechRecognition) {
        addEmbedMessage('Speech recognition is not supported in this browser.', 'bot');
        return;
      }
      try {
        if (!embedRecognition) {
          embedRecognition = new SpeechRecognition();
          embedRecognition.continuous = false;
          embedRecognition.interimResults = false;
          embedRecognition.lang = 'en-US';

          embedRecognition.onstart = () => {
            embedIsListening = true;
            embedMicBtn.style.color = '#D2FF00';
            embedMicBtn.title = 'Stop listening';
            embedInput.placeholder = 'Listening... Speak now';
          };

          embedRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
              const currentVal = embedInput.value.trim();
              embedInput.value = currentVal ? `${currentVal} ${transcript}` : transcript;
            }
          };

          embedRecognition.onerror = (event) => {
            console.error('Embed Speech recognition error:', event.error);
            stopEmbedListening();
            if (event.error === 'not-allowed') {
              addEmbedMessage('Microphone access denied. Grant mic access inside permissions settings.', 'bot');
            } else {
              addEmbedMessage(`Voice input error: ${event.error}`, 'bot');
            }
          };

          embedRecognition.onend = () => {
            stopEmbedListening();
          };
        }
        embedRecognition.start();
      } catch (err) {
        console.error('Failed to start embed speech recognition:', err);
        stopEmbedListening();
      }
    }

    if (embedMicBtn) {
      embedMicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (embedIsListening) {
          stopEmbedListening();
        } else {
          startEmbedListening();
        }
      });
    }

    // Form Submit (calls model with assistantMode: 'support')
    embedForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      stopEmbedListening();

      const text = embedInput.value.trim();
      if (!text && !embedCurrentFileBase64) return;

      // Add user message to UI
      let userMessageContent = text;
      if (embedCurrentFileBase64) {
        userMessageContent = `<img src="data:${embedCurrentMimeType};base64,${embedCurrentFileBase64}" style="max-width: 100%; max-height: 150px; border-radius: 4px; margin-bottom: 8px;"><br/>` + text;
      }
      addEmbedMessage(userMessageContent, 'user');
      embedInput.value = '';
      if (embedSubmitBtn) embedSubmitBtn.disabled = true;

      // Sync user message to Firebase Realtime Database
      try {
        await uploadSupportMessage(text, 'user');
      } catch (fbErr) {
        console.warn("Could not sync embedded support chat user message to Firebase:", fbErr);
      }

      // Send automated EmailJS inquiry notification to administrator to check chat/order
      try {
        if (!window._adminInquiryDispatched) {
          window._adminInquiryDispatched = true;
          const userEmail = auth.currentUser?.email || "anonymous-visitor@pawdrop.com";
          const userName = auth.currentUser?.displayName || "Anonymous Visitor";
          import('../notifications.js').then(({ notifier }) => {
            notifier.sendAdminInquiryNotification(userEmail, userName, text, `Page session url: ${window.location.href}`);
          }).catch(err => {
            console.warn("Dynamic notifier import failed:", err);
          });
        }
      } catch (inqErr) {
        console.warn("Admin support email notify failure:", inqErr);
      }

      // Update history
      const messageObject = { role: 'user', text };
      if (embedCurrentFileBase64) {
        messageObject.inlineData = {
          data: embedCurrentFileBase64,
          mimeType: embedCurrentMimeType
        };
      }
      embedHistory.push(messageObject);

      // Clear image selection
      clearEmbedFile();

      // Show typing
      showEmbedTyping();

      try {
        const userProfile = auth.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
        } : null;

        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: embedHistory,
            userProfile,
            useSearch: true,
            useVetMode: false,
            assistantMode: 'support' // Embedded is ALWAYS support agent!
          })
        });

        const data = await res.json();
        hideEmbedTyping();

        if (data.text) {
          let htmlResponse = data.text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
          addEmbedMessage(htmlResponse, 'bot');
          embedHistory.push({ role: 'model', text: data.text });

          // Sync bot message to Firebase Realtime Database
          try {
            await uploadSupportMessage(data.text, 'bot');
          } catch (fbErr) {
            console.warn("Could not sync embedded support chat bot reply to Firebase:", fbErr);
          }
        } else if (data.error) {
          addEmbedMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }

      } catch (err) {
        console.error(err);
        hideEmbedTyping();
        addEmbedMessage('Network error. Please try again later.', 'bot');
      } finally {
        if (embedSubmitBtn) embedSubmitBtn.disabled = false;
      }
    });

    // Quick replies
    embedQuickBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        embedInput.value = btn.getAttribute('data-reply');
        embedForm.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });
  }
}
