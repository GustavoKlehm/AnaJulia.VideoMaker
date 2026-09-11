import { useRoute } from './lib/router'
import { HomePage } from './pages/HomePage'
import { PlanosPage } from './pages/PlanosPage'

export default function App() {
  const route = useRoute()

  return route === 'planos' ? <PlanosPage /> : <HomePage />
}
