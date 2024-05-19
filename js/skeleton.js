if (typeof init === "undefined") {
  const init = function () {
    let levels = [];
    for (var i = 0; i < 10; i++) {
      levels[i] = `skeleton-level-${i}`;
    }

    function elementDepth(el) {
      var depth = 0;
      while (null !== el.parentElement) {
        el = el.parentElement;
        depth++;
      }
      return depth;
    }

    var elements = document.getElementsByTagName("*");

    for (var i = 0, max = elements.length; i < max; i++) {
      elements[i].classList.add(
        levels[elementDepth(elements[i]) % levels.length]
      );
    }
  };

  init();
}
