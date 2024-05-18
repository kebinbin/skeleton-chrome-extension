/* TODO:
  - Minimize classnames collisions posibilities.
*/

if (typeof clean === "undefined") {
  const clean = function () {
    let colors = [];
    for (var i = 0; i < 10; i++) {
      colors[i] = `skeleton-color-${i}`; //factor (this is repeated)
    }
    const classes = [...colors, "skeleton-border"];

    var elements = document.getElementsByTagName("*");
    for (var i = 0, max = elements.length; i < max; i++) {
      elements[i].classList.remove(...classes);
    }
  };

  clean();
}
