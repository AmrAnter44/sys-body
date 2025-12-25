'use client'

import { ReactNode } from 'react'
import { AdminDateProvider } from '../contexts/AdminDateContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import Navbar from './Navbar'
import { PreventInputScroll } from '../app/PreventInputScroll'

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AdminDateProvider>
        <PreventInputScroll />
        <Navbar />
        <main>{children}</main>
      </AdminDateProvider>
    </LanguageProvider>
  )
}
