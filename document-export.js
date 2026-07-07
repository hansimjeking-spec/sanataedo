(function() {
  var EXPORT_CONFIGS = {
    meeting: {
      label: '내부회의용',
      filename: '내부회의용',
      sanitized: false,
      page: 'landscape',
      footer: '내부 사례회의·슈퍼비전 자료용입니다. 외부 공유 전 개인정보 포함 여부를 확인하세요.'
    },
    caseRecord: {
      label: '사례회의록 첨부용',
      filename: '사례회의록_첨부용',
      sanitized: false,
      page: 'landscape',
      footer: '사례회의록 또는 내부 결재문서에 첨부하기 좋은 A4 가로 PNG입니다.'
    },
    intake: {
      label: '초기상담지 삽입용',
      filename: '초기상담지_삽입용',
      sanitized: false,
      page: 'portraitHalf',
      footer: '초기상담지·상담기록지에 삽입하기 좋은 세로 문서형 PNG입니다.'
    },
    external: {
      label: '외부공유용',
      filename: '외부공유용_마스킹',
      sanitized: true,
      page: 'landscape',
      footer: '외부 공유용으로 이름, 연도, 지원내용을 마스킹했습니다.'
    }
  };

  function boot() {
    addDocumentExportPanel();
  }

  function addDocumentExportPanel() {
    if (document.getElementById('documentExportPanel')) return;
    var sidebarActions = document.querySelector('.sidebar-actions');
    if (!sidebarActions) return;
    sidebarActions.insertAdjacentHTML('beforebegin',
      '<section class="section document-export-panel" id="documentExportPanel">' +
        '<h2 class="section-title">문서 출력</h2>' +
        '<div class="export-grid">' +
          '<button class="btn secondary-emphasis" id="exportMeeting" type="button">내부회의용 PNG</button>' +
          '<button class="btn secondary-emphasis" id="exportCaseRecord" type="button">사례회의록 첨부용</button>' +
          '<button class="btn" id="exportIntake" type="button">초기상담지 삽입용</button>' +
          '<button class="btn" id="exportExternal" type="button">외부공유용 마스킹</button>' +
          '<button class="btn full-row" id="copyDocumentImage" type="button">클립보드 복사</button>' +
        '</div>' +
        '<div class="export-options">' +
          '<label class="check-field"><input id="exportHideMemo" type="checkbox"><span>지원내용 숨김</span></label>' +
          '<label class="check-field"><input id="exportHideYears" type="checkbox"><span>출생·사망연도 숨김</span></label>' +
          '<label class="check-field"><input id="exportWhiteBackground" type="checkbox" checked><span>흰 배경으로 저장</span></label>' +
          '<p class="hint">외부공유용은 위 설정과 관계없이 이름·연도·지원내용을 기본 마스킹합니다.</p>' +
        '</div>' +
        '<div class="export-mode-help"><strong>추천 사용</strong>내부회의용은 사례회의·슈퍼비전, 사례회의록 첨부용은 한글 문서 붙여넣기, 외부공유용은 타 기관 공유 전에 사용하세요.</div>' +
        '<div class="export-copy-status" id="exportCopyStatus"></div>' +
      '</section>');

    document.getElementById('exportMeeting').addEventListener('click', function() {
      exportDocumentMode('meeting');
    });
    document.getElementById('exportCaseRecord').addEventListener('click', function() {
      exportDocumentMode('caseRecord');
    });
    document.getElementById('exportIntake').addEventListener('click', function() {
      exportDocumentMode('intake');
    });
    document.getElementById('exportExternal').addEventListener('click', function() {
      exportDocumentMode('external');
    });
    document.getElementById('copyDocumentImage').addEventListener('click', copyDocumentImage);
  }

  function exportDocumentMode(mode) {
    var config = EXPORT_CONFIGS[mode] || EXPORT_CONFIGS.meeting;
    var button = document.activeElement;
    if (button && button.tagName === 'BUTTON') button.disabled = true;
    renderDocumentBlob(config)
      .then(function(blob) {
        downloadBlob(blob, safeFilename((state.title || '가계도_생태도') + '_' + config.filename) + '.png');
        showExportMessage(config.label + ' PNG를 저장했습니다.');
      })
      .catch(function() {
        showExportMessage('문서용 PNG 저장 중 오류가 발생했습니다.');
      })
      .finally(function() {
        if (button && button.tagName === 'BUTTON') {
          setTimeout(function() { button.disabled = false; }, 1200);
        }
      });
  }

  function copyDocumentImage() {
    var button = document.getElementById('copyDocumentImage');
    if (button) button.disabled = true;
    renderDocumentBlob(EXPORT_CONFIGS.caseRecord)
      .then(function(blob) {
        if (!navigator.clipboard || !window.ClipboardItem) {
          downloadBlob(blob, safeFilename((state.title || '가계도_생태도') + '_클립보드대체') + '.png');
          showExportMessage('브라우저가 이미지 복사를 지원하지 않아 PNG로 저장했습니다.');
          return;
        }
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function() {
          showExportMessage('문서용 이미지를 클립보드에 복사했습니다. 한글이나 문서에 바로 붙여넣으세요.');
        });
      })
      .catch(function() {
        showExportMessage('클립보드 복사에 실패했습니다. 브라우저 권한 또는 보안 설정을 확인하세요.');
      })
      .finally(function() {
        if (button) setTimeout(function() { button.disabled = false; }, 1200);
      });
  }

  function renderDocumentBlob(config) {
    return new Promise(function(resolve, reject) {
      try {
        if (typeof renderMap === 'function') renderMap();
        var clone = buildCleanSvgClone(config);
        var svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(svgBlob);
        var image = new Image();
        image.onload = function() {
          try {
            var page = pageSize(config.page);
            var canvas = document.createElement('canvas');
            canvas.width = page.width;
            canvas.height = page.height;
            var context = canvas.getContext('2d');
            paintPageBackground(context, page, config);
            drawHeader(context, page, config);
            drawDiagram(context, page, image, config);
            drawFooter(context, page, config);
            URL.revokeObjectURL(url);
            canvas.toBlob(function(blob) {
              if (!blob) return reject(new Error('empty blob'));
              resolve(blob);
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
      } catch (error) {
        reject(error);
      }
    });
  }

  function buildCleanSvgClone(config) {
    var sourceSvg = document.getElementById('map');
    var clone = sourceSvg.cloneNode(true);
    clone.setAttribute('width', '1100');
    clone.setAttribute('height', '760');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', '1100');
    background.setAttribute('height', '760');
    background.setAttribute('fill', '#ffffff');
    clone.insertBefore(background, clone.firstChild);
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = collectCssText();
    clone.insertBefore(style, clone.firstChild);
    applyDocumentPrivacy(clone, config);
    return clone;
  }

  function applyDocumentPrivacy(clone, config) {
    var forceMask = Boolean(config.sanitized);
    var hideMemo = forceMask || checked('exportHideMemo');
    var hideYears = forceMask || checked('exportHideYears');
    clone.querySelectorAll('.person-node').forEach(function(node) {
      var person = state.people.find(function(item) { return item.id === node.dataset.personId; });
      var name = node.querySelector('.node-name');
      var year = node.querySelector('.node-year');
      if (name && forceMask && person) name.textContent = person.role === 'client' ? '대상자' : maskName(person.name);
      if (year && hideYears) year.textContent = '(연도 숨김)';
    });
    if (hideMemo) {
      clone.querySelectorAll('.resource-meta').forEach(function(node) {
        node.textContent = '지원내용 숨김';
      });
    }
    if (forceMask) {
      clone.querySelectorAll('.resource-scope').forEach(function(node) {
        node.textContent = '가구 자원';
      });
    }
  }

  function pageSize(page) {
    if (page === 'portraitHalf') return { width: 2480, height: 3508, margin: 150, header: 220, footer: 120 };
    return { width: 3508, height: 2480, margin: 150, header: 210, footer: 115 };
  }

  function paintPageBackground(context, page) {
    context.fillStyle = checked('exportWhiteBackground') ? '#ffffff' : '#f7f8fa';
    context.fillRect(0, 0, page.width, page.height);
  }

  function drawHeader(context, page, config) {
    var title = state.title || '가계도·생태도';
    var today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    context.fillStyle = '#20242a';
    context.font = '700 54px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    context.textBaseline = 'top';
    context.fillText(title, page.margin, 72);
    context.fillStyle = '#245fbd';
    context.font = '700 30px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    context.fillText(config.label, page.margin, 140);
    context.fillStyle = '#6d7480';
    context.font = '400 26px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    context.textAlign = 'right';
    context.fillText(today, page.width - page.margin, 142);
    context.textAlign = 'left';
    context.strokeStyle = '#d9dde4';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(page.margin, page.header - 28);
    context.lineTo(page.width - page.margin, page.header - 28);
    context.stroke();
  }

  function drawDiagram(context, page, image, config) {
    var contentX = page.margin;
    var contentY = page.header;
    var contentW = page.width - page.margin * 2;
    var contentH = page.height - page.header - page.footer - page.margin;
    if (config.page === 'portraitHalf') {
      contentH = Math.min(contentH, 1900);
      contentY = page.header + 45;
    }
    context.fillStyle = checked('exportWhiteBackground') ? '#ffffff' : '#f7f8fa';
    context.fillRect(contentX, contentY, contentW, contentH);
    context.strokeStyle = '#d9dde4';
    context.lineWidth = 3;
    context.strokeRect(contentX, contentY, contentW, contentH);
    var scale = Math.min(contentW / 1100, contentH / 760) * 0.96;
    var drawW = 1100 * scale;
    var drawH = 760 * scale;
    context.drawImage(image, contentX + (contentW - drawW) / 2, contentY + (contentH - drawH) / 2, drawW, drawH);
    if (config.page === 'portraitHalf') drawIntakeMemoBox(context, page, contentY + contentH + 65);
  }

  function drawIntakeMemoBox(context, page, y) {
    var x = page.margin;
    var width = page.width - page.margin * 2;
    var height = 650;
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#d9dde4';
    context.lineWidth = 3;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.fillStyle = '#20242a';
    context.font = '700 34px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    context.fillText('상담 메모', x + 34, y + 30);
    context.fillStyle = '#6d7480';
    context.font = '400 27px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    var lines = [
      '주요 가족관계:',
      '주요 지지체계:',
      '위험요인 또는 갈등관계:',
      '추가 확인 필요사항:'
    ];
    lines.forEach(function(line, index) {
      var lineY = y + 105 + index * 120;
      context.fillText(line, x + 34, lineY);
      context.strokeStyle = '#e5e8ed';
      context.beginPath();
      context.moveTo(x + 310, lineY + 30);
      context.lineTo(x + width - 34, lineY + 30);
      context.stroke();
    });
  }

  function drawFooter(context, page, config) {
    var y = page.height - page.margin + 35;
    context.strokeStyle = '#d9dde4';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(page.margin, y - 40);
    context.lineTo(page.width - page.margin, y - 40);
    context.stroke();
    context.fillStyle = '#6d7480';
    context.font = '400 24px Malgun Gothic, Apple SD Gothic Neo, sans-serif';
    context.textBaseline = 'top';
    context.fillText(config.footer, page.margin, y);
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

  function checked(id) {
    var element = document.getElementById(id);
    return Boolean(element && element.checked);
  }

  function maskName(value) {
    var text = String(value || '가족');
    if (text.length <= 1) return '○';
    if (/^[가-힣]{2,4}$/.test(text)) return text[0] + '○'.repeat(text.length - 1);
    return text.replace(/[가-힣A-Za-z0-9]/g, function(match, index) {
      return index === 0 ? match : '○';
    });
  }

  function showExportMessage(message) {
    var status = document.getElementById('exportCopyStatus');
    if (status) status.textContent = message;
    if (typeof showToast === 'function') showToast(message);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
