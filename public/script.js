// script.js - COMPLETE WORKING VERSION
const API_PRODUCTS = '/api/products';

let editingProductId = null;
let selectedItems = []; // For bill pic system
let allProducts = []; // Global products array

// DOM Elements
const itemsDiv = document.getElementById('items');
const productList = document.getElementById('productList');
const previewFrame = document.getElementById('preview');

const estimateNoInput = document.getElementById('estimateNo');
const dateInput = document.getElementById('date');
const custNameInput = document.getElementById('custName');
const custDetailsInput = document.getElementById('custDetails');

const discountTypeInput = document.getElementById('discountType');
const discountValueInput = document.getElementById('discountValue');
const taxPercentInput = document.getElementById('taxPercent');

const prodName = document.getElementById('prodName');
const prodPrice = document.getElementById('prodPrice');
const prodFinal = document.getElementById('prodFinal');
const prodStock = document.getElementById('prodStock');

const addItemBtn = document.getElementById('addItem');
const previewBtn = document.getElementById('previewBtn');
const pdfBtn = document.getElementById('pdfBtn');
const printBtn = document.getElementById('printBtn');

const addProdBtn = document.getElementById('addProdBtn');
const updateProdBtn = document.getElementById('updateProdBtn');
const cancelEditProd = document.getElementById('cancelEditProd');

// New Elements for Tax/Discount Toggle
const taxDiscountSection = document.getElementById('taxDiscountSection');
const showTaxDiscountBtn = document.getElementById('showTaxDiscount');
const hideTaxDiscountBtn = document.getElementById('hideTaxDiscount');

// Settings Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const resetSettingsBtn = document.getElementById('resetSettings');

// BILL PIC SYSTEM Elements
const productSearch = document.getElementById('productSearch');
const billingItemsContainer = document.getElementById('billingItems');
const availableProducts = document.getElementById('availableProducts');
const selectedItemsContainer = document.getElementById('selectedItems');

// Event Listeners
addItemBtn.onclick = () => createItemRow();
previewBtn.onclick = previewInvoice;
pdfBtn.onclick = generatePDF;
printBtn.onclick = printInvoice;
addProdBtn.onclick = addProduct;
updateProdBtn.onclick = updateProduct;
cancelEditProd.onclick = cancelProductEdit;

// Tax/Discount Toggle
showTaxDiscountBtn.onclick = () => {
    taxDiscountSection.style.display = 'block';
    showTaxDiscountBtn.style.display = 'none';
};
hideTaxDiscountBtn.onclick = () => {
    taxDiscountSection.style.display = 'none';
    showTaxDiscountBtn.style.display = 'block';
    // Reset values when hidden
    discountTypeInput.value = 'none';
    discountValueInput.value = '0';
    taxPercentInput.value = '0';
    previewInvoice();
};

// Settings Modal Events
settingsBtn.onclick = openSettingsModal;
closeSettingsBtn.onclick = closeSettingsModal;
saveSettingsBtn.onclick = saveSettings;
resetSettingsBtn.onclick = resetSettings;

// BILL PIC SYSTEM Event Listeners
productSearch.oninput = searchProducts;

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === settingsModal) {
        closeSettingsModal();
    }
};

// Auto-update preview when inputs change
discountTypeInput.onchange = previewInvoice;
discountValueInput.oninput = previewInvoice;
taxPercentInput.oninput = previewInvoice;

// Load initial data
fetchProducts();
loadSampleDate();

// ---------- BILL PIC SYSTEM FUNCTIONS ----------
function searchProducts() {
    const searchTerm = productSearch.value.toLowerCase();
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
    );
    displayAvailableProducts(filteredProducts);
}

function displayAvailableProducts(products = allProducts) {
    const container = document.getElementById('availableProducts');
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<div style="color:#666; text-align:center; padding:10px; font-size:12px;">No products found</div>';
        return;
    }
    
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-price">Rs ${product.price}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
        `;
        productDiv.onclick = () => showProductActions(product);
        container.appendChild(productDiv);
    });
}

function showProductActions(product) {
    const actionDiv = document.createElement('div');
    actionDiv.className = 'billing-item';
    actionDiv.innerHTML = `
        <div class="item-header">
            <div class="item-name">${product.name}</div>
            <div class="item-actions">
                <button class="action-btn btn-add" onclick="addToBill(${product.id})">Add</button>
                <button class="action-btn btn-edit" onclick="editProductFromBill(${product.id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteProductFromBill(${product.id})">Delete</button>
            </div>
        </div>
        <div class="item-details">
            <div class="item-row">
                <span>Price: Rs ${product.price}</span>
                <span>Stock: ${product.stock}</span>
            </div>
            <div class="item-row">
                <span>Final Rate: Rs ${product.final || product.price}</span>
            </div>
        </div>
        <div class="item-subtotal">
            Rs ${product.price}
        </div>
    `;
    
    // Temporary show actions
    billingItemsContainer.innerHTML = '';
    billingItemsContainer.appendChild(actionDiv);
}

function addToBill(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        // Check if already in selected items
        const existingIndex = selectedItems.findIndex(item => item.id === productId);
        
        if (existingIndex > -1) {
            // Update quantity if already exists
            selectedItems[existingIndex].quantity += 1;
            selectedItems[existingIndex].amount = selectedItems[existingIndex].quantity * selectedItems[existingIndex].final;
        } else {
            // Add new item
            selectedItems.push({
                ...product,
                quantity: 1,
                amount: product.final || product.price
            });
        }
        
        updateSelectedItemsDisplay();
        updateMainItemsFromSelected();
        previewInvoice();
        clearProductActions();
    }
}

function editProductFromBill(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        const newName = prompt('Enter new product name:', product.name);
        const newPrice = prompt('Enter new price:', product.price);
        const newFinal = prompt('Enter new final rate:', product.final || product.price);
        const newStock = prompt('Enter new stock:', product.stock);
        
        if (newName && newPrice && newFinal && newStock) {
            fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    price: parseFloat(newPrice),
                    final: parseFloat(newFinal),
                    stock: parseInt(newStock)
                })
            })
            .then(() => {
                fetchProducts(); // Reload products
                clearProductActions();
            })
            .catch(error => {
                console.error('Error updating product:', error);
                alert('Error updating product: ' + error.message);
            });
        }
    }
}

function deleteProductFromBill(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`/api/products/${productId}`, { method: 'DELETE' })
            .then(() => {
                fetchProducts(); // Reload products
                clearProductActions();
                
                // Remove from selected items if present
                selectedItems = selectedItems.filter(item => item.id !== productId);
                updateSelectedItemsDisplay();
                updateMainItemsFromSelected();
            })
            .catch(error => {
                console.error('Error deleting product:', error);
                alert('Error deleting product: ' + error.message);
            });
    }
}

function updateSelectedItemsDisplay() {
    const container = document.getElementById('selectedItems');
    container.innerHTML = '';
    
    if (selectedItems.length === 0) {
        container.innerHTML = '<div style="color:#666; text-align:center; padding:10px; font-size:12px;">No items added to bill</div>';
        return;
    }
    
    selectedItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item';
        itemDiv.innerHTML = `
            <div class="selected-item-header">
                <div class="selected-item-name">${item.name}</div>
                <div class="selected-item-actions">
                    <button class="action-btn btn-edit" onclick="editSelectedItem(${index})" style="padding:2px 6px; font-size:10px;">Edit</button>
                    <button class="action-btn btn-delete" onclick="removeSelectedItem(${index})" style="padding:2px 6px; font-size:10px;">Remove</button>
                </div>
            </div>
            <div class="selected-item-details">
                <span class="selected-item-quantity">Qty: ${item.quantity}</span>
                <span class="selected-item-price">Price: Rs ${item.price}</span>
                <span class="selected-item-amount">Rs ${item.amount}</span>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function editSelectedItem(index) {
    const item = selectedItems[index];
    const newQty = prompt('Enter new quantity:', item.quantity);
    
    if (newQty && !isNaN(newQty)) {
        selectedItems[index].quantity = parseInt(newQty);
        selectedItems[index].amount = selectedItems[index].quantity * selectedItems[index].final;
        
        updateSelectedItemsDisplay();
        updateMainItemsFromSelected();
        previewInvoice();
    }
}

function removeSelectedItem(index) {
    selectedItems.splice(index, 1);
    updateSelectedItemsDisplay();
    updateMainItemsFromSelected();
    previewInvoice();
}

function updateMainItemsFromSelected() {
    // Clear existing items in main form
    itemsDiv.innerHTML = '';
    
    // Add selected items to main form
    selectedItems.forEach(item => {
        createItemRow({
            name: item.name,
            qty: item.quantity,
            price: item.price,
            final: item.final
        });
    });
}

function clearProductActions() {
    billingItemsContainer.innerHTML = '<div style="color:#666; text-align:center; padding:10px; font-size:12px;">Select a product to see actions</div>';
}

// Add new product from bill system
function addNewProductFromBill() {
    const name = prompt('Enter product name:');
    const price = prompt('Enter product price:');
    const final = prompt('Enter final rate:', price);
    const stock = prompt('Enter stock quantity:');
    
    if (name && price && final && stock) {
        fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                price: parseFloat(price),
                final: parseFloat(final),
                stock: parseInt(stock)
            })
        })
        .then(() => {
            fetchProducts(); // Reload products
            alert('Product added successfully!');
        })
        .catch(error => {
            console.error('Error adding product:', error);
            alert('Error adding product: ' + error.message);
        });
    }
}

// ---------- SETTINGS FUNCTIONS ----------
function openSettingsModal() {
    // Fetch current details and populate form
    fetch('/api/company-details')
        .then(r => r.json())
        .then(companyDetails => {
            document.getElementById('companyName').value = companyDetails.name || '';
            document.getElementById('companyAddress').value = companyDetails.address || '';
            document.getElementById('companyOwner').value = companyDetails.owner || '';
            document.getElementById('companyPhone').value = companyDetails.phone || '';
            document.getElementById('companyEmail').value = companyDetails.email || '';
            document.getElementById('companyAdditionalPhones').value = companyDetails.additionalPhones || '';
            document.getElementById('companyAdditionalEmail').value = companyDetails.additionalEmail || '';
        });

    fetch('/api/customer-details')
        .then(r => r.json())
        .then(customerDetails => {
            document.getElementById('customerName').value = customerDetails.name || '';
            document.getElementById('customerBank').value = customerDetails.bankDetails || '';
            document.getElementById('customerAccount').value = customerDetails.accountNumber || '';
            document.getElementById('customerEasyPeasia').value = customerDetails.easyPeasia || '';
            document.getElementById('customerJazCash').value = customerDetails.jazCash || '';
            document.getElementById('customerAddress').value = customerDetails.address || '';
            document.getElementById('customerContact').value = customerDetails.contactNo || '';
        });

    settingsModal.style.display = 'block';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

function saveSettings() {
    const companyData = {
        name: document.getElementById('companyName').value,
        address: document.getElementById('companyAddress').value,
        owner: document.getElementById('companyOwner').value,
        phone: document.getElementById('companyPhone').value,
        email: document.getElementById('companyEmail').value,
        additionalPhones: document.getElementById('companyAdditionalPhones').value,
        additionalEmail: document.getElementById('companyAdditionalEmail').value
    };

    const customerData = {
        name: document.getElementById('customerName').value,
        bankDetails: document.getElementById('customerBank').value,
        accountNumber: document.getElementById('customerAccount').value,
        easyPeasia: document.getElementById('customerEasyPeasia').value,
        jazCash: document.getElementById('customerJazCash').value,
        address: document.getElementById('customerAddress').value,
        contactNo: document.getElementById('customerContact').value
    };

    // Save company details
    fetch('/api/company-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Company details saved:', result);
        
        // Save customer details
        return fetch('/api/customer-details', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
    })
    .then(response => response.json())
    .then(result => {
        console.log('Customer details saved:', result);
        alert('Settings saved successfully!');
        closeSettingsModal();
        previewInvoice(); // Refresh preview
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    });
}

function resetSettings() {
    if (confirm('Reset to default company and customer details?')) {
        const defaultCompany = {
            name: "S-A-S CORPORATION",
            address: "Shop 8 Al Haj Market near Aljanat mail Main GT Road Islamabad",
            owner: "SHEHZAD YASIN BHATTI",
            phone: "03032229069",
            email: "sascorporations@gmail.com",
            additionalPhones: "03119624139-03025089226-",
            additionalEmail: "shehzaoyasin@820@gmail.com"
        };

        const defaultCustomer = {
            name: "SHEHZAD RAJPOOT BHATTI",
            bankDetails: "[FAYSAL BANK]",
            accountNumber: "3077706000005364",
            easyPeasia: "EASY PEASIA 03025089226",
            jazCash: "JAZ CASH [ALHAJ MARKET SHOP NO8 NEAR AL JANAT MALL MAIN GT ROAD ISLAMABAD]",
            address: "ALHAJ MARKET SHOP NO8 NEAR AL JANAT MALL MAIN GT ROAD ISLAMABAD",
            contactNo: "00923016334238"
        };

        document.getElementById('companyName').value = defaultCompany.name;
        document.getElementById('companyAddress').value = defaultCompany.address;
        document.getElementById('companyOwner').value = defaultCompany.owner;
        document.getElementById('companyPhone').value = defaultCompany.phone;
        document.getElementById('companyEmail').value = defaultCompany.email;
        document.getElementById('companyAdditionalPhones').value = defaultCompany.additionalPhones;
        document.getElementById('companyAdditionalEmail').value = defaultCompany.additionalEmail;

        document.getElementById('customerName').value = defaultCustomer.name;
        document.getElementById('customerBank').value = defaultCustomer.bankDetails;
        document.getElementById('customerAccount').value = defaultCustomer.accountNumber;
        document.getElementById('customerEasyPeasia').value = defaultCustomer.easyPeasia;
        document.getElementById('customerJazCash').value = defaultCustomer.jazCash;
        document.getElementById('customerAddress').value = defaultCustomer.address;
        document.getElementById('customerContact').value = defaultCustomer.contactNo;
    }
}

// ---------- PRODUCTS ----------
function fetchProducts(){
  fetch(API_PRODUCTS).then(r=>r.json()).then(list=>{
    allProducts = list; // Store globally for bill system
    productList.innerHTML = '';
    list.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div style="flex:1"><b>${esc(p.name)}</b><div style="font-size:12px;color:#666">Price: ${p.price} | Final: ${p.final} | Stock: ${p.stock}</div></div>
        <div style="display:flex;gap:6px">
          <button onclick='addProductToInvoice(${p.id})'>Add</button>
          <button onclick='beginEditProduct(${p.id})'>Edit</button>
          <button onclick='deleteProduct(${p.id})' style="background:#e74c3c">Del</button>
        </div>`;
      productList.appendChild(row);
    });
    
    // Update bill system product list
    displayAvailableProducts();
  });
}

function addProductToInvoice(id){
  fetch(API_PRODUCTS).then(r=>r.json()).then(list=>{
    const p = list.find(x=>x.id===id);
    if(!p) return alert('Product not found');
    createItemRow({ name: p.name, qty: 1, price: p.price, final: p.final });
  });
}

function addProduct(){
  const name = prodName.value.trim();
  const price = Number(prodPrice.value || 0);
  const final = Number(prodFinal.value || price);
  const stock = Number(prodStock.value || 0);
  if(!name) return alert('Enter product name');
  fetch(API_PRODUCTS, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, price, final, stock }) })
    .then(()=>{ 
      prodName.value=''; 
      prodPrice.value=''; 
      prodFinal.value=''; 
      prodStock.value=''; 
      fetchProducts(); 
    });
}

function beginEditProduct(id){
  fetch(API_PRODUCTS).then(r=>r.json()).then(list=>{
    const p = list.find(x=>x.id===id);
    if(!p) return alert('Not found');
    editingProductId = id;
    prodName.value = p.name;
    prodPrice.value = p.price;
    prodFinal.value = p.final;
    prodStock.value = p.stock;
    addProdBtn.style.display = 'none';
    updateProdBtn.style.display = 'inline-block';
    cancelEditProd.style.display = 'inline-block';
  });
}

function updateProduct(){
  if(!editingProductId) return;
  const name = prodName.value.trim();
  const price = Number(prodPrice.value || 0);
  const final = Number(prodFinal.value || price);
  const stock = Number(prodStock.value || 0);
  fetch(`${API_PRODUCTS}/${editingProductId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, price, final, stock }) })
    .then(()=>{ cancelProductEdit(); fetchProducts(); });
}

function cancelProductEdit(){
  editingProductId = null;
  prodName.value = ''; 
  prodPrice.value=''; 
  prodFinal.value=''; 
  prodStock.value='';
  addProdBtn.style.display = 'inline-block';
  updateProdBtn.style.display = 'none';
  cancelEditProd.style.display = 'none';
}

function deleteProduct(id){
  if(!confirm('Delete product?')) return;
  fetch(`${API_PRODUCTS}/${id}`, { method:'DELETE' }).then(()=> fetchProducts());
}

// ---------- ITEMS (invoice rows) ----------
function createItemRow(it = { name:'', qty:1, price:0, final:0 }){
  const wrapper = document.createElement('div');
  wrapper.className = 'item-row';
  wrapper.style.display='flex'; 
  wrapper.style.gap='8px'; 
  wrapper.style.marginTop='8px'; 
  wrapper.style.alignItems='center';
  wrapper.style.padding = '8px';
  wrapper.style.border = '1px solid #ddd';
  wrapper.style.borderRadius = '6px';
  wrapper.style.background = '#f9f9f9';

  const amount = Number((it.qty || 1) * (it.final || it.price || 0)).toFixed(2);
  
  wrapper.innerHTML = `
    <input class="iname" placeholder="Item name" value="${esc(it.name)}" style="flex:1" oninput="updateItemAmount(this)">
    <input class="iqty" type="number" value="${it.qty||1}" style="width:70px" min="1" oninput="updateItemAmount(this)">
    <input class="iprice" type="number" value="${it.price||0}" style="width:90px" step="0.01" oninput="updateItemAmount(this)">
    <input class="ifinal" type="number" value="${it.final||it.price||0}" style="width:90px" step="0.01" oninput="updateItemAmount(this)">
    <div class="iamount" style="width:90px; text-align:right; font-weight:bold; color:#2c3e50">Rs ${amount}</div>
    <button class="rm" style="background:#e74c3c;color:#fff;padding:6px 8px;border:none;border-radius:6px;cursor:pointer">X</button>
  `;
  
  wrapper.querySelector('.rm').onclick = () => { 
    wrapper.remove(); 
    previewInvoice();
  };
  
  itemsDiv.appendChild(wrapper);
  return wrapper;
}

// Update item amount when any field changes
function updateItemAmount(inputElement) {
  const row = inputElement.closest('.item-row');
  if (!row) return;
  
  const qtyInput = row.querySelector('.iqty');
  const finalInput = row.querySelector('.ifinal');
  const amountDiv = row.querySelector('.iamount');
  
  const qty = Number(qtyInput.value || 0);
  const final = Number(finalInput.value || 0);
  const amount = (qty * final).toFixed(2);
  
  amountDiv.textContent = `Rs ${amount}`;
  
  // Auto-update preview
  previewInvoice();
}

// populate a few initial rows (if none)
function loadSampleDate(){
  if(!estimateNoInput.value) estimateNoInput.value = String(Math.floor(Math.random()*9000)+1000);
  if(!dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  
  // Initialize bill system
  clearProductActions();
  updateSelectedItemsDisplay();
}

// collect form/invoice data - FIXED VERSION
function collectData(){
  const estimate_no = estimateNoInput.value || '';
  const date = dateInput.value || new Date().toISOString().slice(0,10);
  const customer_name = custNameInput.value || '';
  const customer_address = custDetailsInput.value || '';
  const customer_gstin = '';
  
  const itemEls = Array.from(document.querySelectorAll('#items > div'));
  const items = itemEls.map(el=>{
    const name = el.querySelector('.iname').value || '';
    const qty = Number(el.querySelector('.iqty').value || 0);
    const price = Number(el.querySelector('.iprice').value || 0);
    const final = Number(el.querySelector('.ifinal').value || price);
    const amount = Number((qty * final).toFixed(2));
    return { name, qty, price, final, amount };
  });
  
  const subtotal = items.reduce((s,i)=>s + (i.amount||0), 0);
  const discount_type = discountTypeInput.value || 'none';
  const discount_value = Number(discountValueInput.value || 0);
  const tax_percent = Number(taxPercentInput.value || 0);

  // compute total - FIXED: removed undefined 'data' variable
  let discountAmount = 0;
  if (discount_type === 'percent') discountAmount = (discount_value/100) * subtotal;
  else if (discount_type === 'fixed') discountAmount = discount_value;
  const taxedBase = subtotal - discountAmount;
  const taxAmount = (tax_percent/100) * taxedBase;
  const total = taxedBase + taxAmount;

  return { 
    estimate_no, 
    date, 
    customer_name, 
    customer_address, 
    customer_gstin,
    items, 
    subtotal, 
    discount_type, 
    discount_value, 
    tax_percent,
    tax_amount: taxAmount,
    total 
  };
}

// ---------- PREVIEW ----------
function esc(s){ 
  if(!s && s !== 0) return ''; 
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
}

function clientRenderHTML(data){
  const fmt = n => 'Rs ' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const rows = (data.items || []).map((it, idx)=>`
    <tr>
      <td style="width:4%">${idx+1}</td>
      <td style="width:48%;padding-left:8px">${esc(it.name)}</td>
      <td style="width:12%;text-align:center">${it.qty}</td>
      <td style="width:12%;text-align:right">${fmt(it.price)}</td>
      <td style="width:12%;text-align:right">${fmt(it.final)}</td>
      <td style="width:12%;text-align:right">${fmt(it.amount)}</td>
    </tr>
  `).join('');
  
  const subtotal = data.subtotal||0;
  const discountType = data.discount_type||'none';
  const discountValue = data.discount_value||0;
  const taxPercent = data.tax_percent||0;
  
  let discountAmount = 0;
  if (discountType === 'percent') discountAmount = (discountValue/100)*subtotal;
  else if (discountType === 'fixed') discountAmount = discountValue;
  
  const taxedBase = subtotal - discountAmount;
  const taxAmount = (taxPercent/100) * taxedBase;
  const total = taxedBase + taxAmount;

  // Only show tax/discount rows if they have values
  const showDiscount = discountAmount > 0;
  const showTax = taxAmount > 0;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title>
    <style>
      body{font-family:Arial;padding:18px;color:#111} 
      .header{display:flex;justify-content:space-between;align-items:flex-start}
      .company{font-weight:800}
      .logo img{width:120px}
      .details{display:flex;justify-content:space-between;margin-top:12px}
      .left{width:60%}
      .right{width:35%;text-align:right}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      table th{border-bottom:2px solid #ddd;padding:8px;text-align:left;background:#fafafa}
      table td{padding:8px;border-bottom:1px solid #eee}
      .total-row td{border-top:2px solid #333;font-weight:700;padding-top:12px}
    </style>
    </head><body>
    <div class="header">
      <div class="company">
        S-A-S CORPORATION 
        <div style="font-weight:400;font-size:12px;margin-top:6px">
          Shop 8 Al Haj Market near Aljanat mail Main GT Road Islamabad<br/>
          SHEHZAD YASIN BHATTI / 03032229069 //<br/>
          sascorporations@gmail.com<br/>
          Phone no.: 03119624139-03025089226-<br/>
          Email: shehzaoyasin@820@gmail.com
        </div>
      </div>
      <div class="logo"><img src="sas-logo.png" alt="logo"></div>
    </div>
    
    <h2 style="text-align:center;margin-top:12px">Estimate</h2>
    
    <div class="details">
      <div class="left">
        <strong>Estimate For</strong>
        <div style="font-weight:700">${esc(data.customer_name)}</div>
        <div style="white-space:pre-line;margin-top:6px;font-size:12px">
          SHEHZAD RAJPOOT BHATTI [FAYSAL BANK] 3077706000005364 EASY PEASIA 03025089226 JAZ CASH [ALHAJ MARKET SHOP NO8 NEAR AL JANAT MALL MAIN GT ROAD ISLAMABAD Contact No.: 00923016334238
        </div>
      </div>
      <div class="right">
        <strong>Estimate Details</strong>
        <div>Estimate No.: ${esc(data.estimate_no)}</div>
        <div>Date: ${esc(data.date)}</div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item name</th>
          <th>Quantity</th>
          <th>Price/ unit</th>
          <th>Final Rate</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        ${showDiscount || showTax ? `
        <tr class="total-row">
          <td colspan="5" style="text-align:right">Subtotal</td>
          <td style="text-align:right">${fmt(subtotal)}</td>
        </tr>
        ${showDiscount ? `
        <tr>
          <td colspan="5" style="text-align:right">Discount (${esc(discountType)} ${esc(String(discountValue))}${discountType === 'percent' ? '%' : ''})</td>
          <td style="text-align:right">${fmt(-discountAmount)}</td>
        </tr>
        ` : ''}
        ${showTax ? `
        <tr>
          <td colspan="5" style="text-align:right">Tax (${taxPercent}%)</td>
          <td style="text-align:right">${fmt(taxAmount)}</td>
        </tr>
        ` : ''}
        ` : ''}
        <tr class="total-row">
          <td colspan="5" style="text-align:right">Total</td>
          <td style="text-align:right">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>
    </body></html>`;
}

function previewInvoice(){
  const data = collectData();
  previewFrame.srcdoc = clientRenderHTML(data);
}

// ---------- PRINT / PDF ----------
function printInvoice(){
  const data = collectData();
  const w = window.open();
  w.document.write(clientRenderHTML(data));
  w.document.close();
  setTimeout(()=> w.print(), 400);
}

// ---------- PDF GENERATION (FIXED) ----------
function generatePDF(){
  const data = collectData();
  
  if(data.items.length === 0) {
    alert('Please add at least one item to generate PDF');
    return;
  }

  console.log('Generating PDF for:', data);
  
  // Show loading
  const originalText = pdfBtn.textContent;
  pdfBtn.textContent = 'Generating PDF...';
  pdfBtn.disabled = true;

  fetch('/api/generate-pdf', { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
    }, 
    body: JSON.stringify(data) 
  })
  .then(response => {
    console.log('PDF Response status:', response.status);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned HTML instead of JSON');
    }
    
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.status}`);
    }
    
    return response.json();
  })
  .then(result => {
    console.log('PDF generated successfully:', result);
    
    if (result.file) {
      // Open PDF in new tab
      const pdfUrl = window.location.origin + result.file;
      console.log('Opening PDF:', pdfUrl);
      window.open(pdfUrl, '_blank');
      alert('PDF generated successfully! Check the new tab.');
    } else {
      throw new Error('No PDF file received from server');
    }
  })
  .catch(error => {
    console.error('PDF generation error:', error);
    alert('PDF generation failed: ' + error.message);
  })
  .finally(() => {
    // Restore button
    pdfBtn.textContent = originalText;
    pdfBtn.disabled = false;
  });
}