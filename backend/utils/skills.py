"""
Skill extraction, gap analysis, ATS scoring, and improvement suggestions.

Extracts skills from resume text, compares to role requirements,
computes ATS score, and generates recommendations.
"""

from __future__ import annotations

import re
from typing import Dict, List, Set

# Common skills lexicon (expand as needed; can be loaded from DB later)
TECH_SKILLS = {
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "rust",
    "sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    "react", "vue", "angular", "node.js", "django", "flask", "fastapi",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
    "nlp", "computer vision", "data science", "pandas", "numpy",
    "rest api", "graphql", "microservices", "agile", "scrum", "git", "ci/cd", "linux",
    "html", "css", "tailwind", "sass", "redux", "webpack",
}
SOFT_SKILLS = {
    "leadership", "communication", "problem solving", "teamwork", "time management",
    "project management", "critical thinking", "adaptability", "creativity",
}

ALL_SKILLS = TECH_SKILLS | SOFT_SKILLS

# Skills typically required for each job role (for gap analysis)
ROLE_SKILLS: Dict[str, Set[str]] = {
    "data_science": {
        "python", "sql", "machine learning", "data science", "pandas", "numpy",
        "tensorflow", "pytorch", "scikit-learn", "nlp", "deep learning",
        "communication", "problem solving",
    },
    "software_developer": {
        "python", "java", "javascript", "typescript", "sql", "react", "node.js",
        "git", "rest api", "docker", "agile", "communication", "problem solving",
    },
    "devops": {
        "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "jenkins",
        "ci/cd", "git", "linux", "communication", "problem solving",
    },
    "cybersecurity": {
        "python", "sql", "communication", "problem solving", "critical thinking",
    },
    "database": {
        "sql", "mongodb", "postgresql", "mysql", "redis", "python",
        "communication", "problem solving",
    },
}


def extract_skills(resume_text: str) -> List[str]:
    """
    Extract skills mentioned in resume text by matching against a lexicon.

    Args:
        resume_text: Raw resume content (plain text).

    Returns:
        Sorted list of unique skills found in the resume.
    """
    if not resume_text or not isinstance(resume_text, str):
        return []

    # Normalize: lowercase, collapse whitespace
    text = resume_text.lower().strip()
    text = re.sub(r"\s+", " ", text)

    found: Set[str] = set()
    all_skills = TECH_SKILLS | SOFT_SKILLS

    for skill in all_skills:
        # Word-boundary aware match to avoid substrings (e.g. "java" in "javascript")
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            found.add(skill)

    return sorted(found)


def get_skill_gaps(
    extracted_skills: List[str],
    target_role: str,
) -> List[str]:
    """
    Return skills missing from resume that are typical for the target role.

    Args:
        extracted_skills: Skills found in the resume.
        target_role: Predicted or target job role (e.g. data_science, software_developer).

    Returns:
        Sorted list of missing skills for the target role.
    """
    extracted_set = set(s.lower() for s in extracted_skills)
    role_skills = ROLE_SKILLS.get(
        target_role.lower().replace(" ", "_"),
        set(),
    )
    if not role_skills:
        return []
    missing = role_skills - extracted_set
    return sorted(missing)


def compute_ats_score(
    extracted_skills: List[str],
    missing_skills: List[str],
    confidence_score: float,
    target_role: str,
) -> int:
    """
    Compute ATS/resume compatibility score (0-100).

    Based on: keyword coverage, confidence in role match, skill gap.
    """
    role_skills = ROLE_SKILLS.get(
        target_role.lower().replace(" ", "_"),
        ALL_SKILLS,
    )
    if not role_skills:
        return min(100, max(0, int(confidence_score * 0.8)))

    # Keyword match: % of role skills present
    extracted_set = set(s.lower() for s in extracted_skills)
    matched = len(role_skills & extracted_set)
    keyword_score = (matched / len(role_skills)) * 40 if role_skills else 0

    # Confidence contributes up to 40
    conf_score = min(confidence_score / 100.0, 1.0) * 40

    # Fewer missing skills = higher score (up to 20)
    total_expected = len(role_skills) + len(missing_skills)
    gap_penalty = (len(missing_skills) / max(total_expected, 1)) * 20
    gap_score = 20 - gap_penalty

    total = keyword_score + conf_score + max(0, gap_score)
    return min(100, max(0, int(round(total))))


def get_improvement_suggestions(
    extracted_skills: List[str],
    missing_skills: List[str],
    ats_score: int,
    confidence_score: float,
    target_role: str,
) -> List[str]:
    """
    Generate personalized improvement suggestions.
    """
    suggestions: List[str] = []

    if missing_skills:
        top_missing = missing_skills[:5]
        suggestions.append(
            f"Add these skills for {target_role}: {', '.join(top_missing)}."
        )

    if ats_score < 70:
        suggestions.append("Add more keywords relevant to your target role.")
        suggestions.append("Include quantifiable achievements (metrics, percentages).")

    if len(extracted_skills) < 5:
        suggestions.append("List more technical and soft skills explicitly.")

    if confidence_score < 70:
        suggestions.append("Strengthen role-specific language and experience descriptions.")

    suggestions.append("Use a clean, ATS-friendly format with clear section headers.")
    suggestions.append(f"Tailor your resume for \"{target_role}\" roles.")

    return suggestions
