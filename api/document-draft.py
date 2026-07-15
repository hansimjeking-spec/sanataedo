import base64
import io
import json
import re
import tempfile
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler
from pathlib import Path


class CellParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.current_table = None
        self.current_row = None
        self.current_cell = None
        self.current_text = []
        self.paragraph_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.current_table = []
        elif tag == "tr" and self.current_table is not None:
            self.current_row = []
        elif tag == "td" and self.current_row is not None:
            self.current_cell = []
        elif tag == "p":
            self.paragraph_depth += 1

    def handle_endtag(self, tag):
        if tag == "td" and self.current_cell is not None:
            value = " ".join("".join(self.current_cell).split())
            self.current_row.append(value)
            self.current_cell = None
        elif tag == "tr" and self.current_row is not None:
            self.current_table.append(self.current_row)
            self.current_row = None
        elif tag == "table" and self.current_table is not None:
            self.tables.append(self.current_table)
            self.current_table = None
        elif tag == "p":
            self.paragraph_depth = max(0, self.paragraph_depth - 1)

    def handle_data(self, data):
        if self.current_cell is not None:
            self.current_cell.append(data)


def clean_text(value):
    value = re.sub(r"\s+", " ", value or "")
    return value.strip()


def hwp_text(data):
    from hwp5.hwp5html import HTMLTransform
    from hwp5.xmlmodel import Hwp5File

    source = tempfile.NamedTemporaryFile(suffix=".hwp", delete=False)
    source.write(data)
    source.close()
    output = io.BytesIO()
    try:
        document = Hwp5File(source.name)
        try:
            HTMLTransform().transform_hwp5_to_xhtml(document, output)
        finally:
            document.close()
    finally:
        Path(source.name).unlink(missing_ok=True)
    parser = CellParser()
    parser.feed(output.getvalue().decode("utf-8", errors="replace"))
    rows = []
    for table in parser.tables:
        rows.extend(" | ".join(cell for cell in row if cell) for row in table if any(row))
    return "\n".join(rows), parser.tables


def pdf_text(data):
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages), []


def first_match(text, patterns):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return clean_text(match.group(1))
    return ""


def infer_gender(relation):
    if relation in {"모", "어머니", "딸", "여동생", "누나", "언니", "여"}:
        return "female"
    if relation in {"부", "아버지", "아들", "남동생", "형", "오빠", "남"}:
        return "male"
    return "other"


def infer_role(relation):
    if relation in {"모", "어머니", "부", "아버지", "부모"}:
        return "parent"
    if relation in {"배우자", "남편", "아내", "파트너"}:
        return "spouse"
    if relation in {"자녀", "아들", "딸"}:
        return "child"
    if relation in {"손자", "손녀", "손주"}:
        return "grandchild"
    return "sibling"


def row_family_candidates(tables):
    candidates = []
    relation_words = {"모", "부", "어머니", "아버지", "배우자", "남편", "아내", "파트너", "형제", "자매", "오빠", "언니", "형", "누나", "남동생", "여동생", "자녀", "아들", "딸", "손자", "손녀"}
    for table in tables:
        for row in table:
            if not row or not row[0].strip().isdigit():
                continue
            values = [clean_text(cell) for cell in row]
            relation = next((value for value in values[1:4] if value in relation_words), "")
            if not relation:
                continue
            year = first_match(" ".join(values), [r"(\d{4})\s*년?\s*생", r"(\d{4})[.\-/]"])
            name = values[2] if len(values) > 2 and values[2] not in {"x", "X"} else ""
            note = values[-1] if values and values[-1] not in {"x", "X"} else ""
            candidates.append({"relation": relation, "name": name, "birthYear": year, "note": note})
    return candidates


def make_draft(text, tables, file_name):
    compact = clean_text(re.sub(r"\s*\|\s*", " ", text))
    client_name = first_match(compact, [r"성명\s+([가-힣A-Za-z][가-힣A-Za-z· ]{1,20}?)\s+나이", r"클라이언트\s+및\s+가족\s+현황\s+성명\s+([가-힣A-Za-z][가-힣A-Za-z· ]{1,20}?)\s+나이"])
    client_name = client_name or Path(file_name).stem or "중심 인물"
    birth_year = first_match(compact, [r"생년월일\s+(\d{4})", r"생년월일\s*[:：]?\s*(\d{4})"])
    gender_value = first_match(compact, [r"성별\s+(남|여)", r"성별\s*[:：]?\s*(남|여)"])
    client_gender = "male" if gender_value == "남" else "female" if gender_value == "여" else "other"
    client_id = "client"
    people = [{
        "id": client_id,
        "name": client_name,
        "gender": client_gender,
        "genderUnknown": not bool(gender_value),
        "role": "client",
        "generation": 0,
        "birthYear": birth_year,
        "deathYear": "",
        "deathYearUnknown": False,
        "deceased": False,
        "x": 550,
        "y": 420,
        "resources": []
    }]
    groups = []
    links = []
    parents = []
    siblings = []
    children = []
    spouses = []
    candidates = row_family_candidates(tables)
    seen = set()
    for index, item in enumerate(candidates):
        relation = item["relation"]
        key = (relation, item["name"], item["birthYear"])
        if key in seen:
            continue
        seen.add(key)
        role = infer_role(relation)
        person_id = "person-" + str(index + 1)
        name = item["name"] or (relation + (" (이름 미상)" if relation else ""))
        person = {
            "id": person_id,
            "name": name,
            "gender": infer_gender(relation),
            "genderUnknown": infer_gender(relation) == "other",
            "role": role,
            "generation": -1 if role == "parent" else 1 if role == "child" else 0,
            "birthYear": item["birthYear"],
            "deathYear": "",
            "deathYearUnknown": False,
            "deceased": False,
            "birthOrderUnknown": role in {"child", "grandchild"},
            "x": 300 + (index % 4) * 180,
            "y": 180 if role == "parent" else 650 if role == "child" else 420,
            "resources": []
        }
        people.append(person)
        if role == "parent":
            parents.append(person_id)
        elif role == "child":
            children.append(person_id)
        elif role == "sibling":
            siblings.append(person_id)
        elif role == "spouse":
            spouses.append(person_id)
    status = "widowed" if "사별" in compact else "married"
    if parents:
        origin_children = siblings + [client_id]
        groups.append({"id": "family-origin", "parents": parents[:2], "children": origin_children, "status": status, "childTypes": {person_id: "biological" for person_id in origin_children}})
    if children:
        parent_ids = [client_id] + spouses[:1]
        groups.append({"id": "family-children", "parents": parent_ids, "children": children, "status": status if spouses else "married", "childTypes": {person_id: "biological" for person_id in children}})
    if spouses:
        if not children:
            groups.append({"id": "family-partner", "parents": [client_id, spouses[0]], "children": [], "status": status, "childTypes": {}})
    resources = []
    ignored_resources = {"진단병원", "병원", "의료기관"}
    for name in sorted(set(re.findall(r"[가-힣A-Za-z0-9]+(?:병원|센터|복지관|주민센터|지원센터)", compact)) - ignored_resources):
        sentences = [part for part in re.split(r"[.!?。\n]", text) if name in part]
        resources.append({
            "id": "resource-" + str(len(resources) + 1),
            "type": "care",
            "name": name,
            "memo": "\n".join(sentences[:3]) or "문서에서 확인된 의료·지원 자원",
            "supports": ["정기 진료·건강관리"],
            "relationship": "good",
            "direction": "both",
            "x": 820,
            "y": 300 + len(resources) * 100,
            "width": 180,
            "height": 88
        })
    people[0]["resources"] = resources
    warnings = ["문서에서 확인되지 않은 성별·출생순서·사망정보는 미상으로 표시했습니다."]
    if not candidates:
        warnings.append("가족사항 표에서 인식된 가족 구성원이 없습니다. 초안에 직접 추가해 주세요.")
    return {
        "version": 7,
        "title": client_name + " 문서 분석 초안",
        "selectedId": client_id,
        "selectedResourceId": None,
        "selectedLinkId": None,
        "people": people,
        "familyGroups": groups,
        "households": [],
        "links": links,
        "source": {"fileName": file_name, "draftVersion": 2, "warnings": warnings}
    }


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 12 * 1024 * 1024:
                return self._json(413, {"error": "파일 크기는 12MB 이하만 지원합니다."})
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            file_name = str(payload.get("fileName", "document"))
            data = base64.b64decode(payload.get("data", ""))
            if file_name.lower().endswith(".pdf"):
                text, tables = pdf_text(data)
            elif file_name.lower().endswith(".hwp"):
                text, tables = hwp_text(data)
            else:
                return self._json(400, {"error": "PDF 또는 HWP 파일만 지원합니다."})
            draft = make_draft(text, tables, file_name)
            return self._json(200, {"draft": draft, "extractedCharacters": len(text)})
        except Exception as error:
            return self._json(500, {"error": "문서를 분석하지 못했습니다.", "detail": str(error)[:300]})
