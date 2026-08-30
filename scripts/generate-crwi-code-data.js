#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const archiveRoot = process.env.CRWI_ARCHIVE_ROOT || '/tmp/codex-crwi-20260830';
const readableExtensions = new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.md',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
]);
const ignoredNames = new Set(['.DS_Store', '.gitignore', 'README.md']);
const ignoredDirectories = new Set(['.git', '__MACOSX', 'node_modules']);

const projects = [
  {
    id: 'krayden',
    project: 'Krayden',
    rootLabel: 'Krayden CRW-I Workspace',
    output: 'js/experience-code-data-crwi-krayden.js',
    defaultFile: 'c97462_sl_send_data_to_pdf.js',
    roots: [
      {
        source: path.join(archiveRoot, 'krayden'),
        flatten: true
      }
    ]
  },
  {
    id: 'spinel',
    project: 'Spinel Europe',
    rootLabel: 'Spinel Europe CRW-I Workspace',
    output: 'js/experience-code-data-crwi-spinel.js',
    defaultFile: 'C127795_SL_PACKAGING_LIST_PDF.js',
    roots: [
      {
        source: path.join(archiveRoot, 'spinel', 'Spinel Europe'),
        flatten: true
      }
    ]
  },
  {
    id: 'united-mining',
    project: 'United Mining Industries',
    rootLabel: 'United Mining CRW-I Workspace',
    output: 'js/experience-code-data-crwi-united-mining.js',
    defaultFile: 'C128413_SL_ProcessApproval.js',
    deduplicateByContent: true,
    roots: [
      {
        label: 'BL-136054 Purchase Order PDF',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining')
      },
      {
        label: 'DT-132098 Non-Refundable VAT',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-2')
      },
      {
        label: 'ENH-128824 Purchase Requisition Form',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-3')
      },
      {
        label: 'ENH-128419 Invoice PDF Layout',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-4')
      },
      {
        label: 'ENH-128426 Item Receipt PDF',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-5')
      },
      {
        label: 'ENH-132716 Department Activity Mapping',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-9')
      },
      {
        label: 'ENH-128413 Inventory Adjustment Controls',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-8'),
        exclude: [
          'src/FileCabinet/SuiteScripts/C128413_LIB_DepartmentActivityMapping.js',
          'src/Objects/customrecord_c132716_depy_activity_map.xml'
        ]
      },
      {
        label: 'ENH-134310 Approval Comments',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-10')
      },
      {
        label: 'BL-134719 Purchase Order Cost Controls',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-11')
      },
      {
        label: 'ENH-134824 Approval Lists and Rejections',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-13')
      },
      {
        label: 'ENH-135961 Purchase Order Revision Tracking',
        source: path.join(archiveRoot, 'united', 'United Mining', 'United Mining-17')
      }
    ]
  }
];

function languageFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'css',
    '.csv': 'csv',
    '.html': 'html',
    '.js': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.txt': 'text',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  }[extension] || 'text';
}

function isReadableSource(filePath) {
  const fileName = path.basename(filePath);
  if (ignoredNames.has(fileName) || fileName.startsWith('._')) return false;
  return readableExtensions.has(path.extname(fileName).toLowerCase());
}

function walkFiles(directory, baseDirectory, records) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));

  entries.forEach((entry) => {
    if (ignoredDirectories.has(entry.name) || entry.name.startsWith('._')) return;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, baseDirectory, records);
      return;
    }
    if (!entry.isFile() || !isReadableSource(absolutePath)) return;
    records.push({
      absolutePath,
      relativePath: path.relative(baseDirectory, absolutePath).split(path.sep).join('/')
    });
  });
}

function makeKey(relativePath, index) {
  const slug = relativePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-72);
  return `${String(index + 1).padStart(3, '0')}-${slug || 'file'}`;
}

function insertTreeFile(tree, displayPath, key) {
  const parts = displayPath.split('/');
  const fileName = parts.pop();
  let level = tree;

  parts.forEach((part) => {
    let folder = level.find((node) => node.type === 'folder' && node.label === part);
    if (!folder) {
      folder = { label: part, type: 'folder', expanded: level === tree, children: [] };
      level.push(folder);
    }
    level = folder.children;
  });

  level.push({ label: fileName, type: 'file', key });
}

function buildProject(project) {
  const collected = [];
  const hashes = new Set();
  let duplicateCount = 0;

  project.roots.forEach((root) => {
    if (!fs.existsSync(root.source)) {
      throw new Error(`Missing source directory: ${root.source}`);
    }

    const rootFiles = [];
    walkFiles(root.source, root.source, rootFiles);
    rootFiles.forEach((record) => {
      if ((root.exclude || []).includes(record.relativePath)) return;
      const code = fs.readFileSync(record.absolutePath, 'utf8');
      if (project.deduplicateByContent) {
        const hash = crypto.createHash('sha256').update(code).digest('hex');
        if (hashes.has(hash)) {
          duplicateCount += 1;
          return;
        }
        hashes.add(hash);
      }

      collected.push({
        ...record,
        code,
        displayPath: root.flatten
          ? record.relativePath
          : `${root.label}/${record.relativePath}`,
        section: root.label || record.relativePath.split('/')[0]
      });
    });
  });

  collected.sort((left, right) => left.displayPath.localeCompare(right.displayPath, undefined, { numeric: true }));

  const files = {};
  const tree = [];
  let defaultKey = '';
  collected.forEach((record, index) => {
    const key = makeKey(record.displayPath, index);
    const label = path.basename(record.displayPath);
    files[key] = {
      label,
      section: record.section,
      project: project.project,
      path: record.displayPath,
      language: languageFor(record.displayPath),
      code: record.code
    };
    insertTreeFile(tree, record.displayPath, key);
    if (!defaultKey && label.toLowerCase() === project.defaultFile.toLowerCase()) {
      defaultKey = key;
    }
  });

  if (!defaultKey && collected.length) defaultKey = Object.keys(files)[0];
  const data = {
    rootLabel: project.rootLabel,
    defaultKey,
    files,
    tree
  };
  const outputPath = path.join(workspaceRoot, project.output);
  const output = `/* Generated from the supplied CRW-I source archives. */\nwindow.EXPERIENCE_CODE = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(outputPath, output, 'utf8');

  const extensionCounts = collected.reduce((counts, record) => {
    const extension = path.extname(record.displayPath).toLowerCase() || '(none)';
    counts[extension] = (counts[extension] || 0) + 1;
    return counts;
  }, {});
  return {
    id: project.id,
    output: project.output,
    files: collected.length,
    duplicatesRemoved: duplicateCount,
    extensionCounts
  };
}

const reports = projects.map(buildProject);
reports.forEach((report) => {
  console.log(`${report.id}: ${report.files} files, ${report.duplicatesRemoved} duplicate files removed`);
  console.log(`  ${Object.entries(report.extensionCounts).map(([extension, count]) => `${extension}=${count}`).join(', ')}`);
  console.log(`  -> ${report.output}`);
});
