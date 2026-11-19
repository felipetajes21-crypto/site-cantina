# Site da Cantina — pedidos antecipados

O cliente pede e paga pelo celular (Pix) e só retira no balcão, sem fila. A cantina acompanha a fila de pedidos em tempo real por um painel.

## Como rodar no seu computador

Requisito: [Node.js](https://nodejs.org) 20 ou mais recente.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run setup
```

```bash
npm run dev
```

Abra http://localhost:3000. O `npm run setup` cria o banco SQLite, o usuário admin e os produtos de exemplo.

| Acesso | Endereço | Login |
| --- | --- | --- |
| Cliente | http://localhost:3000 | crie uma conta em "Entrar → Cadastre-se" |
| Painel da cantina | http://localhost:3000/admin | `admin@cantina.local` / `admin12345` (definidos no `.env`) |

### Roteiro de teste (5 minutos)

1. Abra o painel em uma aba (`/admin`), faça login e clique em **Ativar som de novo pedido**.
2. Em outra aba (ou no celular), crie uma conta de cliente, adicione itens, escreva uma observação, escolha o dia e digite o horário de retirada (ou "o mais rápido possível") e clique em **Fazer pedido e pagar**.
3. Na tela do Pix, clique em **Já paguei**. O pedido entra na fila da cantina e toca o alerta.
4. No painel o pedido aparece em **Recebido** com o selo **Conferir Pix**. Clique em **Pix conferido** e depois em **Marcar como pronto**. A tela do cliente acompanha sozinha.
5. Em **Retirada**, digite o número do pedido (ou leia o QR Code do cliente com a câmera) e confirme.
6. Em **Meus pedidos**, teste o **Repetir pedido**. Em **Relatórios**, veja a venda registrada.

O seed deixa a cantina aberta todos os dias, das 06:00 às 23:00, para facilitar os testes. Ajuste em **Painel → Configurações**.

### O que o dono controla pelo painel

- **Produtos**: criar, editar, remover, preço, categoria e foto. A foto pode ser tirada na hora pelo celular, e o site a reduz antes de enviar.
- **Estoque**: em **Produtos**, use "Definir estoque" e ajuste com − / +. Cada pedido desconta do estoque, e o produto aparece como "Esgotado" quando zera. "Sem limite" desliga o controle.
- **Disponível / Esgotado**: um toque para tirar um produto do cardápio.
- **Horário de funcionamento por dia da semana**: cada dia aberto ou fechado, com horário próprio (ex.: sexta até 15:00).
- **Agendamento**: até quantos dias à frente o cliente pode escolher a retirada (só hoje, hoje e amanhã, até 14 dias).
- **Datas fechadas**: feriados e recessos, que somem das opções do cliente.
- **Retirada**: o cliente digita o horário que quiser dentro do funcionamento do dia. A cantina define o tempo mínimo de preparo e, se quiser, um limite de pedidos por janela de tempo (ex.: no máximo 8 a cada 15 minutos).

Pedidos pagos para outro dia aparecem em **Pedidos → Agendados para os próximos dias** e entram na fila da cozinha no dia da retirada.

### Sem instalar nada: GitHub Codespaces

Num computador em que você não pode instalar programas, abra o repositório no GitHub, troque para a branch do site e clique em **Code → Codespaces → Create codespace**. A pasta `.devcontainer/` já instala tudo e cria o banco. Quando o terminal terminar, rode `npm run dev` e abra a porta 3000 que o Codespaces oferecer. O endereço é privado (só abre logado na sua conta). Ao terminar, pare o codespace em github.com/codespaces para não gastar as horas gratuitas.

## Antes de usar de verdade

1. **Chave Pix**: o seed cadastra uma chave de demonstração que não existe em nenhum banco. Em **Painel → Configurações → Pix**, informe a chave, o nome do recebedor e a cidade da cantina. Faça um pedido de teste e leia o QR Code no app do banco para conferir o recebedor.
2. **Senha do admin**: troque `ADMIN_PASSWORD` antes do primeiro deploy (ou use `npm run admin:create`).
3. **AUTH_SECRET**: gere um valor novo (`openssl rand -base64 32`). O site se recusa a rodar em produção com o valor de exemplo.
4. **Horário de funcionamento e limite por intervalo**: ajuste em Configurações.

### Como o pagamento funciona nesta versão

O site gera um Pix (QR Code e copia e cola) com a chave da cantina, o valor exato e o identificador `PEDIDO<número>`. Como é um Pix direto para a conta da cantina, **não há confirmação automática**: o cliente clica em "Já paguei", o pedido é destacado no painel e a cantina confere no app do banco antes de clicar em **Confirmar pagamento**. Pedidos não pagos são cancelados sozinhos após 20 minutos (e o estoque volta).

Para confirmação automática, integre um gateway (veja "Integrar um gateway de pagamento").

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | sim | `file:./dev.db` no desenvolvimento; URL do PostgreSQL em produção |
| `AUTH_SECRET` | sim | Segredo que assina as sessões (mínimo 32 caracteres) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | não | Admin criado pelo seed, se ainda não existir |
| `APP_TIMEZONE` | não | Fuso horário (padrão `America/Sao_Paulo`) |
| `PAYMENT_PROVIDER` | não | Provedor de pagamento (padrão `static-pix`) |
| `SEED_SAMPLE_DATA` | não | `false` para não criar os produtos de exemplo |
| `DIRECT_URL` ou `DATABASE_URL_UNPOOLED` | não | Conexão direta ao Postgres (sem pooler), usada na criação das tabelas |

## Criar ou redefinir o usuário admin

Pelo seed: defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` e rode `npm run db:seed`.

Pelo script (cria, promove um usuário existente ou redefine a senha):

```bash
npm run admin:create -- cantina@exemplo.com "uma-senha-forte" "Nome"
```

## Publicar o site (Vercel + Neon, gratuito)

A Vercel hospeda o site e o Neon fornece o PostgreSQL; os planos gratuitos dos dois atendem uma cantina com folga. O site fica com HTTPS, necessário para a câmera do leitor de QR Code.

1. Suba este repositório para o GitHub (já está).
2. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o repositório.
3. No projeto, aba **Storage → Create Database → Neon (Postgres)**. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
4. Em **Settings → Environment Variables**, adicione: `AUTH_SECRET` (valor novo), `ADMIN_EMAIL`, `ADMIN_PASSWORD` e, se não quiser os produtos de exemplo, `SEED_SAMPLE_DATA=false`.
5. Em **Settings → Build & Deployment → Build Command**, informe `npm run vercel-build`.
6. Faça o deploy. O build troca o Prisma para PostgreSQL, cria as tabelas e o admin.
7. Acesse `https://seu-projeto.vercel.app/admin`, entre e cadastre a chave Pix.

Observação: este caminho foi validado até a checagem do esquema PostgreSQL pelo Prisma; o deploy em si não foi executado neste ambiente. Se algo falhar no primeiro build, o log da Vercel mostra a etapa.

**Alternativa (servidor sempre ligado)**: Railway, Render ou uma VPS, com PostgreSQL. Comandos: `npm install`, `npm run vercel-build`, `npm start`.

## Arquitetura

- **Next.js 15 (App Router) + TypeScript**: páginas e API no mesmo projeto.
- **Tailwind CSS 4**: mobile-first, cores neutras com uma cor de destaque.
- **Prisma**: SQLite no desenvolvimento, PostgreSQL em produção (`scripts/use-postgres.mjs` troca o provider no build).
- **Tempo real por polling**: a tela do pedido e o painel consultam a API a cada 4 segundos. Funciona em qualquer hospedagem, inclusive serverless, onde WebSocket não é viável.
- **Pagamento plugável**: `src/lib/payments/` define a interface `PaymentProvider`; o padrão é Pix estático.

```
prisma/
  schema.prisma          modelos: User, Category, Product, Order, OrderItem, Settings
  seed.ts                admin + configurações + produtos de exemplo (idempotente)
scripts/
  create-admin.ts        cria/promove admin
  use-postgres.mjs       troca o Prisma para PostgreSQL no build de produção
src/
  middleware.ts          proteção CSRF + controle de acesso (/admin, /pedidos, /api)
  config/brand.ts        logo e slogan
  lib/
    auth.ts, session-token.ts   senha (bcrypt), sessão JWT em cookie httpOnly
    orders.ts            regras do pedido: criar, pagar, avançar, cancelar, expirar
    slots.ts             horários de retirada e limite por intervalo
    pix.ts               gera o Pix copia e cola (BR Code + CRC16)
    payments/            interface do provedor de pagamento + Pix estático
    validation.ts        esquemas zod (validação no servidor)
  app/
    (loja)/              cliente: cardápio, carrinho, pedidos, login, cadastro
    admin/               painel: pedidos, retirada, produtos, relatórios, configurações
    api/                 rotas de API (auth, menu, pedidos, admin, webhook)
  components/            componentes do cliente; components/admin/ do painel
```

### Telas

| Cliente | Painel |
| --- | --- |
| `/` cardápio por categorias | `/admin/login` |
| `/carrinho` itens, observações, dia e horário de retirada | `/admin` fila de pedidos em tempo real |
| `/pedidos/[id]` Pix, status e QR Code de retirada | `/admin/retirada` leitor de QR Code / número |
| `/pedidos` histórico e "repetir pedido" | `/admin/produtos` produtos, categorias, estoque |
| `/entrar`, `/cadastro` | `/admin/relatorios`, `/admin/configuracoes` |

### Fluxo do pedido

`Aguardando pagamento → Recebido → Pronto para retirada → Retirado` (ou `Cancelado`).

O painel mostra só **Recebido** e **Pronto para retirada**. O pedido entra em Recebido quando o cliente toca em "Já paguei"; até a cantina clicar em **Pix conferido**, o cartão mostra o selo **Conferir Pix**. Entregar o pedido no balcão também marca o pagamento como conferido. Pedidos sem "Já paguei" não aparecem e são cancelados sozinhos em 20 minutos.

### Segurança

- Senhas com hash bcrypt; sessão em JWT assinado, em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção.
- Rotas do painel protegidas em três camadas: middleware, layout e cada rota de API (que confere o papel no banco).
- CSRF: toda requisição que altera dados precisa vir da mesma origem (cabeçalho `Origin`), além do cookie `SameSite`.
- SQL injection: todas as consultas passam pelo Prisma (parametrizadas).
- XSS: o React escapa todo texto; links de foto só aceitam `http(s)`; não há HTML vindo de usuário.
- Preço, estoque e disponibilidade são sempre conferidos no servidor; o cliente só vê os próprios pedidos.
- Limite de tentativas de login (em memória; em serverless vale por instância).

## Personalizar nome, logo e cores

- **Nome**: Painel → Configurações.
- **Logo**: substitua `public/logo.svg` (ou aponte outro arquivo em `src/config/brand.ts`).
- **Cor de destaque**: variáveis `--color-brand-*` em `src/app/globals.css`.

## Integrar um gateway de pagamento

1. Crie `src/lib/payments/<gateway>.ts` implementando `PaymentProvider` (`createCharge` devolve o copia e cola e o id da cobrança; `parseWebhook` valida a assinatura e diz se foi pago).
2. Registre o provedor em `src/lib/payments/index.ts` e defina `PAYMENT_PROVIDER`.
3. Cadastre `https://seu-site/api/payments/webhook` no gateway. Quando o Pix cair, o pedido passa sozinho para "Recebido".

## Melhorias futuras

- Confirmação automática do Pix via gateway (Mercado Pago, Asaas, Efí).
- Notificação por WhatsApp ou push quando o pedido ficar pronto.
- Recuperação de senha por e-mail/SMS e verificação do telefone.
- Cupons de desconto e programa de fidelidade (ex.: 10º café grátis).
- Combos, adicionais e variações de produto (tamanho, sabor).
- Pedidos recorrentes (ex.: o mesmo café todo dia às 09:00).
- Avaliação dos pedidos e favoritos.
- Impressão automática da comanda na cozinha.
- Estorno/reembolso pelo painel e fechamento de caixa.
- Relatórios com exportação (CSV) e períodos personalizados.
- PWA instalável no celular; SSE/WebSocket em hospedagem com servidor dedicado.
- Vários usuários de equipe com permissões diferentes e registro de ações.
- Limite de tentativas de login com armazenamento compartilhado (Redis) e testes automatizados.
