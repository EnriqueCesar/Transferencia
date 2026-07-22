# Transferencias Starbucks

## Versión

`v11-agrupacion-fecha-ceco`

## Fuente

`Base_Transferencias.xlsx`, hoja `Compras_Transferencias`, actualizada hasta el 20/07/2026.

## Reglas de conciliación

- `Cantidad < 0`: salida desde el CeCo de la fila hacia el CeCo inicial del proveedor.
- `Cantidad > 0`: entrada en el CeCo de la fila desde el CeCo inicial del proveedor.
- Las fechas válidas del Excel se normalizan como `dd/mm/aaaa` y se almacenan como ISO para evitar cruces ambiguos.
- La relación origen/destino se valida en ambos sentidos mediante CeCos de cinco dígitos.
- Solo existe una transferencia por fecha, CeCo origen y CeCo destino.
- Una entrada mayor que su salida se concilia hasta la cantidad enviada y su remanente no crea una transferencia duplicada.
- Las entradas completamente independientes se agrupan por fecha y pareja de CeCos antes de mostrarse como `Falta salida`.
- La coincidencia exacta de ingrediente tiene prioridad.
- Si los nombres difieren, solo se concilia por equivalencia económica cuando unidad, cantidad y costo son compatibles y la opción es inequívoca.
- Cada entrada se utiliza una sola vez.
- Las variantes de nombre de tienda se consolidan por CeCo con el directorio como nombre canónico.
- El resumen respeta año, mes, semana, región, DM, tienda y demás filtros activos.
- `38100 SBUX Coffee_Patrol` conserva su tratamiento especial.
- Los ingredientes de `Non Inventory` permanecen excluidos de la auditoría principal.

## Compatibilidad

- GitHub Pages y PWA conservados.
- Datos divididos por mes; ningún archivo supera 20 MB.
- Sin dependencias de compilación.
