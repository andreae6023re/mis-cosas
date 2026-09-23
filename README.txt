ARA · Inventario · edición de artículos v1

Novedades:
- Botón ✏️ para editar cada artículo del inventario.
- Se puede cambiar cantidad, unidad, ubicación, caducidad y notas.
- Unidades habituales: unidad, g/gr, kg, ml, l, paquete, bolsa, bote, lata, botella, sobre y ración.
- También permite escribir una unidad personalizada con «Otra unidad…».
- El nombre del producto queda bloqueado al editar para no cambiar accidentalmente el ingrediente compartido con las recetas.
- Mantiene el importador de inventario y el repaso semanal de despensa/congelador.

Supabase:
Ejecuta ARA_inventario_edicion_policies.sql en el SQL Editor de Supabase para permitir actualizaciones de inventario.


NUEVO · Presentaciones individuales de inventario
Ahora el mismo ingrediente puede aparecer varias veces en el inventario como artículos independientes. Por ejemplo:
- Copos de avena · 1 kg · bolsa
- Copos de avena · 250 g · bolsa

Cada fila se puede editar por separado. En cada producto aparece el botón ＋📦 para añadir otra presentación del mismo ingrediente sin tener que volver a escribir el nombre.

IMPORTANTE: ejecuta una vez ARA_inventario_presentaciones.sql en Supabase antes de usar este campo. No hace falta crear otra tabla.

En las importaciones puedes añadir una columna llamada presentation, presentacion, formato o envase.


Novedad v4: clasificación de especias.
- Añade is_spice (boolean) a inventory.
- En alta/edición de artículos de despensa puedes marcar "🌿 Es una especia".
- Las especias aparecen con una etiqueta 🌿 Especia en la lista.
- El importador acepta columnas como is_spice, especia, es_especia, categoria o tipo.
- Ejecuta ARA_inventario_especias.sql una vez en Supabase.
