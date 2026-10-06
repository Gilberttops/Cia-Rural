/* KIT RURAL (rural-ui.js) - topo padrao dos apps: logo, nome do app, data, usuario, menu dos apps liberados e Sair.
 * Uso: RuralUI.topo(elemento, { app: 'consorcios', titulo: 'Consórcios', sub: 'extrato de 06/10/2026',
 *                              usuario: {nome}, apps: RuralAuth.apps(), admin: true|false, aoSair: fn, acoes: [botoes] })
 * Todo texto entra como TEXTO (textContent). */
(function (global) {
  'use strict';

  // Arquivo de cada app no site (usado quando a aba Apps do Rural Auth ainda nao tem a url preenchida).
  var ARQUIVOS = {
    vendas: 'vendas.html', compras: 'compras.html', fluxo: 'fluxo_de_caixa.html', ypoti: 'controle_ypoti.html',
    exportacao: 'controle_exportacao.html', consorcios: 'consorcios.html', producao: 'producao_rural.html',
    parcelamentos: 'parcelamentos.html', dre: 'dre.html'
  };

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  function topo(alvo, o) {
    o = o || {};
    var raiz = el('header', { 'class': 'ru-topo' });
    var marca = el('div', { 'class': 'ru-topo-marca' });
    marca.appendChild(el('img', { src: o.logo || 'logo_rural.png', alt: 'Rural Nutrição Animal 25 anos' }));
    marca.appendChild(el('span', { 'class': 'ru-sep', 'aria-hidden': 'true' }));
    var tit = el('div');
    tit.appendChild(el('h1', {}, o.titulo || ''));
    var sub = el('div', { 'class': 'ru-sub' }, o.sub || '');
    tit.appendChild(sub);
    marca.appendChild(tit);
    raiz.appendChild(marca);

    var acoes = el('div', { 'class': 'ru-topo-acoes' });
    (o.acoes || []).forEach(function (b) { if (b) acoes.appendChild(b); });
    var apps = (o.apps || []).filter(function (a) { return a.id !== o.app; });
    if (apps.length || o.admin) {
      var menu = el('details', { 'class': 'ru-menu' });
      menu.appendChild(el('summary', { 'class': 'ru-btn', 'aria-label': 'Outros apps' }, 'Apps ▾'));
      var nav = el('nav', { 'aria-label': 'Apps liberados' });
      nav.appendChild(el('a', { href: 'index.html' }, 'Início'));
      apps.forEach(function (a) { nav.appendChild(el('a', { href: a.url || ARQUIVOS[a.id] || (a.id + '.html') }, a.nome || a.id)); });
      if (o.admin) nav.appendChild(el('a', { href: 'admin.html' }, 'Acessos (administração)'));
      menu.appendChild(nav);
      document.addEventListener('click', function (e) { if (!menu.contains(e.target)) menu.removeAttribute('open'); });
      acoes.appendChild(menu);
    }
    if (o.usuario && o.usuario.nome) acoes.appendChild(el('span', { 'class': 'ru-usuario' }, o.usuario.nome));
    if (o.aoSair) {
      var sair = el('button', { type: 'button', 'class': 'ru-btn' }, 'Sair');
      sair.addEventListener('click', o.aoSair);
      acoes.appendChild(sair);
    }
    raiz.appendChild(acoes);

    var faixa = el('div', { 'class': 'ru-faixa', 'aria-hidden': 'true' });
    faixa.appendChild(el('span')); faixa.appendChild(el('span')); faixa.appendChild(el('span'));

    alvo.appendChild(raiz);
    alvo.appendChild(faixa);
    return { topo: raiz, sub: sub, acoes: acoes };
  }

  global.RuralUI = { topo: topo, el: el, ARQUIVOS: ARQUIVOS };
})(typeof window !== 'undefined' ? window : this);
