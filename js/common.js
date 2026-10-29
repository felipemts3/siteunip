/**
 * Partes compartilhadas entre as páginas: utilitários de DOM, dados do usuário e menu do cabeçalho.
 * Expõe window.Portal para os scripts de cada página.
 */
(function () {
  "use strict";

  var data = window.PORTAL_DATA;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.indexOf("on") === 0 && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function icon(classes) {
    return el("i", { className: classes, "aria-hidden": "true" });
  }

  function isExternal(href) {
    return /^https?:\/\//.test(href) && href.indexOf(location.origin) !== 0;
  }

  /* ---------------------------------------------------------------- usuário */

  function renderUser() {
    if (!data) return;
    $$("[data-user-name]").forEach(function (n) { n.textContent = data.user.name; });
    $$("[data-user-email]").forEach(function (n) { n.textContent = data.user.email; });
    $$("[data-user-name-upper]").forEach(function (n) { n.textContent = data.user.name; });
    $$("[data-link]").forEach(function (a) {
      var href = data.links[a.getAttribute("data-link")];
      if (href) a.setAttribute("href", href);
    });
  }

  /* ----------------------------------------------------------- menu usuário */

  var toggle = $(".user__toggle");
  var menu = $("#user-menu");

  function isUserMenuOpen() {
    return !!menu && !menu.hidden;
  }

  function setUserMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) $("a", menu).focus();
  }

  function initUserMenu() {
    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
      setUserMenu(menu.hidden);
    });

    document.addEventListener("click", function (event) {
      if (isUserMenuOpen() && !event.target.closest(".user")) setUserMenu(false);
    });

    menu.addEventListener("keydown", function (event) {
      var items = $$("a", menu);
      var index = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(index + 1) % items.length].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
      } else if (event.key === "Tab") {
        setUserMenu(false);
      }
    });

    // Registrado antes dos scripts da página: Esc fecha primeiro o menu do usuário.
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !isUserMenuOpen()) return;
      event.stopImmediatePropagation();
      setUserMenu(false);
      toggle.focus();
    });
  }

  renderUser();
  initUserMenu();

  window.Portal = {
    data: data,
    $: $,
    $$: $$,
    el: el,
    icon: icon,
    isExternal: isExternal
  };
})();
