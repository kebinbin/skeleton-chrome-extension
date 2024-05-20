if (typeof init === "undefined") {
  const init = function () {
    let classes = [];
    for (var i = 0; i <= 12; i++) {
      classes[i] = `skeleton-x98h7f0-${i}`;
    }

    var elements = document.getElementsByTagName("*");

    for (var i = 0, max = elements.length; i < max; i++) {
      elements[i].classList.add(classes[i % classes.length]);
    }
  };

  init();
}
