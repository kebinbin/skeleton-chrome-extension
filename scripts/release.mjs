import { deflateRawSync } from "node:zlib";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_DIRECTORIES = ["content", "css", "images", "shared"];
const RELEASE_ROOT_FILES = [
  "background.js",
  "manifest.json",
  "options.html",
  "options.js",
];
const REQUIRED_RUNTIME_FILES = [
  "content/element-inspector-logic.js",
  "content/element-inspector.js",
  "content/grid-overlay-logic.js",
  "content/grid-overlay.js",
  "content/overflow-logic.js",
  "content/overflow.js",
  "css/options.css",
  "shared/config.js",
  "shared/settings-state.js",
];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json"]);

const archivePath = (absolutePath) =>
  relative(ROOT, absolutePath).split(sep).join("/");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (entry.name.startsWith(".")) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    } else {
      throw new Error(`Release input cannot be a symbolic link: ${archivePath(absolutePath)}`);
    }
  }
  return files;
}

export async function collectReleaseFiles(root = ROOT) {
  if (root !== ROOT) {
    throw new Error("Custom release roots are not supported.");
  }
  const files = RELEASE_ROOT_FILES.map((file) => join(ROOT, file));
  for (const directory of RELEASE_DIRECTORIES) {
    files.push(...(await walk(join(ROOT, directory))));
  }
  return files
    .filter((file) => !file.endsWith("/images/icon.svg"))
    .sort((left, right) => archivePath(left).localeCompare(archivePath(right)));
}

function extension(path) {
  const match = path.match(/\.[^.\/]+$/);
  return match?.[0] ?? "";
}

export async function validateRelease(files = null) {
  files ??= await collectReleaseFiles();
  const paths = files.map(archivePath);
  const pathSet = new Set(paths);
  const errors = [];
  const manifest = JSON.parse(await readFile(join(ROOT, "manifest.json"), "utf8"));
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));

  if (manifest.manifest_version !== 3) errors.push("Manifest must use version 3.");
  if (manifest.version !== packageJson.version) {
    errors.push("Manifest and package versions must match.");
  }
  if ("host_permissions" in manifest) {
    errors.push("Release unexpectedly requests persistent host permissions.");
  }

  const manifestFiles = [
    manifest.background?.service_worker,
    manifest.options_ui?.page,
    manifest.side_panel?.default_path,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ].filter(Boolean);
  for (const path of [...manifestFiles, ...REQUIRED_RUNTIME_FILES]) {
    if (!pathSet.has(path)) errors.push(`Missing release file: ${path}`);
  }

  for (const [index, file] of files.entries()) {
    const path = paths[index];
    const metadata = await lstat(file);
    if (!metadata.isFile()) errors.push(`Not a regular file: ${path}`);
    if (/^(?:test|scripts)\//.test(path) || /(?:^|\/)\.DS_Store$/.test(path)) {
      errors.push(`Development-only file included: ${path}`);
    }
    if (!TEXT_EXTENSIONS.has(extension(path))) continue;
    const source = await readFile(file, "utf8");
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) {
      errors.push(`Dynamic code execution found in ${path}`);
    }
    if (/<script\b[^>]*\bsrc=["']https?:\/\//i.test(source)) {
      errors.push(`Remote script found in ${path}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Release validation failed:\n- ${errors.join("\n- ")}`);
  }
  return { manifest, paths };
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function localHeader(name, source, compressed, crc) {
  const nameBuffer = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0x0021, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(source.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  return Buffer.concat([header, nameBuffer]);
}

function centralHeader(name, source, compressed, crc, offset) {
  const nameBuffer = Buffer.from(name);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(0x0314, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0x0021, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressed.length, 20);
  header.writeUInt32LE(source.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt32LE((0o100644 * 0x10000) >>> 0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, nameBuffer]);
}

export async function createReleaseArchive(files = null) {
  files ??= await collectReleaseFiles();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = archivePath(file);
    const source = await readFile(file);
    const compressed = deflateRawSync(source, { level: 9 });
    const crc = crc32(source);
    const local = localHeader(name, source, compressed, crc);
    localParts.push(local, compressed);
    centralParts.push(centralHeader(name, source, compressed, crc, offset));
    offset += local.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

async function run() {
  const files = await collectReleaseFiles();
  const { manifest, paths } = await validateRelease(files);
  if (process.argv.includes("--check")) {
    process.stdout.write(`Release validation passed for ${paths.length} files.\n`);
    return;
  }

  const outputDirectory = join(ROOT, "dist");
  const outputPath = join(
    outputDirectory,
    `skeleton-layout-v${manifest.version}.zip`,
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, await createReleaseArchive(files));
  process.stdout.write(`${relative(ROOT, outputPath)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await run();
}
