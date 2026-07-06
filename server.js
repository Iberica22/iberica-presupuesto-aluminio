require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const PDFDocument = require('pdfkit');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const signageConfig = require('./signage/config');
const { runWeeklySignage } = require('./signage/run');

const systemPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts', 'system.txt'),
  'utf-8'
);

app.use(express.json());
app.use(express.static('public'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'iberica-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

  if (!req.session.messages) req.session.messages = [];
  req.session.messages.push({ role: 'user', content: message });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        ...req.session.messages,
      ],
    });

    const raw = response.choices[0].message.content;
    req.session.messages.push({ role: 'assistant', content: raw });

    // Detect budget JSON marker emitted by the agent
    const match = raw.match(/PRESUPUESTO_JSON:([\s\S]+?)(?:\n|$)/);
    let budgetReady = false;
    if (match) {
      try {
        req.session.budgetData = JSON.parse(match[1].trim());
        budgetReady = true;
      } catch {
        // malformed JSON — ignore, don't crash
      }
    }

    // Strip the marker before sending text to the frontend
    const text = raw.replace(/PRESUPUESTO_JSON:[\s\S]+$/, '').trim();

    res.json({ message: text, budgetReady });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Error al contactar con el agente. Inténtelo de nuevo.' });
  }
});

// ── Download PDF ──────────────────────────────────────────────────────────────
app.get('/api/download-pdf', (req, res) => {
  const data = req.session.budgetData;
  if (!data) return res.status(404).json({ error: 'No hay presupuesto generado todavía.' });

  const filename = `presupuesto-iberica-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  buildPDF(data, res);
});

// ── Reset conversation ────────────────────────────────────────────────────────
app.post('/api/reset', (req, res) => {
  req.session.messages = [];
  req.session.budgetData = null;
  res.json({ ok: true });
});

// ── PDF builder ───────────────────────────────────────────────────────────────
function buildPDF(data, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const PW = doc.page.width;   // 595
  const ML = 50;               // margin left
  const CW = PW - 100;         // content width = 495
  const BLUE = '#1F4E79';
  const LBLUE = '#D6E4F0';
  const GREY = '#6B7280';
  const DARK = '#2C2C2C';

  // ── Header band ──
  doc.rect(0, 0, PW, 78).fill(BLUE);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(22)
     .text('IBÉRICA SEGURIDAD', ML, 18, { width: CW, align: 'center' });
  doc.fillColor(LBLUE).font('Helvetica').fontSize(11)
     .text('Carpintería de Aluminio  ·  Sevilla', ML, 46, { width: CW, align: 'center' });

  doc.y = 98;

  // ── Title ──
  const ref   = 'IB-' + Date.now().toString().slice(-8);
  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(17).text('PRESUPUESTO', { align: 'center' });
  doc.moveDown(0.4);
  doc.fillColor(GREY).font('Helvetica').fontSize(10)
     .text(`Referencia: ${ref}   ·   Fecha: ${fecha}`, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(ML, doc.y).lineTo(PW - ML, doc.y).strokeColor(BLUE).lineWidth(1).stroke();
  doc.moveDown(0.8);

  // ── Client ──
  if (data.cliente) {
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(12).text('CLIENTE');
    doc.moveDown(0.4);
    doc.fillColor(DARK).font('Helvetica').fontSize(11)
       .text(`Nombre: ${data.cliente}`, ML + 8);
    if (data.telefono) doc.text(`Teléfono: ${data.telefono}`, ML + 8);
    if (data.direccion) doc.text(`Dirección: ${data.direccion}`, ML + 8);
    doc.moveDown(1);
    doc.moveTo(ML, doc.y).lineTo(PW - ML, doc.y).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  }

  // ── Table ──
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(12).text('PARTIDAS DEL PRESUPUESTO');
  doc.moveDown(0.6);

  // Column x-positions (absolute)
  const c0 = ML;         // description start
  const c1 = ML + 275;   // qty start
  const c2 = ML + 335;   // unit price start
  const c3 = ML + 415;   // line total start
  const c4 = ML + CW;    // right edge

  // Header row
  let ry = doc.y;
  doc.rect(c0, ry, CW, 22).fill(BLUE);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9.5);
  doc.text('Descripción',         c0 +  5, ry + 6, { width: c1 - c0 - 10 });
  doc.text('Cant.',               c1,      ry + 6, { width: c2 - c1 - 5, align: 'center' });
  doc.text('P. Unit. (s/IVA)',    c2,      ry + 6, { width: c3 - c2 - 5, align: 'right' });
  doc.text('Total (s/IVA)',       c3,      ry + 6, { width: c4 - c3 - 5, align: 'right' });
  ry += 22;

  let subtotal = 0;
  const items = Array.isArray(data.items) ? data.items : [];

  items.forEach((item, i) => {
    const qty   = parseFloat(item.cantidad) || 1;
    const price = parseFloat(item.precio)   || 0;
    const line  = qty * price;
    subtotal   += line;

    const rh = 22;
    if (i % 2 === 0) doc.rect(c0, ry, CW, rh).fill('#F0F4F9');

    doc.fillColor(DARK).font('Helvetica').fontSize(9.5);
    doc.text(item.descripcion || '', c0 + 5, ry + 6, { width: c1 - c0 - 10 });
    doc.text(String(qty),            c1,     ry + 6, { width: c2 - c1 - 5, align: 'center' });
    doc.text(price.toFixed(2) + ' €', c2,   ry + 6, { width: c3 - c2 - 5, align: 'right' });
    doc.text(line.toFixed(2)  + ' €', c3,   ry + 6, { width: c4 - c3 - 5, align: 'right' });
    ry += rh;
  });

  // ── Totals ──
  ry += 10;
  const ivaRate   = parseFloat(data.iva) || 0.21;
  const ivaAmount = subtotal * ivaRate;
  const total     = subtotal + ivaAmount;

  const tx = c3 - 10;  // totals label x
  const tw = c4 - tx;  // totals block width

  doc.moveTo(tx, ry).lineTo(c4, ry).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
  ry += 8;

  doc.fillColor(DARK).font('Helvetica').fontSize(11);
  doc.text('Base imponible:', tx, ry, { width: 110 });
  doc.text(subtotal.toFixed(2) + ' €', tx + 110, ry, { width: tw - 115, align: 'right' });
  ry += 18;

  doc.text(`IVA (${(ivaRate * 100).toFixed(0)}%):`, tx, ry, { width: 110 });
  doc.text(ivaAmount.toFixed(2) + ' €', tx + 110, ry, { width: tw - 115, align: 'right' });
  ry += 24;

  doc.rect(tx - 5, ry - 4, tw + 5, 26).fill(BLUE);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(12.5);
  doc.text('TOTAL:', tx, ry + 3, { width: 110 });
  doc.text(total.toFixed(2) + ' €', tx + 110, ry + 3, { width: tw - 115, align: 'right' });
  ry += 30;

  // ── Validity note ──
  ry += 14;
  doc.fillColor(GREY).font('Helvetica').fontSize(9)
     .text('Este presupuesto tiene una validez de 30 días desde su emisión.', ML, ry, { width: CW });
  ry += 14;

  // ── Optional notes ──
  if (data.notas) {
    ry += 8;
    doc.moveTo(ML, ry).lineTo(PW - ML, ry).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
    ry += 10;
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11).text('NOTAS', ML, ry);
    ry += 16;
    doc.fillColor('#555555').font('Helvetica').fontSize(10)
       .text(data.notas, ML + 8, ry, { width: CW - 8 });
  }

  // ── Footer band ──
  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, PW, 50).fill(BLUE);
  doc.fillColor(LBLUE).font('Helvetica').fontSize(9)
     .text('Ibérica Seguridad  ·  Carpintería de Aluminio  ·  Sevilla', ML, footerY + 17, {
       width: CW, align: 'center',
     });

  doc.end();
}

// ── Señalización LED (pantallas del escaparate) ────────────────────────────────
// Ejecuta bajo demanda el pipeline semanal de contenido para las pantallas LED.
// Protegido con SIGNAGE_ADMIN_TOKEN para poder probarlo/forzarlo sin esperar al cron.
app.post('/api/signage/run-now', async (req, res) => {
  if (!signageConfig.adminToken || req.get('x-admin-token') !== signageConfig.adminToken) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const publish = req.query.publish !== 'false';
    const summary = await runWeeklySignage({ publish });
    res.json(summary);
  } catch (err) {
    console.error('Error ejecutando señalización LED:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Ibérica Seguridad  →  http://localhost:${PORT}`);
  require('./signage/scheduler').start();
});
