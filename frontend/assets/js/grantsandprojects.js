// Javascript for Pie Chart
const xValues = ["National Grants", "Industry Grants", "Internal Grants"];
const yValues = [45, 12, 18];// Data masuk sini nanti
const barColors = [
  "#00534a",
  "#00796B",
  "#00a592",
];

const ctx = document.getElementById('myChart');

new Chart(ctx, {
  type: "pie",
  data: {
    labels: xValues,
    datasets: [{
      backgroundColor: barColors,
      data: yValues
    }]
  },
  options: {
    plugins: {
        legend: {
          display: true,           // show legend
          position: 'right',       // 'top', 'bottom', 'left', or 'right'
          labels: {
            color: '#222',         // text color
            font: {
              size: 14,            // font size
              family: 'Poppins, sans-serif',
              weight: 'normal',      // font weight
            },
            boxWidth: 20,          // size of color box
            boxHeight: 20,         // height of color box
            padding: 15,           // space between legend items
            usePointStyle: true,   // use circle instead of box
          }
        }
    }
  },
});


// JavaScript for Pagination
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.grants_card');
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