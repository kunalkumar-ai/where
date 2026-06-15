from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import map, recommend, plan
from services.data_loader import load_all_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_data()
    yield


app = FastAPI(title="Where API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(map.router, prefix="/api/map-data")
app.include_router(recommend.router, prefix="/api")
app.include_router(plan.router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
