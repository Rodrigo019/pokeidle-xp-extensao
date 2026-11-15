# Material para o formulário da Chrome Web Store

## Aba "Store listing"

**Nome (até 75 caracteres)**
PokeIdle - Tempo para o nível

**Resumo (até 132 caracteres)**
Mostra quanto tempo falta para o pokemon e o treinador chegarem a um nível no PokeIdle. Só lê a página.

**Descrição detalhada**
Quanto tempo falta para o seu pokemon (ou o seu treinador) chegar ao nível que você quer? Esta extensão faz essa conta por você, direto na tela do PokeIdle.

Um painel fica encaixado logo abaixo da Equipe, com duas linhas: Pokemon e Treinador. Cada uma mostra o nível, a barra de XP, o XP por hora e o tempo até o próximo nível.

Clique em uma das linhas para abrir uma janela maior, de leitura fácil, com:
• XP por hora (o mesmo do placar do jogo)
• tempo até o próximo nível
• campo de nível alvo: o XP que falta, o tempo total e a data e hora estimadas de chegada
• aviso quando o alvo do pokemon passa de 5 níveis acima do treinador

O visual segue o do próprio jogo. O nível alvo fica salvo no seu navegador.

PRIVACIDADE E SEGURANÇA
• Roda somente em pokeidle.io.
• Não pede nenhuma permissão especial.
• Não faz requisições de rede: nada sai do seu navegador.
• Só lê o que o jogo já mostra na tela e calcula localmente. Não clica, não joga por você e não envia comandos.
• Código aberto, para qualquer pessoa conferir: https://github.com/Rodrigo019/pokeidle-xp-extensao

A estimativa assume que o XP por hora se mantém. O XP por hora do jogo é a média da sessão desde o último Reset.

Projeto não oficial, sem ligação com os criadores do PokeIdle.

**Categoria:** Jogos (Games) — ou "Ferramentas" se "Jogos" não aparecer para extensões.
**Idioma:** Português (Brasil)

## Aba "Privacy"

**Propósito único (single purpose)**
Mostrar, na página do jogo PokeIdle, quanto tempo falta para o pokemon e o treinador chegarem a um nível, calculado a partir do XP que o jogo já exibe.

**Justificativa de permissões**
A extensão não solicita permissões (`permissions`). Usa apenas um *content script* limitado a `https://pokeidle.io/*` e `https://www.pokeidle.io/*`, necessário para ler o nível e a barra de XP exibidos na página e desenhar o painel.

**Uso de código remoto:** Não. Todo o código está dentro do pacote.

**Dados coletados:** nenhum (marque todas as caixas como "não coleta").
Marque também as 3 declarações: não vendo dados a terceiros, não uso para fins alheios ao propósito único, não uso para crédito/empréstimo.

**URL da política de privacidade**
https://github.com/Rodrigo019/pokeidle-xp-extensao/blob/main/PRIVACY.md

## Imagens
- Ícone da loja 128×128: `icons/icon128.png` (já pronto).
- Capturas de tela (pelo menos 1, tamanho 1280×800 ou 640×400): precisam ser do jogo logado.
- Imagem promocional pequena 440×280: opcional.
