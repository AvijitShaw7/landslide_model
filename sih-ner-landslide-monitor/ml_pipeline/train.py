"""
GSI Geotechnical Landslide Risk Model — Training Script v2

Physics-anchored 6-feature Random Forest:
  Features: slope, rainfall_24h, rainfall_72h, api_15d, soil_moisture, lithology_index

Ground-truth validation:
  - Factor of Safety (FoS) proxy derived from Mohr-Coulomb shear strength theory
  - Caine (1980) rainfall-duration threshold: I = 14.82 * D^(-0.39) (mm/h vs hours)
  - GSI hard gate: slope < 10deg -> label = 0 (flat alluvial plains cannot slide)
  - Lithology: Alluvial=1, Granite/Crystalline=3, Weathered Shale/Sandstone=5
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib

GAMMA   = 18.0
C_BASE  = 12.0
PHI_DEG = 28.0
PHI     = np.radians(PHI_DEG)
H_MEAN  = 6.0
GAMMA_W = 9.81

def lithology_cohesion_factor(li):
    return 1.0 - 0.12 * (li - 1)

def lithology_phi_factor(li):
    return 1.0 - 0.05 * (li - 1)

def compute_fos(slope_deg, rainfall_72h, api_15d, soil_moisture, lithology_index, H=H_MEAN):
    theta  = np.radians(slope_deg)
    sin_t  = np.sin(theta)
    cos_t  = np.cos(theta)
    cos2_t = cos_t ** 2
    c_eff   = C_BASE * lithology_cohesion_factor(lithology_index)
    phi_eff = PHI    * lithology_phi_factor(lithology_index)
    saturation_proxy = (rainfall_72h/350.0)*0.6 + (api_15d/200.0)*0.3 + (soil_moisture/100.0)*0.1
    saturation_proxy = np.clip(saturation_proxy, 0.0, 1.0)
    u = GAMMA_W * H * saturation_proxy * cos2_t
    normal_stress = GAMMA * H * cos2_t
    shear_stress  = GAMMA * H * sin_t * cos_t
    safe_shear = np.where(shear_stress < 0.01, 0.01, shear_stress)
    fos = (c_eff + np.maximum(0.0, normal_stress - u) * np.tan(phi_eff)) / safe_shear
    return fos

def caine_threshold_probability(rainfall_24h, duration_h=24.0):
    i_threshold = 14.82 * (duration_h ** -0.39)
    i_actual    = rainfall_24h / duration_h
    return np.clip(i_actual / i_threshold, 0.0, 3.0)

def generate_geotechnical_dataset(n_samples=20000, random_state=42):
    rng = np.random.default_rng(random_state)
    slope_class = rng.choice([0, 1, 2], size=n_samples, p=[0.22, 0.43, 0.35])
    slope = np.zeros(n_samples)
    slope[slope_class == 0] = rng.uniform(0.5,  9.9,  (slope_class == 0).sum())
    slope[slope_class == 1] = rng.uniform(10.0, 33.0, (slope_class == 1).sum())
    slope[slope_class == 2] = rng.uniform(33.0, 65.0, (slope_class == 2).sum())
    slope = np.round(slope, 1)
    rainfall_24h = np.round(rng.exponential(scale=52, size=n_samples).clip(0, 350), 1)
    rainfall_72h = np.round((rainfall_24h * rng.uniform(1.5, 3.5, n_samples) + rng.exponential(30, n_samples)).clip(0, 700), 1)
    raw_15d = rng.exponential(scale=80, size=n_samples)
    api_15d = np.round(raw_15d.clip(0, 300), 1)
    base_moisture = rng.uniform(20.0, 60.0, n_samples)
    rain_moisture = (rainfall_72h / 500.0) * 40.0
    soil_moisture = np.round(np.clip(base_moisture + rain_moisture + rng.normal(0, 5, n_samples), 10.0, 100.0), 1)
    lithology_dist = rng.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.20, 0.10, 0.25, 0.20, 0.25])
    lithology_dist[slope_class == 0] = rng.choice([1, 2], size=(slope_class == 0).sum(), p=[0.80, 0.20])
    lithology_index = lithology_dist.astype(float)
    fos         = compute_fos(slope, rainfall_72h, api_15d, soil_moisture, lithology_index)
    caine_ratio = caine_threshold_probability(rainfall_24h, duration_h=24.0)
    fos_fail  = fos < 1.0
    marginal  = (fos < 1.15) & (caine_ratio >= 1.3)
    target    = (fos_fail | marginal).astype(int)
    target[slope < 10.0] = 0
    noise_mask = rng.random(n_samples) < 0.02
    target[noise_mask] = 1 - target[noise_mask]
    target[slope < 10.0] = 0
    df = pd.DataFrame({
        "slope":           slope,
        "rainfall_24h":    rainfall_24h,
        "rainfall_72h":    rainfall_72h,
        "api_15d":         api_15d,
        "soil_moisture":   soil_moisture,
        "lithology_index": lithology_index,
        "landslide_target": target.astype(int),
    })
    return df

FEATURE_COLS = ["slope", "rainfall_24h", "rainfall_72h", "api_15d", "soil_moisture", "lithology_index"]

def train_and_export():
    print("================================================================")
    print("  GSI Geotechnical Landslide Risk Model Training v2")
    print("  6-Feature Physics-Anchored Random Forest Classifier")
    print("================================================================")
    print("\n1. Generating 20,000 FoS/Caine-anchored geotechnical observations...")
    df = generate_geotechnical_dataset(n_samples=20000, random_state=42)
    total    = len(df)
    pos      = df["landslide_target"].sum()
    flat_pos = df[df["slope"] < 10.0]["landslide_target"].sum()
    print(f"   Total samples       : {total}")
    print(f"   Positive (failure)  : {pos} ({pos / total * 100:.1f}%)")
    print(f"   Negative (stable)   : {total - pos} ({(total - pos) / total * 100:.1f}%)")
    print(f"   Hard-gate violations: {flat_pos} (must be 0)")
    assert flat_pos == 0, "ERROR: Hard gating rule violated!"
    X = df[FEATURE_COLS]
    y = df["landslide_target"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print("\n2. Training RandomForestClassifier(n_estimators=150, max_depth=9, min_samples_leaf=3)...")
    clf = RandomForestClassifier(
        n_estimators=150, max_depth=9, min_samples_leaf=3, random_state=42, n_jobs=-1
    )
    clf.fit(X_train, y_train)
    print("\n3. Model Evaluation Metrics:")
    y_pred       = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)[:, 1]
    roc_auc      = roc_auc_score(y_test, y_pred_proba)
    print(f"   ROC-AUC Score : {roc_auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Stable (0)", "Landslide Risk (1)"]))
    print("Feature Importances:")
    for col, imp in sorted(zip(FEATURE_COLS, clf.feature_importances_), key=lambda x: -x[1]):
        print(f"   {col:20s}: {imp * 100:.2f}%")
    model_path = os.path.join(os.path.dirname(__file__), "landslide_model.pkl")
    joblib.dump({"model": clf, "features": FEATURE_COLS, "version": "v2"}, model_path)
    print(f"\n4. Saved model artifact -> {model_path}")
    print("================================================================")

if __name__ == "__main__":
    train_and_export()
