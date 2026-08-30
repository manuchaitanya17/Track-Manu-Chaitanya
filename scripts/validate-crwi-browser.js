#!/usr/bin/env node

'use strict';

const fs = require('fs');

const debugPort = process.env.CHROME_DEBUG_PORT || '9225';
const baseUrl = process.env.CRWI_BASE_URL || 'http://127.0.0.1:8765';
const browserUrl = `http://127.0.0.1:${debugPort}`;
const pages = [
  'experience.html',
  'intensity.html',
  'experience-crw-i.html',
  'experience-crwi-krayden.html',
  'experience-crwi-krayden-documentation.html',
  'experience-crwi-krayden-code.html',
  'experience-crwi-spinel.html',
  'experience-crwi-spinel-documentation.html',
  'experience-crwi-spinel-code.html',
  'experience-crwi-united-mining.html',
  'experience-crwi-united-mining-documentation.html',
  'experience-crwi-united-mining-code.html'
];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createTarget() {
  const response = await fetch(`${browserUrl}/json/new?about%3Ablank`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to create Chrome target: ${response.status}`);
  return response.json();
}

async function closeTarget(targetId) {
  await fetch(`${browserUrl}/json/close/${targetId}`);
}

async function connectTarget(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  const exceptions = [];
  const consoleErrors = [];
  let requestId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result || {});
      return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text || 'Uncaught browser exception');
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description || '').join(' '));
    }

    const handlers = listeners.get(message.method) || [];
    handlers.splice(0).forEach((handler) => handler(message.params));
  });

  function send(method, params = {}) {
    requestId += 1;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  }

  function once(method, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const handlers = listeners.get(method) || [];
      handlers.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      listeners.set(method, handlers);
    });
  }

  async function navigate(url, viewport) {
    await send('Page.enable');
    await send('Runtime.enable');
    if (viewport) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: Boolean(viewport.mobile)
      });
    }
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url });
    await loaded;
    await wait(700);
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return result.result && result.result.value;
  }

  async function screenshot(outputPath) {
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
  }

  return { socket, send, navigate, evaluate, screenshot, exceptions, consoleErrors };
}

async function validatePage(page, options = {}) {
  const target = await createTarget();
  const client = await connectTarget(target);
  try {
    await client.navigate(`${baseUrl}/${page}`, options.viewport || { width: 1440, height: 1000, mobile: false });
    if (options.scrollSelector) {
      await client.evaluate(`(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const section = document.querySelector(${JSON.stringify(options.scrollSelector)});
        window.scrollTo(0, section.offsetTop);
      })()`);
      await wait(900);
    }
    const state = await client.evaluate(`(() => ({
      title: document.title,
      body: Boolean(document.body),
      navbar: Boolean(document.querySelector('#pb-navbar')),
      loadingExplorer: Boolean(document.querySelector('#experienceCodeTitle')) && document.querySelector('#experienceCodeTitle').textContent === 'Loading Explorer',
      codeTable: Boolean(document.querySelector('.code-table')),
      codeCharacters: document.querySelector('#experienceCodeBody') ? document.querySelector('#experienceCodeBody').textContent.trim().length : 0,
      workbenchVisible: document.querySelector('[data-code-workbench]') ? Number.parseFloat(getComputedStyle(document.querySelector('[data-code-workbench]')).opacity) > 0 : true,
      workbenchTop: document.querySelector('[data-code-workbench]') ? Math.round(document.querySelector('[data-code-workbench]').getBoundingClientRect().top) : null,
      workbenchHeight: document.querySelector('[data-code-workbench]') ? Math.round(document.querySelector('[data-code-workbench]').getBoundingClientRect().height) : null,
      editorTop: document.querySelector('#experienceCodeBody') ? Math.round(document.querySelector('#experienceCodeBody').getBoundingClientRect().top) : null,
      scrollY: Math.round(window.scrollY),
      treeFiles: document.querySelectorAll('[data-file-key]').length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    }))()`);
    const isCodePage = /-code\.html$/.test(page);
    const failures = [];
    if (!state || !state.body || !state.navbar) failures.push('missing rendered page structure');
    if (isCodePage && (state.loadingExplorer || !state.codeTable || state.codeCharacters === 0 || !state.workbenchVisible || state.treeFiles === 0)) {
      failures.push('code explorer did not initialize');
    }
    if (client.exceptions.length) failures.push(`runtime exceptions: ${client.exceptions.join(' | ')}`);
    if (client.consoleErrors.length) failures.push(`console errors: ${client.consoleErrors.join(' | ')}`);
    if (options.rejectOverflow && state.horizontalOverflow) failures.push('horizontal viewport overflow');
    if (options.screenshot) await client.screenshot(options.screenshot);
    return { page, state, failures };
  } finally {
    client.socket.close();
    await closeTarget(target.id);
  }
}

async function main() {
  const reports = [];
  if (process.env.CRWI_EXPLORER_ONLY === '1') {
    for (const project of ['krayden', 'spinel', 'united-mining']) {
      reports.push(await validatePage(`experience-crwi-${project}-code.html`, {
        viewport: { width: 1440, height: 1000, mobile: false },
        scrollSelector: '#section-code-explorer',
        screenshot: `/tmp/crwi-${project}-explorer.png`
      }));
    }
    printReports(reports);
    return;
  }
  for (const page of pages) {
    reports.push(await validatePage(page));
  }
  reports.push(await validatePage('experience-crw-i.html', {
    viewport: { width: 390, height: 844, mobile: true },
    rejectOverflow: true,
    screenshot: '/tmp/crwi-overview-mobile.png'
  }));
  reports.push(await validatePage('experience-crw-i.html', {
    viewport: { width: 1440, height: 1000, mobile: false },
    screenshot: '/tmp/crwi-overview-desktop.png'
  }));
  reports.push(await validatePage('experience-crwi-united-mining-documentation.html', {
    viewport: { width: 1440, height: 1000, mobile: false },
    screenshot: '/tmp/crwi-united-documentation.png'
  }));
  reports.push(await validatePage('experience-crwi-united-mining-code.html', {
    viewport: { width: 1440, height: 1000, mobile: false },
    screenshot: '/tmp/crwi-united-code.png'
  }));
  reports.push(await validatePage('experience-crw-i.html', {
    viewport: { width: 1440, height: 1000, mobile: false },
    scrollSelector: '#section-crwi-projects',
    screenshot: '/tmp/crwi-project-cards.png'
  }));
  for (const project of ['krayden', 'spinel', 'united-mining']) {
    reports.push(await validatePage(`experience-crwi-${project}-code.html`, {
      viewport: { width: 1440, height: 1000, mobile: false },
      scrollSelector: '#section-code-explorer',
      screenshot: `/tmp/crwi-${project}-explorer.png`
    }));
  }

  printReports(reports);
}

function printReports(reports) {
  let failures = 0;
  reports.forEach((report) => {
    if (report.failures.length) {
      failures += 1;
      console.log(`FAIL ${report.page}: ${report.failures.join('; ')}`);
      console.log(`  state=${JSON.stringify(report.state)}`);
      return;
    }
    const explorer = /-code\.html$/.test(report.page) ? `, explorer files=${report.state.treeFiles}` : '';
    console.log(`PASS ${report.page}${explorer}`);
  });
  if (failures) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
