
// server/server.js
// Simple Express server with in-memory product store, admin CRUD endpoints,
// and Stripe Checkout session creation (test mode). Uses STRIPE_SECRET_KEY env var.
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
} else {
  console.warn('Warning: STRIPE_SECRET_KEY not set. Stripe checkout will not work until you set it.');
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory product store (start with sample products)
let PRODUCTS = [
  { id: 1, title: "Biba Embroidered Kurta", brand: "Biba", price: 1299, rating: 4.5, category: "Women", sizes: ["S","M","L"], image: "https://images.unsplash.com/photo-1520975698519-2a9f6b4f8a3f?auto=format&fit=crop&w=800&q=60" },
  { id: 2, title: "Classic Men's Shirt", brand: "UrbanVibe", price: 999, rating: 4.2, category: "Men", sizes: ["M","L","XL"], image: "https://images.unsplash.com/photo-1520975915535-4f1c9aa8b3c0?auto=format&fit=crop&w=800&q=60" },
  { id: 3, title: "Casual Hoodie", brand: "CozyCorner", price: 1499, rating: 4.3, category: "Unisex", sizes: ["M","L","XL"], image: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=800&q=60" },
  { id: 4, title: "Summer Dress", brand: "Luna", price: 1599, rating: 4.6, category: "Women", sizes: ["S","M","L"], image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=60" },
  { id: 5, title: "Denim Jeans", brand: "DenimPro", price: 1999, rating: 4.4, category: "Men", sizes: ["30","32","34","36"], image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=60" }
];
let NEXT_ID = 6;

// Public API: products
app.get('/api/products', (req, res) => {
  res.json({ products: PRODUCTS });
});

// Admin endpoints (static login expected on client) - CRUD
app.post('/api/admin/products', (req, res) => {
  const { title, brand, price, rating, category, sizes, image } = req.body;
  if(!title || !price) return res.status(400).json({ error: 'title and price required' });
  const p = { id: NEXT_ID++, title, brand, price: Number(price), rating: Number(rating) || 0, category: category || 'Uncategorized', sizes: sizes || [], image: image || '' };
  PRODUCTS.push(p);
  res.json({ ok: true, product: p });
});

app.put('/api/admin/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = PRODUCTS.findIndex(x => x.id === id);
  if(idx === -1) return res.status(404).json({ error: 'product not found' });
  const updated = Object.assign(PRODUCTS[idx], req.body);
  res.json({ ok: true, product: updated });
});

app.delete('/api/admin/products/:id', (req, res) => {
  const id = Number(req.params.id);
  PRODUCTS = PRODUCTS.filter(p => p.id !== id);
  res.json({ ok: true });
});

// Checkout: create a Stripe Checkout Session (if stripe available)
// Expects body: { items: [{ id, title, price, qty }], successUrl, cancelUrl }
app.post('/api/create-checkout-session', async (req, res) => {
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured on server. Set STRIPE_SECRET_KEY.' });
  const { items, successUrl, cancelUrl } = req.body || {};
  if(!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items provided' });

  try {
    const line_items = items.map(it => ({
      price_data: {
        currency: 'inr',
        product_data: { name: it.title },
        unit_amount: Math.round(it.price * 100)
      },
      quantity: it.qty || 1
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: successUrl || 'https://example.com/success',
      cancel_url: cancelUrl || 'https://example.com/cancel'
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error', err);
    res.status(500).json({ error: 'Stripe error', details: err.message });
  }
});

// Serve client in production (expects client build in ../client/dist or ../client/build)
const clientBuildPath1 = path.join(__dirname, '..', 'client', 'dist');
const clientBuildPath2 = path.join(__dirname, '..', 'client', 'build');
const clientPath = require('fs').existsSync(clientBuildPath1) ? clientBuildPath1 : clientBuildPath2;
if(require('fs').existsSync(clientPath)){
  app.use(express.static(clientPath));
  app.get('*', (req, res) => {
    if(req.path.startsWith('/api')) return res.status(404).send('API route not found');
    res.sendFile(path.join(clientPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('Biba Clothing Centre API is running. Build the client and place it in client/dist or client/build to serve the frontend.'));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
