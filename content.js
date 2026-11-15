// PokeIdle - Tempo para o nivel
// Somente leitura: le nivel, XP e XP/h da pagina e calcula. Nao clica no jogo, nao envia nada.
// Curva (Wiki): xpTotal(L) = 50/3 * (L^3 - 6L^2 + 17L - 12)
(() => {
  'use strict';
  if (window.__pokeidleXpCalc) return;

  const xpTotal = (L) => Math.round((50 / 3) * (L ** 3 - 6 * L ** 2 + 17 * L - 12));
  const parseNum = (s) => {
    const n = Number(String(s ?? '').replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  // XP que falta: resto do nivel atual + niveis inteiros ate o alvo.
  function xpFaltante(nivel, dentro, faixa, alvo) {
    if (!(alvo > nivel)) return 0;
    return Math.max(0, faixa - dentro) + (xpTotal(alvo) - xpTotal(nivel + 1));
  }

  function fmtDuracao(horas) {
    if (!Number.isFinite(horas) || horas < 0) return '—';
    const totalMin = Math.round(horas * 60);
    if (totalMin < 1) return 'menos de 1 min';
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    const p = [];
    if (d) p.push(`${d} d`);
    if (h) p.push(`${h} h`);
    if (m && d < 3) p.push(`${m} min`);
    return p.join(' ');
  }
  const fmtNum = (n) => Math.round(n).toLocaleString('pt-BR');
  const fmtCompacto = (n) => {
    const f = (v, s) => v.toLocaleString('pt-BR', { maximumFractionDigits: v < 10 ? 2 : 1 }) + s;
    if (n >= 1e9) return f(n / 1e9, ' bi');
    if (n >= 1e6) return f(n / 1e6, ' M');
    if (n >= 1e3) return f(n / 1e3, ' k');
    return fmtNum(n);
  };
  const fmtData = (ms) =>
    new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // XP/h que o proprio jogo mostra (placar da Economia ou painel Sessao): mesmo valor que o jogador ve.
  function xphDoJogo(sessaoId, kpi) {
    const el = document.querySelector(`[data-kpi="${kpi}"] .eco-kpi-h`) || document.querySelector(sessaoId);
    return parseNum(el?.textContent);
  }

  // Tempo do proximo nivel exatamente como o placar do jogo mostra (ex.: "Nv 528 em 16m 36s" -> "16m 36s").
  function etaDoJogo(kpi) {
    const t = document.querySelector(`[data-kpi="${kpi}"] .eco-kpi-sub`)?.textContent ?? '';
    const m = t.match(/\bem\s+(.+)$/i);
    return m ? m[1].trim() : '';
  }

  // ---------- leitura da pagina ----------
  function lerPokemon() {
    const card = document.querySelector('#ativo-card');
    if (!card) return null;
    const lv = card.querySelector('.pl-lv');
    const xp = card.querySelector('.barra.xp span');
    if (!lv || !xp) return null;
    const nivel = parseNum(lv.textContent);
    const m = xp.textContent.match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (!nivel || !m) return null;
    const nomeEl = card.querySelector('.ativo-nome');
    // so letras: ignora numeros/selos que mudam (refino, nivel) e nao confunde com troca de pokemon
    const nomeCru = nomeEl ? nomeEl.textContent.replace(lv.textContent, '') : '';
    const nome = nomeCru.replace(/[^\p{L}]/gu, '');
    return { nome, rotulo: nomeCru.trim() || 'Pokemon', nivel, dentro: parseNum(m[1]), faixa: Math.max(1, parseNum(m[2])), xph: xphDoJogo('#sessao-xp-pokemon-h', 'xpPokemon') };
  }

  function lerTreinador() {
    const lvEl = document.querySelector('#tr-level');
    const xpEl = document.querySelector('#tr-xp-txt');
    if (!lvEl || !xpEl) return null;
    const nivel = parseNum(lvEl.textContent);
    const m = xpEl.textContent.match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (!nivel || !m) return null;
    return { nome: 'Treinador', rotulo: 'Treinador', nivel, dentro: parseNum(m[1]), faixa: Math.max(1, parseNum(m[2])), xph: xphDoJogo('#sessao-xp-treinador-h', 'xpTreinador') };
  }

  // ---------- XP/h medido (plano B quando o placar do jogo nao existe) ----------
  const amostras = { pk: [], tr: [] };
  function medir(chave, d) {
    const lista = amostras[chave];
    const agora = Date.now();
    const total = xpTotal(d.nivel) + d.dentro;
    const ult = lista[lista.length - 1];
    if (ult && (total < ult.total || ult.nome !== d.nome)) lista.length = 0; // trocou de pokemon ou resetou
    if (!ult || agora - ult.t >= 5000 || lista.length === 0) lista.push({ t: agora, total, nome: d.nome });
    while (lista.length > 1 && agora - lista[0].t > 15 * 60000) lista.shift();
    const a = lista[0];
    const b = lista[lista.length - 1];
    const dt = b.t - a.t;
    if (dt < 20000) return { xph: 0, janelaMin: dt / 60000, curta: true };
    return { xph: ((b.total - a.total) / dt) * 3600000, janelaMin: dt / 60000, curta: false };
  }

  // ---------- estado e armazenamento ----------
  const NOMES = { pk: 'Pokemon', tr: 'Treinador' };
  const estado = { pk: { alvo: '' }, tr: { alvo: '' } };
  const guardar = (k, v) => { try { localStorage.setItem('pxp-' + k, v); } catch { /* sem storage: ignora */ } };
  const ler = (k) => { try { return localStorage.getItem('pxp-' + k) ?? ''; } catch { return ''; } };
  estado.pk.alvo = ler('alvo-pk');
  estado.tr.alvo = ler('alvo-tr');
  let aberto = null; // 'pk' | 'tr' | null (janela grande)

  // ---------- estilo do jogo (madeira + cartoes escuros) ----------
  const CSS_BASE = `
    :host{all:initial}
    *{box-sizing:border-box}
    .painel{font:13px/1.4 "Segoe UI",system-ui,sans-serif;color:#fff6ef;border-radius:8px;padding:13px 15px 15px;
      background:linear-gradient(180deg,#914850 0 10px,#bd6951 10px calc(100% - 14px),#df824c calc(100% - 14px) calc(100% - 7px),#bd6951 calc(100% - 7px) 100%);
      box-shadow:inset 0 0 0 2px #480e1e,inset 0 0 0 4px #f1d3b7,inset 0 0 0 6px #bd6951,0 4px 0 #722c3f,0 6px 0 #480e1e}
    h3{margin:0;font:700 12px Tahoma,Verdana,"Segoe UI",sans-serif;text-transform:uppercase;letter-spacing:1px;color:#fff;
      text-shadow:-2px -2px 0 #722c3f,2px -2px 0 #722c3f,-2px 2px 0 #722c3f,2px 2px 0 #722c3f}
    .btn{cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:#33202b;border-radius:5px;
      box-shadow:inset 0 0 0 2px #480e1e,0 1px 0 #e7a86d;color:#fff6ef;border:0;padding:0;font:700 13px "Segoe UI",sans-serif}
    .btn:hover{background:#462b39}
    .card{background:#33202b;border-radius:6px;box-shadow:inset 0 0 0 2px #480e1e,0 1px 0 #e7a86d;padding:9px}
    .nome{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
    .nome b{font-weight:700;color:#fff6ef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .lv{color:#ffa7d7;font-weight:700;white-space:nowrap}
    .barra{position:relative;border-radius:5px;overflow:hidden;background:#1e1219;box-shadow:inset 0 0 0 2px #480e1e,0 1px 0 #e7a86d}
    .fill{height:100%;width:0;background:linear-gradient(90deg,#4a8ab8,#6fc0f0);transition:width .25s}
    .barra span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;
      text-shadow:0 1px 0 #1e1219,1px 0 0 #1e1219,-1px 0 0 #1e1219,0 -1px 0 #1e1219}
    .pill{background:#5c3948;border-radius:4px;padding:1px 7px;font-weight:700;box-shadow:inset 0 0 0 1px #480e1e;white-space:nowrap}
  `;

  // ======================================================
  // 1) DOCK: encaixado abaixo do painel Equipe
  // ======================================================
  const dock = document.createElement('div');
  dock.id = 'pokeidle-xp-dock';
  const dRoot = dock.attachShadow({ mode: 'open' });
  dRoot.innerHTML = `
  <style>${CSS_BASE}
    .cab{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 9px}
    .corpo{display:flex;flex-direction:column;gap:8px}
    .linha{all:unset;display:block;cursor:pointer;background:#33202b;border-radius:6px;padding:7px 9px 8px;
      box-shadow:inset 0 0 0 2px #480e1e,0 1px 0 #e7a86d}
    .linha:hover{background:#3d2733}
    .linha.aberto{box-shadow:inset 0 0 0 2px #ba5ad1,0 1px 0 #e7a86d}
    .linha .nome b{font-size:13px}
    .linha .lv{font-size:10px}
    .linha .barra{height:8px;margin:5px 0 6px}
    .info{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:11.5px}
    .info .pill{font-size:11px}
    .prox{color:#c9a9b4}
    .vazio{color:#f5cdb9;font-size:12px}
    .recolhido .corpo{display:none}
    .recolhido .cab{margin-bottom:0}
    .chev{transition:transform .15s}
    .recolhido .chev{transform:rotate(-90deg)}
    .dica{color:#f5cdb9;font-size:10.5px;margin-top:7px;text-align:center}
    .recolhido .dica{display:none}
  </style>
  <div class="painel" id="caixa">
    <div class="cab"><h3>Tempo para o nível</h3>
      <button class="btn" id="recolher" type="button" title="Recolher"><svg class="chev" viewBox="0 0 24 24" width="16" height="16"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg></button></div>
    <div class="corpo">
      <button class="linha" type="button" data-k="pk"></button>
      <button class="linha" type="button" data-k="tr"></button>
    </div>
    <div class="dica">Clique para ver os detalhes</div>
  </div>`;
  for (const k of Object.keys(NOMES)) {
    dRoot.querySelector(`.linha[data-k="${k}"]`).innerHTML = `
      <div class="nome"><b data-r="nome">${NOMES[k]}</b><span class="lv" data-r="nivel"></span></div>
      <div class="barra"><div class="fill" data-r="fill"></div></div>
      <div class="info"><span class="pill" data-r="xph">—</span><span class="prox" data-r="prox">—</span></div>`;
    dRoot.querySelector(`.linha[data-k="${k}"]`).addEventListener('click', () => abrirJanela(aberto === k ? null : k));
  }
  const caixa = dRoot.getElementById('caixa');
  dRoot.getElementById('recolher').addEventListener('click', () => {
    caixa.classList.toggle('recolhido');
    guardar('recolhido', caixa.classList.contains('recolhido') ? '1' : '');
  });
  if (ler('recolhido')) caixa.classList.add('recolhido');

  // ======================================================
  // 2) JANELA GRANDE: abre ao clicar numa das linhas
  // ======================================================
  const modal = document.createElement('div');
  modal.id = 'pokeidle-xp-janela';
  modal.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:none;';
  const mRoot = modal.attachShadow({ mode: 'open' });
  mRoot.innerHTML = `
  <style>${CSS_BASE}
    .fundo{position:fixed;inset:0;background:#0009;display:flex;align-items:center;justify-content:center;padding:16px}
    .painel{width:min(440px,100%);font-size:15px}
    .topo{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px}
    .topo h3{font-size:14px}
    .card{padding:12px 13px 13px}
    .nome b{font-size:20px}
    .nome .lv{font-size:14px}
    .barra{height:22px;margin:10px 0 12px}
    .barra span{font-size:12px}
    .l{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px 0}
    .l > span:first-child{color:#c9a9b4}
    .v{font-weight:700;text-align:right}
    .pill{font-size:14px}
    .grande{font-size:24px;color:#ffe9a3}
    .alvo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 6px;padding:10px 0 4px;border-top:1px solid #ffffff1c}
    .alvo > span{color:#c9a9b4}
    input{all:unset;box-sizing:border-box;width:130px;padding:5px 10px;background:#1e1219;border-radius:5px;color:#fff;text-align:right;font-size:15px;
      box-shadow:inset 0 0 0 2px #480e1e,0 1px 0 #e7a86d}
    input:focus{box-shadow:inset 0 0 0 2px #e2a93f,0 1px 0 #e7a86d}
    input::placeholder{color:#8d7480}
    .aviso{color:#ffb4a0;font-size:12.5px;margin-top:6px}
    .fonte{color:#8d7480;font-size:12px;margin-top:8px}
    .btn{width:30px;height:30px;font-size:15px}
  </style>
  <div class="fundo" id="fundo">
    <div class="painel" role="dialog" aria-modal="true">
      <div class="topo"><h3 data-m="titulo">Tempo para o nível</h3><button class="btn" id="fechar" type="button" title="Fechar (Esc)">✕</button></div>
      <div class="card">
        <div class="nome"><b data-m="nome"></b><span class="lv" data-m="nivel"></span></div>
        <div class="barra"><div class="fill" data-m="fill"></div><span data-m="barra"></span></div>
        <div class="l"><span>XP/h</span><span class="v pill" data-m="xph">—</span></div>
        <div class="l"><span>Próximo nível em</span><span class="v" data-m="prox">—</span></div>
        <div class="alvo"><span>Nível alvo</span><input data-m="alvo" inputmode="numeric" placeholder="ex: 1000"></div>
        <div class="l"><span>XP que falta</span><span class="v" data-m="xpf">—</span></div>
        <div class="l"><span>Tempo</span><span class="v grande" data-m="tempo">—</span></div>
        <div class="l"><span>Chega em</span><span class="v" data-m="eta">—</span></div>
        <div class="aviso" data-m="aviso"></div>
        <div class="fonte" data-m="fonte"></div>
      </div>
    </div>
  </div>`;
  const m = (n) => mRoot.querySelector(`[data-m="${n}"]`);
  const inpAlvo = m('alvo');
  inpAlvo.addEventListener('input', () => {
    if (!aberto) return;
    estado[aberto].alvo = inpAlvo.value.replace(/[^\d]/g, '');
    inpAlvo.value = estado[aberto].alvo;
    guardar('alvo-' + aberto, estado[aberto].alvo);
    atualizar();
  });
  mRoot.getElementById('fechar').addEventListener('click', () => abrirJanela(null));
  mRoot.getElementById('fundo').addEventListener('mousedown', (e) => { if (e.target.id === 'fundo') abrirJanela(null); });
  // teclas digitadas na janela nao chegam nos atalhos do jogo; Esc fecha
  for (const ev of ['keydown', 'keyup', 'keypress']) {
    mRoot.addEventListener(ev, (e) => { if (ev === 'keydown' && e.key === 'Escape') abrirJanela(null); e.stopPropagation(); });
  }

  function abrirJanela(k) {
    aberto = k;
    modal.style.display = k ? 'block' : 'none';
    for (const kk of Object.keys(NOMES)) dRoot.querySelector(`.linha[data-k="${kk}"]`).classList.toggle('aberto', kk === k);
    if (k) {
      m('titulo').textContent = `Tempo para o nível · ${NOMES[k]}`;
      inpAlvo.value = estado[k].alvo;
      atualizar();
      inpAlvo.focus();
    }
  }

  // ---------- calculo e pintura ----------
  function modelo(k, d, limiteNivel) {
    let xph = d.xph;
    let fonte = 'XP/h lido do jogo (igual ao placar)';
    if (!(xph > 0)) {
      const med = medir(k, d);
      xph = med.xph;
      if (xph > 0) fonte = `XP/h medido pela extensão em ${med.janelaMin.toFixed(1)} min (placar do jogo não encontrado)`;
      else if (med.curta) fonte = `Medindo o XP/h... ${Math.round(med.janelaMin * 60)}s (ou abra a Sessão)`;
      else fonte = 'XP não mudou na barra: abra a Sessão para ver o XP/h';
    } else {
      medir(k, d); // mantem a janela de medicao viva
    }
    const faltaProx = Math.max(0, d.faixa - d.dentro);
    const alvo = Number(estado[k].alvo) || 0;
    const proxJogo = etaDoJogo(k === 'pk' ? 'xpPokemon' : 'xpTreinador');
    const r = { d, xph, fonte, proxH: xph > 0 ? faltaProx / xph : NaN, proxTexto: proxJogo || (xph > 0 ? fmtDuracao(faltaProx / xph) : ''), alvo, falta: null, horas: NaN, eta: null, aviso: '', jaChegou: false };
    if (alvo && alvo <= d.nivel) r.jaChegou = true;
    else if (alvo) {
      r.falta = xpFaltante(d.nivel, d.dentro, d.faixa, alvo);
      if (xph > 0) { r.horas = r.falta / xph; r.eta = Date.now() + r.horas * 3600000; }
      if (k === 'pk' && limiteNivel && alvo > limiteNivel) {
        r.aviso = `Atenção: o pokemon só luta até 5 níveis acima do treinador (Nv ${fmtNum(limiteNivel)} hoje).`;
      }
    }
    return r;
  }

  function pintarDock(k, r) {
    const linha = dRoot.querySelector(`.linha[data-k="${k}"]`);
    const q = (n) => linha.querySelector(`[data-r="${n}"]`);
    if (!r) {
      linha.style.display = k === 'tr' ? 'none' : '';
      q('nome').textContent = NOMES[k];
      q('nivel').textContent = '';
      q('xph').textContent = '—';
      q('prox').textContent = 'abra o jogo logado';
      q('fill').style.width = '0%';
      return;
    }
    linha.style.display = '';
    q('nome').textContent = r.d.rotulo;
    q('nivel').textContent = `Nv ${fmtNum(r.d.nivel)}`;
    q('fill').style.width = `${Math.min(100, (r.d.dentro / r.d.faixa) * 100)}%`;
    q('xph').textContent = r.xph > 0 ? `${fmtCompacto(r.xph)}/h` : '—';
    q('prox').textContent = r.proxTexto ? `próx. nível em ${r.proxTexto}` : 'medindo...';
  }

  function pintarJanela(k, r) {
    if (!r) { m('nome').textContent = NOMES[k]; m('fonte').textContent = 'Abra o jogo logado para ler os dados.'; return; }
    const d = r.d;
    m('nome').textContent = d.rotulo;
    m('nivel').textContent = `Nv ${fmtNum(d.nivel)}`;
    m('fill').style.width = `${Math.min(100, (d.dentro / d.faixa) * 100)}%`;
    m('barra').textContent = `${fmtNum(d.dentro)} / ${fmtNum(d.faixa)} xp`;
    m('xph').textContent = r.xph > 0 ? `${fmtNum(r.xph)}/h` : '—';
    m('prox').textContent = r.proxTexto || '—';
    m('fonte').textContent = r.fonte;
    m('aviso').textContent = r.aviso;
    if (!r.alvo) { m('xpf').textContent = m('tempo').textContent = m('eta').textContent = '—'; return; }
    if (r.jaChegou) { m('xpf').textContent = '0'; m('tempo').textContent = 'já alcançou'; m('eta').textContent = '—'; return; }
    m('xpf').textContent = fmtNum(r.falta);
    m('tempo').textContent = r.xph > 0 ? fmtDuracao(r.horas) : '—';
    m('eta').textContent = r.eta ? fmtData(r.eta) : '—';
  }

  function atualizar() {
    const pk = lerPokemon();
    const tr = lerTreinador();
    const rs = { pk: pk ? modelo('pk', pk, tr ? tr.nivel + 5 : 0) : null, tr: tr ? modelo('tr', tr, 0) : null };
    pintarDock('pk', rs.pk);
    pintarDock('tr', rs.tr);
    if (aberto) pintarJanela(aberto, rs[aberto]);
    encaixar();
  }

  // Encaixa o painel logo abaixo da Equipe (#p-equipe). Se o jogo redesenhar a coluna, encaixa de novo.
  function encaixar() {
    const equipe = document.querySelector('#p-equipe');
    if (equipe) {
      if (dock.previousElementSibling !== equipe || !dock.isConnected) {
        dock.style.cssText = 'display:block;margin-top:14px;';
        equipe.after(dock);
      }
    } else if (!dock.isConnected) {
      // plano B: sem a coluna da Equipe, fica flutuando no canto
      dock.style.cssText = 'position:fixed;left:12px;bottom:14px;width:252px;z-index:2147483000;';
      document.documentElement.appendChild(dock);
    }
    if (!modal.isConnected) document.documentElement.appendChild(modal);
  }

  encaixar();
  atualizar();
  setInterval(atualizar, 2000);
  window.__pokeidleXpCalc = { xpTotal, xpFaltante, fmtDuracao };
})();
