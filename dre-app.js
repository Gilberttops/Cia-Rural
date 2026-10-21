/* DRE - painel com login (kit Rural). GERADO por dre_tmp\gerar_app_dre.py a partir do painel_template.html: NAO editar a mao.
 * Dados: planilha "DRE" pelo script de dados (acao "dados"), sempre com login (RuralAuth). Sem dados neste arquivo.
 * Modo construtor (comissoes pagas, conferencia de exportacao, notas): so quando o servidor responde construtor=true,
 * isto e, para quem tem a permissao "DRE: modo construtor". Texto vindo dos dados entra escapado (esc) ou como textContent.
 * Uso: DreApp.montar(elemento, { url, usuario, apps, aoSair, logo })  (testes: { chamar: fn(corpo) -> Promise(resposta) }) */
(function (global) {
  var MARCACAO = "<div class=\"wrap\">\n  <header>\n    <div>\n      <span class=\"badge construtor\">modo construtor</span>\n      <div class=\"sub\">Rural Nutrição Animal (Eldorado) · RNA (Ivinhema) · <span id=\"dr-periodo\"></span> · base de <span id=\"dr-gerado\"></span> · uso interno · <span id=\"comlbl\">comissões: provisão de 7%</span></div>\n    </div>\n    <div class=\"ctrls\">\n      <div class=\"seg\" id=\"emp\"><button data-v=\"cons\" class=\"on\">Consolidado</button><button data-v=\"rural\">Rural</button><button data-v=\"rna\">RNA</button></div>\n      <div class=\"seg construtor\" id=\"com\" title=\"Comissões no DRE: provisão de 7% da receita ou o que foi pago no Agrotis\"><button data-v=\"prov\" class=\"on\">Comissão 7%</button><button data-v=\"paga\">Comissão paga</button></div>\n    </div>\n  </header>\n  <nav class=\"tabs\" id=\"tabs\">\n    <button data-v=\"socio\" class=\"on\">Visão do sócio</button>\n    <button data-v=\"ana\">Análises</button>\n    <button data-v=\"emp2\">Rural × RNA</button>\n    <button data-v=\"proj\">Projeção do ano</button>\n    <button data-v=\"mix\">Produtos e clientes</button>\n    <button data-v=\"cli\">Clientes</button>\n    <button data-v=\"caixa\">Lucro → caixa</button>\n    <button data-v=\"giro\">Capital de giro</button>\n    <button data-v=\"dem\">Demonstrativo</button>\n  </nav>\n  <div id=\"err\"></div>\n\n  <!-- ===== VISÃO DO SÓCIO ===== -->\n  <section id=\"t-socio\">\n    <div class=\"kpis\" id=\"s-kpis\"></div>\n    <div class=\"card\"><h2>Alertas</h2><p class=\"note\" id=\"s-alnote\"></p><div class=\"alerts\" id=\"s-alerts\"></div></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Evolução: receita e margens</h2><p class=\"note\">Receita líquida por ano (barras, R$ mi) e margens sobre a receita líquida (linhas). Margens comparam anos parciais com anos cheios.</p><div class=\"chartbox\"><canvas id=\"s-evo\"></canvas></div></div>\n      <div class=\"card\"><h2>Para onde vai a margem</h2><p class=\"note\">EBITDA (% da receita líquida) dividido em resultado financeiro, IRPJ/CSLL e o que sobra de lucro líquido.</p><div class=\"chartbox\"><canvas id=\"s-gap\"></canvas></div></div>\n    </div>\n    <div class=\"card\"><h2>Ponte EBITDA → lucro líquido</h2>\n      <div class=\"bar\"><select id=\"s-ano\"></select><span class=\"note\" id=\"s-ponte-note\" style=\"margin:0\"></span></div>\n      <div class=\"tbl\"><table id=\"s-ponte\"></table></div>\n    </div>\n  </section>\n\n  <!-- ===== ANÁLISES (13/10/2026): por que o lucro mudou, despesas fixas, equilíbrio, 12 meses, mapa de margens ===== -->\n  <section id=\"t-ana\" class=\"hide\">\n    <div class=\"bar\"><select id=\"a-ano\"></select><span class=\"note\" id=\"a-note\" style=\"margin:0\"></span></div>\n    <div class=\"kpis\" id=\"a-kpis\"></div>\n    <div class=\"card\"><h2>Por que o lucro mudou</h2><p class=\"note\" id=\"a-pnote\"></p>\n      <div class=\"chartbox\" style=\"height:340px\"><canvas id=\"a-ch\"></canvas></div>\n      <div class=\"tbl\" style=\"margin-top:12px\"><table id=\"a-tab\"></table></div>\n      <p class=\"note\" style=\"margin:14px 0 6px\"><b>Detalhe por canal e família</b>: os 10 com maior efeito.</p>\n      <div class=\"tbl\"><table id=\"a-det\"></table></div>\n      <div class=\"foot\">Volume, mix, preço e custo são calculados por canal e família de produto, pelas toneladas vendidas. <b>Volume</b> = toneladas a mais ou a menos × margem bruta por tonelada do ano anterior. <b>Mix</b> = efeito de vender proporcionalmente mais dos produtos/canais de margem maior ou menor. <b>Preço</b> e <b>custo</b> = variação da receita e do CMV por tonelada de cada canal/família, com as quantidades do ano atual. O custo por tonelada já inclui o preço da matéria-prima e os fretes de MP; os preços médios de cada insumo estão no app Compras.</div></div>\n    <div class=\"card\"><h2>Despesas fixas por grupo</h2><p class=\"note\" id=\"a-fnote\"></p><div class=\"tbl\"><table id=\"a-fix\"></table></div></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Onde as despesas mais mudaram</h2><p class=\"note\">Despesas variáveis e fixas, linha a linha, contra o mesmo período do ano anterior. \"Acima da receita\" = quanto a linha cresceu além do que cresceria se acompanhasse a receita líquida.</p><div class=\"tbl\"><table id=\"a-rank\"></table></div></div>\n      <div class=\"card\"><h2>Despesas fixas por grupo, ano a ano</h2><p class=\"note\">Em % da receita líquida de cada ano (anos parciais marcados com *).</p><div class=\"chartbox\"><canvas id=\"a-fevo\"></canvas></div></div>\n    </div>\n    <div class=\"card\"><h2>Ponto de equilíbrio</h2><p class=\"note\" id=\"a-enote\"></p><div class=\"kpis\" id=\"a-ekpis\"></div><div class=\"chartbox\"><canvas id=\"a-ech\"></canvas></div></div>\n    <div class=\"card\"><h2>Últimos 12 meses</h2><p class=\"note\">Soma dos 12 meses que terminam em cada mês: tira o efeito da sazonalidade e mostra a tendência. Receita líquida em barras (eixo da esquerda); EBITDA e lucro líquido em linhas (eixo da direita).</p><div class=\"kpis\" id=\"a-lkpis\"></div><div class=\"chartbox\"><canvas id=\"a-lch\"></canvas></div></div>\n    <div class=\"card\"><h2>Mapa de margens mês × ano</h2><p class=\"note\">Margem de cada mês sobre a receita líquida do mês. Verde = meses melhores, vermelho = piores (comparando todos os meses da tabela). A última linha é a margem de cada mês somando todos os anos.</p>\n      <div class=\"bar\"><div class=\"seg\" id=\"a-mind\"><button data-v=\"lb\">Bruta</button><button data-v=\"mc\">Contribuição</button><button data-v=\"eb\" class=\"on\">EBITDA</button><button data-v=\"ll\">Líquida</button></div></div>\n      <div class=\"tbl\"><table id=\"a-map\"></table></div></div>\n  </section>\n\n  <!-- ===== RURAL × RNA ===== -->\n  <section id=\"t-emp2\" class=\"hide\">\n    <div class=\"kpis\" id=\"e-kpis\"></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Lucro líquido por empresa</h2><p class=\"note\">R$ mil por ano.</p><div class=\"chartbox\"><canvas id=\"e-lucro\"></canvas></div></div>\n      <div class=\"card\"><h2>Margens por empresa</h2><p class=\"note\">Margem EBITDA e margem líquida sobre a receita líquida de cada empresa.</p><div class=\"chartbox\"><canvas id=\"e-marg\"></canvas></div></div>\n    </div>\n    <div class=\"card\"><h2>Comparativo anual</h2><p class=\"note\">A RNA começou a faturar em out/2021. Despesas: conta com \"RNA\" no nome vai para a RNA; as demais seguem o banco que pagou (em 2021 a RNA não tinha banco próprio).</p>\n      <div class=\"tbl\"><table id=\"e-tab\"></table></div></div>\n  </section>\n\n  <!-- ===== PROJEÇÃO ===== -->\n  <section id=\"t-proj\" class=\"hide\">\n    <div class=\"kpis\" id=\"p-kpis\"></div>\n    <div class=\"card\"><h2 id=\"p-title\">Projeção</h2><p class=\"note\" id=\"p-met\"></p>\n      <div class=\"bar\"><div class=\"seg\" id=\"p-ind\"><button data-v=\"rb\" class=\"on\">Receita bruta</button><button data-v=\"eb\">EBITDA</button><button data-v=\"ll\">Lucro líquido</button></div></div>\n      <div class=\"chartbox\"><canvas id=\"p-ch\"></canvas></div></div>\n    <div class=\"card\"><h2>Mês a mês</h2><div class=\"tbl\"><table id=\"p-tab\"></table></div></div>\n  </section>\n\n  <!-- ===== PRODUTOS E CLIENTES ===== -->\n  <section id=\"t-mix\" class=\"hide\">\n    <div class=\"bar\"><select id=\"m-ano\"></select><span class=\"note\" id=\"m-note\" style=\"margin:0\"></span></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Margem por família de produto</h2><p class=\"note\">Margem bruta = receita − CMV (custo de produção). Contribuição estimada = margem bruta − comissão de <span class=\"txc\">7%</span> − PIS/COFINS (3,65%, exceto Chacobras).</p><div class=\"tbl\"><table id=\"m-fam\"></table></div></div>\n      <div class=\"card\"><h2>Margem por canal</h2><p class=\"note\">Exportação/Paraguai = Chacobras, Mauricio Moller e demais clientes de exportação.</p><div class=\"tbl\"><table id=\"m-can\"></table></div></div>\n    </div>\n    <div class=\"kpis\" id=\"t-kpis\"></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Por tonelada, por família</h2><p class=\"note\">R$ por tonelada vendida. Toneladas pelo peso do saco (nome do produto ou consumo de insumos na produção). Sem serviços.</p><div class=\"tbl\"><table id=\"t-fam\"></table></div></div>\n      <div class=\"card\"><h2>Evolução por tonelada</h2><p class=\"note\">Receita, CMV e margem bruta por tonelada vendida, ano a ano (sem matéria-prima revendida e serviços).</p><div class=\"chartbox\"><canvas id=\"t-evo\"></canvas></div></div>\n    </div>\n    <div class=\"card\"><h2>Evolução da margem bruta por família</h2><p class=\"note\">Ano a ano (anos parciais marcados com *).</p><div class=\"chartbox\"><canvas id=\"m-evo\"></canvas></div></div>\n    <div class=\"kpis\" id=\"c-kpis\"></div>\n    <div class=\"card\"><h2>Maiores clientes</h2><p class=\"note\" id=\"c-note\"></p><div class=\"tbl\"><table id=\"c-tab\"></table></div></div>\n  </section>\n\n  <!-- ===== CLIENTES: CONTRIBUICAO ===== -->\n  <section id=\"t-cli\" class=\"hide\">\n    <div class=\"bar\"><select id=\"k-ano\"></select><span class=\"note\" style=\"margin:0\" id=\"k-bar\"></span></div>\n    <div class=\"kpis\" id=\"k-kpis\"></div>\n    <div class=\"card\"><h2>Quanto cada cliente contribuiu</h2><p class=\"note\" id=\"k-note\"></p><div class=\"tbl\"><table id=\"k-tab\"></table></div></div>\n  </section>\n\n  <!-- ===== LUCRO → CAIXA ===== -->\n  <section id=\"t-caixa\" class=\"hide\">\n    <div class=\"bar\"><select id=\"x-ano\"></select><span class=\"note\" style=\"margin:0\">Consolidado Rural + RNA (o caixa não é separado por empresa).</span></div>\n    <div class=\"kpis\" id=\"x-kpis\"></div>\n    <div class=\"card\"><h2>Do lucro ao caixa</h2><p class=\"note\">Barras verdes aumentam o caixa; vermelhas diminuem; azuis são subtotais. R$ mil.</p><div class=\"chartbox\" style=\"height:360px\"><canvas id=\"x-ch\"></canvas></div></div>\n    <div class=\"card\"><h2>Ponte lucro → caixa</h2><div class=\"tbl\"><table id=\"x-tab\"></table></div>\n      <div class=\"foot\" id=\"x-foot\"></div></div>\n    <div class=\"card\"><h2>Todos os anos</h2><p class=\"note\">R$ mil. Mesmas linhas da ponte, ano a ano.</p><div class=\"tbl\"><table id=\"x-anos\"></table></div></div>\n    <div class=\"card construtor\"><h2>Conferência com o controle de exportações</h2><p class=\"note\" id=\"e-note\"></p><div class=\"tbl\"><table id=\"e-conc\"></table></div>\n      <div class=\"foot\">Entradas pela planilha = câmbio das faturas + ACC contratado. No Agrotis = créditos na conta do ACC + contas de câmbio de exportação (\"Exp. Câmbio\" em 2024; \"Recebimento Exportação Câmbio\" em 2026). A diferença é câmbio que, pela planilha, entrou, mas não aparece como câmbio no BB/Bradesco do Agrotis (pode estar em outra conta ou banco). 2026 = jan–ago.</div></div>\n  </section>\n\n  <!-- ===== CAPITAL DE GIRO ===== -->\n  <section id=\"t-giro\" class=\"hide\">\n    <div class=\"bar\"><select id=\"g-mes\"></select><span class=\"note\" style=\"margin:0\">Prazos médios pelos últimos 90 dias. Ciclo de caixa = recebimento + estoque − pagamento.</span></div>\n    <div class=\"kpis\" id=\"g-kpis\"></div>\n    <div class=\"card\"><h2>Prazos médios (dias), mês a mês</h2><p class=\"note\" id=\"g-note\"></p><div class=\"chartbox\"><canvas id=\"g-ch\"></canvas></div></div>\n    <div class=\"grid2\">\n      <div class=\"card\"><h2>Contas a receber por idade</h2><p class=\"note\">Pelo vencimento, no fim do mês escolhido. R$ mil.</p><div class=\"tbl\"><table id=\"g-rec\"></table></div></div>\n      <div class=\"card\"><h2>Contas a pagar por idade</h2><p class=\"note\">Pelo vencimento, no fim do mês escolhido. R$ mil.</p><div class=\"tbl\"><table id=\"g-pag\"></table></div></div>\n    </div>\n    <div class=\"card\"><h2>Capital de giro em R$ (fim de mês)</h2><p class=\"note\">Contas a receber + estoque − contas a pagar. Estoque pelo saldo e custo médio do Agrotis (filiais 2 e 5).</p><div class=\"chartbox\"><canvas id=\"g-val\"></canvas></div></div>\n  </section>\n\n  <!-- ===== DEMONSTRATIVO ===== -->\n  <section id=\"t-dem\" class=\"hide\">\n    <div class=\"bar\">\n      <div class=\"seg\" id=\"ano\"></div>\n      <div class=\"seg\" id=\"est\"><button data-v=\"nova\" class=\"on\">Nova</button><button data-v=\"atual\">Atual</button></div>\n      <div class=\"seg\" id=\"vis\"><button data-v=\"mes\" class=\"on\">Mensal</button><button data-v=\"acum\">Acumulado</button></div>\n      <div class=\"seg\" id=\"un\"><button data-v=\"mil\" class=\"on\">R$ mil</button><button data-v=\"r\">R$</button></div>\n      <select id=\"ate\"></select>\n    </div>\n    <div class=\"kpis\" id=\"kpis\"></div>\n    <div class=\"card\"><h2 id=\"ctitle\">Receita líquida × resultado</h2><div class=\"chartbox\"><canvas id=\"ch\"></canvas></div></div>\n    <div class=\"card\">\n      <h2>Demonstrativo <span id=\"anoT\"></span></h2>\n      <div class=\"toolbar\"><button id=\"exp\">Expandir tudo</button><button id=\"col\">Só grupos e totais</button></div>\n      <div class=\"tbl\"><table id=\"t\"></table></div>\n      <div class=\"foot\">Receita pelo faturado (líquida do desconto de ICMS isento); despesas pelo caixa; CMV = quantidade vendida × custo de produção; IRPJ/CSLL pelo Lucro Presumido. \"% RL\" = análise vertical (sobre a receita líquida do período). \"vs ano ant.\" = análise horizontal (mesmo período do ano anterior).</div>\n    </div>\n  </section>\n</div>";

  function iniciarPainel(ENTRADA) {

window.onerror=(m,s,l)=>{const e=document.getElementById('err'); if(e) e.textContent+='Erro: '+m+' (linha '+l+') ';};
// CONSTRUTOR = versão do Gilberto (notas de conferência, chave de comissão). Versão do sócio = false.
// No app com login, este valor deve vir do perfil do usuário (13/10/2026).
const CONSTRUTOR = ENTRADA.construtor === true;
if(!CONSTRUTOR) document.querySelectorAll('.construtor').forEach(e=>e.remove());
const ANOS = ENTRADA.anos;
const LISTA = Object.keys(ANOS).sort();
const ULT = LISTA[LISTA.length-1];
const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const st = {tab:'socio', emp:'cons', est:'nova', vis:'mes', un:'mil', ano:ULT, ate:12, open:new Set(), ponte:ULT, ind:'rb', com:'prov'};
// ---------- chave de comissões: provisão 7% (padrão) x pagas (caixa) ----------
const ORIG = {}; LISTA.forEach(a=>ORIG[a]=ANOS[a].D);
const AJ = {};
function ajustaCom(a){
  if(AJ[a]) return AJ[a];
  const out={}, cp=ANOS[a].CP;
  for(const est of ['atual','nova']){
    const L=ORIG[a][est].map(r=>Object.assign({},r,{rural:r.rural.slice(),rna:r.rna.slice()}));
    const i=L.findIndex(r=>/Comiss.*provis/i.test(r.r));
    if(i>=0 && cp){
      let g=i-1; while(g>=0 && L[g].n>=L[i].n) g--;
      ['rural','rna'].forEach(u=>{ const d=L[i][u].map((v,k)=>v-(cp[u][k]||0));   // provisão − paga
        L[i][u]=L[i][u].map((v,k)=>v-d[k]);
        if(g>=0) L[g][u]=L[g][u].map((v,k)=>v-d[k]);
        for(let j=g+1;j<L.length;j++) if(L[j].n===0 && L[j].t==='total') L[j][u]=L[j][u].map((v,k)=>v+d[k]); });
      L[i].r = L[i].r.replace(/\(provis[^)]*\)/i,'(pagas no Agrotis)');
    }
    out[est]=L;
  }
  return AJ[a]=out;
}
function aplicaCom(){ LISTA.forEach(a=>{ ANOS[a].D = st.com==='paga' ? ajustaCom(a) : ORIG[a]; });
  document.getElementById('comlbl').textContent = st.com==='paga' ? 'comissões: valor pago no Agrotis' : 'comissões: provisão de 7%'; }
const C = {azul:'#1B3A63', verde:'#2B914F', amarelo:'#FECA39', verm:'#B4462E', cinza:'#9AA3AF', azul2:'#2463AA'};

// ---------- formatação ----------
const fmt = v => (Math.round(v)||0).toLocaleString('pt-BR');
const fmtK = v => (Math.round(v/1000)||0).toLocaleString('pt-BR');
const fmtM = v => (v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const money = v => Math.abs(v)>=1e6 ? 'R$ '+fmtM(v)+' mi' : 'R$ '+fmtK(v)+' mil';
const pc = (a,b) => b ? a/b*100 : null;
const fP = v => (v===null||!isFinite(v)) ? '–' : v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const fPP = v => (v===null||!isFinite(v)) ? '–' : (v>=0?'+':'')+v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' p.p.';
const fVar = v => (v===null||!isFinite(v)) ? '–' : (v>=0?'▲ ':'▼ ')+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const lab = a => { const M=ANOS[a].M; return M.length<12 ? a+' ('+M[0].toLowerCase()+'–'+M[M.length-1].toLowerCase()+')' : a; };
const labC = a => { const M=ANOS[a].M; return M.length<12 ? a+'*' : a; };
const nomeEmp = e => ({cons:'Consolidado', rural:'Rural', rna:'RNA'})[e];
// texto vindo dos dados (nomes de clientes, contas, famílias) entra escapado no HTML
const esc = s => String(s===null||s===undefined?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// ---------- acesso aos dados (estrutura Nova) ----------
function vals(r, emp){ emp=emp||st.emp; return r.rural.map((x,i)=> emp==='rural'?x : emp==='rna'? r.rna[i] : x+r.rna[i]); }
function acha(a, re, est, top){ est=est||'nova'; return ANOS[a].D[est].find(r=>(top===false||r.n===0) && re.test(r.r)); }
// soma de uma linha nos meses indicados (rótulos 'Jan'...); meses=null -> todos
function soma(a, re, emp, meses, est, top){ const r=acha(a,re,est,top); if(!r) return 0; const v=vals(r,emp);
  return ANOS[a].M.reduce((s,m,i)=> s + ((!meses||meses.includes(m)) ? v[i] : 0), 0); }
function serie(a, re, emp, est, top){ const r=acha(a,re,est,top); return r ? vals(r,emp) : ANOS[a].M.map(()=>0); }
const RE = {rb:/^Receita Bruta/, rl:/Receita Líquida/, cmv:/\(-\) CMV/, lb:/Lucro Bruto/, vari:/Despesas Variáveis/, mc:/Margem de Contribui/,
            fixa:/Despesas Fixas/, eb:/EBITDA/, fin:/Resultado Financeiro/, ll:/Lucro Líquido/};
function tot(a, emp, meses){
  const g = k => soma(a, RE[k], emp, meses);
  const ir = soma(a,/^IRPJ/,emp,meses,'nova',false) + soma(a,/^CSLL/,emp,meses,'nova',false);
  return {rb:g('rb'), rl:g('rl'), cmv:g('cmv'), lb:g('lb'), vari:g('vari'), mc:g('mc'), fixa:g('fixa'), eb:g('eb'), fin:g('fin'), ir, ll:g('ll')};
}
// mesmo período do ano anterior (pelos rótulos dos meses); null se o ano anterior não cobre
function mesmoPeriodo(a, meses){ const p=ANOS[String(+a-1)]; if(!p) return null; return meses.every(m=>p.M.includes(m)) ? String(+a-1) : null; }
const temRNA = a => tot(a,'rna').rl > 0;

// ---------- controles ----------
function seg(id, key, cb){ document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{
  st[key]=b.dataset.v; document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.toggle('on',x===b)); (cb||render)(); }); }
seg('emp','emp'); seg('com','com', ()=>{ aplicaCom(); setAno(st.ano); render(); }); seg('est','est'); seg('vis','vis'); seg('un','un'); seg('p-ind','ind');
seg('tabs','tab', ()=>{ ['socio','ana','emp2','proj','mix','cli','caixa','giro','dem'].forEach(t=>document.getElementById('t-'+t).classList.toggle('hide', t!==st.tab)); render(); });
const charts = {};
function chart(id, cfg){ if(typeof Chart==='undefined') return; if(charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); }
const baseOpts = (extra) => Object.assign({maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
  plugins:{legend:{labels:{boxWidth:12,font:{size:11}}}}}, extra||{});

function render(){ ({socio:rSocio, ana:rAna, emp2:rEmp, proj:rProj, mix:rMix, cli:rCli, caixa:rCaixa, giro:rGiro, dem:rDem})[st.tab](); }

// ================= VISÃO DO SÓCIO =================
function kpi(lbl, val, sub, yoy, cls){ return `<div class="kpi"><div class="lbl">${lbl}</div><div class="value ${cls||''}">${val}</div>${sub?`<div class="pct">${sub}</div>`:''}${yoy||''}</div>`; }
function yoyHtml(txt, bom){ return txt ? `<div class="yoy ${bom?'up':'down'}">${txt}</div>` : ''; }
function rSocio(){
  const a=ULT, M=ANOS[a].M, per=M[0].toLowerCase()+'–'+M[M.length-1].toLowerCase()+'/'+a.slice(2);
  const p=mesmoPeriodo(a,M), perP = p ? M[0].toLowerCase()+'–'+M[M.length-1].toLowerCase()+'/'+p.slice(2) : '';
  const t=tot(a,st.emp,M), q=p?tot(p,st.emp,M):null;
  const mg = (x,b)=>pc(x,b);
  const k = [];
  k.push(kpi('Receita bruta · '+per, money(t.rb), nomeEmp(st.emp), q?yoyHtml(fVar(pc(t.rb-q.rb,Math.abs(q.rb)))+' vs '+perP, t.rb>=q.rb):''));
  k.push(kpi('EBITDA · '+per, money(t.eb), 'margem '+fP(mg(t.eb,t.rl)), q?yoyHtml(fPP(mg(t.eb,t.rl)-mg(q.eb,q.rl))+' na margem vs '+perP, mg(t.eb,t.rl)>=mg(q.eb,q.rl)):'', t.eb<0?'neg':''));
  k.push(kpi('Lucro líquido · '+per, money(t.ll), 'margem '+fP(mg(t.ll,t.rl)), q?yoyHtml(fPP(mg(t.ll,t.rl)-mg(q.ll,q.rl))+' na margem vs '+perP, mg(t.ll,t.rl)>=mg(q.ll,q.rl)):'', t.ll<0?'neg':''));
  k.push(kpi('Resultado financeiro · '+per, money(-t.fin), fP(mg(t.fin,t.rl))+' da receita líquida', q?yoyHtml(fPP(mg(t.fin,t.rl)-mg(q.fin,q.rl))+' vs '+perP, mg(t.fin,t.rl)<=mg(q.fin,q.rl)):'', t.fin>0?'neg':''));
  document.getElementById('s-kpis').innerHTML=k.join('');
  // alertas
  const al=[]; const add=(c,h,x)=>al.push(`<div class="alert"><span class="dot ${c}"></span><div>${h}${x?`<div class="crit">${x}</div>`:''}</div></div>`);
  document.getElementById('s-alnote').textContent = p ? `${lab(a)} comparado com o mesmo período de ${p}. Embaixo de cada alerta, o que ele mede e o critério da cor (p.p. = pontos percentuais da margem).` : '';
  if(p){
    const c=tot(a,'cons',M), d=tot(p,'cons',M);
    const g=pc(c.rb-d.rb,Math.abs(d.rb));
    add(g>=10?'g':g>=0?'y':'r', `<b>Receita</b> ${fVar(g)} (${money(c.rb)} × ${money(d.rb)}).`,
      'Crescimento da receita bruta. Verde: subiu 10% ou mais · amarelo: subiu até 10% · vermelho: caiu.');
    const de=mg(c.eb,c.rl)-mg(d.eb,d.rl);
    add(de>=0?'g':de>-2?'y':'r', `<b>Margem EBITDA</b> ${fP(mg(c.eb,c.rl))} (${fPP(de)}).`,
      'Quanto sobra da receita depois de custos e despesas da operação. Verde: subiu · amarelo: caiu menos de 2 p.p. · vermelho: caiu 2 p.p. ou mais.');
    const dl=mg(c.ll,c.rl)-mg(d.ll,d.rl);
    add(dl>=0?'g':dl>-2?'y':'r', `<b>Margem líquida</b> ${fP(mg(c.ll,c.rl))} (${fPP(dl)}).`,
      'Quanto sobra de lucro no fim. Verde: subiu · amarelo: caiu menos de 2 p.p. · vermelho: caiu 2 p.p. ou mais.');
    const df=mg(c.fin,c.rl)-mg(d.fin,d.rl);
    add(df<=0?'g':df<1?'y':'r', `<b>Custo financeiro</b> ${fP(mg(c.fin,c.rl))} da receita líquida (${fPP(df)}): ${money(c.fin)}.`,
      'Juros, desconto de duplicatas e tarifas em % da receita. Verde: caiu ou igual · amarelo: subiu menos de 1 p.p. · vermelho: subiu 1 p.p. ou mais.');
    const gap=(mg(c.eb,c.rl)-mg(c.ll,c.rl)), gapP=(mg(d.eb,d.rl)-mg(d.ll,d.rl));
    add(gap-gapP<=0?'g':gap-gapP<1?'y':'r', `<b>Distância EBITDA → lucro</b> ${fP(gap)} da receita (era ${fP(gapP)}): financeiro + IRPJ/CSLL.`,
      'Quanto da margem operacional vai para juros e impostos sobre o lucro. Verde: diminuiu · amarelo: aumentou menos de 1 p.p. · vermelho: aumentou 1 p.p. ou mais.');
    if(temRNA(a)){
      const r=tot(a,'rna',M), s=tot(p,'rna',M), mr=mg(r.ll,r.rl), ms=mg(s.ll,s.rl);
      add(mr<3?'r':mr<8?'y':'g', `<b>RNA</b>: margem líquida ${fP(mr)} (era ${fP(ms)}); lucro ${money(r.ll)} × ${money(s.ll)}.`,
      'Olha o nível da margem líquida da RNA, não a variação. Verde: 8% ou mais · amarelo: entre 3% e 8% · vermelho: abaixo de 3%.');
      add('i', `<b>Peso da RNA</b>: ${fP(pc(r.rb,c.rb))} da receita e ${fP(pc(r.ll,c.ll))} do lucro do grupo.`,
      'Informativo (azul): fatia da RNA no grupo. Se a fatia no lucro é bem menor que na receita, a RNA tem margem abaixo da Rural.');
    }
    const mc=mg(c.mc,c.rl), mcp=mg(d.mc,d.rl);
    add(mc-mcp>=0?'g':mc-mcp>-2?'y':'r', `<b>Margem de contribuição</b> ${fP(mc)} (${fPP(mc-mcp)}): preço − CMV − comissões/fretes.`,
      'Mostra se o produto está pagando a conta: preço menos custo, comissões e fretes. Verde: subiu · amarelo: caiu menos de 2 p.p. · vermelho: caiu 2 p.p. ou mais.');
  }
  document.getElementById('s-alerts').innerHTML=al.join('');
  // evolução
  const T=LISTA.map(y=>tot(y,st.emp));
  chart('s-evo',{data:{labels:LISTA.map(labC),datasets:[
    {type:'bar',label:'Receita líquida (R$ mi)',data:T.map(x=>x.rl/1e6),backgroundColor:C.azul,borderRadius:4,yAxisID:'y',order:3},
    {type:'line',label:'Margem EBITDA %',data:T.map(x=>pc(x.eb,x.rl)),borderColor:C.amarelo,backgroundColor:C.amarelo,yAxisID:'y1',tension:.25,order:1},
    {type:'line',label:'Margem líquida %',data:T.map(x=>pc(x.ll,x.rl)),borderColor:C.verde,backgroundColor:C.verde,yAxisID:'y1',tension:.25,order:2}]},
    options:baseOpts({scales:{y:{position:'left',ticks:{callback:v=>v+' mi'}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>v+'%'}}},
      plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.dataset.yAxisID==='y1'?fP(c.raw):fmtM(c.raw*1e6)+' mi'),
        title:i=>lab(LISTA[i[0].dataIndex])}}}})});
  chart('s-gap',{type:'bar',data:{labels:LISTA.map(labC),datasets:[
    {label:'Lucro líquido',data:T.map(x=>pc(x.ll,x.rl)),backgroundColor:C.verde},
    {label:'IRPJ/CSLL',data:T.map(x=>pc(x.ir,x.rl)),backgroundColor:C.cinza},
    {label:'Resultado financeiro',data:T.map(x=>pc(x.fin,x.rl)),backgroundColor:C.verm}]},
    options:baseOpts({scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:v=>v+'%'}}},
      plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fP(c.raw),
        title:i=>lab(LISTA[i[0].dataIndex]), footer:i=>'EBITDA: '+fP(pc(T[i[0].dataIndex].eb,T[i[0].dataIndex].rl))}}}})});
  // ponte
  const sel=document.getElementById('s-ano');
  if(!sel.options.length){ LISTA.slice().reverse().forEach(y=>sel.add(new Option(lab(y),y))); sel.onchange=()=>{st.ponte=sel.value; rSocio();}; }
  sel.value=st.ponte; ponte(st.ponte);
}
function ponte(a){
  const M=ANOS[a].M, p=mesmoPeriodo(a,M);
  document.getElementById('s-ponte-note').textContent = p ? 'comparado com o mesmo período de '+p : '';
  const t=tot(a,st.emp,M), q=p?tot(p,st.emp,M):null;
  // linhas do resultado financeiro (pelo rótulo, juntando os meses)
  const fin=(y)=>{ const L=ANOS[y].D.nova, i=L.findIndex(r=>r.n===0&&RE.fin.test(r.r)), o={}; if(i<0) return o;
    for(let j=i+1;j<L.length&&L[j].n>0;j++) if(L[j].n===1){ o[L[j].r]=(o[L[j].r]||0)+vals(L[j]).reduce((s,v,k)=>s+(M.includes(ANOS[y].M[k])?v:0),0); } return o; };
  // até 2025 o desconto de duplicatas era lançado nas contas de juros de financiamento (sem como separar):
  // na ponte as duas linhas ficam juntas; o desconto aparece como "dos quais" quando tem conta própria (2026+)
  const JUNTA='Juros de empréstimos/ACC + desconto de duplicatas', DESC=/Desconto de duplicatas/, JACC=/Juros de ACC/;
  const junta=o=>{ const r={}, d={v:0}; Object.entries(o).forEach(([n,v])=>{ if(DESC.test(n)){ d.v+=v; r[JUNTA]=(r[JUNTA]||0)+v; } else if(JACC.test(n)) r[JUNTA]=(r[JUNTA]||0)+v; else r[n]=v; }); r.__desc=d.v; return r; };
  const fa=junta(fin(a)), fp=p?junta(fin(p)):{__desc:0}; const da=fa.__desc, dp=fp.__desc; delete fa.__desc; delete fp.__desc;
  const nomes=[...new Set([...Object.keys(fa),...Object.keys(fp)])].filter(n=>Math.abs(fa[n]||0)+Math.abs(fp[n]||0)>1)
    .sort((x,y)=>(x===JUNTA?-1:y===JUNTA?1:0));
  const ir=y=>({irpj:soma(y,/^IRPJ/,st.emp,M,'nova',false), csll:soma(y,/^CSLL/,st.emp,M,'nova',false)});
  const ia=ir(a), ip=p?ir(p):null;
  const linhasFin=[]; nomes.forEach(n=>{ linhasFin.push(['(−) '+n,-(fa[n]||0),p?-(fp[n]||0):null,'linha']);
    if(n===JUNTA && (Math.abs(da)>1||Math.abs(dp)>1)) linhasFin.push(['      dos quais desconto de duplicatas',-da,p?(Math.abs(dp)>1?-dp:null):null,'linha memo']); });
  const L=[['= EBITDA',t.eb,q&&q.eb,'total'], ...linhasFin,
    ['= Resultado antes do IR/CSLL',t.eb-t.fin,q&&(q.eb-q.fin),'sub'], ['(−) IRPJ',-ia.irpj,ip&&-ip.irpj,'linha'], ['(−) CSLL',-ia.csll,ip&&-ip.csll,'linha'],
    ['= Lucro líquido',t.ll,q&&q.ll,'total']];
  let h=`<tr><th>${nomeEmp(st.emp)} · R$ mil</th><th>${lab(a)}</th><th>% RL</th>${p?`<th>${p}</th><th>% RL</th><th>Var. R$ mil</th>`:''}</tr>`;
  L.forEach(([n,v,w,cls])=>{ const sw=(w===null||w===undefined); h+=`<tr class="${cls}"><td>${esc(n)}</td><td class="${v<0?'neg':''}">${fmtK(v)}</td><td>${fP(pc(v,t.rl))}</td>${p?`<td class="${!sw&&w<0?'neg':''}">${sw?'–':fmtK(w)}</td><td>${sw?'–':fP(pc(w,q.rl))}</td><td class="${!sw&&v-w<0?'neg':''}">${sw?'–':fmtK(v-w)}</td>`:''}</tr>`; });
  h+=`<tr><td colspan="6" class="foot" style="text-align:left;white-space:normal">Até 2025 o desconto de duplicatas era lançado nas contas "Juros com financiamentos". Ele foi separado pelo lançamento: juro no mesmo lançamento do borderô (duplicatas descontadas) = desconto; junto com parcela de empréstimo ou avulso = juros de empréstimo. Os juros avulsos podem incluir algum desconto, por isso as duas linhas também aparecem somadas.</td></tr>`;
  document.getElementById('s-ponte').innerHTML=h;
}

// ================= RURAL × RNA =================
function rEmp(){
  const anos=LISTA, R=anos.map(y=>tot(y,'rural')), N=anos.map(y=>tot(y,'rna'));
  const a=ULT, M=ANOS[a].M, per=M[0].toLowerCase()+'–'+M[M.length-1].toLowerCase()+'/'+a.slice(2), p=mesmoPeriodo(a,M);
  const k=[];
  ['rural','rna'].forEach(e=>{ const t=tot(a,e,M), q=p?tot(p,e,M):null;
    k.push(kpi(nomeEmp(e)+' · lucro · '+per, money(t.ll), 'margem líquida '+fP(pc(t.ll,t.rl))+' · EBITDA '+fP(pc(t.eb,t.rl)),
      q?yoyHtml(fVar(pc(t.ll-q.ll,Math.abs(q.ll)))+' vs '+p+' ('+money(q.ll)+')', t.ll>=q.ll):'', t.ll<0?'neg':'')); });
  const c=tot(a,'cons',M), n=tot(a,'rna',M);
  k.push(kpi('Peso da RNA · '+per, fP(pc(n.ll,c.ll))+' do lucro', fP(pc(n.rb,c.rb))+' da receita do grupo'));
  document.getElementById('e-kpis').innerHTML=k.join('');
  chart('e-lucro',{type:'bar',data:{labels:anos.map(labC),datasets:[
    {label:'Rural',data:R.map(x=>x.ll/1000),backgroundColor:C.azul},{label:'RNA',data:N.map(x=>x.ll/1000),backgroundColor:C.amarelo}]},
    options:baseOpts({scales:{y:{ticks:{callback:v=>v.toLocaleString('pt-BR')}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': R$ '+Math.round(c.raw).toLocaleString('pt-BR')+' mil',title:i=>lab(anos[i[0].dataIndex])}}}})});
  const nul=(x,b)=>b>0?pc(x,b):null;
  chart('e-marg',{type:'line',data:{labels:anos.map(labC),datasets:[
    {label:'Rural · EBITDA',data:R.map(x=>nul(x.eb,x.rl)),borderColor:C.azul,backgroundColor:C.azul,borderDash:[5,4],tension:.25},
    {label:'Rural · líquida',data:R.map(x=>nul(x.ll,x.rl)),borderColor:C.azul,backgroundColor:C.azul,tension:.25},
    {label:'RNA · EBITDA',data:N.map(x=>nul(x.eb,x.rl)),borderColor:C.amarelo,backgroundColor:C.amarelo,borderDash:[5,4],tension:.25},
    {label:'RNA · líquida',data:N.map(x=>nul(x.ll,x.rl)),borderColor:'#C98A00',backgroundColor:'#C98A00',tension:.25}]},
    options:baseOpts({spanGaps:false,scales:{y:{ticks:{callback:v=>v+'%'}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fP(c.raw),title:i=>lab(anos[i[0].dataIndex])}}}})});
  let h=`<tr><th>Ano</th><th>Rural · receita</th><th>EBITDA %</th><th>Líquida %</th><th>Lucro</th><th class="acc">RNA · receita</th><th>EBITDA %</th><th>Líquida %</th><th>Lucro</th><th class="acc">RNA no lucro</th></tr>`;
  anos.slice().reverse().forEach(y=>{ const i=anos.indexOf(y), r=R[i], s=N[i], cc=tot(y,'cons');
    h+=`<tr><td>${lab(y)}</td><td>${fmtK(r.rb)}</td><td>${fP(nul(r.eb,r.rl))}</td><td>${fP(nul(r.ll,r.rl))}</td><td class="${r.ll<0?'neg':''}">${fmtK(r.ll)}</td>
      <td class="acc">${s.rl>0?fmtK(s.rb):'–'}</td><td>${fP(nul(s.eb,s.rl))}</td><td>${fP(nul(s.ll,s.rl))}</td><td class="${s.ll<0?'neg':''}">${s.rl>0?fmtK(s.ll):'–'}</td>
      <td class="acc">${s.rl>0?fP(pc(s.ll,cc.ll)):'–'}</td></tr>`; });
  document.getElementById('e-tab').innerHTML=h;
}

// ================= PROJEÇÃO =================
function projecao(emp){
  const a=ULT, M=ANOS[a].M, p=String(+a-1), P=ANOS[p];
  if(!P||P.M.length<12||M.length>=12) return null;
  const resto=MES.filter(m=>!M.includes(m));
  const t=tot(a,emp,M), qY=tot(p,emp,M), qR=tot(p,emp,resto), qF=tot(p,emp);
  const g = qY.rb ? t.rb/qY.rb : 1, gl = qY.rl ? t.rl/qY.rl : 1;
  const rbR=qR.rb*g, rlR=qR.rl*gl;
  const mA={eb:t.rl?t.eb/t.rl:0, ll:t.rl?t.ll/t.rl:0}, mB={eb:qR.rl?qR.eb/qR.rl:0, ll:qR.rl?qR.ll/qR.rl:0};
  // série mensal projetada (para o gráfico): mês do ano anterior × crescimento × margem
  const mens = (k, cen) => MES.map(m=>{ const i=M.indexOf(m);
    if(i>=0) return serie(a, RE[k], emp)[i];
    const j=P.M.indexOf(m), rl=serie(p,RE.rl,emp)[j]*gl;
    if(k==='rb') return serie(p,RE.rb,emp)[j]*g;
    return rl*(cen==='A'?mA[k]:(serie(p,RE.rl,emp)[j]? serie(p,RE[k],emp)[j]/serie(p,RE.rl,emp)[j] : mB[k])); });
  return {a,p,M,resto,t,qF,g,gl,rbR,rlR,mA,mB,
    rb:t.rb+rbR, ebA:t.eb+rlR*mA.eb, llA:t.ll+rlR*mA.ll, ebB:t.eb+rlR*mB.eb, llB:t.ll+rlR*mB.ll, mens};
}
function rProj(){
  const P=projecao(st.emp);
  if(!P){ document.getElementById('p-kpis').innerHTML=''; document.getElementById('p-met').textContent='O último ano já está fechado: não há o que projetar.'; return; }
  const {a,p,M,resto,t,qF,g}=P, fx=(v,b)=>fVar(pc(v-b,Math.abs(b)));
  document.getElementById('p-title').textContent=`Projeção de ${a} (${nomeEmp(st.emp)}): realizado ${M[0].toLowerCase()}–${M[M.length-1].toLowerCase()} + estimativa ${resto[0].toLowerCase()}–${resto[resto.length-1].toLowerCase()}`;
  document.getElementById('p-met').innerHTML=`<b>Como é calculado:</b> receita de ${resto.join('/').toLowerCase()} = mesmos meses de ${p} × o crescimento do ano até agora (${fVar((g-1)*100)}). `+
    `Resultado: <b>cenário A</b> mantém a margem de ${a} até agora (EBITDA ${fP(P.mA.eb*100)}, líquida ${fP(P.mA.ll*100)}); `+
    `<b>cenário B</b> usa a margem que ${p} teve em cada um desses meses (sazonalidade: ${resto[0].toLowerCase()}–${resto[resto.length-1].toLowerCase()}/${p.slice(2)} teve EBITDA ${fP(P.mB.eb*100)} e líquida ${fP(P.mB.ll*100)}). É uma estimativa simples, não um orçamento.`;
  document.getElementById('p-kpis').innerHTML=[
    kpi('Receita bruta '+a+' (projeção)', money(P.rb), p+' fechou em '+money(qF.rb), yoyHtml(fx(P.rb,qF.rb)+' vs '+p, P.rb>=qF.rb)),
    kpi('EBITDA '+a+' · cenário A', money(P.ebA), 'B: '+money(P.ebB)+' · '+p+': '+money(qF.eb), yoyHtml(fx(P.ebA,qF.eb)+' (A) · '+fx(P.ebB,qF.eb)+' (B)', P.ebA>=qF.eb)),
    kpi('Lucro líquido '+a+' · cenário A', money(P.llA), 'B: '+money(P.llB)+' · '+p+': '+money(qF.ll), yoyHtml(fx(P.llA,qF.ll)+' (A) · '+fx(P.llB,qF.ll)+' (B)', P.llA>=qF.ll)),
    kpi('Falta para igualar '+p+' (lucro)', money(Math.max(qF.ll-t.ll,0)), 'em '+resto.length+' meses: '+money(Math.max(qF.ll-t.ll,0)/resto.length)+'/mês', '')
  ].join('');
  const k=st.ind, acum=a=>{let s=0;return a.map(x=>s+=x);};
  const ant=acum(serie(p,RE[k],st.emp)), real=acum(P.mens(k,'A')).map((v,i)=>i<M.length?v:null);
  const pA=acum(P.mens(k,'A')).map((v,i)=>i>=M.length-1?v:null), pB=acum(P.mens(k,'B')).map((v,i)=>i>=M.length-1?v:null);
  const ds=[{label:p+' (realizado)',data:ant,borderColor:C.cinza,backgroundColor:C.cinza,tension:.2},
    {label:a+' realizado',data:real,borderColor:C.azul,backgroundColor:C.azul,borderWidth:3,tension:.2}];
  if(k==='rb') ds.push({label:a+' projeção',data:pA,borderColor:C.azul,borderDash:[6,4],backgroundColor:C.azul,tension:.2});
  else ds.push({label:'Cenário A',data:pA,borderColor:C.verde,borderDash:[6,4],backgroundColor:C.verde,tension:.2},{label:'Cenário B',data:pB,borderColor:C.amarelo,borderDash:[2,3],backgroundColor:C.amarelo,tension:.2});
  chart('p-ch',{type:'line',data:{labels:MES,datasets:ds},options:baseOpts({scales:{y:{ticks:{callback:v=>fmtM(v)+' mi'}}},
    plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.raw===null?'':c.dataset.label+' (acumulado): '+money(c.raw)}}}})});
  // tabela mês a mês
  const rows=[['Receita bruta '+p,serie(p,RE.rb,st.emp)],['Receita bruta '+a,P.mens('rb','A')],['Lucro líquido '+p,serie(p,RE.ll,st.emp)],
    ['Lucro líquido '+a+' (A)',P.mens('ll','A')],['Lucro líquido '+a+' (B)',P.mens('ll','B')]];
  let h=`<tr><th>R$ mil</th>${MES.map((m,i)=>`<th${i===M.length?' class="acc"':''}>${m}${i>=M.length?'*':''}</th>`).join('')}<th class="acc">Ano</th></tr>`;
  rows.forEach(([n,v])=>{ const s=v.reduce((x,y)=>x+y,0); h+=`<tr><td>${n}</td>${v.map((x,i)=>`<td class="${x<0?'neg':''}${i===M.length?' acc':''}">${fmtK(x)}</td>`).join('')}<td class="acc ${s<0?'neg':''}">${fmtK(s)}</td></tr>`; });
  document.getElementById('p-tab').innerHTML=h+`<tr><td colspan="14" class="foot" style="text-align:left">* meses projetados.</td></tr>`;
}

// ================= PRODUTOS E CLIENTES =================
const AN = ENTRADA.an;
function anoSel(id, key, cb){ const el=document.getElementById(id); if(!el.options.length){ LISTA.slice().reverse().filter(y=>AN[y]).forEach(y=>el.add(new Option(lab(y),y))); el.onchange=()=>{st[key]=el.value; cb();}; } el.value=st[key]; }
st.mixAno=ULT; st.cxAno=ULT; st.cliAno=ULT;
const okU = u => st.emp==='cons' || u.toLowerCase()===st.emp;
function mixAgg(a, idx, meses){ const o={}; (AN[a]?AN[a].mix:[]).forEach(([u,ca,fa,m,rec,cmv,ch,kg])=>{ if(!okU(u)) return; if(meses&&!meses.includes(m)) return;
  const k=idx===1?ca:fa; o[k]=o[k]||{rec:0,cmv:0,ch:0,kg:0}; o[k].rec+=rec; o[k].cmv+=cmv; o[k].ch+=ch; o[k].kg+=(kg||0); }); return o; }
const SEMT = ['Serviços/industrialização (sem custo)','Matéria-prima (revenda)'];
function porTon(a, meses){ const o=mixAgg(a,2,meses), T={rec:0,cmv:0,kg:0}; Object.entries(o).forEach(([f,x])=>{ if(SEMT.includes(f)) return; T.rec+=x.rec; T.cmv+=x.cmv; T.kg+=x.kg; }); return {o,T}; }
const perT = (v,kg) => kg>0 ? v/(kg/1000) : null;
const fT0 = v => v===null ? '–' : 'R$ '+Math.round(v).toLocaleString('pt-BR');
const mB = x => x.rec ? (x.rec-x.cmv)/x.rec*100 : null;
let TXC = 0.07;   // taxa de comissão usada na contribuição estimada (7% ou a paga no ano)
const mC = x => x.rec ? (x.rec-x.cmv-TXC*x.rec-0.0365*(x.rec-x.ch))/x.rec*100 : null;
function soma3(o){ const T={rec:0,cmv:0,ch:0}; Object.values(o).forEach(x=>{T.rec+=x.rec;T.cmv+=x.cmv;T.ch+=x.ch;}); return T; }
function mixTab(id, idx, a){
  const ms=AN[a].meses, p=String(+a-1), temP = !!AN[p] && ms.every(m=>AN[p].meses.includes(m));
  const o=mixAgg(a,idx), q=temP?mixAgg(p,idx,ms):{}, T=soma3(o), Q=soma3(q);
  let h=`<tr><th>${idx===1?'Canal':'Família'}</th><th>Receita R$ mil</th><th>% total</th><th>Margem bruta</th>${temP?'<th>vs '+p+'</th>':''}<th>Contrib. estim.</th></tr>`;
  const row=(n,x,y,cls)=>{ const d=(y&&y.rec)?mB(x)-mB(y):null; return `<tr class="${cls||''}"><td>${esc(n)}</td><td>${fmtK(x.rec)}</td><td>${fP(pc(x.rec,T.rec))}</td><td>${fP(mB(x))}</td>${temP?`<td class="${d!==null&&d<0?'neg':''}">${d===null?'–':fPP(d)}</td>`:''}<td>${fP(mC(x))}</td></tr>`; };
  Object.entries(o).filter(([n,x])=>Math.abs(x.rec)>1).sort((x,y)=>y[1].rec-x[1].rec).forEach(([n,x])=>h+=row(n,x,q[n]));
  h+=row('Total',T,temP?Q:null,'total');
  document.getElementById(id).innerHTML=h;
}
function rMix(){
  anoSel('m-ano','mixAno',rMix); const a=st.mixAno;
  if(!AN[a]){ document.getElementById('m-note').textContent='Sem dados de vendas para este ano.'; return; }
  TXC = st.com==='paga' && AN[a].base.RB ? AN[a].base.PCOM/AN[a].base.RB : 0.07;
  document.querySelectorAll('.txc').forEach(e=>e.textContent=fP(TXC*100)+(st.com==='paga'?' (paga no ano)':''));
  const ms=AN[a].meses, p=String(+a-1);
  document.getElementById('m-note').textContent = nomeEmp(st.emp)+' · '+lab(a)+(AN[p]&&ms.every(m=>AN[p].meses.includes(m))?' · variação contra o mesmo período de '+p:'');
  mixTab('m-fam',2,a); mixTab('m-can',1,a);
  const fams=['Rações','Energéticos/Proteinados','Suplemento Mineral','Núcleos','Linha Plus','Matéria-prima (revenda)'], cores=[C.azul,C.amarelo,C.verde,C.verm,C.azul2,C.cinza];
  const anos=LISTA.filter(y=>AN[y]);
  chart('m-evo',{type:'line',data:{labels:anos.map(labC),datasets:fams.map((f,i)=>({label:f,data:anos.map(y=>{const x=mixAgg(y,2)[f]; return x&&x.rec>1000?mB(x):null;}),borderColor:cores[i],backgroundColor:cores[i],tension:.25,spanGaps:true}))},
    options:baseOpts({scales:{y:{ticks:{callback:v=>v+'%'}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fP(c.raw),title:i=>lab(anos[i[0].dataIndex])}}}})});
  // por tonelada
  { const ms=AN[a].meses, p=String(+a-1), temP=!!AN[p]&&ms.every(m=>AN[p].meses.includes(m));
    const {o,T}=porTon(a), Q=temP?porTon(p,ms).T:null, fixa=tot(a,st.emp).fixa;
    const pk=(AN[a].prod_kg||[]).filter(([u])=>okU(u)).reduce((s,x)=>s+x[2],0);
    const vv=(x,y)=> (y && y.kg>0) ? fVar(pc(perT(x.rec-x.cmv,x.kg)-perT(y.rec-y.cmv,y.kg), Math.abs(perT(y.rec-y.cmv,y.kg)))) : '';
    document.getElementById('t-kpis').innerHTML=[
      kpi('Toneladas vendidas · '+lab(a), Math.round(T.kg/1000).toLocaleString('pt-BR')+' t', 'produzidas: '+Math.round(pk/1000).toLocaleString('pt-BR')+' t', Q?yoyHtml(fVar(pc(T.kg-Q.kg,Q.kg))+' vs '+p, T.kg>=Q.kg):''),
      kpi('Receita por tonelada', fT0(perT(T.rec,T.kg)), 'CMV por tonelada: '+fT0(perT(T.cmv,T.kg)), Q?yoyHtml(fVar(pc(perT(T.rec,T.kg)-perT(Q.rec,Q.kg),perT(Q.rec,Q.kg)))+' na receita/t', perT(T.rec,T.kg)>=perT(Q.rec,Q.kg)):''),
      kpi('Margem bruta por tonelada', fT0(perT(T.rec-T.cmv,T.kg)), 'receita − CMV', Q?yoyHtml(vv(T,Q)+' vs '+p, perT(T.rec-T.cmv,T.kg)>=perT(Q.rec-Q.cmv,Q.kg)):''),
      kpi('Despesa fixa por tonelada', fT0(perT(fixa,T.kg)), 'despesas fixas do DRE (estrutura Nova) / t vendida')].join('');
    let h=`<tr><th>Família</th><th>Toneladas</th><th>Receita/t</th><th>CMV/t</th><th>Margem/t</th>${temP?'<th>vs '+p+'</th>':''}</tr>`;
    const q=temP?porTon(p,ms).o:{};
    Object.entries(o).filter(([f,x])=>!SEMT.includes(f)&&x.kg>0).sort((x,y)=>y[1].kg-x[1].kg).forEach(([f,x])=>{ const y=q[f];
      h+=`<tr><td>${esc(f)}</td><td>${Math.round(x.kg/1000).toLocaleString('pt-BR')}</td><td>${fT0(perT(x.rec,x.kg))}</td><td>${fT0(perT(x.cmv,x.kg))}</td><td>${fT0(perT(x.rec-x.cmv,x.kg))}</td>${temP?`<td>${vv(x,y)||'–'}</td>`:''}</tr>`; });
    h+=`<tr class="total"><td>Total</td><td>${Math.round(T.kg/1000).toLocaleString('pt-BR')}</td><td>${fT0(perT(T.rec,T.kg))}</td><td>${fT0(perT(T.cmv,T.kg))}</td><td>${fT0(perT(T.rec-T.cmv,T.kg))}</td>${temP?`<td>${vv(T,Q)}</td>`:''}</tr>`;
    document.getElementById('t-fam').innerHTML=h;
    const anos=LISTA.filter(y=>AN[y]), S=anos.map(y=>porTon(y).T);
    chart('t-evo',{type:'line',data:{labels:anos.map(labC),datasets:[
      {label:'Receita/t',data:S.map(x=>perT(x.rec,x.kg)),borderColor:C.azul,backgroundColor:C.azul,tension:.25},
      {label:'CMV/t',data:S.map(x=>perT(x.cmv,x.kg)),borderColor:C.verm,backgroundColor:C.verm,tension:.25},
      {label:'Margem bruta/t',data:S.map(x=>perT(x.rec-x.cmv,x.kg)),borderColor:C.verde,backgroundColor:C.verde,tension:.25}]},
      options:baseOpts({scales:{y:{ticks:{callback:v=>'R$ '+v.toLocaleString('pt-BR')}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fT0(c.raw),title:i=>lab(anos[i[0].dataIndex])}}}})});
  }
  const K=AN[a].clientes[st.emp], t=K.total||1, top=K.top, sh=n=>top.slice(0,n).reduce((s,x)=>s+x[1],0)/t*100;
  document.getElementById('c-kpis').innerHTML=[
    kpi('Clientes com venda · '+lab(a), K.n.toLocaleString('pt-BR'), 'receita '+money(K.total)),
    kpi('Maior cliente', fP(sh(1))+' da receita', top[0]?esc(top[0][0]):''),
    kpi('5 maiores / 10 maiores', fP(sh(5))+' / '+fP(sh(10)), 'concentração da receita'),
    kpi('Partes relacionadas', fP(pc(K.rel,t))+' da receita', money(K.rel)+' · Chacobras, Mauricio Moller/Ypoti', '', K.rel/t>0.3?'neg':'')].join('');
  document.getElementById('c-note').textContent = nomeEmp(st.emp)+' · '+lab(a)+'. "PR" = parte relacionada. Margem bruta = receita − CMV do que foi vendido a cada cliente.';
  let h='<tr><th>#</th><th>Cliente</th><th>Receita R$ mil</th><th>% receita</th><th>% acumulado</th><th>Margem bruta</th></tr>', ac=0;
  top.slice(0,20).forEach(([n,r,c,rel],i)=>{ ac+=r; h+=`<tr><td>${i+1}</td><td style="text-align:left">${esc(n)}${rel?' <span class="pr">PR</span>':''}</td><td>${fmtK(r)}</td><td>${fP(pc(r,t))}</td><td>${fP(pc(ac,t))}</td><td>${fP(r?(r-c)/r*100:null)}</td></tr>`; });
  document.getElementById('c-tab').innerHTML=h;
}

// ================= CLIENTES: CONTRIBUICAO =================
// Os 25 maiores clientes do ano e quanto cada um contribuiu. Margem de contribuicao estimada
// com os percentuais do proprio DRE do ano (deducoes e despesas variaveis sobre a receita
// bruta); "Demais clientes" = total do DRE menos os 25, para a tabela fechar com o DRE.
// Estrutura = despesas fixas + resultado financeiro (mesmo criterio do ponto de equilibrio).
function rCli(){
  anoSel('k-ano','cliAno',rCli); const a=st.cliAno;
  if(!AN[a]||!AN[a].clientes||!AN[a].clientes[st.emp]){ document.getElementById('k-note').textContent='Sem dados de clientes para este ano.'; document.getElementById('k-tab').innerHTML=''; document.getElementById('k-kpis').innerHTML=''; return; }
  const K=AN[a].clientes[st.emp], T=tot(a,st.emp), rb=T.rb||1;
  const pDed=(T.rb-T.rl)/rb, pVar=T.vari/rb, pIr=T.ir/rb;
  const estr=T.fixa+T.fin, dias=ANOS[a].M.length*30.4, porDia=dias?estr/dias:0;
  const mcCli=(r,c)=>r-c-r*(pDed+pVar);
  const top=K.top.slice(0,25);
  const linhas=top.map(([n,r,c,rel])=>({n,rel,r,c,mc:mcCli(r,c)}));
  const sR=linhas.reduce((s,x)=>s+x.r,0), sC=linhas.reduce((s,x)=>s+x.c,0), sM=linhas.reduce((s,x)=>s+x.mc,0);
  const dem={n:'Demais clientes ('+Math.max(0,K.n-top.length).toLocaleString('pt-BR')+')',r:T.rb-sR,c:T.cmv-sC,mc:T.mc-sM,demais:true};
  const fD=v=>porDia>0?(v/porDia).toLocaleString('pt-BR',{maximumFractionDigits:1})+' d':'–';
  document.getElementById('k-bar').textContent=nomeEmp(st.emp)+' · '+lab(a);
  document.getElementById('k-kpis').innerHTML=[
    kpi('Margem de contribuição · '+lab(a), money(T.mc), fP(pc(T.mc,T.rl))+' da receita líquida'),
    kpi('Estrutura (fixas + financeiro)', money(estr), money(porDia).replace(' mil',' mil')+' por dia · ponto de equilíbrio'),
    kpi('25 maiores na margem', fP(pc(sM,T.mc)), fP(pc(sR,rb))+' da receita bruta'),
    kpi('Margem paga a estrutura', fP(pc(T.mc,estr)), T.mc>=estr?'a margem cobre a estrutura':'a margem não cobre a estrutura', '', T.mc>=estr?'':'neg')].join('');
  document.getElementById('k-note').innerHTML='Margem de contribuição estimada = receita − CMV − deduções ('+fP(pDed*100)+') − despesas variáveis ('+fP(pVar*100)+': comissões, fretes, descargas), pelos percentuais do DRE do ano. '+
    'Ganho real = margem − IR/CSLL ('+fP(pIr*100)+'): o que a empresa deixaria de ganhar sem o cliente. Dias = margem ÷ estrutura por dia. "PR" = parte relacionada. "Demais" fecha com o total do DRE.';
  let h='<tr><th>#</th><th>Cliente</th><th>Receita R$ mil</th><th>% receita</th><th>Margem contrib. R$ mil</th><th>Margem % receita</th><th>% da margem total</th><th>Ganho real R$ mil</th><th>Dias de estrutura</th><th>% ponto de equilíbrio</th></tr>';
  const row=(x,i,cls)=>{ const gr=x.mc-x.r*pIr;
    return `<tr class="${cls||''}"><td>${i==null?'':i+1}</td><td style="text-align:left">${esc(x.n)}${x.rel?' <span class="pr">PR</span>':''}</td><td>${fmtK(x.r)}</td><td>${fP(pc(x.r,rb))}</td>`+
      `<td class="${x.mc<0?'neg':''}">${fmtK(x.mc)}</td><td>${fP(pc(x.mc,x.r))}</td><td>${fP(pc(x.mc,T.mc))}</td><td class="${gr<0?'neg':''}">${fmtK(gr)}</td><td>${fD(x.mc)}</td><td>${fP(pc(x.mc,estr))}</td></tr>`; };
  linhas.forEach((x,i)=>h+=row(x,i));
  h+=row(dem,null);
  h+=row({n:'Total',r:T.rb,c:T.cmv,mc:T.mc},null,'total');
  document.getElementById('k-tab').innerHTML=h;
}

// ================= LUCRO → CAIXA =================
function rCaixa(){
  anoSel('x-ano','cxAno',rCaixa); const a=st.cxAno, P0=AN[a]?AN[a].ponte:null;
  if(!P0) return;
  // com a chave em "comissão paga" o lucro já vem com a comissão paga: a linha de comissões zera e o lucro sobe na mesma medida
  const dc=(P0.find(x=>x[0]==='com')||[0,0,0])[2];
  const P = st.com==='paga' ? P0.map(r=> r[0]==='LL' ? [r[0],r[1]+' (com comissão paga)',r[2]+dc,r[3]] : r[0]==='com' ? [r[0],r[1],0,r[3]] : r) : P0;
  const v=k=>(P.find(x=>x[0]===k)||[0,0,0])[2];
  document.getElementById('x-kpis').innerHTML=[
    kpi('Lucro líquido · '+lab(a), money(v('LL')), 'estrutura Nova'),
    kpi('Caixa gerado pela operação', money(v('OCF')), fP(pc(v('OCF'),v('LL')))+' do lucro', '', v('OCF')<0?'neg':''),
    kpi('Exportação que ficou fora dos bancos', money(-v('expnet')), 'baixada na Distribuição de Lucros ('+money(-v('py'))+') − câmbio no BB/Bradesco ('+money(v('cambio'))+')'),
    kpi('Variação real dos bancos', money(v('VR')), 'Rural + RNA', '', v('VR')<0?'neg':'')].join('');
  let acc=0; const lb=[], dt=[], cor=[];
  P.filter(r=>r[3]!=='memo').forEach(([k,n,val,c])=>{ const curto=n.replace(/^= /,'').replace(/^\(\+\) /,'').split(':')[0].split('(')[0].trim().slice(0,28);
    lb.push(curto);
    if(c==='total'||c==='sub'){ dt.push([0,val/1000]); cor.push(C.azul); acc=val; }
    else { dt.push([acc/1000,(acc+val)/1000]); cor.push(val>=0?C.verde:C.verm); acc+=val; } });
  chart('x-ch',{type:'bar',data:{labels:lb,datasets:[{label:'R$ mil',data:dt,backgroundColor:cor,borderRadius:3}]},
    options:baseOpts({plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const r=P.filter(x=>x[3]!=='memo')[c.dataIndex]; return r[1]+': R$ '+fmtK(r[2])+' mil';}}}},
      scales:{x:{ticks:{font:{size:10},maxRotation:60,minRotation:45}},y:{ticks:{callback:x=>x.toLocaleString('pt-BR')}}}})});
  let h=`<tr><th>${lab(a)} · R$ mil</th><th>Valor</th><th>% do lucro</th></tr>`;
  P.forEach(([k,n,val,c])=>{ h+=`<tr class="${c==='total'?'total':c==='sub'?'grupo':c==='memo'?'sub memo':'linha'}"><td style="white-space:normal">${esc(n)}</td><td class="${val<0?'neg':''}">${fmtK(val)}</td><td>${(k==='LL')?'':fP(pc(val,v('LL')))}</td></tr>`; });
  document.getElementById('x-tab').innerHTML=h;
  document.getElementById('x-foot').innerHTML=`<b>Como ler:</b> o lucro do DRE é por competência (venda faturada, CMV pelo custo, comissões e impostos provisionados); o caixa é o dinheiro que entrou e saiu. `+
    `<b>Clientes</b> negativo = parte do faturado não virou dinheiro no ano (ficou a receber ou foi baixado por outra via). `+
    `<b>Receitas de exportação</b> = títulos de venda (sobretudo partes relacionadas) baixados na conta "Distribuição de Lucros"/Ypoti, menos o que essa conta pagou; desse total, o <b>câmbio</b> (ACC e câmbio de exportação) que entrou no BB/Bradesco da Rural volta para o caixa. O que sobra é a exportação que ficou fora dos bancos. `+
    (!CONSTRUTOR ? '' : `<b>Conferido com a planilha de exportações:</b> no Agrotis gerencial as vendas de exportação estão em nome do Mauricio Moller e são baixadas na conta "Distribuição de Lucros"; todo o câmbio que entra (ACC e câmbio integral) é lançado na conta do ACC, e as liquidações do ACC (feitas com as faturas de exportação) não são lançadas no Agrotis. Posição do ACC em aberto: ver a conferência abaixo. `)+
    (CONSTRUTOR ? `<b>Comissões</b>: com a chave "Comissão 7%" o lucro usa a provisão de 7% e a ponte mostra a diferença para o que foi pago; com "Comissão paga" o lucro já usa o pago.` : `<b>Comissões</b>: o lucro usa a provisão de 7% da receita; a linha de comissões mostra a diferença para o que foi pago no período.`);
  const anos=LISTA.filter(y=>AN[y]), lin=AN[anos[anos.length-1]].ponte;
  let g=`<tr><th>R$ mil</th>${anos.map(y=>`<th>${labC(y)}</th>`).join('')}</tr>`;
  const ajP = (y,k,val)=>{ if(st.com!=='paga') return val; const d=(AN[y].ponte.find(x=>x[0]==='com')||[0,0,0])[2]; return k==='LL'?val+d : k==='com'?0 : val; };
  lin.forEach(([k,n,_,c])=>{ g+=`<tr class="${c==='total'?'total':c==='sub'?'grupo':c==='memo'?'sub memo':'linha'}"><td>${esc(n.length>58?n.slice(0,56)+'…':n)}</td>${anos.map(y=>{const r=AN[y].ponte.find(x=>x[0]===k); const val=ajP(y,k,r?r[2]:0); return `<td class="${val<0?'neg':''}">${fmtK(val)}</td>`;}).join('')}</tr>`; });
  document.getElementById('x-anos').innerHTML=g;
  // conferência com o controle de exportações (só construtor)
  if(!CONSTRUTOR) return;
  const E=AN._exportacao; if(!E){ document.getElementById('e-note').textContent='Sem resumo da planilha de exportações.'; return; }
  document.getElementById('e-note').innerHTML=`Posição da planilha: ${esc(String(E.posicao).split('-').reverse().join('/'))}. <b>ACC em aberto: US$ ${Math.round(E.acc_aberto_usd/1000).toLocaleString('pt-BR')} mil</b>`+
    (E.cotacao?` (≈ R$ ${fmtM(E.acc_aberto_usd*E.cotacao)} mi)`:'')+` · faturas de exportação a receber: US$ ${Math.round(E.receber_usd/1000).toLocaleString('pt-BR')} mil`+(E.cotacao?` (≈ R$ ${fmtM(E.receber_usd*E.cotacao)} mi)`:'')+'.';
  const pe=['2024','2025','2026'].filter(p=>E.periodos[p]);
  const L=[['Vendas de exportação (NF, R$)',p=>E.periodos[p].vendas_rs],['Câmbio recebido das faturas',p=>E.periodos[p].cambio_rs],['ACC contratado',p=>E.periodos[p].acc_rs],
    ['= Entradas pela planilha',p=>(E.periodos[p].cambio_rs||0)+(E.periodos[p].acc_rs||0),'grupo'],['Câmbio no Agrotis (BB/Bradesco)',p=>E.periodos[p].agrotis_cambio||0],
    ['Diferença (planilha − Agrotis)',p=>(E.periodos[p].cambio_rs||0)+(E.periodos[p].acc_rs||0)-(E.periodos[p].agrotis_cambio||0),'total'],
    ['ACC liquidado com faturas (não lançado no Agrotis)',p=>E.periodos[p].baixa_rs]];
  let e=`<tr><th>R$ mil</th>${pe.map(p=>`<th>${p==='2026'?'2026 (jan–ago)':p}</th>`).join('')}</tr>`;
  L.forEach(([n,f,c])=>{ e+=`<tr class="${c||'linha'}"><td>${n}</td>${pe.map(p=>{const v=f(p)||0; return `<td class="${v<0?'neg':''}">${fmtK(v)}</td>`;}).join('')}</tr>`; });
  document.getElementById('e-conc').innerHTML=e;
}

// ================= CAPITAL DE GIRO =================
// séries mensais do DRE (estrutura Nova) por 'AAAA-MM'
function mesesDRE(re, emp){ const o={}; LISTA.forEach(a=>{ const r=ORIG[a].nova.find(x=>x.n===0&&re.test(x.r)); if(!r) return;
  const v=vals(r,emp); ANOS[a].M.forEach((m,i)=>{ o[a+'-'+String(MES.indexOf(m)+1).padStart(2,'0')]=v[i]; }); }); return o; }
const somaU=(obj,emp)=>{ if(!obj) return null; const us=emp==='cons'?['Rural','RNA']:[emp==='rural'?'Rural':'RNA']; return obj[us[0]].map((_,i)=>us.reduce((s,u)=>s+obj[u][i],0)); };
function giroSeries(emp){
  const G=AN._ciclo; if(!G) return null;
  const ym=G.meses.map(d=>d.slice(0,7)), RB=mesesDRE(RE.rb,emp), CM=mesesDRE(RE.cmv,emp);
  const rec=somaU(Object.fromEntries(['Rural','RNA'].map(u=>[u,G.receber[u].total])),emp), rel=somaU(Object.fromEntries(['Rural','RNA'].map(u=>[u,G.receber[u].rel])),emp);
  const pag=somaU(Object.fromEntries(['Rural','RNA'].map(u=>[u,G.pagar[u].total])),emp), emP=somaU(G.emitido_pagar,emp);
  const est=somaU(Object.fromEntries(['Rural','RNA'].map(u=>[u,G.estoque[u].PA.map((x,i)=>x+G.estoque[u].MP[i])])),emp);
  const tri=(o,i)=>[0,1,2].reduce((s,k)=>s+(i-k>=0?(o[ym[i-k]]||0):0),0), triA=(a,i)=>[0,1,2].reduce((s,k)=>s+(i-k>=0?a[i-k]:0),0);
  const pmr=rec.map((v,i)=>{const b=tri(RB,i); return i>=2&&b>0?v/(b/90):null;}), pme=est.map((v,i)=>{const b=tri(CM,i); return i>=2&&b>0?v/(b/90):null;}),
        pmp=pag.map((v,i)=>{const b=triA(emP,i); return i>=2&&b>0?v/(b/90):null;});
  const ciclo=pmr.map((v,i)=>v===null||pme[i]===null||pmp[i]===null?null:v+pme[i]-pmp[i]);
  return {ym,rec,rel,pag,est,pmr,pme,pmp,ciclo};
}
const nomeMes = ym => MES[+ym.slice(5,7)-1]+'/'+ym.slice(2,4);
function rGiro(){
  const S=giroSeries(st.emp); if(!S){ document.getElementById('g-note').textContent='Sem dados de capital de giro (rodar ciclo_caixa.py).'; return; }
  const sel=document.getElementById('g-mes'); if(!sel.options.length){ S.ym.slice().reverse().forEach((m,k)=>sel.add(new Option(nomeMes(m),S.ym.length-1-k))); sel.onchange=rGiro; }
  const i=+sel.value||S.ym.length-1, j=i-12>=0?i-12:null, d=v=>v===null?'–':Math.round(v)+' dias';
  const dv=(a,b,menor)=> (j===null||a[i]===null||a[j]===null)?'':yoyHtml((a[i]-a[j]>=0?'+':'')+Math.round(a[i]-a[j])+' dias vs '+nomeMes(S.ym[j]), menor? a[i]<=a[j] : a[i]>=a[j]);
  const G=AN._ciclo, F=G.faixas, us=st.emp==='cons'?['Rural','RNA']:[st.emp==='rural'?'Rural':'RNA'];
  document.getElementById('g-kpis').innerHTML=[
    kpi('Prazo de recebimento · '+nomeMes(S.ym[i]), d(S.pmr[i]), 'a receber: '+money(S.rec[i])+' ('+fP(pc(S.rel[i],S.rec[i]))+' partes relacionadas)', dv(S.pmr,null,true)),
    kpi('Prazo de estoque', d(S.pme[i]), 'estoque: '+money(S.est[i]), dv(S.pme,null,true)),
    kpi('Prazo de pagamento', d(S.pmp[i]), 'a pagar: '+money(S.pag[i]), dv(S.pmp,null,false)),
    kpi('Ciclo de caixa', d(S.ciclo[i]), 'dias que a empresa financia a operação', dv(S.ciclo,null,true), S.ciclo[i]>60?'neg':'')].join('');
  document.getElementById('g-note').textContent = nomeEmp(st.emp)+'. Recebimento = a receber ÷ receita bruta diária; estoque = estoque ÷ CMV diário; pagamento = a pagar ÷ títulos a pagar lançados por dia (todos os títulos, não só fornecedores de MP). As vendas a partes relacionadas ficam em aberto até serem baixadas, em lote, na conta Distribuição de Lucros — por isso o prazo de recebimento sobe e cai de uma vez (ex.: jul→ago/26).';
  const ini=S.ym.findIndex(m=>m>='2021-01');
  chart('g-ch',{type:'line',data:{labels:S.ym.slice(ini).map(nomeMes),datasets:[
    {label:'Recebimento',data:S.pmr.slice(ini),borderColor:C.azul,backgroundColor:C.azul,tension:.25,pointRadius:0},
    {label:'Estoque',data:S.pme.slice(ini),borderColor:C.amarelo,backgroundColor:C.amarelo,tension:.25,pointRadius:0},
    {label:'Pagamento',data:S.pmp.slice(ini),borderColor:C.verm,backgroundColor:C.verm,tension:.25,pointRadius:0},
    {label:'Ciclo de caixa',data:S.ciclo.slice(ini),borderColor:C.verde,backgroundColor:C.verde,borderWidth:3,tension:.25,pointRadius:0}]},
    options:baseOpts({scales:{y:{ticks:{callback:v=>v+' d'}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.raw===null?'–':Math.round(c.raw)+' dias')}}}})});
  const tab=(id,K)=>{ let h='<tr><th>Faixa</th><th>R$ mil</th><th>%</th></tr>'; const tot=us.reduce((s,u)=>s+G[K][u].total[i],0);
    F.forEach(fx=>{ const v=us.reduce((s,u)=>s+G[K][u].aging[fx][i],0); h+=`<tr class="${fx!=='a vencer'&&fx!=='1-30'&&v>0?'':'linha'}"><td>${esc(fx==='a vencer'?'A vencer':'Vencido '+fx+' dias')}</td><td class="${fx.startsWith('+')||fx.startsWith('181')?'neg':''}">${fmtK(v)}</td><td>${fP(pc(v,tot))}</td></tr>`; });
    if(K==='receber'){ const r=us.reduce((s,u)=>s+G[K][u].rel[i],0); h+=`<tr class="memo"><td>dos quais partes relacionadas</td><td>${fmtK(r)}</td><td>${fP(pc(r,tot))}</td></tr>`; }
    h+=`<tr class="total"><td>Total</td><td>${fmtK(tot)}</td><td>100%</td></tr>`; document.getElementById(id).innerHTML=h; };
  tab('g-rec','receber'); tab('g-pag','pagar');
  chart('g-val',{data:{labels:S.ym.slice(ini).map(nomeMes),datasets:[
    {type:'bar',label:'A receber',data:S.rec.slice(ini).map(v=>v/1e6),backgroundColor:C.azul,stack:'a'},
    {type:'bar',label:'Estoque',data:S.est.slice(ini).map(v=>v/1e6),backgroundColor:C.amarelo,stack:'a'},
    {type:'bar',label:'A pagar (−)',data:S.pag.slice(ini).map(v=>-v/1e6),backgroundColor:C.verm,stack:'a'},
    {type:'line',label:'Capital de giro',data:S.rec.slice(ini).map((v,k)=>(v+S.est[ini+k]-S.pag[ini+k])/1e6),borderColor:C.verde,backgroundColor:C.verde,borderWidth:3,pointRadius:0,tension:.25}]},
    options:baseOpts({scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:v=>v+' mi'}}},plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': R$ '+fmtM(Math.abs(c.raw)*1e6)+' mi'}}}})});
}

// ================= ANÁLISES (13/10/2026) =================
// 1) por que o lucro mudou (volume/mix/preço/custo + linhas do DRE); 2) despesas fixas por grupo e ranking;
// 3) ponto de equilíbrio; 4) últimos 12 meses; 5) mapa de margens mês × ano. Tudo na estrutura Nova, respeita empresa e chave de comissão.
st.anAno=ULT; st.mind='eb'; st.fOpen=new Set();
seg('a-mind','mind');
const mNum = m => MES.indexOf(m)+1;
const fTon = kg => Math.round(kg/1000).toLocaleString('pt-BR')+' t';
// soma de uma linha (objeto do DRE) do ano y só nos meses (rótulos) indicados
const somaR = (y, r, meses) => { if(!y||!r) return 0; const v=vals(r); return ANOS[y].M.reduce((s,m,k)=>s+(meses.includes(m)?v[k]:0),0); };

// efeitos de volume, mix, preço e custo por canal · família (toneladas vendidas)
function pvm(a, p, meses){
  const mn=meses.map(mNum), Z={rec:0,cmv:0,kg:0};
  const agg=y=>{ const o={}; (AN[y]?AN[y].mix:[]).forEach(([u,ca,fa,m,rec,cmv,ch,kg])=>{ if(!okU(u)||!mn.includes(m)) return;
    const k=ca+' · '+fa; if(!o[k]) o[k]={fa,rec:0,cmv:0,kg:0}; o[k].rec+=rec; o[k].cmv+=cmv; o[k].kg+=(kg||0); }); return o; };
  const A=agg(a), P=agg(p), keys=[...new Set([...Object.keys(A),...Object.keys(P)])];
  const ok=v=>v.kg>0||Math.abs(v.rec)<1;
  const isTon=k=>{ const x=A[k]||Z, y=P[k]||Z, fa=(A[k]||P[k]).fa; return !SEMT.includes(fa) && ok(x) && ok(y) && (x.kg>0||y.kg>0); };
  let Qa=0,Qp=0,MBp=0,RA=0,RP=0,CA=0,CP=0,outA=0,outP=0;
  keys.forEach(k=>{ const x=A[k]||Z, y=P[k]||Z;
    if(isTon(k)){ Qa+=x.kg; Qp+=y.kg; MBp+=y.rec-y.cmv; RA+=x.rec; RP+=y.rec; CA+=x.cmv; CP+=y.cmv; }
    else { outA+=x.rec-x.cmv; outP+=y.rec-y.cmv; } });
  const mbuP=Qp>0?MBp/Qp:0;
  let mix=-Qa*mbuP, preco=0, custo=0, baseP=0, baseC=0; const det=[];
  keys.filter(isTon).forEach(k=>{ const x=A[k]||Z, y=P[k]||Z, mu=y.kg>0?(y.rec-y.cmv)/y.kg:(x.kg>0?(x.rec-x.cmv)/x.kg:0);
    const d={k, qa:x.kg, qp:y.kg, mu, mua:x.kg>0?(x.rec-x.cmv)/x.kg:null, mix:(x.kg-(Qp>0?Qa*y.kg/Qp:0))*(mu-mbuP), preco:0, custo:0};
    if(x.kg>0){ if(y.kg>0){ mix+=x.kg*mu; d.preco=x.kg*(x.rec/x.kg-y.rec/y.kg); d.custo=-x.kg*(x.cmv/x.kg-y.cmv/y.kg); preco+=d.preco; custo+=d.custo; baseP+=x.kg*y.rec/y.kg; baseC+=x.kg*y.cmv/y.kg; }
      else mix+=x.rec-x.cmv; }
    det.push(d); });
  return {vol:(Qa-Qp)*mbuP, mix, preco, custo, outros:outA-outP, Qa, Qp, mbuP, RA, RP, CA, CP, det,
    precoPct: baseP?preco/baseP*100:null, custoPct: baseC?-custo/baseC*100:null};
}

function rAna(){
  anoSel('a-ano','anAno',rAna); const a=st.anAno, M=ANOS[a].M, p=mesmoPeriodo(a,M);
  document.getElementById('a-note').textContent = nomeEmp(st.emp)+' · '+lab(a)+(p?' · comparado com o mesmo período de '+p:' · sem ano anterior para comparar');
  anaPonte(a,M,p); anaFixas(a,M,p); anaEquil(a,M); anaLTM(); anaMapa();
}

// ---------- 1) por que o lucro mudou ----------
function anaPonte(a, M, p){
  const box=['a-kpis','a-tab','a-det'];
  if(!p){ box.forEach(id=>document.getElementById(id).innerHTML=''); document.getElementById('a-pnote').textContent='Escolha um ano que tenha o ano anterior para comparar.';
    if(charts['a-ch']){ charts['a-ch'].destroy(); delete charts['a-ch']; } return; }
  const t=tot(a,st.emp,M), q=tot(p,st.emp,M), V=pvm(a,p,M), per=M[0].toLowerCase()+'–'+M[M.length-1].toLowerCase();
  const dMB=(t.rb-t.cmv)-(q.rb-q.cmv), aj=dMB-(V.vol+V.mix+V.preco+V.custo+V.outros);
  const tPa=V.Qa>0?V.RA/V.Qa*1000:null, tPp=V.Qp>0?V.RP/V.Qp*1000:null, cPa=V.Qa>0?V.CA/V.Qa*1000:null, cPp=V.Qp>0?V.CP/V.Qp*1000:null;
  const L=[
    ['ini','Lucro líquido '+per+'/'+p, q.ll, 'total', ''],
    ['vol','Volume vendido', V.vol, 'linha', `${fTon(V.Qa)} × ${fTon(V.Qp)} (${fVar(pc(V.Qa-V.Qp,V.Qp))}), à margem bruta de ${p} (${fT0(V.mbuP*1000)}/t)`],
    ['mix','Mix de produtos e canais', V.mix, 'linha', 'peso maior ou menor de produtos/canais com margem diferente da média (ex.: exportação, núcleos)'],
    ['pre','Preço por tonelada', V.preco, 'linha', `preço por tonelada de cada canal/família: ${fVar(V.precoPct)}. A média geral foi de ${fT0(tPp)} para ${fT0(tPa)} porque o mix mudou`],
    ['cus','Custo por tonelada (CMV, inclui MP)', V.custo, 'linha', `custo por tonelada de cada canal/família: ${fVar(V.custoPct)} (negativo aqui = custo subiu). Média geral: ${fT0(cPp)} → ${fT0(cPa)}`],
    ['out','Serviços e matéria-prima revendida', V.outros, 'linha', 'margem bruta de industrialização/serviços e de MP revendida (sem tonelagem)']];
  if(Math.abs(aj)>500) L.push(['aj','Ajuste (receita/CMV fora do detalhe por produto)', aj, 'linha', '']);
  L.push(['ded','Deduções da receita', -((t.rb-t.rl)-(q.rb-q.rl)), 'linha', 'ICMS e tributos estaduais pagos, PIS/COFINS'],
    ['var','Comissões, fretes e descargas', -(t.vari-q.vari), 'linha', 'despesas variáveis'+(st.com==='paga'?' (comissão paga)':' (comissão: provisão de 7%)')],
    ['fix','Despesas fixas', -(t.fixa-q.fixa), 'linha', 'detalhe no quadro abaixo'],
    ['fin','Resultado financeiro', -(t.fin-q.fin), 'linha', 'juros, desconto de duplicatas e tarifas'],
    ['ir','IRPJ/CSLL', -(t.ir-q.ir), 'linha', 'Lucro Presumido: acompanha a receita bruta'],
    ['fim','Lucro líquido '+per+'/'+a, t.ll, 'total', '']);
  const ef=L.filter(r=>r[3]==='linha');
  const maior=ef.slice().sort((x,y)=>y[2]-x[2])[0], menor=ef.slice().sort((x,y)=>x[2]-y[2])[0];
  document.getElementById('a-kpis').innerHTML=[
    kpi('Lucro líquido · '+per+'/'+a, money(t.ll), p+': '+money(q.ll), yoyHtml(fVar(pc(t.ll-q.ll,Math.abs(q.ll)))+' ('+(t.ll-q.ll>=0?'+':'−')+money(Math.abs(t.ll-q.ll))+')', t.ll>=q.ll), t.ll<0?'neg':''),
    kpi('Maior ganho', money(maior[2]), maior[1], ''),
    kpi('Maior perda', money(menor[2]), menor[1], '', menor[2]<0?'neg':''),
    kpi('Toneladas vendidas', fTon(V.Qa), p+': '+fTon(V.Qp), yoyHtml(fVar(pc(V.Qa-V.Qp,V.Qp))+' vs '+p, V.Qa>=V.Qp))].join('');
  document.getElementById('a-pnote').textContent=`${nomeEmp(st.emp)}: do lucro de ${per}/${p} ao lucro de ${per}/${a}. Barras verdes aumentaram o lucro; vermelhas diminuíram. R$ mil.`;
  let acc=0; const lb=[], dt=[], cor=[];
  L.forEach(([k,n,v,c])=>{ lb.push(n.replace(/ \(.*\)$/,'').replace('Lucro líquido ','Lucro ').slice(0,30));
    if(c==='total'){ dt.push([0,v/1000]); cor.push(C.azul); acc=v; } else { dt.push([acc/1000,(acc+v)/1000]); cor.push(v>=0?C.verde:C.verm); acc+=v; } });
  chart('a-ch',{type:'bar',data:{labels:lb,datasets:[{label:'R$ mil',data:dt,backgroundColor:cor,borderRadius:3}]},
    options:baseOpts({plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const r=L[c.dataIndex]; return r[1]+': R$ '+fmtK(r[2])+' mil';}}}},
      scales:{x:{ticks:{font:{size:10},maxRotation:60,minRotation:35}},y:{ticks:{callback:x=>x.toLocaleString('pt-BR')}}}})});
  let h=`<tr><th>Efeito · R$ mil</th><th>Valor</th><th>% RL ${p}</th><th style="text-align:left">Como ler</th></tr>`;
  L.forEach(([k,n,v,c,x])=>{ h+=`<tr class="${c}"><td>${n}</td><td class="${v<0?'neg':''}">${(c==='linha'&&v>0?'+':'')+fmtK(v)}</td><td>${c==='linha'?fPP(pc(v,q.rl)).replace(' p.p.',' p.p.'):''}</td><td style="text-align:left;white-space:normal;min-width:260px;color:var(--ink-soft)">${x}</td></tr>`; });
  h+=`<tr class="memo"><td>Volume + mix</td><td>${(V.vol+V.mix>0?'+':'')+fmtK(V.vol+V.mix)}</td><td>${fPP(pc(V.vol+V.mix,q.rl))}</td><td style="text-align:left;white-space:normal;color:var(--ink-soft)">os dois juntos = efeito de vender mais toneladas, já considerando quais produtos cresceram</td></tr>`;
  document.getElementById('a-tab').innerHTML=h;
  // detalhe por canal · família (os 10 com maior efeito)
  const D=V.det.filter(d=>d.qa>0||d.qp>0).sort((x,y)=>(Math.abs(y.mix)+Math.abs(y.preco)+Math.abs(y.custo))-(Math.abs(x.mix)+Math.abs(x.preco)+Math.abs(x.custo))).slice(0,10);
  let g=`<tr><th>Canal · família</th><th>t ${a}</th><th>t ${p}</th><th>Fatia ${a}</th><th>Fatia ${p}</th><th>Margem/t ${p}</th><th>Margem/t ${a}</th><th>Mix</th><th>Preço</th><th>Custo</th></tr>`;
  D.forEach(d=>{ const c=v=>`<td class="${v<0?'neg':''}">${(v>0?'+':'')+fmtK(v)}</td>`;
    g+=`<tr class="linha"><td>${esc(d.k)}</td><td>${Math.round(d.qa/1000).toLocaleString('pt-BR')}</td><td>${Math.round(d.qp/1000).toLocaleString('pt-BR')}</td><td>${fP(pc(d.qa,V.Qa))}</td><td>${fP(pc(d.qp,V.Qp))}</td><td>${d.qp>0?fT0(d.mu*1000):'–'}</td><td>${d.mua===null?'–':fT0(d.mua*1000)}</td>${c(d.mix)}${c(d.preco)}${c(d.custo)}</tr>`; });
  g+=`<tr class="memo"><td colspan="10" style="text-align:left;white-space:normal">Margem bruta média de ${p}: ${fT0(V.mbuP*1000)}/t. No mix, ganhar fatia em produto com margem/t acima da média soma; abaixo da média, subtrai. R$ mil, exceto margem/t.</td></tr>`;
  document.getElementById('a-det').innerHTML=g;
}

// ---------- 2) despesas fixas por grupo + ranking ----------
function filhos(y, re){ const L=ANOS[y].D.nova, i=L.findIndex(r=>r.n===0&&re.test(r.r)); const o=[]; if(i<0) return o;
  for(let j=i+1;j<L.length&&L[j].n>0;j++) o.push(Object.assign({folha:!(L[j+1]&&L[j+1].n>L[j].n)},L[j])); return o; }
function anaFixas(a, M, p){
  const t=tot(a,st.emp,M), q=p?tot(p,st.emp,M):null, kg=porTon(a,M.map(mNum)).T.kg;
  const F=filhos(a,RE.fixa), PF=p?Object.fromEntries(filhos(p,RE.fixa).map(r=>[r.k,r])):{};
  document.getElementById('a-fnote').textContent=`${nomeEmp(st.emp)} · ${lab(a)}${p?' × mesmo período de '+p:''}. R$ mil; por tonelada vendida (sem serviços e MP revendida). Clique no grupo para abrir as linhas.`;
  let h=`<tr><th>Grupo / linha</th><th>${a}</th><th>% RL</th><th>R$/t</th>${p?`<th>${p}</th><th>% RL</th><th>Var. R$ mil</th><th>Var. %</th>`:''}</tr>`;
  const row=(r,cls,ind,tg)=>{ const v=somaR(a,r,M), w=p?somaR(p,PF[r.k]||null,M):0;
    return `<tr class="${cls}"><td style="padding-left:${8+ind*14}px">${tg||''}${esc(r.r)}</td><td>${fmtK(v)}</td><td>${fP(pc(v,t.rl))}</td><td>${fT0(perT(v,kg))}</td>${p?`<td>${fmtK(w)}</td><td>${fP(pc(w,q.rl))}</td><td class="${v-w>0?'neg':''}">${(v-w>0?'+':'')+fmtK(v-w)}</td><td class="${v-w>0?'neg':''}">${Math.abs(w)<1?'–':fVar(pc(v-w,Math.abs(w)))}</td>`:''}</tr>`; };
  let aberto=false;
  F.forEach(r=>{ if(r.n===1){ const temK=!r.folha; aberto=st.fOpen.has(r.k);
      h+=row(r,'sub',0, temK?`<span class="tog" data-fk="${esc(r.k)}">${aberto?'▾':'▸'}</span>`:'<span class="tog"></span>'); }
    else if(aberto) h+=row(r,'linha',1,'<span class="tog"></span>'); });
  const ft=t.fixa, fq=q?q.fixa:0;
  h+=`<tr class="total"><td>Despesas fixas</td><td>${fmtK(ft)}</td><td>${fP(pc(ft,t.rl))}</td><td>${fT0(perT(ft,kg))}</td>${p?`<td>${fmtK(fq)}</td><td>${fP(pc(fq,q.rl))}</td><td class="${ft-fq>0?'neg':''}">${(ft-fq>0?'+':'')+fmtK(ft-fq)}</td><td>${fVar(pc(ft-fq,Math.abs(fq)))}</td>`:''}</tr>`;
  if(p) h+=`<tr class="memo"><td colspan="8" style="text-align:left;white-space:normal">Receita líquida no período: ${fVar(pc(t.rl-q.rl,Math.abs(q.rl)))}. Se as despesas fixas tivessem crescido no mesmo ritmo, seriam ${money(fq*t.rl/q.rl)}.</td></tr>`;
  const tb=document.getElementById('a-fix'); tb.innerHTML=h;
  tb.querySelectorAll('.tog[data-fk]').forEach(e=>e.onclick=()=>{ st.fOpen.has(e.dataset.fk)?st.fOpen.delete(e.dataset.fk):st.fOpen.add(e.dataset.fk); anaFixas(a,M,p); });
  // ranking (folhas das despesas variáveis e fixas)
  const rk=document.getElementById('a-rank');
  if(!p){ rk.innerHTML=''; } else {
    const fator=q.rl?t.rl/q.rl:1, Lp={}; [RE.vari,RE.fixa].forEach(re=>filhos(p,re).forEach(r=>Lp[r.k]=r));
    const it=[]; [RE.vari,RE.fixa].forEach(re=>filhos(a,re).filter(r=>r.folha).forEach(r=>{ const v=somaR(a,r,M), w=somaR(p,Lp[r.k]||null,M);
      it.push({n:r.r, g:r.n>1?r.k.split(' › ')[1]:'', v, w, d:v-w, ac:v-w*fator}); }));
    // linhas que só existem no ano anterior (sumiram) também contam como redução
    Object.values(Lp).filter(r=>r.folha && !it.some(x=>x.n===r.r && (r.n>1?r.k.split(' › ')[1]:'')===x.g)).forEach(r=>{ const w=somaR(p,r,M); if(Math.abs(w)>1) it.push({n:r.r,g:r.n>1?r.k.split(' › ')[1]:'',v:0,w,d:-w,ac:-w*fator}); });
    const up=it.filter(x=>x.d>1).sort((x,y)=>y.d-x.d).slice(0,8), dn=it.filter(x=>x.d<-1).sort((x,y)=>x.d-y.d).slice(0,5);
    let g=`<tr><th>Linha · R$ mil</th><th>${a}</th><th>${p}</th><th>Var.</th><th>Acima da receita</th></tr>`;
    const lin=x=>`<tr class="linha"><td style="white-space:normal">${esc(x.n)}${x.g?` <span style="font-size:.7rem;color:var(--ink-soft)">(${esc(x.g)})</span>`:''}</td><td>${fmtK(x.v)}</td><td>${fmtK(x.w)}</td><td class="${x.d>0?'neg':''}">${(x.d>0?'+':'')+fmtK(x.d)}</td><td class="${x.ac>0?'neg':''}">${(x.ac>0?'+':'')+fmtK(x.ac)}</td></tr>`;
    g+=`<tr class="grupo"><td colspan="5">Maiores aumentos</td></tr>`+up.map(lin).join('');
    g+=`<tr class="grupo"><td colspan="5">Maiores reduções</td></tr>`+dn.map(lin).join('');
    rk.innerHTML=g;
  }
  // evolução por grupo (% RL, ano cheio ou parcial)
  const grupos=[...new Set(LISTA.flatMap(y=>filhos(y,RE.fixa).filter(r=>r.n===1).map(r=>r.r)))];
  const cores=[C.azul,C.amarelo,C.verde,C.verm,C.azul2,C.cinza,'#7A5195','#C98A00','#4F9DA6'];
  chart('a-fevo',{type:'bar',data:{labels:LISTA.map(labC),datasets:grupos.map((gname,i)=>({label:gname,backgroundColor:cores[i%cores.length],
    data:LISTA.map(y=>{ const r=filhos(y,RE.fixa).find(x=>x.n===1&&x.r===gname), rl=tot(y,st.emp).rl; return r&&rl>0?pc(somaR(y,r,ANOS[y].M),rl):null; })}))},
    options:baseOpts({scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:v=>v+'%'}}},
      plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fP(c.raw),title:i=>lab(LISTA[i[0].dataIndex])}}}})});
}

// ---------- 3) ponto de equilíbrio ----------
// fixos = despesas fixas + resultado financeiro; variáveis = deduções, CMV, comissões/fretes e IRPJ/CSLL (Presumido acompanha a receita)
function equil(y, emp, meses){ const t=tot(y,emp,meses), n=(meses||ANOS[y].M).length, fixos=t.fixa+t.fin, mcl=t.rl?(t.mc-t.ir)/t.rl:0;
  const eq=mcl>0?fixos/mcl:null; return {t,n,fixos,mcl,eq,eqM:eq===null?null:eq/n,rlM:t.rl/n,seg:eq===null||!t.rl?null:(t.rl-eq)/t.rl*100}; }
function anaEquil(a, M){
  const E=equil(a,st.emp,M), kg=porTon(a,M.map(mNum)).T.kg, rlT=kg>0?E.t.rl/kg:null, n=E.n;
  document.getElementById('a-enote').textContent=`${nomeEmp(st.emp)} · ${lab(a)}. Receita líquida mínima para cobrir as despesas fixas e o financeiro, com a margem de contribuição do período (já descontados IRPJ/CSLL, que acompanham a receita). Margem de segurança = quanto a receita está acima do equilíbrio.`;
  document.getElementById('a-ekpis').innerHTML=[
    kpi('Receita de equilíbrio · por mês', E.eqM===null?'–':money(E.eqM), 'receita líquida média atual: '+money(E.rlM)),
    kpi('Margem de segurança', fP(E.seg), E.seg===null?'':'a receita pode cair '+fP(E.seg)+' antes de dar prejuízo', '', E.seg!==null&&E.seg<15?'neg':''),
    kpi('Equilíbrio em toneladas', E.eq===null||!rlT?'–':fTon(E.eqM/rlT), 'por mês · vendidas: '+fTon(kg/n)+'/mês'),
    kpi('Fixos por mês', money(E.fixos/n), 'despesas fixas '+money(E.t.fixa/n)+' + financeiro '+money(E.t.fin/n)+' · contribuição líquida '+fP(E.mcl*100))].join('');
  const S=LISTA.map(y=>equil(y,st.emp));
  chart('a-ech',{data:{labels:LISTA.map(labC),datasets:[
    {type:'bar',label:'Receita líquida média por mês',data:S.map(x=>x.t.rl>0?x.rlM/1e6:null),backgroundColor:C.azul,borderRadius:4,order:2},
    {type:'line',label:'Receita de equilíbrio por mês',data:S.map(x=>x.t.rl>0&&x.eqM!==null?x.eqM/1e6:null),borderColor:C.verm,backgroundColor:C.verm,borderWidth:3,tension:.2,order:1},
    {type:'line',label:'Margem de segurança %',data:S.map(x=>x.t.rl>0?x.seg:null),borderColor:C.verde,backgroundColor:C.verde,borderDash:[5,4],tension:.2,yAxisID:'y1',order:0}]},
    options:baseOpts({scales:{y:{ticks:{callback:v=>v.toLocaleString('pt-BR')+' mi'}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>v+'%'}}},
      plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.dataset.yAxisID==='y1'?fP(c.raw):'R$ '+fmtM(c.raw*1e6)+' mi'),title:i=>lab(LISTA[i[0].dataIndex])}}}})});
}

// ---------- 4) últimos 12 meses ----------
function anaLTM(){
  const pts=[]; LISTA.forEach(y=>{ const s=k=>serie(y,RE[k],st.emp); const rl=s('rl'),eb=s('eb'),ll=s('ll');
    ANOS[y].M.forEach((m,i)=>pts.push({ym:y+'-'+String(mNum(m)).padStart(2,'0'),rl:rl[i],eb:eb[i],ll:ll[i]})); });
  const R=[]; for(let i=11;i<pts.length;i++){ const w=pts.slice(i-11,i+1), sm=k=>w.reduce((s,x)=>s+x[k],0); R.push({ym:pts[i].ym,rl:sm('rl'),eb:sm('eb'),ll:sm('ll')}); }
  const ini=R.findIndex(x=>x.rl>0); const S=ini>=0?R.slice(ini):[];
  if(!S.length){ document.getElementById('a-lkpis').innerHTML=''; return; }
  const u=S[S.length-1], o=S.length>12?S[S.length-13]:null, nm=x=>nomeMes(x.ym);
  const mg=(x,k)=>pc(x[k],x.rl);
  document.getElementById('a-lkpis').innerHTML=[
    kpi('Receita líquida · 12 meses até '+nm(u), money(u.rl), nomeEmp(st.emp), o?yoyHtml(fVar(pc(u.rl-o.rl,Math.abs(o.rl)))+' vs 12 meses até '+nm(o), u.rl>=o.rl):''),
    kpi('EBITDA · 12 meses', money(u.eb), 'margem '+fP(mg(u,'eb')), o?yoyHtml(fPP(mg(u,'eb')-mg(o,'eb'))+' na margem vs '+nm(o), mg(u,'eb')>=mg(o,'eb')):''),
    kpi('Lucro líquido · 12 meses', money(u.ll), 'margem '+fP(mg(u,'ll')), o?yoyHtml(fVar(pc(u.ll-o.ll,Math.abs(o.ll)))+' vs '+nm(o)+' ('+money(o.ll)+')', u.ll>=o.ll):'', u.ll<0?'neg':'')].join('');
  chart('a-lch',{data:{labels:S.map(nm),datasets:[
    {type:'bar',label:'Receita líquida 12 meses',data:S.map(x=>x.rl/1e6),backgroundColor:'rgba(27,58,99,.35)',order:3},
    {type:'line',label:'EBITDA 12 meses',data:S.map(x=>x.eb/1e6),borderColor:C.amarelo,backgroundColor:C.amarelo,borderWidth:3,pointRadius:0,tension:.25,yAxisID:'y1',order:1},
    {type:'line',label:'Lucro líquido 12 meses',data:S.map(x=>x.ll/1e6),borderColor:C.verde,backgroundColor:C.verde,borderWidth:3,pointRadius:0,tension:.25,yAxisID:'y1',order:2}]},
    options:baseOpts({scales:{y:{ticks:{callback:v=>v+' mi'}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>v+' mi'}}},
      plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': R$ '+fmtM(c.raw*1e6)+' mi',
        afterBody:i=>{ const x=S[i[0].dataIndex]; return ['Margem EBITDA: '+fP(mg(x,'eb')),'Margem líquida: '+fP(mg(x,'ll'))]; }}}}})});
}

// ---------- 5) mapa de margens mês × ano ----------
function anaMapa(){
  const k=st.mind, nomes={lb:'margem bruta',mc:'margem de contribuição',eb:'margem EBITDA',ll:'margem líquida'};
  const cel={}, som={}; let all=[];
  LISTA.forEach(y=>{ const num=serie(y,RE[k],st.emp), rl=serie(y,RE.rl,st.emp);
    ANOS[y].M.forEach((m,i)=>{ if(rl[i]>1000){ const v=num[i]/rl[i]*100; cel[y+m]=v; all.push(v); som[m]=som[m]||[0,0]; som[m][0]+=num[i]; som[m][1]+=rl[i]; } }); });
  all.sort((x,y)=>x-y); const q=f=>all.length?all[Math.min(all.length-1,Math.max(0,Math.floor(f*(all.length-1))))]:0, lo=q(.1), hi=q(.9);
  const cor=v=>{ if(v===undefined||v===null) return ''; const f=hi>lo?Math.max(0,Math.min(1,(v-lo)/(hi-lo))):.5; return `background:hsl(${Math.round(f*120)},55%,${88-Math.round(Math.abs(f-.5)*16)}%)`; };
  let h=`<tr><th>${nomeEmp(st.emp)} · ${nomes[k]}</th>${MES.map(m=>`<th>${m}</th>`).join('')}<th class="acc">Ano</th></tr>`;
  LISTA.slice().reverse().forEach(y=>{ const t=tot(y,st.emp), ya=t.rl>0?pc(t[k],t.rl):null;
    h+=`<tr><td>${labC(y)}</td>${MES.map(m=>{ const v=cel[y+m]; return `<td style="${cor(v)}">${v===undefined?'':fP(v)}</td>`; }).join('')}<td class="acc">${fP(ya)}</td></tr>`; });
  h+=`<tr class="total"><td>Média do mês</td>${MES.map(m=>{ const s=som[m]; const v=s&&s[1]?s[0]/s[1]*100:null; return `<td style="${cor(v)}">${fP(v)}</td>`; }).join('')}<td class="acc"></td></tr>`;
  document.getElementById('a-map').innerHTML=h;
}

// ================= DEMONSTRATIVO =================
let D, M;
const sel=document.getElementById('ate');
sel.onchange=()=>{st.ate=+sel.value;rDem();};
function setAno(a){
  st.ano=a; D=ANOS[a].D; M=ANOS[a].M;
  sel.innerHTML=''; M.forEach((m,i)=>sel.add(new Option('Até '+m,i+1)));
  st.ate=Math.min(st.ate,M.length); if(st.ate<1) st.ate=M.length;
  sel.value=st.ate;
  document.getElementById('anoT').textContent=lab(a);
  document.querySelectorAll('#ano button').forEach(x=>x.classList.toggle('on',x.dataset.v===a));
}
document.getElementById('ano').innerHTML=LISTA.map(a=>`<button data-v="${a}">${a}</button>`).join('');
document.querySelectorAll('#ano button').forEach(b=>b.onclick=()=>{st.ate=12;setAno(b.dataset.v);rDem();});
setAno(st.ano);
const val = r => vals(r);
const acum = a => { let s=0; return a.map(x => s+=x); };
const KP = {nova:[/^Receita Bruta/,/Receita Líquida/,/Lucro Bruto/,/EBITDA/,/Lucro Líquido/],
            atual:[/Receita Bruta/,/Receita Liquida/,/Lucro Bruto/,/Ebitda/,/Resultado Liquido/]};
const findD = re => D[st.est].find(r => r.n===0 && re.test(r.r));
const fT = v => st.un==='mil' ? fmtK(v) : fmt(v);
// mesmo período do ano anterior para uma linha (pela chave)
function antLinha(k, meses){ const p=mesmoPeriodo(st.ano, meses); if(!p) return null; const r=ANOS[p].D[st.est].find(x=>x.k===k); if(!r) return 0;
  const v=vals(r); return ANOS[p].M.reduce((s,m,i)=>s+(meses.includes(m)?v[i]:0),0); }
function rows(){ const out=[];const hide=[];
  for(const r of D[st.est]){ while(hide.length && hide[hide.length-1]>=r.n) hide.pop(); const vis=!hide.length; if(vis) out.push(r); if(vis && !st.open.has(r.k)) hide.push(r.n); }
  return out; }
function hasKids(i,list){return list[i+1] && list[i+1].n>list[i].n;}
function rDem(){
  const n=st.ate, L=D[st.est], meses=M.slice(0,n);
  const rl = val(L.find(r=>r.n===0 && /Receita L[ií]quida/.test(r.r)));
  const rlTot = rl.slice(0,n).reduce((a,b)=>a+b,0);
  document.getElementById('kpis').innerHTML = KP[st.est].map(re=>{
    const r=findD(re); if(!r) return '';
    const v=val(r).slice(0,n).reduce((a,b)=>a+b,0), pv=antLinha(r.k, meses);
    const yo = (pv===null||!pv) ? '' : yoyHtml(fVar((v-pv)/Math.abs(pv)*100)+' vs '+meses[0]+'–'+meses[n-1]+'/'+(+st.ano-1)+' ('+money(pv)+')', v>=pv);
    return kpi(r.r.replace(/^[=(\-)\s]+/,'')+' · '+M[0]+'–'+M[n-1], money(v), rlTot?fP(v/rlTot*100)+' da receita líquida':'', yo, v<0?'neg':'');
  }).join('');
  const lucro = val(findD(KP[st.est][4])).slice(0,n), eb = val(findD(KP[st.est][3])).slice(0,n), rln = rl.slice(0,n);
  const tr = a => st.vis==='acum'?acum(a):a;
  document.getElementById('ctitle').textContent = 'Receita líquida × EBITDA × resultado' + (st.vis==='acum'?' (acumulado)':' (mês a mês)');
  chart('ch',{data:{labels:meses,datasets:[
    {type:'bar',label:'Receita líquida',data:tr(rln),backgroundColor:C.azul,borderRadius:4,order:3},
    {type:'line',label:'EBITDA',data:tr(eb),borderColor:C.amarelo,backgroundColor:C.amarelo,tension:.25,order:1},
    {type:'line',label:'Resultado líquido',data:tr(lucro),borderColor:C.verde,backgroundColor:C.verde,tension:.25,order:2}]},
    options:baseOpts({plugins:{legend:{labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{y:{ticks:{callback:v=>fmtK(v)+' mil'}}}})});
  const temAnt = mesmoPeriodo(st.ano, meses)!==null;
  let h = `<tr><th>${st.est==='nova'?'Estrutura nova':'Estrutura atual'} · ${st.un==='mil'?'R$ mil':'R$'}</th>${meses.map(m=>`<th>${m}</th>`).join('')}<th class="acc">Acum.</th><th>% RL</th>${temAnt?'<th>vs ano ant.</th>':''}</tr>`;
  rows().forEach(r=>{
    const all=val(r).slice(0,n), a=st.vis==='acum'?acum(all):all, t=all.reduce((x,y)=>x+y,0);
    const kids = hasKids(D[st.est].indexOf(r), D[st.est]);
    const tog = kids ? `<span class="tog" data-k="${esc(r.k)}">${st.open.has(r.k)?'▾':'▸'}</span>` : '<span class="tog"></span>';
    let hz=''; if(temAnt){ const pv=antLinha(r.k, meses); hz = (pv===null||Math.abs(pv)<1) ? '<td>–</td>' : `<td class="${(t-pv)<0?'neg':''}">${fVar((t-pv)/Math.abs(pv)*100)}</td>`; }
    h += `<tr class="${r.t}"><td style="padding-left:${8+r.n*14}px">${tog}${esc(r.r)}</td>${a.map(v=>`<td class="${v<0?'neg':''}">${fT(v)}</td>`).join('')}
      <td class="acc ${t<0?'neg':''}">${fT(t)}</td><td>${rlTot?(t/rlTot*100).toFixed(1).replace('.',',')+'%':''}</td>${hz}</tr>`;
  });
  const t=document.getElementById('t'); t.innerHTML=h;
  t.querySelectorAll('.tog[data-k]').forEach(e=>e.onclick=()=>{st.open.has(e.dataset.k)?st.open.delete(e.dataset.k):st.open.add(e.dataset.k);rDem();});
}
document.getElementById('exp').onclick=()=>{D[st.est].forEach(r=>st.open.add(r.k));rDem();};
document.getElementById('col').onclick=()=>{st.open.clear();rDem();};
render();

  }

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  async function montar(raiz, op) {
    op = op || {};
    raiz.textContent = '';
    var chamar = op.chamar || function (corpo) { return global.RuralAuth.chamar('dre', op.url, corpo); };
    var topo = null;
    if (global.RuralUI) {
      var t = el('div'); raiz.appendChild(t);
      topo = global.RuralUI.topo(t, { app: 'dre', titulo: 'DRE', sub: 'carregando…', logo: op.logo, usuario: op.usuario,
        apps: op.apps || [], admin: !!(op.usuario && op.usuario.admin), aoSair: op.aoSair });
    }
    var msg = el('p', { 'class': 'dr-msg', role: 'status' }, 'Carregando o DRE…'); raiz.appendChild(msg);
    var r;
    try { r = await chamar({ acao: 'dados' }); } catch (e) { r = { ok: false, message: 'Sem conexão com a planilha do DRE.' }; }
    if (!r || r.ok !== true || !r.anos || !r.an || !Object.keys(r.anos).length) {
      msg.textContent = (r && r.message) || 'Não foi possível carregar o DRE.';
      msg.className = 'dr-msg dr-erro';
      if (topo) topo.sub.textContent = '';
      return { ok: false };
    }
    msg.remove();
    if (topo) topo.sub.textContent = (r.periodo || '') + (r.base_de ? ' · base de ' + r.base_de : '');
    var box = el('div', { id: 'dr-painel' });
    box.innerHTML = MARCACAO;   // so a estrutura fixa da tela; nenhum dado
    raiz.appendChild(box);
    box.querySelector('#dr-periodo').textContent = r.periodo || '';
    box.querySelector('#dr-gerado').textContent = r.base_de || '';
    iniciarPainel(r);
    return { ok: true, construtor: r.construtor === true };
  }

  global.DreApp = { montar: montar };
})(typeof window !== 'undefined' ? window : this);
