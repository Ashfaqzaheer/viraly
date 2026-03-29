from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .scripts import generate_scripts, generate_initial_script, generate_more_scripts, generate_execution_guide
from .feedback import analyze_reel
from .virality import predict_virality
from .trends import refresh_trends

app = FastAPI(title="Viraly AI Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


class GenerateScriptsRequest(BaseModel):
    creatorId: str
    niche: str
    date: str  # YYYY-MM-DD UTC
    idea: str | None = None
    trendContext: dict | None = None


# ---------------------------------------------------------------------------
# POST /generate-scripts (legacy — returns 1 script now)
# ---------------------------------------------------------------------------
@app.post("/generate-scripts")
async def generate_scripts_endpoint(request: GenerateScriptsRequest):
    try:
        scripts = await generate_scripts(request.niche, request.idea)
        return {"creatorId": request.creatorId, "date": request.date, "scripts": scripts}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# ---------------------------------------------------------------------------
# POST /scripts/initial — Step 1: Generate 1 script
# ---------------------------------------------------------------------------
@app.post("/scripts/initial")
async def scripts_initial_endpoint(request: GenerateScriptsRequest):
    try:
        script = await generate_initial_script(
            request.niche,
            request.idea or f"{request.niche} content",
            trend_context=request.trendContext,
        )
        return {"script": script}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


class GenerateMoreRequest(BaseModel):
    niche: str
    idea: str
    trendContext: dict | None = None


# ---------------------------------------------------------------------------
# POST /scripts/more — Step 2: Generate 3 unique scripts
# ---------------------------------------------------------------------------
@app.post("/scripts/more")
async def scripts_more_endpoint(request: GenerateMoreRequest):
    try:
        scripts = await generate_more_scripts(
            request.niche, request.idea,
            trend_context=request.trendContext,
        )
        return {"scripts": scripts}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


class ExecutionGuideRequest(BaseModel):
    niche: str
    idea: str
    hook: str
    concept: str


# ---------------------------------------------------------------------------
# POST /scripts/guide — Step 3: Full execution guide
# ---------------------------------------------------------------------------
@app.post("/scripts/guide")
async def scripts_guide_endpoint(request: ExecutionGuideRequest):
    try:
        guide = await generate_execution_guide(request.niche, request.idea, request.hook, request.concept)
        return {"guide": guide}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


class AnalyzeReelRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# POST /analyze-reel
# Requirements: 5.2, 5.3, 5.5
# ---------------------------------------------------------------------------
@app.post("/analyze-reel")
async def analyze_reel_endpoint(request: AnalyzeReelRequest):
    """
    Analyze a reel URL and return structured feedback scores + commentary.
    Retries once on AI provider error. Enforces 30-second response time.
    """
    try:
        feedback = await analyze_reel(request.url)
        return feedback
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


class PredictViralityRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# POST /predict-virality
# Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
# ---------------------------------------------------------------------------
@app.post("/predict-virality")
async def predict_virality_endpoint(request: PredictViralityRequest):
    """
    Predict virality score, reach range, and improvement suggestions for a reel.
    Retries once on AI provider error. Enforces 15-second response time.
    """
    try:
        prediction = await predict_virality(request.url)
        return prediction
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})


# ---------------------------------------------------------------------------
# POST /refresh-trends
# Requirements: 7.1, 7.5
# ---------------------------------------------------------------------------
@app.post("/refresh-trends")
async def refresh_trends_endpoint():
    """
    Generate/fetch trending content formats and return an array of trend objects.
    Retries once on AI provider error.
    """
    try:
        trends = await refresh_trends()
        return {"trends": trends}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unavailable", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})
