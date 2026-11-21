"""Dates and adoption entitlements shared by ledger, validation and paperwork (KP art. 183)."""
from datetime import date, timedelta

from app.params import Params
from app.schemas import Plan


def maternity_end_after_death(plan: Plan, p: Params) -> date | None:
    """Last maternity day after a stillbirth or the child's death (KP art. 180^1): 8 weeks after the birth for a death
    within 8 weeks, but no sooner than 7 days after the death; after a later death, 7 days after it."""
    f = plan.family
    if f.child_died_on is None or f.adoption:
        return None
    # shortcut: assumes no child of the birth survived; for twins with a survivor the pool follows the survivors
    # (§ 1 zd. 2), add a survivors count when such a case appears
    seven = f.child_died_on + timedelta(days=p.maternity.after_death_min_days)  # the day of death not counted
    eight = event_date(plan) + timedelta(weeks=p.maternity.stillbirth_weeks)
    return max(eight - timedelta(days=1), seven) if f.child_died_on < eight else seven


def plus_years(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year + years)
    except ValueError:
        return d.replace(year=d.year + years, day=28)


def event_date(plan: Plan) -> date:
    f = plan.family
    a = f.adoption
    if a:
        return max(a.accepted_on, a.court_applied_on or a.accepted_on) if a.kind == "adoption" else a.accepted_on
    return f.birth_date or f.due_date


def adoption_age_limit(plan: Plan, p: Params) -> date | None:
    return max(adoption_age_limits(plan, p), default=None)


def adoption_age_limits(plan: Plan, p: Params) -> list[date]:
    f, a = plan.family, plan.family.adoption
    if not a:
        return []
    facts = [(c.birth_date, c.school_deferred) for c in a.children]
    if not facts and f.birth_date and f.children == 1:
        facts = [(f.birth_date, a.school_deferred)]
    return [plus_years(dob, p.adoption.adoption_age_years if a.kind == "adoption" else
                      p.adoption.foster_deferred_age_years if deferred else p.adoption.foster_age_years)
            for dob, deferred in facts]


def adoption_pools(plan: Plan, p: Params, maternity: int, parental: int) -> tuple[int, int]:
    a = plan.family.adoption
    if not a:
        return maternity, parental
    limit = adoption_age_limit(plan, p)
    limits = adoption_age_limits(plan, p)
    event = event_date(plan)
    dobs = [c.birth_date for c in a.children] or ([plan.family.birth_date] if plan.family.birth_date else [])
    if (limit is None or event >= limit or any(d > a.accepted_on for d in dobs) or a.professional_foster
            or (a.children and len(a.children) != plan.family.children)
            or (a.kind == "adoption" and a.court_applied_on is None)):
        return 0, 0
    start = min((b.start for b in plan.blocks if b.kind == "maternity"), default=event)
    count = sum(event < end for end in limits)
    standard = p.maternity.weeks_by_children[min(count, len(p.maternity.weeks_by_children)) - 1] * 7
    # Re-evaluate the number of eligible siblings on each day (ZUS: age-out reduces the duration).
    remaining = 0
    for n in range(standard):
        alive = sum(max(start, event) + timedelta(days=n) < end for end in limits)
        cap = p.maternity.weeks_by_children[min(alive, len(p.maternity.weeks_by_children)) - 1] * 7 if alive else 0
        if n >= cap:
            break
        remaining += 1
    pp = p.parental
    parental = ((pp.weeks_za_zyciem_multiple if count > 1 else pp.weeks_za_zyciem_single) if plan.family.za_zyciem
                else (pp.weeks_multiple if count > 1 else pp.weeks_single)) * 7
    minimum = p.maternity.adoption_min_weeks * 7
    if remaining <= minimum:
        maternity = minimum
        parental = (p.adoption.short_parental_za_zyciem_weeks if plan.family.za_zyciem
                    else p.adoption.short_parental_weeks) * 7
    else:
        maternity = remaining
    return (max(0, maternity - a.previous_maternity_days),
            max(0, parental - a.previous_parental_mother_days - a.previous_parental_father_days))
