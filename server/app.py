from fastapi import FastAPI
from routers import router
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI object
app = FastAPI(title="Code supporter server", version="v1", debug=True, reload=True)
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
