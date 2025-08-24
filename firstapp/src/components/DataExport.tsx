'use client'

import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DataExportProps {
  data: any
  filename?: string
}

export default function DataExport({ data, filename = 'dashboard-data' }: DataExportProps) {
  const [isOpen, setIsOpen] = useState(false)

  const exportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  const exportCSV = () => {
    // メインの統計データをCSVに変換
    const csvData: string[] = []
    
    // ヘッダー
    csvData.push('Metric,Value,Percentage')
    
    // 基本統計
    if (data.overview) {
      csvData.push(`Total Contacts,${data.overview.totalContacts},`)
      csvData.push(`Total Companies,${data.overview.totalCompanies},`)
      csvData.push(`With Email,${data.overview.contactsWithEmail},${data.overview.emailPercentage}%`)
      csvData.push(`With Phone,${data.overview.contactsWithPhone},${data.overview.phonePercentage}%`)
      csvData.push(`With Business Card,${data.overview.contactsWithBusinessCard},${data.overview.businessCardPercentage}%`)
      csvData.push(`OCR Processed,${data.overview.ocrContacts},${data.overview.ocrPercentage}%`)
    }
    
    // 月別データ
    if (data.monthlyRegistrations) {
      csvData.push('')
      csvData.push('Month,Registrations')
      data.monthlyRegistrations.forEach((month: any) => {
        csvData.push(`${month.displayMonth},${month.count}`)
      })
    }
    
    const csvString = csvData.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/10 text-white transition-all duration-200"
      >
        <Download className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium">Export</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 z-20 mt-2 w-48 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-1">
                <button
                  onClick={exportJSON}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  Export as JSON
                </button>
                <button
                  onClick={exportCSV}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  Export as CSV
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}