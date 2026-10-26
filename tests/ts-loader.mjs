/**
 * Lightweight Node.js ESM Loader for executing production TypeScript modules (.ts)
 * directly in Node's native test runner when node_modules/tsx is not installed offline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'vitest') {
    const shimPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'vitest-shim.mjs');
    return {
      url: pathToFileURL(shimPath).href,
      shortCircuit: true,
    };
  }
  if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL) {
    const parentPath = fileURLToPath(context.parentURL);
    const candidateTs = path.resolve(path.dirname(parentPath), specifier.slice(0, -3) + '.ts');
    if (fs.existsSync(candidateTs)) {
      return {
        url: pathToFileURL(candidateTs).href,
        shortCircuit: true,
      };
    }
  }
  return nextResolve(specifier, context);
}

function removeInterfaceBlocks(code) {
  let result = code;
  const pattern = /(?:export\s+)?interface\s+[A-Za-z0-9_]+\s*\{/g;
  let match;
  while ((match = pattern.exec(result)) !== null) {
    const startIdx = match.index;
    const braceIdx = result.indexOf('{', startIdx + match[0].length - 1);
    if (braceIdx === -1) break;
    let depth = 0;
    let endIdx = braceIdx;
    for (; endIdx < result.length; endIdx++) {
      if (result[endIdx] === '{') depth++;
      else if (result[endIdx] === '}') {
        depth--;
        if (depth === 0) {
          endIdx++;
          break;
        }
      }
    }
    result = result.slice(0, startIdx) + '\n' + result.slice(endIdx);
    pattern.lastIndex = 0;
  }
  return result;
}

export function stripTypeScript(source) {
  let code = removeInterfaceBlocks(source);

  // Remove import type statements
  code = code.replace(/^\s*import\s+type\s+[^;]+;\s*$/gm, '');

  // Remove type aliases
  code = code.replace(/^\s*(?:export\s+)?type\s+[A-Za-z0-9_]+\s*=[^;]+;\s*$/gm, '');

  // Remove generic type parameters on function declarations e.g. `function foo<T extends Bar>(`
  code = code.replace(/(function\s+[A-Za-z0-9_]+)\s*<[^>]+>\s*\(/g, '$1(');

  // Remove generic type arguments on `new Promise<Buffer>(` / `new Set<string>(` / `new Map<string, string>(`
  code = code.replace(/new\s+(Promise|Set|Map)\s*<[^>]+>\s*\(/g, 'new $1(');

  // Remove class access modifiers (`private `, `public `, `protected `, `readonly `)
  code = code.replace(/^(\s*)(?:private|public|protected|readonly)\s+/gm, '$1');

  // Remove class field declarations without initializers e.g. `studentId: string;`
  code = code.replace(/^\s*[A-Za-z0-9_]+\s*:\s*[A-Za-z0-9_|\s[\]'"]+\s*;\s*$/gm, '');

  // Remove class field or variable type annotations before `=` e.g. `export const FOO: Type = {` or `const rawDefinitions: Array<{ ... }> = [`
  code = code.replace(/^(\s*(?:export\s+)?(?:const|let|var)\s+[A-Za-z0-9_]+)\s*:\s*[^=\n]+?(?=\s*=\s*(?!=))/gm, '$1');
  code = code.replace(/^(\s*committedReceiptNumber)\s*:\s*string\s*\|\s*null|string\s*\|\s*undefined|string\[\](?=\s*=\s*null)/gm, '$1');

  // Remove multi-line object return types on functions: `): {\n ... \n} {`
  code = code.replace(/\)\s*:\s*\{[^{}]*\}\s*\{/g, ') {');

  // Remove single-line function return types before `{`: `): Promise<boolean> {`, `): number {`, etc.
  code = code.replace(/\)\s*:\s*(?:Promise<[^>]+>|[A-Za-z0-9_.\[\]|'"\s]+)\s*\{/g, ') {');

  // Remove multi-line parameter type annotations `params: {\n ... \n}`
  code = code.replace(/(\bparams)\s*:\s*\{[^{}]*\}/g, '$1');

  // Remove union parameter type annotation `event:\n | ...`
  code = code.replace(/(\bevent)\s*:\s*(?:\s*\|\s*\{[^{}]*\})+/g, '$1');

  // Remove options parameter type annotation `options: { ... } = {}`
  code = code.replace(/(\boptions)\s*:\s*\{[^{}]*\}\s*=\s*\{\}/g, '$1 = {}');

  // Remove extraParams parameter type annotation `extraParams: Record<string, string | undefined> = {}`
  code = code.replace(/(\bextraParams)\s*:\s*Record<[^>]+>\s*=\s*\{\}/g, '$1 = {}');
  code = code.replace(/(\benv)\s*:\s*Record<[^>]+>\s*=\s*process\.env/g, '$1 = process.env');
  code = code.replace(/(\b(?:commandArgs|roles|dbRoles))\s*:\s*string\[\]/g, '$1');

  // Remove remaining simple parameter type annotations inside `(...)`
  code = code.replace(
    /(\b[A-Za-z0-9_]+)\??\s*:\s*(?:string\s*\|\s*number\s*\|\s*\{\s*toString\(\)\s*:\s*string\s*\}|ComputedChargeBalance\[\]|ChargeRecordInput\[\]|AllocationRecordInput(?:\[\])?|RequestedAllocationInput\[\]|Map<string,\s*string>|Partial<StructuredStudentSearchCriteria>|StructuredStudentSearchCriteria|PaymentWorkflowProgressInput|CashierSearchState|StudentSummaryItem(?:\[\])?|T\[\]|'FIXED_AMOUNT'\s*\|\s*'PERCENTAGE'|'NONE'\s*\|\s*'FIXED_ONCE'\s*\|\s*'PER_DAY'\s*\|\s*'PER_MONTH'|string\s*\|\s*null|string\s*\|\s*undefined|string\[\]|string\s*\|\s*number|unknown|any|string|number|boolean|T)(?=\s*(?:=[^,)]+)?[,)])/g,
    '$1'
  );

  // Remove `as unknown as T`, `as Record<...>`, `as T`
  code = code.replace(/\s+as\s+unknown\s+as\s+[A-Za-z0-9_]+/g, '');
  code = code.replace(/\s+as\s+Record<[^>]+>/g, '');
  code = code.replace(/\s+as\s+(?:const|any|T)\b/g, '');

  return code;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const filePath = fileURLToPath(url);
    const rawSource = fs.readFileSync(filePath, 'utf8');
    const transformed = stripTypeScript(rawSource);
    return {
      format: 'module',
      source: transformed,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
