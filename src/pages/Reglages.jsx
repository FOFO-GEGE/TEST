import ComptesSection from '../components/ComptesSection.jsx'
import CategoriesSection from '../components/CategoriesSection.jsx'
import SeuilAlerteSection from '../components/SeuilAlerteSection.jsx'
import BackupSection from '../components/BackupSection.jsx'

export default function Reglages() {
  return (
    <div className="space-y-6 p-5">
      <h1 className="font-display text-3xl italic text-ink">Réglages</h1>
      <ComptesSection />
      <CategoriesSection />
      <SeuilAlerteSection />
      <BackupSection />
    </div>
  )
}
