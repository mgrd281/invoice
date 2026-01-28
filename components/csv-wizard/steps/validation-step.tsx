'use client'

import { CSVData, ColumnMapping } from '../types'
import { Button } from '@/components/ui/button'

interface ValidationStepProps {
  data: CSVData
  mappings: ColumnMapping[]
  onComplete: () => void
  onBack: () => void
}

export function ValidationStep({ data, mappings, onComplete, onBack }: ValidationStepProps) {
  return (
    <div className="flex flex-col h-full">
         <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daten überprüfen</h2>
        <p className="text-gray-500">Korrigieren Sie Fehler direkt in der Tabelle.</p>
      </div>

      <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex items-center justify-center text-gray-400">
        Editable Grid Placeholder (Coming in Step 3 of Implementation)
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack}>Zurück</Button>
        <Button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-700">Import abschließen</Button>
      </div>
    </div>
  )
}
