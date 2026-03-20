
(function () {
  'use strict';

  function initReveal() {
    var nodes = document.querySelectorAll('.reveal-up');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (node) { node.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    Array.prototype.forEach.call(nodes, function (node) { observer.observe(node); });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderQuiz(config) {
    var questions = config.questions || [];
    var list = document.getElementById(config.listId || 'questionList');
    var resetBtn = document.getElementById(config.resetButtonId || 'resetQuizBtn');
    var metrics = {
      questions: document.getElementById(config.metricQuestionsId || 'metricQuestions'),
      answered: document.getElementById(config.metricAnsweredId || 'metricAnswered'),
      correct: document.getElementById(config.metricCorrectId || 'metricCorrect')
    };
    var state = questions.map(function () { return { answered: false, selected: null, correct: false }; });

    function updateMetrics() {
      var answered = state.filter(function (item) { return item.answered; }).length;
      var correct = state.filter(function (item) { return item.correct; }).length;
      if (metrics.questions) metrics.questions.textContent = String(questions.length);
      if (metrics.answered) metrics.answered.textContent = String(answered);
      if (metrics.correct) metrics.correct.textContent = String(correct);
    }

    function optionClass(questionIndex, optionIndex) {
      var item = state[questionIndex];
      if (!item.answered) return '';
      if (optionIndex === questions[questionIndex].answer) return ' correct';
      if (item.selected === optionIndex && !item.correct) return ' wrong';
      return '';
    }

    function render() {
      if (!list) return;
      list.innerHTML = questions.map(function (question, questionIndex) {
        var item = state[questionIndex];
        var snippet = question.snippet ? '<div class="code-slab"><pre>' + escapeHtml(question.snippet) + '</pre></div>' : '';
        var note = item.answered ? '<div class="answer-note"><strong>' + (item.correct ? 'Correct.' : 'Check the concept.') + '</strong> ' + escapeHtml(question.explanation) + '</div>' : '';
        var options = question.options.map(function (option, optionIndex) {
          var disabled = item.answered ? ' disabled' : '';
          return '<button class="option-btn' + optionClass(questionIndex, optionIndex) + '" type="button" data-question="' + questionIndex + '" data-option="' + optionIndex + '"' + disabled + '>' + escapeHtml(option) + '</button>';
        }).join('');
        return [
          '<article class="question-card reveal-up">',
            '<div class="question-head">',
              '<div>',
                '<div class="question-tag">Q' + String(questionIndex + 1).padStart(2, '0') + '</div>',
                '<div class="question-title">' + escapeHtml(question.prompt) + '</div>',
              '</div>',
              '<div class="question-source">' + escapeHtml(question.source || 'Topic source') + '</div>',
            '</div>',
            snippet,
            '<div class="options-grid">', options, '</div>',
            note,
          '</article>'
        ].join('');
      }).join('');
      attach();
      initReveal();
      updateMetrics();
    }

    function onAnswer(event) {
      var btn = event.currentTarget;
      var q = Number(btn.getAttribute('data-question'));
      var o = Number(btn.getAttribute('data-option'));
      if (state[q].answered) return;
      state[q].answered = true;
      state[q].selected = o;
      state[q].correct = o === questions[q].answer;
      render();
    }

    function attach() {
      Array.prototype.forEach.call(list.querySelectorAll('.option-btn'), function (btn) {
        btn.addEventListener('click', onAnswer);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state = questions.map(function () { return { answered: false, selected: null, correct: false }; });
        render();
      });
    }

    render();
  }

  function initCodeEditor(config) {
    var sections = config.sections || {};
    var activeKey = config.defaultKey || Object.keys(sections)[0];
    var tabRow = document.getElementById(config.tabRowId || 'tabRow');
    var editorBody = document.getElementById(config.bodyId || 'editorBody');
    var editorTitle = document.getElementById(config.titleId || 'editorTitle');
    var editorDescription = document.getElementById(config.descriptionId || 'editorDescription');
    var editorFileLabel = document.getElementById(config.fileLabelId || 'editorFileLabel');
    var editorBadges = document.getElementById(config.badgesId || 'editorBadges');
    var copyBtn = document.getElementById(config.copyButtonId || 'copyCodeBtn');
    var copyStatus = document.getElementById(config.copyStatusId || 'copyStatus');

    function decode(value) {
      try { return atob(value); } catch (e) { return value; }
    }

    function renderEditor() {
      var section = sections[activeKey];
      if (!section) return;
      if (editorTitle) editorTitle.textContent = section.title;
      if (editorDescription) editorDescription.textContent = section.description || '';
      if (editorFileLabel) editorFileLabel.textContent = section.fileLabel || 'Main.java';
      if (editorBadges) {
        editorBadges.innerHTML = (section.badges || []).map(function (badge) {
          return '<span class="editor-badge">' + escapeHtml(badge) + '</span>';
        }).join('');
      }
      if (editorBody) {
        var lines = decode(section.code).replace(/\r\n/g, '\n').split('\n');
        editorBody.innerHTML = lines.map(function (line, index) {
          var marked = /^\s*\/\/EXERCISE|^\s*\/\/QUESTION/.test(line) ? ' marked' : '';
          return '<tr><td class="line-no">' + (index + 1) + '</td><td class="line-code' + marked + '">' + escapeHtml(line || ' ') + '</td></tr>';
        }).join('');
      }
      if (tabRow) {
        Array.prototype.forEach.call(tabRow.querySelectorAll('[data-key]'), function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-key') === activeKey);
        });
      }
    }

    if (tabRow) {
      Array.prototype.forEach.call(tabRow.querySelectorAll('[data-key]'), function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          if (!sections[key]) return;
          activeKey = key;
          renderEditor();
        });
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var section = sections[activeKey];
        if (!section || !navigator.clipboard) return;
        navigator.clipboard.writeText(decode(section.code)).then(function () {
          if (copyStatus) copyStatus.textContent = section.title + ' copied to clipboard.';
        });
      });
    }

    renderEditor();
  }

  window.TopicPages = {
    initReveal: initReveal,
    renderQuiz: renderQuiz,
    initCodeEditor: initCodeEditor,
    escapeHtml: escapeHtml
  };
})();
