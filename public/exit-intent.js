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
            <div id="rp-exit-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 999999; opacity: 0; transition: opacity 0.4s ease;">
                <div id="rp-exit-modal" style="background: #111111; width: 90%; max-width: 420px; border-radius: 20px; padding: 0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); transform: scale(0.95); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; position: relative; border: 1px solid #333;">
                    
                    <button id="rp-exit-close" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; cursor: pointer; color: #fff; z-index: 10; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">&times;</button>
                    
                    <div style="padding: 40px 30px 30px 30px; text-align: center; color: white;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #D4AF37 0%, #F3E5AB 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);">
                            <span style="font-size: 30px;">🎁</span>
                        </div>
                        
                        <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #ccc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Ein Geschenk für Sie</h2>
                        <p style="margin: 0; color: #9ca3af; font-size: 15px; line-height: 1.6;">Bevor Sie gehen: Sichern Sie sich jetzt Ihren exklusiven Vorteil für diese Bestellung.</p>
                    </div>

                    <div style="padding: 0 30px 40px 30px; text-align: center;">
                        <div style="background: #1a1a1a; border: 1px solid #333; padding: 20px; border-radius: 12px; margin-bottom: 25px; position: relative;">
                            <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; margin-bottom: 8px; font-weight: 600;">Ihr Gutscheincode</span>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <span style="font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 2px;">SAVE10</span>
                            </div>
                            <div style="position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 40%; height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent);"></div>
                        </div>

                        <button id="rp-exit-cta" style="width: 100%; background: linear-gradient(135deg, #D4AF37 0%, #B4941F 100%); color: #000; border: none; padding: 16px; border-radius: 10px; font-weight: 700; font-size: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                            Code kopieren & Sparen
                        </button>
                        
                        <button id="rp-exit-decline" style="background: none; border: none; color: #6b7280; font-size: 13px; margin-top: 20px; cursor: pointer; transition: color 0.2s;">
                            Nein danke, ich möchte den vollen Preis zahlen
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
