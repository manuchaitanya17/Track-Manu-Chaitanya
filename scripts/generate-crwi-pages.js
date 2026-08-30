#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');

const projects = [
  {
    slug: 'crwi-krayden',
    name: 'Krayden',
    shortName: 'Krayden',
    logo: 'images/experience/krayden.png',
    subtitle: 'PDF Transaction Enhancements',
    kicker: 'CRW-I | Billable Project',
    projectFile: 'experience-crwi-krayden.html',
    documentationFile: 'experience-crwi-krayden-documentation.html',
    codeFile: 'experience-crwi-krayden-code.html',
    dataFile: 'js/experience-code-data-crwi-krayden.js',
    lead: 'Two SuiteCloud enhancement packages extend Krayden transaction documents: differentiated units of measure across PDF transactions and a CMR Bill of Lading. The implementation combines SuiteQL-backed fulfillment data with Advanced PDF templates and deployment metadata.',
    meta: ['2 Enhancements', '1 Runtime Suitelet', '7 PDF Templates', 'SuiteCloud SDF'],
    heroNodes: [
      ['Data Layer', 'SuiteQL Assembly', 'Fulfillment, order, inventory, lot, and UOM detail'],
      ['Document Layer', 'Transaction PDFs', 'Packing, invoice, order, transfer, and CMR outputs'],
      ['Delivery Layer', 'SDF Packages', 'Scripts, templates, objects, manifests, and deployment XML']
    ],
    panelTitle: 'One Data Service Supports a Multi-Document PDF Portfolio',
    panelCopy: 'The differentiated-UOM Suitelet prepares transaction and inventory detail for template consumption, while the second package adds a dedicated CMR transport document. Together they form a source-to-output document workflow.',
    stats: [
      ['Enhancements', '2', 'Differentiated UOM and CMR Bill of Lading'],
      ['Runtime Scripts', '1', 'Suitelet-based transaction and item-data assembly'],
      ['PDF Templates', '7', 'Advanced PDF layouts across the two packages'],
      ['Explorer Files', '22', 'Readable scripts, templates, objects, and SDF metadata']
    ],
    documentationSummary: 'A source-derived walkthrough of the Suitelet data pipeline, unit conversion logic, inventory assignments, transaction fields, and Advanced PDF output packages.',
    codeSummary: 'A read-only view of both enhancement workspaces, including the Suitelet, seven PDF templates, object definitions, and SDF deployment files.',
    snapshots: [
      ['Transaction Context', 'The Suitelet works from fulfillment, sales-order, and transfer-order context rather than a static template-only dataset.'],
      ['Inventory Detail', 'Lot numbers, inventory assignments, expiry information, and item control fields are assembled for document output.'],
      ['UOM Conversion', 'Alternate quantity, rate, and unit fields support differentiated transaction presentation.'],
      ['Document Portfolio', 'The package covers packing, invoice, order, transfer, and transport-document use cases.'],
      ['CMR Delivery', 'A separate enhancement packages the Bill of Lading layout and its NetSuite object metadata.'],
      ['Deployment Shape', 'Manifest, deploy, object XML, File Cabinet assets, and project configuration make the workspaces deployable.']
    ],
    documentation: {
      lead: 'This documentation was produced by reading the Krayden SuiteScript, Advanced PDF templates, object XML, and SuiteCloud deployment files. It records what the supplied implementation does without treating archive setup notes as requirements.',
      panelTitle: 'The Source Shows a Data-to-Document Delivery Pattern',
      panelCopy: 'The central Suitelet gathers operational transaction detail and turns it into template-ready data. The companion CMR package extends the same document-engineering surface with a transport-specific output.',
      sidebarTitle: 'Implementation Evidence',
      sidebarCopy: 'The documentation follows the executable path first, then maps the template and SDF assets around it.',
      chips: ['Suitelet', 'SuiteQL', 'Advanced PDF', 'Inventory Detail', 'UOM Conversion'],
      facts: [
        ['Runtime', 'One Suitelet prepares transaction and item data for PDF rendering'],
        ['Inputs', 'Item fulfillment, sales order, transfer order, inventory assignment, and item records'],
        ['Outputs', 'Template-ready item rows, quantities, rates, lots, dates, and control fields'],
        ['Packages', 'Two independent SDF enhancement workspaces']
      ],
      sections: [
        {
          title: 'Source Footprint',
          paragraphs: [
            'The archive contains two distinct enhancement packages. Enhancement 128172 carries the differentiated-unit-of-measure implementation and its transaction PDF templates. Enhancement 136017 carries the CMR Bill of Lading template and supporting object metadata. Each package follows a SuiteCloud project layout with File Cabinet assets, object XML, a manifest, deployment instructions, and project configuration.',
            'The implementation is therefore not a single edited PDF file. It is a deployable document solution in which the runtime data service, templates, script records, and account objects are versioned together.'
          ]
        },
        {
          title: 'Differentiated UOM Data Flow',
          paragraphs: [
            'The main runtime file, c97462_sl_send_data_to_pdf.js, is a Suitelet used to prepare item-table data for transaction PDFs. It receives transaction context, loads the relevant fulfillment or order information, and uses SuiteQL to assemble the records needed by the output layer.',
            'The query path joins transaction lines with item and inventory-assignment information instead of relying only on the fields already exposed to the PDF template. That allows the document layer to receive a richer and more consistent row model.'
          ]
        },
        {
          title: 'Quantity, Lot, and Item Detail',
          paragraphs: [
            'The script calculates and exposes order, shipped, and alternate quantities together with unit, rate, and amount values. Unit-conversion context is included so the printed document can represent the commercial quantity differently from the stock quantity when required.',
            'Inventory numbers and assignments add lot-level traceability. The assembled rows also include item-control and export-oriented values, dates, country information, and descriptive fields used by the transaction layouts. The result is a template-ready dataset rather than raw record output.'
          ]
        },
        {
          title: 'Advanced PDF Portfolio',
          paragraphs: [
            'Seven Advanced PDF templates are present across the Krayden packages. Their object definitions connect the File Cabinet templates to NetSuite template records and script deployments. The layouts cover multiple transaction-document contexts rather than one isolated print form.',
            'Because the differentiated-UOM logic lives in a shared Suitelet, the templates can focus on layout and conditional presentation while the script remains responsible for data retrieval and normalization.'
          ]
        },
        {
          title: 'CMR Bill of Lading',
          paragraphs: [
            'Enhancement 136017 adds a dedicated CMR Bill of Lading package. The source footprint is primarily template and object metadata, which indicates that the delivery emphasis is the transport-document layout and its account registration rather than a separate runtime processing engine.',
            'Keeping CMR in its own SDF package separates transport-document deployment from the differentiated-UOM enhancement and makes the two deliverables independently traceable.'
          ]
        },
        {
          title: 'Deployment and Support Model',
          paragraphs: [
            'The manifest and deploy files declare what moves into the account, while script and template object XML preserve deployment IDs and references. This structure supports repeatable deployment and makes runtime behavior reviewable beside the document assets it serves.',
            'The code explorer retains the supplied readable source files exactly as provided. Hidden operating-system files, Git history, binary fonts, and archive instructions are intentionally omitted from the public hierarchy.'
          ]
        }
      ]
    },
    explorer: {
      files: '22',
      scripts: '1',
      packages: '2',
      format: 'JS + XML',
      panelTitle: 'Both Enhancement Workspaces in One Read-Only Tree',
      panelCopy: 'The explorer preserves the two enhancement folders and their source hierarchy, while filtering hidden Git metadata, binary assets, and unrelated archive noise.',
      summary: [
        ['Runtime Data Service', 'Inspect the Suitelet that assembles transaction, fulfillment, inventory, lot, and UOM values.'],
        ['PDF and Object Assets', 'Review the Advanced PDF templates and the NetSuite objects that register them.'],
        ['Deployment Metadata', 'Trace each enhancement through its manifest, deploy file, and SuiteCloud project configuration.']
      ]
    }
  },
  {
    slug: 'crwi-spinel',
    name: 'Spinel Europe',
    shortName: 'Spinel',
    logo: 'images/experience/spinel-europe.svg',
    subtitle: 'Transaction PDF Suite',
    kicker: 'CRW-I | Billable Project',
    projectFile: 'experience-crwi-spinel.html',
    documentationFile: 'experience-crwi-spinel-documentation.html',
    codeFile: 'experience-crwi-spinel-code.html',
    dataFile: 'js/experience-code-data-crwi-spinel.js',
    lead: 'Four SuiteCloud enhancements modernize Spinel Europe transaction documents: Sales Order, Purchase Order, Invoice, and an invoice-driven Packing List. The packing-list feature connects a form button to a client redirect and a validating PDF Suitelet.',
    meta: ['4 Enhancements', '3 Runtime Scripts', '4 PDF Templates', 'SuiteCloud SDF'],
    heroNodes: [
      ['Core Documents', 'SO + PO + Invoice', 'Three branded Advanced PDF transaction layouts'],
      ['Packing List', 'Invoice Action', 'View-mode button launches an on-demand PDF'],
      ['Runtime Flow', 'UE -> CS -> SL', 'User Event, Client Script, and Suitelet coordination']
    ],
    panelTitle: 'A Consistent Document Suite With an Interactive Packing Flow',
    panelCopy: 'Three packages deliver transaction layouts. The fourth adds a complete UI-to-render workflow so an invoice can produce a packing list on demand in a new browser tab.',
    stats: [
      ['Enhancements', '4', 'Sales Order, Purchase Order, Invoice, and Packing List'],
      ['Runtime Scripts', '3', 'User Event, Client Script, and PDF Suitelet'],
      ['PDF Templates', '4', 'One Advanced PDF layout per enhancement'],
      ['Explorer Files', '29', 'Readable scripts, templates, objects, JSON, and metadata']
    ],
    documentationSummary: 'A script-derived explanation of the transaction template family and the User Event to Client Script to Suitelet packing-list workflow.',
    codeSummary: 'A read-only explorer for all four enhancement packages, including templates, script deployments, client navigation, PDF rendering, and SDF metadata.',
    snapshots: [
      ['Sales Order PDF', 'ENH-127068 packages the Sales Order template and its NetSuite object definition.'],
      ['Purchase Order PDF', 'ENH-127069 delivers the corresponding purchase-side document layout.'],
      ['Invoice PDF', 'ENH-127070 completes the core sales-document family.'],
      ['Packing List Action', 'A View-mode User Event adds the Packing List button to Invoice.'],
      ['Safe Navigation', 'The Client Script validates the active invoice ID before resolving the Suitelet URL.'],
      ['Inline Rendering', 'The Suitelet validates input, renders the Advanced PDF, names it, and returns it inline.']
    ],
    documentation: {
      lead: 'This documentation was generated by processing the Spinel Europe User Event, Client Script, Suitelet, Advanced PDF templates, object XML, and deployment files. It describes the behavior evidenced by those sources.',
      panelTitle: 'Four Enhancements Form One Transaction-Document System',
      panelCopy: 'The first three enhancements establish the core PDF family. The fourth adds runtime coordination so users can generate a packing list directly from an invoice.',
      sidebarTitle: 'Implementation Evidence',
      sidebarCopy: 'The source separates presentation assets from runtime orchestration and packages each enhancement independently.',
      chips: ['User Event', 'Client Script', 'Suitelet', 'Advanced PDF', 'Invoice UI'],
      facts: [
        ['Core Layouts', 'Sales Order, Purchase Order, and Invoice PDF packages'],
        ['Interactive Output', 'Packing List generated from an Invoice view action'],
        ['Validation', 'Record ID, record type, request method, and render failures are guarded'],
        ['Packages', 'Four independent SDF enhancement workspaces']
      ],
      sections: [
        {
          title: 'Source Footprint',
          paragraphs: [
            'Spinel Europe is organized as four enhancement workspaces: ENH-127068 Sales Order PDF, ENH-127069 Purchase Order PDF, ENH-127070 Invoice PDF, and ENH-127795 Packing List PDF on Invoice. Each workspace includes SuiteCloud metadata, with the packing-list package also containing three runtime scripts.',
            'This split keeps each document deliverable independently deployable while preserving a consistent source hierarchy across the client portfolio.'
          ]
        },
        {
          title: 'Core Transaction Templates',
          paragraphs: [
            'The Sales Order, Purchase Order, and Invoice enhancements are template-led packages. Their Advanced PDF assets define the transaction presentation, while object XML registers the corresponding templates in NetSuite and the manifest and deploy files package the account changes.',
            'Together they establish a coherent document family across sales, procurement, and billing. The implementation keeps presentation changes inside version-controlled SDF projects rather than relying on account-only edits.'
          ]
        },
        {
          title: 'Invoice Button Injection',
          paragraphs: [
            'C127795_UE_CREATE_BUTTON.js is a User Event entry point. During beforeLoad, it limits the behavior to Invoice records opened in View mode, attaches the companion Client Script module, and adds a Packing List action to the form.',
            'That condition avoids exposing an output action in create or edit contexts where the transaction may not yet have a stable internal ID or final data state.'
          ]
        },
        {
          title: 'Client-Side Suitelet Launch',
          paragraphs: [
            'C127795_CS_LOADS_SUITELET.js reads the current Invoice ID, verifies that it is numeric, and resolves the internal URL for the packing-list Suitelet with the invoice ID and record type as parameters. It then opens the generated route in a separate tab.',
            'The Client Script is deliberately small: it owns UI navigation, while record loading and PDF rendering remain on the server. This keeps privileged processing out of the browser.'
          ]
        },
        {
          title: 'Validated PDF Rendering',
          paragraphs: [
            'C127795_SL_PACKAGING_LIST_PDF.js accepts GET requests, validates the supplied transaction identity, loads the Invoice, selects the Advanced PDF template by script ID, adds the transaction record to the renderer, and returns the result inline.',
            'The Suitelet also derives a meaningful file name from the packing-list number or transaction number. Error logging and a safe HTML error response prevent a failed render from producing an unexplained blank page.'
          ]
        },
        {
          title: 'Deployment and Traceability',
          paragraphs: [
            'Script record XML connects runtime files to NetSuite deployments, while template objects register the Advanced PDF assets. JSON project metadata, manifests, and deploy files complete the SDF packaging model.',
            'The explorer mirrors all four readable workspaces. Git internals, binary artifacts, and archive-level instructions are omitted so the hierarchy represents the implementation itself.'
          ]
        }
      ]
    },
    explorer: {
      files: '29',
      scripts: '3',
      packages: '4',
      format: 'JS + XML',
      panelTitle: 'Four Enhancement Packages, Preserved as Delivered',
      panelCopy: 'The explorer keeps each enhancement folder distinct and includes the runtime scripts, PDF assets, script records, project metadata, manifests, and deployment XML.',
      summary: [
        ['Template Family', 'Compare the Sales Order, Purchase Order, Invoice, and Packing List Advanced PDF assets.'],
        ['UI-to-PDF Workflow', 'Follow the Invoice User Event through the Client Script and into the server-side renderer.'],
        ['SDF Packaging', 'Inspect the objects and manifests that register and deploy every enhancement.']
      ]
    }
  },
  {
    slug: 'crwi-united-mining',
    name: 'United Mining Industries',
    shortName: 'United Mining',
    logo: 'images/experience/united-mining.svg',
    subtitle: 'Operational Controls Portfolio',
    kicker: 'CRW-I | Billable Project',
    projectFile: 'experience-crwi-united-mining.html',
    documentationFile: 'experience-crwi-united-mining-documentation.html',
    codeFile: 'experience-crwi-united-mining-code.html',
    dataFile: 'js/experience-code-data-crwi-united-mining.js',
    lead: 'A consolidated NetSuite portfolio spanning inventory adjustments, approvals, purchase controls, transaction classification, revision tracking, VAT handling, and PDF output. Duplicate archive snapshots are collapsed into 11 distinct capability packages.',
    meta: ['11 Enhancements', '32 Runtime Modules', '5 PDF Templates', 'Deduplicated Source'],
    heroNodes: [
      ['Operations', 'Inventory + Purchasing', 'Adjustment workflows, WBS fields, costing, and budget controls'],
      ['Governance', 'Approvals + Revisions', 'Comments, lists, rejection detail, and PO revision tracking'],
      ['Outputs', 'PDF + Classification', 'Transaction documents, VAT behavior, and Department-to-Activity mapping']
    ],
    panelTitle: 'A Broad Control Portfolio, Consolidated Without Repeated Projects',
    panelCopy: 'The supplied archive contains repeated numbered snapshots. The published hierarchy keeps one canonical package per capability and removes byte-identical support files while retaining distinct runtime behavior.',
    stats: [
      ['Enhancements', '11', 'Canonical capabilities after duplicate-folder consolidation'],
      ['Runtime Modules', '32', 'SuiteScript entry points, libraries, and supporting modules'],
      ['PDF Templates', '5', 'Purchase Order, Invoice, and Item Receipt document assets'],
      ['Explorer Files', '116', 'Unique readable source files after duplicate removal']
    ],
    documentationSummary: 'A source-derived architecture record covering inventory controls, approvals, WBS and budget logic, PDF output, VAT behavior, classification mapping, and revision governance.',
    codeSummary: 'A deduplicated explorer containing one canonical project folder per United Mining capability and only one copy of byte-identical source files.',
    snapshots: [
      ['Inventory Adjustment', 'Parent, child, native transaction, inventory-detail, sourcing, and approval flows operate as one control family.'],
      ['Approval Governance', 'Comments, approval lists, rule sequencing, and rejection details span bills, journals, and purchase orders.'],
      ['PO Cost Controls', 'WBS classifications, line amounts, approved amounts, early approval, and over-budget checks shape purchasing behavior.'],
      ['Department Mapping', 'Client and server modules derive Activity values from Department configuration.'],
      ['Document Output', 'Purchase Order, Invoice, and Item Receipt assets package controlled transaction printing.'],
      ['Finance Integrity', 'Non-refundable VAT handling and Purchase Order revision tracking protect downstream accounting and audit context.']
    ],
    documentation: {
      lead: 'This documentation was produced by processing the canonical United Mining scripts, libraries, templates, object XML, manifests, and deployment files. Repeated numbered workspace copies were identified and removed before the behavior was documented.',
      panelTitle: 'Eleven Distinct Capabilities Behind One Client Portfolio',
      panelCopy: 'The source is broader than a single enhancement. It forms an operational-control layer across inventory, purchasing, approvals, accounting behavior, classification, and printed output.',
      sidebarTitle: 'Canonical Source Model',
      sidebarCopy: 'Each capability is documented once. Later or more complete workspace copies were selected where repeated folders represented the same enhancement.',
      chips: ['Inventory', 'Approvals', 'Purchasing', 'Advanced PDF', 'Revision Control'],
      facts: [
        ['Deduplication', '11 canonical packages replace repeated numbered workspace copies'],
        ['Runtime', '32 unique SuiteScript modules and libraries'],
        ['Metadata', 'Script, custom-record, field, list, form, search, and template objects'],
        ['Deployment', '116 readable canonical files after exact duplicates are removed']
      ],
      sections: [
        {
          title: 'Source Consolidation',
          paragraphs: [
            'The archive contains a base United Mining workspace plus numbered copies through United Mining-17, with additional nested copies in some folders. Several of those directories represent the same Inventory Adjustment, Department-to-Activity, Purchase Order template, Purchase Requisition, or Purchase Order Revision project.',
            'The published hierarchy selects one canonical package for each capability and then removes byte-identical support files shared by those packages. Genuine modules remain available; repeated project snapshots do not appear as separate work.'
          ]
        },
        {
          title: 'Inventory Adjustment Control Family',
          paragraphs: [
            'The C128413 package is the largest single workflow. Client Scripts, User Events, Suitelets, and a shared sourcing library coordinate parent and child custom records, native Inventory Adjustments, inventory-detail entry, approval processing, and status transitions.',
            'The Suitelets source inventory values, capture detailed inventory assignments, and process approval outcomes. User Events keep custom and native records aligned, while the custom records and status list provide a controlled lifecycle around the adjustment rather than allowing an untracked direct transaction.'
          ]
        },
        {
          title: 'Department-to-Activity Classification',
          paragraphs: [
            'The C132716 package includes a Client Script, User Event, shared mapping library, custom mapping record, and script deployments. Its purpose is to derive or validate transaction Activity values from Department configuration in both interactive and server-side contexts.',
            'Using the same mapping library across entry points reduces the risk that browser entry and non-browser processing assign different classifications.'
          ]
        },
        {
          title: 'Approval Comments, Lists, and Rejections',
          paragraphs: [
            'The C134310 scripts provide an approval-comment interaction through a Client Script, Suitelet, and User Event backed by approval comment and configuration records. The C134824 family extends governance with approval lists, approval-rule sequencing, and rejection-detail presentation.',
            'Separate User Events cover Vendor Bills, Journal Entries, and Purchase Orders for approved and rejected states. Supporting body fields and rejection-reason records preserve who acts next and why a transaction did not proceed.'
          ]
        },
        {
          title: 'Purchase Order Cost and Budget Controls',
          paragraphs: [
            'ccc-purchase-order-ue.js enriches Purchase Order lines with Work Breakdown Structure area, level-two breakdown, work type, cost code, and formatted amount fields. Related custom lists, records, fields, and a saved search provide the account metadata behind those classifications.',
            'The package also preserves approved purchasing amounts, exposes an early-approval path, and checks budget conditions. These behaviors put project-cost governance directly into transaction entry rather than leaving it to a later report.'
          ]
        },
        {
          title: 'Transaction Documents and Forms',
          paragraphs: [
            'The canonical source includes Purchase Order and Invoice Advanced PDF layouts, an Item Receipt PDF template, and a Purchase Requisition custom form. The Item Receipt package uses a User Event, Client Script, and Suitelet to add and serve a controlled print action.',
            'Template objects, font attributes, script records, manifests, and deploy files package the presentation assets beside their runtime triggers. Duplicate copies of the Purchase Order layout and Purchase Requisition form are intentionally represented once.'
          ]
        },
        {
          title: 'VAT Handling and Purchase Order Revisions',
          paragraphs: [
            'The non-refundable VAT package combines a User Event with a shared library to apply account-specific VAT behavior during transaction processing. Keeping the calculation in a library separates reusable accounting logic from the record entry point.',
            'The C135961 Purchase Order revision User Event detects material changes on an approved order, increments the revision once per approval cycle, and uses body flags to avoid repeated increments. This creates a visible audit signal when approved purchasing data changes.'
          ]
        },
        {
          title: 'Deployment Model',
          paragraphs: [
            'Across the portfolio, SDF object XML defines scripts, custom records, fields, lists, forms, searches, and templates. File Cabinet assets hold executable modules and PDF resources, while manifest and deploy files make each capability independently traceable.',
            'The code explorer exposes only the canonical readable implementation. Git history, binary fonts, operating-system artifacts, embedded archive instructions, superseded duplicate folders, and exact duplicate files are not published.'
          ]
        }
      ]
    },
    explorer: {
      files: '116',
      scripts: '32',
      packages: '11',
      format: 'JS + XML',
      panelTitle: 'Canonical Packages Without Duplicate Workspace Copies',
      panelCopy: 'The tree is grouped by business capability instead of numbered archive folders. Exact duplicates are removed, and the selected inventory, approval, purchasing, PDF, VAT, mapping, and revision sources remain inspectable.',
      summary: [
        ['Capability-Based Tree', 'Open meaningful package names instead of United Mining-1 through United Mining-17 duplicates.'],
        ['Complete Runtime Surface', 'Inspect 32 unique entry points, libraries, and support modules across the portfolio.'],
        ['Deployment Context', 'Read object XML and project metadata beside the code that depends on it.']
      ]
    }
  }
];

function writeFile(relativePath, content) {
  fs.writeFileSync(path.join(workspaceRoot, relativePath), `${content.trim()}\n`, 'utf8');
  console.log(`generated ${relativePath}`);
}

function pageHead(title, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="description" content="${description}">
  <script src="js/theme-init.js"></script>
  <link rel="stylesheet" href="css/animate.css">
  <link rel="stylesheet" href="css/flexslider.css">
  <link rel="stylesheet" href="fonts/icomoon/style.css">
  <link rel="stylesheet" href="css/bootstrap.css">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/experience-pages.css">
  <link rel="stylesheet" href="css/mobile-responsive.css">
  <link href="https://fonts.googleapis.com/css?family=Nunito+Sans:200,300,400,700" rel="stylesheet">
  <link rel="stylesheet" href="css/home-page-system.css">
  <link rel="stylesheet" href="css/theme-toggle.css">
</head>`;
}

function navigation(id, backHref, links) {
  return `<nav class="navbar navbar-expand-lg site-navbar navbar-light bg-light" id="pb-navbar">
    <div class="container">
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#${id}" aria-controls="${id}" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-md-center" id="${id}">
        <ul class="navbar-nav">
          <li class="nav-item"><a class="nav-link" href="${backHref}">Back</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
          ${links.map((link) => `<li class="nav-item"><a class="nav-link" href="${link[0]}">${link[1]}</a></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </nav>`;
}

function footer(extraScripts = []) {
  const additionalScripts = extraScripts
    .map((script) => `  <script src="${script}"></script>`)
    .join('\n');
  const additionalScriptBlock = additionalScripts ? `${additionalScripts}\n` : '';
  return `<footer class="site-footer">
    <div class="container">
      <div class="row mb-5">
        <p class="col-12 text-center">
          Copyright &copy; <script>document.write(new Date().getFullYear());</script> All rights reserved | This website is made with <i class="icon-heart text-danger" aria-hidden="true"></i> by <a href="index.html" class="text-primary">Manu Chaitanya</a>
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
${additionalScriptBlock}  <script src="js/experience-pages.js"></script>
  <script src="js/back-nav.js"></script>
  <script src="js/home-page-system.js"></script>
  <script src="js/theme-toggle.js"></script>
</body>
</html>`;
}

function metaChips(items) {
  return `<div class="experience-meta reveal">${items.map((item) => `<div class="experience-meta-chip">${item}</div>`).join('')}</div>`;
}

function heroStrip(items) {
  return `<div class="hero-strip reveal">${items.map((item) => `<div class="hero-node"><div class="hero-node-label">${item[0]}</div><strong>${item[1]}</strong><span>${item[2]}</span></div>`).join('')}</div>`;
}

function stats(items) {
  return `<div class="experience-stats">${items.map((item) => `<div class="experience-stat"><div class="experience-stat-label">${item[0]}</div><div class="experience-stat-value">${item[1]}</div><div class="experience-stat-sub">${item[2]}</div></div>`).join('')}</div>`;
}

function snapshots(items) {
  return `<div class="snapshot-grid">${items.map((item) => `<div class="snapshot-card"><strong>${item[0]}</strong><p>${item[1]}</p></div>`).join('')}</div>`;
}

function projectCard(project) {
  const logoClass = project.logo.endsWith('.svg') ? ' experience-card-logo--wide' : '';
  return `<article class="experience-card reveal">
    <div class="experience-card-logo${logoClass}"><img src="${project.logo}" alt="${project.name}"></div>
    <div class="experience-card-kicker">Billable Project</div>
    <h3>${project.name}</h3>
    <p class="experience-card-copy">${project.lead}</p>
    <div class="experience-card-meta">${project.meta.slice(0, 3).map((item) => `<span class="experience-tag">${item}</span>`).join('')}</div>
    <div class="experience-card-footer">
      <span>Documentation and source are organized beneath this project.</span>
      <a href="${project.projectFile}" class="btn btn-outline-primary">Open Project</a>
    </div>
  </article>`;
}

function renderTrack() {
  const title = 'CRW-I | Crowe Horwath';
  return `${pageHead(title, 'CRW-I billable delivery across Krayden, Spinel Europe, and United Mining Industries.')}
<body class="experience-body" data-spy="scroll" data-target="#pb-navbar" data-offset="200">
  ${navigation('nav-experience-crw-i', 'experience.html', [
    ['#section-crwi-home', 'Overview'],
    ['#section-crwi-projects', 'Billable Projects'],
    ['#section-crwi-snapshot', 'Snapshot']
  ])}
  <section class="experience-hero" id="section-crwi-home">
    <div class="experience-shell">
      <div class="row align-items-center">
        <div class="col-xl-7 col-lg-7 mb-5 mb-lg-0">
          <span class="experience-pill reveal">Crowe Horwath Journey Track</span>
          <h1 class="experience-title reveal">CRW-I <strong>Billable Delivery</strong></h1>
          ${metaChips(['3 Billable Projects', 'SuiteCloud + SuiteScript', 'Document Engineering', 'Operational Controls'])}
          <p class="experience-lead reveal">CRW-I brings together three client portfolios: transaction-document engineering for Krayden and Spinel Europe, plus a broad operational-control implementation for United Mining Industries. Every project links to documentation generated from its supplied scripts and a read-only source explorer.</p>
          ${heroStrip([
            ['Project 01', 'Krayden', 'Differentiated UOM and CMR document enhancements'],
            ['Project 02', 'Spinel Europe', 'Sales, purchase, invoice, and packing-list PDFs'],
            ['Project 03', 'United Mining', 'Inventory, purchasing, approval, and finance controls']
          ])}
          <div class="experience-actions reveal"><a href="#section-crwi-projects" class="btn btn-primary px-4 py-3">Open Billable Projects</a><a href="#section-crwi-snapshot" class="btn btn-secondary px-4 py-3">View Delivery Snapshot</a></div>
        </div>
        <div class="col-xl-5 col-lg-5">
          <div class="experience-panel reveal">
            <div class="panel-kicker">Track Snapshot</div>
            <h3>Source-Backed Delivery Across Documents and Controls</h3>
            <p class="panel-copy">The supplied workspaces contain executable SuiteScript, Advanced PDF templates, NetSuite object definitions, and SDF deployment metadata. United Mining copies are consolidated before counting or display.</p>
            ${stats([
              ['Billable Projects', '3', 'Krayden, Spinel Europe, and United Mining Industries'],
              ['SuiteScript Modules', '36', 'Unique runtime and support modules across the three clients'],
              ['Readable Files', '167', 'Canonical scripts, templates, object definitions, and metadata'],
              ['United Packages', '11', 'Distinct capabilities after duplicate projects are removed']
            ])}
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="experience-section" id="section-crwi-projects">
    <div class="experience-shell">
      <div class="row mb-5"><div class="col-12"><div class="section-heading text-center reveal"><h2>Billable <strong>Projects</strong></h2></div></div></div>
      <div class="track-grid">${projects.map(projectCard).join('\n')}</div>
    </div>
  </section>
  <section class="experience-section pt-0" id="section-crwi-snapshot">
    <div class="experience-shell">
      <div class="experience-surface reveal">
        <div class="surface-kicker">Delivery Snapshot</div>
        <h3>Three Clients, One Traceable Project Hierarchy</h3>
        <p class="surface-copy">Each client follows the same path: project context, source-derived documentation, and an inspectable code workspace.</p>
        ${snapshots([
          ['Document Engineering', 'Krayden and Spinel show how runtime data, transaction context, and Advanced PDF assets are packaged together.'],
          ['Operational Controls', 'United Mining moves deeper into inventory, purchasing, approvals, classification, and accounting behavior.'],
          ['Source Traceability', 'Documentation points back to real entry points, libraries, object XML, templates, and deployment files.'],
          ['Duplicate Control', 'Repeated United Mining archive snapshots are collapsed into one canonical capability tree.'],
          ['Independent Navigation', 'Every project has direct Documentation and Code Explorer children.'],
          ['Preserved History', 'Earlier Internship Program pages remain separate and unchanged by this CRW-I hierarchy.']
        ])}
      </div>
    </div>
  </section>
  ${footer()}`;
}

function renderProject(project) {
  const logoClass = project.logo.endsWith('.svg') ? ' experience-card-logo--wide' : '';
  return `${pageHead(`${project.name} | CRW-I`, `${project.name} CRW-I project overview and deliverables.`)}
<body class="experience-body" data-spy="scroll" data-target="#pb-navbar" data-offset="200">
  ${navigation(`nav-${project.slug}`, 'experience-crw-i.html', [
    ['#section-project-overview', 'Overview'],
    ['#section-project-deliverables', 'Deliverables'],
    ['#section-project-snapshot', 'Project Snapshot']
  ])}
  <section class="experience-hero" id="section-project-overview">
    <div class="experience-shell">
      <div class="row align-items-center">
        <div class="col-xl-7 col-lg-7 mb-5 mb-lg-0">
          <span class="experience-pill reveal">${project.kicker}</span>
          <h1 class="experience-title reveal">${project.name} <strong>${project.subtitle}</strong></h1>
          ${metaChips(['CRW-I', ...project.meta.slice(0, 3)])}
          <p class="experience-lead reveal">${project.lead}</p>
          ${heroStrip(project.heroNodes)}
          <div class="experience-actions reveal"><a href="${project.documentationFile}" class="btn btn-primary px-4 py-3">Open Documentation</a><a href="${project.codeFile}" class="btn btn-secondary px-4 py-3">Open Code Explorer</a></div>
        </div>
        <div class="col-xl-5 col-lg-5">
          <div class="experience-panel reveal">
            <div class="panel-kicker">Project Snapshot</div>
            <h3>${project.panelTitle}</h3>
            <p class="panel-copy">${project.panelCopy}</p>
            ${stats(project.stats)}
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="experience-section" id="section-project-deliverables">
    <div class="experience-shell">
      <div class="row mb-5"><div class="col-12"><div class="section-heading text-center reveal"><h2>${project.shortName} <strong>Deliverables</strong></h2></div></div></div>
      <div class="track-grid track-grid--two">
        <article class="experience-card reveal">
          <div class="experience-card-logo${logoClass}"><img src="${project.logo}" alt="${project.name}"></div>
          <div class="experience-card-kicker">Child 01</div>
          <h3>Documentation</h3>
          <p class="experience-card-copy">${project.documentationSummary}</p>
          <div class="experience-card-meta"><span class="experience-tag">Source-Derived</span><span class="experience-tag">Architecture</span><span class="experience-tag">Workflow</span></div>
          <div class="experience-card-footer"><span>Start here for the implementation narrative and source evidence.</span><a href="${project.documentationFile}" class="btn btn-outline-primary">Open Documentation</a></div>
        </article>
        <article class="experience-card reveal">
          <div class="experience-card-logo${logoClass}"><img src="${project.logo}" alt="${project.name}"></div>
          <div class="experience-card-kicker">Child 02</div>
          <h3>Code Explorer</h3>
          <p class="experience-card-copy">${project.codeSummary}</p>
          <div class="experience-card-meta"><span class="experience-tag">Read-Only</span><span class="experience-tag">Scripts + Objects</span><span class="experience-tag">SDF Source</span></div>
          <div class="experience-card-footer"><span>Inspect the implementation file by file in its project hierarchy.</span><a href="${project.codeFile}" class="btn btn-outline-primary">Open Code</a></div>
        </article>
      </div>
    </div>
  </section>
  <section class="experience-section pt-0" id="section-project-snapshot">
    <div class="experience-shell"><div class="experience-surface reveal">
      <div class="surface-kicker">Implementation Surface</div>
      <h3>What the ${project.shortName} Source Contains</h3>
      <p class="surface-copy">The cards below summarize the implementation signals found in the supplied source package.</p>
      ${snapshots(project.snapshots)}
    </div></div>
  </section>
  ${footer()}`;
}

function renderDocumentation(project) {
  const documentation = project.documentation;
  return `${pageHead(`Documentation | ${project.name}`, `Source-derived documentation for the ${project.name} CRW-I project.`)}
<body class="experience-body" data-spy="scroll" data-target="#pb-navbar" data-offset="200">
  ${navigation(`nav-${project.slug}-documentation`, project.projectFile, [
    ['#section-documentation-home', 'Overview'],
    ['#section-documentation-content', 'Documentation']
  ])}
  <section class="experience-hero" id="section-documentation-home">
    <div class="experience-shell">
      <div class="row align-items-center">
        <div class="col-xl-7 col-lg-7 mb-5 mb-lg-0">
          <span class="experience-pill reveal">Script-Derived Documentation</span>
          <h1 class="experience-title reveal">${project.name} <strong>Implementation Documentation</strong></h1>
          ${metaChips(['CRW-I', 'Processed From Source', 'Runtime + Metadata', 'No Archive Instructions'])}
          <p class="experience-lead reveal">${documentation.lead}</p>
          <div class="experience-actions reveal"><a href="${project.codeFile}" class="btn btn-primary px-4 py-3">Open Code Explorer</a><a href="${project.projectFile}" class="btn btn-secondary px-4 py-3">Open Project Page</a></div>
        </div>
        <div class="col-xl-5 col-lg-5">
          <div class="experience-panel reveal">
            <div class="panel-kicker">Documentation Frame</div>
            <h3>${documentation.panelTitle}</h3>
            <p class="panel-copy">${documentation.panelCopy}</p>
            ${stats([
              ['Source Basis', 'CODE', 'Runtime scripts and shared libraries'],
              ['Account Model', 'XML', 'Objects, deployments, fields, records, and templates'],
              ['Delivery Model', 'SDF', 'Manifest and deploy metadata'],
              ['Document Status', 'LIVE', 'Generated from the supplied implementation archive']
            ])}
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="experience-section" id="section-documentation-content">
    <div class="experience-shell">
      <div class="fdd-overview reveal">
        <aside class="fdd-sidebar">
          <div class="panel-kicker">Source Basis</div>
          <h3>${documentation.sidebarTitle}</h3>
          <p class="fdd-copy">${documentation.sidebarCopy}</p>
          <div class="experience-card-meta">${documentation.chips.map((chip) => `<span class="experience-note-chip">${chip}</span>`).join('')}</div>
          <ul class="fdd-list">${documentation.facts.map((fact) => `<li><strong>${fact[0]}</strong><span>${fact[1]}</span></li>`).join('')}</ul>
        </aside>
        <div class="fdd-main">
          <div class="surface-kicker">Implementation Narrative</div>
          <h3>How the ${project.shortName} Delivery Works</h3>
          ${documentation.sections.map((section) => `<div class="fdd-section"><h4>${section.title}</h4>${section.paragraphs.map((paragraph) => `<p class="fdd-copy">${paragraph}</p>`).join('')}</div>`).join('\n          ')}
        </div>
      </div>
    </div>
  </section>
  ${footer()}`;
}

function renderExplorer(project) {
  const explorer = project.explorer;
  return `${pageHead(`Code Explorer | ${project.name}`, `Read-only code explorer for the ${project.name} CRW-I project.`)}
<body class="experience-body" data-spy="scroll" data-target="#pb-navbar" data-offset="200">
  ${navigation(`nav-${project.slug}-code`, project.projectFile, [
    ['#section-explorer-home', 'Overview'],
    ['#section-explorer-summary', 'Summary'],
    ['#section-code-explorer', 'Explorer']
  ])}
  <section class="experience-hero" id="section-explorer-home">
    <div class="experience-shell">
      <div class="row align-items-center">
        <div class="col-xl-7 col-lg-7 mb-5 mb-lg-0">
          <span class="experience-pill reveal">Read-Only Code Explorer</span>
          <h1 class="experience-title reveal">${project.name} <strong>Source Workspace</strong></h1>
          ${metaChips(['CRW-I', `${explorer.files} Readable Files`, `${explorer.packages} Canonical Packages`, 'Copy Support'])}
          <p class="experience-lead reveal">${project.codeSummary}</p>
          <div class="experience-actions reveal"><a href="${project.documentationFile}" class="btn btn-primary px-4 py-3">Open Documentation</a><a href="${project.projectFile}" class="btn btn-secondary px-4 py-3">Open Project Page</a></div>
        </div>
        <div class="col-xl-5 col-lg-5">
          <div class="experience-panel reveal">
            <div class="panel-kicker">Explorer Scope</div>
            <h3>${explorer.panelTitle}</h3>
            <p class="panel-copy">${explorer.panelCopy}</p>
            ${stats([
              ['Workspace Files', explorer.files, 'Readable canonical files available in the explorer'],
              ['Runtime Modules', explorer.scripts, 'SuiteScript entry points, libraries, and helpers'],
              ['Delivery Packages', explorer.packages, 'Distinct enhancement or capability workspaces'],
              ['Format Mix', explorer.format, 'Runtime source paired with NetSuite account metadata']
            ])}
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="experience-section pt-0" id="section-explorer-summary">
    <div class="experience-shell"><div class="experience-surface reveal">
      <div class="surface-kicker">Explorer Summary</div>
      <h3>What to Inspect in the ${project.shortName} Workspace</h3>
      <p class="surface-copy">Select any file in the hierarchy to read its supplied source. The explorer is intentionally read-only.</p>
      ${snapshots(explorer.summary)}
    </div></div>
  </section>
  <section class="experience-section" id="section-code-explorer">
    <div class="experience-shell">
      <div class="explorer-layout reveal" data-code-workbench>
        <aside class="code-sidebar">
          <h3>${project.shortName} Workspace</h3>
          <div class="code-tree" id="experienceCodeTree"></div>
        </aside>
        <div class="code-window">
          <div class="code-topbar">
            <div class="code-tab-meta"><strong id="experienceCodeTitle">Loading Explorer</strong><span id="experienceCodePath">Preparing canonical source...</span></div>
            <button class="btn btn-outline-primary code-copy-btn" id="experienceCodeCopy" type="button">Copy Current File</button>
          </div>
          <div class="code-editor-header"><span class="code-dot red"></span><span class="code-dot amber"></span><span class="code-dot green"></span><span class="bravo-date" id="experienceCodeStatus">Read-Only Source</span></div>
          <div class="code-editor-wrap" id="experienceCodeBody"></div>
        </div>
      </div>
    </div>
  </section>
  ${footer([project.dataFile])}`;
}

writeFile('experience-crw-i.html', renderTrack());
projects.forEach((project) => {
  writeFile(project.projectFile, renderProject(project));
  writeFile(project.documentationFile, renderDocumentation(project));
  writeFile(project.codeFile, renderExplorer(project));
});
