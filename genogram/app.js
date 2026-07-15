var genders = {
  male: { label: "ÎÇ®ÏÑ± (ÏÇ¨Í∞ÅÌòï)" },
  female: { label: "Ïó¨ÏÑ± (Ïõê)" },
  other: { label: "Í∏∞ÌÉÄ/ÎØ∏ÏÉÅ (ÎßàÎ¶ÑÎ™®)" }
};

var roles = {
  client: { label: "Ï§ëÏã¨ Ïù∏Î¨º", generation: 0 },
  parent: { label: "Î∂ÄÎ™®", generation: -1 },
  spouse: { label: "Î∞∞Ïö∞Ïûê/ÌååÌä∏ÎÑà", generation: 0 },
  sibling: { label: "ÌòïÏ†úÏûêÎß§", generation: 0 },
  child: { label: "ÏûêÎÖÄ", generation: 1 },
  grandchild: { label: "ÏÜêÏûê/ÏÜêÎÖÄ", generation: 2 },
  family: { label: "Í∏∞ÌÉÄ Í∞ÄÏ°±", generation: 0 },
  pet: { label: "Î∞òÎ†§ÎèôÎ¨º", generation: 0 }
};

var petTypes = {
  dog: "Í∞ïÏïÑÏßÄ",
  cat: "Í≥†ÏñëÏù¥",
  other: "Í∏∞ÌÉÄ Î∞òÎ†§ÎèôÎ¨º"
};

var resourceTypes = {
  emotional: { label: "Ï†ïÏÑú ÏßÄÏõê", tone: "good" },
  care: { label: "ÎèåÎ¥Ñ/ÏùòÎ£å", tone: "good" },
  money: { label: "Í≤ΩÏ†ú ÏßÄÏõê", tone: "good" },
  info: { label: "Ï†ïÎ≥¥ Ï†úÍ≥µ", tone: "good" },
  place: { label: "Í≥µÍ∞Ñ/ÌôòÍ≤Ω", tone: "good" },
  stress: { label: "Î∂ÄÎã¥ ÏöîÏù∏", tone: "warn" },
  risk: { label: "ÏúÑÌóò ÏöîÏù∏", tone: "risk" }
};

var socialTypes = {
  good: "Ï¢ãÏùÄ Í¥ÄÍ≥Ñ",
  distant: "ÏÜåÏõêÌïú Í¥ÄÍ≥Ñ",
  conflict: "Í∞àÎì± Í¥ÄÍ≥Ñ"
};

var directedSocialTypes = {
  none: "Í¥ÄÍ≥Ñ ÏóÜÏùå",
  good: "Ï¢ãÏùÄ Í¥ÄÍ≥Ñ",
  distant: "ÏÜåÏõêÌïú Í¥ÄÍ≥Ñ",
  conflict: "Í∞àÎì± Í¥ÄÍ≥Ñ"
};

var directionTypes = {
  out: "Îã®Î∞©Ìñ• (Ïù∏Î¨º‚ÜíÎåÄÏÉÅ)",
  in: "Îã®Î∞©Ìñ• (ÎåÄÏÉÅ‚ÜíÏù∏Î¨º)",
  both: "ÏñëÎ∞©Ìñ•"
};

var coupleStatuses = {
  married: "ÌòºÏù∏",
  cohabiting: "ÎπÑÌòº ÎèôÍ±∞",
  widowed: "ÏÇ¨Î≥Ñ",
  separated: "Î≥ÑÍ±∞",
  divorced: "Ïù¥Ìòº"
};

var childTypes = {
  biological: "ÏπúÏÉù",
  adopted: "ÏûÖÏñë",
  foster: "ÏúÑÌÉÅ",
  step: "ÏùòÎ∂ì"
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
    title: "Ïö∞Î¶¨ Í∞ÄÏ°± ÏÉùÌÉúÎèÑ",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [
      {
        id: fatherId,
        name: "ÏïÑÎ≤ÑÏßÄ",
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
        name: "Ïñ¥Î®∏Îãà",
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
            name: "Ï†úÏ≤úÎ≥ëÏõê",
            memo: "Ï†ïÍ∏∞ ÏßÑÎ£å",
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
        name: "ÌÅ∞ÎàÑÎÇò",
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
        name: "ÌÅ¥ÎùºÏù¥Ïñ∏Ìä∏",
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
            name: "Î™ÖÏßÄÎ≥ëÏõê",
            memo: "ÏßÑÎ£åÏôÄ Í±¥Í∞ïÍ¥ÄÎ¶¨",
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
        name: "ÎÇ®ÎèôÏÉù",
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
    title: "ÏÉà ÏÇ¨Î°Ä Í∞ÄÍ≥ÑÎèÑ",
    selectedId: "client",
    selectedResourceId: null,
    selectedLinkId: null,
    people: [{
      id: "client",
      name: "ÌÅ¥ÎùºÏù¥Ïñ∏Ìä∏",
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
      resources: []
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
  next.title = next.title || "ÎÇòÏùò ÏÉùÌÉúÎèÑ";
  next.people = Array.isArray(next.people) ? next.people : [];
  next.links = Array.isArray(next.links) ? next.links : [];
  next.familyGroups = Array.isArray(next.familyGroups)
    ? next.familyGroups
    : (Array.isArray(next.families) ? next.families : []);
  next.households = Array.isArray(next.households) ? next.households : [];

  if (!next.people.length) {
    next.people.push({
      id: "client",
      name: "ÌÅ¥ÎùºÏù¥Ïñ∏Ìä∏",
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
    person.resources = Array.isArray(person.resources) ? person.resources : [];

    person.resources.forEach(function(resource, index) {
      resource.id = resource.id || uid();
      resource.type = resourceTypes[resource.type] ? resource.type : "info";
      resource.name = resource.name || "Ïù¥Î¶Ñ ÏóÜÎäî ÏûêÏõê";
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

  if (next.title === "Ïö∞Î¶¨ Í∞ÄÏ°± ÏÉùÌÉúÎèÑ") {
    var previousSampleClient = clientPerson(next);
    if (previousSampleClient && previousSampleClient.name === "Í∂åÍ≤ΩÏûê") {
      previousSampleClient.name = "ÌÅ¥ÎùºÏù¥Ïñ∏Ìä∏";
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
      name: household.name || "ÎèôÍ±∞Í∞ÄÏ°± " + (index + 1),
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
    var group = next.familyGroups.find(functw€é<∂âûÀk∫wµÁ]Y\à
àL¬àô]\õà¬àà€[\
\ú€€ãû
»⁄YH
à
çH
»Y\à
àJKLL
KàNà€[\
\ú€€ãûH
»ô\ùXÿ[ŸôúŸ]ÃéL
BàN¬üBÇôù[ò›[€àô\€›\òŸP€€õôX›[€î]
\ú€€ãô\€›\òŸKô[][€ú⁄\
H¬àò\àHô\€›\òŸKûH\ú€€ãû¬àò\àHHô\€›\òŸKûHH\ú€€ãûN¬àYà
X]òXú 
HåH	âàX]òXú JHåJH¬àô]\õàìHà
»\ú€€ãû
»àà
»\ú€€ãûN¬àBàò\à[ô›HX]ö\›
JHN¬àò\à\ú€€ëYŸHH\ú€€ëYŸT⁄[ù
\ú€€ãô\€›\òŸJN¬àò\à\ú€€ñH\ú€€ëYŸKû¬àò\à\ú€€ñHH\ú€€ëYŸKûN¬àò\àÿÿ[HHX]õZ[äàX]òXú 
Hà»ô\€›\òŸKù⁄Y»à»X]òXú 
Hà[ôö[ö]KàX]òXú JHà»ô\€›\òŸKöZY⁄»à»X]òXú JHà[ôö[ö]Bà
N¬àò\àô\€›\òŸVHô\€›\òŸKûH
àÿÿ[N¬àò\àô\€›\òŸVHHô\€›\òŸKûHHH
àÿÿ[N¬àô]\õàô[][€ú⁄\]
\ú€€ñ\ú€€ñKô\€›\òŸVô\€›\òŸVKô[][€ú⁄\
N¬üBÇôù[ò›[€à‹]Xô[
ò[YKX^⁄\ú H¬àò\à^H›ö[ô ò[YHàäN¬àYà
^õ[ô›HX^⁄\ú Hô]\õà›^N¬àò\à€‹ô»H^ú‹]
◊ À N¬àYà
€‹ôÀõ[ô›àJH¬àò\à[ô\»H»àóN¬à€‹ôÀôõ‹ëXX⁄
ù[ò›[€ä€‹ô
H¬àò\à\›H[ô\Àõ[ô›HN¬àYà

[ô\÷€\›H
»àà
»€‹ô
Kùö[J
Kõ[ô›HX^⁄\ú H¬à[ô\÷€\›HH
[ô\÷€\›H
»àà
»€‹ô
Kùö[J
N¬àH[ŸH¬à[ô\Àú\⁄
€‹ô
N¬àBàJN¬àô]\õà[ô\ÀõX\
ù[ò›[€ä[ôJH¬àô]\õà[ôKõ[ô›àX^⁄\ú»»[ôKú€XŸJX^⁄\ú»HJH
»∏†)ààà[ôN¬àJN¬àBàô]\õà¬à^ú€XŸJX^⁄\ú Kà^õ[ô›àX^⁄\ú»
àà»^ú€XŸJX^⁄\úÀX^⁄\ú»
ààHJH
»∏†)ààà^ú€XŸJX^⁄\ú BàN¬üBÇôù[ò›[€àö]ô\€›\òŸRZY⁄
ô\€›\òŸJH¬àò\à›\‹ù»Hô\€›\òŸKú›\‹ù»‹]›\‹ù ô\€›\òŸKõY[[ N¬àò\à][P€›[ùH›\‹ùÀõ[ô›N¬àò\à\õﬁ[X]S[ô\»H›\‹ùÀúôYXŸJù[ò›[€ä›[][JH¬àô]\õà›[
»X]õX^
KX]òŸZ[
›ö[ô ][HàäKõ[ô›»N
JN¬àK
HN¬àò\àô\]Z\ôYZY⁄HL
»X]õX^
][P€›[ù\õﬁ[X]S[ô\ H
àLé¬àô\€›\òŸKöZY⁄H€[\
X]õX^
ù[Xô\äô\€›\òŸKöZY⁄
HÃãô\]Z\ôYZY⁄
KMãçå
N¬üBÇôù[ò›[€àXZŸT›ô YÀ]ú H¬àò\à[[Y[ùHÿ›[Y[ùò‹ôX]Q[[Y[ùî öãÀ›››ÀùÃÀõ‹ôÀÃå‹›ô»ãY N¬àÿöôX›öŸ^\ ]ú Kôõ‹ëXX⁄
ù[ò›[€äŸ^JH»[[Y[ùúŸ]]öXù]JŸ^K]ú÷⁄Ÿ^WJN»JN¬àô]\õà[[Y[ù¬üBÇôù[ò›[€à›ô‘⁄[ù
]ô[ù
H¬àò\à⁄[ùH›ôÀò‹ôX]T’ë‘⁄[ù

N¬à⁄[ùûH]ô[ùò€Y[ù¬à⁄[ùûHH]ô[ùò€Y[ùN¬àô]\õà⁄[ùõX]ö^ò[úŸõ‹õJ›ôÀôŸ]ÿ‹ôY[ê’J
Kö[ùô\úŸJ
JN¬üBÇôù[ò›[€à\ú€€êûRY
Y
H¬àô]\õà›]Kú[‹Kôö[ô
ù[ò›[€ä\ú€€äH»ô]\õà\ú€€ãöYOOHY»JN¬üBÇôù[ò›[€àô\€›\òŸPûRY
\ú€€ãY
H¬àô]\õà\ú€€à	âà\ú€€ãúô\€›\òŸ\Àôö[ô
ù[ò›[€äô\€›\òŸJH»ô]\õàô\€›\òŸKöYOOHY»JN¬üBÇôù[ò›[€àö[ôô\€›\òŸR[î›]J€›\òŸKY
H¬àYà
ZY
Hô]\õàù[¬àõ‹à
ò\à[ô^H»[ô^€›\òŸKú[‹Kõ[ô›»[ô^
œHJH¬àò\àô\€›\òŸHH€›\òŸKú[‹V⁄[ô^Kúô\€›\òŸ\Àôö[ô
ù[ò›[€ä][JH»ô]\õà][KöYOOHY»JN¬àYà
ô\€›\òŸJHô]\õà»›€ô\éà€›\òŸKú[‹V⁄[ô^Kô\€›\òŸNàô\€›\òŸHN¬àBàô]\õàù[¬üBÇôù[ò›[€àYŸä][JH»ô]\õà][KöY»Bôù[ò›[€àûV
KäH»ô]\õàKûHãû»Bôù[ò›[€à€[\
ò[YKZ[ãX^
H»ô]\õàX]õX^
Z[ãX]õZ[äX^ò[YJJN»Bôù[ò›[€à⁄‹ù^
ò[YKX^
H¬àò[YHH›ö[ô ò[YHàäN¬àô]\õàò[YKõ[ô›àX^»ò[YKú€XŸJX^HJH
»∏†)àààò[YN¬üBôù[ò›[€àÿYôQö[[ò[YJò[YJH¬àô]\õà›ö[ô ò[YJKúô\XŸJ÷◊Œäè»èüKŸÀó»äKùö[J
Hª Á{`Á:„·é¬üBôù[ò›[€à›€õÿYõÿäõÿãö[[ò[YJH¬àò\à\õHTìò‹ôX]SÿöôX›Tì
õÿäN¬àò\à[ò⁄‹àHÿ›[Y[ùò‹ôX]Q[[Y[ù
òHäN¬à[ò⁄‹ãöôYàH\õ¬à[ò⁄‹ãô›€õÿYHö[[ò[YN¬à[ò⁄‹ãò€X⁄ 
N¬àŸ][Y[›]
ù[ò›[€ä
H»Tìúô]õ⁄ŸSÿöôX›Tì
\õ
N»KL
N¬üBôù[ò›[€à⁄›’ÿ\›
Y\‹ÿYŸJH¬àÿ\›ù^€€ù[ùHY\‹ÿYŸN¬àÿ\›ò€\‹”\›òY
ú⁄›»äN¬à€X\ï[Y[›]
⁄›’ÿ\›ù[Y\äN¬à⁄›’ÿ\›ù[Y\àHŸ][Y[›]
ù[ò›[€ä
H»ÿ\›ò€\‹”\›úô[[›ôJú⁄›»äN»KN
N¬üBôù[ò›[€à\ÿÿ\R[
ò[YJH¬àô]\õà›ö[ô ò[YJBàúô\XŸP[
âàãâò[\»äBàúô\XŸP[
èãâõ»äBàúô\XŸP[
èàãâô›»äBàúô\XŸP[
	»âÀâú][›»äBàúô\XŸP[
â»ãâàÃŒN»äN¬üBôù[ò›[€à]äò[YJH»ô]\õà\ÿÿ\R[
ò[YJN»BÇôÿ›[Y[ùôŸ][[Y[ùûRY
õX\]HäKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä]ô[ù
H¬à›]Kù]HH]ô[ùù\ôŸ]ùò[YN¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ò€Y[ùò[YHäKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä]ô[ù
H¬à€Y[ù\ú€€ä
Kõò[YHH]ô[ùù\ôŸ]ùò[YHª`m:Áo;'m;%Æ;bÆé¬àô[ô\î[‹J
N¬àô[ô\ìX\

N¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Yò[YHäKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä]ô[ù
H¬àŸ[X›Y\ú€€ä
Kõò[YHH]ô[ùù\ôŸ]ùò[YHª'm:È°;%·ª'cé¬àô[ô\î[‹J
N¬àô[ô\ìX\

N¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›YŸ[ô\àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬àŸ[X›Y\ú€€ä
KôŸ[ô\àH]ô[ùù\ôŸ]ùò[YN¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Yõ€HäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬à⁄[ôŸT\ú€€îõ€JŸ[X›Y\ú€€ä
K]ô[ùù\ôŸ]ùò[YJN¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Yö\ùYX\àäKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä]ô[ù
H¬àŸ[X›Y\ú€€ä
Kòö\ùYX\àH]ô[ùù\ôŸ]ùò[YKùö[J
N¬àô[ô\î[‹J
N¬àô[ô\ìX\

N¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›YX]YX\àäKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä]ô[ù
H¬àŸ[X›Y\ú€€ä
KôX]YX\àH]ô[ùù\ôŸ]ùò[YKùö[J
N¬àô[ô\î[‹J
N¬àô[ô\ìX\

N¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›YXŸX\ŸYäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬àŸ[X›Y\ú€€ä
KôXŸX\ŸYH]ô[ùù\ôŸ]ò⁄X⁄ŸY¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›YX]YX\ï[ö€õ›€àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬àŸ[X›Y\ú€€ä
KôX]YX\ï[ö€õ›€àH]ô[ùù\ôŸ]ò⁄X⁄ŸY¬àYà
]ô[ùù\ôŸ]ò⁄X⁄ŸY
HŸ[X›Y\ú€€ä
KôXŸX\ŸYHùYN¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›YŸ[ô\ï[ö€õ›€àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬àŸ[X›Y\ú€€ä
KôŸ[ô\ï[ö€õ›€àH]ô[ùù\ôŸ]ò⁄X⁄ŸY¬àYà
]ô[ùù\ôŸ]ò⁄X⁄ŸY
HŸ[X›Y\ú€€ä
KôŸ[ô\àHõ›\àé¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Yö\ù‹ô\ï[ö€õ›€àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àô[Y[Xô\ï[ô 
N¬àŸ[X›Y\ú€€ä
Kòö\ù‹ô\ï[ö€õ›€àH]ô[ùù\ôŸ]ò⁄X⁄ŸY¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y]\HäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àYà
\ú€€ãúõ€HOOHú]äHô]\õé¬àô[Y[Xô\ï[ô 
N¬à\ú€€ãú]\HH]ô[ùù\ôŸ]ùò[YN¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y]›€ô\àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àYà
\ú€€ãúõ€HOOHú]àY]ô[ùù\ôŸ]ùò[YJHô]\õé¬àô[Y[Xô\ï[ô 
N¬à\ú€€ãú]›€ô\íYH]ô[ùù\ôŸ]ùò[YN¬àô[ô\ìX\

N¬àÿ]ôSÿÿ[›]J
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y›]€⁄[ô‘ô[][€ú⁄\äKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àYà
\ú€€ãúõ€HOOHò€Y[ùäHô]\õé¬àô[Y[Xô\ï[ô 
N¬àò\àô[][€ú⁄\Hô[][€ú⁄\õ‹î\ú€€ä\ú€€ãöY
N¬à\Ÿ\ù€ÿ⁄X[[ö à€Y[ù\ú€€ä
KöYà\ú€€ãöYà]ô[ùù\ôŸ]ùò[YKàô[][€ú⁄\»ô[][€ú⁄\ö[ï\Hàõõ€ôHÇà
N¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y[ò€€Z[ô‘ô[][€ú⁄\äKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àYà
\ú€€ãúõ€HOOHò€Y[ùäHô]\õé¬àô[Y[Xô\ï[ô 
N¬àò\àô[][€ú⁄\Hô[][€ú⁄\õ‹î\ú€€ä\ú€€ãöY
N¬à\Ÿ\ù€ÿ⁄X[[ö à€Y[ù\ú€€ä
KöYà\ú€€ãöYàô[][€ú⁄\»ô[][€ú⁄\õ›]\Hàõõ€ôHãà]ô[ùù\ôŸ]ùò[YBà
N¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y€›\T›]\»äKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à‹õ›\H€›\Q‹õ›\õ‹î\ú€€äŸ[X›Y\ú€€ä
KöY
N¬àYà
Y‹õ›\
Hô]\õé¬àô[Y[Xô\ï[ô 
N¬à‹õ›\ú›]\»H]ô[ùù\ôŸ]ùò[YN¬àŸ[X›Y\ú€€ä
Kò€›\T›]\»H]ô[ùù\ôŸ]ùò[YN¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y⁄[\HäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àò\à‹õ›\H⁄[‹õ›\õ‹î\ú€€ä\ú€€ãöY
N¬àYà
Y‹õ›\
Hô]\õé¬àô[Y[Xô\ï[ô 
N¬à‹õ›\ò⁄[\\÷‹\ú€€ãöYHH]ô[ùù\ôŸ]ùò[YN¬à\ú€€ãò⁄[\HH]ô[ùù\ôŸ]ùò[YN¬àô[ô\ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úŸ[X›Y\ô[ù\ú€€àäKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\à\ú€€àHŸ[X›Y\ú€€ä
N¬àYà
\ú€€ãúõ€HOOHô‹ò[ô⁄[àY]ô[ùù\ôŸ]ùò[YJHô]\õé¬àô[Y[Xô\ï[ô 
N¬àô[[›ôQúõ€Qò[Z[Y\ \ú€€ãöY
N¬à\ú€€ãú\ô[ùYH]ô[ùù\ôŸ]ùò[YN¬à]X⁄ûTõ€J\ú€€ãô‹ò[ô⁄[äN¬à^[›]ò[Z[UôYJ
N¬üJN¬Çñ»õX\]Hãò€Y[ùò[YHãúŸ[X›Yò[YHãúŸ[X›Yö\ùYX\àãúŸ[X›YX]YX\àóKôõ‹ëXX⁄
àù[ò›[€äöY[Y
H¬àò\àöY[Hÿ›[Y[ùôŸ][[Y[ùûRY
öY[Y
N¬àò\àY]€ò\⁄›Hù[¬àöY[òY]ô[ù\›[ô\äôõÿ›\»ãù[ò›[€ä
H¬àY]€ò\⁄›H‹ôX]U[ô‘€ò\⁄›

N¬àJN¬àöY[òY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä
H¬àYà
Y]€ò\⁄›	âàY]€ò\⁄›ú›]Rú€€àOOHî””ãú›ö[ô⁄YûJ›]JJH¬àô[Y[Xô\ï[ô Y]€ò\⁄›
N¬àBàY]€ò\⁄›Hù[¬àJN¬àBäN¬Çôÿ›[Y[ùôŸ][[Y[ùûRY
òY\ú€€àäKòY]ô[ù\›[ô\äò€X⁄»ãY\ú€€äN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
õô]‘õ€HäKòY]ô[ù\›[ô\äò⁄[ôŸHã\]Sô]—ò[Z[QöY[ N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
õô]‘\ú€€ìò[YHäKòY]ô[ù\›[ô\äöŸ^Y›€àãù[ò›[€ä]ô[ù
H¬àYà
]ô[ùöŸ^HOOHë[ù\àäHY\ú€€ä
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òYô\€›\òŸHäKòY]ô[ù\›[ô\äò€X⁄»ãYô\€›\òŸJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úô\€›\òŸSò[YHäKòY]ô[ù\›[ô\äöŸ^Y›€àãù[ò›[€ä]ô[ù
H¬àYà
]ô[ùöŸ^HOOHë[ù\àäHYô\€›\òŸJ
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ô[]T\ú€€àäKòY]ô[ù\›[ô\äò€X⁄»ã[]TŸ[X›Y\ú€€äN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ú›\ù›\ŸZ€äKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬à›\ù›\ŸZ€òYù
ù[
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úÿ]ôR›\ŸZ€äKòY]ô[ù\›[ô\äò€X⁄»ãÿ]ôR›\ŸZ€òYù
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òÿ[òŸ[›\ŸZ€äKòY]ô[ù\›[ô\äò€X⁄»ãÿ[òŸ[›\ŸZ€òYù
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
õô]–ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€X\î›]JN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òõ[ö–ÿ\ŸPù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã›\ùõ[ö–ÿ\ŸJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òù[‘[‹Pù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã‹[êù[“[ú]
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ú⁄YXò\ëÿ›[Y[ùòYùù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àÿ›[Y[ùôŸ][[Y[ùûRY
ôÿ›[Y[ùòYù[ú]äKò€X⁄ 
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ù[ô–ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã[ô”\›X›[€äN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úô\Ÿ]ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€X\î›]JN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
úÿ]ôPù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬à^‹ùô ùYJN¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
õÿYù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àÿ›[Y[ùôŸ][[Y[ùûRY
õÿY[ú]äKò€X⁄ 
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
õÿY[ú]äKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\àö[HH]ô[ùù\ôŸ]ôö[\÷ÃN¬àYà
ö[JHÿYŸ[X›Yö[Jö[JN¬à]ô[ùù\ôŸ]ùò[YHHàé¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôÿ›[Y[ùòYùù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àÿ›[Y[ùôŸ][[Y[ùûRY
ôÿ›[Y[ùòYù[ú]äKò€X⁄ 
N¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôÿ›[Y[ùòYù[ú]äKòY]ô[ù\›[ô\äò⁄[ôŸHãù[ò›[€ä]ô[ù
H¬àò\àö[HH]ô[ùù\ôŸ]ôö[\÷ÃN¬àYà
ö[JH‹[ëÿ›[Y[ùòYù
ö[JN¬à]ô[ùù\ôŸ]ùò[YHHàé¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôö]ôP€€õôX›ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àÿÿ][€ãöôYàHãÿ\KŸ€€Ÿ€KX]]ÿX›[€è[Ÿ⁄[âúô]\õïœHà
»[ò€ŸUTíP€€\€ô[ù
ÿÿ][€ãú]ò[YJN¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôö]ôTÿ]ôPù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãÿ]ôP›\úô[ù—ö]ôJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôö]ôTôYúô\⁄ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àôYúô\⁄ö]ôPÿ\Ÿ\ 
Kòÿ]⁄
ù[ò›[€ä\úõ‹äH»⁄›’ÿ\›
\úõ‹ãõY\‹ÿYŸHª( ;'©H:Í™zËg{'a; ‚:Ëg:¨Ë;.j;ef;)‡:ÍÆ˚e¢;"≠z‚‚:‚ÈàäN»JN¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôö]ôSŸ€›]ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬àÿÿ][€ãöôYàHãÿ\KŸ€€Ÿ€KX]]ÿX›[€è[Ÿ€›]	úô]\õïœHà
»[ò€ŸUTíP€€\€ô[ù
ÿÿ][€ãú]ò[YJN¬üJN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôö]ôPÿ\ŸTŸX\ò⁄äKòY]ô[ù\›[ô\äö[ú]ãô[ô\ëö]ôPÿ\Ÿ\ N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òX⁄€õ›€YŸTô]öY]–ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ãX⁄€õ›€YŸTô]öY] N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôòYù\Pù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã\Qÿ›[Y[ùòYù
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôòYùÿ[òŸ[ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€‹ŸQÿ›[Y[ùòYù
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
ôòYù€‹ŸPù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€‹ŸQÿ›[Y[ùòYù
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òù[–\Pù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã\Pù[‘[‹JN¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òù[–ÿ[òŸ[ù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€‹ŸPù[“[ú]
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òù[–€‹ŸPù]€àäKòY]ô[ù\›[ô\äò€X⁄»ã€‹ŸPù[“[ú]
N¬ôÿ›[Y[ùôŸ][[Y[ùûRY
òù[‘[‹R[ú]äKòY]ô[ù\›[ô\äö[ú]ãù[ò›[€ä
H¬àò\à\úŸYH\úŸPù[‘[‹J\Àùò[YJN¬àÿ›[Y[ùôŸ][[Y[ùûRY
òù[“[ú]›]\»äKù^€€ù[ùH\úŸYô\úõ‹úÀõ[ô›à»\úŸYô\úõ‹ú÷ÃBàà
\úŸYúôX€‹ôÀõ[ô›»\úŸYúôX€‹ôÀõ[ô›
»∫Í°{'a;-•:¨ ;eh;"&;'¢;"≠z‚‚:‚ÈààààäN¬üJN¬ùò\àÿ\ŸTÿ]ôPù]€àHÿ›[Y[ùôŸ][[Y[ùûRY
òÿ\ŸTÿ]ôPù]€àäN¬öYà
⁄[ô›Àú\ô[ùOOH⁄[ô› H¬àÿ\ŸTÿ]ôPù]€ãöY[àHò[ŸN¬àÿ\ŸTÿ]ôPù]€ãòY]ô[ù\›[ô\äò€X⁄»ãù[ò›[€ä
H¬à⁄[ô›Àú\ô[ùú‹›Y\‹ÿYŸJ¬à\Nàî–TñQW——Sì—‘êSW‘–UëHãà^[ÿYàî””ãú\úŸJî””ãú›ö[ô⁄YûJ›]JJBàK⁄[ô›Àõÿÿ][€ãõ‹öY⁄[äN¬à⁄›’ÿ\›
ª ´:Ë`;%‰;( ;'©{e¢;"≠z‚‚:‚ÈàäN¬àJN¬à⁄[ô›ÀòY]ô[ù\›[ô\äõY\‹ÿYŸHãù[ò›[€ä]ô[ù
H¬àYà
]ô[ùõ‹öY⁄[àOOH⁄[ô›Àõÿÿ][€ãõ‹öY⁄[à]ô[ùú€›\òŸHOOH⁄[ô›Àú\ô[ù
Hô]\õé¬àYà
]ô[ùô]H	âà]ô[ùô]Kù\HOOHî–TñQW——Sì—‘êSW”–Qà	âà]ô[ùô]Kú^[ÿY
H¬àô[Y[Xô\ï[ô 
N¬à›]HHõ‹õX[^ôT›]Jî””ãú\úŸJî””ãú›ö[ô⁄YûJ]ô[ùô]Kú^[ÿY
JJN¬àòX⁄Ÿ‹õ›[ô[XYŸU\õHù[¬à›\ŸZ€òYùHù[¬à€‹ŸT]ZX⁄—Y]‹ä
N¬à^[›]ò[Z[UôYJ
N¬àô[ô\ä
N¬à⁄›’ÿ\›
∫„ ; ‡{'§;'§:Ë„:Ëg:¨ :¨·:„·;-";%b;'a:È„:‰È;%‚;"≠z‚‚:‚ÈàäN¬àBàJN¬à⁄[ô›Àú\ô[ùú‹›Y\‹ÿYŸJ»\Nàî–TñQW——Sì—‘êSW‘ëPQHàK⁄[ô›Àõÿÿ][€ãõ‹öY⁄[äN¬üBù⁄[ô›ÀòY]ô[ù\›[ô\äöŸ^Y›€àãù[ò›[€ä]ô[ù
H¬àò\à\ôŸ]H]ô[ùù\ôŸ]¬àò\àY”ò[YHH\ôŸ]	âà\ôŸ]ùY”ò[YN¬àò\à\’\[ô»HY”ò[YHOOHíSîUàY”ò[YHOOHïVTëPHàY”ò[YHOOHî—SP’àà
\ôŸ]	âà\ôŸ]ö\–€€ù[ùY]XõJN¬àYà
]ô[ùöŸ^HOOHêòX⁄‹‹XŸHà	âàZ\’\[ô H¬à]ô[ùúô]ô[ùYò][

N¬à]ô[ùú›‹õ‹Yÿ][€ä
N¬à[ô”\›X›[€ä
N¬àô]\õé¬àBàYà
]ô[ùöŸ^HOOHë\ÿÿ\HäH¬à€‹ŸT]ZX⁄—Y]‹ä
N¬àYà
›\ŸZ€òYù
Hÿ[òŸ[›\ŸZ€òYù

N¬àBüKùYJN¬Çôÿ›[Y[ùú]Y\ûTŸ[X›‹ê[
ãú⁄YXò\ã\[ô[äKôõ‹ëXX⁄
ù[ò›[€ä[ô[
H¬à[ô[òY]ô[ù\›[ô\äùŸŸ€Hãù[ò›[€ä
H¬àYà
\[ô[õ‹[äHô]\õé¬àÿ›[Y[ùú]Y\ûTŸ[X›‹ê[
ãú⁄YXò\ã\[ô[äKôõ‹ëXX⁄
ù[ò›[€ä›\äH¬àYà
›\àOOH[ô[
H›\ãõ‹[àHò[ŸN¬àJN¬àJN¬üJN¬ÇúŸ]ö]ôP€€õôX›[€äö]ôP€€õôX›[€äN¬úô[ô\ëö]ôPÿ\Ÿ\ 
N¬ö[ö]X[^ôQö]ôT›‹òYŸJ
N¬úô[ô\ä
N¬