/* Parcelamentos fiscais - logica da pagina (usada por parcelamentos.html), no kit visual Rural.
 * Dados da planilha "parcelamentos rural" pelo script de dados (acao "dados"), sempre com login (RuralAuth).
 * Todo texto entra como TEXTO (textContent). Sem dados no HTML. */
(function (global) {
  'use strict';

  var moeda = function (v) { return (v === null || v === undefined || isNaN(v)) ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num2 = function (v) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pct = function (v, casas) { return (v === null || v === undefined || isNaN(v)) ? '—' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas === undefined ? 2 : casas, maximumFractionDigits: casas === undefined ? 2 : casas }) + '%'; };
  var dataBR = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—'; };
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var mesBR = function (m) { return MESES[+m.slice(5, 7) - 1] + '/' + m.slice(0, 4); };
  var EXTRATO_VELHO = 35;  // dias: depois disso o painel pede extratos novos do e-CAC

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
  // Numero do parcelamento e longo: o fim ja identifica (ex.: ...0038476989.22-73)
  function curto(id) { return id.length > 20 ? '…' + id.slice(-16) : id; }

  // ---------- calculos (sem tela) ----------
  // Parcela lancada aqui sai das "a vencer" e abate o saldo pelo valor do extrato, ate o proximo extrato marcar como paga.
  function calcular(dados, hoje) {
    var parcelasDe = {};
    (dados.parcelas || []).forEach(function (p) {
      (parcelasDe[p[0]] = parcelasDe[p[0]] || []).push({ n: p[1], vencimento: p[2], originario: p[3], valor: p[4], situacao: p[5], pago_em: p[6], valor_pago: p[7] });
    });
    var lancDe = {};
    (dados.lancamentos || []).forEach(function (l) { (lancDe[l.parcelamento] = lancDe[l.parcelamento] || {})[l.parcela] = l; });
    var limite12 = somaMeses(hoje, 12), mesHoje = hoje.slice(0, 7);
    var linhas = (dados.parcelamentos || []).map(function (p) {
      var todas = (parcelasDe[p.parcelamento] || []).slice().sort(function (a, b) { return a.n - b.n; }), aqui = lancDe[p.parcelamento] || {};
      var pagasAqui = todas.filter(function (x) { return x.situacao !== 'Paga' && aqui[x.n]; });
      var abertas = todas.filter(function (x) { return x.situacao !== 'Paga' && !aqui[x.n]; }).map(function (x) {
        return Object.assign({}, x, { dias: diasAte(hoje, x.vencimento) });
      });
      var saldo = Math.max(0, (p.saldo_devedor || 0) - pagasAqui.reduce(function (s, x) { return s + x.valor; }, 0));
      var prox = abertas[0] || null, vencidas = abertas.filter(function (x) { return x.dias < 0; });
      var status = saldo <= 0.01 && !abertas.length ? 'quitado' : vencidas.length ? 'vencida' : prox && prox.dias <= 7 ? 'a_vencer' : 'ok';
      var ultima = abertas.length ? abertas[abertas.length - 1].vencimento : null;
      return Object.assign({}, p, { todas: todas, abertas: abertas, pagas_aqui: pagasAqui.length, saldo: saldo, proximo: prox, vencidas: vencidas, status: status,
        fim: ultima, termina_12: !!(ultima && ultima <= limite12), pagas_total: todas.length - abertas.length,
        extrato_dias: p.extrato_de ? diasAte(p.extrato_de, hoje) : null });
    });
    var ativos = linhas.filter(function (l) { return l.saldo > 0.01; });
    var soma = function (arr, f) { return arr.reduce(function (s, x) { return s + (typeof f === 'function' ? f(x) : (x[f] || 0)); }, 0); };
    var abertas = [];
    ativos.forEach(function (l) { l.abertas.forEach(function (x) { abertas.push(Object.assign({ parcelamento: l.parcelamento, empresa: l.empresa, modalidade: l.modalidade }, x)); }); });
    abertas.sort(function (a, b) { return a.vencimento.localeCompare(b.vencimento) || a.parcelamento.localeCompare(b.parcelamento); });
    var vencidas = abertas.filter(function (x) { return x.dias < 0; });
    var doMes = abertas.filter(function (x) { return x.dias >= 0 && x.vencimento.slice(0, 7) === mesHoje; });
    var curva = [];
    for (var i = 0; i < 24; i++) {
      var mes = somaMeses(mesHoje + '-01', i).slice(0, 7);
      curva.push({ mes: mes, valor: soma(abertas.filter(function (x) { return x.vencimento.slice(0, 7) === mes || (i === 0 && x.dias < 0); }), 'valor') });
    }
    linhas.forEach(function (l) { l.custo_total = custoTotal(l, l.todas, lancDe[l.parcelamento] || {}); });
    var comTotal = linhas.filter(function (l) { return l.custo_total; });
    var ct = null;
    if (comTotal.length) {
      var pr = soma(comTotal, 'principal'), pago = soma(comTotal, function (l) { return l.custo_total.pago; }), dc = soma(comTotal, function (l) { return l.custo_total.divida; });
      var todos = [];  // todos os fluxos na mesma regua (meses desde 2000) para uma taxa unica da carteira
      comTotal.forEach(function (l) { l.custo_total.fluxos.forEach(function (f) { todos.push([mesesEntre('2000-01-01', f[0]), f[1]]); }); });
      ct = { principal: pr, multa_pct: soma(comTotal, 'multa') / pr, juros_pct: soma(comTotal, 'juros') / pr, selic_pct: (pago - dc) / pr, total_pct: (pago - pr) / pr,
        efetivo_am: taxaInterna(todos) };
    }
    var comCusto = ativos.filter(function (l) { return l.custo_am; });
    var custo = soma(comCusto, 'saldo') ? soma(comCusto, function (l) { return l.saldo * l.custo_am; }) / soma(comCusto, 'saldo') : null;
    var debitos = (dados.debitos || []).map(function (d) {
      var dias = d.vencimento ? diasAte(hoje, d.vencimento) : null;
      var contestado = CONTESTADO.test(d.tipo || '');  // ja pago, aguardando baixa na Receita: nao e divida
      return Object.assign({}, d, { dias: dias, contestado: contestado, vencido: !contestado && dias !== null && dias < 0 });
    });
    var devidos = debitos.filter(function (d) { return !d.contestado; });
    var porEmpresa = {};
    ativos.forEach(function (l) { var e = porEmpresa[l.empresa] = porEmpresa[l.empresa] || { saldo: 0, n: 0, parcela: 0 }; e.saldo += l.saldo; e.n++; e.parcela += l.proximo ? l.proximo.valor : 0; });
    var extratos = linhas.map(function (l) { return l.extrato_de; }).filter(Boolean).sort();
    return {
      linhas: linhas, ativos: ativos, abertas: abertas, vencidas: vencidas, doMes: doMes, curva: curva, debitos: debitos, porEmpresa: porEmpresa,
      terminam: ativos.filter(function (l) { return l.termina_12; }).sort(function (a, b) { return a.fim.localeCompare(b.fim); }),
      kpis: {
        saldo: soma(ativos, 'saldo'), parcelamentos: ativos.length, parcela_mensal: soma(ativos, function (l) { return l.proximo ? l.proximo.valor : 0; }),
        mes_valor: soma(doMes, 'valor'), mes_n: doMes.length, vencidas_n: vencidas.length, vencidas_valor: soma(vencidas, 'valor'),
        custo_am: custo, custo_aa: custo === null ? null : Math.pow(1 + custo, 12) - 1,
        multa: soma(ativos, 'multa'), juros_consolidacao: soma(ativos, 'juros'), custo_total: ct, alivio_12: soma(ativos.filter(function (l) { return l.termina_12; }), function (l) { return l.proximo ? l.proximo.valor : 0; }),
        debitos_valor: soma(devidos.filter(function (d) { return d.valor; }), 'valor'), debitos_vencidos: devidos.filter(function (d) { return d.vencido; }).length,
        pendencias: devidos.filter(function (d) { return !d.valor; }).length, debitos_n: devidos.filter(function (d) { return d.valor; }).length,
        contestados_n: debitos.length - devidos.length, contestados_valor: soma(debitos.filter(function (d) { return d.contestado; }), 'valor'),
        extrato_mais_antigo: extratos[0] || null, extrato_dias: extratos[0] ? diasAte(extratos[0], hoje) : null
      }
    };
  }

  // ---------- custo total (com multa) ----------
  // O parcelamento visto como emprestimo do PRINCIPAL na data da consolidacao, pago pelas parcelas: pagas pelo valor pago,
  // lancadas aqui pelo DARF, a pagar pela estimativa (extrato + Selic). Os juros iniciais cobrem o tempo antes da
  // consolidacao, entao a taxa a.m. sai um pouco acima da real; a multa e esses juros ja nao voltam (custo do atraso).
  function mesesEntre(a, b) {
    var t = function (s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
    return (t(b) - t(a)) / 86400000 / 30.4375;
  }
  function taxaInterna(fluxos) {  // [[meses, valor]]: entrada positiva, pagamentos negativos; taxa mensal que zera o valor presente
    var vp = function (r) { return fluxos.reduce(function (s, f) { return s + f[1] / Math.pow(1 + r, f[0]); }, 0); };
    var lo = -0.05, hi = 0.2;
    if (!(vp(lo) < 0 && vp(hi) > 0)) return null;
    for (var k = 0; k < 100; k++) { var m = (lo + hi) / 2; if (vp(m) > 0) hi = m; else lo = m; }
    return Math.round((lo + hi) / 2 * 1e6) / 1e6;
  }
  function custoTotal(p, todas, aqui) {
    if (!(p.principal > 0) || !p.consolidacao || !todas.length) return null;
    var fluxos = [[p.consolidacao, p.principal]], pago = 0;
    todas.forEach(function (x) {
      var v, d;
      if (x.situacao === 'Paga') { v = x.valor_pago || x.originario || 0; d = x.pago_em || x.vencimento; }
      else if (aqui[x.n]) { v = aqui[x.n].valor; d = aqui[x.n].data; }
      else { v = estimarDARF(p, x, x.vencimento); d = x.vencimento; }
      pago += v; fluxos.push([d, -v]);
    });
    var base = p.principal, divida = p.divida_consolidada || base + (p.multa || 0) + (p.juros || 0);
    return { fluxos: fluxos, pago: pago, divida: divida, multa_pct: (p.multa || 0) / base, juros_pct: (p.juros || 0) / base,
      selic_pct: (pago - divida) / base, total_pct: (pago - base) / base,
      efetivo_am: taxaInterna(fluxos.map(function (f) { return [mesesEntre(p.consolidacao, f[0]), f[1]]; })) };
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
  // Nomes curtos so na tabela (o nome completo fica no detalhe e no "title")
  var CONTESTADO = /contesta|j[aá] pago|baixa/i;  // Tipo do debito na aba Débitos
  var TRIB_CURTO = [[/IRRF sal[aá]rios/i, 'IRRF sal.'], [/IRRF servi[cç]os/i, 'IRRF serv.'], [/INSS[^,]*/i, 'INSS'], [/Reten[cç][oõ]es PIS\/COFINS\/CSLL/i, 'CSRF']];
  function tributosCurto(t) { var s = String(t || ''); TRIB_CURTO.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s; }
  function modalidadeCurta(m) { return String(m || '').replace(/^Parcelamento simplificado$/i, 'Simplificado').replace(/^Parcelamento de processo$/i, 'Processo'); }
  function tdTitulo(curto, completo) { var c = td(curto); if (curto !== completo) c.setAttribute('title', completo); return c; }
  function tabela(id, titulos) {
    var t = el('table', { id: id, 'class': 'ru-tabela' }), tr = el('tr');
    titulos.forEach(function (x) { tr.appendChild(el('th', typeof x === 'object' ? { 'class': x.cls } : {}, typeof x === 'object' ? x.t : x)); });
    add(t, add(el('thead'), tr), el('tbody'));
    return t;
  }
  function tag(texto, tipo) { return el('span', { 'class': 'ru-tag ' + (tipo || '') }, texto); }
  function tagParcela(x) { return x.dias < 0 ? tag('vencida há ' + (-x.dias) + 'd', 'alerta') : x.dias <= 7 ? tag('em ' + x.dias + 'd', 'atencao') : tag('em ' + x.dias + 'd', 'ok'); }

  var E = { raiz: null, op: null, dados: null, calc: null, empresa: 'todas', graficos: [], mostrarConferidos: false, aba: null };

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
    E.raiz = raiz; E.mostrarConferidos = false; E.empresa = 'todas'; E.aba = null;
    E.op = Object.assign({ hoje: hojeLocal(), semGraficos: false }, opcoes || {});
    if (!E.op.chamar) E.op.chamar = function (corpo) { return global.RuralAuth.chamar('parcelamentos', E.op.url, corpo); };
    raiz.textContent = '';
    raiz.appendChild(el('div', { id: 'pc-app', 'class': 'ru-pagina' }, 'Carregando os parcelamentos…'));
    await carregar();
  }

  async function carregar() {
    var r;
    try { r = await chamar({ acao: 'dados' }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    if (r && r.ok && !Array.isArray(r.parcelamentos)) r = { ok: false, message: 'O servidor respondeu fora do esperado. Recarregue a página em instantes.' };
    var app = E.raiz.querySelector('#pc-app');
    if (!r || !r.ok) { app.textContent = ''; add(app, el('p', { 'class': 'ru-erro' }, (r && r.message) || 'Não foi possível carregar os dados.')); return; }
    E.dados = r;
    desenhar();
  }

  function filtrados() {
    var ok = function (x) { return E.empresa === 'todas' || x.empresa === E.empresa; };
    var parc = E.dados.parcelamentos.filter(ok), ids = parc.map(function (p) { return p.parcelamento; });
    return { parcelamentos: parc, parcelas: (E.dados.parcelas || []).filter(function (p) { return ids.indexOf(p[0]) >= 0; }),
      debitos: (E.dados.debitos || []).filter(ok), lancamentos: E.dados.lancamentos.filter(function (l) { return ids.indexOf(l.parcelamento) >= 0; }) };
  }

  function desenhar() {
    E.calc = calcular(filtrados(), E.op.hoje);
    var c = E.calc, k = c.kpis, d = E.dados, app = E.raiz.querySelector('#pc-app');
    app.textContent = '';
    E.graficos.forEach(function (g) { try { g.destroy(); } catch (e) { /* ignora */ } }); E.graficos = [];

    var bl = null;
    if (d.pode_lancar) { bl = el('button', { type: 'button', id: 'pc-btn-lancar', 'class': 'ru-btn prim' }, '+ Lançar DARF pago'); bl.onclick = function () { formulario(); }; }
    var usuario = E.op.usuario && E.op.usuario.nome ? E.op.usuario : (d.usuario ? { nome: d.usuario } : null);
    var sub = 'Rural e RNA · extratos da Receita de ' + dataBR(k.extrato_mais_antigo);
    if (global.RuralUI) {
      global.RuralUI.topo(app, { app: 'parcelamentos', titulo: 'Parcelamentos fiscais', sub: sub,
        logo: E.op.logo, usuario: usuario, apps: E.op.apps || [], admin: !!(E.op.usuario && E.op.usuario.admin), aoSair: E.op.aoSair, acoes: [bl] });
    } else { add(app, el('h1', {}, 'Parcelamentos fiscais'), bl); }

    var filtros = el('div', { 'class': 'ru-filtros' }), s = el('select', { id: 'pc-filtro-empresa', 'aria-label': 'Todas as empresas' });
    [['todas', 'Todas as empresas']].concat(unicos(d.parcelamentos, 'empresa').map(function (x) { return [x, x]; })).forEach(function (o) {
      var op = el('option', { value: o[0] }, o[1]); if (o[0] === E.empresa) op.selected = true; s.appendChild(op);
    });
    s.onchange = function () { E.empresa = s.value; desenhar(); };
    add(app, add(filtros, s));

    var P = abas(app, [['painel', 'Painel'], ['parcelamentos', 'Parcelamentos (' + c.ativos.length + ')'], ['calendario', 'Calendário'],
      ['debitos', 'Não parcelados (' + c.debitos.length + ')'], ['lancamentos', 'Lançamentos']]);

    // ---- Painel: visao geral; cada cartao abre a aba do assunto ----
    kpis(P.painel, 'pc-kpis', [
      ['Saldo devedor', moeda(k.saldo), k.parcelamentos + ' parcelamentos' + resumoEmpresas(c.porEmpresa), 'neutro'],
      ['Parcelas de ' + mesBR(E.op.hoje.slice(0, 7)), moeda(k.mes_valor), k.mes_n + ' parcela(s) a vencer no mês', ''],
      ['Vencidas sem DARF lançado', moeda(k.vencidas_valor), k.vencidas_n ? k.vencidas_n + ' parcela(s): conferir pagamento' : 'nenhuma', k.vencidas_n ? 'alerta' : 'bom'],
      ['Não parcelados', moeda(k.debitos_valor), k.pendencias ? k.pendencias + ' pendência(s) sem valor' : k.contestados_n ? k.contestados_n + ' já pago(s), aguardando baixa' : 'impostos fora de parcelamento', k.debitos_valor || k.pendencias ? 'alerta' : 'bom']
    ]);
    ['parcelamentos', 'calendario', 'calendario', 'debitos'].forEach(function (aba, i) {
      var cartao = P.painel.querySelectorAll('#pc-kpis .ru-kpi')[i];
      cartao.classList.add('clicavel'); cartao.setAttribute('role', 'button'); cartao.tabIndex = 0; cartao.title = 'Abrir a aba';
      cartao.onclick = function () { P._mostrar(aba); global.scrollTo && global.scrollTo(0, 0); };
      cartao.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); cartao.onclick(); } };
    });

    var avisos = [];
    if (k.extrato_dias !== null && k.extrato_dias > EXTRATO_VELHO) avisos.push('Extratos de ' + dataBR(k.extrato_mais_antigo) + ' (' + k.extrato_dias + ' dias): baixe os novos no e-CAC para atualizar a planilha.');
    if (k.vencidas_n) avisos.push(k.vencidas_n + ' parcela(s) venceram depois do extrato e não têm DARF lançado aqui: lance o pagamento ou confira no e-CAC.');
    if (k.debitos_vencidos) avisos.push(k.debitos_vencidos + ' débito(s) fora de parcelamento com vencimento passado: confirmar se foram pagos.');
    if (k.contestados_n) avisos.push(k.contestados_n + ' débito(s) já pago(s) com pedido de baixa na Receita (' + moeda(k.contestados_valor) + '): acompanhar o processo até sair do Cadin.');
    if (k.pendencias) avisos.push(k.pendencias + ' pendência(s) no relatório de situação fiscal sem valor: ver aba Não parcelados.');
    if (avisos.length) { var av = el('div', { 'class': 'ru-card', id: 'pc-avisos' }); add(av, el('h2', {}, 'Atenção')); avisos.forEach(function (t) { av.appendChild(el('p', { 'class': 'ru-nota' }, '• ' + t)); }); P.painel.appendChild(av); }

    secao(P.painel, 'Custo e prazo', '#2060A8');
    kpis(P.painel, 'pc-kpis-custo', [
      ['Parcela mensal hoje', moeda(k.parcela_mensal), 'soma da próxima parcela de cada um', 'neutro'],
      ['Custo médio daqui pra frente', k.custo_am === null ? '—' : pct(k.custo_am) + ' a.m.', k.custo_aa === null ? '' : 'só Selic, sem multa · cerca de ' + pct(k.custo_aa, 1) + ' a.a.', 'bom'],
      ['Custo médio com multa', k.custo_total && k.custo_total.efetivo_am !== null ? pct(k.custo_total.efetivo_am) + ' a.m.' : '—', 'multa, juros iniciais e Selic, do começo ao fim', 'alerta'],
      ['Multa e juros na consolidação', moeda(k.multa + k.juros_consolidacao), 'custo do atraso, já incluído nas parcelas', k.multa ? 'alerta' : ''],
      ['Terminam em 12 meses', String(c.terminam.length), c.terminam.length ? 'libera ' + moeda(k.alivio_12) + ' por mês' : 'nenhum', 'neutro']
    ]);
    add(P.painel, el('p', { 'class': 'ru-nota' }, 'Custo com multa = taxa mensal de tudo o que se paga a mais sobre o tributo original (multa e juros da consolidação + Selic paga e estimada até a última parcela), como se fosse um empréstimo na data da consolidação. Já inclui a Selic: não se soma ao custo daqui pra frente.'));
    add(P.painel, el('p', { 'class': 'ru-nota' }, 'Para decidir antecipar, vale o custo daqui pra frente: a multa e os juros iniciais já estão na dívida e não voltam. Parcelamento da Receita corrige pela Selic, sem spread: hoje sai mais barato que capital de giro (1,8% a 3% a.m.) e que desconto de duplicatas. O que custa caro é atrasar (nova multa de até 20% e perda do parcelamento).'));

    if (!E.op.semGraficos && typeof global.Chart !== 'undefined') {
      secao(P.painel, 'Gráficos', '#1F3550');
      var grade = el('div', { 'class': 'ru-grade' });
      var g1 = cardGrafico('Parcelas a pagar, próximos 24 meses', 'pc-g-curva'), g2 = cardGrafico('Saldo por parcelamento', 'pc-g-saldo');
      add(P.painel, add(grade, g1.card, g2.card));
      graficos(g1.canvas, g2.canvas);
    }

    desenharParcelamentos(P.parcelamentos);
    desenharCalendario(P.calendario);
    desenharDebitos(P.debitos);
    desenharLancamentos(P.lancamentos);
    add(app, el('div', { 'class': 'ru-nota' }, 'Dados da planilha Parcelamentos (abas Parcelamentos, Parcelas, Débitos e Lançamentos) · gerado em ' + (d.gerado_em || '')));
  }

  function resumoEmpresas(pe) {
    var ks = Object.keys(pe).sort();
    return ks.length > 1 ? ' (' + ks.map(function (e) { return e + ' ' + pe[e].n; }).join(', ') + ')' : '';
  }
  function unicos(arr, campo) { var o = []; arr.forEach(function (x) { if (x[campo] && o.indexOf(x[campo]) < 0) o.push(x[campo]); }); return o.sort(); }

  function desenharParcelamentos(pai) {
    var c = E.calc, k = c.kpis, pe = c.porEmpresa;
    secao(pai, 'Parcelamentos', '#2060A8', moeda(k.saldo) + ' · ' + k.parcelamentos + ' ativos');
    var cart = Object.keys(pe).sort().map(function (e) { return [e, moeda(pe[e].saldo), pe[e].n + ' parcelamento(s) · ' + moeda(pe[e].parcela) + '/mês', 'neutro']; });
    cart.push(['Terminam em 12 meses', String(c.terminam.length), c.terminam.map(function (l) { return mesBR(l.fim.slice(0, 7)); }).join(', ') || 'nenhum', 'neutro']);
    kpis(pai, 'pc-kpis-parc', cart);
    var cc = el('div', { 'class': 'ru-card' });
    add(cc, el('h2', {}, 'Todos os parcelamentos'), el('div', { 'class': 'ru-nota' }, 'Clique num parcelamento para ver as parcelas e a composição da dívida. Parcela = valor do extrato; o DARF do mês sai um pouco maior (Selic do mês). CSRF = retenções PIS/COFINS/CSLL.'));
    var t = tabela('pc-tab-parc', ['Empresa', 'Parcelamento', 'Modalidade', 'Tributos', { t: 'Saldo', cls: 'n' }, { t: 'Parcela', cls: 'n' }, 'Pagas', 'Próxima', 'Termina', { t: 'Só Selic a.m.', cls: 'n' }, { t: 'Com multa a.m.', cls: 'n' }]);
    c.linhas.slice().sort(function (a, b) { return b.saldo - a.saldo; }).forEach(function (l) {
      var tr = el('tr', { 'data-parc': l.parcelamento, 'class': 'clicavel' + (l.saldo <= 0.01 ? ' apagado' : '') });
      var prox = el('td');
      if (l.proximo) { prox.appendChild(document.createTextNode(dataBR(l.proximo.vencimento) + ' ')); prox.appendChild(tagParcela(l.proximo)); }
      else prox.appendChild(tag('quitado', 'info'));
      var fim = el('td'); fim.appendChild(document.createTextNode(dataBR(l.fim))); if (l.termina_12) { fim.appendChild(document.createTextNode(' ')); fim.appendChild(tag('< 12 meses', 'ok')); }
      var tdTrib = tdTitulo(tributosCurto(l.tributos), l.tributos); tdTrib.style.whiteSpace = 'normal'; tdTrib.style.minWidth = '130px';
      add(tr, td(l.empresa), td(curto(l.parcelamento)), tdTitulo(modalidadeCurta(l.modalidade), l.modalidade), tdTrib, td(moeda(l.saldo), 'n'), td(l.proximo ? moeda(l.proximo.valor) : '—', 'n'),
        td(l.pagas_total + ' de ' + l.todas.length), prox, fim, td(pct(l.custo_am), 'n'));
      var ct = l.custo_total;
      add(tr, td(ct && ct.efetivo_am !== null ? pct(ct.efetivo_am) : '—', 'n'));
      tr.onclick = function () { detalhe(l); };
      t.querySelector('tbody').appendChild(tr);
    });
    add(pai, add(cc, add(el('div', { 'class': 'ru-rolagem' }), t)));
  }

  function desenharCalendario(pai) {
    var c = E.calc, k = c.kpis, hoje = E.op.hoje, m1 = somaMeses(hoje.slice(0, 7) + '-01', 1).slice(0, 7), m2 = somaMeses(hoje.slice(0, 7) + '-01', 2).slice(0, 7);
    var noMes = function (m) { return c.abertas.filter(function (x) { return x.dias >= 0 && x.vencimento.slice(0, 7) === m; }); };
    var sm = function (a) { return a.reduce(function (s, x) { return s + x.valor; }, 0); };
    secao(pai, 'Calendário de pagamentos', '#289048', 'próximos 3 meses');
    kpis(pai, 'pc-kpis-cal', [
      ['Vencidas sem DARF lançado', moeda(k.vencidas_valor), k.vencidas_n + ' parcela(s)', k.vencidas_n ? 'alerta' : 'bom'],
      [mesBR(hoje.slice(0, 7)), moeda(k.mes_valor), k.mes_n + ' parcela(s)', ''],
      [mesBR(m1), moeda(sm(noMes(m1))), noMes(m1).length + ' parcela(s)', ''],
      [mesBR(m2), moeda(sm(noMes(m2))), noMes(m2).length + ' parcela(s)', '']
    ]);
    var cc = el('div', { 'class': 'ru-card', id: 'pc-calendario' });
    add(cc, el('h2', {}, 'Parcelas a pagar'), el('div', { 'class': 'ru-nota' }, 'Vencidas (depois do último extrato) e as dos próximos 3 meses. Pagou? Use "Lançar" na linha: a parcela sai desta lista até o próximo extrato confirmar.'));
    var tit = ['Vencimento', 'Empresa', 'Parcelamento', { t: 'Nº', cls: 'n' }, { t: 'Valor (extrato)', cls: 'n' }, 'Situação'];
    if (E.dados.pode_lancar) tit.push('');
    var t = tabela('pc-tab-cal', tit), limite = somaMeses(hoje.slice(0, 7) + '-01', 3);
    c.abertas.filter(function (x) { return x.vencimento < limite; }).forEach(function (x) {
      var tr = add(el('tr', x.dias < 0 ? { 'class': 'destaque' } : {}), td(dataBR(x.vencimento)), td(x.empresa), td(curto(x.parcelamento)), td(String(x.n), 'n'), td(moeda(x.valor), 'n'), add(el('td'), tagParcela(x)));
      if (E.dados.pode_lancar) { var b = el('button', { type: 'button', 'class': 'ru-btn', 'data-lancar': x.parcelamento + '#' + x.n }, 'Lançar'); b.onclick = function () { formulario(x.parcelamento, x.n); }; add(tr, add(el('td'), b)); }
      t.querySelector('tbody').appendChild(tr);
    });
    add(pai, add(cc, add(el('div', { 'class': 'ru-rolagem' }), t)));
    if (!t.querySelector('tbody').children.length) cc.appendChild(el('p', { 'class': 'ru-nota' }, 'Nenhuma parcela nos próximos 3 meses.'));
  }

  function desenharDebitos(pai) {
    var c = E.calc, k = c.kpis;
    secao(pai, 'Débitos fora de parcelamento', '#B4462E', moeda(k.debitos_valor));
    kpis(pai, 'pc-kpis-deb', [
      ['Total não parcelado', moeda(k.debitos_valor), k.debitos_n + ' débito(s)' + (k.contestados_n ? ' · ' + k.contestados_n + ' já pago(s) fora do total' : ''), k.debitos_valor ? 'alerta' : 'bom'],
      ['Com vencimento passado', String(k.debitos_vencidos), 'confirmar se o DARF foi pago', k.debitos_vencidos ? 'alerta' : 'bom'],
      ['Pendências sem valor', String(k.pendencias), 'processos no relatório da Receita', k.pendencias ? 'atencao' : 'bom']
    ]);
    var cc = el('div', { 'class': 'ru-card' });
    add(cc, el('h2', {}, 'Débitos e pendências'), el('div', { 'class': 'ru-nota' }, 'Do relatório de situação fiscal da Receita (e-CAC). Débito não pago e não parcelado pode virar dívida ativa e impedir a certidão negativa.'));
    var t = tabela('pc-tab-deb', ['Empresa', 'Tipo', 'Receita', 'Período', 'Vencimento', { t: 'Valor', cls: 'n' }, 'Situação na Receita', 'O que fazer']);
    c.debitos.forEach(function (d) {
      var v = el('td'); v.appendChild(document.createTextNode(dataBR(d.vencimento) + ' ')); if (d.vencido) v.appendChild(tag('passou', 'alerta')); else if (d.contestado) v.appendChild(tag('já pago', 'ok'));
      add(t.querySelector('tbody'), add(el('tr'), td(d.empresa), td(d.tipo), td(d.receita), td(d.periodo || '—'), v, td(d.valor ? moeda(d.valor) : '—', 'n'), td(d.situacao), td(d.acao)));
    });
    add(pai, add(cc, add(el('div', { 'class': 'ru-rolagem' }), t)));
    if (!c.debitos.length) cc.appendChild(el('p', { 'class': 'ru-nota' }, 'Nenhum débito fora de parcelamento.'));
  }

  function desenharLancamentos(pai) {
    var d = E.dados, cl = el('div', { 'class': 'ru-card' });
    // "no extrato" = o extrato mais novo ja traz a parcela como paga
    var paga = {};
    (d.parcelas || []).forEach(function (p) { if (p[5] === 'Paga') paga[p[0] + '#' + p[1]] = true; });
    var coberto = function (x) { return !!paga[x.parcelamento + '#' + x.parcela]; };
    var lista = E.calc ? d.lancamentos.filter(function (x) { return E.empresa === 'todas' || E.calc.linhas.some(function (l) { return l.parcelamento === x.parcelamento; }); }) : d.lancamentos;
    var n = lista.filter(coberto).length;
    var cab = el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px' });
    add(cab, el('h2', {}, 'DARFs lançados aqui'));
    if (n) { var bc = el('button', { type: 'button', id: 'pc-mostrar-conferidos', 'class': 'ru-btn' }, (E.mostrarConferidos ? 'Esconder' : 'Mostrar') + ' os já conferidos no extrato (' + n + ')'); bc.onclick = function () { E.mostrarConferidos = !E.mostrarConferidos; desenhar(); }; cab.appendChild(bc); }
    add(cl, cab, el('div', { 'class': 'ru-nota' }, '"A conferir" = lançado aqui e o extrato ainda não mostra a parcela como paga. "No extrato" = a Receita já registrou; fica na planilha como histórico.'));
    var tit = ['Data', 'Parcelamento', { t: 'Parcela', cls: 'n' }, { t: 'Valor', cls: 'n' }, 'Observação', 'Lançado por', 'Situação'];
    if (d.pode_lancar) tit.push('');
    var tl = tabela('pc-lancamentos', tit);
    var vis = lista.filter(function (x) { return E.mostrarConferidos || !coberto(x); });
    vis.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).forEach(function (x) {
      var ok = coberto(x), tr = add(el('tr'), td(dataBR(x.data)), td(curto(x.parcelamento)), td(String(x.parcela), 'n'), td(moeda(x.valor), 'n'), td(x.obs), td(x.por || '—'), add(el('td'), tag(ok ? 'no extrato' : 'a conferir', ok ? 'ok' : 'atencao')));
      if (d.pode_lancar) { var bx = el('button', { type: 'button', 'class': 'ru-btn x', 'data-excluir': x.id, 'aria-label': 'Excluir lançamento ' + x.id }, '✕'); bx.onclick = function () { excluir(x); }; add(tr, add(el('td'), bx)); }
      tl.querySelector('tbody').appendChild(tr);
    });
    add(pai, add(cl, add(el('div', { 'class': 'ru-rolagem' }), tl)));
    if (!vis.length) cl.appendChild(el('p', { id: 'pc-lancamentos-vazio', 'class': 'ru-nota' }, 'Nenhum DARF a conferir.'));
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
  var CHAVE_ABA = 'pc:aba';
  function abaGuardada() { try { return global.localStorage.getItem(CHAVE_ABA); } catch (e) { return null; } }
  function guardarAba(id) { try { global.localStorage.setItem(CHAVE_ABA, id); } catch (e) { /* sem armazenamento */ } }
  function abas(app, lista) {
    var nav = el('div', { 'class': 'ru-abas', role: 'tablist', id: 'pc-abas' }), P = {}, bts = {};
    if (!E.aba) E.aba = abaGuardada();
    if (!lista.some(function (x) { return x[0] === E.aba; })) E.aba = lista[0][0];
    function mostrar(id) {
      E.aba = id; guardarAba(id);
      lista.forEach(function (x) { var on = x[0] === id; P[x[0]].hidden = !on; bts[x[0]].setAttribute('aria-selected', on ? 'true' : 'false'); bts[x[0]].tabIndex = on ? 0 : -1; });
    }
    lista.forEach(function (x, i) {
      var b = el('button', { type: 'button', role: 'tab', id: 'pc-aba-' + x[0], 'aria-controls': 'pc-painel-' + x[0], 'data-aba': x[0] }, x[1]);
      b.onclick = function () { mostrar(x[0]); };
      b.onkeydown = function (ev) {
        var dd = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (!dd) return;
        var prox = lista[(i + dd + lista.length) % lista.length][0]; mostrar(prox); bts[prox].focus(); ev.preventDefault();
      };
      bts[x[0]] = b; nav.appendChild(b);
      P[x[0]] = el('div', { role: 'tabpanel', id: 'pc-painel-' + x[0], 'aria-labelledby': 'pc-aba-' + x[0] });
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
  function graficos(c1, c2) {
    var c = E.calc, Chart = global.Chart;
    Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--ru-fonte') || 'Outfit, sans-serif';
    Chart.defaults.color = '#6B7280';
    var rot = function (m) { return MESES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4); }, mil = function (v) { return (v / 1000).toFixed(0) + 'k'; };
    E.graficos.push(new Chart(c1, { type: 'bar', data: { labels: c.curva.map(function (x) { return rot(x.mes); }), datasets: [{ label: 'Parcelas', data: c.curva.map(function (x) { return x.valor; }), backgroundColor: '#2060A8', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return moeda(x.raw); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return 'R$ ' + mil(v); } } } } } }));
    var at = c.ativos.slice().sort(function (a, b) { return b.saldo - a.saldo; });
    E.graficos.push(new Chart(c2, { type: 'bar', data: { labels: at.map(function (l) { return l.empresa + ' ' + l.parcelamento.slice(-8); }),
      datasets: [{ label: 'Saldo', data: at.map(function (l) { return l.saldo; }), backgroundColor: at.map(function (l) { return l.empresa === 'RNA' ? '#289048' : '#2060A8'; }), borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return moeda(x.raw); } } } }, scales: { x: { beginAtZero: true, ticks: { callback: function (v) { return 'R$ ' + mil(v); } } } } } }));
  }

  function detalhe(l) {
    var w = janela(l.modalidade + ' · ' + l.empresa, 'pc-detalhe');
    add(w.corpo, el('div', { 'class': 'ru-sub' }, l.parcelamento + ' · ' + l.tributos + ' · consolidado em ' + dataBR(l.consolidacao) + ' · extrato de ' + dataBR(l.extrato_de)));
    if (l.divida_consolidada) {
      add(w.corpo, el('p', { 'class': 'ru-nota' }, 'Dívida consolidada ' + moeda(l.divida_consolidada) + ' = principal ' + moeda(l.principal) + ' + multa ' + moeda(l.multa) + ' + juros ' + moeda(l.juros) +
        '. Saldo hoje ' + moeda(l.saldo) + ' (' + l.abertas.length + ' parcela(s) em aberto).'));
    }
    var ct = l.custo_total;
    add(w.corpo, el('p', { id: 'pc-detalhe-custo', 'class': 'ru-nota' }, ct
      ? 'Custo daqui pra frente (só Selic): ' + pct(l.custo_am) + ' a.m. · Com multa (multa, juros iniciais e Selic): ' + (ct.efetivo_am === null ? '—' : pct(ct.efetivo_am) + ' a.m.') + '.'
      : 'Custo daqui pra frente (só Selic): ' + pct(l.custo_am) + ' a.m. O extrato deste parcelamento não traz principal, multa e juros, então não dá para calcular o custo com multa.'));
    var t = el('table', { 'class': 'ru-tabela' }), cab = el('tr');
    ['Nº', 'Vencimento', 'Valor', 'Situação'].forEach(function (x, i) { cab.appendChild(el('th', i === 2 ? { 'class': 'n' } : {}, x)); });
    add(t, add(el('thead'), cab));
    var tb = el('tbody'), aqui = {};
    E.dados.lancamentos.forEach(function (x) { if (x.parcelamento === l.parcelamento) aqui[x.parcela] = x; });
    l.todas.slice().reverse().forEach(function (p) {
      var sit = el('td');
      if (p.situacao === 'Paga') sit.appendChild(tag(p.pago_em && p.pago_em > p.vencimento ? 'paga com atraso em ' + dataBR(p.pago_em) : 'paga', p.pago_em && p.pago_em > p.vencimento ? 'atencao' : 'ok'));
      else if (aqui[p.n]) sit.appendChild(tag('DARF lançado aqui', 'info'));
      else sit.appendChild(tagParcela({ dias: diasAte(E.op.hoje, p.vencimento) }));
      var valor = p.situacao === 'Paga' ? (p.valor_pago || p.originario) : p.valor;
      add(tb, add(el('tr'), td(String(p.n)), td(dataBR(p.vencimento)), td(num2(valor), 'n'), sit));
    });
    add(w.corpo, add(el('div', { 'class': 'ru-rolagem' }), add(t, tb)));
    var bts = el('div', { 'class': 'ru-bts' }), f = el('button', { type: 'button', 'class': 'ru-btn prim' }, 'Fechar'); f.onclick = w.fechar;
    add(w.corpo, add(bts, f));
  }

  // DARF estimado: valor do extrato + Selic (custo a.m. dos ultimos 12 meses) de cada mes entre o extrato e o pagamento.
  function estimarDARF(l, p, data) {
    if (!p) return null;
    var ref = l.extrato_de, i = l.custo_am || 0;
    if (!ref || !i || !/^\d{4}-\d{2}/.test(data || '')) return p.valor;
    var meses = (+data.slice(0, 4) - +ref.slice(0, 4)) * 12 + (+data.slice(5, 7) - +ref.slice(5, 7));
    return Math.round(p.valor * Math.pow(1 + i, Math.max(0, meses)) * 100) / 100;
  }

  function formulario(parcInicial, nInicial) {
    var d = E.dados, w = janela('Lançar DARF pago'), form = el('form', { id: 'pc-form', novalidate: 'novalidate' });
    var linhas = calcular(d, E.op.hoje).ativos.slice().sort(function (a, b) { return (a.empresa + a.parcelamento).localeCompare(b.empresa + b.parcelamento); });
    add(form, el('label', { 'for': 'pc-f-parc' }, 'Parcelamento'));
    var sp = el('select', { id: 'pc-f-parc' }); sp.appendChild(el('option', { value: '' }, 'Escolha o parcelamento…'));
    linhas.forEach(function (l) {
      var est = estimarDARF(l, l.abertas[0], E.op.hoje);
      sp.appendChild(el('option', { value: l.parcelamento }, l.empresa + ' · ' + curto(l.parcelamento) + ' · ' + l.modalidade + (est ? ' · parcela ≈ ' + moeda(est) : '')));
    });
    add(form, sp, el('label', { 'for': 'pc-f-n' }, 'Parcela'));
    var sn = el('select', { id: 'pc-f-n' });
    add(form, sn, el('label', { 'for': 'pc-f-data' }, 'Data do pagamento'));
    var dt = el('input', { id: 'pc-f-data', type: 'date', max: E.op.hoje }); dt.value = E.op.hoje;
    add(form, dt, el('label', { 'for': 'pc-f-valor' }, 'Valor do DARF (R$)'));
    var vl = el('input', { id: 'pc-f-valor', type: 'text', inputmode: 'decimal', placeholder: '0,00', autocomplete: 'off' });
    var dica = el('p', { id: 'pc-f-dica', 'class': 'ru-nota' });
    add(form, vl, dica, el('label', { 'for': 'pc-f-obs' }, 'Observação (opcional)'));
    var ob = el('input', { id: 'pc-f-obs', type: 'text', maxlength: '200' });
    var erro = el('div', { id: 'pc-f-erro', 'class': 'ru-erro', role: 'alert' });
    var bts = el('div', { 'class': 'ru-bts' }), cancelar = el('button', { type: 'button', 'class': 'ru-btn' }, 'Cancelar'), salvar = el('button', { type: 'submit', id: 'pc-f-salvar', 'class': 'ru-btn prim' }, 'Salvar');
    cancelar.onclick = w.fechar;
    add(form, ob, el('p', { 'class': 'ru-nota' }, 'O valor já vem estimado; confira e digite o valor exato do DARF pago.'), erro, add(bts, cancelar, salvar));
    w.corpo.appendChild(form);
    var digitado = false;
    vl.addEventListener('input', function () { digitado = true; });
    function parcelas() {
      sn.textContent = '';
      var l = linhas.filter(function (x) { return x.parcelamento === sp.value; })[0];
      (l ? l.abertas : []).forEach(function (p) { sn.appendChild(el('option', { value: String(p.n) }, p.n + ' · vence ' + dataBR(p.vencimento) + ' · ' + moeda(p.valor))); });
      digitado = false; sugerir();
    }
    function sugerir() {
      var l = linhas.filter(function (x) { return x.parcelamento === sp.value; })[0], p = l && l.abertas.filter(function (x) { return String(x.n) === sn.value; })[0];
      var est = estimarDARF(l, p, dt.value);
      if (!digitado) vl.value = p ? num2(est) : '';
      dica.textContent = !p ? '' : est > p.valor
        ? 'Estimativa para ' + dataBR(dt.value) + ': ' + moeda(est) + ' (extrato de ' + dataBR(l.extrato_de) + ': ' + moeda(p.valor) + ' + Selic de ~' + pct(l.custo_am) + ' a.m.).'
        : 'Valor do extrato de ' + dataBR(l.extrato_de) + ': ' + moeda(p.valor) + '.';
    }
    sp.onchange = parcelas; sn.onchange = function () { digitado = false; sugerir(); }; dt.addEventListener('change', sugerir);
    if (parcInicial) { sp.value = parcInicial; parcelas(); if (nInicial) { sn.value = String(nInicial); sugerir(); } }
    var meuOp = opId(), enviando = false;
    async function enviar(confirmar) {
      if (enviando) return;
      erro.textContent = ''; var conf = form.querySelector('#pc-f-confirmar'); if (conf) conf.remove();
      var valor = lerValorBR(vl.value);
      if (!sp.value || !sn.value) { erro.textContent = 'Escolha o parcelamento e a parcela.'; return; }
      if (!(valor > 0)) { erro.textContent = 'Valor inválido. Use o formato 1.515,51.'; return; }
      if (!dt.value) { erro.textContent = 'Informe a data do pagamento.'; return; }
      enviando = true; salvar.disabled = true;
      var corpo = { acao: 'lancar', parcelamento: sp.value, parcela: Number(sn.value), data: dt.value, valor: valor, obs: ob.value.trim(), opId: meuOp };
      if (confirmar) corpo.confirmar_duplicado = true;
      var r; try { r = await chamar(corpo); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha. Tente de novo.' }; }
      enviando = false; salvar.disabled = false;
      if (r && r.ok) { w.fechar(); E.dados.lancamentos.push(r.lancamento); E.aba = 'lancamentos'; desenhar(); return; }
      erro.textContent = (r && r.message) || 'Não foi possível lançar.';
      if (r && r.error === 'duplicado') { var b = el('button', { type: 'button', id: 'pc-f-confirmar', 'class': 'ru-btn' }, 'É outro pagamento: lançar mesmo assim'); b.onclick = function () { enviar(true); }; bts.insertBefore(b, salvar); }
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); enviar(false); });
  }

  async function excluir(x) {
    if (!(await A._confirmar('Excluir o lançamento de ' + moeda(x.valor) + ' em ' + dataBR(x.data) + ' (parcela ' + x.parcela + ' de ' + curto(x.parcelamento) + ')? Ele fica registrado como excluído na planilha.'))) return;
    var r; try { r = await chamar({ acao: 'excluir', id: x.id, opId: opId() }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha.' }; }
    if (!r || !r.ok) { var w = janela('Não foi possível excluir'); add(w.corpo, el('p', {}, (r && r.message) || 'Erro.')); return; }
    E.dados.lancamentos = E.dados.lancamentos.filter(function (l) { return l.id !== x.id; });
    desenhar();
  }

  var A = { montar: montar, calcular: calcular, lerValorBR: lerValorBR, estimarDARF: estimarDARF, custoTotal: custoTotal, taxaInterna: taxaInterna, _confirmar: confirmarPadrao };
  global.ParcelamentosApp = A;
})(typeof window !== 'undefined' ? window : this);
