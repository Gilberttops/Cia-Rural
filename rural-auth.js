/* Rural Auth - cliente (login central dos apps Rural).
 *
 * Uso em cada app HTML (um arquivo so, copiado ao lado do HTML):
 *   <script src="rural-auth.js"></script>
 *   RuralAuth.iniciar({ app: 'compras', aoEntrar: function (ctx) { ...abre o app... } });
 *   // depois, para falar com o Apps Script de dados:
 *   RuralAuth.chamar('compras', URL_DO_SCRIPT, { acao: 'ler' }).then(function (resp) { ... });
 *
 * O token vai no corpo do POST (text/plain), nunca na URL. A sessao fica em sessionStorage,
 * ou em localStorage se a pessoa marcar "manter conectado". Tudo que vem do servidor e
 * mostrado como TEXTO (nunca como HTML).
 */
(function (global) {
  'use strict';

  var CFG = { logo: 'logo_rural.png', url: 'https://script.google.com/macros/s/AKfycbyaCC5we0lDwicDdTapTz3tVdocH2vm282nre7eTI5FR-zGaAnxVLzSSBCBigwQ6xja/exec' };
  var CHAVE = 'rural:sessao';
  var ESCRITAS = ['trocar_senha', 'usuario_criar', 'usuario_editar', 'usuario_desativar', 'usuario_resetar_senha', 'encerrar_sessoes'];
  var MARGEM_TOKEN_MS = 60000;
  var MSG_REGRAS = 'Mínimo de 10 caracteres, com pelo menos uma letra e um número.';

  var estado = novoEstado();

  function novoEstado() {
    return { sessao: null, expira: 0, usuario: null, apps: [], lembrar: false, tokens: {}, pendTokens: {}, aoEntrar: null, appAtual: null, loginPromise: null };
  }

  var RuralAuth = {
    _agora: function () { return Date.now(); },
    _esperaRepeticaoMs: 800,
    configurar: function (o) { if (o && o.url) CFG.url = o.url; if (o && o.logo) CFG.logo = o.logo; },
    _reset: function () {
      ['rural-auth-overlay', 'rural-auth-css'].forEach(function (id) { var n = document.getElementById(id); if (n) n.remove(); });
      estado = novoEstado();
    },
    iniciar: iniciar,
    chamar: chamar,
    pedirAuth: pedirAuth,
    sair: sair,
    trocarSenha: function () { return trocarSenhaUI(false); },
    usuario: function () { return estado.usuario; },
    apps: function () { return estado.apps; },
    sessao: function () { return estado.sessao; }
  };

  function agora() { return RuralAuth._agora(); }

  // ---------- armazenamento (sempre protegido: a pagina funciona mesmo sem ele) ----------
  function guardar() {
    try {
      var texto = JSON.stringify({ sessao: estado.sessao, expira: estado.expira, usuario: estado.usuario, apps: estado.apps, lembrar: estado.lembrar });
      var alvo = estado.lembrar ? localStorage : sessionStorage;
      var outro = estado.lembrar ? sessionStorage : localStorage;
      try { outro.removeItem(CHAVE); } catch (e) { /* ignora */ }
      alvo.setItem(CHAVE, texto);
    } catch (e) { /* sem armazenamento: vale so nesta aba */ }
  }

  function carregar() {
    try {
      var texto = sessionStorage.getItem(CHAVE) || localStorage.getItem(CHAVE);
      return texto ? JSON.parse(texto) : null;
    } catch (e) {
      return null;
    }
  }

  function limparArmazenamento() {
    try { sessionStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
    try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
  }

  function limparSessao() {
    limparArmazenamento();
    estado.sessao = null; estado.expira = 0; estado.usuario = null; estado.apps = []; estado.tokens = {}; estado.pendTokens = {};
  }

  // ---------- rede ----------
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function postJson(url, corpo) {
    var resp;
    try {
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo) });
    } catch (e) {
      return { ok: false, error: 'rede', message: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
    var texto = '';
    try {
      texto = await resp.text();
      return JSON.parse(texto);
    } catch (e) {
      // Diagnostico: o comeco da resposta vai para o console do navegador (F12), nunca para a tela.
      if (global.console) console.warn('[RuralAuth] resposta nao-JSON de ' + String(url).slice(0, 80) + ' (HTTP ' + resp.status + '): ' + texto.slice(0, 600));
      return { ok: false, error: 'resposta_invalida', message: 'Resposta inesperada do servidor. Tente de novo em instantes.' };
    }
  }

  // Fala com o Rural Auth. Se a sessao caiu, pede login de novo e repete o pedido uma vez.
  async function chamarAuth(acao, corpo, opcoes) {
    opcoes = opcoes || {};
    if (CFG.url.indexOf('COLE_AQUI') === 0) return { ok: false, error: 'config', message: 'O endereço do Rural Auth ainda não foi configurado.' };
    var base = Object.assign({}, corpo || {}, { acao: acao });
    if (ESCRITAS.indexOf(acao) >= 0 && !base.opId) base.opId = uuid();
    if (acao !== 'login') base.sessao = estado.sessao;
    var r = await postJson(CFG.url, base);
    if (r && r.ok === false && r.error === 'sessao_invalida' && acao !== 'login' && !opcoes.semRetry) {
      await reautenticar();
      base.sessao = estado.sessao;
      r = await postJson(CFG.url, base);
    }
    // O servidor exige trocar a senha provisoria antes de liberar apps e acoes: abre a troca e repete uma vez.
    if (r && r.ok === false && r.error === 'trocar_senha' && acao !== 'login' && !opcoes.semRetry) {
      await trocarSenhaUI(true);
      base.sessao = estado.sessao;
      r = await postJson(CFG.url, base);
    }
    return r;
  }

  function pedirAuth(acao, corpo) { return chamarAuth(acao, corpo); }

  // ---------- fluxo principal ----------
  function contexto() { return { usuario: estado.usuario, apps: estado.apps }; }
  function temApp(id) { return estado.apps.some(function (a) { return a.id === id; }); }

  function aceitarLogin(r, lembrar) {
    estado.sessao = r.sessao; estado.expira = r.expira; estado.usuario = r.usuario; estado.apps = r.apps || [];
    estado.lembrar = !!lembrar; estado.tokens = {}; estado.pendTokens = {};
    guardar();
  }

  async function garantirSessao() {
    var salvo = carregar();
    if (salvo && salvo.sessao && salvo.expira > agora()) {
      estado.sessao = salvo.sessao; estado.expira = salvo.expira; estado.usuario = salvo.usuario; estado.apps = salvo.apps || []; estado.lembrar = !!salvo.lembrar;
      var r = await chamarAuth('me', {}, { semRetry: true });
      if (r.ok) { estado.usuario = r.usuario; estado.apps = r.apps; guardar(); return; }
      if (r.error === 'rede' || r.error === 'resposta_invalida' || r.error === 'config') {
        estado.sessao = null; estado.usuario = null; estado.apps = [];
        await mostrarLogin(r.message);
        return;
      }
      limparSessao();
    }
    await mostrarLogin();
  }

  async function posLogin() {
    if (estado.usuario && estado.usuario.trocar_senha) await trocarSenhaUI(true);
    if (estado.appAtual && !temApp(estado.appAtual)) {
      mostrarSemAcesso();
      return new Promise(function () { /* fica parado: o app nao abre */ });
    }
    var ctx = contexto();
    if (estado.aoEntrar) { try { estado.aoEntrar(ctx); } catch (e) { if (global.console) console.error(e); } }
    return ctx;
  }

  async function iniciar(opcoes) {
    opcoes = opcoes || {};
    estado.aoEntrar = opcoes.aoEntrar || null;
    estado.appAtual = opcoes.app || null;
    await garantirSessao();
    return posLogin();
  }

  async function reautenticar() {
    limparSessao();
    await mostrarLogin('Sua sessão expirou. Entre novamente.');
    if (estado.usuario && estado.usuario.trocar_senha) await trocarSenhaUI(true);
  }

  function sair() {
    limparSessao();
    mostrarLogin().then(posLogin);
  }

  async function obterToken(appId, forcar) {
    var c = estado.tokens[appId];
    if (!forcar && c && c.expira - agora() > MARGEM_TOKEN_MS) return c.token;
    if (estado.pendTokens[appId]) return estado.pendTokens[appId];
    var p = (async function () {
      try {
        var r = await chamarAuth('token_app', { app: appId });
        if (!r.ok) { var e = new Error(r.message || 'Não foi possível obter acesso ao app.'); e.codigo = r.error; throw e; }
        estado.tokens[appId] = { token: r.token, expira: r.expira };
        return r.token;
      } finally { delete estado.pendTokens[appId]; }
    })();
    estado.pendTokens[appId] = p;
    return p;
  }

  // O Google as vezes devolve, no lugar da resposta do POST, a do doGet ({ok, servico}) ou uma pagina HTML.
  function foraDoFormato(r) {
    return !r || r.error === 'resposta_invalida' || (r.ok === true && r.servico !== undefined);
  }

  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  async function chamar(appId, url, corpo) {
    var token = await obterToken(appId, false);
    var r = await postJson(url, Object.assign({}, corpo || {}, { token: token }));
    if (r && r.ok === false && r.error === 'unauthorized') {
      token = await obterToken(appId, true);
      r = await postJson(url, Object.assign({}, corpo || {}, { token: token }));
    }
    if (foraDoFormato(r)) { // repete uma vez, sozinho
      await espera(RuralAuth._esperaRepeticaoMs);
      r = await postJson(url, Object.assign({}, corpo || {}, { token: token }));
    }
    if (foraDoFormato(r)) {
      return { ok: false, error: 'resposta_invalida', message: 'O servidor respondeu fora do esperado. Recarregue a página em instantes.' };
    }
    return r;
  }

  // ---------- telas ----------
  // Visual do kit Rural (mesmas cores e fonte do rural-ui.css), embutido aqui para a tela de login funcionar
  // mesmo numa pagina que ainda nao carregou o kit. Somente tema claro.
  var CSS = [
    '#rural-auth-overlay{--ra-papel:#FAF8F3;--ra-card:#fff;--ra-tinta:#1F2A37;--ra-tinta2:#6B7280;--ra-linha:#E3E1DA;--ra-azul:#2060A8;--ra-azul-esc:#1F3550;--ra-verde:#289048;--ra-amarelo:#F8C838;--ra-erro:#B4462E;',
    'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--ra-papel);color:var(--ra-tinta);',
    'font:16px/1.45 Outfit,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:auto;color-scheme:light}',
    '#rural-auth-overlay *{box-sizing:border-box}',
    '#rural-auth-overlay .ra-card{width:100%;max-width:400px;background:var(--ra-card);border:1px solid var(--ra-linha);border-radius:16px;padding:28px 26px 24px;box-shadow:0 12px 40px rgba(31,53,80,.10);position:relative;overflow:hidden}',
    '#rural-auth-overlay .ra-faixa{position:absolute;left:0;right:0;top:0;height:5px;display:flex;gap:3px}',
    '#rural-auth-overlay .ra-faixa span:nth-child(1){flex:62;background:var(--ra-azul)} #rural-auth-overlay .ra-faixa span:nth-child(2){flex:24;background:var(--ra-verde)} #rural-auth-overlay .ra-faixa span:nth-child(3){flex:14;background:var(--ra-amarelo)}',
    '#rural-auth-overlay .ra-logo{display:block;height:58px;width:auto;margin:4px 0 16px}',
    '#rural-auth-overlay h1{font-size:1.4rem;font-weight:700;color:var(--ra-azul-esc);margin:0 0 2px}',
    '#rural-auth-overlay p.ra-sub{margin:0 0 16px;color:var(--ra-tinta2);font-size:.92rem}',
    '#rural-auth-overlay label{display:block;font-size:.85rem;font-weight:500;color:var(--ra-tinta2);margin:12px 0 4px}',
    '#rural-auth-overlay input[type=text],#rural-auth-overlay input[type=password]{width:100%;min-height:46px;padding:10px 12px;font:inherit;font-size:16px;color:var(--ra-tinta);background:#fff;border:1px solid var(--ra-linha);border-radius:10px}',
    '#rural-auth-overlay input:focus-visible,#rural-auth-overlay button:focus-visible{outline:2px solid var(--ra-azul);outline-offset:2px}',
    '#rural-auth-overlay .ra-lembrar{display:flex;align-items:center;gap:8px;margin:14px 0 0;font-size:.9rem;color:var(--ra-tinta)}',
    '#rural-auth-overlay .ra-lembrar input{width:18px;height:18px;accent-color:var(--ra-azul)}',
    '#rural-auth-overlay button{width:100%;min-height:46px;margin-top:18px;padding:10px 14px;font:inherit;font-size:1rem;font-weight:600;color:#fff;background:var(--ra-azul);border:0;border-radius:10px;cursor:pointer}',
    '#rural-auth-overlay button:hover{background:#1A5293}',
    '#rural-auth-overlay button.ra-secundario{background:#fff;color:var(--ra-tinta);border:1px solid var(--ra-linha);margin-top:10px}',
    '#rural-auth-overlay button:disabled{opacity:.6;cursor:wait}',
    '#rural-auth-overlay .ra-msg{min-height:20px;margin-top:12px;font-size:.9rem;font-weight:500;color:var(--ra-erro)}'
  ].join('');

  function criar(tag, atributos, texto) {
    var n = document.createElement(tag);
    Object.keys(atributos || {}).forEach(function (k) { n.setAttribute(k, atributos[k]); });
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function campo(form, rotulo, id, tipo, auto) {
    form.appendChild(criar('label', { 'for': id }, rotulo));
    var inp = criar('input', { id: id, type: tipo, autocomplete: auto, name: id });
    form.appendChild(inp);
    return inp;
  }

  // Monta (ou troca o conteudo de) a sobreposicao e devolve o cartao.
  function cartao(titulo, subtitulo) {
    if (!document.getElementById('rural-auth-css')) {
      var st = criar('style', { id: 'rural-auth-css' }); st.textContent = CSS; document.head.appendChild(st);
    }
    var ov = document.getElementById('rural-auth-overlay');
    if (!ov) { ov = criar('div', { id: 'rural-auth-overlay' }); document.body.appendChild(ov); }
    ov.textContent = '';
    var c = criar('div', { 'class': 'ra-card' });
    var faixa = criar('div', { 'class': 'ra-faixa', 'aria-hidden': 'true' });
    faixa.appendChild(criar('span')); faixa.appendChild(criar('span')); faixa.appendChild(criar('span'));
    c.appendChild(faixa);
    c.appendChild(criar('img', { 'class': 'ra-logo', src: CFG.logo, alt: 'Rural Nutrição Animal 25 anos' }));
    c.appendChild(criar('h1', {}, titulo));
    if (subtitulo) c.appendChild(criar('p', { 'class': 'ra-sub' }, subtitulo));
    ov.appendChild(c);
    return c;
  }

  function fecharOverlay() {
    var ov = document.getElementById('rural-auth-overlay');
    if (ov) ov.remove();
  }

  function mostrarLogin(mensagemInicial) {
    if (estado.loginPromise) return estado.loginPromise;
    estado.loginPromise = new Promise(function (resolve) {
      var c = cartao('Entrar', 'Use seu usuário e senha.');
      var form = criar('form', { id: 'ra-form-login', novalidate: 'novalidate' });
      var u = campo(form, 'Usuário', 'ra-usuario', 'text', 'username');
      u.setAttribute('autocapitalize', 'none'); u.setAttribute('autocorrect', 'off'); u.setAttribute('spellcheck', 'false');
      var s = campo(form, 'Senha', 'ra-senha', 'password', 'current-password');
      var lb = criar('label', { 'class': 'ra-lembrar' });
      var chk = criar('input', { id: 'ra-lembrar', type: 'checkbox' });
      lb.appendChild(chk); lb.appendChild(document.createTextNode('Manter conectado neste aparelho'));
      form.appendChild(lb);
      var btn = criar('button', { id: 'ra-entrar', type: 'submit' }, 'Entrar');
      form.appendChild(btn);
      var msg = criar('div', { id: 'ra-msg', 'class': 'ra-msg', role: 'alert', 'aria-live': 'polite' }, mensagemInicial || '');
      form.appendChild(msg);
      c.appendChild(form);
      var enviando = false;
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (enviando) return;
        enviando = true; btn.disabled = true; msg.textContent = '';
        var lembrar = chk.checked;
        var r = await chamarAuth('login', { usuario: u.value, senha: s.value, lembrar: lembrar });
        enviando = false; btn.disabled = false;
        if (r && r.ok) {
          aceitarLogin(r, lembrar);
          estado.loginPromise = null;
          fecharOverlay();
          resolve(contexto());
        } else {
          msg.textContent = (r && r.message) || 'Não foi possível entrar.';
          s.value = ''; s.focus();
        }
      });
      setTimeout(function () { try { u.focus(); } catch (e) { /* ignora */ } }, 0);
    });
    return estado.loginPromise;
  }

  function mostrarSemAcesso() {
    var c = cartao('Sem acesso', null);
    c.appendChild(criar('p', { id: 'ra-sem-acesso', 'class': 'ra-sub' }, 'Você não tem acesso a este app. Peça a liberação ao administrador ou entre com outro usuário.'));
    var b = criar('button', { id: 'ra-sair', type: 'button' }, 'Entrar com outro usuário');
    b.addEventListener('click', sair);
    c.appendChild(b);
  }

  // Troca de senha da propria pessoa. obrigatoria = true: sem botao de cancelar.
  function trocarSenhaUI(obrigatoria) {
    return new Promise(function (resolve) {
      var c = cartao('Trocar senha', obrigatoria ? 'Por segurança, escolha uma senha nova antes de continuar. ' + MSG_REGRAS : MSG_REGRAS);
      var form = criar('form', { id: 'ra-form-troca', novalidate: 'novalidate' });
      var a = campo(form, 'Senha atual', 'ra-atual', 'password', 'current-password');
      var n1 = campo(form, 'Senha nova', 'ra-nova', 'password', 'new-password');
      var n2 = campo(form, 'Repita a senha nova', 'ra-nova2', 'password', 'new-password');
      var btn = criar('button', { id: 'ra-trocar', type: 'submit' }, 'Trocar senha');
      form.appendChild(btn);
      if (!obrigatoria) {
        var cancelar = criar('button', { id: 'ra-cancelar-troca', type: 'button', 'class': 'ra-secundario' }, 'Cancelar');
        cancelar.addEventListener('click', function () { fecharOverlay(); resolve(false); });
        form.appendChild(cancelar);
      }
      var msg = criar('div', { id: 'ra-msg-troca', 'class': 'ra-msg', role: 'alert', 'aria-live': 'polite' });
      form.appendChild(msg);
      c.appendChild(form);
      var enviando = false;
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (enviando) return;
        if (n1.value !== n2.value) { msg.textContent = 'As senhas novas não conferem.'; return; }
        enviando = true; btn.disabled = true; msg.textContent = '';
        var r = await chamarAuth('trocar_senha', { atual: a.value, nova: n1.value, lembrar: estado.lembrar });
        enviando = false; btn.disabled = false;
        if (r && r.ok) {
          estado.sessao = r.sessao; estado.expira = r.expira; estado.tokens = {}; estado.pendTokens = {};
          if (estado.usuario) estado.usuario.trocar_senha = false;
          guardar();
          fecharOverlay();
          resolve(true);
        } else {
          msg.textContent = (r && r.message) || 'Não foi possível trocar a senha.';
        }
      });
      setTimeout(function () { try { a.focus(); } catch (e) { /* ignora */ } }, 0);
    });
  }

  global.RuralAuth = RuralAuth;
})(typeof window !== 'undefined' ? window : this);
