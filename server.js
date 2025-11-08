// -------------------- IMPORTS --------------------
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

// -------------------- CONFIG --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));

// -------------------- DATABASE --------------------
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");

    // Table creation
    db.run(`CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_no TEXT,
      customer_name TEXT,
      customer_address TEXT,
      customer_gstin TEXT,
      date TEXT,
      items TEXT,
      subtotal REAL,
      discount_type TEXT,
      discount_value REAL,
      tax_percent REAL,
      tax_amount REAL,
      total REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS company_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT,
      owner TEXT,
      phone TEXT,
      email TEXT,
      additionalPhones TEXT,
      additionalEmail TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customer_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      bankDetails TEXT,
      accountNumber TEXT,
      easyPeasia TEXT,
      jazCash TEXT,
      address TEXT,
      contactNo TEXT
    )`);

    db.get("SELECT COUNT(*) as count FROM company_details", (err, row) => {
      if (row.count === 0) {
        db.run(
          `INSERT INTO company_details (name, address, owner, phone, email, additionalPhones, additionalEmail)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            "S-A-S CORPORATION",
            "Shop 8 Al Haj Market near Aljanat mall Main GT Road Islamabad",
            "SHEHZAD YASIN BHATTI",
            "03032229069",
            "sascorporations@gmail.com",
            "03119624139-03025089226-",
            "shehzaoyasin@820@gmail.com",
          ]
        );
      }
    });

    db.get("SELECT COUNT(*) as count FROM customer_details", (err, row) => {
      if (row.count === 0) {
        db.run(
          `INSERT INTO customer_details (name, bankDetails, accountNumber, easyPeasia, jazCash, address, contactNo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            "SHEHZAD RAJPOOT BHATTI",
            "[FAYSAL BANK]",
            "3077706000005364",
            "EASY PEASIA 03025089226",
            "JAZ CASH [ALHAJ MARKET SHOP NO8 NEAR AL JANAT MALL MAIN GT ROAD ISLAMABAD]",
            "ALHAJ MARKET SHOP NO8 NEAR AL JANAT MALL MAIN GT ROAD ISLAMABAD",
            "00923016334238",
          ]
        );
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      final REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// -------------------- ROUTES --------------------
app.get("/api/company-details", (req, res) => {
  db.get("SELECT * FROM company_details WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

app.get("/api/customer-details", (req, res) => {
  db.get("SELECT * FROM customer_details WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

// -------------------- PDF GENERATOR --------------------
app.post("/api/generate-pdf", async (req, res) => {
  console.log("📄 PDF generation request received");

  try {
    const data = req.body;
    console.log("Received data for PDF generation:", JSON.stringify(data, null, 2));

    if (!data) return res.status(400).json({ error: "No data provided" });

    const filename = `Estimate_${data.estimate_no || Date.now()}.pdf`;
    const outPath = path.join(__dirname, "public", filename);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // Create HTML content with dynamic data
    const htmlContent = generateHTMLContent(data);

    // Set content and wait for the DOM to be fully loaded
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Wait for fonts and images to load
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      displayHeaderFooter: false
    });

    await browser.close();

    // Save PDF file
    fs.writeFileSync(outPath, pdf);

    console.log("✅ PDF generated successfully:", filename);
    res.json({ success: true, file: `/${filename}` });
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    res.status(500).json({ error: "PDF generation failed", details: err.message });
  }
});

// HTML Content Generator Function - FINAL DESIGN
function generateHTMLContent(data) {
  // Calculate item totals properly
  const itemsWithTotals = data.items ? data.items.map(item => ({
    ...item,
    total: (item.quantity || 0) * (item.final || item.price || 0)
  })) : [];

  // Calculate subtotal from items
  const subtotal = itemsWithTotals.reduce((sum, item) => sum + (item.total || 0), 0);
  
  // Calculate tax amount
  const taxPercent = data.tax_percent || 0;
  const taxAmount = data.tax_amount || (subtotal * taxPercent / 100);
  
  // Calculate total
  const discountValue = data.discount_value || 0;
  const total = data.total || (subtotal - discountValue + taxAmount);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ESTIMATE ${data.estimate_no || ''}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.3;
      color: #000;
      background: #fff;
      padding: 15px;
      font-size: 12px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Header Styles with Logo */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    
    .company-info {
      flex: 1;
    }
    
    .logo-section {
      width: 80px;
      text-align: right;
    }
    
    .logo {
      max-width: 70px;
      height: auto;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .company-address {
      font-size: 11px;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    
    .company-contact {
      font-size: 11px;
      line-height: 1.2;
    }
    
    /* Estimate Details Section */
    .estimate-details-section {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
    }
    
    .estimate-for-section {
      flex: 1;
    }
    
    .estimate-details-box {
      width: 200px;
      text-align: right;
    }
    
    .estimate-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 10px 0;
      text-transform: uppercase;
    }
    
    .estimate-for {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: left;
    }
    
    /* Customer Details */
    .customer-name {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 8px;
      text-align: left;
    }
    
    .customer-details {
      font-size: 11px;
      line-height: 1.2;
      margin-bottom: 15px;
      text-align: left;
    }
    
    /* Estimate Details Right Side */
    .estimate-details-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .estimate-detail-row {
      margin-bottom: 3px;
      font-size: 11px;
    }
    
    /* Table Styles - Light Grey Borders */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 11px;
    }
    
    .items-table th {
      border: 1px solid #d0d0d0;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      background: #f8f8f8;
    }
    
    .items-table td {
      border: 1px solid #d0d0d0;
      padding: 6px 4px;
      text-align: left;
    }
    
    .items-table th:nth-child(1),
    .items-table td:nth-child(1) {
      width: 50%;
    }
    
    .items-table th:nth-child(2),
    .items-table td:nth-child(2) {
      width: 10%;
      text-align: center;
    }
    
    .items-table th:nth-child(3),
    .items-table td:nth-child(3) {
      width: 13%;
      text-align: right;
    }
    
    .items-table th:nth-child(4),
    .items-table td:nth-child(4) {
      width: 13%;
      text-align: right;
    }
    
    .items-table th:nth-child(5),
    .items-table td:nth-child(5) {
      width: 14%;
      text-align: right;
    }
    
    /* Totals Section */
    .totals-section {
      margin-top: 20px;
      text-align: right;
      font-size: 13px;
    }
    
    .total-row {
      margin-bottom: 5px;
    }
    
    .grand-total {
      font-weight: bold;
      font-size: 14px;
      border-top: 1px solid #d0d0d0;
      padding-top: 8px;
      margin-top: 8px;
    }
    
    /* Page Break for Second Copy */
    .page-break {
      page-break-before: always;
      margin-top: 40px;
      padding-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- First Copy -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">S-A-S CORPORATION</div>
        <div class="company-address">
          Shop 8 Al Haj Market near Aljanat mail Main<br>
          GT Road Islamabad / SHEHZAD YASIN<br>
          BHATTI / 03032229069 //<br>
          sascorporations@gmail.com
        </div>
        <div class="company-contact">
          Phone no.: 03119624139-03025089226-<br>
          Email: shehzaoyasin@820@gmail.com
        </div>
      </div>
      <div class="logo-section">
        <img src="http://localhost:${PORT}/sas-logo.png" class="logo" alt="SAS Logo">
      </div>
    </div>

    <!-- Estimate Title - Center Big -->
    <div class="estimate-title">ESTIMATE</div>

    <!-- Estimate Details Section -->
    <div class="estimate-details-section">
      <div class="estimate-for-section">
        <div class="estimate-for">Estimate For</div>
        <div class="customer-name">${data.customer_name || 'Customer Name'}</div>
        <div class="customer-details">
          SHEHZAD RAJPOOT BHATTI [FAYSAL<br>
          BANK] 3077706000005364 EASY PEASIA<br>
          03025089226 JAZ CASH [ALHAJ<br>
          MARKET SHOP NO8 NEAR AL JANAT<br>
          MALL MAIN GT ROAD ISLAMABAD<br>
          Contact No.: 00923016334238
        </div>
      </div>
      
      <div class="estimate-details-box">
        <div class="estimate-details-title">Estimate Details</div>
        <div class="estimate-detail-row"><strong>Estimate No:</strong> ${data.estimate_no || 'N/A'}</div>
        <div class="estimate-detail-row"><strong>Date:</strong> ${data.date || new Date().toLocaleDateString()}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th># Item name</th>
          <th>Quantity</th>
          <th>Price/ unit</th>
          <th>Final Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsWithTotals.length > 0 ? itemsWithTotals.map(item => `
          <tr>
            <td>${item.name || 'N/A'}</td>
            <td>${item.quantity || 0}</td>
            <td>Rs ${(item.price || 0).toFixed(3)}</td>
            <td>Rs ${((item.final || item.price || 0)).toFixed(3)}</td>
            <td>Rs ${((item.total || 0)).toLocaleString('en-IN', {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="5" style="text-align: center;">No items added</td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-section">
      <div class="total-row">
        <strong>Subtotal:</strong> Rs ${subtotal.toFixed(3)}
      </div>
      ${discountValue > 0 ? `
      <div class="total-row">
        <strong>Discount (${data.discount_type || 'Fixed'}):</strong> -Rs ${discountValue.toFixed(3)}
      </div>
      ` : ''}
      ${taxAmount > 0 ? `
      <div class="total-row">
        <strong>Tax (${taxPercent}%):</strong> Rs ${taxAmount.toFixed(3)}
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <strong>GRAND TOTAL:</strong> Rs ${total.toFixed(3)}
      </div>
    </div>

    <!-- Second Copy -->
    <div class="page-break">
      <div class="header">
        <div class="company-info">
          <div class="company-name">S-A-S CORPORATION</div>
          <div class="company-address">
            Shop 8 Al Haj Market near Aljanat mail Main<br>
            GT Road Islamabad / SHEHZAD YASIN<br>
            BHATTI / 03032229069 //<br>
            sascorporations@gmail.com
          </div>
          <div class="company-contact">
            Phone no.: 03119624139-03025089226-<br>
            Email: shehzaoyasin@820@gmail.com
          </div>
        </div>
        <div class="logo-section">
          <img src="http://localhost:${PORT}/sas-logo.png" class="logo" alt="SAS Logo">
        </div>
      </div>

      <!-- Estimate Title - Center Big -->
      <div class="estimate-title">ESTIMATE</div>

      <!-- Estimate Details Section -->
      <div class="estimate-details-section">
        <div class="estimate-for-section">
          <div class="estimate-for">Estimate For</div>
          <div class="customer-name">${data.customer_name || 'Customer Name'}</div>
        </div>
        
        <div class="estimate-details-box">
          <div class="estimate-details-title">Estimate Details</div>
          <div class="estimate-detail-row"><strong>Estimate No:</strong> ${data.estimate_no || 'N/A'}</div>
          <div class="estimate-detail-row"><strong>Date:</strong> ${data.date || new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th># Item name</th>
            <th>Quantity</th>
            <th>Price/ unit</th>
            <th>Final Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsWithTotals.length > 0 ? itemsWithTotals.map(item => `
            <tr>
              <td>${item.name || 'N/A'}</td>
              <td>${item.quantity || 0}</td>
              <td>Rs ${(item.price || 0).toFixed(3)}</td>
              <td>Rs ${((item.final || item.price || 0)).toFixed(3)}</td>
              <td>Rs ${((item.total || 0)).toLocaleString('en-IN', {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" style="text-align: center;">No items added</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Totals Section -->
      <div class="totals-section">
        <div class="total-row grand-total">
          <strong>GRAND TOTAL:</strong> Rs ${total.toFixed(3)}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// -------------------- PRODUCTS CRUD --------------------
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY name", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products", (req, res) => {
  const { name, price, final, stock } = req.body;
  db.run(
    "INSERT INTO products (name, price, final, stock) VALUES (?, ?, ?, ?)",
    [name, price, final, stock],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, price, final, stock });
    }
  );
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, price, final, stock } = req.body;
  db.run(
    "UPDATE products SET name = ?, price = ?, final = ?, stock = ? WHERE id = ?",
    [name, price, final, stock, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Product updated successfully" });
    }
  );
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Product deleted successfully" });
  });
});

// -------------------- ESTIMATES CRUD --------------------
app.get("/api/estimates", (req, res) => {
  db.all("SELECT * FROM estimates ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/estimates", (req, res) => {
  const {
    estimate_no,
    customer_name,
    customer_address,
    customer_gstin,
    date,
    items,
    subtotal,
    discount_type,
    discount_value,
    tax_percent,
    tax_amount,
    total,
  } = req.body;

  db.run(
    `INSERT INTO estimates (
      estimate_no, customer_name, customer_address, customer_gstin, date, items,
      subtotal, discount_type, discount_value, tax_percent, tax_amount, total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      estimate_no,
      customer_name,
      customer_address,
      customer_gstin,
      date,
      JSON.stringify(items),
      subtotal,
      discount_type,
      discount_value,
      tax_percent,
      tax_amount,
      total,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: "Estimate saved successfully" });
    }
  );
});

// -------------------- MAIN PAGE --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT}`);
});