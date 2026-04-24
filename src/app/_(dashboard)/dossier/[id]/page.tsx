import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { dossiers, clientes, vehiculos } from '@/../drizzle/schema'
import { eq } from 'drizzle-orm'
import DossierTemplate from '@/components/dossier/DossierTemplate'
import DossierActions from '@/components/dossier/DossierActions'
import AutoPrint from '@/components/dossier/AutoPrint'
import type { Vehiculo, Cliente } from '@/types'

export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ modo?: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { id } = await params
  const { modo } = await searchParams

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id)).limit(1)
  if (!dossier) notFound()

  const isAdmin = (session.user as any).role === 'admin'
  if (!isAdmin && dossier.creado_por !== session.user?.email) notFound()

  // Cargar cliente
  const [cliente] = dossier.cliente_id
    ? await db.select().from(clientes).where(eq(clientes.id, dossier.cliente_id)).limit(1)
    : [null]

  if (!cliente) notFound()

  // Cargar todos los vehículos necesarios (finalistas_ids guarda los 5 en orden de ranking)
  const todosIds = [
    ...(dossier.finalistas_ids ?? []),
    ...(dossier.seleccionados_ids ?? []),
    dossier.ganador_id,
  ].filter(Boolean) as string[]

  const uniqueIds = [...new Set(todosIds)]
  const vehiculosMap: Record<string, Vehiculo> = {}
  for (const vid of uniqueIds) {
    const [v] = await db.select().from(vehiculos).where(eq(vehiculos.id, vid)).limit(1)
    if (v) vehiculosMap[vid] = v as unknown as Vehiculo
  }

  const ganador = dossier.ganador_id ? vehiculosMap[dossier.ganador_id] : null
  if (!ganador) notFound()

  // todosOrdenados: los 5 en orden de ranking desde finalistas_ids
  const todosOrdenados = (dossier.finalistas_ids ?? [])
    .map(fid => vehiculosMap[fid])
    .filter(Boolean) as Vehiculo[]

  // Si todosOrdenados está vacío (dossiers viejos), reconstruir desde seleccionados_ids
  const todosParaMostrar = todosOrdenados.length >= 3
    ? todosOrdenados
    : (dossier.seleccionados_ids ?? []).map(sid => vehiculosMap[sid]).filter(Boolean) as Vehiculo[]

  const podio = todosParaMostrar.slice(0, 3).filter(Boolean) as Vehiculo[]

  // Garantizar ganador en podio[0]
  if (podio.length === 0 || podio[0]?.id !== ganador.id) {
    const sinGanador = podio.filter(v => v.id !== ganador.id)
    podio.splice(0, podio.length, ganador, ...sinGanador.slice(0, 2))
  }

  const descartadosExpandidos = ((dossier.descartados as any[]) ?? [])
    .map((d: any) => ({ vehiculo: vehiculosMap[d.vehiculo_id], razon: d.razon }))
    .filter(d => d.vehiculo)

  const isPdf = modo === 'pdf'
  const fecha = new Date(dossier.created_at!).toLocaleDateString('es-PY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className={isPdf ? '' : 'space-y-4'}>
      {isPdf && <AutoPrint />}
      {!isPdf && (
        <DossierActions dossierId={id} pdfUrl={dossier.pdf_url} />
      )}
      <DossierTemplate
        cliente={cliente as unknown as Cliente}
        ganador={ganador}
        podio={podio}
        todosOrdenados={todosParaMostrar.length > 0 ? todosParaMostrar : [ganador]}
        descartados={descartadosExpandidos}
        razones_victoria={(dossier.razones_victoria ?? []) as [string, string, string]}
        punto_ciego={dossier.punto_ciego ?? ''}
        conclusion_datacar={dossier.conclusion_datacar ?? ''}
        analisis_tecnico={dossier.analisis_tecnico}
        fecha={fecha}
      />
    </div>
  )
}
