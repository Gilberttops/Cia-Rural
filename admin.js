/* Rural Auth - painel do administrador (logica). Usado por admin.html.
 * Depende de rural-auth.js. Todo texto vindo do servidor entra na pagina como TEXTO (textContent), nunca como HTML.
 * A senha provisoria aparece numa janela uma unica vez e e removida da pagina ao fechar. */
(function (global) {
  'use strict';

  var raiz = null;
  var usuarios = [];
  var acessos = [];

  var CSS = [
    // cores e fonte do kit Rural (rural-ui.css); somente tema claro
    '#adm-raiz,.adm-janela{--c-bg:#FAF8F3;--c-card:#fff;--c-fg:#1F2A37;--c-mudo:#6B7280;--c-borda:#E3E1DA;--c-acento:#2060A8;--c-acento-fg:#fff;--c-erro:#B4462E;--c-ok:#289048;--c-titulo:#1F3550}',
    '#adm-raiz{',
    'max-width:1400px;margin:0 auto;padding:18px 16px 48px;color:var(--c-fg);font:15px/1.5 Outfit,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '#adm-raiz *{box-sizing:border-box}',
    '#adm-raiz .adm-topo{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px}',
    '#adm-raiz h1{font-size:1.55rem;font-weight:700;color:var(--c-titulo);margin:0}',
    '#adm-raiz .adm-quem{color:var(--c-mudo);font-size:14px}',
    '#adm-raiz .adm-botoes{display:flex;flex-wrap:wrap;gap:8px}',
    '#adm-raiz button{min-height:38px;padding:7px 14px;font:inherit;font-size:.88rem;font-weight:600;border-radius:9px;border:1px solid var(--c-borda);background:var(--c-card);color:var(--c-fg);cursor:pointer}',
    '#adm-raiz button.adm-primario{background:var(--c-acento);color:var(--c-acento-fg);border-color:var(--c-acento)}',
    '#adm-raiz button.adm-perigo{color:var(--c-erro)}',
    '#adm-raiz button:disabled{opacity:.6;cursor:wait}',
    '#adm-raiz button:focus-visible,#adm-raiz input:focus-visible{outline:2px solid var(--c-acento);outline-offset:2px}',
    '#adm-raiz .adm-abas{display:flex;gap:6px;margin:14px 0 10px}',
    '#adm-raiz .adm-abas button[aria-selected=true]{background:var(--c-acento);color:var(--c-acento-fg);border-color:var(--c-acento)}',
    '#adm-raiz #adm-msg{min-height:22px;margin:6px 0;font-size:14px}',
    '#adm-raiz #adm-msg.adm-erro{color:var(--c-erro)} #adm-raiz #adm-msg.adm-ok{color:var(--c-ok)}',
    '#adm-raiz .adm-rolagem{overflow-x:auto;background:var(--c-card);border:1px solid var(--c-borda);border-radius:10px}',
    '#adm-raiz table{border-collapse:collapse;width:100%;min-width:760px}',
    '#adm-raiz th,#adm-raiz td{padding:9px 10px;text-align:left;border-bottom:1px solid var(--c-borda);vertical-align:top;font-size:14px}',
    '#adm-raiz th{font-size:.68rem;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--c-mudo);border-bottom:2px solid var(--c-titulo)}',
    '#adm-raiz td.adm-acoes{white-space:nowrap} #adm-raiz td.adm-acoes button{min-height:34px;padding:4px 9px;font-size:13px;margin:0 4px 4px 0}',
    '#adm-raiz tr[data-ativo=false] td{opacity:.55}',
    '#adm-raiz .adm-filtro{margin:0 0 10px;min-height:40px;padding:8px 12px;font-size:16px;width:100%;max-width:320px;color:var(--c-fg);background:var(--c-card);border:1px solid var(--c-borda);border-radius:8px}',
    '.adm-fundo{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}',
    '.adm-janela{width:100%;max-width:460px;max-height:100%;overflow:auto;background:var(--c-card,#fff);color:var(--c-fg,#1F2A37);border-radius:14px;padding:20px 22px;font:15px/1.5 Outfit,system-ui,sans-serif}',
    '.adm-janela h2{margin:0 0 10px;font-size:1.15rem;font-weight:600;color:var(--c-titulo)} .adm-janela label{display:block;margin:10px 0 4px;font-size:14px}',
    '.adm-janela input[type=text]{width:100%;min-height:42px;padding:8px 10px;font-size:16px;border:1px solid var(--c-borda,#ccc);border-radius:8px;background:transparent;color:inherit}',
    '.adm-janela .adm-linha-app{display:flex;align-items:center;gap:14px;margin:6px 0} .adm-janela .adm-linha-app span.adm-nome-app{flex:1}',
    '.adm-janela .adm-botoes{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}',
    '.adm-janela button{min-height:40px;padding:8px 14px;font:inherit;font-size:.88rem;font-weight:600;border-radius:8px;border:1px solid var(--c-borda,#ccc);background:transparent;color:inherit;cursor:pointer}',
    '.adm-janela button.adm-primario{background:var(--c-acento,#1f6f43);color:var(--c-acento-fg,#fff);border-color:var(--c-acento,#1f6f43)}',
    '.adm-janela .adm-senha{font:700 20px/1.3 ui-monospace,Menlo,Consolas,monospace;padding:12px;margin:12px 0;border:1px dashed var(--c-borda,#999);border-radius:8px;text-align:center;user-select:all;word-break:break-all}',
    '.adm-janela .adm-aviso{font-size:13px;color:var(--c-mudo,#5b6b61)}'
  ].join('');

  // ---------- utilitarios de DOM ----------
  function h(tag, attrs, texto) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  function mensagem(texto, erro) {
    var m = document.getElementById('adm-msg');
    if (!m) return;
    m.textContent = texto || '';
    m.className = texto ? (erro ? 'adm-erro' : 'adm-ok') : '';
  }

  function nomeDoApp(id) {
    var a = (global.RuralAuth.apps() || []).filter(function (x) { return x.id === id; })[0];
    return a ? a.nome : id;
  }

  function janela(titulo) {
    var fundo = h('div', { 'class': 'adm-fundo', role: 'dialog', 'aria-modal': 'true' });
    var j = h('div', { 'class': 'adm-janela' });
    j.appendChild(h('h2', {}, titulo));
    fundo.appendChild(j);
    document.body.appendChild(fundo);
    return { fundo: fundo, corpo: j, fechar: function () { fundo.remove(); } };
  }

  // Confirmacao propria (testavel). Devolve Promise<boolean>.
  function confirmarPadrao(texto) {
    return new Promise(function (resolve) {
      var w = janela('Confirmar');
      w.corpo.appendChild(h('p', {}, texto));
      var bs = h('div', { 'class': 'adm-botoes' });
      var nao = h('button', { type: 'button', id: 'adm-conf-nao' }, 'Cancelar');
      var sim = h('button', { type: 'button', id: 'adm-conf-sim', 'class': 'adm-primario' }, 'Confirmar');
      nao.addEventListener('click', function () { w.fechar(); resolve(false); });
      sim.addEventListener('click', function () { w.fechar(); resolve(true); });
      bs.appendChild(nao); bs.appendChild(sim); w.corpo.appendChild(bs);
      sim.focus();
    });
  }

  // ---------- montagem ----------
  async function montar(container) {
    raiz = container;
    raiz.textContent = '';
    if (!document.getElementById('adm-css')) { var st = h('style', { id: 'adm-css' }); st.textContent = CSS; document.head.appendChild(st); }
    var eu = global.RuralAuth.usuario();
    var caixa = h('div', { id: 'adm-raiz' });
    raiz.appendChild(caixa);
    if (!eu || !eu.admin) {
      caixa.appendChild(h('h1', {}, 'Acesso restrito'));
      caixa.appendChild(h('p', { id: 'adm-restrito' }, 'Esta página é só para administradores.'));
      return;
    }
    var topo = h('div', { 'class': 'adm-topo' });
    var tit = h('div');
    tit.appendChild(h('h1', {}, 'Acessos Rural'));
    tit.appendChild(h('div', { 'class': 'adm-quem' }, 'Conectado como ' + eu.nome + ' (' + eu.usuario + ')'));
    // logo e faixa da marca, como no topo padrao do kit Rural
    var marca = h('div', { style: 'display:flex;align-items:center;gap:16px' });
    marca.appendChild(h('img', { src: 'logo_rural.png', alt: 'Rural Nutrição Animal 25 anos', style: 'height:52px;width:auto;display:block' }));
    marca.appendChild(h('span', { style: 'width:1px;height:40px;background:#E3E1DA', 'aria-hidden': 'true' }));
    marca.appendChild(tit);
    topo.appendChild(marca);
    var bs = h('div', { 'class': 'adm-botoes' });
    var bSenha = h('button', { type: 'button', id: 'adm-trocar-senha' }, 'Trocar minha senha');
    bSenha.addEventListener('click', function () { global.RuralAuth.trocarSenha(); });
    var bTodas = h('button', { type: 'button', id: 'adm-encerrar-todas', 'class': 'adm-perigo' }, 'Encerrar todas as sessões');
    bTodas.addEventListener('click', encerrarTodas);
    var bSair = h('button', { type: 'button', id: 'adm-sair' }, 'Sair');
    bSair.addEventListener('click', function () { global.RuralAuth.sair(); });
    bs.appendChild(bSenha); bs.appendChild(bTodas); bs.appendChild(bSair);
    topo.appendChild(bs);
    if (document.querySelector('link[href*="rural-ui.css"]')) {
      caixa.appendChild(topo);
      var faixa = h('div', { 'class': 'ru-faixa', 'aria-hidden': 'true' });
      faixa.appendChild(h('span')); faixa.appendChild(h('span')); faixa.appendChild(h('span'));
      topo = faixa; // a faixa entra logo abaixo do topo
    }
    caixa.appendChild(topo);
    caixa.appendChild(h('div', { id: 'adm-msg', role: 'status', 'aria-live': 'polite' }));

    var abas = h('div', { 'class': 'adm-abas', role: 'tablist' });
    var aU = h('button', { type: 'button', id: 'adm-aba-usuarios', role: 'tab', 'aria-selected': 'true' }, 'Usuários');
    var aA = h('button', { type: 'button', id: 'adm-aba-acessos', role: 'tab', 'aria-selected': 'false' }, 'Acessos');
    abas.appendChild(aU); abas.appendChild(aA);
    caixa.appendChild(abas);

    var pU = h('div', { id: 'adm-painel-usuarios' });
    var novo = h('button', { type: 'button', id: 'adm-novo', 'class': 'adm-primario' }, 'Novo usuário');
    novo.addEventListener('click', function () { formulario(null); });
    pU.appendChild(novo);
    var rolU = h('div', { 'class': 'adm-rolagem', style: 'margin-top:10px' });
    var tU = h('table', { id: 'adm-tabela' });
    var cabU = h('tr');
    ['Usuário', 'Nome', 'Apps', 'Pode lançar', 'Vendedor', 'Perfil', 'Situação', 'Último acesso', 'Ações'].forEach(function (c) { cabU.appendChild(h('th', {}, c)); });
    var theadU = h('thead'); theadU.appendChild(cabU); tU.appendChild(theadU); tU.appendChild(h('tbody'));
    rolU.appendChild(tU); pU.appendChild(rolU);
    caixa.appendChild(pU);

    var pA = h('div', { id: 'adm-painel-acessos', hidden: 'hidden' });
    var filtro = h('input', { type: 'text', id: 'adm-filtro', 'class': 'adm-filtro', placeholder: 'Filtrar por usuário', 'aria-label': 'Filtrar por usuário' });
    filtro.addEventListener('input', desenharAcessos);
    pA.appendChild(filtro);
    var rolA = h('div', { 'class': 'adm-rolagem' });
    var tA = h('table', { id: 'adm-acessos' });
    var cabA = h('tr');
    ['Data e hora', 'Usuário', 'Ação', 'Resultado', 'App'].forEach(function (c) { cabA.appendChild(h('th', {}, c)); });
    var theadA = h('thead'); theadA.appendChild(cabA); tA.appendChild(theadA); tA.appendChild(h('tbody'));
    rolA.appendChild(tA); pA.appendChild(rolA);
    caixa.appendChild(pA);

    function trocarAba(qual) {
      pU.hidden = qual !== 'usuarios'; pA.hidden = qual !== 'acessos';
      aU.setAttribute('aria-selected', String(qual === 'usuarios')); aA.setAttribute('aria-selected', String(qual === 'acessos'));
    }
    aU.addEventListener('click', function () { trocarAba('usuarios'); });
    aA.addEventListener('click', function () { trocarAba('acessos'); carregarAcessos(); });

    await carregarUsuarios();
  }

  // ---------- usuarios ----------
  async function carregarUsuarios() {
    var r = await global.RuralAuth.pedirAuth('usuarios_listar', {});
    if (!r.ok) { mensagem(r.message || 'Não foi possível carregar os usuários.', true); return; }
    usuarios = r.usuarios;
    desenharUsuarios();
  }

  function botaoAcao(acao, texto, classe, usuario) {
    var b = h('button', { type: 'button', 'data-acao': acao, 'class': classe || '' }, texto);
    b.addEventListener('click', function () { executar(acao, usuario); });
    return b;
  }

  function desenharUsuarios() {
    var tb = document.querySelector('#adm-tabela tbody');
    if (!tb) return;
    tb.textContent = '';
    usuarios.forEach(function (u) {
      var tr = h('tr', { 'data-usuario': u.usuario, 'data-ativo': String(u.ativo) });
      [u.usuario, u.nome, u.apps.map(nomeDoApp).join(', ') || '—', u.apps_lancar.map(nomeDoApp).join(', ') || '—', u.vendedor || '—',
        u.admin ? 'Administrador' : (u.vendas_tudo ? 'Comum + vê tudo no Vendas' : 'Comum'), u.ativo ? 'Ativo' : 'Inativo', u.ultimo_acesso || '—'].forEach(function (t) { tr.appendChild(h('td', {}, t)); });
      var ac = h('td', { 'class': 'adm-acoes' });
      ac.appendChild(botaoAcao('editar', 'Editar', '', u.usuario));
      ac.appendChild(botaoAcao(u.ativo ? 'desativar' : 'ativar', u.ativo ? 'Desativar' : 'Reativar', u.ativo ? 'adm-perigo' : '', u.usuario));
      ac.appendChild(botaoAcao('resetar', 'Resetar senha', '', u.usuario));
      ac.appendChild(botaoAcao('encerrar', 'Encerrar sessões', '', u.usuario));
      tr.appendChild(ac);
      tb.appendChild(tr);
    });
  }

  async function executar(acao, usuario) {
    var u = usuarios.filter(function (x) { return x.usuario === usuario; })[0];
    if (!u) return;
    if (acao === 'editar') { formulario(u); return; }
    var r;
    if (acao === 'desativar') {
      if (!(await A._confirmar('Desativar "' + usuario + '"? A pessoa perde o acesso agora e não consegue entrar.'))) return;
      r = await global.RuralAuth.pedirAuth('usuario_desativar', { usuario: usuario, ativo: false });
      mensagem(r.ok ? 'Usuário desativado.' : r.message, !r.ok);
    } else if (acao === 'ativar') {
      r = await global.RuralAuth.pedirAuth('usuario_desativar', { usuario: usuario, ativo: true });
      mensagem(r.ok ? 'Usuário reativado.' : r.message, !r.ok);
    } else if (acao === 'resetar') {
      if (!(await A._confirmar('Resetar a senha de "' + usuario + '"? A senha atual deixa de valer e uma provisória será mostrada uma vez.'))) return;
      r = await global.RuralAuth.pedirAuth('usuario_resetar_senha', { usuario: usuario });
      if (r.ok) { mensagem('', false); mostrarSenha(usuario, r.senha_provisoria); } else mensagem(r.message, true);
    } else if (acao === 'encerrar') {
      if (!(await A._confirmar('Encerrar as sessões de "' + usuario + '"? A pessoa precisará entrar de novo.'))) return;
      r = await global.RuralAuth.pedirAuth('encerrar_sessoes', { usuario: usuario });
      mensagem(r.ok ? 'Sessões encerradas.' : r.message, !r.ok);
    }
    await carregarUsuarios();
  }

  async function encerrarTodas() {
    if (!(await A._confirmar('Encerrar as sessões de TODAS as pessoas, inclusive a sua? Todos precisarão entrar de novo.'))) return;
    var r = await global.RuralAuth.pedirAuth('encerrar_sessoes', {});
    mensagem(r.ok ? 'Todas as sessões foram encerradas.' : r.message, !r.ok);
    await carregarUsuarios();
  }

  // ---------- formulario de criar / editar ----------
  function formulario(u) {
    var w = janela(u ? 'Editar ' + u.usuario : 'Novo usuário');
    var f = h('form', { id: 'adm-form', novalidate: 'novalidate' });
    f.appendChild(h('label', { 'for': 'adm-f-usuario' }, 'Usuário (sem espaço nem acento)'));
    var iu = h('input', { type: 'text', id: 'adm-f-usuario', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    if (u) { iu.value = u.usuario; iu.disabled = true; }
    f.appendChild(iu);
    f.appendChild(h('label', { 'for': 'adm-f-nome' }, 'Nome'));
    var inome = h('input', { type: 'text', id: 'adm-f-nome', autocomplete: 'off' }); if (u) inome.value = u.nome; f.appendChild(inome);
    f.appendChild(h('label', { 'for': 'adm-f-vendedor' }, 'Código do vendedor (só para o app Vendas)'));
    var iv = h('input', { type: 'text', id: 'adm-f-vendedor', autocomplete: 'off' }); if (u) iv.value = u.vendedor; f.appendChild(iv);

    var lbAdm = h('label', { 'class': 'adm-linha-app' });
    var cAdm = h('input', { type: 'checkbox', id: 'adm-f-admin' }); cAdm.checked = !!(u && u.admin);
    lbAdm.appendChild(cAdm); lbAdm.appendChild(h('span', { 'class': 'adm-nome-app' }, 'Administrador (vê todos os apps e gerencia usuários)'));
    f.appendChild(lbAdm);
    var lbVT = h('label', { 'class': 'adm-linha-app' });
    var cVT = h('input', { type: 'checkbox', id: 'adm-f-vendas-tudo' }); cVT.checked = !!(u && u.vendas_tudo);
    lbVT.appendChild(cVT); lbVT.appendChild(h('span', { 'class': 'adm-nome-app' }, 'Vendas: vê todas as vendas e a margem (sem ser administrador)'));
    f.appendChild(lbVT);

    f.appendChild(h('div', { 'class': 'adm-aviso' }, 'Apps que a pessoa vê, e onde ela também pode lançar dados:'));
    (global.RuralAuth.apps() || []).forEach(function (a) {
      var linha = h('div', { 'class': 'adm-linha-app' });
      var lv = h('label', { 'class': 'adm-linha-app', style: 'margin:0;flex:1' });
      var cv = h('input', { type: 'checkbox', id: 'adm-app-' + a.id }); cv.checked = !!(u && u.apps.indexOf(a.id) >= 0);
      lv.appendChild(cv); lv.appendChild(h('span', { 'class': 'adm-nome-app' }, a.nome));
      var ll = h('label', { 'class': 'adm-linha-app', style: 'margin:0' });
      var cl = h('input', { type: 'checkbox', id: 'adm-lan-' + a.id }); cl.checked = !!(u && u.apps_lancar.indexOf(a.id) >= 0);
      ll.appendChild(cl); ll.appendChild(h('span', {}, 'pode lançar'));
      cv.addEventListener('change', function () { if (!cv.checked) cl.checked = false; });
      cl.addEventListener('change', function () { if (cl.checked) cv.checked = true; });
      linha.appendChild(lv); linha.appendChild(ll); f.appendChild(linha);
    });

    var erro = h('div', { id: 'adm-f-erro', role: 'alert', style: 'color:var(--c-erro,#b3261e);min-height:20px;margin-top:8px;font-size:14px' });
    f.appendChild(erro);
    var bs = h('div', { 'class': 'adm-botoes' });
    var cancelar = h('button', { type: 'button', id: 'adm-cancelar' }, 'Cancelar');
    cancelar.addEventListener('click', w.fechar);
    var salvar = h('button', { type: 'submit', id: 'adm-salvar', 'class': 'adm-primario' }, 'Salvar');
    bs.appendChild(cancelar); bs.appendChild(salvar); f.appendChild(bs);
    w.corpo.appendChild(f);

    var enviando = false;
    f.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if (enviando) return;
      var apps = [], lancar = [];
      (global.RuralAuth.apps() || []).forEach(function (a) {
        if (document.getElementById('adm-app-' + a.id).checked) apps.push(a.id);
        if (document.getElementById('adm-lan-' + a.id).checked) lancar.push(a.id);
      });
      var corpo = { usuario: iu.value, nome: inome.value, vendedor: iv.value, admin: cAdm.checked, vendas_tudo: cVT.checked, apps: apps, apps_lancar: lancar };
      enviando = true; salvar.disabled = true; erro.textContent = '';
      var r = await global.RuralAuth.pedirAuth(u ? 'usuario_editar' : 'usuario_criar', corpo);
      enviando = false; salvar.disabled = false;
      if (!r.ok) { erro.textContent = r.message || 'Não foi possível salvar.'; return; }
      w.fechar();
      if (!u) { mensagem('', false); mostrarSenha(String(iu.value).trim().toLowerCase(), r.senha_provisoria); }
      else mensagem('Usuário atualizado.', false);
      await carregarUsuarios();
    });
    setTimeout(function () { try { (u ? inome : iu).focus(); } catch (e) { /* ignora */ } }, 0);
  }

  // A senha so existe nesta janela; ao fechar, sai da pagina.
  function mostrarSenha(usuario, senha) {
    var w = janela('Senha provisória');
    w.fundo.id = 'adm-senha-prov';
    w.corpo.appendChild(h('p', {}, 'Senha provisória de "' + usuario + '":'));
    w.corpo.appendChild(h('div', { id: 'adm-senha-valor', 'class': 'adm-senha' }, senha));
    w.corpo.appendChild(h('p', { 'class': 'adm-aviso' }, 'Anote ou copie agora: ela não será mostrada de novo. A pessoa troca por uma senha dela no primeiro acesso.'));
    var bs = h('div', { 'class': 'adm-botoes' });
    var copiar = h('button', { type: 'button', id: 'adm-copiar' }, 'Copiar');
    copiar.addEventListener('click', function () {
      try { navigator.clipboard.writeText(senha).then(function () { copiar.textContent = 'Copiada'; }, function () { copiar.textContent = 'Selecione e copie'; }); } catch (e) { copiar.textContent = 'Selecione e copie'; }
    });
    var fechar = h('button', { type: 'button', id: 'adm-fechar-senha', 'class': 'adm-primario' }, 'Fechar');
    fechar.addEventListener('click', function () { w.fechar(); });
    bs.appendChild(copiar); bs.appendChild(fechar); w.corpo.appendChild(bs);
  }

  // ---------- acessos ----------
  async function carregarAcessos() {
    var r = await global.RuralAuth.pedirAuth('acessos_listar', { limite: 300 });
    if (!r.ok) { mensagem(r.message || 'Não foi possível carregar os acessos.', true); return; }
    acessos = r.acessos;
    desenharAcessos();
  }

  function desenharAcessos() {
    var tb = document.querySelector('#adm-acessos tbody');
    if (!tb) return;
    var f = String((document.getElementById('adm-filtro') || {}).value || '').trim().toLowerCase();
    tb.textContent = '';
    acessos.filter(function (a) { return !f || String(a.usuario).toLowerCase().indexOf(f) >= 0; }).forEach(function (a) {
      var tr = h('tr');
      [a.data_hora, a.usuario, a.acao, a.resultado, a.app || '—'].forEach(function (t) { tr.appendChild(h('td', {}, String(t))); });
      tb.appendChild(tr);
    });
  }

  var A = { montar: montar, _confirmar: confirmarPadrao };
  global.RuralAdmin = A;
})(typeof window !== 'undefined' ? window : this);
