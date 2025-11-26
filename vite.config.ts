// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'screenshot-mobile.png',
        'screenshot-desktop.png'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6000000,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/__/],
        runtimeCaching: [
          {
            // NetworkFirst para navegações (páginas)
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // CacheFirst para imagens e fontes
            urlPattern: ({ request }: { request: Request }) =>
              ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // CacheFirst para fontes Google
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // StaleWhileRevalidate para scripts/styles/worker
            urlPattern: ({ request }: { request: Request }) =>
              ['script', 'style', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
          {
            // CacheFirst para imagens em Firebase Storage / CDN
            urlPattern: /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|cdn\.tailwindcss\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloud-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'História Acessível',
        short_name: 'HistAcess',
        description: 'Plataforma de ensino de História inclusiva e acessível para todos os estudantes.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: '/',
        categories: ['education', 'productivity', 'reference'],
        lang: 'pt-BR',
        dir: 'ltr',
        prefer_related_applications: false,
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        edge_side_panel: {
          preferred_width: 480
        },
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Tela inicial no celular'
          },
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard no desktop'
          }
        ],
        shortcuts: [
          {
            name: 'Minhas Turmas',
            short_name: 'Turmas',
            description: 'Acessar suas turmas diretamente',
            url: '/join_class',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Ver Atividades',
            short_name: 'Atividades',
            description: 'Ver atividades pendentes',
            url: '/activities',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          ai: ['@google/genai']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
