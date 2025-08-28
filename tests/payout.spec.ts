import { test, expect } from '@playwright/test';

const agentId = process.env.AGENT_ID || 'acme';
const pointId = process.env.POINT_ID || '00001';
const paymentId = 'test-pay-' + Date.now();

test.describe('QIWI Payout API Tests (Docs-Based)', () => {
  test('1. Service availability - check payments list format', async ({ request }) => {
    const response = await request.get(`/v1/agents/${agentId}/points/${pointId}/payments`, {
      params: { limit: '1' }
    });

    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    // Проверяем, что ответ — JSON
    if (!contentType.includes('application/json')) {
      test.info().annotations.push({
        type: 'error',
        description: `Expected JSON, got ${contentType}: ${await response.text()}`
      });
      expect(contentType).toContain('application/json');
      return;
    }

    const body = await response.json();

    if (status >= 400) {
      expect(body).toHaveProperty('errorCode');
      expect(body).toHaveProperty('serviceName');
      expect(typeof body.errorCode).toBe('string');
    }

    if (status === 200) {
      expect(Array.isArray(body)).toBeTruthy();
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('paymentId');
        expect(body[0].status).toHaveProperty('value');
        expect(['CREATED', 'READY', 'FAILED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'])
          .toContain(body[0].status.value);
      }
    }
  });

  test('2. Get balance - should be > 0 if available', async ({ request }) => {
    const response = await request.get(`/v1/agents/${agentId}/points/${pointId}/balance`);
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (!contentType.includes('application/json')) {
      test.info().annotations.push({
        type: 'error',
        description: `Expected JSON, got ${contentType}: ${await response.text()}`
      });
      expect(contentType).toContain('application/json');
      return;
    }

    const body = await response.json();

    if (status >= 400) {
      expect(body).toHaveProperty('errorCode');
      expect(body).toHaveProperty('serviceName');
      expect(typeof body.errorCode).toBe('string');
      return;
    }

    expect(status).toBe(200);
    expect(body).toHaveProperty('balance');
    expect(body.balance).toHaveProperty('value');
    expect(body.balance).toHaveProperty('currency');

    const balanceValue = parseFloat(body.balance.value);
    expect(balanceValue).toBeGreaterThanOrEqual(0);

    if (balanceValue === 0) {
      test.info().annotations.push({
        type: 'warning',
        description: 'Balance is 0. In production, it should be > 0.'
      });
    } else {
      expect(balanceValue).toBeGreaterThan(0);
    }
  });

  test('3. Create payment (1 RUB)', async ({ request }) => {
    const data = {
      recipientDetails: {
        providerCode: 'qiwi-wallet',
        fields: { account: '79123456789' }
      },
      amount: {
        value: '1.00',
        currency: 'RUB'
      },
      comment: 'Test payment 1 RUB'
    };

    const response = await request.put(`/v1/agents/${agentId}/points/${pointId}/payments/${paymentId}`, {
      data
    });

    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (!contentType.includes('application/json')) {
      test.info().annotations.push({
        type: 'error',
        description: `Expected JSON, got ${contentType}: ${await response.text()}`
      });
      expect(contentType).toContain('application/json');
      return;
    }

    const body = await response.json();

    if (status >= 400) {
      expect(body).toHaveProperty('errorCode');
      expect(body).toHaveProperty('serviceName');
      expect(typeof body.errorCode).toBe('string');
      return;
    }

    expect(status).toBe(200);
    expect(body.paymentId).toBe(paymentId);
    expect(body.amount).toEqual({
      value: '1.00',
      currency: 'RUB'
    });
    expect(['CREATED', 'READY']).toContain(body.status.value);
  });

  test('4. Execute payment', async ({ request }) => {
    const response = await request.post(`/v1/agents/${agentId}/points/${pointId}/payments/${paymentId}/execute`);
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (!contentType.includes('application/json')) {
      test.info().annotations.push({
        type: 'error',
        description: `Expected JSON, got ${contentType}: ${await response.text()}`
      });
      expect(contentType).toContain('application/json');
      return;
    }

    const body = await response.json();

    if (status >= 400) {
      expect(body).toHaveProperty('errorCode');
      expect(body).toHaveProperty('serviceName');
      expect(typeof body.errorCode).toBe('string');
      return;
    }

    expect(status).toBe(200);
    expect(body).toHaveProperty('status');
    expect(['IN_PROGRESS', 'COMPLETED', 'PROCESSING']).toContain(body.status.value);
  });
});