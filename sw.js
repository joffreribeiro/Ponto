/**
 * Service Worker para PWA
 * Permite funcionamento offline e cache inteligente
 */

const CACHE_NAME = 'controle-ponto-v1';
const CACHE_ASSETS = [
    './',
    './index-refatorado.html',
    './styles.css',
    './utils.js',
    './notifications.js',
    './loading.js',
    './keyboard.js',
    './dateUtils.js',
    './validators.js',
    './storage.js',
    './calculations.js',
    './pagination.js',
    './cache.js',
    './validation-realtime.js',
    './app-refatorado.js'
];

// Instalação - cachear assets
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando arquivos');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - estratégia Cache First com Network Fallback
self.addEventListener('fetch', (event) => {
    // Ignorar requisições não-GET
    if (event.request.method !== 'GET') return;
    
    // Ignorar URLs externas
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Atualizar cache em background
                    fetch(event.request).then(response => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => {});
                    
                    return cachedResponse;
                }

                // Não está em cache, buscar da rede
                return fetch(event.request)
                    .then(response => {
                        // Cachear resposta bem-sucedida
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline e não cacheado - retornar página offline
                        return caches.match('./index-refatorado.html');
                    });
            })
    );
});

// Sincronização em background (quando voltar online)
self.addEventListener('sync', (event) => {
    console.log('[SW] Sincronização em background:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

// Notificações push (preparação futura)
self.addEventListener('push', (event) => {
    console.log('[SW] Push recebido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova atualização disponível',
        icon: './icon-192.png',
        badge: './badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Controle de Ponto', options)
    );
});

// Função auxiliar de sincronização
async function syncData() {
    try {
        // Aqui você pode sincronizar dados pendentes com um servidor
        console.log('[SW] Sincronizando dados...');
        // Implementar lógica de sincronização conforme necessário
        return Promise.resolve();
    } catch (error) {
        console.error('[SW] Erro na sincronização:', error);
        return Promise.reject(error);
    }
}
