// public/review-widget.js

(function () {
    const BASE_URL = 'https://invoice-kohl-five.vercel.app'; // Updated to actual deployed URL

    // Initialize both widgets
    function init() {
        initStarRating();
        initReviewsWidget();
    }

    function initStarRating() {
        const containers = document.querySelectorAll('.rechnung-profi-stars');

        containers.forEach(container => {
            const productId = container.dataset.productId;
            if (!productId) return;

            fetch(`${BASE_URL}/api/reviews/public?productId=${productId}`)
                .then(res => res.json())
                .then(data => {
                    const total = data.stats?.total || 0;
                    const average = data.stats?.average || 0;

                    // Only render if we have data or if we want to show empty state
                    container.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <div style="color: #fbbf24; display: flex;">
                                ${getStarsHTML(average)}
                            </div>
                            <span style="font-size: 14px; color: #6b7280;">
                                (${total} Reviews)
                            </span>
                        </div>
                    `;

                    container.addEventListener('click', () => {
                        const widget = document.getElementById('rechnung-profi-reviews-widget');
                        if (widget) widget.scrollIntoView({ behavior: 'smooth' });
                    });
                })
                .catch(err => console.error('Failed to load rating:', err));
        });
    }

    function initReviewsWidget() {
        const widgetContainer = document.getElementById('rechnung-profi-reviews-widget');
        if (!widgetContainer) return;

        const productId = widgetContainer.dataset.productId;
        if (!productId) {
            widgetContainer.innerHTML = '<p style="color:red">Error: No Product ID found</p>';
            return;
        }

        widgetContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Loading reviews...</div>';

        fetch(`${BASE_URL}/api/reviews/public?productId=${productId}`)
            .then(res => res.json())
            .then(data => {
                const settings = data.settings || { primaryColor: '#2563eb', layout: 'list' };
                const primaryColor = settings.primaryColor;

                // Inject CSS
                const style = document.createElement('style');
                style.textContent = `
                    .rp-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; }
                    .rp-header { display: flex; align-items: flex-start; gap: 40px; padding-bottom: 30px; border-bottom: 1px solid #e5e7eb; margin-bottom: 30px; }
                    .rp-summary { text-align: center; min-width: 120px; }
                    .rp-big-rating { font-size: 48px; font-weight: 700; line-height: 1; color: ${primaryColor}; margin-bottom: 8px; }
                    .rp-total-count { font-size: 14px; color: #6b7280; margin-top: 4px; }
                    
                    .rp-bars { flex: 1; max-width: 400px; }
                    .rp-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; font-size: 13px; color: #4b5563; }
                    .rp-bar-bg { flex: 1; height: 8px; background-color: #f3f4f6; border-radius: 4px; overflow: hidden; }
                    .rp-bar-fill { height: 100%; background-color: ${primaryColor}; border-radius: 4px; }
                    
                    .rp-write-btn { margin-left: auto; background-color: ${primaryColor}; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
                    .rp-write-btn:hover { opacity: 0.9; }
                    
                    .rp-review-list { display: flex; flex-direction: column; gap: 24px; }
                    .rp-review-card { padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
                    .rp-review-card:last-child { border-bottom: none; }
                    
                    .rp-review-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .rp-user-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                    .rp-avatar { width: 32px; height: 32px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #4b5563; font-size: 14px; }
                    .rp-username { font-weight: 600; font-size: 14px; }
                    .rp-verified { color: #16a34a; font-size: 12px; display: flex; align-items: center; gap: 2px; }
                    .rp-date { color: #9ca3af; font-size: 12px; }
                    
                    .rp-stars { display: flex; color: ${primaryColor}; margin-bottom: 8px; }
                    .rp-content { font-size: 15px; line-height: 1.6; color: #374151; }
                    .rp-title { font-weight: 600; display: block; margin-bottom: 4px; color: #111827; }

                    @media (max-width: 600px) {
                        .rp-header { flex-direction: column; gap: 20px; align-items: center; text-align: center; }
                        .rp-bars { width: 100%; }
                        .rp-write-btn { width: 100%; margin: 10px 0 0 0; }
                    }
                `;
                document.head.appendChild(style);

                if (!data.reviews || data.reviews.length === 0) {
                    widgetContainer.innerHTML = `
                        <div class="rp-widget">
                            <div style="text-align: center; padding: 40px; background: #f9fafb; border-radius: 8px;">
                                <h3 style="margin: 0 0 8px 0; color: #374151;">Noch keine Bewertungen</h3>
                                <p style="margin: 0 0 16px 0; color: #6b7280;">Seien Sie der Erste, der dieses Produkt bewertet!</p>
                                <button class="rp-write-btn">Bewertung schreiben</button>
                            </div>
                        </div>
                    `;
                    return;
                }

                // Calculate distribution
                const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                data.reviews.forEach(r => {
                    const rating = Math.round(r.rating);
                    if (distribution[rating] !== undefined) distribution[rating]++;
                });
                const total = data.stats.total;

                // Generate Bars HTML
                let barsHTML = '';
                for (let i = 5; i >= 1; i--) {
                    const count = distribution[i];
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    barsHTML += `
                        <div class="rp-bar-row">
                            <div class="rp-stars" style="margin:0; font-size:12px;">
                                ${getStarsHTML(i).replace(/width="16"/g, 'width="12"').replace(/height="16"/g, 'height="12"')}
                            </div>
                            <div class="rp-bar-bg">
                                <div class="rp-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span style="min-width: 20px; text-align: right;">(${count})</span>
                        </div>
                    `;
                }

                const reviewsHTML = data.reviews.map(review => `
                    <div class="rp-review-card">
                        <div class="rp-user-row">
                            <div class="rp-avatar">${review.customerName ? review.customerName.charAt(0).toUpperCase() : '?'}</div>
                            <span class="rp-username">${review.customerName}</span>
                            ${review.isVerified ? '<span class="rp-verified">✓ Verifizierter Kauf</span>' : ''}
                            <span class="rp-date" style="margin-left: auto;">${new Date(review.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        <div class="rp-stars">
                            ${getStarsHTML(review.rating)}
                        </div>
                        <div class="rp-content">
                            ${review.title ? `<span class="rp-title">${review.title}</span>` : ''}
                            ${review.content}
                        </div>
                    </div>
                `).join('');

                widgetContainer.innerHTML = `
                    <div class="rp-widget">
                        <div class="rp-header">
                            <div class="rp-summary">
                                <div class="rp-big-rating">${data.stats.average}</div>
                                <div class="rp-stars" style="justify-content:center; margin-bottom:4px;">
                                    ${getStarsHTML(data.stats.average)}
                                </div>
                                <div class="rp-total-count">${data.stats.total} Rezensionen</div>
                            </div>
                            <div class="rp-bars">
                                ${barsHTML}
                            </div>
                            <button class="rp-write-btn">Bewertung schreiben</button>
                        </div>
                        <div class="rp-review-list">
                            ${reviewsHTML}
                        </div>
                    </div>
                `;
            })
            .catch(err => {
                console.error('Failed to load reviews widget:', err);
                widgetContainer.innerHTML = '<p style="color:red">Failed to load reviews.</p>';
            });
    }

    function getStarsHTML(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) {
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else if (rating >= i - 0.5) {
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="opacity: 0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else {
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
        }
        return stars;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
