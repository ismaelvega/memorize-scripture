import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import Module from 'node:module';
import ts from 'typescript';

const cache = new Map();

export function loadTsModule(entryPath) {
  const absolutePath = ensureExtension(path.resolve(entryPath));
  if (cache.has(absolutePath)) {
    return cache.get(absolutePath);
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: absolutePath,
    reportDiagnostics: false,
  });

  const module = { exports: {} };
  const dirname = path.dirname(absolutePath);

  function localRequire(specifier) {
    if (specifier.startsWith('.')) {
      const resolved = resolveTsSpecifier(specifier, dirname);
      if (!resolved) {
        throw new Error(`No se pudo resolver ${specifier} desde ${absolutePath}`);
      }
      return loadTsModule(resolved);
    }
    const create = Module.createRequire(absolutePath);
    return create(specifier);
  }

  const sandbox = {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: dirname,
    __filename: absolutePath,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename: absolutePath });

  cache.set(absolutePath, sandbox.module.exports);
  return sandbox.module.exports;
}

function ensureExtension(filePath) {
  if (fs.existsSync(filePath)) return filePath;
  const candidates = [
    filePath + '.ts',
    filePath + '.tsx',
    path.join(filePath, 'index.ts'),
    path.join(filePath, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return filePath;
}

function resolveTsSpecifier(specifier, fromDir) {
  const raw = path.resolve(fromDir, specifier);
  return ensureExtension(raw);
}
