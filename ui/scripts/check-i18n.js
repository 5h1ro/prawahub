#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const colorize = (text, color) => `${color}${text}${colors.reset}`;

const projectRoot = path.resolve(__dirname, '..');
const localesDir = path.join(projectRoot, 'i18n', 'locales');
const primaryLocale = 'en';
const primaryFile = path.join(localesDir, `${primaryLocale}.json`);

if (!fs.existsSync(localesDir)) {
  console.error(colorize(`Locales directory not found: ${localesDir}`, colors.red));
  process.exit(1);
}

if (!fs.existsSync(primaryFile)) {
  console.error(
    colorize(`Primary locale file (${primaryLocale}) not found in ${localesDir}`, colors.red)
  );
  process.exit(1);
}

const gitignorePath = path.join(projectRoot, '.gitignore');
const gitignoreEntries = new Set();

if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  gitignoreContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const normalized = line.replace(/\/+$/, '');
      if (normalized) {
        gitignoreEntries.add(normalized);
      }
    });
}

const ignorePaths = new Set([
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  'dist',
  'coverage',
  'scripts',
  '.yarn',
  '.idea',
  ...gitignoreEntries
]);

const readJson = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(colorize(`Failed to read ${filePath}: ${error.message}`, colors.red));
    process.exit(1);
  }
};

const flattenKeys = (obj, prefix = '') => {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

const includeExtensions = new Set(['.vue', '.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs']);

const collectCodeFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignorePaths.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCodeFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (includeExtensions.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
};

const collectUsedKeys = (codeFiles) => {
  const usage = new Set();
  const usagePattern = /(?:\bthis\.)?(?:\b\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+?)\1/g;
  const keypathPattern = /<i18n-t[^>]*\b(?:keypath|path)\s*=\s*(['"`])([^'"`]+?)\1/gi;

  for (const file of codeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = usagePattern.exec(content)) !== null) {
      const key = match[2].trim();
      if (key) {
        usage.add(key);
      }
    }

    while ((match = keypathPattern.exec(content)) !== null) {
      const key = match[2].trim();
      if (key) {
        usage.add(key);
      }
    }
  }

  return usage;
};

const sortKeys = (iterable) => Array.from(iterable).sort();

const primaryData = readJson(primaryFile);
const primaryKeys = new Set(flattenKeys(primaryData));

const codeFiles = collectCodeFiles(projectRoot);
const usedKeys = collectUsedKeys(codeFiles);

const ignoredUnusedKeys = new Set(['FAILED', 'SCAN_QR_CODE', 'STARTING', 'STOPPED', 'WORKING']);

const missingInPrimary = sortKeys([...usedKeys].filter((key) => !primaryKeys.has(key)));
const unusedInPrimary = sortKeys(
  [...primaryKeys]
    .filter((key) => !usedKeys.has(key))
    .filter((key) => !ignoredUnusedKeys.has(key))
);

const printKeyGroup = (label, keys, color) => {
  if (keys.length === 0) {
    console.log(colorize(`  ${label}: none`, colors.green));
  } else {
    console.log(colorize(`  ${label} (${keys.length}):`, color));
    keys.forEach((key) => console.log(`    - ${key}`));
  }
};

console.log(colorize(`Checking primary locale (${primaryLocale}) usage`, colors.cyan));
printKeyGroup('Missing in en.json (used but undefined)', missingInPrimary, colors.red);
printKeyGroup('Unused in en.json (defined but unused)', unusedInPrimary, colors.yellow);

const localeFiles = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    name: path.basename(file, '.json'),
    path: path.join(localesDir, file)
  }))
  .filter((locale) => locale.name !== primaryLocale);

if (localeFiles.length === 0) {
  console.log(colorize('No additional locale files found.', colors.yellow));
  process.exit(0);
}

for (const locale of localeFiles) {
  const localeData = readJson(locale.path);
  const localeKeys = new Set(flattenKeys(localeData));

  const missingKeys = sortKeys([...primaryKeys].filter((key) => !localeKeys.has(key)));
  const extraKeys = sortKeys([...localeKeys].filter((key) => !primaryKeys.has(key)));

  console.log(colorize(`\nLocale: ${locale.name}`, colors.bold));
  printKeyGroup('Missing keys (needs translation)', missingKeys, colors.red);
  printKeyGroup('Extra keys (not present in en.json)', extraKeys, colors.yellow);
}

console.log(
  colorize(
    `\nChecked ${codeFiles.length} source files and ${localeFiles.length + 1} locale files.`,
    colors.cyan
  )
);
