import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Requests to these paths are forwarded to the Spring Boot backend.
// The browser only ever talks to the Vite dev server (one origin), so:
//  - no CORS setup is needed in Spring
//  - the JSESSIONID and XSRF-TOKEN cookies just work
//  - Google sign-in redirects come back through here (/oauth2, /login/oauth2)
//
// changeOrigin: false keeps the browser's "Host: localhost:5173" header.
// Spring uses it to build the Google redirect URI and the after-login redirect,
// so both point back to this dev server instead of to port 8080.
// (Vite's string shorthand, e.g. '/api': 'http://localhost:8080', sets changeOrigin: true.)
const backend = () => ({ target: 'http://localhost:8080', changeOrigin: false });

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend(),
      '/oauth2': backend(),
      '/login/oauth2': backend(),
    },
  },
});
