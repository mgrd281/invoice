'use client'

import { useState } from 'react'
import { CSVData, ColumnMapping } from '../types'
import { Button } from '@/components/ui/button'

interface MappingStepProps {
  data: CSVData
  onComplete: (mappings: ColumnMapping[]) => void
  onBack: () => void
}

export function MappingStep({ data, onComplete, onBack }: MappingStepProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spalten zuweisen</h2>
        <p className="text-gray-500">Wir haben versucht, Ihre Spalten automatisch zuzuordnen.</p>
      </div>

      <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex items-center justify-center text-gray-400">
        Mapping UI Placeholder (Coming in Step 2 of Implementation)
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack}>Zurück</Button>
        <Button onClick={() => onComplete([])}>Weiter zur Prüfung</Button>
      </div>
    </div>
  )
}
