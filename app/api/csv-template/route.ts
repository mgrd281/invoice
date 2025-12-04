import { NextResponse } from 'next/server'

export async function GET() {
  // Comprehensive CSV template with all invoice types (Normal, Storno, Gutschrift)
  const csvTemplate = `Bestellnummer,Name,Email,Financial Status,Fulfillment Status,Total,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku,Billing Name,Billing Address1,Billing City,Billing Zip,Billing Country,Shipping Name,Shipping Address1,Shipping City,Shipping Zip,Shipping Country,Rechnungstyp,Status_Deutsch,Grund,Original_Rechnung
"RE-2024-001","Max Mustermann","max.mustermann@email.com","paid","fulfilled","119.00","2024-01-15 10:30:00","1","Premium T-Shirt","100.00","TSHIRT-001","Max Mustermann","Musterstraße 123","Berlin","12345","Germany","Max Mustermann","Musterstraße 123","Berlin","12345","Germany","Rechnung","Bezahlt","",""
"RE-2024-002","Anna Schmidt","anna.schmidt@email.com","paid","fulfilled","89.50","2024-01-16 14:20:00","2","Basic Cap","44.75","CAP-001","Anna Schmidt","Beispielweg 456","München","80331","Germany","Anna Schmidt","Beispielweg 456","München","80331","Germany","Rechnung","Bezahlt","",""
"RE-2024-003","Peter Müller","peter.mueller@email.com","pending","unfulfilled","234.75","2024-01-17 09:15:00","1","Deluxe Hoodie","234.75","HOODIE-001","Peter Müller","Teststraße 789","Hamburg","20095","Germany","Peter Müller","Teststraße 789","Hamburg","20095","Germany","Rechnung","Offen","",""
"ST-2024-001","Max Mustermann","max.mustermann@email.com","refunded","cancelled","-119.00","2024-01-20 15:30:00","1","Premium T-Shirt (Storno)","100.00","TSHIRT-001","Max Mustermann","Musterstraße 123","Berlin","12345","Germany","Max Mustermann","Musterstraße 123","Berlin","12345","Germany","Storno","Storniert","Kunde hat Bestellung storniert","RE-2024-001"
"GS-2024-001","Anna Schmidt","anna.schmidt@email.com","partially_refunded","returned","-44.75","2024-01-22 11:15:00","1","Basic Cap (Rückerstattung)","44.75","CAP-001","Anna Schmidt","Beispielweg 456","München","80331","Germany","Anna Schmidt","Beispielweg 456","München","80331","Germany","Gutschrift","Gutschrift","Artikel defekt - Teilrückerstattung","RE-2024-002"
"RE-2024-006","Maria Weber","maria.weber@email.com","paid","fulfilled","156.90","2024-01-18 16:45:00","3","Standard Mug","52.30","MUG-001","Maria Weber","Probestraße 321","Köln","50667","Germany","Maria Weber","Probestraße 321","Köln","50667","Germany","Rechnung","Bezahlt","",""
"RE-2024-007","Thomas Klein","thomas.klein@email.com","partial","partial","78.25","2024-01-19 11:30:00","1","Basic Notebook","78.25","NOTEBOOK-001","Thomas Klein","Demoweg 654","Frankfurt","60311","Germany","Thomas Klein","Demoweg 654","Frankfurt","60311","Germany","Rechnung","Teilweise bezahlt","",""
"RE-2024-008","Lisa Hoffmann","lisa.hoffmann@email.com","pending","unfulfilled","299.99","2024-01-10 08:45:00","1","Premium Laptop Tasche","299.99","BAG-001","Lisa Hoffmann","Hauptstraße 987","Stuttgart","70173","Germany","Lisa Hoffmann","Hauptstraße 987","Stuttgart","70173","Germany","Rechnung","Überfällig","",""
"ST-2024-002","Lisa Hoffmann","lisa.hoffmann@email.com","refunded","cancelled","-299.99","2024-01-25 14:20:00","1","Premium Laptop Tasche (Storno)","299.99","BAG-001","Lisa Hoffmann","Hauptstraße 987","Stuttgart","70173","Germany","Lisa Hoffmann","Hauptstraße 987","Stuttgart","70173","Germany","Storno","Storniert","Kunde unzufrieden mit Qualität","RE-2024-008"
"RE-2024-009","Michael Bauer","michael.bauer@email.com","paid","fulfilled","45.50","2024-01-21 13:10:00","5","Einfache Socken","9.10","SOCKS-001","Michael Bauer","Nebenstraße 147","Düsseldorf","40210","Germany","Michael Bauer","Nebenstraße 147","Düsseldorf","40210","Germany","Rechnung","Bezahlt","",""
"GS-2024-002","Michael Bauer","michael.bauer@email.com","partially_refunded","returned","-9.10","2024-01-28 16:30:00","1","Einfache Socken (Rückerstattung)","9.10","SOCKS-001","Michael Bauer","Nebenstraße 147","Düsseldorf","40210","Germany","Michael Bauer","Nebenstraße 147","Düsseldorf","40210","Germany","Gutschrift","Gutschrift","Ein Paar Socken hatte Löcher","RE-2024-009"
"RE-2024-010","Sarah Wagner","sarah.wagner@email.com","paid","fulfilled","189.75","2024-01-23 10:20:00","1","Designer Schal","189.75","SCARF-001","Sarah Wagner","Parkstraße 258","Bremen","28195","Germany","Sarah Wagner","Parkstraße 258","Bremen","28195","Germany","Rechnung","Bezahlt","",""
"RE-2024-011","David Richter","david.richter@email.com","pending","unfulfilled","67.80","2024-01-24 12:45:00","1","Sport Handschuhe","67.80","GLOVES-001","David Richter","Sportstraße 369","Hannover","30159","Germany","David Richter","Sportstraße 369","Hannover","30159","Germany","Rechnung","Offen","",""
"GS-2024-003","Thomas Klein","thomas.klein@email.com","partially_refunded","returned","-39.13","2024-01-30 09:40:00","1","Basic Notebook (Teilrückerstattung)","39.13","NOTEBOOK-001","Thomas Klein","Demoweg 654","Frankfurt","60311","Germany","Thomas Klein","Demoweg 654","Frankfurt","60311","Germany","Gutschrift","Gutschrift","Notebook hatte Druckfehler auf Seiten","RE-2024-007"`

  // Create response with CSV content
  const response = new NextResponse(csvTemplate, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rechnungen-vorlage-mit-beispielen.csv"',
    },
  })

  return response
}
