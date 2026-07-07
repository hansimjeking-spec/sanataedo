(function() {
  var GUIDE_HTML =
    '<div class="workflow-card" aria-label="현장 사용 순서">' +
      '<strong>현장 사용 순서</strong>' +
      '<ol>' +
        '<li>중심 대상자와 가족/주요 인물을 입력합니다.</li>' +
        '<li>부부·부모-자녀 관계와 정서 관계를 정리합니다.</li>' +
        '<li>동거가족을 묶고 필요한 지역자원을 연결합니다.</li>' +
        '<li>내부용은 편집 데이터 포함 PNG, 외부공유용은 마스킹 PNG로 저장합니다.</li>' +
      '</ol>' +
      '<p>실제 사례정보를 넣었다면 외부 공유 전 반드시 마스킹 저장을 사용하세요.</p>' +
    '</div>';

  var RESOURCE_TEMPLATES = [
    { label: '행정복지센터', name: '행정복지센터', type: 'info', memo: '공적급여·복지상담 연계', relationship: 'good', direction: 'both' },
    { label: '종합사회복지관', name: '종합사회복지관', type: 'care', memo: '사례관리 및 서비스 연계', relationship: 'good', direction: 'both' },
    { label: '병원/보건소', name: '병원/보건소', type: 'care', memo: '진료 및 건강관리', relationship: 'good', direction: 'both' },
    { label: '후원처', name: '후원처', type: 'money', memo: '후원물품·후원금 연계', relationship: 'good', direction: 'in' },
    { label: '이웃/지인', name: '이웃/지인', type: 'emotional', memo: '비공식 지지체계', relationship: 'good', direction: 'both' },
    { label: '위험·부담요인', name: '위험·부담요인', type: 'risk', memo: '갈등 또는 부담 요인', relationship: 'conflict', direction: 'both' }
  ];

  function boot() {
    relabelForFieldWork();
    addWorkflowGuide();
    addSectionAnchors();
    addToolbarButtons();
    addResourceTemplates();
    addStatusPrivacyBadge();
  }

  function relabelForFieldWork() {
    setText('.app-title', '가계도·생태도 작성 도구');
    setLabel('mapTitle', '출력 제목');
    setLabel('clientName', '중심 대상자 이름');
    setSectionTitle(1, '가족/주요 인물 추가');
    setLabel('newPersonName', '이름 또는 관계명');
    setLabel('newRole', '중심 대상자와의 관계');
    setLabel('newOutgoingRelationship', '대상자 → 이 인물');
    setLabel('newIncomingRelationship', '이 인물 → 대상자');
    setSectionTitle(2, '가족/주요 인물');
    setSectionTitle(6, '선택 인물 또는 가구 자원 추가');
    setLabel('resourceRelationship', '관계 정도');
    setLabel('resourceDirection', '지원 방향');
    setLabel('resourceMemo', '지원 내용 또는 주요 역할');
    setText('#addPerson', '가족/주요 인물 추가');
    setText('#addResource', '자원 연결');
    setText('#saveButton', '편집용 PNG 저장');
    var status = document.getElementById('statusText');
    if (status) {
      status.textContent = '한 번 클릭하면 선택, 빠르게 두 번 누르면 바로 수정, Backspace는 되돌리기입니다.';
    }
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function setLabel(forId, value) {
    var label = document.querySelector('label[for="' + forId + '"]');
    if (label) label.textContent = value;
  }

  function setSectionTitle(index, value) {
    var titles = document.querySelectorAll('.section-title');
    if (!titles[index]) return;
    var firstSpan = titles[index].querySelector('span:first-child');
    if (firstSpan) firstSpan.textContent = value;
    else titles[index].childNodes[0].textContent = value;
  }

  function addWorkflowGuide() {
    var title = document.querySelector('.app-title');
    if (!title || document.querySelector('.workflow-card')) return;
    title.insertAdjacentHTML('afterend', GUIDE_HTML);
  }

  function addSectionAnchors() {
    var sections = document.querySelectorAll('.sidebar .section');
    var targets = [
      { index: 1, id: 'family-input', label: '가족 입력' },
      { index: 4, id: 'relationship-edit', label: '관계 편집' },
      { index: 6, id: 'resource-input', label: '자원 연결' },
      { index: -1, id: 'export-area', label: '저장/출력' }
    ];
    targets.forEach(function(target) {
      if (target.index >= 0 && sections[target.index]) sections[target.index].id = target.id;
    });
    var sidebarActions = document.querySelector('.sidebar-actions');
    if (sidebarActions) sidebarActions.id = 'export-area';
    var guide = document.querySelector('.workflow-card');
    if (!guide || document.querySelector('.workflow-nav')) return;
    guide.insertAdjacentHTML('afterend', '<nav class="workflow-nav" aria-label="작성 단계 바로가기">' +
      targets.map(function(target) {
        return '<a href="#' + target.id + '">' + target.label + '</a>';
      }).join('') + '</nav>');
  }

  function addToolbarButtons() {
    var toolbar = document.querySelector('.toolbar');
    var spacer = document.querySelector('.toolbar-spacer');
    if (!toolbar || document.getElementById('jsonButton')) return;
    var html =
      '<button class="btn secondary-emphasis" id="jsonButton" type="button">JSON 백업</button>' +
      '<button class="btn secondary-emphasis" id="maskedSaveButton" type="button">마스킹 PNG</button>' +
      '<button class="btn" id="a4SaveButton" type="button">A4 가로 PNG</button>' +
      '<button class="btn" id="printButton" type="button">PDF/인쇄</button>' +
      '<span class="export-note">외부공유는 마스킹 PNG 권장</span>';
    if (spacer) spacer.insertAdjacentHTML('beforebegin', html);
    else toolbar.insertAdjacentHTML('beforeend', html);

    document.getElementById('jsonButton').addEventListener('click', function() {
      if (typeof downloadJson === 'function') downloadJson();
    });
    document.getElementById('maskedSaveButton').addEventListener('click', function() {
      exportSanitizedPng(false);
    });
    document.getElementById('a4SaveButton').addEventListener('click', function() {
      exportSanitizedPng(true);
    });
    document.getElementById('printButton').addEventListener('click', function() {
      if (typeof showToast === 'function') showToast('인쇄 창에서 PDF로 저장을 선택하세요.');
      window.print();
    });
  }

  function addResourceTemplates() {
    var nameField = document.getElementById('resourceName');
    if (!nameField || document.querySelector('.template-grid')) return;
    var container = document.createElement('div');
    container.className = 'template-grid';
    container.setAttribute('aria-label', '자원 빠른 입력');
    RESOURCE_TEMPLATES.forEach(function(template) {
      var button = document.createElement('button');
      button.className = 'template-button';
      button.type = 'button';
      button.textContent = '+ ' + template.label;
      button.addEventListener('click', function() {
        fillResourceTemplate(template);
      });
      container.appendChild(button);
    });
    nameField.closest('.field').insertAdjacentElement('afterend', container);
  }

  function fillResourceTemplate(template) {
    setValue('resourceName', template.name);
    setValue('resourceType', template.type);
    setValue('resourceRelationship', template.relationship);
    setValue('resourceDirection', template.direction);
    setValue('resourceMemo', template.memo);
    if (typeof showToast === 'function') showToast(template.label + ' 자원 정보를 채웠습니다.');
    var memo = document.getElementById('resourceMemo');
    if (memo) memo.focus();
  }

  function setValue(id, value) {
    var element = document.getElementById(id);
    if (!element) return;
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function addStatusPrivacyBadge() {
    var statusbar = document.querySelector('.statusbar');
    if (!statusbar || document.querySelector('.privacy-badge')) return;
    statusbar.classList.add('enhanced-status');
    var badge = document.createElement('span');
    badge.className = 'privacy-badge';
    badge.textContent = '개인정보: 외부공유 전 마스킹';
    statusbar.insertBefore(badge, statusbar.querySelector('.legend'));
  }

  function exportSanitizedPng(a4) {
    var button = document.getElementById(a4 ? 'a4SaveButton' : 'maskedSaveButton');
    if (button) button.disabled = true;
    var clone = prepareExportClone(true);
    var filename = safeFilename((state && state.title) || '생태도') + (a4 ? '_A4가로' : '_마스킹') + '.png';
    renderCloneToPng(clone, filename, a4 ? { width: 3508, height: 2480, fit: true } : { width: 1760, height: 1216, fit: false })
      .then(function() {
        if (typeof showToast === 'function') showToast(a4 ? 'A4 가로 PNG를 저장했습니다.' : '마스킹 PNG를 저장했습니다.');
      })
      .catch(function() {
        if (typeof showToast === 'function') showToast('PNG 저장 중 오류가 발생했습니다.');
      })
      .finally(function() {
        if (button) setTimeout(function() { button.disabled = false; }, 1200);
      });
  }

  function prepareExportClone(sanitized) {
    var clone = svg.cloneNode(true);
    clone.setAttribute('width', '1100');
    clone.setAttribute('height', '760');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', '1100');
    background.setAttribute('height', '760');
    background.setAttribute('fill', '#f7f8fa');
    clone.insertBefore(background, clone.firstChild);
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = collectCssText();
    clone.insertBefore(style, clone.firstChild);
    if (sanitized) sanitizeClone(clone);
    return clone;
  }

  function collectCssText() {
    return Array.from(document.styleSheets).map(function(sheet) {
      try {
        return Array.from(sheet.cssRules).map(function(rule) { return rule.cssText; }).join('\n');
      } catch (error) {
        return '';
      }
    }).join('\n');
  }

  function sanitizeClone(clone) {
    clone.querySelectorAll('.person-node').forEach(function(node) {
      var person = state.people.find(function(item) { return item.id === node.dataset.personId; });
      var name = node.querySelector('.node-name');
      var year = node.querySelector('.node-year');
      if (name && person) name.textContent = person.role === 'client' ? '대상자' : maskKoreanName(person.name);
      if (year) year.textContent = '(연도 숨김)';
    });
    clone.querySelectorAll('.resource-meta').forEach(function(node) {
      node.textContent = '지원내용 숨김';
    });
    var titleNode = clone.querySelector('.map-title');
    if (titleNode) titleNode.textContent = '가계도·생태도';
  }

  function maskKoreanName(value) {
    var text = String(value || '가족');
    if (text.length <= 1) return '○';
    if (/^[가-힣]{2,4}$/.test(text)) return text[0] + '○'.repeat(text.length - 1);
    return text.replace(/[가-힣A-Za-z0-9]/g, function(match, index) {
      return index === 0 ? match : '○';
    });
  }

  function renderCloneToPng(clone, filename, options) {
    return new Promise(function(resolve, reject) {
      var blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = options.width;
          canvas.height = options.height;
          var context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          if (options.fit) {
            var scale = Math.min(canvas.width / 1100, canvas.height / 760) * 0.96;
            var drawWidth = 1100 * scale;
            var drawHeight = 760 * scale;
            context.fillStyle = '#f7f8fa';
            context.fillRect((canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
            context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
          } else {
            context.fillStyle = '#f7f8fa';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
          }
          URL.revokeObjectURL(url);
          canvas.toBlob(function(png) {
            if (!png) return reject(new Error('empty png'));
            downloadBlob(png, filename);
            resolve();
          }, 'image/png');
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('image load failed'));
      };
      image.src = url;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
