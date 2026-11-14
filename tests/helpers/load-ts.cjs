/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../..');

exports.loader = function loader(mocks = {}) {
  const cache = new Map();
  function load(file, sourceOverride) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : fs.existsSync(file + '.tsx') ? '.tsx' : '/index.ts';
    if (!sourceOverride && cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} }; cache.set(file, loaded);
    const source = sourceOverride ?? fs.readFileSync(file, 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name === 'next/link') return { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
      if (name.startsWith('@/')) return load('src/' + name.slice(2));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename: file })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
};
