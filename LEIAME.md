# PokeIdle - Tempo para o nível (extensão do Chrome)

Mostra um painelzinho no canto da tela do jogo com o tempo que falta para o **pokemon ativo** e para o **treinador** chegarem a um nível. Só lê a página e calcula: não clica, não joga, não envia nada.

## Como instalar
1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha esta pasta (`pokeidle-xp-extensao`).
4. Recarregue a aba do jogo (pokeidle.io/app).

## Como usar
- O painel fica **encaixado logo abaixo da Equipe**, com duas linhas: **Pokemon** e **Treinador** (nível, barra de XP, XP/h e tempo até o próximo nível). O botão ▾ recolhe o painel.
- **Clique numa das linhas** para abrir uma janela maior com tudo: XP/h, próximo nível, **nível alvo**, XP que falta, tempo e data/hora estimada. Fecha no ✕, com Esc ou clicando fora.
- O nível alvo de cada um fica salvo.
- O XP/h é o mesmo do placar do jogo (média da sessão desde o último Reset). Se o placar não for encontrado, a extensão mede sozinha o ganho de XP por alguns minutos (indicado na janela).
- Se o alvo do pokemon passar de 5 níveis acima do treinador, aparece um aviso.

## Como calcula
`xpTotal(L) = 50/3 × (L³ − 6L² + 17L − 12)` (curva da Wiki). XP que falta = resto do nível atual (lido da barra) + níveis inteiros até o alvo. Tempo = XP que falta ÷ XP/h.
Estimativa: assume XP/h constante.

## Se algo não aparecer
O jogo pode mudar o layout. Os elementos lidos são: `#ativo-card` (`.pl-lv` e `.barra.xp`), `#tr-level`, `#tr-xp-txt`, `#sessao-xp-pokemon-h` e `#sessao-xp-treinador-h`. Se mudarem, é só ajustar `content.js`.
