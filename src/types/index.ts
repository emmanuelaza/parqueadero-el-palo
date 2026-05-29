export type TarifaTipo = 'hora' | 'dia' | 'mensualidad'

export interface Moto {
  id: string
  placa: string
  propietario: string | null
  telefono: string | null
  tipo: TarifaTipo
  espacio: number | null
  hora_entrada: string
  hora_salida: string | null
  monto_cobrado: number | null
  pagado: boolean
  created_at: string
}

export interface Tarifa {
  id: string
  tipo: TarifaTipo
  monto: number
  descripcion: string | null
  activo: boolean
  updated_at: string
}

export interface CajaDiaria {
  id: string
  fecha: string
  total_ingresos: number
  total_motos: number
  created_at: string
}

export interface Horario {
  id: string
  dia_semana: number
  hora_apertura: string
  hora_cierre: string
  activo: boolean
}

export interface EspacioParqueadero {
  numero: number
  ocupado: boolean
  moto?: Moto
}

export type TarifasMap = Record<TarifaTipo, number>
