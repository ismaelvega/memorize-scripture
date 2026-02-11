import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { buildOAuthCallbackRedirect, sanitizeNextPath } = loadTsModule(
  path.resolve(__dirname, '../lib/auth/oauth.ts')
);

describe('sanitizeNextPath', () => {
  test('accepts internal relative paths with query/hash', () => {
    const result = sanitizeNextPath('/practice?mode=type#ready', '/');
    assert.equal(result, '/practice?mode=type#ready');
  });

  test('rejects absolute external urls', () => {
    const result = sanitizeNextPath('https://example.com/steal', '/');
    assert.equal(result, '/');
  });

  test('rejects protocol-relative urls', () => {
    const result = sanitizeNextPath('//evil.com', '/');
    assert.equal(result, '/');
  });
});

describe('buildOAuthCallbackRedirect', () => {
  test('uses NEXT_PUBLIC_SITE_URL when present', () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com/';
    try {
      const url = buildOAuthCallbackRedirect('/practice?foo=bar', 'http://localhost:3000');
      assert.equal(
        url,
        'https://app.example.com/auth/callback?next=%2Fpractice%3Ffoo%3Dbar'
      );
    } finally {
      if (originalSiteUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
      }
    }
  });

  test('falls back to current origin', () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const url = buildOAuthCallbackRedirect('/profile', 'http://localhost:3000');
      assert.equal(url, 'http://localhost:3000/auth/callback?next=%2Fprofile');
    } finally {
      if (originalSiteUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
      }
    }
  });
});
