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

/** Suma N días a una fecha (Date o ISO string) */
export function addDias(fecha: string | Date, dias: number): Date {
  const d = new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

/** Rango de fechas YYYY-MM-DD entre dos fechas, inclusive */
export function rangoFechas(desde: Date, hasta: Date): string[] {
  const result: string[] = []
  const curr = new Date(desde)
  curr.setHours(0, 0, 0, 0)
  const fin = new Date(hasta)
  fin.setHours(23, 59, 59, 999)
  while (curr <= fin) {
    result.push(curr.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))
    curr.setDate(curr.getDate() + 1)
  }
  return result
}

/** Genera el HTML de un recibo minimalista para impresora térmica 80mm */
export function generarHTMLRecibo(params: {
  placa: string
  propietario: string | null
  tipo: TarifaTipo
  horaEntrada: string
  horaSalida: string
  monto: number
  espacio: number | null
  nombreParqueadero?: string
}): string {
  const { placa, propietario, tipo, horaEntrada, horaSalida, monto, espacio, nombreParqueadero } = params
  const nombre    = nombreParqueadero ?? PARKING_NAME
  const duracion  = formatDuracion(horaEntrada, horaSalida)
  const entrada   = formatHora(horaEntrada)
  const salida    = formatHora(horaSalida)
  const fechaStr  = new Date(horaSalida).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr   = new Date(horaSalida).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
  const montoStr  = formatCOP(monto)
  const W         = 32 // character width of the receipt

  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((W - s.length) / 2))
    return ' '.repeat(pad) + s
  }
  const divider  = '='.repeat(W)
  const divider2 = '-'.repeat(W)
  const row      = (label: string, value: string) => {
    const spaces = W - label.length - value.length
    return label + ' '.repeat(Math.max(1, spaces)) + value
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.5;
    width: 302px;
    padding: 6px 4px;
    color: #000;
    background: #fff;
  }
  pre {
    font-family: inherit;
    font-size: inherit;
    white-space: pre;
    margin: 0;
  }
  @page { size: 80mm auto; margin: 0; }
</style>
</head>
<body>
<pre>${divider}
${center(nombre)}
${center(PARKING_CIUDAD)}
${divider}
${row('Fecha:', fechaStr + ' ' + horaStr)}
${divider2}
${row('Placa:', placa)}
${propietario ? row('Propiet.:', propietario.substring(0, 18)) : ''}
${row('Espacio:', '#' + (espacio ?? '—'))}
${divider2}
${row('Entrada:', entrada)}
${row('Salida:', salida)}
${row('Duración:', duracion)}
${divider2}
${row('Tarifa:', TIPO_LABELS[tipo])}
${row('TOTAL:', montoStr)}
${divider}
${center('¡Gracias por su visita!')}
${divider}
</pre>
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
