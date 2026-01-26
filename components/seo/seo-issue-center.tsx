'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search, Filter, ArrowUpDown, ChevronRight,
    Zap, ExternalLink, Trash2, Info, Eye,
    ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeoIssue, SeoSeverity, SeoCategory } from '@/types/seo-types'

interface SeoIssueCenterProps {
    issues: SeoIssue[]
    onFixIssue: (issueId: string) => void
    onBulkFix: (issueIds: string[]) => void
}

export function SeoIssueCenter({ issues, onFixIssue, onBulkFix }: SeoIssueCenterProps) {
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
    const [filterSeverity, setFilterSeverity] = useState<SeoSeverity | 'All'>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRows, setSelectedRows] = useState<string[]>([])

    const filteredIssues = issues.filter(issue => {
        const matchesSeverity = filterSeverity === 'All' || issue.severity === filterSeverity
        const matchesSearch = issue.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
            issue.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSeverity && matchesSearch
    })

    const selectedIssue = issues.find(i => i.id === selectedIssueId)

    const toggleRow = (id: string) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id])
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 h-[calc(100vh-250px)]">
            {/* Left Sidebar Filters */}
            <div className="w-full lg:w-64 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Filter nach Priorität</h3>
                    <div className="space-y-1">
                        {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                            <button
                                key={sev}
                                onClick={() => setFilterSeverity(sev as any)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    filterSeverity === sev ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-white hover:text-slate-900"
                                )}
                            >
                                <span>{sev === 'Critical' ? 'Kritisch' : sev}</span>
                                <Badge variant="outline" className={cn(
                                    "text-[9px] border-none",
                                    filterSeverity === sev ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
                                )}>
                                    {sev === 'All' ? issues.length : issues.filter(i => i.severity === sev).length}
                                </Badge>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Kategorie</h3>
                    <div className="space-y-2 px-2">
                        {['Technical', 'On-Page', 'Content', 'Performance'].map((cat) => (
                            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                                <div className="w-4 h-4 rounded border border-slate-200 group-hover:border-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content: Table */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden flex-1 flex flex-col">
                    <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-4 flex-1 max-w-md">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs font-medium"
                                    placeholder="Suche nach URLs oder Problemen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        {selectedRows.length > 0 && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">{selectedRows.length} ausgewählt</span>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 text-white font-black text-[10px] uppercase h-8 px-4 rounded-lg"
                                    onClick={() => onBulkFix(selectedRows)}
                                >
                                    Bulk Auto-Fix
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-200"
                                            onChange={(e) => setSelectedRows(e.target.checked ? filteredIssues.map(i => i.id) : [])}
                                            checked={selectedRows.length === filteredIssues.length && filteredIssues.length > 0}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">URL / Resource</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Problem</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Priorität</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Fix Typ</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredIssues.map((issue) => (
                                    <tr
                                        key={issue.id}
                                        className={cn(
                                            "group cursor-pointer hover:bg-slate-50 transition-colors",
                                            selectedIssueId === issue.id && "bg-slate-50/80"
                                        )}
                                        onClick={() => setSelectedIssueId(issue.id)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-200"
                                                checked={selectedRows.includes(issue.id)}
                                                onChange={() => toggleRow(issue.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="text-xs font-black text-slate-900 truncate">{issue.url}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{issue.resourceType}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-bold text-slate-600 truncate block max-w-[250px]">{issue.title}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase border-none",
                                                issue.severity === 'Critical' ? "bg-red-100 text-red-600" :
                                                    issue.severity === 'High' ? "bg-orange-100 text-orange-600" :
                                                        issue.severity === 'Medium' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {issue.severity}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    issue.fixType === 'auto' ? "bg-emerald-500" : "bg-orange-500"
                                                )} />
                                                <span className="text-[9px] font-black uppercase text-slate-500">{issue.fixType}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className={cn(
                                                "w-4 h-4 text-slate-300 transition-all",
                                                selectedIssueId === issue.id && "translate-x-1 text-slate-900"
                                            )} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Right Details Panel */}
            {selectedIssue && (
                <div className="w-full lg:w-96 animate-in slide-in-from-right-4 duration-300">
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden sticky top-0 h-fit">
                        <CardHeader className="bg-slate-900 text-white p-6">
                            <div className="flex justify-between items-start mb-2">
                                <Badge className="bg-white/10 text-white border-none text-[9px] font-black uppercase tracking-widest">
                                    {selectedIssue.category}
                                </Badge>
                                <button onClick={() => setSelectedIssueId(null)} className="text-white/40 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <CardTitle className="text-lg font-black uppercase leading-tight">{selectedIssue.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Beschreibung</p>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">{selectedIssue.issue}</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-slate-900">Empfohlener Fix</p>
                                </div>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                                    "{selectedIssue.recommendation}"
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 border-none"
                                    onClick={() => onFixIssue(selectedIssue.id)}
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    {selectedIssue.fixType === 'auto' ? 'JETZT AUTO-FIXEN' : 'MANUELL BEHEBEN'}
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 h-10 border-slate-100 font-black text-[9px] uppercase tracking-widest rounded-xl">
                                        SHOP-VORSCHAU
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1 h-10 border-slate-100 font-black text-[9px] uppercase tracking-widest rounded-xl">
                                        IGNORIEREN
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

function X(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
