import { redirect } from 'next/navigation'

// The register form now lives on the intro page (/).
export default function RegisterPage() {
  redirect('/?mode=register')
}
