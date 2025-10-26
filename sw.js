/* ===============================================
   DOSTANWEBCSS - Service Worker
   PWA functionality for Nordic marketplace
   =============================================== */

const CACHE_NAME = 'dostanwebcss-v1.0.0';
const STATIC_CACHE_NAME = 'dostanwebcss-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'dostanwebcss-dynamic-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/products.html',
  '/pages/product-detail.html',
  '/pages/cart.html',
  '/pages/profile.html',
  '/pages/artisan.html',
  '/assets/css/main.css',
  '/assets/css/product-cards.css',
  '/assets/js/main.js',
  '/assets/js/dostik-ai.js',
  '/assets/js/special-effects.js',
  '/manifest.json',
  // Fallback offline page
  '/offline.html'
];

// Dynamic caching patterns
const CACHE_PATTERNS = {
  images: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i,
  fonts: /\.(woff|woff2|ttf|eot)$/i,
  api: /\/api\//,
  external: /^https:\/\/(images\.unsplash\.com|picsum\.photos)/
};

// Network timeout for dynamic requests
const NETWORK_TIMEOUT = 3000;

/* ===============================================
   SERVICE WORKER INSTALLATION
   =============================================== */

self.addEventListener('install', (event) => {
  // Service Worker installing

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // Caching static assets
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Static assets cached successfully
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        // Failed to cache static assets - app will still work
      })
  );
});

/* ===============================================
   SERVICE WORKER ACTIVATION
   =============================================== */

self.addEventListener('activate', (event) => {
  // Service Worker activating

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('dostanwebcss-')) {
              // Deleting old cache version
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );

  // Service Worker activated and ready
});

/* ===============================================
   FETCH EVENT HANDLER
   =============================================== */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different request types
  if (CACHE_PATTERNS.images.test(url.pathname) || CACHE_PATTERNS.external.test(url.href)) {
    event.respondWith(handleImageRequest(request));
  } else if (CACHE_PATTERNS.fonts.test(url.pathname)) {
    event.respondWith(handleFontRequest(request));
  } else if (CACHE_PATTERNS.api.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
  } else if (url.origin === location.origin) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleExternalRequest(request));
  }
});

/* ===============================================
   REQUEST HANDLERS
   =============================================== */

// Handle navigation requests (pages)
async function handleNavigationRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first for HTML pages
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);

    if (networkResponse.ok) {
      // Update cache with fresh content
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');

  } catch (error) {
    // Network failed, trying cache fallback

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // Return generic offline response
    return new Response('🐉 Nordic realm offline - Dostik is sleeping!', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle image requests
async function handleImageRequest(request) {
  try {
    // Check cache first for images
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);

    if (networkResponse.ok) {
      // Cache successful image requests
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');

  } catch (error) {
    // Image failed to load - using placeholder

    // Return placeholder image
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#f5f2eb"/>
        <text x="200" y="140" text-anchor="middle" font-family="Arial" font-size="16" fill="#8b6d47">
          🐉 Nordic Image
        </text>
        <text x="200" y="170" text-anchor="middle" font-family="Arial" font-size="14" fill="#a0845c">
          Loading...
        </text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle font requests
async function handleFontRequest(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');

  } catch (error) {
    // Font failed to load
    return new Response('', { status: 404 });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Network first for API calls
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);

    if (networkResponse.ok) {
      // Cache successful API responses for short term
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const responseToCache = networkResponse.clone();

      // Add timestamp to help with cache invalidation
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());

      await cache.put(request, new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      }));

      return networkResponse;
    }
    throw new Error('Network response not ok');

  } catch (error) {
    // API request failed, checking cache

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cached response is not too old (5 minutes)
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && Date.now() - parseInt(cachedAt) < 300000) {
        return cachedResponse;
      }
    }

    // Return offline API response
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'API unavailable - Dostik is gathering data from ancient scrolls',
      timestamp: Date.now()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle external requests
async function handleExternalRequest(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);

    if (networkResponse.ok) {
      // Cache external resources
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');

  } catch (error) {
    // External request failed

    // Return empty response for failed external requests
    return new Response('', { status: 404 });
  }
}

/* ===============================================
   BACKGROUND SYNC & NOTIFICATIONS
   =============================================== */

self.addEventListener('sync', (event) => {
  // Background sync initiated

  if (event.tag === 'dostik-chat-sync') {
    event.waitUntil(syncChatMessages());
  } else if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartData());
  } else if (event.tag === 'wishlist-sync') {
    event.waitUntil(syncWishlistData());
  }
});

async function syncChatMessages() {
  try {
    // Syncing chat messages
    // Implementation for syncing chat messages when back online
    const pendingMessages = await getStoredData('pendingChatMessages');
    if (pendingMessages && pendingMessages.length > 0) {
      // Send messages to server
      // Clear pending messages after successful sync
      await clearStoredData('pendingChatMessages');
    }
  } catch (error) {
    // Failed to sync chat messages
  }
}

async function syncCartData() {
  try {
    // Syncing cart data
    // Implementation for syncing cart data when back online
  } catch (error) {
    // Failed to sync cart data
  }
}

async function syncWishlistData() {
  try {
    // Syncing wishlist data
    // Implementation for syncing wishlist data when back online
  } catch (error) {
    // Failed to sync wishlist data
  }
}

/* ===============================================
   PUSH NOTIFICATIONS
   =============================================== */

self.addEventListener('push', (event) => {
  // Push notification received

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'DostanWebCSS', body: event.data.text() };
    }
  }

  const options = {
    title: data.title || '🐉 Nordic Marketplace',
    body: data.body || 'New treasures await your discovery!',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/badge-72x72.png',
    image: data.image,
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Explore Treasures',
        icon: '/assets/images/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Later',
        icon: '/assets/images/action-dismiss.png'
      }
    ],
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  // Notification clicked

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if a window is already open
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }

          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

async function getStoredData(key) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = await cache.match(`/storage/${key}`);
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    // Failed to get stored data
    return null;
  }
}

async function storeData(key, data) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/storage/${key}`, response);
  } catch (error) {
    // Failed to store data
  }
}

async function clearStoredData(key) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    await cache.delete(`/storage/${key}`);
  } catch (error) {
    // Failed to clear stored data
  }
}

/* ===============================================
   MESSAGE HANDLING
   =============================================== */

self.addEventListener('message', (event) => {
  // Service Worker message received

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_URLS':
        event.waitUntil(cacheUrls(event.data.urls));
        break;
      case 'CLEAR_CACHE':
        event.waitUntil(clearCache());
        break;
      case 'GET_CACHE_SIZE':
        event.waitUntil(getCacheSize().then(size => {
          event.ports[0].postMessage({ size });
        }));
        break;
      default:
        // Unknown message type received
    }
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  return Promise.all(
    urls.map(url =>
      fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(() => {/* Cache error ignored */})
    )
  );
}

async function clearCache() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(name => {
      if (name.startsWith('dostanwebcss-')) {
        // Clearing cache
        return caches.delete(name);
      }
    })
  );
}

async function getCacheSize() {
  try {
    let totalSize = 0;
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('dostanwebcss-')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }
    }

    return totalSize;
  } catch (error) {
    // Failed to calculate cache size
    return 0;
  }
}

/* ===============================================
   ERROR HANDLING
   =============================================== */

self.addEventListener('error', (event) => {
  // Service Worker error occurred
});

self.addEventListener('unhandledrejection', (event) => {
  // Service Worker unhandled rejection
  event.preventDefault();
});

// DostanWebCSS Service Worker loaded successfully
// Nordic magic is now available offline
