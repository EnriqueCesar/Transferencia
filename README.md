# Transferencias Starbucks

## Versión

`v6-auditoria-desfase-ingreso-pdf`

## Objetivo

Fortalecer la auditoría operativa de transferencias entre tiendas, iniciando siempre desde las salidas y confirmando su entrada correspondiente, incluso cuando el ingreso ocurra en una fecha posterior.

## Fuente de datos

Archivo fuente utilizado: `Base_Transferencias.xlsx`.

La auditoría se basa en `Compras_Transferencias` y conserva lectura por encabezados:

- Año
- Semana
- Dia
- Tipo Operación
- CeCo
- Tienda
- Ingrediente
- Unidad de Medida
- Proveedor
- Cantidad
- Costo Unitario
- Costo Total

## Reglas de auditoría

- `Cantidad < 0` y `Costo Total < 0`: salida.
- `Cantidad > 0` y `Costo Total > 0`: entrada.
- Una transferencia se agrupa por fecha de salida, tienda origen y proveedor destino.
- El detalle conserva los productos de la transferencia.
- El match invierte la relación tienda/proveedor para encontrar la entrada correspondiente.
- Si la entrada ocurre en fecha posterior y los importes concilian, se marca como `Ingreso con fecha diferente`.
- Margen de conciliación consolidado: `+/- $10.00`.
- Si la diferencia supera ese margen, el estado es `Diferencia de costo`.

## Subtotales

El detalle de transferencia incluye:

- Fecha salida
- Fecha entrada
- Total salida
- Total entrada
- Diferencia

## Desempeño Tienda

Se agregó el módulo `Desempeño Tienda`, que respeta los filtros activos y muestra:

- Transferencias totales
- Conciliadas
- Ingresos con fecha diferente
- Sin ingreso
- Diferencias de cantidad
- Diferencias de costo
- Monto enviado
- Monto recibido
- Diferencia total
- Porcentaje de conciliación
- Porcentaje de incidencias
- Principales destinos y productos con incidencias

## Exportación PDF

El módulo `Desempeño Tienda` incluye `Exportar PDF`. La exportación utiliza impresión nativa del navegador para generar un reporte vertical sin librerías pesadas.

## Coffee Patrol

`38100 SBUX Coffee_Patrol` se mantiene como excepción válida. No exige entrada y puede ocultarse con el filtro activo por defecto.

## Non Inventory

Los ingredientes `Non Inventory` continúan excluidos de la auditoría principal sin eliminarse del archivo fuente.

## Compatibilidad

- Compatible con GitHub Pages.
- PWA conservada.
- Service Worker actualizado.
- Data por chunks conservada.
- Ningún archivo final supera 20 MB.

## Validaciones realizadas

- Proyecto auditado sin rehacer arquitectura.
- `index.html`, `js/app.js`, `css/styles.css`, `manifest.json`, `service-worker.js`, `/assets`, `/data` y `/data/chunks` revisados.
- Sintaxis JS validada en `app.js` y `service-worker.js`.
- Manifest JSON validado.
- `data/manifest-data.json` validado.
- Chunks JSON validados.
- PWA conserva cache de shell y no precachea chunks pesados.
- No se incluyen ZIP ni Excel fuente.
- Archivo más pesado menor a 20 MB.
