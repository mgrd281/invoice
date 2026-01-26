'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, LogOut, User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/hooks/use-auth-compat'

export function EnterpriseHeader() {
    const { user, logout } = useAuth()

    return (
        <header className="w-full bg-[#0B0D12] border-b border-white/10 flex items-center justify-between px-5 h-[44px] sm:h-[56px] fixed top-0 left-0 z-50">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="bg-white/10 p-1.5 rounded-md group-hover:bg-white/20 transition-colors">
                        <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm hidden sm:block tracking-tight">
                        RechnungsProfi
                    </span>
                    <span className="text-white/40 font-normal text-xs hidden sm:block border-l border-white/10 pl-2 ml-2">
                        {user?.isAdmin ? 'Admin' : 'Dashboard'}
                    </span>
                </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-2 text-white/70 hover:text-white transition-colors cursor-default">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                            {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-medium hidden sm:block">{user.email}</span>
                    </div>
                )}

                <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    title="Abmelden"
                >
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>
        </header>
    )
}
