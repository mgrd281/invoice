(function () {
    const BASE_URL = 'https://invoice-kohl-five.vercel.app'; // Updated to actual deployed URL

    function initExitIntent() {
        // Check if already shown in this session
        if (sessionStorage.getItem('rp-exit-intent-shown')) return;

        // Check if user is on checkout or cart page (optional, but good practice)
        // For now, we enable it everywhere or let the user decide where to include the script

        let mouseLeft = false;

        document.addEventListener('mouseleave', (e) => {
            if (e.clientY < 0 && !mouseLeft) {
                mouseLeft = true;
                showExitPopup();
            }
        });

        // Mobile: Show when switching tabs or hitting back (less reliable, but worth a try)
        // document.addEventListener('visibilitychange', () => {
        //     if (document.visibilityState === 'hidden') {
        //         // Can't show popup when hidden, but can set a flag to show when they return?
        //         // Mobile exit intent is tricky.
        //     }
        // });
    }

    function showExitPopup() {
        if (sessionStorage.getItem('rp-exit-intent-shown')) return;
        sessionStorage.setItem('rp-exit-intent-shown', 'true');

        // Create Modal HTML
        const modalHTML = `
            <div id="rp-exit-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 999999; opacity: 0; transition: opacity 0.3s ease;">
                <div id="rp-exit-modal" style="background: white; width: 90%; max-width: 450px; border-radius: 16px; padding: 0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: scale(0.9); transition: transform 0.3s ease; overflow: hidden; position: relative;">
                    
                    <button id="rp-exit-close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; z-index: 10;">&times;</button>
                    
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white;">
                        <div style="font-size: 40px; margin-bottom: 10px;">🎁</div>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 800;">Warten Sie kurz!</h2>
                        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Verlassen Sie uns nicht mit leeren Händen.</p>
                    </div>

                    <div style="padding: 30px 25px; text-align: center;">
                        <p style="color: #374151; font-size: 16px; margin-bottom: 20px; line-height: 1.5;">
                            Schließen Sie Ihre Bestellung jetzt ab und erhalten Sie <strong style="color: #4f46e5;">kostenlosen Versand</strong> oder <strong style="color: #4f46e5;">10% Rabatt</strong>!
                        </p>

                        <div style="background: #f3f4f6; border: 2px dashed #d1d5db; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                            <span style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 5px;">Ihr Gutscheincode:</span>
                            <span style="font-family: monospace; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 2px;">SAVE10</span>
                        </div>

                        <button id="rp-exit-cta" style="width: 100%; background-color: #4f46e5; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: background-color 0.2s;">
                            Jetzt Rabatt einlösen
                        </button>
                        
                        <button id="rp-exit-decline" style="background: none; border: none; color: #9ca3af; font-size: 13px; margin-top: 15px; cursor: pointer; text-decoration: underline;">
                            Nein danke, ich möchte voll bezahlen
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Inject into DOM
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        // Animate In
        requestAnimationFrame(() => {
            const overlay = document.getElementById('rp-exit-modal-overlay');
            const modal = document.getElementById('rp-exit-modal');
            if (overlay) overlay.style.opacity = '1';
            if (modal) modal.style.transform = 'scale(1)';
        });

        // Event Listeners
        document.getElementById('rp-exit-close').onclick = closeExitPopup;
        document.getElementById('rp-exit-decline').onclick = closeExitPopup;
        document.getElementById('rp-exit-modal-overlay').onclick = (e) => {
            if (e.target.id === 'rp-exit-modal-overlay') closeExitPopup();
        };

        document.getElementById('rp-exit-cta').onclick = () => {
            // Copy code to clipboard
            navigator.clipboard.writeText('SAVE10').then(() => {
                const btn = document.getElementById('rp-exit-cta');
                btn.textContent = 'Code kopiert! Weiter zum Checkout...';
                btn.style.backgroundColor = '#16a34a';

                setTimeout(() => {
                    // Redirect to checkout or cart if needed, or just close
                    // window.location.href = '/checkout'; 
                    closeExitPopup();
                }, 1000);
            });
        };
    }

    function closeExitPopup() {
        const overlay = document.getElementById('rp-exit-modal-overlay');
        const modal = document.getElementById('rp-exit-modal');

        if (overlay) overlay.style.opacity = '0';
        if (modal) modal.style.transform = 'scale(0.9)';

        setTimeout(() => {
            const el = document.getElementById('rp-exit-modal-overlay').parentNode;
            if (el) el.remove();
        }, 300);
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExitIntent);
    } else {
        initExitIntent();
    }

})();
