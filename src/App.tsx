import { CmsProvider } from './content/CmsProvider'
import { useRoute } from './lib/router'
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
