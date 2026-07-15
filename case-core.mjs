export const CASE_STAGES = [
  "접수",
  "초기상담",
  "사정",
  "선정",
  "계획",
  "개입",
  "점검",
  "종결",
  "사후관리"
];

export const NEED_AREAS = [
  "건강",
  "심리·정서",
  "가족관계",
  "경제",
  "주거",
  "고용·교육",
  "사회관계",
  "안전",
  "법률·권익"
];

export function normalizeCaseRecord(value = {}) {
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
    assessments: Array.isArray(value.assessments)
      ? value.assessments.map((item) => ({ ...item }))
      : [],
    goals: Array.isArray(value.goals)
      ? value.goals.map((item) => ({ ...item }))
      : [],
    services: Array.isArray(value.services)
      ? value.services.map((item) => ({ ...item }))
      : [],
    meetings: Array.isArray(value.meetings)
      ? value.meetings.map((item) => ({ ...item }))
      : [],
    documents: Array.isArray(value.documents)
      ? value.documents.map((item) => ({ ...item }))
      : [],
    closure: {
      reason: value.closure?.reason || "",
      summary: value.closure?.summary || "",
      outcome: value.closure?.outcome || "",
      closedAt: value.closure?.closedAt || "",
      aftercareDate: value.closure?.aftercareDate || ""
    }
  };
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const FAMILY_RELATION_PATTERN = /(증조할아버지|증조할머니|할아버지|할머니|아버지|어머니|부친|모친|조부|조모|배우자|남편|아내|파트너|큰아버지|작은아버지|고모|이모|삼촌|외삼촌|형제|자매|오빠|언니|누나|남동생|여동생|동생|형|장남|차남|장녀|차녀|아들|딸|자녀|손자|손녀)/;

function inferGender(value, relation = "", clientGender = "") {
  const explicit = String(value || "").trim();
  if (/^(여|여성)$/.test(explicit)) return "여";
  if (/^(남|남성)$/.test(explicit)) return "남";
  if (/^(기타|미상|기타\/미상)$/.test(explicit)) return "기타/미상";
  const role = String(relation || "");
  if (/(할머니|어머니|모친|조모|아내|언니|누나|여동생|장녀|차녀|딸|손녀|고모|이모)/.test(role)) return "여";
  if (/(할아버지|아버지|부친|조부|남편|오빠|남동생|장남|차남|아들|손자|삼촌)/.test(role)) return "남";
  if (/(배우자|파트너)/.test(role)) {
    if (String(clientGender).includes("남")) return "여";
    if (String(clientGender).includes("여")) return "남";
  }
  return "";
}

function genderCode(value, relation = "", clientGender = "") {
  const inferred = inferGender(value, relation, clientGender);
  if (inferred.includes("여")) return "female";
  if (inferred.includes("남")) return "male";
  return "other";
}

function roleCode(value) {
  const relation = String(value || "").replace(/\s+/g, "");
  if (/^(부|모|아버지|어머니|부친|모친|친부|친모|양부|양모|계부|계모|조부|조모|할아버지|할머니)$/.test(relation)) return "parent";
  if (/(배우자|남편|아내|파트너)/.test(relation)) return "spouse";
  if (/(형|제|누나|언니|오빠|동생|자매|형제)/.test(relation)) return "sibling";
  if (/(손자|손녀)/.test(relation)) return "grandchild";
  if (/(자녀|아들|딸|장남|차남|장녀|차녀)/.test(relation)) return "child";
  return "family";
}

export function parseFamilyMembers(value, clientGender = "") {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => {
      const raw = line.trim();
      if (!raw) return null;
      const parts = raw.split(/\s*(?:\/|,|\t|\|)\s*/).filter(Boolean);
      const relation = parts.map((part) => {
        if (/^(부|모)$/.test(part)) return part;
        return part.match(FAMILY_RELATION_PATTERN)?.[0] || "";
      }).find(Boolean) || "";
      const explicitGender = parts.find((part) => /^(남|남성|여|여성|기타|미상|기타\/미상)$/.test(part)) || "";
      const yearMatch = raw.match(/\b(19\d{2}|20\d{2}|2100)\b/);
      const ageMatch = raw.match(/\b(\d{1,3})\s*세/);
      const firstPart = parts[0] || relation || "가족";
      let name = firstPart;
      if (relation && firstPart.includes(relation)) {
        const stripped = firstPart
          .replace(relation, "")
          .replace(/[()[\]{}]/g, " ")
          .replace(/\b(?:19\d{2}|20\d{2}|2100|\d{1,3}\s*세)/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (stripped && !/^(큰|작은|첫째|둘째|셋째|막내|친|외|의붓|양)$/.test(stripped)) name = stripped;
      }
      return {
        name,
        gender: inferGender(explicitGender, relation || firstPart, clientGender),
        relation: relation || firstPart,
        birthYear: yearMatch?.[1] || "",
        age: ageMatch?.[1] || ""
      };
    })
    .filter(Boolean);
}

export function mapClientToGenogram(client) {
  const clientId = "client";
  const clientPerson = {
    id: clientId,
    name: client.name || "대상자",
    gender: genderCode(client.gender, "본인"),
    role: "client",
    generation: 0,
    birthYear: String(client.birthYear || ""),
    deathYear: "",
    deceased: false,
    x: 550,
    y: 420,
    resources: []
  };
  const relations = Array.isArray(client.familyRelations) && client.familyRelations.length
    ? client.familyRelations
    : parseFamilyMembers(client.familyMembers, client.gender);
  const people = [clientPerson, ...relations.map((person, index) => {
    const role = roleCode(person.relation);
    const generation = role === "parent" ? -1 : role === "child" ? 1 : role === "grandchild" ? 2 : 0;
    return {
      id: uid(`person-${index}`),
      name: person.name || person.relation || "가족",
      gender: genderCode(person.gender, person.relation, client.gender),
      role,
      generation,
      birthYear: String(person.birthYear || (person.age ? `${person.age}세` : "")),
      deathYear: "",
      deceased: false,
      x: 220 + index * 160,
      y: 420 + generation * 210,
      resources: []
    };
  })];
  const parents = people.filter((person) => person.role === "parent").map((person) => person.id);
  const siblings = people.filter((person) => person.role === "sibling").map((person) => person.id);
  const spouses = people.filter((person) => person.role === "spouse").map((person) => person.id);
  const children = people.filter((person) => person.role === "child").map((person) => person.id);
  const familyGroups = [];
  if (parents.length || siblings.length) {
    familyGroups.push({
      id: uid("origin-family"),
      parents: parents.slice(0, 2),
      children: [clientId, ...siblings],
      status: "married",
      childTypes: Object.fromEntries([clientId, ...siblings].map((id) => [id, "biological"]))
    });
  }
  if (spouses.length || children.length) {
    familyGroups.push({
      id: uid("current-family"),
      parents: [clientId, ...spouses.slice(0, 1)],
      children,
      status: "married",
      childTypes: Object.fromEntries(children.map((id) => [id, "biological"]))
    });
  }
  return {
    version: 7,
    title: `${client.name || "대상자"} 가계도·생태도`,
    selectedId: clientId,
    selectedResourceId: null,
    selectedLinkId: null,
    people,
    familyGroups,
    households: [],
    links: []
  };
}

export function deriveCaseAlerts(client, now = new Date()) {
  const record = normalizeCaseRecord(client.caseManagement);
  const today = now.toISOString().slice(0, 10);
  const alerts = [];
  if (record.reassessmentDate && record.reassessmentDate < today && !["종결", "사후관리"].includes(record.stage)) {
    alerts.push({
      type: "reassessment",
      clientId: client.id,
      clientName: client.name,
      date: record.reassessmentDate,
      message: "재사정 기한이 지났습니다."
    });
  }
  record.goals
    .filter((goal) => goal.dueDate && goal.dueDate < today && !["달성", "중단"].includes(goal.status))
    .forEach((goal) => alerts.push({
      type: "goal",
      clientId: client.id,
      clientName: client.name,
      date: goal.dueDate,
      message: `목표 기한 경과: ${goal.title || "미기재"}`
    }));
  record.services
    .filter((service) => service.endDate && service.endDate < today && service.status === "진행")
    .forEach((service) => alerts.push({
      type: "service",
      clientId: client.id,
      clientName: client.name,
      date: service.endDate,
      message: `서비스 종료일 경과: ${service.name || "미기재"}`
    }));
  if (record.closure.aftercareDate && record.closure.aftercareDate <= today) {
    alerts.push({
      type: "aftercare",
      clientId: client.id,
      clientName: client.name,
      date: record.closure.aftercareDate,
      message: "사후관리 확인 예정일입니다."
    });
  }
  if (record.retentionUntil && record.retentionUntil <= today) {
    alerts.push({
      type: "retention",
      clientId: client.id,
      clientName: client.name,
      date: record.retentionUntil,
      message: "보유기한이 도래했습니다. 파기 여부를 검토하세요."
    });
  }
  return alerts.sort((left, right) => left.date.localeCompare(right.date));
}
