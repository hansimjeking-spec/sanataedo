const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const STORAGE_KEY = "welfareMonthlyPerformance.v2";
const OLD_STORAGE_KEY = "welfareMonthlyPerformance.v1";
const CASE_STAGES = ["접수", "초기상담", "사정", "선정", "계획", "개입", "점검", "종결", "사후관리"];
const NEED_AREAS = ["건강", "심리·정서", "가족관계", "경제", "주거", "고용·교육", "사회관계", "안전", "법률·권익"];
const VIEW_META = {
  dashboard: ["업무 현황", "대시보드"],
  clients: ["사례 업무", "대상자 관리"],
  casework: ["사례 업무", "통합 사례관리"],
  process: ["사례 업무", "과정기록"],
  entry: ["사업·통계", "실적 입력"],
  clientStats: ["사업·통계", "대상자 통계"],
  programs: ["사업·통계", "사업 관리"],
  resources: ["운영 관리", "지역자원"],
  import: ["운영 관리", "자료 관리"],
  audit: ["운영 관리", "변경기록"]
};

const now = new Date();
const nowYear = now.getFullYear();
let selectedYear = nowYear;
let selectedMonth = now.getMonth() + 1;
let state = loadState();
let activeGenogramClientId = "";
let activeGenogramSvg = "";
let activeCaseClientId = "";
let activeGenogramEditorClientId = "";
let genogramEditorReady = false;
let genogramEditorLoadTimer = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {};

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultState() {
  const programs = [
    programSeed("사례관리 상담", "사례관리", "김사회", "건", 480),
    programSeed("서비스 연계", "자원연계", "이복지", "건", 240),
    programSeed("사례회의", "사례관리", "김사회", "회", 72),
    programSeed("후원물품 지원", "후원", "박나눔", "명", 360)
  ];
  const clients = [
    {
      id: uid(),
      name: "홍길동",
      code: "",
      birthYear: 1978,
      gender: "남",
      area: "○○동",
      housing: "월세",
      economic: "기초생활수급",
      household: "1인가구",
      consentDate: `${nowYear}-01-02`,
      worker: "김사회",
      familyMembers: "배우자 / 75세 / 동거 / 건강관리 필요\n장녀 / 48세 / 비동거 / 월 1회 연락",
      genogramFile: null,
      ecomapFile: null,
      sensitive: true
    }
  ];
  programs.forEach((program) => {
    program.clientIds = clients.map((client) => client.id);
  });
  const entries = [
    ["사례관리 상담", 1, 42], ["사례관리 상담", 2, 36], ["사례관리 상담", 3, 44],
    ["서비스 연계", 1, 18], ["서비스 연계", 2, 20], ["서비스 연계", 3, 22],
    ["사례회의", 1, 6], ["사례회의", 2, 5], ["사례회의", 3, 7],
    ["후원물품 지원", 1, 31], ["후원물품 지원", 2, 28], ["후원물품 지원", 3, 34]
  ].map(([programName, month, actual]) => {
    const program = programs.find((item) => item.name === programName);
    return entrySeed(program.id, month, actual, clients[0].id);
  });
  return {
    schemaVersion: 3,
    programs,
    clients,
    entries,
    processRecords: [],
    resources: [],
    audit: [],
    settings: {
      passwordHash: "",
      maskPersonal: true
    }
  };
}

function programSeed(name, category, manager, unit, goal) {
  return {
    id: uid(),
    name,
    category,
    manager,
    unit: unit || "",
    goal: Number(goal || 0),
    monthlyGoals: MONTHS.map(() => 0),
    clientIds: []
  };
}

function entrySeed(programId, month, actual, clientId) {
  return {
    id: uid(),
    programId,
    clientId,
    year: nowYear,
    month,
    actual,
    memo: "",
    reportNote: "",
    sensitive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return normalizeState(JSON.parse(raw));
  const old = localStorage.getItem(OLD_STORAGE_KEY);
  if (old) return migrateV1(JSON.parse(old));
  return defaultState();
}

function migrateV1(old) {
  const migrated = defaultState();
  migrated.programs = (old.programs || []).map((program) => ({
    id: program.id || uid(),
    name: program.name || "",
    category: program.category || "미분류",
    manager: "",
    unit: program.unit || "건",
    goal: Number(program.goal || 0),
    monthlyGoals: MONTHS.map(() => 0),
    clientIds: []
  }));
  migrated.clients = [];
  migrated.entries = (old.entries || []).map((entry) => ({
    id: entry.id || uid(),
    programId: entry.programId,
    clientId: "",
    year: Number(entry.year || nowYear),
    month: Number(entry.month || 1),
    actual: Number(entry.actual || 0),
    memo: entry.memo || "",
    reportNote: "",
    sensitive: false,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.createdAt || new Date().toISOString()
  }));
  migrated.audit = [{ at: new Date().toISOString(), action: "마이그레이션", detail: "v1 자료를 v2 구조로 변환" }];
  return migrated;
}

function normalizeState(input) {
  const base = defaultState();
  return {
    schemaVersion: 3,
    programs: Array.isArray(input.programs) ? input.programs.map(normalizeProgram) : base.programs,
    clients: Array.isArray(input.clients) ? input.clients.map(normalizeClient) : [],
    entries: Array.isArray(input.entries) ? input.entries.map(normalizeEntry) : [],
    processRecords: Array.isArray(input.processRecords) ? input.processRecords.map(normalizeProcessRecord) : [],
    resources: Array.isArray(input.resources) ? input.resources.map(normalizeResource) : [],
    audit: Array.isArray(input.audit) ? input.audit : [],
    settings: {
      ...base.settings,
      ...(input.settings || {}),
    }
  };
}

function normalizeProgram(program) {
  const goal = Number(program.goal || 0);
  return {
    id: program.id || uid(),
    name: program.name || "",
    category: program.category || "미분류",
    manager: program.manager || "",
    unit: program.unit || "건",
    goal,
    monthlyGoals: MONTHS.map((_, index) => Number(program.monthlyGoals?.[index] ?? 0)),
    clientIds: Array.isArray(program.clientIds) ? program.clientIds : []
  };
}

function normalizeClient(client) {
  return {
    id: client.id || uid(),
    name: client.name || "",
    code: client.code || "",
    birthYear: client.birthYear || "",
    gender: client.gender || "",
    area: client.area || "",
    housing: client.housing || "",
    economic: client.economic || "",
    household: client.household || "",
    consentDate: client.consentDate || "",
    worker: client.worker || "",
    familyMembers: client.familyMembers || "",
    familyRelations: Array.isArray(client.familyRelations)
      ? client.familyRelations.map(normalizeFamilyRelation)
      : [],
    genogramFile: client.genogramFile || null,
    ecomapFile: client.ecomapFile || null,
    genogramData: client.genogramData || null,
    caseManagement: normalizeCaseManagement(client.caseManagement),
    sensitive: Boolean(client.sensitive)
  };
}

function normalizeCaseManagement(value = {}) {
  return {
    stage: CASE_STAGES.includes(value.stage) ? value.stage : "접수",
    level: value.level || "일반",
    coWorker: value.coWorker || "",
    intakeDate: value.intakeDate || "",
    referralSource: value.referralSource || "",
    referralReason: value.referralReason || "",
    presentingProblem: value.presentingProblem || "",
    urgency: value.urgency || "보통",
    strengths: value.strengths || "",
    risks: value.risks || "",
    selectionDecision: value.selectionDecision || "",
    selectionDate: value.selectionDate || "",
    reassessmentDate: value.reassessmentDate || "",
    privacyConsent: Boolean(value.privacyConsent),
    sharingConsent: Boolean(value.sharingConsent),
    retentionUntil: value.retentionUntil || "",
    assessments: Array.isArray(value.assessments) ? value.assessments.map((item) => ({ ...item })) : [],
    goals: Array.isArray(value.goals) ? value.goals.map((item) => ({ ...item })) : [],
    services: Array.isArray(value.services) ? value.services.map((item) => ({ ...item })) : [],
    meetings: Array.isArray(value.meetings) ? value.meetings.map((item) => ({ ...item })) : [],
    documents: Array.isArray(value.documents) ? value.documents.map((item) => ({ ...item })) : [],
    closure: {
      reason: value.closure?.reason || "",
      summary: value.closure?.summary || "",
      outcome: value.closure?.outcome || "",
      closedAt: value.closure?.closedAt || "",
      aftercareDate: value.closure?.aftercareDate || ""
    }
  };
}

function normalizeEntry(entry) {
  return {
    id: entry.id || uid(),
    programId: entry.programId || "",
    clientId: entry.clientId || "",
    year: Number(entry.year || nowYear),
    month: Number(entry.month || 1),
    actual: Number(entry.actual || 0),
    memo: entry.memo || "",
    reportNote: entry.reportNote || "",
    sensitive: Boolean(entry.sensitive),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function normalizeProcessRecord(record) {
  return {
    id: record.id || uid(),
    clientId: record.clientId || "",
    date: record.date || new Date().toISOString().slice(0, 10),
    method: record.method || "전화",
    status: record.status || "양호",
    note: record.note || "",
    followUp: record.followUp || "",
    goalId: record.goalId || "",
    serviceId: record.serviceId || "",
    durationMinutes: Number(record.durationMinutes || 0),
    sensitive: Boolean(record.sensitive),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
  };
}

function normalizeResource(resource) {
  return {
    id: resource.id || uid(),
    name: resource.name || "",
    type: resource.type || "기타",
    area: resource.area || "",
    phone: resource.phone || "",
    contact: resource.contact || "",
    services: resource.services || "",
    eligibility: resource.eligibility || "",
    verifiedAt: resource.verifiedAt || "",
    status: resource.status || "확인필요",
    notes: resource.notes || "",
    createdAt: resource.createdAt || new Date().toISOString(),
    updatedAt: resource.updatedAt || new Date().toISOString()
  };
}

function saveState(action, detail) {
  if (action) addAudit(action, detail);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function allowMutation() {
  return true;
}

function addAudit(action, detail) {
  state.audit.unshift({ at: new Date().toISOString(), action, detail });
  state.audit = state.audit.slice(0, 500);
}

function initElementMap() {
  [
    "yearSelect", "monthSelect", "managerFilter", "categoryFilter",
    "totalActual", "goalRate", "monthGoalRate", "missingProgramCount", "monthlyChart", "missingList",
    "summaryHead", "summaryBody", "searchInput", "entryForm", "entryProgram", "entryMonth", "entryClient",
    "entryActual", "entryMemo", "entryOverwrite", "entryRows",
    "selectAllEntries", "clientForm", "clientId", "clientName", "clientBirthYear", "clientGender",
    "clientArea", "clientHousing", "clientEconomic", "clientHousehold", "clientConsentDate",
    "clientWorker", "clientFamilyMembers", "clientGenogramFile", "clientEcomapFile", "clientAttachmentPreview",
    "clientRows", "clientSearch",
    "clientStatsWorkerFilter", "clientStatsTotal", "clientStatsFamily", "clientStatsMissing",
    "genderStats", "ageStats", "areaStats", "economicStats", "housingStats", "householdStats", "clientStatsRows",
    "processForm", "processId", "processClient", "processDate", "processMethod", "processStatus", "processNote",
    "processFollowUp", "processClientFilter", "processMethodFilter", "processTimeline",
    "processMonthlyStatus", "processRows", "selectAllProcessRecords",
    "programForm", "programId", "programName", "programCategory", "programManager",
    "programList",
    "csvFile", "excelPaste", "googleSheetPaste", "includePersonalExport", "restoreJsonFile",
    "genogramDialog", "genogramTitle", "genogramSummary", "genogramCanvas",
    "toast"
  ].forEach((id) => { elements[id] = $(`#${id}`); });
}

async function init() {
  initElementMap();
  selectedMonth = Math.min(12, Math.max(1, selectedMonth));
  bindEvents();
  fillStaticControls();
  fillCaseManagementControls();
  applySettings();
  disableBrowserLock();
  simplifyOperationalUi();
  renderAll();
}

function createEmptyState() {
  return normalizeState({
    schemaVersion: 3,
    programs: [],
    clients: [],
    entries: [],
    processRecords: [],
    resources: [],
    audit: [],
    settings: { passwordHash: "", maskPersonal: true }
  });
}

function simplifyOperationalUi() {
  if (!document.querySelector("#programClientIds")) {
    const label = document.createElement("label");
    label.className = "full-span";
    label.innerHTML = `해당 대상자<select id="programClientIds" multiple size="8"></select>`;
    elements.programForm.insertBefore(label, elements.programForm.querySelector(".form-actions"));
    elements.programClientIds = label.querySelector("select");
  }
  const importHelp = document.querySelector("#csvFile")?.previousElementSibling;
  if (importHelp) {
    importHelp.textContent = "열 이름: 사업명, 분류, 담당자, 연도, 월, 실적, 대상자명, 출생연도, 성별, 거주지역, 주거형태, 경제상황, 가구유형, 가구구성원, 메모";
  }
  if (!document.querySelector("#processGoal")) {
    const target = elements.processForm.querySelector(".full-span");
    const goalLabel = document.createElement("label");
    goalLabel.innerHTML = '연결 목표<select id="processGoal"><option value="">연결 안 함</option></select>';
    const serviceLabel = document.createElement("label");
    serviceLabel.innerHTML = '연결 서비스<select id="processService"><option value="">연결 안 함</option></select>';
    const durationLabel = document.createElement("label");
    durationLabel.innerHTML = '소요시간(분)<input id="processDuration" type="number" min="0" max="1440" step="5" value="0">';
    elements.processForm.insertBefore(goalLabel, target);
    elements.processForm.insertBefore(serviceLabel, target);
    elements.processForm.insertBefore(durationLabel, target);
    elements.processGoal = goalLabel.querySelector("select");
    elements.processService = serviceLabel.querySelector("select");
    elements.processDuration = durationLabel.querySelector("input");
  }
}

function bindEvents() {
  $$(".nav-button").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
  $("#dashboardNewRecord")?.addEventListener("click", () => {
    activateView("process");
    resetProcessForm();
  });
  $("#dashboardOpenCasewor�n���$z{-���jםrecord) => String(record.date || "").startsWith(monthPrefix))
      .map((record) => record.clientId)
  );
  const missingRecords = state.clients.filter((client) => !recordedClientIds.has(client.id));
  const activeCases = state.clients.filter((client) => {
    const stage = normalizeCaseManagement(client.caseManagement).stage;
    return !["종결", "사후관리"].includes(stage);
  });
  if ($("#dashboardTotalClients")) $("#dashboardTotalClients").textContent = formatNumber(state.clients.length);
  if ($("#dashboardActiveCases")) $("#dashboardActiveCases").textContent = formatNumber(activeCases.length);
  if ($("#dashboardDueAlerts")) $("#dashboardDueAlerts").textContent = formatNumber(alerts.length);
  if ($("#dashboardMissingRecords")) $("#dashboardMissingRecords").textContent = formatNumber(missingRecords.length);
  const stageOverview = $("#caseStageOverview");
  if (stageOverview) {
    stageOverview.innerHTML = stageCounts.map((item, index) => `
      <div class="flow-step${item.count ? " has-cases" : ""}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(item.stage)}</strong>
        <em>${formatNumber(item.count)}명</em>
      </div>
    `).join("");
  }
  panel.innerHTML = `
    <div class="panel-head"><div><span class="panel-kicker">ACTION REQUIRED</span><h3>확인이 필요한 업무</h3></div><span class="status-chip ${alerts.length ? "warn" : ""}">${alerts.length}건</span></div>
    <div class="task-list">${alerts.slice(0, 6).map((alert) => `
      <button class="task-row" type="button" data-alert-client="${alert.client.id}">
        <span class="task-type">${escapeHtml(alert.type)}</span>
        <span class="task-copy"><strong>${escapeHtml(alert.client.name)}</strong><small>${escapeHtml(alert.message)}</small></span>
        <time>${escapeHtml(alert.date)}</time>
      </button>
    `).join("") || '<div class="empty-state compact">기한이 지난 사례업무가 없습니다.</div>'}</div>`;
  $$("[data-alert-client]").forEach((button) => button.addEventListener("click", () => {
    activeCaseClientId = button.dataset.alertClient;
    activateView("casework");
    renderCaseManagement();
  }));
}

function renderProcessCaseLinks(clientId) {
  if (!elements.processGoal || !elements.processService) return;
  const client = findClient(clientId);
  const record = client ? normalizeCaseManagement(client.caseManagement) : normalizeCaseManagement();
  const selectedGoal = elements.processGoal.value;
  const selectedService = elements.processService.value;
  elements.processGoal.innerHTML = '<option value="">연결 안 함</option>' + record.goals.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.title)}</option>`).join("");
  elements.processService.innerHTML = '<option value="">연결 안 함</option>' + record.services.map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`).join("");
  if (record.goals.some((goal) => goal.id === selectedGoal)) elements.processGoal.value = selectedGoal;
  if (record.services.some((service) => service.id === selectedService)) elements.processService.value = selectedService;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapClientToGenogram(client) {
  const relations = familyRelationsFor(client);
  const roleFor = (relation) => {
    const value = String(relation || "").replace(/\s+/g, "");
    if (/^(부|모|아버지|어머니|부친|모친|친부|친모|양부|양모|계부|계모|조부|조모|할아버지|할머니)$/.test(value)) return "parent";
    if (/(배우자|남편|아내|파트너)/.test(value)) return "spouse";
    if (/(형|제|누나|언니|오빠|동생|자매|형제)/.test(value)) return "sibling";
    if (/(손자|손녀)/.test(value)) return "grandchild";
    if (/(자녀|아들|딸|장남|차남|장녀|차녀)/.test(value)) return "child";
    return "family";
  };
  const genderFor = (gender, relation = "") => {
    const inferred = inferFamilyGender(gender, relation, client.gender);
    return inferred.includes("여") ? "female" : inferred.includes("남") ? "male" : "other";
  };
  const people = [{
    id: "client",
    name: client.name || "대상자",
    gender: genderFor(client.gender, "본인"),
    role: "client",
    generation: 0,
    birthYear: String(client.birthYear || ""),
    deathYear: "",
    deceased: false,
    x: 550,
    y: 420,
    resources: []
  }];
  relations.forEach((person, index) => {
    const role = roleFor(person.relation);
    const generation = role === "parent" ? -1 : role === "child" ? 1 : role === "grandchild" ? 2 : 0;
    people.push({
      id: uid(),
      name: person.name || person.relation || "가족",
      gender: genderFor(person.gender, person.relation),
      role,
      generation,
      birthYear: String(person.birthYear || (person.age ? `${person.age}세` : "")),
      deathYear: "",
      deceased: false,
      x: 220 + index * 160,
      y: 420 + generation * 210,
      resources: []
    });
  });
  const parents = people.filter((person) => person.role === "parent").map((person) => person.id);
  const siblings = people.filter((person) => person.role === "sibling").map((person) => person.id);
  const spouses = people.filter((person) => person.role === "spouse").map((person) => person.id);
  const children = people.filter((person) => person.role === "child").map((person) => person.id);
  const familyGroups = [];
  if (parents.length || siblings.length) familyGroups.push({
    id: uid(),
    parents: parents.slice(0, 2),
    children: ["client", ...siblings],
    status: "married",
    childTypes: Object.fromEntries(["client", ...siblings].map((id) => [id, "biological"]))
  });
  if (spouses.length || children.length) familyGroups.push({
    id: uid(),
    parents: ["client", ...spouses.slice(0, 1)],
    children,
    status: "married",
    childTypes: Object.fromEntries(children.map((id) => [id, "biological"]))
  });
  return {
    version: 7,
    title: `${client.name || "대상자"} 가계도·생태도`,
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people,
    familyGroups,
    households: [],
    links: []
  };
}

function setGenogramEditorStatus(message) {
  const status = $("#genogramEditorStatus");
  if (status) status.textContent = message;
}

function genogramSourceSummary(client, regenerated = false) {
  const familyCount = familyRelationsFor(client).length;
  if (regenerated) return `대상자 기본정보와 가구원 ${familyCount}명으로 새 초안을 만들었습니다.`;
  if (client.genogramData) return `저장된 편집본을 불러왔습니다. 필요하면 대상자 정보로 다시 생성할 수 있습니다.`;
  return `대상자 기본정보와 가구원 ${familyCount}명으로 자동 초안을 만들었습니다.`;
}

function postGenogramPayload(client, payload) {
  const frame = $("#genogramEditorFrame");
  if (!frame?.contentWindow || !genogramEditorReady) return false;
  frame.contentWindow.postMessage({
    type: "SARYE_GENOGRAM_LOAD",
    payload
  }, location.origin);
  return true;
}

function openRichGenogram() {
  const client = currentCaseClient();
  if (!client) return;
  activeGenogramEditorClientId = client.id;
  const dialog = $("#genogramEditorDialog");
  const frame = $("#genogramEditorFrame");
  const needsLoad = !frame.getAttribute("src");
  if (needsLoad) {
    genogramEditorReady = false;
    frame.setAttribute("src", "/genogram?v=20260705-auto-genogram");
  }
  dialog.showModal();
  if (postGenogramPayload(client, client.genogramData || mapClientToGenogram(client))) {
    setGenogramEditorStatus(genogramSourceSummary(client));
    return;
  }
  setGenogramEditorStatus("가계도 편집기와 자동 초안을 불러오는 중입니다…");
  window.clearTimeout(genogramEditorLoadTimer);
  genogramEditorLoadTimer = window.setTimeout(() => {
    if (!genogramEditorReady && dialog.open) {
      setGenogramEditorStatus("편집기를 불러오지 못했습니다. 창을 닫았다가 다시 열거나 페이지를 새로고침해 주세요.");
    }
  }, 6000);
}

function regenerateRichGenogram() {
  const client = findClient(activeGenogramEditorClientId) || currentCaseClient();
  if (!client) return;
  if (client.genogramData && !confirm("현재 저장된 가계도 편집본 대신 대상자·가구원 정보로 새 초안을 만들까요? 새 초안을 사례에 저장하기 전까지 기존 편집본은 유지됩니다.")) {
    return;
  }
  if (!postGenogramPayload(client, mapClientToGenogram(client))) {
    showToast("가계도 편집기를 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
    return;
  }
  setGenogramEditorStatus(genogramSourceSummary(client, true));
  showToast("대상자 정보로 가계도 초안을 다시 만들었습니다.");
}

function closeRichGenogram() {
  window.clearTimeout(genogramEditorLoadTimer);
  $("#genogramEditorDialog").close();
}

function receiveGenogramMessage(event) {
  if (event.origin !== location.origin || event.source !== $("#genogramEditorFrame")?.contentWindow) return;
  const client = findClient(activeGenogramEditorClientId);
  if (!client) return;
  if (event.data?.type === "SARYE_GENOGRAM_READY") {
    genogramEditorReady = true;
    window.clearTimeout(genogramEditorLoadTimer);
    postGenogramPayload(client, client.genogramData || mapClientToGenogram(client));
    setGenogramEditorStatus(genogramSourceSummary(client));
  }
  if (event.data?.type === "SARYE_GENOGRAM_SAVE") {
    if (!allowMutation()) return;
    client.genogramData = event.data.payload;
    saveState("가계도·생태도 저장", client.name);
    setGenogramEditorStatus("가계도·생태도 편집본을 사례에 저장했습니다.");
    showToast("편집 가능한 가계도·생태도를 사례에 저장했습니다.");
  }
}

function bindResourceEvents() {
  $("#resourceForm")?.addEventListener("submit", saveResource);
  $("#resetResource")?.addEventListener("click", resetResourceForm);
  $("#resourceSearch")?.addEventListener("input", renderResources);
}

function saveResource(event) {
  event.preventDefault();
  if (!allowMutation()) return;
  const id = $("#resourceId").value || uid();
  const previous = state.resources.find((item) => item.id === id);
  const item = normalizeResource({
    id,
    name: $("#resourceName").value.trim(),
    type: $("#resourceType").value,
    area: $("#resourceArea").value.trim(),
    phone: $("#resourcePhone").value.trim(),
    contact: $("#resourceContact").value.trim(),
    services: $("#resourceServices").value.trim(),
    eligibility: $("#resourceEligibility").value.trim(),
    verifiedAt: $("#resourceVerifiedAt").value,
    status: $("#resourceStatus").value,
    notes: $("#resourceNotes").value.trim(),
    updatedAt: new Date().toISOString(),
    createdAt: previous?.createdAt || new Date().toISOString()
  });
  const index = state.resources.findIndex((resource) => resource.id === id);
  if (index >= 0) state.resources[index] = item;
  else state.resources.push(item);
  saveState("지역자원 저장", `${item.name} · ${item.status}`);
  resetResourceForm();
  renderAll();
  showToast("지역자원 정보를 저장했습니다.");
}

function resetResourceForm() {
  $("#resourceForm").reset();
  $("#resourceId").value = "";
  $("#resourceVerifiedAt").value = new Date().toISOString().slice(0, 10);
}

function editResource(id) {
  const item = state.resources.find((resource) => resource.id === id);
  if (!item) return;
  $("#resourceId").value = item.id;
  $("#resourceName").value = item.name;
  $("#resourceType").value = item.type;
  $("#resourceArea").value = item.area;
  $("#resourcePhone").value = item.phone;
  $("#resourceContact").value = item.contact;
  $("#resourceServices").value = item.services;
  $("#resourceEligibility").value = item.eligibility;
  $("#resourceVerifiedAt").value = item.verifiedAt;
  $("#resourceStatus").value = item.status;
  $("#resourceNotes").value = item.notes;
  activateView("resources");
}

function deleteResource(id) {
  if (!allowMutation()) return;
  const item = state.resources.find((resource) => resource.id === id);
  if (!item || !confirm(`"${item.name}" 자원을 삭제할까요?`)) return;
  state.resources = state.resources.filter((resource) => resource.id !== id);
  saveState("지역자원 삭제", item.name);
  renderAll();
}

function renderResources() {
  const list = $("#resourceList");
  const dataList = $("#resourceProviderOptions");
  if (!list || !dataList) return;
  dataList.innerHTML = state.resources
    .filter((item) => item.status !== "중단")
    .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.services)}</option>`)
    .join("");
  const query = ($("#resourceSearch")?.value || "").trim().toLowerCase();
  const resources = state.resources
    .filter((item) => !query || `${item.name} ${item.type} ${item.area} ${item.services}`.toLowerCase().includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
  if (!resources.length) {
    list.innerHTML = '<div class="empty-state">등록된 지역자원이 없습니다.</div>';
    return;
  }
  list.innerHTML = resources.map((item) => `
    <article class="case-card">
      <div class="case-card-head"><h4>${escapeHtml(item.name)}</h4><span class="status-chip">${escapeHtml(item.type)} · ${escapeHtml(item.status)}</span></div>
      <div class="card-meta"><span>${escapeHtml(item.area || "지역 미기재")}</span><span>${escapeHtml(item.phone || "연락처 미기재")}</span><span>확인일 ${escapeHtml(item.verifiedAt || "미기재")}</span></div>
      <p><strong>서비스</strong>\n${escapeHtml(item.services || "미기재")}</p>
      ${item.eligibility ? `<p><strong>이용기준·방법</strong>\n${escapeHtml(item.eligibility)}</p>` : ""}
      <div class="card-actions"><button class="text-button" type="button" data-resource-edit="${item.id}">수정</button><button class="text-button danger" type="button" data-resource-delete="${item.id}">삭제</button></div>
    </article>`).join("");
  $$("[data-resource-edit]").forEach((button) => button.addEventListener("click", () => editResource(button.dataset.resourceEdit)));
  $$("[data-resource-delete]").forEach((button) => button.addEventListener("click", () => deleteResource(button.dataset.resourceDelete)));
}

async function renderCloudAudit() {
  const body = $("#auditRows");
  if (!body) return;
  const rows = state.audit || [];
  body.innerHTML = rows.length ? rows.map((row) => `
    <tr><td>${escapeHtml(new Date(row.at).toLocaleString("ko-KR"))}</td><td>현재 사용자</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.detail || "")}</td></tr>
  `).join("") : '<tr><td colspan="4">표시할 변경기록이 없습니다.</td></tr>';
}

init();
