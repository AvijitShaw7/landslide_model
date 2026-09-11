import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = os.path.join(os.path.dirname(__file__), "landslide_model.pkl")

app = FastAPI(
    title="NER Landslide Prediction ML Microservice v2",
    description="GSI Geotechnical-gated FoS/Caine-anchored Random Forest v2 — 6-feature schema",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_clf   = None
_feats = None
_ver   = "v2"

@app.on_event("startup")
def load_model():
    global _clf, _feats, _ver
    if os.path.exists(MODEL_PATH):
        try:
            artifact = joblib.load(MODEL_PATH)
            if isinstance(artifact, dict):
                _clf   = artifact["model"]
                _feats = artifact["features"]
                _ver   = artifact.get("version", "v2")
            else:
                _clf   = artifact
                _feats = ["slope", "rainfall_24h", "soil_moisture", "elevation"]
                _ver   = "v1"
            print(f"[ML Service] Model {_ver} loaded — features: {_feats}")
        except Exception as e:
            print(f"[ML Service] Error loading model: {e}")
    else:
        print(f"[ML Service] Warning: model not found at {MODEL_PATH}")


class PredictionRequest(BaseModel):
    slope:           float = Field(..., description="Terrain slope angle in degrees (0-90)")
    rainfall_24h:    float = Field(..., description="24h accumulated rainfall in mm (0-500)")
    rainfall_72h:    float = Field(default=0.0, description="72h accumulated rainfall in mm (0-1000)")
    api_15d:         float = Field(default=0.0, description="15-day antecedent precipitation index (0-500)")
    soil_moisture:   float = Field(..., description="Volumetric soil moisture percentage (0-100)")
    lithology_index: float = Field(default=3.0, description="Lithology susceptibility 1=Alluvial to 5=Weathered Shale")
    elevation:       float = Field(default=500.0, description="Elevation in metres above sea level")


class FeatureContribution(BaseModel):
    feature:        str
    importance_pct: float
    value:          float
    label:          str


class PredictionResponse(BaseModel):
    risk_probability:      float
    risk_level:            str
    model_type:            str
    feature_contributions: list[FeatureContribution]


FEATURE_LABELS = {
    "slope":           "Slope Gradient",
    "rainfall_24h":    "24h Trigger Rain",
    "rainfall_72h":    "72h Antecedent Rain",
    "api_15d":         "API-15d Index",
    "soil_moisture":   "Soil Moisture Saturation",
    "lithology_index": "Lithological Formation",
}

LITHO_LABELS = {1: "Alluvial", 2: "Semi-Alluvial", 3: "Granite/Crystalline",
                4: "Sandstone", 5: "Weathered Shale"}


@app.get("/")
def health_check():
    return {
        "status":       "healthy",
        "service":      "NER Landslide Risk ML Engine v2",
        "model_loaded": _clf is not None,
        "version":      _ver,
        "features":     _feats,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_landslide_risk(req: PredictionRequest):
    global _clf, _feats
    # Hard gate — flat alluvial plains cannot slide
    if req.slope < 10.0:
        safe_contribs = [
            FeatureContribution(
                feature=f, importance_pct=0.0, value=0.0,
                label="N/A — GSI Flat Plain Gate"
            )
            for f in (FEATURE_LABELS.keys() if _feats is None else _feats)
        ]
        return PredictionResponse(
            risk_probability=2.0,
            risk_level="SAFE",
            model_type="GSI-Gated-v2",
            feature_contributions=safe_contribs,
        )

    if _clf is None:
        if os.path.exists(MODEL_PATH):
            load_model()
        else:
            raise HTTPException(status_code=503, detail="Model not available. Run train.py first.")

    # Build feature row — graceful fallback for v1 models
    if _ver == "v1" or _feats == ["slope", "rainfall_24h", "soil_moisture", "elevation"]:
        features = pd.DataFrame([{
            "slope": req.slope, "rainfall_24h": req.rainfall_24h,
            "soil_moisture": req.soil_moisture, "elevation": req.elevation,
        }])
    else:
        features = pd.DataFrame([{
            "slope":           req.slope,
            "rainfall_24h":    req.rainfall_24h,
            "rainfall_72h":    req.rainfall_72h,
            "api_15d":         req.api_15d,
            "soil_moisture":   req.soil_moisture,
            "lithology_index": req.lithology_index,
        }])

    try:
        proba = _clf.predict_proba(features)[0][1]
        risk_probability = round(float(proba) * 100.0, 1)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Inference error: {err}")

    if risk_probability >= 80.0:
        risk_level = "CRITICAL"
    elif risk_probability >= 60.0:
        risk_level = "HIGH"
    elif risk_probability >= 40.0:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Feature importances from the model
    importances = _clf.feature_importances_
    feature_contribs = []
    for feat, imp in zip(_feats, importances):
        val = getattr(req, feat, 0.0)
        if feat == "lithology_index":
            label_str = LITHO_LABELS.get(int(val), f"Index {val}")
        elif feat == "slope":
            label_str = f"{val:.1f}°"
        elif feat in ("rainfall_24h", "rainfall_72h", "api_15d"):
            label_str = f"{val:.1f} mm"
        elif feat == "soil_moisture":
            label_str = f"{val:.0f}%"
        else:
            label_str = str(val)

        feature_contribs.append(FeatureContribution(
            feature=FEATURE_LABELS.get(feat, feat),
            importance_pct=round(imp * 100.0, 2),
            value=val,
            label=label_str,
        ))

    feature_contribs.sort(key=lambda x: -x.importance_pct)

    return PredictionResponse(
        risk_probability=risk_probability,
        risk_level=risk_level,
        model_type=f"RandomForest-{_ver}-Geotechnical",
        feature_contributions=feature_contribs,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serve:app", host="127.0.0.1", port=8000, reload=False)
