# Quiz Só Aço: Porta-Pallets

Quiz estático para campanhas Meta Ads, servido por Nginx em Docker (mesmo esquema da LP).

## Deploy no Easypanel

1. **Build → Dockerfile** (arquivo `Dockerfile` na raiz)
2. **Environment**: defina `META_CAPI_TOKEN` (token da Conversions API; obrigatório para o Lead chegar pelo servidor). Opcional: `CRM_WEBHOOK_URL` já vem no `Dockerfile` com o webhook do Fonil CRM usado pelo quiz. Para trocar, defina a variável no Easypanel.
3. **Domains**: porta **80**.

## Integração com o CRM

O quiz envia o lead para `/api/lead` no próprio domínio. O Nginx repassa para `CRM_WEBHOOK_URL`. O token fica só no servidor, e o limite é de 10 envios por minuto por IP.

Campos em comum com a LP: `phone`, `name`, `document`, `city`, `state`, `company`, `segment`, `product`, UTMs, `gclid`/`gbraid`/`wbraid`/`fbclid`, `fbp`/`fbc`, `landing_page`.
Campos só do quiz: `source` ("Quiz Só Aço"), `cargo`, `contato_preferido` ("WhatsApp" ou "Ligação"), `solucao`, `solucao_alternativa`, `temperatura`, `respostas`, uma chave por pergunta, `utms`, `referrer`, `notes`, `created_at`.

UTMs e IDs de clique ficam guardados por 90 dias no navegador. Quando o envio falha, o console mostra `[CRM] falha ao enviar lead` e o dataLayer recebe `crm_lead_error`.

### Umbrella CRM

O mesmo lead também vai para o Umbrella CRM por `/api/lead-umbrella`. O Nginx repassa para `CRM_UMBRELLA_WEBHOOK_URL`, que já vem no `Dockerfile`. O quiz usa o ID `ccb11b73-1a83-4674-ae2b-f089dc1cf252` e a LP usa outro (`796b2005-…`), porque o Umbrella limita cada ID a um domínio. Além dos campos acima, o envio inclui `event_id`/`browserEventId`, `landingUrl`, `referrer`, `_fbc` e `_fbp`, no formato do snippet oficial.

O snippet do Umbrella fica no `<head>` só para rastreamento (first/last touch, UTMs, cookie `_fbc`). O formulário não tem `data-umbrella`, então o snippet não envia o lead sozinho e o Umbrella não recebe lead duplicado. Falhas aparecem como `[UMBRELLA] falha ao enviar lead` no console e `umbrella_lead_error` no dataLayer.

### Planilha de leads (Google Sheets)

O lead também vira uma linha na planilha da Só Aço, por `/api/lead-sheets`. O Nginx repassa para `SHEETS_WEBHOOK_URL`. O limite é de 10 envios por minuto por IP. Enquanto a variável estiver vazia, o envio é ignorado sem erro.

Configuração:

1. Na planilha, abra **Extensões > Apps Script** e cole o código de `integracoes/google-sheets-webhook.gs`.
2. Publique em **Implantar > Nova implantação > App da Web**, com **Executar como: Eu** e **Quem pode acessar: Qualquer pessoa**.
3. Copie a URL que termina em `/exec` e defina-a em **Easypanel > Environment > `SHEETS_WEBHOOK_URL`**. Depois, faça um novo deploy.

Colunas, na ordem em que são criadas: Data/Hora, Nome, WhatsApp, Empresa, CNPJ, Cargo, Contato preferido, UF, Cidade, Segmento, as respostas do quiz (Tipo de carga, Peso por nível, Principal desafio, Altura disponível, Prazo), Solução recomendada, Solução alternativa, Temperatura, GCLID, FBCLID, UTMs e Página. Os títulos vêm de `FIELD_LABELS` no Apps Script.

O Apps Script grava a linha e responde com um redirect. O Nginx não repassa esse redirect ao navegador e devolve `{"ok":true}`. Falhas aparecem como `[SHEETS] falha ao enviar lead` no console e `sheets_lead_error` no dataLayer.

### Meta (Pixel + Conversions API)

Pixel `1063603920051123` no `<head>`: PageView ao abrir a página e Lead no envio do formulário, além de `QuizStart` (início do quiz) e `QuizFormView` (chegada ao formulário) como eventos personalizados. O mesmo Lead também vai pela Conversions API, por `/api/meta-event`. O Nginx repassa para `graph.facebook.com` com o token `META_CAPI_TOKEN`, **que só existe no Easypanel** (não vai no código). Pixel, Conversions API e Umbrella usam o mesmo `event_id`, então o Meta deduplica o Lead.

A Conversions API recebe telefone, nome, cidade, UF, país e CNPJ (como `external_id`) com hash SHA-256, mais `fbp`, `fbc` e o user agent.

Para testar: Gerenciador de Eventos > Testar eventos. Copie o código e abra a página com `?test_event_code=TESTxxxx`. Falhas aparecem como `[META] falha ao enviar Lead` no console e `meta_capi_error` no dataLayer.
