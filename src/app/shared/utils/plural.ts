/** "1 crítica", "3 críticas": número y palabra concordando (ux-ui.md §3.7). */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
