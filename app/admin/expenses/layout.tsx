import { ReactNode } from "react";

export default function ExpensesLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Ausgaben (Expenses)</h2>
                </div>
                {children}
            </div>
        </div>
    );
}
