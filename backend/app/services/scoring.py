import json

from app.models.entities import Question, QuestionPaper


def chapter_titles(paper: QuestionPaper | None) -> dict[str, str]:
    if not paper or not paper.chapters_json:
        return {}
    try:
        chapters = json.loads(paper.chapters_json).get("chapters") or []
    except (ValueError, AttributeError):
        return {}
    return {c.get("key", ""): c.get("title", "") for c in chapters}


def score_attempt(
    questions: list[Question],
    selected: dict[int, str | None],
    titles: dict[str, str],
) -> dict:
    """Compare each selected option with the stored correct option."""
    details = []
    chapters: dict[str, dict] = {}
    score = 0
    max_score = 0
    for q in questions:
        choice = selected.get(q.id)
        correct = choice == q.correct_option
        max_score += q.marks
        if correct:
            score += q.marks
        title = titles.get(q.chapter_key) or q.chapter_key or "General"
        bucket = chapters.setdefault(title, {"chapter": title, "correct": 0, "wrong": 0, "unanswered": 0})
        bucket["correct" if correct else ("unanswered" if not choice else "wrong")] += 1
        details.append(
            {
                "question_id": q.id,
                "chapter": title,
                "stem": q.stem,
                "options": json.loads(q.options_json),
                "selected_option": choice,
                "correct_option": q.correct_option,
                "is_correct": correct,
                "marks": q.marks,
            }
        )
    return {
        "score": score,
        "max_score": max_score,
        "questions": details,
        "chapters": list(chapters.values()),
    }
