import { FolderCheck } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'

export default function AppHeader({ sidebar, account, status }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        {sidebar}
        <FolderCheck className="brand-mark" size={26} strokeWidth={1.65} aria-hidden="true" />
        <h1>Nothi AI</h1>
        <span className="brand-bangla" lang="bn">নথি এআই</span>
      </div>
      <div className={account ? 'header-tools signed-in-tools' : 'header-tools'}>
        <p className={status === 'API connected' ? 'api-status connected' : 'api-status'} role="status">
          <span>{status}</span>
        </p>
        <ThemeToggle />
        {account}
      </div>
    </header>
  )
}
