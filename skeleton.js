if (typeof init === "undefined") {
  const init = function () {
    const config = {
      enabled: true,
      style: {
        border: true,
        color: true,
      },
    };

    if (config.enabled) {
      let colors = [];
      for (var i = 0; i < 10; i++) {
        colors[i] = `skeleton-color-${i}`;
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

      const { border, color } = config.style;
      for (var i = 0, max = elements.length; i < max; i++) {
        if (border) {
          elements[i].classList.add("skeleton-border");
        }
        if (color) {
          elements[i].classList.add(
            colors[elementDepth(elements[i]) % colors.length]
          );
        }
      }
    }
  };

  init();
}
