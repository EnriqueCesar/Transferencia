# Transferencias Starbucks México

## Versión

`v3-auditoria-transferencias`

## Objetivo

Simplificar la auditoría operativa para que un DM o Auditor revise transferencias completas entre tiendas: primero se muestra el movimiento de tienda origen hacia proveedor destino y después el detalle de productos.

## Cambios principales

- Menú lateral simplificado: Inicio, Auditoría, Transferencias y Alertas.
- Directorio y Configuración ocultos visualmente sin eliminar lógica base.
- Dashboard ajustado a nivel transferencia, no ingrediente.
- Transferencia definida como: Fecha + Tienda origen + Proveedor destino.
- Cada tarjeta de Transferencias agrupa varios productos de un mismo movimiento.
- Detalle por producto disponible al seleccionar una transferencia.
- Fecha visual en formato corto: `04 Jul`.
- Filtro `Ocultar Coffee Patrol` activado por defecto.
- Coffee Patrol se conserva como movimiento informativo y no exige ingreso.
- El filtro Tienda analiza salidas de la tienda seleccionada desde Compras_Transferencias.
- Región y DM continúan alimentándose desde Base_Directorio.
- Carga por chunks conservada.
- PWA y compatibilidad con GitHub Pages conservadas.

## Fuente de datos

- Archivo fuente: `Base_Transferencias.xlsx`
- Base principal: `Compras_Transferencias`
- Cruce organizacional: `Base_Directorio`
- Exclusión de auditoría principal: `Non Inventory`

## Reglas de auditoría

- La auditoría inicia desde salidas.
- Salida: cantidad negativa y costo total negativo.
- Ingreso: cantidad positiva y costo total positivo.
- Match inverso: tienda origen contra proveedor destino, y tienda destino contra proveedor origen.
- Validación por producto: ingrediente, unidad, cantidad absoluta, costo unitario y costo total absoluto.
- Si hay ingreso en otra fecha, se clasifica como `Ingreso con fecha diferente`.
- Si no hay ingreso relacionado, se clasifica como `Sin ingreso`.
- Si cambian cantidad o costo, se clasifica como diferencia operativa.
- `38100 SBUX Coffee_Patrol` se clasifica como `Coffee Patrol` y no exige ingreso.

## Estructura

```text
/assets
/assets/icons
/assets/images
/css
/data
/data/chunks
/js
index.html
manifest.json
service-worker.js
README.md
```

## Validaciones realizadas

- Proyecto empaquetado sin ZIP ni Excel fuente dentro de la versión final.
- Ningún archivo final supera 20 MB.
- Manifest de datos conservado y actualizado a V3.
- Chunks de datos conservados bajo demanda.
- Directorio y Configuración no aparecen en el menú lateral.
- La interfaz no muestra textos técnicos de chunks, PWA o versión.
- Exportación CSV no aparece.
- Formato de fecha corto implementado en tarjetas y alertas.
- Transferencias agrupadas por Fecha + Tienda origen + Proveedor destino.
- Detalle por producto implementado por transferencia seleccionada.
- Filtro Tienda aplicado sobre salidas de Compras_Transferencias.
- Filtros Región y DM conservan cruce desde Base_Directorio.
- Coffee Patrol queda oculto por defecto y puede mostrarse como informativo.
- Sintaxis JavaScript validada.
- Service Worker actualizado sin cachear chunks pesados.

## Despliegue en GitHub Pages

1. Subir el contenido de esta carpeta al repositorio.
2. Activar GitHub Pages desde la rama publicada.
3. Abrir `index.html` desde la URL generada por GitHub Pages.

No se requiere servidor ni procesamiento adicional.
