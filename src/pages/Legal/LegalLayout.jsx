import { Link } from 'react-router-dom'

function LegalLayout({ title, subtitle, updatedAt, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-[#16120e] dark:via-[#15110d] dark:to-[#120e0b]">
      <section className="border-b border-primary-200/70 dark:border-[#382c22] bg-white/80 dark:bg-[#1a140f]/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700 dark:text-gold-300">Legal</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-primary-900 dark:text-[#f3e8d9]">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm sm:text-base text-primary-600 dark:text-[#cfbca4]">{subtitle}</p>
          )}
          <p className="mt-3 text-xs text-primary-500 dark:text-[#ab967c]">Derniere mise a jour: {updatedAt}</p>
        </div>
      </section>

      <section>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <article className="rounded-2xl border border-primary-200 dark:border-[#46382a] bg-white dark:bg-[#1d1712] p-5 sm:p-7 shadow-sm">
            <div className="prose prose-sm sm:prose-base max-w-none prose-headings:text-primary-900 prose-p:text-primary-700 prose-li:text-primary-700 dark:prose-headings:text-[#f3e8d9] dark:prose-p:text-[#cfbca4] dark:prose-li:text-[#cfbca4]">
              {children}
            </div>
          </article>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/legal/conditions-utilisation" className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary-200 dark:border-[#46382a] text-primary-700 dark:text-[#cfbca4] hover:bg-primary-50 dark:hover:bg-[#292018]">
              Conditions
            </Link>
            <Link to="/legal/confidentialite" className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary-200 dark:border-[#46382a] text-primary-700 dark:text-[#cfbca4] hover:bg-primary-50 dark:hover:bg-[#292018]">
              Confidentialite
            </Link>
            <Link to="/legal/mentions-legales" className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary-200 dark:border-[#46382a] text-primary-700 dark:text-[#cfbca4] hover:bg-primary-50 dark:hover:bg-[#292018]">
              Mentions
            </Link>
            <Link to="/legal/cgv" className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary-200 dark:border-[#46382a] text-primary-700 dark:text-[#cfbca4] hover:bg-primary-50 dark:hover:bg-[#292018]">
              CGV
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LegalLayout

