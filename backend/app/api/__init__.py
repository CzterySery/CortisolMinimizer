from fastapi import HTTPException


def todo(step: int):
    """Typed stub: the route and its models are final, the body lands in plan build step `step`."""
    raise HTTPException(501, f"Not implemented yet (plan build step {step})")
