(function() {
  function setup() {
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
