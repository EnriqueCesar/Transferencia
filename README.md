# Transferencias Starbucks México

## Versión

`v4-calibracion-operativa-transferencias`

## Objetivo

Versión enfocada en calibrar la lectura, agrupación y validación operativa de transferencias para que la auditoría revise correctamente el año completo desde la base real de movimientos.

## Fuente de datos

- Archivo fuente: `Base_Transferencias.xlsx`
- Hoja principal: `Compras_Transferencias`
- Directorio: `Base_Directorio`
- Exclusión operativa: `Non Inventory`

## Uso de la data

La auditoría principal se genera desde `Compras_Transferencias`.

Columnas usadas:

- `CeCo`
- `Tienda`
- `Ingrediente`
- `Proveedor`
- `Cantidad`
- `Costo Unitario`
- `Costo Total`

`Base_Directorio` solo se usa para cruzar `CeCo` y obtener `Región` y `DM`.

## Agrupación de transferencias

Una transferencia se agrupa por:

- Día
- Tienda origen
- Proveedor destino

Varios ingredientes dentro del mismo día, tienda origen y proveedor destino se muestran como una sola transferencia con detalle de productos.

## Auditoría Salida vs Ingreso

La revisión inicia desde salidas:

- Cantidad negativa
- Costo Total negativo

Después busca el ingreso inverso:

- Cantidad positiva
- Costo Total positivo

Criterios de match:

- CeCo destino contra CeCo del ingreso
- Proveedor del ingreso contra CeCo de tienda origen
- Ingrediente
- Unidad
- Cantidad absoluta
- Costo unitario
- Costo total absoluto
- Fecha

## Estados

- Correcta
- Ingreso encontrado
- Ingreso con fecha diferente
- Sin ingreso
- Diferencia de cantidad
- Diferencia de costo
- Coffee Patrol
- Revisar

## Coffee Patrol

`38100 SBUX Coffee_Patrol` se mantiene como movimiento informativo. No exige ingreso y puede ocultarse con el filtro de la interfaz.

## Non Inventory

Los ingredientes marcados como `Non Inventory` se excluyen de la auditoría principal. No se eliminan de la fuente, solo quedan fuera del análisis operativo.

## Carga de datos

La data se divide en chunks mensuales dentro de `/data/chunks` y se indexa en `/data/manifest-data.json`.

Ningún archivo final supera 20 MB.

## Compatibilidad

- GitHub Pages compatible
- PWA conservada
- Service Worker actualizado
- Rutas relativas
- Sin Excel ni ZIP fuente dentro del proyecto final

## Validaciones realizadas

- Proyecto empaquetado correctamente.
- `Compras_Transferencias` usada como origen principal.
- `Base_Directorio` usada solo para Región y DM.
- Data regenerada desde `Base_Transferencias.xlsx`.
- Chunks mensuales generados.
- Ningún archivo supera 20 MB.
- Filtro Tienda construido desde `Compras_Transferencias`.
- Estado `Todos` deja visible toda la auditoría filtrada.
- Transferencias agrupadas por Día + Tienda origen + Proveedor destino.
- Detalle por producto disponible dentro de cada transferencia.
- Non Inventory excluido de auditoría principal.
- Coffee Patrol tratado como informativo.
- Sintaxis JS validada.
- Service Worker actualizado para V4.
