// public/review-widget.js

(function () {
    const BASE_URL = 'https://invoice-kohl-five.vercel.app'; // Updated to actual deployed URL

    function initStarRating() {
        const containers = document.querySelectorAll('.rechnung-profi-stars');

        containers.forEach(container => {
            const productId = container.dataset.productId;
            if (!productId) return;

            fetch(`${BASE_URL}/api/reviews/public?productId=${productId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.stats.total > 0) {
                        container.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <div style="color: #fbbf24; display: flex;">
                                    ${getStarsHTML(data.stats.average)}
                                </div>
                                <span style="font-size: 14px; color: #6b7280;">
                                    (${data.stats.total} Reviews)
                                </span>
                            </div>
                        `;

                        // Add click listener to scroll to reviews widget
                        container.addEventListener('click', () => {
                            const widget = document.getElementById('rechnung-profi-reviews-widget');
                            if (widget) widget.scrollIntoView({ behavior: 'smooth' });
                        });
                    }
                })
                .catch(err => console.error('Failed to load rating:', err));
        });
    }

    function getStarsHTML(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) {
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else if (rating >= i - 0.5) {
                // Half star (simplified as full for now or add SVG defs)
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="opacity: 0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else {
                stars += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
        }
        return stars;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStarRating);
    } else {
        initStarRating();
    }
})();
