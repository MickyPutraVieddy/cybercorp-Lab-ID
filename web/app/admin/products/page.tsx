import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Package, Archive, CircleDollarSign, AlertTriangle, SlidersHorizontal, Plus } from 'lucide-react'
import { requirePermission } from '@/src/server/rbac'
import { categories } from '@/src/catalog/products'
import { loadCatalogForAdmin } from '@/src/catalog/db'
import { DeleteProductForm, ProductForm } from '@/src/components/admin/product-form'

export const metadata: Metadata = { title: 'Product Management' }
const categoryNames: Record<string, string> = Object.fromEntries(categories.map(c => [c.id, c.name.en]))
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; edit?: string; new?: string }> }) {
  await requirePermission('products.manage', '/admin/products')
  const params = await searchParams
  const { products, source, error } = await loadCatalogForAdmin()
  const live = source === 'database'
  const query = (params.q ?? '').trim().toLowerCase()
  const filtered = products.filter(p => (!query || `${p.name.en} ${p.slug} ${p.id}`.toLowerCase().includes(query)) && (!params.category || p.category === params.category) && (!params.status || (params.status === 'low' ? p.stock > 0 && p.stock <= 5 : params.status === 'out' ? p.stock === 0 : params.status === 'available' ? p.stock > 5 : params.status === 'draft' ? p.published === false : true)))
  const low = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const out = products.filter(p => p.stock === 0).length
  const editing = live && params.edit ? products.find(p => p.id === params.edit) : undefined
  return <main className="admin-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">CATALOG / INVENTORY</span><h1>Product management</h1><p>Create, edit and remove products. Every change is written to Supabase and appears in the store immediately.</p></div>{live ? <Link href="/admin/products?new=1" className="admin-button primary"><Plus size={15}/> New product</Link> : <span className="admin-readonly-tag">DEMO DATA · NOT CONNECTED</span>}</div>
    {!live ? <div className="admin-alert"><strong>Database not connected for products.</strong> Showing the bundled demo list, so nothing you do here can be saved. {error === 'service_role_missing' ? 'The service-role key is missing in Vercel (SUPABASE_SERVICE_ROLE_KEY).' : 'Run supabase/APPLY_ALL.sql in the Supabase SQL Editor, then reload. Check /api/health for details.'}</div> : null}
    {live && (params.new || editing) ? <section className="admin-panel pm-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">{editing ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</span><h3>{editing ? editing.name.en : 'Add a product'}</h3></div><Link href="/admin/products" className="admin-button secondary">Close</Link></div><ProductForm key={editing?.id ?? 'new'} product={editing} /></section> : null}
    <section className="admin-stat-grid product-stats">
      <article className="admin-stat-card"><span className="admin-stat-icon blue"><Package size={19}/></span><span className="admin-stat-label">TOTAL PRODUCTS</span><strong>{products.length}</strong><small>{live ? 'Rows in Supabase' : 'Static demo entries'}</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon green"><CircleDollarSign size={19}/></span><span className="admin-stat-label">IN STOCK</span><strong>{products.filter(p => p.stock > 0).length}</strong><small>Products with available stock</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber"><AlertTriangle size={19}/></span><span className="admin-stat-label">LOW STOCK</span><strong>{low}</strong><small>Five units or fewer</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon red"><Archive size={19}/></span><span className="admin-stat-label">OUT OF STOCK</span><strong>{out}</strong><small>Zero available units</small></article>
    </section>
    <section className="admin-panel product-table-panel">
      <div className="admin-panel-heading"><div><span className="admin-eyebrow">CATALOG INVENTORY</span><h3>Products <span className="count-chip">{filtered.length}</span></h3></div><span className="admin-section-note">SOURCE: {live ? 'SUPABASE' : 'LOCAL TYPESCRIPT (FALLBACK)'}</span></div>
      <form className="product-filter-bar" action="/admin/products">
        <label className="product-search"><Search size={16}/><input name="q" defaultValue={params.q} placeholder="Search product, SKU, or ID..." /></label>
        <select name="category" defaultValue={params.category ?? ''} aria-label="Filter category"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name.en}</option>)}</select>
        <select name="status" defaultValue={params.status ?? ''} aria-label="Filter stock"><option value="">All states</option><option value="available">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="draft">Draft (unpublished)</option></select>
        <button type="submit" className="admin-button secondary"><SlidersHorizontal size={15}/> Filter</button>
      </form>
      <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>PRODUCT</th><th>SKU / ID</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th>{live ? <th>ACTIONS</th> : null}</tr></thead><tbody>
        {filtered.map(p => <tr key={p.id}><td><div className="product-name-cell"><span className="product-thumb">{p.imageUrl ? <Image src={p.imageUrl} alt="" width={36} height={36} /> : <Package size={18}/>}</span><span><b>{p.name.en}</b><small>{p.slug}</small></span></div></td><td><code>{p.id.toUpperCase()}</code></td><td>{categoryNames[p.category] ?? p.category}</td><td className="price-cell">{money(p.priceIdr)}</td><td><b>{p.stock}</b> <small>units</small></td><td>{p.published === false ? <span className="stock-badge warning">Draft</span> : p.stock === 0 ? <span className="stock-badge danger">Out of stock</span> : p.stock <= 5 ? <span className="stock-badge warning">Low stock</span> : <span className="stock-badge success">In stock</span>}</td>{live ? <td><div className="pm-row-actions"><Link href={`/admin/products?edit=${p.id}`} className="admin-button secondary">Edit</Link><DeleteProductForm id={p.id} name={p.name.en} /></div></td> : null}</tr>)}
        {!filtered.length ? <tr><td colSpan={live ? 7 : 6} className="table-empty">No products match these filters.</td></tr> : null}
      </tbody></table></div>
      <div className="admin-table-foot"><span>Showing {filtered.length} of {products.length} catalog items</span><span>{live ? 'Live data' : 'Read-only preview'}</span></div>
    </section>
  </main>
}
