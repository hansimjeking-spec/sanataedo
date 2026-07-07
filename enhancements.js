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

  var extendedDragging = null;
  var wrappedRenderMap = false;

  function boot() {
    ensureExtendedState();
    wrapRenderMap();
    relabelForFieldWork();
    addWorkflowGuide();
    addSectionAnchors();
    addToolbarButtons();
    addResourceTemplates();
    addResourceTargetField();
    addCustomLinkPanel();
    addStatusPrivacyBadge();
    installExtendedEvents();
    renderExtendedPanels();
    renderMap();
  }

  function ensureExtendedState() {
    if (!window.state) return;
    state.householdResources = Array.isArray(state.householdResources) ? state.householdResources : [];
    state.customLinks = Array.isArray(state.customLinks) ? state.customLinks : [];
    state.householdResources = state.householdResources.map(function(resource, index) {
      var normalized = normalizeGroupResource(resource, index);
      return normalized;
    }).filter(Boolean);
    state.customLinks = state.customLinks.map(function(link) {
      return {
        id: link.id || uid(),
        from: personById(link.from) ? link.from : null,
        to: personById(link.to) ? link.to : null,
        outType: normalizeDirectedRelationshipType(link.outType),
        inType: normalizeDirectedRelationshipType(link.inType)
      };
    }).filter(function(link) {
      return link.from && link.to && link.from !== link.to && !(link.outType === 'none' && link.inType === 'none');
    });
  }

  function normalizeGroupResource(resource, index) {
    resource = resource || {};
    resource.id = resource.id || uid();
    resource.targetType = resource.targetType === 'household' ? 'household' : 'all';
    resource.targetId = resource.targetType === 'household' && householdById(resource.targetId) ? resource.targetId : null;
    resource.type = resourceTypes[resource.type] ? resource.type : 'info';
    resource.name = resource.name || '가구 전체 자원';
    resource.memo = resource.memo || '';
    resource.relationship = normalizeRelationshipType(resource.relationship || resource.type);
    resource.direction = directionTypes[resource.direction] ? resource.direction : 'both';
    resource.width = clamp(Number(resource.width) || 158, 110, 300);
    resource.height = clamp(Number(resource.height) || 76, 56, 170);
    if (!Number.isFinite(resource.x) || !Number.isFinite(resource.y)) {
      var center = resourceTargetCenter(resource);
      resource.x = clamp(center.x + (index % 2 === 0 ? 270 : -270), 90, 1010);
      resource.y = clamp(center.y + 120 + Math.floor(index / 2) * 80, 70, 700);
    }
    return resource;
  }

  function wrapRenderMap() {
    if (wrappedRenderMap || typeof window.renderMap !== 'function') return;
    wrappedRenderMap = true;
    var originalRenderMap = window.renderMap;
    window.renderMap = function() {
      ensureExtendedState();
      originalRenderMap();
      drawCustomLinks();
      drawHouseholdResources();
    };
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
    setSectionTitle(5, '선택 인물 또는 가구 자원 추가');
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
      { index: 5, id: 'resource-input', label: '자원 연결' },
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

  function addResourceTargetField() {
    var resourceName = document.getElementById('resourceName');
    if (!resourceName || document.getElementById('resourceTarget')) return;
    resourceName.closest('.field').insertAdjacentHTML('beforebegin',
      '<div class="field"><label for="resourceTarget">자원 연결 대상</label>' +
      '<select id="resourceTarget"></select></div>');
    document.getElementById('resourceTarget').addEventListener('change', updateResourceTargetHint);
    var addButton = document.getElementById('addResource');
    addButton.addEventListener('click', function(event) {
      var targetValue = document.getElementById('resourceTarget').value;
      if (targetValue === 'person') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      addGroupResource(targetValue);
    }, true);
  }

  function updateResourceTargetOptions() {
    var select = document.getElementById('resourceTarget');
    if (!select) return;
    var previous = select.value || 'person';
    var selected = selectedPerson();
    var options = [
      { value: 'person', label: '선택 인물: ' + selected.name },
      { value: 'all', label: '전체 가구' }
    ];
    state.households.forEach(function(household, index) {
      options.push({
        value: 'household:' + household.id,
        label: household.name || '동거가족 ' + (index + 1)
      });
    });
    select.innerHTML = options.map(function(option) {
      return '<option value="' + attr(option.value) + '"' + (option.value === previous ? ' selected' : '') + '>' +
        escapeHtml(option.label) + '</option>';
    }).join('');
    if (!Array.from(select.options).some(function(option) { return option.value === previous; })) {
      select.value = 'person';
    }
    updateResourceTargetHint();
  }

  function updateResourceTargetHint() {
    var target = document.getElementById('resourceTarget');
    var addButton = document.getElementById('addResource');
    if (!target || !addButton) return;
    addButton.textContent = target.value === 'person' ? '자원 연결' : '가구 자원 연결';
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

  function addGroupResource(targetValue) {
    ensureExtendedState();
    var name = document.getElementById('resourceName').value.trim();
    if (!name) {
      showToast('기관명 또는 자원 이름을 입력해주세요.');
      document.getElementById('resourceName').focus();
      return;
    }
    rememberUndo();
    var target = parseResourceTarget(targetValue);
    var resource = {
      id: uid(),
      targetType: target.type,
      targetId: target.id,
      type: document.getElementById('resourceType').value,
      name: name,
      memo: document.getElementById('resourceMemo').value.trim(),
      relationship: document.getElementById('resourceRelationship').value,
      direction: document.getElementById('resourceDirection').value,
      width: 158,
      height: 76
    };
    var center = resourceTargetCenter(resource);
    var sameTargetCount = state.householdResources.filter(function(item) {
      return item.targetType === resource.targetType && item.targetId === resource.targetId;
    }).length;
    resource.x = clamp(center.x + (sameTargetCount % 2 === 0 ? 280 : -280), 90, 1010);
    resource.y = clamp(center.y + 110 + Math.floor(sameTargetCount / 2) * 86, 70, 700);
    state.householdResources.push(resource);
    clearResourceInputs();
    saveLocalState();
    renderMap();
    renderExtendedPanels();
    showToast('가구 단위 자원을 연결했습니다.');
  }

  function parseResourceTarget(value) {
    if (value && value.indexOf('household:') === 0) {
      var id = value.slice('household:'.length);
      if (householdById(id)) return { type: 'household', id: id };
    }
    return { type: 'all', id: null };
  }

  function clearResourceInputs() {
    ['resourceName', 'resourceMemo'].forEach(function(id) {
      var element = document.getElementById(id);
      if (element) element.value = '';
    });
  }

  function addCustomLinkPanel() {
    var selectedSection = document.getElementById('relationship-edit');
    if (!selectedSection || document.getElementById('customLinkPanel')) return;
    selectedSection.insertAdjacentHTML('afterend',
      '<section class="section" id="customLinkPanel">' +
        '<h2 class="section-title">인물 간 관계선 자유 연결</h2>' +
        '<div class="extension-panel">' +
          '<p class="hint">중심 대상자를 거치지 않고 가족 구성원끼리 직접 정서관계를 표시합니다. 예: 자녀와 손자녀, 형제 간 갈등, 전 배우자와의 소원 관계.</p>' +
          '<div class="row"><div class="field"><label for="customLinkFrom">시작 인물</label><select id="customLinkFrom"></select></div>' +
          '<div class="field"><label for="customLinkTo">대상 인물</label><select id="customLinkTo"></select></div></div>' +
          '<div class="row"><div class="field"><label for="customLinkOut">시작 → 대상</label><select id="customLinkOut"></select></div>' +
          '<div class="field"><label for="customLinkIn">대상 → 시작</label><select id="customLinkIn"></select></div></div>' +
          '<button class="btn primary full" id="addCustomLink" type="button">관계선 추가</button>' +
          '<div class="extension-list" id="customLinkList"></div>' +
        '</div>' +
      '</section>');
    fillSelect(document.getElementById('customLinkOut'), directedSocialTypes, 'good');
    fillSelect(document.getElementById('customLinkIn'), directedSocialTypes, 'good');
    document.getElementById('addCustomLink').addEventListener('click', addCustomLink);
  }

  function updateCustomLinkOptions() {
    var from = document.getElementById('customLinkFrom');
    var to = document.getElementById('customLinkTo');
    if (!from || !to) return;
    var previousFrom = from.value;
    var previousTo = to.value;
    var options = state.people.map(function(person) {
      return '<option value="' + attr(person.id) + '">' + escapeHtml(person.name + ' · ' + roles[person.role].label) + '</option>';
    }).join('');
    from.innerHTML = options;
    to.innerHTML = options;
    if (personById(previousFrom)) from.value = previousFrom;
    if (personById(previousTo)) to.value = previousTo;
    if (!to.value || to.value === from.value) {
      var fallback = state.people.find(function(person) { return person.id !== from.value; });
      if (fallback) to.value = fallback.id;
    }
  }

  function addCustomLink() {
    ensureExtendedState();
    var from = document.getElementById('customLinkFrom').value;
    var to = document.getElementById('customLinkTo').value;
    var outType = document.getElementById('customLinkOut').value;
    var inType = document.getElementById('customLinkIn').value;
    if (!from || !to || from === to) {
      showToast('서로 다른 두 인물을 선택해주세요.');
      return;
    }
    if (outType === 'none' && inType === 'none') {
      showToast('표시할 관계를 하나 이상 선택해주세요.');
      return;
    }
    rememberUndo();
    var client = clientPerson();
    if (client && (from === client.id || to === client.id)) {
      if (from === client.id) upsertSocialLink(from, to, outType, inType);
      else upsertSocialLink(to, from, inType, outType);
    } else {
      var existing = state.customLinks.find(function(link) {
        return (link.from === from && link.to === to) || (link.from === to && link.to === from);
      });
      if (existing) {
        if (existing.from === from) {
          existing.outType = outType;
          existing.inType = inType;
        } else {
          existing.outType = inType;
          existing.inType = outType;
        }
      } else {
        state.customLinks.push({ id: uid(), from: from, to: to, outType: outType, inType: inType });
      }
    }
    saveLocalState();
    renderMap();
    renderExtendedPanels();
    showToast('인물 간 관계선을 추가했습니다.');
  }

  function renderExtendedPanels() {
    ensureExtendedState();
    updateResourceTargetOptions();
    updateCustomLinkOptions();
    renderCustomLinkList();
    renderHouseholdResourceList();
  }

  function renderCustomLinkList() {
    var list = document.getElementById('customLinkList');
    if (!list) return;
    var items = state.customLinks.filter(function(link) {
      return personById(link.from) && personById(link.to);
    });
    if (!items.length) {
      list.innerHTML = '<div class="empty">직접 연결한 인물 간 관계선이 없습니다.</div>';
      return;
    }
    list.innerHTML = items.map(function(link) {
      var from = personById(link.from);
      var to = personById(link.to);
      return '<div class="extension-card"><div><strong>' + escapeHtml(from.name + ' ↔ ' + to.name) + '</strong>' +
        '<span>' + escapeHtml(directedSocialTypes[link.outType] + ' / ' + directedSocialTypes[link.inType]) + '</span></div>' +
        '<div class="extension-card-actions"><button class="delete-icon" type="button" data-custom-link-delete="' + attr(link.id) + '">×</button></div></div>';
    }).join('');
    list.querySelectorAll('[data-custom-link-delete]').forEach(function(button) {
      button.addEventListener('click', function() {
        rememberUndo();
        state.customLinks = state.customLinks.filter(function(link) { return link.id !== button.dataset.customLinkDelete; });
        saveLocalState();
        renderMap();
        renderExtendedPanels();
      });
    });
  }

  function renderHouseholdResourceList() {
    var list = document.getElementById('groupResourceList');
    var panel = document.getElementById('groupResourcePanel');
    if (!panel) {
      var resourceList = document.getElementById('resourceList');
      if (!resourceList) return;
      resourceList.insertAdjacentHTML('afterend',
        '<div class="extension-panel" id="groupResourcePanel">' +
          '<p class="hint">가구 전체나 동거가족에 연결한 자원입니다.</p>' +
          '<div class="extension-list" id="groupResourceList"></div>' +
        '</div>');
      list = document.getElementById('groupResourceList');
    }
    if (!list) return;
    if (!state.householdResources.length) {
      list.innerHTML = '<div class="empty">가구 단위로 연결한 자원이 없습니다.</div>';
      return;
    }
    list.innerHTML = state.householdResources.map(function(resource) {
      return '<div class="extension-card"><div><strong>' + escapeHtml(resource.name) + '</strong>' +
        '<span>' + escapeHtml(resourceTargetLabel(resource) + ' · ' + (resource.memo || '지원 내용 미입력')) + '</span></div>' +
        '<div class="extension-card-actions"><button class="select-resource" type="button" data-group-resource-focus="' + attr(resource.id) + '">선택</button>' +
        '<button class="delete-icon" type="button" data-group-resource-delete="' + attr(resource.id) + '">×</button></div></div>';
    }).join('');
    list.querySelectorAll('[data-group-resource-focus]').forEach(function(button) {
      button.addEventListener('click', function() {
        var resource = groupResourceById(button.dataset.groupResourceFocus);
        if (!resource) return;
        resource.x = clamp(resource.x, 90, 1010);
        resource.y = clamp(resource.y, 70, 700);
        renderMap();
      });
    });
    list.querySelectorAll('[data-group-resource-delete]').forEach(function(button) {
      button.addEventListener('click', function() {
        rememberUndo();
        state.householdResources = state.householdResources.filter(function(resource) {
          return resource.id !== button.dataset.groupResourceDelete;
        });
        saveLocalState();
        renderMap();
        renderExtendedPanels();
      });
    });
  }

  function drawCustomLinks() {
    ensureExtendedState();
    state.customLinks.forEach(function(link) {
      var from = personById(link.from);
      var to = personById(link.to);
      if (!from || !to) return;
      drawExtendedSocialLink(link, from, to);
    });
  }

  function drawExtendedSocialLink(link, from, to) {
    var outType = normalizeDirectedRelationshipType(link.outType);
    var inType = normalizeDirectedRelationshipType(link.inType);
    var endpoints = connectionEndpoints(from.x, from.y, to.x, to.y, 49, 49);
    if (outType !== 'none' && outType === inType) {
      insertSocialPath(endpoints, outType, 'both');
      return;
    }
    var hasTwoLines = outType !== 'none' && inType !== 'none';
    if (outType !== 'none') insertSocialPath(offsetConnectionEndpoints(endpoints, hasTwoLines ? 6 : 0), outType, 'out');
    if (inType !== 'none') insertSocialPath(offsetConnectionEndpoints(endpoints, hasTwoLines ? -6 : 0), inType, 'in');
  }

  function insertSocialPath(endpoints, type, direction) {
    var path = makeSvg('path', {
      d: relationshipPath(endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2, type),
      class: 'social-line custom-social-line ' + type
    });
    applyRelationshipDirection(path, type, direction);
    insertUnderNodes(path);
  }

  function drawHouseholdResources() {
    ensureExtendedState();
    state.householdResources.forEach(function(resource) {
      var center = resourceTargetCenter(resource);
      var path = makeSvg('path', {
        d: resourceConnectionPath({ x: center.x, y: center.y }, resource, resource.relationship),
        class: 'resource-link group-resource-link ' + resource.relationship
      });
      applyRelationshipDirection(path, resource.relationship, resource.direction);
      insertUnderNodes(path);
      svg.appendChild(groupResourceNode(resource));
    });
  }

  function groupResourceNode(resource) {
    var tone = resourceTypes[resource.type].tone;
    var group = makeSvg('g', {
      class: 'resource-node group-resource-node ' + tone,
      transform: 'translate(' + resource.x + ' ' + resource.y + ')'
    });
    group.dataset.groupResourceId = resource.id;
    group.appendChild(makeSvg('rect', {
      class: 'resource-box',
      x: -resource.width / 2,
      y: -resource.height / 2,
      width: resource.width,
      height: resource.height,
      rx: 5
    }));
    if (typeof addResourceLabel === 'function') addResourceLabel(group, resource);
    var scope = makeSvg('text', { class: 'resource-scope', y: -resource.height / 2 + 12 });
    scope.textContent = resourceTargetLabel(resource);
    group.appendChild(scope);
    var handle = makeSvg('rect', {
      class: 'resize-handle',
      x: resource.width / 2 - 9,
      y: resource.height / 2 - 9,
      width: 14,
      height: 14,
      rx: 2
    });
    handle.addEventListener('pointerdown', startGroupResourceResize);
    group.appendChild(handle);
    group.addEventListener('pointerdown', startGroupResourceDrag);
    return group;
  }

  function startGroupResourceDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    var resource = groupResourceById(event.currentTarget.dataset.groupResourceId);
    if (!resource) return;
    var point = svgPoint(event);
    extendedDragging = {
      kind: 'group-resource',
      id: resource.id,
      dx: point.x - resource.x,
      dy: point.y - resource.y,
      undoSnapshot: createUndoSnapshot()
    };
    if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
  }

  function startGroupResourceResize(event) {
    event.preventDefault();
    event.stopPropagation();
    var group = event.currentTarget.parentNode;
    var resource = groupResourceById(group.dataset.groupResourceId);
    if (!resource) return;
    extendedDragging = {
      kind: 'group-resource-resize',
      id: resource.id,
      left: resource.x - resource.width / 2,
      top: resource.y - resource.height / 2,
      undoSnapshot: createUndoSnapshot()
    };
    if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
  }

  function installExtendedEvents() {
    if (window.__ecomapExtendedEventsInstalled) return;
    window.__ecomapExtendedEventsInstalled = true;
    svg.addEventListener('pointermove', function(event) {
      if (!extendedDragging) return;
      var resource = groupResourceById(extendedDragging.id);
      if (!resource) return;
      var point = svgPoint(event);
      if (extendedDragging.kind === 'group-resource') {
        resource.x = clamp(point.x - extendedDragging.dx, resource.width / 2 + 10, 1090 - resource.width / 2);
        resource.y = clamp(point.y - extendedDragging.dy, resource.height / 2 + 10, 750 - resource.height / 2);
      } else {
        resource.width = clamp(point.x - extendedDragging.left, 110, 300);
        resource.height = clamp(point.y - extendedDragging.top, 56, 170);
        resource.x = extendedDragging.left + resource.width / 2;
        resource.y = extendedDragging.top + resource.height / 2;
      }
      renderMap();
    });
    svg.addEventListener('pointerup', finishExtendedDrag);
    svg.addEventListener('pointercancel', finishExtendedDrag);
  }

  function finishExtendedDrag() {
    if (!extendedDragging) return;
    rememberUndo(extendedDragging.undoSnapshot);
    extendedDragging = null;
    saveLocalState();
    renderExtendedPanels();
  }

  function insertUnderNodes(element) {
    var before = svg.querySelector('.person-node') || svg.querySelector('.resource-node');
    if (before) svg.insertBefore(element, before);
    else svg.appendChild(element);
  }

  function resourceTargetCenter(resource) {
    var members = [];
    if (resource.targetType === 'household' && resource.targetId) {
      var household = householdById(resource.targetId);
      members = household ? household.memberIds.map(personById).filter(Boolean) : [];
    } else {
      members = state.people.slice();
    }
    if (!members.length) members = [clientPerson()].filter(Boolean);
    return {
      x: average(members.map(function(person) { return person.x; }), 550),
      y: average(members.map(function(person) { return person.y; }), 400)
    };
  }

  function resourceTargetLabel(resource) {
    if (resource.targetType === 'household' && resource.targetId) {
      var household = householdById(resource.targetId);
      return household ? household.name : '동거가족';
    }
    return '전체 가구';
  }

  function householdById(id) {
    return state && state.households ? state.households.find(function(household) { return household.id === id; }) : null;
  }

  function groupResourceById(id) {
    return state.householdResources.find(function(resource) { return resource.id === id; });
  }

  function average(values, fallback) {
    values = values.filter(function(value) { return Number.isFinite(value); });
    if (!values.length) return fallback;
    return values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
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
    renderMap();
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
    clone.querySelectorAll('.resource-scope').forEach(function(node) {
      node.textContent = '가구 자원';
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
