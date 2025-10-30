// JavaScript for Pagination
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.news-card');
    const itemsPerPage = 9;
    const totalPages = Math.ceil(cards.length / itemsPerPage);
    let currentPage = 1;

    const paginationContainer = document.querySelector('.pagination');

    function showPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        cards.forEach((card, index) => {
            card.style.display = (index >= start && index < end) ? 'block' : 'none';
        });

        updatePagination();
    }

    function updatePagination() {
        paginationContainer.innerHTML = '';

        // Previous button
        const prev = document.createElement('a');
        prev.innerHTML = '&laquo; Prev';
        prev.classList.add('prev');
        if (currentPage === 1) {
            prev.classList.add('disabled');
        } else {
            prev.addEventListener('click', () => {
                currentPage--;
                showPage(currentPage);
            });
        }
        paginationContainer.appendChild(prev);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.innerText = i;
            if (i === currentPage) {
                pageLink.classList.add('active');
            } else {
                pageLink.addEventListener('click', () => {
                    currentPage = i;
                    showPage(currentPage);
                });
            }
            paginationContainer.appendChild(pageLink);
        }

        // Next button
        const next = document.createElement('a');
        next.innerHTML = 'Next &raquo;';
        next.classList.add('next');
        if (currentPage === totalPages) {
            next.classList.add('disabled');
        } else {
            next.addEventListener('click', () => {
                currentPage++;
                showPage(currentPage);
            });
        }
        paginationContainer.appendChild(next);
    }

    // Initial display
    showPage(currentPage);
});