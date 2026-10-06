/** Deliberately small expression parser. Never evaluates JavaScript. */
export function evaluate(expression: string): number {
  if (expression.length > 300) throw new Error('Expression too long');
  const source = expression.toLowerCase().replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/³/g, '^3').replace(/²/g, '^2').replace(/(\d),(\d)/g, '$1.$2');
  const tokens: string[] = [];
  let remaining = source;
  while (remaining) {
    remaining = remaining.trimStart();
    if (!remaining) break;
    const match = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[a-z]+|^[()+\-*/^%]/);
    if (!match || tokens.length >= 128) throw new Error('Invalid expression');
    tokens.push(match[0]); remaining = remaining.slice(match[0].length);
  }
  let pos = 0;
  const functions: Record<string, (x: number) => number> = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, ln: Math.log, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round };
  function atom(): number {
    const token = tokens[pos++];
    if (!token) throw new Error('Missing operand');
    if (token === '(') { const result = sum(); if (tokens[pos++] !== ')') throw new Error('Unclosed bracket'); return result; }
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    if (Object.hasOwn(functions, token)) { if (tokens[pos++] !== '(') throw new Error('Function needs brackets'); const value = sum(); if (tokens[pos++] !== ')') throw new Error('Unclosed function'); return functions[token](value); }
    if (/^(?:\d|\.)/.test(token)) return Number(token);
    throw new Error('Unknown token');
  }
  function postfix(): number { let value = atom(); while (tokens[pos] === '%') { pos++; value /= 100; } return value; }
  function power(): number { const value = postfix(); if (tokens[pos] === '^') { pos++; return value ** unary(); } return value; }
  function unary(): number { if (tokens[pos] === '+') {pos++; return unary();} if (tokens[pos] === '-') {pos++; return -unary();} return power(); }
  function product(): number { let value = unary(); while (tokens[pos] === '*' || tokens[pos] === '/') { const op = tokens[pos++]; const rhs = unary(); value = op === '*' ? value * rhs : value / rhs; } return value; }
  function sum(): number { let value = product(); while (tokens[pos] === '+' || tokens[pos] === '-') { const op = tokens[pos++]; const rhs = product(); value = op === '+' ? value + rhs : value - rhs; } return value; }
  const result = sum();
  if (pos !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid result');
  return Object.is(result, -0) ? 0 : result;
}

export function futureValue(principal: number, monthly: number, annualRate: number, years: number) {
  if (![principal,monthly,annualRate,years].every(Number.isFinite) || principal < 0 || principal > 1e9 || monthly < 0 || monthly > 1e7 || annualRate < 0 || annualRate > 100 || years < 0 || years > 100 || !Number.isInteger(years)) throw new Error('Invalid finance input');
  const months = years * 12, rate = annualRate / 100 / 12;
  const total = rate === 0 ? principal + monthly * months : principal * (1 + rate) ** months + monthly * ((1 + rate) ** months - 1) / rate;
  if (!Number.isFinite(total)) throw new Error('Invalid result');
  const contributions = principal + monthly * months;
  return { total, contributions, growth: total - contributions };
}

export const unitGroups: Record<string, Record<string, number>> = {
  length: { mi: 1609.344, km: 1000, m: 1, cm: .01, ft: .3048, in: .0254 },
  weight: { kg: 1, g: .001, lb: .45359237, oz: .028349523125 },
  temperature: { '°C': 1, '°F': 1, K: 1 },
};
export function convert(value: number, category: string, from: string, to: string): number {
  const group = unitGroups[category];
  if (!Number.isFinite(value) || !group || !Object.hasOwn(group, from) || !Object.hasOwn(group, to)) throw new Error('Invalid conversion');
  let result: number;
  if (category === 'temperature') {
    const celsius = from === '°F' ? (value - 32) * 5 / 9 : from === 'K' ? value - 273.15 : value;
    if (celsius < -273.15 - 1e-10) throw new Error('Below absolute zero');
    result = to === '°F' ? celsius * 9 / 5 + 32 : to === 'K' ? celsius + 273.15 : celsius;
  } else result = value * group[from] / group[to];
  if (!Number.isFinite(result)) throw new Error('Invalid result');
  return result;
}
