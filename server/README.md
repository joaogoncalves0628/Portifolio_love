# API MySQL do Portifolio Love

O app Expo não deve se conectar diretamente ao MySQL. Esta API Node.js é a intermediária e mantém as credenciais do banco somente no servidor.

## Preparar o MySQL

1. Instale e inicie o MySQL local (por exemplo, pelo XAMPP) ou use o MySQL Workbench.
2. Execute o arquivo `server/schema.sql` no Workbench ou importe-o pelo phpMyAdmin. Ele cria o banco `portifolio_love` e as tabelas de posts, curtidas, bilhetes, datas e configurações do casal.
3. Crie uma conta no Cloudinary para armazenar fotos e vídeos. Copie `server/.env.example` para `server/.env` e preencha os dados do MySQL e do Cloudinary.
4. Configure `AUTH_JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres e defina senhas fortes, diferentes, com pelo menos 12 caracteres para `AUTH_JOAO_PASSWORD` e `AUTH_CAIO_PASSWORD`. Gere um segredo com:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Os usuários de acesso são `joaolucas` e `caioforini`; o login também aceita os nomes completos. Senhas e segredos devem permanecer somente nas variáveis privadas do servidor. Nunca compartilhe nem publique o arquivo `.env`.

## Iniciar a API

Na pasta `server`, rode:

```bash
npm install
npm run dev
```

`http://localhost:4000/health` deve responder com `{"status":"ok","database":"connected"}`.

Para uploads, o indicador `cloudinary` também deve aparecer como `true`. Se estiver `false`, confira as três variáveis `CLOUDINARY_*` no `server/.env`. Imagens e vídeos (MP4, MOV ou WebM) podem ter até 100 MB por arquivo.

As rotas de dados e upload exigem sessão autenticada. O servidor aceita cookie HTTP-only no navegador e token Bearer no app nativo; o limite de tentativas de login também é aplicado no servidor. O campo “Lembrar de mim” mantém a sessão por até 30 dias; sem ele, a sessão expira em 12 horas.

Com os dois celulares apontando para a mesma API e o mesmo banco, memórias, curtidas, bilhetes, datas e configurações são compartilhados. Enquanto autenticado, o app atualiza os dados periodicamente (aproximadamente a cada 10 segundos); isso é sincronização quase em tempo real, não instantânea.

## Conectar o app

Na raiz do projeto, copie `.env.example` para `.env.local` e configure:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Reinicie o Expo após configurar. No celular físico, use no lugar de `localhost` o IP local do computador que está rodando a API, por exemplo `http://192.168.1.20:4000`. O celular e o computador precisam estar na mesma rede. Para usar a tela de login no navegador, inclua a origem do app em `CORS_ORIGINS`.

## Publicação

O backend precisa ser publicado em um serviço que execute Node.js e tenha acesso de rede ao MySQL. Configure `HOST=0.0.0.0`, `MYSQL_*`, `CORS_ORIGINS`, `CLOUDINARY_*`, `AUTH_*` e `EXPO_PUBLIC_API_URL` nos ambientes correspondentes da hospedagem e do app. Use HTTPS em produção; nunca coloque senhas do banco, senhas dos usuários ou o segredo JWT em variáveis `EXPO_PUBLIC_*`.
