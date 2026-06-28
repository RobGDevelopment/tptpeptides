import type { Config } from 'tailwindcss';

/**
 * Satellite theme tokens — runtime values injected on `<body>` from tenant_config.
 * B2B Falconwood defaults live in app/globals.css (`:root` + `@theme`).
 */
const config: Config = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--theme-primary)',
          accent: 'var(--theme-accent)',
        },
        /** Alias utilities for satellite branding (`text-theme-primary`, etc.) */
        'theme-primary': 'var(--theme-primary)',
        'theme-accent': 'var(--theme-accent)',
      },
      fontFamily: {
        tenant: 'var(--theme-font-family)',
      },
    },
  },
};

export default config;
