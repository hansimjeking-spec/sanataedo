var genders = {
  male: { label: "ë‚¨ì„± (ì‚¬ê°í˜•)" },
  female: { label: "ì—¬ì„± (ì›)" },
  other: { label: "ê¸°íƒ€/ë¯¸ìƒ (ë§ˆë¦„ëª¨)" }
};

var roles = {
  client: { label: "ì¤‘ì‹¬ ì¸ë¬¼", generation: 0 },
  parent: { label: "ë¶€ëª¨", generation: -1 },
  spouse: { label: "ë°°ìš°ìž/íŒŒíŠ¸ë„ˆ", generation: 0 },
  sibling: { label: "í˜•ì œìžë§¤", generation: 0 },
  child: { label: "ìžë…€", generation: 1 },
  grandchild: { label: "ì†ìž/ì†ë…€", generation: 2 },
  family: { label: "ê¸°íƒ€ ê°€ì¡±", generation: 0 },
  pet: { label: "ë°˜ë ¤ë™ë¬¼", generation: 0 }
};

var petTypes = {
  dog: "ê°•ì•„ì§€",
  cat: "ê³ ì–‘ì´",
  other: "ê¸°íƒ€ ë°˜ë ¤ë™ë¬¼"
};

var resourceTypes = {
  emotional: { label: "ì •ì„œ ì§€ì›", tone: "good" },
  care: { label: "ëŒë´„/ì˜ë£Œ", tone: "good" },
  money: { label: "ê²½ì œ ì§€ì›", tone: "good" },
  info: { label: "ì •ë³´ ì œê³µ", tone: "good" },
  place: { label: "ê³µê°„/í™˜ê²½", tone: "good" },
  stress: { label: "ë¶€ë‹´ ìš”ì¸", tone: "warn" },
  risk: { label: "ìœ„í—˜ ìš”ì¸", tone: "risk" }
};

var socialTypes = {
  good: "ì¢‹ì€ ê´€ê³„",
  distant: "ì†Œì›í•œ ê´€ê³„",
  conflict: "ê°ˆë“± ê´€ê³„"
};

var directedSocialTypes = {
  none: "ê´€ê³„ ì—†ìŒ",
  good: "ì¢‹ì€ ê´€ê³„",
  distant: "ì†Œì›í•œ ê´€ê³„",
  conflict: "ê°ˆë“± ê´€ê³„"
};

var directionTypes = {
  out: "ë‹¨ë°©í–¥ (ì¸ë¬¼â†’ëŒ€ìƒ)",
  in: "ë‹¨ë°©í–¥ (ëŒ€ìƒâ†’ì¸ë¬¼)",
  both: "ì–‘ë°©í–¥"
};

var coupleStatuses = {
  married: "í˜¼ì¸",
  cohabiting: "ë¹„í˜¼ ë™ê±°",
  widowed: "ì‚¬ë³„",
  separated: "ë³„ê±°",
  divorced: "ì´í˜¼"
};

var childTypes = {
  biological: "ì¹œìƒ",
  adopted: "ìž…ì–‘",
  foster: "ìœ„íƒ",
  step: "ì˜ë¶“"
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
    title: "ìš°ë¦¬ ê°€ì¡± ìƒíƒœë„",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [
      {
        id: fatherId,
        name: "ì•„ë²„ì§€",
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
        name: "ì–´ë¨¸ë‹ˆ",
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
            name: "ì œì²œë³‘ì›",
            memo: "ì •ê¸° ì§„ë£Œ",
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
        name: "í°ëˆ„ë‚˜",
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
        name: "í´ë¼ì´ì–¸íŠ¸",
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
            name: "ëª…ì§€ë³‘ì›",
            memo: "ì§„ë£Œì™€ ê±´ê°•ê´€ë¦¬",
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
        name: "ë‚¨ë™ìƒ",
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
    title: "ìƒˆ ì‚¬ë¡€ ê°€ê³„ë„",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [{
      id: "client",
      name: "í´ë¼ì´ì–¸íŠ¸",
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
  next.reviewConfirmedKey = savedVersion >= 9 && typeof next.reviewConfirmedKey === "string"
    ? next.reviewConfirmedKey
    : null;
  next.driveFileId = typeof next.driveFileId === "string" ? next.driveFileId : "";
  next.title = next.title || "ë‚˜ì˜ ìƒíƒœë„";
  next.people = Array.isArray(next.people) ? next.people : [];
  next.links = Array.isArray(next.links) ? next.links : [];
  next.familyGroups = Array.isArray(next.familyGroups)
    ? next.familyGroups
    : (Array.isArray(next.families) ? next.families : []);
  next.households = Array.isArray(next.households) ? next.households : [];

  if (!next.people.length) {
    next.people.push({
      id: "client",
      name: "í´ë¼ì´ì–¸íŠ¸",
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
      resource.name = resource.name || "ì´ë¦„ ì—†ëŠ” ìžì›";
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

  if (next.title === "ìš°ë¦¬ ê°€ì¡± ìƒíƒœë„") {
    var previousSampleClient = clientPerson(next);
    if (previousSampleClient && previousSampleClient.name === "ê¶Œê²½ìž") {
      previousSampleClient.name = "í´ë¼ì´ì–¸íŠ¸";
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
    return {
      id: household.id || uid(),
      name: household.name || "ë™ê±°ê°€ì¡± " + (index + 1),
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
      parents: [client.id].concat(spouses.sliceßõÞÚ$z{-®éÜj×Rç‚ÒW'6öâçƒ°¢f"G’Ò&W6÷W&6Rç’ÒW'6öâç“°¢–b„ÖF‚æ'2†G‚’ÂãbbÖF‚æ'2†G’’Âã’°¢&WGW&â$Ò"²W'6öâç‚²""²W'6öâç“°¢Ð¢f"ÆVæwF‚ÒÖF‚æ‡—÷B†G‚ÂG’’ÇÂ°¢f"W'6öäVFvRÒW'6öäVFvUö–çB‡W'6öâÂ&W6÷W&6R“°¢f"W'6öå‚ÒW'6öäVFvRçƒ°¢f"W'6öå’ÒW'6öäVFvRç“°¢f"66ÆRÒÖF‚æÖ–â€¢ÖF‚æ'2†G‚’âò&W6÷W&6Rçv–GF‚ò"òÖF‚æ'2†G‚’¢–æf–æ—G’À¢ÖF‚æ'2†G’’âò&W6÷W&6Ræ†V–v‡Bò"òÖF‚æ'2†G’’¢–æf–æ—G¢“°¢f"&W6÷W&6U‚Ò&W6÷W&6Rç‚ÒG‚¢66ÆS°¢f"&W6÷W&6U’Ò&W6÷W&6Rç’ÒG’¢66ÆS°¢&WGW&â&VÆF–öç6†—F‚‡W'6öå‚ÂW'6öå’Â&W6÷W&6U‚Â&W6÷W&6U’Â&VÆF–öç6†—“°§Ð ¦gVæ7F–öâ7Æ—DÆ&VÂ‡fÇVRÂÖ„6†'2’°¢f"FW‡BÒ7G&–ær‡fÇVRÇÂ""“°¢–b‡FW‡BæÆVæwF‚ÃÒÖ„6†'2’&WGW&â·FW‡EÓ°¢f"v÷&G2ÒFW‡Bç7Æ—B‚õÇ2²ò“°¢–b‡v÷&G2æÆVæwF‚â’°¢f"Æ–æW2Ò²"%Ó°¢v÷&G2æf÷$V6‚†gVæ7F–öâ‡v÷&B’°¢f"Æ7BÒÆ–æW2æÆVæwF‚Ò°¢–b‚†Æ–æW5¶Æ7EÒ²""²v÷&B’çG&–Ò‚’æÆVæwF‚ÃÒÖ„6†'2’°¢Æ–æW5¶Æ7EÒÒ†Æ–æW5¶Æ7EÒ²""²v÷&B’çG&–Ò‚“°¢ÒVÇ6R°¢Æ–æW2çW6‚‡v÷&B“°¢Ð¢Ò“°¢&WGW&âÆ–æW2æÖ†gVæ7F–öâ†Æ–æR’°¢&WGW&âÆ–æRæÆVæwF‚âÖ„6†'2òÆ–æRç6Æ–6RƒÂÖ„6†'2Ò’².(
b"¢Æ–æS°¢Ò“°¢Ð¢&WGW&â°¢FW‡Bç6Æ–6RƒÂÖ„6†'2’À¢FW‡BæÆVæwF‚âÖ„6†'2¢"òFW‡Bç6Æ–6R†Ö„6†'2ÂÖ„6†'2¢"Ò’².(
b"¢FW‡Bç6Æ–6R†Ö„6†'2¢Ó°§Ð ¦gVæ7F–öâf—E&W6÷W&6T†V–v‡B‡&W6÷W&6R’°¢f"7W÷'G2Ò&W6÷W&6Rç7W÷'G2ÇÂ7Æ—E7W÷'G2‡&W6÷W&6RæÖVÖò“°¢f"—FVÔ6÷VçBÒ7W÷'G2æÆVæwF‚ÇÂ°¢f"&÷†–ÖFTÆ–æW2Ò7W÷'G2ç&VGV6R†gVæ7F–öâ‡F÷FÂÂ—FVÒ’°¢&WGW&âF÷FÂ²ÖF‚æÖ‚ƒÂÖF‚æ6V–Â…7G&–ær†—FVÒÇÂ""’æÆVæwF‚ò‚’“°¢ÒÂ’ÇÂ°¢f"&WV—&VD†V–v‡BÒS²ÖF‚æÖ‚†—FVÔ6÷VçBÂ&÷†–ÖFTÆ–æW2’¢#°¢&W6÷W&6Ræ†V–v‡BÒ6Æ×„ÖF‚æÖ‚„çVÖ&W"‡&W6÷W&6Ræ†V–v‡B’ÇÂs"Â&WV—&VD†V–v‡B’ÂSbÂ#c“°§Ð ¦gVæ7F–öâÖ¶U7fr‡FrÂGG'2’°¢f"VÆVÖVçBÒFö7VÖVçBæ7&VFTVÆVÖVçDå2‚&‡GG¢ò÷wwrçs2æ÷&ró#÷7fr"ÂFr“°¢ö&¦V7Bæ¶W—2†GG'2’æf÷$V6‚†gVæ7F–öâ†¶W’’²VÆVÖVçBç6WDGG&–'WFR†¶W’ÂGG'5¶¶W•Ò“²Ò“°¢&WGW&âVÆVÖVçC°§Ð ¦gVæ7F–öâ7fuö–çB†WfVçB’°¢f"ö–çBÒ7fræ7&VFU5duö–çB‚“°¢ö–çBç‚ÒWfVçBæ6Æ–VçEƒ°¢ö–çBç’ÒWfVçBæ6Æ–VçE“°¢&WGW&âö–çBæÖG&—…G&ç6f÷&Ò‡7frævWE67&VVä5DÒ‚’æ–çfW'6R‚’“°§Ð ¦gVæ7F–öâW'6öä'”–B†–B’°¢&WGW&â7FFRçV÷ÆRæf–æB†gVæ7F–öâ‡W'6öâ’²&WGW&âW'6öâæ–BÓÓÒ–C²Ò“°§Ð ¦gVæ7F–öâ&W6÷W&6T'”–B‡W'6öâÂ–B’°¢&WGW&âW'6öâbbW'6öâç&W6÷W&6W2æf–æB†gVæ7F–öâ‡&W6÷W&6R’²&WGW&â&W6÷W&6Ræ–BÓÓÒ–C²Ò“°§Ð ¦gVæ7F–öâf–æE&W6÷W&6T–å7FFR‡6÷W&6RÂ–B’°¢–b‚–B’&WGW&âçVÆÃ°¢f÷"‡f"–æFW‚Ò²–æFW‚Â6÷W&6RçV÷ÆRæÆVæwFƒ²–æFW‚³Ò’°¢f"&W6÷W&6RÒ6÷W&6RçV÷ÆU¶–æFW…Òç&W6÷W&6W2æf–æB†gVæ7F–öâ†—FVÒ’²&WGW&â—FVÒæ–BÓÓÒ–C²Ò“°¢–b‡&W6÷W&6R’&WGW&â²÷væW#¢6÷W&6RçV÷ÆU¶–æFW…ÒÂ&W6÷W&6S¢&W6÷W&6RÓ°¢Ð¢&WGW&âçVÆÃ°§Ð ¦gVæ7F–öâ–Döb†—FVÒ’²&WGW&â—FVÒæ–C²Ð¦gVæ7F–öâ'•‚†Â"’²&WGW&âç‚Ò"çƒ²Ð¦gVæ7F–öâ6Æ×‡fÇVRÂÖ–âÂÖ‚’²&WGW&âÖF‚æÖ‚†Ö–âÂÖF‚æÖ–â†Ö‚ÂfÇVR’“²Ð¦gVæ7F–öâ6†÷'EFW‡B‡fÇVRÂÖ‚’°¢fÇVRÒ7G&–ær‡fÇVRÇÂ""“°¢&WGW&âfÇVRæÆVæwF‚âÖ‚òfÇVRç6Æ–6RƒÂÖ‚Ò’².(
b"¢fÇVS°§Ð¦gVæ7F–öâ6fTf–ÆVæÖR‡fÇVR’°¢&WGW&â7G&–ær‡fÇVR’ç&WÆ6R‚õµÅÂó¢£ò#ÃçÅÒörÂ%ò"’çG&–Ò‚’ÇÂ.È9ÞØ9Î¸øB#°§Ð¦gVæ7F–öâF÷væÆöD&Æö"†&Æö"Âf–ÆVæÖR’°¢f"W&ÂÒU$Âæ7&VFTö&¦V7EU$Â†&Æö"“°¢f"æ6†÷"ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚&"“°¢æ6†÷"æ‡&VbÒW&Ã°¢æ6†÷"æF÷væÆöBÒf–ÆVæÖS°¢æ6†÷"æ6Æ–6²‚“°¢6WEF–ÖV÷WB†gVæ7F–öâ‚’²U$Âç&Wfö¶Tö&¦V7EU$Â‡W&Â“²ÒÂ“°§Ð¦gVæ7F–öâ6†÷uFö7B†ÖW76vR’°¢Fö7BçFW‡D6öçFVçBÒÖW76vS°¢Fö7Bæ6Æ74Æ—7BæFB‚'6†÷r"“°¢6ÆV%F–ÖV÷WB‡6†÷uFö7BçF–ÖW"“°¢6†÷uFö7BçF–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²Fö7Bæ6Æ74Æ—7Bç&VÖ÷fR‚'6†÷r"“²ÒÂƒ“°§Ð¦gVæ7F–öâW66T‡FÖÂ‡fÇVR’°¢&WGW&â7G&–ær‡fÇVR¢ç&WÆ6TÆÂ‚"b"Â"f×²"¢ç&WÆ6TÆÂ‚#Â"Â"fÇC²"¢ç&WÆ6TÆÂ‚#â"Â"fwC²"¢ç&WÆ6TÆÂ‚r"rÂ"gV÷C²"¢ç&WÆ6TÆÂ‚"r"Â"b33“²"“°§Ð¦gVæ7F–öâGG"‡fÇVR’²&WGW&âW66T‡FÖÂ‡fÇVR“²Ð ¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&ÖF—FÆR"’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢7FFRçF—FÆRÒWfVçBçF&vWBçfÇVS°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&6Æ–VçDæÖR"’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢6Æ–VçEW'6öâ‚’ææÖRÒWfVçBçF&vWBçfÇVRÇÂ.ØN¹ÛÎÉÛNÉkŽØ«‚#°¢&VæFW%V÷ÆR‚“°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDæÖR"’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢6VÆV7FVEW'6öâ‚’ææÖRÒWfVçBçF&vWBçfÇVRÇÂ.ÉÛNºhBÉxnÉØÂ#°¢&VæFW%V÷ÆR‚“°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVE7W÷'DÖVÖò"’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢6WEW'6öå7W÷'B‡W'6öâÂWfVçBçF&vWBçfÇVR“°¢&VæFW%V÷ÆR‚“°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDvVæFW""’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6VÆV7FVEW'6öâ‚’ævVæFW"ÒWfVçBçF&vWBçfÇVS°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVE&öÆR"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6†ævUW'6öå&öÆR‡6VÆV7FVEW'6öâ‚’ÂWfVçBçF&vWBçfÇVR“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD&—'F…–V""’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢6VÆV7FVEW'6öâ‚’æ&—'F…–V"ÒWfVçBçF&vWBçfÇVRçG&–Ò‚“°¢&VæFW%V÷ÆR‚“°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDFVF…–V""’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ†WfVçB’°¢6VÆV7FVEW'6öâ‚’æFVF…–V"ÒWfVçBçF&vWBçfÇVRçG&–Ò‚“°¢&VæFW%V÷ÆR‚“°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDFV6V6VB"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6VÆV7FVEW'6öâ‚’æFV6V6VBÒWfVçBçF&vWBæ6†V6¶VC°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDFVF…–V%Væ¶æ÷vâ"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6VÆV7FVEW'6öâ‚’æFVF…–V%Væ¶æ÷vâÒWfVçBçF&vWBæ6†V6¶VC°¢–b†WfVçBçF&vWBæ6†V6¶VB’6VÆV7FVEW'6öâ‚’æFV6V6VBÒG'VS°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVDvVæFW%Væ¶æ÷vâ"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6VÆV7FVEW'6öâ‚’ævVæFW%Væ¶æ÷vâÒWfVçBçF&vWBæ6†V6¶VC°¢–b†WfVçBçF&vWBæ6†V6¶VB’6VÆV7FVEW'6öâ‚’ævVæFW"Ò&÷F†W"#°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD&—'F„÷&FW%Væ¶æ÷vâ"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢&VÖVÖ&W%VæFò‚“°¢6VÆV7FVEW'6öâ‚’æ&—'F„÷&FW%Væ¶æ÷vâÒWfVçBçF&vWBæ6†V6¶VC°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVEWEG—R"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢–b‡W'6öâç&öÆRÓÒ'WB"’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢W'6öâçWEG—RÒWfVçBçF&vWBçfÇVS°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVEWD÷væW""’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢–b‡W'6öâç&öÆRÓÒ'WB"ÇÂWfVçBçF&vWBçfÇVR’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢W'6öâçWD÷væW$–BÒWfVçBçF&vWBçfÇVS°¢&VæFW$Ö‚“°¢6fTÆö6Å7FFR‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD÷WFvö–æu&VÆF–öç6†—"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢–b‡W'6öâç&öÆRÓÓÒ&6Æ–VçB"’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢f"&VÆF–öç6†—Ò&VÆF–öç6†—f÷%W'6öâ‡W'6öâæ–B“°¢W6W'E6ö6–ÄÆ–æ²€¢6Æ–VçEW'6öâ‚’æ–BÀ¢W'6öâæ–BÀ¢WfVçBçF&vWBçfÇVRÀ¢&VÆF–öç6†—ò&VÆF–öç6†—æ–åG—R¢&æöæR ¢“°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD–æ6öÖ–æu&VÆF–öç6†—"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢–b‡W'6öâç&öÆRÓÓÒ&6Æ–VçB"’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢f"&VÆF–öç6†—Ò&VÆF–öç6†—f÷%W'6öâ‡W'6öâæ–B“°¢W6W'E6ö6–ÄÆ–æ²€¢6Æ–VçEW'6öâ‚’æ–BÀ¢W'6öâæ–BÀ¢&VÆF–öç6†—ò&VÆF–öç6†—æ÷WEG—R¢&æöæR"À¢WfVçBçF&vWBçfÇVP¢“°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD6÷WÆU7FGW2"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"w&÷WÒ6÷WÆTw&÷Wf÷%W'6öâ‡6VÆV7FVEW'6öâ‚’æ–B“°¢–b‚w&÷W’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢w&÷Wç7FGW2ÒWfVçBçF&vWBçfÇVS°¢6VÆV7FVEW'6öâ‚’æ6÷WÆU7FGW2ÒWfVçBçF&vWBçfÇVS°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVD6†–ÆEG—R"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢f"w&÷WÒ6†–ÆDw&÷Wf÷%W'6öâ‡W'6öâæ–B“°¢–b‚w&÷W’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢w&÷Wæ6†–ÆEG—W5·W'6öâæ–EÒÒWfVçBçF&vWBçfÇVS°¢W'6öâæ6†–ÆEG—RÒWfVçBçF&vWBçfÇVS°¢&VæFW"‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6VÆV7FVE&VçEW'6öâ"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"W'6öâÒ6VÆV7FVEW'6öâ‚“°¢–b‡W'6öâç&öÆRÓÒ&w&æF6†–ÆB"ÇÂWfVçBçF&vWBçfÇVR’&WGW&ã°¢&VÖVÖ&W%VæFò‚“°¢&VÖ÷fTg&öÔfÖ–Æ–W2‡W'6öâæ–B“°¢W'6öâç&VçD–BÒWfVçBçF&vWBçfÇVS°¢GF6„'•&öÆR‡W'6öâÂ&w&æF6†–ÆB"“°¢Æ–÷WDfÖ–Ç•G&VR‚“°§Ò“° ¥²&ÖF—FÆR"Â&6Æ–VçDæÖR"Â'6VÆV7FVDæÖR"Â'6VÆV7FVD&—'F…–V""Â'6VÆV7FVDFVF…–V"%Òæf÷$V6‚€¢gVæ7F–öâ†f–VÆD–B’°¢f"f–VÆBÒFö7VÖVçBævWDVÆVÖVçD'”–B†f–VÆD–B“°¢f"VF—E6æ6†÷BÒçVÆÃ°¢f–VÆBæFDWfVçDÆ—7FVæW"‚&fö7W2"ÂgVæ7F–öâ‚’°¢VF—E6æ6†÷BÒ7&VFUVæFõ6æ6†÷B‚“°¢Ò“°¢f–VÆBæFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ‚’°¢–b†VF—E6æ6†÷BbbVF—E6æ6†÷Bç7FFT§6öâÓÒ¥4ôâç7G&–æv–g’‡7FFR’’°¢&VÖVÖ&W%VæFò†VF—E6æ6†÷B“°¢Ð¢VF—E6æ6†÷BÒçVÆÃ°¢Ò“°¢Ð¢“° ¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&FEW'6öâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂFEW'6öâ“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&æWu&öÆR"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂWFFTæWtfÖ–Ç”f–VÆG2“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&æWuW'6öäæÖR"’æFDWfVçDÆ—7FVæW"‚&¶W–F÷vâ"ÂgVæ7F–öâ†WfVçB’°¢–b†WfVçBæ¶W’ÓÓÒ$VçFW""’FEW'6öâ‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&FE&W6÷W&6R"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂFE&W6÷W&6R“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'&W6÷W&6TæÖR"’æFDWfVçDÆ—7FVæW"‚&¶W–F÷vâ"ÂgVæ7F–öâ†WfVçB’°¢–b†WfVçBæ¶W’ÓÓÒ$VçFW""’FE&W6÷W&6R‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&FVÆWFUW'6öâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂFVÆWFU6VÆV7FVEW'6öâ“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'7F'D†÷W6V†öÆB"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢7F'D†÷W6V†öÆDG&gB†çVÆÂ“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6fT†÷W6V†öÆB"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6fT†÷W6V†öÆDG&gB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&6æ6VÄ†÷W6V†öÆB"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6æ6VÄ†÷W6V†öÆDG&gB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&æWt'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6ÆV%7FFR“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&&Ææ´66T'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â7F'D&Ææ´66R“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆµV÷ÆT'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â÷Vä'VÆ´–çWB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6–FV&$Fö7VÖVçDG&gD'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&Fö7VÖVçDG&gD–çWB"’æ6Æ–6²‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'VæFô'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂVæFôÆ7D7F–öâ“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'&W6WD'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6ÆV%7FFR“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚'6fT'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢W‡÷'Eær‡G'VR“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&ÆöD'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&ÆöD–çWB"’æ6Æ–6²‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&ÆöD–çWB"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"f–ÆRÒWfVçBçF&vWBæf–ÆW5³Ó°¢–b†f–ÆR’ÆöE6VÆV7FVDf–ÆR†f–ÆR“°¢WfVçBçF&vWBçfÇVRÒ"#°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&Fö7VÖVçDG&gD'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&Fö7VÖVçDG&gD–çWB"’æ6Æ–6²‚“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&Fö7VÖVçDG&gD–çWB"’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂgVæ7F–öâ†WfVçB’°¢f"f–ÆRÒWfVçBçF&vWBæf–ÆW5³Ó°¢–b†f–ÆR’÷VäFö7VÖVçDG&gB†f–ÆR“°¢WfVçBçF&vWBçfÇVRÒ"#°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&—fT6öææV7D'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢Æö6F–öâæ‡&VbÒ"ö’övöövÆRÖWFƒö7F–öãÖÆöv–âg&WGW&åFóÒ"²Væ6öFUU$”6ö×öæVçB†Æö6F–öâçF†æÖR“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&—fU6fT'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6fT7W'&VçEFôG&—fR“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&—fU&Vg&W6„'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢&Vg&W6„G&—fT66W2‚’æ6F6‚†gVæ7F–öâ†W'&÷"’²6†÷uFö7B†W'&÷"æÖW76vRÇÂ.ÊÉêRºªžºÞÉØBÈ8ŽºÎ«:ËšŽÙYŽÊxº«¾ÙhŽÈ«^¸¸Ž¸ºBâ"“²Ò“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&—fTÆöv÷WD'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢Æö6F–öâæ‡&VbÒ"ö’övöövÆRÖWFƒö7F–öãÖÆöv÷WBg&WGW&åFóÒ"²Væ6öFUU$”6ö×öæVçB†Æö6F–öâçF†æÖR“°§Ò“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&—fT66U6V&6‚"’æFDWfVçDÆ—7FVæW"‚&–çWB"Â&VæFW$G&—fT66W2“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&6¶æ÷vÆVFvU&Wf–Wt'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6¶æ÷vÆVFvU&Wf–Wr“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&gDÇ”'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂÇ”Fö7VÖVçDG&gB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&gD6æ6VÄ'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6Æ÷6TFö7VÖVçDG&gB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&G&gD6Æ÷6T'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6Æ÷6TFö7VÖVçDG&gB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆ´Ç”'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂÇ”'VÆµV÷ÆR“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆ´6æ6VÄ'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6Æ÷6T'VÆ´–çWB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆ´6Æ÷6T'WGFöâ"’æFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â6Æ÷6T'VÆ´–çWB“°¦Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆµV÷ÆT–çWB"’æFDWfVçDÆ—7FVæW"‚&–çWB"ÂgVæ7F–öâ‚’°¢f"'6VBÒ'6T'VÆµV÷ÆR‡F†—2çfÇVR“°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'VÆ´–çWE7FGW2"’çFW‡D6öçFVçBÒ'6VBæW'&÷'2æÆVæwF€¢ò'6VBæW'&÷'5³Ð¢¢‡'6VBç&V6÷&G2æÆVæwF‚ò'6VBç&V6÷&G2æÆVæwF‚².º¨^ÉØBËiN«ÙZÈ‰‚ÉèŽÈ«^¸¸Ž¸ºBâ"¢""“°§Ò“°§f"66U6fT'WGFöâÒFö7VÖVçBævWDVÆVÖVçD'”–B‚&66U6fT'WGFöâ"“°¦–b‡v–æF÷rç&VçBÓÒv–æF÷r’°¢66U6fT'WGFöâæ†–FFVâÒfÇ6S°¢66U6fT'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢v–æF÷rç&VçBç÷7DÖW76vR‡°¢G—S¢%4%”UôtTäôu$Õõ4dR"À¢–ÆöC¢¥4ôâç'6R„¥4ôâç7G&–æv–g’‡7FFR’¢ÒÂv–æF÷ræÆö6F–öâæ÷&–v–â“°¢6†÷uFö7B‚.È*ÎºÉyÊÉê^ÙhŽÈ«^¸¸Ž¸ºBâ"“°¢Ò“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚&ÖW76vR"ÂgVæ7F–öâ†WfVçB’°¢–b†WfVçBæ÷&–v–âÓÒv–æF÷ræÆö6F–öâæ÷&–v–âÇÂWfVçBç6÷W&6RÓÒv–æF÷rç&VçB’&WGW&ã°¢–b†WfVçBæFFbbWfVçBæFFçG—RÓÓÒ%4%”UôtTäôu$ÕôÄôB"bbWfVçBæFFç–ÆöB’°¢&VÖVÖ&W%VæFò‚“°¢7FFRÒæ÷&ÖÆ—¦U7FFR„¥4ôâç'6R„¥4ôâç7G&–æv–g’†WfVçBæFFç–ÆöB’’“°¢&6¶w&÷VæD–ÖvUW&ÂÒçVÆÃ°¢†÷W6V†öÆDG&gBÒçVÆÃ°¢6Æ÷6UV–6´VF—F÷"‚“°¢Æ–÷WDfÖ–Ç•G&VR‚“°¢&VæFW"‚“°¢6†÷uFö7B‚.¸ÈÈ8ÉéÉéº8ÎºÂ««8N¸øBËHŽÉXŽÉØBºxÎ¹:NÉxŽÈ«^¸¸Ž¸ºBâ"“°¢Ð¢Ò“°¢v–æF÷rç&VçBç÷7DÖW76vR‡²G—S¢%4%”UôtTäôu$Õõ$TE’"ÒÂv–æF÷ræÆö6F–öâæ÷&–v–â“°§Ð§v–æF÷ræFDWfVçDÆ—7FVæW"‚&¶W–F÷vâ"ÂgVæ7F–öâ†WfVçB’°¢f"F&vWBÒWfVçBçF&vWC°¢f"FtæÖRÒF&vWBbbF&vWBçFtæÖS°¢f"—5G—–ærÒFtæÖRÓÓÒ$”åUB"ÇÂFtæÖRÓÓÒ%DU…D$T"ÇÂFtæÖRÓÓÒ%4TÄT5B"ÇÀ¢‡F&vWBbbF&vWBæ—46öçFVçDVF—F&ÆR“°¢–b†WfVçBæ¶W’ÓÓÒ$&6·76R"bb—5G—–ær’°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢VæFôÆ7D7F–öâ‚“°¢&WGW&ã°¢Ð¢–b†WfVçBæ¶W’ÓÓÒ$W66R"’°¢6Æ÷6UV–6´VF—F÷"‚“°¢–b††÷W6V†öÆDG&gB’6æ6VÄ†÷W6V†öÆDG&gB‚“°¢Ð§ÒÂG'VR“° ¦Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚"ç6–FV&"×æVÂ"’æf÷$V6‚†gVæ7F–öâ‡æVÂ’°¢æVÂæFDWfVçDÆ—7FVæW"‚'FövvÆR"ÂgVæ7F–öâ‚’°¢–b‚æVÂæ÷Vâ’&WGW&ã°¢Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚"ç6–FV&"×æVÂ"’æf÷$V6‚†gVæ7F–öâ†÷F†W"’°¢–b†÷F†W"ÓÒæVÂ’÷F†W"æ÷VâÒfÇ6S°¢Ò“°¢Ò“°§Ò“° §6WDG&—fT6öææV7F–öâ†G&—fT6öææV7F–öâ“°§&VæFW$G&—fT66W2‚“°¦–æ—F–Æ—¦TG&—fU7F÷&vR‚“°§&VæFW"‚“°