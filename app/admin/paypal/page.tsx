'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { Euro, CreditCard, Activity, AlertCircle } from "lucide-react";

export default function PayPalDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidToday: 0,
    successCount: 0,
    failedCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetch('/api/paypal/transactions')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) {
              const total = data.reduce((acc: number, tx: any) => acc + Number(tx.amount || 0), 0);
              const success = data.filter((tx: any) => tx.status === 'COMPLETED').length;
              const failed = data.filter((tx: any) => tx.status !== 'COMPLETED').length;
              setStats({
                  totalRevenue: total,
                  paidToday: 0,
                  successCount: success,
                  failedCount: failed
              });
          }
      })
      .catch(err => console.error(err));
  };

  const handleSync = async () => {
      try {
          const res = await fetch('/api/paypal/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sync_history' })
          });
          if (res.ok) {
              loadData();
              alert('Synchronisation erfolgreich!'); 
          }
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
          <button onClick={handleSync} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
             🔄 Jetzt synchronisieren
          </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gesamtumsatz
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Über PayPal empfangen
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Erfolgreiche Zahlungen
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fehlgeschlagen / Offen
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktivität
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0%</div>
            <p className="text-xs text-muted-foreground">
              zur Vorwoche
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Umsatzverlauf</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                 Chart Placeholder
             </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Letzte Transaktionen</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                     {/* List simplified items */}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
