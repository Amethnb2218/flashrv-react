// Design System Ｓｔｙｌｅ Ｆｌｏｗ Dashboard (Premium SaaS)
// Utilise Tailwind CSS (palette customisée dans tailwind.config.js)

export const styleflowDesignSystem = {
  colors: {
    primary: 'bg-blue-50 text-blue-800',
    secondary: 'bg-white text-blue-700',
    accent: 'bg-gradient-to-br from-blue-100 via-white to-blue-50',
    border: 'border border-blue-100',
    shadow: 'shadow-[0_4px_24px_0_rgba(16,112,202,0.06)]',
    status: {
      pending: 'bg-yellow-50 text-yellow-700',
      approved: 'bg-green-50 text-green-700',
      suspended: 'bg-gray-100 text-gray-500',
    },
    badge: 'bg-blue-100 text-blue-700',
    tableHeader: 'bg-blue-50 text-blue-700',
    tableRow: 'bg-white text-blue-700',
    hover: 'hover:bg-blue-100',
  },
  radius: {
    card: 'rounded-3xl',
    button: 'rounded-xl',
    input: 'rounded-xl',
    table: 'rounded-2xl',
    badge: 'rounded-full',
  },
  shadow: {
    card: 'shadow-[0_4px_24px_0_rgba(16,112,202,0.06)]',
    button: 'shadow-sm',
    input: 'shadow',
  },
  font: {
    title: 'font-montserrat font-extrabold',
    subtitle: 'font-inter font-semibold',
    body: 'font-inter font-normal',
    badge: 'font-montserrat font-bold',
    tableHeader: 'font-montserrat font-bold',
    tableCell: 'font-inter font-medium',
  },
  spacing: {
    card: 'p-8 md:p-10',
    section: 'mb-12',
    table: 'py-3 px-4',
    header: 'mb-6',
  },
  button: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50',
    icon: 'inline-flex items-center gap-2',
  },
  input: {
    base: 'bg-blue-50 border border-blue-100 text-blue-700 placeholder:text-blue-300 focus:bg-white focus:border-blue-400',
    search: 'pl-10 pr-4 py-3',
  },
};
