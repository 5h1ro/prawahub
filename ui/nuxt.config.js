// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    typescript: false,
    devtools: {enabled: true},
    ssr: false,
    runtimeConfig: {
        public: {
            mockData: false,
        }
    },
    app: {
        baseURL: '/dashboard/',
        head: {
            title: 'Dashboard | WAHA',
            link: [
                {
                    id: 'theme-css',
                    rel: 'stylesheet',
                    type: 'text/css',
                    href: '/dashboard/themes/lara-dark-green/theme.css'
                },
                {
                    rel: 'icon',
                    type: 'image/x-icon',
                    href: '/dashboard/favicon.ico'
                }
            ]
        }
    },
    components: {
        path: '~/components',
        pathPrefix: false
    },
    modules: [
        'nuxt-primevue',
        '@pinia/nuxt',
        '@nuxtjs/i18n'
    ],
    primevue: {
        options: {ripple: true},
        components: {
            exclude: ['Editor']
        }
    },
    script: [
        {
            strategy: 'lazyOnload',
            src: 'https://www.googletagmanager.com/gtag/js?id=UA-93461466-1'
        },
    ],
    css: [
        // PrimeVue
        'primeicons/primeicons.css',
        'primeflex/primeflex.scss',
        'primevue/resources/primevue.min.css',
        // Font Awesome
        '@fortawesome/fontawesome-svg-core/styles.css',
        // Custom
        '@/assets/styles.scss',
        'vue-json-pretty/lib/styles.css'
    ],
    i18n: {
        compilation: {
            strictMessage: false
        },
        locales: [
            { code: 'en', name: '🇺🇸 English (English)', file: 'en.json' },
            { code: 'id', name: '🇮🇩 Bahasa Indonesia (Indonesian)', file: 'id.json' },
        ],
        skipSettingLocaleOnNavigate: true,
        locale: 'en',
        fallbackLocale: 'en',
        strategy: 'no_prefix',
        lazy: false,
        langDir: 'locales/'
    }
});
