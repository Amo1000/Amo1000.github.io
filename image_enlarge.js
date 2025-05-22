const images = document.querySelectorAll(".card img");

for( var i=0; i<images.length; i++)
    images[i].onclick = function(){
        imgfull(this)
    };

function imgfull(a) {
    window.open("image.html?img=" + a.src, "_self");
}