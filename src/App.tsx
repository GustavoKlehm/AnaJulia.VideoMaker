import { Assistente } from './components/Assistente'
import { CmsProvider } from './content/CmsProvider'
import { assistenteVisible, useRoute } from './lib/router'
import { HomePage } from './pages/HomePage'
import { PlanosPage } from './pages/PlanosPage'
import { EstudioApp } from './pages/estudio/EstudioApp'

export default function App() {
  const route = useRoute()

  return (
    <CmsProvider>
      {route === 'estudio' ? (
        <EstudioApp />
      ) : route === 'planos' ? (
        <PlanosPage />
      ) : (
        <HomePage />
      )}
      {assistenteVisible(route) ? <Assistente /> : null}
    </CmsProvider>
  )
}
