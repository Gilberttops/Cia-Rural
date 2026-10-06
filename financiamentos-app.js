/* Financiamentos e empréstimos - logica da pagina (usada por financiamentos.html), no kit visual Rural.
 * Dados da planilha "Financiamentos" pelo script de dados (acao "dados"), sempre com login (RuralAuth).
 * Todo texto entra como TEXTO (textContent). Sem dados no HTML. */
(function (global) {
  'use strict';

  var moeda = function (v) { return (v === null || v === undefined || isNaN(v)) ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var usd = function (v) { return (v === null || v === undefined || isNaN(v)) ? '—' : 'US$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num2 = function (v) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pct = function (v, casas) { return (v === null || v === undefined || isNaN(v)) ? '—' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas === undefined ? 2 : casas, maximumFractionDigits: casas === undefined ? 2 : casas }) + '%'; };
  var dataBR = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—'; };
  var ROTATIVOS = ['Conta garantida', 'Rotativo', 'Desconto de títulos'];
  var DESCONTO = 'Desconto de títulos';
  var RECENTES = 3;  // custo "atual" de cada banco = media das ultimas 3 operacoes  // linhas de desconto ficam fora dos numeros de financiamentos

  function diasAte(de, ate) {
    return Math.round((Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86400000);
  }
  function somaMeses(iso, n) {
    var a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10), ano = a + Math.floor(m / 12), mes = ((m % 12) + 12) % 12;
    var ult = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return ano + '-' + ('0' + (mes + 1)).slice(-2) + '-' + ('0' + Math.min(d, ult)).slice(-2);
  }
  function hojeLocal() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function lerValorBR(s) {
    var t = String(s === null || s === undefined ? '' : s).replace(/R\$|\s/g, '');
    if (!t || !/^[\d.,]+$/.test(t)) return NaN;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    var n = Number(t); return isFinite(n) ? n : NaN;
  }

  // ---------- calculos (sem tela) ----------
  // Lancamento manual so conta se for depois da data do extrato do contrato (o extrato seguinte ja o inclui).
  function calcular(dados, hoje) {
    var parcelasDe = {};
    (dados.parcelas || []).forEach(function (p) { (parcelasDe[p[0]] = parcelasDe[p[0]] || []).push({ n: p[1], data: p[2], capital: p[3], juros: p[4], total: p[5], situacao: p[6] }); });
    var limite12 = somaMeses(hoje, 12);
    var linhas = dados.contratos.map(function (c) {
      var corte = c.data_saldo || c.extrato_de || '';
      var manuais = (dados.lancamentos || []).filter(function (l) { return l.contrato === c.contrato && l.data > corte; });
      var pagas = manuais.filter(function (l) { return l.tipo === 'parcela'; }).length;
      var futuras = (parcelasDe[c.contrato] || []).slice(pagas);
      var abatido = 0;
      manuais.forEach(function (l) {
        if (l.tipo === 'amortizacao' || l.tipo === 'liquidacao') abatido += l.valor;
      });
      (parcelasDe[c.contrato] || []).slice(0, pagas).forEach(function (p) { abatido += (p.capital !== null && p.capital !== undefined) ? p.capital : p.total; });
      var saldo = Math.max(0, (c.saldo_devedor || 0) - abatido);
      var rotativo = ROTATIVOS.indexOf(c.categoria) >= 0;
      var prox = futuras[0] || null;
      var dias = prox ? diasAte(hoje, prox.data) : null;
      var status = saldo <= 0.01 ? 'quitado' : !prox ? (rotativo ? 'rotativo' : 'sem_cronograma') : dias < 0 ? 'vencida' : dias <= 7 ? 'a_vencer' : 'ok';
      var cp = rotativo || !futuras.length ? saldo : Math.min(saldo, futuras.filter(function (p) { return p.data <= limite12; })
        .reduce(function (s, p) { return s + ((p.capital !== null && p.capital !== undefined) ? p.capital : p.total); }, 0));
      return Object.assign({}, c, { saldo: saldo, manuais: manuais.length, futuras: futuras, proximo: prox, dias: dias, status: status, rotativo: rotativo,
        cp: cp, lp: Math.max(0, saldo - cp), vencido_final: !!(c.vencimento_final && c.vencimento_final < hoje && saldo > 0.01) });
    });
    var ativos = linhas.filter(function (l) { return l.saldo > 0.01 && l.categoria !== DESCONTO; });
    var descAtivos = linhas.filter(function (l) { return l.saldo > 0.01 && l.categoria === DESCONTO; });
    var soma = function (arr, f) { return arr.reduce(function (s, x) { return s + (typeof f === 'function' ? f(x) : (x[f] || 0)); }, 0); };
    var saldoTot = soma(ativos, 'saldo');
    var comTaxa = ativos.filter(function (l) { return l.taxa_efetiva_am; });
    var custo = comTaxa.length ? soma(comTaxa, function (l) { return l.saldo * l.taxa_efetiva_am; }) / soma(comTaxa, 'saldo') : null;
    var mes0 = hoje.slice(0, 7);
    var curva = [];
    for (var i = 0; i < 24; i++) {
      var mes = somaMeses(mes0 + '-01', i).slice(0, 7);
      curva.push({ mes: mes, valor: soma(ativos, function (l) { return soma(l.futuras.filter(function (p) { return p.data.slice(0, 7) === mes; }), 'total'); }) });
    }
    var acc = (dados.acc || []).map(function (a) {
      var d = a.liquidacao_ate ? diasAte(hoje, a.liquidacao_ate) : null;
      return Object.assign({}, a, { dias: d, alerta: d === null ? 'neutro' : d < 0 ? 'vencido' : d <= 30 ? 'alerta' : d <= 90 ? 'atencao' : 'ok' });
    }).sort(function (a, b) { return (a.liquidacao_ate || '').localeCompare(b.liquidacao_ate || ''); });
    var accAtivos = acc.filter(function (a) { return /ATIVO/i.test(a.status || '') || a.dias === null || a.dias >= 0; });
    var desc = calcularDescontos(dados.descontos || [], hoje, linhas);
    var proxAcc = acc.filter(function (a) { return a.dias !== null && a.dias >= 0; })[0] || null;
    var accMes = {};
    accAtivos.forEach(function (a) { if (a.liquidacao_ate) { var k = a.liquidacao_ate.slice(0, 7); accMes[k] = (accMes[k] || 0) + (a.valor_usd || 0); } });
    var agrupar = function (campo) { var o = {}; ativos.forEach(function (l) { o[l[campo]] = (o[l[campo]] || 0) + l.saldo; }); return o; };
    return {
      linhas: linhas, ativos: ativos, descAtivos: descAtivos, acc: acc, proxAcc: proxAcc, curva: curva, desc: desc, accMes: accMes, porBanco: agrupar('banco'), porEmpresa: agrupar('empresa'),
      ranking: comTaxa.filter(function (l) { return l.saldo >= 1000; }).sort(function (a, b) { return b.taxa_efetiva_am - a.taxa_efetiva_am; }),  // saldo simbolico (rotativo com R$ 1) nao entra
      kpis: {
        saldo: saldoTot, contratos: ativos.length, desc_saldo: soma(descAtivos, 'saldo'), desc_contratos: descAtivos.length, cp: soma(ativos, 'cp'), lp: soma(ativos, 'lp'),
        parcelas_mes: curva[0].valor, custo_am: custo, custo_aa: custo === null ? null : Math.pow(1 + custo, 12) - 1,
        acc_usd: soma(accAtivos, 'valor_usd'), acc_brl: soma(accAtivos, 'valor_brl'),
        acc_90: accAtivos.filter(function (a) { return a.dias !== null && a.dias >= 0 && a.dias <= 90; }),
        acc_desagio: soma(accAtivos, 'valor_brl') ? soma(accAtivos, function (a) { return (a.valor_brl || 0) * (a.desagio_aa || 0); }) / soma(accAtivos, 'valor_brl') : null,
        multas: soma(linhas, 'multas_ano'), sem_extrato: linhas.filter(function (l) { return l.sem_extrato; }).length,
        vencidos_final: linhas.filter(function (l) { return l.vencido_final; }).length,
        vencidas: linhas.filter(function (l) { return l.status === 'vencida'; }).length
      }
    };
  }

  // Descontos de duplicatas do ano de "hoje". Sem juros/IOF/creditado na planilha, estima pela taxa e prazo (marca "estimado").
  // Custo efetivo a.m. = (nominal / creditado)^(30 / prazo) - 1; media ponderada por creditado x prazo.
  function calcularDescontos(lista, hoje, linhas) {
    var ano = hoje.slice(0, 4), ops = lista.filter(function (d) { return d.data_remessa && d.data_remessa.slice(0, 4) === ano && d.valor_nominal > 0; }).map(function (d) {
      var prazo = d.prazo_medio || 30, est = !(d.valor_creditado > 0);
      var juros = d.juros !== null && d.juros !== undefined ? d.juros : est ? d.valor_nominal * (d.taxa_am || 0) * prazo / 30 : 0;
      var iof = d.iof !== null && d.iof !== undefined ? d.iof : est ? d.valor_nominal * (0.000082 * Math.min(prazo, 365) + 0.0038) : 0;
      var tarifas = d.tarifas || 0;
      var cred = est ? d.valor_nominal - juros - iof - tarifas : d.valor_creditado;
      var custo = d.valor_nominal - cred;
      return Object.assign({}, d, { prazo: prazo, juros_c: juros, iof_c: iof, tarifas_c: tarifas, creditado: cred, custo: custo, estimado: est,
        efetiva_am: cred > 0 ? Math.pow(d.valor_nominal / cred, 30 / prazo) - 1 : null });
    }).sort(function (a, b) { return b.data_remessa.localeCompare(a.data_remessa); });
    var peso = 0, pond = 0, porMes = {};
    ops.forEach(function (o) {
      if (o.efetiva_am !== null) { peso += o.creditado * o.prazo; pond += o.creditado * o.prazo * o.efetiva_am; }
      var m = o.data_remessa.slice(0, 7); porMes[m] = porMes[m] || { nominal: 0, custo: 0 }; porMes[m].nominal += o.valor_nominal; porMes[m].custo += o.custo;
    });
    var giros = linhas.filter(function (l) { return l.categoria === 'Capital de giro' && l.saldo > 0.01 && l.taxa_efetiva_am; });
    var sg = giros.reduce(function (s, l) { return s + l.saldo; }, 0);
    var media = function (lista) {
      var p = 0, q = 0; lista.forEach(function (o) { if (o.efetiva_am !== null) { p += o.creditado * o.prazo; q += o.creditado * o.prazo * o.efetiva_am; } });
      return p ? q / p : null;
    };
    var grupos = {};
    ops.forEach(function (o) { var g = o.banco + ' · ' + o.empresa; (grupos[g] = grupos[g] || { nome: g, banco: o.banco, empresa: o.empresa, ops: [] }).ops.push(o); });
    var porBanco = Object.keys(grupos).map(function (g) {
      var x = grupos[g], ult = x.ops.slice(0, RECENTES);
      return { nome: g, banco: x.banco, empresa: x.empresa, n: x.ops.length, efetiva_am: media(x.ops), recente_am: media(ult), recentes: ult,
        ultima: ult[0].data_remessa, nominal_rec: ult.reduce(function (s, o) { return s + o.valor_nominal; }, 0) };
    }).filter(function (g) { return g.recente_am !== null; }).sort(function (a, b) { return a.recente_am - b.recente_am; });
    return { ano: ano, ops: ops, porMes: porMes, porBanco: porBanco, melhor: porBanco[0] || null, estimados: ops.filter(function (o) { return o.estimado; }).length,
      nominal: ops.reduce(function (s, o) { return s + o.valor_nominal; }, 0), custo: ops.reduce(function (s, o) { return s + o.custo; }, 0),
      creditado: ops.reduce(function (s, o) { return s + o.creditado; }, 0), efetiva_am: peso ? pond / peso : null,
      prazo_medio: ops.length ? ops.reduce(function (s, o) { return s + o.prazo * o.valor_nominal; }, 0) / ops.reduce(function (s, o) { return s + o.valor_nominal; }, 0) : null,
      giro_am: sg ? giros.reduce(function (s, l) { return s + l.saldo * l.taxa_efetiva_am; }, 0) / sg : null };
  }

  // ---------- DOM ----------
  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }
  function add(pai) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) pai.appendChild(arguments[i]); return pai; }
  function td(t, cls) { return el('td', cls ? { 'class': cls } : {}, t); }
  function tabela(id, titulos) {
    var t = el('table', { id: id, 'class': 'ru-tabela' }), tr = el('tr');
    titulos.forEach(function (x) { tr.appendChild(el('th', typeof x === 'object' ? { 'class': x.cls } : {}, typeof x === 'object' ? x.t : x)); });
    add(t, add(el('thead'), tr), el('tbody'));
    return t;
  }
  function tag(texto, tipo) { return el('span', { 'class': 'ru-tag ' + (tipo || '') }, texto); }
  var TAG = { vencida: 'alerta', a_vencer: 'atencao', ok: 'ok', quitado: 'info', rotativo: 'info', sem_cronograma: '' };

  var E = { raiz: null, op: null, dados: null, calc: null, empresa: 'todas', banco: 'todos', graficos: [], mostrarConferidos: false, aba: null };

  function janela(titulo, id) {
    var f = el('div', { 'class': 'ru-fundo', role: 'dialog', 'aria-modal': 'true' }), j = el('div', { 'class': 'ru-janela', id: id || null });
    add(f, add(j, el('h2', {}, titulo)));
    f.addEventListener('click', function (e) { if (e.target === f) f.remove(); });
    document.body.appendChild(f);
    return { fundo: f, corpo: j, fechar: function () { f.remove(); } };
  }
  function confirmarPadrao(texto) {
    return new Promise(function (resolve) {
      var w = janela('Confirmar'), bts = el('div', { 'class': 'ru-bts' });
      var nao = el('button', { type: 'button', 'class': 'ru-btn' }, 'Cancelar'), sim = el('button', { type: 'button', 'class': 'ru-btn prim' }, 'Confirmar');
      nao.onclick = function () { w.fechar(); resolve(false); }; sim.onclick = function () { w.fechar(); resolve(true); };
      add(w.corpo, el('p', {}, texto), add(bts, nao, sim));
    });
  }
  function chamar(corpo) { return E.op.chamar(corpo); }
  function opId() { return (global.crypto && global.crypto.randomUUID) ? global.crypto.randomUUID() : 'op-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  async function montar(raiz, opcoes) {
    E.raiz = raiz; E.mostrarConferidos = false; E.empresa = 'todas'; E.banco = 'todos'; E.aba = null;
    E.op = Object.assign({ hoje: hojeLocal(), semGraficos: false }, opcoes || {});
    if (!E.op.chamar) E.op.chamar = function (corpo) { return global.RuralAuth.chamar('financiamentos', E.op.url, corpo); };
    raiz.textContent = '';
    raiz.appendChild(el('div', { id: 'fn-app', 'class': 'ru-pagina' }, 'Carregando os financiamentos…'));
    await carregar();
  }

  async function carregar() {
    var r;
    try { r = await chamar({ acao: 'dados' }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    if (r && r.ok && !Array.isArray(r.contratos)) r = { ok: false, message: 'O servidor respondeu fora do esperado. Recarregue a página em instantes.' };
    var app = E.raiz.querySelector('#fn-app');
    if (!r || !r.ok) { app.textContent = ''; add(app, el('p', { 'class': 'ru-erro' }, (r && r.message) || 'Não foi possível carregar os dados.')); return; }
    E.dados = r;
    desenhar();
  }

  function filtrados() {
    var ok = function (x) { return (E.empresa === 'todas' || x.empresa === E.empresa) && (E.banco === 'todos' || x.banco === E.banco); };
    var contratos = E.dados.contratos.filter(ok), ids = contratos.map(function (c) { return c.contrato; });
    return { contratos: contratos, parcelas: (E.dados.parcelas || []).filter(function (p) { return ids.indexOf(p[0]) >= 0; }),
      acc: (E.dados.acc || []).filter(ok), descontos: (E.dados.descontos || []).filter(ok), lancamentos: E.dados.lancamentos.filter(function (l) { return ids.indexOf(l.contrato) >= 0; }) };
  }
  function unicos(arr, campo) { var o = []; arr.forEach(function (x) { if (x[campo] && o.indexOf(x[campo]) < 0) o.push(x[campo]); }); return o.sort(); }

  function desenhar() {
    E.calc = calcular(filtrados(), E.op.hoje);
    var c = E.calc, k = c.kpis, d = E.dados, app = E.raiz.querySelector('#fn-app');
    app.textContent = '';
    E.graficos.forEach(function (g) { try { g.destroy(); } catch (e) { /* ignora */ } }); E.graficos = [];

    var bl = null;
    if (d.pode_lancar) { bl = el('button', { type: 'button', id: 'fn-btn-lancar', 'class': 'ru-btn prim' }, '+ Lançar pagamento'); bl.onclick = function () { formulario(); }; }
    var extratoDe = d.contratos.map(function (x) { return x.extrato_de; }).filter(Boolean).sort().pop();
    var usuario = E.op.usuario && E.op.usuario.nome ? E.op.usuario : (d.usuario ? { nome: d.usuario } : null);
    if (global.RuralUI) {
      global.RuralUI.topo(app, { app: 'financiamentos', titulo: 'Financiamentos e empréstimos', sub: 'Rural e RNA · extratos de ' + dataBR(extratoDe),
        logo: E.op.logo, usuario: usuario, apps: E.op.apps || [], admin: !!(E.op.usuario && E.op.usuario.admin), aoSair: E.op.aoSair, acoes: [bl] });
    } else { add(app, el('h1', {}, 'Financiamentos e empréstimos'), bl); }

    var filtros = el('div', { 'class': 'ru-filtros' });
    [['empresa', 'todas', 'Todas as empresas'], ['banco', 'todos', 'Todos os bancos']].forEach(function (f) {
      var s = el('select', { id: 'fn-filtro-' + f[0], 'aria-label': f[2] });
      [[f[1], f[2]]].concat(unicos(d.contratos.concat(d.acc || []), f[0]).map(function (x) { return [x, x]; })).forEach(function (o) {
        var op = el('option', { value: o[0] }, o[1]); if (o[0] === E[f[0]]) op.selected = true; s.appendChild(op);
      });
      s.onchange = function () { E[f[0]] = s.value; desenhar(); };
      filtros.appendChild(s);
    });
    app.appendChild(filtros);

    // abas: cada bloco fica num painel; so o da aba escolhida aparece (todos continuam montados)
    var P = abas(app, [['painel', 'Painel'], ['contratos', 'Financiamentos (' + c.ativos.length + ')'], ['acc', 'ACC (' + c.acc.length + ')'],
      ['descontos', 'Descontos (' + c.descAtivos.length + ')'], ['lancamentos', 'Lançamentos']]);

    // Painel: visao geral + um bloco para cada tipo de divida (financiamentos, desconto de duplicatas, ACC)
    var x = c.desc, acc90 = k.acc_90.reduce(function (s, a) { return s + (a.valor_usd || 0); }, 0);
    kpis(P.painel, 'fn-kpis', [
      ['Financiamentos', moeda(k.saldo), k.contratos + ' contratos', 'neutro'],
      ['Desconto de duplicatas', moeda(k.desc_saldo), 'títulos descontados a vencer', 'neutro'],
      ['ACC', usd(k.acc_usd), moeda(k.acc_brl) + ' na taxa contratada', 'neutro'],
      ['Total', moeda(k.saldo + k.desc_saldo + k.acc_brl), 'financiamentos + descontos + ACC em R$', '']
    ]);
    ['contratos', 'descontos', 'acc'].forEach(function (aba, i) {
      var cartao = P.painel.querySelectorAll('#fn-kpis .ru-kpi')[i];
      cartao.classList.add('clicavel'); cartao.setAttribute('role', 'button'); cartao.tabIndex = 0; cartao.title = 'Abrir a aba';
      cartao.onclick = function () { P._mostrar(aba); global.scrollTo && global.scrollTo(0, 0); };
      cartao.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); cartao.onclick(); } };
    });
    secao(P.contratos, 'Financiamentos e empréstimos', '#2060A8', moeda(k.saldo) + ' · ' + k.contratos + ' contratos');
    kpis(P.contratos, 'fn-kpis-fin', [
      ['Vence em 12 meses', moeda(k.cp), pct(k.saldo ? k.cp / k.saldo : 0, 0) + ' do saldo', k.saldo && k.cp / k.saldo > 0.4 ? 'alerta' : ''],
      ['Parcelas do mês', moeda(k.parcelas_mes), 'previstas para ' + E.op.hoje.slice(5, 7) + '/' + E.op.hoje.slice(0, 4), ''],
      ['Custo médio', k.custo_am === null ? '—' : pct(k.custo_am) + ' a.m.', k.custo_aa === null ? '' : 'cerca de ' + pct(k.custo_aa, 1) + ' a.a.', 'neutro'],
      ['Multas e mora no ano', moeda(k.multas), k.multas > 0 ? 'pagamento em atraso' : 'nenhuma', k.multas > 0 ? 'alerta' : 'bom']
    ]);
    secao(P.descontos, 'Desconto de duplicatas', '#289048', moeda(k.desc_saldo) + ' a vencer');
    kpis(P.descontos, 'fn-kpis-desc', [
      ['Descontado em ' + x.ano, moeda(x.nominal), x.ops.length + ' operações', 'neutro'],
      ['Custo em ' + x.ano, moeda(x.custo), 'juros + IOF + tarifas', x.custo > 0 ? 'alerta' : ''],
      ['Custo efetivo', x.efetiva_am === null ? '—' : pct(x.efetiva_am) + ' a.m.', x.giro_am === null ? '' : 'giro hoje: ' + pct(x.giro_am) + ' a.m.',
        x.efetiva_am !== null && x.giro_am !== null && x.efetiva_am > x.giro_am ? 'alerta' : 'bom'],
      ['Mais barato hoje', x.melhor ? x.melhor.nome : '—', x.melhor ? pct(x.melhor.recente_am) + ' a.m. (últimas ' + RECENTES + ')' : '', 'bom']
    ]);
    secao(P.acc, 'ACC: adiantamentos de câmbio', '#F8C838', usd(k.acc_usd) + ' · ' + moeda(k.acc_brl));
    kpis(P.acc, 'fn-kpis-acc', [
      ['Vencendo em 90 dias', usd(acc90), k.acc_90.length + ' contrato(s)', k.acc_90.length ? 'alerta' : 'bom'],
      ['Próxima liquidação', c.proxAcc ? dataBR(c.proxAcc.liquidacao_ate) : '—', c.proxAcc ? usd(c.proxAcc.valor_usd) + ' · em ' + c.proxAcc.dias + ' dias' : '',
        c.proxAcc && c.proxAcc.dias <= 30 ? 'alerta' : 'neutro'],
      ['Deságio médio', k.acc_desagio === null ? '—' : pct(k.acc_desagio) + ' a.a.', 'ponderado pelo valor', 'neutro'],
      ['Contratos ativos', String(c.acc.filter(function (a) { return a.dias === null || a.dias >= 0; }).length), 'liquidação no app da Exportação', 'neutro']
    ]);

    var avisos = [];
    if (k.vencidos_final) avisos.push(k.vencidos_final + ' contrato(s) com vencimento final já passado e saldo em aberto: confirmar renovação com o banco.');
    if (k.sem_extrato) avisos.push(k.sem_extrato + ' contrato(s) sem extrato atualizado: números da última planilha.');
    if (k.vencidas) avisos.push(k.vencidas + ' contrato(s) com parcela prevista já vencida: conferir pagamento.');
    if (avisos.length) { var av = el('div', { 'class': 'ru-card', id: 'fn-avisos' }); add(av, el('h2', {}, 'Atenção')); avisos.forEach(function (t) { av.appendChild(el('p', { 'class': 'ru-nota' }, '• ' + t)); }); P.painel.insertBefore(av, P.painel.children[1] || null); }

    secao(P.painel, 'Gráficos', '#1F3550');
    if (!E.op.semGraficos && typeof global.Chart !== 'undefined') {
      var grade = el('div', { 'class': 'ru-grade' });
      var g1 = cardGrafico('Parcelas previstas, próximos 24 meses', 'fn-g-curva'), g2 = cardGrafico('ACC a liquidar por mês (US$)', 'fn-g-acc'), g3 = cardGrafico('Financiamentos por banco', 'fn-g-banco');
      add(P.painel, add(grade, g1.card, g2.card, g3.card));
      graficos(g1.canvas, g2.canvas, g3.canvas);
    }

    // ranking: onde amortizar primeiro
    var cr = el('div', { 'class': 'ru-card' });
    add(cr, el('h2', {}, 'Onde amortizar primeiro'), el('div', { 'class': 'ru-nota' }, 'Contratos do mais caro para o mais barato pela taxa efetiva (juros do último mês ÷ saldo). Sobrando caixa, antecipar os do topo economiza mais.'));
    var tr = tabela('fn-ranking', ['Contrato', 'Banco', 'Empresa', 'Categoria', { t: 'Saldo', cls: 'n' }, { t: 'Taxa a.m.', cls: 'n' }, { t: 'Juros por mês', cls: 'n' }]);
    c.ranking.forEach(function (l) {
      add(tr.querySelector('tbody'), add(el('tr'), td(l.contrato), td(l.banco), td(l.empresa), td(l.categoria), td(moeda(l.saldo), 'n'), td(pct(l.taxa_efetiva_am), 'n'), td(moeda(l.saldo * l.taxa_efetiva_am), 'n')));
    });
    add(P.contratos, add(cr, add(el('div', { 'class': 'ru-rolagem' }), tr)));

    // contratos
    var cc = el('div', { 'class': 'ru-card' });
    add(cc, el('h2', {}, 'Financiamentos e empréstimos'), el('div', { 'class': 'ru-nota' }, 'Clique num contrato para ver o cronograma. Parcelas futuras são projetadas: capital fixo + juros sobre o saldo à taxa efetiva atual.'));
    var tc = tabela('fn-contratos', ['Empresa', 'Banco', 'Contrato', 'Categoria', { t: 'Saldo devedor', cls: 'n' }, { t: 'Taxa a.m.', cls: 'n' }, { t: 'Parcelas', cls: 'n' }, 'Próximo vencimento', { t: 'Valor', cls: 'n' }, 'Vencimento final', 'Observação']);
    c.linhas.filter(function (l) { return l.categoria !== DESCONTO; }).sort(function (a, b) { return b.saldo - a.saldo; }).forEach(function (l) {
      var tr2 = el('tr', { 'data-contrato': l.contrato, 'class': 'clicavel' + (l.saldo <= 0.01 ? ' apagado' : '') });
      var venc = el('td');
      if (l.proximo) { venc.appendChild(document.createTextNode(dataBR(l.proximo.data) + ' ')); venc.appendChild(tag(l.status === 'vencida' ? 'vencida há ' + (-l.dias) + 'd' : 'em ' + l.dias + 'd', TAG[l.status])); }
      else venc.appendChild(tag(l.status === 'quitado' ? 'quitado' : l.rotativo ? 'rotativo' : 'sem cronograma', TAG[l.status]));
      var obs = [];
      if (l.sem_extrato) obs.push('sem extrato atualizado');
      if (l.vencido_final) obs.push('vencimento final passou');
      if (l.multas_ano) obs.push('multa/mora ' + moeda(l.multas_ano));
      if (l.manuais) obs.push(l.manuais + ' lançado(s) aqui');
      add(tr2, td(l.empresa), td(l.banco), td(l.contrato), td(l.categoria), td(moeda(l.saldo), 'n'), td(pct(l.taxa_efetiva_am), 'n'),
        td(l.rotativo ? '—' : String(l.futuras.length), 'n'), venc, td(l.proximo ? moeda(l.proximo.total) : '—', 'n'),
        add(el('td'), l.vencido_final ? tag(dataBR(l.vencimento_final), 'alerta') : document.createTextNode(dataBR(l.vencimento_final))), td(obs.join(' · ') || '—'));
      tr2.onclick = function () { detalhe(l); };
      tc.querySelector('tbody').appendChild(tr2);
    });
    add(P.contratos, add(cc, add(el('div', { 'class': 'ru-rolagem' }), tc)));

    // ACC
    var ca = el('div', { 'class': 'ru-card' });
    add(ca, el('h2', {}, 'ACC: adiantamentos de câmbio'), el('div', { 'class': 'ru-nota' }, 'A liquidação é controlada no app da Exportação. Atenção: ACC não liquidado no prazo passa a pagar Selic + sobretaxa mensal.'));
    var ta = tabela('fn-acc', ['Contrato', 'Banco', 'Empresa', 'Contratação', { t: 'Valor US$', cls: 'n' }, { t: 'Taxa', cls: 'n' }, { t: 'Valor R$', cls: 'n' }, 'Liquidação até', { t: 'Deságio a.a.', cls: 'n' }]);
    c.acc.forEach(function (a) {
      var liq = el('td'); liq.appendChild(document.createTextNode(dataBR(a.liquidacao_ate) + ' '));
      if (a.dias !== null) liq.appendChild(tag(a.dias < 0 ? 'vencido há ' + (-a.dias) + 'd' : 'em ' + a.dias + 'd', a.alerta === 'vencido' ? 'alerta' : a.alerta));
      add(ta.querySelector('tbody'), add(el('tr', { 'data-acc': a.contrato }), td(a.contrato), td(a.banco), td(a.empresa), td(dataBR(a.data_contratacao)), td(usd(a.valor_usd), 'n'),
        td(a.taxa_cambial ? a.taxa_cambial.toLocaleString('pt-BR', { minimumFractionDigits: 4 }) : '—', 'n'), td(moeda(a.valor_brl), 'n'), liq, td(pct(a.desagio_aa), 'n')));
    });
    add(P.acc, add(ca, add(el('div', { 'class': 'ru-rolagem' }), ta)));

    desenharDescontos(P.descontos);
    desenharLancamentos(P.lancamentos);
    add(app, el('div', { 'class': 'ru-nota' }, 'Dados da planilha Financiamentos (abas Contratos, Parcelas, ACC e Lançamentos) · gerado em ' + (d.gerado_em || '')));
  }

  function desenharDescontos(app) {
    var x = E.calc.desc;
    if (x.porBanco.length) {
      var cb = el('div', { 'class': 'ru-card', id: 'fn-desc-bancos' });
      add(cb, el('h2', {}, 'Custo atual por banco'), el('div', { 'class': 'ru-nota' }, 'Média das últimas ' + RECENTES + ' operações de cada banco (custo efetivo: juros, IOF e tarifas sobre o valor creditado), do mais barato para o mais caro. Comparada com a média do ano.'));
      var tb = tabela('fn-tab-desc-bancos', ['Banco', 'Empresa', 'Últimas operações', { t: 'Valor', cls: 'n' }, { t: 'Custo atual', cls: 'n' }, { t: 'No ano', cls: 'n' }, 'Tendência']);
      x.porBanco.forEach(function (g, i) {
        var dif = g.efetiva_am === null ? 0 : g.recente_am - g.efetiva_am;
        var tend = Math.abs(dif) < 0.0005 ? tag('estável', 'info') : dif < 0 ? tag('caindo ' + num2(-dif * 100) + ' p.p.', 'ok') : tag('subindo ' + num2(dif * 100) + ' p.p.', 'alerta');
        var custo = add(el('td', { 'class': 'n' }), document.createTextNode(pct(g.recente_am) + ' a.m.'));
        if (i === 0) { custo.appendChild(document.createTextNode(' ')); custo.appendChild(tag('mais barato', 'ok')); }
        add(tb.querySelector('tbody'), add(el('tr', i === 0 ? { 'class': 'destaque' } : {}), td(g.banco), td(g.empresa),
          td(g.recentes.map(function (o) { return dataBR(o.data_remessa).slice(0, 5); }).join(', ') + (g.n < RECENTES ? ' (só ' + g.n + ')' : '')),
          td(moeda(g.nominal_rec), 'n'), custo, td(pct(g.efetiva_am) + ' a.m.', 'n'), add(el('td'), tend)));
      });
      add(app, add(cb, add(el('div', { 'class': 'ru-rolagem' }), tb)));
    }
    var cs = el('div', { 'class': 'ru-card', id: 'fn-desc-saldos' });
    add(cs, el('h2', {}, 'Títulos descontados a vencer'), el('div', { 'class': 'ru-nota' }, 'Se o cliente não pagar, o banco cobra da empresa. Saldo pela posição da carteira de cada banco.'));
    var ts = tabela('fn-tab-desc-saldos', ['Banco', 'Empresa', 'Contrato', { t: 'A vencer', cls: 'n' }, { t: 'Limite', cls: 'n' }, { t: 'Custo efetivo', cls: 'n' }, 'Posição de']);
    E.calc.descAtivos.slice().sort(function (a, b) { return b.saldo - a.saldo; }).forEach(function (l) {
      add(ts.querySelector('tbody'), add(el('tr'), td(l.banco), td(l.empresa), td(l.contrato), td(moeda(l.saldo), 'n'), td(l.valor_contratado ? moeda(l.valor_contratado) : '—', 'n'),
        td(pct(l.taxa_efetiva_am), 'n'), td(dataBR(l.data_saldo || l.extrato_de))));
    });
    add(ts.querySelector('tbody'), add(el('tr', { 'class': 'destaque' }), td('Total'), td(''), td(''), td(moeda(E.calc.kpis.desc_saldo), 'n'), td(''), td(''), td('')));
    add(app, add(cs, add(el('div', { 'class': 'ru-rolagem' }), ts)));
    var cd = el('div', { 'class': 'ru-card', id: 'fn-descontos' });
    add(cd, el('h2', {}, 'Operações de desconto em ' + x.ano));
    if (!x.ops.length) { add(app, add(cd, el('p', { 'class': 'ru-nota' }, 'Nenhuma remessa de desconto lançada na aba Descontos para ' + x.ano + '.'))); return; }
    add(cd, el('div', { 'class': 'ru-nota' }, 'Custo efetivo = o que se paga de juros, IOF e tarifas sobre o valor que entra na conta, no prazo médio. A taxa que o banco mostra é só a dos juros.'));
    if (x.estimados) cd.appendChild(el('p', { 'class': 'ru-nota' }, x.estimados + ' remessa(s) sem juros/IOF do banco: valores estimados pela taxa e pelo prazo (marcadas "estimado").'));
    var t = tabela('fn-tab-descontos', ['Data', 'Empresa', 'Banco', 'Contrato', { t: 'Títulos', cls: 'n' }, { t: 'Prazo', cls: 'n' }, { t: 'Valor nominal', cls: 'n' }, { t: 'Juros', cls: 'n' }, { t: 'IOF', cls: 'n' }, { t: 'Creditado', cls: 'n' }, { t: 'Taxa banco', cls: 'n' }, { t: 'Custo efetivo', cls: 'n' }]);
    x.ops.forEach(function (o) {
      var ef = add(el('td', { 'class': 'n' }), document.createTextNode(pct(o.efetiva_am)));
      if (o.estimado) { ef.appendChild(document.createTextNode(' ')); ef.appendChild(tag('estimado', 'atencao')); }
      add(t.querySelector('tbody'), add(el('tr'), td(dataBR(o.data_remessa)), td(o.empresa), td(o.banco), td(o.contrato), td(o.titulos === null || o.titulos === undefined ? '—' : String(o.titulos), 'n'),
        td(o.prazo + 'd', 'n'), td(moeda(o.valor_nominal), 'n'), td(moeda(o.juros_c), 'n'), td(moeda(o.iof_c), 'n'), td(moeda(o.creditado), 'n'), td(pct(o.taxa_am), 'n'), ef));
    });
    add(app, add(cd, add(el('div', { 'class': 'ru-rolagem' }), t)));
  }

  function desenharLancamentos(app) {
    var d = E.dados, cl = el('div', { 'class': 'ru-card' });
    var coberto = function (x) { var c = d.contratos.filter(function (cc) { return cc.contrato === x.contrato; })[0]; return !!(c && x.data <= (c.data_saldo || c.extrato_de || '')); };
    var n = d.lancamentos.filter(coberto).length;
    var cab = el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px' });
    add(cab, el('h2', {}, 'Pagamentos lançados aqui'));
    if (n) { var bc = el('button', { type: 'button', id: 'fn-mostrar-conferidos', 'class': 'ru-btn' }, (E.mostrarConferidos ? 'Esconder' : 'Mostrar') + ' os já conferidos no extrato (' + n + ')'); bc.onclick = function () { E.mostrarConferidos = !E.mostrarConferidos; desenhar(); }; cab.appendChild(bc); }
    add(cl, cab, el('div', { 'class': 'ru-nota' }, '"A conferir" = lançado aqui e ainda não veio no extrato: abate o saldo até o próximo extrato. "No extrato" = já incluído; fica na planilha como histórico.'));
    var tit = ['Data', 'Contrato', 'Tipo', { t: 'Valor', cls: 'n' }, 'Observação', 'Lançado por', 'Situação'];
    if (d.pode_lancar) tit.push('');
    var tl = tabela('fn-lancamentos', tit);
    var vis = d.lancamentos.filter(function (x) { return E.mostrarConferidos || !coberto(x); });
    vis.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).forEach(function (x) {
      var ok = coberto(x), tr = add(el('tr'), td(dataBR(x.data)), td(x.contrato), td(x.tipo), td(moeda(x.valor), 'n'), td(x.obs), td(x.por || '—'), add(el('td'), tag(ok ? 'no extrato' : 'a conferir', ok ? 'ok' : 'atencao')));
      if (d.pode_lancar) { var bx = el('button', { type: 'button', 'class': 'ru-btn x', 'data-excluir': x.id, 'aria-label': 'Excluir lançamento ' + x.id }, '✕'); bx.onclick = function () { excluir(x); }; add(tr, add(el('td'), bx)); }
      tl.querySelector('tbody').appendChild(tr);
    });
    add(app, add(cl, add(el('div', { 'class': 'ru-rolagem' }), tl)));
    if (!vis.length) cl.appendChild(el('p', { id: 'fn-lancamentos-vazio', 'class': 'ru-nota' }, 'Nenhum pagamento a conferir.'));
  }

  function kpis(pai, id, lista) {
    var kp = el('div', { 'class': 'ru-kpis', id: id });
    lista.forEach(function (x) { add(kp, add(el('div', { 'class': 'ru-kpi ' + (x[3] || '') }), el('div', { 'class': 'r' }, x[0]), el('div', { 'class': 'v' }, x[1]), el('div', { 'class': 's' }, x[2]))); });
    pai.appendChild(kp); return kp;
  }
  function secao(pai, titulo, cor, total) {
    var h = el('h2', { 'class': 'ru-secao', style: '--cor:' + cor }, titulo);
    if (total) h.appendChild(el('span', { 'class': 'ru-secao-total' }, total));
    pai.appendChild(h); return h;
  }

  // Barra de abas no kit (ru-abas). Lembra a ultima aba no navegador (so conveniencia; sem ela abre no Painel).
  var CHAVE_ABA = 'fn:aba';
  function abaGuardada() { try { return global.localStorage.getItem(CHAVE_ABA); } catch (e) { return null; } }
  function guardarAba(id) { try { global.localStorage.setItem(CHAVE_ABA, id); } catch (e) { /* sem armazenamento */ } }
  function abas(app, lista) {
    var nav = el('div', { 'class': 'ru-abas', role: 'tablist', id: 'fn-abas' }), P = {}, bts = {};
    if (!E.aba) E.aba = abaGuardada();
    if (!lista.some(function (x) { return x[0] === E.aba; })) E.aba = lista[0][0];
    function mostrar(id) {
      E.aba = id; guardarAba(id);
      lista.forEach(function (x) { var on = x[0] === id; P[x[0]].hidden = !on; bts[x[0]].setAttribute('aria-selected', on ? 'true' : 'false'); bts[x[0]].tabIndex = on ? 0 : -1; });
    }
    lista.forEach(function (x, i) {
      var b = el('button', { type: 'button', role: 'tab', id: 'fn-aba-' + x[0], 'aria-controls': 'fn-painel-' + x[0], 'data-aba': x[0] }, x[1]);
      b.onclick = function () { mostrar(x[0]); };
      b.onkeydown = function (ev) {
        var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var prox = lista[(i + d + lista.length) % lista.length][0]; mostrar(prox); bts[prox].focus(); ev.preventDefault();
      };
      bts[x[0]] = b; nav.appendChild(b);
      P[x[0]] = el('div', { role: 'tabpanel', id: 'fn-painel-' + x[0], 'aria-labelledby': 'fn-aba-' + x[0] });
    });
    app.appendChild(nav);
    lista.forEach(function (x) { app.appendChild(P[x[0]]); });
    mostrar(E.aba);
    P._mostrar = mostrar;
    return P;
  }

  function cardGrafico(titulo, id) {
    var card = el('div', { 'class': 'ru-card' }), box = el('div', { 'class': 'ru-grafico' }), canvas = el('canvas', { id: id, role: 'img', 'aria-label': titulo });
    add(card, el('h2', {}, titulo), add(box, canvas)); return { card: card, canvas: canvas };
  }
  function graficos(c1, c2, c3) {
    var c = E.calc, Chart = global.Chart, meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--ru-fonte') || 'Outfit, sans-serif';
    Chart.defaults.color = '#6B7280';
    var rot = function (m) { return meses[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4); }, mil = function (v) { return (v / 1000).toFixed(0) + 'k'; };
    E.graficos.push(new Chart(c1, { type: 'bar', data: { labels: c.curva.map(function (x) { return rot(x.mes); }), datasets: [{ label: 'Parcelas', data: c.curva.map(function (x) { return x.valor; }), backgroundColor: '#2060A8', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return moeda(x.raw); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return 'R$ ' + mil(v); } } } } } }));
    var am = Object.keys(c.accMes).sort();
    E.graficos.push(new Chart(c2, { type: 'bar', data: { labels: am.map(rot), datasets: [{ label: 'US$', data: am.map(function (m) { return c.accMes[m]; }), backgroundColor: '#F8C838', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return usd(x.raw); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return 'US$ ' + mil(v); } } } } } }));
    var bancos = Object.keys(c.porBanco).sort();
    E.graficos.push(new Chart(c3, { type: 'doughnut', data: { labels: bancos, datasets: [{ data: bancos.map(function (b) { return c.porBanco[b]; }), backgroundColor: ['#2060A8', '#B4462E', '#289048', '#F8C838', '#6B7280'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (x) { return x.label + ': ' + moeda(x.raw); } } } } } }));
  }

  function detalhe(l) {
    var w = janela(l.contrato + ' · ' + l.categoria, 'fn-detalhe');
    add(w.corpo, el('div', { 'class': 'ru-sub' }, l.banco + ' · ' + l.empresa + ' · ' + (l.linha || '') + ' · contratado ' + moeda(l.valor_contratado) + ' em ' + dataBR(l.data_contratacao) +
      ' · saldo ' + moeda(l.saldo) + ' · taxa efetiva ' + pct(l.taxa_efetiva_am) + ' a.m.' + (l.taxa_contrato_aa ? ' (contrato: ' + pct(l.taxa_contrato_aa) + ' a.a.)' : '') +
      ' · vencimento final ' + dataBR(l.vencimento_final)));
    if (l.rotativo) add(w.corpo, el('p', { 'class': 'ru-nota' }, 'Linha rotativa: sem cronograma de parcelas. Juros de cerca de ' + moeda(l.saldo * (l.taxa_efetiva_am || 0)) + ' por mês sobre o saldo atual.'));
    var t = el('table', { 'class': 'ru-tabela' }), cab = el('tr');
    ['Nº', 'Data', 'Capital', 'Juros (est.)', 'Total'].forEach(function (x, i) { cab.appendChild(el('th', i >= 2 ? { 'class': 'n' } : {}, x)); });
    add(t, add(el('thead'), cab));
    var tb = el('tbody');
    l.futuras.forEach(function (p) { add(tb, add(el('tr'), td(String(p.n)), td(dataBR(p.data)), td(p.capital === null || p.capital === undefined ? '—' : num2(p.capital), 'n'), td(p.juros === null || p.juros === undefined ? '—' : num2(p.juros), 'n'), td(num2(p.total), 'n'))); });
    add(w.corpo, add(t, tb));
    if (!tb.children.length && !l.rotativo) add(w.corpo, el('p', { 'class': 'ru-nota' }, 'Sem parcelas futuras previstas.'));
    var bts = el('div', { 'class': 'ru-bts' }), f = el('button', { type: 'button', 'class': 'ru-btn prim' }, 'Fechar'); f.onclick = w.fechar;
    add(w.corpo, add(bts, f));
  }

  function formulario() {
    var d = E.dados, w = janela('Lançar pagamento'), form = el('form', { id: 'fn-form', novalidate: 'novalidate' });
    add(form, el('label', { 'for': 'fn-f-contrato' }, 'Contrato'));
    var sc = el('select', { id: 'fn-f-contrato' }); sc.appendChild(el('option', { value: '' }, 'Escolha o contrato…'));
    d.contratos.filter(function (c) { return (c.saldo_devedor || 0) > 0.01; }).sort(function (a, b) { return (a.empresa + a.banco + a.contrato).localeCompare(b.empresa + b.banco + b.contrato); })
      .forEach(function (c) { sc.appendChild(el('option', { value: c.contrato }, c.contrato + ' — ' + c.categoria + ' (' + c.empresa + ' · ' + c.banco + ')' + (c.valor_proxima ? ' · parcela ' + moeda(c.valor_proxima) : ''))); });
    add(form, sc, el('label', { 'for': 'fn-f-tipo' }, 'Tipo'));
    var st = el('select', { id: 'fn-f-tipo' });
    [['parcela', 'Parcela'], ['amortizacao', 'Amortização extra'], ['liquidacao', 'Liquidação'], ['juros', 'Juros (rotativo)'], ['outro', 'Outro']].forEach(function (o) { st.appendChild(el('option', { value: o[0] }, o[1])); });
    add(form, st, el('label', { 'for': 'fn-f-data' }, 'Data do pagamento'));
    var dt = el('input', { id: 'fn-f-data', type: 'date', max: E.op.hoje }); dt.value = E.op.hoje;
    add(form, dt, el('label', { 'for': 'fn-f-valor' }, 'Valor pago (R$)'));
    var vl = el('input', { id: 'fn-f-valor', type: 'text', inputmode: 'decimal', placeholder: '0,00', autocomplete: 'off' });
    add(form, vl, el('label', { 'for': 'fn-f-obs' }, 'Observação (opcional)'));
    var ob = el('input', { id: 'fn-f-obs', type: 'text', maxlength: '200' });
    var erro = el('div', { id: 'fn-f-erro', 'class': 'ru-erro', role: 'alert' });
    var bts = el('div', { 'class': 'ru-bts' }), cancelar = el('button', { type: 'button', 'class': 'ru-btn' }, 'Cancelar'), salvar = el('button', { type: 'submit', id: 'fn-f-salvar', 'class': 'ru-btn prim' }, 'Salvar');
    cancelar.onclick = w.fechar;
    add(form, ob, erro, add(bts, cancelar, salvar)); w.corpo.appendChild(form);
    sc.onchange = function () { var c = d.contratos.filter(function (x) { return x.contrato === sc.value; })[0]; if (c && c.valor_proxima && st.value === 'parcela') vl.value = num2(c.valor_proxima); };
    var meuOp = opId(), enviando = false;
    async function enviar(confirmar) {
      if (enviando) return;
      erro.textContent = ''; var conf = form.querySelector('#fn-f-confirmar'); if (conf) conf.remove();
      var valor = lerValorBR(vl.value);
      if (!sc.value) { erro.textContent = 'Escolha o contrato.'; return; }
      if (!(valor > 0)) { erro.textContent = 'Valor inválido. Use o formato 1.515,51.'; return; }
      if (!dt.value) { erro.textContent = 'Informe a data do pagamento.'; return; }
      enviando = true; salvar.disabled = true;
      var corpo = { acao: 'lancar', contrato: sc.value, tipo: st.value, data: dt.value, valor: valor, obs: ob.value.trim(), opId: meuOp };
      if (confirmar) corpo.confirmar_duplicado = true;
      var r; try { r = await chamar(corpo); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha. Tente de novo.' }; }
      enviando = false; salvar.disabled = false;
      if (r && r.ok) { w.fechar(); E.dados.lancamentos.push(r.lancamento); E.aba = 'lancamentos'; desenhar(); return; }
      erro.textContent = (r && r.message) || 'Não foi possível lançar.';
      if (r && r.error === 'duplicado') { var b = el('button', { type: 'button', id: 'fn-f-confirmar', 'class': 'ru-btn' }, 'É outro pagamento: lançar mesmo assim'); b.onclick = function () { enviar(true); }; bts.insertBefore(b, salvar); }
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); enviar(false); });
  }

  async function excluir(x) {
    if (!(await A._confirmar('Excluir o lançamento de ' + moeda(x.valor) + ' em ' + dataBR(x.data) + ' (contrato ' + x.contrato + ')? Ele fica registrado como excluído na planilha.'))) return;
    var r; try { r = await chamar({ acao: 'excluir', id: x.id, opId: opId() }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    if (!r || !r.ok) { var w = janela('Não foi possível excluir'); add(w.corpo, el('p', {}, (r && r.message) || 'Erro.')); return; }
    E.dados.lancamentos = E.dados.lancamentos.filter(function (l) { return l.id !== x.id; });
    desenhar();
  }

  var A = { montar: montar, calcular: calcular, lerValorBR: lerValorBR, _confirmar: confirmarPadrao };
  global.FinanciamentosApp = A;
})(typeof window !== 'undefined' ? window : this);
