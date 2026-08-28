# Posidonio Bar — site

Site one-page para o **Posidonio Bar**, a taverna grega do Porto de Santos (ao lado do
Mariners Bar). Estático, **zero dependências** — um único `index.html` + fotos em
`assets/`. Basta abrir no navegador ou hospedar em qualquer lugar (Vercel, Netlify, S3).

## Conceito — "Barro & Egeu"

Direção oposta ao Mariners (navy frio + neon): aqui é **taverna à luz de vela** —
terracota, osso de louça, barro esculpido (textura real da parede do bar) e o azul Egeu
aparecendo **uma única vez**, na bandeira. Tipografia display **GFS Didot** (a tipografia
grega clássica), corpo Instrument Sans, assinaturas em Caveat.

## Interações (tudo canvas/CSS puro, sem bibliotecas)

- **A pilha no hero** — pilha de pratos em perspectiva; cada clique tira o do topo, que
  voa e estoura no ar: física de cacos com gravidade, quique no chão, som de louça
  **sintetizado** (WebAudio, sem arquivos), "ΟΠΑ!" flutuante e contador persistente
  (localStorage). Esvaziou? "άλλη μία πίλα!" — chega outra pilha, prato por prato.
- **Cena do ritual** — ao entrar na seção, o prato despenca com gravidade própria (uma
  única vez — não re-arma a cada scroll) e estoura no chão xadrez, revelando a foto real
  dos cacos.
- **Bandeira realista** — canvas com ondulação de tecido (colunas + sombreamento) e as
  assinaturas reais dos navios (Cape Tainaro, Amazon Victory, "ΣΑΓΑΠΩ ΠΟΣΕΙΔΩΝΙΟ"…).
- Letreiro de navios, reveals por IntersectionObserver, parallax do friso, grão de filme.
- `prefers-reduced-motion` respeitado; animações pausam fora da viewport.

## O que personalizar antes de entregar

| Onde | O quê |
|---|---|
| `#visite` | Número do WhatsApp no botão "Chamar no WhatsApp" (href) e endereço exato |
| `#visite` | Instagram real (placeholder: `@posidoniobar`) e horário de funcionamento |
| `#cardapio` | Pratos e preços (os atuais são plausíveis, não confirmados) |
| `#bar` | "5.708 escalas" = dado real do Porto de Santos (2025); atualizar se quiser |
| `SIGS` no JS | Assinaturas desenhadas na bandeira (transcritas das fotos reais) |

## Modo QA / screenshot

`?shot=1` pula a cortina de entrada e revela tudo (para capturas automáticas).
`?shot=1&goto=cardapio` posiciona numa seção; `?shot=1&smash=1` quebra o prato sozinho.

## Fotos

`assets/` contém as fotos reais do bar (bandeira assinada, pilhas de pratos, cacos no
piso, mural) já otimizadas, + `relief-band.jpg` (textura da parede de barro usada no hero).
