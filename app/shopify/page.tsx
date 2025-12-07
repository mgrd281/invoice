'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ShopifyEmbeddedContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const [host, setHost] = useState('');

  useEffect(() => {
    const hostParam = searchParams.get('host');
    if (hostParam) {
      setHost(hostParam);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">RechnungsProfi for Shopify</h1>
        <p className="mb-6 text-gray-600">
          Welcome! Your invoice system is connected to <strong>{shop}</strong>.
        </p>

        <div className="space-y-4">
          <a
            href="/"
            target="_blank"
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Open Dashboard (Fullscreen)
          </a>

          <p className="text-xs text-gray-400 mt-4">
            To manage invoices, please open the dashboard in a new tab.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShopifyEmbeddedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShopifyEmbeddedContent />
    </Suspense>
  );
}
