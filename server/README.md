# Configurar fotos e vídeos

O envio para o Cloudinary já está implementado. Falta conectar sua conta e iniciar a API.

## 1. Pegue as chaves do Cloudinary

Entre no [Cloudinary Console](https://console.cloudinary.com/). No Dashboard, copie **Cloud name**, **API Key** e **API Secret**. Não envie essas chaves pelo chat.

## 2. Configure o servidor

No PowerShell, na pasta principal do projeto:

```powershell
Copy-Item server\.env.example server\.env
```

Abra `server\.env` e preencha as três linhas com os valores do Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=valor_do_dashboard
CLOUDINARY_API_KEY=valor_do_dashboard
CLOUDINARY_API_SECRET=valor_do_dashboard
```

O servidor também exige:

- MySQL funcionando e os dados `MYSQL_*` corretos. Execute `server\schema.sql` uma vez no MySQL Workbench.
- Se a tabela `memories` já existia de uma versão anterior do app, execute também `server\migrate-legacy-memories.sql` no Workbench para atualizar o esquema sem apagar publicações.
- Se o banco já estava configurado antes das fotos de perfil, selecione `portifolio_love` no Workbench e execute `server\migrate-profile-photos.sql` para adicionar as colunas das fotos sem apagar dados.
- `AUTH_JWT_SECRET`: gere um valor no PowerShell com `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- `AUTH_JOAO_PASSWORD` e `AUTH_CAIO_PASSWORD`: defina senhas diferentes, com pelo menos 12 caracteres.

Mantenha tudo em `server\.env`. Não coloque segredos no app, no `.env.local` ou em `EXPO_PUBLIC_*`.

## 3. Inicie a API

Em um terminal:

```powershell
Set-Location server
npm install
npm run dev
```

Abra `http://localhost:4000/health`. O resultado deve indicar `"database":"connected"` e `"cloudinary":true`.

## 4. Conecte o app

Na pasta principal, crie `.env.local` com:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Reinicie o Expo e faça login. Crie uma publicação com foto ou vídeo para testar.

**No celular físico:** no `server\.env`, use `HOST=0.0.0.0`; no `.env.local`, troque `localhost` pelo IPv4 local do computador, por exemplo `http://192.168.1.20:4000`. O celular e o computador precisam estar na mesma rede Wi-Fi. Reinicie a API e o Expo após mudar as configurações. Para usar fora de casa, a API e o MySQL precisam estar hospedados.

Se `cloudinary` aparecer como `false`, confira as três chaves do passo 2. Se a API não iniciar, confira também MySQL e as variáveis `AUTH_*`.

## 5. Instalar o APK nos dois Androids

Para funcionar fora da sua rede Wi-Fi, o app precisa de uma API e um banco hospedados. A configuração inicial está em `render.yaml`; ela usa Render Free para a API e TiDB Cloud Starter como banco MySQL compatível. No TiDB, crie uma instância com endpoint público e TLS, execute `server\schema.sql` e copie os dados da conexão para as variáveis `MYSQL_*` do serviço no Render. Mantenha `MYSQL_SSL=true` e configure os demais segredos diretamente no painel do Render, nunca no repositório.

O Render Free pode suspender a API quando não há uso e demorar cerca de um minuto para reativá-la; não oferece disponibilidade garantida para produção. O TiDB aplica limites mensais gratuitos.

Depois que a API estiver publicada, crie uma conta Expo gratuita e, na pasta do app, execute:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://SUA-API.onrender.com --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

Abra o link do build nos dois celulares e instale o APK. Esse perfil é de distribuição privada e não precisa do Expo Go. Não gere o APK antes de substituir `SUA-API.onrender.com` pelo endereço real da API.
