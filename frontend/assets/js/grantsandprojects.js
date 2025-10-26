const xValues = ["National Grants", "Industry Grants", "Internal Grants"];
const yValues = [45, 12, 18];
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