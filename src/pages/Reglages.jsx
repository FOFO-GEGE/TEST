import ComptesSection from '../components/ComptesSection.jsx'
import CategoriesSection from '../components/CategoriesSection.jsx'

export default function Reglages() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold text-slate-100">Réglages</h1>
      <ComptesSection />
      <CategoriesSection />
    </div>
  )
}
