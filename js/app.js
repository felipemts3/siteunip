/**
 * Área do(a) aluno(a) — renderiza o portal a partir de window.PORTAL_DATA (js/data.js).
 */
(function () {
  "use strict";

  var data = Portal.data;
  var $ = Portal.$;
  var $$ = Portal.$$;
  var el = Portal.el;
  var icon = Portal.icon;
  var isExternal = Portal.isExternal;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileQuery = window.matchMedia("(max-width: 900px)");

  var els = {
    sections: $("[data-sections]"),
    nav: $("[data-nav]"),
    navExtra: $("[data-nav-extra]"),
    sidebar: $("#sidebar"),
    backdrop: $("[data-backdrop]"),
    menuBtn: $(".topbar__menu-btn"),
    closeBtn: $(".sidebar__close"),
    search: $("#search-input"),
    empty: $("[data-empty]"),
    emptyText: $("[data-empty-text]"),
    status: $("[data-search-status]")
  };

  /* ------------------------------------------------------------------ util */

  function normalize(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function lineText(line) {
    return typeof line === "string" ? line : line.i;
  }

  /* ---------------------------------------------------------------- render */

  function renderCard(card, index) {
    var href = card.href || data.defaultHref;
    var label = el("span", { className: "card__label" }, card.lines.map(function (line) {
      return typeof line === "string" ? el("span", { text: line }) : el("em", { text: line.i });
    }));
    var name = card.lines.map(lineText).join(" ");

    var link = el("a", {
      className: "card" + (card.featured ? " card--featured" : ""),
      href: href,
      target: isExternal(href) ? "_blank" : null,
      rel: isExternal(href) ? "noopener noreferrer" : null,
      "aria-label": card.badge ? name + " — " + card.badge : null,
      "aria-disabled": card.disabled ? "true" : null,
      tabindex: card.disabled ? "-1" : null
    }, [
      card.badge ? el("span", { className: "card__badge", "aria-hidden": "true", text: card.badge }) : null,
      icon("card__icon " + card.icon),
      label
    ]);

    var item = el("li", { className: "card-wrap", style: "--i:" + index }, [link]);
    item.dataset.search = normalize(name + " " + (card.badge || ""));
    return item;
  }

  function renderSections() {
    var fragment = document.createDocumentFragment();

    data.sections.forEach(function (section) {
      var titleId = "titulo-" + section.id;
      var grid = el("ul", { className: "grid" }, section.cards.map(renderCard));
      var panel = el("section", { className: "panel", id: section.id, "aria-labelledby": titleId }, [
        el("h2", { className: "panel__title", id: titleId, text: section.title }),
        grid
      ]);
      panel.dataset.search = normalize(section.title);
      fragment.appendChild(panel);
    });

    els.sections.textContent = "";
    els.sections.appendChild(fragment);
  }

  function renderNav() {
    data.sections.forEach(function (section) {
      els.nav.appendChild(el("li", null, [
        el("a", { className: "nav__link", href: "#" + section.id, "data-target": section.id }, [
          icon(section.icon),
          el("span", { text: section.title })
        ])
      ]));
    });

    (data.extraMenu || []).forEach(function (item) {
      els.navExtra.appendChild(el("li", null, [
        el("a", {
          className: "nav__link",
          href: item.href,
          target: isExternal(item.href) ? "_blank" : null,
          rel: isExternal(item.href) ? "noopener noreferrer" : null
        }, [icon(item.icon), el("span", { text: item.label })])
      ]));
    });
  }

  function renderError(message) {
    els.sections.textContent = "";
    els.sections.appendChild(el("div", { className: "state state--error", role: "alert" }, [
      icon("fa-solid fa-triangle-exclamation state__icon"),
      el("p", { text: message }),
      el("button", { className: "btn", type: "button", onclick: function () { location.reload(); }, text: "Tentar novamente" })
    ]));
  }

  /* ------------------------------------------------- seção ativa (scrollspy) */

  var activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    $$(".nav__link[data-target]").forEach(function (link) {
      if (link.getAttribute("data-target") === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    $$(".panel").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.id === id);
    });
  }

  function updateActiveFromScroll() {
    var panels = $$(".panel:not([hidden])");
    if (!panels.length) return;

    // No fim da página, a última seção visível fica ativa.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      setActive(panels[panels.length - 1].id);
      return;
    }

    var line = window.innerHeight * 0.3;
    var current = panels[0].id;
    panels.forEach(function (panel) {
      if (panel.getBoundingClientRect().top <= line) current = panel.id;
    });
    setActive(current);
  }

  function initScrollSpy() {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateActiveFromScroll();
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    updateActiveFromScroll();
  }

  /* -------------------------------------------------------- entrada animada */

  function initReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-animate");

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    $$(".panel").forEach(function (panel) { observer.observe(panel); });
  }

  /* ---------------------------------------------------------- menu (mobile) */

  var lastFocus = null;

  function openSidebar() {
    lastFocus = document.activeElement;
    els.sidebar.classList.add("is-open");
    els.backdrop.hidden = false;
    els.menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    els.closeBtn.focus();
  }

  function closeSidebar(restoreFocus) {
    if (!els.sidebar.classList.contains("is-open")) return;
    els.sidebar.classList.remove("is-open");
    els.backdrop.hidden = true;
    els.menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus !== false && lastFocus) lastFocus.focus();
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || !els.sidebar.classList.contains("is-open")) return;
    var focusable = $$("a[href], button:not([disabled]), input", els.sidebar).filter(function (n) {
      return n.offsetParent !== null;
    });
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initSidebar() {
    els.menuBtn.addEventListener("click", openSidebar);
    els.closeBtn.addEventListener("click", function () { closeSidebar(); });
    els.backdrop.addEventListener("click", function () { closeSidebar(); });
    els.sidebar.addEventListener("keydown", trapFocus);

    els.nav.addEventListener("click", function (event) {
      var link = event.target.closest(".nav__link[data-target]");
      if (!link) return;
      event.preventDefault();
      var target = document.getElementById(link.getAttribute("data-target"));
      if (!target || target.hidden) return;

      closeSidebar(false);
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", "#" + target.id);
      setActive(target.id);
      var title = $(".panel__title", target);
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    });

    mobileQuery.addEventListener("change", function (q) {
      if (!q.matches) closeSidebar(false);
    });
  }

  /* ------------------------------------------------------------------ busca */

  function applySearch() {
    var query = normalize(els.search.value);
    var total = 0;

    $$(".panel").forEach(function (panel) {
      var titleMatch = query && panel.dataset.search.indexOf(query) !== -1;
      var visible = 0;
      $$(".card-wrap", panel).forEach(function (item) {
        var show = !query || titleMatch || item.dataset.search.indexOf(query) !== -1;
        item.hidden = !show;
        if (show) visible++;
      });
      panel.hidden = visible === 0;
      total += visible;

      var navLink = $('.nav__link[data-target="' + panel.id + '"]');
      navLink.classList.toggle("is-disabled", panel.hidden);
      navLink.setAttribute("aria-disabled", panel.hidden ? "true" : "false");
    });

    els.empty.hidden = total > 0;
    if (total === 0) {
      els.emptyText.textContent = "Nenhum serviço encontrado para “" + els.search.value.trim() + "”.";
    }
    els.status.textContent = query
      ? total + (total === 1 ? " serviço encontrado." : " serviços encontrados.")
      : "";

    activeId = null;
    updateActiveFromScroll();
  }

  function initSearch() {
    els.search.addEventListener("input", applySearch);
    els.search.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && els.search.value) {
        event.stopPropagation();
        els.search.value = "";
        applySearch();
      }
    });
    $("[data-clear-search]").addEventListener("click", function () {
      els.search.value = "";
      applySearch();
      els.search.focus();
    });

    // "/" foca a busca (fora de campos de texto).
    document.addEventListener("keydown", function (event) {
      if (event.key !== "/" || /input|textarea/i.test(document.activeElement.tagName)) return;
      event.preventDefault();
      if (mobileQuery.matches) openSidebar();
      els.search.focus();
    });
  }

  /* ---------------------------------------------------------------- teclado */

  function initEscape() {
    // O menu do usuário (common.js) trata o Esc antes e interrompe a propagação quando está aberto.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSidebar();
    });
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    if (!data || !Array.isArray(data.sections)) {
      renderError("Não foi possível carregar os serviços. Verifique sua conexão e tente novamente.");
      return;
    }

    renderSections();
    renderNav();
    initSidebar();
    initSearch();
    initEscape();
    initReveal();
    initScrollSpy();

    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ block: "start" });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
