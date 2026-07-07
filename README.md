# Transferencias Starbucks México

## Versión

`v2-auditoria-basica-operativa`

## Objetivo

V2 sencilla y operativa para revisar transferencias entre tiendas. La versión conserva PWA, GitHub Pages, diseño Corporate Monoline Sidebar y carga por chunks, pero simplifica la experiencia para auditoría diaria.

## Cambios realizados

- Se ocultó el apartado Calidad de menú, tarjetas y navegación.
- Se retiraron mensajes técnicos visibles para el usuario.
- Se retiraron filtros Desde y Hasta.
- Se eliminó exportación CSV.
- Se agregó filtro Mes y se corrigió Semana con orden numérico ascendente.
- Se implementaron filtros dependientes Región → DM → Tienda.
- Se regeneró la data desde `Base_Transferencias.xlsx`.
- Se excluyeron ingredientes marcados como `Non Inventory` de la auditoría principal.
- Se agregó auditoría básica Salida vs Ingreso.
- Se respetó el caso especial `38100 SBUX Coffee_Patrol` como excepción válida.

## Fuente de datos

- Archivo fuente: `Base_Transferencias.xlsx`
- Hoja principal: `Compras_Transferencias`
- Directorio: `Base_Directorio`
- Exclusión inventario: `Non Inventory`

## Reglas de auditoría

Salida:

- Cantidad negativa
- Costo Total negativo

Ingreso:

- Cantidad positiva
- Costo Total positivo

La comparación básica valida:

- Ingrediente
- Unidad de medida
- Tienda / Proveedor inverso por CeCo
- Cantidad absoluta
- Costo Unitario
- Costo Total absoluto
- Fecha

Estados usados:

- Correcto
- Sin ingreso
- Diferencia de monto
- Diferencia de cantidad
- Fecha diferente
- Revisar
- Excepción válida Coffee Patrol

## Data y GitHub

- Registros fuente leídos: 312,100
- Registros incluidos en auditoría principal: 308,019
- Registros Non Inventory excluidos: 849
- Filas inválidas omitidas: 0
- Filas en cero omitidas de auditoría: 3,232
- Chunks generados: 7
- Chunk más pesado: 3.46 MB
- Ningún archivo final supera 20 MB.
- No se incluye el Excel original.
- No se incluye el ZIP original.

## Despliegue en GitHub Pages

1. Subir el contenido de esta carpeta al repositorio.
2. Activar GitHub Pages desde la rama principal.
3. Usar la raíz del repositorio como carpeta publicada.
4. Abrir `index.html` desde la URL de GitHub Pages.

## PWA

Incluye:

- `manifest.json`
- `service-worker.js`
- iconos SVG
- cache del app shell
- carga de chunks bajo demanda sin cachear archivos grandes de data

## Validaciones realizadas

- Proyecto estructurado con `index.html`, `css/styles.css`, `js/app.js`, `manifest.json`, `service-worker.js`, `assets` y `data`.
- Sintaxis JavaScript validada con Node.
- Manifest de data JSON validado.
- Chunks JSON validados.
- Ningún archivo final supera 20 MB.
- No existen archivos ZIP, XLSX ni temporales dentro del entregable final.
- La palabra Calidad no aparece en la interfaz HTML.
- Filtros Desde y Hasta no aparecen en la interfaz HTML.
- Exportación CSV no aparece en la interfaz HTML ni en `app.js`.
- Semana queda ordenada numéricamente desde `manifest-data.json` y `app.js`.
- Mes queda ordenado de enero a diciembre desde `app.js`.
- Región filtra DM y DM filtra Tienda desde `app.js`.
- Non Inventory queda excluido de los chunks usados por la auditoría principal.
- Coffee Patrol queda tratado como excepción válida en `app.js`.

