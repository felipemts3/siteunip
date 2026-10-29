/**
 * Trabalhos Acadêmicos — entrega de PDF e lista de concluídos.
 * As entregas ficam no IndexedDB deste navegador (sem servidor). Se o IndexedDB não estiver
 * disponível (ex.: janela anônima restrita), ficam só na memória até a página ser recarregada.
 */
(function () {
  "use strict";

  var $ = Portal.$;
  var $$ = Portal.$$;
  var el = Portal.el;
  var icon = Portal.icon;
  var config = Portal.data && Portal.data.trabalhos;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MAX_BYTES = ((config && config.maxSizeMB) || 20) * 1024 * 1024;
  var NAME_MAX = 120;
  var INVALID_NAME = /[\\/:*?"<>|]/;

  var els = {
    tabs: $$(".tab"),
    panels: $$(".tabpanel"),
    pending: $('[data-list="pending"]'),
    done: $('[data-list="done"]'),
    countPending: $('[data-count="pending"]'),
    countDone: $('[data-count="done"]'),
    toast: $("[data-toast]"),
    dialog: $("[data-dialog]")
  };

  var deliveries = {};   // id do trabalho -> registro salvo
  var blobUrls = [];

  /* ------------------------------------------------------------ armazenamento */

  var store = (function () {
    var DB_NAME = "unip-trabalhos";
    var STORE = "entregas";
    var memory = {};
    var dbPromise = null;

    function open() {
      if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB indisponível"));
      if (!dbPromise) {
        dbPromise = new Promise(function (resolve, reject) {
          var request = indexedDB.open(DB_NAME, 1);
          request.onupgradeneeded = function () {
            request.result.createObjectStore(STORE, { keyPath: "id" });
          };
          request.onsuccess = function () { resolve(request.result); };
          request.onerror = function () { reject(request.error); };
        });
      }
      return dbPromise;
    }

    function run(mode, action) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, mode);
          var request = action(tx.objectStore(STORE));
          tx.oncomplete = function () { resolve(request && request.result); };
          tx.onerror = function () { reject(tx.error); };
          tx.onabort = function () { reject(tx.error); };
        });
      });
    }

    function fallback(fn) {
      return function (error) {
        api.persistent = false;
        if (window.console) console.warn("Entregas salvas só na memória:", error);
        return fn();
      };
    }

    var api = {
      persistent: true,
      getAll: function () {
        return run("readonly", function (s) { return s.getAll(); })
          .catch(fallback(function () { return Object.keys(memory).map(function (k) { return memory[k]; }); }));
      },
      put: function (record) {
        return run("readwrite", function (s) { return s.put(record); })
          .catch(fallback(function () { memory[record.id] = record; }));
      },
      remove: function (id) {
        return run("readwrite", function (s) { return s.delete(id); })
          .catch(fallback(function () { delete memory[id]; }));
      }
    };
    return api;
  })();

  /* -------------------------------------------------------------------- util */

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  }

  var dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  var timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

  function formatDate(iso) {
    var date = new Date(iso);
    return dateFormat.format(date) + " às " + timeFormat.format(date);
  }

  function baseName(fileName) {
    return fileName.replace(/\.pdf$/i, "").trim();
  }

  function validateName(raw) {
    var name = baseName(raw);
    if (!name) return "Informe o nome do arquivo.";
    if (name.length > NAME_MAX) return "Use no máximo " + NAME_MAX + " caracteres.";
    if (INVALID_NAME.test(name)) return 'O nome não pode conter \\ / : * ? " < > |';
    return "";
  }

  function readHeader(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { resolve(""); };
      reader.readAsText(file.slice(0, 5));
    });
  }

  function validateFile(file) {
    var looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!looksPdf) return Promise.resolve("Selecione um arquivo em PDF.");
    if (file.size === 0) return Promise.resolve("O arquivo está vazio.");
    if (file.size > MAX_BYTES) return Promise.resolve("O arquivo passa de " + formatSize(MAX_BYTES) + ".");
    return readHeader(file).then(function (header) {
      return header === "%PDF-" ? "" : "Esse arquivo não parece ser um PDF válido.";
    });
  }

  var toastTimer = null;

  function toast(message, type) {
    clearTimeout(toastTimer);
    els.toast.className = "toast toast--" + (type || "success");
    els.toast.textContent = "";
    els.toast.appendChild(icon(type === "error" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check"));
    els.toast.appendChild(document.createTextNode(message));
    els.toast.hidden = false;
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 4500);
  }

  /* -------------------------------------------------------------------- abas */

  function selectTab(tab, focus) {
    els.tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
    history.replaceState(null, "", tab.id === "tab-done" ? "#concluidos" : location.pathname + location.search);
  }

  function initTabs() {
    els.tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { selectTab(tab); });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = els.tabs[(index + 1) % els.tabs.length];
        else if (event.key === "ArrowLeft") next = els.tabs[(index - 1 + els.tabs.length) % els.tabs.length];
        else if (event.key === "Home") next = els.tabs[0];
        else if (event.key === "End") next = els.tabs[els.tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        selectTab(next, true);
      });
    });

    if (location.hash === "#concluidos") selectTab($("#tab-done"));
  }

  /* ------------------------------------------------------------ para entregar */

  function renderPendingItem(assignment) {
    var id = assignment.id;
    var fileId = "arquivo-" + id;
    var nameId = "nome-" + id;
    var fileErrorId = "erro-arquivo-" + id;
    var nameErrorId = "erro-nome-" + id;
    var hintId = "dica-nome-" + id;
    var chosenFile = null;

    var fileInput = el("input", {
      type: "file",
      id: fileId,
      accept: "application/pdf,.pdf",
      "aria-describedby": fileErrorId
    });
    var dropzone = el("label", { className: "dropzone", for: fileId }, [
      icon("fa-solid fa-cloud-arrow-up dropzone__icon"),
      el("span", null, ["Arraste o PDF aqui ou ", el("span", { className: "dropzone__cta", text: "selecione o arquivo" })]),
      el("span", { className: "dropzone__hint", text: "Somente PDF · até " + formatSize(MAX_BYTES) }),
      fileInput
    ]);
    var fileError = el("p", { className: "field__error", id: fileErrorId, "aria-live": "polite" });

    var chosenName = el("span", { className: "file-chosen__name" });
    var chosenSize = el("span", { className: "file-chosen__size" });
    var removeBtn = el("button", { className: "link-btn", type: "button", text: "Trocar arquivo" });
    var chosen = el("div", { className: "file-chosen", hidden: true }, [
      icon("fa-solid fa-file-pdf"), chosenName, chosenSize, removeBtn
    ]);

    var nameInput = el("input", {
      type: "text",
      id: nameId,
      maxlength: String(NAME_MAX + 4),
      autocomplete: "off",
      spellcheck: "false",
      disabled: true,
      "aria-describedby": hintId + " " + nameErrorId
    });
    var nameControl = el("div", { className: "field__control" }, [
      nameInput,
      el("span", { className: "field__suffix", "aria-hidden": "true", text: ".pdf" })
    ]);
    var nameError = el("p", { className: "field__error", id: nameErrorId, "aria-live": "polite" });

    var submitLabel = el("span", { text: "Confirmar" });
    var submitBtn = el("button", { className: "btn btn--lg", type: "submit", disabled: true }, [
      icon("fa-solid fa-check"), submitLabel
    ]);

    var form = el("form", { className: "upload", novalidate: true, "aria-label": "Entrega de " + assignment.title }, [
      dropzone,
      fileError,
      chosen,
      el("div", { className: "field" }, [
        el("label", { className: "field__label", for: nameId, text: "Nome do arquivo" }),
        nameControl,
        el("p", { className: "field__hint", id: hintId, text: "É com esse nome que o trabalho aparece em Concluídos." }),
        nameError
      ]),
      el("div", { className: "upload__actions" }, [submitBtn])
    ]);

    function setFileError(message) {
      fileError.textContent = "";
      if (message) fileError.append(icon("fa-solid fa-circle-exclamation"), message);
      dropzone.classList.toggle("has-error", !!message);
    }

    function setNameError(message) {
      nameError.textContent = "";
      if (message) nameError.append(icon("fa-solid fa-circle-exclamation"), message);
      nameControl.classList.toggle("has-error", !!message);
      nameInput.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function refreshSubmit() {
      submitBtn.disabled = !chosenFile || !!validateName(nameInput.value);
    }

    function clearFile() {
      chosenFile = null;
      fileInput.value = "";
      chosen.hidden = true;
      dropzone.hidden = false;
      nameInput.disabled = true;
      nameInput.value = "";
      setNameError("");
      refreshSubmit();
    }

    function useFile(file) {
      if (!file) return;
      setFileError("");
      validateFile(file).then(function (error) {
        if (error) {
          clearFile();
          setFileError(error);
          return;
        }
        chosenFile = file;
        chosenName.textContent = file.name;
        chosenName.title = file.name;
        chosenSize.textContent = formatSize(file.size);
        chosen.hidden = false;
        dropzone.hidden = true;
        nameInput.disabled = false;
        nameInput.value = baseName(file.name).slice(0, NAME_MAX);
        setNameError("");
        refreshSubmit();
        nameInput.focus();
        nameInput.select();
      });
    }

    function setBusy(busy) {
      submitBtn.setAttribute("aria-busy", String(busy));
      submitBtn.disabled = busy;
      nameInput.disabled = busy;
      removeBtn.disabled = busy;
      submitBtn.firstChild.replaceWith(busy ? el("span", { className: "spinner", "aria-hidden": "true" }) : icon("fa-solid fa-check"));
      submitLabel.textContent = busy ? "Enviando…" : "Confirmar";
    }

    fileInput.addEventListener("change", function () { useFile(fileInput.files[0]); });

    removeBtn.addEventListener("click", function () {
      clearFile();
      fileInput.click();
    });

    ["dragenter", "dragover"].forEach(function (type) {
      dropzone.addEventListener(type, function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      dropzone.addEventListener(type, function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });
    dropzone.addEventListener("drop", function (event) {
      var files = event.dataTransfer && event.dataTransfer.files;
      if (files && files.length > 1) {
        setFileError("Envie apenas um arquivo.");
        return;
      }
      useFile(files && files[0]);
    });

    nameInput.addEventListener("input", function () {
      if (nameError.textContent) setNameError(validateName(nameInput.value));
      refreshSubmit();
    });
    nameInput.addEventListener("blur", function () {
      if (chosenFile) setNameError(validateName(nameInput.value));
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var nameProblem = validateName(nameInput.value);
      if (!chosenFile) {
        setFileError("Selecione o arquivo PDF.");
        return;
      }
      if (nameProblem) {
        setNameError(nameProblem);
        nameInput.focus();
        return;
      }

      var record = {
        id: id,
        title: assignment.title,
        fileName: baseName(nameInput.value) + ".pdf",
        size: chosenFile.size,
        deliveredAt: new Date().toISOString(),
        blob: chosenFile
      };

      setBusy(true);
      var minDelay = new Promise(function (resolve) { setTimeout(resolve, reduceMotion ? 0 : 600); });

      Promise.all([store.put(record), minDelay])
        .then(function () {
          deliveries[id] = record;
          render(id);
          selectTab($("#tab-done"));
          var item = $('[data-done-id="' + id + '"]');
          if (item) item.focus({ preventScroll: true });
          toast(record.fileName + " entregue com sucesso.");
          if (!store.persistent) {
            setTimeout(function () {
              toast("Não foi possível salvar no navegador: a entrega some ao recarregar.", "error");
            }, 4600);
          }
        })
        .catch(function () {
          setBusy(false);
          toast("Não foi possível concluir a entrega. Tente novamente.", "error");
        });
    });

    return el("li", { className: "task", "data-pending-id": id }, [
      el("div", { className: "task__head" }, [
        el("span", { className: "task__icon" }, [icon("fa-solid fa-file-arrow-up")]),
        el("div", { className: "task__body" }, [
          el("h3", { className: "task__title", text: assignment.title }),
          assignment.description ? el("p", { className: "task__meta", text: assignment.description }) : null
        ]),
        el("span", { className: "chip chip--open" }, [icon("fa-regular fa-clock"), "Aberto para entrega"])
      ]),
      form
    ]);
  }

  /* --------------------------------------------------------------- concluídos */

  function renderDoneItem(record, isNew) {
    var url = URL.createObjectURL(record.blob);
    blobUrls.push(url);

    var cancelBtn = el("button", { className: "btn btn--sm btn--text-danger", type: "button" }, [
      icon("fa-solid fa-rotate-left"), "Cancelar entrega"
    ]);
    cancelBtn.addEventListener("click", function () { confirmCancel(record); });

    return el("li", {
      className: "task" + (isNew && !reduceMotion ? " task--new" : ""),
      "data-done-id": record.id,
      tabindex: "-1",
      "aria-label": record.fileName + ", trabalho entregue"
    }, [
      el("div", { className: "task__head" }, [
        el("span", { className: "task__icon task__icon--pdf" }, [icon("fa-solid fa-file-pdf")]),
        el("div", { className: "task__body" }, [
          el("h3", { className: "task__title", text: record.fileName }),
          el("p", { className: "task__meta", text: record.title }),
          el("p", { className: "task__meta", text: "Entregue em " + formatDate(record.deliveredAt) + " · " + formatSize(record.size) })
        ]),
        el("span", { className: "chip chip--done" }, [icon("fa-solid fa-circle-check"), "Entregue"])
      ]),
      el("div", { className: "task__actions" }, [
        el("a", { className: "btn btn--sm btn--outline", href: url, target: "_blank", rel: "noopener" }, [
          icon("fa-regular fa-eye"), "Visualizar"
        ]),
        el("a", { className: "btn btn--sm btn--outline", href: url, download: record.fileName }, [
          icon("fa-solid fa-download"), "Baixar"
        ]),
        cancelBtn
      ])
    ]);
  }

  function confirmCancel(record) {
    function remove() {
      store.remove(record.id).then(function () {
        delete deliveries[record.id];
        render();
        selectTab($("#tab-pending"), true);
        toast("Entrega de " + record.fileName + " cancelada.");
      });
    }

    if (typeof els.dialog.showModal !== "function") {
      if (window.confirm("Cancelar a entrega de " + record.fileName + "?")) remove();
      return;
    }

    els.dialog.returnValue = "";
    els.dialog.showModal();
    els.dialog.addEventListener("close", function onClose() {
      els.dialog.removeEventListener("close", onClose);
      if (els.dialog.returnValue === "confirm") remove();
    });
  }

  /* ------------------------------------------------------------------- render */

  function empty(iconClass, text) {
    return el("li", { className: "empty" }, [icon(iconClass), el("p", { text: text })]);
  }

  function render(newId) {
    blobUrls.forEach(URL.revokeObjectURL);
    blobUrls = [];

    var pending = config.assignments.filter(function (a) { return !deliveries[a.id]; });
    var done = Object.keys(deliveries)
      .map(function (k) { return deliveries[k]; })
      .sort(function (a, b) { return b.deliveredAt.localeCompare(a.deliveredAt); });

    els.pending.textContent = "";
    els.pending.removeAttribute("aria-busy");
    if (pending.length) pending.forEach(function (a) { els.pending.appendChild(renderPendingItem(a)); });
    else els.pending.appendChild(empty("fa-regular fa-hourglass-half", config.emptyPending));

    els.done.textContent = "";
    if (done.length) done.forEach(function (r) { els.done.appendChild(renderDoneItem(r, r.id === newId)); });
    else els.done.appendChild(empty("fa-regular fa-folder-open", config.emptyDone));

    els.countPending.textContent = pending.length;
    els.countDone.textContent = done.length;
  }

  /* --------------------------------------------------------------------- init */

  function init() {
    if (!config || !Array.isArray(config.assignments)) {
      els.pending.textContent = "";
      els.pending.removeAttribute("aria-busy");
      els.pending.appendChild(empty("fa-solid fa-triangle-exclamation", "Não foi possível carregar os trabalhos."));
      return;
    }

    initTabs();

    // Arquivo solto fora da área de envio não deve abrir o PDF na aba.
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });

    store.getAll().then(function (records) {
      (records || []).forEach(function (r) { deliveries[r.id] = r; });
      render();
    });
  }

  init();
})();
