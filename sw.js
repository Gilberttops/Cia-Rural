/* Rural · service worker mínimo (onda1-2026-10-23).
   NÃO guarda páginas nem dados: tudo vem sempre da internet, como no navegador.
   Só serve para o portal poder ser instalado como aplicativo e para mostrar um aviso
   amigável quando o celular está sem internet. Para desligar: apagar este arquivo e o
   trecho "serviceWorker" do index.html. */
const SEM_INTERNET = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sem internet</title>' +
  '<style>body{font-family:system-ui,sans-serif;background:#F4F6F9;color:#1F3550;display:flex;' +
  'align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}' +
  'button{margin-top:16px;padding:10px 22px;border:0;border-radius:999px;background:#1F3550;color:#fff;font-size:1rem}</style>' +
  '</head><body><div><h2>Sem conexão com a internet</h2><p>As ferramentas da Rural precisam de internet para mostrar os dados atualizados.</p>' +
  '<button onclick="location.reload()">Tentar de novo</button></div></body></html>';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;   /* dados, scripts e imagens: o navegador cuida, sem passar por aqui */
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(SEM_INTERNET, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
