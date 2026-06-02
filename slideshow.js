const showbtn = document.querySelector('.menu')
  const sidebar = document.querySelector('.side-bar')
  const remove = document.querySelector('.remove')

  showbtn.addEventListener('click', () => {
    sidebar.classList.add('visible')
  });
  remove.addEventListener('click', () => {
    sidebar.classList.remove('visible')
  });

var slideIndex = 0;
showSlides();

function showSlides() {
    var i;
    var slides = document.getElementsByClassName("mySlides");
    var bars = document.getElementsByClassName("slide-bar");
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < bars.length; i++) {
        bars[i].classList.remove("active");
    }
    slideIndex++;
    if (slideIndex> slides.length) {slideIndex = 1}
    slides[slideIndex-1].style.display = "block";
    
    if (bars.length > 0) {
        setTimeout(function() {
            if (bars[slideIndex-1]) {
                bars[slideIndex-1].classList.add("active");
            }
        }, 50);
    }
    
    setTimeout(showSlides, 3500); // Change image every seconds
}