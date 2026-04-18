"""
search.py — Best-First Search for Skill & Job Matching
=======================================================

This module implements Best-First Search (Greedy) to find the optimal
skill-match path between a resume and a job description.

ALGORITHM OVERVIEW
------------------
State       : A subset of JD-required skills identified in the resume so far.
Initial     : Empty set (no skills matched yet).
Goal        : All required JD skills found in resume, or max depth reached.
h(n)        : Composite heuristic score — how "close" the current skill set
              brings us to a perfect match (higher = better).
Frontier    : A max-heap (priority queue) ordered by h(n).
Expansion   : At each step, pop the best node and expand by adding one more
              unvisited skill candidate from the resume.

WHY BEST-FIRST?
---------------
Job-skill matching is naturally a search problem: we explore which combinations
of resume skills best satisfy the job description. Best-First Search greedily
pursues the most promising skill combination at each step, guided by the
heuristic h(n), without backtracking — mirroring how a recruiter quickly
shortlists candidates.
"""

import heapq
from dataclasses import dataclass, field
from typing import Any
from analyzer.heuristics import (
    extract_skills,
    composite_heuristic,
    skill_match_score,
    keyword_match_score,
)
from analyzer.similarity import tokenize, compute_similarity_score


# ---------------------------------------------------------------------------
# Search node
# ---------------------------------------------------------------------------

@dataclass(order=True)
class SearchNode:
    """
    A node in the Best-First Search tree.

    priority    : Negative heuristic score (min-heap → max score first).
    depth       : Number of expansion steps taken to reach this node.
    matched     : Frozenset of skills matched so far.
    heuristic   : h(n) — composite quality score for this skill subset.
    path        : Ordered list of skills added at each expansion step.
    """
    priority:  float
    depth:     int
    matched:   frozenset = field(compare=False)
    heuristic: float     = field(compare=False)
    path:      list      = field(compare=False)


# ---------------------------------------------------------------------------
# Best-First Search
# ---------------------------------------------------------------------------

def best_first_search(
    resume_text: str,
    jd_text: str,
    max_depth: int = 12,
    beam_width: int | None = None,
) -> dict[str, Any]:
    """
    Best-First Search over the skill-match space.

    Parameters
    ----------
    resume_text : Full text of the candidate's resume.
    jd_text     : Full text of the job description.
    max_depth   : Maximum expansion depth (prevents infinite loops).
    beam_width  : If set, limits frontier size (Beam Search variant).

    Returns
    -------
    dict with:
        best_node       — highest-scoring skill combination found
        search_trace    — step-by-step expansion log (for UI visualisation)
        all_nodes       — all explored nodes sorted by score
        goal_reached    — True if all JD skills were matched
        stats           — nodes explored, max depth reached, etc.
    """

    # --- Setup ---
    resume_skills = extract_skills(resume_text)
    jd_skills     = set(extract_skills(jd_text)) if jd_text.strip() else set()

    if not resume_skills:
        return _empty_result("No recognizable skills found in resume.")

    # When no JD provided: treat all resume skills as the target set
    # (we search over the resume's own skill landscape)
    if not jd_skills:
        jd_skills = set(resume_skills)   # self-comparison mode

    # Sort candidate skills by JD relevance (skills in JD first)
    candidates = sorted(
        resume_skills,
        key=lambda s: (s in jd_skills, resume_skills.count(s)),
        reverse=True,
    )

    # --- Initial node: empty skill set ---
    initial_h = _heuristic(frozenset(), resume_text, jd_text, jd_skills)
    initial_node = SearchNode(
        priority  = -initial_h,
        depth     = 0,
        matched   = frozenset(),
        heuristic = initial_h,
        path      = [],
    )

    frontier: list[SearchNode] = []
    heapq.heappush(frontier, initial_node)

    visited:    set[frozenset]  = set()
    all_nodes:  list[SearchNode] = []
    search_trace: list[dict]    = []

    best_node    = initial_node
    nodes_explored = 0

    # --- Search loop ---
    while frontier:
        node = heapq.heappop(frontier)

        if node.matched in visited:
            continue
        visited.add(node.matched)

        all_nodes.append(node)
        nodes_explored += 1

        # Track best node seen
        if node.heuristic > best_node.heuristic:
            best_node = node

        # Log this step for UI trace
        search_trace.append({
            "step":         nodes_explored,
            "depth":        node.depth,
            "matched_skills": sorted(node.matched),
            "heuristic":    round(node.heuristic, 2),
            "added_skill":  node.path[-1] if node.path else None,
        })

        # Goal test: all JD skills matched
        if jd_skills.issubset(node.matched):
            return _build_result(
                best_node, search_trace, all_nodes,
                resume_text, jd_text, jd_skills, nodes_explored,
                goal_reached=True,
            )

        # Depth limit
        if node.depth >= max_depth:
            continue

        # --- Expand: try adding each unvisited candidate skill ---
        children = []
        for skill in candidates:
            if skill in node.matched:
                continue
            new_matched = node.matched | {skill}
            if new_matched in visited:
                continue

            h = _heuristic(new_matched, resume_text, jd_text, jd_skills)
            child = SearchNode(
                priority  = -h,
                depth     = node.depth + 1,
                matched   = new_matched,
                heuristic = h,
                path      = node.path + [skill],
            )
            children.append(child)

        # Beam Search variant: keep only top-k children
        if beam_width:
            children = sorted(children)[:beam_width]

        for child in children:
            heapq.heappush(frontier, child)

    # Frontier exhausted — return best found
    return _build_result(
        best_node, search_trace, all_nodes,
        resume_text, jd_text, jd_skills, nodes_explored,
        goal_reached=False,
    )


# ---------------------------------------------------------------------------
# Heuristic function h(n)
# ---------------------------------------------------------------------------

def _heuristic(
    matched: frozenset,
    resume_text: str,
    jd_text: str,
    jd_skills: set[str],
) -> float:
    """
    h(n) for a given matched skill set.

    Combines:
        1. Fraction of JD skills already matched   (50%)
        2. Keyword overlap heuristic               (30%)
        3. Cosine similarity of full texts         (20%)

    This estimate is admissible — it never overestimates the true match quality.
    """
    if not jd_skills:
        return 0.0

    # Component 1: skill coverage
    skill_coverage = len(matched & jd_skills) / len(jd_skills)

    # Component 2: keyword match from full resume
    kw = keyword_match_score(resume_text, jd_text) if jd_text.strip() else {"score": 0.5}
    kw_score = kw["score"]

    # Component 3: cosine similarity
    sim = compute_similarity_score(resume_text, jd_text if jd_text.strip() else resume_text)
    cos_score = sim["cosine_score"]

    return round(0.50 * skill_coverage + 0.30 * kw_score + 0.20 * cos_score, 4)


# ---------------------------------------------------------------------------
# Result builders
# ---------------------------------------------------------------------------

def _build_result(
    best_node: SearchNode,
    search_trace: list[dict],
    all_nodes: list[SearchNode],
    resume_text: str,
    jd_text: str,
    jd_skills: set[str],
    nodes_explored: int,
    goal_reached: bool,
) -> dict[str, Any]:
    matched = best_node.matched
    missing = jd_skills - matched

    # Full composite score on best node's skill set
    full = composite_heuristic(resume_text, jd_text)

    return {
        "algorithm":        "Best-First Search (Greedy)",
        "goal_reached":     goal_reached,
        "best_match": {
            "matched_skills": sorted(matched),
            "missing_skills": sorted(missing),
            "heuristic_h":    round(best_node.heuristic * 100, 2),
            "depth":          best_node.depth,
            "path":           best_node.path,
            "match_rate":     round(len(matched & jd_skills) / max(len(jd_skills), 1) * 100, 1),
        },
        "composite_score":  full,
        "search_trace":     search_trace,
        "all_nodes": [
            {
                "matched": sorted(n.matched),
                "heuristic": round(n.heuristic * 100, 2),
                "depth": n.depth,
            }
            for n in sorted(all_nodes, key=lambda x: -x.heuristic)[:20]
        ],
        "stats": {
            "nodes_explored":     nodes_explored,
            "max_depth_reached":  max((n.depth for n in all_nodes), default=0),
            "total_jd_skills":    len(jd_skills),
            "total_resume_skills": len(extract_skills(resume_text)),
        },
    }


def _empty_result(reason: str) -> dict[str, Any]:
    return {
        "algorithm":    "Best-First Search (Greedy)",
        "goal_reached": False,
        "error":        reason,
        "best_match":   {},
        "composite_score": {},
        "search_trace": [],
        "all_nodes":    [],
        "stats":        {},
    }