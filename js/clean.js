/* TODO:
  - Minimize classnames collisions posibilities.
*/

if (typeof clean === "undefined") {
  const clean = function () {
    let classes = [];
    for (var i = 0; i <= 12; i++) {
      classes[i] = `skeleton-x98h7f0-${i}`; //factor (this is repeated)
    }

    var elements = document.getElementsByTagName("*");
    for (var i = 0, max = elements.length; i < max; i++) {
      elements[i].classList.remove(...classes);
    }
  };

  clean();
}
