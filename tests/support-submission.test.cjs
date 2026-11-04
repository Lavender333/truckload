const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/launch-tools.js'), 'utf8');
for (const scenario of ['success', 'http error', 'provider rejection', 'network error', 'timeout']) {
 test(`support submission: ${scenario}`, async () => {
  let submit, request, reset = false;
  const button = { disabled: false };
  const status = { textContent: '' };
  const form = { reportValidity: () => true, querySelector: () => button,
   addEventListener: (_, callback) => { submit = callback; }, reset: () => { reset = true; } };
  const elements = { supportForm: form, supportStatus: status,
   supportEmail: { value: 'test@example.com' }, supportTopic: { value: 'Bug report' }, supportMessage: { value: 'Test message' } };
  vm.runInNewContext(source, { document: { getElementById: id => elements[id] }, AbortController, setTimeout, clearTimeout,
   fetch: async (url, options) => {
    request = { url, options };
    assert.equal(button.disabled, true);
    if (scenario === 'network error') throw new Error('offline');
    if (scenario === 'timeout') throw Object.assign(new Error('timeout'), { name: 'AbortError' });
    return { ok: scenario !== 'http error', json: async () => ({ success: scenario === 'success' }) };
   }
  });
  await submit({ preventDefault() {} });
  assert.equal(request.url, 'https://api.web3forms.com/submit');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).message, 'Test message');
  assert.equal(button.disabled, false);
  assert.equal(reset, scenario === 'success');
  assert.match(status.textContent, scenario === 'success' ? /was submitted/ : scenario === 'timeout' ? /not confirmed/ : /could not confirm/);
 });
}
