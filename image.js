const image = document.getElementById("image");
const imgtitle = document.getElementById("title");
let params = new URLSearchParams(document.location.search);
let src = params.get("img");

image.src = src;