FROM nginx:1.27-alpine

# URL completa do webhook do Fonil CRM (com token). Pode ser trocada em Easypanel > Environment.
# O padrão é o webhook que o quiz já usava, para nada parar de funcionar no próximo deploy.
ENV CRM_WEBHOOK_URL="https://crm.fonilgroup.com.br/api/webhooks/leads/cmvjv1e85004prkvni2juj0uk"
# Webhook do Umbrella CRM exclusivo do quiz (o Umbrella limita por domínio: a LP tem outro ID).
ENV CRM_UMBRELLA_WEBHOOK_URL="https://crm-api.umbrellaecosystem.com.br/api/v1/webhooks/in/ccb11b73-1a83-4674-ae2b-f089dc1cf252"
# Meta (Pixel + Conversions API). O Pixel ID é público; o token NÃO vai no código:
# defina META_CAPI_TOKEN em Easypanel > Environment.
ENV META_PIXEL_ID="1063603920051123"
ENV META_GRAPH_VERSION="v24.0"
ENV META_CAPI_TOKEN=""
# Planilha de leads: URL do Apps Script publicado como app da Web (termina em /exec).
# Defina SHEETS_WEBHOOK_URL em Easypanel > Environment. Vazia, o envio para a planilha é ignorado.
ENV SHEETS_WEBHOOK_URL=""
# Só variáveis CRM_*, META_* e SHEETS_* são substituídas no template
ENV NGINX_ENVSUBST_FILTER="^(CRM_|META_|SHEETS_)"

COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
