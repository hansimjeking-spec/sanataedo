(function() {
  function setup() {
    cleanupExportPanel();
    cleanupToolbar();
    setupSidebarAccordion();
  }

  function cleanupExportPanel() {
    var panel = document.getElementById('documentExportPanel');
    if (!panel) return;
    remove('exportMeeting');
    remove('exportCaseRecord');
    remove('exportIntake');
    remove('copyDocumentImage');
    removeOption('exportHideMemo');
    removeOption('exportHideYears');
    var title = panel.querySelector('.section-title');
    if (title) title.textContent = '외부 공유';
    var external = document.getElementById('exportExternal');
    if (external) {
      external.textContent = '외부공유용 마스킹 PNG';
      external.classList.add('full-row');
      external.addEventListener('click', markExportMaskMode, true);
    }
    var hint = panel.querySelector('.export-options .hint');
    if (hint) hint.textContent = '이름, 출생·사망연도, 지원내용이 이미지에 직접 드러나지 않게 저장합니다.';
  }

  function cleanupToolbar() {
    remove('jsonButton');
    var toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.classList.add('clean-toolbar');
  }

  function setupSidebarAccordion() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.add('clean-sidebar');
    addSidebarControls(sidebar);
    var sections = Array.prototype.filter.call(sidebar.children, function(child) {
      return child.classList && child.classList.contains('section');
    });
    sections.forEach(function(section, index) {
      prepareSection(section, index);
    });
    var saved = localStorage.getItem('ecomapSimpleSidebar');
    var simple = saved === null ? true : saved === 'true';
    setSimpleMode(sidebar, simple);
  }

  function addSidebarControls(sidebar) {
    if (document.getElementById('sidebarViewControls')) return;
    var title = sidebar.querySelector('.app-title');
    if (!title) return;
    title.insertAdjacentHTML('afterend',
      '<div class="sidebar-view-controls" id="sidebarViewControls">' +
        '<button class="btn small" id="toggleSimpleSidebar" type="button">전체 보기</button>' +
        '<button class="btn small" id="expandSidebarSections" type="button">모두 펼치기</button>' +
        '<button class="btn small" id="collapseSidebarSections" type="button">모두 접기</button>' +
      '</div>');
    document.getElementById('toggleSimpleSidebar').addEventListener('click', function() {
      setSimpleMode(sidebar, !sidebar.classList.contains('simple-sidebar'));
    });
    document.getElementById('expandSidebarSections').addEventListener('click', function() {
      setAllSections(false);
    });
    document.getElementById('collapseSidebarSections').addEventListener('click', function() {
      setAllSections(true);
    });
  }

  function prepareSection(section, index) {
    if (section.classList.contains('collapsible-section')) return;
    var title = section.querySelector('.section-title');
    if (!title) return;
    section.classList.add('collapsible-section');
    var body = document.createElement('div');
    body.className = 'section-body';
    var node = title.nextSibling;
    while (node) {
      var next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    section.appendChild(body);
    var toggle = document.createElement('button');
    toggle.className = 'section-collapse-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', '섹션 접기 또는 펼치기');
    toggle.textContent = '▾';
    title.appendChild(toggle);
    title.addEventListener('click', function(event) {
      if (event.target.closest('button, input, select, textarea, a')) return;
      toggleSection(section);
    });
    toggle.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      toggleSection(section);
    });
    section.dataset.defaultOpen = index < 2 ? 'true' : 'false';
  }

  function setSimpleMode(sidebar, enabled) {
    sidebar.classList.toggle('simple-sidebar', enabled);
    localStorage.setItem('ecomapSimpleSidebar', String(enabled));
    var toggle = document.getElementById('toggleSimpleSidebar');
    if (toggle) toggle.textContent = enabled ? '전체 보기' : '간편 보기';
    if (enabled) {
      Array.prototype.forEach.call(document.querySelectorAll('.collapsible-section'), function(section) {
        setSectionCollapsed(section, section.dataset.defaultOpen !== 'true');
      });
    } else {
      setAllSections(false);
    }
  }

  function setAllSections(collapsed) {
    Array.prototype.forEach.call(document.querySelectorAll('.collapsible-section'), function(section) {
      setSectionCollapsed(section, collapsed);
    });
  }

  function toggleSection(section) {
    setSectionCollapsed(section, !section.classList.contains('collapsed'));
  }

  function setSectionCollapsed(section, collapsed) {
    section.classList.toggle('collapsed', collapsed);
    var toggle = section.querySelector('.section-collapse-toggle');
    if (toggle) toggle.textContent = collapsed ? '▸' : '▾';
  }

  function remove(id) {
    var element = document.getElementById(id);
    if (element) element.remove();
  }

  function removeOption(id) {
    var input = document.getElementById(id);
    if (!input) return;
    var row = input.closest('.check-field');
    if (row) row.remove();
  }

  function markExportMaskMode() {
    var map = document.getElementById('map');
    if (!map) return;
    map.classList.add('export-mask-output');
    clearTimeout(markExportMaskMode.timer);
    markExportMaskMode.timer = setTimeout(function() {
      map.classList.remove('export-mask-output');
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(setup, 0);
    });
  } else {
    setTimeout(setup, 0);
  }
})();
