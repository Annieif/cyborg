"""
MineRL Action Space — Complete reference for MineRL's standard action definitions.

MineRL is the standard Minecraft AI research environment used by VPT.
This module provides the full action space mapping used by MineRL,
including keyboard mappings, mouse mappings, camera scalers, and
standard MineRL task definitions.

Reference:
  - https://minerl.readthedocs.io/
  - https://github.com/minerllabs/minerl
  - VPT lib/actions.py (ActionTransformer, CameraQuantizer)
  - VPT run_inverse_dynamics_model.py (KEYBOARD_BUTTON_MAPPING, NOOP_ACTION)
"""

import numpy as np
from typing import Dict, List, Tuple, Optional

# ============================================================
# MineRL Keyboard → Action Mapping
# ============================================================
# Maps Minecraft keyboard keys to MineRL action names
# Source: run_inverse_dynamics_model.py

KEYBOARD_BUTTON_MAPPING: Dict[str, str] = {
    "key.keyboard.escape": "ESC",
    "key.keyboard.s": "back",
    "key.keyboard.q": "drop",
    "key.keyboard.w": "forward",
    "key.keyboard.1": "hotbar.1",
    "key.keyboard.2": "hotbar.2",
    "key.keyboard.3": "hotbar.3",
    "key.keyboard.4": "hotbar.4",
    "key.keyboard.5": "hotbar.5",
    "key.keyboard.6": "hotbar.6",
    "key.keyboard.7": "hotbar.7",
    "key.keyboard.8": "hotbar.8",
    "key.keyboard.9": "hotbar.9",
    "key.keyboard.e": "inventory",
    "key.keyboard.space": "jump",
    "key.keyboard.a": "left",
    "key.keyboard.d": "right",
    "key.keyboard.left.shift": "sneak",
    "key.keyboard.left.control": "sprint",
    "key.keyboard.f": "swapHands",
}

# Reverse mapping: action name → keyboard key
ACTION_TO_KEYBOARD: Dict[str, str] = {v: k for k, v in KEYBOARD_BUTTON_MAPPING.items()}

# ============================================================
# Mouse Button Mapping
# ============================================================
# MineRL mouse button indices:
#   0 = left click (attack/destroy)
#   1 = right click (use/place)
#   2 = middle click (pick block)

MOUSE_BUTTON_MAPPING: Dict[int, str] = {
    0: "attack",
    1: "use",
    2: "pickItem",
}

# ============================================================
# Camera Sensitivity Scaler
# ============================================================
# Matches a number in the MineRL Java code regarding sensitivity
# This maps from recorded mouse sensitivity to model sensitivity
# Source: run_inverse_dynamics_model.py

CAMERA_SCALER: float = 360.0 / 2400.0  # ≈ 0.15

# ============================================================
# NOOP Action Template
# ============================================================
# The default "do nothing" action in MineRL format
# Source: run_inverse_dynamics_model.py

NOOP_ACTION: Dict = {
    "ESC": 0,
    "back": 0,
    "drop": 0,
    "forward": 0,
    "hotbar.1": 0,
    "hotbar.2": 0,
    "hotbar.3": 0,
    "hotbar.4": 0,
    "hotbar.5": 0,
    "hotbar.6": 0,
    "hotbar.7": 0,
    "hotbar.8": 0,
    "hotbar.9": 0,
    "inventory": 0,
    "jump": 0,
    "left": 0,
    "right": 0,
    "sneak": 0,
    "sprint": 0,
    "swapHands": 0,
    "camera": np.array([0, 0]),
    "attack": 0,
    "use": 0,
    "pickItem": 0,
}

# ============================================================
# MineRL Environment Specifications
# ============================================================
# Standard MineRL environment settings (matching VPT ENV_KWARGS)

MINERL_ENV_KWARGS: Dict = {
    "fov_range": [70, 70],
    "frameskip": 1,
    "gamma_range": [2, 2],
    "guiscale_range": [1, 1],
    "resolution": [640, 360],
    "cursor_size_range": [16.0, 16.0],
}

# ============================================================
# MineRL Standard Tasks
# ============================================================
# List of all standard MineRL tasks/competitions

MINERL_TASKS: Dict[str, str] = {
    # BASALT 2022 tasks
    "basalt_find_cave": "MineRLBasaltFindCave-v0",
    "basalt_make_waterfall": "MineRLBasaltMakeWaterfall-v0",
    "basalt_create_village_animal_pen": "MineRLBasaltCreateVillageAnimalPen-v0",
    "basalt_build_village_house": "MineRLBasaltBuildVillageHouse-v0",
    # Diamond 2021
    "diamond": "MineRLObtainDiamond-v0",
    "diamond_vector": "MineRLObtainDiamondVectorObf-v0",
    # Basic tasks
    "treechop": "MineRLTreechop-v0",
    "navigate": "MineRLNavigate-v0",
    "navigate_dense": "MineRLNavigateDense-v0",
    "navigate_extreme": "MineRLNavigateExtreme-v0",
    # Human survival
    "human_survival": "MineRLHumanSurvival-v0",
}

# ============================================================
# MineRL Action ↔ Mineflayer Mapping
# ============================================================
# Maps MineRL action names to equivalent Mineflayer bot operations

MINERL_TO_MINEFLAYER: Dict[str, Dict] = {
    "forward": {"type": "control", "state": "forward", "duration": 150},
    "back": {"type": "control", "state": "back", "duration": 150},
    "left": {"type": "control", "state": "left", "duration": 150},
    "right": {"type": "control", "state": "right", "duration": 150},
    "jump": {"type": "control", "state": "jump", "duration": 100},
    "sprint": {"type": "control", "state": "sprint", "duration": 200},
    "sneak": {"type": "control", "state": "sneak", "duration": 200},
    "attack": {"type": "attack"},
    "use": {"type": "use"},
    "drop": {"type": "drop"},
    "inventory": {"type": "inventory"},
    "pickItem": {"type": "pickBlock"},
    "swapHands": {"type": "swapHands"},
    "ESC": {"type": "esc"},
    "camera": {"type": "camera"},
}

# Hotbar actions are mapped dynamically
for i in range(1, 10):
    MINERL_TO_MINEFLAYER[f"hotbar.{i}"] = {"type": "hotbar", "slot": i - 1}

# ============================================================
# Action Validation
# ============================================================

def validate_minerl_action(action: Dict) -> Tuple[bool, List[str]]:
    """
    Validate a MineRL action dictionary.

    :param action: Action dict to validate
    :return: (is_valid, list_of_errors)
    """
    errors = []

    # Check required keys
    required_keys = set(NOOP_ACTION.keys())
    action_keys = set(action.keys())

    missing = required_keys - action_keys
    if missing:
        errors.append(f"Missing action keys: {missing}")

    extra = action_keys - required_keys
    if extra:
        errors.append(f"Unknown action keys: {extra}")

    # Check camera type
    if "camera" in action:
        cam = action["camera"]
        if not isinstance(cam, (np.ndarray, list)):
            errors.append(f"camera must be ndarray or list, got {type(cam)}")
        elif len(cam) != 2:
            errors.append(f"camera must have 2 elements (pitch, yaw), got {len(cam)}")

    # Check button values (should be 0 or 1)
    for key in action:
        if key == "camera":
            continue
        val = action[key]
        if val not in (0, 1):
            errors.append(f"Button '{key}' should be 0 or 1, got {val}")

    return len(errors) == 0, errors


def get_active_buttons(action: Dict) -> List[str]:
    """
    Get list of active (pressed) buttons from a MineRL action.

    :param action: MineRL action dict
    :return: List of active button names
    """
    active = []
    for key in action:
        if key == "camera":
            continue
        if action[key] == 1:
            active.append(key)
    return active


def is_null_action(action: Dict) -> bool:
    """
    Check if a MineRL action is a null action (no buttons, no camera).

    :param action: MineRL action dict
    :return: True if no action is taken
    """
    buttons_active = get_active_buttons(action)
    camera = action.get("camera", np.zeros(2))
    if isinstance(camera, np.ndarray):
        camera_moving = np.any(np.abs(camera) > 0.01)
    else:
        camera_moving = any(abs(c) > 0.01 for c in camera)

    return len(buttons_active) == 0 and not camera_moving


def create_noop() -> Dict:
    """Create a fresh NOOP action (deep copy of template)."""
    action = NOOP_ACTION.copy()
    action["camera"] = np.array([0, 0])
    return action


# ============================================================
# JSON → MineRL Action Conversion
# ============================================================
# Converts MineRL contractor JSON action format to MineRL action dict
# Source: run_inverse_dynamics_model.py

def json_action_to_minerl_action(json_action: Dict) -> Tuple[Dict, bool]:
    """
    Convert a JSON action from MineRL contractor data into a MineRL action dict.

    :param json_action: JSON action from contractor data
    :return: (minerl_action, is_null_action)
    """
    env_action = create_noop()
    is_null_action = True

    # Keyboard keys
    keyboard_keys = json_action.get("keyboard", {}).get("keys", [])
    for key in keyboard_keys:
        if key in KEYBOARD_BUTTON_MAPPING:
            env_action[KEYBOARD_BUTTON_MAPPING[key]] = 1
            is_null_action = False

    # Mouse movement → camera
    mouse = json_action.get("mouse", {})
    camera_action = env_action["camera"]
    camera_action[0] = mouse.get("dy", 0) * CAMERA_SCALER
    camera_action[1] = mouse.get("dx", 0) * CAMERA_SCALER

    if mouse.get("dx", 0) != 0 or mouse.get("dy", 0) != 0:
        is_null_action = False
    else:
        if abs(camera_action[0]) > 180:
            camera_action[0] = 0
        if abs(camera_action[1]) > 180:
            camera_action[1] = 0

    # Mouse buttons
    mouse_buttons = mouse.get("buttons", [])
    if 0 in mouse_buttons:
        env_action["attack"] = 1
        is_null_action = False
    if 1 in mouse_buttons:
        env_action["use"] = 1
        is_null_action = False
    if 2 in mouse_buttons:
        env_action["pickItem"] = 1
        is_null_action = False

    return env_action, is_null_action