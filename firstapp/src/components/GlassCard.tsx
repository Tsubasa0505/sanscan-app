'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  index?: number
  className?: string
  gradient?: 'blue' | 'cyan' | 'indigo' | 'purple'
}

const gradients = {
  blue: 'from-blue-500/10 to-cyan-500/10',
  cyan: 'from-cyan-500/10 to-teal-500/10',
  indigo: 'from-indigo-500/10 to-blue-500/10',
  purple: 'from-purple-500/10 to-indigo-500/10'
}

export default function GlassCard({ 
  children, 
  index = 0, 
  className = '',
  gradient = 'blue'
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        scale: 1.02, 
        transition: { duration: 0.2 }
      }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ease: [0.23, 1, 0.32, 1]
      }}
      className={`relative group ${className}`}
    >
      {/* グラデーション背景 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradient]} rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300`} />
      
      {/* グラスエフェクト */}
      <div className="relative bg-white/5 dark:bg-slate-900/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-white/5 shadow-2xl overflow-hidden">
        {/* 光の反射エフェクト */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
        
        {children}
      </div>
    </motion.div>
  )
}