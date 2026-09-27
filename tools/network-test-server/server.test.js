/* Self-test for the network test server: node tools/network-test-server/server.test.js */
'use strict';
const assert = require('assert');
const { server } = require('./server');

async function main() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p, init) => fetch(base + p, init);
  try {
    assert.strictEqual((await get('/health')).status, 200);
    for (const c of [400, 401, 403, 404, 429, 500]) assert.strictEqual((await get(`/status/${c}`)).status, c);
    const echo = await (await get('/echo?a=1', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer FAKE' }, body: '{"x":1}' })).json();
    assert.deepStrictEqual(echo.query, { a: '1' });
    assert.deepStrictEqual(echo.body, { x: 1 });
    assert.ok(echo.headerNames.includes('authorization'));
    assert.ok(!JSON.stringify(echo).includes('Bearer FAKE'), 'server must not echo header values');
    const t0 = Date.now();
    assert.strictEqual((await get('/delay/300')).status, 200);
    assert.ok(Date.now() - t0 >= 290);
    const red = await get('/redirect/2');
    assert.strictEqual(red.status, 200);
    assert.ok(red.redirected);
    const large = await (await get('/large/256')).text();
    assert.ok(large.length >= 256 * 1024);
    assert.strictEqual((await get('/x/generate_204')).status, 204);
    assert.ok((await get('/set-cookie?value=FAKE_COOKIE')).headers.get('set-cookie').includes('FAKE_COOKIE'));
    assert.strictEqual((await get('/nope')).status, 404);
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 100);
    await assert.rejects(get('/delay/2000', { signal: ac.signal }));
    console.log('network-test-server self-test: OK');
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
