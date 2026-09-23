
/* =========================================================
   ARA · IMPORTAR INVENTARIO
   Soporta JSON, CSV, XLSX y XLS.
   No borra el inventario existente: añade los productos.
   ========================================================= */

(function () {
  "use strict";

  const UNITS = [
    "unidad", "g", "kg", "ml", "l",
    "paquete", "bote", "lata", "ración"
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKey(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function normalizeLocation(value, fallback = "despensa") {
    const key = normalizeKey(value).replace(/-/g, "_");

    if (["congelador", "congelado", "freezer", "frozen"].includes(key)) {
      return "congelador";
    }

    if (["frigorifico", "frigo", "nevera", "refrigerador", "fridge", "refrigerado"].includes(key)) {
      return "frigorifico";
    }

    if (["despensa", "pantry", "almacen", "alacen"].includes(key)) {
      return "despensa";
    }

    return fallback;
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const text = String(value)
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".");

    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeDate(value) {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const text = String(value).trim();

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
      const [y, m, d] = text.split("-");
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }

    const es = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (es) {
      const day = es[1].padStart(2, "0");
      const month = es[2].padStart(2, "0");
      let year = es[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }

    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }

    return null;
  }

  function csvRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if ((char === "," || char === ";" || char === "\t") && !quoted) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter(row => row.some(value => String(value).trim()));
  }

  function objectFromRow(headers, row) {
    const result = {};
    headers.forEach((header, index) => {
      result[normalizeKey(header)] = row[index] ?? "";
    });
    return result;
  }

  function valueFrom(obj, keys) {
    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (obj[normalized] !== undefined && obj[normalized] !== "") {
        return obj[normalized];
      }
    }
    return "";
  }

  function parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const key = normalizeKey(value);
    return ["si", "sí", "true", "1", "x", "yes", "especia"].includes(key);
  }

  function normalizeItem(raw, fallbackLocation) {
    const obj = {};
    for (const [key, value] of Object.entries(raw || {})) {
      obj[normalizeKey(key)] = value;
    }

    const name = String(valueFrom(obj, [
      "name", "nombre", "producto", "ingrediente", "item", "articulo", "artículo"
    ]) || "").trim();

    if (!name) return null;

    const quantityValue = valueFrom(obj, [
      "quantity", "cantidad", "qty", "unidades"
    ]);

    const unit = String(valueFrom(obj, [
      "unit", "unidad", "medida"
    ]) || "unidad").trim().toLowerCase();

    const location = normalizeLocation(
      valueFrom(obj, [
        "location", "ubicacion", "ubicación", "almacen", "almacén", "zona", "lugar"
      ]),
      fallbackLocation
    );

    const expiration = normalizeDate(valueFrom(obj, [
      "expiration_date", "fecha_caducidad", "caducidad", "fecha_de_caducidad", "expires"
    ]));

    const presentation = String(valueFrom(obj, [
      "presentation", "presentacion", "presentación", "formato", "envase", "packaging"
    ]) || "").trim();

    const isSpiceValue = valueFrom(obj, [
      "is_spice", "especia", "es_especia", "especias", "spice", "categoria", "categoría", "tipo"
    ]);
    const isSpice = isSpiceValue !== "" && parseBoolean(isSpiceValue);

    const notes = String(valueFrom(obj, [
      "notes", "notas", "observaciones", "nota"
    ]) || "").trim();

    return {
      name,
      quantity: parseNumber(quantityValue),
      unit: UNITS.includes(unit) ? unit : "unidad",
      presentation: presentation || null,
      is_spice: location === "despensa" ? isSpice : false,
      location,
      expiration_date: expiration,
      notes: notes || null
    };
  }

  async function ensureXlsxLibrary() {
    if (window.XLSX) return;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar el lector de Excel."));
      document.head.appendChild(script);
    });
  }

  async function parseFile(file, fallbackLocation) {
    const extension = file.name.toLowerCase().split(".").pop();
    const text = await file.text();

    if (extension === "json") {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.inventory)
          ? parsed.inventory
          : Array.isArray(parsed.inventario)
            ? parsed.inventario
            : Array.isArray(parsed.items)
              ? parsed.items
              : Array.isArray(parsed.productos)
                ? parsed.productos
                : [];

      return list
        .map(item => normalizeItem(item, fallbackLocation))
        .filter(Boolean);
    }

    if (extension === "csv" || extension === "txt") {
      const rows = csvRows(text);
      if (rows.length < 2) return [];

      const headers = rows[0];
      return rows
        .slice(1)
        .map(row => normalizeItem(objectFromRow(headers, row), fallbackLocation))
        .filter(Boolean);
    }

    if (extension === "xlsx" || extension === "xls") {
      await ensureXlsxLibrary();

      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = window.XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: true
      });

      return rows
        .map(row => normalizeItem(row, fallbackLocation))
        .filter(Boolean);
    }

    throw new Error("Formato no compatible. Usa JSON, CSV, XLSX o XLS.");
  }

  function createStyles() {
    if (document.getElementById("inventory-import-styles")) return;

    const style = document.createElement("style");
    style.id = "inventory-import-styles";
    style.textContent = `
      .inventory-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .inventory-import-modal {
        position: fixed;
        inset: 0;
        z-index: 140;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .inventory-import-modal.open {
        display: flex;
      }

      .inventory-import-overlay {
        position: absolute;
        inset: 0;
        background: rgba(30, 30, 25, .52);
        backdrop-filter: blur(2px);
      }

      .inventory-import-box {
        position: relative;
        z-index: 1;
        width: min(680px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        background: #fffdf9;
        border-radius: 22px;
        padding: 26px;
        box-shadow: 0 25px 70px rgba(0,0,0,.20);
      }

      .inventory-import-help {
        color: #70756d;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 18px;
      }

      .inventory-import-file,
      .inventory-import-fallback {
        display: grid;
        gap: 7px;
        color: #555a52;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 14px;
      }

      .inventory-import-file input,
      .inventory-import-fallback select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #dedad1;
        border-radius: 11px;
        background: #faf8f4;
        padding: 12px;
        font: inherit;
        color: #343832;
      }

      .inventory-import-preview {
        margin-top: 16px;
        padding: 15px;
        min-height: 65px;
        border: 1px dashed #d9d4ca;
        border-radius: 14px;
        color: #858981;
        font-size: 13px;
      }

      .inventory-import-preview-list {
        display: grid;
        gap: 7px;
        margin-top: 12px;
      }

      .inventory-import-preview-list div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 10px;
        background: #f5f2ec;
        border-radius: 10px;
      }

      .inventory-import-preview-list span {
        color: #858981;
        text-align: right;
      }

      .inventory-import-submit:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      @media(max-width:700px) {
        .inventory-header-actions {
          width: 100%;
          flex-direction: column;
          align-items: stretch;
        }

        .inventory-header-actions button {
          width: 100%;
        }

        .inventory-import-box {
          padding: 21px;
          border-radius: 19px;
        }

        .inventory-import-preview-list div {
          flex-direction: column;
        }

        .inventory-import-preview-list span {
          text-align: left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setupButton() {
    createStyles();

    const page = document.getElementById("inventario");
    if (!page) return;

    const pageHead = page.querySelector(".page-head");
    const addButton = pageHead?.querySelector(".primary");

    if (!pageHead || !addButton || document.getElementById("inventory-import-button")) {
      return;
    }

    const actions = document.createElement("div");
    actions.className = "inventory-header-actions";

    addButton.parentNode.insertBefore(actions, addButton);
    actions.appendChild(document.createElement("span"));
    actions.firstElementChild.remove();

    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.className = "secondary";
    importButton.id = "inventory-import-button";
    importButton.textContent = "⇧ Importar inventario";
    importButton.addEventListener("click", openModal);

    actions.appendChild(importButton);
    actions.appendChild(addButton);
  }

  let modal;

  function closeModal() {
    if (modal) modal.remove();
    modal = null;
  }

  function openModal() {
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.className = "inventory-import-modal open";

    modal.innerHTML = `
      <div class="inventory-import-overlay"></div>
      <div class="inventory-import-box">
        <div class="inventory-modal-header">
          <div>
            <small>IMPORTAR INVENTARIO</small>
            <h2>Cargar productos</h2>
          </div>
          <button type="button" class="modal-close inventory-import-close">×</button>
        </div>

        <div class="inventory-import-help">
          <p><strong>Formatos:</strong> Excel (XLSX/XLS), CSV o JSON.</p>
          <p>La importación añade productos al inventario actual; no borra lo que ya tienes.</p>
          <p>Columnas reconocidas: producto/nombre, cantidad, unidad, presentación/envase, especia, ubicación, caducidad y notas.</p>
        </div>

        <label class="inventory-import-file">
          Archivo
          <input id="inventory-import-file" type="file" accept=".xlsx,.xls,.csv,.txt,.json">
        </label>

        <label class="inventory-import-fallback">
          Ubicación por defecto si el archivo no indica una
          <select id="inventory-import-fallback">
            <option value="despensa">🥫 Despensa</option>
            <option value="frigorifico">🥬 Frigorífico</option>
            <option value="congelador">🧊 Congelador</option>
          </select>
        </label>

        <div id="inventory-import-preview" class="inventory-import-preview">
          Selecciona un archivo para ver una vista previa.
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary inventory-import-cancel">Cancelar</button>
          <button type="button" class="primary inventory-import-submit" disabled>Importar inventario</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const fileInput = modal.querySelector("#inventory-import-file");
    const fallback = modal.querySelector("#inventory-import-fallback");
    const preview = modal.querySelector("#inventory-import-preview");
    const submit = modal.querySelector(".inventory-import-submit");

    let parsedItems = [];

    fileInput.addEventListener("change", async () => {
      parsedItems = [];
      submit.disabled = true;

      const file = fileInput.files?.[0];

      if (!file) {
        preview.textContent = "Selecciona un archivo para ver una vista previa.";
        return;
      }

      preview.textContent = "Leyendo archivo…";

      try {
        parsedItems = await parseFile(file, fallback.value);

        if (!parsedItems.length) {
          preview.innerHTML = "<strong>No se encontraron productos válidos.</strong>";
          return;
        }

        submit.disabled = false;

        preview.innerHTML = `
          <strong>${parsedItems.length} ${parsedItems.length === 1 ? "producto encontrado" : "productos encontrados"}</strong>
          <div class="inventory-import-preview-list">
            ${parsedItems.slice(0, 12).map(item => `
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>
                  ${item.quantity ?? "—"} ${escapeHtml(item.unit)}
                  ${item.presentation ? `· ${escapeHtml(item.presentation)}` : ""}
                  ${item.is_spice ? "· 🌿 Especia" : ""}
                  · ${escapeHtml(item.location)}
                </span>
              </div>
            `).join("")}
            ${parsedItems.length > 12 ? `<small>… y ${parsedItems.length - 12} más</small>` : ""}
          </div>
        `;
      } catch (error) {
        console.error("Error leyendo inventario:", error);
        preview.innerHTML = `
          <strong>No se pudo leer el archivo.</strong>
          <p>${escapeHtml(error.message)}</p>
        `;
      }
    });

    modal.querySelector(".inventory-import-close").addEventListener("click", closeModal);
    modal.querySelector(".inventory-import-cancel").addEventListener("click", closeModal);
    modal.querySelector(".inventory-import-overlay").addEventListener("click", closeModal);

    submit.addEventListener("click", async () => {
      submit.disabled = true;
      submit.textContent = "Importando…";

      let imported = 0;
      const errors = [];

      for (const item of parsedItems) {
        try {
          let { data: ingredient, error: ingredientError } = await supabaseClient
            .from("ingredients")
            .select("id, name")
            .ilike("name", item.name)
            .maybeSingle();

          if (ingredientError) throw ingredientError;

          if (!ingredient) {
            const result = await supabaseClient
              .from("ingredients")
              .insert({
                name: item.name,
                default_unit: item.unit || null
              })
              .select()
              .single();

            ingredient = result.data;
            if (result.error) throw result.error;
          }

          const result = await supabaseClient
            .from("inventory")
            .insert({
              ingredient_id: ingredient.id,
              quantity: item.quantity,
              unit: item.unit || null,
              presentation: item.presentation || null,
              is_spice: item.is_spice === true,
              location: item.location,
              expiration_date: item.expiration_date || null,
              notes: item.notes || null
            });

          if (result.error) throw result.error;

          imported++;
        } catch (error) {
          console.error("Error importando producto:", item.name, error);
          errors.push(`${item.name}: ${error.message || "error desconocido"}`);
        }
      }

      if (typeof loadInventory === "function") {
        await loadInventory();
      }

      if (typeof loadHomeDashboard === "function") {
        await loadHomeDashboard();
      }

      if (!errors.length) {
        closeModal();
        alert(`${imported} ${imported === 1 ? "producto importado" : "productos importados"} correctamente.`);
        return;
      }

      submit.disabled = false;
      submit.textContent = "Importar inventario";
      preview.innerHTML = `
        <strong>Importación terminada con avisos.</strong>
        <p>${imported} productos importados y ${errors.length} con incidencias.</p>
        <div class="inventory-import-preview-list">
          ${errors.slice(0, 8).map(error => `<div><span>${escapeHtml(error)}</span></div>`).join("")}
        </div>
      `;
    });
  }

  document.addEventListener("DOMContentLoaded", setupButton);
  window.openInventoryImportModal = openModal;
})();
