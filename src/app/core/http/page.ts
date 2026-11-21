/** Página de resultados con paginación por cursor (fase02.md §4: `?cursor=&limit=`). */
export interface Page<T> {
  readonly items: readonly T[];
  readonly next_cursor: string | null;
}
