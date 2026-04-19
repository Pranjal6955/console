import { test, expect } from '@playwright/test';

test.describe('Contributor Badge API', () => {
    test('should return a valid SVG for a user', async ({ request }) => {
        // 1. Hit the public badge endpoint
        // Using an arbitrary username; since it's not in cache, it will default to Observer
        const response = await request.get('/api/rewards/badge/pranjal6955');

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/svg+xml');

        // 2. Validate SVG content
        const body = await response.text();
        expect(body).toContain('<svg');
        expect(body).toContain('KubeStellar');
        expect(body).toContain('Observer'); // Default for unknown user
    });

    test('should return Observer tier for unknown users with 0 pts', async ({ request }) => {
        const response = await request.get('/api/rewards/badge/definitely-not-a-real-user-12345');
        const body = await response.text();

        expect(body).toContain('Observer');
        expect(body).toContain('0 pts');

        // Check for specific color token
        expect(body).toContain('#94a3b8'); // Gray hex
    });

    test('should use the short alias /api/badge/:login', async ({ request }) => {
        const response = await request.get('/api/badge/pranjal6955');
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/svg+xml');
    });
});
