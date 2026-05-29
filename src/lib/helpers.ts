import type { TarifaTipo, TarifasMap } from '../types'

export const TOTAL_ESPACIOS = Number(import.meta.env.VITE_TOTAL_ESPACIOS ?? 30)
export const PARKING_NAME = import.meta.env.VITE_PARKING_NAME ?? 'El Palo Parking'
export const PARKING_CIUDAD = import.meta.env.VITE_PARKING_CIUDAD ?? 'Medellín, Colombia'

export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export const TIPO_LABELS: Record<TarifaTipo, string> = {
  hora: 'Por hora',
  dia: 'Por día',
  mensualidad: 'Mensualidad',
}

/** Diferencia en horas (fracción) entre dos fechas */
export function diffHoras(desde: string | Date, hasta: string | Date = new Date()): number {
  const inicio = new Date(desde).getTime()
  const fin = new Date(hasta).getTime()
  return (fin - inicio) / (1000 * 60 * 60)
}

/** Calcula el monto a cobrar según tipo y tarifa */
export function calcularMonto(
  horaEntrada: string | Date,
  horaSalida: string | Date = new Date(),
  tipo: TarifaTipo,
  tarifas: TarifasMap,
): number {
  switch (tipo) {
    case 'hora': {
      const horas = diffHoras(horaEntrada, horaSalida)
      // Fracción de hora se cobra como hora completa, mínimo 1 hora
      const horasFacturables = Math.max(1, Math.ceil(horas))
      return horasFacturables * tarifas.hora
    }
    case 'dia':
      return tarifas.dia
    case 'mensualidad':
      return tarifas.mensualidad
  }
}

/** Formatea duración en horas/minutos legible */
export function formatDuracion(horaEntrada: string | Date, horaSalida: string | Date = new Date()): string {
  const inicio = new Date(horaEntrada).getTime()
  const fin = new Date(horaSalida).getTime()
  const diffMs = Math.max(0, fin - inicio)

  const horas = Math.floor(diffMs / (1000 * 60 * 60))
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (horas === 0) return `${minutos}m`
  if (minutos === 0) return `${horas}h`
  return `${horas}h ${minutos}m`
}

/** Formatea número como COP con separadores de miles */
export function formatCOP(amount: number | null | undefined): string {
  if (amount == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formatea fecha/hora en formato local colombiano */
export function formatFecha(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Formatea solo la hora */
export function formatHora(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Fecha local Colombia como string YYYY-MM-DD */
export function fechaHoyBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/** Normaliza placa a mayúsculas y sin espacios */
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/\s+/g, '').trim()
}

/** Descarga un CSV desde un string */
export function descargarCSV(contenido: string, nombre: string): void {
  const bom = '﻿' // BOM para Excel
  const blob = new Blob([bom + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** Genera el HTML de un recibo para impresora térmica 80mm */
export function generarHTMLRecibo(params: {
  placa: string
  propietario: string | null
  tipo: TarifaTipo
  horaEntrada: string
  horaSalida: string
  monto: number
  espacio: number | null
}): string {
  const { placa, propietario, tipo, horaEntrada, horaSalida, monto, espacio } = params
  const duracion = formatDuracion(horaEntrada, horaSalida)

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    width: 76mm;
    padding: 4mm 3mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .big    { font-size: 20px; }
  .xl     { font-size: 26px; letter-spacing: 2px; }
  .line   { border-top: 1px dashed #000; margin: 4px 0; }
  .row    { display: flex; justify-content: space-between; margin: 2px 0; }
  .label  { color: #555; }
  .total  { font-size: 18px; font-weight: bold; }
  .footer { font-size: 11px; color: #666; margin-top: 6px; }
</style>
</head>
<body>
<div class="center bold big" style="margin-bottom:2px">EL PALO PARKING</div>
<div class="center" style="font-size:11px">Medellín, Colombia</div>
<div class="line"></div>

<div class="center xl bold">${placa}</div>
${propietario ? `<div class="center" style="font-size:11px;margin-top:2px">${propietario}</div>` : ''}

<div class="line"></div>

<div class="row"><span class="label">Espacio:</span><span>${espacio ?? '—'}</span></div>
<div class="row"><span class="label">Tipo:</span><span>${TIPO_LABELS[tipo]}</span></div>
<div class="row"><span class="label">Entrada:</span><span>${formatFecha(horaEntrada)}</span></div>
<div class="row"><span class="label">Salida:</span><span>${formatFecha(horaSalida)}</span></div>
<div class="row"><span class="label">Duración:</span><span>${duracion}</span></div>

<div class="line"></div>

<div class="row">
  <span class="bold">TOTAL A PAGAR</span>
  <span class="total">${formatCOP(monto)}</span>
</div>

<div class="line"></div>

<div class="center footer">¡Gracias por su visita!</div>
<div class="center footer" style="margin-top:2px">Impreso: ${new Date().toLocaleString('es-CO', { hour12: false })}</div>

<script>
  window.onload = function() {
    window.focus();
    window.print();
    setTimeout(function(){ window.close(); }, 500);
  };
</script>
</body>
</html>`
}
