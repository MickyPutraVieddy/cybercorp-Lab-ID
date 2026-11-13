'use client'

import Link from './static-link'
import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, HelpCircle, Leaf, MapPin } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'

export type InfoPageKind = 'about' | 'careers' | 'help' | 'privacy' | 'terms'

const copy = {
  about: {
    en: { eyebrow: 'A SMALL OUTDOOR GOODS IDEA', title: 'A little more room to wander.', lead: 'Let’s Test It is a fictional outdoor and travel gear company built around a simple idea: useful things should make it easier to go a little farther.', sections: [['Useful by nature', 'We favour clear details, considered materials, and equipment that earns its place in a pack. The catalog and policies on this site are illustrative prototype content.'], ['For the in-between moments', 'The first coffee outside, a slower route home, the unexpected extra night. That is where good gear quietly helps.'], ['A note on this preview', 'This storefront is a visual and interaction prototype. Product names, prices, reviews, shipping promises, and company policies are synthetic and are not offers for sale.']] },
    id: { eyebrow: 'IDE PERLENGKAPAN LUAR RUANG', title: 'Ruang lebih untuk menjelajah.', lead: 'Let’s Test It adalah konsep perusahaan perlengkapan luar ruang dan perjalanan fiktif dengan gagasan sederhana: barang yang berguna membuat perjalanan lebih leluasa.', sections: [['Berguna dengan sendirinya', 'Kami mengutamakan detail yang jelas, material terpilih, dan perlengkapan yang layak dibawa. Katalog dan kebijakan di situs ini hanya contoh prototipe.'], ['Untuk momen di perjalanan', 'Kopi pertama di luar, jalan pulang yang lebih santai, atau malam tambahan yang tak direncanakan. Perlengkapan yang tepat membantu dengan sederhana.'], ['Catatan pratinjau', 'Toko ini adalah prototipe visual dan interaksi. Nama produk, harga, ulasan, janji pengiriman, dan kebijakan perusahaan bersifat sintetis dan bukan penawaran penjualan.']] },
  },
  careers: {
    en: { eyebrow: 'WORK WITH A LITTLE MORE OUTSIDE', title: 'Bring your point of view.', lead: 'We are a fictional team in a prototype storefront. These example roles are here to show the careers experience, not to advertise open positions.', sections: [['Field tester', 'Help imagine what gear should do on slow weekends, rough weather, and the long way back. Example role only.'], ['Materials researcher', 'Explore practical materials and the details that help useful objects last. Example role only.'], ['Community storyteller', 'Share thoughtful routes and the people who make time outdoors feel welcoming. Example role only.']] },
    id: { eyebrow: 'BEKERJA LEBIH DEKAT DENGAN ALAM', title: 'Bawa sudut pandangmu.', lead: 'Kami adalah tim fiktif dalam prototipe toko. Posisi contoh ini hanya untuk menunjukkan halaman karier, bukan lowongan kerja sungguhan.', sections: [['Penguji lapangan', 'Membayangkan fungsi perlengkapan untuk akhir pekan, cuaca berubah, dan rute pulang yang lebih jauh. Posisi contoh.'], ['Peneliti material', 'Menjelajahi material praktis dan detail yang membantu barang berguna bertahan lebih lama. Posisi contoh.'], ['Pencerita komunitas', 'Berbagi jalur dan kisah orang-orang yang membuat aktivitas luar ruang terasa ramah. Posisi contoh.']] },
  },
  help: {
    en: { eyebrow: 'A FEW USEFUL ANSWERS', title: 'How can we help?', lead: 'This help center is part of a storefront prototype. Nothing here connects to a real order, carrier, or support desk.', sections: [['Shipping & delivery', 'The delivery options and timeframes shown at checkout are sample values. No shipment is created.'], ['Returns', 'The return language used in this preview is illustrative only. There is no live returns process.'], ['Products & availability', 'Stock counts, specifications, and reviews are synthetic demo data, not live inventory or verified customer feedback.']] },
    id: { eyebrow: 'JAWABAN YANG MUNGKIN BERGUNA', title: 'Ada yang bisa dibantu?', lead: 'Pusat bantuan ini bagian dari prototipe toko. Tidak ada koneksi ke pesanan, kurir, atau layanan pelanggan sungguhan.', sections: [['Pengiriman', 'Pilihan dan estimasi waktu yang tampil saat checkout hanya contoh. Tidak ada pengiriman yang dibuat.'], ['Pengembalian', 'Kebijakan pengembalian di pratinjau ini hanya ilustrasi. Belum ada proses pengembalian aktif.'], ['Produk & ketersediaan', 'Stok, spesifikasi, dan ulasan adalah data demo sintetis, bukan inventaris langsung atau masukan pelanggan terverifikasi.']] },
  },
  privacy: {
    en: { eyebrow: 'A CLEAR NOTE', title: 'Privacy, in plain language.', lead: 'This prototype does not have a server or submit form data anywhere. The only browser storage used is for demo cart, language, and currency preferences.', sections: [['Local browser storage', 'The bag, selected language, and currency may be saved in this browser so the prototype can be tested across page visits. Clear this site’s browser storage to remove them.'], ['Forms', 'Newsletter and contact forms only show an on-screen demo response. Do not enter sensitive or confidential information. The prototype does not send the entries to a business or support team.'], ['Before a real launch', 'This sample notice is not legal advice. A real storefront would need a privacy review, data-retention policy, and jurisdiction-specific disclosures before launch.']] },
    id: { eyebrow: 'CATATAN YANG JELAS', title: 'Privasi dengan bahasa sederhana.', lead: 'Prototipe ini tidak memiliki server dan tidak mengirim data formulir ke mana pun. Penyimpanan browser hanya digunakan untuk tas demo, pilihan bahasa, dan mata uang.', sections: [['Penyimpanan browser lokal', 'Tas, bahasa, dan mata uang dapat disimpan di browser ini agar prototipe bisa diuji antarhalaman. Hapus penyimpanan situs di browser untuk menghapusnya.'], ['Formulir', 'Formulir newsletter dan kontak hanya menampilkan respons demo di layar. Jangan masukkan informasi sensitif atau rahasia. Isian tidak dikirim ke bisnis atau tim dukungan.'], ['Sebelum peluncuran nyata', 'Contoh pemberitahuan ini bukan nasihat hukum. Toko sungguhan memerlukan tinjauan privasi, kebijakan penyimpanan data, dan pengungkapan sesuai wilayah sebelum diluncurkan.']] },
  },
  terms: {
    en: { eyebrow: 'THE SHORT VERSION', title: 'Terms for this preview.', lead: 'This is a fictional prototype and not a live shop. No product is offered for sale, and no order, payment, or delivery can be completed.', sections: [['Illustrative content', 'Product information, prices, stock, reviews, delivery options, policies, and confirmation references are synthetic demonstration content and may not describe a real product or service.'], ['No purchase or account', 'The site does not process payment, create customer accounts, or submit a real order. Do not enter payment details or sensitive personal information.'], ['Before a real launch', 'These sample terms are not legal advice. A real business should have counsel review final terms, pricing, consumer rights, and regional requirements.']] },
    id: { eyebrow: 'RINGKASNYA', title: 'Ketentuan pratinjau ini.', lead: 'Ini prototipe fiktif, bukan toko aktif. Tidak ada produk yang dijual dan pesanan, pembayaran, atau pengiriman tidak dapat diselesaikan.', sections: [['Konten ilustratif', 'Informasi produk, harga, stok, ulasan, opsi pengiriman, kebijakan, dan referensi konfirmasi adalah konten demo sintetis dan mungkin tidak menggambarkan produk atau layanan nyata.'], ['Tanpa pembelian atau akun', 'Situs ini tidak memproses pembayaran, membuat akun pelanggan, atau mengirim pesanan sungguhan. Jangan masukkan detail pembayaran atau informasi pribadi yang sensitif.'], ['Sebelum peluncuran nyata', 'Contoh ketentuan ini bukan nasihat hukum. Bisnis sungguhan perlu meminta tinjauan penasihat hukum terhadap syarat, harga, hak konsumen, dan persyaratan wilayah.']] },
  },
} as const

export function InfoScreen({ kind }: { kind: InfoPageKind }) {
  const { language, t } = useStore()
  const page = copy[kind][language]
  return (
    <main id="main-content" className="page-wrap">
      <article className="info-page">
        <div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t(kind)}</span></div>
        <span className="eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p className="lead">{page.lead}</p>
        <div className="info-content">
          {page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
          {kind === 'help' && <section id="shipping"><h2>{language === 'id' ? 'Pertanyaan umum' : 'Frequently asked questions'}</h2><div className="info-card-grid">
            <details className="info-card"><summary>{language === 'id' ? 'Apakah pesanan demo benar-benar dikirim?' : 'Will a demo order actually ship?'}</summary><p>{language === 'id' ? 'Tidak. Konfirmasi dan pelacakan hanya simulasi.' : 'No. Confirmation and tracking are simulations only.'}</p></details>
            <details className="info-card"><summary>{language === 'id' ? 'Apakah ini foto produk asli?' : 'Are these real product photos?'}</summary><p>{language === 'id' ? 'Tidak. Karya visual merupakan ilustrasi kategori asli; foto produk akan ditambahkan kemudian.' : 'No. Artwork here is original category illustration; product photography may be added later.'}</p></details>
          </div></section>}
          {kind === 'about' && <div className="info-card-grid"><div className="info-card"><Leaf aria-hidden="true" size={20} /><h2>{language === 'id' ? 'Ruang untuk alam' : 'More outside'}</h2><p>{language === 'id' ? 'Konsep merek untuk perjalanan yang dijalani dengan perlahan.' : 'A brand idea for journeys taken at a human pace.'}</p></div><div className="info-card"><MapPin aria-hidden="true" size={20} /><h2>{language === 'id' ? 'Berangkat dari mana saja' : 'Start anywhere'}</h2><p>{language === 'id' ? 'Petualangan bisa dimulai jauh dari jalur yang sudah dikenal.' : 'A little adventure can start far from a well-known trail.'}</p></div></div>}
          {kind === 'help' && <p><HelpCircle aria-hidden="true" size={15} /> <Link className="text-link" href="/contact">{t('contactUs')} <ArrowRight aria-hidden="true" size={14} /></Link></p>}
          {kind === 'careers' && <p className="review-note">{language === 'id' ? 'Posisi contoh, bukan lowongan aktif.' : 'Example roles only; no current openings are being advertised.'}</p>}
        </div>
      </article>
    </main>
  )
}

export function ContactScreen() {
  const { language, t } = useStore()
  const [submitted, setSubmitted] = useState(false)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main id="main-content" className="page-wrap">
      <article className="info-page">
        <div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t('contact')}</span></div>
        <span className="eyebrow">{t('teamNoteEyebrow')}</span>
        <h1>{t('contactUs')}</h1>
        <p className="lead">{language === 'id' ? 'Tinggalkan pesan contoh. Tidak ada email yang dikirim dan tidak ada tiket dukungan yang dibuat.' : 'Leave a sample note. No email is sent and no support ticket is created.'}</p>
        <div className="simulation-banner mt-6"><HelpCircle aria-hidden="true" size={18} /><span>{language === 'id' ? 'Jangan masukkan data pribadi atau informasi rahasia.' : 'Please do not include personal or confidential information.'}</span></div>
        {submitted ? <p className="success-message mt-6" role="status">{t('contactSuccess')}</p> : (
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="contact-topic">{language === 'id' ? 'Topik' : 'Topic'}
              <select className="form-control" id="contact-topic" defaultValue="product"><option value="product">{language === 'id' ? 'Pertanyaan produk' : 'Product question'}</option><option value="journey">{language === 'id' ? 'Ide perjalanan' : 'Travel idea'}</option><option value="other">{language === 'id' ? 'Lainnya' : 'Something else'}</option></select>
            </label>
            <label className="form-label" htmlFor="contact-message">{t('message')}
              <textarea className="form-control" id="contact-message" maxLength={500} required placeholder={language === 'id' ? 'Tulis pesan contoh (maks. 500 karakter)' : 'Write a sample note (max 500 characters)'} />
            </label>
            <p className="form-hint">{language === 'id' ? 'Isi hanya digunakan untuk menampilkan konfirmasi demo dan tidak disimpan.' : 'Your message is only used to show a demo confirmation and is not saved.'}</p>
            <Button type="submit" className="store-button min-h-11 w-fit rounded-full px-6">{t('sendMessage')} <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
          </form>
        )}
        <p className="form-hint mt-8">{language === 'id' ? 'Jam dukungan dan alamat fisik belum ditentukan untuk konsep fiktif ini.' : 'Support hours and a physical address are not established for this fictional concept.'}</p>
      </article>
    </main>
  )
}

export function InfoLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={buttonVariants({ variant: 'outline', className: 'min-h-11 rounded-full px-5' })} href={href}>{children}</Link>
}
