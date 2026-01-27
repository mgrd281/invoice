'use client';

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

export default function PayPalSettingsPage() {
  const [config, setConfig] = useState({
      clientId: '',
      clientSecret: '',
      isActive: false
  });

  const handleSave = async () => {
      // TODO: Implement save API
      toast.success("Einstellungen gespeichert (Mock)");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verbindungseinstellungen</CardTitle>
          <CardDescription>
            Konfigurieren Sie hier Ihre PayPal API Zugangsdaten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center space-x-2">
              <Switch 
                id="active" 
                checked={config.isActive}
                onCheckedChange={(c) => setConfig({...config, isActive: c})}
              />
              <Label htmlFor="active">PayPal Integration aktivieren</Label>
           </div>
           
           <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input 
                id="clientId" 
                placeholder="Abc..." 
                value={config.clientId}
                onChange={(e) => setConfig({...config, clientId: e.target.value})}
              />
           </div>
           
           <div className="grid gap-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input 
                id="clientSecret" 
                type="password" 
                placeholder="• • • • • • • •" 
                value={config.clientSecret}
                onChange={(e) => setConfig({...config, clientSecret: e.target.value})}
              />
           </div>
        </CardContent>
        <CardFooter className="flex justify-between">
           <Button variant="outline">Verbindung testen</Button>
           <Button onClick={handleSave}>Speichern</Button>
        </CardFooter>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Webhook Status</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span>Warte auf Events...</span>
              </div>
          </CardContent>
      </Card>
    </div>
  )
}
