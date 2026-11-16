# Cara menyambungkan Vercel ↔ Supabase (urutan wajib)

## 0. Kenapa sebelumnya "Authentication is not configured"
Kode membaca `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Di Vercel tidak ada variabel dengan nama persis itu
(yang ada nama menempel `NEXT_PUBLIC_SUPABASE_URLSUPABASE_ANON_KEY`). Versi ini menerima semua nama dari integrasi
(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, dst.), jadi variabel yang sudah ada langsung terbaca.
Migration SQL juga belum pernah dijalankan, jadi tabel `profiles`, `user_roles`, `products`, dst. belum ada.

## 1. Environment Variables (Vercel → Settings → Environment Variables)
Minimal yang dipakai:
| Nama | Wajib | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` **atau** `SUPABASE_URL` | ya | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` **atau** `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` | ya | |
| `SUPABASE_SERVICE_ROLE_KEY` **atau** `SUPABASE_SECRET_KEY` | ya | server only, jangan pakai prefix `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | sangat disarankan | domain produksi, mis. `https://namamu.vercel.app` |
| `SUPABASE_OWNER_USER_ID` | langkah 5 | UUID akunmu |
| `APP_ENV`, `SECURITY_IP_HASH_SALT` | opsional | `lab` / string acak panjang |

`POSTGRES_*` dan `SUPABASE_JWT_SECRET` tidak dipakai kode ini. Variabel baru **baru berlaku setelah Redeploy**.
Rapikan juga dua variabel bernama menempel itu: hapus, lalu tambah ulang sebagai dua variabel terpisah.

## 2. Jalankan SQL (sekali)
Supabase → SQL Editor → New query → tempel seluruh isi `supabase/APPLY_ALL.sql` → Run. Aman diulang.
Isinya: profiles, user_roles, role_permissions, audit_logs, security_events, profile_details, **products (+36 produk demo)**, bucket gambar `product-images`.

## 3. Pengaturan Auth di Supabase
- Authentication → Sign In / Providers → Email: **ON**, **Confirm email ON** (kode menolak register kalau OFF).
- Authentication → URL Configuration: Site URL = domain produksimu; Redirect URLs tambah `https://domainmu/auth/callback`
  (tambah juga `https://*-namaproject.vercel.app/auth/callback` kalau mau tes di preview).
- Password minimum length: 10.

## 4. Cek koneksi
Buka `https://domainmu/api/health`. Semua `tables` harus `true`, `authServerReachable: true`, `serviceRoleWorks: true`.
Field `hints` memberi tahu apa yang masih kurang. (Hanya berisi true/false dan nama variabel, tidak ada nilai rahasia.)

## 5. Jadi Owner/Admin
1. Register akun di website → klik link konfirmasi di email.
2. Supabase → Authentication → Users → salin UUID akunmu → isi `SUPABASE_OWNER_USER_ID` di Vercel → Redeploy.
3. Login → otomatis jadi Owner → tombol Admin muncul → `/admin/products`.

## 6. Yang sekarang tersimpan ke database
- Register / login / reset password → Supabase Auth + `profiles` + `user_roles`
- Settings akun → `profiles`, `profile_details`
- Ubah role → `user_roles` (+ `audit_logs`)
- **Admin → Products: tambah / edit / hapus / upload gambar → tabel `products` + Storage `product-images` (+ `audit_logs`)**
- Toko membaca produk dari `products` (draft hanya terlihat admin)

Masih demo (belum ke database): keranjang (localStorage) dan checkout/order (`DEMO-…`).
