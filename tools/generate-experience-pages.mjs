import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'Projects-Crowe Howarth');
const ASSET_ROOT = path.join(ROOT, 'assets', 'experience');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content);
}

function copyAsset(from, toRel) {
  const to = path.join(ROOT, toRel);
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return toRel.replace(/\\/g, '/');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function countFiles(dir, matcher) {
  return walk(dir).filter((file) => matcher(file)).length;
}

function basename(file) {
  return path.basename(file);
}

function isIgnoredExplorerFile(filePath) {
  const base = path.basename(filePath);
  if (base === '.DS_Store' || base === 'Thumbs.db') return true;
  if (base.startsWith('._')) return true;
  return false;
}

function isProbablyTextFile(filePath) {
  const sample = fs.readFileSync(filePath);
  const max = Math.min(sample.length, 4096);
  for (let index = 0; index < max; index += 1) {
    if (sample[index] === 0) return false;
  }
  return true;
}

function walkExplorer(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.svn' || entry.name === '.hg' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkExplorer(full));
      continue;
    }
    if (isIgnoredExplorerFile(full)) continue;
    if (!isProbablyTextFile(full)) continue;
    out.push(full);
  }
  return out;
}

function sortTreeNodes(nodes) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
    return left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' });
  });
  nodes.forEach((node) => {
    if (node.type === 'folder') {
      sortTreeNodes(node.children);
    }
  });
  return nodes;
}

function makeExplorerKey(relPath, usedKeys) {
  const stem = relPath
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'workspace-file';
  let key = stem;
  let counter = 2;
  while (usedKeys.has(key)) {
    key = `${stem}-${counter}`;
    counter += 1;
  }
  usedKeys.add(key);
  return key;
}

function deriveExplorerSection(relPath) {
  const dir = path.dirname(relPath).replace(/\\/g, '/');
  if (dir === '.') return 'Workspace Root';
  const parts = dir.split('/');
  if (parts.includes('SuiteScripts')) return 'SuiteScripts';
  if (parts.includes('Objects')) return 'Objects';
  if (parts.includes('Advanced PDF Layout')) return 'Advanced PDF Layout';
  if (parts.includes('Documents')) return 'Documents';
  return parts.slice(-2).join(' / ');
}

function collectExplorerEntries(project) {
  const explorer = project.explorer;
  const sourceRoots = explorer.sourceRoots && explorer.sourceRoots.length
    ? explorer.sourceRoots
    : [];
  const displayRootPath = path.join(ROOT, explorer.displayRoot);
  const filePaths = [];

  sourceRoots.forEach((rootPath) => {
    if (!fs.existsSync(rootPath)) return;
    filePaths.push(...walkExplorer(rootPath));
  });

  filePaths.sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

  const usedKeys = new Set();
  const seenRel = new Set();
  return filePaths.reduce((entries, filePath) => {
    const rel = path.relative(displayRootPath, filePath).replace(/\\/g, '/');
    if (!rel || rel.startsWith('../')) return entries;
    if (seenRel.has(rel)) return entries;
    seenRel.add(rel);
    entries.push({
      key: makeExplorerKey(rel, usedKeys),
      path: filePath,
      rel,
      section: deriveExplorerSection(rel),
      project: project.title
    });
    return entries;
  }, []);
}

function assetHref(asset) {
  return asset ? asset.replace(/\\/g, '/') : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHead(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${escapeHtml(title)}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="stylesheet" href="css/animate.css">
  <link rel="stylesheet" href="css/flexslider.css">
  <link rel="stylesheet" href="fonts/icomoon/style.css">
  <link rel="stylesheet" href="css/bootstrap.css">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/experience-pages.css">
  <link rel="stylesheet" href="css/mobile-responsive.css">
  <link href="https://fonts.googleapis.com/css?family=Nunito+Sans:200,300,400,700" rel="stylesheet">
</head>`;
}

function renderNav(collapseId, backHref, items) {
  return `<nav class="navbar navbar-expand-lg site-navbar navbar-light bg-light" id="pb-navbar">
    <div class="container">
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#${collapseId}" aria-controls="${collapseId}" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-md-center" id="${collapseId}">
        <ul class="navbar-nav">
          <li class="nav-item"><a class="nav-link" href="${backHref}">Back</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
          ${items.map((item) => `<li class="nav-item"><a class="nav-link" href="${item.href}">${escapeHtml(item.label)}</a></li>`).join('')}
        </ul>
      </div>
    </div>
  </nav>`;
}

function renderMeta(items) {
  return `<div class="experience-meta reveal">${items.map((item) => `<div class="experience-meta-chip">${escapeHtml(item)}</div>`).join('')}</div>`;
}

function renderActions(items) {
  if (!items || !items.length) return '';
  return `<div class="experience-actions reveal">${items.map((item, index) => `<a href="${item.href}" class="btn ${index === 0 ? 'btn-primary' : 'btn-secondary'} px-4 py-3">${escapeHtml(item.label)}</a>`).join('')}</div>`;
}

function renderStats(stats) {
  return `<div class="experience-stats">${stats.map((stat) => `<div class="experience-stat"><div class="experience-stat-label">${escapeHtml(stat.label)}</div><div class="experience-stat-value">${escapeHtml(stat.value)}</div><div class="experience-stat-sub">${escapeHtml(stat.sub)}</div></div>`).join('')}</div>`;
}

function renderLogo(logo) {
  if (!logo) return '<div class="experience-card-logo monogram">NS</div>';
  if (logo.type === 'image') return `<div class="experience-card-logo"><img src="${logo.src}" alt="${escapeHtml(logo.alt || logo.text || 'Project logo')}"></div>`;
  return `<div class="experience-card-logo monogram">${escapeHtml(logo.text)}</div>`;
}

function renderHero(config) {
  return `<section class="experience-hero" id="${config.id}">
    <div class="experience-shell">
      <div class="row align-items-center">
        <div class="col-xl-7 col-lg-7 mb-5 mb-lg-0">
          <span class="experience-pill reveal">${escapeHtml(config.pill)}</span>
          <h1 class="experience-title reveal">${escapeHtml(config.title)} <strong>${escapeHtml(config.strong)}</strong></h1>
          ${renderMeta(config.meta)}
          <p class="experience-lead reveal">${escapeHtml(config.lead)}</p>
          ${config.nodes ? `<div class="hero-strip reveal">${config.nodes.map((node) => `<div class="hero-node"><div class="hero-node-label">${escapeHtml(node.label)}</div><strong>${escapeHtml(node.title)}</strong><span>${escapeHtml(node.sub)}</span></div>`).join('')}</div>` : ''}
          ${renderActions(config.actions)}
        </div>
        <div class="col-xl-5 col-lg-5">
          <div class="experience-panel reveal">
            <div class="panel-kicker">${escapeHtml(config.panel.kicker)}</div>
            <h3>${escapeHtml(config.panel.title)}</h3>
            <p class="panel-copy">${escapeHtml(config.panel.copy)}</p>
            ${renderStats(config.panel.stats)}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderCard(card) {
  return `<article class="experience-card reveal">
    ${renderLogo(card.logo)}
    <div class="experience-card-kicker">${escapeHtml(card.kicker)}</div>
    <h3>${escapeHtml(card.title)}</h3>
    <p class="experience-card-copy">${escapeHtml(card.copy)}</p>
    <div class="experience-card-meta">${card.tags.map((tag) => `<span class="experience-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="experience-card-footer">
      <span>${escapeHtml(card.footer)}</span>
      <a href="${card.href}" class="btn btn-outline-primary">${escapeHtml(card.cta || 'Open')}</a>
    </div>
  </article>`;
}

function renderCardsSection(section) {
  return `<section class="experience-section${section.compact ? ' pt-0' : ''}" id="${section.id}">
    <div class="experience-shell">
      <div class="row mb-5">
        <div class="col-12">
          <div class="section-heading text-center reveal">
            <h2>${escapeHtml(section.title)} <strong>${escapeHtml(section.strong)}</strong></h2>
          </div>
        </div>
      </div>
      <div class="track-grid${section.two ? ' track-grid--two' : ''}">
        ${section.cards.map(renderCard).join('')}
      </div>
    </div>
  </section>`;
}

function renderSurfaceSection(section) {
  return `<section class="experience-section pt-0" id="${section.id}">
    <div class="experience-shell">
      <div class="experience-surface reveal">
        <div class="surface-kicker">${escapeHtml(section.kicker)}</div>
        <h3>${escapeHtml(section.title)}</h3>
        <p class="surface-copy">${escapeHtml(section.copy)}</p>
        <div class="snapshot-grid">${section.cards.map((card) => `<div class="snapshot-card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.copy)}</p></div>`).join('')}</div>
      </div>
    </div>
  </section>`;
}

function renderFooter(extraScripts = '') {
  return `<footer class="site-footer">
    <div class="container">
      <div class="row mb-5">
        <p class="col-12 text-center">
          Copyright &copy; <script>document.write(new Date().getFullYear());</script> All rights reserved | This website is made with <i class="icon-heart text-danger" aria-hidden="true"></i> by <a href="" target="_blank" class="text-primary">Manu Chaitanya</a>
        </p>
      </div>
    </div>
  </footer>

  <script src="js/vendor/jquery.min.js"></script>
  <script src="js/vendor/jquery-migrate-3.0.1.min.js"></script>
  <script src="js/vendor/popper.min.js"></script>
  <script src="js/vendor/bootstrap.min.js"></script>
  <script src="js/vendor/jquery.easing.1.3.js"></script>
  <script src="js/vendor/jquery.stellar.min.js"></script>
  <script src="js/vendor/jquery.waypoints.min.js"></script>
  <script src="js/custom.js"></script>
  <script src="js/experience-pages.js"></script>
  <script src="js/back-nav.js"></script>
  ${extraScripts}
</body>
</html>`;
}

function renderOverviewContent(page) {
  return `<section class="experience-section" id="${page.contentId}">
    <div class="experience-shell">
      <div class="fdd-overview reveal">
        <aside class="fdd-sidebar">
          <div class="panel-kicker">${escapeHtml(page.sidebar.kicker)}</div>
          <h3>${escapeHtml(page.sidebar.title)}</h3>
          <p class="fdd-copy">${escapeHtml(page.sidebar.copy)}</p>
          <div class="experience-card-meta">${page.sidebar.chips.map((chip) => `<span class="experience-note-chip">${escapeHtml(chip)}</span>`).join('')}</div>
          <ul class="fdd-list">${page.sidebar.list.map((item) => `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></li>`).join('')}</ul>
        </aside>
        <div class="fdd-main">
          <div class="surface-kicker">${escapeHtml(page.main.kicker)}</div>
          <h3>${escapeHtml(page.main.title)}</h3>
          ${page.main.sections.map((section) => `<div class="fdd-section"><h4>${escapeHtml(section.title)}</h4>${section.paragraphs.map((paragraph) => `<p class="fdd-copy">${escapeHtml(paragraph)}</p>`).join('')}${section.list ? `<ul>${section.list.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

function renderExplorerLayout(page) {
  return `<section class="experience-section pt-0" id="${page.summaryId}">
    <div class="experience-shell">
      <div class="experience-surface reveal">
        <div class="surface-kicker">${escapeHtml(page.summary.kicker)}</div>
        <h3>${escapeHtml(page.summary.title)}</h3>
        <p class="surface-copy">${escapeHtml(page.summary.copy)}</p>
        <div class="snapshot-grid">${page.summary.cards.map((card) => `<div class="snapshot-card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.copy)}</p></div>`).join('')}</div>
      </div>
    </div>
  </section>

  <section class="experience-section" id="${page.explorerId}">
    <div class="experience-shell">
      <div class="explorer-layout reveal" data-code-workbench>
        <aside class="code-sidebar">
          <h3>${escapeHtml(page.explorer.sidebarTitle)}</h3>
          <div class="code-tree" id="experienceCodeTree"></div>
        </aside>
        <div class="code-window">
          <div class="code-topbar">
            <div class="code-tab-meta">
              <strong id="experienceCodeTitle">${escapeHtml(page.explorer.defaultTitle)}</strong>
              <span id="experienceCodePath">${escapeHtml(page.explorer.defaultPath)}</span>
            </div>
            <button class="btn btn-outline-primary code-copy-btn" id="experienceCodeCopy" type="button">Copy Current File</button>
          </div>
          <div class="code-editor-header">
            <span class="code-dot red"></span>
            <span class="code-dot amber"></span>
            <span class="code-dot green"></span>
            <span class="bravo-date" id="experienceCodeStatus">${escapeHtml(page.explorer.status)}</span>
          </div>
          <div class="code-editor-wrap" id="experienceCodeBody"></div>
        </div>
      </div>
    </div>
  </section>`;
}

function pageLayout({ title, body, nav, extraScripts = '' }) {
  return `${renderHead(title)}
<body class="experience-body" data-spy="scroll" data-target="#pb-navbar" data-offset="200">
  ${nav}
  ${body}
  ${renderFooter(extraScripts)}`;
}

function sectionFromDoc(title, paragraphs, list) {
  return { title, paragraphs, list };
}

const docs = {
  subscriptionBilling: copyAsset(path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/Documents/Technical Document.docx'), 'assets/experience/subscription-billing/Technical_Document.docx'),
  invoicing: copyAsset(path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/Document/Technical Document.docx'), 'assets/experience/custom-invoice-automation/Technical_Document.docx'),
  bulkEmailing: copyAsset(path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/Documents/Technical Document.docx'), 'assets/experience/bulk-emailing/Technical_Document.docx'),
  bulkSuitelet: copyAsset(path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/Documents/Technical Document.docx'), 'assets/experience/bulk-emailing/Technical_Document_Backup.docx'),
  threewmFdd: copyAsset(path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/Documents/FDD.docx'), 'assets/experience/3wm/FDD.docx'),
  threewmTech: copyAsset(path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/Documents/Technical Document.docx'), 'assets/experience/3wm/Technical_Document.docx'),
  airFdd: copyAsset(path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/Documents/FDD.docx'), 'assets/experience/air/FDD.docx'),
  airTech: copyAsset(path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/Documents/Technical Document.docx'), 'assets/experience/air/Technical_Document.docx')
};

const projects = [
  {
    slug: 'krayden',
    file: 'experience-krayden.html',
    title: 'Krayden',
    strong: 'Customisation/Integration',
    pill: 'Internship Capstone-I · Billable',
    logo: { type: 'image', src: 'images/experience/krayden.png', alt: 'Krayden' },
    track: 'Internship Capstone-I',
    back: 'experience-capstone-i.html',
    meta: ['NetSuite ↔ Salesforce', '5 Enhancements', 'Integration Delivery'],
    lead: 'Krayden is the first deep client-delivery package in the Crowe archive. The work is organized into enhancement-led NetSuite to Salesforce sync flows for Customer, Item, Invoice, and Credit Memo records, with a separate Export Control and Approval package enforcing restricted-item rules before fulfillment and shipment.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Five Enhancement Tracks, One Integration Story',
      copy: 'The live source packages show a repeatable delivery pattern: SuiteCloud packaging, shared libraries, record-specific scripts, object XML, and business validation layered around a NetSuite-Salesforce sync program.',
      stats: [
        { label: 'Enhancements', value: '5', sub: 'Customer, Item, Invoice, Credit Memo, and Export Control' },
        { label: 'Scripts', value: '23', sub: 'User Event, Map/Reduce, validation, and helper logic' },
        { label: 'Objects', value: '13', sub: 'Deployment and object XML backing the enhancement packages' },
        { label: 'Track', value: 'I', sub: 'Internship Capstone-I billable delivery' }
      ]
    },
    nodes: [
      { label: 'Enhancement 106392', title: 'Customer Sync', sub: 'NS to SF with territory handling' },
      { label: 'Enhancement 106395', title: 'Item Sync', sub: 'Product data and screening' },
      { label: 'Enhancement 106397-97467', title: 'Invoice, Credit, Export', sub: 'Downstream sync + approval control' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'FDD Overview', copy: 'A source-derived functional overview of the complete Krayden integration program, reconstructing the business flow from the enhancement packages, validation logic, and deployment structure.', tags: ['Functional Design', 'Source-Derived', 'Integration Flow'], footer: 'Use this page to understand the record flow before opening the code explorer.', href: 'experience-krayden-fdd.html', cta: 'Open FDD' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A VS Code-style explorer built from the actual enhancement folders, including the shared library, manifests, object XML, and record-specific SuiteScripts.', tags: ['Read-Only Explorer', '23 Scripts', 'Enhancement Tree'], footer: 'Use this page to inspect the implementation surface across the five Krayden enhancements.', href: 'experience-krayden-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Project Structure',
      title: 'Enhancement Packages Inside the Krayden Archive',
      copy: 'The Krayden delivery is not one script bundle. It is a multi-package client program where each enhancement handles a distinct record family or control layer.',
      cards: [
        { title: 'Enhancement-106392', copy: 'Customer sync with territory updates, address validation, and Salesforce payload logic.' },
        { title: 'Enhancement-106395', copy: 'Item sync focused on product screening and outbound item data assembly.' },
        { title: 'Enhancement-106397', copy: 'Invoice sync with invoice-level validation and Salesforce-safe payload checks.' },
        { title: 'Enhancement-106399', copy: 'Credit Memo sync extending the same pattern into downstream credit handling.' },
        { title: 'Enhancement-97467', copy: 'Export Control and Approval protecting restricted-item fulfillment and shipment.' },
        { title: 'Common Spine', copy: 'SuiteCloud manifests, deployment metadata, shared libraries, and object XML tie the work together.' }
      ]
    },
    overview: {
      file: 'experience-krayden-fdd.html',
      title: 'FDD - Krayden NetSuite-Salesforce Customisation and Integrations',
      pill: 'Functional Design Overview',
      strong: 'Krayden NetSuite-Salesforce Customisation and Integrations',
      meta: ['Internship Capstone-I', 'Source-Derived Overview', 'Customer, Item, Invoice, Credit Memo, Export Control'],
      lead: 'This page rebuilds the functional design for Krayden from the enhancement packages and live SuiteScript sources. It captures what the delivery was trying to solve, how the sync routes are divided, and where the hard business controls sit inside the integration program.',
      actions: [
        { href: 'experience-krayden-scripts.html', label: 'Open Scripts Explorer' },
        { href: 'experience-krayden.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Design Frame',
        title: 'Integration First, Validation Close Behind',
        copy: 'The Krayden work reads like a production integration rollout: outbound sync, inbound updates, resync/retry helpers, record-level validation, and approval logic all live together inside enhancement-scoped packages.',
        stats: [
          { label: 'Sync Families', value: '4', sub: 'Customer, Item, Invoice, and Credit Memo movement across NetSuite and Salesforce' },
          { label: 'Control Layer', value: '1', sub: 'Export Control and Approval blocks restricted transactions at the transaction stage' },
          { label: 'Packaging', value: 'SDF', sub: 'Manifest, deploy, object XML, and SuiteScripts are deployed as full SuiteCloud packages' },
          { label: 'Author Signal', value: 'MC', sub: 'Primary script headers show Manu Chaitanya on the core integration scripts' }
        ]
      },
      sidebar: {
        kicker: 'Krayden Scope',
        title: 'What the Archive Makes Clear',
        copy: 'Even without one raw FDD file, the source tree makes the project intent explicit. Each enhancement package covers one record family, while a shared library and validation utilities keep the integration behavior consistent.',
        chips: ['5 Enhancement Packages', 'Shared SF Library', 'Validation + Approval', 'SDF Deployment'],
        list: [
          { label: 'Customer Sync', value: 'UE, RL, MR, territory updates, and address validation' },
          { label: 'Item Sync', value: 'Product screening and outbound item payload logic' },
          { label: 'Invoice Sync', value: 'Invoice-safe validation before Salesforce push' },
          { label: 'Export Control', value: 'Restricted-item gating before transaction completion' }
        ]
      },
      main: {
        kicker: 'Functional Narrative',
        title: 'How the Krayden Delivery is Structured',
        sections: [
          sectionFromDoc('Project Context', [
            'Krayden is the first full client integration package in this experience archive and it sets the pattern for the rest of the Crowe work. Instead of one general script bundle, the delivery is split into enhancement packages with clear ownership boundaries: Customer, Item, Invoice, Credit Memo, and Export Control. That structure matters because each record family has different timing, validation, and retry concerns. Customer and Item routes are foundation layers, while Invoice and Credit Memo are downstream finance documents that carry stricter correctness requirements.',
            'The available script headers, manifests, and object XML show that the project was built as a controlled SuiteCloud deployment rather than an informal collection of files. The same integration story repeats across the packages: identify the correct NetSuite event or source state, gather the business data, map it into a Salesforce-safe structure, send or reconcile the payload, and leave enough metadata behind to support reprocessing or error handling.'
          ]),
          sectionFromDoc('Record Flow and Integration Shape', [
            'The Customer package is the clearest example of the integration pattern. It includes a shared Salesforce helper library, user-event scripts to initiate sync, RESTlet support for updates back into NetSuite, and Map/Reduce processes to resync or update territory assignments when data does not line up on the first pass. This is not just a push script. It is a lifecycle bundle for matching, updating, and stabilizing customer movement across systems.',
            'The Item, Invoice, and Credit Memo packages follow that same idea at narrower scopes. Item sync concentrates on product data screening and field preparation. Invoice sync adds stricter validation because invoice records must be pushed only when the address and supporting data are safe for downstream use. Credit Memo sync mirrors the finance-side pattern so the Salesforce mirror stays aligned even after invoice-side corrections. Together, those packages form one end-to-end NS-to-SF document program.'
          ]),
          sectionFromDoc('Business Controls and Validation', [
            'Krayden is not valuable only because it moves records. It is valuable because the movement is guarded. Address line validation, invoice validation, and territory resolution logic appear directly in the source, and Export Control introduces a harder transaction gate: when a restricted item is selected, the scripts verify whether the customer is approved and whether the approval is still valid before allowing the flow to continue.',
            'That approval layer is especially important because it turns the project from a simple data sync into a compliance-sensitive business control. The system does not merely replicate records between NetSuite and Salesforce. It helps ensure that the right transactions are allowed to proceed and that restricted-item flows are stopped when the client’s approval rules are not met.'
          ]),
          sectionFromDoc('Delivery Architecture', [
            'From a delivery perspective, the Krayden work shows three qualities that recur later in the Crowe archive. First, the deployment packaging is clean: manifest.xml, deploy.xml, SuiteScript files, and object XML are present as first-class artefacts. Second, there is reuse instead of duplication, most visibly through the shared Salesforce helper library. Third, the project is enhancement-led, which means changes are scoped, traceable, and easier to maintain over time than one oversized all-purpose script package.',
            'Taken together, the Krayden archive reads like the start of production-grade NetSuite consulting work: record synchronization, validation, cross-system mapping, approval protection, deployment packaging, and enough operational discipline to recover from data mismatch scenarios without rebuilding the logic from scratch.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-krayden-scripts.html',
      title: 'Scripts - Krayden NetSuite-Salesforce Customisation and Integrations',
      pill: 'Code Explorer',
      strong: 'Krayden NetSuite-Salesforce Customisation and Integrations',
      meta: ['Read-Only Explorer', 'Enhancement-Led Source Tree', 'SuiteScript + Object XML'],
      lead: 'The Krayden explorer is structured like a VS Code workspace. The files come from the actual enhancement packages and focus on the main integration library, record-level sync scripts, and the export-control protection layer.',
      actions: [
        { href: 'experience-krayden-fdd.html', label: 'Open FDD Overview' },
        { href: 'experience-krayden.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the Live Enhancement Packages',
        copy: 'The explorer includes the shared Salesforce library, enhancement manifests, customer sync routes, invoice validation, and export-control scripts that best represent the Krayden delivery model.',
        stats: [
          { label: 'Primary Files', value: '12', sub: 'A curated working set from the Krayden packages' },
          { label: 'Workspace Root', value: '1', sub: 'SuiteCloud workspace configuration is included' },
          { label: 'Enhancement Families', value: '5', sub: 'Customer, Item, Invoice, Credit Memo, and Export Control' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What is Included in This Explorer',
        copy: 'The selected file set is intentionally narrow enough to stay readable while still representing the real client-delivery pattern in the Krayden workspace.',
        cards: [
          { title: 'Shared Library', copy: 'Crowe_library_sf_ns.js shows the helper layer that makes Salesforce authentication and record lookup reusable.' },
          { title: 'Record Sync', copy: 'Customer, Item, Invoice, and Credit Memo scripts capture the different record-specific integration routes.' },
          { title: 'Control Layer', copy: 'Export Control scripts show how client business rules were enforced before fulfillment and shipment.' }
        ]
      },
      dataFile: 'js/experience-code-data-krayden.js',
      explorerId: 'section-krayden-explorer',
      summaryId: 'section-krayden-explorer-summary',
      explorerBox: { sidebarTitle: 'Krayden Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing file tree...', status: 'Enhancement Explorer' },
      sourceRoots: [
        path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New'),
        path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106395(Item NS-SF Integration)/New'),
        path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106397(Invoice NS-SF Integration)/New'),
        path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106399(Credit Memo NS-SF Integration)/New'),
        path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-97467(Export Control and Approval)/New')
      ],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-I/Billable Projects/Krayden',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/suitecloud.config.js'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/suitecloud.config.js', section: 'Workspace Root', project: 'Krayden Workspace' },
        { key: 'customer-manifest', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/src/manifest.xml'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/src/manifest.xml', section: 'Customer NS-SF Integration', project: 'Customer Package' },
        { key: 'crowe-library', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/Crowe_library_sf_ns.js'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/Crowe_library_sf_ns.js', section: 'Customer NS-SF Integration', project: 'Shared Integration Library' },
        { key: 'customer-ue', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_UE_Sync_Customer_NS_to_SF.js'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_UE_Sync_Customer_NS_to_SF.js', section: 'Customer NS-SF Integration', project: 'Customer Sync' },
        { key: 'customer-restlet', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_RL_update_customer_SF_to_NS.js'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_RL_update_customer_SF_to_NS.js', section: 'Customer NS-SF Integration', project: 'Customer Update' },
        { key: 'customer-mr', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_mr_syncs_customer_ns_sf.js'), rel: 'Enhancement-106392(Customer NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106392_mr_syncs_customer_ns_sf.js', section: 'Customer NS-SF Integration', project: 'Customer Resync' },
        { key: 'item-ue', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106395(Item NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106395_UE_Sync_Item_NS_to_SF.js'), rel: 'Enhancement-106395(Item NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106395_UE_Sync_Item_NS_to_SF.js', section: 'Item NS-SF Integration', project: 'Item Sync' },
        { key: 'invoice-ue', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106397(Invoice NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106397_ue_sync_Invoice_NS_to_SF.js'), rel: 'Enhancement-106397(Invoice NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106397_ue_sync_Invoice_NS_to_SF.js', section: 'Invoice NS-SF Integration', project: 'Invoice Sync' },
        { key: 'invoice-validate', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106397(Invoice NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106397_validate_invoice.js'), rel: 'Enhancement-106397(Invoice NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106397_validate_invoice.js', section: 'Invoice NS-SF Integration', project: 'Invoice Validation' },
        { key: 'creditmemo-ue', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-106399(Credit Memo NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106399_ue_sync_CreditMemo_NS_to_SF.js'), rel: 'Enhancement-106399(Credit Memo NS-SF Integration)/New/src/FileCabinet/SuiteScripts/c106399_ue_sync_CreditMemo_NS_to_SF.js', section: 'Credit Memo NS-SF Integration', project: 'Credit Memo Sync' },
        { key: 'export-so', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-97467(Export Control and Approval)/New/src/FileCabinet/SuiteScripts/c97467_export_control_so.js'), rel: 'Enhancement-97467(Export Control and Approval)/New/src/FileCabinet/SuiteScripts/c97467_export_control_so.js', section: 'Export Control and Approval', project: 'Sales Order Control' },
        { key: 'export-if', path: path.join(SRC_ROOT, 'Internship Capstone-I/Billable Projects/Krayden/Enhancement-97467(Export Control and Approval)/New/src/FileCabinet/SuiteScripts/c97467_export_control_if.js'), rel: 'Enhancement-97467(Export Control and Approval)/New/src/FileCabinet/SuiteScripts/c97467_export_control_if.js', section: 'Export Control and Approval', project: 'Item Fulfillment Control' }
      ]
    }
  },
  {
    slug: 'hugo',
    file: 'experience-hugo.html',
    title: 'Hugo Inc',
    strong: 'PDF Customisation',
    pill: 'Internship Capstone-II · Billable',
    logo: { type: 'image', src: 'images/experience/hugo.webp', alt: 'Hugo Inc' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['Advanced PDF Layouts', 'Transaction Documents', 'XML Template Delivery'],
    lead: 'Hugo Inc is a document-layer customization project focused on NetSuite Advanced PDF Layouts. The current source package is compact and centered on one invoice layout pair: the active invoice XML and a backup copy that preserves the earlier formatting state for safe rollback and comparison.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Document Delivery Instead of Script-Heavy Automation',
      copy: 'This project is built around advanced PDF XML rather than SuiteScript orchestration. The value comes from layout structure, branding, macro reuse, and safe template versioning across multiple transaction forms.',
      stats: [
        { label: 'XML Layouts', value: '2', sub: 'One active invoice layout and one backup variant' },
        { label: 'Date Folders', value: '1', sub: 'The delivered files sit inside one dated invoice-layout folder' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II billable customization work' },
        { label: 'Mode', value: 'ADV', sub: 'Advanced PDF Layout customization inside NetSuite' }
      ]
    },
    nodes: [
      { label: 'Layout Set', title: 'Invoice XML', sub: 'The active invoice presentation layer' },
      { label: 'Versioning', title: 'Backup XML', sub: 'Rollback-safe comparison copy' },
      { label: 'Delivery Signal', title: 'Layout Control', sub: 'Focused advanced-PDF customization work' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Layout Overview', copy: 'A structured explanation of how the Hugo Inc PDF customization is organized, including the transaction families, macro use, and styling approach visible in the XML layouts.', tags: ['Overview', 'Advanced PDF', 'Document Layer'], footer: 'Read this first to understand how the XML layouts are separated and versioned.', href: 'experience-hugo-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'PDF Layout Explorer', copy: 'A read-only XML explorer showing the live invoice layout and its backup variant exactly as they appear in the Hugo Inc workspace.', tags: ['XML Explorer', '2 Layout Files', 'Read-Only'], footer: 'Use the explorer to inspect the live invoice markup and the preserved backup variant.', href: 'experience-hugo-layouts.html', cta: 'Open Layouts' }
    ],
    snapshot: {
      kicker: 'Layout Families',
      title: 'What is in the Hugo Package',
      copy: 'The package is small but precise. It keeps the active invoice layout beside a backup copy so changes to document structure can be compared and rolled back safely.',
      cards: [
        { title: 'invoice.xml', copy: 'The active invoice template carrying the current macro, table, and branding structure.' },
        { title: 'invoiceBackup.xml', copy: 'A preserved backup version used for rollback and side-by-side layout comparison.' },
        { title: 'Header and Footer Macros', copy: 'The XML shows reusable document framing rather than one flat markup block.' },
        { title: 'Branding Layer', copy: 'Subsidiary identity, address blocks, and print-safe finance presentation are handled in markup.' },
        { title: 'Version Safety', copy: 'Keeping the backup beside the active file makes format changes easier to test and reverse.' },
        { title: 'Delivery Style', copy: 'This is document-surface customization work, not runtime SuiteScript automation.' }
      ]
    },
    overview: {
      file: 'experience-hugo-overview.html',
      title: 'Overview - Hugo Inc Advanced PDF Customisation',
      pill: 'Project Overview',
      strong: 'Hugo Inc Advanced PDF Customisation',
      meta: ['Internship Capstone-II', 'Advanced PDF Layouts', 'Transaction Document Branding'],
      lead: 'This overview captures the structure behind the Hugo Inc PDF customization package. The source tree shows a document-focused engagement where the deliverable is not workflow automation but high-confidence transaction output across several NetSuite forms.',
      actions: [
        { href: 'experience-hugo-layouts.html', label: 'Open Layout Explorer' },
        { href: 'experience-hugo.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Document Focus',
        title: 'Multi-Template Output Inside One SDF Package',
        copy: 'The project uses an SDF package to move advanced PDF layouts through a controlled deployment surface, while the actual value sits inside XML structure, font declarations, macros, and per-transaction markup.',
        stats: [
          { label: 'Output Types', value: '5', sub: 'Invoice, Purchase Order, Customer Payment, Cash Sale, and Vendor Payment' },
          { label: 'Backups', value: '5', sub: 'Backup templates keep rollback and comparison paths available' },
          { label: 'Styling Mode', value: 'XML', sub: 'Advanced PDF markup using fonts, macros, and field placeholders' },
          { label: 'Packaging', value: 'SDF', sub: 'Manifest, deploy, and layout file cabinet structure' }
        ]
      },
      sidebar: {
        kicker: 'Delivery Readout',
        title: 'What the XML Files Show',
        copy: 'The live layout files expose the practical work: formatting headers and footers, injecting subsidiary branding, handling locale fonts, and maintaining separate template variants for different transaction outputs.',
        chips: ['Header/Footer Macros', 'Barcode Footer', 'Locale Fonts', 'Dated Layout Sets'],
        list: [
          { label: 'Primary Layouts', value: 'ADV_INVOICE, ADV_CP, ADV_CS, ADV_VP, and ADVPDF_PURCHASE_ORDER' },
          { label: 'Date Sets', value: '09-03-2026 and 28-12-2026 folders preserve change windows' },
          { label: 'Branding', value: 'Subsidiary name, address, logo, and barcode footer logic' },
          { label: 'Fallback', value: 'Backup files retain earlier document variants' }
        ]
      },
      main: {
        kicker: 'Project Narrative',
        title: 'How the Hugo Delivery is Structured',
        sections: [
          sectionFromDoc('Project Intent', [
            'The Hugo package is a document customization engagement rather than a workflow or integration build. Its purpose is to improve the output NetSuite produces for invoice records, so the work sits inside Advanced PDF Layout XML and relies on careful document design rather than trigger-based automation.',
            'The active invoice file and its backup copy are a useful quality signal. Instead of replacing one layout blindly, the package keeps a preserved prior version, which is the right operational choice for PDF work where even small formatting changes can affect finance teams, customer communications, and printed output.'
          ]),
          sectionFromDoc('Template Surface', [
            'The current local archive is narrower than the broader draft this project was first modeled around. What is actually present here is an invoice-focused layout set, which means the delivery surface is tighter and easier to reason about: one live invoice layout plus one backup copy that preserves the previous state.',
            'Inside the layout markup, the patterns are classic Advanced PDF strategies: font declarations, macro lists for reusable header and footer blocks, subsidiary logo and address rendering, table structures for line data, and finance-safe print formatting. The result is a controlled presentation layer built on top of standard NetSuite record placeholders.'
          ]),
          sectionFromDoc('Implementation Quality Signals', [
            'Even at the markup level, the source tree gives clear delivery signals. There is an active file, there is a backup copy, and the layout folder is clearly scoped to the invoice output family. That reduces the risk of one formatting change landing without a safe comparison point.',
            'This matters because PDF customization work often becomes fragile if everything is forced into one template with no preserved baseline. Hugo avoids that trap. The package is smaller than the integration projects, but it still shows disciplined delivery in a different technical surface: document structure, print-safe formatting, and maintainable versioning.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-hugo-layouts.html',
      title: 'PDF Layouts - Hugo Inc Advanced PDF Customisation',
      pill: 'Layout Explorer',
      strong: 'Hugo Inc Advanced PDF Customisation',
      meta: ['Read-Only XML Explorer', 'Advanced PDF Layout Files', 'Transaction Template Set'],
      lead: 'This explorer focuses on the live XML template files from the Hugo Inc package. It is structured like a code workspace, but the artefacts are Advanced PDF Layout definitions rather than SuiteScript files.',
      actions: [
        { href: 'experience-hugo-overview.html', label: 'Open Overview' },
        { href: 'experience-hugo.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'XML Template Set for Transaction Output',
        copy: 'The selected files show the live invoice template, its backup copy, and the minimal SDF metadata required to package the layout safely.',
        stats: [
          { label: 'Selected Files', value: '4', sub: 'Two XML layout files plus the core SDF metadata' },
          { label: 'Format', value: 'XML', sub: 'NetSuite Advanced PDF markup using macros and field placeholders' },
          { label: 'Template Families', value: '1', sub: 'Invoice output with one backup variant' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only explorer with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What to Look For in the XML',
        copy: 'The layout files are useful because they expose the exact document-layer decisions made for Hugo Inc, including macro structure, field usage, and a preserved backup state.',
        cards: [
          { title: 'Macro Structure', copy: 'Header and footer blocks are defined as reusable macros, keeping company identity consistent.' },
          { title: 'Styling Layer', copy: 'Font and table declarations show how the layouts are tuned for print-safe and email-safe output.' },
          { title: 'Version Safety', copy: 'The backup invoice file preserves the prior markup state so regressions can be reversed quickly.' }
        ]
      },
      dataFile: 'js/experience-code-data-hugo.js',
      explorerId: 'section-hugo-explorer',
      summaryId: 'section-hugo-summary',
      explorerBox: { sidebarTitle: 'Hugo Layouts', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing XML workspace...', status: 'Layout Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'Hugo Inc PDF Customisation' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'invoice-early', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/FileCabinet/Advanced PDF Layout/09-03-2026/invoice.xml'), rel: 'src/FileCabinet/Advanced PDF Layout/09-03-2026/invoice.xml', section: '09-03-2026', project: 'Invoice Layout' },
        { key: 'invoice-backup-early', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/FileCabinet/Advanced PDF Layout/09-03-2026/invoiceBackup.xml'), rel: 'src/FileCabinet/Advanced PDF Layout/09-03-2026/invoiceBackup.xml', section: '09-03-2026', project: 'Invoice Backup' },
      ]
    }
  },
  {
    slug: 'payzen',
    file: 'experience-payzen.html',
    title: 'PayZen',
    strong: 'Data Migration',
    pill: 'Internship Capstone-II · Billable',
    logo: { type: 'image', src: 'images/experience/payzen.png', alt: 'PayZen' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['Historical Finance Migration', 'CSV Data Pack', 'NetSuite -> Snowflake Support'],
    lead: 'PayZen is represented by a focused migration-ready data pack rather than an SDF customization bundle. The archive contains finance and reference CSV files for accounting periods, accounts, departments, locations, subsidiaries, and journal history, which makes this delivery a data-preparation and migration-support project.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Migration Support Through Structured Finance Data',
      copy: 'The delivery surface is compact but clear. The CSV pack is organized around the tables and reference sets needed to preserve historical accounting context and move finance data into a reporting or migration target cleanly.',
      stats: [
        { label: 'CSV Files', value: '6', sub: 'Accounting Periods, Accounts, Departments, Locations, Subsidiaries, and Journals' },
        { label: 'Data Type', value: 'FIN', sub: 'Reference and transactional finance data' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II billable work' },
        { label: 'Mode', value: 'MIG', sub: 'Migration and data-preservation support' }
      ]
    },
    nodes: [
      { label: 'Reference Set', title: 'Accounts + Subsidiaries', sub: 'Structural finance dimensions' },
      { label: 'Reference Set', title: 'Departments + Locations', sub: 'Operational reporting dimensions' },
      { label: 'Transaction Set', title: 'Journals 2022', sub: 'Historical finance movement' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Migration Overview', copy: 'A concise project overview of what the PayZen data pack contains, how the files fit together, and why this delivery reads like a structured historical migration rather than application customization.', tags: ['Migration Context', 'CSV Pack', 'Finance Data'], footer: 'Open this page first to understand why the CSV files are grouped the way they are.', href: 'experience-payzen-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Data Pack Explorer', copy: 'A read-only explorer for the actual CSV files supplied with the project so the reference tables and historical journals can be reviewed directly in a code-like workspace.', tags: ['CSV Explorer', '6 Data Files', 'Read-Only'], footer: 'Open this page to inspect the live headers and the structure of the delivered migration pack.', href: 'experience-payzen-data.html', cta: 'Open Data Pack' }
    ],
    snapshot: {
      kicker: 'Data Pack Surface',
      title: 'Files Included in the PayZen Archive',
      copy: 'The project is small in file count but large in practical importance because each CSV represents a foundational finance table or historical transaction feed.',
      cards: [
        { title: 'Accounting Periods.csv', copy: 'Calendar structure needed to place historical transactions into correct accounting windows.' },
        { title: 'Accounts.csv', copy: 'Chart-of-accounts style reference data for finance migration.' },
        { title: 'Departments.csv', copy: 'Department dimension support for reporting continuity.' },
        { title: 'Locations.csv', copy: 'Location-level finance classification data.' },
        { title: 'Subsidiaries.csv', copy: 'Subsidiary reference mapping for entity structure.' },
        { title: 'Journals 2022.csv', copy: 'Historical journal entries forming the transactional core of the migration pack.' }
      ]
    },
    overview: {
      file: 'experience-payzen-overview.html',
      title: 'Overview - PayZen NetSuite to Snowflake Data Migration',
      pill: 'Project Overview',
      strong: 'PayZen NetSuite to Snowflake Data Migration',
      meta: ['Internship Capstone-II', 'CSV Data Pack', 'Historical Finance Preservation'],
      lead: 'This overview summarizes the PayZen delivery as a migration-support package. The archive does not contain heavy scripting or workflow logic; instead it provides the organized reference and journal data required to preserve finance history cleanly across systems.',
      actions: [
        { href: 'experience-payzen-data.html', label: 'Open Data Explorer' },
        { href: 'experience-payzen.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Migration Frame',
        title: 'Data Readiness Instead of Runtime Automation',
        copy: 'PayZen shows another kind of delivery value: not every project is script-heavy. Some projects are about extracting, structuring, and preserving data so the next finance platform or reporting layer can be trusted.',
        stats: [
          { label: 'Reference Tables', value: '5', sub: 'Periods, accounts, departments, locations, and subsidiaries' },
          { label: 'Transaction Tables', value: '1', sub: 'Journal history included in the migration pack' },
          { label: 'Primary Use', value: 'MIG', sub: 'Historical data preservation and reporting continuity' },
          { label: 'Format', value: 'CSV', sub: 'Portable tabular exports suitable for ingestion and validation' }
        ]
      },
      sidebar: {
        kicker: 'What the Files Indicate',
        title: 'The Practical Shape of the Delivery',
        copy: 'The file set shows a migration-first engagement. Instead of one opaque dump, the data is split into finance-ready reference sets and journal history, which is the right pattern for staged migration and reconciliation.',
        chips: ['Reference Data', 'Journal History', 'Snowflake Ready', 'Migration Support'],
        list: [
          { label: 'Chart Structure', value: 'Accounts, departments, locations, and subsidiaries define the core finance dimensions' },
          { label: 'Time Structure', value: 'Accounting periods anchor historical posting windows' },
          { label: 'Transaction History', value: 'Journal data provides the historical movement that needs to be preserved' },
          { label: 'Delivery Style', value: 'Structured file pack instead of runtime customization' }
        ]
      },
      main: {
        kicker: 'Project Narrative',
        title: 'How the PayZen Delivery Reads',
        sections: [
          sectionFromDoc('Migration Objective', [
            'The PayZen archive reads like a one-time or staged finance migration support package. The presence of reference tables and one clearly named journal-history export suggests the delivery was designed to preserve accounting context while moving historical data into another environment, likely for finance reporting or system transition work.',
            'That matters because a migration is only as good as the surrounding reference data. Journal rows without accounts, subsidiaries, locations, departments, and time-period alignment are difficult to validate and even harder to reconcile. The PayZen pack avoids that problem by shipping those supporting structures alongside the transaction history.'
          ]),
          sectionFromDoc('Data Pack Structure', [
            'The file grouping is disciplined. Accounting Periods supplies time boundaries. Accounts defines the chart structure. Departments and Locations preserve reporting segmentation. Subsidiaries keeps the entity map intact. Journals 2022 then layers historical transaction movement on top of those dimensions. Together, the pack covers both static reference state and dynamic finance activity.',
            'Because the files are in CSV format, they stay portable and easy to validate. Teams can inspect headers, compare record volumes, run import dry-runs, and stage the data into downstream analytics tools without having to reverse engineer a proprietary export format.'
          ]),
          sectionFromDoc('Practical Delivery Value', [
            'Even though the PayZen archive is smaller than the script-heavy projects, it still represents real technical delivery. Migration work demands structure, naming discipline, and enough separation between reference data and transaction data to make reconciliation possible. Those qualities are visible here.',
            'As part of the broader Crowe journey, PayZen widens the experience beyond SuiteScript development into data-oriented problem solving. It shows the ability to handle not just runtime automation, but also the preparation work required when a business needs its historical finance records preserved with integrity.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-payzen-data.html',
      title: 'Data Pack - PayZen NetSuite to Snowflake Data Migration',
      pill: 'Data Explorer',
      strong: 'PayZen NetSuite to Snowflake Data Migration',
      meta: ['Read-Only CSV Explorer', 'Migration Pack', 'Historical Finance Data'],
      lead: 'This explorer presents the live PayZen CSV files in a code-style workspace so the migration pack can be reviewed directly, including the reference tables and the journal history export.',
      actions: [
        { href: 'experience-payzen-overview.html', label: 'Open Overview' },
        { href: 'experience-payzen.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'CSV Pack for Reference and Historical Finance Data',
        copy: 'The workspace focuses on the delivered CSV files exactly as they appear in the project archive. It is a data explorer rather than a script explorer, but the structure is the same: folder tree, file view, and copy support.',
        stats: [
          { label: 'Files', value: '6', sub: 'All delivered CSV files are included' },
          { label: 'Data Type', value: 'CSV', sub: 'Tabular files suitable for migration and validation' },
          { label: 'Explorer Mode', value: 'RO', sub: 'Read-only inspection with copy support' },
          { label: 'Focus', value: 'FIN', sub: 'Reference data and historical journals' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'How to Read the Data Pack',
        copy: 'The files are easiest to understand as a staged finance migration: reference structure first, historical journals second.',
        cards: [
          { title: 'Reference Layer', copy: 'Accounts, departments, locations, and subsidiaries define the dimension map used by transaction history.' },
          { title: 'Time Layer', copy: 'Accounting periods provide the posting windows needed for validation and reconciliation.' },
          { title: 'History Layer', copy: 'Journals 2022 captures the actual movement that the migration must preserve.' }
        ]
      },
      dataFile: 'js/experience-code-data-payzen.js',
      explorerId: 'section-payzen-explorer',
      summaryId: 'section-payzen-summary',
      explorerBox: { sidebarTitle: 'PayZen Data Pack', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing CSV workspace...', status: 'CSV Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/PayZen/Documents',
      selectedFiles: [
        { key: 'accounting-periods', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Accounting Periods.csv'), rel: 'Accounting Periods.csv', section: 'Reference Data', project: 'Accounting Periods' },
        { key: 'accounts', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Accounts.csv'), rel: 'Accounts.csv', section: 'Reference Data', project: 'Accounts' },
        { key: 'departments', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Departments.csv'), rel: 'Departments.csv', section: 'Reference Data', project: 'Departments' },
        { key: 'locations', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Locations.csv'), rel: 'Locations.csv', section: 'Reference Data', project: 'Locations' },
        { key: 'subsidiaries', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Subsidiaries.csv'), rel: 'Subsidiaries.csv', section: 'Reference Data', project: 'Subsidiaries' },
        { key: 'journals', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/PayZen/Documents/Journals 2022.csv'), rel: 'Journals 2022.csv', section: 'Historical Finance Data', project: 'Journals 2022' }
      ]
    }
  },
  {
    slug: 'mcto',
    file: 'experience-mcto.html',
    title: 'M CTO',
    strong: 'Integrations',
    pill: 'Internship Capstone-II · Billable',
    logo: { type: 'image', src: 'images/experience/mctoLogo.jpg', alt: 'M CTO' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['RESTlet Delivery', 'Finance Record Creation', 'Request Object Logging'],
    lead: 'M CTO is a broader integration package centered on RESTlet-led record creation. The source tree shows transaction and master-data routes for Customer, Vendor, Sales Order, Purchase Order, Invoice, Credit Memo, Vendor Bill, Customer Deposit, Vendor Prepayment, and payment flows, all supported by request-object logging and deployment metadata.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'One Integration Package, Many Record Routes',
      copy: 'Compared with Krayden’s enhancement-led structure, M CTO is wider in record coverage. The scripts are oriented around transaction creation, response tracking, and finance-safe request processing.',
      stats: [
        { label: 'Scripts', value: '24', sub: 'RESTlets, user events, helper JSON payloads, and attachment logic' },
        { label: 'Objects', value: '7', sub: 'Deployment records for the RESTlet creation routes' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II billable delivery' },
        { label: 'Mode', value: 'API', sub: 'Inbound integration and transaction creation' }
      ]
    },
    nodes: [
      { label: 'Master Data', title: 'Customer + Vendor', sub: 'Entity creation and pairing routes' },
      { label: 'Transactions', title: 'SO, PO, Invoice, VB, CM', sub: 'Finance document creation' },
      { label: 'Payments', title: 'Deposit, Refund, Vendor Payment', sub: 'Downstream settlement coverage' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Integration Overview', copy: 'A project overview of the record types, request-object logging strategy, and RESTlet-style delivery pattern visible in the M CTO source package.', tags: ['Overview', 'RESTlet Integration', 'Record Creation'], footer: 'Use this page to understand the integration model before opening the live source explorer.', href: 'experience-mcto-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer containing the live transaction-creation scripts, request payload samples, manifest files, and deployment XML from the M CTO package.', tags: ['Scripts Explorer', '24 Scripts', 'Read-Only'], footer: 'Use the explorer to inspect how the record-creation routes are structured and logged.', href: 'experience-mcto-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Integration Surface',
      title: 'Routes Visible in the M CTO Package',
      copy: 'The file names alone show that M CTO is not one narrow integration. It covers entity creation, finance transactions, attachments, and payment-side processing.',
      cards: [
        { title: 'Customer + Vendor', copy: 'Create-customer, create-vendor, and customer-vendor pairing routes are present.' },
        { title: 'Sales + Purchase', copy: 'Sales Order and Purchase Order creation RESTlets are included.' },
        { title: 'Finance Documents', copy: 'Invoice, Vendor Bill, and Credit Memo creation routes widen the surface into finance operations.' },
        { title: 'Payments', copy: 'Deposit, customer payment, refund payment, and vendor payment flows are present.' },
        { title: 'Attachment Support', copy: 'A dedicated attach-PDF helper is included in the live source package.' },
        { title: 'Request Logging', copy: 'Request-object tracking is built directly into the create-invoice flow.' }
      ]
    },
    overview: {
      file: 'experience-mcto-overview.html',
      title: 'Overview - M CTO Integrations',
      pill: 'Project Overview',
      strong: 'M CTO Integrations',
      meta: ['Internship Capstone-II', 'RESTlet-Led Creation', 'Finance + Master Data'],
      lead: 'This overview explains the M CTO source package as a broad inbound integration layer. It focuses on how the package creates records, logs requests and responses, and handles the wider transaction surface inside NetSuite.',
      actions: [
        { href: 'experience-mcto-scripts.html', label: 'Open Scripts Explorer' },
        { href: 'experience-mcto.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Integration Frame',
        title: 'A Transaction-Creation Package, Not a Single Use Case',
        copy: 'The M CTO scripts indicate an integration package that receives structured payloads, maps them into NetSuite records, and persists request/response logs for traceability. That makes it wider than a one-record sync or one-document automation.',
        stats: [
          { label: 'Record Routes', value: '10+', sub: 'Customers, vendors, sales, purchase, invoice, credit, bill, deposit, and payment flows' },
          { label: 'Control Pattern', value: 'REQ', sub: 'Request-object records store payload, response, status, and script ID' },
          { label: 'Delivery Type', value: 'REST', sub: 'RESTlet-led creation with helper setters and safe field handling' },
          { label: 'Package Mode', value: 'SDF', sub: 'Manifest, deploy, SuiteScripts, and object XML are all present' }
        ]
      },
      sidebar: {
        kicker: 'What the Source Signals',
        title: 'The Practical Shape of the Package',
        copy: 'The create-invoice script is the clearest example. It defines field maps, helper setters, request-object creation, response finalization, and input parsing rules. The other files extend that same pattern into additional record families.',
        chips: ['RESTlets', 'Request Object', 'Transaction Creation', 'Finance Operations'],
        list: [
          { label: 'Logging', value: 'Custom request-object records persist input and output status' },
          { label: 'Field Mapping', value: 'Helper functions normalize dates, selects, body fields, and line fields' },
          { label: 'Record Coverage', value: 'Invoice, SO, PO, Vendor Bill, Credit Memo, Payments, Customer, and Vendor' },
          { label: 'Practical Value', value: 'Supports structured inbound integration rather than manual re-entry' }
        ]
      },
      main: {
        kicker: 'Project Narrative',
        title: 'How the M CTO Delivery Works',
        sections: [
          sectionFromDoc('Integration Objective', [
            'M CTO is a transaction-creation integration package. The scripts point to a system where structured external payloads are accepted and transformed into native NetSuite records across multiple finance and master-data types. That is a different delivery pattern from Krayden. Krayden is oriented around cross-system synchronization for a known client data model, while M CTO is oriented around inbound orchestration for many record types.',
            'Because the package spans both entity creation and document creation, the design has to be more defensive. It needs stable helper functions for select fields, date handling, and line construction, otherwise each record route becomes fragile. The create-invoice source shows that those helper abstractions exist.'
          ]),
          sectionFromDoc('Request-Object Control Layer', [
            'One of the strongest practical signals in the source is the custom request-object pattern. Before or during record processing, the package stores the incoming payload, the script identifier, the expected record type, the final response, and a processing status. That is important because integrations fail in real life, and without this trail the team would struggle to debug partial payloads or downstream mapping issues.',
            'That logging layer is also a quality marker. It shows the package was designed for supportability rather than only for a happy-path demo. The integration does not just create records. It leaves behind enough context for triage, replay analysis, and operational follow-up.'
          ]),
          sectionFromDoc('Record-Creation Breadth', [
            'The file set covers Customer, Vendor, Sales Order, Purchase Order, Invoice, Vendor Bill, Credit Memo, Customer Deposit, Vendor Prepayment, refund, and payment behavior. That means the package sits close to the heart of the account’s finance and order operations. The work is broader than one enhancement because each route has different mandatory fields, line handling rules, and downstream dependencies.',
            'From an experience standpoint, M CTO widens the delivery surface significantly. It shows the ability to work on integration mechanics, field mapping, document creation, and finance-side lifecycle logic inside one project family.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-mcto-scripts.html',
      title: 'Scripts - M CTO Integrations',
      pill: 'Code Explorer',
      strong: 'M CTO Integrations',
      meta: ['Read-Only Explorer', 'RESTlet Workspace', 'Finance Record Creation'],
      lead: 'This explorer shows the live M CTO source package with the main RESTlet creation scripts, request payload samples, and the supporting deployment metadata.',
      actions: [
        { href: 'experience-mcto-overview.html', label: 'Open Overview' },
        { href: 'experience-mcto.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the M CTO Integration Package',
        copy: 'The curated file set focuses on the core record-creation routes so the workspace stays readable while still representing the full delivery pattern.',
        stats: [
          { label: 'Selected Files', value: '11', sub: 'RESTlets, payment helpers, JSON payloads, and SDF metadata' },
          { label: 'Route Families', value: '6', sub: 'Customer/vendor, sales, purchase, invoice, vendor bill, and payments' },
          { label: 'Format Mix', value: 'JS + JSON', sub: 'Runtime logic paired with sample request payloads' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Highlights',
        copy: 'The selected files emphasize the central theme of the M CTO project: controlled record creation from structured payloads.',
        cards: [
          { title: 'RESTlet Creation', copy: 'Customer, Sales Order, Purchase Order, Invoice, Vendor Bill, and Credit Memo routes show the creation surface.' },
          { title: 'Payments', copy: 'User events and JSON payloads widen the package into payment-side behavior.' },
          { title: 'Operational Support', copy: 'Attachment logic, manifests, and object XML make the package deployable and supportable.' }
        ]
      },
      dataFile: 'js/experience-code-data-mcto.js',
      explorerId: 'section-mcto-explorer',
      summaryId: 'section-mcto-summary',
      explorerBox: { sidebarTitle: 'M CTO Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing integration workspace...', status: 'RESTlet Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'M CTO Integrations' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'create-customer', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_customer.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_customer.js', section: 'Entity Creation', project: 'Customer Route' },
        { key: 'create-so', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_so.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_so.js', section: 'Sales Documents', project: 'Sales Order Route' },
        { key: 'create-po', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_po.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_po.js', section: 'Purchase Documents', project: 'Purchase Order Route' },
        { key: 'create-invoice', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_invoice.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_invoice.js', section: 'Finance Documents', project: 'Invoice Route' },
        { key: 'create-vb', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_vb.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_vb.js', section: 'Finance Documents', project: 'Vendor Bill Route' },
        { key: 'create-creditmemo', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_create_creditmemo.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_create_creditmemo.js', section: 'Finance Documents', project: 'Credit Memo Route' },
        { key: 'ue-customer-payment', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_ue_customer_payment.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_ue_customer_payment.js', section: 'Payments', project: 'Customer Payment Handling' },
        { key: 'attach-pdf', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_rl_attachPDFToRecord.js'), rel: 'src/FileCabinet/SuiteScripts/c112417_rl_attachPDFToRecord.js', section: 'Supporting Utilities', project: 'Attachment Helper' },
        { key: 'vendor-payment-json', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/FileCabinet/SuiteScripts/c112417_vendorPayment.json'), rel: 'src/FileCabinet/SuiteScripts/c112417_vendorPayment.json', section: 'Sample Payloads', project: 'Vendor Payment Payload' },
        { key: 'create-invoice-xml', path: path.join(SRC_ROOT, 'Internship Capstone-II/Billbale Projects/M CTO/Enhancement-112417(Integrations)/New/src/Objects/customscript_c112417_rl_create_invoice.xml'), rel: 'src/Objects/customscript_c112417_rl_create_invoice.xml', section: 'Object XML', project: 'Invoice RESTlet Deployment' }
      ]
    }
  },
  {
    slug: 'subscription-billing',
    file: 'experience-subscription-billing.html',
    title: 'Subscription Billing',
    strong: 'Internal Product',
    pill: 'Internship Capstone-II · Non-Billable',
    logo: { type: 'image', src: 'images/experience/subscriptionBilling.jpeg', alt: 'Subscription Billing' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['Phase-I Alpha', 'User Event + Map/Reduce', 'Subscription Renewal Flow'],
    lead: 'Subscription Billing automates recurring billing from Sales Orders. The source package shows a user event that creates subscription records from subscription-marked lines, a map/reduce that groups due subscriptions into invoices, and a helper library that calculates next billing dates from frequency records.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Recurring Billing Built on Sales Orders and Custom Records',
      copy: 'The project turns one-time order entry into an ongoing billing process. It combines line-level subscription detection, custom record creation, grouped invoice generation, and date math driven by a frequency table.',
      stats: [
        { label: 'Scripts', value: '4', sub: 'User event, map/reduce, helper library, and UI helper' },
        { label: 'JSON Files', value: '4', sub: 'Context and grouped data snapshots in the workspace' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II internal product work' },
        { label: 'Runtime', value: 'SB', sub: 'Subscription record creation and renewal invoicing' }
      ]
    },
    nodes: [
      { label: 'Step 01', title: 'Sales Order Create', sub: 'Detect subscription lines and create custom records' },
      { label: 'Step 02', title: 'Frequency Logic', sub: 'Calculate next billing dates from the frequency table' },
      { label: 'Step 03', title: 'Renewal Invoice', sub: 'Group due subscriptions and transform into invoices' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Technical Overview', copy: 'A structured review of the subscription billing workflow built from the project report and the live user event, map/reduce, and helper files in the archive.', tags: ['Technical Overview', 'Subscription Records', 'Recurring Invoices'], footer: 'Open this page first to understand the end-to-end recurring billing flow.', href: 'experience-subscription-billing-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer of the live Subscription Billing package, including the core scripts, helper library, and JSON artefacts used during development and testing.', tags: ['Scripts Explorer', 'User Event + MR', 'Read-Only'], footer: 'Open the explorer to inspect the actual recurring-billing implementation surface.', href: 'experience-subscription-billing-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Runtime Surface',
      title: 'What the Subscription Billing Package Does',
      copy: 'The project is compact but coherent: it creates subscription records from order lines, computes renewal dates, and produces invoices automatically when a subscription is due.',
      cards: [
        { title: 'User Event', copy: 'Reads subscription-marked order lines and creates custom subscription records.' },
        { title: 'Frequency Library', copy: 'Looks up frequency records and computes the next billing date.' },
        { title: 'Map/Reduce', copy: 'Groups due subscriptions and creates one invoice per customer + order + next date.' },
        { title: 'Grouped JSON', copy: 'Development JSON artefacts show the grouping and context used while building the logic.' },
        { title: 'Custom Record', copy: 'The subscription record becomes the durable state holder for renewal flow.' },
        { title: 'Business Value', copy: 'Removes repeated manual renewal-order creation and standardizes billing cadence.' }
      ]
    },
    overview: {
      file: 'experience-subscription-billing-overview.html',
      title: 'Overview - Subscription Billing Automation',
      pill: 'Technical Overview',
      strong: 'Subscription Billing Automation',
      meta: ['Internship Capstone-II', 'Subscription Records', 'Recurring Invoice Automation'],
      lead: 'This overview is built from the project report and the live scripts in the package. It explains how one Sales Order turns into a durable subscription state and then into renewal invoices on the correct cadence.',
      actions: [
        { href: docs.subscriptionBilling, label: 'Download Technical Doc' },
        { href: 'experience-subscription-billing-scripts.html', label: 'Open Scripts Explorer' }
      ],
      panel: {
        kicker: 'Automation Frame',
        title: 'Recurring Billing With Clear State Between Runs',
        copy: 'The key architectural decision in Subscription Billing is to persist each subscription line into a custom record with its own next date. That creates a stable state layer between order entry and invoice generation.',
        stats: [
          { label: 'Core Scripts', value: '3', sub: 'UE create subscriptions, MR create invoice, and frequency library' },
          { label: 'State Holder', value: 'SUB', sub: 'Custom subscription record carries start, end, rate, quantity, and next date' },
          { label: 'Grouping Rule', value: 'C+SO+ND', sub: 'Invoices are grouped by customer, sales order, and next date' },
          { label: 'Business Goal', value: 'AUTO', sub: 'Reduce manual renewal-order creation and renewal invoicing work' }
        ]
      },
      sidebar: {
        kicker: 'From the Report',
        title: 'What the Package Covers',
        copy: 'The report and the scripts line up closely. The user event creates subscriptions. The map/reduce bills due subscriptions. The helper library computes the next dates using frequency metadata.',
        chips: ['Sales Order Trigger', 'Custom Subscription Record', 'Map/Reduce Billing', 'Frequency Logic'],
        list: [
          { label: 'Input Record', value: 'Sales Order with subscription-marked item lines' },
          { label: 'State Layer', value: 'customrecord_crowe_subscription with next billing date' },
          { label: 'Billing Run', value: 'Due subscriptions are grouped and transformed into invoices' },
          { label: 'Write Back', value: 'Dates advance after successful invoice creation' }
        ]
      },
      main: {
        kicker: 'Technical Narrative',
        title: 'How the Subscription Billing Automation Works',
        sections: [
          sectionFromDoc('Business Problem', [
            'The report makes the original problem simple: the business needed a way to let customers order once and then continue to receive invoices on a subscription basis without recreating renewal orders manually. Manual recurrence handling is slow, easy to mis-time, and fragile when quantities or frequencies vary across item lines.',
            'The project solves that by separating order entry from renewal execution. The Sales Order becomes the origin point, but the ongoing billing logic is carried by a custom subscription record that persists the relevant fields and next billing date.'
          ]),
          sectionFromDoc('Technical Flow', [
            'The user event runs when the Sales Order is created or edited. It inspects each line, checks whether the subscription flag is set, and then creates a custom subscription record for every qualifying line. That record stores the customer, item, frequency, start date, end date, rate, quantity, amount, originating order, and computed next date.',
            'The frequency library provides the date math. It looks up a frequency record, reads month and day offsets, and calculates the next billing date. That keeps the cadence logic centralized instead of hardcoding frequency rules into the user event or map/reduce.'
          ]),
          sectionFromDoc('Renewal Invoice Generation', [
            'The map/reduce then finds all due, active subscriptions, groups them by customer, originating Sales Order, and next date, and creates one invoice per group. That grouping rule matters because it keeps invoices aligned to the subscription state that actually became due together, rather than generating one invoice per line or one invoice across unrelated dates.',
            'After a successful invoice save, the script writes back to the subscription records and advances the subscription dates. That completes the loop and turns the package into a real recurring-billing engine rather than a one-time document generator.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-subscription-billing-scripts.html',
      title: 'Scripts - Subscription Billing Automation',
      pill: 'Code Explorer',
      strong: 'Subscription Billing Automation',
      meta: ['Read-Only Explorer', 'User Event + Map/Reduce', 'Recurring Billing Source'],
      lead: 'This explorer shows the live Subscription Billing source package, including the user event that creates subscriptions, the map/reduce that generates invoices, the helper library, and the JSON artefacts used during development.',
      actions: [
        { href: 'experience-subscription-billing-overview.html', label: 'Open Overview' },
        { href: 'experience-subscription-billing.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the Subscription Billing Package',
        copy: 'The explorer focuses on the source files that best explain how the recurring billing flow works from Sales Order trigger to renewal invoice output.',
        stats: [
          { label: 'Selected Files', value: '8', sub: 'Core scripts plus JSON artefacts that explain the workflow' },
          { label: 'Runtime Shape', value: 'UE + MR', sub: 'Trigger-based record creation paired with scheduled invoice generation' },
          { label: 'Helper Layer', value: '1', sub: 'A dedicated date-calculation library drives the next-billing cadence' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What to Inspect First',
        copy: 'The user event, map/reduce, and frequency library are the clearest path through the package. The JSON files then make the grouping and context data more concrete.',
        cards: [
          { title: 'User Event', copy: 'Creates the subscription records from Sales Order item lines.' },
          { title: 'Map/Reduce', copy: 'Finds due subscriptions, groups them, and creates invoices.' },
          { title: 'Frequency Library', copy: 'Calculates future billing dates from the frequency record.' }
        ]
      },
      dataFile: 'js/experience-code-data-subscription-billing.js',
      explorerId: 'section-subscription-explorer',
      summaryId: 'section-subscription-summary',
      explorerBox: { sidebarTitle: 'Subscription Billing', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing recurring billing workspace...', status: 'Subscription Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Non-Billable Projects/Product-1/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'Subscription Billing' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'subscription-ue', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C115732_CROWE_NS_UE CREATE_SUBSCRIPTIONS.js'), rel: 'src/FileCabinet/SuiteScripts/C115732_CROWE_NS_UE CREATE_SUBSCRIPTIONS.js', section: 'Subscription Runtime', project: 'Sales Order Trigger' },
        { key: 'subscription-mr', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C115732_CROWE_NS_MR_CREATE_INVOICE_SB.js'), rel: 'src/FileCabinet/SuiteScripts/C115732_CROWE_NS_MR_CREATE_INVOICE_SB.js', section: 'Subscription Runtime', project: 'Invoice Generation' },
        { key: 'library', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/library@manu.js'), rel: 'src/FileCabinet/SuiteScripts/library@manu.js', section: 'Helper Library', project: 'Frequency Date Logic' },
        { key: 'clear-field', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/CSS CS clear_custField.js'), rel: 'src/FileCabinet/SuiteScripts/CSS CS clear_custField.js', section: 'UI Helper', project: 'Field Helper' },
        { key: 'grouped-object', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/GroupedObject.json'), rel: 'src/FileCabinet/SuiteScripts/GroupedObject.json', section: 'Development Artefacts', project: 'Grouped Output Sample' },
        { key: 'context-object', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/contextObject.json'), rel: 'src/FileCabinet/SuiteScripts/contextObject.json', section: 'Development Artefacts', project: 'Context Sample' }
      ]
    }
  },
  {
    slug: 'custom-invoice-automation',
    file: 'experience-custom-invoice-automation.html',
    title: 'Custom Invoice Automation',
    strong: 'Internal Product',
    pill: 'Internship Capstone-II · Non-Billable',
    logo: { type: 'image', src: 'images/experience/customInvoiceBilling.jpeg', alt: 'Custom Invoice Automation' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['Phase-I Gamma', 'Validation Before Invoicing', 'Invoice + Bill Creation'],
    lead: 'Custom Invoice Automation is a gate-and-generate product package. The workspace contains a validation-before-invoicing map/reduce, an invoice-creation map/reduce, and a bill-creation map/reduce that together validate custom invoice or bill records against upstream orders before turning them into real transaction documents.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Validation First, Transaction Creation Second',
      copy: 'The package has a clean separation of responsibilities: validate what should be invoiced or billed, then generate the downstream transaction only after the quantities, items, and customer or vendor align correctly.',
      stats: [
        { label: 'Core Scripts', value: '4', sub: 'Two validation flows and two transaction-creation flows' },
        { label: 'JSON Files', value: '6', sub: 'Development snapshots for context and grouped results' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II internal product work' },
        { label: 'Runtime', value: 'V+G', sub: 'Validation-first gate before invoice and bill creation' }
      ]
    },
    nodes: [
      { label: 'Gate 01', title: 'Validate CIR', sub: 'Ensure item, quantity, and customer align to SO' },
      { label: 'Action 02', title: 'Create Invoice', sub: 'Group invoiceable records and transform SO -> Invoice' },
      { label: 'Action 03', title: 'Create Bill', sub: 'Mirror the same pattern for purchase-side bill creation' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Technical Overview', copy: 'A combined overview of the validation-before-invoicing flow and the downstream invoice and bill creation scripts, built from the report and the source package.', tags: ['Technical Overview', 'Validation Gate', 'Invoice + Bill'], footer: 'Open this page to understand how the package prevents bad billing before it generates transactions.', href: 'experience-custom-invoice-automation-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer containing the validation map/reduce, invoice-creation map/reduce, bill-creation map/reduce, and the JSON snapshots used during development.', tags: ['Scripts Explorer', 'MR Workflow', 'Read-Only'], footer: 'Open the explorer to inspect the actual gating and generation logic.', href: 'experience-custom-invoice-automation-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Runtime Surface',
      title: 'What the Custom Invoice Automation Package Covers',
      copy: 'The package ties together multiple batch processes so bad inputs are filtered out before the platform creates downstream finance documents.',
      cards: [
        { title: 'CIR Validation', copy: 'Checks Sales Order, Item, Quantity, and Customer alignment before marking records invoiceable.' },
        { title: 'Create Invoice', copy: 'Transforms Sales Order -> Invoice and keeps only the grouped item lines requested.' },
        { title: 'Create Bill', copy: 'Extends the same grouped-generation pattern to purchase-side bill creation.' },
        { title: 'Grouped Logic', copy: 'Records are grouped by customer/vendor, source order, and transaction date.' },
        { title: 'JSON Snapshots', copy: 'Context JSON files reveal the development and test structures behind the scripts.' },
        { title: 'Business Value', copy: 'Prevents over-billing and mismatched finance documents before they happen.' }
      ]
    },
    overview: {
      file: 'experience-custom-invoice-automation-overview.html',
      title: 'Overview - Custom Invoice Automation',
      pill: 'Technical Overview',
      strong: 'Custom Invoice Automation',
      meta: ['Internship Capstone-II', 'Validation-First Billing', 'Invoice + Bill Automation'],
      lead: 'This overview explains how the Gamma package uses validation as a gate before finance document creation. It is based on the report and the live map/reduce scripts in the project workspace.',
      actions: [
        { href: docs.invoicing, label: 'Download Technical Doc' },
        { href: 'experience-custom-invoice-automation-scripts.html', label: 'Open Scripts Explorer' }
      ],
      panel: {
        kicker: 'Automation Frame',
        title: 'Finance Documents Created Only After Data Passes the Gate',
        copy: 'The strongest design choice in this project is sequencing. Validation runs first to confirm item, quantity, and customer or vendor agreement. Only then does the create-invoice or create-bill process run.',
        stats: [
          { label: 'Validation Rule', value: 'SO||Item', sub: 'CIR groups are checked against the actual Sales Order line quantities' },
          { label: 'Grouping Rule', value: 'Cust||SO||Date', sub: 'Invoice creation groups records by customer, source order, and target invoice date' },
          { label: 'Purchase Mirror', value: 'Vend||PO||Date', sub: 'Bill creation mirrors the same pattern on the purchase side' },
          { label: 'Business Goal', value: 'SAFE', sub: 'Reduce over-billing, mismatched documents, and downstream reversals' }
        ]
      },
      sidebar: {
        kicker: 'From the Report',
        title: 'What the Package Actually Does',
        copy: 'The report breaks the package into two clear responsibilities: validating invoiceability and then generating finance documents from approved grouped records.',
        chips: ['Validation Gate', 'MR Workflow', 'Partial Quantities', 'Write-Back Linkage'],
        list: [
          { label: 'Input Record', value: 'Custom Invoice Record / Custom Bill Record' },
          { label: 'Validation', value: 'Checks quantity, item existence, and customer match against source orders' },
          { label: 'Generation', value: 'Transforms source orders and trims lines to grouped requested quantities' },
          { label: 'Write Back', value: 'Links created transactions and clears the invoiceable/billable state' }
        ]
      },
      main: {
        kicker: 'Technical Narrative',
        title: 'How the Gamma Package is Structured',
        sections: [
          sectionFromDoc('Why the Validation Gate Exists', [
            'The report is clear about the business problem: teams needed a reliable way to make sure only legitimate invoice candidates proceed into invoicing. Without that gate, custom records could overstate quantities, reference missing items, or carry a customer mismatch against the Sales Order. Any of those conditions would create billing risk and downstream rework.',
            'The validation map/reduce handles that by grouping custom invoice records by Sales Order and Item, summing the custom quantities, and comparing those values against the actual Sales Order line quantities. Only records that pass the item, quantity, and customer checks are marked invoiceable.'
          ]),
          sectionFromDoc('Invoice Creation Flow', [
            'Once records are marked invoiceable, the create-invoice map/reduce groups them by Customer, Sales Order, and Invoice Date. It then transforms the Sales Order into an Invoice and removes any lines that do not belong to the grouped request. Requested quantities are applied carefully so the final invoice reflects only the approved grouped slice of the Sales Order.',
            'That is the right implementation detail for partial billing because it avoids the common mistake of cloning the full order and then asking users to trim it manually. The script performs that shaping automatically and writes the created Invoice back to the source records.'
          ]),
          sectionFromDoc('Purchase-Side Symmetry', [
            'The package does not stop at invoice creation. It includes a create-bill process that mirrors the same grouped-generation idea for purchase-side records. That symmetry matters because it turns the project into a broader finance-document automation package rather than one narrowly scoped sales-side script.',
            'Taken together, the Gamma package represents a disciplined internal product: validate first, generate second, and leave behind clear linkage so the created transactions remain auditable against their originating custom records.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-custom-invoice-automation-scripts.html',
      title: 'Scripts - Custom Invoice Automation',
      pill: 'Code Explorer',
      strong: 'Custom Invoice Automation',
      meta: ['Read-Only Explorer', 'Validation + Generation', 'Map/Reduce Workspace'],
      lead: 'This explorer contains the live Gamma source package, including the validation-before-invoicing logic, create-invoice flow, create-bill flow, and the JSON artefacts used to inspect grouped results during development.',
      actions: [
        { href: 'experience-custom-invoice-automation-overview.html', label: 'Open Overview' },
        { href: 'experience-custom-invoice-automation.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the Gamma Package',
        copy: 'The selected files are enough to show the gating model, the transaction-creation model, and the data snapshots that supported development and debugging.',
        stats: [
          { label: 'Selected Files', value: '8', sub: 'Validation scripts, generation scripts, and JSON artefacts' },
          { label: 'Execution Mode', value: 'MR', sub: 'Map/Reduce is the dominant pattern across the package' },
          { label: 'Workspace Mode', value: 'SDF', sub: 'Manifest, deploy metadata, and file-cabinet scripts' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Shows Clearly',
        copy: 'The source files make the package easy to read as a two-stage finance workflow: validate records, then create documents.',
        cards: [
          { title: 'Validation', copy: 'The validation map/reduce marks only safe custom invoice records as invoiceable.' },
          { title: 'Invoice Creation', copy: 'The invoice map/reduce transforms Sales Orders and keeps only the requested grouped lines.' },
          { title: 'Bill Creation', copy: 'The bill map/reduce mirrors the same grouped-generation pattern for purchase-side documents.' }
        ]
      },
      dataFile: 'js/experience-code-data-custom-invoice-automation.js',
      explorerId: 'section-gamma-explorer',
      summaryId: 'section-gamma-summary',
      explorerBox: { sidebarTitle: 'Gamma Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing validation workspace...', status: 'Gamma Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Non-Billable Projects/Product-2/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'Custom Invoice Automation' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'validation-invoicing', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/CSS MR valdiationsBeforeInvoicing.js'), rel: 'src/FileCabinet/SuiteScripts/CSS MR valdiationsBeforeInvoicing.js', section: 'Validation Layer', project: 'Invoice Validation' },
        { key: 'validation-billing', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/CSS MR validationsBeforeBilling.js'), rel: 'src/FileCabinet/SuiteScripts/CSS MR validationsBeforeBilling.js', section: 'Validation Layer', project: 'Bill Validation' },
        { key: 'create-invoice', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/CSS MR createInvoice.js'), rel: 'src/FileCabinet/SuiteScripts/CSS MR createInvoice.js', section: 'Generation Layer', project: 'Invoice Creation' },
        { key: 'create-bill', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/CSS MR createBill.js'), rel: 'src/FileCabinet/SuiteScripts/CSS MR createBill.js', section: 'Generation Layer', project: 'Bill Creation' },
        { key: 'final-array', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/finalArray.json'), rel: 'src/FileCabinet/SuiteScripts/finalArray.json', section: 'Development Artefacts', project: 'Grouped Result Sample' },
        { key: 'reduce-context', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/ReduceContext.json'), rel: 'src/FileCabinet/SuiteScripts/ReduceContext.json', section: 'Development Artefacts', project: 'Reduce Context Sample' }
      ]
    }
  },
  {
    slug: 'bulk-emailing',
    file: 'experience-bulk-emailing.html',
    title: 'Bulk Emailing',
    strong: 'Internal Product',
    pill: 'Internship Capstone-II · Non-Billable',
    logo: { type: 'image', src: 'images/experience/bulkEmailing.jpeg', alt: 'Bulk Emailing' },
    track: 'Internship Capstone-II',
    back: 'experience-capstone-ii.html',
    meta: ['Phase-I Lambda', 'Suitelet + Client + Map/Reduce', 'High-Volume Transaction Emailing'],
    lead: 'Bulk Emailing automates high-volume emailing of NetSuite transactions from one filterable page. The package combines a Suitelet for search and paging, a client script for selection persistence and Mark All behavior, and a map/reduce that composes recipients, generates or selects attachments, and sends the emails asynchronously.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'User Interface, State Persistence, and Batch Sending in One Package',
      copy: 'The strength of this project is not one isolated script. It is the way the Suitelet, client script, and map/reduce cooperate so a user can search, page, mark all, preserve selections, and still offload the actual send to asynchronous processing.',
      stats: [
        { label: 'Core Scripts', value: '3', sub: 'Client Script, Suitelet, and Map/Reduce' },
        { label: 'Report Docs', value: '2', sub: 'Bulk Emailing report and Suitelet-focused supporting document' },
        { label: 'Track', value: 'II', sub: 'Internship Capstone-II internal product work' },
        { label: 'Runtime', value: 'BULK', sub: 'High-volume transaction emailing with attachment control' }
      ]
    },
    nodes: [
      { label: 'UI Layer', title: 'Suitelet Search Page', sub: 'Filters, paging, and the transaction list' },
      { label: 'State Layer', title: 'Client Script', sub: 'Mark All, pagination, and selection persistence' },
      { label: 'Send Layer', title: 'Map/Reduce', sub: 'Recipients, templates, attachments, and send status' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Technical Overview', copy: 'A structured explanation of the Bulk Emailing product using the project report and the live Suitelet, client, and map/reduce source files.', tags: ['Technical Overview', 'Suitelet UI', 'Batch Emailing'], footer: 'Open this page to understand the UI, state, and email-send layers as one product flow.', href: 'experience-bulk-emailing-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer containing the live Suitelet, client script, and map/reduce files that implement the bulk-emailing flow.', tags: ['Scripts Explorer', '3 Core Scripts', 'Read-Only'], footer: 'Open the explorer to inspect the actual implementation used to drive the bulk-emailing product.', href: 'experience-bulk-emailing-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Runtime Surface',
      title: 'What the Bulk Emailing Package Handles',
      copy: 'The package covers a complete batch-emailing workflow from UI filtering and selection persistence to attachment generation and status updates.',
      cards: [
        { title: 'Suitelet', copy: 'Builds the Process Bulk Email page with filters, paging, and search results.' },
        { title: 'Client Script', copy: 'Persists selections, supports Mark All across pages, and manages UX behavior.' },
        { title: 'Map/Reduce', copy: 'Groups work, composes recipients, attaches PDFs, and sends emails asynchronously.' },
        { title: 'Templates', copy: 'Email template selection changes by transaction type and invoice subtype.' },
        { title: 'Attachments', copy: 'Supports manual attachments or generated PDFs depending on transaction context.' },
        { title: 'Status Control', copy: 'Updates Bulk Email Status so already-sent records stay out of future runs.' }
      ]
    },
    overview: {
      file: 'experience-bulk-emailing-overview.html',
      title: 'Overview - Bulk Emailing',
      pill: 'Technical Overview',
      strong: 'Bulk Emailing',
      meta: ['Internship Capstone-II', 'Suitelet Product', 'Batch Transaction Emailing'],
      lead: 'This overview is based on the Bulk Emailing report and the live source package. It explains how the product combines UI filtering, user-state persistence, and asynchronous send processing to handle high-volume transaction emailing safely.',
      actions: [
        { href: docs.bulkEmailing, label: 'Download Technical Doc' },
        { href: 'experience-bulk-emailing-scripts.html', label: 'Open Scripts Explorer' }
      ],
      panel: {
        kicker: 'Product Frame',
        title: 'The Real Work is in the Coordination',
        copy: 'Bulk Emailing is not complicated because it sends an email. It is complicated because it preserves user intent across pages, handles Mark All across full result sets, chooses the right template, and resolves the correct attachment strategy before sending.',
        stats: [
          { label: 'Architecture', value: '3', sub: 'Suitelet, client script, and map/reduce work as one product' },
          { label: 'Selection Mode', value: 'ALL', sub: 'Supports Mark All across filtered result sets, not just one visible page' },
          { label: 'Attachment Paths', value: '2', sub: 'Manual file attach or generated PDF fallback' },
          { label: 'Business Goal', value: 'FAST', sub: 'Send large transaction sets with better traceability and fewer misses' }
        ]
      },
      sidebar: {
        kicker: 'From the Report',
        title: 'The Core Product Decisions',
        copy: 'The report makes the design clear: the user experience layer and the send-processing layer are intentionally separated so the interface stays responsive while the actual emailing runs asynchronously.',
        chips: ['Suitelet UI', 'Selection Persistence', 'Asynchronous Send', 'Attachment Logic'],
        list: [
          { label: 'Entry Point', value: 'Process Bulk Email Suitelet with filters and paging' },
          { label: 'Selection Memory', value: 'Per-user selection persistence survives page navigation and Mark All flows' },
          { label: 'Email Composition', value: 'Template selection changes by transaction type and subtype' },
          { label: 'Status Write Back', value: 'Sent transactions are marked and filtered out next time' }
        ]
      },
      main: {
        kicker: 'Technical Narrative',
        title: 'How the Bulk Emailing Product Works',
        sections: [
          sectionFromDoc('User Interface Layer', [
            'The Suitelet builds the entire operational surface: filters for transaction type, date range, subsidiary, customer or vendor, analyst, and payment style, plus a paged results list that users can inspect before sending. That matters because the bulk-emailing problem starts with finding the right transactions, not with email transmission itself.',
            'The page is designed for operational use rather than one-off demos. The report calls out 50-row pagination, Search and Refresh controls, and a Mark All flow that extends across the full filtered result set, not just the current page.'
          ]),
          sectionFromDoc('State Persistence and User Intent', [
            'The client script is the stabilizing layer. It keeps track of what the user has selected, what has been manually unchecked, and how those choices should survive pagination or Mark All behavior. That is a subtle but important part of the design because batch-emailing tools become unreliable if they lose state as users move between result pages.',
            'By preserving the selected IDs per user, the package turns a potentially fragile list page into a usable operational tool. Users can search broadly, narrow the result set, move between pages, and still trust that the final send request matches what they intended to send.'
          ]),
          sectionFromDoc('Batch Sending and Attachment Logic', [
            'The map/reduce performs the actual dispatch. It groups the records, assembles recipients and CC rules, selects the correct email template by transaction type and invoice subtype, and then resolves whether to use a manual attachment or a system-generated PDF. That is what makes the package practical in real finance operations rather than merely technical.',
            'The send step also updates the transaction’s Bulk Email Status so future runs stay clean. In other words, the project does not just send email; it manages operational state before, during, and after the send process.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-bulk-emailing-scripts.html',
      title: 'Scripts - Bulk Emailing',
      pill: 'Code Explorer',
      strong: 'Bulk Emailing',
      meta: ['Read-Only Explorer', 'Suitelet + Client + MR', 'Batch Email Product'],
      lead: 'This explorer contains the live Bulk Emailing source package, including the Suitelet, client script, and map/reduce that together power the operational emailing workflow.',
      actions: [
        { href: 'experience-bulk-emailing-overview.html', label: 'Open Overview' },
        { href: 'experience-bulk-emailing.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the Bulk Emailing Package',
        copy: 'The explorer includes the three core runtime files plus the standard SDF metadata so the product can be understood as one deployable package.',
        stats: [
          { label: 'Selected Files', value: '5', sub: 'Three runtime scripts plus manifest and config' },
          { label: 'Execution Shape', value: 'UI + MR', sub: 'Interactive selection in the UI, asynchronous send in map/reduce' },
          { label: 'Key Script', value: 'SL', sub: 'The Suitelet defines the operational surface of the product' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Proves',
        copy: 'The three core files are enough to show that Bulk Emailing is a coordinated product, not a single email-sending script.',
        cards: [
          { title: 'Client Script', copy: 'Handles field changes, page init, selection persistence, and the Mark All behavior.' },
          { title: 'Suitelet', copy: 'Builds the UI, filters, paging logic, and the submit path into map/reduce.' },
          { title: 'Map/Reduce', copy: 'Processes the final send request and handles recipients, templates, and attachments.' }
        ]
      },
      dataFile: 'js/experience-code-data-bulk-emailing.js',
      explorerId: 'section-bulk-explorer',
      summaryId: 'section-bulk-summary',
      explorerBox: { sidebarTitle: 'Bulk Emailing', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing batch-emailing workspace...', status: 'Bulk Email Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New')],
      displayRoot: 'Projects-Crowe Howarth/Internship Capstone-II/Non-Billable Projects/Product-3/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'Bulk Emailing' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'client-script', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New/src/FileCabinet/SuiteScripts/C115742_CS_BULK_EMAILING.js'), rel: 'src/FileCabinet/SuiteScripts/C115742_CS_BULK_EMAILING.js', section: 'UI State Layer', project: 'Client Script' },
        { key: 'suitelet', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New/src/FileCabinet/SuiteScripts/C115742_CROWE_NS_SL BULK_EMAIL_PROCESS.js'), rel: 'src/FileCabinet/SuiteScripts/C115742_CROWE_NS_SL BULK_EMAIL_PROCESS.js', section: 'UI Search Layer', project: 'Suitelet' },
        { key: 'map-reduce', path: path.join(SRC_ROOT, 'Internship Capstone-II/Non-Billable Projects/Product-3/New/src/FileCabinet/SuiteScripts/C115742_CROWE_NS_MR_BULK EMAIL PROCESS.js'), rel: 'src/FileCabinet/SuiteScripts/C115742_CROWE_NS_MR_BULK EMAIL PROCESS.js', section: 'Send Layer', project: 'Map/Reduce' }
      ]
    }
  },
  {
    slug: 'bentham',
    file: 'experience-bentham.html',
    title: 'Bentham Science',
    strong: 'Custom Invoice Automation',
    pill: 'CRW-I · Billable',
    logo: { type: 'image', src: 'images/experience/benthamScienceLogo.png', alt: 'Bentham Science' },
    track: 'CRW-I',
    back: 'experience-crw-i.html',
    meta: ['Custom Invoice Records', 'Invoice + Payment Generation', 'Map/Reduce Delivery'],
    lead: 'Bentham Science is a billable finance-automation package built around custom invoice data. The source tree contains scripts that create custom invoice records and then generate invoices and payments from those records, supported by JSON snapshots and standard SDF deployment files.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Custom Finance Data Turned Into Live Transactions',
      copy: 'The package is small in file count but strong in workflow intent. It reads from custom invoice record structures, processes approved records, and generates live transactions while tracking errors along the way.',
      stats: [
        { label: 'Scripts', value: '2', sub: 'Two main map/reduce scripts drive the workflow' },
        { label: 'JSON Support', value: '1', sub: 'invoice_details.json provides line-level custom invoice context' },
        { label: 'Track', value: 'CRW-I', sub: 'Billable client delivery inside the full-time phase' },
        { label: 'Mode', value: 'FIN', sub: 'Finance-document automation from custom records' }
      ]
    },
    nodes: [
      { label: 'Step 01', title: 'Custom Data Intake', sub: 'Read custom invoice header and line structures' },
      { label: 'Step 02', title: 'Invoice Build', sub: 'Generate invoice records from approved custom data' },
      { label: 'Step 03', title: 'Payment Flow', sub: 'Support payment generation from the same data model' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'Automation Overview', copy: 'A project overview built from the main Bentham scripts, showing how custom invoice records are turned into invoices and payments inside NetSuite.', tags: ['Automation Overview', 'Custom Records', 'Invoice + Payment'], footer: 'Open this page first to understand the workflow before reading the code.', href: 'experience-bentham-overview.html', cta: 'Open Overview' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer containing the two Bentham automation scripts, JSON samples, and the SDF metadata that packages the deployment.', tags: ['Scripts Explorer', 'Finance Automation', 'Read-Only'], footer: 'Open the explorer to inspect the actual automation routes and JSON samples.', href: 'experience-bentham-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Runtime Surface',
      title: 'What the Bentham Package Covers',
      copy: 'The Bentham workspace is lean, but it still shows a full finance-automation pattern from custom data intake to transaction creation.',
      cards: [
        { title: 'Create Custom Invoice Record', copy: 'Generates or structures the custom invoice-side state before final transaction creation.' },
        { title: 'Create Invoice Record', copy: 'Creates invoices and payments from approved custom invoice inputs.' },
        { title: 'invoice_details.json', copy: 'Representative custom invoice-detail data used by the runtime scripts.' },
        { title: 'Manifest + Deploy', copy: 'SDF metadata packages the automation for deployment.' },
        { title: 'Business Value', copy: 'Reduces manual finance processing against custom invoice data structures.' }
      ]
    },
    overview: {
      file: 'experience-bentham-overview.html',
      title: 'Overview - Bentham Science Custom Invoice Automation',
      pill: 'Project Overview',
      strong: 'Bentham Science Custom Invoice Automation',
      meta: ['CRW-I', 'Custom Invoice Records', 'Finance Automation'],
      lead: 'This overview explains the Bentham Science project as a finance-automation package built on custom invoice data. It is derived from the live scripts and JSON samples in the source workspace.',
      actions: [
        { href: 'experience-bentham-scripts.html', label: 'Open Scripts Explorer' },
        { href: 'experience-bentham.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Automation Frame',
        title: 'Custom Record State Before Transaction State',
        copy: 'The script names and field structures show a staged process: custom invoice records are created or processed first, then invoice and payment transactions are generated downstream.',
        stats: [
          { label: 'Primary Scripts', value: '2', sub: 'Custom invoice record creation and invoice/payment creation' },
          { label: 'Input Shape', value: 'CIR', sub: 'Custom invoice headers and custom invoice lines drive the runtime' },
          { label: 'Output Shape', value: 'INV/PAY', sub: 'Invoice and payment transactions are the final finance outputs' },
          { label: 'Business Goal', value: 'AUTO', sub: 'Reduce manual creation work against a custom billing model' }
        ]
      },
      sidebar: {
        kicker: 'What the Source Indicates',
        title: 'A Lean But Coherent Workflow',
        copy: 'Even without a separate FDD or technical document, the source package shows the main business intent clearly: transform custom invoice data into production finance records while surfacing errors during processing.',
        chips: ['Custom Record Flow', 'Map/Reduce', 'Invoice + Payment', 'JSON Samples'],
        list: [
          { label: 'Upstream State', value: 'Custom invoice headers and line records' },
          { label: 'Processing Gate', value: 'Approved records with no error state move forward' },
          { label: 'Downstream Output', value: 'Invoice and payment transactions are created from the approved data' },
          { label: 'Debug Support', value: 'JSON samples help explain the before/after data state' }
        ]
      },
      main: {
        kicker: 'Project Narrative',
        title: 'How the Bentham Automation Reads',
        sections: [
          sectionFromDoc('Workflow Shape', [
            'The Bentham package is a finance-automation workflow built around custom invoice data structures. The two main scripts show a staged pattern: first create or shape the custom invoice record state, then use that state to generate downstream invoice and payment records. That indicates the source business process is not standard NetSuite billing from sales orders, but a custom billing model that still needs to produce native finance transactions at the end.',
            'The getInputData and map logic in the invoice-creation script reinforces that. It searches custom invoice header records, filters out errored or already-processed cases, and then works through the associated line-level custom records to build the final transaction outcome.'
          ]),
          sectionFromDoc('Why the Custom Layer Matters', [
            'Custom record based billing usually exists because the source business process does not align cleanly with one standard NetSuite transaction. In Bentham, the package appears to solve exactly that problem. It allows the business to model invoice detail in a custom layer first, then standardize the final invoice and payment creation once the data is ready.',
            'That is a useful delivery pattern because it creates an explicit staging layer where approvals, error messages, and transformation rules can live without corrupting live transaction records prematurely.'
          ]),
          sectionFromDoc('Implementation Signals', [
            'Although the package is smaller than some other projects in this archive, the signals are still strong: structured search input, processing against custom records, explicit error filtering, and JSON samples for the data state. Those are the same kinds of signals you want in an internal finance-automation package because they make debugging and controlled rollout practical.',
            'As part of the broader experience track, Bentham shows movement deeper into business-process ownership. The value here is not just code volume. It is the ability to turn a bespoke finance workflow into a repeatable NetSuite automation.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-bentham-scripts.html',
      title: 'Scripts - Bentham Science Custom Invoice Automation',
      pill: 'Code Explorer',
      strong: 'Bentham Science Custom Invoice Automation',
      meta: ['Read-Only Explorer', 'Finance Automation Workspace', 'Custom Invoice Records'],
      lead: 'This explorer contains the main Bentham source files and sample JSON artefacts, showing the package that turns custom invoice data into invoices and payments.',
      actions: [
        { href: 'experience-bentham-overview.html', label: 'Open Overview' },
        { href: 'experience-bentham.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the Bentham Package',
        copy: 'The explorer includes the main runtime scripts, the invoice-details JSON, and SDF metadata. That is enough to understand the whole workflow without padding the workspace with placeholder files.',
        stats: [
          { label: 'Selected Files', value: '5', sub: 'Two automation scripts, one JSON detail file, and package metadata' },
          { label: 'Execution Mode', value: 'MR', sub: 'Map/Reduce is the dominant runtime pattern' },
          { label: 'Data Support', value: 'JSON', sub: 'invoice_details.json shows representative invoice-detail state' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Confirms',
        copy: 'Bentham is a small but coherent finance-automation package where custom data moves through a map/reduce pipeline into live transactions.',
        cards: [
          { title: 'Custom Record Build', copy: 'One script is responsible for creating or shaping custom invoice records before final processing.' },
          { title: 'Transaction Creation', copy: 'The second script creates invoices and payments from approved custom invoice data.' },
          { title: 'JSON Detail', copy: 'The invoice-details file makes the custom input state easier to reason about.' }
        ]
      },
      dataFile: 'js/experience-code-data-bentham.js',
      explorerId: 'section-bentham-explorer',
      summaryId: 'section-bentham-summary',
      explorerBox: { sidebarTitle: 'Bentham Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing finance automation workspace...', status: 'Bentham Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science')],
      displayRoot: 'Projects-Crowe Howarth/CRW-I/Billable Projects/Bentham Science',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'Bentham Science' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'custom-invoice-mr', path: path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science/src/FileCabinet/SuiteScripts/c105779_MR_create_custom_invoice_record.js'), rel: 'src/FileCabinet/SuiteScripts/c105779_MR_create_custom_invoice_record.js', section: 'Custom Record Layer', project: 'Custom Invoice Record Build' },
        { key: 'invoice-record-mr', path: path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science/src/FileCabinet/SuiteScripts/c105779_MR_create_invoice_record.js'), rel: 'src/FileCabinet/SuiteScripts/c105779_MR_create_invoice_record.js', section: 'Transaction Layer', project: 'Invoice + Payment Creation' },
        { key: 'invoice-details', path: path.join(SRC_ROOT, 'CRW-I/Billable Projects/Bentham Science/src/FileCabinet/SuiteScripts/c105779_invoice_details.json'), rel: 'src/FileCabinet/SuiteScripts/c105779_invoice_details.json', section: 'Sample Payloads', project: 'Invoice Details' }
      ]
    }
  },
  {
    slug: '3wm-purchase-price-review',
    file: 'experience-3wm-purchase-price-review.html',
    title: '3WM',
    strong: 'Purchase Price Review',
    pill: 'CRW-I · Non-Billable',
    logo: { type: 'image', src: 'images/experience/3wm.jpeg', alt: '3WM Purchase Price Review' },
    track: 'CRW-I',
    back: 'experience-crw-i.html',
    meta: ['Phase-II Greek-I', 'FDD + Technical Document', 'PPRL Process Controls'],
    lead: '3WM - Purchase Price Review is the deepest control-oriented product package in this experience hierarchy. It combines an FDD, a technical document, multiple user events, map/reduces, and object XML to enforce vendor-bill review, receiving-rate updates, auto-approval gating, credit/debit note creation, and variance-closing journal entries.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Purchase Price Review as a Full Control Framework',
      copy: 'This is not one validation script. It is a business-control framework covering review records, bill approval gating, receiving-rate synchronization, credit/debit note creation, and journal-entry closure logic.',
      stats: [
        { label: 'Scripts', value: '9', sub: 'User events, map/reduces, search logic, and retry flows' },
        { label: 'Objects', value: '30+', sub: 'Custom fields, records, lists, tabs, and deployment XML' },
        { label: 'Docs', value: '2', sub: 'FDD and Technical Document are both present' },
        { label: 'Track', value: 'CRW-I', sub: 'Non-billable product work in the full-time phase' }
      ]
    },
    nodes: [
      { label: 'Step 01', title: 'Create PPRL', sub: 'Vendor Bill lines create Purchase Price Review Line records' },
      { label: 'Step 02', title: 'Review + Update Rate', sub: 'Purchasing resolves rate variances and updates Rate to Pay' },
      { label: 'Step 03', title: 'Approve + Close', sub: 'Approve bills, create credits/debits, and post closing JEs' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'FDD Overview', copy: 'A detailed overview of the 3WM Purchase Price Review process built from both the FDD and the technical document, including the review-line lifecycle and downstream financial controls.', tags: ['FDD Overview', 'PPRL Workflow', 'Bill Controls'], footer: 'Open this page first. It explains the business flow before the code and object XML are explored.', href: 'experience-3wm-overview.html', cta: 'Open FDD' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer with the live 3WM scripts, object XML, and SDF metadata that implement the PPRL process and its downstream financial controls.', tags: ['Scripts Explorer', '9 Scripts', 'Read-Only'], footer: 'Use the explorer to inspect the actual scripts and object XML behind the PPRL framework.', href: 'experience-3wm-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Control Surface',
      title: 'What the 3WM Package Actually Contains',
      copy: 'The 3WM archive is the most complete control framework in this experience tree because it spans custom records, validation, scheduled processing, financial adjustments, and closure entries.',
      cards: [
        { title: 'PPRL Record', copy: 'Custom Purchase Price Review Line records capture bill-vs-PO variance state.' },
        { title: 'Approval Gate', copy: 'Vendor Bill approval is blocked until the review is complete.' },
        { title: 'Rate Sync', copy: 'Approved Rate to Pay is pushed into inbound shipment and item receipt rates.' },
        { title: 'Credit/Debit Logic', copy: 'Bill approval creates vendor credit or overage vendor bill flows when needed.' },
        { title: 'JE Closure', copy: 'Closed or fully billed PO lines trigger variance-closing journal entries.' },
        { title: 'Object Metadata', copy: 'Field, list, record, and tab XML show the full package footprint.' }
      ]
    },
    overview: {
      file: 'experience-3wm-overview.html',
      title: 'FDD - 3WM Purchase Price Review',
      pill: 'FDD Overview',
      strong: '3WM Purchase Price Review',
      meta: ['CRW-I', 'FDD + Technical Document', 'PPRL Control Framework'],
      lead: 'This overview combines the 3WM FDD and technical document into one readable project story. It explains the review-line lifecycle, the vendor-bill controls, the receiving-rate update rules, and the financial adjustments that happen after approval.',
      actions: [
        { href: docs.threewmFdd, label: 'Download FDD' },
        { href: docs.threewmTech, label: 'Download Technical Doc' },
        { href: 'experience-3wm-scripts.html', label: 'Open Scripts Explorer' }
      ],
      panel: {
        kicker: 'Control Frame',
        title: 'A Full Review Workflow Around Vendor Bill Variance',
        copy: 'The FDD and technical document align on one core idea: if bill rate and PO rate differ, the business needs an explicit review object and approval path before 3-way match and payment can proceed safely.',
        stats: [
          { label: 'Primary Record', value: 'PPRL', sub: 'Purchase Price Review Line is the core state holder in the workflow' },
          { label: 'Approval Rule', value: 'BLOCK', sub: 'Bills cannot be approved while review-required lines remain unresolved' },
          { label: 'Adjustment Paths', value: '2', sub: 'Vendor Credit for underages, Overages Bill for positive variance' },
          { label: 'Closure Control', value: 'JE', sub: 'Variance-closing journal entries are created when PO lines close' }
        ]
      },
      sidebar: {
        kicker: 'What the Docs Establish',
        title: 'The Main Design Decisions',
        copy: 'The documentation makes the workflow explicit. Review lines are created from bill lines, rates are compared and resolved, approval is blocked until resolution, and downstream transactions update only after the business sign-off exists.',
        chips: ['PPRL Record', 'Approval Gate', 'Rate to Pay', 'Credit/Debit + JE'],
        list: [
          { label: 'Origin', value: 'Vendor Bill lines generate child PPRL records' },
          { label: 'Decision Point', value: 'Purchasing resolves Review Required lines to a valid Rate to Pay' },
          { label: 'Approval Dependency', value: 'Bill approval requires Purchase Price Review Complete = true' },
          { label: 'Downstream Impact', value: 'Receiving rates, vendor credits, overages bills, and JEs all depend on the result' }
        ]
      },
      main: {
        kicker: 'Combined Narrative',
        title: 'How the 3WM PPRL Framework Works',
        sections: [
          sectionFromDoc('Business Problem', [
            'The FDD frames the core issue clearly: a vendor bill can arrive with item rates that differ from the original purchase-order rates, and the business cannot safely move forward with 3-way match or payment until those differences are reviewed and resolved. Standard workflow alone was not enough because the process also needed automated rate updates and downstream financial adjustments once a decision had been made.',
            'That is why the package introduces Purchase Price Review Line records. Instead of burying rate variance in manual comments or ad-hoc email review, each bill line gets a durable review record with status, pay-rate handling, and a visible lifecycle.'
          ]),
          sectionFromDoc('Review-Line Lifecycle', [
            'When a Vendor Bill is created, the user event creates one PPRL record per item line and compares the bill rate against the purchase-order rate snapshot. If the variance crosses the threshold, the record is marked Review Required. Otherwise it can default to Pay Bill Rate. Purchasing then resolves each review line by choosing Pay Bill Rate, Pay PO Rate, or Pay Custom Amount, and the Rate to Pay field is enforced accordingly.',
            'That lifecycle matters because it makes the business decision explicit. The system does not hide the difference or automatically assume one rate is correct. It asks for the resolution and stores it in a dedicated review record.'
          ]),
          sectionFromDoc('Operational Controls', [
            'The technical document adds the runtime detail: bill approval is blocked until Purchase Price Review Complete is true, receiving can be blocked if the PPRL process is not complete, and the approved Rate to Pay is used to update inbound-shipment expected rates or item receipt line rates. In other words, the review result affects real downstream operational behavior.',
            'This is what turns the package into a true control framework. The review is not informational only. It actively governs approval, receiving, and financial posting behavior throughout the transaction lifecycle.'
          ]),
          sectionFromDoc('Financial Adjustments and Closure', [
            'After approval, the package can create vendor credits for underages or overages vendor bills for positive variance, depending on how the bill compares with the approved pay-per-receipt amount. It also creates accrued-purchases variance-closing journal entries when PO lines are closed or fully billed and received. Those are not cosmetic outputs. They ensure the accounting trail stays aligned with the operational review outcome.',
            'As a result, 3WM is the strongest example in the experience archive of a solution that combines business workflow, operational controls, and downstream accounting automation into one NetSuite package.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-3wm-scripts.html',
      title: 'Scripts - 3WM Purchase Price Review',
      pill: 'Code Explorer',
      strong: '3WM Purchase Price Review',
      meta: ['Read-Only Explorer', 'PPRL Control Scripts', 'Object-Rich SDF Package'],
      lead: 'This explorer contains the live 3WM scripts and object XML so the PPRL workflow can be inspected from record creation through approval gating and financial adjustments.',
      actions: [
        { href: 'experience-3wm-overview.html', label: 'Open FDD Overview' },
        { href: 'experience-3wm-purchase-price-review.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the 3WM Package',
        copy: 'The selected files cover the main user events, map/reduces, and a small set of representative object XML so the business-control model can be read directly from the deployment package.',
        stats: [
          { label: 'Selected Files', value: '11', sub: 'Core runtime scripts, docs, and representative object XML' },
          { label: 'Runtime Modes', value: 'UE + MR', sub: 'The package mixes user-event enforcement with scheduled map/reduce processing' },
          { label: 'Metadata', value: 'OBJ', sub: 'Object XML shows how deeply the package extends the account' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Confirms',
        copy: 'The source package confirms the same story told by the documents: 3WM is a true control framework, not one isolated review script.',
        cards: [
          { title: 'Review Generation', copy: 'User-event logic creates and maintains the Purchase Price Review Line records.' },
          { title: 'Approval + Retry', copy: 'Map/reduce jobs auto-approve eligible bills and retry pending update operations.' },
          { title: 'Metadata Footprint', copy: 'Object XML shows the custom fields, records, tabs, and script deployments behind the workflow.' }
        ]
      },
      dataFile: 'js/experience-code-data-3wm.js',
      explorerId: 'section-3wm-explorer',
      summaryId: 'section-3wm-summary',
      explorerBox: { sidebarTitle: '3WM Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing PPRL workspace...', status: '3WM Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New')],
      displayRoot: 'Projects-Crowe Howarth/CRW-I/Non-Billable Projects/Product-1/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: '3WM Purchase Price Review' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'ue-create-pprl', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_UE_CREATE_PPRL_ FROM_VB.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_UE_CREATE_PPRL_ FROM_VB.js', section: 'Review Lifecycle', project: 'Create PPRL Records' },
        { key: 'ue-pprl-updates', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_UE_UPDATE_PPRL.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_UE_UPDATE_PPRL.js', section: 'Review Lifecycle', project: 'Rate to Pay Updates' },
        { key: 'mr-approve', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_MR_APPROVE_PENDING_VB.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_MR_APPROVE_PENDING_VB.js', section: 'Approval Controls', project: 'Auto Approve Vendor Bills' },
        { key: 'mr-update-ir', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_MR_UPDATE_IR_RATE.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_MR_UPDATE_IR_RATE.js', section: 'Receiving Controls', project: 'Item Receipt Rate Updates' },
        { key: 'saved-search', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_SS_CREATE_PPR_PENDING_REVIEW_SAVEDSEARCH.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_SS_CREATE_PPR_PENDING_REVIEW_SAVEDSEARCH.js', section: 'Review Lifecycle', project: 'Pending Review Search' },
        { key: 'ue-vb-credit', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/FileCabinet/SuiteScripts/C119938_UE_Create_VB_Cred_or_New_VB.js'), rel: 'src/FileCabinet/SuiteScripts/C119938_UE_Create_VB_Cred_or_New_VB.js', section: 'Adjustment Controls', project: 'Vendor Credit and Overage Bill' },
        { key: 'object-record', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/Objects/customrecord_c53174_ppvreviewline.xml'), rel: 'src/Objects/customrecord_c53174_ppvreviewline.xml', section: 'Object XML', project: 'PPRL Custom Record' },
        { key: 'object-status-list', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/Objects/customlist_c53174_ppvreviewstatus.xml'), rel: 'src/Objects/customlist_c53174_ppvreviewstatus.xml', section: 'Object XML', project: 'PPRL Status List' },
        { key: 'object-tab', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-1/New/src/Objects/custtab_c53174_pprl.xml'), rel: 'src/Objects/custtab_c53174_pprl.xml', section: 'Object XML', project: 'PPRL Subtab' }
      ]
    }
  },
  {
    slug: 'air-mandatory-segments',
    file: 'experience-air-mandatory-segments.html',
    title: 'AIR',
    strong: 'Mandatory Segments Based on Account',
    pill: 'CRW-I · Non-Billable',
    logo: { type: 'image', src: 'images/experience/airLogo.jpeg', alt: 'AIR Mandatory Segments' },
    track: 'CRW-I',
    back: 'experience-crw-i.html',
    meta: ['Phase-II Greek-II', 'FDD + Technical Document', 'Conditional Segment Enforcement'],
    lead: 'AIR - Mandatory Segments Based on Account enforces Department, Location, and Market Sector based on the selected GL account. The project combines an FDD, a technical document, a client script for UI validation, a Suitelet that publishes account rules, a user event for CSV validation, and object XML for the account-level configuration fields.',
    panel: {
      kicker: 'Project Snapshot',
      title: 'Conditional Segmentation Control Across Transactions',
      copy: 'This product is all about context-aware validation. Instead of making segments globally mandatory, it enforces them only when the selected account says they should be required, while still respecting custom-form precedence.',
      stats: [
        { label: 'Scripts', value: '3', sub: 'Client script, Suitelet worker, and user event validator' },
        { label: 'Objects', value: '7', sub: 'Account fields, script deployments, and journal skip field' },
        { label: 'Docs', value: '2', sub: 'FDD and Technical Document are both present' },
        { label: 'Track', value: 'CRW-I', sub: 'Non-billable product work in the full-time phase' }
      ]
    },
    nodes: [
      { label: 'Rule 01', title: 'Account Setup', sub: 'Configure Department, Location, and Market Sector mandatory flags' },
      { label: 'Rule 02', title: 'UI Validation', sub: 'Client script + Suitelet enforce rules during user interaction' },
      { label: 'Rule 03', title: 'CSV Validation', sub: 'User event repeats the validation server-side during import' }
    ],
    resources: [
      { kicker: 'Child 01', title: 'FDD Overview', copy: 'A combined overview of the AIR functional design and technical implementation, showing how account-driven segment requirements are enforced across supported transaction types.', tags: ['FDD Overview', 'Segment Controls', 'UI + CSV Validation'], footer: 'Open this page first to understand the rule model and the supported transaction surface.', href: 'experience-air-overview.html', cta: 'Open FDD' },
      { kicker: 'Child 02', title: 'Scripts Explorer', copy: 'A read-only explorer containing the client script, Suitelet worker, user event validator, and representative object XML used to deploy the AIR solution.', tags: ['Scripts Explorer', '3 Scripts', 'Read-Only'], footer: 'Use the explorer to inspect the source that turns the FDD into actual NetSuite behavior.', href: 'experience-air-scripts.html', cta: 'Open Scripts' }
    ],
    snapshot: {
      kicker: 'Control Surface',
      title: 'What the AIR Package Covers',
      copy: 'The project is compact in script count but broad in impact because it affects multiple transaction types and both UI and CSV-import contexts.',
      cards: [
        { title: 'Account Flags', copy: 'Three account-level fields drive Department, Location, and Market Sector requirements.' },
        { title: 'UI Worker', copy: 'A Suitelet publishes the account and item rule maps to the client script.' },
        { title: 'Client Validation', copy: 'The client script checks supported transactions during user interaction and save.' },
        { title: 'CSV Validation', copy: 'The user event reproduces the same logic during CSV imports.' },
        { title: 'Journal Skip', copy: 'A journal checkbox allows explicit bypass in approved import scenarios.' },
        { title: 'Business Value', copy: 'Improves posting accuracy without forcing segments globally on every transaction.' }
      ]
    },
    overview: {
      file: 'experience-air-overview.html',
      title: 'FDD - AIR Mandatory Segments Based on Account',
      pill: 'FDD Overview',
      strong: 'AIR Mandatory Segments Based on Account',
      meta: ['CRW-I', 'FDD + Technical Document', 'Conditional Segment Enforcement'],
      lead: 'This overview combines the AIR functional design and technical document into one readable project story. It explains the account-level rule model, the UI and CSV validation layers, and the transaction coverage the source package actually implements.',
      actions: [
        { href: docs.airFdd, label: 'Download FDD' },
        { href: docs.airTech, label: 'Download Technical Doc' },
        { href: 'experience-air-scripts.html', label: 'Open Scripts Explorer' }
      ],
      panel: {
        kicker: 'Control Frame',
        title: 'Mandatory Segments Only When the Account Requires Them',
        copy: 'The FDD’s core idea is precise: locations, departments, and market sectors should become mandatory when the selected GL account says they are required, but the system should still respect cases where the form itself already controls the field behavior.',
        stats: [
          { label: 'Rule Driver', value: 'ACC', sub: 'The account record holds the mandatory flags' },
          { label: 'Runtime Layers', value: '2', sub: 'UI validation and CSV validation are both implemented' },
          { label: 'Transaction Surface', value: '8', sub: 'The technical document confirms eight supported transaction types' },
          { label: 'Exception Rule', value: 'JE', sub: 'Journal imports can bypass validation through the skip checkbox' }
        ]
      },
      sidebar: {
        kicker: 'What the Docs Establish',
        title: 'The Main Design Decisions',
        copy: 'The documents align on a rule-based model. Account-level configuration drives whether a segment is required, item lines can derive account requirements indirectly, and CSV imports must respect the same control logic as the UI.',
        chips: ['Account Rules', 'UI + CSV', 'Suitelet Map', 'Journal Skip'],
        list: [
          { label: 'Account Flags', value: 'Department Mandatory, Location Mandatory, and Market Sector Mandatory' },
          { label: 'UI Runtime', value: 'Client script pulls rule maps from the Suitelet during pageInit' },
          { label: 'CSV Runtime', value: 'User event rebuilds the same rules server-side during import' },
          { label: 'Precedence', value: 'Custom-form mandatory or disabled settings still win when already configured' }
        ]
      },
      main: {
        kicker: 'Combined Narrative',
        title: 'How the AIR Segmentation Control Works',
        sections: [
          sectionFromDoc('Business Problem', [
            'The AIR FDD makes the original requirement explicit: the business did not want Location, Department, and Market Sector to be mandatory on every transaction all the time. Instead, they needed those segments to become mandatory when a particular account required them. Standard NetSuite can enforce some segments globally, but it cannot do this account-by-account out of the box.',
            'That means the solution had to be conditional, context-aware, and broad enough to cover both UI entry and CSV import scenarios. Otherwise the account-based control would be easy to bypass and the posting-quality problem would remain.'
          ]),
          sectionFromDoc('Implementation Pattern', [
            'The technical document shows a clean three-part architecture. A Suitelet gathers the rule map for accounts and items. The client script uses that rule map during user interaction to validate body fields, expense lines, and item lines on supported transaction types. The user event then reproduces the logic server-side during CSV import because client scripts do not execute there.',
            'That architecture is strong because it avoids duplicating the data source for the rules while still keeping validation active in both contexts. The Suitelet acts as the UI data worker, and the user event provides the import-safe enforcement layer.'
          ]),
          sectionFromDoc('Coverage and Controls', [
            'The technical document also clarifies the implemented coverage: Journal Entry, Advanced Intercompany Journal Entry, Vendor Bill, Vendor Credit, Vendor Payment, Customer Payment, Invoice, and Credit Memo are present in the source package. Item transactions that rely on item income or expense accounts use those derived accounts to decide whether segments should become mandatory.',
            'There is also an explicit journal-exception path through the Exclude Segmentation Validation checkbox. That matters because it shows the package is not blindly rigid. It provides a controlled escape hatch for import workflows that truly need it.'
          ]),
          sectionFromDoc('Why the Package Matters', [
            'AIR is a good example of policy encoded into runtime behavior. The solution is not flashy, but it is operationally valuable because it reduces posting errors and improves reporting integrity without over-constraining every transaction in the account.',
            'As part of the broader CRW-I track, this project shows a move toward system-level controls: building rules that shape how data enters the platform instead of only automating what happens after the data is already there.'
          ])
        ]
      }
    },
    explorer: {
      file: 'experience-air-scripts.html',
      title: 'Scripts - AIR Mandatory Segments Based on Account',
      pill: 'Code Explorer',
      strong: 'AIR Mandatory Segments Based on Account',
      meta: ['Read-Only Explorer', 'UI + CSV Validation', 'Rule-Driven Segmentation'],
      lead: 'This explorer contains the live AIR source package, including the client script, Suitelet worker, user event validator, and representative object XML that deploys the account-level controls.',
      actions: [
        { href: 'experience-air-overview.html', label: 'Open FDD Overview' },
        { href: 'experience-air-mandatory-segments.html', label: 'Open Project Page' }
      ],
      panel: {
        kicker: 'Explorer Scope',
        title: 'Selected Files From the AIR Package',
        copy: 'The explorer is intentionally focused: one client script, one Suitelet, one user event, and a small set of representative object XML are enough to explain the runtime model and the deployment footprint.',
        stats: [
          { label: 'Selected Files', value: '8', sub: 'Three runtime files and five representative metadata files' },
          { label: 'Runtime Layers', value: '3', sub: 'Client script, Suitelet worker, and user event validator' },
          { label: 'Metadata', value: 'OBJ', sub: 'Account fields and script deployments are included' },
          { label: 'View Mode', value: 'RO', sub: 'Read-only source inspection with copy support' }
        ]
      },
      summary: {
        kicker: 'Explorer Summary',
        title: 'What the Workspace Confirms',
        copy: 'The workspace proves that AIR is a rule-driven validation package rather than a one-off client-side form tweak.',
        cards: [
          { title: 'Client Script', copy: 'Handles UI validation for supported transactions using the rule map returned by the Suitelet.' },
          { title: 'Suitelet Worker', copy: 'Builds the account and item rule maps consumed by the UI layer.' },
          { title: 'User Event', copy: 'Provides CSV-import safe validation for the same rule set.' }
        ]
      },
      dataFile: 'js/experience-code-data-air.js',
      explorerId: 'section-air-explorer',
      summaryId: 'section-air-summary',
      explorerBox: { sidebarTitle: 'AIR Workspace', defaultTitle: 'Loading Explorer', defaultPath: 'Preparing segmentation workspace...', status: 'AIR Explorer' },
      sourceRoots: [path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New')],
      displayRoot: 'Projects-Crowe Howarth/CRW-I/Non-Billable Projects/Product-2/New',
      selectedFiles: [
        { key: 'suitecloud-config', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/suitecloud.config.js'), rel: 'suitecloud.config.js', section: 'Workspace Root', project: 'AIR Mandatory Segments' },
        { key: 'manifest', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/manifest.xml'), rel: 'src/manifest.xml', section: 'Deployment Metadata', project: 'SDF Package' },
        { key: 'client-script', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/c81164_cs_mandatory_segmentation_by_gl_account.js'), rel: 'src/FileCabinet/SuiteScripts/c81164_cs_mandatory_segmentation_by_gl_account.js', section: 'UI Validation', project: 'Client Script' },
        { key: 'suitelet-worker', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/c81164_sl_mandatory_segmentation_worker.js'), rel: 'src/FileCabinet/SuiteScripts/c81164_sl_mandatory_segmentation_worker.js', section: 'UI Validation', project: 'Suitelet Worker' },
        { key: 'user-event', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/FileCabinet/SuiteScripts/c81164_ue_mandatory_segmentation_by_gl_account.js'), rel: 'src/FileCabinet/SuiteScripts/c81164_ue_mandatory_segmentation_by_gl_account.js', section: 'CSV Validation', project: 'User Event Validator' },
        { key: 'exclude-field', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/Objects/custbody_81164_exclude_seg_val.xml'), rel: 'src/Objects/custbody_81164_exclude_seg_val.xml', section: 'Object XML', project: 'Journal Skip Checkbox' },
        { key: 'dep-field', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/Objects/custrecord_81164_dep_mandatory.xml'), rel: 'src/Objects/custrecord_81164_dep_mandatory.xml', section: 'Object XML', project: 'Department Mandatory Field' },
        { key: 'loc-field', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/Objects/custrecord_81164_location_mandatory.xml'), rel: 'src/Objects/custrecord_81164_location_mandatory.xml', section: 'Object XML', project: 'Location Mandatory Field' },
        { key: 'ms-field', path: path.join(SRC_ROOT, 'CRW-I/Non-Billable Projects/Product-2/New/src/Objects/custrecord_81164_ms_mandatory.xml'), rel: 'src/Objects/custrecord_81164_ms_mandatory.xml', section: 'Object XML', project: 'Market Sector Mandatory Field' }
      ]
    }
  }
];

const trackPages = [
  {
    file: 'experience-capstone-i.html',
    title: 'Internship Capstone-I | Crowe Horwath',
    hero: {
      id: 'section-capstone-i-home',
      pill: 'Crowe Horwath Journey Track',
      title: 'Internship',
      strong: 'Capstone-I',
      meta: ['Feb 2025 - Initial Delivery Phase', 'Client-Facing Integration Work', 'NetSuite ↔ Salesforce'],
      lead: 'Internship Capstone-I is the first real client-delivery phase in the Crowe journey. It is centered on Krayden and shows the shift from learning the platform to shipping multi-enhancement NetSuite-Salesforce integration work with validation and approval controls.',
      actions: [
        { href: '#section-capstone-i-projects', label: 'Open Projects' },
        { href: 'experience.html#section-experience-bravo', label: 'View Bravo Badges' }
      ],
      nodes: [
        { label: 'Client', title: 'Krayden', sub: 'One billable client, five enhancement tracks' },
        { label: 'Surface', title: 'Integration Delivery', sub: 'Customer, item, invoice, credit, and export-control flows' },
        { label: 'Signal', title: 'Production-Style Packaging', sub: 'SuiteCloud deployment with validation and control layers' }
      ],
      panel: {
        kicker: 'Track Snapshot',
        title: 'The First Phase is Narrow in Client Count, Deep in Integration Surface',
        copy: 'Capstone-I is focused on one client, but it is not small work. The Krayden package spans multiple enhancement IDs, multiple record families, and hard business-control logic around restricted-item approval.',
        stats: [
          { label: 'Projects', value: '1', sub: 'Krayden is the core billable project in this phase' },
          { label: 'Enhancements', value: '5', sub: 'Customer, Item, Invoice, Credit Memo, and Export Control' },
          { label: 'Scripts', value: '23', sub: 'Integration logic, validation, resync, and helper files' },
          { label: 'Objects', value: '13', sub: 'Object XML and deployment metadata across the packages' }
        ]
      }
    },
    sections: [
      {
        id: 'section-capstone-i-projects', title: 'Track', strong: 'Projects', two: false,
        cards: [
          {
            logo: { type: 'image', src: 'images/experience/krayden.png', alt: 'Krayden' },
            kicker: 'Billable Project', title: 'Krayden',
            copy: 'NetSuite-Salesforce customisation and integrations spanning Customer, Item, Invoice, Credit Memo, and Export Control enhancement packages.',
            tags: ['5 Enhancements', '23 Scripts', 'NS ↔ SF'],
            footer: 'This project is the strongest integration-led foundation inside the first internship phase.',
            href: 'experience-krayden.html', cta: 'Open Project'
          }
        ]
      }
    ],
    surface: {
      id: 'section-capstone-i-snapshot',
      kicker: 'Why This Phase Matters',
      title: 'Capstone-I is Where the Delivery Pattern Starts',
      copy: 'Krayden establishes the pattern that later work keeps extending: enhancement-led scope, SuiteCloud packaging, source-controlled validation, and direct business control built inside the NetSuite runtime.',
      cards: [
        { title: 'Record Sync', copy: 'The first phase covers the core record families that later integrations depend on.' },
        { title: 'Validation', copy: 'Invoice-safe validation and export-control approval are already present this early in the journey.' },
        { title: 'Deployment Discipline', copy: 'Manifest, deploy, object XML, and reusable libraries appear from the start.' }
      ]
    }
  },
  {
    file: 'experience-capstone-ii.html',
    title: 'Internship Capstone-II | Crowe Horwath',
    hero: {
      id: 'section-capstone-ii-home',
      pill: 'Crowe Horwath Journey Track',
      title: 'Internship',
      strong: 'Capstone-II',
      meta: ['Expanded Delivery Surface', 'Billable + Internal Product Work', 'Client and Platform Tracks'],
      lead: 'Internship Capstone-II widens the experience from one integration client into a mixed delivery model: billable client customisation work and non-billable internal product building. This is where document customization, data migration, RESTlet integrations, and internal automation products all start to sit side by side.',
      actions: [
        { href: '#section-capstone-ii-billable', label: 'Open Billable Projects' },
        { href: '#section-capstone-ii-products', label: 'Open Internal Products' }
      ],
      nodes: [
        { label: 'Billable', title: 'Hugo, PayZen, M CTO', sub: 'Client customization, migration, and integration work' },
        { label: 'Internal', title: 'Subscription, Invoicing, Bulk Emailing', sub: 'Platform-oriented automation products' },
        { label: 'Signal', title: 'Breadth', sub: 'Document XML, CSV data, RESTlets, Suitelets, client scripts, and MR jobs' }
      ],
      panel: {
        kicker: 'Track Snapshot',
        title: 'Capstone-II is Where the Surface Area Expands',
        copy: 'This phase is not tied to one client or one technical style. It mixes XML layout work, migration data packs, wide RESTlet integration packages, and internal automation products with Suitelet-driven user experiences.',
        stats: [
          { label: 'Billable Projects', value: '3', sub: 'Hugo Inc, PayZen, and M CTO' },
          { label: 'Internal Products', value: '3', sub: 'Subscription Billing, Custom Invoice Automation, and Bulk Emailing' },
          { label: 'Delivery Modes', value: '5+', sub: 'XML, CSV, RESTlet, MR, Suitelet, and Client Script work' },
          { label: 'Phase Signal', value: 'BREADTH', sub: 'The role widens beyond one client integration pattern' }
        ]
      }
    },
    sections: [
      {
        id: 'section-capstone-ii-billable', title: 'Billable', strong: 'Projects', two: false,
        cards: [
          { logo: { type: 'image', src: 'images/experience/hugo.webp', alt: 'Hugo Inc' }, kicker: 'Billable Project', title: 'Hugo Inc', copy: 'Advanced PDF Layout customization for multiple transaction outputs with dated XML template families and backup variants.', tags: ['XML Layouts', 'Advanced PDF', 'Document Delivery'], footer: 'Document-layer customization for customer and vendor transaction outputs.', href: 'experience-hugo.html', cta: 'Open Project' },
          { logo: { type: 'image', src: 'images/experience/payzen.png', alt: 'PayZen' }, kicker: 'Billable Project', title: 'PayZen', copy: 'Structured finance-data migration pack with reference CSVs and historical journal data prepared for preservation and downstream ingestion.', tags: ['CSV Pack', 'Migration Support', 'Finance Data'], footer: 'A data-first delivery pattern focused on historical finance continuity.', href: 'experience-payzen.html', cta: 'Open Project' },
          { logo: { type: 'image', src: 'images/experience/mctoLogo.jpg', alt: 'M CTO' }, kicker: 'Billable Project', title: 'M CTO', copy: 'RESTlet-led NetSuite integration package for customer, vendor, sales, purchase, invoice, credit memo, and payment creation flows.', tags: ['RESTlet', '24 Scripts', 'Finance Creation'], footer: 'The widest inbound-integration package in the second internship phase.', href: 'experience-mcto.html', cta: 'Open Project' }
        ]
      },
      {
        id: 'section-capstone-ii-products', title: 'Internal', strong: 'Products', two: false,
        cards: [
          { logo: { type: 'image', src: 'images/experience/subscriptionBilling.jpeg', alt: 'Subscription Billing' }, kicker: 'Internal Product', title: 'Subscription Billing', copy: 'Recurring billing automation from Sales Orders into subscription records and grouped renewal invoices.', tags: ['User Event', 'Map/Reduce', 'Recurring Billing'], footer: 'Turns subscription-marked order lines into durable billing state and renewal invoices.', href: 'experience-subscription-billing.html', cta: 'Open Product' },
          { logo: { type: 'image', src: 'images/experience/customInvoiceBilling.jpeg', alt: 'Custom Invoice Automation' }, kicker: 'Internal Product', title: 'Custom Invoice Automation', copy: 'Validation-before-invoicing and downstream invoice or bill generation built around custom invoice records.', tags: ['Validation Gate', 'Invoice + Bill', 'MR Workflow'], footer: 'Prevents bad billing before creating downstream finance documents.', href: 'experience-custom-invoice-automation.html', cta: 'Open Product' },
          { logo: { type: 'image', src: 'images/experience/bulkEmailing.jpeg', alt: 'Bulk Emailing' }, kicker: 'Internal Product', title: 'Bulk Emailing', copy: 'A filterable Suitelet product that supports Mark All, selection persistence, attachment logic, and asynchronous transaction emailing.', tags: ['Suitelet', 'Client Script', 'Map/Reduce'], footer: 'A strong product-style workflow built around transaction communication at scale.', href: 'experience-bulk-emailing.html', cta: 'Open Product' }
        ]
      }
    ],
    surface: {
      id: 'section-capstone-ii-snapshot',
      kicker: 'Why This Phase Matters',
      title: 'Capstone-II Moves From One Delivery Pattern to Many',
      copy: 'This phase widens both the technical stack and the business surface: document customization, migration support, inbound integration, recurring billing, transaction generation, and operational bulk-email tooling all appear here.',
      cards: [
        { title: 'Client Variety', copy: 'The work shifts from one client to multiple billable contexts with different technical needs.' },
        { title: 'Product Thinking', copy: 'Internal products start to combine UI, state, and asynchronous processing into reusable flows.' },
        { title: 'Technical Range', copy: 'The stack now includes XML layouts, CSV packs, RESTlets, Suitelets, client scripts, and batch automation.' }
      ]
    }
  },
  {
    file: 'experience-crw-i.html',
    title: 'CRW-I | Crowe Horwath',
    hero: {
      id: 'section-crwi-home',
      pill: 'Crowe Horwath Journey Track',
      title: 'CRW-I',
      strong: 'Delivery Phase',
      meta: ['Full-Time Ownership Phase', 'Billable + Internal Product Work', 'Control-Oriented NetSuite Delivery'],
      lead: 'CRW-I is the strongest ownership phase in the Crowe journey so far. The work mixes a billable finance-automation client project with two internal control-focused products, moving the delivery style deeper into business controls, policy enforcement, and transaction-governance behavior.',
      actions: [
        { href: '#section-crwi-billable', label: 'Open Billable Projects' },
        { href: '#section-crwi-products', label: 'Open Internal Products' }
      ],
      nodes: [
        { label: 'Billable', title: 'Bentham Science', sub: 'Custom invoice automation for finance output' },
        { label: 'Internal', title: '3WM + AIR', sub: 'Purchase control and segmentation control frameworks' },
        { label: 'Signal', title: 'Ownership', sub: 'More business-policy and control behavior inside the platform' }
      ],
      panel: {
        kicker: 'Track Snapshot',
        title: 'CRW-I Leans Into Control, Policy, and Process Ownership',
        copy: 'This phase is less about isolated integrations and more about systems that govern what the business is allowed to do: price-review controls, mandatory-segmentation rules, and finance-automation against custom record models.',
        stats: [
          { label: 'Billable Projects', value: '1', sub: 'Bentham Science anchors the client-facing work in this phase' },
          { label: 'Internal Products', value: '2', sub: '3WM Purchase Price Review and AIR Mandatory Segments' },
          { label: 'Control Focus', value: 'HIGH', sub: 'Approval gating, segmentation policy, custom review records, and closure logic' },
          { label: 'Phase Signal', value: 'OWN', sub: 'The work increasingly reflects system ownership, not only task execution' }
        ]
      }
    },
    sections: [
      {
        id: 'section-crwi-billable', title: 'Billable', strong: 'Project', two: false,
        cards: [
          { logo: { type: 'image', src: 'images/experience/benthamScienceLogo.png', alt: 'Bentham Science' }, kicker: 'Billable Project', title: 'Bentham Science', copy: 'Custom invoice automation package built around custom invoice records and downstream invoice/payment creation.', tags: ['Finance Automation', 'Custom Records', 'Map/Reduce'], footer: 'A lean but meaningful client-facing finance automation package.', href: 'experience-bentham.html', cta: 'Open Project' }
        ]
      },
      {
        id: 'section-crwi-products', title: 'Internal', strong: 'Products', two: true,
        cards: [
          { logo: { type: 'image', src: 'images/experience/3wm.jpeg', alt: '3WM Purchase Price Review' }, kicker: 'Internal Product', title: '3WM Purchase Price Review', copy: 'PPRL-based control framework for reviewing vendor-bill variances before approval, receiving, and payment.', tags: ['FDD + Tech Doc', '9 Scripts', 'Control Framework'], footer: 'The strongest process-control package in the current experience tree.', href: 'experience-3wm-purchase-price-review.html', cta: 'Open Product' },
          { logo: { type: 'image', src: 'images/experience/airLogo.jpeg', alt: 'AIR Mandatory Segments' }, kicker: 'Internal Product', title: 'AIR Mandatory Segments', copy: 'Conditional Department, Location, and Market Sector enforcement based on account rules across UI and CSV contexts.', tags: ['FDD + Tech Doc', 'UI + CSV', 'Policy Control'], footer: 'Turns account-level policy into live transaction validation behavior.', href: 'experience-air-mandatory-segments.html', cta: 'Open Product' }
        ]
      }
    ],
    surface: {
      id: 'section-crwi-snapshot',
      kicker: 'Why This Phase Matters',
      title: 'CRW-I Pushes Delivery Into Governance and Financial Control',
      copy: 'The full-time phase goes beyond integration or document formatting. It starts encoding business policy directly into NetSuite behavior: what can be approved, what must be reviewed, and which segments must exist before posting.',
      cards: [
        { title: 'Policy in Runtime', copy: 'AIR turns account-driven segmentation policy into transaction validation.' },
        { title: 'Review Before Approval', copy: '3WM enforces business review before bills can proceed into approval and payment.' },
        { title: 'Finance Automation', copy: 'Bentham keeps the client-facing side active with custom-record driven finance output.' }
      ]
    }
  }
];

function buildTree(entries) {
  const root = [];
  for (const entry of entries) {
    const parts = entry.rel.split('/');
    let cursor = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (isLast) {
        cursor.push({ label: part, type: 'file', key: entry.key });
        return;
      }
      let folder = cursor.find((node) => node.type === 'folder' && node.label === part);
      if (!folder) {
        folder = { label: part, type: 'folder', expanded: index < 2, children: [] };
        cursor.push(folder);
      }
      cursor = folder.children;
    });
  }
  return sortTreeNodes(root);
}

function makeCodeData(project) {
  const explorer = project.explorer;
  const entries = collectExplorerEntries(project);
  const files = {};
  for (const file of entries) {
    files[file.key] = {
      label: basename(file.path),
      section: file.section,
      project: file.project,
      path: `${explorer.displayRoot}/${file.rel}`.replace(/\\/g, '/'),
      language: path.extname(file.path).slice(1) || 'txt',
      code: read(file.path)
    };
  }
  const defaultEntry = entries.find((file) => /\/SuiteScripts\/.+\.(js|json)$/i.test(file.rel))
    || entries.find((file) => /\.(js|json|xml|csv|md)$/i.test(file.rel))
    || entries[0];
  const data = {
    rootLabel: `${project.title} ${project.strong}`,
    defaultKey: defaultEntry ? defaultEntry.key : '',
    files,
    tree: buildTree(entries)
  };
  explorer.generatedFileCount = entries.length;
  write(explorer.dataFile, `window.EXPERIENCE_CODE = ${JSON.stringify(data, null, 2)};\n`);
}

function renderProjectLanding(project) {
  const nav = renderNav(`nav-${project.slug}`, project.back, [
    { href: '#section-project-overview', label: 'Overview' },
    { href: '#section-project-deliverables', label: 'Deliverables' },
    { href: '#section-project-snapshot', label: 'Project Snapshot' }
  ]);
  const hero = renderHero({
    id: 'section-project-overview',
    pill: project.pill,
    title: project.title,
    strong: project.strong,
    meta: [project.track, ...project.meta],
    lead: project.lead,
    actions: [
      { href: project.resources[0].href, label: project.resources[0].title },
      { href: project.resources[1].href, label: project.resources[1].title }
    ],
    nodes: project.nodes,
    panel: project.panel
  });
  const cards = renderCardsSection({ id: 'section-project-deliverables', title: project.title, strong: 'Deliverables', cards: project.resources.map((resource, index) => ({ ...resource, kicker: `Child 0${index + 1}`, logo: project.logo })), two: true });
  const surface = renderSurfaceSection({ id: 'section-project-snapshot', ...project.snapshot });
  write(project.file, pageLayout({ title: `${project.title} | ${project.strong}`, nav, body: `${hero}\n${cards}\n${surface}` }));
}

function renderOverviewPage(project) {
  const page = project.overview;
  const nav = renderNav(`nav-${project.slug}-overview`, project.file, [
    { href: '#section-overview-home', label: 'Overview' },
    { href: '#section-overview-content', label: 'Details' }
  ]);
  const hero = renderHero({
    id: 'section-overview-home',
    pill: page.pill,
    title: page.title.replace(/^.*? - /, ''),
    strong: page.strong,
    meta: page.meta,
    lead: page.lead,
    actions: page.actions,
    panel: page.panel
  });
  const body = `${hero}\n${renderOverviewContent({ ...page, contentId: 'section-overview-content' })}`;
  write(page.file, pageLayout({ title: page.title, nav, body }));
}

function renderExplorerPage(project) {
  const page = project.explorer;
  const panel = {
    ...page.panel,
    title: page.panel.title.replace(/^Selected Files/i, 'Workspace Files'),
    copy: 'This explorer mirrors the actual project folders from the source archive. Scripts, metadata, helper files, and supporting project artefacts are shown as they exist in the workspace, with only hidden system noise filtered out.',
    stats: page.panel.stats.map((stat, index) => {
      if (index !== 0) return stat;
      return {
        label: 'Workspace Files',
        value: String(page.generatedFileCount || stat.value),
        sub: 'All readable project files found across the linked source roots'
      };
    })
  };
  const summary = {
    ...page.summary,
    copy: 'The folder tree is generated from the real project directories, so the explorer reflects the source archive instead of a hand-picked subset.'
  };
  const nav = renderNav(`nav-${project.slug}-explorer`, project.file, [
    { href: '#section-explorer-home', label: 'Overview' },
    { href: `#${page.summaryId}`, label: 'Summary' },
    { href: `#${page.explorerId}`, label: 'Explorer' }
  ]);
  const hero = renderHero({
    id: 'section-explorer-home',
    pill: page.pill,
    title: page.title.replace(/^.*? - /, ''),
    strong: page.strong,
    meta: page.meta,
    lead: page.lead,
    actions: page.actions,
    panel
  });
  const body = `${hero}\n${renderExplorerLayout({
    ...page,
    summary,
    explorer: {
      sidebarTitle: page.explorerBox.sidebarTitle,
      defaultTitle: page.explorerBox.defaultTitle,
      defaultPath: page.explorerBox.defaultPath,
      status: page.explorerBox.status
    }
  })}`;
  write(page.file, pageLayout({ title: page.title, nav, body, extraScripts: `<script src="${page.dataFile}"></script>` }));
}

for (const track of trackPages) {
  const nav = renderNav(`nav-${track.file.replace(/[^a-z0-9]/gi, '-')}`, 'experience.html', [
    { href: `#${track.hero.id}`, label: 'Overview' },
    ...track.sections.map((section) => ({ href: `#${section.id}`, label: `${section.title} ${section.strong}` })),
    { href: `#${track.surface.id}`, label: 'Snapshot' }
  ]);
  const body = [renderHero(track.hero), ...track.sections.map(renderCardsSection), renderSurfaceSection(track.surface)].join('\n');
  write(track.file, pageLayout({ title: track.title, nav, body }));
}

for (const project of projects) {
  makeCodeData(project);
  renderProjectLanding(project);
  renderOverviewPage(project);
  renderExplorerPage(project);
}
