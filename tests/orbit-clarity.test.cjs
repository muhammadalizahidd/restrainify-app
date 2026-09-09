// Run: node --test tests/orbit-clarity.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

test('standalone homescreen embeds its logo and keeps both previews in sync', () => {
  const html = readFileSync(require('node:path').join(__dirname, '../restrainify-orbit-clarity.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  assert(!html.includes('__LOGO__'));
  assert(!/<(?:script|link|iframe)[^>]+(?:src|href)="https?:/i.test(html));
  const logo = html.match(/src="data:image\/png;base64,([^"]+)"/)[1];
  assert.equal(Buffer.from(logo, 'base64').subarray(1, 4).toString(), 'PNG');

  const modes = ['light', 'dark', 'compare'].map(mode => ({
    dataset: { mode },
    setAttribute(name, value) { this[name] = value; },
  }));
  const previews = ['light', 'dark'].map(theme => ({ dataset: { theme } }));
  const claims = [{}, {}];
  const labels = [{}, {}];
  const container = { classList: { toggle(name, value) { this[name] = value; } } };
  const context = vm.createContext({
    previews: container,
    document: {
      querySelectorAll(selector) {
        return { '[data-mode]': modes, '.preview': previews, '.claim': claims, '.reward-sub': labels }[selector];
      },
    },
  });
  // Execute the actual shipped state functions, with only the DOM replaced.
  const modeFunction = script.slice(script.indexOf('function setMode('), script.indexOf("document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener"));
  const claimFunction = script.slice(script.indexOf('function setClaimed('), script.indexOf("document.querySelectorAll('.claim').forEach(button => button.addEventListener"));
  vm.runInContext(modeFunction + claimFunction, context);
  context.setMode('dark');
  assert.deepEqual(previews.map(preview => preview.hidden), [true, false]);
  assert.equal(modes[1]['aria-pressed'], 'true');
  assert.equal(container.classList.single, true);
  context.setMode('invalid');
  assert.deepEqual(previews.map(preview => preview.hidden), [true, false]);
  context.setMode('light');
  assert.deepEqual(previews.map(preview => preview.hidden), [false, true]);
  context.setMode('compare');
  assert.deepEqual(previews.map(preview => preview.hidden), [false, false]);
  assert.equal(container.classList.single, false);
  context.setClaimed(true);
  assert(claims.every(button => button.disabled && button.textContent === 'Claimed ✓'));
  assert(labels.every(label => label.textContent.includes('collected')));
  context.setClaimed(false);
  assert(claims.every(button => !button.disabled && button.textContent === 'Claim +10'));
});
