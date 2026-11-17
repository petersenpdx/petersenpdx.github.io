import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes asset paths relative, so the same build works at
// https://<user>.github.io/, https://<user>.github.io/<repo>/, or a custom domain.
export default defineConfig({ plugins: [react()], base: './' });
