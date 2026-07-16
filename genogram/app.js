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
  grandchild: { label: "손자/손녀", generation: 2 },
  family: { label: "기타 가족", generation: 0 },
  pet: { label: "반려동물", generation: 0 }
};

var petTypes = {
  dog: "강아지",
  cat: "고양이",
  other: "기타 반려동물"
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
  widowed: "사별",
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
var undoStack = [];
var backgroundImageUrl = null;
var exportInProgress = false;
var lastExportFinishedAt = 0;
var documentDraft = null;
var driveCases = [];
var driveConnection = { configured: false, connected: false, email: "" };

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
    version: 7,
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

function blankCaseState() {
  return normalizeState({
    version: 8,
    title: "새 사례 가계도",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [{
      id: "client",
      name: "클라이언트",
      gender: "other",
      genderUnknown: true,
      role: "client",
      generation: 0,
      birthYear: "",
      deathYear: "",
      deceased: false,
      deathYearUnknown: false,
      birthOrderUnknown: false,
      x: 550,
      y: 385,
      resources: [],
      supportMemo: "",
      supports: []
    }],
    familyGroups: [],
    households: [],
    links: []
  });
}

function normalizeState(next) {
  next = next || {};
  var savedVersion = Number(next.version || 0);
  next.version = 9;
  next.externalRedacted = Boolean(next.externalRedacted);
  next.reviewConfirmedKey = savedVersion >= 9 && typeof next.reviewConfirmedKey === "string"
    ? next.reviewConfirmedKey
    : null;
  next.driveFileId = typeof next.driveFileId === "string" ? next.driveFileId : "";
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
       resources: [],
       supportMemo: "",
       supports: []
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
    person.deceased = Boolean(person.deceased || person.deathYearUnknown);
    person.deathYearUnknown = Boolean(person.deathYearUnknown);
    person.genderUnknown = Boolean(person.genderUnknown);
    person.birthOrderUnknown = Boolean(person.birthOrderUnknown);
    person.petType = petTypes[person.petType] ? person.petType : "other";
    person.coupleStatus = coupleStatuses[person.coupleStatus] ? person.coupleStatus : "married";
    person.childType = childTypes[person.childType] ? person.childType : "biological";
    person.parentId = next.people.some(function(item) { return item.id === person.parentId; })
      ? person.parentId
      : null;
    person.petOwnerId = next.people.some(function(item) {
      return item.id === person.petOwnerId && item.role !== "pet";
    })
      ? person.petOwnerId
      : null;
    person.x = Number.isFinite(person.x) ? person.x : 550;
    person.y = Number.isFinite(person.y) ? person.y : 400;
    person.size = clamp(Number(person.size) || 86, 56, 180);
    person.supportMemo = typeof person.supportMemo === "string" ? person.supportMemo : "";
    person.supports = Array.isArray(person.supports)
      ? person.supports.filter(Boolean)
      : splitSupports(person.supportMemo);
    if (!person.supportMemo && person.supports.length) person.supportMemo = person.supports.join("\n");
    person.resources = Array.isArray(person.resources) ? person.resources : [];

    person.resources.forEach(function(resource, index) {
      resource.id = resource.id || uid();
      resource.type = resourceTypes[resource.type] ? resource.type : "info";
      resource.name = resource.name || "이름 없는 자원";
      resource.memo = resource.memo || "";
      resource.supports = Array.isArray(resource.supports)
        ? resource.supports.filter(Boolean)
        : splitSupports(resource.memo);
      fitResourceHeight(resource);
      resource.relationship = normalizeRelationshipType(resource.relationship || resource.type);
      resource.direction = directionTypes[resource.direction] ? resource.direction : "both";
      resource.width = clamp(Number(resource.width) || 150, 110, 300);
      resource.height = clamp(Number(resource.height) || 72, 56, 260);
      if (!Number.isFinite(resource.x) || !Number.isFinite(resource.y)) {
        var position = defaultResourcePosition(person, index);
        resource.x = position.x;
        resource.y = position.y;
      }
    });
  });

  migrateFamilyNamedResources(next);

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

  // Repair drafts generated by the first document importer version. Those
  // drafts used social arrows for family members instead of family groups.
  if (next.source && next.source.fileName && next.source.draftVersion !== 2) {
    next.familyGroups = [];
    next.links = [];
    inferFamilyGroups(next);
    next.source.draftVersion = 2;
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
    return group.parents.length >= 2 || group.children.length > 0;
  });

  if (!next.familyGroups.length) inferFamilyGroups(next);

  next.households = next.households.map(function(household, index) {
    var memberIds = Array.isArray(household.memberIds)
      ? household.memberIds.filter(personExists).filter(uniqueId)
      : [];
    var name = household.name || "동거가족 " + (index + 1);
    if (memberIds.length === 1 && /^동거가족\s+\d+$/.test(name)) name = "독거가구";
    return {
      id: household.id || uid(),
      name: name,
      memberIds: memberIds
    };
  }).filter(function(household) {
    return household.memberIds.length >= 1;
  });

  if (!next.people.some(function(person) { return person.id === next.selectedId; })) {
    next.selectedId = clientPerson(next).id;
  }
  next.people.forEach(function(person) {
    if (person.role === "pet" && !person.petOwnerId) {
      person.petOwnerId = clientPerson(next).id;
    }
  });
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
  var grandchildren = next.people.filter(function(person) { return person.role === "grandchild"; });
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
  grandchildren.forEach(function(grandchild) {
    var parent = next.people.find(function(person) {
      return person.id === grandchild.parentId;
    }) || children[0];
    if (!parent) return;
    grandchild.parentId = parent.id;
    var group = next.familyGroups.find(function(item) {
      return item.parents.indexOf(parent.id) !== -1;
    });
    if (!group) {
      group = {
        id: uid(),
        parents: [parent.id],
        children: [],
        status: "married",
        childTypes: {}
      };
      next.familyGroups.push(group);
    }
    group.children.push(grandchild.id);
    group.childTypes[grandchild.id] = grandchild.childType || "biological";
  });

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

function createUndoSnapshot() {
  return {
    stateJson: JSON.stringify(state),
    backgroundImageUrl: backgroundImageUrl
  };
}

function rememberUndo(snapshot) {
  undoStack.push(snapshot || createUndoSnapshot());
  if (undoStack.length > 50) undoStack.shift();
}

function undoLastAction() {
  if (!undoStack.length) {
    showToast("되돌릴 작업이 없습니다.");
    return;
  }
  var snapshot = undoStack.pop();
  state = normalizeState(JSON.parse(snapshot.stateJson));
  backgroundImageUrl = snapshot.backgroundImageUrl;
  householdDraft = null;
  dragging = null;
  closeQuickEditor();
  render();
  showToast("이전 작업으로 되돌렸습니다.");
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
  if (state.externalRedacted) return "";
  if (!person.deceased && !person.deathYearUnknown) return person.birthYear || "";
  return (person.birthYear || "?") + "–" + (person.deathYear || (person.deathYearUnknown ? "사망연도 미상" : "사망"));
}

function splitSupports(value) {
  return String(value || "")
    .replace(/\s*\d+\s*[.)]\s*/g, "\n")
    .split(/\r?\n|\s*\/\s*/)
    .map(function(item) { return item.trim(); })
    .filter(Boolean);
}

function personSupportItems(person) {
  var values = [];
  splitSupports(person && person.supportMemo).concat(person && Array.isArray(person.supports) ? person.supports : [])
    .forEach(function(item) {
      splitSupports(item).forEach(function(value) {
        if (values.indexOf(value) === -1) values.push(value);
      });
    });
  return values;
}

function setPersonSupport(person, value) {
  var items = splitSupports(value);
  person.supports = items;
  person.supportMemo = items.join("\n");
}

function addPersonSupport(person, value) {
  if (!person) return;
  setPersonSupport(person, personSupportItems(person).concat(splitSupports(value)).join("\n"));
}

function familyPersonByName(name, excludedId) {
  var normalizedName = String(name || "").trim();
  if (!normalizedName) return null;
  return state.people.find(function(person) {
    return person.id !== excludedId && person.role !== "client" && person.role !== "pet" &&
      String(person.name || "").trim() === normalizedName;
  }) || null;
}

function migrateFamilyNamedResources(next) {
  var byName = {};
  next.people.forEach(function(person) {
    var name = String(person.name || "").trim();
    if (name && person.role !== "client" && person.role !== "pet" && !byName[name]) byName[name] = person;
  });
  next.people.forEach(function(owner) {
    owner.resources = owner.resources.filter(function(resource) {
      var target = byName[String(resource.name || "").trim()];
      var items = (resource.supports && resource.supports.length ? resource.supports : splitSupports(resource.memo));
      if (!target || target.id === owner.id || !items.length) return true;
      addPersonSupport(target, items.join("\n"));
      return false;
    });
  });
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

function eligibleGrandchildParents() {
  return state.people.filter(function(person) {
    return person.role === "child";
  });
}

function eligiblePetOwners() {
  return state.people.filter(function(person) {
    return person.role !== "pet";
  });
}

function fillPersonSelect(select, people, value) {
  if (!people.length) {
    select.innerHTML = '<option value="">자녀를 먼저 추가해주세요</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = people.map(function(person) {
    return '<option value="' + attr(person.id) + '"' + (person.id === value ? " selected" : "") + ">" +
      escapeHtml(person.name) + "</option>";
  }).join("");
}

function render() {
  renderForm();
  renderPeople();
  renderChecklist();
  renderHouseholds();
  renderSelected();
  renderResources();
  renderMap();
  document.getElementById("undoButton").disabled = !undoStack.length;
  saveLocalState();
}

function openSidebarPanel(panelId) {
  var target = document.getElementById(panelId);
  if (!target) return;
  document.querySelectorAll(".sidebar-panel").forEach(function(panel) {
    if (panel !== target) panel.open = false;
  });
  target.open = true;
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
  fillSelect(document.getElementById("newPetType"), petTypes, "dog");
  var petOwners = eligiblePetOwners();
  fillPersonSelect(
    document.getElementById("newPetOwner"),
    petOwners,
    client.id
  );
  var grandchildParents = eligibleGrandchildParents();
  fillPersonSelect(
    document.getElementById("newParentPerson"),
    grandchildParents,
    grandchildParents.length ? grandchildParents[0].id : null
  );
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
    role === "sibling" || role === "child" || role === "grandchild" ? "grid" : "none";
  document.getElementById("newParentPersonField").style.display =
    role === "grandchild" ? "grid" : "none";
  document.getElementById("newPetFields").style.display =
    role === "pet" ? "grid" : "none";
  document.getElementById("newBirthOrderUnknownField").style.display =
    role === "child" || role === "grandchild" ? "flex" : "none";
}

function renderPeople() {
  var list = document.getElementById("peopleList");
  document.getElementById("peopleCount").textContent = state.people.length;
  list.innerHTML = state.people.map(function(person) {
    var symbolClass = "person-symbol " + person.gender +
      (person.role === "pet" ? " pet " + person.petType : (person.deceased ? " deceased" : ""));
    var year = personDateLabel(person) ? " · " + personDateLabel(person) : "";
    var draftSelected = householdDraft && householdDraft.memberIds.indexOf(person.id) !== -1;
    return '<button class="person-row ' + (person.id === state.selectedId ? "active " : "") +
      (draftSelected ? "household-pick" : "") +
      '" type="button" data-person-id="' + attr(person.id) + '">' +
      '<i class="' + symbolClass + '"></i>' +
      '<span class="person-main"><span class="person-name">' + escapeHtml(person.name) + '</span>' +
      '<span class="person-meta">' + escapeHtml(roles[person.role].label) +
       (person.role === "pet" ? " · " + escapeHtml(petTypes[person.petType]) : "") + year +
       " · 자원 " + person.resources.length + "개" +
       (personSupportItems(person).length ? " · 지원 " + personSupportItems(person).length + "개" : "") +
       (person.genderUnknown ? " · 성별 미상" : "") +
      (person.birthOrderUnknown ? " · 순서 미상" : "") + "</span></span>" +
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
      openSidebarPanel("editPanel");
      render();
    });
  });
}

function checklistItems() {
  var items = [];
  state.people.forEach(function(person) {
    if (person.role !== "pet" && (person.genderUnknown || person.gender === "other")) {
      items.push({ personId: person.id, message: "성별 확인 필요" });
    }
    if (person.role !== "pet" && !person.birthYear) {
      items.push({ personId: person.id, message: "출생연도 미입력" });
    }
    if (person.role !== "pet" && person.deceased && !person.deathYear && !person.deathYearUnknown) {
      items.push({ personId: person.id, message: "사망연도 입력 또는 미상 표시 필요" });
    }
    if ((person.role === "child" || person.role === "grandchild") && person.birthOrderUnknown) {
      items.push({ personId: person.id, message: "출생순서 확인 필요" });
    }
  });
  return items;
}

function reviewChecklistKey(items) {
  return items.map(function(item) {
    return item.personId + ":" + item.message;
  }).join("|");
}

function acknowledgeReview() {
  var items = checklistItems();
  if (items.length) return;
  state.reviewConfirmedKey = reviewChecklistKey(items);
  saveLocalState();
  renderChecklist();
}

function renderChecklist() {
  var list = document.getElementById("checklistList");
  var count = document.getElementById("checklistCount");
  var reviewBadge = document.getElementById("reviewBadge");
  var acknowledgeButton = document.getElementById("acknowledgeReviewButton");
  var items = checklistItems();
  var checklistKey = reviewChecklistKey(items);
  var confirmed = !items.length && state.reviewConfirmedKey === checklistKey;
  count.textContent = items.length;
  reviewBadge.hidden = !items.length && !confirmed;
  reviewBadge.textContent = items.length
    ? "확인 필요 " + items.length
    : "확인 완료";
  reviewBadge.classList.toggle("clear", !items.length && !reviewBadge.hidden);
  acknowledgeButton.hidden = items.length > 0 || confirmed;
  list.innerHTML = items.length ? items.map(function(item) {
    var person = personById(item.personId);
    return '<button class="checklist-item" type="button" data-check-person="' + attr(item.personId) + '">' +
      '<span class="check-icon">!</span><span><strong>' + escapeHtml(person ? person.name : "삭제된 인물") +
      '</strong><small>' + escapeHtml(item.message) + '</small></span></button>';
  }).join("") : '<div class="empty">확인할 항목이 없습니다.</div>';
  list.querySelectorAll("[data-check-person]").forEach(function(button) {
    button.addEventListener("click", function() {
      state.selectedId = button.dataset.checkPerson;
      state.selectedResourceId = null;
      openSidebarPanel("editPanel");
      render();
      document.getElementById("selectedPersonSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setDriveConnection(next) {
  driveConnection = next || { configured: false, connected: false, email: "" };
  var badge = document.getElementById("driveStatusBadge");
  var text = document.getElementById("driveStatusText");
  var connect = document.getElementById("driveConnectButton");
  var save = document.getElementById("driveSaveButton");
  var refresh = document.getElementById("driveRefreshButton");
  var logout = document.getElementById("driveLogoutButton");
  var search = document.getElementById("driveCaseSearch");
  if (!badge || !text) return;

  badge.classList.remove("connected", "warn");
  if (!driveConnection.configured) {
    badge.textContent = "설정 필요";
    badge.classList.add("warn");
    text.textContent = "Google Drive 연결 설정이 아직 완료되지 않았습니다.";
  } else if (!driveConnection.connected) {
    badge.textContent = "연결 전";
    text.textContent = "내 Google 계정에 연결하면 대상자 자료를 안전하게 보관하고 다시 불러올 수 있습니다.";
  } else {
    badge.textContent = "연결됨";
    badge.classList.add("connected");
    text.textContent = "내 Google Drive 계정에 연결되어 있습니다. 저장 목록은 연결한 계정에서만 표시됩니다.";
  }
  connect.hidden = driveConnection.connected;
  connect.disabled = !driveConnection.configured;
  save.disabled = !driveConnection.connected;
  refresh.disabled = !driveConnection.connected;
  search.disabled = !driveConnection.connected;
  logout.hidden = !driveConnection.connected;
  save.textContent = state.driveFileId ? "변경사항 저장" : "현재 대상자 저장";
}

function driveErrorMessage(payload, fallback) {
  return payload && payload.error ? payload.error : fallback;
}

function renderDriveCases() {
  var list = document.getElementById("driveCaseList");
  var search = document.getElementById("driveCaseSearch");
  if (!list) return;
  if (!driveConnection.connected) {
    list.innerHTML = '<div class="drive-case-empty">Google Drive를 연결하면 저장된 대상자가 표시됩니다.</div>';
    return;
  }
  var query = String(search?.value || "").trim().toLowerCase();
  var rows = driveCases.filter(function(item) {
    return !query || String(item.subjectName || "").toLowerCase().includes(query);
  });
  list.innerHTML = rows.length ? rows.map(function(item) {
    var date = item.updatedAt ? new Date(item.updatedAt).toLocaleString("ko-KR") : "날짜 미상";
    return '<div class="drive-case-card">' +
      '<div class="drive-case-copy"><strong>' + escapeHtml(item.subjectName || "이름 미상") +
      '</strong><small>최근 저장 ' + escapeHtml(date) + '</small></div>' +
      '<button class="btn" type="button" data-drive-load="' + attr(item.id) + '">불러오기</button>' +
      '</div>';
  }).join("") : '<div class="drive-case-empty">저장된 대상자가 없습니다.</div>';
  list.querySelectorAll("[data-drive-load]").forEach(function(button) {
    button.addEventListener("click", function() {
      loadDriveCase(button.dataset.driveLoad);
    });
  });
}

async function refreshDriveCases() {
  if (!driveConnection.connected) return;
  var response = await fetch("/api/google-cases", { headers: { Accept: "application/json" }, cache: "no-store" });
  var payload = await response.json();
  if (!response.ok) throw new Error(driveErrorMessage(payload, "저장된 대상자를 불러오지 못했습니다."));
  driveCases = payload.files || [];
  renderDriveCases();
}

async function initializeDriveStorage() {
  var response;
  try {
    response = await fetch("/api/google-auth?action=status", { headers: { Accept: "application/json" }, cache: "no-store" });
    var payload = await response.json();
    setDriveConnection(payload);
    if (payload.connected) await refreshDriveCases();
    var result = new URLSearchParams(location.search).get("google");
    if (result === "connected") showToast("Google Drive에 연결했습니다.");
    if (result === "disconnected") showToast("Google Drive 연결을 해제했습니다.");
    if (result && !["connected", "disconnected"].includes(result)) showToast("Google Drive 연결을 완료하지 못했습니다.");
  } catch (error) {
    setDriveConnection({ configured: true, connected: false, email: "" });
    document.getElementById("driveStatusText").textContent = error.message || "Google Drive 상태를 확인하지 못했습니다.";
  }
}

async function saveCurrentToDrive() {
  if (!driveConnection.connected) return;
  var button = document.getElementById("driveSaveButton");
  button.disabled = true;
  try {
    var snapshot = JSON.parse(JSON.stringify(state));
    var response = await fetch("/api/google-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        id: state.driveFileId || "",
        subjectName: clientPerson().name,
        data: snapshot
      })
    });
    var payload = await response.json();
    if (!response.ok) throw new Error(driveErrorMessage(payload, "대상자 자료를 저장하지 못했습니다."));
    state.driveFileId = payload.id;
    saveLocalState();
    await refreshDriveCases();
    setDriveConnection(driveConnection);
    showToast("Google Drive에 대상자 자료를 저장했습니다.");
  } catch (error) {
    showToast(error.message || "Google Drive 저장에 실패했습니다.");
  } finally {
    button.disabled = !driveConnection.connected;
  }
}

async function loadDriveCase(id) {
  if (!driveConnection.connected) return;
  try {
    var response = await fetch("/api/google-cases?id=" + encodeURIComponent(id), { headers: { Accept: "application/json" }, cache: "no-store" });
    var payload = await response.json();
    if (!response.ok) throw new Error(driveErrorMessage(payload, "대상자 자료를 불러오지 못했습니다."));
    rememberUndo();
    state = normalizeState(payload.data);
    state.driveFileId = payload.id;
    householdDraft = null;
    backgroundImageUrl = null;
    closeQuickEditor();
    layoutFamilyTree();
    render();
    openSidebarPanel("reviewPanel");
    showToast((payload.subjectName || "대상자") + " 자료를 불러왔습니다.");
  } catch (error) {
    showToast(error.message || "대상자 자료를 불러오지 못했습니다.");
  }
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
    var householdName = household.memberIds.length === 1
      ? "독거가구"
      : (household.name || "동거가족 " + (index + 1));
    return '<div class="household-card"><div><strong>' +
      escapeHtml(householdName) +
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
      rememberUndo();
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
  document.getElementById("selectedSupportMemo").value = person.supportMemo || personSupportItems(person).join("\n");
  document.getElementById("selectedDeceased").checked = person.deceased;
  document.getElementById("selectedDeathYearUnknown").checked = person.deathYearUnknown;
  document.getElementById("selectedGenderUnknown").checked = person.genderUnknown;
  document.getElementById("selectedBirthOrderUnknown").checked = person.birthOrderUnknown;
  fillSelect(document.getElementById("selectedGender"), genders, person.gender);
  fillSelect(document.getElementById("selectedRole"), roles, person.role);
  fillSelect(document.getElementById("selectedPetType"), petTypes, person.petType);
  fillPersonSelect(
    document.getElementById("selectedPetOwner"),
    eligiblePetOwners(),
    person.petOwnerId || clientPerson().id
  );
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
    person.role === "client" || person.role === "pet" ? "none" : "grid";
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
  var grandchildParents = eligibleGrandchildParents().filter(function(parent) {
    return parent.id !== person.id;
  });
  fillPersonSelect(
    document.getElementById("selectedParentPerson"),
    grandchildParents,
    person.parentId || (grandchildParents.length ? grandchildParents[0].id : null)
  );
  document.getElementById("selectedParentPersonField").style.display =
    person.role === "grandchild" ? "grid" : "none";
  document.getElementById("selectedSupportField").style.display =
    person.role === "pet" ? "none" : "grid";
  document.getElementById("selectedPetFields").style.display =
    person.role === "pet" ? "grid" : "none";
  document.getElementById("selectedBirthOrderUnknownField").style.display =
    person.role === "child" || person.role === "grandchild" ? "flex" : "none";
}

function renderResources() {
  var person = selectedPerson();
  var list = document.getElementById("resourceList");
  list.innerHTML = person.resources.length ? person.resources.map(function(resource) {
    return '<div class="resource-card"><div><strong>' + escapeHtml(resource.name) +
      '</strong><span>' + escapeHtml((resource.supports || []).join(" · ") || resource.memo || "지원 내용 미입력") +
      " · " + Math.round(resource.width) + "×" + Math.round(resource.height) +
      '</span></div><div class="resource-card-actions">' +
      '<button class="select-resource" type="button" data-resource-select="' + attr(resource.id) +
      '">크기</button><button class="delete-icon" type="button" title="자원 삭제" data-resource-delete="' +
      attr(resource.id) + '">×</button></div></div>';
  }).join("") : '<div class="empty">선택한 인물에 등록된 자원이 없습니다.</div>';

  var active = selectedResource();
  if (active && active.owner.id === person.id) {
    var sizeUndoSnapshot = createUndoSnapshot();
    var sizeUndoCaptured = false;
    function captureSizeUndo() {
      if (sizeUndoCaptured) return;
      rememberUndo(sizeUndoSnapshot);
      sizeUndoCaptured = true;
    }
    list.insertAdjacentHTML("beforeend",
      '<div class="size-editor"><strong>' + escapeHtml(active.resource.name) + " 크기 조절</strong>" +
      '<label class="range-row"><span>가로</span><input id="resourceWidth" type="range" min="110" max="300" value="' +
      Math.round(active.resource.width) + '"><output id="resourceWidthValue">' +
      Math.round(active.resource.width) + '</output></label>' +
      '<label class="range-row"><span>세로</span><input id="resourceHeight" type="range" min="56" max="260" value="' +
      Math.round(active.resource.height) + '"><output id="resourceHeightValue">' +
      Math.round(active.resource.height) + "</output></label></div>");

    document.getElementById("resourceWidth").addEventListener("input", function(event) {
      captureSizeUndo();
      active.resource.width = Number(event.target.value);
      document.getElementById("resourceWidthValue").textContent = event.target.value;
      renderMap();
      saveLocalState();
    });
    document.getElementById("resourceHeight").addEventListener("input", function(event) {
      captureSizeUndo();
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
      rememberUndo();
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

  state.people.forEach(function(person) {
    if (person.role !== "pet") return;
    var owner = personById(person.petOwnerId) || clientPerson();
    if (owner && owner.id !== person.id) drawPetConnection(owner, person);
  });

  state.links.forEach(function(link) {
    var from = personById(link.from);
    var to = personById(link.to);
    if (!from || !to || from.role === "pet" || to.role === "pet") return;
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

function drawPetConnection(owner, pet) {
  var endpoints = personConnectionEndpoints(owner, pet);
  svg.appendChild(makeSvg("path", {
    d: "M " + endpoints.x1 + " " + endpoints.y1 + " L " + endpoints.x2 + " " + endpoints.y2,
    class: "pet-line"
  }));
}

function drawDirectedSocialLink(link, from, to) {
  var outType = normalizeDirectedRelationshipType(link.outType);
  var inType = normalizeDirectedRelationshipType(link.inType);
  var endpoints = personConnectionEndpoints(from, to);
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

function personConnectionEndpoints(from, to) {
  return {
    x1: personEdgePoint(from, to).x,
    y1: personEdgePoint(from, to).y,
    x2: personEdgePoint(to, from).x,
    y2: personEdgePoint(to, from).y
  };
}

function personEdgePoint(person, target) {
  var dx = target.x - person.x;
  var dy = target.y - person.y;
  var length = Math.hypot(dx, dy) || 1;
  var half = (person.size || 86) / 2 + 2;
  var scale = half / Math.max(Math.abs(dx), Math.abs(dy), 1);
  return { x: person.x + dx * scale, y: person.y + dy * scale };
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
    // Couple lines must follow both node centers. Using only left.y made the
    // line stop above/below a partner when the two people were moved or resized.
    var leftCoupleEdge = personEdgePoint(left, right);
    var rightCoupleEdge = personEdgePoint(right, left);
    svg.appendChild(makeSvg("path", {
      d: "M " + leftCoupleEdge.x + " " + leftCoupleEdge.y +
        " L " + rightCoupleEdge.x + " " + rightCoupleEdge.y,
      class: "family-line couple " + group.status
    }));
    startX = (leftCoupleEdge.x + rightCoupleEdge.x) / 2;
    startY = (leftCoupleEdge.y + rightCoupleEdge.y) / 2;
    appendCoupleStatusMarks(startX, startY, group.status);
  } else {
    startX = parents[0].x;
    startY = parents[0].y + (parents[0].size || 86) / 2 + 2;
  }

  if (!children.length) return;
  if (children.length === 1) {
    var onlyChild = children[0];
    var onlyChildType = group.childTypes && childTypes[group.childTypes[onlyChild.id]]
      ? group.childTypes[onlyChild.id]
      : "biological";
    svg.appendChild(makeSvg("path", {
      d: singleChildFamilyPath(parents, startX, startY, onlyChild),
      class: "family-line child " + onlyChildType
    }));
    return;
  }
  var childTop = Math.min.apply(null, children.map(function(child) { return child.y - (child.size || 86) / 2 - 2; }));
  var branchY = Math.max(startY + 45, childTop - 72);
  var firstX = children[0].x;
  var lastX = children[children.length - 1].x;
  var path = "M " + startX + " " + startY + " V " + branchY;
  path += " M " + Math.min(startX, firstX) + " " + branchY +
    " H " + Math.max(startX, lastX);
  svg.appendChild(makeSvg("path", { d: path, class: "family-line" }));
  children.forEach(function(child) {
    var childType = group.childTypes && childTypes[group.childTypes[child.id]]
      ? group.childTypes[child.id]
      : "biological";
    svg.appendChild(makeSvg("path", {
      d: "M " + child.x + " " + branchY + " V " + (child.y - (child.size || 86) / 2 - 2),
      class: "family-line child " + childType
    }));
  });
}

function singleChildFamilyPath(parents, startX, startY, child) {
  var sourceX = startX;
  var sourceY = startY;
  var sourcePadding = 0;
  if (parents.length === 1) {
    sourceX = parents[0].x;
    sourceY = parents[0].y;
    sourcePadding = (parents[0].size || 86) / 2 + 2;
  }
  var dx = child.x - sourceX;
  var dy = child.y - sourceY;
  if (Math.abs(dy) >= 110) {
    var verticalDirection = dy >= 0 ? 1 : -1;
    var sourceEdgeY = sourceY + verticalDirection * sourcePadding;
    var childEdgeY = child.y - verticalDirection * ((child.size || 86) / 2 + 2);
    var middleY = (sourceEdgeY + childEdgeY) / 2;
    return "M " + sourceX + " " + sourceEdgeY +
      " V " + middleY + " H " + child.x + " V " + childEdgeY;
  }
  var horizontalDirection = dx >= 0 ? 1 : -1;
  var sourceEdgeX = sourceX + horizontalDirection * sourcePadding;
  var childEdgeX = child.x - horizontalDirection * ((child.size || 86) / 2 + 2);
  var middleX = (sourceEdgeX + childEdgeX) / 2;
  return "M " + sourceEdgeX + " " + sourceY +
    " H " + middleX + " V " + child.y + " H " + childEdgeX;
}

function appendCoupleStatusMarks(x, y, status) {
  var markCount = status === "divorced" ? 2 : (status === "separated" || status === "widowed" ? 1 : 0);
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
  var personSize = person.size || 86;
  var halfSize = personSize / 2;
  var group = makeSvg("g", {
    class: "person-node " + (person.role === "client" ? "client " : "") +
      (person.role === "pet" ? "pet-node " : "") +
      (person.id === state.selectedId ? "selected " : "") +
      (householdDraft && householdDraft.memberIds.indexOf(person.id) !== -1 ? "household-pick" : ""),
    transform: "translate(" + person.x + " " + person.y + ")"
  });
  group.dataset.personId = person.id;
  group.appendChild(makeSvg("circle", { class: "select-ring", r: halfSize + 10 }));
  if (person.role === "pet") {
    appendPetShape(group, person.petType, personSize);
  } else {
    appendClientRing(group, person.gender, personSize);
    appendPersonShape(group, person.gender, personSize);
  }
  addPersonLabel(group, person);
  if (person.role !== "pet" && (person.deceased || person.deathYearUnknown)) {
    var mark = halfSize * .79;
    group.appendChild(makeSvg("line", { class: "death-mark", x1: -mark, y1: -mark, x2: mark, y2: mark }));
    group.appendChild(makeSvg("line", { class: "death-mark", x1: mark, y1: -mark, x2: -mark, y2: mark }));
  }
  addPersonResizeHandles(group, personSize);
  group.addEventListener("pointerdown", startPersonDrag);
  group.addEventListener("click", function(event) {
    event.stopPropagation();
    if (householdDraft) return;
    if (event.detail > 1) return;
    selectDiagramItem(person.id, null, group);
  });
  return group;
}

function appendPetShape(group, type, size) {
  var half = size / 2;
  group.appendChild(makeSvg("rect", {
    class: "person-shape pet-shape",
    x: -half,
    y: -half,
    width: size,
    height: size,
    rx: Math.max(10, size * .22)
  }));
  var icon = makeSvg("text", {
    class: "pet-icon",
    y: 8 * (size / 86),
    style: "font-size:" + clamp(24 * (size / 86), 16, 34) + "px"
  });
  icon.textContent = type === "dog" ? "🐶" : (type === "cat" ? "🐱" : "🐾");
  group.appendChild(icon);
}

function appendPersonShape(group, gender, size) {
  var half = size / 2;
  if (gender === "female") {
    group.appendChild(makeSvg("circle", { class: "person-shape", r: half }));
  } else if (gender === "other") {
    group.appendChild(makeSvg("polygon", {
      class: "person-shape",
      points: "0," + (-half) + " " + half + ",0 0," + half + " " + (-half) + ",0"
    }));
  } else {
    group.appendChild(makeSvg("rect", {
      class: "person-shape",
      x: -half,
      y: -half,
      width: size,
      height: size,
      rx: 2
    }));
  }
}

function appendClientRing(group, gender, size) {
  var half = size / 2 + 5;
  if (gender === "female") {
    group.appendChild(makeSvg("circle", { class: "client-ring", r: half }));
  } else if (gender === "other") {
    group.appendChild(makeSvg("polygon", {
      class: "client-ring",
      points: "0," + (-half) + " " + half + ",0 0," + half + " " + (-half) + ",0"
    }));
  } else {
    group.appendChild(makeSvg("rect", {
      class: "client-ring",
      x: -half,
      y: -half,
      width: half * 2,
      height: half * 2,
      rx: 3
    }));
  }
}

function addPersonLabel(group, person) {
  var scale = (person.size || 86) / 86;
  var dates = personDateLabel(person);
  var name = makeSvg("text", {
    class: "node-name",
    y: person.role === "pet" ? -24 * scale : (dates ? -2 * scale : 5 * scale),
    style: "font-size:" + clamp(14 * scale, 9, 22) + "px"
  });
  name.textContent = shortText(person.name, 8);
  group.appendChild(name);
  if (person.role === "pet") {
    var typeLabel = makeSvg("text", {
      class: "node-pet-type",
      y: 28 * scale,
      style: "font-size:" + clamp(9 * scale, 7, 14) + "px"
    });
    typeLabel.textContent = petTypes[person.petType];
    group.appendChild(typeLabel);
    return;
  }
  if (dates) {
    var year = makeSvg("text", { class: "node-year", y: 21 * scale, style: "font-size:" + clamp(10 * scale, 7, 16) + "px" });
    year.textContent = "(" + dates + ")";
    group.appendChild(year);
  }
  var flags = [];
  if (person.genderUnknown) flags.push("성별 미상");
  if (person.birthOrderUnknown) flags.push("순서 미상");
  if (flags.length) {
    var flag = makeSvg("text", { class: "node-flag", y: (dates ? 35 : 22) * scale, style: "font-size:" + clamp(9 * scale, 6, 13) + "px" });
    flag.textContent = flags.join(" · ");
    group.appendChild(flag);
  }
  var supportItems = personSupportItems(person);
  if (supportItems.length) {
    var supportSize = clamp(9 * scale * Math.min(1, 4 / supportItems.length), 5.5, 10);
    var supportChars = Math.max(8, Math.floor((person.size - 8) / (supportSize * .72)));
    var supportLines = [];
    supportItems.forEach(function(item) {
      splitLabel(item, supportChars).forEach(function(line) { supportLines.push(line); });
    });
    var support = makeSvg("text", {
      class: "node-support",
      y: (person.size / 2 + 16 * scale),
      style: "font-size:" + supportSize + "px"
    });
    var supportLineHeight = supportSize * 1.25;
    supportLines.forEach(function(line, index) {
      var tspan = makeSvg("tspan", { x: 0, dy: index === 0 ? 0 : supportLineHeight });
      tspan.textContent = line;
      support.appendChild(tspan);
    });
    group.appendChild(support);
  }
}

function addPersonResizeHandles(group, size) {
  var half = size / 2;
  ["nw", "ne", "sw", "se"].forEach(function(corner) {
    var x = corner.indexOf("w") !== -1 ? -half - 6 : half - 6;
    var y = corner.indexOf("n") !== -1 ? -half - 6 : half - 6;
    var handle = makeSvg("rect", {
      class: "resize-handle person-resize-handle handle-" + corner,
      x: x,
      y: y,
      width: 12,
      height: 12,
      rx: 2
    });
    handle.dataset.corner = corner;
    handle.addEventListener("pointerdown", startPersonResize);
    group.appendChild(handle);
  });
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
    class: "resize-handle resource-resize-handle handle-se",
    x: resource.width / 2 - 9,
    y: resource.height / 2 - 9,
    width: 14,
    height: 14,
    rx: 2
  });
  var title = makeSvg("title", {});
  title.textContent = "끌어서 자원 크기 조절";
  handle.appendChild(title);
  handle.dataset.corner = "se";
  handle.addEventListener("pointerdown", startResourceResize);
  group.appendChild(handle);
  addResourceResizeHandles(group, resource);
  group.addEventListener("pointerdown", startResourceDrag);
  group.addEventListener("click", function(event) {
    event.stopPropagation();
    if (event.detail > 1) return;
    selectDiagramItem(owner.id, resource.id, group);
  });
  return group;
}

function addResourceResizeHandles(group, resource) {
  ["nw", "ne", "sw"].forEach(function(corner) {
    var handle = makeSvg("rect", {
      class: "resize-handle resource-resize-handle handle-" + corner,
      x: corner.indexOf("w") !== -1 ? -resource.width / 2 - 6 : resource.width / 2 - 6,
      y: corner.indexOf("n") !== -1 ? -resource.height / 2 - 6 : resource.height / 2 - 6,
      width: 12,
      height: 12,
      rx: 2
    });
    handle.dataset.corner = corner;
    handle.addEventListener("pointerdown", startResourceResize);
    group.appendChild(handle);
  });
}

function addResourceLabel(group, resource) {
  var scale = clamp(Math.min(resource.width / 150, resource.height / 72), .72, 1.9);
  var nameSize = clamp(13 * scale, 9, 18);
  var metaSize = clamp(9 * scale, 5.5, 11);
  var nameChars = Math.max(6, Math.floor((resource.width - 22) / (nameSize * .82)));
  var lines = splitLabel(resource.name, nameChars).slice(0, 2);
  var nameLineHeight = nameSize * 1.15;
  var topPadding = clamp(resource.height * .18, 20, 30);
  var nameTop = -resource.height / 2 + topPadding;
  var name = makeSvg("text", {
    class: "resource-name",
    y: nameTop,
    style: "font-size:" + nameSize + "px"
  });
  lines.forEach(function(line, index) {
    var tspan = makeSvg("tspan", { x: 0, dy: index === 0 ? 0 : nameLineHeight });
    tspan.textContent = line;
    name.appendChild(tspan);
  });
  group.appendChild(name);
  var supports = resource.supports || splitSupports(resource.memo);
  var supportChars = Math.max(8, Math.floor((resource.width - 22) / (metaSize * .78)));
  var supportLines = [];
  (supports.length ? supports : ["지원 내용 미입력"]).forEach(function(item) {
    splitLabel(item, supportChars).forEach(function(line) {
      supportLines.push(line);
    });
  });
  var lineHeight = metaSize * 1.25;
  var metaTop = nameTop + lines.length * nameLineHeight + 8;
  var metaBottom = resource.height / 2 - 9;
  var availableLines = Math.max(1, Math.floor((metaBottom - metaTop) / lineHeight));
  if (supportLines.length > availableLines && metaSize > 5.5) {
    metaSize = Math.max(5.5, metaSize * availableLines / supportLines.length);
    supportChars = Math.max(8, Math.floor((resource.width - 22) / (metaSize * .78)));
    supportLines = [];
    (supports.length ? supports : ["지원 내용 미입력"]).forEach(function(item) {
      splitLabel(item, supportChars).forEach(function(line) {
        supportLines.push(line);
      });
    });
    lineHeight = metaSize * 1.25;
    availableLines = Math.max(1, Math.floor((metaBottom - metaTop) / lineHeight));
  }
  var meta = makeSvg("text", {
    class: "resource-meta",
    y: metaTop + metaSize,
    style: "font-size:" + metaSize + "px"
  });
  supportLines.forEach(function(line, index) {
    var tspan = makeSvg("tspan", { x: 0, dy: index === 0 ? 0 : lineHeight });
    tspan.textContent = line;
    meta.appendChild(tspan);
  });
  group.appendChild(meta);
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
    openSidebarPanel("editPanel");
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
    moved: false,
    undoSnapshot: createUndoSnapshot()
  };
  state.selectedId = person.id;
  state.selectedResourceId = null;
  openSidebarPanel("editPanel");
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
    openSidebarPanel("editPanel");
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
    moved: false,
    undoSnapshot: createUndoSnapshot()
  };
  state.selectedId = owner.id;
  state.selectedResourceId = resource.id;
  openSidebarPanel("editPanel");
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
    right: resource.x + resource.width / 2,
    bottom: resource.y + resource.height / 2,
    corner: event.currentTarget.dataset.corner || "se",
    moved: false,
    undoSnapshot: createUndoSnapshot()
  };
  state.selectedId = owner.id;
  state.selectedResourceId = resource.id;
  openSidebarPanel("editPanel");
  svg.setPointerCapture(event.pointerId);
}

function startPersonResize(event) {
  event.preventDefault();
  event.stopPropagation();
  var group = event.currentTarget.parentNode;
  var person = personById(group.dataset.personId);
  var half = (person.size || 86) / 2;
  dragging = {
    kind: "person-resize",
    personId: person.id,
    left: person.x - half,
    top: person.y - half,
    right: person.x + half,
    bottom: person.y + half,
    corner: event.currentTarget.dataset.corner || "se",
    moved: false,
    undoSnapshot: createUndoSnapshot()
  };
  state.selectedId = person.id;
  state.selectedResourceId = null;
  openSidebarPanel("editPanel");
  svg.setPointerCapture(event.pointerId);
}

svg.addEventListener("pointermove", function(event) {
  if (!dragging) return;
  dragging.moved = true;
  var point = svgPoint(event);
  if (dragging.kind === "person") movePerson(point);
  else if (dragging.kind === "resource") moveResource(point);
  else if (dragging.kind === "resource-resize") resizeResource(point);
  else resizePerson(point);
  renderMap();
});

svg.addEventListener("pointerup", finishDrag);
svg.addEventListener("pointercancel", finishDrag);

function movePerson(point) {
  var person = personById(dragging.personId);
  var nextX = clamp(point.x - dragging.dx, 70, 1030);
  var nextY = clamp(point.y - dragging.dy, 70, 710);
  var linkedPeople = linkedFamilyMovePeople(person);
  var requestedX = nextX - dragging.lastX;
  var requestedY = nextY - dragging.lastY;
  var minMoveX = Math.max.apply(null, linkedPeople.map(function(item) { return 70 - item.x; }));
  var maxMoveX = Math.min.apply(null, linkedPeople.map(function(item) { return 1030 - item.x; }));
  var minMoveY = Math.max.apply(null, linkedPeople.map(function(item) { return 70 - item.y; }));
  var maxMoveY = Math.min.apply(null, linkedPeople.map(function(item) { return 710 - item.y; }));
  var moveX = clamp(requestedX, minMoveX, maxMoveX);
  var moveY = clamp(requestedY, minMoveY, maxMoveY);
  linkedPeople.forEach(function(item) {
    item.x += moveX;
    item.y += moveY;
    item.resources.forEach(function(resource) {
      resource.x = clamp(resource.x + moveX, 60, 1040);
      resource.y = clamp(resource.y + moveY, 50, 710);
    });
  });
  dragging.lastX += moveX;
  dragging.lastY += moveY;
}

function linkedFamilyMovePeople(person) {
  var familyGroup = null;
  if (person.role === "grandchild") {
    familyGroup = childGroupForPerson(person.id);
  } else if (person.role === "child") {
    familyGroup = state.familyGroups.find(function(group) {
      return group.parents.indexOf(person.id) !== -1 &&
        group.children.some(function(childId) {
          var child = personById(childId);
          return child && child.role === "grandchild";
        });
    });
  }
  if (!familyGroup) return [person];
  var linkedIds = familyGroup.parents.concat(familyGroup.children);
  return state.people.filter(function(item) {
    return linkedIds.indexOf(item.id) !== -1;
  });
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
  var bounds = resizeRectFromCorner(dragging, point, 110, 300, 56, 260);
  resource.width = bounds.right - bounds.left;
  resource.height = bounds.bottom - bounds.top;
  resource.x = (bounds.left + bounds.right) / 2;
  resource.y = (bounds.top + bounds.bottom) / 2;
}

function resizePerson(point) {
  var person = personById(dragging.personId);
  var bounds = resizeSquareFromCorner(dragging, point, 56, 180);
  person.size = bounds.size;
  person.x = (bounds.left + bounds.right) / 2;
  person.y = (bounds.top + bounds.bottom) / 2;
}

function resizeRectFromCorner(start, point, minWidth, maxWidth, minHeight, maxHeight) {
  var left = start.left;
  var top = start.top;
  var right = start.right;
  var bottom = start.bottom;
  if (start.corner.indexOf("w") !== -1) left = clamp(point.x, right - maxWidth, right - minWidth);
  else right = clamp(point.x, left + minWidth, left + maxWidth);
  if (start.corner.indexOf("n") !== -1) top = clamp(point.y, bottom - maxHeight, bottom - minHeight);
  else bottom = clamp(point.y, top + minHeight, top + maxHeight);
  return { left: left, top: top, right: right, bottom: bottom };
}

function resizeSquareFromCorner(start, point, minSize, maxSize) {
  var anchorX = start.corner.indexOf("w") !== -1 ? start.right : start.left;
  var anchorY = start.corner.indexOf("n") !== -1 ? start.bottom : start.top;
  var size = Math.max(Math.abs(point.x - anchorX), Math.abs(point.y - anchorY));
  size = clamp(size, minSize, maxSize);
  var left = start.corner.indexOf("w") !== -1 ? anchorX - size : anchorX;
  var top = start.corner.indexOf("n") !== -1 ? anchorY - size : anchorY;
  return { left: left, top: top, right: left + size, bottom: top + size, size: size };
}

function finishDrag() {
  if (!dragging) return;
  if (dragging.moved) {
    lastNodePress = { key: "", at: 0 };
    rememberUndo(dragging.undoSnapshot);
  }
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
  openSidebarPanel("reviewPanel");
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
  if (!householdDraft || householdDraft.memberIds.length < 1) {
    showToast("동거가족을 한 명 이상 선택해주세요.");
    return;
  }
  rememberUndo();
  var existing = state.households.find(function(household) {
    return household.id === householdDraft.id;
  });
  if (existing) {
    existing.memberIds = householdDraft.memberIds.slice();
    if (existing.memberIds.length === 1) existing.name = "독거가구";
  } else {
    state.households.push({
      id: uid(),
      name: householdDraft.memberIds.length === 1 ? "독거가구" : householdDraft.name,
      memberIds: householdDraft.memberIds.slice()
    });
  }
  householdDraft = null;
  render();
  document.getElementById("statusText").textContent =
    "인물과 자원은 이동할 수 있고, 선택한 요소의 네 꼭짓점에서 크기를 조절할 수 있습니다.";
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
  openSidebarPanel("editPanel");
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

function bulkRole(value) {
  var text = String(value || "").replace(/\s/g, "");
  if (text === "부모" || text === "어머니" || text === "아버지" || text === "엄마" || text === "아빠") return "parent";
  if (text === "배우자" || text === "파트너" || text === "배우자/파트너") return "spouse";
  if (text === "형제" || text === "형제자매" || text === "자매" || text === "남매" || text === "누나" || text === "언니" || text === "오빠" || text === "형" || text === "동생") return "sibling";
  if (text === "자녀" || text === "아들" || text === "딸" || text === "아이") return "child";
  if (text === "손자" || text === "손녀" || text === "손자녀") return "grandchild";
  if (text === "반려동물" || text === "강아지" || text === "고양이") return "pet";
  if (text === "기타가족" || text === "가족") return "family";
  return null;
}

function bulkGender(value) {
  var text = String(value || "").replace(/\s/g, "").toLowerCase();
  if (text === "남" || text === "남성" || text === "남자" || text === "male") {
    return { gender: "male", genderUnknown: false };
  }
  if (text === "여" || text === "여성" || text === "여자" || text === "female") {
    return { gender: "female", genderUnknown: false };
  }
  return { gender: "other", genderUnknown: true };
}

function bulkPetType(value, roleName) {
  var text = String(value || "") + " " + String(roleName || "");
  if (text.indexOf("강아지") !== -1 || text.toLowerCase().indexOf("dog") !== -1) return "dog";
  if (text.indexOf("고양이") !== -1 || text.toLowerCase().indexOf("cat") !== -1) return "cat";
  return "other";
}

function parseBulkPeople(value) {
  var records = [];
  var errors = [];
  String(value || "").split(/\r?\n/).forEach(function(rawLine, index) {
    var line = rawLine.trim();
    if (!line || line.indexOf("#") === 0) return;
    var parts = line.indexOf("|") !== -1
      ? line.split("|")
      : (line.indexOf("\t") !== -1 ? line.split("\t") : line.split(","));
    parts = parts.map(function(part) { return part.trim(); });
    var role = bulkRole(parts[0]);
    var name = parts[1] || "";
    if (!role || !name) {
      errors.push((index + 1) + "번째 줄: 관계와 이름을 확인해주세요.");
      return;
    }
    var genderInfo = bulkGender(parts[2]);
    var isPet = role === "pet";
    var deathValue = isPet ? "" : (parts[4] || "");
    var deathYearUnknown = /미상|미확인|확인안됨/.test(deathValue);
    var birthOrderUnknown = /순서.*미상|출생순서.*미상/.test(parts[5] || "");
    records.push({
      role: role,
      name: name,
      gender: isPet ? "other" : genderInfo.gender,
      genderUnknown: isPet ? false : genderInfo.genderUnknown,
      birthYear: isPet ? (parts[3] || "") : (parts[3] || ""),
      deathYear: deathYearUnknown ? "" : deathValue,
      deceased: !isPet && (Boolean(deathValue) || deathYearUnknown),
      deathYearUnknown: !isPet && deathYearUnknown,
      birthOrderUnknown: !isPet && birthOrderUnknown,
      petType: isPet ? bulkPetType(parts[2], parts[0] + " " + name) : "other"
    });
  });
  return { records: records, errors: errors };
}

function openBulkInput() {
  var overlay = document.getElementById("bulkInputOverlay");
  var input = document.getElementById("bulkPeopleInput");
  overlay.hidden = false;
  document.getElementById("bulkInputStatus").textContent = "";
  input.focus();
}

function closeBulkInput() {
  document.getElementById("bulkInputOverlay").hidden = true;
}

function applyBulkPeople() {
  var parsed = parseBulkPeople(document.getElementById("bulkPeopleInput").value);
  var status = document.getElementById("bulkInputStatus");
  if (!parsed.records.length) {
    status.textContent = parsed.errors[0] || "추가할 구성원을 입력해주세요.";
    return;
  }
  rememberUndo();
  var added = [];
  parsed.records.forEach(function(record) {
    var person = {
      id: uid(),
      name: record.name,
      gender: record.gender,
      role: record.role,
      generation: roles[record.role].generation,
      birthYear: record.birthYear,
      deathYear: record.deathYear,
      deceased: record.deceased,
      deathYearUnknown: record.deathYearUnknown,
      genderUnknown: record.genderUnknown,
      birthOrderUnknown: record.birthOrderUnknown,
      coupleStatus: "married",
      childType: "biological",
      parentId: null,
      petType: record.petType,
      petOwnerId: record.role === "pet" ? clientPerson().id : null,
      x: 550,
      y: 400,
      resources: [],
      supportMemo: "",
      supports: []
    };
    state.people.push(person);
    attachByRole(person, record.role);
    added.push(person);
  });
  state.selectedId = added[0].id;
  state.selectedResourceId = null;
  openSidebarPanel("familyPanel");
  closeBulkInput();
  document.getElementById("bulkPeopleInput").value = "";
  layoutFamilyTree();
  var message = added.length + "명을 추가했습니다.";
  if (parsed.errors.length) message += " " + parsed.errors.length + "개 줄은 건너뛰었습니다.";
  showToast(message);
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
  var parentId = role === "grandchild" ? document.getElementById("newParentPerson").value : null;
  var petOwnerId = role === "pet"
    ? document.getElementById("newPetOwner").value
    : null;
  if (role === "grandchild" && !parentId) {
    showToast("손자녀를 연결할 자녀를 먼저 추가해주세요.");
    return;
  }
  rememberUndo();
  var person = {
    id: uid(),
    name: name,
    gender: role === "pet" ? "other" : (document.getElementById("newGenderUnknown").checked ? "other" : document.getElementById("newGender").value),
    role: role,
    generation: roles[role].generation,
    birthYear: document.getElementById("newBirthYear").value.trim(),
    deathYear: role === "pet" ? "" : document.getElementById("newDeathYear").value.trim(),
    deceased: role === "pet" ? false : (document.getElementById("newDeceased").checked || document.getElementById("newDeathYearUnknown").checked),
    deathYearUnknown: role === "pet" ? false : document.getElementById("newDeathYearUnknown").checked,
    genderUnknown: role === "pet" ? false : document.getElementById("newGenderUnknown").checked,
    birthOrderUnknown: document.getElementById("newBirthOrderUnknown").checked,
    coupleStatus: document.getElementById("newCoupleStatus").value,
    childType: document.getElementById("newChildType").value,
    parentId: parentId,
    petType: role === "pet" ? document.getElementById("newPetType").value : "other",
    petOwnerId: petOwnerId,
    x: 550,
    y: 400,
    resources: [],
    supportMemo: "",
    supports: []
  };
  state.people.push(person);
  attachByRole(person, role);
  if (role !== "pet") {
    upsertSocialLink(
      clientPerson().id,
      person.id,
      document.getElementById("newOutgoingRelationship").value,
      document.getElementById("newIncomingRelationship").value
    );
  }
  state.selectedId = person.id;
  state.selectedResourceId = null;
  openSidebarPanel("familyPanel");
  input.value = "";
  document.getElementById("newBirthYear").value = "";
  document.getElementById("newDeathYear").value = "";
  document.getElementById("newDeceased").checked = false;
  document.getElementById("newDeathYearUnknown").checked = false;
  document.getElementById("newGenderUnknown").checked = false;
  document.getElementById("newBirthOrderUnknown").checked = false;
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
  } else if (role === "grandchild") {
    var grandchildParent = personById(person.parentId) || eligibleGrandchildParents()[0];
    if (!grandchildParent) return;
    person.parentId = grandchildParent.id;
    group = state.familyGroups.find(function(item) {
      return item.parents.indexOf(grandchildParent.id) !== -1;
    });
    if (!group) {
      group = {
        id: uid(),
        parents: [grandchildParent.id],
        children: [],
        status: "married",
        childTypes: {}
      };
      state.familyGroups.push(group);
    }
    if (group.children.indexOf(person.id) === -1) {
      group.children.push(person.id);
      group.childTypes[person.id] = person.childType;
    }
  }
}

function changePersonRole(person, nextRole) {
  if (person.role === "client") return;
  if (nextRole === "grandchild") {
    var possibleParents = eligibleGrandchildParents().filter(function(parent) {
      return parent.id !== person.id;
    });
    if (!possibleParents.length) {
      showToast("손자녀를 연결할 다른 자녀가 필요합니다.");
      render();
      return;
    }
    if (!possibleParents.some(function(parent) { return parent.id === person.parentId; })) {
      person.parentId = possibleParents[0].id;
    }
  }
  if (nextRole === "pet") {
    state.links = state.links.filter(function(link) {
      return link.from !== person.id && link.to !== person.id;
    });
    person.petOwnerId = person.petOwnerId || clientPerson().id;
    setPersonSupport(person, "");
  } else if (person.role === "pet") {
    person.petOwnerId = null;
  }
  removeFromFamilies(person.id);
  person.role = nextRole;
  person.generation = roles[nextRole].generation;
  if (nextRole !== "grandchild") person.parentId = null;
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
  var supportMemo = document.getElementById("resourceMemo").value.trim();
  var familyTarget = familyPersonByName(name, selectedPerson().id);
  if (familyTarget && splitSupports(supportMemo).length) {
    rememberUndo();
    addPersonSupport(familyTarget, supportMemo);
    state.selectedId = familyTarget.id;
    state.selectedResourceId = null;
    input.value = "";
    document.getElementById("resourceMemo").value = "";
    openSidebarPanel("editPanel");
    render();
    showToast(familyTarget.name + "의 지원 내용을 가족 항목에 표시했습니다.");
    return;
  }
  rememberUndo();
  var person = selectedPerson();
  var position = defaultResourcePosition(person, person.resources.length);
  var resource = {
    id: uid(),
    type: document.getElementById("resourceType").value,
    name: name,
    memo: supportMemo,
    supports: splitSupports(document.getElementById("resourceMemo").value),
    relationship: document.getElementById("resourceRelationship").value,
    direction: document.getElementById("resourceDirection").value,
    x: position.x,
    y: position.y,
    width: 150,
    height: 72
  };
  fitResourceHeight(resource);
  person.resources.push(resource);
  state.selectedResourceId = resource.id;
  openSidebarPanel("editPanel");
  input.value = "";
  document.getElementById("resourceMemo").value = "";
  render();
}

function upsertSocialLink(from, to, outType, inType) {
  var fromPerson = personById(from);
  var toPerson = personById(to);
  if ((fromPerson && fromPerson.role === "pet") || (toPerson && toPerson.role === "pet")) return;
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
    var quickGrandchildParents = person.role === "grandchild"
      ? eligibleGrandchildParents().filter(function(parent) { return parent.id !== person.id; })
      : [];
    quickEditor.innerHTML =
      '<h3>인물 바로 수정</h3>' +
      '<div class="field"><label for="quickName">이름</label><input id="quickName" value="' + attr(person.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="quickGender">가계도 기호</label><select id="quickGender"></select></div>' +
      '<div class="field"><label for="quickRole">역할</label><select id="quickRole"></select></div></div>' +
      (person.role === "pet" ?
        '<div class="row"><div class="field"><label for="quickPetType">반려동물 종류</label>' +
        '<select id="quickPetType"></select></div><div class="field"><label for="quickPetOwner">함께 사는 가족</label>' +
        '<select id="quickPetOwner"></select></div></div>' : "") +
      (person.role === "pet" ? "" :
        '<div class="field"><label for="quickSupportMemo">가족 지원 내용 (여러 개 가능)</label>' +
        '<textarea id="quickSupportMemo" rows="3" placeholder="차량 이동 도움 / 물품 구매 도움 / 실질적 지원">' +
        attr(person.supportMemo || personSupportItems(person).join("\n")) + '</textarea>' +
        '<p class="field-help">가계도 인물 아래에 지원 내용이 표시됩니다.</p></div>') +
      '<div class="row compact-row"><div class="field"><label for="quickBirthYear">출생연도</label>' +
      '<input id="quickBirthYear" value="' + attr(person.birthYear) + '"></div>' +
      '<div class="field"><label for="quickDeathYear">사망연도</label>' +
      '<input id="quickDeathYear" value="' + attr(person.deathYear) + '"></div></div>' +
      '<label class="check-field"><input id="quickDeceased" type="checkbox"' +
      (person.deceased ? " checked" : "") + '><span>사망 표시</span></label>' +
      '<label class="check-field"><input id="quickDeathYearUnknown" type="checkbox"' +
      (person.deathYearUnknown ? " checked" : "") + '><span>사망연도 미상</span></label>' +
      '<div class="row compact-row"><label class="check-field"><input id="quickGenderUnknown" type="checkbox"' +
      (person.genderUnknown ? " checked" : "") + '><span>성별 미상</span></label>' +
      ((person.role === "child" || person.role === "grandchild") ?
        '<label class="check-field"><input id="quickBirthOrderUnknown" type="checkbox"' +
        (person.birthOrderUnknown ? " checked" : "") + '><span>자녀 출생순서 미상</span></label></div>' : "</div>") +
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
      (person.role === "grandchild" ?
        '<div class="field"><label for="quickParentPerson">손자녀의 부모</label>' +
        '<select id="quickParentPerson"></select></div>' : "") +
      '<div class="editor-actions"><button class="btn" id="quickCancel" type="button">취소</button>' +
      '<button class="btn primary" id="quickSave" type="button">적용</button></div>';
    fillSelect(document.getElementById("quickGender"), genders, person.gender);
    fillSelect(document.getElementById("quickRole"), roles, person.role);
    document.getElementById("quickRole").disabled = person.role === "client";
    if (person.role === "pet") {
      fillSelect(document.getElementById("quickPetType"), petTypes, person.petType);
      fillPersonSelect(document.getElementById("quickPetOwner"), eligiblePetOwners(), person.petOwnerId);
    }
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
    if (person.role === "grandchild") {
      fillPersonSelect(document.getElementById("quickParentPerson"), quickGrandchildParents, person.parentId);
    }
    document.getElementById("quickSave").addEventListener("click", function() {
      rememberUndo();
      var nextRole = document.getElementById("quickRole").value;
      var previousParentId = person.parentId;
      var nextParentId = person.role === "grandchild"
        ? document.getElementById("quickParentPerson").value
        : person.parentId;
      person.name = document.getElementById("quickName").value.trim() || "이름 없음";
      person.gender = nextRole === "pet" ? "other" : document.getElementById("quickGender").value;
      person.birthYear = document.getElementById("quickBirthYear").value.trim();
      person.deathYear = document.getElementById("quickDeathYear").value.trim();
      person.deceased = document.getElementById("quickDeceased").checked || document.getElementById("quickDeathYearUnknown").checked;
      person.deathYearUnknown = document.getElementById("quickDeathYearUnknown").checked;
      person.genderUnknown = document.getElementById("quickGenderUnknown").checked;
      person.birthOrderUnknown = document.getElementById("quickBirthOrderUnknown")
        ? document.getElementById("quickBirthOrderUnknown").checked : false;
      var quickSupportMemo = document.getElementById("quickSupportMemo");
      setPersonSupport(person, nextRole === "pet" || !quickSupportMemo ? "" : quickSupportMemo.value);
      if (person.role === "pet") {
        person.petType = document.getElementById("quickPetType").value;
        person.petOwnerId = document.getElementById("quickPetOwner").value;
      }
      if (quickCoupleGroup) {
        quickCoupleGroup.status = document.getElementById("quickCoupleStatus").value;
        person.coupleStatus = quickCoupleGroup.status;
      }
      if (quickChildGroup) {
        quickChildGroup.childTypes[person.id] = document.getElementById("quickChildType").value;
        person.childType = quickChildGroup.childTypes[person.id];
      }
      if (person.role !== "client" && person.role !== "pet" && nextRole !== "pet") {
        upsertSocialLink(
          clientPerson().id,
          person.id,
          document.getElementById("quickOutgoingRelationship").value,
          document.getElementById("quickIncomingRelationship").value
        );
      }
      closeQuickEditor();
      if (person.role !== "client" && person.role !== nextRole) {
        person.parentId = nextParentId;
        changePersonRole(person, nextRole);
      } else if (person.role === "grandchild" && nextParentId && nextParentId !== previousParentId) {
        removeFromFamilies(person.id);
        person.parentId = nextParentId;
        attachByRole(person, "grandchild");
        layoutFamilyTree();
      } else {
        render();
      }
    });
  } else {
    var owner = personById(ownerId);
    var resource = resourceById(owner, itemId);
    if (!resource) return closeQuickEditor();
    quickEditor.innerHTML =
      '<h3>자원 바로 수정</h3>' +
      '<div class="field"><label for="quickName">기관명 또는 자원 이름</label>' +
      '<input id="quickName" value="' + attr(resource.name) + '"></div>' +
      '<div class="field"><label for="quickMemo">지원 내용 (여러 개 가능)</label>' +
      '<textarea id="quickMemo" rows="3" placeholder="예: 차량 이동 도움\n물품 구매 도움\n실질적 지원">' +
      attr((resource.supports || []).join("\n") || resource.memo) + '</textarea></div>' +
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
      rememberUndo();
      var nextResourceName = document.getElementById("quickName").value.trim() || "이름 없는 자원";
      var nextResourceMemo = document.getElementById("quickMemo").value.trim();
      var nextFamilyTarget = familyPersonByName(nextResourceName, owner.id);
      if (nextFamilyTarget && splitSupports(nextResourceMemo).length) {
        addPersonSupport(nextFamilyTarget, nextResourceMemo);
        owner.resources = owner.resources.filter(function(item) { return item.id !== resource.id; });
        state.selectedId = nextFamilyTarget.id;
        state.selectedResourceId = null;
        closeQuickEditor();
        render();
        showToast(nextFamilyTarget.name + "의 지원 내용을 가족 항목에 표시했습니다.");
        return;
      }
      resource.name = nextResourceName;
      resource.memo = nextResourceMemo;
      resource.supports = splitSupports(resource.memo);
      fitResourceHeight(resource);
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
    var generationY = {
      "-2": 100,
      "-1": 165,
      "0": 385,
      "1": 555,
      "2": 700
    };
    var y = generationY[key] || clamp(385 + generation * 165, 90, 700);
    row.forEach(function(person, index) {
      person.x = row.length === 1
        ? 550
        : minX + (maxX - minX) * index / (row.length - 1);
      person.y = y;
    });
  });
  var grandchildrenByParent = {};
  state.people.forEach(function(person) {
    if (person.role !== "grandchild" || !person.parentId) return;
    if (!grandchildrenByParent[person.parentId]) grandchildrenByParent[person.parentId] = [];
    grandchildrenByParent[person.parentId].push(person);
  });
  Object.keys(grandchildrenByParent).forEach(function(parentId) {
    var parent = personById(parentId);
    if (!parent) return;
    var grandchildren = grandchildrenByParent[parentId].sort(byX);
    var spacing = 135;
    var firstX = parent.x - spacing * (grandchildren.length - 1) / 2;
    var lastX = firstX + spacing * (grandchildren.length - 1);
    var shiftX = firstX < 70 ? 70 - firstX : (lastX > 1030 ? 1030 - lastX : 0);
    grandchildren.forEach(function(grandchild, index) {
      grandchild.x = firstX + index * spacing + shiftX;
      grandchild.y = 700;
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
  rememberUndo();
  state.people = state.people.filter(function(item) { return item.id !== person.id; });
  state.links = state.links.filter(function(link) {
    return link.from !== person.id && link.to !== person.id;
  });
  removeFromFamilies(person.id);
  state.households = state.households.map(function(household) {
    household.memberIds = household.memberIds.filter(function(id) { return id !== person.id; });
    return household;
  }).filter(function(household) {
    return household.memberIds.length >= 1;
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
    return group.parents.length >= 2 || group.children.length > 0;
  });
}

function createExternalState(source) {
  var external = normalizeState(JSON.parse(JSON.stringify(source || state)));
  var people = external.people;
  var personIdMap = {};
  var resourceIdMap = {};
  var roleLabels = {
    parent: "부모",
    spouse: "배우자",
    sibling: "형제자매",
    child: "자녀",
    grandchild: "손자녀",
    family: "가족",
    pet: "반려동물"
  };
  var roleCounts = {};
  people.forEach(function(person, index) {
    personIdMap[person.id] = "person-" + (index + 1);
  });
  people.forEach(function(person) {
    var base = person.role === "client" ? "대상자" : (roleLabels[person.role] || "가족");
    roleCounts[base] = (roleCounts[base] || 0) + 1;
    person.name = base === "대상자" ? base : base + " " + roleCounts[base];
    person.id = personIdMap[person.id];
    person.parentId = personIdMap[person.parentId] || null;
    person.petOwnerId = personIdMap[person.petOwnerId] || null;
    person.birthYear = "";
    person.deathYear = "";
    person.deathYearUnknown = false;
    var supportCount = personSupportItems(person).length;
    person.supports = Array.from({ length: supportCount }, function(_, index) {
      return "지원 내용 " + (index + 1);
    });
    person.supportMemo = person.supports.join("\n");
  });
  var resourceCount = 0;
  people.forEach(function(person) {
    person.resources = (person.resources || []).map(function(resource) {
      var originalId = resource.id;
      var resourceId = "resource-" + (++resourceCount);
      resourceIdMap[originalId] = resourceId;
      var supportCount = Array.isArray(resource.supports) && resource.supports.length
        ? resource.supports.length
        : splitSupports(resource.memo).length;
      resource.id = resourceId;
      resource.name = "자원 " + resourceCount;
      resource.supports = Array.from({ length: supportCount || 1 }, function(_, index) {
        return "지원 내용 " + (index + 1);
      });
      resource.memo = resource.supports.join("\n");
      return resource;
    });
  });
  external.links = external.links.map(function(link, index) {
    return {
      id: "link-" + (index + 1),
      from: personIdMap[link.from],
      to: personIdMap[link.to],
      outType: link.outType,
      inType: link.inType
    };
  }).filter(function(link) {
    return link.from && link.to;
  });
  external.familyGroups = external.familyGroups.map(function(group) {
    var childTypes = {};
    Object.keys(group.childTypes || {}).forEach(function(id) {
      if (personIdMap[id]) childTypes[personIdMap[id]] = group.childTypes[id];
    });
    return {
      id: group.id,
      parents: group.parents.map(function(id) { return personIdMap[id]; }).filter(Boolean),
      children: group.children.map(function(id) { return personIdMap[id]; }).filter(Boolean),
      status: group.status,
      childTypes: childTypes
    };
  });
  external.households = external.households.map(function(household, index) {
    var memberIds = household.memberIds.map(function(id) { return personIdMap[id]; }).filter(Boolean);
    return {
      id: "household-" + (index + 1),
      name: memberIds.length === 1 ? "독거가구" : "동거가족 " + (index + 1),
      memberIds: memberIds
    };
  }).filter(function(household) {
    return household.memberIds.length > 0;
  });
  external.title = "외부 배포용 가계도·생태도";
  external.externalRedacted = true;
  external.driveFileId = "";
  external.reviewConfirmedKey = null;
  external.selectedId = personIdMap[source.selectedId] || (external.people[0] && external.people[0].id) || null;
  external.selectedResourceId = null;
  external.selectedLinkId = null;
  return external;
}

function redactSvgClone(clone, sourceState, externalState) {
  clone.querySelectorAll("image").forEach(function(image) {
    image.remove();
  });
  var sanitizedPeople = {};
  sourceState.people.forEach(function(person, index) {
    sanitizedPeople[person.id] = externalState.people[index];
  });
  clone.querySelectorAll(".person-node").forEach(function(node) {
    var person = sanitizedPeople[node.dataset.personId];
    if (!person) return;
    var name = node.querySelector(".node-name");
    if (name) name.textContent = person.name;
    node.querySelectorAll(".node-year").forEach(function(year) { year.remove(); });
    var support = node.querySelector(".node-support");
    if (support) {
      support.textContent = person.supports.join(" · ");
      if (!person.supports.length) support.remove();
    }
  });
  var sanitizedResources = {};
  sourceState.people.forEach(function(person, personIndex) {
    (person.resources || []).forEach(function(resource, resourceIndex) {
      var sanitizedPerson = externalState.people[personIndex];
      sanitizedResources[person.id + ":" + resource.id] = sanitizedPerson && sanitizedPerson.resources[resourceIndex];
    });
  });
  clone.querySelectorAll(".resource-node").forEach(function(node) {
    var resource = sanitizedResources[node.dataset.ownerId + ":" + node.dataset.resourceId];
    if (!resource) return;
    var name = node.querySelector(".resource-name");
    if (name) name.textContent = resource.name;
    var meta = node.querySelector(".resource-meta");
    if (meta) meta.textContent = resource.supports.join(" · ");
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

function downloadExternalJson() {
  var externalState = createExternalState(state);
  downloadBlob(
    new Blob([JSON.stringify(externalState, null, 2)], { type: "application/json" }),
    safeFilename(externalState.title) + ".json"
  );
  showToast("개인정보를 가린 외부 배포용 JSON을 저장했습니다.");
}

function exportPng(embedState, options) {
  options = options || {};
  var exportState = options.state || state;
  var exportButton = document.getElementById(options.buttonId || "saveButton");
  if (exportInProgress || Date.now() - lastExportFinishedAt < 5000) {
    showToast("PNG 저장이 이미 처리되었습니다.");
    return;
  }
  exportInProgress = true;
  if (exportButton) exportButton.disabled = true;
  var clone = svg.cloneNode(true);
  if (options.redactSvg) redactSvgClone(clone, state, exportState);
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
        var output = embedState ? await embedStateInPng(png, exportState) : png;
        downloadBlob(output, safeFilename(exportState.title || "생태도") + ".png");
        showToast(options.redactSvg ? "개인정보를 가린 외부 배포용 PNG를 저장했습니다." : "편집 데이터를 포함한 PNG를 저장했습니다.");
      } catch (error) {
        showToast("PNG 저장 중 오류가 발생했습니다.");
      } finally {
        exportInProgress = false;
        lastExportFinishedAt = Date.now();
        setTimeout(function() {
          if (exportButton) exportButton.disabled = false;
        }, 2000);
      }
    }, "image/png");
  };
  image.onerror = function() {
    URL.revokeObjectURL(url);
    exportInProgress = false;
    lastExportFinishedAt = Date.now();
    setTimeout(function() {
      if (exportButton) exportButton.disabled = false;
    }, 2000);
    showToast("PNG 저장 중 오류가 발생했습니다.");
  };
  image.src = url;
}

function exportExternalPng() {
  var externalState = createExternalState(state);
  exportPng(true, {
    state: externalState,
    redactSvg: true,
    buttonId: "externalPngButton"
  });
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

function closeDocumentDraft() {
  var overlay = document.getElementById("draftOverlay");
  if (overlay) overlay.hidden = true;
  documentDraft = null;
}

function showDocumentDraftPreview(draft) {
  var people = draft.people || [];
  var resources = people.reduce(function(total, person) {
    return total + (person.resources || []).length;
  }, 0);
  var summary = document.getElementById("draftSummary");
  var warnings = document.getElementById("draftWarnings");
  var preview = document.getElementById("draftPreview");
  var status = document.getElementById("draftStatus");
  var apply = document.getElementById("draftApplyButton");
  status.textContent = "문서에서 추출한 내용을 확인한 뒤 초안을 적용할 수 있습니다.";
  summary.innerHTML =
    '<div class="draft-stat"><strong>' + people.length + '</strong><span>인물</span></div>' +
    '<div class="draft-stat"><strong>' + (draft.familyGroups || []).length + '</strong><span>가족관계</span></div>' +
    '<div class="draft-stat"><strong>' + resources + '</strong><span>자원</span></div>';
  var warningItems = draft.source && draft.source.warnings ? draft.source.warnings : [];
  warnings.innerHTML = warningItems.map(function(item) { return '<div>• ' + escapeHtml(item) + '</div>'; }).join("");
  var peopleRows = people.map(function(person) {
    var detail = [person.genderUnknown ? "성별 미상" : person.gender === "male" ? "남성" : person.gender === "female" ? "여성" : "기타/미상"];
    if (person.birthYear) detail.push(person.birthYear + "년생");
    if (person.birthOrderUnknown) detail.push("출생순서 미상");
    return '<li><strong>' + escapeHtml(person.name) + '</strong> · ' + escapeHtml(detail.join(", ")) + '</li>';
  }).join("");
  var resourceRows = people.reduce(function(all, person) {
    return all.concat((person.resources || []).map(function(resource) {
      return '<li><strong>' + escapeHtml(resource.name) + '</strong> · ' + escapeHtml((resource.supports || []).join(", ")) + '</li>';
    }));
  }, []).join("");
  preview.innerHTML =
    '<div class="preview-section"><h3>인물 초안</h3><ul>' + (peopleRows || '<li>추출된 인물이 없습니다.</li>') + '</ul></div>' +
    '<div class="preview-section"><h3>자원 초안</h3><ul>' + (resourceRows || '<li>추출된 자원이 없습니다.</li>') + '</ul></div>';
  apply.disabled = false;
}

function openDocumentDraft(file) {
  var overlay = document.getElementById("draftOverlay");
  var status = document.getElementById("draftStatus");
  var summary = document.getElementById("draftSummary");
  var warnings = document.getElementById("draftWarnings");
  var preview = document.getElementById("draftPreview");
  var apply = document.getElementById("draftApplyButton");
  overlay.hidden = false;
  status.textContent = file.name + "을(를) 분석하고 있습니다.";
  summary.innerHTML = "";
  warnings.innerHTML = "";
  preview.innerHTML = "";
  apply.disabled = true;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var bytes = new Uint8Array(reader.result);
      if (bytes.length > 12 * 1024 * 1024) throw new Error("파일 크기는 12MB 이하만 지원합니다.");
      var response = await fetch("/api/document-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, data: bytesToBase64(bytes) })
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || "문서 분석에 실패했습니다.");
      documentDraft = result.draft;
      showDocumentDraftPreview(documentDraft);
    } catch (error) {
      status.textContent = error.message || "문서 분석에 실패했습니다.";
      warnings.innerHTML = "<div>문서를 분석하지 못했습니다. 파일 형식과 내용을 확인해 주세요.</div>";
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyDocumentDraft() {
  if (!documentDraft) return;
  rememberUndo();
  state = normalizeState(JSON.parse(JSON.stringify(documentDraft)));
  state.source = documentDraft.source;
  backgroundImageUrl = null;
  householdDraft = null;
  closeQuickEditor();
  closeDocumentDraft();
  layoutFamilyTree();
  render();
  showToast("문서 분석 초안을 적용했습니다. 내용을 확인하고 수정해 주세요.");
}

function loadJson(file) {
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var loadedState = JSON.parse(reader.result);
      rememberUndo();
      state = normalizeState(loadedState);
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
        rememberUndo();
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
      rememberUndo();
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
  rememberUndo();
  state = initialState();
  householdDraft = null;
  backgroundImageUrl = null;
  closeQuickEditor();
  openSidebarPanel("startPanel");
  render();
  showToast("가계도 기본 틀을 새로 만들었습니다.");
}

function startBlankCase() {
  rememberUndo();
  state = blankCaseState();
  householdDraft = null;
  backgroundImageUrl = null;
  closeQuickEditor();
  openSidebarPanel("startPanel");
  render();
  showToast("빈 사례를 시작했습니다. 중심 인물부터 입력해주세요.");
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
  var personEdge = personEdgePoint(person, resource);
  var personX = personEdge.x;
  var personY = personEdge.y;
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

function fitResourceHeight(resource) {
  var supports = resource.supports || splitSupports(resource.memo);
  var itemCount = supports.length || 1;
  var approximateLines = supports.reduce(function(total, item) {
    return total + Math.max(1, Math.ceil(String(item || "").length / 18));
  }, 0) || 1;
  var requiredHeight = 50 + Math.max(itemCount, approximateLines) * 12;
  resource.height = clamp(Math.max(Number(resource.height) || 72, requiredHeight), 56, 260);
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
document.getElementById("selectedSupportMemo").addEventListener("input", function(event) {
  var person = selectedPerson();
  setPersonSupport(person, event.target.value);
  renderPeople();
  renderMap();
  saveLocalState();
});
document.getElementById("selectedGender").addEventListener("change", function(event) {
  rememberUndo();
  selectedPerson().gender = event.target.value;
  render();
});
document.getElementById("selectedRole").addEventListener("change", function(event) {
  rememberUndo();
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
  rememberUndo();
  selectedPerson().deceased = event.target.checked;
  render();
});
document.getElementById("selectedDeathYearUnknown").addEventListener("change", function(event) {
  rememberUndo();
  selectedPerson().deathYearUnknown = event.target.checked;
  if (event.target.checked) selectedPerson().deceased = true;
  render();
});
document.getElementById("selectedGenderUnknown").addEventListener("change", function(event) {
  rememberUndo();
  selectedPerson().genderUnknown = event.target.checked;
  if (event.target.checked) selectedPerson().gender = "other";
  render();
});
document.getElementById("selectedBirthOrderUnknown").addEventListener("change", function(event) {
  rememberUndo();
  selectedPerson().birthOrderUnknown = event.target.checked;
  render();
});
document.getElementById("selectedPetType").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role !== "pet") return;
  rememberUndo();
  person.petType = event.target.value;
  render();
});
document.getElementById("selectedPetOwner").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role !== "pet" || !event.target.value) return;
  rememberUndo();
  person.petOwnerId = event.target.value;
  renderMap();
  saveLocalState();
});
document.getElementById("selectedOutgoingRelationship").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role === "client") return;
  rememberUndo();
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
  rememberUndo();
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
  rememberUndo();
  group.status = event.target.value;
  selectedPerson().coupleStatus = event.target.value;
  render();
});
document.getElementById("selectedChildType").addEventListener("change", function(event) {
  var person = selectedPerson();
  var group = childGroupForPerson(person.id);
  if (!group) return;
  rememberUndo();
  group.childTypes[person.id] = event.target.value;
  person.childType = event.target.value;
  render();
});
document.getElementById("selectedParentPerson").addEventListener("change", function(event) {
  var person = selectedPerson();
  if (person.role !== "grandchild" || !event.target.value) return;
  rememberUndo();
  removeFromFamilies(person.id);
  person.parentId = event.target.value;
  attachByRole(person, "grandchild");
  layoutFamilyTree();
});

["mapTitle", "clientName", "selectedName", "selectedBirthYear", "selectedDeathYear"].forEach(
  function(fieldId) {
    var field = document.getElementById(fieldId);
    var editSnapshot = null;
    field.addEventListener("focus", function() {
      editSnapshot = createUndoSnapshot();
    });
    field.addEventListener("change", function() {
      if (editSnapshot && editSnapshot.stateJson !== JSON.stringify(state)) {
        rememberUndo(editSnapshot);
      }
      editSnapshot = null;
    });
  }
);

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
document.getElementById("blankCaseButton").addEventListener("click", startBlankCase);
document.getElementById("bulkPeopleButton").addEventListener("click", openBulkInput);
document.getElementById("sidebarDocumentDraftButton").addEventListener("click", function() {
  document.getElementById("documentDraftInput").click();
});
document.getElementById("undoButton").addEventListener("click", undoLastAction);
document.getElementById("resetButton").addEventListener("click", clearState);
document.getElementById("saveButton").addEventListener("click", function() {
  exportPng(true);
});
document.getElementById("externalPngButton").addEventListener("click", exportExternalPng);
document.getElementById("externalJsonButton").addEventListener("click", downloadExternalJson);
document.getElementById("loadButton").addEventListener("click", function() {
  document.getElementById("loadInput").click();
});
document.getElementById("loadInput").addEventListener("change", function(event) {
  var file = event.target.files[0];
  if (file) loadSelectedFile(file);
  event.target.value = "";
});
document.getElementById("documentDraftButton").addEventListener("click", function() {
  document.getElementById("documentDraftInput").click();
});
document.getElementById("documentDraftInput").addEventListener("change", function(event) {
  var file = event.target.files[0];
  if (file) openDocumentDraft(file);
  event.target.value = "";
});
document.getElementById("driveConnectButton").addEventListener("click", function() {
  location.href = "/api/google-auth?action=login&returnTo=" + encodeURIComponent(location.pathname);
});
document.getElementById("driveSaveButton").addEventListener("click", saveCurrentToDrive);
document.getElementById("driveRefreshButton").addEventListener("click", function() {
  refreshDriveCases().catch(function(error) { showToast(error.message || "저장 목록을 새로고침하지 못했습니다."); });
});
document.getElementById("driveLogoutButton").addEventListener("click", function() {
  location.href = "/api/google-auth?action=logout&returnTo=" + encodeURIComponent(location.pathname);
});
document.getElementById("driveCaseSearch").addEventListener("input", renderDriveCases);
document.getElementById("acknowledgeReviewButton").addEventListener("click", acknowledgeReview);
document.getElementById("draftApplyButton").addEventListener("click", applyDocumentDraft);
document.getElementById("draftCancelButton").addEventListener("click", closeDocumentDraft);
document.getElementById("draftCloseButton").addEventListener("click", closeDocumentDraft);
document.getElementById("bulkApplyButton").addEventListener("click", applyBulkPeople);
document.getElementById("bulkCancelButton").addEventListener("click", closeBulkInput);
document.getElementById("bulkCloseButton").addEventListener("click", closeBulkInput);
document.getElementById("bulkPeopleInput").addEventListener("input", function() {
  var parsed = parseBulkPeople(this.value);
  document.getElementById("bulkInputStatus").textContent = parsed.errors.length
    ? parsed.errors[0]
    : (parsed.records.length ? parsed.records.length + "명을 추가할 수 있습니다." : "");
});
var caseSaveButton = document.getElementById("caseSaveButton");
if (window.parent !== window) {
  caseSaveButton.hidden = false;
  caseSaveButton.addEventListener("click", function() {
    window.parent.postMessage({
      type: "SARYE_GENOGRAM_SAVE",
      payload: JSON.parse(JSON.stringify(state))
    }, window.location.origin);
    showToast("사례에 저장했습니다.");
  });
  window.addEventListener("message", function(event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data && event.data.type === "SARYE_GENOGRAM_LOAD" && event.data.payload) {
      rememberUndo();
      state = normalizeState(JSON.parse(JSON.stringify(event.data.payload)));
      backgroundImageUrl = null;
      householdDraft = null;
      closeQuickEditor();
      layoutFamilyTree();
      render();
      showToast("대상자 자료로 가계도 초안을 만들었습니다.");
    }
  });
  window.parent.postMessage({ type: "SARYE_GENOGRAM_READY" }, window.location.origin);
}
window.addEventListener("keydown", function(event) {
  var target = event.target;
  var tagName = target && target.tagName;
  var isTyping = tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" ||
    (target && target.isContentEditable);
  if (event.key === "Backspace" && !isTyping) {
    event.preventDefault();
    event.stopPropagation();
    undoLastAction();
    return;
  }
  if (event.key === "Escape") {
    closeQuickEditor();
    if (householdDraft) cancelHouseholdDraft();
  }
}, true);

document.querySelectorAll(".sidebar-panel").forEach(function(panel) {
  panel.addEventListener("toggle", function() {
    if (!panel.open) return;
    document.querySelectorAll(".sidebar-panel").forEach(function(other) {
      if (other !== panel) other.open = false;
    });
  });
});

setDriveConnection(driveConnection);
renderDriveCases();
initializeDriveStorage();
render();
