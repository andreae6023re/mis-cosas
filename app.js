const SUPABASE_URL = "https://rxkkwsnxgmbzveaipkob.supabase.co";
const SUPABASE_KEY = "sb_publishable_cqZyBl4hAEI77KE39TFilg_In1ZCwzl";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const titles = {
  inicio: "Hola 👋",
  menu: "Tu menú",
  recetas: "Recetario",
  inventario: "Inventario",
  compra: "Lista de compra"
};

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));

  const page = document.getElementById(id);
  if (page) page.classList.add("active-page");

  document.querySelectorAll(".nav,.bottom-nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.page === id);
  });

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = titles[id] || "ARA";

  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("open");

  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "inicio") {
    loadHomeDashboard();
  }

  if (id === "inventario") {
    loadInventory();
  }

  if (id === "menu") {
    setupInventoryReviewPrompt();
    loadMenu();
  }

  if (id === "recetas") {
    setupRecipeButtons();
    loadRecipes();
  }

  if (id === "compra") {
    loadShoppingList();
  }
}

function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const open = sidebar.classList.toggle("open");

  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = open ? "block" : "none";
}

async function testSupabaseConnection() {
  const { data, error } = await supabaseClient
    .from("ingredients")
    .select("id, name")
    .limit(1);

  if (error) {
    console.error("❌ Error conectando con Supabase:", error);
    return;
  }

  console.log("✅ Supabase conectado correctamente:", data);
}


/* =========================================================
   INICIO · PANEL DE CONTROL
   ========================================================= */

function formatHomeDate(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function homeRecipeName(item) {
  return item?.recipes?.name || "Sin receta";
}

function homeMealCard(type, item) {
  const label = type === "comida" ? "Comida" : "Cena";
  const icon = type === "comida" ? "🍴" : "🌙";
  const hasRecipe = !!item?.recipe_id;

  return `
    <button type="button" class="home-meal-card ${hasRecipe ? "has-recipe" : "is-empty"}" onclick="showPage('menu')">
      <div class="home-meal-icon">${icon}</div>
      <div class="home-meal-content">
        <small>${label}</small>
        <strong>${escapeHtml(homeRecipeName(item))}</strong>
        <span>${hasRecipe ? "Ver menú →" : "Añadir receta →"}</span>
      </div>
    </button>
  `;
}

function homeStatCard(icon, value, label, page) {
  return `
    <button type="button" class="home-stat-card" onclick="showPage('${page}')">
      <div class="home-stat-icon">${icon}</div>
      <div>
        <strong>${value}</strong>
        <span>${label}</span>
      </div>
    </button>
  `;
}

function homeInventoryCard(icon, title, count) {
  return `
    <button type="button" class="home-inventory-card" onclick="showPage('inventario')">
      <div class="home-inventory-icon">${icon}</div>
      <div>
        <strong>${title}</strong>
        <span>${count} ${count === 1 ? "producto" : "productos"}</span>
      </div>
    </button>
  `;
}

async function loadHomeDashboard() {
  const today = new Date();
  const todayISO = dateToISO(today);
  const weekStart = dateToISO(getMonday(today));

  const mealsContainer = document.getElementById("home-today-meals");
  const statsContainer = document.getElementById("home-stats");
  const inventoryContainer = document.getElementById("home-inventory");

  if (!mealsContainer || !statsContainer || !inventoryContainer) return;

  const note = document.querySelector("#inicio .hero p");
  if (note) {
    note.textContent = `${capitalize(formatHomeDate(today))}. Todo lo que necesitas, en un vistazo.`;
  }

  const [planResult, shoppingResult, inventoryResult, recipesResult] = await Promise.all([
    supabaseClient
      .from("meal_plans")
      .select("id")
      .eq("week_start", weekStart)
      .limit(1),
    supabaseClient
      .from("shopping_items")
      .select("id", { count: "exact", head: true })
      .eq("checked", false),
    supabaseClient
      .from("inventory")
      .select("id, location"),
    supabaseClient
      .from("recipes")
      .select("id", { count: "exact", head: true })
  ]);

  if (planResult.error) {
    console.error("Error cargando plan del inicio:", planResult.error);
  }
  if (shoppingResult.error) {
    console.error("Error cargando compra del inicio:", shoppingResult.error);
  }
  if (inventoryResult.error) {
    console.error("Error cargando inventario del inicio:", inventoryResult.error);
  }
  if (recipesResult.error) {
    console.error("Error cargando recetas del inicio:", recipesResult.error);
  }

  let todayItems = [];

  const plan = planResult.data?.[0];
  if (plan?.id) {
    const todayResult = await supabaseClient
      .from("meal_plan_items")
      .select(`
        meal_type,
        recipe_id,
        recipes (
          id,
          name
        )
      `)
      .eq("meal_plan_id", plan.id)
      .eq("date", todayISO)
      .in("meal_type", ["comida", "cena"]);

    if (todayResult.error) {
      console.error("Error cargando el menú de hoy:", todayResult.error);
    } else {
      todayItems = todayResult.data || [];
    }
  }

  const itemByType = {
    comida: todayItems.find(item => item.meal_type === "comida") || null,
    cena: todayItems.find(item => item.meal_type === "cena") || null
  };

  mealsContainer.innerHTML = `
    ${homeMealCard("comida", itemByType.comida)}
    ${homeMealCard("cena", itemByType.cena)}
  `;

  const pendingShopping = shoppingResult.count || 0;
  const totalInventory = inventoryResult.data?.length || 0;
  const totalRecipes = recipesResult.count || 0;

  statsContainer.innerHTML = `
    ${homeStatCard("🛒", pendingShopping, "por comprar", "compra")}
    ${homeStatCard("📦", totalInventory, "en inventario", "inventario")}
    ${homeStatCard("📖", totalRecipes, "recetas", "recetas")}
  `;

  const inventoryCounts = {
    despensa: 0,
    frigorifico: 0,
    congelador: 0
  };

  (inventoryResult.data || []).forEach(item => {
    if (item.location in inventoryCounts) {
      inventoryCounts[item.location]++;
    }
  });

  inventoryContainer.innerHTML = `
    ${homeInventoryCard("🥫", "Despensa", inventoryCounts.despensa)}
    ${homeInventoryCard("🥬", "Frigorífico", inventoryCounts.frigorifico)}
    ${homeInventoryCard("🧊", "Congelador", inventoryCounts.congelador)}
  `;
}

window.loadHomeDashboard = loadHomeDashboard;

let currentInventoryLocation = null;

function createInventoryModal() {
  if (document.getElementById("inventory-modal")) return;

  const modal = document.createElement("div");
  modal.id = "inventory-modal";

  modal.innerHTML = `
    <div class="inventory-modal-overlay"></div>

    <div class="inventory-modal-box">
      <div class="inventory-modal-header">
        <div>
          <small id="inventory-modal-label">AÑADIR PRODUCTO</small>
          <h2 id="inventory-modal-title">Nuevo producto</h2>
        </div>
        <button type="button" id="close-inventory-modal" class="modal-close">×</button>
      </div>

      <form id="inventory-form">
        <label>
          Producto
          <input id="product-name" type="text" placeholder="Ej. Arroz" required readonly>
        </label>

        <div class="form-row">
          <label>
            Cantidad
            <input id="product-quantity" type="number" step="0.01" min="0" placeholder="1">
          </label>

          <label>
            Unidad
            <select id="product-unit">
              <option value="unidad">unidad / unidades</option>
              <option value="g">g / gr</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="paquete">paquete</option>
              <option value="bolsa">bolsa</option>
              <option value="bote">bote / botes</option>
              <option value="lata">lata / latas</option>
              <option value="botella">botella / botellas</option>
              <option value="sobre">sobre / sobres</option>
              <option value="ración">ración</option>
              <option value="otra">Otra unidad…</option>
            </select>
          </label>
        </div>

        <label id="custom-unit-wrap" style="display:none">
          Otra unidad
          <input id="product-custom-unit" type="text" maxlength="30" placeholder="Ej. bandeja, lonchas, cucharadas...">
        </label>

        <label>
          Presentación / envase
          <input id="product-presentation" type="text" maxlength="50" placeholder="Ej. bolsa, bote, caja...">
          <small class="field-hint">Puedes tener el mismo ingrediente varias veces con presentaciones distintas.</small>
        </label>

        <label class="inventory-check-label" id="inventory-spice-wrap">
          <span class="inventory-check-title">Clasificación</span>
          <span class="inventory-check-row">
            <input id="product-is-spice" type="checkbox">
            <span>🌿 Es una especia</span>
          </span>
          <small class="field-hint">Úsalo para especias y condimentos de la despensa.</small>
        </label>

        <label>
          Ubicación
          <select id="product-location">
            <option value="despensa">🥫 Despensa</option>
            <option value="frigorifico">🥬 Frigorífico</option>
            <option value="congelador">🧊 Congelador</option>
          </select>
        </label>

        <label>
          Fecha de caducidad
          <input id="product-expiration" type="date">
        </label>

        <label>
          Notas
          <textarea id="product-notes" rows="3" placeholder="Opcional"></textarea>
        </label>

        <div class="modal-actions">
          <button type="button" id="cancel-inventory" class="secondary">Cancelar</button>
          <button type="submit" id="inventory-save-button" class="primary">Guardar producto</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-inventory-modal")
    .addEventListener("click", closeInventoryModal);

  document.getElementById("cancel-inventory")
    .addEventListener("click", closeInventoryModal);

  modal.querySelector(".inventory-modal-overlay")
    .addEventListener("click", closeInventoryModal);

  document.getElementById("inventory-form")
    .addEventListener("submit", saveInventoryProduct);

  document.getElementById("product-unit")
    .addEventListener("change", toggleCustomInventoryUnit);

  document.getElementById("product-location")
    .addEventListener("change", updateInventorySpiceVisibility);
}

function toggleCustomInventoryUnit() {
  const select = document.getElementById("product-unit");
  const wrap = document.getElementById("custom-unit-wrap");
  if (!select || !wrap) return;

  const isCustom = select.value === "otra";
  wrap.style.display = isCustom ? "grid" : "none";

  if (!isCustom) {
    const input = document.getElementById("product-custom-unit");
    if (input) input.value = "";
  }
}

function setInventoryUnitValue(unit) {
  const select = document.getElementById("product-unit");
  const customInput = document.getElementById("product-custom-unit");
  if (!select) return;

  const normalizedUnit = String(unit ?? "").trim();
  const optionExists = Array.from(select.options).some(option => option.value === normalizedUnit);

  if (optionExists) {
    select.value = normalizedUnit || "unidad";
    if (customInput) customInput.value = "";
  } else if (normalizedUnit) {
    select.value = "otra";
    if (customInput) customInput.value = normalizedUnit;
  } else {
    select.value = "unidad";
    if (customInput) customInput.value = "";
  }

  toggleCustomInventoryUnit();
}

function getInventoryUnitValue() {
  const select = document.getElementById("product-unit");
  const customInput = document.getElementById("product-custom-unit");

  if (!select) return "unidad";
  if (select.value === "otra") {
    return (customInput?.value || "").trim() || "unidad";
  }

  return select.value;
}

function updateInventorySpiceVisibility() {
  const location = document.getElementById("product-location")?.value;
  const wrap = document.getElementById("inventory-spice-wrap");
  const checkbox = document.getElementById("product-is-spice");
  if (!wrap || !checkbox) return;

  const isPantry = location === "despensa";
  wrap.style.display = isPantry ? "grid" : "none";

  if (!isPantry) checkbox.checked = false;
}

function resetInventoryModal(mode = "add") {
  const form = document.getElementById("inventory-form");
  if (form) {
    form.reset();
    delete form.dataset.editId;
    delete form.dataset.editLocation;
  }

  const label = document.getElementById("inventory-modal-label");
  const title = document.getElementById("inventory-modal-title");
  const saveButton = document.getElementById("inventory-save-button");
  const nameInput = document.getElementById("product-name");

  if (mode === "edit") {
    if (label) label.textContent = "EDITAR INVENTARIO";
    if (title) title.textContent = "Editar artículo";
    if (saveButton) saveButton.textContent = "Guardar cambios";
    if (nameInput) nameInput.readOnly = true;
  } else {
    if (label) label.textContent = "AÑADIR PRODUCTO";
    if (title) title.textContent = "Nuevo producto";
    if (saveButton) saveButton.textContent = "Guardar producto";
    if (nameInput) nameInput.readOnly = false;
  }

  setInventoryUnitValue("unidad");

  const spiceCheckbox = document.getElementById("product-is-spice");
  if (spiceCheckbox) spiceCheckbox.checked = false;
  updateInventorySpiceVisibility();
}

function openInventoryModal(location = "despensa", prefillName = "") {
  createInventoryModal();
  resetInventoryModal("add");

  document.getElementById("product-location").value = location;
  document.getElementById("product-name").value = prefillName || "";
  document.getElementById("inventory-modal").classList.add("open");
  document.getElementById("product-name").focus();
}

async function editInventoryProduct(id) {
  const { data, error } = await supabaseClient
    .from("inventory")
    .select(`
      id,
      quantity,
      unit,
      presentation,
      is_spice,
      location,
      expiration_date,
      notes,
      ingredients (
        id,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("Error cargando producto para editar:", error);
    alert("No se pudo cargar el artículo para editar.\n\n" + (error?.message || "Producto no encontrado."));
    return;
  }

  // Al editar desde la lista de inventario, cerramos primero ese modal
  // para que no quede por delante del formulario de edición.
  document.querySelectorAll(".inventory-products-modal")
    .forEach(modal => modal.remove());

  createInventoryModal();
  resetInventoryModal("edit");

  const form = document.getElementById("inventory-form");
  if (form) {
    form.dataset.editId = String(data.id);
    form.dataset.editLocation = data.location || currentInventoryLocation || "despensa";
  }

  document.getElementById("product-name").value = data.ingredients?.name || "Producto";
  document.getElementById("product-quantity").value = data.quantity ?? "";
  setInventoryUnitValue(data.unit || "unidad");
  document.getElementById("product-presentation").value = data.presentation || "";
  document.getElementById("product-is-spice").checked = Boolean(data.is_spice);
  document.getElementById("product-location").value = data.location || "despensa";
  updateInventorySpiceVisibility();
  document.getElementById("product-expiration").value = data.expiration_date || "";
  document.getElementById("product-notes").value = data.notes || "";

  document.getElementById("inventory-modal").classList.add("open");
  document.getElementById("product-quantity").focus();
}

function closeInventoryModal() {
  const modal = document.getElementById("inventory-modal");
  if (!modal) return;

  modal.classList.remove("open");

  const form = document.getElementById("inventory-form");
  if (form) form.reset();

  resetInventoryModal("add");
}

async function saveInventoryProduct(event) {
  event.preventDefault();

  const form = document.getElementById("inventory-form");
  const editId = form?.dataset.editId || null;
  const previousLocation = form?.dataset.editLocation || currentInventoryLocation || "despensa";
  const quantityValue = document.getElementById("product-quantity").value;
  const unit = getInventoryUnitValue();
  const presentation = document.getElementById("product-presentation").value.trim();
  const location = document.getElementById("product-location").value;
  const isSpice = location === "despensa" && document.getElementById("product-is-spice").checked;
  const expiration = document.getElementById("product-expiration").value;
  const notes = document.getElementById("product-notes").value.trim();

  if (!unit) {
    alert("Indica una unidad.");
    return;
  }

  if (editId) {
    const { error } = await supabaseClient
      .from("inventory")
      .update({
        quantity: quantityValue ? Number(quantityValue) : null,
        unit,
        presentation: presentation || null,
        is_spice: isSpice,
        location,
        expiration_date: expiration || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", Number(editId));

    if (error) {
      console.error("Error actualizando inventario:", error);
      alert("No se pudo guardar el cambio.\n\n" + error.message);
      return;
    }

    closeInventoryModal();
    await loadInventory();

    document.querySelectorAll(".inventory-products-modal")
      .forEach(modal => modal.remove());

    await viewInventoryProducts(location || previousLocation);
    return;
  }

  const name = document.getElementById("product-name").value.trim();

  if (!name) {
    alert("Escribe el nombre del producto.");
    return;
  }

  let { data: ingredient, error: ingredientError } = await supabaseClient
    .from("ingredients")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (ingredientError) {
    console.error("Error buscando ingrediente:", ingredientError);
    alert("No se pudo comprobar el ingrediente.");
    return;
  }

  if (!ingredient) {
    const result = await supabaseClient
      .from("ingredients")
      .insert({
        name,
        default_unit: unit
      })
      .select()
      .single();

    ingredient = result.data;
    ingredientError = result.error;

    if (ingredientError) {
      console.error("Error creando ingrediente:", ingredientError);
      alert("No se pudo crear el ingrediente.");
      return;
    }
  }

  const { error: inventoryError } = await supabaseClient
    .from("inventory")
    .insert({
      ingredient_id: ingredient.id,
      quantity: quantityValue ? Number(quantityValue) : null,
      unit,
      presentation: presentation || null,
      is_spice: isSpice,
      location,
      expiration_date: expiration || null,
      notes: notes || null
    });

  if (inventoryError) {
    console.error("Error guardando inventario:", inventoryError);
    alert("No se pudo guardar el producto.\n\n" + inventoryError.message);
    return;
  }

  closeInventoryModal();
  await loadInventory();
  alert("Producto añadido correctamente.");
}

async function loadInventory() {
  const { data, error } = await supabaseClient
    .from("inventory")
    .select(`
      id,
      quantity,
      unit,
      presentation,
      is_spice,
      location,
      expiration_date,
      notes,
      ingredients (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando inventario:", error);
    return;
  }

  renderInventory(data || []);
}

function renderInventory(items) {
  const inventoryContainer = document.querySelector(".inventory");
  if (!inventoryContainer) return;

  const locations = [
    {
      id: "despensa",
      emoji: "🥫",
      title: "Despensa",
      description: "Productos secos, conservas y básicos."
    },
    {
      id: "frigorifico",
      emoji: "🥬",
      title: "Frigorífico",
      description: "Lo que tienes fresco."
    },
    {
      id: "congelador",
      emoji: "🧊",
      title: "Congelador",
      description: "Tus productos congelados."
    }
  ];

  inventoryContainer.innerHTML = locations.map(location => {
    const products = items.filter(item => item.location === location.id);

    return `
      <article class="inventory-card">
        <div class="emoji">${location.emoji}</div>
        <h3>${location.title}</h3>
        <p>${location.description}</p>

        <div class="inventory-count">
          ${products.length}
          ${products.length === 1 ? "producto" : "productos"}
        </div>

        <button
          type="button"
          onclick="viewInventoryProducts('${location.id}')"
        >
          Ver productos →
        </button>
      </article>
    `;
  }).join("");
}

async function viewInventoryProducts(location) {
  currentInventoryLocation = location;

  const { data, error } = await supabaseClient
    .from("inventory")
    .select(`
      id,
      quantity,
      unit,
      presentation,
      is_spice,
      location,
      expiration_date,
      notes,
      ingredients (
        name
      )
    `)
    .eq("location", location)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando productos:", error);
    alert("No se pudieron cargar los productos.\n\n" + error.message);
    return;
  }

  showInventoryProducts(location, data || []);
}

function showInventoryProducts(location, products) {
  const names = {
    despensa: "🥫 Despensa",
    frigorifico: "🥬 Frigorífico",
    congelador: "🧊 Congelador"
  };

  const modal = document.createElement("div");
  modal.className = "inventory-products-modal open";

  modal.innerHTML = `
    <div class="inventory-modal-overlay"></div>

    <div class="inventory-modal-box products-box">
      <div class="inventory-modal-header">
        <div>
          <small>INVENTARIO</small>
          <h2>${names[location]}</h2>
        </div>

        <button type="button" class="modal-close">×</button>
      </div>

      <div class="products-list">
        ${
          products.length === 0
            ? `
              <div class="products-empty">
                <div>📦</div>
                <p>No tienes productos en esta sección.</p>
              </div>
            `
            : products.map(product => {
                const name = product.ingredients?.name || "Producto";
                const quantity = product.quantity !== null
                  ? `${product.quantity} ${product.unit || ""}`.trim()
                  : "";
                const presentation = product.presentation
                  ? ` · ${product.presentation}`
                  : "";
                const spiceBadge = product.is_spice
                  ? `<em class="product-spice-badge">🌿 Especia</em>`
                  : "";

                return `
                  <div class="product-row">
                    <div>
                      <strong>${name}</strong>
                      <span>${quantity}${presentation}</span>
                      ${spiceBadge}
                    </div>

                    <div class="product-actions">
                      <button
                        type="button"
                        class="duplicate-product"
                        title="Añadir otra presentación de este producto"
                        onclick="addInventoryPresentation(${product.id})"
                      >
                        ＋📦
                      </button>
                      <button
                        type="button"
                        class="edit-product"
                        title="Editar artículo"
                        onclick="editInventoryProduct(${product.id})"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        class="delete-product"
                        title="Eliminar artículo"
                        onclick="deleteInventoryProduct(${product.id})"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                `;
              }).join("")
        }
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary close-products">
          Cerrar
        </button>

        <button type="button" class="primary add-from-products">
          ＋ Añadir producto
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-close")
    .addEventListener("click", () => modal.remove());

  modal.querySelector(".close-products")
    .addEventListener("click", () => modal.remove());

  modal.querySelector(".inventory-modal-overlay")
    .addEventListener("click", () => modal.remove());

  modal.querySelector(".add-from-products")
    .addEventListener("click", () => {
      modal.remove();
      openInventoryModal(location);
    });
}

async function addInventoryPresentation(id) {
  const { data, error } = await supabaseClient
    .from("inventory")
    .select(`
      id,
      location,
      ingredients (
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("Error cargando producto para nueva presentación:", error);
    alert("No se pudo preparar la nueva presentación.\n\n" + (error?.message || "Producto no encontrado."));
    return;
  }

  document.querySelectorAll(".inventory-products-modal")
    .forEach(modal => modal.remove());

  openInventoryModal(
    data.location || currentInventoryLocation || "despensa",
    data.ingredients?.name || ""
  );
}

window.addInventoryPresentation = addInventoryPresentation;

async function deleteInventoryProduct(id) {
  const confirmed = confirm(
    "¿Quieres eliminar este producto del inventario?"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("inventory")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error eliminando producto:", error);
    alert("No se pudo eliminar el producto.\n\n" + error.message);
    return;
  }

  document.querySelectorAll(".inventory-products-modal")
    .forEach(modal => modal.remove());

  await loadInventory();
}

function setupInventoryButtons() {
  const inventoryPage = document.getElementById("inventario");
  if (!inventoryPage) return;

  const addButton = inventoryPage.querySelector(".page-head .primary");

  if (addButton) {
    addButton.onclick = () => openInventoryModal("despensa");
  }
}


/* =========================================================
   RECETAS
   ========================================================= */

let currentRecipeId = null;
let currentRecipeFilter = "todas";

function createRecipeModal() {
  if (document.getElementById("recipe-modal")) return;

  const modal = document.createElement("div");
  modal.id = "recipe-modal";

  modal.innerHTML = `
    <div class="recipe-modal-overlay"></div>

    <div class="recipe-modal-box">
      <div class="inventory-modal-header">
        <div>
          <small id="recipe-modal-label">NUEVA RECETA</small>
          <h2 id="recipe-modal-title">Nueva receta</h2>
        </div>
        <button type="button" class="modal-close" id="close-recipe-modal">×</button>
      </div>

      <form id="recipe-form">
        <label>
          Nombre
          <input id="recipe-name" type="text" placeholder="Ej. Pasta con verduras" required>
        </label>

        <label>
          Descripción
          <textarea id="recipe-description" rows="2" placeholder="Opcional"></textarea>
        </label>

        <label>
          Preparación
          <textarea id="recipe-preparation" rows="7" placeholder="Pasos de la receta"></textarea>
        </label>

        <div class="form-row recipe-form-row">
          <label>
            Raciones
            <input id="recipe-servings" type="number" step="0.5" min="0" placeholder="1">
          </label>

          <label>
            Temperatura (°C)
            <input id="recipe-temperature" type="number" step="1" min="0" placeholder="Opcional">
          </label>
        </div>

        <div class="form-row recipe-form-row">
          <label>
            Tiempo preparación (min)
            <input id="recipe-prep-time" type="number" min="0" step="1" placeholder="0">
          </label>

          <label>
            Tiempo cocción (min)
            <input id="recipe-cook-time" type="number" min="0" step="1" placeholder="0">
          </label>
        </div>

        <label>
          Imagen (URL)
          <input id="recipe-image" type="url" placeholder="https://...">
        </label>

        <div class="recipe-checks">
          <label class="recipe-check meal-type-check">
            <input id="recipe-meal-comida" type="checkbox">
            <span>🍴 Comida</span>
          </label>

          <label class="recipe-check meal-type-check">
            <input id="recipe-meal-cena" type="checkbox">
            <span>🌙 Cena</span>
          </label>

          <label class="recipe-check">
            <input id="recipe-fun" type="checkbox">
            <span>🍿 Receta divertida</span>
          </label>

          <label class="recipe-check">
            <input id="recipe-freezable" type="checkbox">
            <span>❄️ Se puede congelar</span>
          </label>

          <label class="recipe-check">
            <input id="recipe-dont-suggest" type="checkbox">
            <span>🚫 No sugerir</span>
          </label>
        </div>

        <div class="recipe-ingredients-section">
          <div class="recipe-form-section-head">
            <div>
              <strong>Ingredientes</strong>
              <span>Añade cantidades y unidades.</span>
            </div>
            <button type="button" class="secondary" id="add-recipe-ingredient">＋ Añadir</button>
          </div>

          <div id="recipe-ingredients-list"></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary" id="cancel-recipe">Cancelar</button>
          <button type="submit" class="primary" id="save-recipe-button">Guardar receta</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#close-recipe-modal")
    .addEventListener("click", closeRecipeModal);

  modal.querySelector("#cancel-recipe")
    .addEventListener("click", closeRecipeModal);

  modal.querySelector(".recipe-modal-overlay")
    .addEventListener("click", closeRecipeModal);

  modal.querySelector("#add-recipe-ingredient")
    .addEventListener("click", () => addRecipeIngredientRow());

  modal.querySelector("#recipe-form")
    .addEventListener("submit", saveRecipe);

  addRecipeIngredientRow();
}

function resetRecipeModal() {
  currentRecipeId = null;

  const form = document.getElementById("recipe-form");
  if (form) form.reset();

  document.getElementById("recipe-modal-label").textContent = "NUEVA RECETA";
  document.getElementById("recipe-modal-title").textContent = "Nueva receta";
  document.getElementById("save-recipe-button").textContent = "Guardar receta";
  document.getElementById("recipe-meal-comida").checked = true;
  document.getElementById("recipe-meal-cena").checked = true;

  document.getElementById("recipe-ingredients-list").innerHTML = "";
  addRecipeIngredientRow();
}

function addRecipeIngredientRow(values = {}) {
  const container = document.getElementById("recipe-ingredients-list");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "recipe-ingredient-row";

  row.innerHTML = `
    <input class="recipe-ingredient-name" type="text" placeholder="Ingrediente" value="${escapeHtml(values.name || "")}">
    <input class="recipe-ingredient-quantity" type="number" min="0" step="0.01" placeholder="Cantidad" value="${values.quantity ?? ""}">
    <select class="recipe-ingredient-unit">
      ${["g","kg","ml","l","unidad","cucharadita","cucharada","pizca","paquete"].map(unit =>
        `<option value="${unit}" ${values.unit === unit ? "selected" : ""}>${unit}</option>`
      ).join("")}
    </select>
    <input class="recipe-ingredient-notes" type="text" placeholder="Nota" value="${escapeHtml(values.notes || "")}">
    <button type="button" class="remove-recipe-ingredient" title="Eliminar">×</button>
  `;

  row.querySelector(".remove-recipe-ingredient")
    .addEventListener("click", () => {
      const rows = container.querySelectorAll(".recipe-ingredient-row");
      if (rows.length === 1) {
        row.querySelectorAll("input").forEach(input => input.value = "");
        row.querySelector(".recipe-ingredient-quantity").value = "";
        row.querySelector(".recipe-ingredient-notes").value = "";
        return;
      }
      row.remove();
    });

  container.appendChild(row);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openRecipeModal() {
  createRecipeModal();
  resetRecipeModal();
  document.getElementById("recipe-modal").classList.add("open");
  document.getElementById("recipe-name").focus();
}

window.openRecipeModal = openRecipeModal;

async function openEditRecipeModal(recipeId) {
  createRecipeModal();

  const { data: recipe, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (error) {
    console.error("Error cargando receta:", error);
    alert("No se pudo cargar la receta.\n\n" + error.message);
    return;
  }

  const { data: relations, error: relationError } = await supabaseClient
    .from("recipe_ingredients")
    .select(`
      quantity,
      unit,
      notes,
      ingredients (
        name
      )
    `)
    .eq("recipe_id", recipeId);

  if (relationError) {
    console.error("Error cargando ingredientes de receta:", relationError);
    alert("No se pudieron cargar los ingredientes.\n\n" + relationError.message);
    return;
  }

  currentRecipeId = recipeId;

  document.getElementById("recipe-modal-label").textContent = "EDITAR RECETA";
  document.getElementById("recipe-modal-title").textContent = "Editar receta";
  document.getElementById("save-recipe-button").textContent = "Guardar cambios";

  document.getElementById("recipe-name").value = recipe.name || "";
  document.getElementById("recipe-description").value = recipe.description || "";
  document.getElementById("recipe-preparation").value = recipe.preparation || "";
  document.getElementById("recipe-servings").value = recipe.servings ?? "";
  document.getElementById("recipe-prep-time").value = recipe.prep_time ?? "";
  document.getElementById("recipe-cook-time").value = recipe.cook_time ?? "";
  document.getElementById("recipe-temperature").value = recipe.temperature ?? "";
  document.getElementById("recipe-image").value = recipe.image_url || "";

  const recipeMealTypes = Array.isArray(recipe.meal_types) && recipe.meal_types.length
    ? recipe.meal_types
    : ["comida", "cena"];

  document.getElementById("recipe-meal-comida").checked = recipeMealTypes.includes("comida");
  document.getElementById("recipe-meal-cena").checked = recipeMealTypes.includes("cena");

  document.getElementById("recipe-fun").checked = !!recipe.fun_recipe;
  document.getElementById("recipe-freezable").checked = !!recipe.is_freezable;
  document.getElementById("recipe-dont-suggest").checked = !!recipe.do_not_suggest;

  const container = document.getElementById("recipe-ingredients-list");
  container.innerHTML = "";

  if (!relations?.length) {
    addRecipeIngredientRow();
  } else {
    relations.forEach(item => addRecipeIngredientRow({
      name: item.ingredients?.name || "",
      quantity: item.quantity,
      unit: item.unit || "unidad",
      notes: item.notes || ""
    }));
  }

  document.getElementById("recipe-modal").classList.add("open");
}

function closeRecipeModal() {
  const modal = document.getElementById("recipe-modal");
  if (!modal) return;

  modal.classList.remove("open");
  resetRecipeModal();
}

function collectRecipeIngredients() {
  return [...document.querySelectorAll(".recipe-ingredient-row")]
    .map(row => ({
      name: row.querySelector(".recipe-ingredient-name").value.trim(),
      quantity: row.querySelector(".recipe-ingredient-quantity").value,
      unit: row.querySelector(".recipe-ingredient-unit").value,
      notes: row.querySelector(".recipe-ingredient-notes").value.trim()
    }))
    .filter(item => item.name);
}

async function findOrCreateIngredient(name, unit) {
  let { data: ingredient, error } = await supabaseClient
    .from("ingredients")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    return { ingredient: null, error };
  }

  if (!ingredient) {
    const result = await supabaseClient
      .from("ingredients")
      .insert({
        name,
        default_unit: unit || null
      })
      .select()
      .single();

    return {
      ingredient: result.data,
      error: result.error
    };
  }

  return {
    ingredient,
    error: null
  };
}

async function saveRecipe(event) {
  event.preventDefault();

  const name = document.getElementById("recipe-name").value.trim();
  if (!name) {
    alert("Escribe el nombre de la receta.");
    return;
  }

  const mealTypes = [];
  if (document.getElementById("recipe-meal-comida").checked) mealTypes.push("comida");
  if (document.getElementById("recipe-meal-cena").checked) mealTypes.push("cena");

  if (!mealTypes.length) {
    alert("Marca si la receta es para comida, cena o ambas.");
    return;
  }

  const payload = {
    name,
    description: document.getElementById("recipe-description").value.trim() || null,
    preparation: document.getElementById("recipe-preparation").value.trim() || null,
    servings: document.getElementById("recipe-servings").value
      ? Number(document.getElementById("recipe-servings").value)
      : null,
    prep_time: document.getElementById("recipe-prep-time").value
      ? Number(document.getElementById("recipe-prep-time").value)
      : null,
    cook_time: document.getElementById("recipe-cook-time").value
      ? Number(document.getElementById("recipe-cook-time").value)
      : null,
    temperature: document.getElementById("recipe-temperature").value
      ? Number(document.getElementById("recipe-temperature").value)
      : null,
    image_url: document.getElementById("recipe-image").value.trim() || null,
    meal_types: mealTypes,
    fun_recipe: document.getElementById("recipe-fun").checked,
    is_freezable: document.getElementById("recipe-freezable").checked,
    do_not_suggest: document.getElementById("recipe-dont-suggest").checked
  };

  let recipeId = currentRecipeId;

  if (recipeId) {
    const { error } = await supabaseClient
      .from("recipes")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", recipeId);

    if (error) {
      console.error("Error actualizando receta:", error);
      alert("No se pudo actualizar la receta.\n\n" + error.message);
      return;
    }

    const { error: deleteError } = await supabaseClient
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (deleteError) {
      console.error("Error actualizando ingredientes:", deleteError);
      alert("La receta se actualizó, pero no se pudieron actualizar los ingredientes.\n\n" + deleteError.message);
      return;
    }
  } else {
    const { data, error } = await supabaseClient
      .from("recipes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creando receta:", error);
      alert("No se pudo crear la receta.\n\n" + error.message);
      return;
    }

    recipeId = data.id;
  }

  const ingredients = collectRecipeIngredients();

  for (const item of ingredients) {
    const { ingredient, error: ingredientError } = await findOrCreateIngredient(item.name, item.unit);

    if (ingredientError) {
      console.error("Error con ingrediente de receta:", ingredientError);
      alert("La receta se guardó, pero hubo un problema con el ingrediente " + item.name + ".\n\n" + ingredientError.message);
      continue;
    }

    const { error: relationError } = await supabaseClient
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipeId,
        ingredient_id: ingredient.id,
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit || null,
        notes: item.notes || null
      });

    if (relationError) {
      console.error("Error guardando ingrediente de receta:", relationError);
    }
  }

  closeRecipeModal();
  await loadRecipes();
}

async function loadRecipes() {
  const { data, error } = await supabaseClient
    .from("recipes")
    .select(`
      id,
      name,
      description,
      preparation,
      servings,
      prep_time,
      cook_time,
      temperature,
      image_url,
      meal_types,
      fun_recipe,
      is_freezable,
      do_not_suggest,
      created_at,
      updated_at
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error cargando recetas:", error);
    renderRecipesError(error);
    return;
  }

  renderRecipes(data || []);
}

function renderRecipesError(error) {
  const page = document.getElementById("recetas");
  if (!page) return;

  const empty = page.querySelector(".empty");
  if (empty) {
    empty.innerHTML = `
      <div class="empty-icon">!</div>
      <h3>No se pudieron cargar las recetas</h3>
      <p>${escapeHtml(error.message || "Error desconocido")}</p>
    `;
  }
}

function recipeMatchesFilter(recipe) {
  if (currentRecipeFilter === "todas") return true;

  const types = Array.isArray(recipe.meal_types) && recipe.meal_types.length
    ? recipe.meal_types
    : ["comida", "cena"];

  if (currentRecipeFilter === "comidas") return types.includes("comida");
  if (currentRecipeFilter === "cenas") return types.includes("cena");
  if (currentRecipeFilter === "divertidas") return !!recipe.fun_recipe;
  if (currentRecipeFilter === "congelables") return !!recipe.is_freezable;
  if (currentRecipeFilter === "no-sugerir") return !!recipe.do_not_suggest;

  return true;
}

function recipeCardHtml(recipe) {
  const meta = [];

  if (recipe.prep_time) meta.push(`⏱ ${recipe.prep_time} min prep`);
  if (recipe.cook_time) meta.push(`🔥 ${recipe.cook_time} min`);
  if (recipe.servings) meta.push(`🍽 ${recipe.servings} ración${recipe.servings === 1 ? "" : "es"}`);

  const recipeTypes = Array.isArray(recipe.meal_types) && recipe.meal_types.length
    ? recipe.meal_types
    : ["comida", "cena"];

  if (recipeTypes.includes("comida")) meta.push("🍴 Comida");
  if (recipeTypes.includes("cena")) meta.push("🌙 Cena");
  if (recipe.fun_recipe) meta.push("🍿 Divertida");
  if (recipe.is_freezable) meta.push("❄️ Congela");

  const imageHtml = recipe.image_url
    ? `<img src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.name)}">`
    : `<div class="recipe-placeholder">🍽️</div>`;

  return `
    <article class="recipe-card">
      <div class="recipe-image">${imageHtml}</div>

      <div class="recipe-content">
        <h3>${escapeHtml(recipe.name)}</h3>

        <p>${escapeHtml(recipe.description || "Sin descripción")}</p>

        <div class="recipe-meta">
          ${meta.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
        </div>

        <div class="recipe-card-actions">
          <button type="button" class="primary recipe-view" data-id="${recipe.id}">
            Ver receta
          </button>

          <button type="button" class="secondary recipe-edit" data-id="${recipe.id}">
            Editar
          </button>

          <button type="button" class="recipe-delete" data-id="${recipe.id}">
            Eliminar
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderRecipes(recipes) {
  const page = document.getElementById("recetas");
  if (!page) return;

  const filtered = recipes.filter(recipeMatchesFilter);

  let container = page.querySelector(".recipe-grid");
  if (!container) {
    container = document.createElement("div");
    container.className = "recipe-grid";

    const empty = page.querySelector(".empty");
    if (empty) empty.replaceWith(container);
    else page.appendChild(container);
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty recipe-empty">
        <div class="empty-icon">▤</div>
        <h3>${recipes.length ? "No hay recetas en este filtro" : "Aún no hay recetas"}</h3>
        <p>${recipes.length ? "Prueba otra categoría o crea una receta nueva." : "Crea tu primera receta y aparecerá aquí."}</p>
        <button class="secondary" id="empty-recipe-add">＋ Añadir receta</button>
      </div>
    `;

    const emptyAdd = container.querySelector("#empty-recipe-add");
    if (emptyAdd) {
      emptyAdd.onclick = openRecipeModal;
    }

    return;
  }

  container.innerHTML = filtered.map(recipeCardHtml).join("");

  container.querySelectorAll(".recipe-view").forEach(button => {
    button.addEventListener("click", () => openRecipeDetail(Number(button.dataset.id)));
  });

  container.querySelectorAll(".recipe-edit").forEach(button => {
    button.addEventListener("click", () => openEditRecipeModal(Number(button.dataset.id)));
  });

  container.querySelectorAll(".recipe-delete").forEach(button => {
    button.addEventListener("click", () => deleteRecipe(Number(button.dataset.id)));
  });
}


/* =========================================================
   FICHA COMPLETA DE RECETA
   ========================================================= */

async function openRecipeDetail(recipeId) {
  const { data: recipe, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (error) {
    console.error("Error cargando detalle de receta:", error);
    alert("No se pudo cargar la receta.\n\n" + error.message);
    return;
  }

  const { data: ingredients, error: ingredientsError } = await supabaseClient
    .from("recipe_ingredients")
    .select(`
      quantity,
      unit,
      notes,
      ingredients (
        name
      )
    `)
    .eq("recipe_id", recipeId);

  if (ingredientsError) {
    console.error("Error cargando ingredientes:", ingredientsError);
    alert("No se pudieron cargar los ingredientes.\n\n" + ingredientsError.message);
    return;
  }

  showRecipeDetail(recipe, ingredients || []);
}

function showRecipeDetail(recipe, ingredients) {
  document.querySelectorAll(".recipe-detail-modal").forEach(modal => modal.remove());

  const modal = document.createElement("div");
  modal.className = "recipe-detail-modal open";

  const imageHtml = recipe.image_url
    ? `<img src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.name)}">`
    : `<div class="recipe-detail-placeholder">🍽️</div>`;

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  const meta = [];
  if (recipe.servings) meta.push(`🍽 ${recipe.servings} ración${recipe.servings === 1 ? "" : "es"}`);
  if (recipe.prep_time) meta.push(`⏱ ${recipe.prep_time} min preparación`);
  if (recipe.cook_time) meta.push(`🔥 ${recipe.cook_time} min cocción`);
  if (totalTime) meta.push(`⌛ ${totalTime} min total`);
  if (recipe.temperature) meta.push(`🌡️ ${recipe.temperature} °C`);

  const tags = [];
  if (recipe.fun_recipe) tags.push("🍿 Receta divertida");
  if (recipe.is_freezable) tags.push("❄️ Se puede congelar");
  if (recipe.do_not_suggest) tags.push("🚫 No sugerir");

  modal.innerHTML = `
    <div class="recipe-detail-overlay"></div>

    <div class="recipe-detail-box">
      <div class="recipe-detail-top">
        <button type="button" class="recipe-detail-close" title="Cerrar">×</button>
      </div>

      <div class="recipe-detail-image">
        ${imageHtml}
      </div>

      <div class="recipe-detail-content">
        <small>RECETA</small>
        <h2>${escapeHtml(recipe.name)}</h2>

        ${recipe.description ? `<p class="recipe-detail-description">${escapeHtml(recipe.description)}</p>` : ""}

        ${meta.length ? `
          <div class="recipe-detail-meta">
            ${meta.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
          </div>
        ` : ""}

        ${tags.length ? `
          <div class="recipe-detail-tags">
            ${tags.map(item => `<span class="recipe-detail-tag">${escapeHtml(item)}</span>`).join("")}
          </div>
        ` : ""}

        <section class="recipe-detail-section">
          <h3>Ingredientes</h3>

          ${
            ingredients.length
              ? `
                <div class="recipe-detail-ingredients">
                  ${ingredients.map(item => `
                    <div class="recipe-detail-ingredient">
                      <span>${escapeHtml(item.ingredients?.name || "Ingrediente")}</span>
                      <strong>${item.quantity !== null && item.quantity !== undefined ? escapeHtml(String(item.quantity)) : ""} ${escapeHtml(item.unit || "")}</strong>
                      ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
                    </div>
                  `).join("")}
                </div>
              `
              : `<p class="recipe-detail-muted">Esta receta todavía no tiene ingredientes añadidos.</p>`
          }
        </section>

        <section class="recipe-detail-section">
          <h3>Preparación</h3>

          ${
            recipe.preparation
              ? `<div class="recipe-detail-preparation">${escapeHtml(recipe.preparation).replace(/\n/g, "<br>")}</div>`
              : `<p class="recipe-detail-muted">No se ha añadido la preparación.</p>`
          }
        </section>

        <div class="recipe-detail-actions">
          <button type="button" class="secondary recipe-detail-edit">Editar receta</button>
          <button type="button" class="primary recipe-detail-close-bottom">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  modal.querySelector(".recipe-detail-close").addEventListener("click", close);
  modal.querySelector(".recipe-detail-close-bottom").addEventListener("click", close);
  modal.querySelector(".recipe-detail-overlay").addEventListener("click", close);

  modal.querySelector(".recipe-detail-edit").addEventListener("click", () => {
    modal.remove();
    openEditRecipeModal(recipe.id);
  });
}

async function deleteRecipe(id) {
  const confirmed = confirm("¿Quieres eliminar esta receta?");

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error eliminando receta:", error);
    alert("No se pudo eliminar la receta.\n\n" + error.message);
    return;
  }

  await loadRecipes();
}

function setupRecipeButtons() {
  const page = document.getElementById("recetas");
  if (!page) return;

  const addRecipeButton = page.querySelector(".page-head .primary");
  if (addRecipeButton) {
    addRecipeButton.onclick = openRecipeModal;
  }

  page.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      page.querySelectorAll(".chip").forEach(item => item.classList.remove("selected"));
      chip.classList.add("selected");

      const label = chip.textContent.trim().toLowerCase();

      if (label === "todas") currentRecipeFilter = "todas";
      else if (label === "comidas") currentRecipeFilter = "comidas";
      else if (label === "cenas") currentRecipeFilter = "cenas";
      else if (label === "divertidas") currentRecipeFilter = "divertidas";
      else if (label === "congelables") currentRecipeFilter = "congelables";
      else if (label === "no sugerir") currentRecipeFilter = "no-sugerir";
      else currentRecipeFilter = "todas";

      loadRecipes();
    });
  });
}

/* Reemplaza los filtros de texto iniciales por filtros que sí podemos soportar
   con el esquema actual. */
function normalizeRecipeFilters() {
  const page = document.getElementById("recetas");
  if (!page) return;

  const chips = page.querySelector(".chips");
  if (!chips) return;

  chips.innerHTML = `
    <button class="chip selected" type="button">Todas</button>
    <button class="chip" type="button">Comidas</button>
    <button class="chip" type="button">Cenas</button>
    <button class="chip" type="button">Divertidas</button>
    <button class="chip" type="button">Congelables</button>
    <button class="chip" type="button">No sugerir</button>
  `;
}



/* =========================================================
   MENÚ SEMANAL
   ========================================================= */

let menuWeekStart = getMonday(new Date());
let selectedMenuSlot = null;
let menuRecipesCache = [];

function dateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function formatWeekLabel(start) {
  const end = addDays(start, 6);
  const options = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("es-ES", options)} – ${end.toLocaleDateString("es-ES", options)}`;
}

function isCurrentMenuWeek() {
  return dateToISO(menuWeekStart) === dateToISO(getMonday(new Date()));
}

function updateMenuWeekNavigation() {
  const label = document.getElementById("menu-week-label");
  if (label) label.textContent = formatWeekLabel(menuWeekStart);

  const currentButton = document.getElementById("menu-current-week");
  if (currentButton) {
    currentButton.textContent = isCurrentMenuWeek() ? "Esta semana" : "Volver a esta semana";
    currentButton.disabled = isCurrentMenuWeek();
  }
}

async function changeMenuWeek(amount) {
  menuWeekStart = addDays(menuWeekStart, amount * 7);
  updateMenuWeekNavigation();
  await loadMenu();
}

async function goToCurrentMenuWeek() {
  menuWeekStart = getMonday(new Date());
  updateMenuWeekNavigation();
  await loadMenu();
}

function formatDayName(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "long"
  });
}

function getMealLabel(type) {
  return {
    comida: "Comida",
    cena: "Cena"
  }[type] || type;
}

async function loadMenu() {
  const menuPage = document.getElementById("menu");
  if (!menuPage) return;

  const { data: plans, error: planError } = await supabaseClient
    .from("meal_plans")
    .select("id, week_start")
    .eq("week_start", dateToISO(menuWeekStart))
    .limit(1);

  if (planError) {
    console.error("Error cargando menú:", planError);
    renderMenuError(planError);
    return;
  }

  const plan = plans?.[0] || null;
  let items = [];

  if (plan) {
    const result = await supabaseClient
      .from("meal_plan_items")
      .select(`
        id,
        date,
        meal_type,
        recipe_id,
        is_locked,
        is_tupper,
        notes,
        recipes (
          id,
          name
        )
      `)
      .eq("meal_plan_id", plan.id)
      .order("date")
      .order("meal_type");

    if (result.error) {
      console.error("Error cargando comidas del menú:", result.error);
      renderMenuError(result.error);
      return;
    }

    items = result.data || [];
  }

  renderMenuWeek(items);
}

function renderMenuError(error) {
  const grid = document.querySelector("#menu .week");
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty">
      <div class="empty-icon">!</div>
      <h3>No se pudo cargar el menú</h3>
      <p>${escapeHtml(error.message || "Error desconocido")}</p>
    </div>
  `;
}

function renderMenuWeek(items) {
  const grid = document.querySelector("#menu .week");
  if (!grid) return;

  const types = ["comida", "cena"];

  grid.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(menuWeekStart, index);
    const iso = dateToISO(date);

    return `
      <article class="menu-day-card">
        <button
          type="button"
          class="menu-day-head"
          data-day-detail="${iso}"
          title="Ver detalle del día"
        >
          <strong>${capitalize(formatDayName(date))}</strong>
          <span>${date.getDate()}/${date.getMonth() + 1}</span>
        </button>

        ${types.map(type => {
          const item = items.find(row =>
            row.date === iso && row.meal_type === type
          );

          return `
            <button
              type="button"
              class="menu-meal-slot ${item?.recipe_id ? "has-recipe" : ""} ${item?.is_tupper ? "is-tupper" : ""}"
              data-date="${iso}"
              data-meal-type="${type}"
            >
              <span>${getMealLabel(type)}</span>
              <em>${item?.recipes?.name || "+ Añadir receta"}</em>
              <div class="menu-slot-badges">
                ${item?.is_locked ? '<b class="menu-lock">🔒 Fija</b>' : ""}
                ${item?.is_tupper ? '<b class="menu-tupper">🥡 Tupper</b>' : ""}
              </div>
            </button>
          `;
        }).join("")}
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".menu-day-head").forEach(button => {
    button.addEventListener("click", () => {
      openMenuDayDetail(button.dataset.dayDetail);
    });
  });

  grid.querySelectorAll(".menu-meal-slot").forEach(button => {
    button.addEventListener("click", () => {
      openMenuRecipePicker(
        button.dataset.date,
        button.dataset.mealType
      );
    });
  });

  updateMenuWeekNavigation();
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

async function openMenuDayDetail(date) {
  const { data: plans, error: planError } = await supabaseClient
    .from("meal_plans")
    .select("id")
    .eq("week_start", dateToISO(menuWeekStart))
    .limit(1);

  if (planError) {
    console.error("Error buscando el menú del día:", planError);
    alert("No se pudo cargar el detalle del día.\n\n" + planError.message);
    return;
  }

  const plan = plans?.[0];
  let items = [];

  if (plan) {
    const { data, error } = await supabaseClient
      .from("meal_plan_items")
      .select(`
        id,
        date,
        meal_type,
        recipe_id,
        is_locked,
        is_tupper,
        notes,
        recipes (
          id,
          name,
          description,
          preparation,
          servings,
          prep_time,
          cook_time,
          temperature,
          image_url,
          meal_types,
          fun_recipe,
          is_freezable,
          do_not_suggest
        )
      `)
      .eq("meal_plan_id", plan.id)
      .eq("date", date)
      .in("meal_type", ["comida", "cena"])
      .order("meal_type");

    if (error) {
      console.error("Error cargando el detalle del día:", error);
      alert("No se pudo cargar el detalle del día.\n\n" + error.message);
      return;
    }

    items = data || [];
  }

  const recipesWithIngredients = await Promise.all(
    items
      .filter(item => item.recipe_id)
      .map(async item => {
        const { data: ingredients } = await supabaseClient
          .from("recipe_ingredients")
          .select(`
            quantity,
            unit,
            notes,
            ingredients (
              name
            )
          `)
          .eq("recipe_id", item.recipe_id);

        return {
          ...item,
          ingredients: ingredients || []
        };
      })
  );

  const enrichedByMeal = new Map(
    recipesWithIngredients.map(item => [item.meal_type, item])
  );

  const dateObject = new Date(`${date}T00:00:00`);
  const prettyDate = capitalize(dateObject.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }));

  document.querySelectorAll(".menu-day-detail-modal").forEach(modal => modal.remove());

  const modal = document.createElement("div");
  modal.className = "menu-day-detail-modal open";

  const mealHtml = ["comida", "cena"].map(type => {
    const item = enrichedByMeal.get(type);
    const recipe = item?.recipes;

    if (!recipe) {
      return `
        <section class="menu-day-detail-meal is-empty">
          <div class="menu-day-detail-meal-head">
            <span>${type === "comida" ? "🍴" : "🌙"}</span>
            <div>
              <small>${getMealLabel(type)}</small>
              <h3>Sin receta</h3>
            </div>
          </div>
          <p>No hay ninguna receta asignada para este momento.</p>
        </section>
      `;
    }

    const meta = [];
    if (recipe.servings) meta.push(`${recipe.servings} ración${recipe.servings === 1 ? "" : "es"}`);
    if (recipe.prep_time) meta.push(`${recipe.prep_time} min preparación`);
    if (recipe.cook_time) meta.push(`${recipe.cook_time} min cocción`);
    if (recipe.temperature) meta.push(`${recipe.temperature} °C`);

    return `
      <section class="menu-day-detail-meal">
        <div class="menu-day-detail-meal-head">
          <span>${type === "comida" ? "🍴" : "🌙"}</span>
          <div>
            <small>${getMealLabel(type)}</small>
            <h3>${escapeHtml(recipe.name)}</h3>
          </div>
          <div class="menu-day-detail-badges">
            ${item.is_locked ? '<b class="menu-day-detail-lock">🔒 Fija</b>' : ""}
            ${item.is_tupper ? '<b class="menu-day-detail-tupper">🥡 Tupper</b>' : ""}
          </div>
        </div>

        ${recipe.description ? `<p class="menu-day-detail-description">${escapeHtml(recipe.description)}</p>` : ""}

        ${meta.length ? `
          <div class="menu-day-detail-meta">
            ${meta.map(value => `<span>${escapeHtml(value)}</span>`).join("")}
          </div>
        ` : ""}

        <div class="menu-day-detail-subsection">
          <h4>Preparación</h4>
          ${recipe.preparation
            ? `<div class="menu-day-detail-preparation">${escapeHtml(recipe.preparation).replace(/\n/g, "<br>")}</div>`
            : `<p class="menu-day-detail-muted">No hay preparación añadida.</p>`}
        </div>

        <div class="menu-day-detail-subsection">
          <h4>Ingredientes</h4>
          ${item.ingredients.length
            ? `<div class="menu-day-detail-ingredients">${item.ingredients.map(ingredient => `
                <div>
                  <span>${escapeHtml(ingredient.ingredients?.name || "Ingrediente")}</span>
                  <strong>${ingredient.quantity !== null && ingredient.quantity !== undefined ? escapeHtml(String(ingredient.quantity)) : ""} ${escapeHtml(ingredient.unit || "")}</strong>
                </div>
              `).join("")}</div>`
            : `<p class="menu-day-detail-muted">No hay ingredientes añadidos.</p>`}
        </div>

        <div class="menu-day-detail-actions">
          <button type="button" class="secondary menu-day-change-recipe" data-date="${date}" data-meal-type="${type}">↻ Cambiar comida</button>
          <button type="button" class="secondary menu-day-toggle-tupper" data-date="${date}" data-meal-type="${type}">${item.is_tupper ? "✓ Es tupper" : "🥡 Marcar tupper"}</button>
          <button type="button" class="secondary menu-day-open-recipe" data-recipe-id="${recipe.id}">Ver ficha completa</button>
        </div>
      </section>
    `;
  }).join("");

  modal.innerHTML = `
    <div class="menu-day-detail-overlay"></div>
    <div class="menu-day-detail-box">
      <div class="menu-day-detail-top">
        <div>
          <small>DETALLE DEL DÍA</small>
          <h2>${escapeHtml(prettyDate)}</h2>
        </div>
        <button type="button" class="modal-close menu-day-detail-close">×</button>
      </div>
      <div class="menu-day-detail-grid">
        ${mealHtml}
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary menu-day-detail-close-bottom">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".menu-day-detail-close").addEventListener("click", close);
  modal.querySelector(".menu-day-detail-close-bottom").addEventListener("click", close);
  modal.querySelector(".menu-day-detail-overlay").addEventListener("click", close);

  modal.querySelectorAll(".menu-day-open-recipe").forEach(button => {
    button.addEventListener("click", () => {
      const recipeId = Number(button.dataset.recipeId);
      close();
      openRecipeDetail(recipeId);
    });
  });

  modal.querySelectorAll(".menu-day-change-recipe").forEach(button => {
    button.addEventListener("click", () => {
      const dateValue = button.dataset.date;
      const mealType = button.dataset.mealType;
      close();
      openMenuRecipePicker(dateValue, mealType);
    });
  });

  modal.querySelectorAll(".menu-day-toggle-tupper").forEach(button => {
    button.addEventListener("click", async () => {
      await toggleMenuTupper(button.dataset.date, button.dataset.mealType);
      close();
      openMenuDayDetail(date);
    });
  });
}

async function getOrCreateMealPlan() {
  const weekStart = dateToISO(menuWeekStart);

  const { data: existing, error } = await supabaseClient
    .from("meal_plans")
    .select("id, week_start")
    .eq("week_start", weekStart)
    .limit(1);

  if (error) return { plan: null, error };

  if (existing?.[0]) {
    return { plan: existing[0], error: null };
  }

  const { data, error: insertError } = await supabaseClient
    .from("meal_plans")
    .insert({ week_start: weekStart })
    .select()
    .single();

  return { plan: data, error: insertError };
}

async function loadMenuRecipes() {
  const { data, error } = await supabaseClient
    .from("recipes")
    .select("id, name, description, meal_types, do_not_suggest, fun_recipe, is_freezable")
    .eq("do_not_suggest", false)
    .order("name");

  if (error) {
    console.error("Error cargando recetas para menú:", error);
    return [];
  }

  return data || [];
}

async function getCurrentMenuItem(date, mealType) {
  const { data: plans, error: planError } = await supabaseClient
    .from("meal_plans")
    .select("id")
    .eq("week_start", dateToISO(menuWeekStart))
    .limit(1);

  if (planError || !plans?.[0]) {
    return { item: null, plan: null, error: planError };
  }

  const { data: items, error } = await supabaseClient
    .from("meal_plan_items")
    .select("id, recipe_id, is_locked, is_tupper")
    .eq("meal_plan_id", plans[0].id)
    .eq("date", date)
    .eq("meal_type", mealType)
    .limit(1);

  return {
    item: items?.[0] || null,
    plan: plans[0],
    error
  };
}

async function openMenuRecipePicker(date, mealType) {
  selectedMenuSlot = { date, mealType };

  if (!menuRecipesCache.length) {
    menuRecipesCache = await loadMenuRecipes();
  }

  const current = await getCurrentMenuItem(date, mealType);

  if (current.error) {
    console.error("Error leyendo el hueco del menú:", current.error);
  }

  document.querySelectorAll(".menu-picker-modal").forEach(modal => modal.remove());

  const modal = document.createElement("div");
  modal.className = "menu-picker-modal open";

  const hasRecipe = !!current.item?.recipe_id;
  const isLocked = !!current.item?.is_locked;

  modal.innerHTML = `
    <div class="menu-picker-overlay"></div>

    <div class="menu-picker-box">
      <div class="inventory-modal-header">
        <div>
          <small>${getMealLabel(mealType).toUpperCase()}</small>
          <h2>Elegir receta</h2>
          ${isLocked ? '<span class="menu-current-lock">🔒 Receta fijada</span>' : ""}
        </div>
        <button type="button" class="modal-close menu-picker-close">×</button>
      </div>

      <input
        type="search"
        class="menu-recipe-search"
        placeholder="Buscar receta…"
      >

      <div class="menu-recipe-options"></div>

      <div class="modal-actions menu-picker-actions">
        <button type="button" class="secondary menu-remove-recipe">
          Vaciar
        </button>

        ${
          hasRecipe
            ? `
              <button type="button" class="secondary menu-lock-recipe">
                ${isLocked ? "🔓 Desbloquear" : "🔒 Fijar receta"}
              </button>
            `
            : ""
        }

        <button type="button" class="secondary menu-picker-cancel">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const renderOptions = (query = "") => {
    const text = query.trim().toLowerCase();

    const recipes = menuRecipesCache.filter(recipe => {
      const types = Array.isArray(recipe.meal_types) && recipe.meal_types.length
        ? recipe.meal_types
        : ["comida", "cena"];

      const matchesMealType = types.includes(mealType);
      const matchesSearch =
        !text ||
        recipe.name.toLowerCase().includes(text) ||
        (recipe.description || "").toLowerCase().includes(text);

      return matchesMealType && matchesSearch;
    });

    const container = modal.querySelector(".menu-recipe-options");

    if (!recipes.length) {
      container.innerHTML = `
        <div class="products-empty">
          <div>🔎</div>
          <p>No se encontraron recetas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recipes.map(recipe => `
      <button
        type="button"
        class="menu-recipe-option"
        data-id="${recipe.id}"
      >
        <strong>${escapeHtml(recipe.name)}</strong>
        <span>${escapeHtml(recipe.description || "")}</span>
      </button>
    `).join("");

    container.querySelectorAll(".menu-recipe-option").forEach(option => {
      option.addEventListener("click", async () => {
        await assignRecipeToMenu(
          Number(option.dataset.id),
          selectedMenuSlot.date,
          selectedMenuSlot.mealType
        );
        modal.remove();
      });
    });
  };

  renderOptions();

  modal.querySelector(".menu-recipe-search").addEventListener("input", event => {
    renderOptions(event.target.value);
  });

  const close = () => modal.remove();

  modal.querySelector(".menu-picker-close").addEventListener("click", close);
  modal.querySelector(".menu-picker-cancel").addEventListener("click", close);
  modal.querySelector(".menu-picker-overlay").addEventListener("click", close);

  modal.querySelector(".menu-remove-recipe").addEventListener("click", async () => {
    await removeRecipeFromMenu(
      selectedMenuSlot.date,
      selectedMenuSlot.mealType
    );
    modal.remove();
  });

  const lockButton = modal.querySelector(".menu-lock-recipe");
  if (lockButton) {
    lockButton.addEventListener("click", async () => {
      await toggleMenuLock(
        selectedMenuSlot.date,
        selectedMenuSlot.mealType
      );
      modal.remove();
    });
  }
}

async function toggleMenuTupper(date, mealType) {
  const current = await getCurrentMenuItem(date, mealType);

  if (current.error) {
    alert("No se pudo leer el estado del tupper.\n\n" + current.error.message);
    return;
  }

  if (!current.item) return;

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .update({
      is_tupper: !current.item.is_tupper
    })
    .eq("id", current.item.id);

  if (error) {
    console.error("Error cambiando tupper:", error);
    alert("No se pudo cambiar el estado de tupper.\n\n" + error.message);
    return;
  }

  await loadMenu();
}

async function toggleMenuLock(date, mealType) {
  const current = await getCurrentMenuItem(date, mealType);

  if (current.error) {
    alert("No se pudo leer el estado de la receta.\n\n" + current.error.message);
    return;
  }

  if (!current.item) return;

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .update({
      is_locked: !current.item.is_locked
    })
    .eq("id", current.item.id);

  if (error) {
    console.error("Error cambiando bloqueo:", error);
    alert("No se pudo cambiar el bloqueo.\n\n" + error.message);
    return;
  }

  await loadMenu();
}

async function assignRecipeToMenu(recipeId, date, mealType) {
  const { plan, error } = await getOrCreateMealPlan();

  if (error) {
    console.error("Error creando menú:", error);
    alert("No se pudo preparar el menú.\n\n" + error.message);
    return;
  }

  const { data: existing, error: existingError } = await supabaseClient
    .from("meal_plan_items")
    .select("id")
    .eq("meal_plan_id", plan.id)
    .eq("date", date)
    .eq("meal_type", mealType)
    .limit(1);

  if (existingError) {
    alert("No se pudo comprobar la comida.\n\n" + existingError.message);
    return;
  }

  let saveError = null;

  if (existing?.[0]) {
    const result = await supabaseClient
      .from("meal_plan_items")
      .update({
        recipe_id: recipeId
      })
      .eq("id", existing[0].id);

    saveError = result.error;
  } else {
    const result = await supabaseClient
      .from("meal_plan_items")
      .insert({
        meal_plan_id: plan.id,
        date,
        meal_type: mealType,
        recipe_id: recipeId,
        is_locked: true
      });

    saveError = result.error;
  }

  if (saveError) {
    console.error("Error guardando comida:", saveError);
    alert("No se pudo guardar la receta en el menú.\n\n" + saveError.message);
    return;
  }

  await loadMenu();
}

async function removeRecipeFromMenu(date, mealType) {
  const { data: plans, error: planError } = await supabaseClient
    .from("meal_plans")
    .select("id")
    .eq("week_start", dateToISO(menuWeekStart))
    .limit(1);

  if (planError || !plans?.[0]) return;

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .delete()
    .eq("meal_plan_id", plans[0].id)
    .eq("date", date)
    .eq("meal_type", mealType);

  if (error) {
    console.error("Error eliminando comida:", error);
    alert("No se pudo vaciar ese hueco del menú.\n\n" + error.message);
    return;
  }

  await loadMenu();
}



/* =========================================================
   REPASO SEMANAL DE INVENTARIO
   ========================================================= */

function formatInventoryReviewLocation(location) {
  return location === "congelador" ? "🧊 Congelador" : "🥫 Despensa";
}

function getInventoryReviewWeekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  return `${weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
}

async function getInventoryUsageForWeek(weekStart) {
  const weekISO = dateToISO(weekStart);

  const { data: plans, error: planError } = await supabaseClient
    .from("meal_plans")
    .select("id")
    .eq("week_start", weekISO)
    .limit(1);

  if (planError) throw planError;

  const plan = plans?.[0];
  if (!plan) return { items: [], hasMenu: false };

  const { data: menuItems, error: menuError } = await supabaseClient
    .from("meal_plan_items")
    .select("recipe_id")
    .eq("meal_plan_id", plan.id)
    .in("meal_type", ["comida", "cena"])
    .not("recipe_id", "is", null);

  if (menuError) throw menuError;

  const recipeIds = [...new Set((menuItems || []).map(item => item.recipe_id).filter(Boolean))];
  if (!recipeIds.length) return { items: [], hasMenu: true };

  const { data: recipeIngredients, error: recipeIngredientsError } = await supabaseClient
    .from("recipe_ingredients")
    .select(`
      recipe_id,
      quantity,
      unit,
      ingredients (
        id,
        name,
        default_unit
      )
    `)
    .in("recipe_id", recipeIds);

  if (recipeIngredientsError) throw recipeIngredientsError;

  const requirements = new Map();

  for (const row of recipeIngredients || []) {
    const ingredient = row.ingredients;
    if (!ingredient?.id) continue;

    const quantity = row.quantity === null || row.quantity === undefined ? null : Number(row.quantity);
    const unit = row.unit || ingredient.default_unit || "unidad";
    const unitInfo = shoppingUnitInfo(unit);
    const key = `${ingredient.id}::${unitInfo.group}`;

    if (!requirements.has(key)) {
      requirements.set(key, {
        ingredientId: ingredient.id,
        name: ingredient.name,
        quantity,
        unit,
        unitInfo,
        unknownQuantity: quantity === null
      });
    } else {
      const current = requirements.get(key);
      if (quantity === null || current.quantity === null) {
        current.quantity = null;
        current.unknownQuantity = true;
      } else {
        current.quantity += quantity;
      }
    }
  }

  const { data: inventory, error: inventoryError } = await supabaseClient
    .from("inventory")
    .select(`
      id,
      ingredient_id,
      quantity,
      unit,
      location,
      notes,
      created_at,
      ingredients (name)
    `)
    .in("location", ["despensa", "congelador"])
    .order("created_at", { ascending: true });

  if (inventoryError) throw inventoryError;

  const rows = [];

  for (const item of inventory || []) {
    const name = item.ingredients?.name || "Producto";
    const unit = item.unit || "unidad";
    const unitInfo = shoppingUnitInfo(unit);
    const key = `${item.ingredient_id}::${unitInfo.group}`;
    const requirement = requirements.get(key);
    if (!requirement) continue;

    const inventoryQuantity = item.quantity === null || item.quantity === undefined ? null : Number(item.quantity);
    let usedQuantity = null;
    let remainingQuantity = null;

    if (inventoryQuantity !== null && requirement.quantity !== null) {
      const inventoryBase = inventoryQuantity * unitInfo.factor;
      const requiredBase = requirement.quantity * requirement.unitInfo.factor;
      const usedBase = Math.min(inventoryBase, requiredBase);
      usedQuantity = usedBase / unitInfo.factor;
      remainingQuantity = Math.max(0, inventoryBase - usedBase) / unitInfo.factor;
      requirement.quantity = Math.max(0, requirement.quantity - (usedBase / requirement.unitInfo.factor));
    }

    rows.push({
      id: item.id,
      name,
      location: item.location,
      currentQuantity: inventoryQuantity,
      unit,
      usedQuantity,
      remainingQuantity,
      unknownQuantity: requirement.unknownQuantity
    });
  }

  return { items: rows, hasMenu: true };
}

function inventoryReviewAmount(quantity, unit) {
  if (quantity === null || quantity === undefined) return "Cantidad no calculable";
  return formatShoppingAmount(Number(quantity), unit);
}

function renderInventoryUsageReview(weekStart, items) {
  document.querySelectorAll(".inventory-review-modal").forEach(modal => modal.remove());

  const modal = document.createElement("div");
  modal.className = "inventory-review-modal open";

  const grouped = {
    despensa: items.filter(item => item.location === "despensa"),
    congelador: items.filter(item => item.location === "congelador")
  };

  const renderGroup = (location, label) => {
    const group = grouped[location];
    if (!group.length) {
      return `
        <section class="inventory-review-section">
          <div class="inventory-review-section-head">
            <h3>${label}</h3>
            <span>Sin productos usados</span>
          </div>
          <div class="inventory-review-empty">No se han detectado productos de esta zona usados por el menú.</div>
        </section>
      `;
    }

    return `
      <section class="inventory-review-section">
        <div class="inventory-review-section-head">
          <h3>${label}</h3>
          <span>${group.length} ${group.length === 1 ? "entrada" : "entradas"}</span>
        </div>
        <div class="inventory-review-items">
          ${group.map(item => `
            <div class="inventory-review-item" data-inventory-id="${item.id}">
              <div class="inventory-review-main">
                <strong>${escapeHtml(item.name)}</strong>
                <span>Tenías: <b>${escapeHtml(inventoryReviewAmount(item.currentQuantity, item.unit))}</b></span>
                <span>Uso estimado: <b>${item.usedQuantity === null ? "según receta" : escapeHtml(inventoryReviewAmount(item.usedQuantity, item.unit))}</b></span>
                ${item.usedQuantity !== null && item.remainingQuantity !== null
                  ? `<span>Resto estimado: <b>${escapeHtml(inventoryReviewAmount(item.remainingQuantity, item.unit))}</b></span>`
                  : ""}
              </div>
              <div class="inventory-review-actions">
                <button type="button" class="secondary inventory-review-ignore" data-id="${item.id}">Aún queda</button>
                <button type="button" class="primary inventory-review-finish" data-id="${item.id}">✓ Marcar terminado</button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  };

  modal.innerHTML = `
    <div class="inventory-review-overlay"></div>
    <div class="inventory-review-box">
      <div class="inventory-modal-header">
        <div>
          <small>REPASO SEMANAL</small>
          <h2>¿Qué se ha terminado?</h2>
          <p class="inventory-review-week">Semana ${escapeHtml(getInventoryReviewWeekLabel(weekStart))}</p>
        </div>
        <button type="button" class="modal-close inventory-review-close">×</button>
      </div>
      <div class="inventory-review-help">
        ARA cruza las recetas del menú con tu despensa y congelador. La cantidad usada es una estimación según las cantidades de las recetas. Pulsa <strong>✓ Marcar terminado</strong> solo en aquello que realmente se haya acabado. “Aún queda” deja la entrada sin cambios.
      </div>
      <div class="inventory-review-content">
        ${renderGroup("despensa", "🥫 Despensa")}
        ${renderGroup("congelador", "🧊 Congelador")}
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary inventory-review-close-button">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".inventory-review-overlay").addEventListener("click", close);
  modal.querySelector(".inventory-review-close").addEventListener("click", close);
  modal.querySelector(".inventory-review-close-button").addEventListener("click", close);

  modal.querySelectorAll(".inventory-review-ignore").forEach(button => {
    button.addEventListener("click", () => {
      const row = modal.querySelector(`.inventory-review-item[data-inventory-id="${button.dataset.id}"]`);
      if (row) {
        row.classList.add("is-kept");
        button.disabled = true;
        button.textContent = "✓ Se mantiene";
      }
    });
  });

  modal.querySelectorAll(".inventory-review-finish").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Eliminando…";

      const { error } = await supabaseClient
        .from("inventory")
        .delete()
        .eq("id", Number(button.dataset.id));

      if (error) {
        console.error("Error marcando inventario como terminado:", error);
        button.disabled = false;
        button.textContent = "✓ Marcar terminado";
        alert("No se pudo marcar como terminado.\n\n" + error.message);
        return;
      }

      const row = modal.querySelector(`.inventory-review-item[data-inventory-id="${button.dataset.id}"]`);
      if (row) {
        const name = row.querySelector(".inventory-review-main strong")?.textContent || "Producto";
        row.classList.add("is-finished");
        row.innerHTML = `<div class="inventory-review-finished">✅ <strong>${escapeHtml(name)}</strong> marcado como terminado y eliminado del inventario.</div>`;
      }

      if (typeof loadInventory === "function") await loadInventory();
      if (typeof loadHomeDashboard === "function") await loadHomeDashboard();
    });
  });
}

async function openInventoryUsageReview(weekStart = menuWeekStart) {
  const button = document.querySelector("#menu .menu-inventory-review-button");
  if (button) {
    button.disabled = true;
    button.textContent = "Cargando…";
  }

  try {
    const result = await getInventoryUsageForWeek(weekStart);
    if (!result.hasMenu) {
      alert("No hay menú guardado para esa semana.");
      return;
    }
    if (!result.items.length) {
      alert("No he encontrado productos de despensa o congelador usados por el menú de esa semana.");
      return;
    }
    renderInventoryUsageReview(weekStart, result.items);
  } catch (error) {
    console.error("Error preparando el repaso de inventario:", error);
    alert("No se pudo preparar el repaso de inventario.\n\n" + (error.message || "Error desconocido"));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "📦 Repasar inventario";
    }
  }
}

function setupInventoryReviewPrompt() {
  const prompt = document.getElementById("inventory-review-prompt");
  const button = document.getElementById("menu-review-inventory-button");
  if (!prompt || !button) return;

  const day = new Date().getDay();
  if (day !== 0 && day !== 1) {
    prompt.hidden = true;
    return;
  }

  const previousWeek = addDays(getMonday(new Date()), -7);
  prompt.hidden = false;
  button.onclick = () => openInventoryUsageReview(previousWeek);
}

window.openInventoryUsageReview = openInventoryUsageReview;


/* =========================================================
   GENERADOR AUTOMÁTICO DE MENÚ
   ========================================================= */

async function generateWeeklyMenu() {
  const button = document.querySelector("#menu .page-head .primary");

  if (button) {
    button.disabled = true;
    button.textContent = "Generando…";
  }

  try {
    const { plan, error: planError } = await getOrCreateMealPlan();

    if (planError) {
      throw planError;
    }

    const { data: existingItems, error: itemsError } = await supabaseClient
      .from("meal_plan_items")
      .select(`
        id,
        date,
        meal_type,
        recipe_id,
        is_locked,
        is_tupper,
        recipes (
          id,
          name,
          meal_types,
          do_not_suggest,
          fun_recipe
        )
      `)
      .eq("meal_plan_id", plan.id);

    if (itemsError) {
      throw itemsError;
    }

    const { data: recipes, error: recipesError } = await supabaseClient
      .from("recipes")
      .select(`
        id,
        name,
        meal_types,
        do_not_suggest,
        fun_recipe
      `)
      .eq("do_not_suggest", false)
      .order("name");

    if (recipesError) {
      throw recipesError;
    }

    const allRecipes = recipes || [];
    const items = existingItems || [];

    const usedRecipeIds = new Set(
      items
        .filter(item => item.recipe_id && item.is_locked)
        .map(item => item.recipe_id)
    );

    const slots = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = dateToISO(addDays(menuWeekStart, dayIndex));

      for (const mealType of ["comida", "cena"]) {
        const existing = items.find(item =>
          item.date === date && item.meal_type === mealType
        );

        if (existing?.is_locked) continue;

        slots.push({
          date,
          mealType,
          existingId: existing?.id || null,
          dayIndex
        });
      }
    }

    if (!slots.length) {
      alert("Todas las comidas de esta semana están fijadas 🔒.");
      return;
    }

    // Rellenamos primero las cenas de miércoles y viernes para dar
    // prioridad a las recetas marcadas como "divertidas".
    slots.sort((a, b) => {
      const score = slot => (
        slot.mealType === "cena" && (slot.dayIndex === 2 || slot.dayIndex === 4)
          ? 0
          : 1
      );

      return score(a) - score(b);
    });

    const selected = [];

    for (const slot of slots) {
      const compatible = allRecipes.filter(recipe => {
        const mealTypes = Array.isArray(recipe.meal_types) && recipe.meal_types.length
          ? recipe.meal_types
          : ["comida", "cena"];

        return mealTypes.includes(slot.mealType)
          && !usedRecipeIds.has(recipe.id);
      });

      let candidates = compatible;

      const isFunDinner =
        slot.mealType === "cena" &&
        (slot.dayIndex === 2 || slot.dayIndex === 4);

      if (isFunDinner) {
        const funCandidates = compatible.filter(recipe => recipe.fun_recipe);

        if (funCandidates.length) {
          candidates = funCandidates;
        }
      }

      if (!candidates.length) {
        // Si ya no quedan recetas distintas, permitimos repetir solo entre
        // recetas compatibles para poder completar el menú.
        candidates = allRecipes.filter(recipe => {
          const mealTypes = Array.isArray(recipe.meal_types) && recipe.meal_types.length
            ? recipe.meal_types
            : ["comida", "cena"];

          return mealTypes.includes(slot.mealType);
        });
      }

      if (!candidates.length) continue;

      // Evitar repetir dentro de la misma ejecución siempre que haya opciones.
      const notSelectedThisRun = candidates.filter(
        recipe => !selected.some(item => item.id === recipe.id)
      );

      const pool = notSelectedThisRun.length ? notSelectedThisRun : candidates;
      const chosen = pool[Math.floor(Math.random() * pool.length)];

      usedRecipeIds.add(chosen.id);
      selected.push(chosen);

      if (slot.existingId) {
        const { error } = await supabaseClient
          .from("meal_plan_items")
          .update({
            recipe_id: chosen.id,
            is_locked: false
          })
          .eq("id", slot.existingId);

        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from("meal_plan_items")
          .insert({
            meal_plan_id: plan.id,
            date: slot.date,
            meal_type: slot.mealType,
            recipe_id: chosen.id,
            is_locked: false,
            is_tupper: false
          });

        if (error) throw error;
      }
    }

    await loadMenu();
  } catch (error) {
    console.error("Error generando menú:", error);
    alert("No se pudo generar el menú.\n\n" + (error.message || "Error desconocido"));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "✦ Generar menú";
    }
  }
}

function setupMenuControls() {
  const menuPage = document.getElementById("menu");
  if (!menuPage) return;

  setupInventoryReviewPrompt();

  const generateButton = menuPage.querySelector(".menu-generate-button");
  if (generateButton) {
    generateButton.textContent = "✦ Generar menú";
    generateButton.onclick = generateWeeklyMenu;
  }

  const previousButton = document.getElementById("menu-prev-week");
  if (previousButton) previousButton.onclick = () => changeMenuWeek(-1);

  const nextButton = document.getElementById("menu-next-week");
  if (nextButton) nextButton.onclick = () => changeMenuWeek(1);

  const currentButton = document.getElementById("menu-current-week");
  if (currentButton) currentButton.onclick = goToCurrentMenuWeek;

  updateMenuWeekNavigation();
}

document.addEventListener("DOMContentLoaded", () => {
  setupMenuControls();
  loadMenu();
});

/* =========================================================
   LISTA DE COMPRA
   ========================================================= */

const SHOPPING_GENERATED_PREFIX = "__ARA_GENERATED__:";

function getShoppingGeneratedNote() {
  return SHOPPING_GENERATED_PREFIX + dateToISO(menuWeekStart);
}

function shoppingUnitInfo(unit) {
  const raw = String(unit || "").trim().toLowerCase();

  if (!raw) return { group: "unknown", factor: 1, label: "" };

  const aliases = {
    "g": { group: "weight", factor: 1, label: "g" },
    "gramo": { group: "weight", factor: 1, label: "g" },
    "gramos": { group: "weight", factor: 1, label: "g" },
    "kg": { group: "weight", factor: 1000, label: "g" },
    "kilo": { group: "weight", factor: 1000, label: "g" },
    "kilos": { group: "weight", factor: 1000, label: "g" },
    "ml": { group: "volume", factor: 1, label: "ml" },
    "mililitro": { group: "volume", factor: 1, label: "ml" },
    "mililitros": { group: "volume", factor: 1, label: "ml" },
    "l": { group: "volume", factor: 1000, label: "ml" },
    "litro": { group: "volume", factor: 1000, label: "ml" },
    "litros": { group: "volume", factor: 1000, label: "ml" },
    "unidad": { group: "count", factor: 1, label: "unidad" },
    "unidades": { group: "count", factor: 1, label: "unidad" },
    "ud": { group: "count", factor: 1, label: "unidad" },
    "uds": { group: "count", factor: 1, label: "unidad" },
    "u": { group: "count", factor: 1, label: "unidad" },
    "cucharadita": { group: "teaspoon", factor: 1, label: "cucharadita" },
    "cucharaditas": { group: "teaspoon", factor: 1, label: "cucharadita" },
    "cucharada": { group: "tablespoon", factor: 1, label: "cucharada" },
    "cucharadas": { group: "tablespoon", factor: 1, label: "cucharada" },
    "pizca": { group: "pinch", factor: 1, label: "pizca" },
    "pizcas": { group: "pinch", factor: 1, label: "pizca" },
    "paquete": { group: "package", factor: 1, label: "paquete" },
    "paquetes": { group: "package", factor: 1, label: "paquete" },
    "bote": { group: "jar", factor: 1, label: "bote" },
    "botes": { group: "jar", factor: 1, label: "bote" },
    "lata": { group: "can", factor: 1, label: "lata" },
    "latas": { group: "can", factor: 1, label: "lata" },
    "ración": { group: "portion", factor: 1, label: "ración" },
    "raciones": { group: "portion", factor: 1, label: "ración" }
  };

  return aliases[raw] || { group: raw, factor: 1, label: unit };
}

function formatShoppingNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  const number = Number(value);

  if (Number.isInteger(number)) return String(number);

  return number
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",");
}

function formatShoppingAmount(quantity, unit) {
  if (quantity === null || quantity === undefined) return "";

  const unitInfo = shoppingUnitInfo(unit);
  let displayQuantity = Number(quantity);
  let displayUnit = unit || unitInfo.label || "";

  if (unitInfo.group === "weight" && unitInfo.label === "g") {
    if (displayQuantity >= 1000) {
      displayQuantity /= 1000;
      displayUnit = "kg";
    } else {
      displayUnit = "g";
    }
  }

  if (unitInfo.group === "volume" && unitInfo.label === "ml") {
    if (displayQuantity >= 1000) {
      displayQuantity /= 1000;
      displayUnit = "l";
    } else {
      displayUnit = "ml";
    }
  }

  return `${formatShoppingNumber(displayQuantity)} ${displayUnit}`.trim();
}

async function loadShoppingList() {
  const page = document.getElementById("compra");
  if (!page) return;

  const { data, error } = await supabaseClient
    .from("shopping_items")
    .select(`
      id,
      quantity,
      unit,
      checked,
      notes,
      created_at,
      ingredients (
        id,
        name
      )
    `)
    .order("checked", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando lista de compra:", error);
    renderShoppingError(error);
    return;
  }

  renderShoppingList(data || []);
}

function renderShoppingError(error) {
  const container = document.getElementById("shopping-list-content");
  if (!container) return;

  container.innerHTML = `
    <div class="empty shopping-empty">
      <div class="empty-icon">!</div>
      <h3>No se pudo cargar la lista</h3>
      <p>${escapeHtml(error.message || "Error desconocido")}</p>
    </div>
  `;
}

function isGeneratedShoppingItem(item) {
  return String(item.notes || "").startsWith(SHOPPING_GENERATED_PREFIX);
}

function renderShoppingItem(item) {
  const name = item.ingredients?.name || "Producto";
  const amount = formatShoppingAmount(item.quantity, item.unit);
  const manualNote = !isGeneratedShoppingItem(item) ? (item.notes || "") : "";

  return `
    <div class="shopping-item ${item.checked ? "is-checked" : ""}">
      <label class="shopping-check-wrap">
        <input
          type="checkbox"
          ${item.checked ? "checked" : ""}
          onchange="toggleShoppingItem(${item.id}, this.checked)"
        >
        <span class="shopping-check"></span>
      </label>

      <div class="shopping-item-main">
        <strong>${escapeHtml(name)}</strong>
        ${amount ? `<span class="shopping-item-amount">${escapeHtml(amount)}</span>` : ""}
        ${isGeneratedShoppingItem(item) ? '<span class="shopping-item-source">De menú</span>' : ""}
        ${manualNote ? `<span class="shopping-item-note">${escapeHtml(manualNote)}</span>` : ""}
      </div>

      <button type="button" class="shopping-delete" title="Eliminar" onclick="deleteShoppingItem(${item.id})">×</button>
    </div>
  `;
}

function renderShoppingList(items) {
  const container = document.getElementById("shopping-list-content");
  if (!container) return;

  const pending = items.filter(item => !item.checked);
  const checked = items.filter(item => item.checked);

  container.innerHTML = `
    <div class="shopping-summary">
      <div>
        <strong>${pending.length}</strong>
        <span>por comprar</span>
      </div>
      <div>
        <strong>${checked.length}</strong>
        <span>comprado${checked.length === 1 ? "" : "s"}</span>
      </div>
      <button type="button" class="secondary shopping-clear-checked" ${checked.length ? "" : "disabled"}>
        Borrar comprados
      </button>
    </div>

    <div class="shopping-section">
      <div class="shopping-section-head">
        <h3>Por comprar</h3>
        <span>${pending.length} ${pending.length === 1 ? "producto" : "productos"}</span>
      </div>

      ${pending.length
        ? `<div class="shopping-items">${pending.map(renderShoppingItem).join("")}</div>`
        : `
          <div class="shopping-list-empty">
            <div>🛒</div>
            <strong>No hay nada pendiente</strong>
            <p>Añade productos manualmente o genera la lista desde tu menú.</p>
          </div>
        `}
    </div>

    ${checked.length
      ? `
        <div class="shopping-section shopping-done-section">
          <div class="shopping-section-head">
            <h3>Comprado</h3>
            <span>${checked.length}</span>
          </div>
          <div class="shopping-items">${checked.map(renderShoppingItem).join("")}</div>
        </div>
      `
      : ""}
  `;

  const clearButton = container.querySelector(".shopping-clear-checked");
  if (clearButton) clearButton.addEventListener("click", clearCheckedShoppingItems);

  const note = document.getElementById("shopping-week-note");
  if (note) {
    const end = addDays(menuWeekStart, 6);
    note.textContent = `Semana ${menuWeekStart.getDate()}/${String(menuWeekStart.getMonth() + 1).padStart(2, "0")} – ${end.getDate()}/${String(end.getMonth() + 1).padStart(2, "0")}. Genera la compra desde el menú y la app descontará el inventario disponible.`;
  }
}

async function toggleShoppingItem(id, checked) {
  const { error } = await supabaseClient
    .from("shopping_items")
    .update({ checked })
    .eq("id", id);

  if (error) {
    console.error("Error actualizando compra:", error);
    alert("No se pudo actualizar el producto.\n\n" + error.message);
    return;
  }

  await loadShoppingList();
}

async function deleteShoppingItem(id) {
  if (!confirm("¿Quieres eliminar este producto de la lista?")) return;

  const { error } = await supabaseClient
    .from("shopping_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error eliminando producto de compra:", error);
    alert("No se pudo eliminar el producto.\n\n" + error.message);
    return;
  }

  await loadShoppingList();
}

async function clearCheckedShoppingItems() {
  const { error } = await supabaseClient
    .from("shopping_items")
    .delete()
    .eq("checked", true);

  if (error) {
    console.error("Error borrando comprados:", error);
    alert("No se pudieron borrar los productos comprados.\n\n" + error.message);
    return;
  }

  await loadShoppingList();
}

function createShoppingManualModal() {
  if (document.getElementById("shopping-manual-modal")) return;

  const modal = document.createElement("div");
  modal.id = "shopping-manual-modal";

  modal.innerHTML = `
    <div class="shopping-manual-overlay"></div>

    <div class="shopping-manual-box">
      <div class="inventory-modal-header">
        <div>
          <small>LISTA DE COMPRA</small>
          <h2>Añadir producto</h2>
        </div>
        <button type="button" class="modal-close" id="close-shopping-manual">×</button>
      </div>

      <form id="shopping-manual-form">
        <label>
          Producto
          <input id="shopping-manual-name" type="text" placeholder="Ej. Leche" required>
        </label>

        <div class="form-row">
          <label>
            Cantidad
            <input id="shopping-manual-quantity" type="number" min="0" step="0.01" placeholder="1">
          </label>

          <label>
            Unidad
            <select id="shopping-manual-unit">
              <option value="unidad">unidad</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="paquete">paquete</option>
              <option value="bote">bote</option>
              <option value="lata">lata</option>
              <option value="ración">ración</option>
            </select>
          </label>
        </div>

        <label>
          Notas
          <textarea id="shopping-manual-notes" rows="3" placeholder="Opcional"></textarea>
        </label>

        <div class="modal-actions">
          <button type="button" class="secondary" id="cancel-shopping-manual">Cancelar</button>
          <button type="submit" class="primary">Añadir a la lista</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.remove("open");
    document.getElementById("shopping-manual-form")?.reset();
  };

  modal.querySelector("#close-shopping-manual").addEventListener("click", close);
  modal.querySelector("#cancel-shopping-manual").addEventListener("click", close);
  modal.querySelector(".shopping-manual-overlay").addEventListener("click", close);
  modal.querySelector("#shopping-manual-form").addEventListener("submit", saveShoppingManualItem);
}

function addShoppingManual() {
  createShoppingManualModal();
  const modal = document.getElementById("shopping-manual-modal");
  modal.classList.add("open");
  document.getElementById("shopping-manual-name").focus();
}

async function saveShoppingManualItem(event) {
  event.preventDefault();

  const name = document.getElementById("shopping-manual-name").value.trim();
  const quantityValue = document.getElementById("shopping-manual-quantity").value;
  const unit = document.getElementById("shopping-manual-unit").value;
  const notes = document.getElementById("shopping-manual-notes").value.trim();

  if (!name) {
    alert("Escribe el nombre del producto.");
    return;
  }

  const { ingredient, error: ingredientError } = await findOrCreateIngredient(name, unit);

  if (ingredientError) {
    console.error("Error creando ingrediente para compra:", ingredientError);
    alert("No se pudo crear el ingrediente.\n\n" + ingredientError.message);
    return;
  }

  const { error } = await supabaseClient
    .from("shopping_items")
    .insert({
      ingredient_id: ingredient.id,
      quantity: quantityValue ? Number(quantityValue) : null,
      unit: unit || null,
      checked: false,
      notes: notes || null
    });

  if (error) {
    console.error("Error añadiendo compra manual:", error);
    alert("No se pudo añadir el producto.\n\n" + error.message);
    return;
  }

  document.getElementById("shopping-manual-modal").classList.remove("open");
  document.getElementById("shopping-manual-form")?.reset();
  await loadShoppingList();
}

async function generateShoppingList() {
  const button = document.getElementById("generate-shopping-button");

  if (button) {
    button.disabled = true;
    button.textContent = "Calculando…";
  }

  try {
    const weekStart = dateToISO(menuWeekStart);

    const { data: plans, error: planError } = await supabaseClient
      .from("meal_plans")
      .select("id")
      .eq("week_start", weekStart)
      .limit(1);

    if (planError) throw planError;

    const plan = plans?.[0];
    if (!plan) {
      alert("Primero crea o genera el menú de esta semana.");
      return;
    }

    const { data: menuItems, error: menuError } = await supabaseClient
      .from("meal_plan_items")
      .select("recipe_id")
      .eq("meal_plan_id", plan.id)
      .in("meal_type", ["comida", "cena"])
      .not("recipe_id", "is", null);

    if (menuError) throw menuError;

    const recipeIds = [...new Set((menuItems || []).map(item => item.recipe_id).filter(Boolean))];

    if (!recipeIds.length) {
      alert("El menú de esta semana todavía no tiene recetas.");
      return;
    }

    const { data: recipeIngredients, error: ingredientError } = await supabaseClient
      .from("recipe_ingredients")
      .select(`
        recipe_id,
        quantity,
        unit,
        ingredients (
          id,
          name,
          default_unit
        )
      `)
      .in("recipe_id", recipeIds);

    if (ingredientError) throw ingredientError;

    const requirements = new Map();

    for (const row of recipeIngredients || []) {
      const ingredient = row.ingredients;
      if (!ingredient?.id) continue;

      const quantity = row.quantity === null || row.quantity === undefined ? null : Number(row.quantity);
      const unit = row.unit || ingredient.default_unit || "unidad";
      const unitInfo = shoppingUnitInfo(unit);
      const key = `${ingredient.id}::${unitInfo.group}`;

      if (!requirements.has(key)) {
        requirements.set(key, {
          ingredientId: ingredient.id,
          name: ingredient.name,
          quantity,
          unit,
          unitInfo
        });
      } else {
        const current = requirements.get(key);
        if (quantity === null || current.quantity === null) {
          current.quantity = null;
        } else {
          current.quantity += quantity;
        }
      }
    }

    const ingredientIds = [...new Set([...requirements.values()].map(item => item.ingredientId))];

    const { data: inventory, error: inventoryError } = await supabaseClient
      .from("inventory")
      .select("ingredient_id, quantity, unit")
      .in("ingredient_id", ingredientIds);

    if (inventoryError) throw inventoryError;

    const inventoryByKey = new Map();

    for (const item of inventory || []) {
      if (item.quantity === null || item.quantity === undefined) continue;

      const quantity = Number(item.quantity);
      const unitInfo = shoppingUnitInfo(item.unit || "unidad");
      const key = `${item.ingredient_id}::${unitInfo.group}`;

      if (!inventoryByKey.has(key)) {
        inventoryByKey.set(key, { quantity: quantity * unitInfo.factor });
      } else {
        inventoryByKey.get(key).quantity += quantity * unitInfo.factor;
      }
    }

    const generatedItems = [];

    for (const requirement of requirements.values()) {
      const inventoryKey = `${requirement.ingredientId}::${requirement.unitInfo.group}`;
      const available = inventoryByKey.get(inventoryKey)?.quantity || 0;

      if (requirement.quantity === null) {
        if (available > 0) continue;

        generatedItems.push({
          ingredient_id: requirement.ingredientId,
          quantity: null,
          unit: requirement.unit,
          checked: false,
          notes: getShoppingGeneratedNote()
        });
        continue;
      }

      const requiredBase = requirement.quantity * requirement.unitInfo.factor;
      const missingBase = Math.max(0, requiredBase - available);

      if (missingBase <= 0) continue;

      generatedItems.push({
        ingredient_id: requirement.ingredientId,
        quantity: Number((missingBase / requirement.unitInfo.factor).toFixed(3)),
        unit: requirement.unit,
        checked: false,
        notes: getShoppingGeneratedNote()
      });
    }

    const generatedNote = getShoppingGeneratedNote();

    const { error: deleteGeneratedError } = await supabaseClient
      .from("shopping_items")
      .delete()
      .eq("notes", generatedNote);

    if (deleteGeneratedError) throw deleteGeneratedError;

    if (generatedItems.length) {
      const { error: insertError } = await supabaseClient
        .from("shopping_items")
        .insert(generatedItems);

      if (insertError) throw insertError;
    }

    await loadShoppingList();

    alert(
      generatedItems.length
        ? `Lista generada: ${generatedItems.length} ${generatedItems.length === 1 ? "producto pendiente" : "productos pendientes"}.`
        : "No falta ningún ingrediente del menú teniendo en cuenta tu inventario."
    );
  } catch (error) {
    console.error("Error generando lista de compra:", error);
    alert("No se pudo generar la lista de compra.\n\n" + (error.message || "Error desconocido"));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "✦ Generar desde menú";
    }
  }
}

function setupShoppingControls() {
  const page = document.getElementById("compra");
  if (!page) return;

  const addButton = page.querySelector(".shopping-header-actions .secondary");
  if (addButton) addButton.onclick = addShoppingManual;

  const generateButton = document.getElementById("generate-shopping-button");
  if (generateButton) generateButton.onclick = generateShoppingList;
}


/* =========================================================
   IMPORTACIÓN DE RECETAS
   ========================================================= */

function openRecipeImportModal() {
  document.querySelectorAll(".recipe-import-modal").forEach(modal => modal.remove());

  const modal = document.createElement("div");
  modal.className = "recipe-import-modal open";

  modal.innerHTML = `
    <div class="recipe-import-overlay"></div>

    <div class="recipe-import-box">
      <div class="inventory-modal-header">
        <div>
          <small>IMPORTAR RECETAS</small>
          <h2>Importar desde archivo</h2>
        </div>
        <button type="button" class="modal-close recipe-import-close">×</button>
      </div>

      <div class="recipe-import-help">
        <p><strong>Formatos admitidos:</strong> JSON y CSV.</p>
        <p>Se pueden importar varias recetas de una vez. Los ingredientes se crean automáticamente si todavía no existen.</p>
        <p class="recipe-import-note">Los campos reconocidos incluyen nombre, descripción, preparación, raciones, tiempos, temperatura, imagen, receta divertida, congelable, no sugerir e ingredientes.</p>
      </div>

      <label class="recipe-import-file">
        Archivo
        <input id="recipe-import-file" type="file" accept=".json,.csv,application/json,text/csv">
      </label>

      <div id="recipe-import-preview" class="recipe-import-preview">
        Selecciona un archivo para ver una vista previa.
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary recipe-import-cancel">Cancelar</button>
        <button type="button" class="primary recipe-import-submit" disabled>Importar recetas</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = modal.querySelector("#recipe-import-file");
  const preview = modal.querySelector("#recipe-import-preview");
  const submit = modal.querySelector(".recipe-import-submit");

  let parsedRecipes = [];

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    parsedRecipes = [];
    submit.disabled = true;

    if (!file) {
      preview.textContent = "Selecciona un archivo para ver una vista previa.";
      return;
    }

    try {
      const text = await file.text();
      parsedRecipes = parseRecipeImportFile(file.name, text);

      if (!parsedRecipes.length) {
        preview.innerHTML = "<strong>No se encontraron recetas válidas.</strong>";
        return;
      }

      submit.disabled = false;
      preview.innerHTML = `
        <strong>${parsedRecipes.length} ${parsedRecipes.length === 1 ? "receta encontrada" : "recetas encontradas"}</strong>
        <div class="recipe-import-preview-list">
          ${parsedRecipes.slice(0, 8).map(recipe => `
            <div>
              <strong>${escapeHtml(recipe.name)}</strong>
              <span>${recipe.ingredients?.length || 0} ingrediente${recipe.ingredients?.length === 1 ? "" : "s"}</span>
            </div>
          `).join("")}
          ${parsedRecipes.length > 8 ? `<small>… y ${parsedRecipes.length - 8} más</small>` : ""}
        </div>
      `;
    } catch (error) {
      console.error("Error leyendo importación:", error);
      preview.innerHTML = `<strong>No se pudo leer el archivo.</strong><br>${escapeHtml(error.message)}`;
    }
  });

  modal.querySelector(".recipe-import-close").addEventListener("click", () => modal.remove());
  modal.querySelector(".recipe-import-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector(".recipe-import-overlay").addEventListener("click", () => modal.remove());

  submit.addEventListener("click", async () => {
    submit.disabled = true;
    submit.textContent = "Importando…";

    const result = await importRecipes(parsedRecipes);

    if (result.success) {
      modal.remove();
      await loadRecipes();
      alert(`${result.count} ${result.count === 1 ? "receta importada" : "recetas importadas"} correctamente.`);
      return;
    }

    submit.disabled = false;
    submit.textContent = "Importar recetas";
    preview.innerHTML = `
      <strong>La importación terminó con avisos.</strong>
      <p>${escapeHtml(result.message)}</p>
    `;
  });
}

function normalizeRecipeImportObject(item) {
  const sourceIngredients = Array.isArray(item.ingredients)
    ? item.ingredients
    : Array.isArray(item.ingredientes)
      ? item.ingredientes
      : [];

  const ingredients = sourceIngredients.map(raw => {
    if (typeof raw === "string") {
      return {
        name: raw.trim(),
        quantity: null,
        unit: null,
        notes: null
      };
    }

    return {
      name: String(raw.name ?? raw.nombre ?? "").trim(),
      quantity: raw.quantity ?? raw.cantidad ?? null,
      unit: raw.unit ?? raw.unidad ?? null,
      notes: raw.notes ?? raw.notas ?? null
    };
  }).filter(item => item.name);

  return {
    name: String(item.name ?? item.nombre ?? "").trim(),
    description: item.description ?? item.descripcion ?? null,
    preparation: item.preparation ?? item.preparacion ?? item.steps ?? item.pasos ?? null,
    servings: item.servings ?? item.raciones ?? null,
    prep_time: item.prep_time ?? item.tiempo_preparacion ?? null,
    cook_time: item.cook_time ?? item.tiempo_coccion ?? null,
    temperature: item.temperature ?? item.temperatura ?? null,
    image_url: item.image_url ?? item.imagen ?? item.image ?? null,
    meal_types: normalizeMealTypes(item.meal_types ?? item.tipos_comida ?? item.tipo_comida ?? item.meal_type ?? item.tipo),
    fun_recipe: Boolean(item.fun_recipe ?? item.receta_divertida ?? false),
    is_freezable: Boolean(item.is_freezable ?? item.congelable ?? item.se_puede_congelar ?? false),
    do_not_suggest: Boolean(item.do_not_suggest ?? item.no_sugerir ?? false),
    ingredients
  };
}

function normalizeMealTypes(value) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => String(item).trim().toLowerCase())
      .flatMap(item => item === "ambas" ? ["comida", "cena"] : [item])
      .filter(item => item === "comida" || item === "cena");

    return [...new Set(normalized)];
  }

  if (value === null || value === undefined || value === "") {
    return ["comida", "cena"];
  }

  const text = String(value).trim().toLowerCase();

  if (text === "ambas") return ["comida", "cena"];

  const normalized = text
    .split(/[;,|+]/)
    .map(item => item.trim())
    .flatMap(item => item === "ambas" ? ["comida", "cena"] : [item])
    .filter(item => item === "comida" || item === "cena");

  return normalized.length ? [...new Set(normalized)] : ["comida", "cena"];
}

function parseRecipeImportFile(filename, text) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.recipes)
        ? parsed.recipes
        : Array.isArray(parsed.recetas)
          ? parsed.recetas
          : [];

    return list
      .map(normalizeRecipeImportObject)
      .filter(recipe => recipe.name);
  }

  if (lower.endsWith(".csv")) {
    return parseRecipeCsv(text);
  }

  throw new Error("Solo se admiten archivos JSON o CSV.");
}

function parseRecipeCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(value => value.trim().toLowerCase());
  const recipes = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(value => value.trim())) continue;

    const get = (...names) => {
      const index = names
        .map(name => headers.indexOf(name))
        .find(index => index >= 0);

      return index >= 0 ? (row[index] || "").trim() : "";
    };

    const ingredients = parseIngredientText(
      get("ingredients", "ingredientes")
    );

    recipes.push(normalizeRecipeImportObject({
      name: get("name", "nombre"),
      description: get("description", "descripcion", "descripción"),
      preparation: get("preparation", "preparacion", "preparación"),
      servings: get("servings", "raciones"),
      prep_time: get("prep_time", "tiempo_preparacion"),
      cook_time: get("cook_time", "tiempo_coccion"),
      temperature: get("temperature", "temperatura"),
      image_url: get("image_url", "imagen", "image"),
      meal_types: get("meal_types", "tipos_comida", "tipo_comida", "meal_type", "tipo"),
      fun_recipe: get("fun_recipe", "receta_divertida"),
      is_freezable: get("is_freezable", "congelable"),
      do_not_suggest: get("do_not_suggest", "no_sugerir"),
      ingredients
    }));
  }

  return recipes.filter(recipe => recipe.name);
}

function parseIngredientText(value) {
  if (!value) return [];

  return value.split(";").map(part => {
    const [name, quantity, unit, notes] = part.split("|").map(item => item.trim());

    return {
      name: name || "",
      quantity: quantity || null,
      unit: unit || null,
      notes: notes || null
    };
  }).filter(item => item.name);
}

function parseCsvRows(text) {
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

    if (char === "," && !quoted) {
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

  return rows;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;

  return ["true", "1", "sí", "si", "yes", "x", "verdadero"].includes(
    String(value).trim().toLowerCase()
  );
}

async function importRecipes(recipes) {
  let count = 0;
  const errors = [];

  for (const recipe of recipes) {
    try {
      const payload = {
        name: recipe.name,
        description: recipe.description || null,
        preparation: recipe.preparation || null,
        servings: toNumberOrNull(recipe.servings),
        prep_time: toNumberOrNull(recipe.prep_time),
        cook_time: toNumberOrNull(recipe.cook_time),
        temperature: toNumberOrNull(recipe.temperature),
        image_url: recipe.image_url || null,
        meal_types: normalizeMealTypes(recipe.meal_types),
        fun_recipe: toBoolean(recipe.fun_recipe),
        is_freezable: toBoolean(recipe.is_freezable),
        do_not_suggest: toBoolean(recipe.do_not_suggest)
      };

      const { data, error } = await supabaseClient
        .from("recipes")
        .insert(payload)
        .select()
        .single();

      if (error) {
        errors.push(`${recipe.name}: ${error.message}`);
        continue;
      }

      for (const item of recipe.ingredients || []) {
        const { ingredient, error: ingredientError } =
          await findOrCreateIngredient(item.name, item.unit || "unidad");

        if (ingredientError) {
          errors.push(`${recipe.name} → ${item.name}: ${ingredientError.message}`);
          continue;
        }

        const { error: relationError } = await supabaseClient
          .from("recipe_ingredients")
          .insert({
            recipe_id: data.id,
            ingredient_id: ingredient.id,
            quantity: toNumberOrNull(item.quantity),
            unit: item.unit || null,
            notes: item.notes || null
          });

        if (relationError) {
          errors.push(`${recipe.name} → ${item.name}: ${relationError.message}`);
        }
      }

      count++;
    } catch (error) {
      errors.push(`${recipe.name}: ${error.message}`);
    }
  }

  return {
    success: count > 0 && errors.length === 0,
    count,
    message: errors.length
      ? `${count} recetas importadas. ${errors.length} incidencias:\n${errors.slice(0, 8).join("\n")}`
      : ""
  };
}

document.addEventListener("DOMContentLoaded", () => {
  setupInventoryButtons();
  loadHomeDashboard();
  testSupabaseConnection();

  normalizeRecipeFilters();
  setupRecipeButtons();
  loadRecipes();
  setupShoppingControls();

  if (document.getElementById("inventario")?.classList.contains("active-page")) {
    loadInventory();
  }

  if (document.getElementById("compra")?.classList.contains("active-page")) {
    loadShoppingList();
  }
});
