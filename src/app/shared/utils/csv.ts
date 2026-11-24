/**
 * Descarga un CSV generado en el navegador (Exportar en Movimientos,
 * Bitácora, Métricas…). Separador coma, BOM para que Excel respete las
 * tildes, y comillas en todos los campos.
 */
export function downloadCsv(filename: string, header: readonly string[], rows: readonly (readonly (string | number | null)[])[]): void {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Guarda un archivo ya descargado (Excel o PDF de la API) con su nombre. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
