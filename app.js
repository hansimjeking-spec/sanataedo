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
  strong: "강한 지지",
  normal: "일반 관계",
  weak: "약한 관계",
  stress: "갈등/부담"
};

var svg = document.getElementById("map");
var toast = document.getElementById("toast");
var dragging = null;
var connectMode = false;
var connectStart = null;

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
    version: 3,
    title: "우리 가족 생태도",
    selectedId: "client",
    selectedResourceId: null,
    people: [
      {
        id: fatherId,
        name: "아버지",
        gender: "male",
        role: "parent",
        generation: -1,
        birthYear: "1940",
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
        deceased: false,
        x: 670,
        y: 170,
        resources: [
          {
            id: uid(),
            type: "care",
            name: "제천병원",
            memo: "정기 진료",
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
        deceased: false,
        x: 300,
        y: 420,
        resources: []
      },
      {
        id: "client",
        name: "권경자",
        gender: "female",
        role: "client",
        generation: 0,
        birthYear: "1967",
        deceased: false,
        x: 550,
        y: 420,
        resources: [
          {
            id: uid(),
            type: "care",
            name: "명지병원",
            memo: "진료와 건강관리",
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
        children: [sisterId, "client", brotherId]
      }
    ],
    links: []
  });
}

function normalizeState(next) {
  next = next || {};
  next.version = 3;
  next.title = next.title || "나의 생태도";
  next.people = Array.isArray(next.people) ? next.people : [];
  next.links = Array.isArray(next.links) ? next.links : [];
  next.familyGroups = Array.isArray(next.familyGroups)
    ? next.familyGroups
    : (Array.isArray(next.families) ? next.families : []);

  if (!next.people.length) {
    next.people.push({
      id: "client",
      name: "Client",
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
    person.deceased = Boolean(person.deceased);
    person.x = Number.isFinite(person.x) ? person.x : 550;
    person.y = Number.isFinite(person.y) ? person.y : 400;
    person.resources = Array.isArray(person.resources) ? person.resources : [];

    person.resources.forEach(function(resource, index) {
      resource.id = resource.id || uid();
      resource.type = resourceTypes[resource.type] ? resource.type : "info";
      resource.name = resource.name || "이름 없는 자원";
      resource.memo = resource.memo || "";
      resource.width = clamp(Number(resource.width) || 150, 110, 300);
      resource.height = clamp(Number(resource.height) || 72, 56, 170);
      if (!Number.isFinite(resource.x) || !Number.isFinite(resource.y)) {
        var position = defaultResourcePosition(person, index);
        resource.x = position.x;
        resource.y = position.y;
      }
    });
  });

  next.familyGroups = next.familyGroups.map(function(group) {
    return {
      id: group.id || uid(),
      parents: Array.isArray(group.parents) ? group.parents.filter(personExists) : [],
      children: Array.isArray(group.children) ? group.children.filter(personExists) : []
    };
  }).filter(function(group) {
    return group.parents.length || group.children.length > 1;
  });

  if (!next.familyGroups.length) inferFamilyGroups(next);

  if (!next.people.some(function(person) { return person.id === next.selectedId; })) {
    next.selectedId = clientPerson(next).id;
  }
  if (!findResourceInState(next, next.selectedResourceId)) next.selectedResourceId = null;
  return next;

  function personExists(id) {
    return next.people.some(function(person) { return person.id === id; });
  }
}

function inferFamilyGroups(next) {
  var client = clientPerson(next);
  var parents = next.people.filter(function(person) { return person.role === "parent"; });
  var siblings = next.people.filter(function(person) { return person.role === "sibling"; });
  var spouses = next.people.filter(function(person) { return person.role === "spouse"; });
  var children = next.people.filter(function(person) { return person.role === "child"; });
  if (parents.length || siblings.length) {
    next.familyGroups.push({
      id: uid(),
      parents: parents.slice(0, 2).map(idOf),
      children: [client.id].concat(siblings.map(idOf))
    });
  }
  if (spouses.length || children.length) {
    next.familyGroups.push({
      id: uid(),
      parents: [client.id].concat(spouses.slice(0, 1).map(idOf)),
      children: children.map(idOf)
    });
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
  renderSelected();
  renderResources();
  renderMap();
  document.getElementById("connectButton").classList.toggle("active", connectMode);
  saveLocalState();
}

function renderForm() {
  var client = clientPerson();
  document.getElementById("mapTitle").value = state.title;
  document.getElementById("clientName").value = client.name;
  fillSelect(document.getElementById("newGender"), genders, "female");
  fillSelect(document.getElementById("newRole"), roles, "sibling", ["client"]);
  fillSelect(document.getElementById("resourceType"), resourceTypes, "emotional");
}

function renderPeople() {
  var list = document.getElementById("peopleList");
  document.getElementById("peopleCount").textContent = state.people.length;
  list.innerHTML = state.people.map(function(person) {
    var symbolClass = "person-symbol " + person.gender + (person.deceased ? " deceased" : "");
    var year = person.birthYear ? " · " + person.birthYear : "";
    return '<button class="person-row ' + (person.id === state.selectedId ? "active" : "") +
      '" type="button" data-person-id="' + attr(person.id) + '">' +
      '<i class="' + symbolClass + '"></i>' +
      '<span class="person-main"><span class="person-name">' + escapeHtml(person.name) + '</span>' +
      '<span class="person-meta">' + escapeHtml(roles[person.role].label) + year +
      " · 자원 " + person.resources.length + "개</span></span>" +
      '<span class="count">' + person.resources.length + "</span></button>";
  }).join("");

  list.querySelectorAll("[data-person-id]").forEach(function(button) {
    button.addEventListener("click", function() {
      state.selectedId = button.dataset.personId;
      state.selectedResourceId = null;
      render();
    });
  });
}

function renderSelected() {
  var person = selectedPerson();
  document.getElementById("selectedName").value = person.name;
  document.getElementById("selectedBirthYear").value = person.birthYear;
  document.getElementById("selectedDeceased").checked = person.deceased;
  fillSelect(document.getElementById("selectedGender"), genders, person.gender);
  fillSelect(document.getElementById("selectedRole"), roles, person.role);
  document.getElementById("selectedRole").disabled = person.role === "client";
  document.getElementById("deletePerson").style.visibility = person.role === "client" ? "hidden" : "visible";
}

function renderResources() {
  var person = selectedPerson();
  var list = document.getElementById("resourceList");
  list.innerHTML = person.resources.length ? person.resources.map(function(resource) {
    return '<div class="resource-card"><div><strong>' + escapeHtml(resource.name) +
      '</strong><span>' + escapeHtml(resourceTypes[resource.type].label) +
      (resource.memo ? " · " + escapeHtml(resource.memo) : "") +
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
  state.familyGroups.forEach(drawFamilyGroup);

  state.links.forEach(function(link) {
    var from = personById(link.from);
    var to = personById(link.to);
    if (!from || !to) return;
    var path = makeSvg("path", {
      d: "M " + from.x + " " + from.y + " L " + to.x + " " + to.y,
      class: "social-line " + link.type
    });
    path.addEventListener("click", function(event) {
      event.stopPropagation();
      link.type = nextSocialType(link.type);
      showToast("관계: " + socialTypes[link.type]);
      render();
    });
    svg.appendChild(path);
  });

  state.people.forEach(function(person) {
    person.resources.forEach(function(resource) {
      svg.appendChild(makeSvg("path", {
        d: resourceConnectionPath(person, resource),
        class: "resource-link"
      }));
    });
  });

  state.people.forEach(function(person) { svg.appendChild(personNode(person)); });
  state.people.forEach(function(person) {
    person.resources.forEach(function(resource) {
      svg.appendChild(resourceNode(person, resource));
    });
  });
}

function drawFamilyGroup(group) {
  var parents = group.parents.map(personById).filter(Boolean).sort(byX);
  var children = group.children.map(personById).filter(Boolean).sort(byX);
  if (!parents.length || !children.length) return;

  var startX;
  var startY;
  if (parents.length >= 2) {
    var left = parents[0];
    var right = parents[1];
    var leftEdge = left.x + 46;
    var rightEdge = right.x - 46;
    svg.appendChild(makeSvg("path", {
      d: "M " + leftEdge + " " + left.y + " H " + rightEdge,
      class: "family-line"
    }));
    startX = (leftEdge + rightEdge) / 2;
    startY = (left.y + right.y) / 2;
  } else {
    startX = parents[0].x;
    startY = parents[0].y + 46;
  }

  var childTop = Math.min.apply(null, children.map(function(child) { return child.y - 48; }));
  var branchY = Math.max(startY + 45, childTop - 72);
  var firstX = children[0].x;
  var lastX = children[children.length - 1].x;
  var path = "M " + startX + " " + startY + " V " + branchY;
  if (children.length > 1) path += " M " + firstX + " " + branchY + " H " + lastX;
  children.forEach(function(child) {
    path += " M " + child.x + " " + branchY + " V " + (child.y - 48);
  });
  svg.appendChild(makeSvg("path", { d: path, class: "family-line" }));
}

function personNode(person) {
  var group = makeSvg("g", {
    class: "person-node " + (person.role === "client" ? "client " : "") +
      (person.id === state.selectedId ? "selected" : ""),
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
    if (connectMode) handleConnectClick(person.id);
    else {
      state.selectedId = person.id;
      state.selectedResourceId = null;
      render();
    }
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
  var name = makeSvg("text", { class: "node-name", y: person.birthYear ? -2 : 5 });
  name.textContent = shortText(person.name, 8);
  group.appendChild(name);
  if (person.birthYear) {
    var year = makeSvg("text", { class: "node-year", y: 21 });
    year.textContent = "(" + person.birthYear + ")";
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
    state.selectedId = owner.id;
    state.selectedResourceId = resource.id;
    render();
  });
  return group;
}

function addResourceLabel(group, resource) {
  var maxChars = Math.max(6, Math.floor((resource.width - 22) / 13));
  var lines = splitLabel(resource.name, maxChars).slice(0, 2);
  var name = makeSvg("text", {
    class: "resource-name",
    y: -4 - (lines.length - 1) * 7
  });
  lines.forEach(function(line, index) {
    var tspan = makeSvg("tspan", { x: 0, dy: index === 0 ? 0 : 15 });
    tspan.textContent = line;
    name.appendChild(tspan);
  });
  group.appendChild(name);
  if (resource.height >= 68) {
    var meta = makeSvg("text", {
      class: "resource-meta",
      y: resource.height / 2 - 10
    });
    meta.textContent = resourceTypes[resource.type].label;
    group.appendChild(meta);
  }
}

function startPersonDrag(event) {
  if (connectMode) return;
  event.preventDefault();
  var person = personById(event.currentTarget.dataset.personId);
  var point = svgPoint(event);
  dragging = {
    kind: "person",
    personId: person.id,
    dx: point.x - person.x,
    dy: point.y - person.y,
    lastX: person.x,
    lastY: person.y
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
  var point = svgPoint(event);
  dragging = {
    kind: "resource",
    ownerId: owner.id,
    resourceId: resource.id,
    dx: point.x - resource.x,
    dy: point.y - resource.y
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
    top: resource.y - resource.height / 2
  };
  state.selectedId = owner.id;
  state.selectedResourceId = resource.id;
  svg.setPointerCapture(event.pointerId);
}

svg.addEventListener("pointermove", function(event) {
  if (!dragging) return;
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
  dragging = null;
  saveLocalState();
  renderPeople();
  renderSelected();
  renderResources();
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
    deceased: document.getElementById("newDeceased").checked,
    x: 550,
    y: 400,
    resources: []
  };
  state.people.push(person);
  attachByRole(person, role);
  state.selectedId = person.id;
  state.selectedResourceId = null;
  input.value = "";
  document.getElementById("newBirthYear").value = "";
  document.getElementById("newDeceased").checked = false;
  arrangeMap();
}

function attachByRole(person, role) {
  var client = clientPerson();
  var group;
  if (role === "parent" || role === "sibling") {
    group = state.familyGroups.find(function(item) {
      return item.children.indexOf(client.id) !== -1;
    });
    if (!group) {
      group = { id: uid(), parents: [], children: [client.id] };
      state.familyGroups.push(group);
    }
    if (role === "parent") {
      if (group.parents.length < 2) group.parents.push(person.id);
      else state.links.push({ id: uid(), from: client.id, to: person.id, type: "normal" });
    } else if (group.children.indexOf(person.id) === -1) {
      group.children.push(person.id);
    }
  } else if (role === "spouse" || role === "child") {
    group = state.familyGroups.find(function(item) {
      return item.parents.indexOf(client.id) !== -1;
    });
    if (!group) {
      group = { id: uid(), parents: [client.id], children: [] };
      state.familyGroups.push(group);
    }
    if (role === "spouse") {
      if (group.parents.length < 2) group.parents.push(person.id);
      else state.links.push({ id: uid(), from: client.id, to: person.id, type: "normal" });
    } else if (group.children.indexOf(person.id) === -1) {
      group.children.push(person.id);
    }
  } else {
    state.links.push({ id: uid(), from: client.id, to: person.id, type: "normal" });
  }
}

function changePersonRole(person, nextRole) {
  if (person.role === "client") return;
  removeFromFamilies(person.id);
  person.role = nextRole;
  person.generation = roles[nextRole].generation;
  attachByRole(person, nextRole);
  arrangeMap();
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

function handleConnectClick(personId) {
  if (!connectStart) {
    connectStart = personId;
    state.selectedId = personId;
    showToast("사회적 관계를 연결할 두 번째 인물을 선택하세요.");
    render();
    return;
  }
  if (connectStart !== personId) {
    upsertSocialLink(connectStart, personId, "normal");
    showToast("사회적 관계를 연결했습니다.");
  }
  connectStart = null;
  connectMode = false;
  state.selectedId = personId;
  render();
}

function upsertSocialLink(from, to, type) {
  var existing = state.links.find(function(link) {
    return (link.from === from && link.to === to) || (link.from === to && link.to === from);
  });
  if (existing) existing.type = type;
  else state.links.push({ id: uid(), from: from, to: to, type: type });
}

function arrangeMap() {
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
  state.selectedId = clientPerson().id;
  state.selectedResourceId = null;
  render();
}

function removeFromFamilies(personId) {
  state.familyGroups.forEach(function(group) {
    group.parents = group.parents.filter(function(id) { return id !== personId; });
    group.children = group.children.filter(function(id) { return id !== personId; });
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

function exportPng() {
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
    canvas.toBlob(function(png) {
      if (png) downloadBlob(png, safeFilename(state.title || "생태도") + ".png");
    }, "image/png");
  };
  image.src = url;
}

function loadJson(file) {
  var reader = new FileReader();
  reader.onload = function() {
    try {
      state = normalizeState(JSON.parse(reader.result));
      render();
      showToast("생태도 파일을 불러왔습니다.");
    } catch (error) {
      showToast("올바른 생태도 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
}

function clearState() {
  state = initialState();
  connectMode = false;
  connectStart = null;
  render();
  showToast("가계도 기본 틀을 새로 만들었습니다.");
}

function defaultResourcePosition(person, index) {
  var side = index % 2 === 0 ? 1 : -1;
  var tier = Math.floor(index / 2);
  var verticalOffset = person.generation === 0 ? 135 + tier * 85 : tier * 90;
  return {
    x: clamp(person.x + side * (155 + tier * 45), 100, 1000),
    y: clamp(person.y + verticalOffset, 70, 690)
  };
}

function resourceConnectionPath(person, resource) {
  var dx = resource.x - person.x;
  var dy = resource.y - person.y;
  var length = Math.hypot(dx, dy) || 1;
  var personX = person.x + dx / length * 48;
  var personY = person.y + dy / length * 48;
  var scale = Math.min(
    Math.abs(dx) > 0 ? resource.width / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0 ? resource.height / 2 / Math.abs(dy) : Infinity
  );
  var resourceX = resource.x - dx * scale;
  var resourceY = resource.y - dy * scale;
  return "M " + personX + " " + personY + " L " + resourceX + " " + resourceY;
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

function nextSocialType(type) {
  var order = ["strong", "normal", "weak", "stress"];
  return order[(order.indexOf(type) + 1) % order.length];
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
  clientPerson().name = event.target.value || "Client";
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
document.getElementById("selectedDeceased").addEventListener("change", function(event) {
  selectedPerson().deceased = event.target.checked;
  render();
});
document.getElementById("addPerson").addEventListener("click", addPerson);
document.getElementById("newPersonName").addEventListener("keydown", function(event) {
  if (event.key === "Enter") addPerson();
});
document.getElementById("addResource").addEventListener("click", addResource);
document.getElementById("resourceName").addEventListener("keydown", function(event) {
  if (event.key === "Enter") addResource();
});
document.getElementById("deletePerson").addEventListener("click", deleteSelectedPerson);
document.getElementById("arrangeButton").addEventListener("click", arrangeMap);
document.getElementById("connectButton").addEventListener("click", function() {
  connectMode = !connectMode;
  connectStart = null;
  document.getElementById("statusText").textContent = connectMode
    ? "사회적 관계를 연결할 첫 번째 인물을 선택하세요."
    : "인물과 자원은 이동할 수 있고, 자원 오른쪽 아래 손잡이로 크기를 조절할 수 있습니다.";
  render();
});
document.getElementById("newButton").addEventListener("click", clearState);
document.getElementById("resetButton").addEventListener("click", clearState);
document.getElementById("saveButton").addEventListener("click", downloadJson);
document.getElementById("imageButton").addEventListener("click", exportPng);
document.getElementById("loadButton").addEventListener("click", function() {
  document.getElementById("loadInput").click();
});
document.getElementById("loadInput").addEventListener("change", function(event) {
  var file = event.target.files[0];
  if (file) loadJson(file);
  event.target.value = "";
});

render();
