
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      // Garante que o SW assuma o controle imediatamente para performance offline instantânea
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6000000, // 6MB para acomodar chunks grandes de vendor
        // Fallback Offline: Se a navegação falhar, serve o index.html (App Shell)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/__,/], // Não interceptar API ou Auth
        runtimeCaching: [
          // 1. Network-First para Páginas (Navegação)
          // Tenta rede para conteúdo fresco, cai no cache se offline.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3, // Se rede demorar > 3s, vai pro cache
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60 // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 2. Cache-First para Assets (Imagens, Fontes, Ícones)
          {
            urlPattern: ({ request }) => ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 3. Cache-First para Fontes do Google (Específico)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 4. StaleWhileRevalidate para JS/CSS não precached e CDN Assets
          // Assets dinâmicos ou de terceiros que podem mudar
          {
            urlPattern: ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              }
            }
          },
          // 5. Firebase Storage e CDN Imagens (Cache-First)
          {
            urlPattern: /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|cdn\.tailwindcss\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloud-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
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
        // display_override: Garante fallback elegante se standalone não for suportado
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: '/', 
        categories: ['education', 'productivity', 'reference'],
        lang: 'pt-BR',
        dir: 'ltr',
        prefer_related_applications: false,
        // launch_handler: Impede múltiplas instâncias do app abertas
        launch_handler: {
            client_mode: "navigate-existing"
        },
        // edge_side_panel: Melhora a experiência na Microsoft Store
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
            name: "Minhas Turmas",
            short_name: "Turmas",
            description: "Acessar suas turmas diretamente",
            url: "/join_class",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Ver Atividades",
            short_name: "Atividades",
            description: "Ver atividades pendentes",
            url: "/activities",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
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
          ai: ['@google/genai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
