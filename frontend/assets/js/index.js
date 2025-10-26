/*=============== SHOW MENU ===============*/
const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
          nav = document.getElementById(navId)
 
    toggle.addEventListener('click', () =>{
        // Add show-menu class to nav menu
        nav.classList.toggle('show-menu')
 
        // Add show-icon to show and hide the menu icon
        toggle.classList.toggle('show-icon')
    })
 }
 
 showMenu('nav-toggle','nav-menu')

/*========== HERO SECTION SLIDER ===========*/
let container = document.querySelector('.slider');
let slider = document.querySelector('.slider .list');
let items = document.querySelectorAll('.slider .list .item');
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let dots = document.querySelectorAll('.slider .dots li');

let lengthItems = items.length - 1;
let active = 0;

function setItemWidth() {
    if (!container || !items.length) return; // Safety check
    const sliderWidth = container.offsetWidth;
    items.forEach(item => {
        item.style.width = `${sliderWidth}px`;
    });
}

function initializeSlider() {
    setItemWidth();
    if (items.length) reloadSlider(); // Only initialize if items exist
}

function reloadSlider() {
    if (!items.length || active < 0 || active > lengthItems) return; // Safety check
    setItemWidth();
    slider.style.left = `-${items[active].offsetLeft}px`; // Use template literal for clarity
    let last_active_dot = document.querySelector('.slider .dots li.active');
    if (last_active_dot) last_active_dot.classList.remove('active');
    if (dots[active]) dots[active].classList.add('active'); // Safely add active

    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => { next.click(); }, 3000);
}

document.addEventListener('DOMContentLoaded', initializeSlider); // Wait for DOM load

next.onclick = function() {
    if (lengthItems < 0) return;
    active = active + 1 <= lengthItems ? active + 1 : 0;
    reloadSlider();
}

prev.onclick = function() {
    if (lengthItems < 0) return;
    active = active - 1 >= 0 ? active - 1 : lengthItems;
    reloadSlider();
}

let refreshInterval = setInterval(() => { next.click(); }, 3000);

dots.forEach((li, key) => {
    li.addEventListener('click', () => {
        active = key;
        reloadSlider();
    })
})

window.onresize = function(event) {
    setItemWidth();
    reloadSlider();
};

/*========== ABOUT SECTION CAROUSEL ===========*/
const carousel_items = [
    { 
        title: "Smart and Precision Agriculture Technologies",
        icon: "cpu"
    },
    { 
        title: "Organic Microbiome and Soil Health Solutions",
        icon: "plant"
    },
    { 
        title: "Resilient Agroecosystems for Food Security",
        icon: "shield-check"
    },
    { 
        title: "Agro-innovation for Functional Foods",
        icon: "lightbulb"
    },
    { 
        title: "Circular Agri-waste for Functional Biomaterials",
        icon: "recycle"
    },
    { 
        title: "Agrifood Policy and Life Cycle Analytics",
        icon: "bar-chart-2"
    }
];

const carousel = document.getElementById('carousel');
    carousel_items.forEach((item, index) => {
        const carouselItem = document.createElement('div');
        carouselItem.classList.add('carousel-item');
        carouselItem.style.setProperty('--index', index + 1);
        carouselItem.innerHTML = `
        <div class="carousel-item-body">
            <p class="carousel-title">${item.title}</p>
            <i class="ri-${item.icon}-line carousel-icon"></i>
        </div>`;
        carousel.appendChild(carouselItem);
});








