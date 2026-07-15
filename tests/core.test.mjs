import test from "node:test";
import assert from "node:assert/strict";
import {
  mapClientToGenogram,
  parseFamilyMembers,
  normalizeCaseRecord,
  deriveCaseAlerts
} from "../case-core.mjs";

test("normalizes a complete case record without sharing mutable defaults", () => {
  const first = normalizeCaseRecord({});
  const second = normalizeCaseRecord({});
  first.goals.push({ title: "주거 안정" });
  assert.equal(second.goals.length, 0);
  assert.equal(first.stage, "접수");
});

test("maps client and family members into editable genogram state", () => {
  const diagram = mapClientToGenogram({
    id: "client-1",
    name: "홍길동",
    gender: "남",
    birthYear: 1980,
    familyRelations: [
      { name: "김가족", gender: "여", relation: "배우자", birthYear: 1982 }
    ]
  });
  assert.equal(diagram.people.length, 2);
  assert.equal(diagram.people.find((person) => person.role === "client").name, "홍길동");
  assert.equal(diagram.people.find((person) => person.role === "spouse").gender, "female");
});

test("parses legacy family text and automatically creates family roles", () => {
  const family = parseFamilyMembers(
    "배우자 / 75세 / 동거 / 당뇨로 병원 이용\n장녀 / 48세 / 비동거 / 월 1회 연락",
    "남"
  );
  assert.deepEqual(
    family.map((person) => [person.name, person.relation, person.gender, person.age]),
    [
      ["배우자", "배우자", "여", "75"],
      ["장녀", "장녀", "여", "48"]
    ]
  );

  const diagram = mapClientToGenogram({
    name: "홍길동",
    gender: "남",
    familyMembers: "배우자 / 75세 / 동거\n장녀 / 48세 / 비동거"
  });
  assert.equal(diagram.people.find((person) => person.role === "spouse").birthYear, "75세");
  assert.equal(diagram.people.find((person) => person.role === "child").gender, "female");
});

test("derives overdue goal and reassessment alerts", () => {
  const alerts = deriveCaseAlerts(
    {
      name: "대상자",
      caseManagement: {
        stage: "개입",
        goals: [{ title: "건강 회복", dueDate: "2025-01-01", status: "진행" }],
        reassessmentDate: "2025-01-02",
        services: []
      }
    },
    new Date("2026-01-01T00:00:00Z")
  );
  assert.deepEqual(
    alerts.map((item) => item.type).sort(),
    ["goal", "reassessment"]
  );
});
