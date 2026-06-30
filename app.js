var genders = {
  male: { label: "남성 (사각형)" },
  female: { label: "여성 (원)" },
  other: { label: "기타/미상 (마름모)" }
};

var roles = {
  client: { label: "중심 인물", generation: 0 },
  parent: { label: "부모", generation: -1 },
  spouse: { label: "배우자/파트너", generation: 0 },
  sibling: { label: "형제자매", generation: 0 },
  child: { label: "자녀", generation: 1 },
  family: { label: "기타 가족", generation: 0 }
};

var resourceTypes = {
  emotional: { label: "정서 지원", tone: "good" },
  care: { label: "돌봄/의료", tone: "good" },
  money: { label: "경제 지원", tone: "good" },
  info: { label: "정보 제공", tone: "good" },
  place: { label: "공간/환경", tone: "good" },
  stress: { label: "부담 요인", tone: "warn" },
  risk: { label: "위험 요인", tone: "risk" }
};

var socialTypes = {
  good: "좋은 관계",
  distant: "소원한 관계",
  conflict: "갈등 관계"
};

var directedSocialTypes = {
  none: "관계 없음",
  good: "좋은 관계",
  distant: "소원한 관계",
  conflict: "갈등 관계"
};

var directionTypes = {
  out: "단방향 (인물→대상)",
  in: "단방향 (대상→인물)",
  both: "양방향"
};

var coupleStatuses = {
  married: "혼인",
  cohabiting: "비혼 동거",
  separated: "별거",
  divorced: "이혼"
};

var childTypes = {
  biological: "친생",
  adopted: "입양",
  foster: "위탁",
  step: "의붓"
};

var svg = document.getElementById("map");
var toast = document.getElementById("toast");
var quickEditor = document.getElementById("quickEditor");
var dragging = null;
var lastNodePress = { key: "", at: 0 };
var householdDraft = null;
var backgroundImageUrl = null;
var exportInProgress = false;
var lastExportFinishedAt = 0;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

function initialState() {
  var fatherId = uid();
  var motherId = uid();
  var sisterId = uid();
  var brotherId = uid();
  var originFamilyId = uid();

  return normalizeState({
    version: 6,
    title: "우리 가족 생태도",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [
      {
        id: fatherId,
        name: "아버지",
        gender: "male",
        role: "parent",
        generation: -1,
        birthYear: "1940",
        deathYear: "2010",
        deceased: true,
        x: 430,
        y: 170,
        resources: []
      },
      {
        id: motherId,
        name: "어머니",
        gender: "female",
        role: "parent",
        generation: -1,
        birthYear: "1945",
        deathYear: "",
        deceased: false,
        x: 670,
        y: 170,
        resources: [
          {
            id: uid(),
            type: "care",
            name: "제천병원",
            memo: "정기 진료",
            relationship: "good",
            direction: "both",
            x: 900,
            y: 165,
            width: 150,
            height: 72
          }
        ]
      },
      {
        id: sisterId,
        name: "큰누나",
        gender: "female",
        role: "sibling",
        generation: 0,
        birthYear: "1965",
        deathYear: "",
        deceased: false,
        x: 300,
        y: 420,
        resources: []
      },
      {
        id: "client",
        name: "클라이언트",
        gender: "female",
        role: "client",
        generation: 0,
        birthYear: "1967",
        deathYear: "",
        deceased: false,
        x: 550,
        y: 420,
        resources: [
          {
            id: uid(),
            type: "care",
            name: "명지병원",
            memo: "진료와 건강관리",
            relationship: "good",
            direction: "both",
            x: 700,
            y: 610,
            width: 160,
            height: 76
          }
        ]
      },
      {
        id: brotherId,
        name: "남동생",
        gender: "male",
        role: "sibling",
        generation: 0,
        birthYear: "1970",
        deathYear: "",
        deceased: false,
        x: 800,
        y: 420,
        resources: []
      }
    ],
    familyGroups: [
      {
        id: originFamilyId,
        parents: [fatherId, motherId],
        children: [sisterId, "client", brotherId],
        status: "married",
        childTypes: {
          client: "biological"
        }
      }
    ],
    households: [],
    links: [
      { id: uid(), from: "client", to: fatherId, outType: "none", inType: "distant" },
      { id: uid(), from: "client", to: motherId, outType: "good", inType: "good" },
      { id: uid(), from: "client", to: sisterId, outType: "good", inType: "good" },
      { id: uid(), from: "client", to: brotherId, outType: "conflict", inType: "conflict" }
    ]
  });
}

function normalizeState(next) {
  next = next || {};
  next.version = 6;
  next.title = next.title || "나의 생태도";
  next.people = Array.isArray(next.people) ? next.people : [];
  next.links = Array.isArray(next.links) ? next.links : [];
  next.familyGroups = Array.isArray(next.familyGroups)
    ? next.familyGroups
    : (Array.isArray(next.families) ? next.families : []);
  next.households = Array.isArray(next.households) ? next.households : [];

  if (!next.people.length) {
    next.people.push({
      id: "client",
      name: "클라이언트",
      gender: "female",
      role: "client",
      generation: 0,
      birthYear: "",
      deceased: false,
      x: 550,
      y: 400,
      resources: []
    });
  }

  next.people.forEach(function(person, personIndex) {
    person.id = person.id || uid();
    person.role = roles[person.role]
      ? person.role
      : (person.type === "client" || personIndex === 0 ? "client" : "family");
    person.gender = genders[person.gender]
      ? person.gender
      : (person.role === "client" ? "female" : "other");
    person.generation = Number.isFinite(person.generation)
      ? person.generation
      : roles[person.role].generation;
    person.name = person.name || roles[person.role].label;
    person.birthYear = person.birthYear || "";
    person.deathYear = person.deathYear || "";
    person.deceased = Boolean(person.deceased);
    person.coupleStatus = coupleStatuses[person.coupleStatus] ? person.coupleStatus : "married";
    person.childType = childTypes[person.childType] ? person.childType : "biological";
    person.x = Number.isFinite(person.x) ? person.x : 550;
    person.y = Number.isFinite(person.y) ? person.y : 400;
    person.resources = Array.isArray(person.resources) ? person.resources : [];

    person.resources.forEach(function(resource, index) {
      resource.id = resource.id || uid();
      resource.type = resourceTypes[resource.type] ? resource.type : "info";
      resource.name = resource.name || "이름 없는 자원";
      resource.memo = resource.memo || "";
      resource.relationship = normalizeRelationshipType(resource.relationship || resource.type);
      resource.direction = directionTypes[resource.direction] ? resource.direction : "both";
      resource.width = clamp(Number(resource.width) || 150, 110, 300);
      resource.height = clamp(Number(resource.height) || 72, 56, 170);
      if (!Number.isFinite(resource.x) || !Number.isFinite(resource.y)) {
        var position = defaultResourcePosition(person, index);
        resource.x = position.x;
        resource.y = position.y;
      }
    });
  });

  next.links.forEach(function(link) {
    link.id = link.id || uid();
    if (link.outType == null && link.inType == null) {
      var legacyType = normalizeRelationshipType(link.type);
      var legacyDirection = directionTypes[link.direction] ? link.direction : "both";
      link.outType = legacyDirection === "in" ? "none" : legacyType;
      link.inType = legacyDirection === "out" ? "none" : legacyType;
    } else {
      link.outType = normalizeDirectedRelationshipType(link.outType);
      link.inType = normalizeDirectedRelationshipType(link.inType);
    }
    var normalizedClient = clientPerson(next);
    if (normalizedClient && link.to === normalizedClient.id && link.from !== normalizedClient.id) {
      var previousFrom = link.from;
      link.from = link.to;
      link.to = previousFrom;
      var previousOutType = link.outType;
      link.outType = link.inType;
      link.inType = previousOutType;
    }
    delete link.type;
    delete link.direction;
  });
  var linksByPair = {};
  next.links.forEach(function(link) {
    if (!personExists(link.from) || !personExists(link.to) || link.from === link.to) return;
    if (link.outType === "none" && link.inType === "none") return;
    var pairKey = [link.from, link.to].sort().join("::");
    linksByPair[pairKey] = link;
  });
  next.links = Object.keys(linksByPair).map(function(key) {
    return linksByPair[key];
  });

  if (next.title === "우리 가족 생태도") {
    var previousSampleClient = clientPerson(next);
    if (previousSampleClient && previousSampleClient.name === "권경자") {
      previousSampleClient.name = "클라이언트";
    }
  }

  next.familyGroups = next.familyGroups.map(function(group) {
    var normalizedChildren = Array.isArray(group.children) ? group.children.filter(personExists) : [];
    var normalizedChildTypes = {};
    normalizedChildren.forEach(function(childId) {
      normalizedChildTypes[childId] = childTypes[group.childTypes && group.childTypes[childId]]
        ? group.childTypes[childId]
        : "biological";
    });
    return {
      id: group.id || uid(),
      parents: Array.isArray(group.parents) ? group.parents.filter(personExists) : [],
      children: normalizedChildren,
      status: coupleStatuses[group.status] ? group.status : "married",
      childTypes: normalizedChildTypes
    };
  }).filter(function(group) {
    return group.parents.length || group.children.length > 1;
  });

  if (!next.familyGroups.length) inferFamilyGroups(next);

  next.households = next.households.map(function(household, index) {
    return {
      id: household.id || uid(),
      name: household.name || "동거가족 " + (index + 1),
      memberIds: Array.isArray(household.memberIds)
        ? household.memberIds.filter(personExists).filter(uniqueId)
        : []
    };
  }).filter(function(household) {
    return household.memberIds.length >= 2;
  });

  if (!next.people.some(function(person) { return person.id === next.selectedId; })) {
    next.selectedId = clientPerson(next).id;
  }
  if (!findResourceInState(next, next.selectedResourceId)) next.selectedResourceId = null;
  if (!next.links.some(function(link) { return link.id === next.selectedLinkId; })) {
    next.selectedLinkId = null;
  }
  return next;

  function personExists(id) {
    return next.people.some(function(person) { return person.id === id; });
  }
  function uniqueId(id, index, values) {
    return values.indexOf(id) === index;
  }
}

function inferFamilyGroups(next) {
  var client = clientPerson(next);
  var parents = next.people.filter(function(person) { return person.role === "parent"; });
  var siblings = next.people.filter(function(person) { return person.role === "sibling"; });
  var spouses = next.people.filter(function(person) { return person.role === "spouse"; });
  var children = next.people.filter(function(person) { return person.role === "child"; });
  if (parents.length || siblings.length) {
    var originChildren = [client.id].concat(siblings.map(idOf));
    next.familyGroups.push({
      id: uid(),
      parents: parents.slice(0, 2).map(idOf),
      children: originChildren,
      status: "married",
      childTypes: relationshipTypeMap(originChildren, "biological")
    });
  }
  if (spouses.length || children.length) {
    var descendantIds = children.map(idOf);
    next.familyGroups.push({
      id: uid(),
      parents: [client.id].concat(spouses.slice(0, 1).map(idOf)),
      children: descendantIds,
      status: "married",
      childTypes: relationshipTypeMap(descendantIds, "biological")
    });
  }

  function relationshipTypeMap(ids, type) {
    var result = {};
    ids.forEach(function(id) { result[id] = type; });
    return result;
  }
}

function loadLocalState() {
  try {
    var saved = localStorage.getItem("ecomap-genogram-state-v3");
    return saved ? normalizeState(JSON.parse(saved)) : initialState();
  } catch (error) {
    return initialState();
  }
}

var state = loadLocalState();

function saveLocalState() {
  localStorage.setItem("ecomap-genogram-state-v3", JSON.stringify(state));
}

function clientPerson(source) {
  source = source || state;
  return source.people.find(function(person) { return person.role === "client"; }) || source.people[0];
}

function selectedPerson() {
  return personById(state.selectedId) || clientPerson();
}

function selectedResource() {
  return findResourceInState(state, state.selectedResourceId);
}

function coupleGroupForPerson(personId) {
  return state.familyGroups.find(function(group) {
    return group.parents.length >= 2 && group.parents.indexOf(personId) !== -1;
  }) || null;
}

function childGroupForPerson(personId) {
  return state.familyGroups.find(function(group) {
    return group.children.indexOf(personId) !== -1;
  }) || null;
}

function normalizeRelationshipType(type) {
  var previousTypes = {
    strong: "good",
    normal: "good",
    weak: "distant",
    stress: "conflict",
    emotional: "good",
    care: "good",
    money: "good",
    info: "good",
    place: "good",
    risk: "conflict"
  };
  return socialTypes[type] ? type : (previousTypes[type] || "good");
}

function normalizeDirectedRelationshipType(type) {
  return type == null || type === "none" ? "none" : normalizeRelationshipType(type);
}

function relationshipForPerson(personId) {
  var client = clientPerson();
  if (!client || personId === client.id) return null;
  return state.links.find(function(link) {
    return (link.from === client.id && link.to === personId) ||
      (link.from === personId && link.to === client.id);
  }) || null;
}

function personDateLabel(person) {
  if (!person.deceased) return person.birthYear || "";
  return (person.birthYear || "?") + "–" + (person.deathYear || "사망");
}

function fillSelect(select, source, value, excluded) {
  select.innerHTML = Object.keys(source)
    .filter(function(key) { return !excluded || excluded.indexOf(key) === -1; })
    .map(function(key) {
      return '<option value="' + key + '"' + (key === value ? " selected" : "") + ">" +
        escapeHtml(source[key].label || source[key]) + "</option>";
    })
    .join("");
}

function render() {
  renderForm();
  renderPeople();
  renderHouseholds();
  renderSelected();
  renderResources();
  renderMap();
  saveLocalState();
}

function renderForm() {
  var client = clientPerson();
  document.getElementById("mapTitle").value = state.title;
  document.getElementById("clientName").value = client.name;
  fillSelect(document.getElementById("newGender"), genders, "female");
  fillSelect(document.getElementById("newRole"), roles, "sibling", ["client"]);
  fillSelect(document.getElementById("newOutgoingRelationship"), directedSocialTypes, "good");
  fillSelect(document.getElementById("newIncomingRelationship"), directedSocialTypes, "good");
  fillSelect(document.getElementById("newCoupleStatus"), coupleStatuses, "married");
  fillSelect(document.getElementById("newChildType"), childTypes, "biological");
  fillSelect(document.getElementById("resourceType"), resourceTypes, "emotional");
  fillSelect(document.getElementById("resourceRelationship"), socialTypes, "good");
  fillSelect(document.getElementById("resourceDirection"), directionTypes, "both");
  updateNewFamilyFields();
}

function updateNewFamilyFields() {
  var role = document.getElementById("newRole").value;
  document.getElementById("newCoupleStatusField").style.display =
    role === "parent" || role === "spouse" ? "grid" : "none";
  document.getElementById("newChildTypeField").style.display =
    role === "sibling" || role === "child" ? "grid" : "none";
}

function renderPeople() {
  var list = document.getElementById("peopleList");
  document.getElementById("peopleCount").textContent = state.people.length;
  list.innerHTML = state.people.map(function(person) {
    var symbolClass = "person-symbol " + person.gender + (person.deceased ? " deceased" : "");
    var year = personDateLabel(person) ? " · " + personDateLabel(person) : "";
    var draftSelected = householdDraft && householdDraft.memberIds.indexOf(person.id) !== -1;
    return '<button class="person-row ' + (person.id === state.selectedId ? "active " : "") +
      (draftSelected ? "household-pick" : "") +
      '" type="button" data-person-id="' + attr(person.id) + '">' +
      '<i class="' + symbolClass + '"></i>' +
      '<span class="person-main"><span class="person-name">' + escapeHtml(person.name) + '</span>' +
      '<span class="person-meta">' + escapeHtml(roles[person.role].label) + year +
      " · 자원 " + person.resources.length + "개</span></span>" +
      '<span class="count">' + person.resources.length + "</span></button>";
  }).join("");

  list.querySelectorAll("[data-person-id]").forEach(function(button) {
    button.addEventListener("click", function() {
      if (householdDraft) {
        toggleHouseholdMember(button.dataset.personId);
        return;
      }
      state.selectedId = button.dataset.personId;
      state.selectedResourceId = null;
      render();
    });
  });
}

function renderHouseholds() {
  var list = document.getElementById("householdList");
  document.getElementById("householdCount").textContent = state.households.length;
  document.getElementById("startHousehold").hidden = Boolean(householdDraft);
  document.getElementById("saveHousehold").hidden = !householdDraft;
  document.getElementById("cancelHousehold").hidden = !householdDraft;
  list.innerHTML = state.households.length ? state.households.map(function(household, index) {
    var names = household.memberIds.map(personById).filter(Boolean).map(function(person) {
      return person.name;
    }).join(", ");
    return '<div class="household-card"><div><strong>' +
      escapeHtml(household.name || "동거가족 " + (index + 1)) +
      '</strong><span>' + escapeHtml(names) + '</span></div>' +
      '<div class="household-card-actions"><button class="select-resource" type="button" ' +
      'data-household-edit="' + attr(household.id) + '">수정</button>' +
      '<button class="delete-icon" type="button" title="동거가족 삭제" data-household-delete="' +
      attr(household.id) + '">×</button></div></div>';
  }).join("") : '<div class="empty">등록된 동거가족이 없습니다.</div>';

  list.querySelectorAll("[data-household-edit]").forEach(function(button) {
    button.addEventListener("click", function() {
      startHouseholdDraft(button.dataset.householdEdit);
    });
  });
  list.querySelectorAll("[data-household-delete]").forEach(function(button) {
    button.addEventListener("click", function() {
      state.households = state.households.filter(function(household) {
        return household.id !== button.dataset.householdDelete;
      });
      render();
    });
  });
}

function renderSelected() {
  var person = selectedPerson();
  document.getElementById("selectedName").value = person.name;
  document.getElementById("selectedBirthYear").value = person.birthYear;
  document.getElementById("selectedDeathYear").value = person.deathYear;
  document.getElementById("selectedDeceased").checked = person.deceased;
  fillSelect(document.getElementById("selectedGender"), genders, person.gender);
  fillSelect(document.getElementById("selectedRole"), roles, person.role);
  document.getElementById("selectedRole").disabled = person.role === "client";
  document.getElementById("deletePerson").style.visibility = person.role === "client" ? "hidden" : "visible";
  var relationship = relationshipForPerson(person.id);
  fillSelect(
    document.getElementById("selectedOutgoingRelationship"),
    directedSocialTypes,
    relationship ? relationship.outType : "none"
  );
  fillSelect(
    document.getElementById("selectedIncomingRelationship"),
    directedSocialTypes,
    relationship ? relationship.inType : "none"
  );
  document.getElementById("selectedRelationshipField").style.display =
    person.role === "client" ? "none" : "grid";
  var coupleGroup = coupleGroupForPerson(person.id);
  var childGroup = childGroupForPerson(person.id);
  fillSelect(
    document.getElementById("selectedCoupleStatus"),
    coupleStatuses,
    coupleGroup ? coupleGroup.status : "married"
  );
  fillSelect(
    document.getElementById("selectedChildType"),
    childTypes,
    childGroup && childGroup.childTypes ? childGroup.childTypes[person.id] : "biological"
  );
  document.getElementById("selectedCoupleStatusField").style.display = coupleGroup ? "grid" : "none";
  document.getElementById("selectedChildTypeField").style.display = childGroup ? "grid" : "none";
}

function renderResources() {
  var person = selectedPerson();
  var list = document.getElementById("resourceList");
  list.innerHTML = person.resources.length ? person.resources.map(function(resource) {
    return '<div class="resource-card"><div><strong>' + escapeHtml(resource.name) +
      '</strong><span>' + escapeHtml(resource.memo || "지원 내용 미입력") +
      " · " + Math.round(resource.width) + "×" + Math.round(resource.height) +
      '</span></div><div class="resource-card-actions">' +
      '<button class="select-resource" type="button" data-resource-select="' + attr(resource.id) +
      '">크기</button><button class="delete-icon" type="button" title="자원 삭제" data-resource-delete="' +
      attr(resource.id) + '">×</button></div></div>';
  }).join("") : '<div class="empty">선택한 인물에 등록된 자원이 없습니다.</div>';

  var active = selectedResource();
  if (active && active.owner.id === person.id) {
    list.insertAdjacentHTML("beforeend",
      '<div class="size-editor"><strong>' + escapeHtml(active.resource.name) + " 크기 조절</strong>" +
      '<label class="range-row"><span>가로</span><input id="resourceWidth" type="range" min="110" max="300" value="' +
      Math.round(active.resource.width) + '"><output id="resourceWidthValue">' +
      Math.round(active.resource.width) + '</output></label>' +
      '<label class="range-row"><span>세로</span><input id="resourceHeight" type="range" min="56" max="170" value="' +
      Math.round(active.resource.height) + '"><output id="resourceHeightValue">' +
      Math.round(active.resource.height) + "</output></label></div>");

    document.getElementById("resourceWidth").addEventListener("input", function(event) {
      active.resource.width = Number(event.target.value);
      document.getElementById("resourceWidthValue").textContent = event.target.value;
      renderMap();
      saveLocalState();
    });
    document.getElementById("resourceHeight").addEventListener("input", function(event) {
      active.resource.height = Number(event.target.value);
      document.getElementById("resourceHeightValue").textContent = event.target.value;
      renderMap();
      saveLocalState();
    });
  }

  list.querySelectorAll("[data-resource-select]").forEach(function(button) {
    button.addEventListener("click", function() {
      state.selectedResourceId = button.dataset.resourceSelect;
      render();
    });
  });
  list.querySelectorAll("[data-resource-delete]").forEach(function(button) {
    button.addEventListener("click", function() {
      person.resources = person.resources.filter(function(resource) {
        return resource.id !== button.dataset.resourceDelete;
      });
      if (state.selectedResourceId === button.dataset.resourceDelete) state.selectedResourceId = null;
      render();
    });
  });
}

function renderMap() {
  svg.innerHTML = "";
  appendRelationshipMarkers();
  if (backgroundImageUrl) {
    svg.appendChild(makeSvg("image", {
      href: backgroundImageUrl,
      x: 0,
      y: 0,
      width: 1100,
      height: 760,
      opacity: .28,
      preserveAspectRatio: "xMidYMid meet"
    }));
  }
  state.households.forEach(function(household) {
    if (householdDraft && householdDraft.id === household.id) return;
    drawHouseholdBoundary(household.memberIds, false);
  });
  if (householdDraft && householdDraft.memberIds.length) {
    drawHouseholdBoundary(householdDraft.memberIds, true);
  }
  state.familyGroups.forEach(drawFamilyGroup);

  state.links.forEach(function(link) {
    var from = personById(link.from);
    var to = personById(link.to);
    if (!from || !to) return;
    drawDirectedSocialLink(link, from, to);
  });

  state.people.forEach(function(person) {
    person.resources.forEach(function(resource) {
      var path = makeSvg("path", {
        d: resourceConnectionPath(person, resource, resource.relationship),
        class: "resource-link " + resource.relationship
      });
      applyRelationshipDirection(path, resource.relationship, resource.direction);
      svg.appendChild(path);
    });
  });

  state.people.forEach(function(person) { svg.appendChild(personNode(person)); });
  state.people.forEach(function(person) {
    person.resources.forEach(function(resource) {
      svg.appendChild(resourceNode(person, resource));
    });
  });
}

function drawDirectedSocialLink(link, from, to) {
  var outType = normalizeDirectedRelationshipType(link.outType);
  var inType = normalizeDirectedRelationshipType(link.inType);
  var endpoints = connectionEndpoints(from.x, from.y, to.x, to.y, 49, 49);
  if (outType !== "none" && outType === inType) {
    appendSocialPath(endpoints, outType, "both");
    return;
  }
  var hasTwoLines = outType !== "none" && inType !== "none";
  if (outType !== "none") {
    appendSocialPath(offsetConnectionEndpoints(endpoints, hasTwoLines ? 6 : 0), outType, "out");
  }
  if (inType !== "none") {
    appendSocialPath(offsetConnectionEndpoints(endpoints, hasTwoLines ? -6 : 0), inType, "in");
  }
}

function appendSocialPath(endpoints, type, direction) {
  var path = makeSvg("path", {
    d: relationshipPath(endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2, type),
    class: "social-line " + type
  });
  applyRelationshipDirection(path, type, direction);
  svg.appendChild(path);
}

function offsetConnectionEndpoints(endpoints, offset) {
  if (!offset) return endpoints;
  var dx = endpoints.x2 - endpoints.x1;
  var dy = endpoints.y2 - endpoints.y1;
  var length = Math.hypot(dx, dy) || 1;
  var offsetX = -dy / length * offset;
  var offsetY = dx / length * offset;
  return {
    x1: endpoints.x1 + offsetX,
    y1: endpoints.y1 + offsetY,
    x2: endpoints.x2 + offsetX,
    y2: endpoints.y2 + offsetY
  };
}

function drawHouseholdBoundary(memberIds, draft) {
  var members = memberIds.map(personById).filter(Boolean);
  if (!members.length) return;
  var xs = members.map(function(person) { return person.x; });
  var ys = members.map(function(person) { return person.y; });
  var minX = Math.min.apply(null, xs);
  var maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxY = Math.max.apply(null, ys);
  svg.appendChild(makeSvg("ellipse", {
    class: "household-boundary" + (draft ? " draft" : ""),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.max(78, (maxX - minX) / 2 + 78),
    ry: Math.max(72, (maxY - minY) / 2 + 72)
  }));
}

function appendRelationshipMarkers() {
  var defs = makeSvg("defs", {});
  [
    { id: "good", color: "#3b82f6" },
    { id: "distant", color: "#22a860" },
    { id: "conflict", color: "#9b52c7" }
  ].forEach(function(item) {
    var marker = makeSvg("marker", {
      id: "arrow-" + item.id,
      viewBox: "0 0 10 10",
      refX: 8,
      refY: 5,
      markerWidth: 8,
      markerHeight: 8,
      orient: "auto-start-reverse",
      markerUnits: "userSpaceOnUse"
    });
    marker.appendChild(makeSvg("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      fill: item.color
    }));
    defs.appendChild(marker);
  });
  svg.appendChild(defs);
}

function applyRelationshipDirection(path, type, direction) {
  var marker = "url(#arrow-" + normalizeRelationshipType(type) + ")";
  if (direction === "in" || direction === "both") path.setAttribute("marker-start", marker);
  if (direction === "out" || direction === "both") path.setAttribute("marker-end", marker);
}

function connectionEndpoints(x1, y1, x2, y2, startPadding, endPadding) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var length = Math.hypot(dx, dy) || 1;
  return {
    x1: x1 + dx / length * startPadding,
    y1: y1 + dy / length * startPadding,
    x2: x2 - dx / length * endPadding,
    y2: y2 - dy / length * endPadding
  };
}

function relationshipPath(x1, y1, x2, y2, type) {
  if (type !== "conflict") return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
  var dx = x2 - x1;
  var dy = y2 - y1;
  var length = Math.hypot(dx, dy) || 1;
  var segments = Math.max(6, Math.floor(length / 15));
  var normalX = -dy / length;
  var normalY = dx / length;
  var path = "M " + x1 + " " + y1;
  for (var index = 1; index < segments; index += 1) {
    var ratio = index / segments;
    var offset = (index % 2 === 0 ? -1 : 1) * 7;
    path += " L " + (x1 + dx * ratio + normalX * offset) +
      " " + (y1 + dy * ratio + normalY * offset);
  }
  return path + " L " + x2 + " " + y2;
}

function drawFamilyGroup(group) {
  var parents = group.parents.map(personById).filter(Boolean).sort(byX);
  var children = group.children.map(personById).filter(Boolean).sort(byX);
  if (!parents.length) return;

  var startX;
  var startY;
  if (parents.length >= 2) {
    var left = parents[0];
    var right = parents[1];
    var leftEdge = left.x + 46;
    var rightEdge = right.x - 46;
    svg.appendChild(makeSvg("path", {
      d: "M " + leftEdge + " " + left.y + " H " + rightEdge,
      class: "family-line couple " + group.status
    }));
    startX = (leftEdge + rightEdge) / 2;
    startY = (left.y + right.y) / 2;
    appendCoupleStatusMarks(startX, startY, group.status);
  } else {
    startX = parents[0].x;
    startY = parents[0].y + 46;
  }

  if (!children.length) return;
  var childTop = Math.min.apply(null, children.map(function(child) { return child.y - 48; }));
  var branchY = Math.max(startY + 45, childTop - 72);
  var firstX = children[0].x;
  var lastX = children[children.length - 1].x;
  var path = "M " + startX + " " + startY + " V " + branchY;
  if (children.length > 1) path += " M " + firstX + " " + branchY + " H " + lastX;
  svg.appendChild(makeSvg("path", { d: path, class: "family-line" }));
  children.forEach(function(child) {
    var childType = group.childTypes && childTypes[group.childTypes[child.id]]
      ? group.childTypes[child.id]
      : "biological";
    svg.appendChild(makeSvg("path", {
      d: "M " + child.x + " " + branchY + " V " + (child.y - 48),
      class: "family-line child " + childType
    }));
  });
}

function appendCoupleStatusMarks(x, y, status) {
  var markCount = status === "divorced" ? 2 : (status === "separated" ? 1 : 0);
  for (var index = 0; index < markCount; index += 1) {
    var offset = markCount === 2 ? (index === 0 ? -5 : 5) : 0;
    svg.appendChild(makeSvg("line", {
      class: "couple-status-mark",
      x1: x + offset - 6,
      y1: y + 10,
      x2: x + offset + 6,
      y2: y - 10
    }));
  }
}

function personNode(person) {
  var group = makeSvg("g", {
    class: "person-node " + (person.role === "client" ? "client " : "") +
      (person.id === state.selectedId ? "selected " : "") +
      (householdDraft && householdDraft.memberIds.indexOf(person.id) !== -1 ? "household-pick" : ""),
    transform: "translate(" + person.x + " " + person.y + ")"
  });
  group.dataset.personId = person.id;
  group.appendChild(makeSvg("circle", { class: "select-ring", r: 53 }));
  appendClientRing(group, person.gender);
  appendPersonShape(group, person.gender);
  addPersonLabel(group, person);
  if (person.deceased) {
    group.appendChild(makeSvg("line", { class: "death-mark", x1: -34, y1: -34, x2: 34, y2: 34 }));
    group.appendChild(makeSvg("line", { class: "death-mark", x1: 34, y1: -34, x2: -34, y2: 34 }));
  }
  group.addEventListener("pointerdown", startPersonDrag);
  group.addEventListener("click", function(event) {
    event.stopPropagation();
    if (householdDraft) return;
    if (event.detail > 1) return;
    selectDiagramItem(person.id, null, group);
  });
  return group;
}

function appendPersonShape(group, gender) {
  if (gender === "female") {
    group.appendChild(makeSvg("circle", { class: "person-shape", r: 43 }));
  } else if (gender === "other") {
    group.appendChild(makeSvg("polygon", {
      class: "person-shape",
      points: "0,-45 45,0 0,45 -45,0"
    }));
  } else {
    group.appendChild(makeSvg("rect", {
      class: "person-shape",
      x: -43,
      y: -43,
      width: 86,
      height: 86,
      rx: 2
    }));
  }
}

function appendClientRing(group, gender) {
  if (gender === "female") {
    group.appendChild(makeSvg("circle", { class: "client-ring", r: 48 }));
  } else if (gender === "other") {
    group.appendChild(makeSvg("polygon", {
      class: "client-ring",
      points: "0,-50 50,0 0,50 -50,0"
    }));
  } else {
    group.appendChild(makeSvg("rect", {
      class: "client-ring",
      x: -48,
      y: -48,
      width: 96,
      height: 96,
      rx: 3
    }));
  }
}

function addPersonLabel(group, person) {
  var dates = personDateLabel(person);
  var name = makeSvg("text", { class: "node-name", y: dates ? -2 : 5 });
  name.textContent = shortText(person.name, 8);
  group.appendChild(name);
  if (dates) {
    var year = makeSvg("text", { class: "node-year", y: 21 });
    year.textContent = "(" + dates + ")";
    group.appendChild(year);
  }
}

function resourceNode(owner, resource) {
  var tone = resourceTypes[resource.type].tone;
  var selected = state.selectedResourceId === resource.id;
  var group = makeSvg("g", {
    class: "resource-node " + tone + (selected ? " selected" : ""),
    transform: "translate(" + resource.x + " " + resource.y + ")"
  });
  group.dataset.ownerId = owner.id;
  group.dataset.resourceId = resource.id;
  group.appendChild(makeSvg("rect", {
    class: "resource-box",
    x: -resource.width / 2,
    y: -resource.height / 2,
    width: resource.width,
    height: resource.height,
    rx: 5
  }));
  addResourceLabel(group, resource);
  var handle = makeSvg("rect", {
    class: "resize-handle",
    x: resource.width / 2 - 9,
    y: resource.height / 2 - 9,
    width: 14,
    height: 14,
    rx: 2
  });
  var title = makeSvg("title", {});
  title.textContent = "끌어서 자원 크기 조절";
  handle.appendChild(title);
  handle.addEventListener("pointerdown", startResourceResize);
  group.appendChild(handle);
  group.addEventListener("pointerdown", startResourceDrag);
  group.addEventListener("click", function(event) {
    event.stopPropagation();
    if (event.detail > 1) return;
    selectDiagramItem(owner.id, resource.id, group);
  });
  return group;
}

function addResourceLabel(group, resource) {
  var scale = clamp(Math.min(resource.width / 150, resource.height / 72), .82, 1.9);
  var nameSize = 13 * scale;
  var metaSize = 9 * scale;
  var maxChars = Math.max(6, Math.floor((resource.width - 22) / (nameSize * .9)));
  var lines = splitLabel(resource.name, maxChars).slice(0, 2);
  var name = makeSvg("text", {
    class: "resource-name",
    y: -4 - (lines.length - 1) * nameSize * .52,
    style: "font-size:" + nameSize + "px"
  });
  lines.forEach(function(line, index) {
    var tspan = makeSvg("tspan", { x: 0, dy: index === 0 ? 0 : nameSize * 1.15 });
    tspan.textContent = line;
    name.appendChild(tspan);
  });
  group.appendChild(name);
  if (resource.height >= 68) {
    var meta = makeSvg("text", {
      class: "resource-meta",
      y: resource.height / 2 - 10,
      style: "font-size:" + metaSize + "px"
    });
    meta.textContent = shortText(resource.memo || "지원 내용 미입력", Math.max(8, Math.floor(resource.width / (metaSize * .8))));
    group.appendChild(meta);
  }
}

function startPersonDrag(event) {
  event.preventDefault();
  var person = personById(event.currentTarget.dataset.personId);
  if (householdDraft) {
    event.stopPropagation();
    toggleHouseholdMember(person.id);
    return;
  }
  if (isSecondNodePress("person", person.id)) {
    event.stopPropagation();
    dragging = null;
    state.selectedId = person.id;
    state.selectedResourceId = null;
    openQuickEditor("person", person.id);
    return;
  }
  var point = svgPoint(event);
  dragging = {
    kind: "person",
    personId: person.id,
    dx: point.x - person.x,
    dy: point.y - person.y,
    lastX: person.x,
    lastY: person.y,
    moved: false
  };
  state.selectedId = person.id;
  state.selectedResourceId = null;
  svg.setPointerCapture(event.pointerId);
}

function startResourceDrag(event) {
  event.preventDefault();
  event.stopPropagation();
  var owner = personById(event.currentTarget.dataset.ownerId);
  var resource = resourceById(owner, event.currentTarget.dataset.resourceId);
  if (isSecondNodePress("resource", resource.id)) {
    dragging = null;
    state.selectedId = owner.id;
    state.selectedResourceId = resource.id;
    openQuickEditor("resource", owner.id, resource.id);
    return;
  }
  var point = svgPoint(event);
  dragging = {
    kind: "resource",
    ownerId: owner.id,
    resourceId: resource.id,
    dx: point.x - resource.x,
    dy: point.y - resource.y,
    moved: false
  };
  state.selectedId = owner.id;
  state.selectedResourceId = resource.id;
  svg.setPointerCapture(event.pointerId);
}

function startResourceResize(event) {
  event.preventDefault();
  event.stopPropagation();
  var group = event.currentTarget.parentNode;
  var owner = personById(group.dataset.ownerId);
  var resource = resourceById(owner, group.dataset.resourceId);
  dragging = {
    kind: "resource-resize",
    ownerId: owner.id,
    resourceId: resource.id,
    left: resource.x - resource.width / 2,
    top: resource.y - resource.height / 2,
    moved: false
  };
  state.selectedId = owner.id;
  state.selectedResourceId = resource.id;
  svg.setPointerCapture(event.pointerId);
}

svg.addEventListener("pointermove", function(event) {
  if (!dragging) return;
  dragging.moved = true;
  var point = svgPoint(event);
  if (dragging.kind === "person") movePerson(point);
  else if (dragging.kind === "resource") moveResource(point);
  else resizeResource(point);
  renderMap();
});

svg.addEventListener("pointerup", finishDrag);
svg.addEventListener("pointercancel", finishDrag);

function movePerson(point) {
  var person = personById(dragging.personId);
  var nextX = clamp(point.x - dragging.dx, 70, 1030);
  var nextY = clamp(point.y - dragging.dy, 70, 690);
  var moveX = nextX - dragging.lastX;
  var moveY = nextY - dragging.lastY;
  person.x = nextX;
  person.y = nextY;
  person.resources.forEach(function(resource) {
    resource.x = clamp(resource.x + moveX, 60, 1040);
    resource.y = clamp(resource.y + moveY, 50, 710);
  });
  dragging.lastX = nextX;
  dragging.lastY = nextY;
}

function moveResource(point) {
  var owner = personById(dragging.ownerId);
  var resource = resourceById(owner, dragging.resourceId);
  resource.x = clamp(point.x - dragging.dx, resource.width / 2 + 10, 1090 - resource.width / 2);
  resource.y = clamp(point.y - dragging.dy, resource.height / 2 + 10, 750 - resource.height / 2);
}

function resizeResource(point) {
  var owner = personById(dragging.ownerId);
  var resource = resourceById(owner, dragging.resourceId);
  resource.width = clamp(point.x - dragging.left, 110, 300);
  resource.height = clamp(point.y - dragging.top, 56, 170);
  resource.x = dragging.left + resource.width / 2;
  resource.y = dragging.top + resource.height / 2;
}

function finishDrag() {
  if (!dragging) return;
  if (dragging.moved) lastNodePress = { key: "", at: 0 };
  dragging = null;
  saveLocalState();
  renderPeople();
  renderSelected();
  renderResources();
}

function isSecondNodePress(kind, id) {
  var key = kind + ":" + id;
  var now = Date.now();
  if (lastNodePress.key === key && now - lastNodePress.at < 450) {
    lastNodePress = { key: "", at: 0 };
    return true;
  }
  lastNodePress = { key: key, at: now };
  return false;
}

function startHouseholdDraft(householdId) {
  var existing = state.households.find(function(household) {
    return household.id === householdId;
  });
  householdDraft = {
    id: existing ? existing.id : null,
    name: existing ? existing.name : "동거가족 " + (state.households.length + 1),
    memberIds: existing ? existing.memberIds.slice() : []
  };
  closeQuickEditor();
  renderPeople();
  renderHouseholds();
  renderMap();
  updateHouseholdStatus();
}

function toggleHouseholdMember(personId) {
  if (!householdDraft) return;
  var index = householdDraft.memberIds.indexOf(personId);
  if (index === -1) householdDraft.memberIds.push(personId);
  else householdDraft.memberIds.splice(index, 1);
  renderPeople();
  renderHouseholds();
  renderMap();
  updateHouseholdStatus();
}

function saveHouseholdDraft() {
  if (!householdDraft || householdDraft.memberIds.length < 2) {
    showToast("동거가족을 두 명 이상 선택해주세요.");
    return;
  }
  var existing = state.households.find(function(household) {
    return household.id === householdDraft.id;
  });
  if (existing) {
    existing.memberIds = householdDraft.memberIds.slice();
  } else {
    state.households.push({
      id: uid(),
      name: householdDraft.name,
      memberIds: householdDraft.memberIds.slice()
    });
  }
  householdDraft = null;
  render();
  document.getElementById("statusText").textContent =
    "인물과 자원은 이동할 수 있고, 자원 오른쪽 아래 손잡이로 크기를 조절할 수 있습니다.";
}

function cancelHouseholdDraft() {
  householdDraft = null;
  renderPeople();
  renderHouseholds();
  renderMap();
  document.getElementById("statusText").textContent =
    "인물과 자원은 이동할 수 있고, 자원 오른쪽 아래 손잡이로 크기를 조절할 수 있습니다.";
}

function updateHouseholdStatus() {
  document.getElementById("statusText").textContent =
    "동거가족 선택 중 · " + householdDraft.memberIds.length + "명";
}

function selectDiagramItem(personId, resourceId, targetGroup) {
  state.selectedId = personId;
  state.selectedResourceId = resourceId;
  svg.querySelectorAll(".person-node").forEach(function(node) {
    node.classList.remove("selected");
  });
  svg.querySelectorAll(".resource-node").forEach(function(node) {
    node.classList.remove("selected");
  });
  if (resourceId) targetGroup.classList.add("selected");
  else targetGroup.classList.add("selected");
  renderPeople();
  renderSelected();
  renderResources();
  saveLocalState();
}

function addPerson() {
  var input = document.getElementById("newPersonName");
  var name = input.value.trim();
  if (!name) {
    showToast("가족 구성원의 이름을 입력해주세요.");
    input.focus();
    return;
  }
  var role = document.getElementById("newRole").value;
  var person = {
    id: uid(),
    name: name,
    gender: document.getElementById("newGender").value,
    role: role,
    generation: roles[role].generation,
    birthYear: document.getElementById("newBirthYear").value.trim(),
    deathYear: document.getElementById("newDeathYear").value.trim(),
    deceased: document.getElementById("newDeceased").checked,
    coupleStatus: document.getElementById("newCoupleStatus").value,
    childType: document.getElementById("newChildType").value,
    x: 550,
    y: 400,
    resources: []
  };
  state.people.push(person);
  attachByRole(person, role);
  upsertSocialLink(
    clientPerson().id,
    person.id,
    document.getElementById("newOutgoingRelationship").value,
    document.getElementById("newIncomingRelationship").value
  );
  state.selectedId = person.id;
  state.selectedResourceId = null;
  input.value = "";
  document.getElementById("newBirthYear").value = "";
  document.getElementById("newDeathYear").value = "";
  document.getElementById("newDeceased").checked = false;
  layoutFamilyTree();
}

function attachByRole(person, role) {
  var client = clientPerson();
  var group;
  if (role === "parent" || role === "sibling") {
    group = state.familyGroups.find(function(item) {
      return item.children.indexOf(client.id) !== -1;
    });
    if (!group) {
      group = {
        id: uid(),
        parents: [],
        children: [client.id],
        status: "married",
        childTypes: {}
      };
      group.childTypes[client.id] = "biological";
      state.familyGroups.push(group);
    }
    if (role === "parent") {
      if (group.parents.length < 2) {
        group.parents.push(person.id);
        if (group.parents.length === 2) group.status = person.coupleStatus;
      } else {
        var additionalOriginGroup = {
          id: uid(),
          parents: [person.id],
          children: [client.id],
          status: person.coupleStatus,
          childTypes: {}
        };
        additionalOriginGroup.childTypes[client.id] = "biological";
        state.familyGroups.push(additionalOriginGroup);
      }
    } else if (group.children.indexOf(person.id) === -1) {
      group.children.push(person.id);
      group.childTypes[person.id] = person.childType;
    }
  } else if (role === "spouse" || role === "child") {
    group = state.familyGroups.find(function(item) {
      return item.parents.indexOf(client.id) !== -1;
    });
    if (!group) {
      group = {
        id: uid(),
        parents: [client.id],
        children: [],
        status: "married",
        childTypes: {}
      };
      state.familyGroups.push(group);
    }
    if (role === "spouse") {
      if (group.parents.length < 2) {
        group.parents.push(person.id);
        group.status = person.coupleStatus;
      }
      else state.familyGroups.push({
        id: uid(),
        parents: [client.id, person.id],
        children: [],
        status: person.coupleStatus,
        childTypes: {}
      });
    } else if (group.children.indexOf(person.id) === -1) {
      group.children.push(person.id);
      group.childTypes[person.id] = person.childType;
    }
  }
}

function changePersonRole(person, nextRole) {
  if (person.role === "client") return;
  removeFromFamilies(person.id);
  person.role = nextRole;
  person.generation = roles[nextRole].generation;
  attachByRole(person, nextRole);
  layoutFamilyTree();
}

function addResource() {
  var input = document.getElementById("resourceName");
  var name = input.value.trim();
  if (!name) {
    showToast("기관명 또는 자원 이름을 입력해주세요.");
    input.focus();
    return;
  }
  var person = selectedPerson();
  var position = defaultResourcePosition(person, person.resources.length);
  var resource = {
    id: uid(),
    type: document.getElementById("resourceType").value,
    name: name,
    memo: document.getElementById("resourceMemo").value.trim(),
    relationship: document.getElementById("resourceRelationship").value,
    direction: document.getElementById("resourceDirection").value,
    x: position.x,
    y: position.y,
    width: 150,
    height: 72
  };
  person.resources.push(resource);
  state.selectedResourceId = resource.id;
  input.value = "";
  document.getElementById("resourceMemo").value = "";
  render();
}

function upsertSocialLink(from, to, outType, inType) {
  outType = normalizeDirectedRelationshipType(outType);
  inType = normalizeDirectedRelationshipType(inType);
  var existing = state.links.find(function(link) {
    return (link.from === from && link.to === to) || (link.from === to && link.to === from);
  });
  if (outType === "none" && inType === "none") {
    if (existing) {
      state.links = state.links.filter(function(link) { return link.id !== existing.id; });
    }
    return;
  }
  if (existing) {
    existing.from = from;
    existing.to = to;
    existing.outType = outType;
    existing.inType = inType;
  } else {
    var link = {
      id: uid(),
      from: from,
      to: to,
      outType: outType,
      inType: inType
    };
    state.links.push(link);
  }
}

function openQuickEditor(kind, ownerId, itemId) {
  closeQuickEditor();
  quickEditor.hidden = false;
  quickEditor.style.left = "50%";
  quickEditor.style.top = "68px";
  quickEditor.style.transform = "translateX(-50%)";

  if (kind === "person") {
    var person = personById(ownerId);
    if (!person) return closeQuickEditor();
    var quickCoupleGroup = coupleGroupForPerson(person.id);
    var quickChildGroup = childGroupForPerson(person.id);
    quickEditor.innerHTML =
      '<h3>인물 바로 수정</h3>' +
      '<div class="field"><label for="quickName">이름</label><input id="quickName" value="' + attr(person.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="quickGender">가계도 기호</label><select id="quickGender"></select></div>' +
      '<div class="field"><label for="quickRole">역할</label><select id="quickRole"></select></div></div>' +
      '<div class="row compact-row"><div class="field"><label for="quickBirthYear">출생연도</label>' +
      '<input id="quickBirthYear" value="' + attr(person.birthYear) + '"></div>' +
      '<div class="field"><label for="quickDeathYear">사망연도</label>' +
      '<input id="quickDeathYear" value="' + attr(person.deathYear) + '"></div></div>' +
      '<label class="check-field"><input id="quickDeceased" type="checkbox"' +
      (person.deceased ? " checked" : "") + '><span>사망 표시</span></label>' +
      (person.role === "client" ? "" :
        '<div class="row"><div class="field"><label for="quickOutgoingRelationship">클라이언트 → 대상</label>' +
        '<select id="quickOutgoingRelationship"></select></div><div class="field">' +
        '<label for="quickIncomingRelationship">대상 → 클라이언트</label>' +
        '<select id="quickIncomingRelationship"></select></div></div>') +
      (quickCoupleGroup ?
        '<div class="field"><label for="quickCoupleStatus">부부/파트너 상태</label>' +
        '<select id="quickCoupleStatus"></select></div>' : "") +
      (quickChildGroup ?
        '<div class="field"><label for="quickChildType">부모-자녀 유형</label>' +
        '<select id="quickChildType"></select></div>' : "") +
      '<div class="editor-actions"><button class="btn" id="quickCancel" type="button">취소</button>' +
      '<button class="btn primary" id="quickSave" type="button">적용</button></div>';
    fillSelect(document.getElementById("quickGender"), genders, person.gender);
    fillSelect(document.getElementById("quickRole"), roles, person.role);
    document.getElementById("quickRole").disabled = person.role === "client";
    var personRelationship = relationshipForPerson(person.id);
    if (person.role !== "client") {
      fillSelect(
        document.getElementById("quickOutgoingRelationship"),
        directedSocialTypes,
        personRelationship ? personRelationship.outType : "none"
      );
      fillSelect(
        document.getElementById("quickIncomingRelationship"),
        directedSocialTypes,
        personRelationship ? personRelationship.inType : "none"
      );
    }
    if (quickCoupleGroup) {
      fillSelect(document.getElementById("quickCoupleStatus"), coupleStatuses, quickCoupleGroup.status);
    }
    if (quickChildGroup) {
      fillSelect(
        document.getElementById("quickChildType"),
        childTypes,
        quickChildGroup.childTypes[person.id] || "biological"
      );
    }
    document.getElementById("quickSave").addEventListener("click", function() {
      var nextRole = document.getElementById("quickRole").value;
      person.name = document.getElementById("quickName").value.trim() || "이름 없음";
      person.gender = document.getElementById("quickGender").value;
      person.birthYear = document.getElementById("quickBirthYear").value.trim();
      person.deathYear = document.getElementById("quickDeathYear").value.trim();
      person.deceased = document.getElementById("quickDeceased").checked;
      if (quickCoupleGroup) {
        quickCoupleGroup.status = document.getElementById("quickCoupleStatus").value;
        person.coupleStatus = quickCoupleGroup.status;
      }
      if (quickChildGroup) {
        quickChildGroup.childTypes[person.id] = document.getElementById("quickChildType").value;
        person.childType = quickChildGroup.childTypes[person.id];
      }
      if (person.role !== "client") {
        upsertSocialLink(
          clientPerson().id,
          person.id,
          document.getElementById("quickOutgoingRelationship").value,
          document.getElementById("quickIncomingRelationship").value
        );
      }
      closeQuickEditor();
      if (person.role !== "client" && person.role !== nextRole) changePersonRole(person, nextRole);
      else render();
    });
  } else {
    var owner = personById(ownerId);
    var resource = resourceById(owner, itemId);
    if (!resource) return closeQuickEditor();
    quickEditor.innerHTML =
      '<h3>자원 바로 수정</h3>' +
      '<div class="field"><label for="quickName">기관명 또는 자원 이름</label>' +
      '<input id="quickName" value="' + attr(resource.name) + '"></div>' +
      '<div class="field"><label for="quickMemo">지원 내용</label>' +
      '<input id="quickMemo" value="' + attr(resource.memo) + '" placeholder="예: 정기 진료, 주 1회 상담"></div>' +
      '<div class="row"><div class="field"><label for="quickResourceType">자원 분류</label>' +
      '<select id="quickResourceType"></select></div><div class="field">' +
      '<label for="quickRelationship">관계</label><select id="quickRelationship"></select></div></div>' +
      '<div class="field"><label for="quickDirection">관계 방향</label><select id="quickDirection"></select></div>' +
      '<div class="editor-actions"><button class="btn" id="quickCancel" type="button">취소</button>' +
      '<button class="btn primary" id="quickSave" type="button">적용</button></div>';
    fillSelect(document.getElementById("quickResourceType"), resourceTypes, resource.type);
    fillSelect(document.getElementById("quickRelationship"), socialTypes, resource.relationship);
    fillSelect(document.getElementById("quickDirection"), directionTypes, resource.direction);
    document.getElementById("quickSave").addEventListener("click", function() {
      resource.name = document.getElementById("quickName").value.trim() || "이름 없는 자원";
      resource.memo = document.getElementById("quickMemo").value.trim();
      resource.type = document.getElementById("quickResourceType").value;
      resource.relationship = document.getElementById("quickRelationship").value;
      resource.direction = document.getElementById("quickDirection").value;
      state.selectedId = owner.id;
      state.selectedResourceId = resource.id;
      closeQuickEditor();
      render();
    });
    positionEditorNearResource(resource.id);
  }
  document.getElementById("quickCancel").addEventListener("click", closeQuickEditor);
  document.getElementById("quickName").focus();
}

function closeQuickEditor() {
  quickEditor.hidden = true;
  quickEditor.innerHTML = "";
}

function positionEditorNearResource(resourceId) {
  var target = Array.from(svg.querySelectorAll(".resource-node")).find(function(element) {
    return element.dataset.resourceId === resourceId;
  });
  if (!target) return;
  var stage = document.querySelector(".stage");
  var stageBox = stage.getBoundingClientRect();
  var targetBox = target.getBoundingClientRect();
  var width = quickEditor.offsetWidth || 330;
  var height = quickEditor.offsetHeight || 360;
  var left = targetBox.right - stageBox.left + 10;
  if (left + width > stageBox.width - 10) {
    left = targetBox.left - stageBox.left - width - 10;
  }
  quickEditor.style.transform = "none";
  quickEditor.style.left = Math.max(10, left) + "px";
  quickEditor.style.top = Math.max(
    10,
    Math.min(targetBox.top - stageBox.top, stageBox.height - height - 10)
  ) + "px";
}

function layoutFamilyTree() {
  var generations = {};
  state.people.forEach(function(person) {
    var key = String(person.generation);
    if (!generations[key]) generations[key] = [];
    generations[key].push(person);
  });
  Object.keys(generations).forEach(function(key) {
    var generation = Number(key);
    var row = generations[key].sort(byX);
    var minX = 170;
    var maxX = 930;
    var y = clamp(170 + (generation + 1) * 230, 120, 650);
    row.forEach(function(person, index) {
      person.x = row.length === 1
        ? 550
        : minX + (maxX - minX) * index / (row.length - 1);
      person.y = y;
    });
  });
  state.people.forEach(function(person) {
    person.resources.forEach(function(resource, index) {
      var position = defaultResourcePosition(person, index);
      resource.x = position.x;
      resource.y = position.y;
    });
  });
  render();
}

function deleteSelectedPerson() {
  var person = selectedPerson();
  if (person.role === "client") return;
  state.people = state.people.filter(function(item) { return item.id !== person.id; });
  state.links = state.links.filter(function(link) {
    return link.from !== person.id && link.to !== person.id;
  });
  removeFromFamilies(person.id);
  state.households = state.households.map(function(household) {
    household.memberIds = household.memberIds.filter(function(id) { return id !== person.id; });
    return household;
  }).filter(function(household) {
    return household.memberIds.length >= 2;
  });
  state.selectedId = clientPerson().id;
  state.selectedResourceId = null;
  render();
}

function removeFromFamilies(personId) {
  state.familyGroups.forEach(function(group) {
    group.parents = group.parents.filter(function(id) { return id !== personId; });
    group.children = group.children.filter(function(id) { return id !== personId; });
    if (group.childTypes) delete group.childTypes[personId];
  });
  state.familyGroups = state.familyGroups.filter(function(group) {
    return group.parents.length || group.children.length > 1;
  });
}

function downloadJson() {
  saveLocalState();
  downloadBlob(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    safeFilename(state.title || "생태도") + ".json"
  );
  showToast("생태도 파일을 저장했습니다.");
}

function exportPng(embedState) {
  if (exportInProgress || Date.now() - lastExportFinishedAt < 5000) {
    showToast("PNG 저장이 이미 처리되었습니다.");
    return;
  }
  exportInProgress = true;
  document.getElementById("saveButton").disabled = true;
  var clone = svg.cloneNode(true);
  clone.setAttribute("width", "1760");
  clone.setAttribute("height", "1216");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  var style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = Array.from(document.styleSheets).map(function(sheet) {
    try {
      return Array.from(sheet.cssRules).map(function(rule) { return rule.cssText; }).join("\n");
    } catch (error) {
      return "";
    }
  }).join("\n");
  clone.insertBefore(style, clone.firstChild);
  var blob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: "image/svg+xml;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);
  var image = new Image();
  image.onload = function() {
    var canvas = document.createElement("canvas");
    canvas.width = 1760;
    canvas.height = 1216;
    var context = canvas.getContext("2d");
    context.fillStyle = "#f7f8fa";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(async function(png) {
      try {
        if (!png) throw new Error("empty png");
        var output = embedState ? await embedStateInPng(png, state) : png;
        downloadBlob(output, safeFilename(state.title || "생태도") + ".png");
        showToast("편집 데이터를 포함한 PNG를 저장했습니다.");
      } catch (error) {
        showToast("PNG 저장 중 오류가 발생했습니다.");
      } finally {
        exportInProgress = false;
        lastExportFinishedAt = Date.now();
        setTimeout(function() {
          document.getElementById("saveButton").disabled = false;
        }, 2000);
      }
    }, "image/png");
  };
  image.onerror = function() {
    URL.revokeObjectURL(url);
    exportInProgress = false;
    lastExportFinishedAt = Date.now();
    setTimeout(function() {
      document.getElementById("saveButton").disabled = false;
    }, 2000);
    showToast("PNG 저장 중 오류가 발생했습니다.");
  };
  image.src = url;
}

async function embedStateInPng(pngBlob, diagramState) {
  var pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  var iendOffset = findPngChunkOffset(pngBytes, "IEND");
  if (iendOffset < 0) return pngBlob;
  var jsonBytes = new TextEncoder().encode(JSON.stringify(diagramState));
  var payloadText = "ecomap-state\u0000" + bytesToBase64(jsonBytes);
  var payload = new TextEncoder().encode(payloadText);
  var textChunk = createPngChunk("tEXt", payload);
  return new Blob([
    pngBytes.slice(0, iendOffset),
    textChunk,
    pngBytes.slice(iendOffset)
  ], { type: "image/png" });
}

async function extractStateFromPng(file) {
  var bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 8 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
    return null;
  }
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var offset = 8;
  while (offset + 12 <= bytes.length) {
    var length = view.getUint32(offset);
    var type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    var dataStart = offset + 8;
    var dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    if (type === "tEXt") {
      var text = new TextDecoder("latin1").decode(bytes.slice(dataStart, dataEnd));
      if (text.indexOf("ecomap-state\u0000") === 0) {
        var encoded = text.slice("ecomap-state\u0000".length);
        return JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
      }
    }
    offset = dataEnd + 4;
  }
  return null;
}

function findPngChunkOffset(bytes, targetType) {
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var offset = 8;
  while (offset + 12 <= bytes.length) {
    var length = view.getUint32(offset);
    var type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    if (type === targetType) return offset;
    offset += 12 + length;
  }
  return -1;
}

function createPngChunk(type, data) {
  var typeBytes = new TextEncoder().encode(type);
  var chunk = new Uint8Array(12 + data.length);
  var view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.slice(4, 8 + data.length)));
  return chunk;
}

function crc32(bytes) {
  if (!crc32.table) {
    crc32.table = [];
    for (var index = 0; index < 256; index += 1) {
      var value = index;
      for (var bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      crc32.table[index] = value >>> 0;
    }
  }
  var crc = 0xffffffff;
  for (var byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    crc = crc32.table[(crc ^ bytes[byteIndex]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bytesToBase64(bytes) {
  var binary = "";
  for (var index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  var binary = atob(value);
  var bytes = new Uint8Array(binary.length);
  for (var index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function loadJson(file) {
  var reader = new FileReader();
  reader.onload = function() {
    try {
      state = normalizeState(JSON.parse(reader.result));
      backgroundImageUrl = null;
      householdDraft = null;
      closeQuickEditor();
      render();
      showToast("생태도 파일을 불러왔습니다.");
    } catch (error) {
      showToast("올바른 생태도 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
}

async function loadSelectedFile(file) {
  var lowerName = file.name.toLowerCase();
  var isJson = file.type === "application/json" || lowerName.endsWith(".json");
  var isPng = file.type === "image/png" || lowerName.endsWith(".png");
  var isImage = file.type.indexOf("image/") === 0 || /\.(png|jpe?g)$/i.test(lowerName);
  if (isJson) {
    loadJson(file);
    return;
  }

  if (isPng) {
    try {
      var embeddedState = await extractStateFromPng(file);
      if (embeddedState) {
        state = normalizeState(embeddedState);
        backgroundImageUrl = null;
        householdDraft = null;
        closeQuickEditor();
        render();
        showToast("편집용 PNG에서 생태도 데이터를 복원했습니다.");
        return;
      }
    } catch (error) {
      showToast("PNG의 편집 데이터를 읽지 못해 참고 배경으로 불러옵니다.");
    }
  }

  if (isImage) {
    var reader = new FileReader();
    reader.onload = function() {
      backgroundImageUrl = reader.result;
      renderMap();
      showToast("이미지를 참고 배경으로 불러왔습니다. 일반 이미지는 요소별 편집으로 변환되지 않습니다.");
    };
    reader.readAsDataURL(file);
    return;
  }
  showToast("JSON, PNG 또는 JPG 파일을 선택해주세요.");
}

function clearState() {
  state = initialState();
  householdDraft = null;
  backgroundImageUrl = null;
  closeQuickEditor();
  render();
  showToast("가계도 기본 틀을 새로 만들었습니다.");
}

function defaultResourcePosition(person, index) {
  var side = index % 2 === 0 ? 1 : -1;
  var tier = Math.floor(index / 2);
  var verticalOffset = person.generation === 0 ? 105 + tier * 90 : tier * 90;
  return {
    x: clamp(person.x + side * (245 + tier * 45), 100, 1000),
    y: clamp(person.y + verticalOffset, 70, 690)
  };
}

function resourceConnectionPath(person, resource, relationship) {
  var dx = resource.x - person.x;
  var dy = resource.y - person.y;
  if (Math.abs(dx) < .001 && Math.abs(dy) < .001) {
    return "M " + person.x + " " + person.y;
  }
  var length = Math.hypot(dx, dy) || 1;
  var personX = person.x + dx / length * 48;
  var personY = person.y + dy / length * 48;
  var scale = Math.min(
    Math.abs(dx) > 0 ? resource.width / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0 ? resource.height / 2 / Math.abs(dy) : Infinity
  );
  var resourceX = resource.x - dx * scale;
  var resourceY = resource.y - dy * scale;
  return relationshipPath(personX, personY, resourceX, resourceY, relationship);
}

function splitLabel(value, maxChars) {
  var text = String(value || "");
  if (text.length <= maxChars) return [text];
  var words = text.split(/\s+/);
  if (words.length > 1) {
    var lines = [""];
    words.forEach(function(word) {
      var last = lines.length - 1;
      if ((lines[last] + " " + word).trim().length <= maxChars) {
        lines[last] = (lines[last] + " " + word).trim();
      } else {
        lines.push(word);
      }
    });
    return lines.map(function(line) {
      return line.length > maxChars ? line.slice(0, maxChars - 1) + "…" : line;
    });
  }
  return [
    text.slice(0, maxChars),
    text.length > maxChars * 2 ? text.slice(maxChars, maxChars * 2 - 1) + "…" : text.slice(maxChars)
  ];
}

function makeSvg(tag, attrs) {
  var element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach(function(key) { element.setAttribute(key, attrs[key]); });
  return element;
}

function svgPoint(event) {
  var point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function personById(id) {
  return state.people.find(function(person) { return person.id === id; });
}

function resourceById(person, id) {
  return person && person.resources.find(function(resource) { return resource.id === id; });
}

function findResourceInState(source, id) {
  if (!id) return null;
  for (var index = 0; index < source.people.length; index += 1) {
    var resource = source.people[index].resources.find(function(item) { return item.id === id; });
    if (resource) return { owner: source.people[index], resource: resource };
  }
  return null;
}

function idOf(item) { return item.id; }
function byX(a, b) { return a.x - b.x; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function shortText(value, max) {
  value = String(value || "");
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}
function safeFilename(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, "_").trim() || "생태도";
}
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function() { toast.classList.remove("show"); }, 1800);
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function attr(value) { return escapeHtml(value); }

document.getElementById("mapTitle").addEventListener("input", function(event) {
  state.title = event.target.value;
  saveLocalState();
});
document.getElementById("clientName").addEventListener("input", function(event) {
  clientPerson().name = event.target.value || "클라이언트";
  renderPeople();
  renderMap();
  saveLocalState();
});
document.getElementById("selectedName").addEventListener("input", function(event) {
  selectedPerson().name = event.target.value || "이름 없음";
  renderPeople();
  renderMap();
  saveLocalState();
});
document.getElementById("selectedGender").addEventListener("change", function(event) {
  selectedPerson().gender = event.target.value;
  render();
});
document.getElementById("selectedRole").addEventListener("change", function(event) {
  changePersonRole(selectedPerson(), event.target.value);
});
document.getElementById("selectedBirthYear").addEventListener("input", function(event) {
  selectedPerson().birthYear = event.target.value.trim();
  renderPeople();
  renderMap();
  saveLocalState();
});
document.getElementById("selectedDeathYear").addEventListener("input", function(event) {
  selectedPerson().deathYear = event.target.value.trim();
  renderPeople();
  renderMap();
  saveLocalState();
});
document.getElementById("selectedDeceased").addEventListener("change", function(event) {
  selectedPerson().deceased = event.target.checked;
  render();
});
document.getElementById("selectedOutgoingRelationship").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role === "client") return;
  var relationship = relationshipForPerson(person.id);
  upsertSocialLink(
    clientPerson().id,
    person.id,
    event.target.value,
    relationship ? relationship.inType : "none"
  );
  render();
});
document.getElementById("selectedIncomingRelationship").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role === "client") return;
  var relationship = relationshipForPerson(person.id);
  upsertSocialLink(
    clientPerson().id,
    person.id,
    relationship ? relationship.outType : "none",
    event.target.value
  );
  render();
});
document.getElementById("selectedCoupleStatus").addEventListener("change", function(event) {
  var group = coupleGroupForPerson(selectedPerson().id);
  if (!group) return;
  group.status = event.target.value;
  selectedPerson().coupleStatus = event.target.value;
  render();
});
document.getElementById("selectedChildType").addEventListener("change", function(event) {
  var person = selectedPerson();
  var group = childGroupForPerson(person.id);
  if (!group) return;
  group.childTypes[person.id] = event.target.value;
  person.childType = event.target.value;
  render();
});
document.getElementById("addPerson").addEventListener("click", addPerson);
document.getElementById("newRole").addEventListener("change", updateNewFamilyFields);
document.getElementById("newPersonName").addEventListener("keydown", function(event) {
  if (event.key === "Enter") addPerson();
});
document.getElementById("addResource").addEventListener("click", addResource);
document.getElementById("resourceName").addEventListener("keydown", function(event) {
  if (event.key === "Enter") addResource();
});
document.getElementById("deletePerson").addEventListener("click", deleteSelectedPerson);
document.getElementById("startHousehold").addEventListener("click", function() {
  startHouseholdDraft(null);
});
document.getElementById("saveHousehold").addEventListener("click", saveHouseholdDraft);
document.getElementById("cancelHousehold").addEventListener("click", cancelHouseholdDraft);
document.getElementById("newButton").addEventListener("click", clearState);
document.getElementById("resetButton").addEventListener("click", clearState);
document.getElementById("saveButton").addEventListener("click", function() {
  exportPng(true);
});
document.getElementById("loadButton").addEventListener("click", function() {
  document.getElementById("loadInput").click();
});
document.getElementById("loadInput").addEventListener("change", function(event) {
  var file = event.target.files[0];
  if (file) loadSelectedFile(file);
  event.target.value = "";
});
window.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    closeQuickEditor();
    if (householdDraft) cancelHouseholdDraft();
  }
}, true);

render();
