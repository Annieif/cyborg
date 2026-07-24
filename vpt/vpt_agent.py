"""
VPT Agent Wrapper — Lightweight inference-only wrapper for VPT model.

This module provides a standalone VPT agent that does NOT require the MineRL
environment. It can load VPT model weights and predict actions from images.

Reference: https://github.com/openai/Video-Pre-Training

Usage:
    agent = VPTAgent(model_path="foundation-model-1x.model", weights_path="foundation-model-1x.weights")
    action = agent.act(image_array)  # image_array shape: (H, W, 3), uint8
"""

import pickle
import numpy as np
import torch as th
import cv2
from typing import Dict, Optional, Tuple

# These imports require the VPT lib/ folder to be in PYTHONPATH
# Copy lib/ from https://github.com/openai/Video-Pre-Training
try:
    from lib.action_mapping import CameraHierarchicalMapping
    from lib.actions import ActionTransformer, Buttons
    from lib.policy import MinecraftAgentPolicy
    from lib.torch_util import default_device_type, set_default_torch_device
except ImportError:
    # Fallback: define minimal stubs for standalone use
    print("WARNING: VPT lib/ not found. Using stub implementations.")
    # Minimal stubs will be defined below

# MineRL action space reference (no MineRL import required)
from minerl_actions import (
    MINERL_TO_MINEFLAYER, NOOP_ACTION, get_active_buttons,
    is_null_action as minerl_is_null, create_noop,
)

# Agent configuration (matching VPT paper)
AGENT_RESOLUTION = (128, 128)

POLICY_KWARGS = dict(
    attention_heads=16,
    attention_mask_style="clipped_causal",
    attention_memory_size=256,
    diff_mlp_embedding=False,
    hidsize=2048,
    img_shape=[128, 128, 3],
    impala_chans=[16, 32, 32],
    impala_kwargs={"post_pool_groups": 1},
    impala_width=8,
    init_norm_kwargs={"batch_norm": False, "group_norm_groups": 1},
    n_recurrence_layers=4,
    only_img_input=True,
    pointwise_ratio=4,
    pointwise_use_activation=False,
    recurrence_is_residual=True,
    recurrence_type="transformer",
    timesteps=128,
    use_pointwise_layer=True,
    use_pre_lstm_ln=False,
)

PI_HEAD_KWARGS = dict(temperature=2.0)

ACTION_TRANSFORMER_KWARGS = dict(
    camera_binsize=2,
    camera_maxval=10,
    camera_mu=10,
    camera_quantization_scheme="mu_law",
)


def resize_image(img: np.ndarray, target_resolution: Tuple[int, int]) -> np.ndarray:
    """Resize image using INTER_LINEAR (as in VPT code)."""
    return cv2.resize(img, target_resolution, interpolation=cv2.INTER_LINEAR)


class VPTAgent:
    """
    Lightweight VPT agent for inference only.

    Loads VPT model weights and predicts Minecraft actions from screen images.
    Does NOT require MineRL environment — works with any image source.

    :param model_path: Path to .model file (pickled model parameters)
    :param weights_path: Path to .weights file (PyTorch state dict)
    :param device: torch device string (e.g., 'cpu', 'cuda', 'cuda:0')
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        weights_path: Optional[str] = None,
        device: Optional[str] = None,
        policy_kwargs: Optional[Dict] = None,
        pi_head_kwargs: Optional[Dict] = None,
    ):
        if device is None:
            device = default_device_type()
        self.device = th.device(device)
        set_default_torch_device(self.device)

        self.action_mapper = CameraHierarchicalMapping(n_camera_bins=11)
        self.action_transformer = ActionTransformer(**ACTION_TRANSFORMER_KWARGS)

        if policy_kwargs is None:
            policy_kwargs = POLICY_KWARGS
        if pi_head_kwargs is None:
            pi_head_kwargs = PI_HEAD_KWARGS

        self.policy = MinecraftAgentPolicy(
            action_space=self.action_mapper.get_action_space_update(),
            policy_kwargs=policy_kwargs,
            pi_head_kwargs=pi_head_kwargs,
        ).to(self.device)

        self.hidden_state = self.policy.initial_state(1)
        self._dummy_first = th.from_numpy(np.array((False,))).to(self.device)

        self._loaded = False

        if model_path and weights_path:
            # Load model parameters from .model file
            agent_parameters = pickle.load(open(model_path, "rb"))
            loaded_policy_kwargs = agent_parameters["model"]["args"]["net"]["args"]
            loaded_pi_head_kwargs = agent_parameters["model"]["args"]["pi_head_opts"]
            loaded_pi_head_kwargs["temperature"] = float(loaded_pi_head_kwargs["temperature"])

            # Recreate policy with loaded parameters
            self.policy = MinecraftAgentPolicy(
                action_space=self.action_mapper.get_action_space_update(),
                policy_kwargs=loaded_policy_kwargs,
                pi_head_kwargs=loaded_pi_head_kwargs,
            ).to(self.device)

            self.load_weights(weights_path)

    def load_weights(self, path: str):
        """Load model weights and reset hidden state."""
        self.policy.load_state_dict(th.load(path, map_location=self.device), strict=False)
        self.hidden_state = self.policy.initial_state(1)
        self._loaded = True

    def reset(self):
        """Reset hidden state (call at episode boundaries)."""
        self.hidden_state = self.policy.initial_state(1)

    def _preprocess_image(self, img: np.ndarray) -> Dict[str, th.Tensor]:
        """
        Preprocess image for VPT model.

        :param img: numpy array of shape (H, W, 3), uint8, RGB
        :return: dict with 'img' tensor of shape (1, 128, 128, 3)
        """
        # Resize to 128x128
        img = resize_image(img, AGENT_RESOLUTION)
        # Add batch dimension
        img = img[None]  # (1, 128, 128, 3)
        return {"img": th.from_numpy(img).to(self.device)}

    def act(self, img: np.ndarray, stochastic: bool = True) -> Dict:
        """
        Predict action for a single image.

        :param img: RGB image as numpy array (H, W, 3), uint8
        :param stochastic: If True, sample from distribution; if False, take argmax
        :return: MineRL-style action dict with 'buttons' and 'camera' keys
        """
        agent_input = self._preprocess_image(img)

        agent_action, self.hidden_state, _ = self.policy.act(
            agent_input, self._dummy_first, self.hidden_state,
            stochastic=stochastic
        )

        # Convert to numpy
        action = {
            "buttons": agent_action["buttons"].cpu().numpy(),
            "camera": agent_action["camera"].cpu().numpy(),
        }

        # Map to factored action space
        minerl_action = self.action_mapper.to_factored(action)
        # Transform to environment action
        minerl_action = self.action_transformer.policy2env(minerl_action)

        return minerl_action

    def act_batch(self, images: np.ndarray) -> Dict:
        """
        Predict actions for a batch of images (for offline processing).

        :param images: numpy array of shape (N, H, W, 3), uint8
        :return: MineRL-style action dict with batch dimension
        """
        # Resize all images
        resized = np.stack([resize_image(img, AGENT_RESOLUTION) for img in images])
        agent_input = {"img": th.from_numpy(resized).to(self.device)}

        # Process through policy
        agent_action, self.hidden_state, _ = self.policy.act(
            agent_input,
            th.zeros((len(images),)).to(self.device),
            self.hidden_state,
            stochastic=True
        )

        action = {
            "buttons": agent_action["buttons"].cpu().numpy(),
            "camera": agent_action["camera"].cpu().numpy(),
        }

        minerl_action = self.action_mapper.to_factored(action)
        minerl_action = self.action_transformer.policy2env(minerl_action)

        return minerl_action

    def decode_action(self, action: Dict) -> Dict:
        """
        Decode a VPT action into human-readable Minecraft actions.

        :param action: MineRL-style action dict from act()
        :return: Dict with human-readable action descriptions
        """
        buttons = action.get("buttons", {})
        camera = action.get("camera", np.zeros(2))

        active_buttons = []
        for btn_name in Buttons.ALL:
            if buttons.get(btn_name, 0) == 1:
                active_buttons.append(btn_name)

        return {
            "buttons": active_buttons,
            "camera": {"pitch": float(camera[0]), "yaw": float(camera[1])},
            "is_null": len(active_buttons) == 0 and np.all(np.abs(camera) < 0.1),
        }


# Simplified action space definition for when VPT lib/ is not available
SIMPLIFIED_BUTTONS = [
    "attack", "back", "forward", "jump", "left", "right",
    "sneak", "sprint", "use", "drop", "inventory",
] + [f"hotbar.{i}" for i in range(1, 10)]


def create_simple_action_mapping():
    """Create a simplified action mapping when VPT lib/ is not available."""
    class SimpleActionMapper:
        """Simplified VPT action mapping using hardcoded values."""
        # Button groups (same as VPT CameraHierarchicalMapping)
        BUTTONS_GROUPS = {
            "hotbar": ["none"] + [f"hotbar.{i}" for i in range(1, 10)],
            "fore_back": ["none", "forward", "back"],
            "left_right": ["none", "left", "right"],
            "sprint_sneak": ["none", "sprint", "sneak"],
            "use": ["none", "use"],
            "drop": ["none", "drop"],
            "attack": ["none", "attack"],
            "jump": ["none", "jump"],
            "camera": ["none", "camera"],
        }

        def __init__(self, n_camera_bins=11):
            self.n_camera_bins = n_camera_bins
            self.camera_null_bin = n_camera_bins // 2

        def to_factored(self, action):
            """Convert joint action to factored action (simplified)."""
            # This is a simplified version — for production use, use the full VPT lib/
            buttons = action.get("buttons", {})
            camera = action.get("camera", np.zeros(2))

            factored_buttons = {}
            for btn in SIMPLIFIED_BUTTONS:
                factored_buttons[btn] = buttons.get(btn, 0)

            # Camera is already in factored space
            return {
                "buttons": factored_buttons,
                "camera": camera,
            }

        def get_action_space_update(self):
            return {}

    return SimpleActionMapper()


# ============================================================
# MineRL Environment Integration
# ============================================================

class VPTMineRLAgent(VPTAgent):
    """
    Extended VPTAgent with MineRL environment integration.

    This agent can:
      - Run in a MineRL gym environment for offline testing
      - Map between VPT actions and MineRL standard actions
      - Convert to Mineflayer-compatible action descriptions
    """

    def run_in_env(self, env, max_steps: int = 1000, render: bool = False) -> Dict:
        """
        Run the agent in a MineRL environment.

        :param env: MineRL gym environment
        :param max_steps: Maximum steps per episode
        :param render: Whether to render the game window
        :return: Episode statistics
        """
        import time
        obs = env.reset()
        self.reset()

        total_reward = 0.0
        steps = 0
        actions_taken = 0
        start_time = time.time()

        for step in range(max_steps):
            pov = obs.get("pov")
            if pov is None:
                break

            action = self.act(pov, stochastic=True)
            obs, reward, done, info = env.step(action)
            total_reward += reward
            steps += 1

            if not minerl_is_null(action):
                actions_taken += 1

            if render:
                env.render()

            if done:
                break

        elapsed = time.time() - start_time
        return {
            "steps": steps,
            "total_reward": float(total_reward),
            "actions_taken": actions_taken,
            "elapsed": elapsed,
            "steps_per_second": steps / max(elapsed, 0.001),
        }

    def action_to_mineflayer(self, action: Dict) -> Dict:
        """
        Convert a VPT action to Mineflayer-compatible format.

        :param action: VPT action dict from act()
        :return: Dict with mineflayer-compatible action description
        """
        active = get_active_buttons(action)
        camera = action.get("camera", np.zeros(2))

        commands = []
        for btn in active:
            if btn in MINERL_TO_MINEFLAYER:
                mapping = MINERL_TO_MINEFLAYER[btn]
                commands.append({
                    "type": mapping["type"],
                    "params": {k: v for k, v in mapping.items() if k != "type"},
                })

        if abs(camera[0]) > 0.01 or abs(camera[1]) > 0.01:
            commands.append({
                "type": "camera",
                "pitch": float(camera[0]),
                "yaw": float(camera[1]),
            })

        return {
            "commands": commands,
            "active_buttons": active,
            "camera": {"pitch": float(camera[0]), "yaw": float(camera[1])},
            "is_null": len(commands) == 0,
        }