(function(){
  function getTargets(){
    return Array.from(document.querySelectorAll([
      '.hero-banner',
      '.hero-copy',
      '.hero-frame',
      '.hero-bar',
      '.hero-panel',
      '.overview-panel',
      '.phase-panel',
      '.experience-panel',
      '.journey-panel',
      '.hero-strip',
      '.hero-metrics',
      '.hero-actions',
      '.summary-card',
      '.info-card',
      '.resource-card',
      '.feature-card',
      '.method-card',
      '.nav-card',
      '.source-card',
      '.question-card',
      '.side-panel',
      '.editor-panel',
      '.semester-card',
      '.subject-card',
      '.topic-card',
      '.meta-card',
      '.split-panel',
      '.report-panel',
      '.cheatsheet-panel',
      '.download-card',
      '.certificate-card',
      '.placeholder-card',
      '.experience-card',
      '.bravo-card',
      '.snapshot-card',
      '.journey-card',
      '.smoke-panel',
      '.smoke-summary-panel',
      '.smoke-history-panel',
      '.tracker-panel',
      '.tracker-summary-panel',
      '.tracker-history-panel',
      '.subject-nav-card'
    ].join(',')));
  }

  function tagTargets(nodes){
    nodes.forEach(function(node, index){
      if(node.classList.contains('hs-reveal')){
        return;
      }
      node.classList.add('hs-reveal');
      if(node.matches('.hero-copy, .hero-banner, .journey-panel, .nav-card')){
        node.classList.add('hs-from-left');
      }else if(node.matches('.hero-panel, .overview-panel, .phase-panel, .experience-panel, .source-card')){
        node.classList.add('hs-from-right');
      }
      node.style.setProperty('--hs-delay', String((index % 6) * 60) + 'ms');
    });
  }

  function revealTargets(nodes){
    if(!('IntersectionObserver' in window)){
      nodes.forEach(function(node){ node.classList.add('hs-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('hs-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -10% 0px'
    });

    nodes.forEach(function(node){ observer.observe(node); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var nodes = getTargets();
    tagTargets(nodes);
    revealTargets(nodes);
  });
})();
