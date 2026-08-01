// chat.js — agente virtual de Horizonte Exclusivo (widget autocontenido).
// Lo carga /scripts.js en todas las páginas; habla con /api/chat (la clave
// de la API vive solo en el servidor). Inyecta su propio CSS y su DOM para
// no tocar los 148 HTML del sitio.
(function () {
    'use strict';
    if (document.getElementById('heChatBubble')) return;

    var GREETING = 'Hola, soy el agente virtual de Horizonte Exclusivo. Cuéntame qué viaje sueñas y te oriento sin compromiso.';
    var FALLBACK = 'No he podido conectar. Escríbenos por WhatsApp al 633 077 401 y seguimos la conversación allí.';

    var css = ''
        + '.he-chat-bubble{position:fixed;bottom:100px;right:24px;z-index:1001;width:58px;height:58px;border-radius:50%;border:1px solid rgba(201,169,110,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--gold,#c9a96e);color:var(--dark,#0a0a0a);box-shadow:0 8px 24px rgba(201,169,110,.35);transition:var(--transition,.3s cubic-bezier(.4,0,.2,1))}'
        + '.he-chat-bubble:hover{background:var(--gold-light,#e8d5a8);transform:translateY(-2px)}'
        + '.he-chat-bubble svg{width:26px;height:26px}'
        + '.he-chat-panel{position:fixed;bottom:170px;right:24px;z-index:1001;width:min(380px,calc(100vw - 32px));display:none;flex-direction:column;overflow:hidden;background:var(--dark-card,#111);border:1px solid rgba(201,169,110,.3);border-radius:var(--radius,12px);box-shadow:0 18px 50px rgba(0,0,0,.6)}'
        + '.he-chat-panel.open{display:flex;animation:heChatIn .25s ease}'
        + '@keyframes heChatIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
        + '.he-chat-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(201,169,110,.25)}'
        + '.he-chat-head strong{font-family:"Playfair Display",serif;font-size:1.05rem;color:var(--gold,#c9a96e);font-weight:600;letter-spacing:.3px}'
        + '.he-chat-head span{display:block;color:var(--text-muted,#a0a0a0);font-size:.78rem;margin-top:2px}'
        + '.he-chat-close{flex:none;width:32px;height:32px;border-radius:50%;border:1px solid rgba(201,169,110,.3);background:transparent;color:var(--text,#e0e0e0);font-size:1rem;line-height:1;cursor:pointer;transition:var(--transition,.3s)}'
        + '.he-chat-close:hover{border-color:var(--gold,#c9a96e);color:var(--gold,#c9a96e)}'
        + '.he-chat-msgs{height:330px;max-height:48vh;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}'
        + '.he-chat-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:.9rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:break-word;font-family:"Inter",sans-serif}'
        + '.he-chat-msg.bot{background:var(--dark-soft,#1a1a1a);border:1px solid rgba(201,169,110,.18);color:var(--text,#e0e0e0);align-self:flex-start;border-bottom-left-radius:4px}'
        + '.he-chat-msg.user{background:var(--gold,#c9a96e);color:var(--dark,#0a0a0a);align-self:flex-end;border-bottom-right-radius:4px}'
        + '.he-chat-typing{align-self:flex-start;color:var(--text-muted,#a0a0a0);font-size:.82rem;padding:2px 4px;animation:heChatPulse 1.2s ease infinite}'
        + '@keyframes heChatPulse{0%,100%{opacity:.35}50%{opacity:1}}'
        + '.he-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(201,169,110,.25)}'
        + '.he-chat-form input{flex:1;min-width:0;background:var(--dark,#0a0a0a);border:1px solid rgba(201,169,110,.25);border-radius:8px;padding:11px 14px;color:var(--text,#e0e0e0);font-family:"Inter",sans-serif;font-size:.9rem}'
        + '.he-chat-form input:focus{outline:none;border-color:var(--gold,#c9a96e)}'
        + '.he-chat-send{flex:none;background:var(--gold,#c9a96e);color:var(--dark,#0a0a0a);border:0;border-radius:8px;padding:0 16px;font-size:1.05rem;cursor:pointer;transition:var(--transition,.3s)}'
        + '.he-chat-send:hover{background:var(--gold-light,#e8d5a8)}'
        + '.he-chat-send:disabled{opacity:.5;cursor:not-allowed}'
        + '.he-chat-note{padding:0 16px 12px;margin:0;text-align:center;color:var(--text-muted,#a0a0a0);font-size:.66rem;font-family:"Inter",sans-serif}'
        + '@media(max-width:480px){.he-chat-bubble{bottom:96px;right:16px}.he-chat-panel{right:16px;left:16px;width:auto;bottom:162px}}'
        + '@media(prefers-reduced-motion:reduce){.he-chat-panel.open{animation:none}.he-chat-typing{animation:none}}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.className = 'he-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Agente virtual de Horizonte Exclusivo');
    panel.innerHTML = ''
        + '<div class="he-chat-head">'
        + '  <div><strong>Horizonte Exclusivo</strong>'
        + '  <span>Tu próximo viaje empieza con una conversación</span></div>'
        + '  <button type="button" class="he-chat-close" aria-label="Cerrar el chat">&times;</button>'
        + '</div>'
        + '<div class="he-chat-msgs"></div>'
        + '<form class="he-chat-form">'
        + '  <input type="text" maxlength="1000" placeholder="Escribe tu pregunta" autocomplete="off" aria-label="Escribe tu pregunta">'
        + '  <button type="submit" class="he-chat-send" aria-label="Enviar mensaje">&#10148;</button>'
        + '</form>'
        + '<p class="he-chat-note">Asistente con IA: puede equivocarse. No compartas datos personales.</p>';

    var bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.id = 'heChatBubble';
    bubble.className = 'he-chat-bubble';
    bubble.setAttribute('aria-label', 'Abrir el agente virtual');
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>';

    document.body.appendChild(panel);
    document.body.appendChild(bubble);

    var msgs = panel.querySelector('.he-chat-msgs');
    var form = panel.querySelector('.he-chat-form');
    var input = form.querySelector('input');
    var send = form.querySelector('.he-chat-send');
    var closeBtn = panel.querySelector('.he-chat-close');

    var history = [];
    var loading = false;
    var started = false;

    function addMsg(role, text) {
        var div = document.createElement('div');
        div.className = 'he-chat-msg ' + (role === 'user' ? 'user' : 'bot');
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function toggle(open) {
        panel.classList.toggle('open', open);
        if (open && !started) {
            started = true;
            addMsg('model', GREETING);
            history.push({ role: 'model', text: GREETING });
        }
        if (open) input.focus();
    }

    bubble.addEventListener('click', function () { toggle(!panel.classList.contains('open')); });
    closeBtn.addEventListener('click', function () { toggle(false); });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var message = input.value.trim();
        if (!message || loading) return;
        var past = history.slice(-10);
        addMsg('user', message);
        history.push({ role: 'user', text: message });
        input.value = '';
        loading = true;
        send.disabled = true;
        var typing = document.createElement('div');
        typing.className = 'he-chat-typing';
        typing.textContent = 'Escribiendo…';
        msgs.appendChild(typing);
        msgs.scrollTop = msgs.scrollHeight;

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: message, history: past })
        })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .catch(function () { return null; })
            .then(function (data) {
                var reply = FALLBACK;
                if (data) {
                    if (data.ok && data.reply) reply = data.reply;
                    else if (data.error && data.error.length > 30) reply = data.error;
                }
                typing.remove();
                addMsg('model', reply);
                history.push({ role: 'model', text: reply });
                loading = false;
                send.disabled = false;
                input.focus();
            });
    });
})();
