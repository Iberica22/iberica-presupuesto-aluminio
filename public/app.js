'use strict';

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatText(raw) {
  // Escape HTML first, then render markdown-ish formatting
  let s = escapeHTML(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function scrollToBottom() {
  const el = document.getElementById('chatMessages');
  el.scrollTop = el.scrollHeight;
}

// ── Add message bubble ─────────────────────────────────────────────────────────

function addMessage(html, role) {
  const container = document.getElementById('chatMessages');

  const wrap   = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'agent' ? 'IS' : 'TÚ';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML  = html;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function showTyping() {
  const container = document.getElementById('chatMessages');
  const wrap = document.createElement('div');
  wrap.className = 'msg msg-agent msg-typing';
  wrap.id = 'typingMsg';
  wrap.innerHTML = `
    <div class="msg-avatar">IS</div>
    <div class="msg-bubble"><div class="dots"><span></span><span></span><span></span></div></div>
  `;
  container.appendChild(wrap);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById('typingMsg');
  if (el) el.remove();
}

// ── Send message ───────────────────────────────────────────────────────────────

async function enviarMensaje() {
  const input = document.getElementById('userInput');
  const btn   = document.getElementById('btnSend');
  const text  = input.value.trim();
  if (!text || btn.disabled) return;

  addMessage(escapeHTML(text), 'user');
  input.value = '';
  autoExpand(input);
  btn.disabled = true;
  showTyping();

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text }),
    });
    const data = await res.json();

    removeTyping();

    if (data.error) {
      addMessage('⚠️ ' + escapeHTML(data.error), 'agent');
    } else {
      addMessage(formatText(data.message), 'agent');
      if (data.budgetReady) {
        document.getElementById('pdfBanner').hidden = false;
        scrollToBottom();
      }
    }
  } catch {
    removeTyping();
    addMessage('Error de conexión. Compruebe su conexión e inténtelo de nuevo.', 'agent');
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

// ── Download PDF ───────────────────────────────────────────────────────────────

function descargarPDF() {
  window.open('/api/download-pdf', '_blank');
}

// ── Reset ──────────────────────────────────────────────────────────────────────

async function resetConversacion() {
  await fetch('/api/reset', { method: 'POST' }).catch(() => {});

  document.getElementById('chatMessages').innerHTML = `
    <div class="msg msg-agent">
      <div class="msg-avatar">IS</div>
      <div class="msg-bubble">
        Bienvenido a <strong>Ibérica Seguridad</strong>. Soy su agente de presupuestos para carpintería de aluminio.<br><br>
        ¿En qué puedo ayudarle hoy? Puede preguntarme por ventanas, puertas, cerramientos, persianas, toldos o mamparas.
      </div>
    </div>`;

  document.getElementById('pdfBanner').hidden = true;
  document.getElementById('userInput').focus();
}

// ── Textarea helpers ───────────────────────────────────────────────────────────

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    enviarMensaje();
  }
}

function autoExpand(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 130) + 'px';
}

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userInput').focus();
});
