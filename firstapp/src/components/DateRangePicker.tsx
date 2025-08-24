'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const presetRanges: DateRange[] = [
  {
    label: 'Today',
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  },
  {
    label: 'Last 7 Days',
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  {
    label: 'Last 30 Days',
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  {
    label: 'Last 3 Months',
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  {
    label: 'Last 6 Months',
    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  {
    label: 'Last Year',
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  {
    label: 'All Time',
    start: new Date(2020, 0, 1),
    end: new Date()
  }
]

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/10 text-white transition-all duration-200"
      >
        <Calendar className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium">{value.label}</span>
        <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                {presetRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => {
                      onChange(range)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      value.label === range.label
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}