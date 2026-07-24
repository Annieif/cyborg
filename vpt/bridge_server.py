"""
VPT Bridge Server — HTTP API for VPT model inference.

Provides a lightweight REST API that the Node.js CyborgBot can call to
get VPT action predictions from screen captures.

Usage:
    python bridge_server.py --model foundation-model-1x.model --weights foundation-model-1x.weights

Endpoints:
    POST /api/vpt/act      — Predict action from a single image
    POST /api/vpt/reset    — Reset agent hidden state
    GET  /api/vpt/health   — Health check
"""

import os
import sys
import io
import base64
import argparse
import logging
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Add VPT lib/ to path if available
vpt_lib_path = os.path.join(os.path.dirname(__file__), "lib")
if os.path.exists(vpt_lib_path):
    sys.path.insert(0, os.path.dirname(__file__))

from vpt_agent import VPTAgent, resize_image, AGENT_RESOLUTION
from minerl_actions import (
    MINERL_TASKS, MINERL_TO_MINEFLAYER, KEYBOARD_BUTTON_MAPPING,
    MOUSE_BUTTON_MAPPING, CAMERA_SCALER, NOOP_ACTION,
    validate_minerl_action, get_active_buttons, is_null_action,
)
from minerl_benchmark import (
    MINERL_BASELINES, validate_environment,
    MineRLBenchmarkRunner, EpisodeMetrics, TaskBenchmark,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("vpt-bridge")

# FastAPI app
app = FastAPI(
    title="VPT Bridge Service",
    description="OpenAI Video-Pre-Training model inference bridge for CyborgBot",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent: Optional[VPTAgent] = None


# --- Request/Response Models ---

class ActRequest(BaseModel):
    """Request to predict action from an image."""
    image: str  # Base64-encoded PNG/JPEG image
    stochastic: bool = True  # Whether to sample from distribution


class ActResponse(BaseModel):
    """Response with predicted action."""
    buttons: list[str]  # Active button names
    camera: dict  # {"pitch": float, "yaw": float}
    is_null: bool  # Whether this is a null action (no buttons, no camera movement)
    raw_buttons: dict  # Raw button values for debugging
    raw_camera: list[float]  # Raw camera values [pitch, yaw]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    device: str


class MineRLActionSpace(BaseModel):
    """MineRL action space reference."""
    keyboard_mapping: dict
    mouse_mapping: dict
    camera_scaler: float
    available_tasks: dict
    mineflayer_mapping: dict


class ValidateActionRequest(BaseModel):
    """Request to validate a MineRL action."""
    action: dict


class ValidateActionResponse(BaseModel):
    """Validation result for a MineRL action."""
    is_valid: bool
    errors: list[str]
    active_buttons: list[str]
    is_null: bool


# --- Endpoints ---

@app.get("/api/vpt/health", response_model=HealthResponse)
async def health():
    """Check if the VPT bridge is running and model is loaded."""
    return HealthResponse(
        status="ok" if agent and agent._loaded else "no_model",
        model_loaded=agent._loaded if agent else False,
        device=str(agent.device) if agent else "none",
    )


@app.post("/api/vpt/reset")
async def reset():
    """Reset agent hidden state (call at episode boundaries)."""
    if agent is None:
        raise HTTPException(status_code=503, detail="VPT agent not initialized")
    agent.reset()
    return {"status": "ok", "message": "Hidden state reset"}


@app.post("/api/vpt/act", response_model=ActResponse)
async def act(request: ActRequest):
    """
    Predict action from a base64-encoded image.

    The image should be a PNG or JPEG, base64-encoded (without data URI prefix).
    Returns the predicted Minecraft action (buttons + camera movement).
    """
    if agent is None:
        raise HTTPException(status_code=503, detail="VPT agent not initialized")

    try:
        # Decode base64 image
        # Strip data URI prefix if present
        image_data = request.image
        if image_data.startswith("data:"):
            # Format: data:image/png;base64,xxxxx
            image_data = image_data.split(",", 1)[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image = image.convert("RGB")
        image_np = np.array(image)

        logger.debug(f"Received image: {image_np.shape}")

        # Predict action
        action = agent.act(image_np, stochastic=request.stochastic)
        decoded = agent.decode_action(action)

        return ActResponse(
            buttons=decoded["buttons"],
            camera=decoded["camera"],
            is_null=decoded["is_null"],
            raw_buttons=action.get("buttons", {}),
            raw_camera=action.get("camera", [0.0, 0.0]).tolist()
            if hasattr(action.get("camera", [0.0, 0.0]), "tolist")
            else list(action.get("camera", [0.0, 0.0])),
        )

    except base64.binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")
    except Exception as e:
        logger.error(f"Error processing action request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- MineRL Reference Endpoints ---

@app.get("/api/vpt/minerl/actions", response_model=MineRLActionSpace)
async def minerl_actions():
    """
    Get the MineRL action space reference.

    Returns keyboard mappings, mouse mappings, camera scaler,
    available tasks, and Mineflayer action mappings.
    """
    return MineRLActionSpace(
        keyboard_mapping=KEYBOARD_BUTTON_MAPPING,
        mouse_mapping={str(k): v for k, v in MOUSE_BUTTON_MAPPING.items()},
        camera_scaler=CAMERA_SCALER,
        available_tasks=MINERL_TASKS,
        mineflayer_mapping={
            k: {kk: str(vv) if not isinstance(vv, (str, int, float, bool, type(None))) else vv
                for kk, vv in v.items()}
            for k, v in MINERL_TO_MINEFLAYER.items()
        },
    )


@app.get("/api/vpt/minerl/tasks")
async def minerl_tasks():
    """List available MineRL tasks."""
    return {
        "tasks": MINERL_TASKS,
        "count": len(MINERL_TASKS),
    }


@app.post("/api/vpt/minerl/validate", response_model=ValidateActionResponse)
async def validate_action(request: ValidateActionRequest):
    """
    Validate a MineRL action and return its active buttons.

    The action should be a MineRL-style action dict with button states (0/1)
    and a camera array [pitch, yaw].
    """
    is_valid, errors = validate_minerl_action(request.action)
    active = get_active_buttons(request.action) if is_valid else []
    null_check = is_null_action(request.action) if is_valid else True

    return ValidateActionResponse(
        is_valid=is_valid,
        errors=errors,
        active_buttons=active,
        is_null=null_check,
    )


# --- Benchmark Endpoints ---

class BenchmarkRequest(BaseModel):
    """Request to run a benchmark."""
    task: str = "treechop"  # Task key
    episodes: int = 10
    max_steps: int = 1000
    device: str = "cpu"


class BenchmarkStatusResponse(BaseModel):
    """Benchmark run status."""
    available: bool
    environment_valid: bool
    environment_report: dict
    baselines: dict


class ValidateEnvResponse(BaseModel):
    """Environment validation result."""
    minerl_installed: bool
    gym_installed: bool
    java_available: bool
    tasks_available: list
    errors: list


@app.get("/api/vpt/minerl/benchmark/baselines")
async def benchmark_baselines():
    """
    Get MineRL reference baselines for comparison.

    Returns known performance scores for random, human, and VPT variants
    across all tasks.
    """
    return {
        "baselines": MINERL_BASELINES,
        "tasks": MINERL_TASKS,
    }


@app.get("/api/vpt/minerl/benchmark/status", response_model=BenchmarkStatusResponse)
async def benchmark_status():
    """
    Check if the benchmark environment is ready.

    Validates MineRL installation, Java availability, and available tasks.
    """
    env_report = validate_environment()
    return BenchmarkStatusResponse(
        available=env_report["minerl_installed"] and env_report["gym_installed"],
        environment_valid=len(env_report["errors"]) == 0,
        environment_report=env_report,
        baselines=MINERL_BASELINES,
    )


@app.post("/api/vpt/minerl/benchmark/validate", response_model=ValidateEnvResponse)
async def benchmark_validate():
    """
    Validate the MineRL environment setup.

    Checks MineRL, Gym, Java, and available tasks.
    """
    report = validate_environment()
    return ValidateEnvResponse(
        minerl_installed=report["minerl_installed"],
        gym_installed=report["gym_installed"],
        java_available=report["java_available"],
        tasks_available=report["tasks_available"],
        errors=report["errors"],
    )


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="VPT Bridge Server")
    parser.add_argument("--model", type=str, required=True,
                        help="Path to VPT .model file")
    parser.add_argument("--weights", type=str, required=True,
                        help="Path to VPT .weights file")
    parser.add_argument("--host", type=str, default="127.0.0.1",
                        help="Host to bind to (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765,
                        help="Port to listen on (default: 8765)")
    parser.add_argument("--device", type=str, default="cpu",
                        help="Device to use: cpu, cuda, cuda:0 (default: cpu)")

    args = parser.parse_args()

    global agent

    logger.info(f"Loading VPT model from {args.model} / {args.weights}")
    logger.info(f"Device: {args.device}")

    try:
        agent = VPTAgent(
            model_path=args.model,
            weights_path=args.weights,
            device=args.device,
        )
        logger.info("VPT model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load VPT model: {e}")
        logger.warning("Starting in stub mode — model inference will not work")
        # Create agent without loading weights (will return empty actions)
        agent = VPTAgent(device=args.device)

    logger.info(f"Starting VPT Bridge Server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()