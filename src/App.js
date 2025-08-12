
import React, { useEffect, useState } from 'react';

export default function App(){
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(()=>{
    // sample products — in production fetch from a real API
    setProducts([
      { id:1, title:'Biba Embroidered Kurta', price:1299, image:'' },
      { id:2, title:'Classic Mens Shirt', price:999, image:'' }
    ]);
  },[]);

  function addToCart(p){ setCart(prev=>{ const f = prev.find(x=>x.id===p.id); if(f) return prev.map(x=> x.id===p.id?{...x,qty:x.qty+1}:x); return [...prev,{...p,qty:1}]; }); }

  async function checkout(){
    if(cart.length===0){ alert('Cart empty'); return; }
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(c=>({ id:c.id, title:c.title, price:c.price, quantity:c.qty })) })
    });
    const data = await res.json();
    if(data.url){
      window.location.href = data.url;
    } else {
      alert('Error creating checkout session: ' + (data.error || 'unknown'));
    }
  }

  return (
    <div>
      <header className="header"><div className="container"><h1>Biba Clothing Centre</h1></div></header>
      <main className="container" style={{padding:20}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>
          <div>
            <h2>Products</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
              {products.map(p=>(
                <div key={p.id} style={{background:'#fff',padding:12,borderRadius:8}}>
                  <div style={{fontWeight:700}}>{p.title}</div>
                  <div>₹{p.price}</div>
                  <button onClick={()=>addToCart(p)} style={{marginTop:8}}>Add to cart</button>
                </div>
              ))}
            </div>
          </div>
          <aside style={{background:'#fff',padding:12,borderRadius:8}}>
            <h3>Cart</h3>
            {cart.map(c=> <div key={c.id}>{c.title} x {c.qty}</div>)}
            <div style={{marginTop:12}}>Total: ₹{cart.reduce((s,c)=>s+c.price*c.qty,0)}</div>
            <button style={{marginTop:12}} onClick={checkout}>Checkout</button>
          </aside>
        </div>
      </main>
    </div>
  );
}
