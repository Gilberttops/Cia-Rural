/* Consorcios - logica da pagina (usada por consorcios.html).
 * Os dados vem da planilha pelo script de dados (acao "dados"), sempre com login (RuralAuth).
 * Nada de dados dentro do HTML. Todo texto entra na pagina como TEXTO (textContent). */
(function (global) {
  'use strict';

  // ---------- formatos ----------
  var moeda = function (v) { return (v === null || v === undefined || isNaN(v)) ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num2 = function (v) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pct = function (v) { return (v === null || v === undefined || isNaN(v)) ? '—' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; };
  var dataBR = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—'; };
  var curta = function (empresa) { return /^R N A/.test(empresa || '') ? 'RNA' : 'Rural'; };

  function diasAte(deISO, ateISO) {
    var a = Date.UTC(+deISO.slice(0, 4), +deISO.slice(5, 7) - 1, +deISO.slice(8, 10));
    var b = Date.UTC(+ateISO.slice(0, 4), +ateISO.slice(5, 7) - 1, +ateISO.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  function somaMeses(iso, n) {
    var a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10);
    var ano = a + Math.floor(m / 12), mes = ((m % 12) + 12) % 12;
    var ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return ano + '-' + ('0' + (mes + 1)).slice(-2) + '-' + ('0' + Math.min(d, ultimo)).slice(-2);
  }

  function hojeLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // "1.515,51" -> 1515.51 ; "1.067" -> 1067 ; "658,53" -> 658.53 ; "20000" -> 20000
  function lerValorBR(s) {
    var t = String(s === null || s === undefined ? '' : s).replace(/R\$|\s/g, '');
    if (!t || !/^[\d.,]+$/.test(t)) return NaN;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  // ---------- calculos (sem tela) ----------
  // Lancamento manual so conta se for posterior a ultima parcela do extrato (depois disso o extrato seguinte ja o inclui).
  function calcular(dados, hoje) {
    var linhas = dados.base.map(function (b) {
      var chave = b.grupo + '|' + b.cota;
      var manuais = (dados.lancamentos || []).filter(function (l) { return l.chave === chave && l.data > (b.data_ultima_parcela || ''); });
      var parcelas = manuais.filter(function (l) { return l.tipo === 'parcela'; });
      var extra = manuais.reduce(function (s, l) { return s + l.valor; }, 0);
      var restantes = Math.max(0, (b.parcelas_restantes || 0) - parcelas.length);
      var proximo = b.data_proxima ? somaMeses(b.data_proxima, parcelas.length) : null;
      if (restantes === 0) proximo = null;
      var dias = proximo ? diasAte(hoje, proximo) : null;
      var status = proximo === null ? 'quitado' : dias < 0 ? 'vencida' : dias <= 7 ? 'a_vencer' : 'ok';
      var ultimo = manuais.length ? manuais.reduce(function (a, l) { return l.data > a.data ? l : a; }) : null;
      return Object.assign({}, b, {
        chave: chave, manuais: manuais.length, parcelas_restantes: restantes,
        parcelas_quitadas: (b.parcelas_quitadas || 0) + parcelas.length,
        total_pago: (b.total_pago || 0) + extra, total_apagar: Math.max(0, (b.total_apagar || 0) - extra),
        data_ultima: ultimo ? ultimo.data : b.data_ultima_parcela, valor_ultima: ultimo ? ultimo.valor : b.valor_ultima_parcela,
        proximo_venc: proximo, dias: dias, status: status
      });
    });
    var soma = function (arr, k) { return arr.reduce(function (s, x) { return s + (x[k] || 0); }, 0); };
    var ativos = linhas.filter(function (l) { return l.parcelas_restantes > 0; });
    var credito = linhas.filter(function (l) { return l.contemplado && !(l.credito_usado > 0); }).map(function (l) {
      return { grupo: l.grupo, cota: l.cota, bem: l.bem, banco: l.banco, empresa: l.empresa, forma: l.forma_contemp, data_contemp: l.data_contemp,
        credito: l.credito_disponivel || l.valor_credito || 0, dias: l.data_contemp ? diasAte(l.data_contemp, hoje) : null };
    });
    var mes0 = hoje.slice(0, 7) + '-01';
    var curva = [];
    for (var i = 0; i < 24; i++) {
      curva.push({ mes: somaMeses(mes0, i).slice(0, 7), valor: ativos.reduce(function (s, l) { return s + (l.parcelas_restantes > i ? (l.valor_proxima || 0) : 0); }, 0) });
    }
    var custo = linhas.map(function (l) {
      var total = (l.total_pago || 0) + (l.total_apagar || 0) - (l.valor_bem || 0);
      return { grupo: l.grupo, cota: l.cota, bem: l.bem, banco: l.banco, taxa: (l.taxa_adm || 0) + (l.fundo_reserva || 0),
        valor_bem: l.valor_bem, custo_total: total, custo_pct: l.valor_bem ? total / l.valor_bem : 0 };
    }).sort(function (a, b) { return b.custo_pct - a.custo_pct; });
    var agrupar = function (campo) {
      var out = {};
      linhas.forEach(function (l) { var k = l[campo]; out[k] = out[k] || { pago: 0, apagar: 0 }; out[k].pago += l.total_pago; out[k].apagar += l.total_apagar; });
      return out;
    };
    return {
      linhas: linhas, credito: credito, curva: curva, custo: custo, porBanco: agrupar('banco'), porEmpresa: agrupar('empresa'),
      kpis: {
        cotas: linhas.length, contempladas: linhas.filter(function (l) { return l.contemplado; }).length,
        parcela_mes: soma(ativos, 'valor_proxima'), total_pago: soma(linhas, 'total_pago'), total_apagar: soma(linhas, 'total_apagar'),
        valor_bens: soma(linhas, 'valor_bem'), credito_parado: soma(credito, 'credito'),
        vencidas: linhas.filter(function (l) { return l.status === 'vencida'; }).length,
        a_vencer: linhas.filter(function (l) { return l.status === 'a_vencer'; }).length,
        desembolso12: curva.slice(0, 12).reduce(function (s, c) { return s + c.valor; }, 0)
      }
    };
  }

  // ---------- DOM ----------
  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }
  function add(pai) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) pai.appendChild(arguments[i]); return pai; }
  function tabela(id, titulos) {
    var t = el('table', { id: id, 'class': 'ru-tabela' }), tr = el('tr');
    titulos.forEach(function (x) { tr.appendChild(el('th', typeof x === 'object' ? { 'class': x.cls } : {}, typeof x === 'object' ? x.t : x)); });
    add(t, add(el('thead'), tr), el('tbody'));
    return t;
  }
  function td(texto, cls) { return el('td', cls ? { 'class': cls } : {}, texto); }

  // O visual vem do kit Rural (rural-ui.css). Aqui so o que e proprio do Consorcios.
  var CSS = '#cs-app .ru-tabela td .ru-barra{margin-bottom:3px}';

  var TAG_STATUS = { vencida: 'alerta', a_vencer: 'atencao', ok: 'ok', quitado: 'info' };
  var E = { raiz: null, op: null, dados: null, calc: null, empresa: 'todas', banco: 'todos', graficos: [] };

  function janela(titulo, id) {
    var f = el('div', { 'class': 'ru-fundo', role: 'dialog', 'aria-modal': 'true' });
    var j = el('div', { 'class': 'ru-janela', id: id || null });
    add(f, add(j, el('h2', {}, titulo)));
    f.addEventListener('click', function (e) { if (e.target === f) f.remove(); });
    document.body.appendChild(f);
    return { fundo: f, corpo: j, fechar: function () { f.remove(); } };
  }

  function confirmarPadrao(texto) {
    return new Promise(function (resolve) {
      var w = janela('Confirmar');
      add(w.corpo, el('p', {}, texto));
      var bts = el('div', { 'class': 'ru-bts' }), nao = el('button', { type: 'button', 'class': 'ru-btn' }, 'Cancelar'), sim = el('button', { type: 'button', 'class': 'ru-btn prim' }, 'Confirmar');
      nao.onclick = function () { w.fechar(); resolve(false); };
      sim.onclick = function () { w.fechar(); resolve(true); };
      add(w.corpo, add(bts, nao, sim));
    });
  }

  function chamar(corpo) { return E.op.chamar(corpo); }

  async function montar(raiz, opcoes) {
    E.raiz = raiz;
    E.mostrarConferidos = false;
    E.op = Object.assign({ hoje: hojeLocal(), semGraficos: false }, opcoes || {});
    if (!E.op.chamar) E.op.chamar = function (corpo) { return global.RuralAuth.chamar('consorcios', E.op.url, corpo); };
    if (!document.getElementById('cs-css')) { var st = el('style', { id: 'cs-css' }); st.textContent = CSS; document.head.appendChild(st); }
    raiz.textContent = '';
    raiz.appendChild(el('div', { id: 'cs-app', 'class': 'ru-pagina' }, 'Carregando os consórcios…'));
    await carregar();
  }

  async function carregar() {
    var r;
    try { r = await chamar({ acao: 'dados' }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    var app = E.raiz.querySelector('#cs-app');
    if (r && r.ok && !Array.isArray(r.base)) r = { ok: false, message: 'O servidor respondeu fora do esperado. Recarregue a página em instantes.' };
    if (!r || !r.ok) {
      app.textContent = '';
      add(app, el('p', { 'class': 'ru-erro' }, (r && r.message) || 'Não foi possível carregar os dados.'));
      return;
    }
    E.dados = r;
    desenhar();
  }

  function filtrados() {
    var base = E.dados.base.filter(function (b) {
      return (E.empresa === 'todas' || b.empresa === E.empresa) && (E.banco === 'todos' || b.banco === E.banco);
    });
    var chaves = base.map(function (b) { return b.grupo + '|' + b.cota; });
    return { base: base, historico: E.dados.historico, lancamentos: E.dados.lancamentos.filter(function (l) { return chaves.indexOf(l.chave) >= 0; }) };
  }

  function desenhar() {
    E.calc = calcular(filtrados(), E.op.hoje);
    var c = E.calc, k = c.kpis, d = E.dados;
    var app = E.raiz.querySelector('#cs-app');
    app.textContent = '';
    E.graficos.forEach(function (g) { try { g.destroy(); } catch (e) { /* ignora */ } });
    E.graficos = [];

    // topo padrao do kit Rural (logo, nome do app, usuario, menu dos apps, Sair)
    var bl = null;
    if (d.pode_lancar) { bl = el('button', { type: 'button', id: 'cs-btn-lancar', 'class': 'ru-btn prim' }, '+ Lançar pagamento'); bl.onclick = function () { formulario(); }; }
    var usuario = E.op.usuario && E.op.usuario.nome ? E.op.usuario : (d.usuario ? { nome: d.usuario } : null);
    var sub = 'Rural e RNA · extrato de ' + dataBR(d.base[0] && d.base[0].extrato_de);
    if (global.RuralUI) {
      global.RuralUI.topo(app, { app: 'consorcios', titulo: 'Consórcios', sub: sub, logo: E.op.logo, usuario: usuario,
        apps: E.op.apps || [], admin: !!(E.op.usuario && E.op.usuario.admin), aoSair: E.op.aoSair, acoes: [bl] });
    } else {
      add(app, el('h1', {}, 'Consórcios'), el('div', { 'class': 'ru-sub' }, sub + (usuario ? ' · ' + usuario.nome : '')), bl);
    }

    // filtros
    var filtros = el('div', { 'class': 'ru-filtros' });
    var se = el('select', { id: 'cs-filtro-empresa', 'aria-label': 'Empresa' });
    [['todas', 'Todas as empresas']].concat(unicos(d.base, 'empresa').map(function (x) { return [x, x]; })).forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (o[0] === E.empresa) op.selected = true; se.appendChild(op); });
    se.onchange = function () { E.empresa = se.value; desenhar(); };
    var sb = el('select', { id: 'cs-filtro-banco', 'aria-label': 'Banco' });
    [['todos', 'Todos os bancos']].concat(unicos(d.base, 'banco').map(function (x) { return [x, x]; })).forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (o[0] === E.banco) op.selected = true; sb.appendChild(op); });
    sb.onchange = function () { E.banco = sb.value; desenhar(); };
    add(app, add(filtros, se, sb));

    // indicadores
    var kp = el('div', { 'class': 'ru-kpis', id: 'cs-kpis' });
    [
      ['Cotas ativas', String(k.cotas), k.contempladas + ' contemplada(s)'],
      ['Parcela do mês', moeda(k.parcela_mes), 'soma das próximas parcelas'],
      ['Desembolso 12 meses', moeda(k.desembolso12), 'se nada for antecipado'],
      ['Total a pagar', moeda(k.total_apagar), 'pago até hoje: ' + moeda(k.total_pago), 'neutro'],
      ['Crédito contemplado parado', moeda(k.credito_parado), c.credito.length + ' carta(s) sem uso', k.credito_parado > 0 ? 'alerta' : 'bom'],
      ['Parcelas vencidas', String(k.vencidas), k.a_vencer + ' vencem em até 7 dias', k.vencidas > 0 ? 'alerta' : 'bom']
    ].forEach(function (x) { add(kp, add(el('div', { 'class': 'ru-kpi ' + (x[3] || '') }), el('div', { 'class': 'r' }, x[0]), el('div', { 'class': 'v' }, x[1]), el('div', { 'class': 's' }, x[2]))); });
    app.appendChild(kp);

    // graficos
    var podeGrafico = !E.op.semGraficos && typeof global.Chart !== 'undefined';
    if (podeGrafico) {
      var grade = el('div', { 'class': 'ru-grade' });
      var g1 = cardGrafico('Desembolso previsto, próximos 24 meses', 'cs-g-curva');
      var g2 = cardGrafico('A pagar por banco', 'cs-g-banco');
      var g3 = cardGrafico('Pago × a pagar, por empresa', 'cs-g-empresa');
      add(app, add(grade, g1.card, g2.card, g3.card));
      graficos(g1.canvas, g2.canvas, g3.canvas);
    }

    // tabela das cotas
    var card = el('div', { 'class': 'ru-card' });
    add(card, el('h2', {}, 'Cotas'), el('div', { 'class': 'ru-nota' }, 'Clique numa cota para ver os pagamentos. Linha verde = contemplada. Vencimento real do extrato; lançamentos feitos aqui contam até o próximo extrato.'));
    var t = tabela('cs-tabela', ['Empresa', 'Banco', 'Grupo/Cota', 'Bem', { t: 'Valor do bem', cls: 'n' }, 'Parcelas', 'Contemplada', { t: 'Total pago', cls: 'n' }, { t: 'A pagar', cls: 'n' }, 'Próximo vencimento', 'Termina em']);
    var tb = t.querySelector('tbody');
    c.linhas.slice().sort(function (a, b) { return (a.empresa + a.banco + a.grupo + a.cota).localeCompare(b.empresa + b.banco + b.grupo + b.cota); }).forEach(function (l) {
      var tr = el('tr', { 'data-chave': l.chave, 'class': 'clicavel' + (l.contemplado ? ' destaque' : '') });
      var barra = el('div', { 'class': 'ru-barra' }), cheio = el('div'); cheio.style.width = Math.round((l.parcelas_quitadas / (l.prazo_efetivo || l.prazo || 1)) * 100) + '%'; barra.appendChild(cheio);
      var parc = el('td'); add(parc, barra, el('div', { 'class': 'ru-sub' }, l.parcelas_quitadas + '/' + (l.prazo_efetivo || l.prazo) + (l.manuais ? ' · ' + l.manuais + ' lançada(s) aqui' : '')));
      var venc = el('td'); venc.appendChild(document.createTextNode(dataBR(l.proximo_venc) + ' '));
      venc.appendChild(el('span', { 'class': 'ru-tag ' + TAG_STATUS[l.status] }, l.status === 'vencida' ? 'vencida há ' + (-l.dias) + 'd' : l.status === 'quitado' ? 'quitado' : 'em ' + l.dias + 'd'));
      add(tr, td(curta(l.empresa)), td(l.banco), td(l.grupo + ' / ' + l.cota), td(l.bem, 'quebra'), td(moeda(l.valor_bem), 'n'), parc,
        add(el('td'), el('span', { 'class': 'ru-tag ' + (l.contemplado ? 'ok' : '') }, l.contemplado ? 'Sim · ' + (l.forma_contemp || '') : 'não')),
        td(moeda(l.total_pago), 'n'), td(moeda(l.total_apagar), 'n'), venc, td(dataBR(l.data_encerramento)));
      tr.onclick = function () { detalhe(l); };
      tb.appendChild(tr);
    });
    add(app, add(card, add(el('div', { 'class': 'ru-rolagem' }), t)));

    // credito parado + custo
    var cc = el('div', { 'class': 'ru-card' });
    add(cc, el('h2', {}, 'Crédito contemplado sem uso'), el('div', { 'class': 'ru-nota' }, 'Carta de crédito liberada e ainda não usada: a parcela continua sendo paga sem o bem.'));
    var tc = tabela('cs-credito', ['Cota', 'Bem', 'Contemplação', { t: 'Crédito hoje', cls: 'n' }, { t: 'Dias parado', cls: 'n' }]);
    c.credito.forEach(function (x) { add(tc.querySelector('tbody'), add(el('tr'), td(x.grupo + ' / ' + x.cota), td(x.bem, 'quebra'), td(dataBR(x.data_contemp) + ' · ' + (x.forma || '')), td(moeda(x.credito), 'n'), td(x.dias === null ? '—' : String(x.dias), 'n'))); });
    add(cc, add(el('div', { 'class': 'ru-rolagem' }), tc));
    var ck = el('div', { 'class': 'ru-card' });
    add(ck, el('h2', {}, 'Custo de cada cota'), el('div', { 'class': 'ru-nota' }, 'Custo = total pago + a pagar − valor do bem (taxa de administração e fundo de reserva). Da mais cara para a mais barata.'));
    var tk = tabela('cs-custo', ['Cota', 'Bem', { t: 'Taxa + FR', cls: 'n' }, { t: 'Custo total', cls: 'n' }, { t: '% do bem', cls: 'n' }]);
    c.custo.forEach(function (x) { add(tk.querySelector('tbody'), add(el('tr'), td(x.grupo + ' / ' + x.cota), td(x.bem, 'quebra'), td(pct(x.taxa), 'n'), td(moeda(x.custo_total), 'n'), td(pct(x.custo_pct), 'n'))); });
    add(ck, add(el('div', { 'class': 'ru-rolagem' }), tk));
    add(app, cc, ck);

    // lancamentos: por padrao so os "a conferir" (os ja cobertos pelo extrato nao somam e ficam escondidos)
    var cl = el('div', { 'class': 'ru-card' });
    var coberto = function (x) {
      var b = d.base.filter(function (bb) { return bb.grupo + '|' + bb.cota === x.chave; })[0];
      return !!(b && x.data <= (b.data_ultima_parcela || ''));
    };
    var nConferidos = d.lancamentos.filter(coberto).length;
    var cabL = el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px' });
    add(cabL, el('h2', {}, 'Pagamentos lançados aqui'));
    if (nConferidos) {
      var bc = el('button', { type: 'button', id: 'cs-mostrar-conferidos', 'class': 'ru-btn' },
        (E.mostrarConferidos ? 'Esconder' : 'Mostrar') + ' os já conferidos no extrato (' + nConferidos + ')');
      bc.onclick = function () { E.mostrarConferidos = !E.mostrarConferidos; desenhar(); };
      cabL.appendChild(bc);
    }
    add(cl, cabL, el('div', { 'class': 'ru-nota' }, '"A conferir" = lançado aqui e ainda não apareceu no extrato: soma nos números até o próximo extrato. "No extrato" = o extrato importado já inclui o pagamento (não soma de novo); fica guardado na planilha como histórico.'));
    var titulos = ['Data', 'Cota', 'Tipo', { t: 'Valor', cls: 'n' }, 'Observação', 'Lançado por', 'Situação'];
    if (d.pode_lancar) titulos.push('');
    var tl = tabela('cs-lancamentos', titulos);
    var visiveis = d.lancamentos.filter(function (x) { return E.mostrarConferidos || !coberto(x); });
    visiveis.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).forEach(function (x) {
      var b = d.base.filter(function (bb) { return bb.grupo + '|' + bb.cota === x.chave; })[0];
      var noExtrato = coberto(x);
      var tr = add(el('tr'), td(dataBR(x.data)), td(x.grupo + ' / ' + x.cota + (b ? ' · ' + b.bem : '')), td(x.tipo), td(moeda(x.valor), 'n'), td(x.obs), td(x.por || '—'),
        add(el('td'), el('span', { 'class': 'ru-tag ' + (noExtrato ? 'ok' : 'atencao') }, noExtrato ? 'no extrato' : 'a conferir')));
      if (d.pode_lancar) {
        var bx = el('button', { type: 'button', 'class': 'ru-btn x', 'data-excluir': x.id, title: 'Excluir lançamento', 'aria-label': 'Excluir lançamento ' + x.id }, '✕');
        bx.onclick = function () { excluir(x); };
        add(tr, add(el('td'), bx));
      }
      tl.querySelector('tbody').appendChild(tr);
    });
    add(app, add(cl, add(el('div', { 'class': 'ru-rolagem' }), tl)));
    if (!visiveis.length) cl.appendChild(el('p', { id: 'cs-lancamentos-vazio', 'class': 'ru-nota' }, 'Nenhum pagamento a conferir: tudo o que foi lançado aqui já está no extrato.'));
    add(app, el('div', { 'class': 'ru-nota' }, 'Dados da planilha de consórcios (abas Base, Historico e Lançamentos) · gerado em ' + (d.gerado_em || '')));
  }

  function unicos(arr, campo) { var o = []; arr.forEach(function (x) { if (o.indexOf(x[campo]) < 0) o.push(x[campo]); }); return o.sort(); }

  function cardGrafico(titulo, id) {
    var card = el('div', { 'class': 'ru-card' }), box = el('div', { 'class': 'ru-grafico' }), canvas = el('canvas', { id: id, 'aria-label': titulo, role: 'img' });
    add(card, el('h2', {}, titulo), add(box, canvas));
    return { card: card, canvas: canvas };
  }

  function graficos(cCurva, cBanco, cEmpresa) {
    var c = E.calc, Chart = global.Chart;
    // graficos com a fonte e as cores do kit Rural
    Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--ru-fonte') || 'Outfit, sans-serif';
    Chart.defaults.color = '#6B7280';
    var reais = function (v) { return moeda(v); };
    var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    E.graficos.push(new Chart(cCurva, {
      type: 'bar',
      data: { labels: c.curva.map(function (x) { return meses[+x.mes.slice(5, 7) - 1] + '/' + x.mes.slice(2, 4); }), datasets: [{ label: 'Parcelas previstas', data: c.curva.map(function (x) { return x.valor; }), backgroundColor: '#2060A8', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return reais(x.raw); } } } },
        scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return 'R$ ' + (v / 1000).toFixed(0) + 'k'; } } } } }
    }));
    var bancos = Object.keys(c.porBanco).sort();
    E.graficos.push(new Chart(cBanco, {
      type: 'doughnut',
      data: { labels: bancos, datasets: [{ data: bancos.map(function (b) { return c.porBanco[b].apagar; }), backgroundColor: ['#2060A8', '#B4462E', '#289048', '#F8C838', '#6B7280'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (x) { return x.label + ': ' + reais(x.raw); } } } } }
    }));
    var emp = Object.keys(c.porEmpresa).sort();
    E.graficos.push(new Chart(cEmpresa, {
      type: 'bar',
      data: { labels: emp.map(curta), datasets: [
        { label: 'Pago', data: emp.map(function (e) { return c.porEmpresa[e].pago; }), backgroundColor: '#289048', borderRadius: 4 },
        { label: 'A pagar', data: emp.map(function (e) { return c.porEmpresa[e].apagar; }), backgroundColor: '#F8C838', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (x) { return x.dataset.label + ': ' + reais(x.raw); } } } },
        scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return 'R$ ' + (v / 1000).toFixed(0) + 'k'; } } } } }
    }));
  }

  function detalhe(l) {
    var w = janela(l.grupo + ' / ' + l.cota + ' · ' + l.bem, 'cs-detalhe');
    add(w.corpo, el('div', { 'class': 'ru-sub' }, l.banco + ' · ' + curta(l.empresa) + ' · adesão ' + dataBR(l.data_adesao) + ' · taxa ' + pct((l.taxa_adm || 0) + (l.fundo_reserva || 0)) +
      (l.contemplado ? ' · contemplada em ' + dataBR(l.data_contemp) + ' (' + (l.forma_contemp || '') + '), crédito ' + moeda(l.credito_disponivel || l.valor_credito) : '')));
    var t = el('table', { 'class': 'ru-tabela' }); var cab = el('tr');
    ['Parcela', 'Tipo', 'Data', 'Devido', 'Pago', 'Situação'].forEach(function (x) { cab.appendChild(el('th', {}, x)); });
    add(t, add(el('thead'), cab));
    var tb = el('tbody');
    (E.dados.historico || []).filter(function (h) { return h[0] + '|' + h[1] === l.chave; }).slice().reverse().forEach(function (h) {
      add(tb, add(el('tr'), td(String(h[2])), td(h[3]), td(dataBR(h[4])), td(num2(h[5]), 'n'), td(num2(h[6]), 'n'), td(h[7])));
    });
    add(w.corpo, add(t, tb));
    if (!tb.children.length) add(w.corpo, el('p', {}, 'Sem histórico importado para esta cota.'));
    var bts = el('div', { 'class': 'ru-bts' }), f = el('button', { type: 'button', 'class': 'ru-btn prim' }, 'Fechar'); f.onclick = w.fechar;
    add(w.corpo, add(bts, f));
  }

  function opId() { return (global.crypto && global.crypto.randomUUID) ? global.crypto.randomUUID() : 'op-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function formulario() {
    var d = E.dados, w = janela('Lançar pagamento');
    var form = el('form', { id: 'cs-form', novalidate: 'novalidate' });
    add(form, el('label', { 'for': 'cs-f-cota' }, 'Consórcio'));
    var sc = el('select', { id: 'cs-f-cota' });
    sc.appendChild(el('option', { value: '' }, 'Escolha a cota…'));
    d.base.slice().sort(function (a, b) { return (a.empresa + a.banco + a.grupo + a.cota).localeCompare(b.empresa + b.banco + b.grupo + b.cota); }).forEach(function (b) {
      sc.appendChild(el('option', { value: b.grupo + '|' + b.cota }, b.grupo + ' / ' + b.cota + ' — ' + b.bem + ' (' + curta(b.empresa) + ' · ' + b.banco + ') · parcela ' + moeda(b.valor_proxima)));
    });
    add(form, sc, el('label', { 'for': 'cs-f-tipo' }, 'Tipo'));
    var st = el('select', { id: 'cs-f-tipo' });
    [['parcela', 'Parcela'], ['lance', 'Lance'], ['outro', 'Outro']].forEach(function (o) { st.appendChild(el('option', { value: o[0] }, o[1])); });
    add(form, st, el('label', { 'for': 'cs-f-data' }, 'Data do pagamento'));
    var dt = el('input', { id: 'cs-f-data', type: 'date', max: E.op.hoje }); dt.value = E.op.hoje;
    add(form, dt, el('label', { 'for': 'cs-f-valor' }, 'Valor pago (R$), como caiu no extrato'));
    var vl = el('input', { id: 'cs-f-valor', type: 'text', inputmode: 'decimal', placeholder: '0,00', autocomplete: 'off' });
    add(form, vl, el('label', { 'for': 'cs-f-obs' }, 'Observação (opcional)'));
    var ob = el('input', { id: 'cs-f-obs', type: 'text', maxlength: '200', placeholder: 'ex.: pago via PIX em 10/10' });
    var erro = el('div', { id: 'cs-f-erro', 'class': 'ru-erro', role: 'alert' });
    var bts = el('div', { 'class': 'ru-bts' }), cancelar = el('button', { type: 'button', 'class': 'ru-btn' }, 'Cancelar'), salvar = el('button', { type: 'submit', id: 'cs-f-salvar', 'class': 'ru-btn prim' }, 'Salvar');
    cancelar.onclick = w.fechar;
    add(form, ob, erro, add(bts, cancelar, salvar));
    w.corpo.appendChild(form);

    sc.onchange = function () {
      var b = d.base.filter(function (x) { return x.grupo + '|' + x.cota === sc.value; })[0];
      if (b && b.valor_proxima) vl.value = num2(b.valor_proxima);
    };
    var meuOp = opId(), enviando = false;
    async function enviar(confirmar) {
      if (enviando) return;
      erro.textContent = '';
      var conf = form.querySelector('#cs-f-confirmar'); if (conf) conf.remove();
      var partes = sc.value.split('|'), valor = lerValorBR(vl.value);
      if (!sc.value) { erro.textContent = 'Escolha o consórcio.'; return; }
      if (!(valor > 0)) { erro.textContent = 'Valor inválido. Use o formato 1.515,51.'; return; }
      if (!dt.value) { erro.textContent = 'Informe a data do pagamento.'; return; }
      enviando = true; salvar.disabled = true;
      var corpo = { acao: 'lancar', grupo: partes[0], cota: partes[1], tipo: st.value, data: dt.value, valor: valor, obs: ob.value.trim(), opId: meuOp };
      if (confirmar) corpo.confirmar_duplicado = true;
      var r;
      try { r = await chamar(corpo); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha. Tente de novo.' }; }
      enviando = false; salvar.disabled = false;
      if (r && r.ok) { w.fechar(); E.dados.lancamentos.push(r.lancamento); desenhar(); return; } // sem recarregar tudo: a tela ja usa o que o servidor gravou
      erro.textContent = (r && r.message) || 'Não foi possível lançar.';
      if (r && r.error === 'duplicado') {
        var b = el('button', { type: 'button', id: 'cs-f-confirmar', 'class': 'ru-btn' }, 'É outro pagamento: lançar mesmo assim');
        b.onclick = function () { enviar(true); };
        bts.insertBefore(b, salvar);
      }
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); enviar(false); });
    setTimeout(function () { try { sc.focus(); } catch (e) { /* ignora */ } }, 0);
  }

  async function excluir(x) {
    var ok = await A._confirmar('Excluir o lançamento de ' + moeda(x.valor) + ' em ' + dataBR(x.data) + ' (' + x.grupo + ' / ' + x.cota + ')? Ele fica registrado como excluído na planilha.');
    if (!ok) return;
    var r;
    try { r = await chamar({ acao: 'excluir', id: x.id, opId: opId() }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    if (!r || !r.ok) { var w = janela('Não foi possível excluir'); add(w.corpo, el('p', {}, (r && r.message) || 'Erro.')); return; }
    E.dados.lancamentos = E.dados.lancamentos.filter(function (l) { return l.id !== x.id; });
    desenhar();
  }

  var A = { montar: montar, calcular: calcular, lerValorBR: lerValorBR, _confirmar: confirmarPadrao };
  global.ConsorciosApp = A;
})(typeof window !== 'undefined' ? window : this);
