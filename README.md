# Transferencias Starbucks México

Versión: `v1.1-github-ready-data-split`

Dashboard corporativo PWA para análisis de transferencias Starbucks México, ajustado para GitHub y GitHub Pages sin archivos mayores a 20 MB.

## Motivo del ajuste

La versión anterior incluía archivos de data monolíticos mayores a 20 MB. Esta versión divide la información en chunks JSON mensuales y carga la data bajo demanda desde el navegador.

## Fuente de datos

- Archivo fuente usado: `Base_Transferencias.xlsx`
- Hoja principal: `Compras_Transferencias`
- Hoja directorio: `Base_Directorio`
- Hoja de referencia: `Instrucciones`
- Periodo cargado: `2026-01-01` a `2026-07-05`
- Registros válidos: `312,100`
- Registros inválidos: `0`
- Caso especial: `38100 SBUX Coffee_Patrol` se considera únicamente Salida.

## División de data

```text
data/
  manifest-data.json
  chunks/
    transferencias-2026-01.json  (52,403 registros, 3.40 MB)
    transferencias-2026-02.json  (45,813 registros, 2.98 MB)
    transferencias-2026-03.json  (44,318 registros, 2.92 MB)
    transferencias-2026-04.json  (52,715 registros, 3.48 MB)
    transferencias-2026-05.json  (53,369 registros, 3.52 MB)
    transferencias-2026-06.json  (53,815 registros, 3.53 MB)
    transferencias-2026-07.json  (9,667 registros, 0.63 MB)
```

`manifest-data.json` contiene versión, rango, diccionarios, columnas internas, chunks disponibles, semanas, rango de fechas, cantidad de registros, peso aproximado y ruta de cada chunk.

## Regla de peso

- Ningún archivo final supera 20 MB.
- Los chunks de data quedan por debajo de 5 MB cuando el volumen mensual lo permite.
- El Excel fuente no forma parte del sitio publicado.
- El ZIP original no forma parte del proyecto final.
- El Service Worker no precachea chunks de data grandes; solo cachea el app shell y el índice mínimo.

## Estructura

```text
assets/
  icons/
  images/
css/
  styles.css
js/
  app.js
data/
  manifest-data.json
  chunks/
docs/
  file-audit.json
index.html
manifest.json
service-worker.js
README.md
```

## Funcionalidades

- Dashboard ejecutivo con KPIs.
- Sidebar Navigation estilo Corporate Monoline.
- Filtros por región, DM, tienda, ingrediente, semana, flujo y fecha.
- Carga progresiva por chunks según rango de fechas y semana.
- Búsqueda por tienda, ingrediente, proveedor, región, DM o CeCo.
- Análisis por día, región, tienda, ingrediente y ruta tienda → proveedor.
- Tabla operativa de últimos movimientos filtrados.
- Exportación CSV filtrada desde navegador.
- PWA con manifest, service worker y modo offline básico.
- Compatible con GitHub Pages mediante rutas relativas.

## Validaciones de negocio conservadas

- Tienda desde columna F de `Compras_Transferencias`.
- Proveedor desde columna I.
- Cruce `CeCo` contra `Base_Directorio` para Región y DM.
- Ingrediente, Cantidad, Costo Unitario, Costo Total, Fecha, CeCo, Región y DM integrados.
- Cantidad positiva = Ingreso.
- Cantidad negativa = Salida.
- Costo Unitario siempre positivo.
- Costo Total positivo = Ingreso.
- Costo Total negativo = Salida.
- `38100 SBUX Coffee_Patrol` se considera solo Salida.

## Despliegue en GitHub Pages

1. Subir el contenido completo de esta carpeta al repositorio.
2. No subir el Excel fuente ni el ZIP original.
3. Activar GitHub Pages desde `Settings > Pages`.
4. Seleccionar rama y carpeta raíz.
5. Publicar.

No requiere build, Node.js ni dependencias externas.

## Validaciones realizadas

- Proyecto reestructurado sin archivos mayores a 20 MB.
- Data regenerada y contrastada contra la estructura del workbook `Base_Transferencias.xlsx`.
- Data dividida en chunks JSON mensuales.
- `manifest-data.json` generado correctamente.
- `app.js` ajustado para carga bajo demanda.
- Service Worker ajustado para no precachear chunks grandes.
- Manifest PWA actualizado.
- Rutas relativas validadas para GitHub Pages.
- Sintaxis JavaScript validada con Node.js.
- ZIP final generado sin incluir fuentes pesadas.
