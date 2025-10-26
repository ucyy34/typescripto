/**
 * Product Reviews Component
 * Handles review display, submission, and rating
 */

class ProductReviews {
    constructor(productId) {
        this.productId = productId;
        this.apiClient = new ApiClient();
        this.reviews = [];
        this.summary = null;
        this.currentPage = 1;
        this.sortBy = 'recent';
        
        console.log('[Product Reviews] Initialized for product:', productId);
    }

    /**
     * Load and render reviews
     */
    async loadReviews() {
        try {
            console.log('[Product Reviews] Loading reviews...');
            
            const response = await this.apiClient.get(
                `/products/${this.productId}/reviews?page=${this.currentPage}&limit=10&sort=${this.sortBy}`
            );

            if (response.success) {
                this.reviews = response.data.reviews;
                this.summary = response.data.summary;
                this.pagination = response.data.pagination;
                
                console.log('[Product Reviews] Loaded:', this.reviews.length, 'reviews');
                this.render();
            }
        } catch (error) {
            console.error('[Product Reviews] Error loading reviews:', error);
            this.renderError();
        }
    }

    /**
     * Render reviews section
     */
    render() {
        const container = document.getElementById('productTabContent');
        if (!container) return;

        const html = `
            <div class="reviews-container">
                ${this.renderSummary()}
                ${this.renderSortFilter()}
                ${this.renderReviewsList()}
                ${this.renderPagination()}
                ${this.renderReviewButton()}
            </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Render rating summary
     */
    renderSummary() {
        if (!this.summary) return '';

        const avgRating = parseFloat(this.summary.average_rating) || 0;
        const totalReviews = this.summary.total_reviews || 0;

        return `
            <div class="review-summary">
                <div class="review-summary-left">
                    <div class="review-average-rating">${avgRating.toFixed(1)}</div>
                    <div class="review-stars-large">${this.renderStars(avgRating)}</div>
                    <div class="review-total">${totalReviews} değerlendirme</div>
                </div>
                <div class="review-summary-right">
                    ${this.renderRatingDistribution()}
                </div>
            </div>
        `;
    }

    /**
     * Render rating distribution bars
     */
    renderRatingDistribution() {
        if (!this.summary || !this.summary.distribution) return '';

        const total = this.summary.total_reviews || 1;
        let html = '<div class="rating-distribution">';

        for (let i = 5; i >= 1; i--) {
            const count = this.summary.distribution[i] || 0;
            const percentage = (count / total) * 100;

            html += `
                <div class="rating-bar-row">
                    <span class="rating-bar-label">${i} ⭐</span>
                    <div class="rating-bar">
                        <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="rating-bar-count">${count}</span>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render sort filter
     */
    renderSortFilter() {
        return `
            <div class="review-sort-filter">
                <select id="reviewSortSelect" class="review-sort-select">
                    <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>En Yeni</option>
                    <option value="highest" ${this.sortBy === 'highest' ? 'selected' : ''}>En Yüksek Puan</option>
                    <option value="lowest" ${this.sortBy === 'lowest' ? 'selected' : ''}>En Düşük Puan</option>
                    <option value="helpful" ${this.sortBy === 'helpful' ? 'selected' : ''}>En Faydalı</option>
                </select>
            </div>
        `;
    }

    /**
     * Render reviews list
     */
    renderReviewsList() {
        if (!this.reviews || this.reviews.length === 0) {
            return `
                <div class="no-reviews">
                    <div class="no-reviews-icon">💬</div>
                    <h3>Henüz değerlendirme yok</h3>
                    <p>Bu ürün için ilk değerlendirmeyi siz yapın!</p>
                </div>
            `;
        }

        let html = '<div class="reviews-list">';
        
        this.reviews.forEach(review => {
            html += this.renderReviewCard(review);
        });

        html += '</div>';
        return html;
    }

    /**
     * Render single review card
     */
    renderReviewCard(review) {
        const userName = review.user 
            ? `${review.user.first_name} ${review.user.last_name?.charAt(0)}.`
            : 'Anonymous';
        
        const date = new Date(review.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Sanitize user input to prevent XSS
        const sanitizedTitle = review.title ? this.sanitizeHTML(review.title) : '';
        const sanitizedComment = review.comment ? this.sanitizeHTML(review.comment) : '';

        return `
            <div class="review-card" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="review-user-info">
                        <div class="review-user-avatar">${userName.charAt(0)}</div>
                        <div>
                            <div class="review-user-name">${userName}</div>
                            <div class="review-date">${date}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${this.renderStars(review.rating)}
                        ${review.is_verified_purchase ? '<span class="verified-badge">✓ Doğrulanmış Alıcı</span>' : ''}
                    </div>
                </div>

                ${sanitizedTitle ? `<h4 class="review-title">${sanitizedTitle}</h4>` : ''}
                
                ${sanitizedComment ? `<p class="review-comment">${sanitizedComment}</p>` : ''}

                ${review.images && review.images.length > 0 ? this.renderReviewImages(review.images) : ''}

                <div class="review-footer">
                    <button class="review-helpful-btn" data-review-id="${review.id}" data-helpful="true">
                        👍 Faydalı (${review.helpful_count || 0})
                    </button>
                    <button class="review-helpful-btn" data-review-id="${review.id}" data-helpful="false">
                        👎 Faydalı Değil
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render review images
     */
    renderReviewImages(images) {
        let html = '<div class="review-images">';
        images.forEach(img => {
            html += `<img src="${img}" alt="Review image" class="review-image">`;
        });
        html += '</div>';
        return html;
    }

    /**
     * Render stars
     */
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let html = '<span class="stars">';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            html += '⭐';
        }
        
        // Half star
        if (hasHalfStar) {
            html += '⭐';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            html += '☆';
        }
        
        html += '</span>';
        return html;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        if (!this.pagination || this.pagination.pages <= 1) return '';

        let html = '<div class="review-pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            html += `<button class="pagination-btn" data-page="${this.currentPage - 1}">← Önceki</button>`;
        }

        // Page numbers
        for (let i = 1; i <= this.pagination.pages; i++) {
            if (i === this.currentPage) {
                html += `<span class="pagination-current">${i}</span>`;
            } else {
                html += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
            }
        }

        // Next button
        if (this.currentPage < this.pagination.pages) {
            html += `<button class="pagination-btn" data-page="${this.currentPage + 1}">Sonraki →</button>`;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render review button
     */
    renderReviewButton() {
        return `
            <div class="review-action">
                <button id="writeReviewBtn" class="btn btn-primary">
                    ✍️ Değerlendirme Yaz
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Sort filter
        const sortSelect = document.getElementById('reviewSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.currentPage = 1;
                this.loadReviews();
            });
        }

        // Pagination
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPage = parseInt(e.target.dataset.page);
                this.loadReviews();
            });
        });

        // Helpful buttons
        document.querySelectorAll('.review-helpful-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reviewId = e.target.dataset.reviewId;
                const helpful = e.target.dataset.helpful === 'true';
                this.markHelpful(reviewId, helpful);
            });
        });

        // Write review button
        const writeBtn = document.getElementById('writeReviewBtn');
        if (writeBtn) {
            writeBtn.addEventListener('click', () => this.openReviewModal());
        }
    }

    /**
     * Mark review as helpful
     */
    async markHelpful(reviewId, helpful) {
        if (!AuthManager.isLoggedIn()) {
            alert('Lütfen giriş yapın');
            return;
        }

        try {
            const response = await this.apiClient.post(`/reviews/${reviewId}/helpful`, { helpful });
            
            if (response.success) {
                // Reload reviews to show updated count
                this.loadReviews();
            }
        } catch (error) {
            console.error('[Product Reviews] Error marking helpful:', error);
            alert('Bir hata oluştu');
        }
    }

    /**
     * Open review modal
     */
    openReviewModal() {
        if (!AuthManager.isLoggedIn()) {
            alert('Değerlendirme yapmak için giriş yapmalısınız');
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'review-modal';
        modal.innerHTML = `
            <div class="review-modal-content">
                <div class="review-modal-header">
                    <h2>Değerlendirme Yaz</h2>
                    <button class="review-modal-close">&times;</button>
                </div>
                <div class="review-modal-body">
                    <div class="review-form-group">
                        <label>Puanınız *</label>
                        <div class="review-rating-input" id="reviewRatingInput">
                            ${[1, 2, 3, 4, 5].map(i => `
                                <span class="rating-star" data-rating="${i}">☆</span>
                            `).join('')}
                        </div>
                        <input type="hidden" id="reviewRating" required>
                    </div>

                    <div class="review-form-group">
                        <label>Başlık (Opsiyonel)</label>
                        <input type="text" id="reviewTitle" class="review-input" placeholder="Örn: Harika bir ürün!">
                    </div>

                    <div class="review-form-group">
                        <label>Yorumunuz (Opsiyonel)</label>
                        <textarea id="reviewComment" class="review-textarea" rows="5" placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."></textarea>
                    </div>

                    <button id="submitReviewBtn" class="btn btn-primary" disabled>Gönder</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Rating stars interaction
        const stars = modal.querySelectorAll('.rating-star');
        const ratingInput = modal.querySelector('#reviewRating');
        const submitBtn = modal.querySelector('#submitReviewBtn');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                ratingInput.value = rating;
                submitBtn.disabled = false;

                // Update star display
                stars.forEach((s, i) => {
                    s.textContent = i < rating ? '⭐' : '☆';
                });
            });
        });

        // Close modal
        modal.querySelector('.review-modal-close').addEventListener('click', () => {
            modal.remove();
        });

        // Submit review
        submitBtn.addEventListener('click', () => this.submitReview(modal));
    }

    /**
     * Submit review
     */
    async submitReview(modal) {
        const rating = parseInt(document.getElementById('reviewRating').value);
        const title = document.getElementById('reviewTitle').value.trim();
        const comment = document.getElementById('reviewComment').value.trim();

        if (!rating) {
            alert('Lütfen puan verin');
            return;
        }

        try {
            const response = await this.apiClient.post(`/products/${this.productId}/reviews`, {
                rating,
                title: title || undefined,
                comment: comment || undefined
            });

            if (response.success) {
                alert('✅ Değerlendirmeniz gönderildi! Admin onayından sonra yayınlanacaktır.');
                modal.remove();
                this.loadReviews();
            }
        } catch (error) {
            console.error('[Product Reviews] Error submitting review:', error);
            const message = error.response?.data?.message || 'Değerlendirme gönderilemedi';
            alert(message);
        }
    }

/**
 * Render error state
 */
renderError() {
    const container = document.getElementById('productTabContent');
    if (!container) return;

    container.innerHTML = `
        <div class="review-error">
            <p>Değerlendirmeler yüklenemedi</p>
            <button class="btn btn-secondary" onclick="window.productReviews.loadReviews()">Tekrar Dene</button>
        </div>
    `;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Uses SecurityUtils if available, otherwise basic sanitization
 */
sanitizeHTML(str) {
    if (!str) return '';
    
    // Use SecurityUtils if available
    if (window.SecurityUtils) {
        return window.SecurityUtils.escapeHTML(str);
    }
    
    // Fallback: Basic sanitization
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
}

// Export for use in product-detail-api.js
window.ProductReviews = ProductReviews;
