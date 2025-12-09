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

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            .rp-review-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: white; }
            .rp-review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .rp-avatar { width: 40px; height: 40px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #4b5563; margin-right: 12px; }
            .rp-user-info h4 { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
            .rp-stars { display: flex; color: #fbbf24; margin-top: 2px; }
            .rp-date { font-size: 12px; color: #9ca3af; }
            .rp-content { font-size: 14px; color: #4b5563; line-height: 1.5; }
            .rp-verified { display: inline-flex; align-items: center; font-size: 12px; color: #16a34a; margin-left: 8px; }
            .rp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        `;
        document.head.appendChild(style);

        widgetContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Loading reviews...</div>';

        fetch(`${BASE_URL}/api/reviews/public?productId=${productId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.reviews || data.reviews.length === 0) {
                    widgetContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; background: #f9fafb; border-radius: 8px;">
                            <h3 style="margin: 0 0 8px 0; color: #374151;">Noch keine Bewertungen</h3>
                            <p style="margin: 0; color: #6b7280;">Seien Sie der Erste, der dieses Produkt bewertet!</p>
                        </div>
                    `;
                    return;
                }

                const reviewsHTML = data.reviews.map(review => `
                    <div class="rp-review-card">
                        <div class="rp-review-header">
                            <div style="display: flex; align-items: center;">
                                <div class="rp-avatar">
                                    ${review.customerName ? review.customerName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div class="rp-user-info">
                                    <div style="display: flex; align-items: center;">
                                        <h4>${review.customerName}</h4>
                                        ${review.isVerified ? '<span class="rp-verified">✓ Verifizierter Kauf</span>' : ''}
                                    </div>
                                    <div class="rp-stars">
                                        ${getStarsHTML(review.rating)}
                                    </div>
                                </div>
                            </div>
                            <span class="rp-date">${new Date(review.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        <div class="rp-content">
                            ${review.title ? `<strong style="display:block; margin-bottom:4px; color:#111827;">${review.title}</strong>` : ''}
                            ${review.content}
                        </div>
                    </div>
                `).join('');

                widgetContainer.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">Kundenbewertungen</h2>
                        <div class="${data.stats?.total > 0 ? '' : ''}">
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
