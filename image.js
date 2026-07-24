const image = document.getElementById("image");
const image2 = document.getElementById("image2");
const link = document.getElementById("src");
let params = new URLSearchParams(document.location.search);
let src = params.get("img");

link.textContent = src;
image.src = src;
image2.src = src;

document.querySelector("link[rel*='icon']").href = src;