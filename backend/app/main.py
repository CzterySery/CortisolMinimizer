import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import repositories
from app.api import admin, calc, cases, catalog, game, gov_mock, info


@asynccontextmanager
async def lifespan(_: FastAPI):
    repositories.init()
    yield


app = FastAPI(title="Cortisol Minimizer API", version="0.1.0", lifespan=lifespan)
# The frontend calls the API server-side (Next proxy); CORS only matters for direct browser use, e.g. /docs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
for module in (catalog, calc, game, cases, gov_mock, info, admin):
    app.include_router(module.router, prefix="/api/v1")
