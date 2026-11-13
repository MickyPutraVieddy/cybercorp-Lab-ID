import type { Metadata } from 'next'
import { Search, Package, Archive, CircleDollarSign, AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { requirePermission } from '@/src/server/rbac'
import { products, categories } from '@/src/catalog/products'

export const metadata: Metadata = { title: 'Product Management' }
const categoryNames: Record<string, string> = Object.fromEntries(categories.map(c => [c.id, c.name.en]))
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string }> }) {
  await requirePermission('products.manage', '/admin/products')
  const params = await searchParams
  const query = (params.q ?? '').trim().toLowerCase()
  const filtered = products.filter(p => (!query || `${p.name.en} ${p.slug} ${p.id}`.toLowerCase().includes(query)) && (!params.category || p.category === params.category) && (!params.status || (params.status === 'low' ? p.stock > 0 && p.stock <= 5 : params.status === 'out' ? p.stock === 0 : params.status === 'available' ? p.stock > 5 : true)))
  const low = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const out = products.filter(p => p.stock === 0).length
  return <main className="admin-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">CATALOG / INVENTORY</span><h1>Product management</h1><p>Review the current product catalog and inventory snapshot.</p></div><span className="admin-readonly-tag">DEMO CATALOG · READ ONLY</span></div>
    <div className="admin-alert info"><strong>Prototype data source:</strong> Products are currently loaded from <code>src/catalog/products.ts</code>. Create, edit, price, stock, publish, and delete operations are not connected to Supabase yet. No changes are persisted from this screen.</div>
    <section className="admin-stat-grid product-stats">
      <article className="admin-stat-card"><span className="admin-stat-icon blue"><Package size={19}/></span><span className="admin-stat-label">TOTAL PRODUCTS</span><strong>{products.length}</strong><small>Static catalog entries</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon green"><CircleDollarSign size={19}/></span><span className="admin-stat-label">IN STOCK</span><strong>{products.filter(p => p.stock > 0).length}</strong><small>Products with available stock</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber"><AlertTriangle size={19}/></span><span className="admin-stat-label">LOW STOCK</span><strong>{low}</strong><small>Five units or fewer</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon red"><Archive size={19}/></span><span className="admin-stat-label">OUT OF STOCK</span><strong>{out}</strong><small>Zero available units</small></article>
    </section>
    <section className="admin-panel product-table-panel">
      <div className="admin-panel-heading"><div><span className="admin-eyebrow">CATALOG INVENTORY</span><h3>Products <span className="count-chip">{filtered.length}</span></h3></div><span className="admin-section-note">SOURCE: LOCAL TYPESCRIPT</span></div>
      <form className="product-filter-bar" action="/admin/products">
        <label className="product-search"><Search size={16}/><input name="q" defaultValue={params.q} placeholder="Search product, SKU, or ID..." /></label>
        <select name="category" defaultValue={params.category ?? ''} aria-label="Filter category"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name.en}</option>)}</select>
        <select name="status" defaultValue={params.status ?? ''} aria-label="Filter stock"><option value="">All stock states</option><option value="available">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        <button type="submit" className="admin-button secondary"><SlidersHorizontal size={15}/> Filter</button>
      </form>
      <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>PRODUCT</th><th>SKU / ID</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th></tr></thead><tbody>
        {filtered.map(p => <tr key={p.id}><td><div className="product-name-cell"><span className="product-thumb"><Package size={18}/></span><span><b>{p.name.en}</b><small>{p.slug}</small></span></div></td><td><code>{p.id.toUpperCase()}</code></td><td>{categoryNames[p.category] ?? p.category}</td><td className="price-cell">{money(p.priceIdr)}</td><td><b>{p.stock}</b> <small>units</small></td><td>{p.stock === 0 ? <span className="stock-badge danger">Out of stock</span> : p.stock <= 5 ? <span className="stock-badge warning">Low stock</span> : <span className="stock-badge success">In stock</span>}</td></tr>)}
        {!filtered.length ? <tr><td colSpan={6} className="table-empty">No products match these filters.</td></tr> : null}
      </tbody></table></div>
      <div className="admin-table-foot"><span>Showing {filtered.length} of {products.length} catalog items</span><span>Read-only preview</span></div>
    </section>
  </main>
}
