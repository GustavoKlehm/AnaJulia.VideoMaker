import { CmsProvider } from './content/CmsProvider'
import { entregaToken, useRoute } from './lib/router'
import { EntregaPage } from './pages/entrega/EntregaPage'
import { HomePage } from './pages/HomePage'
import { PlanosPage } from './pages/PlanosPage'
import { EstudioApp } from './pages/estudio/EstudioApp'
import { PortalApp } from './pages/cliente/PortalApp'

export default function App() {
  const route = useRoute()

  // A área do cliente não usa o conteúdo do site: fica fora do CMS.
  if (route === 'cliente') {
    return <PortalApp />
  }

  // Link de entrega: público, sem login e sem o conteúdo do site.
  const token = route === 'entrega' ? entregaToken(window.location.pathname.replace(/\/+$/, '')) : null
  if (token) {
    return <EntregaPage key={token} token={token} />
  }

  return (
    <CmsProvider>
      {route === 'estudio' ? (
        <EstudioApp />
      ) : route === 'planos' ? (
        <PlanosPage />
      ) : (
        <HomePage />
      )}
    </CmsProvider>
  )
}
