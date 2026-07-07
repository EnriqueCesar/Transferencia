# Transferencias Starbucks

## Versión

`v5-auditoria-inteligente-transferencias`

## Objetivo

Tablero operativo para conciliar transferencias entre tiendas Starbucks, agrupando miles de movimientos en transferencias completas y mostrando primero las excepciones que requieren atención.

## Fuente de datos

Archivo fuente utilizado: `Base_Transferencias.xlsx`.

La auditoría se genera únicamente desde la pestaña `Compras_Transferencias`, leyendo columnas por encabezado y no por posición física.

Encabezados esperados:

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

## Base_Directorio

`Base_Directorio` se usa solo para enriquecer datos por `CeCo` y obtener:

- Región
- DM

Las tiendas del filtro se obtienen desde `Compras_Transferencias`, no desde `Base_Directorio`.

## Non Inventory

Los ingredientes marcados como `Non Inventory` se excluyen de la conciliación operativa principal. Los datos no se eliminan del archivo fuente; únicamente no participan en la auditoría.

## Lógica de auditoría

Una transferencia se define por:

- Año
- Semana
- Día
- Tienda origen
- Tienda destino

La auditoría inicia desde salidas (`Cantidad < 0` y `Costo Total < 0`) y busca la entrada inversa (`Cantidad > 0` y `Costo Total > 0`).

Validaciones aplicadas:

- Ingrediente
- Unidad de medida
- Cantidad absoluta
- Costo unitario
- Costo total absoluto
- Tienda origen
- Tienda destino
- Proveedor inverso

Estados principales:

- Conciliada
- Falta Entrada
- Falta Salida
- Diferencia de Cantidad
- Diferencia de Costo
- Ingredientes Incompletos
- Transferencia Parcial
- Revisar
- Coffee Patrol

## Coffee Patrol

`38100 SBUX Coffee_Patrol` se mantiene como excepción informativa. No exige entrada y no contamina los pendientes operativos cuando el filtro de ocultar Coffee Patrol está activo.

## Filtros

Filtros disponibles:

- Año
- Mes
- Semana
- Región
- DM
- Tienda
- Proveedor
- Ingrediente
- Estado
- Entrada / Salida
- Búsqueda
- Ocultar Coffee Patrol

El filtro de tienda es bidireccional: muestra transferencias enviadas y recibidas relacionadas con la tienda seleccionada.

## Data por chunks

La data se mantiene dividida en chunks mensuales dentro de `/data/chunks` y se carga bajo demanda a partir de `/data/manifest-data.json`.

Ningún archivo del proyecto final supera 20 MB.

## Compatibilidad

- Compatible con GitHub Pages.
- PWA conservada.
- Service Worker actualizado.
- No se incluyen el Excel fuente, ZIP original ni archivos temporales.

## Validaciones realizadas

- Proyecto empaquetado correctamente.
- Data regenerada desde `Base_Transferencias.xlsx`.
- `Compras_Transferencias` usada como fuente principal por encabezados.
- `Base_Directorio` usada solo para Región y DM.
- Non Inventory excluido de auditoría principal.
- Transferencias agrupadas por Año + Semana + Día + Origen + Destino.
- Filtro tienda funciona en ambos sentidos desde la auditoría agrupada.
- Se agregó filtro Entrada / Salida.
- Coffee Patrol se mantiene como excepción informativa.
- Carga por chunks conservada.
- PWA y rutas relativas compatibles con GitHub Pages.
- Ningún archivo final supera 20 MB.
