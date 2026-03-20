(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initReveal() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });

    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el, index) {
      el.style.transitionDelay = Math.min(index * 55, 420) + 'ms';
      observer.observe(el);
    });
  }

  function initBravoCarousel(root) {
    if (!root) return;

    var viewport = root.querySelector('.bravo-carousel-viewport');
    var track = root.querySelector('.bravo-carousel-track');
    var cardSelector = root.getAttribute('data-card-selector') || '.bravo-card';
    var cards = Array.prototype.slice.call(root.querySelectorAll(cardSelector));
    var dots = Array.prototype.slice.call(root.querySelectorAll('.bravo-indicator'));
    var status = root.querySelector('.bravo-status');
    var prev = root.querySelector('[data-bravo-nav="prev"]');
    var next = root.querySelector('[data-bravo-nav="next"]');
    if (!viewport || !track || !cards.length) return;

    var current = 0;
    var pointerDown = false;
    var startX = 0;
    var scrollLeft = 0;
    var autoTimer = null;

    function updateUi() {
      cards.forEach(function (card, index) {
        card.classList.toggle('is-current', index === current);
      });
      dots.forEach(function (dot, index) {
        dot.classList.toggle('is-active', index === current);
      });
      if (status) {
        status.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      }
      if (prev) prev.disabled = current === 0;
      if (next) next.disabled = current === cards.length - 1;
    }

    function scrollToCurrent(behavior) {
      var card = cards[current];
      if (!card) return;
      var left = card.offsetLeft - Math.max((viewport.clientWidth - card.clientWidth) / 2, 0);
      viewport.scrollTo({ left: left, behavior: behavior || 'smooth' });
      updateUi();
    }

    function setCurrent(index, behavior) {
      current = Math.max(0, Math.min(index, cards.length - 1));
      scrollToCurrent(behavior);
    }

    function syncCurrentFromScroll() {
      var viewportCenter = viewport.scrollLeft + (viewport.clientWidth / 2);
      var bestIndex = current;
      var bestDistance = Infinity;
      cards.forEach(function (card, index) {
        var center = card.offsetLeft + (card.clientWidth / 2);
        var distance = Math.abs(center - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      current = bestIndex;
      updateUi();
    }

    function startAuto() {
      stopAuto();
      if (cards.length < 2) return;
      autoTimer = window.setInterval(function () {
        current = (current + 1) % cards.length;
        scrollToCurrent('smooth');
      }, 5600);
    }

    function stopAuto() {
      if (!autoTimer) return;
      window.clearInterval(autoTimer);
      autoTimer = null;
    }

    if (prev) {
      prev.addEventListener('click', function () {
        setCurrent(current - 1, 'smooth');
      });
    }

    if (next) {
      next.addEventListener('click', function () {
        setCurrent(current + 1, 'smooth');
      });
    }

    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        setCurrent(index, 'smooth');
      });
    });

    viewport.addEventListener('scroll', function () {
      window.requestAnimationFrame(syncCurrentFromScroll);
    }, { passive: true });

    viewport.addEventListener('mouseenter', stopAuto);
    viewport.addEventListener('mouseleave', startAuto);
    viewport.addEventListener('focusin', stopAuto);
    viewport.addEventListener('focusout', startAuto);

    viewport.addEventListener('pointerdown', function (event) {
      pointerDown = true;
      startX = event.clientX;
      scrollLeft = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      stopAuto();
    });

    viewport.addEventListener('pointermove', function (event) {
      if (!pointerDown) return;
      var delta = event.clientX - startX;
      viewport.scrollLeft = scrollLeft - delta;
    });

    function endPointerDrag() {
      if (!pointerDown) return;
      pointerDown = false;
      viewport.classList.remove('is-dragging');
      syncCurrentFromScroll();
      scrollToCurrent('smooth');
      startAuto();
    }

    viewport.addEventListener('pointerup', endPointerDrag);
    viewport.addEventListener('pointercancel', endPointerDrag);
    viewport.addEventListener('pointerleave', endPointerDrag);

    window.addEventListener('resize', function () {
      scrollToCurrent('auto');
    });

    setCurrent(0, 'auto');
    startAuto();
  }

  function buildTreeNode(node) {
    var wrapper = document.createElement('div');
    wrapper.className = node.type === 'folder' ? 'code-tree-folder' : 'code-tree-file';

    if (node.type === 'folder') {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-tree-row';
      button.innerHTML =
        '<span class="tree-chevron icon-chevron-' + (node.expanded === false ? 'right' : 'down') + '" aria-hidden="true"></span>' +
        '<span class="tree-icon icon-folder2" aria-hidden="true"></span>' +
        '<span class="tree-label">' + escapeHtml(node.label) + '</span>';
      wrapper.appendChild(button);

      var group = document.createElement('div');
      group.className = 'code-tree-group';
      if (node.expanded === false) group.hidden = true;
      (node.children || []).forEach(function (child) {
        group.appendChild(buildTreeNode(child));
      });
      wrapper.appendChild(group);

      button.addEventListener('click', function () {
        var isHidden = group.hidden;
        group.hidden = !isHidden;
        var chevron = button.querySelector('.tree-chevron');
        chevron.className = 'tree-chevron icon-chevron-' + (isHidden ? 'down' : 'right');
      });
    } else {
      var fileButton = document.createElement('button');
      fileButton.type = 'button';
      fileButton.className = 'code-tree-row';
      fileButton.dataset.fileKey = node.key;
      var iconClass = 'icon-file-empty';
      if (/\.(js|ts|jsx|tsx|xml|json|md|txt|yml|yaml|html|css)$/i.test(node.label)) {
        iconClass = 'icon-file-text2';
      } else if (/\.(pdf)$/i.test(node.label)) {
        iconClass = 'icon-file-pdf';
      } else if (/\.(doc|docx)$/i.test(node.label)) {
        iconClass = 'icon-file-word';
      } else if (/\.(xls|xlsx|csv)$/i.test(node.label)) {
        iconClass = 'icon-file-excel';
      }
      fileButton.innerHTML =
        '<span class="tree-chevron tree-chevron-placeholder" aria-hidden="true"></span>' +
        '<span class="tree-icon ' + iconClass + '" aria-hidden="true"></span>' +
        '<span class="tree-label">' + escapeHtml(node.label) + '</span>';
      wrapper.appendChild(fileButton);
    }

    return wrapper;
  }

  function initCodeWorkbench(root) {
    if (!root) return;

    var data = window.EXPERIENCE_CODE || window.EXPERIENCE_KRAYDEN_CODE;
    if (!data) return;
    var treeEl = root.querySelector('#experienceCodeTree');
    var titleEl = root.querySelector('#experienceCodeTitle');
    var pathEl = root.querySelector('#experienceCodePath');
    var bodyEl = root.querySelector('#experienceCodeBody');
    var copyBtn = root.querySelector('#experienceCodeCopy');
    var copyStatus = root.querySelector('#experienceCodeStatus');
    var activeKey = data.defaultKey;

    function renderCode(key) {
      var file = data.files[key];
      if (!file) return;
      activeKey = key;
      titleEl.textContent = file.label;
      pathEl.textContent = file.path;

      var lines = file.code.split('\n');
      var table = document.createElement('table');
      table.className = 'code-table';
      var tbody = document.createElement('tbody');
      lines.forEach(function (line, index) {
        var row = document.createElement('tr');
        var lineCell = document.createElement('td');
        lineCell.className = 'code-line';
        lineCell.textContent = index + 1;
        var codeCell = document.createElement('td');
        codeCell.className = 'code-content';
        var code = document.createElement('code');
        code.textContent = line || ' ';
        codeCell.appendChild(code);
        row.appendChild(lineCell);
        row.appendChild(codeCell);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      bodyEl.innerHTML = '';
      bodyEl.appendChild(table);

      Array.prototype.forEach.call(treeEl.querySelectorAll('[data-file-key]'), function (button) {
        button.classList.toggle('is-active', button.dataset.fileKey === key);
      });

      if (copyStatus) {
        copyStatus.textContent = file.section + ' · ' + file.project;
      }
    }

    treeEl.innerHTML = '';
    data.tree.forEach(function (node) {
      treeEl.appendChild(buildTreeNode(node));
    });

    treeEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-file-key]');
      if (!button) return;
      renderCode(button.dataset.fileKey);
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var file = data.files[activeKey];
        if (!file) return;
        navigator.clipboard.writeText(file.code).then(function () {
          if (copyStatus) copyStatus.textContent = file.label + ' copied to clipboard.';
        }).catch(function () {
          if (copyStatus) copyStatus.textContent = 'Copy failed. Clipboard access may be blocked.';
        });
      });
    }

    renderCode(activeKey);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    Array.prototype.forEach.call(document.querySelectorAll('[data-bravo-carousel]'), function (root) {
      initBravoCarousel(root);
    });
    initCodeWorkbench(document.querySelector('[data-code-workbench]'));
  });
})();
