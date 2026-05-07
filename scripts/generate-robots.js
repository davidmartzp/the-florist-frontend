#!/usr/bin/env node
/**
 * Generador de robots.txt para Florería Colón
 * Se ejecuta automáticamente antes del build de Angular.
 *
 * Uso:
 *   node scripts/generate-robots.js
 *
 * Variables de entorno:
 *   SITE_URL    – URL base del sitio (default: https://floreriacolon.com)
 */

const fs = require('fs');
const path = require('path');

const siteUrl = process.env.SITE_URL || 'https://lafloreriabyflorescolon.co';
const sitemapUrl = `${siteUrl}/sitemap.xml`;

const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /dashboard

Sitemap: ${sitemapUrl}
`;

const publicDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(publicDir, 'robots.txt');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`✅ robots.txt generado en: ${outputPath}`);
console.log(`   Sitemap: ${sitemapUrl}`);
