# GhostSpy pt-PT — guia de deploy

Versão portuguesa (pt-PT) da oferta `stalkeia.ai`, com checkout integrado
ao gateway **CHECKOUT ALFAIABOEMIA** (apenas MB WAY).

---

## 1. Estrutura do projeto

```
stalkeia-pt-pt/
├── index.html                       # HTML principal, age-gate, pixels
├── favicon.png
├── nginx.conf                       # Config pronta para copiar para o VPS
├── .env.example                     # Template de credenciais (seguro — vai para git)
├── .env                             # ⚠ credenciais reais (NÃO vai para git)
├── .gitignore
│
├── checkout/
│   └── index.html                   # Página de checkout (só MB WAY)
│
├── api/
│   ├── _lib/
│   │   ├── config.php               # Loader do .env
│   │   ├── alfaiaboemia-client.php  # HTTP client do gateway
│   │   └── storage.php              # Persistência JSON dos pagamentos
│   ├── create-payment.php           # POST — criar pagamento
│   ├── get-payment.php              # GET  — consultar status (polling)
│   ├── webhook.php                  # POST — recebe eventos (HMAC-verificado)
│   └── proxy/
│       └── image-proxy.php          # Proxy de imagens (allowlist de hosts)
│
├── assets/                          # JS/CSS da app React (bundles)
│   ├── context-DVPZRWQf.js          # i18n — pt-PT agora é default
│   ├── cta-ghost-final.js           # Pricing, FAQ, testemunhos, CTAs
│   ├── funnel-extensions.js         # Quiz/VSL (bypassed por default)
│   ├── checkout-access-data.js      # Intercepta links de checkout
│   ├── url-interceptor.js           # Intercepta chamadas à API de IG
│   └── (restantes bundles)
│
└── images/
    ├── avatars/                     # Fotos de perfil + fallback
    ├── logos/
    └── screenshots/                 # Previews da ferramenta
```

---

## 2. Credenciais & configuração

Antes do deploy, no VPS crie o `.env` a partir do `.env.example`:

```bash
cp .env.example .env
nano .env
```

Preencha **pelo menos**:
- `ALFAIABOEMIA_CLIENT_ID` — o `X-Client-Id` que lhe deram
- `ALFAIABOEMIA_CLIENT_SECRET` — o `X-Client-Secret`
- `SITE_URL` — `https://ghostspy.site` (sem barra final). Usado para montar o `callback_url` do webhook. Já preenchido no `.env` local
- `PRODUCT_PRICE` — valor em EUR (ex.: `17.90`)
- `STORAGE_DIR` — pasta FORA do document root para guardar os JSONs de pagamentos (ex.: `/var/www/ghostspy-pt-storage`)

> ⚠ O `.env` tem as suas credenciais privadas. Está no `.gitignore`. **Nunca** faça commit nem o deixe acessível publicamente.

Além disso, no `index.html` substitua:
- `__META_PIXEL_ID__` — ID do Meta Pixel novo
- `__GTM_ID__` — ID do Google Tag Manager novo
- `__UTMIFY_PIXEL_ID__` — token Utmify novo

---

## 3. Fluxo de pagamento (como funciona)

1. Utilizador clica em **"Aceder a tudo agora mesmo"** na landing.
2. É redirecionado para `/checkout/` com UTMs e `?price=` na URL.
3. Preenche nome, email e número MB WAY.
4. Frontend faz `POST /api/create-payment.php`.
5. Backend chama o gateway (`X-Client-Id`/`X-Client-Secret` do `.env`, `method: "mbway"` forçado) e devolve `data.id` + `data.expires_at`.
6. Frontend mostra "Confirme no telemóvel" com countdown de 5 min.
7. Frontend faz polling em `GET /api/get-payment.php?id=...` de 3 em 3 segundos.
8. Em paralelo, o gateway chama `POST /api/webhook.php` (verificado por HMAC-SHA256). O webhook grava o estado em `STORAGE_DIR/{id}.json` e executa `onPaymentPaid()` (entrega do acesso).
9. Quando o polling vê `status: paid`, o utilizador vai para o ecrã de sucesso.

**Endpoints criados:**

| Método | URL | Descrição |
|---|---|---|
| POST | `/api/create-payment.php` | Cria pagamento MB WAY (body JSON com `phone`, `country_code`, `payer`, `tracking`) |
| GET | `/api/get-payment.php?id=<uuid>` | Devolve o status atual (local → gateway fallback) |
| POST | `/api/webhook.php` | Entrada do gateway. Verifica `X-Webhook-Signature`, rejeita timestamps > 5 min |

**Segurança do webhook:**
- Compara `sha256=<hmac>` com `hash_hmac('sha256', $timestamp.'.'.$rawBody, $clientSecret)` em tempo constante (`hash_equals`).
- Rejeita timestamps com mais de 5 minutos (`stale_timestamp`).
- Processa `payment.paid`, `payment.expired` e `payment.refunded`; eventos desconhecidos recebem `200 OK` para não causar retries inúteis.

---

## 4. Entrega do acesso VIP (TODO)

O webhook já invoca `onPaymentPaid($data)` em [api/webhook.php:95](api/webhook.php#L95),
mas por agora **só regista no log**. Falta implementar a entrega. Opções:

**A) Email com link mágico (mais simples)**
```php
// Em onPaymentPaid()
$token = bin2hex(random_bytes(16));
file_put_contents(
    rtrim(Config::require('STORAGE_DIR'), '/') . '/tokens/' . $token . '.json',
    json_encode(['email' => $payerEmail, 'paid_at' => gmdate('c'), 'payment_id' => $paymentId])
);
$link = Config::require('SITE_URL') . '/membros/?token=' . $token;
mail($payerEmail, 'O seu acesso VIP GhostSpy', "Aceda aqui: $link", 'From: noreply@ghostspy.site');
```

**B) Integração com o sistema de membros existente**
Se tem uma plataforma onde já gere acessos (ex.: WordPress, Memberstack), chame-a nesse ponto.

Diga-me qual prefere e implementamos.

---

## 5. Deploy no VPS (Ubuntu/Debian, Nginx + PHP-FPM)

### 5.1. Preparar o servidor
```bash
sudo apt update
sudo apt install -y nginx php-fpm php-curl certbot python3-certbot-nginx
php -v   # confirme a versão — ajuste o socket no nginx.conf se não for 8.3
```

### 5.2. Enviar os ficheiros
Do seu computador:
```bash
# Comprimir (do Desktop/spy)
cd /c/Users/pablo/Desktop/spy
tar --exclude=stalkeia-pt-pt/.env -czf ghostspy-pt.tar.gz stalkeia-pt-pt
#    ^^^ excluir o .env local; no VPS cria-se à parte

# Enviar
scp ghostspy-pt.tar.gz user@SEU_IP:/tmp/

# Enviar o .env em separado (seguro, só para o VPS)
scp stalkeia-pt-pt/.env user@SEU_IP:/tmp/.env
```

No VPS:
```bash
ssh user@SEU_IP

sudo mkdir -p /var/www
sudo tar -xzf /tmp/ghostspy-pt.tar.gz -C /var/www/
sudo mv /var/www/stalkeia-pt-pt /var/www/ghostspy-pt
sudo mv /tmp/.env /var/www/ghostspy-pt/.env
sudo chown -R www-data:www-data /var/www/ghostspy-pt
sudo chmod 640 /var/www/ghostspy-pt/.env   # só o dono (www-data) lê

# Pasta de storage fora do document root
sudo mkdir -p /var/www/ghostspy-pt-storage
sudo chown www-data:www-data /var/www/ghostspy-pt-storage
sudo chmod 750 /var/www/ghostspy-pt-storage
```

### 5.3. Configurar Nginx
```bash
sudo cp /var/www/ghostspy-pt/nginx.conf /etc/nginx/sites-available/ghostspy-pt
sudo ln -s /etc/nginx/sites-available/ghostspy-pt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.4. DNS
No painel onde comprou `ghostspy.site` crie dois registos A a apontar para o IP do VPS:
- `@` (ou `ghostspy.site`) → `<IP_DO_VPS>`
- `www` → `<IP_DO_VPS>`

Aguarde a propagação e verifique com:
```bash
dig +short ghostspy.site
dig +short www.ghostspy.site
```
Ambos têm de responder com o IP do VPS antes de pedir o certificado.

### 5.5. SSL
```bash
sudo certbot --nginx -d ghostspy.site -d www.ghostspy.site
```

### 5.6. Configurar o webhook no gateway
No painel da CHECKOUT ALFAIABOEMIA, aponte o callback para:

```
https://ghostspy.site/api/webhook.php
```

Faça um pagamento teste de valor mínimo (1 EUR) e veja em
`/var/www/ghostspy-pt-storage/` se apareceu o JSON do pagamento.

---

## 6. Testes rápidos (smoke test)

**A) Validação do .env:**
```bash
cd /var/www/ghostspy-pt
sudo -u www-data php -r "require 'api/_lib/config.php'; Config::load(); echo Config::require('ALFAIABOEMIA_CLIENT_ID').PHP_EOL;"
```

**B) Criar pagamento MB WAY (CLI) — útil para testar sem o browser:**
```bash
curl -s -X POST https://ghostspy.site/api/create-payment.php \
  -H 'Content-Type: application/json' \
  -d '{"phone":"912345678","country_code":"351","payer":{"name":"Teste","email":"teste@exemplo.pt"}}' \
  | jq
```

**C) Verificar webhook recebido:**
```bash
sudo ls -la /var/www/ghostspy-pt-storage/
sudo cat /var/www/ghostspy-pt-storage/<uuid>.json | jq
```

**D) Ver logs do PHP:**
```bash
sudo tail -f /var/log/nginx/ghostspy-pt.error.log
# e os logs de php-fpm:
sudo tail -f /var/log/php*-fpm.log
```

---

## 7. Instagram proxy (preview do perfil)

O site antigo buscava dados de perfis Instagram a um Cloudflare Worker externo
(`proxt-insta.projetinho-solo.workers.dev`), ao qual não tem acesso. O
`url-interceptor.js` redireciona essas chamadas para `__INSTAGRAM_PROXY_URL__`.

Opções:
1. **Deployar um Worker próprio** que aceita `?username=xxxx` e devolve
   `{full_name, profile_pic_url, media_count, follower_count, following_count, biography}`.
2. **Deixar desativado** — o site funciona normalmente, só o preview do perfil
   mostra o fallback "Pessoa Investigada" com avatar genérico.

---

## 8. Localização pt-PT (resumo das mudanças)

- Vocabulário: celular → telemóvel, câmera → câmara, senha → palavra-passe, mídia → conteúdo, acessar → aceder.
- Testemunhos: `pix` → `MBWay`, nomes brasileiros → nomes portugueses, slang pt-BR eliminado.
- Headline: "do Brasil" → "de Portugal".
- Preços: `R$ 279,90` → `€59,90` (riscado) e `R$ 47,00` → `€17,90` (atual). **Ajuste conforme a sua estratégia** em [assets/cta-ghost-final.js](assets/cta-ghost-final.js) (procure "cta-pricing") e no `.env` (`PRODUCT_PRICE`).
- Checkout: PerfectPay (Brasil) → CHECKOUT ALFAIABOEMIA (Portugal, só MB WAY).

---

## 9. Avisos legais (Portugal / UE)

- 18+ já com age gate.
- **RGPD**: adicionar banner de cookies **antes** de carregar Meta Pixel / GTM.
  Posso adicionar um banner simples se pedir — ou use [tarteaucitron.js](https://tarteaucitron.io/) / [Cookiebot](https://www.cookiebot.com/).
- Termos e política de privacidade adaptados à realidade portuguesa (CNPD/RGPD).
- Garantia de 14 dias para vendas online a consumidores (direito de retratação). A oferta promete 30 dias — ok.

---

## 10. Próximos passos sugeridos

- [ ] Preencher o `.env` no VPS com credenciais + `SITE_URL`
- [ ] Preencher placeholders de pixels em `index.html`
- [ ] Decidir pricing final em EUR e ajustar em `.env` (`PRODUCT_PRICE`) + `cta-ghost-final.js`
- [ ] Configurar o webhook no painel ALFAIABOEMIA a apontar para `/api/webhook.php`
- [ ] Decidir a lógica de entrega do acesso VIP (email mágico ou outra) e implementar em `api/webhook.php:onPaymentPaid()`
- [ ] (Opcional) Cloudflare Worker para o preview do perfil Instagram
- [ ] (Obrigatório PT/UE) Banner de cookies RGPD

Quando bloquear em qualquer passo, chame-me.
