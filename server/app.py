from fastapi import FastAPI, APIRouter
from routers import router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Code supporter server",
    version="v1",
    debug=True,
    reload=True
)
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
