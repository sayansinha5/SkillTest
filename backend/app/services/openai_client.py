import json
import re
from typing import Any

from openai import OpenAI

from app.core.config import get_settings


def _client() -> OpenAI:
    settings = get_settings()
    if not settings.ai_api_key:
        raise RuntimeError("AI_API_KEY is not set in the environment")
    return OpenAI(api_key=settings.ai_api_key)


def _parse_json_content(content: str) -> Any:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    return json.loads(content)


def extract_chapters_from_text(book_text: str) -> list[dict[str, str]]:
    settings = get_settings()
    # Cap prompt size for PoC cost/latency
    clipped = book_text[:12000]
    client = _client()
    completion = client.chat.completions.create(
        model=settings.ai_model,
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": (
                    "You analyze textbook text and return JSON only. "
                    'Schema: {"chapters":[{"key":"ch1","title":"...","summary":"one sentence"}]} '
                    "Identify 3-12 logical chapters or sections. Use short keys like ch1, ch2."
                ),
            },
            {"role": "user", "content": clipped},
        ],
    )
    raw = completion.choices[0].message.content or "{}"
    data = _parse_json_content(raw)
    chapters = data.get("chapters") if isinstance(data, dict) else None
    if not chapters or not isinstance(chapters, list):
        raise RuntimeError("OpenAI did not return a chapters list")
    cleaned = []
    for i, ch in enumerate(chapters):
        cleaned.append(
            {
                "key": str(ch.get("key") or f"ch{i+1}"),
                "title": str(ch.get("title") or f"Chapter {i+1}"),
                "summary": str(ch.get("summary") or ""),
            }
        )
    return cleaned


def generate_mcqs(
    chapter_blocks: list[dict[str, str]],
    total_questions: int,
    weights: dict[str, float],
) -> list[dict[str, Any]]:
    settings = get_settings()
    # Allocate questions by weight
    keys = [b["key"] for b in chapter_blocks]
    if not keys:
        raise ValueError("No chapters selected")
    raw_counts = []
    remaining = total_questions
    for i, key in enumerate(keys):
        w = float(weights.get(key, 0))
        if i == len(keys) - 1:
            count = max(0, remaining)
        else:
            count = max(0, round(total_questions * (w / 100.0)))
            remaining -= count
        raw_counts.append((key, count))
    # Ensure at least total_questions by adjusting last
    assigned = sum(c for _, c in raw_counts)
    if assigned != total_questions and raw_counts:
        k, c = raw_counts[-1]
        raw_counts[-1] = (k, max(0, c + (total_questions - assigned)))

    blocks_by_key = {b["key"]: b for b in chapter_blocks}
    client = _client()
    questions: list[dict[str, Any]] = []

    for key, count in raw_counts:
        if count <= 0:
            continue
        block = blocks_by_key[key]
        text = (block.get("content") or block.get("summary") or block.get("title") or "")[:6000]
        completion = client.chat.completions.create(
            model=settings.ai_model,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Create school-level multiple-choice questions. Return JSON only: "
                        '{"questions":[{"stem":"...","options":{"A":"...","B":"...","C":"...","D":"..."},'
                        '"correct_option":"A","marks":1}]} '
                        "correct_option must be one of A,B,C,D."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Chapter: {block.get('title', key)}\n"
                        f"Create exactly {count} MCQs from this content:\n{text}"
                    ),
                },
            ],
        )
        raw = completion.choices[0].message.content or "{}"
        data = _parse_json_content(raw)
        qlist = data.get("questions") if isinstance(data, dict) else None
        if not qlist:
            raise RuntimeError(f"OpenAI returned no questions for {key}")
        for q in qlist[:count]:
            options = q.get("options") or {}
            questions.append(
                {
                    "chapter_key": key,
                    "stem": str(q.get("stem") or "").strip(),
                    "options": {
                        "A": str(options.get("A", "")),
                        "B": str(options.get("B", "")),
                        "C": str(options.get("C", "")),
                        "D": str(options.get("D", "")),
                    },
                    "correct_option": str(q.get("correct_option") or "A").strip().upper()[:1],
                    "marks": int(q.get("marks") or 1),
                }
            )

    if len(questions) == 0:
        raise RuntimeError("No questions generated")
    return questions[:total_questions]


def _report_completion(system: str, payload: dict) -> dict:
    settings = get_settings()
    completion = _client().chat.completions.create(
        model=settings.ai_model,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )
    data = _parse_json_content(completion.choices[0].message.content or "{}")
    if not isinstance(data, dict) or not data.get("summary"):
        raise RuntimeError("OpenAI did not return a report")
    return data


def write_student_report(student_name: str, scored: dict) -> dict[str, Any]:
    missed = [
        {
            "chapter": q["chapter"],
            "question": q["stem"],
            "chosen": q["options"].get(q["selected_option"]) if q["selected_option"] else None,
            "correct": q["options"].get(q["correct_option"]),
        }
        for q in scored["questions"]
        if not q["is_correct"]
    ]
    data = _report_completion(
        (
            "You are a supportive school teacher writing a short report card for one student after an MCQ test. "
            "Base every point only on the provided results. Return JSON only: "
            '{"summary":"2-3 sentences","strengths":["..."],"gaps":["..."],"next_steps":["..."]} '
            "Refer to chapters/topics by name. Keep each list to at most 3 short items; use [] if none apply."
        ),
        {
            "student": student_name,
            "score": scored["score"],
            "max_score": scored["max_score"],
            "chapters": scored["chapters"],
            "missed_questions": missed,
        },
    )
    return {
        "summary": str(data.get("summary", "")),
        "strengths": [str(s) for s in data.get("strengths") or []],
        "gaps": [str(s) for s in data.get("gaps") or []],
        "next_steps": [str(s) for s in data.get("next_steps") or []],
    }


def write_class_report(exam_name: str, class_data: dict) -> dict[str, Any]:
    data = _report_completion(
        (
            "You are an experienced teacher reviewing class results of an MCQ test to decide what to reteach "
            "and which students need attention. Base every point only on the provided data. Return JSON only: "
            '{"summary":"2-3 sentences","strong_areas":["..."],"weak_areas":["..."],'
            '"students_needing_attention":[{"name":"...","reason":"..."}],"teaching_suggestions":["..."]} '
            "Keep each list to at most 4 short items; use [] if none apply."
        ),
        {"exam": exam_name, **class_data},
    )
    return {
        "summary": str(data.get("summary", "")),
        "strong_areas": [str(s) for s in data.get("strong_areas") or []],
        "weak_areas": [str(s) for s in data.get("weak_areas") or []],
        "students_needing_attention": [
            {"name": str(s.get("name", "")), "reason": str(s.get("reason", ""))}
            for s in data.get("students_needing_attention") or []
            if isinstance(s, dict)
        ],
        "teaching_suggestions": [str(s) for s in data.get("teaching_suggestions") or []],
    }
