import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException

from app import repositories
from app.params import Params, active
from app.schemas import ConfigVersion, Submission


# shortcut: one static bearer token from env; swap for real auth before production
def require_admin(authorization: str = Header("")) -> None:
    token = os.environ.get("ADMIN_TOKEN")
    if not token or not secrets.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(401, "Admin token required")


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/params")
def get_params() -> Params:
    return active()


@router.put("/params")
def put_params(params: Params) -> ConfigVersion:
    version = repositories.put_config("params", params.model_dump(mode="json"))
    return next(v for v in repositories.list_config("params") if v["version"] == version)


@router.get("/params/versions")
def params_versions() -> list[ConfigVersion]:
    return repositories.list_config("params")


@router.get("/submissions")
def submissions() -> list[Submission]:
    """Everything sent through the simulated channels (applications, USC requests, PUE questions), newest first."""
    return repositories.list_submissions()
