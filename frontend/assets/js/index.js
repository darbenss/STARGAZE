

/*========== HERO SECTION SLIDER ===========*/
let container = document.querySelector(".slider");
let slider = document.querySelector(".slider .list");
let items = document.querySelectorAll(".slider .list .item");
let next = document.getElementById("next");
let prev = document.getElementById("prev");
let dots = document.querySelectorAll(".slider .dots li");

let lengthItems = items.length - 1;
let active = 0;

function setItemWidth() {
  if (!container || !items.length) return; // Safety check
  const sliderWidth = container.offsetWidth;
  items.forEach((item) => {
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
  let last_active_dot = document.querySelector(".slider .dots li.active");
  if (last_active_dot) last_active_dot.classList.remove("active");
  if (dots[active]) dots[active].classList.add("active"); // Safely add active

  clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    next.click();
  }, 3000);
}

document.addEventListener("DOMContentLoaded", initializeSlider); // Wait for DOM load

next.onclick = function () {
  if (lengthItems < 0) return;
  active = active + 1 <= lengthItems ? active + 1 : 0;
  reloadSlider();
};

prev.onclick = function () {
  if (lengthItems < 0) return;
  active = active - 1 >= 0 ? active - 1 : lengthItems;
  reloadSlider();
};

let refreshInterval = setInterval(() => {
  next.click();
}, 3000);

dots.forEach((li, key) => {
  li.addEventListener("click", () => {
    active = key;
    reloadSlider();
  });
});

window.onresize = function (event) {
  setItemWidth();
  reloadSlider();
};
